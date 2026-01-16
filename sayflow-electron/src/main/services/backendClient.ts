import { net } from 'electron';
import { TranscriptionResponse } from '../../shared/types';
import { createMultipartFormData } from '../util/multipart';
import { getAccessToken } from './supabaseSession';
import { logger } from '../util/logger';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

logger.info('Backend client initialized', { apiBaseUrl: API_BASE_URL });

export interface UploadTranscriptionParams {
  audioPath: string;
  durationMs: number;
  audioFormat: 'webm';
  language: string;
  idempotencyKey: string;
  provider?: string;
  model?: string;
}

export interface UploadResult {
  success: boolean;
  data?: TranscriptionResponse;
  error?: string;
}

export const uploadTranscription = async (
  params: UploadTranscriptionParams
): Promise<UploadResult> => {
  const tokenStart = Date.now();
  const accessToken = await getAccessToken();
  logger.info('⏱️ TIMING: Get access token', { ms: Date.now() - tokenStart });
  
  if (!accessToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const formDataStart = Date.now();
    const { body, contentType } = await createMultipartFormData({
      audioPath: params.audioPath,
      durationMs: params.durationMs,
      audioFormat: params.audioFormat,
      language: params.language,
      provider: params.provider,
      model: params.model,
    });
    logger.info('⏱️ TIMING: Create multipart form data', { 
      ms: Date.now() - formDataStart,
      provider: params.provider,
      model: params.model,
    });

    // Use Electron's net.fetch for proper main process networking
    const fetchStart = Date.now();
    const response = await net.fetch(`${API_BASE_URL}/v1/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': contentType,
        'Idempotency-Key': params.idempotencyKey,
      },
      body,
    });
    logger.info('⏱️ TIMING: net.fetch response received', { ms: Date.now() - fetchStart });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Backend upload failed', { status: response.status, error: errorText });
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const parseStart = Date.now();
    const data = (await response.json()) as TranscriptionResponse;
    logger.info('⏱️ TIMING: Parse JSON response', { ms: Date.now() - parseStart });
    logger.info('Transcription uploaded successfully', { id: data.id });
    
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    logger.error('Backend upload error', { 
      error: errorMessage, 
      stack: errorStack,
      url: `${API_BASE_URL}/v1/transcriptions`
    });
    return { success: false, error: errorMessage };
  }
};

export const fetchStats = async (range: 'today' | '7d' | '30d' = 'today') => {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return null;
  }

  try {
    const response = await net.fetch(`${API_BASE_URL}/v1/stats?range=${range}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch stats', error);
    return null;
  }
};
