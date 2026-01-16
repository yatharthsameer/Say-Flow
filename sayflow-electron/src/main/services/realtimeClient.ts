/**
 * Realtime Transcription Client
 * 
 * WebSocket client for streaming audio to the backend for real-time transcription
 * via OpenAI's Realtime API.
 */

import WebSocket from 'ws';
import { logger } from '../util/logger';
import { getAccessToken } from './supabaseSession';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export interface RealtimeTranscriptEvent {
  type: 'session_ready' | 'transcript_delta' | 'transcript_completed' | 'transcript_final' | 'speech_started' | 'speech_stopped' | 'error';
  delta?: string;
  transcript?: string;
  error?: string;
}

export interface RealtimeClientOptions {
  model?: string;
  language?: string;
  onTranscript?: (event: RealtimeTranscriptEvent) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class RealtimeTranscriptionClient {
  private ws: WebSocket | null = null;
  private options: RealtimeClientOptions;
  private isConnected: boolean = false;
  private accumulatedTranscript: string = '';
  private connectPromise: Promise<void> | null = null;
  private resolveConnect: (() => void) | null = null;
  private rejectConnect: ((error: Error) => void) | null = null;
  
  constructor(options: RealtimeClientOptions = {}) {
    this.options = {
      model: 'gpt-4o-mini-transcribe',
      language: 'en',
      ...options,
    };
  }
  
  /**
   * Connect to the backend WebSocket for realtime transcription
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    
    // Get auth token
    const accessToken = await getAccessToken();
    
    // Build WebSocket URL with query params
    const params = new URLSearchParams({
      model: this.options.model || 'gpt-4o-mini-transcribe',
      language: this.options.language || 'en',
    });
    
    const wsUrl = `${WS_BASE_URL}/v1/realtime/transcribe?${params.toString()}`;
    
    logger.info('Connecting to realtime transcription WebSocket', { url: wsUrl });
    
    return new Promise((resolve, reject) => {
      this.resolveConnect = resolve;
      this.rejectConnect = reject;
      
      try {
        this.ws = new WebSocket(wsUrl, {
          headers: accessToken ? {
            'Authorization': `Bearer ${accessToken}`,
          } : undefined,
        });
        
        this.ws.on('open', () => {
          logger.info('Realtime WebSocket connected');
          this.isConnected = true;
        });
        
        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('error', (error: Error) => {
          logger.error('Realtime WebSocket error', { error: error.message });
          this.options.onError?.(error);
          if (!this.isConnected && this.rejectConnect) {
            this.rejectConnect(error);
            this.rejectConnect = null;
          }
        });
        
        this.ws.on('close', () => {
          logger.info('Realtime WebSocket closed');
          this.isConnected = false;
          this.ws = null;
          this.options.onClose?.();
        });
        
      } catch (error) {
        logger.error('Failed to create WebSocket', { error });
        reject(error);
      }
    });
  }
  
  /**
   * Handle incoming messages from the WebSocket
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as RealtimeTranscriptEvent;
      
      logger.debug('Received realtime message', { type: message.type });
      
      switch (message.type) {
        case 'session_ready':
          // Session is ready to receive audio
          if (this.resolveConnect) {
            this.resolveConnect();
            this.resolveConnect = null;
          }
          this.options.onTranscript?.(message);
          break;
          
        case 'transcript_delta':
          // Partial transcript update
          if (message.transcript) {
            this.accumulatedTranscript = message.transcript;
          }
          this.options.onTranscript?.(message);
          break;
          
        case 'transcript_completed':
          // Segment completed
          this.options.onTranscript?.(message);
          break;
          
        case 'transcript_final':
          // Final transcript ready
          if (message.transcript) {
            this.accumulatedTranscript = message.transcript;
          }
          this.options.onTranscript?.(message);
          break;
          
        case 'speech_started':
        case 'speech_stopped':
          this.options.onTranscript?.(message);
          break;
          
        case 'error':
          logger.error('Realtime transcription error', { error: message.error });
          this.options.onError?.(new Error(message.error || 'Unknown error'));
          break;
          
        default:
          logger.debug('Unknown message type', { message });
      }
      
    } catch (error) {
      logger.error('Failed to parse WebSocket message', { error });
    }
  }
  
  /**
   * Send an audio chunk to the backend
   * @param pcmData - PCM audio data as Int16Array or Buffer
   */
  sendAudioChunk(pcmData: Int16Array | Buffer): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send audio: WebSocket not connected');
      return;
    }
    
    // Convert to base64
    let base64Audio: string;
    if (Buffer.isBuffer(pcmData)) {
      base64Audio = pcmData.toString('base64');
    } else {
      base64Audio = Buffer.from(pcmData.buffer).toString('base64');
    }
    
    try {
      this.ws.send(JSON.stringify({
        type: 'audio_chunk',
        data: base64Audio,
      }));
    } catch (error) {
      logger.error('Failed to send audio chunk', { error });
    }
  }
  
  /**
   * Commit the audio buffer to signal end of speech
   * Returns the final accumulated transcript
   */
  async commit(): Promise<string> {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot commit: WebSocket not connected');
      return this.accumulatedTranscript;
    }
    
    return new Promise((resolve) => {
      // Set up a listener for the final transcript
      const originalOnTranscript = this.options.onTranscript;
      
      this.options.onTranscript = (event) => {
        originalOnTranscript?.(event);
        
        if (event.type === 'transcript_final' || event.type === 'transcript_completed') {
          resolve(event.transcript || this.accumulatedTranscript);
        }
      };
      
      // Send commit message
      try {
        this.ws!.send(JSON.stringify({
          type: 'commit',
        }));
      } catch (error) {
        logger.error('Failed to send commit', { error });
        resolve(this.accumulatedTranscript);
      }
      
      // Timeout fallback
      setTimeout(() => {
        resolve(this.accumulatedTranscript);
      }, 3000);
    });
  }
  
  /**
   * Cancel the current transcription session
   */
  cancel(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }
    
    try {
      this.ws.send(JSON.stringify({
        type: 'cancel',
      }));
    } catch (error) {
      logger.error('Failed to send cancel', { error });
    }
  }
  
  /**
   * Close the WebSocket connection
   */
  close(): void {
    this.accumulatedTranscript = '';
    
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        logger.error('Error closing WebSocket', { error });
      }
      this.ws = null;
    }
    
    this.isConnected = false;
  }
  
  /**
   * Get the current accumulated transcript
   */
  getTranscript(): string {
    return this.accumulatedTranscript;
  }
  
  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}


// Singleton instance for reuse
let realtimeClient: RealtimeTranscriptionClient | null = null;

/**
 * Get or create a realtime transcription client
 */
export function getRealtimeClient(options?: RealtimeClientOptions): RealtimeTranscriptionClient {
  if (!realtimeClient) {
    realtimeClient = new RealtimeTranscriptionClient(options);
  }
  return realtimeClient;
}

/**
 * Reset the realtime client (e.g., when settings change)
 */
export function resetRealtimeClient(): void {
  if (realtimeClient) {
    realtimeClient.close();
    realtimeClient = null;
  }
}
