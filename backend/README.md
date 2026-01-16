# sayFlow Backend

Audio transcription service with multi-provider support (Google Gemini, OpenAI) and real-time streaming transcription via OpenAI Realtime API.

## Features

- **Multi-provider support**: Google Gemini and OpenAI transcription models
- **Real-time streaming**: OpenAI Realtime API for instant transcription (~2s latency vs ~6s standard)
- **Supabase authentication**: JWT verification for secure API access
- **Usage tracking**: Per-user transcription statistics and history

## Setup

### 1. Install Dependencies

```bash
conda activate usualenv
pip install -e .
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for backend DB operations
- `GEMINI_API_KEY`: Google Gemini API key
- `OPENAI_API_KEY`: OpenAI API key (for OpenAI models and Realtime API)

### 3. Create Database Tables

Run the SQL in `scripts/create_tables.sql` in your Supabase SQL editor.

If migrating from an existing installation, run `scripts/migrate_multi_provider.sql` to add the new provider/model columns.

### 4. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Health Check
```
GET /v1/health
```

### Transcription (Standard Mode)
```
POST /v1/transcriptions
Authorization: Bearer <supabase_access_token>
Idempotency-Key: <uuid>
Content-Type: multipart/form-data

audio: <file>
duration_ms: <integer>
audio_format: <string>
language: <string> (optional, default: en)
noisy_room: <boolean> (optional, default: false)
provider: <string> (optional, default: gemini) - "gemini" or "openai"
model: <string> (optional) - specific model to use
```

**Supported Models:**

| Provider | Model | Description |
|----------|-------|-------------|
| gemini | gemini-2.5-flash-lite | Fast, lightweight (default) |
| gemini | gemini-2.5-flash | Balanced |
| gemini | gemini-2.0-flash | Higher quality |
| openai | gpt-4o-mini-transcribe | Fast OpenAI transcription |
| openai | gpt-4o-transcribe | Higher quality OpenAI |
| openai | whisper-1 | Whisper v1 |

### Realtime Transcription (WebSocket)
```
WS /v1/realtime/transcribe?model=<model>&language=<lang>
```

Streams audio chunks via WebSocket for near-instant transcription using OpenAI's Realtime API.

**Client → Server Messages:**
```json
{"type": "audio_chunk", "data": "<base64 PCM audio>"}
{"type": "commit"}  // Signal end of speech
{"type": "cancel"}  // Cancel session
```

**Server → Client Messages:**
```json
{"type": "session_ready"}
{"type": "transcript_delta", "delta": "partial", "transcript": "accumulated"}
{"type": "transcript_completed", "transcript": "final text"}
{"type": "transcript_final", "transcript": "final text"}
{"type": "error", "error": "message"}
```

**Audio Format Requirements:**
- PCM 16-bit signed, little-endian
- 24kHz sample rate
- Mono channel

### Stats
```
GET /v1/stats?range=today|7d|30d
Authorization: Bearer <supabase_access_token>
```

## Architecture

```
backend/
  app/
    api/v1/routes/
      health.py         # Health check endpoint
      transcriptions.py # Standard transcription endpoint
      realtime.py       # Realtime WebSocket proxy
      stats.py          # Usage statistics
    services/
      transcription/
        base.py         # Provider interface
        gemini.py       # Google Gemini implementation
        openai.py       # OpenAI implementation
        registry.py     # Provider registry/factory
      usage.py          # Usage tracking
    deps/
      auth.py           # Supabase JWT verification
    core/
      config.py         # Settings management
      logging.py        # Structured logging
```

### Realtime API Flow

```
┌─────────────┐   WebSocket   ┌─────────────┐   WebSocket   ┌─────────────┐
│   Client    │ ────────────► │   Backend   │ ────────────► │   OpenAI    │
│ (Electron)  │   PCM audio   │  (FastAPI)  │   Realtime    │  Realtime   │
└─────────────┘               └─────────────┘     API       └─────────────┘
      │                              │                            │
      │◄─────────────────────────────┼────────────────────────────┤
      │         transcript deltas / final                         │
```

The backend acts as a WebSocket proxy, handling:
- Client authentication
- Connection management with OpenAI
- Bidirectional message relay
- Error handling and cleanup

## Development

### Testing Providers

```bash
python scripts/test_providers.py
```

### Dependencies

- **FastAPI** - Web framework
- **Supabase** - Authentication and database
- **google-genai** - Gemini API client
- **openai** - OpenAI API client
- **websockets** - WebSocket support for Realtime API

## License

MIT
