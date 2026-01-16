# sayFlow (macOS)

Push-to-talk transcription utility for macOS. Hold a hotkey to record audio, release to transcribe and auto-paste.

## Features

- **Global hold hotkey** (default: Option + Space)
- **Floating widget** that shows recording/processing state
- **Auto-paste** transcripts into active field
- **Offline queue** with manual retry for failed uploads
- **Supabase authentication**

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

## Architecture

```
sayflow-electron/
  src/
    main/           # Electron main process
      windows/      # Window management
      ipc/          # IPC handlers
      services/     # Backend client, outbox, etc.
    renderer/       # React app (main window)
      pages/        # Auth, Home, Settings
      components/   # Reusable UI components
    widget/         # Widget window (recording UI)
    shared/         # Shared types
```

## Development

The app uses:
- **Electron** for the desktop shell
- **React + Vite** for the UI
- **TailwindCSS** for styling
- **iohook** for global hotkey detection
- **keytar** for secure token storage

### IPC Channels

- `auth:*` - Session management
- `outbox:*` - Transcription queue
- `recording:*` - Audio recording
- `settings:*` - App settings
- `hotkey:*` - Hotkey events

## License

MIT
