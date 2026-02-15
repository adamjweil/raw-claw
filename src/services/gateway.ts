import { Platform } from 'react-native';
import {
  GatewayStatus,
  CronJob,
  CronRunRecord,
  Skill,
  Message,
  TokenUsage,
  Channel,
  ActivityEvent,
  MemoryFile,
  MemoryDiff,
  DailyNote,
  ChatSession,
  PairedNode,
  WSConnectionState,
} from '../types';

type MessageHandler = (message: Message) => void;
type WSStateHandler = (state: WSConnectionState) => void;
type ChatEventHandler = (event: ChatEvent) => void;

export interface GatewayError {
  status: number;
  message: string;
}

/** Raw chat event from the gateway */
interface ChatEvent {
  sessionKey: string;
  runId?: string;
  state: 'delta' | 'final' | 'error' | 'aborted';
  message?: unknown;
  errorMessage?: string;
}

/** Pending RPC request */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function uuid(): string {
  // Simple UUID v4 generation
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      id += '-';
    } else if (i === 14) {
      id += '4';
    } else if (i === 19) {
      id += hex[(Math.random() * 4) | 8];
    } else {
      id += hex[(Math.random() * 16) | 0];
    }
  }
  return id;
}

/**
 * Extract plain-text string from an OpenClaw message content field.
 * Content may be a string OR an array of content blocks
 * like [{type:"text", text:"..."}, {type:"toolcall", ...}].
 */
function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (block: Record<string, unknown>) =>
          block && typeof block === 'object' && block.type === 'text'
      )
      .map((block: Record<string, unknown>) =>
        typeof block.text === 'string' ? block.text : ''
      )
      .join('');
  }
  return '';
}

/**
 * Normalize a raw gateway message object into our Message type.
 */
function normalizeMessage(
  raw: Record<string, unknown>,
  sessionKey?: string
): Message {
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw.id === 'number'
      ? String(raw.id)
      : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const role: Message['role'] = raw.role === 'user' ? 'user' : 'assistant';

  const content = extractContentText(raw.content);

  let timestamp: number;
  if (typeof raw.timestamp === 'number') {
    timestamp = raw.timestamp;
  } else if (typeof raw.timestamp === 'string') {
    const parsed = new Date(raw.timestamp).getTime();
    timestamp = Number.isNaN(parsed) ? Date.now() : parsed;
  } else {
    timestamp = Date.now();
  }

  const msg: Message = { id, role, content, timestamp };

  if (typeof raw.category === 'string') {
    msg.category = raw.category as Message['category'];
  }
  if (sessionKey) {
    msg.sessionId = sessionKey;
  }

  // Extract tool calls from content blocks if present
  if (Array.isArray(raw.content)) {
    const toolCalls = raw.content.filter(
      (block: Record<string, unknown>) =>
        block && typeof block === 'object' && block.type === 'toolcall'
    );
    if (toolCalls.length > 0) {
      msg.toolCalls = toolCalls.map((tc: Record<string, unknown>) => ({
        id: typeof tc.id === 'string' ? tc.id : uuid(),
        name: typeof tc.name === 'string' ? tc.name : 'unknown',
        input: (tc.input as Record<string, unknown>) ?? {},
        output: typeof tc.output === 'string' ? tc.output : undefined,
        status: 'success' as const,
      }));
    }
  }

  return msg;
}

// ─── GatewayClient ────────────────────────────────────────────────────

const RPC_TIMEOUT_MS = 30_000;
const CHAT_TIMEOUT_MS = 120_000;

export class GatewayClient {
  private url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private messageHandlers: MessageHandler[] = [];
  private wsStateHandlers: WSStateHandler[] = [];
  private chatEventHandlers: ChatEventHandler[] = [];
  private _wsState: WSConnectionState = 'disconnected';
  private _isAuthenticated = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private backoffMs = 800;
  private connectNonce: string | null = null;
  private connectSent = false;
  private sessionKey = 'main';

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
  }

  // ─── WebSocket URL builder ──────────────────────────────────────────

  private wsUrl(): string {
    return this.url.replace(/^https/, 'wss').replace(/^http/, 'ws');
  }

  // ─── JSON-RPC request ───────────────────────────────────────────────

  private rpc<T = unknown>(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = RPC_TIMEOUT_MS
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('gateway not connected'));
        return;
      }

      const id = uuid();
      const msg = { type: 'req', id, method, params };

      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      this.ws.send(JSON.stringify(msg));
    });
  }

  // ─── WebSocket lifecycle ────────────────────────────────────────────

  get wsState(): WSConnectionState {
    return this._wsState;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  private setWsState(state: WSConnectionState) {
    this._wsState = state;
    this.wsStateHandlers.forEach((h) => h(state));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onWsStateChange(handler: WSStateHandler) {
    this.wsStateHandlers.push(handler);
    return () => {
      this.wsStateHandlers = this.wsStateHandlers.filter((h) => h !== handler);
    };
  }

  onChatEvent(handler: ChatEventHandler) {
    this.chatEventHandlers.push(handler);
    return () => {
      this.chatEventHandlers = this.chatEventHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  connect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
    }

    this._isAuthenticated = false;
    this.connectNonce = null;
    this.connectSent = false;
    this.shouldReconnect = true;
    this.setWsState('connecting');

    const wsUrl = this.wsUrl();
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Wait briefly for a possible connect.challenge event, then send connect
      this.connectTimer = setTimeout(() => this.sendConnect(), 750);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(String(event.data ?? ''));
    };

    this.ws.onclose = () => {
      this._isAuthenticated = false;
      this.setWsState('disconnected');
      this.flushPending(new Error('gateway disconnected'));
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.backoffMs);
        this.backoffMs = Math.min(this.backoffMs * 1.7, 15_000);
      }
    };

    this.ws.onerror = () => {
      this.setWsState('error');
      this.ws?.close();
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.flushPending(new Error('client disconnected'));
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._isAuthenticated = false;
    this.setWsState('disconnected');
  }

  private flushPending(error: Error) {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private async sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    try {
      await this.rpc('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-ios',
          version: '1.0.0',
          platform: Platform.OS ?? 'mobile',
          mode: 'webchat',
          instanceId: uuid(),
        },
        role: 'operator',
        scopes: ['operator.admin', 'operator.approvals', 'operator.pairing'],
        auth: this.token ? { token: this.token } : undefined,
        caps: [],
      });

      this._isAuthenticated = true;
      this.backoffMs = 800;
      this.setWsState('connected');
    } catch (err) {
      console.warn('[Gateway] connect handshake failed:', err);
      this._isAuthenticated = false;
      this.setWsState('error');
      this.ws?.close();
    }
  }

  private handleMessage(data: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    // ─── Challenge event (before connect) ───
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      const payload = msg.payload as Record<string, unknown> | undefined;
      const nonce =
        payload && typeof payload.nonce === 'string' ? payload.nonce : null;
      if (nonce) {
        this.connectNonce = nonce;
        this.sendConnect();
      }
      return;
    }

    // ─── RPC response ───
    if (msg.type === 'res') {
      const id = msg.id as string;
      const pending = this.pendingRequests.get(id);
      if (!pending) return;

      this.pendingRequests.delete(id);
      clearTimeout(pending.timer);

      if (msg.ok) {
        pending.resolve(msg.payload);
      } else {
        const errObj = msg.error as Record<string, unknown> | undefined;
        const errMsg =
          errObj && typeof errObj.message === 'string'
            ? errObj.message
            : 'request failed';
        pending.reject(new Error(errMsg));
      }
      return;
    }

    // ─── Server-pushed events ───
    if (msg.type === 'event') {
      const eventName = msg.event as string;

      if (eventName === 'chat') {
        const payload = msg.payload as ChatEvent | undefined;
        if (payload) {
          this.chatEventHandlers.forEach((h) => h(payload));
        }
      }

      // Could handle other event types here (cron, presence, etc.)
      return;
    }
  }

  // ─── Test connection ────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const wsUrl = this.wsUrl();
      const testWs = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        testWs.close();
        resolve(false);
      }, 5_000);

      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        resolve(true);
      };

      testWs.onerror = () => {
        clearTimeout(timeout);
        testWs.close();
        resolve(false);
      };
    });
  }

  // ─── Chat ───────────────────────────────────────────────────────────

  /**
   * Send a chat message and wait for the assistant response.
   * Returns the final assistant Message once the gateway finishes.
   */
  async sendMessage(text: string, sessionId?: string): Promise<Message> {
    const key = sessionId || this.sessionKey;
    const idempotencyKey = uuid();

    // Send the message via RPC
    await this.rpc('chat.send', {
      sessionKey: key,
      message: text,
      deliver: false,
      idempotencyKey,
    });

    // Wait for the chat stream to complete (final / error / aborted)
    await this.waitForChatComplete(key, idempotencyKey);

    // Fetch the latest messages to get the final response
    const historyResult = await this.rpc<{
      messages: Record<string, unknown>[];
      thinkingLevel?: string | null;
    }>('chat.history', {
      sessionKey: key,
      limit: 5,
    });

    const messages = Array.isArray(historyResult?.messages)
      ? historyResult.messages
      : [];

    // Find the last assistant message
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistant) {
      return normalizeMessage(lastAssistant, key);
    }

    // Fallback: return a placeholder
    return {
      id: uuid(),
      role: 'assistant',
      content: '(No response received)',
      timestamp: Date.now(),
    };
  }

  private waitForChatComplete(
    sessionKey: string,
    _runId: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsub();
        resolve(); // Resolve anyway — we'll fetch history
      }, CHAT_TIMEOUT_MS);

      const unsub = this.onChatEvent((event) => {
        if (event.sessionKey !== sessionKey) return;

        if (
          event.state === 'final' ||
          event.state === 'aborted'
        ) {
          clearTimeout(timeout);
          unsub();
          resolve();
        } else if (event.state === 'error') {
          clearTimeout(timeout);
          unsub();
          reject(new Error(event.errorMessage ?? 'chat error'));
        }
      });
    });
  }

  /**
   * Fetch chat history for a session.
   */
  async getChatHistory(
    sessionId?: string,
    limit = 200
  ): Promise<Message[]> {
    const key = sessionId || this.sessionKey;
    const result = await this.rpc<{
      messages: Record<string, unknown>[];
    }>('chat.history', { sessionKey: key, limit });

    const rawMessages = Array.isArray(result?.messages)
      ? result.messages
      : [];

    return rawMessages.map((m) => normalizeMessage(m, key));
  }

  /**
   * Search messages — not directly supported by OpenClaw RPC.
   * Fall back to fetching history.
   */
  async searchMessages(_query: string): Promise<Message[]> {
    return this.getChatHistory(undefined, 200);
  }

  // ─── Sessions ───────────────────────────────────────────────────────

  async getChatSessions(): Promise<ChatSession[]> {
    const result = await this.rpc<{
      sessions?: Record<string, unknown>[];
    }>('sessions.list', {});

    const raw = Array.isArray(result?.sessions) ? result.sessions : [];
    return raw.map((s) => ({
      id: typeof s.key === 'string' ? s.key : typeof s.id === 'string' ? s.id : uuid(),
      title:
        typeof s.title === 'string'
          ? s.title
          : typeof s.key === 'string'
          ? s.key
          : 'Session',
      createdAt:
        typeof s.createdAt === 'string'
          ? s.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof s.updatedAt === 'string'
          ? s.updatedAt
          : new Date().toISOString(),
      messageCount:
        typeof s.messageCount === 'number' ? s.messageCount : 0,
    }));
  }

  async deleteSession(sessionKey: string): Promise<void> {
    await this.rpc('sessions.delete', { sessionKey });
  }

  async renameSession(sessionKey: string, title: string): Promise<void> {
    await this.rpc('sessions.patch', { sessionKey, title });
  }

  // ─── Status & Health ────────────────────────────────────────────────

  async getStatus(): Promise<GatewayStatus> {
    const [status, health] = await Promise.all([
      this.rpc<Record<string, unknown>>('status', {}),
      this.rpc<Record<string, unknown>>('health', {}).catch(() => null),
    ]);

    return {
      connected: true,
      model:
        typeof status.model === 'string'
          ? status.model
          : typeof status.defaultModel === 'string'
          ? status.defaultModel
          : 'unknown',
      uptime:
        typeof status.uptime === 'string'
          ? status.uptime
          : typeof status.uptimeMs === 'number'
          ? `${Math.floor(status.uptimeMs / 1000 / 60)}m`
          : 'unknown',
      version:
        typeof status.version === 'string' ? status.version : 'unknown',
      channels: [],
      sessionId: null,
    };
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────────

  async getCronJobs(): Promise<CronJob[]> {
    const result = await this.rpc<{
      jobs?: Record<string, unknown>[];
    }>('cron.list', { includeDisabled: true });

    const raw = Array.isArray(result?.jobs) ? result.jobs : [];
    return raw.map((j) => ({
      id: String(j.id ?? j.name ?? ''),
      name: String(j.name ?? ''),
      schedule: String(j.schedule ?? j.cronExpr ?? ''),
      scheduleHuman: String(j.scheduleHuman ?? j.description ?? ''),
      enabled: j.enabled !== false,
      lastRun:
        typeof j.lastRun === 'string' ? j.lastRun : null,
      lastStatus:
        typeof j.lastStatus === 'string'
          ? (j.lastStatus as CronJob['lastStatus'])
          : null,
      nextRun:
        typeof j.nextRun === 'string' ? j.nextRun : null,
    }));
  }

  async runCronJob(id: string): Promise<void> {
    await this.rpc('cron.run', { id });
  }

  async toggleCronJob(id: string, enabled: boolean): Promise<void> {
    await this.rpc('cron.update', { id, enabled });
  }

  async getCronRunHistory(id: string): Promise<CronRunRecord[]> {
    const result = await this.rpc<{
      runs?: Record<string, unknown>[];
    }>('cron.runs', { id });

    const raw = Array.isArray(result?.runs) ? result.runs : [];
    return raw.map((r) => ({
      id: String(r.id ?? ''),
      startedAt: String(r.startedAt ?? ''),
      completedAt:
        typeof r.completedAt === 'string' ? r.completedAt : null,
      status:
        typeof r.status === 'string'
          ? (r.status as CronRunRecord['status'])
          : 'success',
      output: typeof r.output === 'string' ? r.output : undefined,
      duration: typeof r.duration === 'number' ? r.duration : undefined,
    }));
  }

  async createCronJob(job: Partial<CronJob>): Promise<CronJob> {
    const result = await this.rpc<Record<string, unknown>>('cron.add', job);
    return {
      id: String(result?.id ?? job.name ?? ''),
      name: String(result?.name ?? job.name ?? ''),
      schedule: String(result?.schedule ?? job.schedule ?? ''),
      scheduleHuman: String(result?.scheduleHuman ?? ''),
      enabled: true,
      lastRun: null,
      lastStatus: null,
      nextRun: null,
    };
  }

  async updateCronJob(
    id: string,
    patch: Partial<CronJob>
  ): Promise<CronJob> {
    const result = await this.rpc<Record<string, unknown>>('cron.update', {
      id,
      ...patch,
    });
    return {
      id: String(result?.id ?? id),
      name: String(result?.name ?? patch.name ?? ''),
      schedule: String(result?.schedule ?? patch.schedule ?? ''),
      scheduleHuman: String(result?.scheduleHuman ?? ''),
      enabled: patch.enabled !== false,
      lastRun: null,
      lastStatus: null,
      nextRun: null,
    };
  }

  async deleteCronJob(id: string): Promise<void> {
    await this.rpc('cron.remove', { id });
  }

  // ─── Skills ─────────────────────────────────────────────────────────

  async getSkills(): Promise<Skill[]> {
    const result = await this.rpc<Record<string, unknown>>(
      'skills.status',
      {}
    );

    // The result shape varies; try to extract a list
    const raw = Array.isArray(result?.skills)
      ? result.skills
      : Array.isArray(result)
      ? result
      : [];

    return (raw as Record<string, unknown>[]).map((s) => ({
      id: String(s.id ?? s.name ?? ''),
      name: String(s.name ?? ''),
      description: String(s.description ?? ''),
      icon: String(s.icon ?? '🔧'),
      enabled: s.enabled !== false,
      version: typeof s.version === 'string' ? s.version : undefined,
    }));
  }

  async toggleSkill(id: string, enabled: boolean): Promise<void> {
    await this.rpc('skills.update', { id, enabled });
  }

  async getClawHubSkills(
    _query?: string,
    _category?: string
  ): Promise<Skill[]> {
    // ClawHub browsing may not be available via RPC; return empty
    return [];
  }

  async installSkill(id: string): Promise<void> {
    await this.rpc('skills.install', { id });
  }

  // ─── Token Usage ────────────────────────────────────────────────────

  async getTokenUsage(): Promise<TokenUsage> {
    try {
      const result = await this.rpc<Record<string, unknown>>(
        'sessions.usage',
        {}
      );
      return {
        today: typeof result?.today === 'number' ? result.today : 0,
        total: typeof result?.total === 'number' ? result.total : 0,
        trend: Array.isArray(result?.trend) ? result.trend : [],
      };
    } catch {
      return { today: 0, total: 0, trend: [] };
    }
  }

  // ─── Channels ───────────────────────────────────────────────────────

  async getChannels(): Promise<Channel[]> {
    try {
      const result = await this.rpc<Record<string, unknown>>(
        'channels.status',
        { probe: false, timeoutMs: 8_000 }
      );

      const raw = Array.isArray(result?.channels)
        ? result.channels
        : typeof result === 'object' && result !== null
        ? Object.entries(result)
            .filter(([k]) => k !== 'channels')
            .map(([name, v]) => ({
              name,
              ...(typeof v === 'object' && v !== null ? v : {}),
            }))
        : [];

      return (raw as Record<string, unknown>[]).map((ch) => ({
        name: String(ch.name ?? ch.channel ?? ''),
        status:
          typeof ch.status === 'string'
            ? (ch.status as Channel['status'])
            : 'disconnected',
        lastFlap:
          typeof ch.lastFlap === 'string' ? ch.lastFlap : undefined,
        uptime: typeof ch.uptime === 'string' ? ch.uptime : undefined,
      }));
    } catch {
      return [];
    }
  }

  // ─── Activity Feed ──────────────────────────────────────────────────

  async getActivityFeed(): Promise<ActivityEvent[]> {
    // No direct RPC equivalent; return empty for now
    return [];
  }

  // ─── Memory / Agent Files ───────────────────────────────────────────

  async getMemoryFiles(): Promise<MemoryFile[]> {
    try {
      const result = await this.rpc<{
        files?: Record<string, unknown>[];
      }>('agents.files.list', {});

      const raw = Array.isArray(result?.files) ? result.files : [];
      return raw.map((f) => ({
        name: String(f.name ?? f.filename ?? ''),
        content: typeof f.content === 'string' ? f.content : '',
        lastModified:
          typeof f.lastModified === 'string'
            ? f.lastModified
            : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async getMemoryFile(name: string): Promise<MemoryFile> {
    const result = await this.rpc<Record<string, unknown>>(
      'agents.files.get',
      { name }
    );
    return {
      name: String(result?.name ?? name),
      content: typeof result?.content === 'string' ? result.content : '',
      lastModified:
        typeof result?.lastModified === 'string'
          ? result.lastModified
          : new Date().toISOString(),
    };
  }

  async updateMemoryFile(
    name: string,
    content: string
  ): Promise<MemoryFile> {
    await this.rpc('agents.files.set', { name, content });
    return { name, content, lastModified: new Date().toISOString() };
  }

  async getMemoryDiffs(_name: string): Promise<MemoryDiff[]> {
    // Not directly available via RPC
    return [];
  }

  async getDailyNotes(): Promise<DailyNote[]> {
    // Not directly available via RPC
    return [];
  }

  async searchMemory(_query: string): Promise<MemoryFile[]> {
    // Not directly available via RPC
    return [];
  }

  // ─── Nodes ──────────────────────────────────────────────────────────

  async getPairedNodes(): Promise<PairedNode[]> {
    try {
      const result = await this.rpc<{
        nodes?: Record<string, unknown>[];
      }>('node.list', {});

      const raw = Array.isArray(result?.nodes) ? result.nodes : [];
      return raw.map((n) => ({
        id: String(n.id ?? ''),
        name: String(n.name ?? n.id ?? ''),
        type: String(n.type ?? 'unknown'),
        status:
          n.status === 'online' ? ('online' as const) : ('offline' as const),
        lastSeen:
          typeof n.lastSeen === 'string'
            ? n.lastSeen
            : new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  // ─── Models ─────────────────────────────────────────────────────────

  async getAvailableModels(): Promise<
    { id: string; name: string; provider: string; contextWindow?: number }[]
  > {
    try {
      const result = await this.rpc<{
        models?: Record<string, unknown>[];
      }>('models.list', {});

      const raw = Array.isArray(result?.models) ? result.models : [];
      return raw.map((m) => ({
        id: String(m.id ?? ''),
        name: String(m.name ?? m.id ?? ''),
        provider: String(m.provider ?? ''),
        contextWindow:
          typeof m.contextWindow === 'number' ? m.contextWindow : undefined,
      }));
    } catch {
      return [];
    }
  }

  async setModelOverride(_modelId: string | null): Promise<void> {
    // Config-based; not a simple RPC call
  }

  // ─── Push Token ─────────────────────────────────────────────────────

  async registerPushToken(_token: string): Promise<void> {
    // Not available via RPC yet
  }
}
