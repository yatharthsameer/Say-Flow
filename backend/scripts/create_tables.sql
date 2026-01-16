-- sayFlow Backend Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: transcription_requests
-- Stores one row per successful transcription
-- ============================================
CREATE TABLE IF NOT EXISTS transcription_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER NOT NULL,
    audio_format TEXT,
    language TEXT DEFAULT 'en',
    transcript_text TEXT NOT NULL,
    provider TEXT DEFAULT 'gemini',
    model TEXT DEFAULT 'gemini-2.5-flash-lite',
    provider_latency_ms INTEGER,
    total_latency_ms INTEGER,
    status TEXT DEFAULT 'success',
    
    -- Unique constraint for idempotency
    CONSTRAINT unique_user_idempotency UNIQUE (user_id, idempotency_key)
);

-- Index for querying user transcriptions by date
CREATE INDEX IF NOT EXISTS idx_transcription_requests_user_created 
ON transcription_requests (user_id, created_at DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_transcription_requests_status 
ON transcription_requests (status);

-- Index for provider filtering (for analytics)
CREATE INDEX IF NOT EXISTS idx_transcription_requests_provider 
ON transcription_requests (provider);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on the table
ALTER TABLE transcription_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for backend operations)
-- Note: Service role bypasses RLS by default, but we include this for clarity
CREATE POLICY "Service role has full access" 
ON transcription_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Users can only read their own transcriptions (if needed from client)
CREATE POLICY "Users can view own transcriptions"
ON transcription_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE transcription_requests IS 'Stores transcription requests and results for usage tracking';
COMMENT ON COLUMN transcription_requests.idempotency_key IS 'Client-provided key to prevent duplicate processing';
COMMENT ON COLUMN transcription_requests.duration_ms IS 'Audio duration in milliseconds (client-measured)';
COMMENT ON COLUMN transcription_requests.provider IS 'Transcription provider used (gemini, openai, etc.)';
COMMENT ON COLUMN transcription_requests.model IS 'Specific model used for transcription';
COMMENT ON COLUMN transcription_requests.provider_latency_ms IS 'Time taken by the transcription provider API';
COMMENT ON COLUMN transcription_requests.total_latency_ms IS 'Total request processing time';
COMMENT ON COLUMN transcription_requests.status IS 'Request status: success, failed, etc.';
