export interface TranscriptionRequest {
  audio: Blob;
  durationMs: number;
  audioFormat: 'webm';
  language: string;
  idempotencyKey: string;
  provider?: string;
  model?: string;
}

export interface TranscriptionResponse {
  id: string;
  text: string;
  duration_ms: number;
  language: string;
  provider: string;
  model: string;
  created_at: string;
  request_id?: string;
  timing?: {
    provider_latency_ms: number;
    total_latency_ms: number;
  };
}

export interface StatsResponse {
  range: 'today' | '7d' | '30d';
  transcription_count: number;
  total_duration_ms: number;
}

export type RecordingState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'ERROR';

export interface WidgetState {
  recordingState: RecordingState;
  errorMessage?: string;
}
