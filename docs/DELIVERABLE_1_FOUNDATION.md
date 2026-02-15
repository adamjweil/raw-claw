# Deliverable 1 — Foundation & Home Dashboard

> **Scope**: Shared infrastructure, component library, live data hooks, and a fully functional Home screen.
> **Estimated effort**: ~2 weeks
> **Prerequisite**: None (this is the starting point)
> **Exit criteria**: The app has a centralized design system, reusable components, and the Home Dashboard displays live data from the gateway with proper loading/error states.

---

## Why This Comes First

Every subsequent deliverable depends on shared infrastructure: a centralized theme, reusable UI components, expanded types, and data-fetching hooks. By bundling this with the Home Dashboard, we prove the architecture works end-to-end on a real screen before scaling to the rest of the app.

---

## Task Checklist

### Part A — Shared Infrastructure

#### A1. Centralize the Design System

**Files to create**: `src/theme/index.ts`, `src/theme/colors.ts`, `src/theme/spacing.ts`, `src/theme/typography.ts`

- Extract the duplicated `const C = { bg, surface, card, accent }` from all 6 screen files into a single theme module.
- Define a `Theme` interface with `colors`, `spacing`, and `typography` sections.
- Create a `ThemeProvider` context that wraps the app (inside `StoreProvider`).
- Provide a `useTheme()` hook for components to consume.
- For now, only the dark theme is needed. Light theme support is deferred to Deliverable 4.
- **Update all existing screens** to import from the theme instead of using inline constants.

```
src/theme/
├── index.ts          # ThemeProvider, useTheme, Theme interface
├── colors.ts         # Dark theme color palette (+ light theme placeholder)
├── spacing.ts        # Consistent spacing scale (xs, sm, md, lg, xl)
└── typography.ts     # Font sizes, weights, line heights
```

**Done when**: Zero instances of `const C = {` remain in any screen file. All screens render identically to before.

---

#### A2. Extract Shared Components

**Files to create**: `src/components/` directory

Extract these repeated patterns into reusable components:

| Component | Extracted From | Props |
|-----------|---------------|-------|
| `Card` | `index.tsx`, `status.tsx` | `children`, `title?`, `icon?`, `style?` |
| `ScreenHeader` | All screens | `title`, `rightElement?` |
| `StatusPill` | `index.tsx` | `connected`, `label?`, `onPress?` |
| `Row` | `index.tsx`, `status.tsx` | `label`, `value`, `valueColor?` |
| `Badge` | `automations.tsx` | `status`, `label?` |
| `LoadingState` | New | `message?` — centered spinner with optional text |
| `ErrorState` | New | `message`, `onRetry?` — error message with retry button |
| `EmptyState` | `chat.tsx` | `icon`, `message` |

Each component should:
- Use the `useTheme()` hook for all colors/spacing.
- Accept a `style` override prop for flexibility.
- Have a clearly defined props interface.
- Be under 100 lines.

**Done when**: All existing screens refactored to use shared components. No visual regressions.

---

#### A3. Expand Type Definitions

**File to edit**: `src/types/index.ts`

Add/extend these types:

```typescript
// --- Extend existing ---

interface Message {
  // existing fields...
  category?: 'user' | 'assistant' | 'alert' | 'automation' | 'system';
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  sessionId?: string;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
}

interface Attachment {
  id: string;
  name: string;
  type: string;       // MIME type
  url: string;
  size: number;
  thumbnailUrl?: string;
}

interface CronJob {
  // existing fields...
  runHistory?: CronRunRecord[];
  createdAt?: string;
  updatedAt?: string;
}

interface CronRunRecord {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'success' | 'error' | 'running';
  output?: string;
  duration?: number;
}

interface Skill {
  // existing fields...
  version?: string;
  docs?: string;
  usage?: { count: number; lastUsed: string | null };
  source?: 'installed' | 'clawhub';
}

interface GatewayStatus {
  // existing fields...
  tokenUsage?: TokenUsage;
  pairedNodes?: PairedNode[];
}

// --- New types ---

interface TokenUsage {
  today: number;
  total: number;
  limit?: number;
  trend: { date: string; tokens: number }[];
  estimatedCost?: number;
}

interface Channel {
  name: string;
  status: 'active' | 'disconnected' | 'error' | 'not_configured';
  lastFlap?: string;
  uptime?: string;
  icon?: string;
}

interface PairedNode {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface MemoryFile {
  name: string;
  content: string;
  lastModified: string;
}

interface MemoryDiff {
  timestamp: string;
  author: string;
  patch: string;      // unified diff format
}

interface DailyNote {
  date: string;        // YYYY-MM-DD
  content: string;
  lastModified: string;
}

interface Notification {
  id: string;
  category: 'arb_alert' | 'cron_result' | 'reminder' | 'system';
  title: string;
  body: string;
  read: boolean;
  timestamp: string;
  deepLink?: string;
}

interface NotificationSettings {
  categories: {
    [key: string]: {
      push: boolean;
      sound: boolean;
      badge: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string;     // "23:00"
    end: string;       // "08:00"
  };
}

interface ActivityEvent {
  id: string;
  text: string;
  category: 'chat' | 'cron' | 'channel' | 'system';
  timestamp: string;
  icon?: string;
}
```

**Done when**: All types compile without errors. Existing code still compiles (new fields are optional).

---

#### A4. Gateway Client — New Endpoints

**File to edit**: `src/services/gateway.ts`

Add these methods to `GatewayClient`:

| Method | HTTP | Path | Returns | Used By |
|--------|------|------|---------|---------|
| `getTokenUsage()` | GET | `/api/usage` | `TokenUsage` | Home, Status |
| `getChannels()` | GET | `/api/channels` | `Channel[]` | Status |
| `getActivityFeed()` | GET | `/api/activity` | `ActivityEvent[]` | Home |
| `getMemoryFiles()` | GET | `/api/memory` | `MemoryFile[]` | Memory Browser |
| `getMemoryFile(name)` | GET | `/api/memory/:name` | `MemoryFile` | Memory Browser |
| `updateMemoryFile(name, content)` | PUT | `/api/memory/:name` | `MemoryFile` | Memory Browser |
| `getMemoryDiffs(name)` | GET | `/api/memory/:name/diffs` | `MemoryDiff[]` | Memory Browser |
| `getDailyNotes()` | GET | `/api/memory/daily` | `DailyNote[]` | Memory Browser |
| `searchMemory(query)` | POST | `/api/memory/search` | `MemoryFile[]` | Memory Browser |
| `getChatSessions()` | GET | `/api/chat/sessions` | `ChatSession[]` | Chat |
| `searchMessages(query)` | POST | `/api/chat/search` | `Message[]` | Chat |

Also improve error handling:
- Add a shared `request()` method that handles auth, error parsing, and optional retries.
- Return structured error objects instead of throwing raw strings.

**Done when**: All methods exist, type-check, and follow a consistent pattern.

---

#### A5. Data-Fetching Hooks

**Files to create**: `src/hooks/` directory

```
src/hooks/
├── usePolling.ts         # Generic polling hook with interval, loading, error
├── useGatewayStatus.ts   # Polls getStatus(), returns { data, loading, error, refresh }
├── useCronJobs.ts        # Polls getCronJobs()
├── useSkills.ts          # Polls getSkills()
├── useTokenUsage.ts      # Polls getTokenUsage()
├── useChannels.ts        # Polls getChannels()
└── useActivityFeed.ts    # Polls getActivityFeed()
```

Each hook should:
- Accept a `pollInterval` (default: 30s for status, 60s for others).
- Return `{ data: T | null, loading: boolean, error: string | null, refresh: () => void }`.
- Only poll when the gateway client exists (connected).
- Clean up intervals on unmount.
- Use `useCallback` and `useRef` to avoid stale closures.

The generic `usePolling` hook pattern:
```typescript
function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number) {
  // Returns { data, loading, error, refresh }
}
```

**Done when**: Hooks work in isolation. Can be dropped into any screen.

---

#### A6. WebSocket Lifecycle & Connection State

**File to edit**: `src/services/store.ts`

- When `saveConfig` is called with a valid token, auto-call `client.connect()` to establish the WebSocket.
- Expose WebSocket connection state (`connecting` | `connected` | `disconnected` | `error`) in the store.
- On `SET_CLIENT`, disconnect the previous client's WebSocket before connecting the new one.
- Add a `reconnecting` state so the UI can show reconnection attempts.
- Dispatch `SET_CONNECTED` based on WebSocket `onopen` / `onclose` events (not just the config save).

**Done when**: The status pill accurately reflects real-time WebSocket connection state.

---

#### A7. Entrance Animations

**File to create**: `src/components/AnimatedCard.tsx`

- Wrap the `Card` component with a `react-native-reanimated` `FadeInDown` or `FadeInUp` animation.
- Accept a `delay` prop (the existing Card already receives this but ignores it).
- Add a `SkeletonCard` component that shows a pulsing placeholder while data loads.

**Done when**: Cards animate in on screen mount. Skeleton cards appear during loading.

---

### Part B — Home Dashboard (Live)

#### B1. Live Status Pill

- Replace the current binary Connected/Offline pill with a tri-state indicator:
  - 🟢 **Online** — WebSocket connected, no active request
  - 🟡 **Thinking…** — an AI request is in-flight (track via `sendMessage` loading state)
  - 🔴 **Offline** — WebSocket disconnected
- Show the current model name next to the pill when online (e.g. "claude-opus-4 · Online").

**Done when**: Pill reflects real gateway state. Transitions are visible in real time.

---

#### B2. Live Activity Feed

- Replace the hardcoded 5-item list with `useActivityFeed()` hook data.
- Show loading skeleton while fetching.
- Show empty state if no activity.
- Each activity item should show an icon based on category, description text, and relative timestamp.
- Subscribe to WebSocket for real-time new events (push to top of list).

**Done when**: Activity feed shows real data (or a clean empty state) and updates in real time.

---

#### B3. Active Automations (Live)

- Replace hardcoded "5" and "in 12 minutes" with `useCronJobs()` hook data.
- Show count of enabled jobs and the real next-run time (formatted relative, e.g. "in 12 min").
- Tapping the card should navigate to the Automations tab.

**Done when**: Automation count and next-run time come from the gateway.

---

#### B4. Token Usage Widget

- Add a new card below Active Automations.
- Use `useTokenUsage()` hook.
- Display: today's token count, a simple progress bar (if limit exists), estimated cost.
- Optionally show a mini sparkline/trend bar for the last 7 days.

**Done when**: Token usage card appears with real data (or graceful "unavailable" state).

---

#### B5. Notification Summary (Stubbed)

- Add a new card showing notification counts by category.
- For now, read from a local store placeholder (no push notification system yet).
- Show "No new notifications" empty state.
- Categories: Arb Alerts, Cron Results, Reminders — each with an icon and count.

**Done when**: Card renders with placeholder counts. Structure is ready for Deliverable 4 to wire up real notifications.

---

#### B6. Quick-Action Buttons (Wired)

- Give each button a real `onPress` handler:
  - **Check Email** → `client.sendMessage("Check my email")` or a dedicated endpoint.
  - **Weather** → `client.sendMessage("What's the weather?")` or dedicated endpoint.
  - **Run Crons** → navigate to Automations tab.
  - **Status** → navigate to Status tab.
- Show a brief loading indicator while the action executes.
- Make the button list configurable in a future deliverable (for now, hardcoded is fine).

**Done when**: Each button triggers a real action with feedback.

---

## Files Changed / Created Summary

| Action | Path |
|--------|------|
| Create | `src/theme/index.ts` |
| Create | `src/theme/colors.ts` |
| Create | `src/theme/spacing.ts` |
| Create | `src/theme/typography.ts` |
| Create | `src/components/Card.tsx` |
| Create | `src/components/AnimatedCard.tsx` |
| Create | `src/components/ScreenHeader.tsx` |
| Create | `src/components/StatusPill.tsx` |
| Create | `src/components/Row.tsx` |
| Create | `src/components/Badge.tsx` |
| Create | `src/components/LoadingState.tsx` |
| Create | `src/components/ErrorState.tsx` |
| Create | `src/components/EmptyState.tsx` |
| Create | `src/components/SkeletonCard.tsx` |
| Create | `src/hooks/usePolling.ts` |
| Create | `src/hooks/useGatewayStatus.ts` |
| Create | `src/hooks/useCronJobs.ts` |
| Create | `src/hooks/useSkills.ts` |
| Create | `src/hooks/useTokenUsage.ts` |
| Create | `src/hooks/useChannels.ts` |
| Create | `src/hooks/useActivityFeed.ts` |
| Edit | `src/types/index.ts` — expand all types |
| Edit | `src/services/gateway.ts` — add new endpoints, improve error handling |
| Edit | `src/services/store.ts` — WebSocket lifecycle, connection state |
| Edit | `app/_layout.tsx` — add ThemeProvider |
| Edit | `app/(tabs)/index.tsx` — full rewrite with live data |
| Edit | `app/(tabs)/chat.tsx` — use shared components + theme |
| Edit | `app/(tabs)/automations.tsx` — use shared components + theme |
| Edit | `app/(tabs)/skills.tsx` — use shared components + theme |
| Edit | `app/(tabs)/status.tsx` — use shared components + theme |
| Edit | `app/settings.tsx` — use shared components + theme |

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| None required | All work uses existing dependencies. `react-native-reanimated` is already installed for animations. |

---

## Testing Checklist

- [ ] All screens render without errors after theme/component refactor
- [ ] No visual regressions — screens look identical to before
- [ ] Theme colors are sourced from a single module (grep confirms zero inline `const C`)
- [ ] Home Dashboard shows real gateway status when connected
- [ ] Home Dashboard shows appropriate loading/error/empty states when disconnected
- [ ] Status pill transitions between Online/Thinking/Offline correctly
- [ ] Activity feed updates in real time via WebSocket
- [ ] Token usage card displays data or graceful fallback
- [ ] Quick-action buttons trigger real actions with visible feedback
- [ ] WebSocket reconnection is visible in the UI (not silent)
- [ ] Data hooks clean up polling intervals on unmount (no memory leaks)

---

## Definition of Done

This deliverable is **complete** when:

1. The codebase has a centralized theme, shared component library, and data-fetching hooks.
2. The Home Dashboard is fully functional with live data from the gateway.
3. All other screens still work correctly (no regressions), now using shared components.
4. The testing checklist above passes.

