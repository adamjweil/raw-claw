export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: 'success' | 'error' | 'pending' | null;
  nextRun: string | null;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface GatewayStatus {
  connected: boolean;
  model: string;
  uptime: string;
  version: string;
  channels: { name: string; status: string }[];
  sessionId: string | null;
}

export interface GatewayConfig {
  url: string;
  token: string;
}
