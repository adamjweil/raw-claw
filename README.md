# RawClaw 🐾

A premium React Native (Expo) mobile app — your personal AI companion interface for [OpenClaw](https://github.com/openclaw).

## Features

- **Home Dashboard** — Gateway status, quick actions, recent activity at a glance
- **Chat** — Real-time conversation with your AI via WebSocket
- **Automations** — View, toggle, and trigger cron jobs
- **Skills** — Browse installed skills in a visual grid
- **Status** — Connection, model, channel, and gateway details
- **Settings** — Configure gateway URL and token (stored securely via `expo-secure-store`)

## Design

Dark mode with a terminal-meets-modern aesthetic:
- Background `#0a0a0f`, Surface `#1a1a2e`, Card `#16213e`, Accent `#0ea5e9`
- Subtle entrance animations via `react-native-reanimated`
- Hand-crafted components — no external UI libraries

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Configuration

1. Open the app → tap the connection status pill (top right of Home)
2. Enter your OpenClaw Gateway URL and token
3. Tap "Test Connection" to verify, then "Save"

## Tech Stack

- Expo SDK 54 + expo-router (file-based routing)
- TypeScript
- react-native-reanimated for animations
- expo-secure-store for credentials
- Custom gateway client with REST + WebSocket support
