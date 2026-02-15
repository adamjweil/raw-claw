# Deliverable 2 — Chat & Memory Browser

> **Scope**: Full-featured chat experience and the entirely new Memory Browser section.
> **Estimated effort**: ~3 weeks
> **Prerequisite**: Deliverable 1 (shared theme, components, hooks, expanded types)
> **Exit criteria**: Chat supports markdown, tool-call display, multi-session tabs, search, file attachments, and slash commands. Memory Browser is fully functional with file viewing/editing, calendar, diffs, and semantic search.

---

## Why These Go Together

Chat and Memory Browser are the two primary **interaction surfaces** — where users spend the most time. They share infrastructure needs: markdown rendering, search, and rich content display. Building them together avoids duplicate work and ensures a consistent content experience.

---

## New Dependencies to Install

| Package | Purpose |
|---------|---------|
| `@ronradtke/react-native-markdown-display` | Full markdown rendering (tables, code blocks, lists, links) |
| `react-native-syntax-highlighter` | Syntax highlighting inside code blocks |
| `expo-document-picker` | Pick files for attachments |
| `expo-image-picker` | Pick images for attachments |
| `expo-av` | Voice input recording + audio playback |
| `expo-speech` | Text-to-speech output |
| `react-native-calendars` | Calendar component for daily notes |
| `diff` | Compute unified diffs for memory file history |

---

## Task Checklist

### Part A — Chat Enhancements

#### A1. Full Markdown Rendering

**File to edit**: `app/(tabs)/chat.tsx` — replace inline `renderContent()` function

- Remove the existing manual bold/code parser.
- Integrate `@ronradtke/react-native-markdown-display` for assistant messages.
- Configure styles to match the dark theme (code block backgrounds, link colors, table borders).
- Support: headings, bold, italic, lists, tables, code blocks (fenced), inline code, links, blockquotes.
- Add syntax highlighting to fenced code blocks using `react-native-syntax-highlighter`.
- User messages can remain plain text (or simple markdown).

**Done when**: An assistant message containing a table, code block, and bullet list renders correctly with proper styling.

---

#### A2. Collapsible Tool-Call Details

**File to create**: `src/components/ToolCallCard.tsx`
**File to edit**: `app/(tabs)/chat.tsx`

- Use the expanded `Message.toolCalls` type from Deliverable 1.
- For each message with `toolCalls`, render a collapsible section below the message bubble.
- Collapsed state: show "🔧 Used 3 tools" summary with a chevron.
- Expanded state: show each tool call as a mini-card with:
  - Tool name and status badge (running/success/error)
  - Collapsible input (JSON formatted)
  - Collapsible output (text or JSON formatted)
  - Duration (e.g. "1.2s")
- Use `react-native-reanimated` for smooth expand/collapse animation.

**Done when**: Messages with tool calls show a collapsible details section. Tapping expands/collapses smoothly.

---

#### A3. Message Categories & Filtering

**File to edit**: `app/(tabs)/chat.tsx`
**File to create**: `src/components/MessageBubble.tsx`

- Extract `MessageBubble` from chat.tsx into its own component.
- Style messages differently based on `category`:
  - `user` — current blue bubble (right-aligned)
  - `assistant` — current dark bubble (left-aligned)
  - `alert` — red/orange tinted bubble with ⚠️ icon, left-aligned
  - `automation` — subtle bordered bubble with 🤖 icon, left-aligned
  - `system` — centered, muted text, no bubble
- Add a filter bar at the top of the chat (below header):
  - Pill buttons: All | Alerts | Automated | User
  - Filtering is client-side on the loaded messages.

**Done when**: Different message types are visually distinguishable. Filter pills work correctly.

---

#### A4. Multi-Session Tabs

**Files to create**: `src/components/SessionTabs.tsx`, `src/hooks/useChatSessions.ts`
**File to edit**: `app/(tabs)/chat.tsx`

- Add a horizontal scrollable tab bar below the chat header.
- Each tab shows the session title (truncated) and an unread indicator.
- A "+" button creates a new session.
- Long-press a tab to rename or delete it.
- Switching tabs loads that session's messages (from gateway or local cache).
- Gateway methods used: `getChatSessions()`, and `sendMessage()` with a `sessionId` parameter.
- Store the active session ID in the app store.
- The message list should only show messages for the active session.

**Done when**: User can create, switch between, rename, and delete chat sessions. Messages are scoped per session.

---

#### A5. Full-Text Search

**File to create**: `src/components/ChatSearch.tsx`
**File to edit**: `app/(tabs)/chat.tsx`

- Add a search icon in the chat header. Tapping it opens a search bar (animated slide-down).
- As the user types, search locally through loaded messages first (instant results).
- On submit or after a debounce, also query the gateway via `searchMessages(query)`.
- Display results as a list of matching messages with highlighted query terms.
- Tapping a result scrolls to that message in the conversation (or switches to its session).
- Pressing escape or the X button closes search and returns to normal view.

**Done when**: User can search messages. Local results appear instantly. Gateway results follow.

---

#### A6. Slash Command Palette

**File to create**: `src/components/CommandPalette.tsx`
**File to edit**: `app/(tabs)/chat.tsx`

- Detect when the user types `/` at the start of the input field.
- Show a dropdown/popover above the input bar listing available commands.
- Commands are fetched from the gateway or hardcoded initially:
  - `/status` — Show AI status
  - `/weather` — Get weather report
  - `/email` — Check email
  - `/cron` — List automations
  - `/skills` — List skills
  - `/clear` — Clear current session
  - `/help` — Show available commands
- Filter the list as the user continues typing (e.g. `/we` shows only `/weather`).
- Selecting a command auto-fills the input and optionally sends immediately.
- Use keyboard-friendly navigation (arrow keys on web, tap on mobile).

**Done when**: Typing `/` shows the command palette. Commands can be selected and executed.

---

#### A7. File Attachments

**Files to create**: `src/components/AttachmentPicker.tsx`, `src/components/AttachmentPreview.tsx`
**File to edit**: `app/(tabs)/chat.tsx`

- Add a paperclip (📎) button in the input bar next to the send button.
- Tapping it shows options: "Photo Library", "Take Photo", "Choose File".
- Use `expo-image-picker` for photos, `expo-document-picker` for files.
- Selected files show as a preview chip above the input bar (with a remove X button).
- On send, upload the file to the gateway (multipart form or base64).
- In the message bubble, show:
  - Images: inline thumbnail (tappable for full-screen view)
  - Other files: file name + size + download icon
- Use the `Message.attachments` type from the expanded types.

**Done when**: User can attach images and files. They appear inline in sent messages.

---

#### A8. Voice Input/Output

**Files to create**: `src/hooks/useVoiceInput.ts`, `src/hooks/useTextToSpeech.ts`
**File to edit**: `app/(tabs)/chat.tsx`

- **Voice Input**: Add a microphone button in the input bar (replaces send button when input is empty).
  - Hold to record (or tap to toggle recording).
  - Show a pulsing animation while recording.
  - On release, transcribe audio to text and place in the input field (using gateway speech-to-text or `expo-speech`).
  - User can review and edit before sending.
- **Voice Output**: Add a speaker icon on assistant message bubbles.
  - Tapping reads the message aloud using `expo-speech`.
  - Show a playing indicator while speaking.
  - Tap again to stop.

**Done when**: User can record voice and see transcribed text. Assistant messages can be read aloud.

---

### Part B — Memory Browser (New Section)

#### B1. Add Memory Tab to Navigation

**File to edit**: `app/(tabs)/_layout.tsx`
**File to create**: `app/(tabs)/memory.tsx`

- Add a new tab called "Memory" between Chat and Automations.
- Icon: `book` or `document-text` from Ionicons.
- Create the base screen with ScreenHeader component.

**Done when**: Memory tab appears in the tab bar and navigates to a skeleton screen.

---

#### B2. Memory File List

**File to edit**: `app/(tabs)/memory.tsx`
**File to create**: `src/hooks/useMemoryFiles.ts`

- Use the `getMemoryFiles()` gateway method.
- Display a list of core files: `SOUL.md`, `MEMORY.md`, `USER.md`, `IDENTITY.md` (and any others returned).
- Each row shows: file name, last modified date (relative), and a preview snippet (first ~80 chars).
- Add a loading skeleton while fetching.
- Tapping a file navigates to the file detail view.

**Done when**: Memory screen shows the list of files from the gateway with loading/error states.

---

#### B3. File Viewer with Markdown Rendering

**File to create**: `app/memory/[name].tsx` (dynamic route)

- Full-screen view of a single memory file.
- Render the file content as styled markdown (reuse the markdown renderer from Chat).
- Show file name in the header, last modified date below.
- Add an "Edit" button in the header to toggle to edit mode (see B4).
- Add a "History" button to view diffs (see B6).

**Done when**: Tapping a file from the list opens a beautifully rendered markdown view.

---

#### B4. Inline Editing

**File to edit**: `app/memory/[name].tsx`
**File to create**: `src/components/MarkdownEditor.tsx`

- When "Edit" is tapped, switch from rendered markdown view to a text editor.
- The editor should be a styled `TextInput` (multiline, monospaced font) pre-filled with the raw markdown content.
- Show an unsaved changes indicator (dot on the Save button or a banner).
- Buttons: "Save" (calls `updateMemoryFile()`) and "Cancel" (discards changes with confirmation if dirty).
- On save success, show a brief toast/success indicator and return to view mode.
- On save failure, show error and keep the editor open.

**Done when**: User can edit a memory file, save changes to the gateway, and see the updated content.

---

#### B5. Calendar View for Daily Notes

**File to create**: `src/components/DailyNotesCalendar.tsx`
**File to edit**: `app/(tabs)/memory.tsx`

- Add a tab switcher at the top of the Memory screen: "Files" | "Daily Notes".
- Daily Notes tab shows a calendar (using `react-native-calendars`).
- Dates with notes are marked with a dot indicator.
- Tapping a date shows that day's note below the calendar (or an empty state).
- Notes are fetched via `getDailyNotes()` from the gateway.
- Tapping into a note opens it in the same viewer/editor used for memory files.

**Done when**: Calendar renders with marked dates. Tapping a date shows the daily note or empty state.

---

#### B6. Diff View

**File to create**: `src/components/DiffViewer.tsx`, `app/memory/[name]/history.tsx`

- Accessible from the file viewer via a "History" button.
- Fetches diffs via `getMemoryDiffs(name)`.
- Shows a timeline of changes: timestamp, author, and a summary.
- Tapping a diff entry expands to show the actual diff:
  - Added lines in green.
  - Removed lines in red.
  - Context lines in muted gray.
- Use the `diff` npm package to parse unified diff format.

**Done when**: User can view the change history of any memory file with color-coded diffs.

---

#### B7. Semantic Search

**File to create**: `src/components/MemorySearch.tsx`
**File to edit**: `app/(tabs)/memory.tsx`

- Add a search bar at the top of the Memory screen (above the Files/Daily Notes tabs).
- Queries the gateway's `searchMemory(query)` endpoint.
- Results show matching file excerpts with the query terms highlighted.
- Tapping a result navigates to that file (scrolled to the relevant section if possible).
- Show a loading indicator while searching.
- Support natural-language queries (e.g. "What do you know about my work schedule?").

**Done when**: User can search across all memory content and navigate to results.

---

## Files Changed / Created Summary

| Action | Path |
|--------|------|
| Create | `src/components/MessageBubble.tsx` |
| Create | `src/components/ToolCallCard.tsx` |
| Create | `src/components/SessionTabs.tsx` |
| Create | `src/components/ChatSearch.tsx` |
| Create | `src/components/CommandPalette.tsx` |
| Create | `src/components/AttachmentPicker.tsx` |
| Create | `src/components/AttachmentPreview.tsx` |
| Create | `src/components/MarkdownEditor.tsx` |
| Create | `src/components/DailyNotesCalendar.tsx` |
| Create | `src/components/DiffViewer.tsx` |
| Create | `src/components/MemorySearch.tsx` |
| Create | `src/hooks/useVoiceInput.ts` |
| Create | `src/hooks/useTextToSpeech.ts` |
| Create | `src/hooks/useChatSessions.ts` |
| Create | `src/hooks/useMemoryFiles.ts` |
| Create | `app/(tabs)/memory.tsx` |
| Create | `app/memory/[name].tsx` |
| Create | `app/memory/[name]/history.tsx` |
| Edit | `app/(tabs)/_layout.tsx` — add Memory tab |
| Edit | `app/(tabs)/chat.tsx` — major rewrite for all chat features |
| Edit | `src/services/gateway.ts` — memory + search + session endpoints (if not done in D1) |

---

## Testing Checklist

### Chat
- [ ] Markdown renders correctly: tables, code blocks with highlighting, lists, links, blockquotes
- [ ] Tool-call sections expand/collapse smoothly; show input/output for each tool
- [ ] Message categories are visually distinct; filter pills work
- [ ] Multi-session: can create, switch, rename, delete sessions; messages are scoped
- [ ] Search: finds messages locally; gateway results appear after debounce
- [ ] Slash commands: palette appears on `/`; filters as you type; executes on select
- [ ] File attachments: can pick images and files; previews appear in chat
- [ ] Voice input: records audio; transcription appears in input field
- [ ] Voice output: assistant messages can be read aloud; playback can be stopped

### Memory Browser
- [ ] Memory tab appears in navigation between Chat and Automations
- [ ] File list loads from gateway with loading/error/empty states
- [ ] Tapping a file opens rendered markdown view
- [ ] Edit mode: can modify content, save to gateway, see updated view
- [ ] Unsaved changes warning works on cancel
- [ ] Calendar view shows dates with notes marked; tapping shows note content
- [ ] Diff history shows timeline; expanding a diff shows color-coded changes
- [ ] Semantic search returns results; tapping navigates to the file

---

## Definition of Done

This deliverable is **complete** when:

1. The Chat screen supports all 8 enhanced features (markdown, tool calls, categories, sessions, search, commands, attachments, voice).
2. The Memory Browser is a fully functional new section with file viewing, editing, calendar, diffs, and search.
3. Both screens use the shared theme, components, and hooks from Deliverable 1.
4. The testing checklist above passes on iOS (and ideally Android).

