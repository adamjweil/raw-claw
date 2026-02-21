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
  DailyNote,
  ChatSession,
  PairedNode,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600_000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString();
}

function trendForPastWeek(): { date: string; tokens: number }[] {
  const trend: { date: string; tokens: number }[] = [];
  const base = [18_340, 22_100, 15_780, 24_560, 19_870, 21_200, 12_450];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trend.push({
      date: d.toISOString().slice(0, 10),
      tokens: base[6 - i],
    });
  }
  return trend;
}

// ─── Gateway Status ───────────────────────────────────────────────────

export const DEMO_STATUS: GatewayStatus = {
  connected: true,
  model: 'gpt-4o',
  uptime: '3d 14h',
  version: '1.2.0',
  channels: [
    { name: 'Discord', status: 'active' },
    { name: 'iMessage', status: 'active' },
  ],
  sessionId: 'agent:atlas:main',
  tokenUsage: {
    today: 12_450,
    total: 847_230,
    trend: trendForPastWeek(),
    estimatedCost: 4.23,
  },
};

// ─── Chat Sessions ────────────────────────────────────────────────────

export const DEMO_SESSIONS: ChatSession[] = [
  {
    id: 'agent:atlas:main',
    title: 'Main Chat',
    createdAt: daysAgo(5),
    updatedAt: minutesAgo(12),
    messageCount: 47,
  },
  {
    id: 'agent:atlas:research',
    title: 'Research Assistant',
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(4),
    messageCount: 23,
  },
  {
    id: 'agent:atlas:cron:daily-briefing',
    title: 'Automation Run · daily-br',
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(8),
    messageCount: 6,
  },
];

// ─── Chat Messages ────────────────────────────────────────────────────

const MSG_BASE = Date.now() - 30 * 60_000;

export const DEMO_MESSAGES: Record<string, Message[]> = {
  'agent:atlas:main': [
    {
      id: 'msg-001',
      role: 'user',
      content: 'Hey Atlas, can you check my portfolio and give me a quick summary?',
      timestamp: MSG_BASE,
      sessionId: 'agent:atlas:main',
    },
    {
      id: 'msg-002',
      role: 'assistant',
      content:
        'Sure! Let me pull up your latest portfolio data.\n\n' +
        '**Portfolio Summary (as of today):**\n\n' +
        '| Asset | Value | Change (24h) |\n' +
        '|-------|-------|--------------|\n' +
        '| AAPL | $12,340 | +1.2% |\n' +
        '| GOOGL | $8,920 | -0.4% |\n' +
        '| ETH | $3,450 | +3.8% |\n' +
        '| BTC | $15,200 | +2.1% |\n\n' +
        '**Total:** $39,910 (+1.6% today)\n\n' +
        'Your portfolio is up overall. ETH and BTC are leading gains today.',
      timestamp: MSG_BASE + 8_000,
      sessionId: 'agent:atlas:main',
      toolCalls: [
        {
          id: 'tc-001',
          name: 'finance-tracker.get_portfolio',
          input: { timeframe: '24h' },
          output: '{"assets":[{"symbol":"AAPL","value":12340},{"symbol":"GOOGL","value":8920},{"symbol":"ETH","value":3450},{"symbol":"BTC","value":15200}],"total":39910}',
          status: 'success',
          duration: 1200,
        },
      ],
    },
    {
      id: 'msg-003',
      role: 'user',
      content: 'Nice! Can you also check the weather for tomorrow?',
      timestamp: MSG_BASE + 120_000,
      sessionId: 'agent:atlas:main',
    },
    {
      id: 'msg-004',
      role: 'assistant',
      content:
        "Here's tomorrow's forecast for San Francisco:\n\n" +
        '- **Morning:** 58°F, partly cloudy\n' +
        '- **Afternoon:** 64°F, sunny\n' +
        '- **Evening:** 55°F, clear skies\n\n' +
        'Looks like a great day! No rain expected.',
      timestamp: MSG_BASE + 128_000,
      sessionId: 'agent:atlas:main',
      toolCalls: [
        {
          id: 'tc-002',
          name: 'weather.forecast',
          input: { location: 'San Francisco, CA', days: 1 },
          output: '{"location":"San Francisco","forecast":[{"period":"morning","temp":58,"condition":"partly cloudy"},{"period":"afternoon","temp":64,"condition":"sunny"},{"period":"evening","temp":55,"condition":"clear"}]}',
          status: 'success',
          duration: 800,
        },
      ],
    },
    {
      id: 'msg-005',
      role: 'user',
      content: 'Remind me to review my weekly goals every Sunday at 9am.',
      timestamp: MSG_BASE + 300_000,
      sessionId: 'agent:atlas:main',
    },
    {
      id: 'msg-006',
      role: 'assistant',
      content:
        'Done! I\'ve created a recurring automation:\n\n' +
        '- **Name:** Weekly Goals Review\n' +
        '- **Schedule:** Every Sunday at 9:00 AM\n' +
        '- **Action:** Send you a reminder to review weekly goals\n\n' +
        "You'll get a notification each Sunday morning.",
      timestamp: MSG_BASE + 308_000,
      sessionId: 'agent:atlas:main',
      toolCalls: [
        {
          id: 'tc-003',
          name: 'cron.create',
          input: { name: 'Weekly Goals Review', schedule: '0 9 * * 0', message: 'Time to review your weekly goals!' },
          output: '{"id":"weekly-goals","status":"created"}',
          status: 'success',
          duration: 350,
        },
      ],
    },
    {
      id: 'msg-007',
      role: 'user',
      content: 'What did we talk about yesterday?',
      timestamp: MSG_BASE + 600_000,
      sessionId: 'agent:atlas:main',
    },
    {
      id: 'msg-008',
      role: 'assistant',
      content:
        "Looking at yesterday's conversation, here's a summary:\n\n" +
        '1. You asked me to **research React Native performance tips** — I compiled a list of optimization strategies\n' +
        '2. We discussed **your meeting schedule** for the week\n' +
        "3. I ran the **daily briefing automation** which summarized your emails and calendar\n\n" +
        'Want me to pull up any of those in detail?',
      timestamp: MSG_BASE + 608_000,
      sessionId: 'agent:atlas:main',
    },
  ],
  'agent:atlas:research': [
    {
      id: 'msg-r01',
      role: 'user',
      content: 'Find me the top 5 trending repos on GitHub this week.',
      timestamp: MSG_BASE - 4 * 3600_000,
      sessionId: 'agent:atlas:research',
    },
    {
      id: 'msg-r02',
      role: 'assistant',
      content:
        "Here are this week's top trending GitHub repos:\n\n" +
        '1. **ollama/ollama** — Run LLMs locally (Go) ⭐ 2.1k this week\n' +
        '2. **anthropics/claude-code** — AI coding agent (TypeScript) ⭐ 1.8k\n' +
        '3. **vercel/ai** — AI SDK for building apps (TypeScript) ⭐ 1.5k\n' +
        '4. **langchain-ai/langgraph** — Agent orchestration (Python) ⭐ 1.2k\n' +
        '5. **excalidraw/excalidraw** — Whiteboard tool (TypeScript) ⭐ 980\n\n' +
        'Want me to dig deeper into any of these?',
      timestamp: MSG_BASE - 4 * 3600_000 + 6_000,
      sessionId: 'agent:atlas:research',
      toolCalls: [
        {
          id: 'tc-r01',
          name: 'web-search.search',
          input: { query: 'trending GitHub repositories this week' },
          output: '{"results":5,"source":"github.com/trending"}',
          status: 'success',
          duration: 2100,
        },
      ],
    },
  ],
  'agent:atlas:cron:daily-briefing': [
    {
      id: 'msg-c01',
      role: 'assistant',
      content:
        "**Good morning! Here's your daily briefing:**\n\n" +
        '**Calendar:**\n' +
        '- 10:00 AM — Team standup\n' +
        '- 2:00 PM — Design review with Sarah\n' +
        '- 4:30 PM — 1:1 with manager\n\n' +
        '**Email highlights:**\n' +
        '- 3 new emails, 1 flagged as important (from engineering-team)\n\n' +
        '**Markets:**\n' +
        '- S&P 500: +0.3% pre-market\n' +
        '- Your watchlist: AAPL +0.8%, TSLA -1.2%',
      timestamp: MSG_BASE - 8 * 3600_000,
      sessionId: 'agent:atlas:cron:daily-briefing',
      category: 'automation',
    },
  ],
};

// ─── Cron Jobs ────────────────────────────────────────────────────────

export const DEMO_CRON_JOBS: CronJob[] = [
  {
    id: 'daily-briefing',
    name: 'Daily Briefing',
    schedule: '0 7 * * *',
    scheduleHuman: 'Every day at 7:00 AM',
    enabled: true,
    lastRun: hoursAgo(8),
    lastStatus: 'success',
    lastError: null,
    nextRun: new Date(Date.now() + 16 * 3600_000).toISOString(),
    input: 'Give me my morning briefing: calendar, important emails, and market snapshot.',
    description: 'Sends a comprehensive morning summary of calendar, emails, and market data.',
  },
  {
    id: 'portfolio-snapshot',
    name: 'Portfolio Snapshot',
    schedule: '0 16 * * 1-5',
    scheduleHuman: 'Weekdays at 4:00 PM (market close)',
    enabled: true,
    lastRun: daysAgo(1),
    lastStatus: 'success',
    lastError: null,
    nextRun: new Date(Date.now() + 24 * 3600_000).toISOString(),
    input: 'Check my portfolio performance and send me an end-of-day summary.',
    description: 'Captures portfolio performance at market close and sends a summary.',
  },
  {
    id: 'weekly-backup',
    name: 'Weekly Backup Reminder',
    schedule: '0 20 * * 5',
    scheduleHuman: 'Every Friday at 8:00 PM',
    enabled: true,
    lastRun: daysAgo(4),
    lastStatus: 'success',
    lastError: null,
    nextRun: new Date(Date.now() + 3 * 86400_000).toISOString(),
    input: 'Remind me to run my weekly backup and verify the last backup status.',
    description: 'Friday evening reminder to run and verify weekly backups.',
  },
  {
    id: 'hn-digest',
    name: 'Hacker News Digest',
    schedule: '0 12 * * *',
    scheduleHuman: 'Every day at 12:00 PM',
    enabled: false,
    lastRun: daysAgo(2),
    lastStatus: 'error',
    lastError: 'API rate limit exceeded — retrying in 60s',
    nextRun: null,
    input: 'Fetch the top 10 Hacker News stories and summarize the most interesting ones.',
    description: 'Midday digest of top Hacker News stories with AI-generated summaries.',
  },
];

// ─── Cron Run History ─────────────────────────────────────────────────

export const DEMO_CRON_RUN_HISTORY: Record<string, CronRunRecord[]> = {
  'daily-briefing': [
    { id: 'run-db-1', startedAt: hoursAgo(8), completedAt: hoursAgo(8), status: 'success', output: 'Briefing delivered successfully.', duration: 4500 },
    { id: 'run-db-2', startedAt: daysAgo(1), completedAt: daysAgo(1), status: 'success', output: 'Briefing delivered successfully.', duration: 3800 },
    { id: 'run-db-3', startedAt: daysAgo(2), completedAt: daysAgo(2), status: 'success', output: 'Briefing delivered successfully.', duration: 5200 },
  ],
  'portfolio-snapshot': [
    { id: 'run-ps-1', startedAt: daysAgo(1), completedAt: daysAgo(1), status: 'success', output: 'Portfolio snapshot captured. Total: $39,910 (+1.6%)', duration: 2100 },
    { id: 'run-ps-2', startedAt: daysAgo(2), completedAt: daysAgo(2), status: 'success', output: 'Portfolio snapshot captured. Total: $38,750 (-0.3%)', duration: 1900 },
  ],
  'weekly-backup': [
    { id: 'run-wb-1', startedAt: daysAgo(4), completedAt: daysAgo(4), status: 'success', output: 'Backup reminder sent.', duration: 800 },
  ],
  'hn-digest': [
    { id: 'run-hn-1', startedAt: daysAgo(2), completedAt: daysAgo(2), status: 'error', error: 'API rate limit exceeded — retrying in 60s', duration: 12000 },
    { id: 'run-hn-2', startedAt: daysAgo(3), completedAt: daysAgo(3), status: 'success', output: 'Digest delivered with 10 stories.', duration: 6700 },
  ],
};

// ─── Skills ───────────────────────────────────────────────────────────

export const DEMO_SKILLS: Skill[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web using Google, Bing, or DuckDuckGo and return structured results.',
    icon: '🔍',
    enabled: true,
    version: '2.1.0',
    emoji: '🔍',
    usage: { count: 142, lastUsed: hoursAgo(2) },
  },
  {
    id: 'finance-tracker',
    name: 'Finance Tracker',
    description: 'Track portfolios, fetch stock/crypto prices, and generate performance reports.',
    icon: '📈',
    enabled: true,
    version: '1.4.2',
    emoji: '📈',
    usage: { count: 89, lastUsed: hoursAgo(8) },
  },
  {
    id: 'email-sender',
    name: 'Email Sender',
    description: 'Compose and send emails via Gmail or SMTP with template support.',
    icon: '✉️',
    enabled: true,
    version: '1.0.3',
    emoji: '✉️',
    usage: { count: 34, lastUsed: daysAgo(1) },
  },
  {
    id: 'calendar-sync',
    name: 'Calendar Sync',
    description: 'Read and manage Google Calendar events, create meetings, and send invites.',
    icon: '📅',
    enabled: true,
    version: '1.2.0',
    emoji: '📅',
    usage: { count: 67, lastUsed: hoursAgo(8) },
  },
  {
    id: 'note-taker',
    name: 'Note Taker',
    description: 'Create, search, and organize notes with tagging and full-text search.',
    icon: '📝',
    enabled: true,
    version: '1.1.1',
    emoji: '📝',
    usage: { count: 215, lastUsed: minutesAgo(30) },
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get current conditions and multi-day forecasts for any location worldwide.',
    icon: '🌤️',
    enabled: false,
    version: '1.0.0',
    emoji: '🌤️',
    usage: { count: 18, lastUsed: daysAgo(3) },
  },
];

// ─── Memory Files ─────────────────────────────────────────────────────

export const DEMO_MEMORY_FILES: MemoryFile[] = [
  {
    name: 'IDENTITY.md',
    content:
      '# Identity\n\n' +
      '**Name:** Atlas\n\n' +
      'I am a personal AI assistant running on the OpenClaw framework. ' +
      "I help my operator manage their daily workflow, stay informed, and automate routine tasks.\n\n" +
      '## Personality\n' +
      '- Concise but thorough\n' +
      '- Proactive about surfacing relevant information\n' +
      '- Respects operator privacy\n',
    lastModified: daysAgo(7),
  },
  {
    name: 'SOUL.md',
    content:
      '# Soul\n\n' +
      '## Core Values\n' +
      '- Be helpful without being intrusive\n' +
      '- Prioritize accuracy over speed\n' +
      '- Always explain reasoning when asked\n' +
      '- Protect user data and privacy\n\n' +
      '## Communication Style\n' +
      '- Use markdown formatting for clarity\n' +
      '- Include tables for structured data\n' +
      '- Keep responses under 500 words unless asked for detail\n',
    lastModified: daysAgo(14),
  },
  {
    name: 'MEMORY.md',
    content:
      '# Memory\n\n' +
      '## Key Facts\n' +
      '- Operator prefers morning briefings at 7 AM\n' +
      '- Portfolio includes AAPL, GOOGL, ETH, BTC\n' +
      '- Timezone: America/Los_Angeles (PST/PDT)\n' +
      '- Preferred news sources: Hacker News, TechCrunch\n\n' +
      '## Recent Context\n' +
      '- Operator is working on a React Native mobile app\n' +
      '- Weekly 1:1 with manager is on Wednesdays at 4:30 PM\n' +
      '- Interested in AI/ML research papers\n',
    lastModified: hoursAgo(4),
  },
  {
    name: 'USER.md',
    content:
      '# User Profile\n\n' +
      '**Name:** Demo User\n' +
      '**Location:** San Francisco, CA\n' +
      '**Timezone:** America/Los_Angeles\n\n' +
      '## Preferences\n' +
      '- Dark mode in all apps\n' +
      '- Metric units for weather\n' +
      '- Brief notifications (< 2 sentences)\n' +
      '- Morning summary at 7:00 AM\n',
    lastModified: daysAgo(3),
  },
];

// ─── Token Usage ──────────────────────────────────────────────────────

export const DEMO_TOKEN_USAGE: TokenUsage = {
  today: 12_450,
  total: 847_230,
  trend: trendForPastWeek(),
  estimatedCost: 4.23,
};

// ─── Channels ─────────────────────────────────────────────────────────

export const DEMO_CHANNELS: Channel[] = [
  { name: 'Discord', status: 'active', uptime: '6d 3h', lastFlap: daysAgo(6) },
  { name: 'iMessage', status: 'active', uptime: '2d 18h', lastFlap: daysAgo(2) },
  { name: 'WhatsApp', status: 'disconnected', lastFlap: daysAgo(1) },
];

// ─── Paired Nodes ─────────────────────────────────────────────────────

export const DEMO_PAIRED_NODES: PairedNode[] = [
  { id: 'node-gateway', name: 'Gateway Host', type: 'server', status: 'online', lastSeen: minutesAgo(1) },
  { id: 'node-mobile', name: 'RawClaw Mobile', type: 'mobile', status: 'online', lastSeen: minutesAgo(0) },
  { id: 'node-macbook', name: 'MacBook Pro', type: 'desktop', status: 'online', lastSeen: minutesAgo(5) },
];

// ─── Activity Feed ────────────────────────────────────────────────────

export const DEMO_ACTIVITY_FEED: ActivityEvent[] = [
  { id: 'act-1', text: 'Main Chat · 47 messages', category: 'chat', timestamp: minutesAgo(12), icon: 'chatbubble', entityId: 'agent:atlas:main' },
  { id: 'act-2', text: 'Cron "Daily Briefing" … ok', category: 'cron', timestamp: hoursAgo(8), icon: 'timer', entityId: 'daily-briefing' },
  { id: 'act-3', text: 'Research Assistant · 23 messages', category: 'chat', timestamp: hoursAgo(4), icon: 'chatbubble', entityId: 'agent:atlas:research' },
  { id: 'act-4', text: 'Channel "Discord" active', category: 'channel', timestamp: daysAgo(1), icon: 'radio', entityId: 'Discord' },
  { id: 'act-5', text: 'Cron "Portfolio Snapshot" … ok', category: 'cron', timestamp: daysAgo(1), icon: 'timer', entityId: 'portfolio-snapshot' },
  { id: 'act-6', text: 'Automation Run · daily-br · 6 messages', category: 'chat', timestamp: hoursAgo(8), icon: 'chatbubble', entityId: 'agent:atlas:cron:daily-briefing' },
  { id: 'act-7', text: 'Cron "Hacker News Digest" … failed', category: 'cron', timestamp: daysAgo(2), icon: 'timer', entityId: 'hn-digest' },
  { id: 'act-8', text: 'Channel "iMessage" active', category: 'channel', timestamp: daysAgo(2), icon: 'radio', entityId: 'iMessage' },
];

// ─── Daily Notes ──────────────────────────────────────────────────────

export const DEMO_DAILY_NOTES: DailyNote[] = [
  {
    date: new Date().toISOString().slice(0, 10),
    content: '## Today\n- Reviewed portfolio performance\n- Checked weather forecast\n- Set up weekly goals reminder',
    lastModified: minutesAgo(30),
  },
  {
    date: new Date(Date.now() - 86400_000).toISOString().slice(0, 10),
    content: '## Yesterday\n- Researched React Native performance tips\n- Reviewed meeting schedule\n- Ran daily briefing automation',
    lastModified: daysAgo(1),
  },
];

// ─── Available Models ─────────────────────────────────────────────────

export const DEMO_MODELS: { id: string; name: string; provider: string; contextWindow?: number }[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128_000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', contextWindow: 128_000 },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextWindow: 200_000 },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta (via Ollama)', contextWindow: 131_072 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', contextWindow: 1_000_000 },
];

// ─── Demo Chat Responses ──────────────────────────────────────────────

export const DEMO_RESPONSES: string[] = [
  "I'm running in **demo mode** right now, so I can't execute real actions — but in a live setup I'd handle that for you instantly!\n\nHere's what I *would* do:\n1. Process your request through my skill pipeline\n2. Execute any necessary tool calls\n3. Return the results with full transparency\n\nConnect a real OpenClaw gateway to unlock the full experience.",
  "Great question! In demo mode I'm showing you sample data, but with a live gateway I'd:\n\n- Search the web in real time\n- Access your calendar and email\n- Run automations on your schedule\n- Remember context across conversations\n\nAll from your phone, anywhere you are.",
  "That's an interesting request! While I'm in demo mode and can't take real actions, here's a taste of what I can do when connected:\n\n**Skills I have:**\n- 🔍 Web Search\n- 📈 Finance Tracker\n- 📅 Calendar Sync\n- ✉️ Email Sender\n- 📝 Note Taker\n\nSet up an OpenClaw gateway to get started!",
];
