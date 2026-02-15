// ─── Message & Related ───────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  category?: 'user' | 'assistant' | 'alert' | 'automation' | 'system';
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  sessionId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  url: string;
  size: number;
  thumbnailUrl?: string;
}

// ─── Chat Sessions ───────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ─── Cron Jobs & Automations ─────────────────────────────────────────

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | 'pending' | null;
  lastError: string | null;
  nextRun: string | null;
  runHistory?: CronRunRecord[];
  createdAt?: string;
  updatedAt?: string;
  /** The message/command the automation sends when triggered */
  input?: string;
  /** Human-readable description of what this automation does */
  description?: string;
  /** Any additional fields from the API not explicitly mapped */
  rawExtras?: Record<string, unknown>;
}

export interface CronRunRecord {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'success' | 'error' | 'running';
  output?: string;
  error?: string;
  duration?: number;
}

// ─── Skills ──────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  version?: string;
  docs?: string;
  filePath?: string;
  baseDir?: string;
  emoji?: string;
  homepage?: string;
  usage?: { count: number; lastUsed: string | null };
  source?: 'installed' | 'clawhub';
}

// ─── Gateway ─────────────────────────────────────────────────────────

export interface GatewayStatus {
  connected: boolean;
  model: string;
  uptime: string;
  version: string;
  channels: { name: string; status: string }[];
  sessionId: string | null;
  tokenUsage?: TokenUsage;
  pairedNodes?: PairedNode[];
}

export interface GatewayConfig {
  url: string;
  token: string;
}

// ─── Token Usage ─────────────────────────────────────────────────────

export interface TokenUsage {
  today: number;
  total: number;
  limit?: number;
  trend: { date: string; tokens: number }[];
  estimatedCost?: number;
}

// ─── Channels ────────────────────────────────────────────────────────

export interface Channel {
  name: string;
  status: 'active' | 'disconnected' | 'error' | 'not_configured';
  lastFlap?: string;
  uptime?: string;
  icon?: string;
}

// ─── Paired Nodes ────────────────────────────────────────────────────

export interface PairedNode {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

// ─── Memory ──────────────────────────────────────────────────────────

export interface MemoryFile {
  name: string;
  content: string;
  lastModified: string;
}

export interface MemoryDiff {
  timestamp: string;
  author: string;
  patch: string; // unified diff format
}

export interface DailyNote {
  date: string; // YYYY-MM-DD
  content: string;
  lastModified: string;
}

// ─── Notifications ───────────────────────────────────────────────────

export interface Notification {
  id: string;
  category: 'arb_alert' | 'cron_result' | 'reminder' | 'system';
  title: string;
  body: string;
  read: boolean;
  timestamp: string;
  deepLink?: string;
}

export interface NotificationSettings {
  categories: {
    [key: string]: {
      push: boolean;
      sound: boolean;
      badge: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // "23:00"
    end: string; // "08:00"
  };
}

// ─── Activity Feed ───────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  text: string;
  category: 'chat' | 'cron' | 'channel' | 'system';
  timestamp: string;
  icon?: string;
  /** The underlying entity ID (session key, job id, or channel name) for deep navigation. */
  entityId?: string;
}

// ─── WebSocket Connection State ──────────────────────────────────────

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
