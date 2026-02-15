# Deliverable 4 — Settings, Notifications & Polish

> **Scope**: Complete settings, push notification system, theming, accessibility, offline mode, and final polish.
> **Estimated effort**: ~3 weeks
> **Prerequisite**: Deliverables 1–3 (all screens functional with live data)
> **Exit criteria**: Settings is fully built out per PRD. Push notifications work with categories, deep-linking, and quiet hours. The app is polished with animations, accessibility, offline resilience, and Expo web support.

---

## Why This Comes Last

Settings and notifications are system-level features that touch every other screen. They're best built after all screens exist so that notification deep-links, theme changes, and model overrides can be tested against real functionality. Polish is inherently a finishing step.

---

## New Dependencies to Install

| Package | Purpose |
|---------|---------|
| `expo-notifications` | Push notification registration, scheduling, and handling |
| `expo-haptics` | Haptic feedback for button presses and interactions |
| `@react-native-async-storage/async-storage` | Persist non-sensitive settings (theme, notification prefs) |
| `expo-linking` | Deep-link URL handling for notifications |

---

## Task Checklist

### Part A — Settings (Full Configuration)

#### A1. Settings Screen Restructure

**File to edit**: `app/settings.tsx`

- Reorganize the settings screen into sections with clear headers:
  - **Gateway Connection** (existing — URL, token, test button)
  - **Model** (new)
  - **Appearance** (new)
  - **Notifications** (new)
  - **About** (new)
- Use the shared `Card` and `Row` components.
- Make the screen scrollable (it will be longer now).
- Add section dividers and icons for each section header.

**Done when**: Settings screen has a clean sectioned layout with all five sections visible.

---

#### A2. Model Override

**Files to create**: `src/components/ModelPicker.tsx`
**File to edit**: `app/settings.tsx`
**Gateway method to add**: `getAvailableModels(): { id: string; name: string; provider: string }[]`

- **Model section** shows:
  - Current model in use (from gateway status).
  - A "Change Model" row that opens a picker/modal.
- **Model picker** shows:
  - List of available models from the gateway.
  - Each row: model name, provider, context window size.
  - Currently selected model has a checkmark.
  - A "Use Default" option at the top (clears override).
- Selecting a model calls the gateway to set the override.
- Persist the override locally (so the preference survives app restart).

**Done when**: User can view available models and pin a specific one. Override persists across sessions.

---

#### A3. Theme Switching (Light / Dark / System)

**Files to edit**: `src/theme/index.ts`, `src/theme/colors.ts`, `app/settings.tsx`, `app/_layout.tsx`
**File to create**: `src/hooks/useColorScheme.ts`

- **Define a light theme** color palette in `src/theme/colors.ts`:
  - Light backgrounds, dark text, adjusted accent colors for contrast.
- **Theme setting options**: Light, Dark, System (follows OS preference).
- **Update ThemeProvider**:
  - Read the saved theme preference from AsyncStorage on launch.
  - If "System", use React Native's `useColorScheme()` hook to detect OS preference.
  - Expose `setThemePreference(mode)` function.
  - All components using `useTheme()` automatically re-render with new colors.
- **Settings UI**: A three-option segmented control (Light / Dark / System) in the Appearance section.
- **Update StatusBar**: Set `StatusBar` style based on active theme.
- **Persist**: Save preference to AsyncStorage.

**Done when**: User can switch between light, dark, and system themes. The entire app re-themes instantly. Preference persists across launches.

---

#### A4. Notification Routing UI

**File to create**: `src/components/NotificationSettingsCard.tsx`
**File to edit**: `app/settings.tsx`
**Types to use**: `NotificationSettings` from expanded types

- **Notifications section** in Settings shows a card per notification category:

| Category | Push | Sound | Badge |
|----------|------|-------|-------|
| Arb Alerts | ✅ | ✅ | ✅ |
| Cron Results | ✅ | ❌ | ✅ |
| Reminders | ✅ | ✅ | ✅ |

- Each row has three toggle switches: Push, Sound, Badge.
- Default values match the PRD (arb alerts = push+sound, cron results = silent badge, reminders = push+sound).
- Changes are saved immediately to AsyncStorage (and optionally synced to gateway).
- Show a brief "Saved" confirmation when a toggle changes.

**Done when**: Per-category notification routing works with three toggles per category. Preferences persist.

---

#### A5. Quiet Hours

**File to create**: `src/components/QuietHoursPicker.tsx`
**File to edit**: `app/settings.tsx`

- Add a "Quiet Hours" row in the Notifications section.
- Tapping opens a configuration view:
  - Enable/disable toggle.
  - Start time picker (default: 11:00 PM).
  - End time picker (default: 8:00 AM).
  - Description text: "Non-critical notifications will be suppressed during quiet hours."
- Use `@react-native-community/datetimepicker` or a custom time picker.
- Save to AsyncStorage.
- The notification system (Part B) will read this setting to suppress notifications.

**Done when**: User can configure quiet hours with start/end times. Setting persists.

---

#### A6. About Section

**File to edit**: `app/settings.tsx`

- Display:
  - App version (from `app.json`).
  - Gateway version (from gateway status).
  - Build number.
  - Links: "View on GitHub", "Report Issue", "Privacy Policy" (or placeholders).
- This is a simple informational section with no interactivity beyond links.

**Done when**: About section shows version info and links.

---

### Part B — Push Notifications

#### B1. Expo Notifications Setup

**File to create**: `src/services/notifications.ts`
**File to edit**: `app/_layout.tsx`

- Install and configure `expo-notifications`.
- On app launch:
  - Request notification permissions (iOS: ask user; Android: granted by default).
  - Register for push notifications and obtain the push token.
  - Send the push token to the gateway: `registerPushToken(token): void`.
- Configure notification channels (Android):
  - `arb_alerts` — high importance, with sound.
  - `cron_results` — low importance, no sound.
  - `reminders` — high importance, with sound.
- Set up a notification handler that decides whether to show notifications when the app is in the foreground (based on user settings).

**Done when**: App requests permissions, obtains a push token, registers it with the gateway, and configures Android channels.

---

#### B2. Category-Based Routing

**File to edit**: `src/services/notifications.ts`

- When a notification arrives, check its category against the user's saved `NotificationSettings`.
- **If Push is disabled** for that category → suppress the notification.
- **If Sound is disabled** → show the notification silently.
- **If Badge is disabled** → show notification but don't increment badge count.
- Handle both foreground and background notification delivery.
- Map gateway notification payloads to the local `Notification` type.

**Done when**: Notifications respect per-category push/sound/badge settings.

---

#### B3. Deep-Linking

**File to create**: `src/services/deeplink.ts`
**File to edit**: `src/services/notifications.ts`, `app/_layout.tsx`

- When a notification is tapped, read its `deepLink` field and navigate accordingly:
  - `rawclaw://chat/:sessionId` → Open Chat tab, switch to that session.
  - `rawclaw://automations/:id` → Open Automations tab, navigate to job detail.
  - `rawclaw://status` → Open Status tab.
  - `rawclaw://memory/:name` → Open Memory Browser, navigate to that file.
- Configure Expo Router's linking config to handle these URL schemes.
- Use `expo-linking` for URL parsing.
- If the app is not running, the deep-link should work when the app cold-starts from the notification.

**Done when**: Tapping a notification navigates to the correct screen and context. Works for both warm and cold starts.

---

#### B4. Quiet Hours Enforcement

**File to edit**: `src/services/notifications.ts`

- Before displaying any non-critical notification, check if the current time falls within quiet hours.
- **Critical notifications** (defined by category — could be configurable) always come through.
- **Non-critical notifications** during quiet hours:
  - Are silenced (no sound, no banner).
  - Still increment the badge count (so the user sees them when they open the app).
  - Are stored in the notification history for later viewing.
- When quiet hours end, don't retroactively push silenced notifications. They'll be visible in-app.

**Done when**: Notifications during quiet hours are silently suppressed. Critical notifications still come through.

---

#### B5. Notification Summary on Home Dashboard

**File to edit**: `app/(tabs)/index.tsx`
**File to create**: `src/hooks/useNotifications.ts`

- Wire up the stubbed notification summary card from Deliverable 1.
- Read real notification data (from local storage or gateway).
- Show unread count per category with icons:
  - 🔔 Arb Alerts: 2
  - ⏱️ Cron Results: 5
  - 📌 Reminders: 1
- Tapping the card could navigate to a notification center (or just the relevant tab for now).
- Badge count on the app icon reflects the total unread count.

**Done when**: Home dashboard shows real notification counts. App badge reflects total unread.

---

### Part C — Polish & Refinement

#### C1. Animations & Micro-Interactions

**Files to edit**: Various components across the app

- **Card entrance animations**: `FadeInDown` with staggered delays (already prepped in D1 with AnimatedCard).
- **Pull-to-refresh**: Add to all list screens (Home, Automations, Skills, Status, Memory).
- **Button feedback**: Use `expo-haptics` for light haptic feedback on button presses.
- **Tab transitions**: Smooth cross-fade when switching tabs.
- **Skeleton loading**: Ensure all data-loading screens show skeleton placeholders (not just spinners).
- **Swipe gestures**: Swipe-to-delete on automations list items (with confirmation).
- **Pressable states**: All tappable elements should have a visible pressed state (opacity or scale).

**Done when**: The app feels fluid and responsive. All interactions have appropriate feedback.

---

#### C2. Accessibility Audit

**Files to edit**: All screen and component files

- **Semantic labels**: Add `accessibilityLabel` to all interactive elements (buttons, toggles, links).
- **Roles**: Add `accessibilityRole` where appropriate (button, switch, link, header, tab).
- **Hints**: Add `accessibilityHint` for non-obvious actions.
- **VoiceOver/TalkBack testing**: Navigate every screen using screen readers.
- **Keyboard navigation** (web): Ensure all interactive elements are focusable and operable via keyboard.
- **Color contrast**: Verify all text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text) in both light and dark themes.
- **Touch targets**: Ensure all tappable elements are at least 44×44 points.
- **Reduced motion**: Respect OS "reduce motion" setting to disable animations.

**Done when**: App is fully navigable via VoiceOver (iOS) and TalkBack (Android). All elements are labeled.

---

#### C3. Error Boundaries & Offline Mode

**Files to create**: `src/components/ErrorBoundary.tsx`, `src/services/cache.ts`

- **Error Boundary**: Wrap the app in a React error boundary.
  - Catches unhandled rendering errors.
  - Shows a "Something went wrong" screen with a "Retry" button.
  - Logs the error for debugging.
- **Offline mode**:
  - Detect when the gateway is unreachable (WebSocket disconnected + REST fails).
  - Show a persistent "Offline" banner at the top of every screen.
  - Cache the last-known data for each screen using AsyncStorage:
    - Home dashboard metrics, cron jobs, skills list, status info.
  - Display cached data with a "Last updated 5 min ago" label.
  - Disable actions that require the gateway (send message, run cron, etc.) with a tooltip explaining why.
  - Auto-reconnect and refresh when connectivity returns.

**Done when**: App degrades gracefully when offline. Cached data is displayed. Auto-recovers on reconnection.

---

#### C4. Expo Web Optimization

**Files to edit**: Various — web-specific adjustments

- Test every screen in Expo web (`expo start --web`).
- Fix any web-specific layout issues:
  - Max-width container on large screens (don't stretch to full browser width).
  - Responsive layout: tab bar could become a sidebar on wide screens.
  - Hover states for buttons and interactive elements (web only).
  - Scrollbar styling.
- Ensure markdown rendering works on web.
- Ensure animations work on web (Reanimated web support).
- Fix any `Platform.OS` assumptions that break on web.

**Done when**: All screens work well in a desktop browser via Expo web. Layout adapts to larger screens.

---

#### C5. Performance Optimization

- **FlatList optimization**: Ensure all list screens use `getItemLayout` for fixed-height items, `windowSize`, and `maxToRenderPerBatch`.
- **Memoization**: Apply `React.memo` to pure components (Card, Row, Badge, MessageBubble).
- **useCallback/useMemo**: Audit all hooks and event handlers for proper memoization.
- **Image caching**: If any images are loaded (skill icons, avatars), ensure they're cached.
- **Bundle analysis**: Check bundle size and remove unused dependencies.
- **Reduce re-renders**: Use React DevTools profiler to identify unnecessary re-renders.

**Done when**: No performance warnings. Scrolling is smooth at 60fps. No unnecessary re-renders detected.

---

#### C6. Next.js Desktop App (Scaffold)

**Files to create**: `web/` directory at project root

- This is a **scaffold only** — not a full implementation. The goal is to set up the structure so it can be built out later.
- Create a Next.js 15 project in `web/` with:
  - TypeScript configuration.
  - Shared types imported from `../src/types/`.
  - Shared gateway client imported from `../src/services/gateway.ts`.
  - Basic page stubs for each section (Home, Chat, Memory, Automations, Skills, Status, Settings).
  - A responsive sidebar navigation layout (desktop-optimized).
  - Dark theme matching the mobile app's color palette.
- Configure the project to work in a monorepo-like structure (shared imports from `src/`).
- Add a README explaining the architecture and how to run it.

**Done when**: `cd web && npm run dev` launches a Next.js app with working navigation stubs that import shared types and services.

---

## Files Changed / Created Summary

| Action | Path |
|--------|------|
| Create | `src/services/notifications.ts` |
| Create | `src/services/deeplink.ts` |
| Create | `src/services/cache.ts` |
| Create | `src/components/ModelPicker.tsx` |
| Create | `src/components/NotificationSettingsCard.tsx` |
| Create | `src/components/QuietHoursPicker.tsx` |
| Create | `src/components/ErrorBoundary.tsx` |
| Create | `src/hooks/useNotifications.ts` |
| Create | `src/hooks/useColorScheme.ts` |
| Create | `web/` (Next.js scaffold — multiple files) |
| Edit | `app/settings.tsx` — full rewrite with all sections |
| Edit | `app/_layout.tsx` — add notification setup, error boundary, theme listener |
| Edit | `app/(tabs)/index.tsx` — wire up real notification summary |
| Edit | `src/theme/index.ts` — add light theme, system detection |
| Edit | `src/theme/colors.ts` — add light color palette |
| Edit | `src/services/gateway.ts` — add `registerPushToken`, `getAvailableModels` |
| Edit | All screen files — accessibility labels, offline banner, animations |

---

## Testing Checklist

### Settings
- [ ] Settings screen has five clear sections: Gateway, Model, Appearance, Notifications, About
- [ ] Model picker shows available models from gateway; selection persists
- [ ] Theme switches instantly between Light, Dark, and System; persists across launches
- [ ] System theme follows OS dark mode setting
- [ ] All screens render correctly in both light and dark themes
- [ ] Notification settings: per-category push/sound/badge toggles work and persist
- [ ] Quiet hours: time picker works; setting persists
- [ ] About section shows correct app and gateway versions

### Notifications
- [ ] App requests notification permissions on first launch
- [ ] Push token is registered with gateway
- [ ] Notifications respect per-category push/sound/badge settings
- [ ] Quiet hours suppress non-critical notifications
- [ ] Critical notifications still show during quiet hours
- [ ] Tapping a notification navigates to the correct screen (deep-link)
- [ ] Deep-linking works on cold start
- [ ] Home dashboard shows real notification counts
- [ ] App badge icon reflects total unread count

### Polish
- [ ] Card entrance animations are smooth with staggered delays
- [ ] Pull-to-refresh works on all list screens
- [ ] Haptic feedback fires on button presses (iOS)
- [ ] Skeleton loading appears for all data-loading screens
- [ ] All interactive elements have accessibility labels and roles
- [ ] VoiceOver (iOS) can navigate every screen
- [ ] Error boundary catches and displays rendering errors gracefully
- [ ] Offline mode: shows cached data with "last updated" label
- [ ] Offline mode: disables gateway-dependent actions with explanation
- [ ] Auto-reconnects and refreshes data when connectivity returns
- [ ] Expo web: all screens render correctly in a desktop browser
- [ ] Expo web: layout uses max-width on wide screens
- [ ] No performance warnings in React DevTools profiler
- [ ] Next.js scaffold runs and shows navigation stubs

---

## Definition of Done

This deliverable is **complete** when:

1. Settings is fully built out: model override, theme switching, notification routing, quiet hours.
2. Push notifications work end-to-end: permissions, categories, deep-linking, quiet hours.
3. The app is polished: animations, accessibility, offline mode, and performance optimized.
4. Expo web works as an interim desktop experience.
5. A Next.js desktop scaffold exists with shared types and services.
6. The testing checklist above passes.

---

**At this point, the PRD is fully implemented.** 🎉

