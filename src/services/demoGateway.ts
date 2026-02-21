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
} from '../types';
import { GatewayClient } from './gateway';
import {
  DEMO_STATUS,
  DEMO_SESSIONS,
  DEMO_MESSAGES,
  DEMO_CRON_JOBS,
  DEMO_CRON_RUN_HISTORY,
  DEMO_SKILLS,
  DEMO_MEMORY_FILES,
  DEMO_TOKEN_USAGE,
  DEMO_CHANNELS,
  DEMO_PAIRED_NODES,
  DEMO_ACTIVITY_FEED,
  DEMO_DAILY_NOTES,
  DEMO_MODELS,
  DEMO_RESPONSES,
} from './demoData';

function uuid(): string {
  const hex = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) id += '-';
    else if (i === 14) id += '4';
    else if (i === 19) id += hex[(Math.random() * 4) | 8];
    else id += hex[(Math.random() * 16) | 0];
  }
  return id;
}

/**
 * A mock gateway client that returns realistic demo data without
 * making any network requests. Designed for App Store review and
 * "try before you buy" exploration.
 */
export class DemoGatewayClient extends GatewayClient {
  private _demoSessions: ChatSession[];
  private _demoMessages: Record<string, Message[]>;
  private _demoCronJobs: CronJob[];
  private _demoSkills: Skill[];
  private _demoMemoryFiles: MemoryFile[];
  private _demoModel: string;
  private _connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private _responseCounter = 0;

  constructor() {
    super('http://demo.local', 'demo-token');
    this._demoSessions = JSON.parse(JSON.stringify(DEMO_SESSIONS));
    this._demoMessages = JSON.parse(JSON.stringify(DEMO_MESSAGES));
    this._demoCronJobs = JSON.parse(JSON.stringify(DEMO_CRON_JOBS));
    this._demoSkills = JSON.parse(JSON.stringify(DEMO_SKILLS));
    this._demoMemoryFiles = JSON.parse(JSON.stringify(DEMO_MEMORY_FILES));
    this._demoModel = 'gpt-4o';
  }

  // ─── Connection lifecycle (no real WebSocket) ───────────────────────

  connect(): void {
    this.setWsState('connecting');
    this._connectTimeout = setTimeout(() => {
      this._isAuthenticated = true;
      this.setWsState('connected');
    }, 200);
  }

  disconnect(): void {
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
    this._isAuthenticated = false;
    this.setWsState('disconnected');
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  // ─── Chat ───────────────────────────────────────────────────────────

  async sendMessage(text: string, sessionId?: string): Promise<Message> {
    const key = sessionId || 'agent:atlas:main';

    const userMsg: Message = {
      id: `msg-${uuid()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      sessionId: key,
    };

    if (!this._demoMessages[key]) {
      this._demoMessages[key] = [];
    }
    this._demoMessages[key].push(userMsg);

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const responseText = DEMO_RESPONSES[this._responseCounter % DEMO_RESPONSES.length];
    this._responseCounter++;

    const assistantMsg: Message = {
      id: `msg-${uuid()}`,
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      sessionId: key,
    };

    this._demoMessages[key].push(assistantMsg);

    // Update session message count
    const session = this._demoSessions.find((s) => s.id === key);
    if (session) {
      session.messageCount += 2;
      session.updatedAt = new Date().toISOString();
    }

    return assistantMsg;
  }

  async getChatHistory(sessionId?: string, _limit = 200): Promise<Message[]> {
    const key = sessionId || 'agent:atlas:main';
    return this._demoMessages[key] ?? [];
  }

  async searchMessages(query: string): Promise<Message[]> {
    const q = query.toLowerCase();
    const allMessages: Message[] = [];
    for (const msgs of Object.values(this._demoMessages)) {
      allMessages.push(...msgs);
    }
    return allMessages.filter((m) => m.content.toLowerCase().includes(q));
  }

  // ─── Sessions ───────────────────────────────────────────────────────

  async getChatSessions(): Promise<ChatSession[]> {
    return [...this._demoSessions];
  }

  async deleteSession(sessionKey: string): Promise<void> {
    this._demoSessions = this._demoSessions.filter((s) => s.id !== sessionKey);
    delete this._demoMessages[sessionKey];
  }

  async renameSession(sessionKey: string, title: string): Promise<void> {
    const session = this._demoSessions.find((s) => s.id === sessionKey);
    if (session) session.title = title;
  }

  // ─── Status & Health ────────────────────────────────────────────────

  async getStatus(): Promise<GatewayStatus> {
    return {
      ...DEMO_STATUS,
      model: this._demoModel,
      connected: true,
    };
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────────

  async getCronJobs(): Promise<CronJob[]> {
    return [...this._demoCronJobs];
  }

  async runCronJob(id: string): Promise<void> {
    const job = this._demoCronJobs.find((j) => j.id === id);
    if (job) {
      job.lastRun = new Date().toISOString();
      job.lastStatus = 'success';
      job.lastError = null;
    }
  }

  async toggleCronJob(id: string, enabled: boolean): Promise<void> {
    const job = this._demoCronJobs.find((j) => j.id === id);
    if (job) job.enabled = enabled;
  }

  async getCronRunHistory(id: string): Promise<CronRunRecord[]> {
    return DEMO_CRON_RUN_HISTORY[id] ?? [];
  }

  async createCronJob(job: Partial<CronJob>): Promise<CronJob> {
    const newJob: CronJob = {
      id: `demo-${uuid().slice(0, 8)}`,
      name: job.name ?? 'New Automation',
      schedule: job.schedule ?? '0 9 * * *',
      scheduleHuman: job.scheduleHuman ?? 'Every day at 9:00 AM',
      enabled: true,
      lastRun: null,
      lastStatus: null,
      lastError: null,
      nextRun: new Date(Date.now() + 24 * 3600_000).toISOString(),
      input: job.input,
      description: job.description,
    };
    this._demoCronJobs.push(newJob);
    return newJob;
  }

  async updateCronJob(id: string, patch: Partial<CronJob>): Promise<CronJob> {
    const job = this._demoCronJobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, patch);
      return job;
    }
    return { id, name: '', schedule: '', scheduleHuman: '', enabled: true, lastRun: null, lastStatus: null, lastError: null, nextRun: null };
  }

  async deleteCronJob(id: string): Promise<void> {
    this._demoCronJobs = this._demoCronJobs.filter((j) => j.id !== id);
  }

  // ─── Skills ─────────────────────────────────────────────────────────

  async getSkills(): Promise<Skill[]> {
    return [...this._demoSkills];
  }

  async toggleSkill(id: string, enabled: boolean): Promise<void> {
    const skill = this._demoSkills.find((s) => s.id === id);
    if (skill) skill.enabled = enabled;
  }

  async getSkillDocs(id: string, _filePath?: string): Promise<string | null> {
    const skill = this._demoSkills.find((s) => s.id === id);
    if (!skill) return null;
    return (
      `# ${skill.name}\n\n` +
      `${skill.description}\n\n` +
      `## Usage\n\n` +
      `This skill is invoked automatically when relevant to your request. ` +
      `You can also trigger it explicitly by mentioning "${skill.name.toLowerCase()}" in your message.\n\n` +
      `## Configuration\n\n` +
      `No additional configuration required. The skill connects through the gateway.`
    );
  }

  async getClawHubSkills(_query?: string, _category?: string): Promise<Skill[]> {
    return [
      { id: 'github-pr', name: 'GitHub PR Review', description: 'Automatically review pull requests and leave comments.', icon: '🐙', enabled: true, version: '1.0.0', source: 'clawhub' as const },
      { id: 'slack-bot', name: 'Slack Bot', description: 'Post messages and respond to mentions in Slack channels.', icon: '💬', enabled: true, version: '0.9.2', source: 'clawhub' as const },
      { id: 'pdf-reader', name: 'PDF Reader', description: 'Extract text and data from PDF documents.', icon: '📄', enabled: true, version: '1.1.0', source: 'clawhub' as const },
    ];
  }

  async installSkill(_id: string): Promise<void> {
    // No-op in demo mode
  }

  // ─── Token Usage ────────────────────────────────────────────────────

  async getTokenUsage(): Promise<TokenUsage> {
    return { ...DEMO_TOKEN_USAGE };
  }

  // ─── Channels ───────────────────────────────────────────────────────

  async getChannels(): Promise<Channel[]> {
    return [...DEMO_CHANNELS];
  }

  // ─── Activity Feed ──────────────────────────────────────────────────

  async getActivityFeed(): Promise<ActivityEvent[]> {
    return [...DEMO_ACTIVITY_FEED];
  }

  // ─── Memory / Agent Files ───────────────────────────────────────────

  async getMemoryFiles(): Promise<MemoryFile[]> {
    return this._demoMemoryFiles.map((f) => ({ ...f }));
  }

  async getMemoryFile(name: string): Promise<MemoryFile> {
    const file = this._demoMemoryFiles.find((f) => f.name === name);
    if (file) return { ...file };
    return { name, content: '', lastModified: new Date().toISOString() };
  }

  async updateMemoryFile(name: string, content: string): Promise<MemoryFile> {
    const file = this._demoMemoryFiles.find((f) => f.name === name);
    if (file) {
      file.content = content;
      file.lastModified = new Date().toISOString();
      return { ...file };
    }
    const newFile: MemoryFile = { name, content, lastModified: new Date().toISOString() };
    this._demoMemoryFiles.push(newFile);
    return newFile;
  }

  async getMemoryDiffs(_name: string): Promise<MemoryDiff[]> {
    return [];
  }

  async getDailyNotes(): Promise<DailyNote[]> {
    return [...DEMO_DAILY_NOTES];
  }

  async searchMemory(query: string): Promise<MemoryFile[]> {
    const q = query.toLowerCase();
    return this._demoMemoryFiles.filter(
      (f) => f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
    );
  }

  // ─── Nodes ──────────────────────────────────────────────────────────

  async getPairedNodes(): Promise<PairedNode[]> {
    return [...DEMO_PAIRED_NODES];
  }

  // ─── Models ─────────────────────────────────────────────────────────

  async getAvailableModels(): Promise<{ id: string; name: string; provider: string; contextWindow?: number }[]> {
    return [...DEMO_MODELS];
  }

  async setModelOverride(modelId: string | null): Promise<void> {
    if (modelId) this._demoModel = modelId;
  }

  // ─── Push Token ─────────────────────────────────────────────────────

  async registerPushToken(_token: string): Promise<void> {
    // No-op in demo mode
  }
}
