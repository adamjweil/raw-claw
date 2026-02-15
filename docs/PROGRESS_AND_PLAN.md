# PAW — Progress Report & Implementation Plan

> Last updated: 2026-02-14

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Codebase Architecture Overview](#codebase-architecture-overview)
3. [Section-by-Section Audit](#section-by-section-audit)
4. [Cross-Cutting Concerns](#cross-cutting-concerns)
5. [Implementation Plan](#implementation-plan)
6. [Phase Breakdown](#phase-breakdown)

---

## Executive Summary

The PAW codebase has a **solid foundation** built with React Native (Expo SDK 54, Expo Router, TypeScript). The tab-based navigation skeleton is in place and all seven core sections from the PRD have at least a placeholder screen. A gateway client service with REST + WebSocket support exists, along with a React Context-based state store using `expo-secure-store` for persisting configuration.

However, most screens are currently populated with **hardcoded placeholder data** rather than live gateway integration, and the majority of the PRD's feature-level requirements within each section remain unimplemented. The project is approximately **15–20% complete** relative to the full PRD scope.

### What Exists Today

| Area | Status |
|------|--------|
| Expo + React Native scaffold | ✅ Complete |
| Tab navigation (Home, Chat, Automations, Skills, Status) | ✅ Complete |
| Settings screen (modal) | ✅ Complete |
| Dark theme / design system foundation | ✅ Complete |
| Gateway client (REST + WS) | ✅ Scaffolded |
| Zustand-style context store | ✅ Complete |
| Secure config persistence | ✅ Complete |
| TypeScript type definitions | ✅ Basic set |
| iOS + Android native projects (prebuild) | ✅ Generated |

### What's Missing

- Live data integration (most screens use hardcoded data)
- Memory Browser section (no screen at all)
- Full chat features (markdown, tool calls, search, tabs, voice, files)
- Notification system (push, categories, deep-linking, quiet hours)
- Full settings (only gateway config exists; no theme, model override, notification routing)
- Automation creation flow and run history
- Skills management and ClawHub integration
- Token usage / cost tracking
- Next.js desktop web experience

---

## Codebase Architecture Overview

### File Structure (Current)

```
rawclaw/
├── app/
│   ├── _layout.tsx              # Root layout (StoreProvider + Stack)
│   ├── settings.tsx             # Settings screen (modal)
│   └── (tabs)/
│       ├── _layout.tsx          # Tab bar configuration
│       ├── index.tsx            # Home Dashboard
│       ├── chat.tsx             # Chat screen
│       ├── automations.tsx      # Automations screen
│       ├── skills.tsx           # Skills grid
│       └── status.tsx           # Status screen
├── src/
│   ├── services/
│   │   ├── gateway.ts           # GatewayClient (REST + WebSocket)
│   │   └── store.ts             # React Context store + SecureStore
│   └── types/
│       └── index.ts             # Message, CronJob, Skill, GatewayStatus, GatewayConfig
├── app.json                     # Expo config
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── babel.config.js              # Babel + Reanimated plugin
└── index.ts                     # Expo Router entry
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| expo ~54.0 | Core framework |
| expo-router ~6.0 | File-based routing |
| expo-secure-store | Secure config persistence |
| react-native-reanimated ~4.1 | Animations |
| react-native-gesture-handler | Gesture support |
| react-native-screens | Native screen containers |
| @expo/vector-icons | Ionicons for UI |

### Design System

A consistent dark-theme color palette is used across all screens:
- `bg: #0a0a0f` — background
- `surface: #1a1a2e` — elevated surfaces
- `card: #16213e` — card backgrounds
- `accent: #0ea5e9` — accent / interactive color

> ⚠️ These colors are duplicated as raw constants in every screen file rather than centralized.

---

## Section-by-Section Audit

### 1. Home Dashboard (`app/(tabs)/index.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| Status pill (online / thinking / model) | 🟡 Partial | Shows Connected/Offline pill. No "thinking" or model-in-use state. |
| Recent activity feed | 🟡 Placeholder | Hardcoded 5-item list. Not connected to live data. |
| Active automations summary | 🟡 Placeholder | Shows count from store but falls back to hardcoded "5". Next run is hardcoded. |
| Token usage | ❌ Missing | No token usage display or trends. |
| Notification summary | ❌ Missing | No unread counts by category. |
| Quick-action buttons | 🟡 Placeholder | 4 buttons exist but have no `onPress` handlers (no-ops). Not user-configurable. |

**Estimated completion: ~25%** — Layout and card structure are solid; needs live data, token usage, and notification summary.

---

### 2. Chat (`app/(tabs)/chat.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| Basic send/receive messages | ✅ Working | Sends via gateway client; fallback placeholder when disconnected. |
| Markdown rendering | 🟡 Minimal | Only bold (`**`) and inline code (`` ` ``) supported. No tables, code blocks, or syntax highlighting. |
| Collapsible tool-call details | ❌ Missing | Message type has no `toolCalls` field; no UI for tool call display. |
| Message categories (alerts / auto / user) | ❌ Missing | Only `user` and `assistant` roles exist. |
| Voice input/output | ❌ Missing | |
| File attachments with preview | ❌ Missing | |
| Slash command palette | ❌ Missing | |
| Full-text search | ❌ Missing | |
| Multi-session tabs | ❌ Missing | Single conversation only. |

**Estimated completion: ~15%** — Basic messaging works but the rich features that differentiate PAW from a simple chat app are all absent.

---

### 3. Memory Browser

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| Dedicated screen/tab | ❌ Missing | No tab, no route, no screen exists. |
| Inline editing of SOUL.md, MEMORY.md, etc. | ❌ Missing | |
| Calendar view for daily notes | ❌ Missing | |
| Diff view | ❌ Missing | |
| Semantic search | ❌ Missing | |

**Estimated completion: 0%** — This is the only PRD section with zero implementation.

---

### 4. Automations (`app/(tabs)/automations.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| List cron jobs with schedule/last run/next run/status | ✅ UI exists | Rendered from hardcoded `PLACEHOLDER_JOBS`, not from gateway. |
| Enable/disable toggle | ✅ UI exists | Toggle works locally in state but doesn't call the gateway API. |
| Run history with logs/output | ❌ Missing | Detail modal shows metadata only, no history log. |
| "Run Now" button | 🟡 Placeholder | Button exists but `onPress` is a no-op `() => {}`. |
| Guided creation flow | ❌ Missing | No way to create a new automation. |

**Estimated completion: ~30%** — Good card-based list UI; needs live data, run history, creation flow, and wired-up actions.

---

### 5. Skills (`app/(tabs)/skills.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| View installed skills | 🟡 Placeholder | Shows ~30 generated placeholder skills in a grid. Not from gateway. |
| Per-skill documentation/usage | 🟡 Minimal | Modal shows name + generic description. No real docs, usage stats, or config. |
| ClawHub integration | ❌ Missing | No browse/install from community registry. |

**Estimated completion: ~20%** — Visual grid and modal are nice; needs real data and ClawHub.

---

### 6. Status (`app/(tabs)/status.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| Connection health (reachability, latency) | 🟡 Partial | Shows gateway URL, connected/disconnected, hardcoded latency "42ms". |
| Model info (model, version, context window) | 🟡 Partial | Shows model name and hardcoded "200K tokens". No version from gateway. |
| Usage and cost (tokens, spend) | ❌ Missing | |
| Paired nodes (connected devices) | ❌ Missing | |
| Channel status (per-channel health, flap detection) | 🟡 Placeholder | Hardcoded WhatsApp "Active" and Discord "Not configured". No live data. |

**Estimated completion: ~25%** — Good section layout; needs live data for everything and missing usage/cost and paired nodes.

---

### 7. Settings (`app/settings.tsx`)

| PRD Requirement | Status | Notes |
|----------------|--------|-------|
| Gateway URL + token config | ✅ Working | Persisted via SecureStore with test connection button. |
| Notification routing per category | ❌ Missing | |
| Quiet hours | ❌ Missing | |
| Model override | ❌ Missing | |
| Theme (light/dark/system) | ❌ Missing | App is hardcoded to dark theme. |

**Estimated completion: ~20%** — Gateway config is solid; all other settings are absent.

---

### Gateway Client (`src/services/gateway.ts`)

| Capability | Status | Notes |
|-----------|--------|-------|
| REST: getStatus | ✅ | |
| REST: getCronJobs | ✅ | |
| REST: runCronJob | ✅ | |
| REST: toggleCronJob | ✅ | |
| REST: getSkills | ✅ | |
| REST: sendMessage | ✅ | |
| WebSocket: connect/reconnect | ✅ | Auto-reconnects on close. |
| WebSocket: message handlers | ✅ | Subscription pattern. |
| REST: memory files (CRUD) | ❌ Missing | Needed for Memory Browser. |
| REST: token usage / cost | ❌ Missing | Needed for Home + Status. |
| REST: channels status | ❌ Missing | Needed for Status. |
| REST: paired nodes | ❌ Missing | Needed for Status. |
| REST: conversation sessions | ❌ Missing | Needed for multi-session chat. |
| REST: search (messages / memories) | ❌ Missing | Needed for Chat + Memory Browser. |
| WebSocket: typing indicators | ❌ Missing | |
| Error handling / retry logic | 🟡 Basic | Throws on non-OK response, no retry on REST. |

---

### Type Definitions (`src/types/index.ts`)

Current types are minimal and need expansion:

| Type | Exists | Needs |
|------|--------|-------|
| `Message` | ✅ | Add: `category`, `toolCalls[]`, `attachments[]`, `sessionId` |
| `CronJob` | ✅ | Add: `runHistory[]`, `createdAt`, `updatedAt` |
| `Skill` | ✅ | Add: `docs`, `usage`, `version`, `source` (installed/clawhub) |
| `GatewayStatus` | ✅ | Add: `tokenUsage`, `cost`, `pairedNodes[]` |
| `GatewayConfig` | ✅ | Sufficient for now |
| `MemoryFile` | ❌ | New: `name`, `content`, `lastModified`, `diffs[]` |
| `DailyNote` | ❌ | New: `date`, `content` |
| `Notification` | ❌ | New: `id`, `category`, `title`, `body`, `read`, `deepLink` |
| `NotificationSettings` | ❌ | New: per-category routing, quiet hours |
| `ChatSession` | ❌ | New: `id`, `title`, `messages[]`, `createdAt` |
| `TokenUsage` | ❌ | New: `total`, `today`, `trend[]`, `cost` |
| `Channel` | ❌ | New: `name`, `status`, `lastFlap`, `uptime` |
| `PairedNode` | ❌ | New: `id`, `name`, `type`, `lastSeen` |

---

## Cross-Cutting Concerns

### 1. Design System Centralization
- **Problem**: Colors, spacing, and typography are duplicated as `const C = {...}` in every screen file.
- **Plan**: Extract to `src/theme/` with a shared theme object, and eventually support light/dark/system themes.

### 2. Component Extraction
- **Problem**: All UI is inline in screen files. No reusable component library.
- **Plan**: Extract shared components (`Card`, `Section`, `Row`, `Badge`, `StatusPill`, `Header`) to `src/components/`.

### 3. Live Data Integration
- **Problem**: Most screens use hardcoded placeholder data.
- **Plan**: Create custom hooks (`useGatewayStatus`, `useCronJobs`, `useSkills`, `useTokenUsage`) that poll or subscribe via the gateway client, with loading/error states.

### 4. Error Handling & Loading States
- **Problem**: No loading spinners, error boundaries, or retry UI anywhere.
- **Plan**: Add consistent loading/error/empty state patterns across all screens.

### 5. Push Notifications
- **Problem**: No notification infrastructure at all.
- **Plan**: Integrate `expo-notifications`, implement category-based routing, deep-linking, and quiet hours.

### 6. Animations
- **Problem**: `react-native-reanimated` is installed but unused. The `Card` component accepts a `delay` prop that does nothing.
- **Plan**: Add entrance animations, skeleton loading states, and micro-interactions.

### 7. Testing
- **Problem**: Zero tests exist.
- **Plan**: Add component tests for critical interactions and service tests for the gateway client.

### 8. Next.js Desktop Experience
- **Problem**: PRD specifies Next.js for desktop — this doesn't exist.
- **Plan**: Defer to a later phase; prioritize mobile-first with Expo web as an interim solution.

---

## Implementation Plan

### Phase 0: Foundation & Cleanup (1 week)

**Goal**: Establish shared infrastructure so all subsequent work is consistent and efficient.

| Task | Details |
|------|---------|
| **0.1** Centralize theme/design system | Create `src/theme/index.ts` with colors, spacing, typography. Replace all inline `const C` declarations. |
| **0.2** Extract shared components | Create `src/components/` with `Card`, `Header`, `StatusPill`, `Row`, `Badge`, `EmptyState`, `LoadingState`, `ErrorState`. |
| **0.3** Expand type definitions | Add all missing types identified above to `src/types/index.ts`. |
| **0.4** Create data-fetching hooks | Build `src/hooks/` with `usePolling`, `useGatewayStatus`, `useCronJobs`, `useSkills`, etc. Include loading/error states and auto-refresh. |
| **0.5** Wire up WebSocket lifecycle | Connect/disconnect WebSocket in store when config is saved. Handle reconnection states visibly in the UI. |
| **0.6** Add entrance animations | Use `react-native-reanimated` for card entrance animations and skeleton loading states. |

---

### Phase 1: Home Dashboard — Live & Complete (1 week)

**Goal**: Make the landing screen fully functional and data-driven.

| Task | Details |
|------|---------|
| **1.1** Live status pill | Show online/thinking/model-in-use state pulled from gateway status. |
| **1.2** Live activity feed | Subscribe to WebSocket events; display real recent activity. |
| **1.3** Active automations (live) | Pull cron job list from gateway; show count and real next-run time. |
| **1.4** Token usage widget | New gateway API call; display usage chart/bar and trends. |
| **1.5** Notification summary | Show unread counts by category (requires notification system — may stub initially). |
| **1.6** Quick-action buttons | Wire up actions to gateway calls. Make configurable (stored in user preferences). |

---

### Phase 2: Chat — Rich Conversational Experience (2 weeks)

**Goal**: Elevate chat from basic messaging to a full-featured AI interaction surface.

| Task | Details |
|------|---------|
| **2.1** Full markdown rendering | Integrate a markdown renderer (e.g. `react-native-markdown-display`) for tables, code blocks with syntax highlighting, lists, links. |
| **2.2** Tool-call display | Extend `Message` type; add collapsible tool-call sections showing what the AI executed, with inputs/outputs. |
| **2.3** Message categories | Add `category` field to messages; style alerts, automated messages, and user messages differently. Add filter tabs or badges. |
| **2.4** Multi-session tabs | Add session management: create, switch, rename, delete chat sessions. Persist per-session message history. |
| **2.5** Full-text search | Add search bar that queries conversation history (local + gateway). Highlight matches. |
| **2.6** Slash command palette | Detect `/` at start of input; show a dropdown of available commands. Execute commands via gateway. |
| **2.7** File attachments | Support picking images/files; upload to gateway; show inline previews in chat bubbles. |
| **2.8** Voice input/output | Integrate `expo-av` or `expo-speech` for voice-to-text input and text-to-speech output. Add mic button to input bar. |

---

### Phase 3: Memory Browser — New Section (1.5 weeks)

**Goal**: Build the entire Memory Browser section from scratch.

| Task | Details |
|------|---------|
| **3.1** Add Memory tab to navigation | Add new tab between Chat and Automations. |
| **3.2** Gateway API for memory files | Add REST endpoints in client: list files, read file, update file, get diffs. |
| **3.3** File list & viewer | Show list of core files (SOUL.md, MEMORY.md, USER.md, IDENTITY.md). Tap to view full content with markdown rendering. |
| **3.4** Inline editing | Add edit mode with a text editor. Save changes back to gateway. Show unsaved changes indicator. |
| **3.5** Calendar view for daily notes | Date-picker or calendar component that shows daily note entries. |
| **3.6** Diff view | Show change history per file. Side-by-side or inline diff rendering. |
| **3.7** Semantic search | Search input that queries the gateway's semantic search. Display summarized results. |

---

### Phase 4: Automations — Full Management (1 week)

**Goal**: Complete the automations section with creation, history, and live data.

| Task | Details |
|------|---------|
| **4.1** Live data integration | Replace placeholder jobs with real data from `getCronJobs()`. Poll or subscribe for updates. |
| **4.2** Wire up toggle & Run Now | Connect switch to `toggleCronJob()` and button to `runCronJob()` with loading/success/error feedback. |
| **4.3** Run history with logs | Add per-job run history view. Show log output, timestamps, duration, and status per run. |
| **4.4** Guided creation flow | Multi-step form: name → schedule (cron builder or natural language) → action configuration → review & create. |
| **4.5** Delete / edit automations | Add ability to modify schedule, rename, or delete automations. |

---

### Phase 5: Skills — Real Data & ClawHub (1 week)

**Goal**: Connect to real skill data and begin ClawHub integration.

| Task | Details |
|------|---------|
| **5.1** Live data integration | Replace placeholder skills with real data from `getSkills()`. |
| **5.2** Rich skill detail view | Full-screen detail with documentation, usage stats, version, configuration options. |
| **5.3** Enable/disable skills | Toggle skill availability with gateway confirmation. |
| **5.4** ClawHub browse & search | New gateway API for browsing the skill registry. Grid/list view with search and categories. |
| **5.5** Install from ClawHub | Install flow: preview → confirm → install → success. Show installation progress. |

---

### Phase 6: Status — Live Telemetry (0.5 weeks)

**Goal**: Make the status screen a real-time health dashboard.

| Task | Details |
|------|---------|
| **6.1** Live connection health | Real latency measurement (ping gateway). Show connection uptime. |
| **6.2** Real model info | Pull model name, version, and context window from gateway status. |
| **6.3** Token usage & cost | Display token consumption over time with a chart/graph. Show estimated spend. |
| **6.4** Paired nodes | List connected devices/services from gateway. Show last-seen timestamps. |
| **6.5** Live channel status | Real per-channel health from gateway. Flap detection indicators. Auto-refresh. |

---

### Phase 7: Settings — Full Configuration (1 week)

**Goal**: Build out all settings specified in the PRD.

| Task | Details |
|------|---------|
| **7.1** Notification routing UI | Per-category toggle matrix: push on/off, sound on/off, badge on/off. Categories: arb alerts, cron results, reminders. |
| **7.2** Quiet hours | Time range picker (default 11 PM – 8 AM). Toggle to enable/disable. |
| **7.3** Model override | Dropdown/picker to select or pin a specific model. Show current default. |
| **7.4** Theme switching | Light / dark / system toggle. Update theme context throughout the app. |
| **7.5** Persist all settings | Store settings locally (SecureStore or AsyncStorage) and sync with gateway preferences. |

---

### Phase 8: Notifications (1 week)

**Goal**: Full push notification system with deep-linking.

| Task | Details |
|------|---------|
| **8.1** Expo Notifications setup | Install `expo-notifications`. Configure push token registration. |
| **8.2** Category-based routing | Respect per-category settings from Phase 7. Apply sound/silent/badge rules. |
| **8.3** Deep-linking | Tapping a notification navigates to the relevant screen (chat message, automation result, etc.). |
| **8.4** Quiet hours enforcement | Suppress non-critical notifications during configured quiet hours. |
| **8.5** Notification summary on Home | Show real unread counts by category on the Home dashboard. |

---

### Phase 9: Polish & Platform Expansion (2 weeks)

**Goal**: Refine the experience and expand to web.

| Task | Details |
|------|---------|
| **9.1** Animations & micro-interactions | Polished entrance animations, pull-to-refresh, haptic feedback, gesture-based navigation. |
| **9.2** Accessibility audit | Semantic elements, ARIA labels (web), VoiceOver/TalkBack support, keyboard navigation. |
| **9.3** Error boundaries & offline mode | Graceful degradation when gateway is unreachable. Cache last-known data. |
| **9.4** Expo Web optimization | Ensure all screens work well in Expo web mode as an interim desktop solution. |
| **9.5** Next.js desktop app | Scaffold Next.js project sharing types, hooks, and service layer. Build desktop-optimized layouts. |
| **9.6** Testing suite | Component tests, service tests, integration tests for critical flows. |

---

## Phase Summary & Timeline

| Phase | Name | Est. Duration | Priority |
|-------|------|---------------|----------|
| 0 | Foundation & Cleanup | 1 week | 🔴 Critical |
| 1 | Home Dashboard | 1 week | 🔴 Critical |
| 2 | Chat — Rich Experience | 2 weeks | 🔴 Critical |
| 3 | Memory Browser | 1.5 weeks | 🟡 High |
| 4 | Automations — Full | 1 week | 🟡 High |
| 5 | Skills & ClawHub | 1 week | 🟡 High |
| 6 | Status — Live Telemetry | 0.5 weeks | 🟢 Medium |
| 7 | Settings — Full Config | 1 week | 🟢 Medium |
| 8 | Notifications | 1 week | 🟢 Medium |
| 9 | Polish & Platform Expansion | 2 weeks | 🔵 Low (ongoing) |
| | **Total** | **~12 weeks** | |

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Gateway API surface is unknown / evolving | Build gateway client methods incrementally. Use TypeScript interfaces as contracts. Mock responses for UI development. |
| Push notification complexity (iOS/Android differences) | Use `expo-notifications` which abstracts platform differences. Test on both platforms early. |
| Memory Browser requires rich text editing | Evaluate `react-native` text editor libraries early. May need a WebView-based editor for full markdown editing. |
| Next.js desktop is a separate project | Defer until mobile is feature-complete. Share `src/services/`, `src/types/`, and `src/hooks/` via a monorepo or package extraction. |
| Markdown rendering performance in chat | Benchmark markdown libraries with large messages. Consider virtualized rendering for long conversations. |

---

## Recommended New Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| `react-native-markdown-display` or `@ronradtke/react-native-markdown-display` | Markdown rendering in Chat + Memory Browser | 2, 3 |
| `expo-notifications` | Push notifications | 8 |
| `expo-av` or `expo-speech` | Voice input/output | 2 |
| `expo-document-picker` / `expo-image-picker` | File attachments | 2 |
| `expo-haptics` | Haptic feedback for interactions | 9 |
| `react-native-calendars` | Calendar view in Memory Browser | 3 |
| `diff` or `diff2html` | Diff rendering in Memory Browser | 3 |
| `react-native-syntax-highlighter` | Code syntax highlighting in Chat | 2 |
| `@react-native-async-storage/async-storage` | Persist non-sensitive settings | 7 |
| `zustand` | Consider replacing Context store for better perf | 0 |

---

*This document should be updated as phases are completed and requirements evolve.*

