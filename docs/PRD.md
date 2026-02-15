# PAW — Product Requirements Document

> Personal AI Workstation: not just a chat app — a command center for your AI.

---

## Overview

PAW is a unified interface for managing, monitoring, and interacting with a personal AI agent. It spans seven core sections, each designed to surface the right information at the right time — moving beyond a simple chat window into a full operational dashboard.

---

## Core Sections

### 1. Home Dashboard

The landing screen provides an at-a-glance overview of everything happening with your AI.

- **Status pill** — current state (online / thinking / model in use)
- **Recent activity feed** — latest actions, messages, and events
- **Active automations** — running jobs with next scheduled run times
- **Token usage** — current consumption and trends
- **Notification summary** — unread counts by category
- **Quick-action buttons** — configurable shortcuts (e.g. "Run arb scan", "Check email")

### 2. Chat

A significantly upgraded conversational interface with full transparency into what the AI is doing.

- Proper **markdown rendering** (tables, code blocks, syntax highlighting)
- **Collapsible tool-call details** — see exactly what the AI executed
- **Message categories** — distinguish alerts vs. automated messages vs. user messages
- **Voice input/output**
- **File attachments** with inline preview
- **Slash command palette** for quick actions
- **Full-text search** across conversation history
- **Multi-session tabs** for parallel conversations

### 3. Memory Browser

Direct visibility into the AI's persistent knowledge and context files.

- **Inline editing** of core files: `SOUL.md`, `MEMORY.md`, `USER.md`, `IDENTITY.md`
- **Calendar view** for daily notes
- **Diff view** — see what changed and when
- **Semantic search** — "Summarize your memories about X"

### 4. Automations

Full management of scheduled and recurring tasks.

- List of every **cron job** with schedule, last run, next run, and status
- **Enable/disable toggle** per automation
- **Run history** with logs and output
- **"Run Now"** button for on-demand execution
- **Guided creation flow** for new automations
- Example: arb scanner would appear here with full run history

### 5. Skills

Browse, manage, and discover AI capabilities.

- View all **installed skills** (e.g. 1Password, GitHub, Weather, iMessage, OpenHue)
- Per-skill **documentation and usage info**
- **ClawHub integration** — discover and install new skills from a community registry

### 6. Status

System health and connectivity at a glance.

- **Connection health** — gateway reachability and latency
- **Model info** — currently loaded model, version, context window
- **Usage and cost** — tokens consumed, estimated spend
- **Paired nodes** — connected devices and services
- **Channel status** — per-channel health (e.g. WhatsApp connected/disconnected, including flap detection)

### 7. Settings

Per-user configuration for notifications, appearance, and behavior.

- **Notification routing per category**
  - Arb alerts → push + sound
  - Cron results → silent badge only
  - Reminders → push + sound
- **Quiet hours** (e.g. 11 PM – 8 AM)
- **Model override** — select or pin a specific model
- **Theme** — light/dark/system

---

## Notifications

Push notifications are **categorized and configurable**, not one-size-fits-all.

| Category       | Default Behavior     |
| -------------- | -------------------- |
| Arb alerts     | Push + sound         |
| Cron results   | Silent badge         |
| Reminders      | Push + sound         |

- Tapping a notification **deep-links** to the relevant screen (not just chat)
- **Quiet hours** suppress non-critical notifications (default: 11 PM – 8 AM)

---

## Tech Stack

| Layer    | Technology                        | Notes                                                                 |
| -------- | --------------------------------- | --------------------------------------------------------------------- |
| Mobile   | React Native (Expo)               | Shares code with web where possible                                   |
| Desktop  | Next.js                           | Full-featured web experience                                          |
| Backend  | None (direct connection)          | Connects directly to the OpenClaw gateway running on the user's Mac   |

There is **no separate backend service** — the client communicates directly with the OpenClaw gateway that is already running locally.

