# sayFlow Backend Documentation

> **For Cursor AI Context**: This document describes the sayFlow backend architecture, APIs, and implementation details. Use this to understand how the backend works when making changes or debugging.

---

## Overview

sayFlow is an audio transcription service that:
- Accepts audio uploads from macOS/iOS clients
- Transcribes audio using **Google Gemini 2.5 Flash**
- Authenticates users via **Supabase Auth**
- Stores usage statistics in **Supabase Postgres**
- Supports idempotent requests for reliable retries

**Tech Stack**: Python 3.11+, FastAPI, Uvicorn, Supabase, Google GenAI SDK

---

## Project Structure

```
backend/
├── .env                          # Environment variables (gitignored)
├── pyproject.toml                # Dependencies
├── app/
│   ├── main.py                   # FastAPI app entry point
│   ├── core/
│   │   ├── config.py             # Settings from env vars (pydantic-settings)
│   │   └── logging.py            # Structured logging
│   ├── api/v1/routes/
│   │   ├── health.py             # GET /v1/health
│   │   ├── transcriptions.py     # POST /v1/transcriptions
│   │   └── stats.py              # GET /v1/stats
│   ├── deps/
│   │   ├── auth.py               # Supabase JWT verification
│   │   └── request_context.py    # Request ID & timing helpers
│   ├── services/
│   │   ├── gemini.py             # Gemini transcription client
│   │   └── usage.py              # DB logging & stats queries
│   ├── db/
│   │   ├── supabase.py           # Supabase client init
│   │   └── models.py             # Pydantic models for DB rows
│   └── schemas/
│       ├── transcriptions.py     # Request/response schemas
│       └── stats.py              # Stats response schema
└── scripts/
    └── create_tables.sql         # SQL schema for Supabase
```

---

## Environment Variables

Required in `.env`:

```bash
# Gemini API
GEMINI_API_KEY=AIzaSy...              # Google AI Studio API key

# Supabase
SUPABASE_URL=https://xxx.supabase.co  # Project URL
SUPABASE_ANON_KEY=sb_publishable_...  # Publishable key (for reference)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... # Secret key (for backend DB writes)

# Optional
DATABASE_URL=postgresql://...          # Direct Postgres connection (not used by default)
ENV=dev                                # dev or prod
LOG_LEVEL=INFO                         # Logging level
MAX_AUDIO_MB=20                        # Max upload size
MAX_AUDIO_SECONDS=120                  # Max audio duration
```

---

## API Endpoints

### 1. Health Check

```
GET /v1/health
```

**Response** (200):
```json
{
  "status": "ok",
  "version": "v1",
  "time": "2026-01-08T17:00:00Z"
}
```

No authentication required.

---

### 2. Create Transcription

```
POST /v1/transcriptions
Content-Type: multipart/form-data
Authorization: Bearer <supabase_jwt>
Idempotency-Key: <uuid>
```

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | File | Yes | Audio file (mp3, m4a, wav, etc.) |
| `duration_ms` | int | Yes | Audio duration in milliseconds |
| `audio_format` | string | Yes | Format: `mp3`, `m4a`, `wav`, `aac`, `ogg`, `flac`, `webm` |
| `language` | string | No | Target language (default: `en`) |
| `noisy_room` | bool | No | Enable noise-robust prompting (default: `false`) |

**Response** (200):
```json
{
  "id": "uuid",
  "text": "Transcribed text...",
  "duration_ms": 60000,
  "language": "en",
  "created_at": "2026-01-08T17:00:00Z",
  "request_id": "uuid",
  "timing": {
    "gemini_latency_ms": 5315,
    "total_latency_ms": 5660
  }
}
```

**Error Responses**:
- `401`: Missing/invalid authorization token
- `400`: Invalid audio format, missing fields, duration exceeds limit
- `413`: Audio file too large
- `502`: Gemini transcription failed (retry)

**Idempotency**: Same `(user_id, idempotency_key)` returns cached result without re-transcribing.

---

### 3. Get Usage Stats

```
GET /v1/stats?range=today|7d|30d
Authorization: Bearer <supabase_jwt>
```

**Response** (200):
```json
{
  "range": "today",
  "minutes_transcribed": 2.0,
  "words_transcribed_est": 372,
  "requests": 2,
  "last_activity_at": "2026-01-08T17:10:00Z"
}
```

---

## Authentication Flow

1. **Client** signs up/in via Supabase Auth SDK → receives JWT
2. **Client** sends JWT in `Authorization: Bearer <token>` header
3. **Backend** verifies JWT by calling `{SUPABASE_URL}/auth/v1/user`
4. If valid, extracts `user_id` and `email` for request processing

**Implementation**: `app/deps/auth.py`

```python
from app.deps.auth import AuthenticatedUser

@router.post("/endpoint")
async def my_endpoint(user: AuthenticatedUser):
    # user.id = Supabase user UUID
    # user.email = User's email
```

---

## Gemini Transcription Service

**File**: `app/services/gemini.py`

**Model**: `gemini-2.5-flash` (configurable)

**Key Function**:
```python
async def transcribe_audio(
    audio_bytes: bytes,
    audio_format: str,
    noisy_room: bool = False,
    language: str = "en",
) -> TranscriptionResult:
    """
    Returns:
        TranscriptionResult(text: str, latency_ms: int)
    Raises:
        GeminiTranscriptionError on failure
    """
```

**Prompt Strategy**:
- Forces transcription-only output (no commentary/metadata)
- Optional noise-robust prompting when `noisy_room=True`
- Temperature set to 0.0 for deterministic output

**Supported Audio Formats**:
- mp3 → `audio/mpeg`
- m4a/mp4 → `audio/mp4`
- wav → `audio/wav`
- aac → `audio/aac`
- ogg → `audio/ogg`
- flac → `audio/flac`
- webm → `audio/webm`

---

## Database Schema

**Table**: `transcription_requests`

```sql
CREATE TABLE transcription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER NOT NULL,
    audio_format TEXT,
    language TEXT DEFAULT 'en',
    transcript_text TEXT NOT NULL,
    gemini_latency_ms INTEGER,
    total_latency_ms INTEGER,
    status TEXT DEFAULT 'success',
    CONSTRAINT unique_user_idempotency UNIQUE (user_id, idempotency_key)
);

-- Index for user queries
CREATE INDEX idx_transcription_requests_user_created 
ON transcription_requests (user_id, created_at DESC);
```

**Row Level Security**: Enabled. Service role key bypasses RLS for backend writes.

---

## Usage Service

**File**: `app/services/usage.py`

**Key Methods**:
```python
class UsageService:
    async def check_idempotency(user_id: str, idempotency_key: str) -> Optional[dict]
        """Returns existing record if idempotency key exists, None otherwise"""
    
    async def record_transcription(data: TranscriptionRequestCreate) -> dict
        """Inserts transcription record, returns created row"""
    
    async def get_stats(user_id: str, range_type: str) -> dict
        """Returns aggregated stats for today/7d/30d"""
```

---

## Running the Server

```bash
# Activate environment
conda activate usualenv

# Start development server (with auto-reload)
cd backend
uvicorn app.main:app --port 8000 --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Endpoints**:
- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`

---

## Testing Examples

### Test Health
```bash
curl http://127.0.0.1:8000/v1/health
```

### Test Transcription
```bash
# Get a test token first (create user via Supabase dashboard or API)
TOKEN="your_supabase_jwt"

curl -X POST "http://127.0.0.1:8000/v1/transcriptions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -F "audio=@test.mp3" \
  -F "duration_ms=60000" \
  -F "audio_format=mp3"
```

### Test Stats
```bash
curl "http://127.0.0.1:8000/v1/stats?range=today" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 400 | Bad request (invalid format, missing fields) | Fix request |
| 401 | Unauthorized (invalid/expired token) | Re-authenticate |
| 413 | File too large | Reduce file size |
| 429 | Rate limited | Retry with backoff |
| 502 | Gemini failure | Retry (transient) |
| 500 | Internal error | Check logs |

---

## Key Implementation Notes

1. **Audio not stored**: Audio bytes are processed in-memory and discarded. Client retains audio for retries.

2. **Idempotency**: The `(user_id, idempotency_key)` unique constraint ensures duplicate requests return cached results without double-billing.

3. **Timing**: Every transcription response includes `timing.gemini_latency_ms` and `timing.total_latency_ms` for observability.

4. **Supabase Keys**: 
   - `sb_publishable_...` = Client-side (anon equivalent)
   - `sb_secret_...` = Server-side only, bypasses RLS

5. **Gemini Client Caching**: The Gemini client is cached via `@lru_cache` to avoid re-initialization on each request.

---

## Common Tasks

### Change Gemini Model
Edit `app/services/gemini.py`:
```python
response = client.models.generate_content(
    model="gemini-2.5-flash",  # Change this
    ...
)
```

### Add New Endpoint
1. Create route in `app/api/v1/routes/`
2. Add schema in `app/schemas/`
3. Register router in `app/main.py`

### Debug Transcription Issues
1. Check server logs for `GeminiTranscriptionError`
2. Verify `GEMINI_API_KEY` is valid
3. Check Gemini quota at https://ai.google.dev/

---

## Dependencies

Key packages (see `pyproject.toml`):
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `google-genai` - Gemini SDK (new version)
- `supabase` - Supabase Python client
- `pydantic-settings` - Config management
- `python-multipart` - File upload handling
- `httpx` - Async HTTP client
