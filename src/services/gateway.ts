import { Platform } from 'react-native';
import { CronExpressionParser } from 'cron-parser';
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
import { cronToHuman } from '../utils/cronToHuman';

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

// ─── Session title humanizer ──────────────────────────────────────────

/**
 * Convert internal session keys (e.g. "agent:main:main", "agent:main:cron:cbeb076b...")
 * into user-friendly display labels.
 *
 * Known patterns:
 *   agent:<name>:main        → "Main Chat"
 *   agent:<name>:cron:<id>   → "Automation Run"
 *   agent:<name>:<other>     → title-cased <other>
 *
 * If the key doesn't match any internal pattern it's returned as-is
 * (it's likely already a human-readable title).
 */
function formatSessionTitle(key: string): string {
  // Only transform keys that look like internal colon-separated identifiers
  const parts = key.split(':');
  if (parts.length < 3 || parts[0] !== 'agent') return key;

  const segment = parts[2]; // "main", "cron", etc.

  if (segment === 'main') {
    return 'Main Chat';
  }

  if (segment === 'cron') {
    // Shorten the UUID suffix if present for a cleaner look
    const cronId = parts[3] ?? '';
    const shortId = cronId.length > 8 ? cronId.slice(0, 8) : cronId;
    return shortId ? `Automation Run · ${shortId}` : 'Automation Run';
  }

  // Fallback: title-case the segment name
  const label = segment
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return label;
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
  private _agentId: string | null = null;

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
      const connectResult = await this.rpc<Record<string, unknown>>('connect', {
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

      // Extract agentId from the connect response
      if (connectResult && typeof connectResult.agentId === 'string') {
        this._agentId = connectResult.agentId;
      } else if (connectResult && typeof connectResult.nodeId === 'string') {
        this._agentId = connectResult.nodeId;
      }

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
    return raw.map((s) => {
      // Parse timestamps robustly — the gateway may return strings, numbers (epoch ms), or omit them
      const parseTimestamp = (val: unknown): string | null => {
        if (typeof val === 'string' && val.length > 0) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        if (typeof val === 'number' && val > 0) {
          return new Date(val).toISOString();
        }
        return null;
      };

      const createdAt = parseTimestamp(s.createdAt) ?? parseTimestamp(s.created_at);
      const updatedAt = parseTimestamp(s.updatedAt) ?? parseTimestamp(s.updated_at);

      // Use the best available timestamp; never fall back to "now" which causes
      // stale sessions to always appear as "just now" on every poll.
      const bestTimestamp = updatedAt ?? createdAt ?? null;

      const rawKey = typeof s.key === 'string' ? s.key : typeof s.id === 'string' ? s.id : '';

      return {
        id: rawKey || uuid(),
        title:
          typeof s.title === 'string'
            ? s.title
            : rawKey
            ? formatSessionTitle(rawKey)
            : 'Session',
        createdAt: createdAt ?? bestTimestamp ?? new Date(0).toISOString(),
        updatedAt: bestTimestamp ?? new Date(0).toISOString(),
        messageCount:
          typeof s.messageCount === 'number'
            ? s.messageCount
            : typeof s.message_count === 'number'
            ? s.message_count
            : typeof s.messages === 'number'
            ? s.messages
            : typeof s.numMessages === 'number'
            ? s.numMessages
            : typeof s.count === 'number'
            ? s.count
            : -1, // -1 signals "unknown" — the API didn't provide a count
      };
    });
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

    // Opportunistically cache agentId from the status response
    if (!this._agentId) {
      for (const key of ['agentId', 'agent_id', 'nodeId', 'node_id']) {
        if (typeof status[key] === 'string' && status[key]) {
          this._agentId = status[key] as string;
          break;
        }
      }
      if (!this._agentId) {
        const agent = status.agent as Record<string, unknown> | undefined;
        if (agent && typeof agent.id === 'string' && agent.id) {
          this._agentId = agent.id;
        }
      }
    }

    // Extract model from nested sessions.defaults.model
    const sessions = status.sessions as Record<string, unknown> | undefined;
    const defaults = sessions?.defaults as Record<string, unknown> | undefined;
    const recentSessions = (sessions?.recent as Array<Record<string, unknown>>) || [];
    const firstRecent = recentSessions[0];

    const model =
      typeof status.model === 'string'
        ? status.model
        : typeof status.defaultModel === 'string'
        ? status.defaultModel
        : defaults && typeof defaults.model === 'string'
        ? defaults.model
        : 'unknown';

    // Extract session ID from the most recent session
    const sessionId =
      firstRecent && typeof firstRecent.sessionId === 'string'
        ? firstRecent.sessionId
        : null;

    // Uptime: check top-level first, then fall back
    const uptime =
      typeof status.uptime === 'string'
        ? status.uptime
        : typeof status.uptimeMs === 'number'
        ? `${Math.floor((status.uptimeMs as number) / 1000 / 60)}m`
        : undefined;

    const version =
      typeof status.version === 'string' ? status.version : undefined;

    // Try to extract token usage from status response
    let tokenUsage: TokenUsage | undefined;
    for (const key of ['usage', 'tokenUsage', 'tokens']) {
      const val = status[key];
      if (val && typeof val === 'object') {
        const extracted = this.extractUsageData(val as Record<string, unknown>);
        if (extracted) {
          tokenUsage = extracted;
          break;
        }
      }
    }
    if (!tokenUsage && sessions) {
      for (const key of ['usage', 'tokenUsage', 'tokens']) {
        const val = sessions[key];
        if (val && typeof val === 'object') {
          const extracted = this.extractUsageData(val as Record<string, unknown>);
          if (extracted) {
            tokenUsage = extracted;
            break;
          }
        }
      }
    }

    return {
      connected: true,
      model,
      uptime: uptime || '—',
      version: version || '—',
      channels: [],
      sessionId,
      tokenUsage,
    };
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────────

  async getCronJobs(): Promise<CronJob[]> {
    const result = await this.rpc<{
      jobs?: Record<string, unknown>[];
    }>('cron.list', { includeDisabled: true });

    const raw = Array.isArray(result?.jobs) ? result.jobs : [];
    return raw.map((j) => {
      // schedule can be a string or an object { kind, expr, tz }
      const scheduleObj = j.schedule as Record<string, unknown> | string | undefined;
      const cronExpr =
        typeof scheduleObj === 'string'
          ? scheduleObj
          : typeof scheduleObj === 'object' && scheduleObj !== null
            ? String(scheduleObj.expr ?? '')
            : String(j.cronExpr ?? '');
      const scheduleTz =
        typeof scheduleObj === 'object' && scheduleObj !== null
          ? String(scheduleObj.tz ?? '')
          : '';
      const scheduleHuman = String(
        j.scheduleHuman ?? j.description ?? cronToHuman(cronExpr)
      );

      // state may contain nextRunAtMs, lastRunAtMs, lastStatus
      const state = (j.state ?? {}) as Record<string, unknown>;

      // Resolve nextRun: prefer explicit nextRun string, then state.nextRunAtMs timestamp
      let nextRun: string | null =
        typeof j.nextRun === 'string'
          ? j.nextRun
          : typeof state.nextRunAtMs === 'number'
            ? new Date(state.nextRunAtMs).toISOString()
            : null;

      // Fallback: compute nextRun from cron expression if still missing
      if (!nextRun && cronExpr && j.enabled !== false) {
        try {
          const parseOpts = scheduleTz ? { tz: scheduleTz } : undefined;
          const interval = CronExpressionParser.parse(cronExpr, parseOpts);
          nextRun = interval.next().toISOString();
        } catch {
          // Invalid cron expression — leave nextRun as null
        }
      }

      // Resolve lastRun: prefer explicit lastRun string, then state.lastRunAtMs timestamp
      const lastRun: string | null =
        typeof j.lastRun === 'string'
          ? j.lastRun
          : typeof state.lastRunAtMs === 'number'
            ? new Date(state.lastRunAtMs).toISOString()
            : null;

      // Resolve lastStatus from job-level or state
      const rawStatus = j.lastStatus ?? state.lastStatus;
      const lastStatus: CronJob['lastStatus'] =
        typeof rawStatus === 'string'
          ? (rawStatus as CronJob['lastStatus'])
          : null;

      // Resolve lastError from job-level, state, or lastOutput when status is error
      const rawError = j.lastError ?? state.lastError ?? j.error ?? state.error;
      const lastError: string | null =
        typeof rawError === 'string' && rawError.length > 0
          ? rawError
          : lastStatus === 'error' && typeof (j.lastOutput ?? state.lastOutput) === 'string'
            ? String(j.lastOutput ?? state.lastOutput)
            : null;

      // Resolve input/command: the message or action the automation performs
      const rawInput = j.input ?? j.command ?? j.message ?? j.prompt ?? j.action;
      const input: string | undefined =
        typeof rawInput === 'string' && rawInput.length > 0
          ? rawInput
          : undefined;

      // Resolve description: human-readable explanation of the automation
      const rawDesc = j.description ?? j.desc ?? j.summary;
      const description: string | undefined =
        typeof rawDesc === 'string' && rawDesc.length > 0
          ? rawDesc
          : undefined;

      // Collect any extra fields not explicitly mapped
      const mappedKeys = new Set([
        'id', 'name', 'schedule', 'cronExpr', 'scheduleHuman',
        'enabled', 'lastRun', 'lastStatus', 'lastError', 'nextRun',
        'state', 'error', 'lastOutput', 'description', 'desc', 'summary',
        'input', 'command', 'message', 'prompt', 'action',
      ]);
      const rawExtras: Record<string, unknown> = {};
      for (const key of Object.keys(j)) {
        if (!mappedKeys.has(key)) {
          rawExtras[key] = j[key];
        }
      }

      return {
        id: String(j.id ?? j.name ?? ''),
        name: String(j.name ?? ''),
        schedule: cronExpr,
        scheduleHuman: scheduleHuman,
        enabled: j.enabled !== false,
        lastRun,
        lastStatus,
        lastError,
        nextRun,
        input,
        description,
        rawExtras: Object.keys(rawExtras).length > 0 ? rawExtras : undefined,
      };
    });
  }

  async runCronJob(id: string): Promise<void> {
    // Cron jobs can take a while — use a longer timeout (120s) so we
    // don't falsely report failure while the job is still running.
    await this.rpc('cron.run', { id }, CHAT_TIMEOUT_MS);
  }

  async toggleCronJob(id: string, enabled: boolean): Promise<void> {
    await this.rpc('cron.update', { jobId: id, patch: { enabled } });
  }

  async getCronRunHistory(id: string): Promise<CronRunRecord[]> {
    let result: Record<string, unknown> | null = null;

    // Try the dedicated run history RPC — the gateway may use different
    // method names or param keys depending on version.
    try {
      result = await this.rpc<Record<string, unknown>>('cron.runs', { id });
    } catch {
      // Fall back to alternative method name
      try {
        result = await this.rpc<Record<string, unknown>>('cron.history', { id });
      } catch {
        // Neither RPC exists — fall back to job-embedded history below
      }
    }

    // The gateway may nest runs under various keys, or return the array directly
    let raw: Record<string, unknown>[] = [];
    if (result) {
      if (Array.isArray(result)) {
        raw = result as unknown as Record<string, unknown>[];
      } else if (Array.isArray(result.runs)) {
        raw = result.runs as Record<string, unknown>[];
      } else if (Array.isArray(result.history)) {
        raw = result.history as Record<string, unknown>[];
      } else if (Array.isArray(result.records)) {
        raw = result.records as Record<string, unknown>[];
      }
    }

    // If the dedicated RPC returned nothing, try extracting history from
    // the cron job object itself (some gateways embed it inline).
    if (raw.length === 0) {
      try {
        const jobResult = await this.rpc<{ jobs?: Record<string, unknown>[] }>(
          'cron.list',
          { includeDisabled: true },
        );
        const jobs = Array.isArray(jobResult?.jobs) ? jobResult.jobs : [];
        const job = jobs.find(
          (j) => String(j.id ?? j.name ?? '') === id,
        );
        if (job) {
          const embedded =
            (job.runs ?? job.runHistory ?? job.run_history ?? job.history) as
              | Record<string, unknown>[]
              | undefined;
          if (Array.isArray(embedded)) {
            raw = embedded;
          }

          // Last resort: synthesize a single entry from the job's last-run info
          // so the user always sees *something* if the job has run at all.
          if (raw.length === 0) {
            const st = (job.state ?? {}) as Record<string, unknown>;
            const lastRunTs =
              job.lastRun ?? st.lastRunAtMs ?? job.last_run ?? st.last_run_at_ms;
            if (lastRunTs) {
              const ts =
                typeof lastRunTs === 'number'
                  ? new Date(lastRunTs).toISOString()
                  : String(lastRunTs);
              const status = String(
                job.lastStatus ?? st.lastStatus ?? st.last_status ?? 'success',
              );
              const errMsg =
                job.lastError ?? st.lastError ?? job.error ?? st.error;
              const output =
                job.lastOutput ?? st.lastOutput ?? st.last_output;

              raw = [
                {
                  id: `synth-${id}-${ts}`,
                  startedAt: ts,
                  completedAt: ts,
                  status,
                  output: typeof output === 'string' ? output : undefined,
                  error: typeof errMsg === 'string' ? errMsg : undefined,
                },
              ];
            }
          }
        }
      } catch {
        // Could not fetch job details either — return empty
      }
    }

    return raw.map((r) => ({
      id: String(r.id ?? ''),
      startedAt: String(r.startedAt ?? r.started_at ?? ''),
      completedAt:
        typeof r.completedAt === 'string'
          ? r.completedAt
          : typeof r.completed_at === 'string'
            ? r.completed_at
            : null,
      status:
        typeof r.status === 'string'
          ? (r.status as CronRunRecord['status'])
          : 'success',
      output: typeof r.output === 'string' ? r.output : undefined,
      error:
        typeof r.error === 'string'
          ? r.error
          : typeof r.errorMessage === 'string'
            ? r.errorMessage
            : typeof r.error_message === 'string'
              ? r.error_message
              : undefined,
      duration: typeof r.duration === 'number' ? r.duration : undefined,
    }));
  }

  async createCronJob(job: Partial<CronJob>): Promise<CronJob> {
    const result = await this.rpc<Record<string, unknown>>('cron.add', job);
    const schedule = String(result?.schedule ?? job.schedule ?? '');
    return {
      id: String(result?.id ?? job.name ?? ''),
      name: String(result?.name ?? job.name ?? ''),
      schedule,
      scheduleHuman: String(result?.scheduleHuman || cronToHuman(schedule)),
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
      jobId: id,
      patch,
    });
    const schedule = String(result?.schedule ?? patch.schedule ?? '');
    return {
      id: String(result?.id ?? id),
      name: String(result?.name ?? patch.name ?? ''),
      schedule,
      scheduleHuman: String(result?.scheduleHuman || cronToHuman(schedule)),
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

    return (raw as Record<string, unknown>[]).map((s) => {
      // Extract usage stats if present
      const rawUsage = s.usage as Record<string, unknown> | undefined;
      const usage = rawUsage && typeof rawUsage === 'object'
        ? {
            count: typeof rawUsage.count === 'number' ? rawUsage.count : 0,
            lastUsed: typeof rawUsage.lastUsed === 'string' ? rawUsage.lastUsed : null,
          }
        : undefined;

      return {
        id: String(s.id ?? s.skillKey ?? s.name ?? ''),
        name: String(s.name ?? ''),
        description: String(s.description ?? ''),
        icon: String(s.icon ?? ''),
        enabled: s.disabled !== true && s.enabled !== false,
        version: typeof s.version === 'string' ? s.version : undefined,
        filePath: typeof s.filePath === 'string' ? s.filePath : undefined,
        baseDir: typeof s.baseDir === 'string' ? s.baseDir : undefined,
        emoji: typeof s.emoji === 'string' ? s.emoji : undefined,
        homepage: typeof s.homepage === 'string' ? s.homepage : undefined,
        usage,
      };
    });
  }

  async toggleSkill(id: string, enabled: boolean): Promise<void> {
    await this.rpc('skills.update', { id, enabled });
  }

  /**
   * Fetch documentation for a specific skill by reading its SKILL.md file.
   * The filePath comes from the skills.status response.
   *
   * Primary strategy: read the file via the Metro dev server middleware
   * (metro.config.js exposes /api/readfile?path=...).
   * Fallback: try gateway RPC methods.
   */
  async getSkillDocs(id: string, filePath?: string): Promise<string | null> {
    const raw = await this._fetchSkillDocsRaw(id, filePath);
    if (!raw) return null;
    // Strip YAML frontmatter (--- delimited block at start of file)
    return GatewayClient.stripFrontmatter(raw);
  }

  /**
   * Strip YAML frontmatter from markdown content.
   * Frontmatter is a block delimited by --- at the very start of the file.
   */
  private static stripFrontmatter(md: string): string {
    const trimmed = md.trimStart();
    if (!trimmed.startsWith('---')) return md;
    // Find the closing ---
    const endIdx = trimmed.indexOf('---', 3);
    if (endIdx === -1) return md;
    // Return everything after the closing --- (skip the newline after it)
    const afterFrontmatter = trimmed.slice(endIdx + 3).replace(/^\r?\n/, '');
    return afterFrontmatter.trimStart();
  }

  private async _fetchSkillDocsRaw(id: string, filePath?: string): Promise<string | null> {
    // Strategy 1: Read the SKILL.md via Metro dev server middleware.
    // The Metro dev server runs on the same host and can read local files.
    if (filePath) {
      try {
        // In Expo Go / dev mode, the Metro bundler URL is available via __DEV__
        // and typically runs on port 8081. We try common origins.
        const metroOrigins = [
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          'http://192.168.1.128:8081', // local network IP from terminal
        ];
        for (const origin of metroOrigins) {
          try {
            const resp = await fetch(
              `${origin}/api/readfile?path=${encodeURIComponent(filePath)}`,
              { headers: { Accept: 'text/plain' } }
            );
            if (resp.ok) {
              const contentType = resp.headers.get('content-type') || '';
              // Only accept plain text, not HTML (avoid gateway SPA fallback)
              if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
                const text = await resp.text();
                if (text && text.length > 10 && !text.trimStart().startsWith('<!')) {
                  return text;
                }
              }
            }
          } catch {
            // This origin not reachable, try next
          }
        }
      } catch {
        // Metro middleware not available
      }
    }

    // Strategy 2: Try describe_skill RPC (Skills Protocol)
    try {
      const result = await this.rpc<Record<string, unknown>>(
        'describe_skill',
        { id, detail: 'full' }
      );
      const content =
        typeof result?.skill_md_content === 'string' ? result.skill_md_content :
        typeof result?.content === 'string' ? result.content :
        typeof result?.docs === 'string' ? result.docs :
        typeof result?.documentation === 'string' ? result.documentation :
        null;
      if (content) return content;
    } catch {
      // describe_skill not available
    }

    // Strategy 3: Try read_skill_file RPC (Skills Protocol)
    if (filePath) {
      try {
        const result = await this.rpc<Record<string, unknown>>(
          'read_skill_file',
          { id, path: filePath }
        );
        const content =
          typeof result === 'string' ? result :
          typeof result?.content === 'string' ? result.content :
          typeof result?.data === 'string' ? result.data :
          null;
        if (content) return content;
      } catch {
        // read_skill_file not available
      }
    }

    return null;
  }

  async getClawHubSkills(
    query?: string,
    category?: string
  ): Promise<Skill[]> {
    // Strategy 1: Try gateway RPC methods for ClawHub browsing.
    const rpcParams: Record<string, unknown> = {};
    if (query) rpcParams.query = query;
    if (category) rpcParams.category = category;

    const rpcMethods = ['clawhub.search', 'clawhub.list'];
    for (const method of rpcMethods) {
      try {
        const result = await this.rpc<Record<string, unknown> | Record<string, unknown>[]>(
          method,
          rpcParams
        );
        const raw = Array.isArray(result)
          ? result
          : Array.isArray((result as Record<string, unknown>)?.skills)
            ? (result as Record<string, unknown>).skills as Record<string, unknown>[]
            : Array.isArray((result as Record<string, unknown>)?.items)
              ? (result as Record<string, unknown>).items as Record<string, unknown>[]
              : null;
        if (raw && raw.length > 0) {
          return this.parseClawHubSkills(raw as Record<string, unknown>[]);
        }
      } catch {
        // This RPC method not available, try next
      }
    }

    // Strategy 2: Fetch from the ClawHub public REST API (clawhub.ai).
    try {
      return await this.fetchClawHubREST(query, category);
    } catch {
      // ClawHub REST API not reachable
    }

    return [];
  }

  /**
   * Fetch skills from the ClawHub public REST API at clawhub.ai/api/v1/skills.
   * Response shape: { items: [...], nextCursor?: string }
   * Item shape: { slug, displayName, summary, tags, stats, createdAt, updatedAt, latestVersion }
   */
  private async fetchClawHubREST(
    query?: string,
    category?: string
  ): Promise<Skill[]> {
    const baseUrl = 'https://clawhub.ai/api/v1/skills';
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;

    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!resp.ok) return [];

    const text = await resp.text();
    // Guard against HTML responses (e.g. redirects or error pages)
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
      return [];
    }

    const data = JSON.parse(text);
    const raw: Record<string, unknown>[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.skills)
          ? data.skills
          : [];

    return this.parseClawHubSkills(raw);
  }

  /**
   * Normalize raw ClawHub skill objects into our Skill interface.
   * Handles both gateway RPC shape and the clawhub.ai REST API shape:
   *   REST: { slug, displayName, summary, tags: { latest }, stats, latestVersion: { version } }
   *   RPC:  { id, name, description, icon, version }
   */
  private parseClawHubSkills(raw: Record<string, unknown>[]): Skill[] {
    return raw.map((s) => {
      // Extract version from either direct field or nested structures
      const latestVersion = s.latestVersion as Record<string, unknown> | undefined;
      const tags = s.tags as Record<string, unknown> | undefined;
      const version =
        typeof s.version === 'string'
          ? s.version
          : typeof latestVersion?.version === 'string'
            ? latestVersion.version
            : typeof tags?.latest === 'string'
              ? tags.latest
              : undefined;

      // Extract download/star count for display
      const stats = s.stats as Record<string, unknown> | undefined;
      const downloads = typeof stats?.downloads === 'number' ? stats.downloads : 0;

      return {
        id: String(s.id ?? s.slug ?? s.skillKey ?? s.name ?? ''),
        name: String(s.displayName ?? s.name ?? s.title ?? s.slug ?? ''),
        description: String(s.summary ?? s.description ?? s.short_description ?? ''),
        icon: String(s.icon ?? s.emoji ?? ''),
        enabled: true,
        version,
        homepage: typeof s.homepage === 'string'
          ? s.homepage
          : typeof s.url === 'string'
            ? s.url
            : typeof s.slug === 'string'
              ? `https://clawhub.ai/skills/${s.slug}`
              : undefined,
        source: 'clawhub' as const,
        usage: downloads > 0 ? { count: downloads, lastUsed: null } : undefined,
      };
    });
  }

  async installSkill(id: string): Promise<void> {
    await this.rpc('skills.install', { id });
  }

  // ─── Token Usage ────────────────────────────────────────────────────

  /**
   * Extract token usage data from a raw object, handling various field naming
   * conventions the gateway may use.
   */
  private extractUsageData(obj: Record<string, unknown>): TokenUsage | null {
    const today =
      typeof obj.today === 'number' ? obj.today :
      typeof obj.todayTokens === 'number' ? obj.todayTokens :
      typeof obj.tokens_today === 'number' ? obj.tokens_today :
      typeof obj.dailyTokens === 'number' ? obj.dailyTokens : 0;

    const total =
      typeof obj.total === 'number' ? obj.total :
      typeof obj.totalTokens === 'number' ? obj.totalTokens :
      typeof obj.tokens_total === 'number' ? obj.tokens_total :
      typeof obj.allTimeTokens === 'number' ? obj.allTimeTokens : 0;

    if (today === 0 && total === 0) return null;

    const limit =
      typeof obj.limit === 'number' ? obj.limit : undefined;
    const estimatedCost =
      typeof obj.estimatedCost === 'number' ? obj.estimatedCost :
      typeof obj.cost === 'number' ? obj.cost : undefined;
    const trend = Array.isArray(obj.trend) ? obj.trend : [];

    return { today, total, trend, limit, estimatedCost };
  }

  async getTokenUsage(): Promise<TokenUsage> {
    // Track the best result across strategies.
    // Only return early if we have BOTH total > 0 AND today > 0.
    // If we only have total (today === 0), keep trying other strategies
    // that may compute the daily breakdown.
    let bestResult: TokenUsage | null = null;

    const keepBest = (candidate: TokenUsage | null): boolean => {
      if (!candidate) return false;
      // Complete data (today > 0) — use immediately
      if (candidate.today > 0) {
        bestResult = candidate;
        return true;
      }
      // Partial data (total > 0 but today = 0) — save but keep looking
      if (!bestResult || candidate.total > bestResult.total) {
        bestResult = candidate;
      }
      return false;
    };

    // Strategy 1: Try dedicated sessions.usage RPC
    try {
      const result = await this.rpc<Record<string, unknown>>(
        'sessions.usage',
        {}
      );
      if (result && typeof result === 'object') {
        // Direct fields on result (e.g. { today: N, total: N })
        if (keepBest(this.extractUsageData(result))) return bestResult!;

        // Nested under a "usage" key (e.g. { usage: { today: N, total: N } })
        if (typeof result.usage === 'object' && result.usage !== null) {
          if (keepBest(this.extractUsageData(result.usage as Record<string, unknown>))) return bestResult!;
        }
      }
    } catch (e) {
      // sessions.usage may not be supported — fall through to alternatives
      console.warn('[Gateway] sessions.usage failed, trying fallbacks:', e instanceof Error ? e.message : e);
    }

    // Strategy 2: Extract usage from the status RPC (which we know works)
    try {
      const status = await this.rpc<Record<string, unknown>>('status', {});

      // Check top-level paths: status.usage, status.tokenUsage, status.tokens
      for (const key of ['usage', 'tokenUsage', 'tokens']) {
        const val = status[key];
        if (val && typeof val === 'object') {
          if (keepBest(this.extractUsageData(val as Record<string, unknown>))) return bestResult!;
        }
      }

      // Check nested under sessions: status.sessions.usage, etc.
      const sessions = status.sessions as Record<string, unknown> | undefined;
      if (sessions) {
        for (const key of ['usage', 'tokenUsage', 'tokens']) {
          const val = sessions[key];
          if (val && typeof val === 'object') {
            if (keepBest(this.extractUsageData(val as Record<string, unknown>))) return bestResult!;
          }
        }
      }
    } catch (e) {
      console.warn('[Gateway] status RPC for usage data failed:', e instanceof Error ? e.message : e);
    }

    // Strategy 3: Aggregate token counts from sessions.list
    // Always attempt this if we still don't have a daily total
    try {
      const result = await this.rpc<Record<string, unknown>>('sessions.list', {});

      // Check for top-level usage data in the response
      if (result && typeof result === 'object') {
        for (const key of ['usage', 'tokenUsage', 'tokens']) {
          const val = result[key];
          if (val && typeof val === 'object') {
            if (keepBest(this.extractUsageData(val as Record<string, unknown>))) return bestResult!;
          }
        }
      }

      // Sum per-session token counts and compute daily total from timestamps
      const sessionsArr = Array.isArray(result?.sessions) ? result.sessions as Record<string, unknown>[] : [];
      if (sessionsArr.length > 0) {
        let total = 0;
        let today = 0;
        const now = new Date();
        const todayUTC = now.toISOString().slice(0, 10);
        // Also compute local date string for matching (handles timezone offset)
        const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        for (const s of sessionsArr) {
          const tokens =
            typeof s.totalTokens === 'number' ? s.totalTokens :
            typeof s.tokens === 'number' ? s.tokens :
            typeof s.tokenCount === 'number' ? s.tokenCount : 0;
          total += tokens;

          // Check multiple timestamp fields for "today" matching
          const tsFields = [s.updatedAt, s.updated_at, s.createdAt, s.created_at, s.lastActive, s.timestamp];
          const tsValue = tsFields.find((f) => typeof f === 'string' && f.length > 0) as string | undefined;

          if (tsValue) {
            // Match against both UTC and local date strings
            if (tsValue.startsWith(todayUTC) || tsValue.startsWith(todayLocal)) {
              today += tokens;
            }
          }
        }

        if (total > 0) {
          // If we had a bestResult from an earlier strategy with extra fields
          // (limit, estimatedCost, trend), merge session-computed today into it
          if (bestResult && bestResult.today === 0) {
            return { ...bestResult, today, total: Math.max(bestResult.total, total) };
          }
          return { today, total, trend: [] };
        }
      }
    } catch (e) {
      console.warn('[Gateway] sessions.list for usage data failed:', e instanceof Error ? e.message : e);
    }

    if (bestResult) return bestResult;

    console.warn('[Gateway] All token usage strategies returned no data');
    return { today: 0, total: 0, trend: [] };
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

  /**
   * Build a composite activity feed by aggregating recent data from
   * chat sessions, cron runs, and channels.
   */
  async getActivityFeed(): Promise<ActivityEvent[]> {
    const events: ActivityEvent[] = [];

    // 1. Recent chat sessions → activity events
    try {
      const sessions = await this.getChatSessions();
      for (const s of sessions.slice(0, 10)) {
        // Only show message count when the API actually provided one (> 0)
        const suffix =
          s.messageCount > 0
            ? ` · ${s.messageCount} ${s.messageCount === 1 ? 'message' : 'messages'}`
            : '';
        events.push({
          id: `chat-${s.id}`,
          text: `${s.title}${suffix}`,
          category: 'chat',
          timestamp: s.updatedAt,
          icon: 'chatbubble',
          entityId: s.id,
        });
      }
    } catch {
      // silently skip if chat sessions unavailable
    }

    // 2. Recent cron runs → activity events
    try {
      const jobs = await this.getCronJobs();
      for (const job of jobs) {
        if (job.lastRun) {
          const statusLabel =
            job.lastStatus === 'success'
              ? 'ok'
              : job.lastStatus === 'error'
              ? 'failed'
              : job.lastStatus ?? 'ran';
          events.push({
            id: `cron-${job.id}`,
            text: `Cron "${job.name}" … ${statusLabel}`,
            category: 'cron',
            timestamp: job.lastRun,
            icon: 'timer',
            entityId: job.id,
          });
        }
      }
    } catch {
      // silently skip if cron jobs unavailable
    }

    // 3. Channel status → activity events
    try {
      const channels = await this.getChannels();
      for (const ch of channels) {
        if (ch.status === 'active' || ch.status === 'error') {
          events.push({
            id: `channel-${ch.name}`,
            text: `Channel "${ch.name}" ${ch.status}`,
            category: 'channel',
            timestamp: ch.lastFlap ?? new Date().toISOString(),
            icon: ch.status === 'active' ? 'radio' : 'warning',
            entityId: ch.name,
          });
        }
      }
    } catch {
      // silently skip if channels unavailable
    }

    // Sort newest first
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return events;
  }

  // ─── Agent ID resolution ────────────────────────────────────────────

  private async resolveAgentId(): Promise<string> {
    // Return cached agentId if available
    if (this._agentId) return this._agentId;

    // Strategy 1: Try the status response for agent/node info
    try {
      const status = await this.rpc<Record<string, unknown>>('status', {});
      for (const key of ['agentId', 'agent_id', 'nodeId', 'node_id']) {
        if (typeof status[key] === 'string' && status[key]) {
          this._agentId = status[key] as string;
          return this._agentId;
        }
      }
      // Check nested agent object
      const agent = status.agent as Record<string, unknown> | undefined;
      if (agent && typeof agent.id === 'string' && agent.id) {
        this._agentId = agent.id;
        return this._agentId;
      }
    } catch {
      // status call failed, try next strategy
    }

    // Strategy 2: Try agents.list to discover available agents
    try {
      const result = await this.rpc<Record<string, unknown>>('agents.list', {});
      const agents = Array.isArray(result)
        ? result
        : Array.isArray((result as Record<string, unknown>)?.agents)
        ? ((result as Record<string, unknown>).agents as Record<string, unknown>[])
        : [];
      if (agents.length > 0) {
        const first = agents[0];
        const id = typeof first === 'string' ? first : String(first.id ?? first.agentId ?? '');
        if (id) {
          this._agentId = id;
          return id;
        }
      }
    } catch {
      // agents.list not available, try next strategy
    }

    // Strategy 3: Try node.list
    try {
      const nodes = await this.getPairedNodes();
      const online = nodes.find((n) => n.status === 'online');
      const node = online ?? nodes[0];
      if (node?.id) {
        this._agentId = node.id;
        return node.id;
      }
    } catch {
      // node.list not available
    }

    // Strategy 4: Use "default" as a fallback — many single-agent gateways accept this
    this._agentId = 'default';
    return 'default';
  }

  // ─── Memory / Agent Files ───────────────────────────────────────────

  async getMemoryFiles(): Promise<MemoryFile[]> {
    const agentId = await this.resolveAgentId();
    const result = await this.rpc<
      Record<string, unknown> | Record<string, unknown>[]
    >('agents.files.list', { agentId });

    // The response might be { files: [...] } or just a raw array
    let raw: Record<string, unknown>[];
    if (Array.isArray(result)) {
      raw = result;
    } else if (result && Array.isArray((result as Record<string, unknown>).files)) {
      raw = (result as Record<string, unknown>).files as Record<string, unknown>[];
    } else {
      raw = [];
    }

    return raw.map((f) => {
      // Content may be under different keys
      let content = '';
      for (const key of ['content', 'body', 'text', 'data']) {
        if (typeof f[key] === 'string') {
          content = f[key] as string;
          break;
        }
      }
      return {
        name: String(f.name ?? f.filename ?? ''),
        content,
        lastModified:
          typeof f.lastModified === 'string'
            ? f.lastModified
            : typeof f.updatedAt === 'string'
            ? f.updatedAt
            : new Date().toISOString(),
      };
    });
  }

  async getMemoryFile(name: string): Promise<MemoryFile> {
    const agentId = await this.resolveAgentId();
    const result = await this.rpc<Record<string, unknown>>(
      'agents.files.get',
      { agentId, name }
    );

    // The file data may be at the top level or nested under a 'file' key
    const fileData =
      result?.file && typeof result.file === 'object'
        ? (result.file as Record<string, unknown>)
        : result;

    // Content may be under different keys
    let content = '';
    for (const key of ['content', 'body', 'text', 'data']) {
      if (typeof fileData?.[key] === 'string') {
        content = fileData[key] as string;
        break;
      }
    }

    return {
      name: String(fileData?.name ?? fileData?.filename ?? name),
      content,
      lastModified:
        typeof fileData?.lastModified === 'string'
          ? fileData.lastModified
          : typeof fileData?.updatedAt === 'string'
          ? fileData.updatedAt
          : new Date().toISOString(),
    };
  }

  async updateMemoryFile(
    name: string,
    content: string
  ): Promise<MemoryFile> {
    const agentId = await this.resolveAgentId();
    await this.rpc('agents.files.set', { agentId, name, content });
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

  async setModelOverride(modelId: string | null): Promise<void> {
    await this.rpc('models.set', { model: modelId });
  }

  // ─── Push Token ─────────────────────────────────────────────────────

  async registerPushToken(_token: string): Promise<void> {
    // Not available via RPC yet
  }
}
