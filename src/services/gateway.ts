import { GatewayStatus, CronJob, Skill, Message } from '../types';

type MessageHandler = (message: Message) => void;

export class GatewayClient {
  private url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  async getStatus(): Promise<GatewayStatus> {
    const res = await fetch(`${this.url}/api/status`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  }

  async getCronJobs(): Promise<CronJob[]> {
    const res = await fetch(`${this.url}/api/cron`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  }

  async runCronJob(id: string): Promise<void> {
    const res = await fetch(`${this.url}/api/cron/${id}/run`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  }

  async toggleCronJob(id: string, enabled: boolean): Promise<void> {
    const res = await fetch(`${this.url}/api/cron/${id}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
  }

  async getSkills(): Promise<Skill[]> {
    const res = await fetch(`${this.url}/api/skills`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  }

  async sendMessage(text: string): Promise<Message> {
    const res = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return res.json();
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  connect() {
    const wsUrl = this.url.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(this.token);
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const msg: Message = JSON.parse(event.data);
        this.messageHandlers.forEach((h) => h(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }
}
