-- sayFlow Backend Database Migration: Multi-Provider Support
-- Run this SQL in your Supabase SQL Editor to migrate from Gemini-only to multi-provider support

-- ============================================
-- Step 1: Add new columns for provider and model
-- ============================================

-- Add provider column with default 'gemini' for existing rows
ALTER TABLE transcription_requests 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini';

-- Add model column with default for existing rows
ALTER TABLE transcription_requests 
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.5-flash-lite';

-- ============================================
-- Step 2: Rename gemini_latency_ms to provider_latency_ms
-- ============================================

-- Rename the column (PostgreSQL 9.3+)
ALTER TABLE transcription_requests 
RENAME COLUMN gemini_latency_ms TO provider_latency_ms;

-- ============================================
-- Step 3: Add index for provider filtering (optional, for analytics)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transcription_requests_provider 
ON transcription_requests (provider);

-- ============================================
-- Step 4: Update comments
-- ============================================

COMMENT ON COLUMN transcription_requests.provider IS 'Transcription provider used (gemini, openai, etc.)';
COMMENT ON COLUMN transcription_requests.model IS 'Specific model used for transcription';
COMMENT ON COLUMN transcription_requests.provider_latency_ms IS 'Time taken by the transcription provider API';

-- ============================================
-- Verification query (run after migration)
-- ============================================

-- SELECT 
--     column_name, 
--     data_type, 
--     column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'transcription_requests'
-- ORDER BY ordinal_position;
