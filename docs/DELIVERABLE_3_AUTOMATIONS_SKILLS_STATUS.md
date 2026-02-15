# Deliverable 3 — Automations, Skills & Status

> **Scope**: Complete the three "management and monitoring" screens with live data, full CRUD, and rich detail views.
> **Estimated effort**: ~2.5 weeks
> **Prerequisite**: Deliverable 1 (shared infrastructure, hooks, types, gateway methods)
> **Exit criteria**: Automations supports creation, run history, and live toggling. Skills shows real data with ClawHub browsing. Status displays live telemetry for all PRD-specified metrics.

---

## Why These Go Together

Automations, Skills, and Status are the three "management" screens. They share a common pattern: fetch live data from the gateway, display it in cards/lists, and provide detail views. Building them together lets us establish a consistent live-data-driven screen pattern and reuse components heavily.

---

## New Dependencies to Install

| Package | Purpose |
|---------|---------|
| `@react-native-community/datetimepicker` | Time/date picking for automation scheduling |
| None others required | Shared components and hooks from D1 cover the rest |

---

## Task Checklist

### Part A — Automations (Full Management)

#### A1. Live Data Integration

**File to edit**: `app/(tabs)/automations.tsx`
**Hook to use**: `useCronJobs()` from Deliverable 1

- Replace `PLACEHOLDER_JOBS` array with live data from the `useCronJobs()` hook.
- Show `LoadingState` while fetching, `ErrorState` on failure, `EmptyState` when no jobs exist.
- Maintain a `SkeletonCard` loading pattern matching the job card layout.
- Add pull-to-refresh gesture.

**Done when**: The automation list shows real data from the gateway with proper loading/error/empty states.

---

#### A2. Wire Up Toggle & Run Now

**File to edit**: `app/(tabs)/automations.tsx`

- **Toggle**: When the user flips the switch, call `client.toggleCronJob(id, enabled)`.
  - Show optimistic UI update (toggle immediately).
  - On failure, revert the toggle and show an error toast.
- **Run Now**: When tapped, call `client.runCronJob(id)`.
  - Show a loading spinner on the button while the run is in progress.
  - On completion, refresh the job data to show updated `lastRun` and `lastStatus`.
  - On failure, show an error message.

**Done when**: Toggle persists to gateway. Run Now triggers a real job execution with feedback.

---

#### A3. Run History with Logs

**Files to create**: `app/automations/[id].tsx` (detail screen), `src/components/RunHistoryList.tsx`
**File to create**: `src/hooks/useCronRunHistory.ts`
**Gateway method to add (if not done)**: `getCronRunHistory(id): CronRunRecord[]`

- Tapping a job card navigates to a full-screen detail view (not the current bottom-sheet modal).
- The detail view shows:
  - Job name, schedule (human readable + cron syntax), enabled status.
  - A "Run Now" button at the top.
  - **Run History** section: a chronological list of past runs.
    - Each entry shows: timestamp, status badge, duration.
    - Tapping an entry expands to show the full log output in a scrollable monospaced text view.
- Replace the current `Modal` detail view with navigation to this new screen.

**Done when**: Job detail screen shows full metadata and a scrollable run history with expandable logs.

---

#### A4. Guided Creation Flow

**Files to create**: `app/automations/create.tsx`, `src/components/CronScheduleBuilder.tsx`

- Add a floating action button (FAB) or "+" button at the bottom of the automations list.
- Tapping it opens a multi-step creation flow:

**Step 1 — Name & Description**
  - Text input for automation name.
  - Optional text input for description.
  - "Next" button.

**Step 2 — Schedule**
  - Pre-built schedule options: "Every 15 min", "Every hour", "Daily at 9 AM", "Weekly on Monday", "Custom".
  - Selecting "Custom" shows a cron expression builder:
    - Five fields (minute, hour, day, month, weekday) with dropdowns or text inputs.
    - Live preview: "Runs every day at 3:00 PM" human-readable output.
  - "Next" button.

**Step 3 — Action**
  - Select what the automation does:
    - Send a message / command to the AI (text input).
    - Run a specific skill (dropdown of installed skills).
  - "Next" button.

**Step 4 — Review & Create**
  - Summary of all settings.
  - "Create Automation" button.
  - On success, navigate back to the list (new job appears).
  - On failure, show error and stay on review screen.

**Gateway method to add**: `createCronJob(job: Partial<CronJob>): CronJob`

**Done when**: User can create a new automation through the guided flow. It appears in the list after creation.

---

#### A5. Edit & Delete Automations

**File to edit**: `app/automations/[id].tsx`
**Gateway methods to add**: `updateCronJob(id, patch)`, `deleteCronJob(id)`

- **Edit**: Add an "Edit" button on the detail screen. Opens the same form flow as creation but pre-filled with current values. Save calls `updateCronJob()`.
- **Delete**: Add a "Delete" option (accessible via a "..." menu or a red button at the bottom of detail). Confirm with an alert dialog. Calls `deleteCronJob()`. Navigate back to list on success.

**Done when**: User can modify an automation's name, schedule, and action. User can delete an automation with confirmation.

---

### Part B — Skills (Real Data & ClawHub)

#### B1. Live Data Integration

**File to edit**: `app/(tabs)/skills.tsx`
**Hook to use**: `useSkills()` from Deliverable 1

- Replace `PLACEHOLDER_SKILLS` array with live data from `useSkills()` hook.
- Show loading/error/empty states.
- Keep the grid layout but use real skill icons (or a fallback icon based on skill name).
- Show the count badge with the real count.

**Done when**: Skills grid shows real installed skills from the gateway.

---

#### B2. Rich Skill Detail View

**File to create**: `app/skills/[id].tsx`
**File to edit**: `app/(tabs)/skills.tsx` — change onPress to navigate instead of showing modal

- Replace the current simple modal with a full-screen detail view.
- The detail view shows:
  - Skill icon (large), name, version, and installed/available badge.
  - **Description** section with markdown rendering.
  - **Documentation** tab: full usage docs rendered as markdown.
  - **Usage Stats**: how many times used, last used date.
  - **Configuration** section: per-skill settings (if applicable).
  - Enable/disable toggle.

**Done when**: Tapping a skill opens a rich detail screen with docs, usage stats, and config.

---

#### B3. Enable/Disable Skills

**File to edit**: `app/skills/[id].tsx`
**Gateway method to add**: `toggleSkill(id, enabled): void`

- Add an enable/disable toggle on the skill detail screen.
- Optimistic UI update with rollback on failure.
- Disabled skills appear dimmed in the grid with a "disabled" badge overlay.

**Done when**: User can enable/disable skills. Visual state reflects the change. Persists to gateway.

---

#### B4. ClawHub Browse & Search

**Files to create**: `src/components/ClawHubBrowser.tsx`, `src/hooks/useClawHub.ts`
**File to edit**: `app/(tabs)/skills.tsx`
**Gateway methods to add**: `getClawHubSkills(query?, category?): Skill[]`, `installSkill(id): void`

- Add a tab switcher at the top of the Skills screen: "Installed" | "ClawHub".
- **ClawHub tab** shows a browsable catalog of available skills:
  - Search bar at the top.
  - Category filter pills (e.g. "Communication", "Productivity", "Smart Home", "Developer").
  - Grid/list of available skills (same tile component as installed, but with an "Install" badge).
  - Pagination or infinite scroll for large catalogs.
- Each skill tile shows: name, icon, short description, star/popularity count.

**Done when**: User can browse the ClawHub catalog with search and category filtering.

---

#### B5. Install from ClawHub

**File to edit**: `src/components/ClawHubBrowser.tsx`, `app/skills/[id].tsx`

- Tapping a ClawHub skill opens the same detail view, but with an "Install" button instead of enable/disable.
- Install flow:
  1. Tap "Install" → show confirmation dialog with skill name and permissions.
  2. On confirm → call `installSkill(id)` → show progress indicator.
  3. On success → skill moves to "Installed" tab, detail view updates to show enable/disable.
  4. On failure → show error message, keep "Install" button.
- After installation, the skill appears in the Installed tab grid.

**Done when**: User can install a skill from ClawHub. It appears in their installed skills afterward.

---

### Part C — Status (Live Telemetry)

#### C1. Live Connection Health

**File to edit**: `app/(tabs)/status.tsx`
**Hook to use**: `useGatewayStatus()` from Deliverable 1

- Replace hardcoded "42ms" latency with a real ping measurement.
  - Measure round-trip time of `getStatus()` call and display it.
  - Color-code: green (<100ms), yellow (100-500ms), red (>500ms).
- Show connection uptime (how long the WebSocket has been connected).
- Show reconnection count if applicable.
- Auto-refresh every 10 seconds.

**Done when**: Latency and uptime are real measurements, color-coded, and auto-refreshing.

---

#### C2. Live Model Info

**File to edit**: `app/(tabs)/status.tsx`

- Pull model name, version, and context window from the gateway status response.
- Remove hardcoded "Anthropic" and "200K tokens".
- If the gateway doesn't provide these fields, show "—" gracefully.

**Done when**: Model section shows real data from the gateway.

---

#### C3. Token Usage & Cost Display

**File to create**: `src/components/UsageChart.tsx`
**File to edit**: `app/(tabs)/status.tsx`
**Hook to use**: `useTokenUsage()` from Deliverable 1

- Add a new "Usage" section to the Status screen.
- Display:
  - **Today's tokens**: large number with a comparison to yesterday (e.g. "+12% vs yesterday").
  - **Total tokens**: lifetime or billing-period total.
  - **Estimated cost**: formatted as currency (e.g. "$4.28 today").
  - **7-day trend**: a simple bar chart or sparkline showing daily usage.
    - Build a lightweight chart component using `View` elements (no heavy chart library needed).
    - Each bar represents a day; height proportional to token count; labeled with abbreviated day.
- If usage data is unavailable, show a "Usage data unavailable" message.

**Done when**: Usage section shows real token data with a visual trend chart.

---

#### C4. Paired Nodes

**File to edit**: `app/(tabs)/status.tsx`
**Gateway method to add (if not done)**: `getPairedNodes(): PairedNode[]`

- Add a new "Paired Nodes" section.
- List each connected device/service:
  - Name, type (e.g. "Mac Mini", "iPhone", "Raspberry Pi"), and status indicator (online/offline).
  - Last seen timestamp (relative, e.g. "3 min ago").
  - Icon based on device type.
- Show empty state if no paired nodes.

**Done when**: Paired nodes section shows real connected devices or a clean empty state.

---

#### C5. Live Channel Status

**File to edit**: `app/(tabs)/status.tsx`
**Hook to use**: `useChannels()` from Deliverable 1

- Replace the hardcoded WhatsApp/Discord entries with real data from `useChannels()`.
- Each channel shows:
  - Platform icon and name.
  - Status indicator: active (green), disconnected (red), error (orange), not configured (gray).
  - Uptime (if active): how long it's been connected.
  - **Flap detection**: if the channel has disconnected/reconnected multiple times recently, show a warning badge "⚠️ Unstable (3 flaps in 1h)".
- Auto-refresh every 15 seconds.

**Done when**: Channel status shows real per-channel health with flap detection indicators.

---

## Files Changed / Created Summary

| Action | Path |
|--------|------|
| Create | `app/automations/[id].tsx` |
| Create | `app/automations/create.tsx` |
| Create | `app/skills/[id].tsx` |
| Create | `src/components/RunHistoryList.tsx` |
| Create | `src/components/CronScheduleBuilder.tsx` |
| Create | `src/components/ClawHubBrowser.tsx` |
| Create | `src/components/UsageChart.tsx` |
| Create | `src/hooks/useCronRunHistory.ts` |
| Create | `src/hooks/useClawHub.ts` |
| Edit | `app/(tabs)/automations.tsx` — live data, wired actions, FAB |
| Edit | `app/(tabs)/skills.tsx` — live data, Installed/ClawHub tabs, navigate to detail |
| Edit | `app/(tabs)/status.tsx` — all sections live with real data |
| Edit | `src/services/gateway.ts` — add `getCronRunHistory`, `createCronJob`, `updateCronJob`, `deleteCronJob`, `toggleSkill`, `getClawHubSkills`, `installSkill`, `getPairedNodes` |

---

## Testing Checklist

### Automations
- [ ] Job list loads from gateway with loading/error/empty states
- [ ] Pull-to-refresh works
- [ ] Toggle sends request to gateway; rolls back on failure
- [ ] Run Now triggers execution; shows loading; updates status on completion
- [ ] Job detail screen shows full metadata and run history
- [ ] Expanding a run history entry shows log output
- [ ] Creation flow: all 4 steps work; new job appears in list on success
- [ ] Cron schedule builder shows correct human-readable preview
- [ ] Edit: pre-fills form; saves changes to gateway
- [ ] Delete: confirms before deleting; navigates back to list

### Skills
- [ ] Skills grid loads from gateway with loading/error/empty states
- [ ] Tapping a skill opens full detail screen (not modal)
- [ ] Detail shows docs, usage stats, version
- [ ] Enable/disable toggle works with optimistic UI
- [ ] Disabled skills appear dimmed in grid
- [ ] ClawHub tab shows browsable catalog with search
- [ ] Category filter pills work
- [ ] Install flow: confirm → progress → success/failure
- [ ] Newly installed skill appears in Installed tab

### Status
- [ ] Latency shows real measurement, color-coded
- [ ] Connection uptime is accurate
- [ ] Model info comes from gateway (no hardcoded values)
- [ ] Token usage shows today's count, total, estimated cost
- [ ] 7-day trend chart renders correctly
- [ ] Paired nodes list shows real devices or empty state
- [ ] Channel status shows real per-channel health
- [ ] Flap detection warning appears for unstable channels
- [ ] All sections auto-refresh at appropriate intervals

---

## Definition of Done

This deliverable is **complete** when:

1. Automations supports full CRUD: list, create, edit, delete, toggle, run now, and run history.
2. Skills shows real installed skills, rich detail views, and ClawHub browsing/installation.
3. Status displays live telemetry for connection, model, usage, paired nodes, and channels.
4. All three screens use live gateway data with consistent loading/error/empty patterns.
5. The testing checklist above passes.

