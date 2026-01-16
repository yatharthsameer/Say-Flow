# sayFlow (macOS)

Push-to-talk transcription utility for macOS. Hold a hotkey to record audio, release to transcribe and auto-paste.

## Features

- **Global hold hotkey** (default: Option + Shift)
- **Floating widget** that shows recording/processing state
- **Auto-paste** transcripts into active field
- **Multi-provider support**: Google Gemini and OpenAI models
- **Realtime mode**: Stream audio for near-instant transcription (~2s vs ~6s)
- **Offline queue** with manual retry for failed uploads
- **Supabase authentication**

## Transcription Modes

### Standard Mode
Records complete audio, then uploads for transcription. Works with all providers and models.
- **Latency**: ~5-6 seconds after key release
- **Providers**: Gemini, OpenAI

### Realtime Mode
Streams audio to OpenAI Realtime API as you speak. Transcription is ready almost instantly when you release the key.
- **Latency**: ~1.5-2 seconds after key release
- **Providers**: OpenAI only (uses gpt-4o-mini-realtime-preview)

## Requirements

- macOS 11+
- Node.js 18+
- npm or yarn

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your configuration:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

3. Run in development mode:

```bash
npm run dev
```

4. Build for production:

```bash
npm run package
```

## Permissions

sayFlow requires the following macOS permissions:

- **Microphone**: Required for audio recording
- **Accessibility**: Required for auto-paste (simulates Cmd+V)
- **Input Monitoring**: Required for global hotkey detection

Grant these in **System Settings → Privacy & Security**.

## Settings

### Transcription Settings

| Setting | Options | Description |
|---------|---------|-------------|
| Mode | Standard / Realtime | Standard records then transcribes; Realtime streams for instant results |
| Provider | Gemini / OpenAI | Only shown in Standard mode (Realtime uses OpenAI) |
| Model | Various | Provider-specific model selection |
| Language | 12+ languages | Transcription language |

### Behavior Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-paste | On | Automatically paste transcript into active field |
| Restore clipboard | On | Restore previous clipboard content after pasting |

## Architecture

```
sayflow-electron/
  src/
    main/                  # Electron main process
      windows/             # Window management
      ipc/                 # IPC handlers
        authIpc.ts         # Authentication
        recordingIpc.ts    # Standard recording flow
        realtimeIpc.ts     # Realtime streaming flow
        settingsIpc.ts     # Settings management
        outboxIpc.ts       # Offline queue
      services/
        backendClient.ts   # REST API client
        realtimeClient.ts  # WebSocket client for realtime
        pasteService.ts    # Clipboard and paste handling
        settingsStore.ts   # Persistent settings
    renderer/              # React app (main window)
      pages/               # Auth, Home, Settings
      components/          # Reusable UI components
    widget/                # Widget window (recording UI)
      widget.tsx           # Recording UI component
      realtimeAudioCapture.ts  # PCM audio capture via AudioWorklet
    shared/                # Shared types
      types/
        settings.ts        # Settings types and constants
        api.ts             # API types
```

## Realtime Audio Pipeline

When Realtime mode is enabled:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron Widget                              │
├─────────────────────────────────────────────────────────────────────┤
│  Microphone → AudioWorklet → PCM 24kHz → IPC → Main Process         │
└─────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Main Process                                   │
├─────────────────────────────────────────────────────────────────────┤
│  RealtimeClient → WebSocket → Backend → OpenAI Realtime API         │
│                                                                      │
│  Receives transcript deltas → Pastes final transcript               │
└─────────────────────────────────────────────────────────────────────┘
```

The AudioWorklet captures raw PCM audio at 48kHz, downsamples to 24kHz, and streams chunks every 100ms to the main process, which forwards them to the backend WebSocket.

## Development

The app uses:
- **Electron** for the desktop shell
- **React + Vite** for the UI
- **TailwindCSS** for styling
- **uiohook-napi** for global hotkey detection
- **keytar** for secure token storage
- **AudioWorklet** for low-latency PCM audio capture

### IPC Channels

| Channel | Description |
|---------|-------------|
| `auth:*` | Session management |
| `outbox:*` | Transcription queue |
| `recording:*` | Standard audio recording |
| `realtime:*` | Realtime streaming |
| `settings:*` | App settings |
| `hotkey:*` | Hotkey events |

### Building

```bash
# Development (with hot reload)
npm run dev

# Build main process only
npm run build:main

# Build renderer only
npm run build:renderer

# Build everything
npm run build

# Package for distribution
npm run package
```

## Troubleshooting

### Realtime mode not working

1. Check that Mode is set to "Realtime" in Settings
2. Restart the app after changing the mode
3. Check the widget DevTools console for errors
4. Ensure the backend is running with a valid `OPENAI_API_KEY`

### High latency in Realtime mode

The initial connection to OpenAI takes ~1-2 seconds. Subsequent transcriptions after releasing the hotkey should take ~1.5-2 seconds. This is significantly faster than Standard mode (~5-6 seconds).

### Audio not being captured

1. Check microphone permissions in System Settings
2. Look for "Microphone stream initialized" in widget console
3. In Realtime mode, look for "Realtime audio capture initialized"

## License

MIT
