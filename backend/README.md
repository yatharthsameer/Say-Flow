# sayFlow Backend

Audio transcription service powered by Gemini with Supabase authentication.

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

### 3. Create Database Tables

Run the SQL in `scripts/create_tables.sql` in your Supabase SQL editor.

### 4. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### Health Check
```
GET /v1/health
```

### Transcription
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
```

### Stats
```
GET /v1/stats?range=today|7d|30d
Authorization: Bearer <supabase_access_token>
```

## Architecture

- **FastAPI** for the web framework
- **Supabase Auth** for JWT verification
- **Supabase Postgres** for usage statistics
- **Gemini API** for audio transcription

Audio is processed in-memory and discarded after transcription. The client retains audio files for retry capability.
