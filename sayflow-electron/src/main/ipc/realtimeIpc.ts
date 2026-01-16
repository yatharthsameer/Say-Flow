/**
 * Realtime Transcription IPC Handlers
 * 
 * Handles IPC communication between the widget and the realtime transcription client.
 */

import { ipcMain } from 'electron';
import { RealtimeTranscriptionClient, RealtimeTranscriptEvent } from '../services/realtimeClient';
import { pasteTranscript } from '../services/pasteService';
import { getSettings } from '../services/settingsStore';
import { logger } from '../util/logger';
import { sendToWidget } from '../windows/widgetWindow';

let realtimeClient: RealtimeTranscriptionClient | null = null;
let sessionStartTime: number = 0;

export const registerRealtimeIpc = (): void => {
  // Get transcription mode from settings
  ipcMain.handle('realtime:get-mode', async () => {
    const settings = getSettings();
    const mode = settings.transcription?.mode || 'standard';
    logger.info('Widget requested transcription mode', { 
      mode, 
      transcription: settings.transcription 
    });
    return mode;
  });
  
  // Start a realtime transcription session
  ipcMain.handle('realtime:start-session', async () => {
    const settings = getSettings();
    
    // Check if realtime mode is enabled
    if (settings.transcription?.mode !== 'realtime') {
      logger.warn('Realtime mode not enabled in settings');
      return { success: false, error: 'Realtime mode not enabled' };
    }
    
    sessionStartTime = Date.now();
    logger.info('Starting realtime transcription session');
    
    try {
      // Create a new client for this session
      realtimeClient = new RealtimeTranscriptionClient({
        model: settings.transcription?.model || 'gpt-4o-mini-transcribe',
        language: settings.language || 'en',
        
        onTranscript: (event: RealtimeTranscriptEvent) => {
          handleTranscriptEvent(event);
        },
        
        onError: (error: Error) => {
          logger.error('Realtime transcription error', { error: error.message });
          sendToWidget('recording:error', { error: error.message });
        },
        
        onClose: () => {
          logger.info('Realtime session closed');
        },
      });
      
      // Connect to the backend WebSocket
      await realtimeClient.connect();
      
      logger.info('Realtime session started', {
        connectTime: Date.now() - sessionStartTime,
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start realtime session', { error: errorMessage });
      sendToWidget('recording:error', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  });
  
  // Receive audio chunk from widget
  ipcMain.on('realtime:audio-chunk', (_, audioData: ArrayBuffer) => {
    if (!realtimeClient) {
      logger.warn('Received audio chunk but no active session');
      return;
    }
    
    try {
      const buffer = Buffer.from(audioData);
      realtimeClient.sendAudioChunk(buffer);
    } catch (error) {
      logger.error('Error sending audio chunk', { error });
    }
  });
  
  // Commit the session and get final transcript
  ipcMain.handle('realtime:commit', async () => {
    if (!realtimeClient) {
      logger.warn('Commit called but no active session');
      return { success: false, error: 'No active session' };
    }
    
    const commitStartTime = Date.now();
    
    try {
      // Commit and wait for final transcript
      const transcript = await realtimeClient.commit();
      
      const totalTime = Date.now() - sessionStartTime;
      const commitTime = Date.now() - commitStartTime;
      
      logger.info('⏱️ TIMING: Realtime transcription complete', {
        totalTime,
        commitTime,
        transcriptLength: transcript.length,
      });
      
      if (transcript && transcript.trim().length > 0) {
        // Paste the transcript
        const settings = getSettings();
        const pasteStartTime = Date.now();
        
        await pasteTranscript(transcript, {
          autoPaste: settings.autoPaste,
          restoreClipboard: settings.restoreClipboard,
        });
        
        logger.info('⏱️ TIMING: Paste complete', { ms: Date.now() - pasteStartTime });
        
        // Notify widget of success
        sendToWidget('recording:success', { id: 'realtime', text: transcript });
        
        return { success: true, text: transcript };
      } else {
        logger.info('Empty transcript from realtime session');
        sendToWidget('recording:success', { id: 'realtime', text: '' });
        return { success: true, text: '' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error committing realtime session', { error: errorMessage });
      sendToWidget('recording:error', { error: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      // Clean up the session
      if (realtimeClient) {
        realtimeClient.close();
        realtimeClient = null;
      }
    }
  });
  
  // Cancel the current session
  ipcMain.handle('realtime:cancel', async () => {
    if (realtimeClient) {
      realtimeClient.cancel();
      realtimeClient.close();
      realtimeClient = null;
    }
    return { success: true };
  });
  
  logger.info('Realtime IPC handlers registered');
};

/**
 * Handle transcript events from the realtime client
 */
function handleTranscriptEvent(event: RealtimeTranscriptEvent): void {
  switch (event.type) {
    case 'session_ready':
      logger.info('Realtime session ready');
      break;
      
    case 'transcript_delta':
      // Could optionally show partial transcripts in the UI
      logger.debug('Transcript delta', { delta: event.delta });
      break;
      
    case 'transcript_completed':
      logger.info('Transcript segment completed', { transcript: event.transcript?.substring(0, 50) });
      break;
      
    case 'transcript_final':
      logger.info('Final transcript received', { length: event.transcript?.length });
      break;
      
    case 'speech_started':
      logger.debug('Speech started');
      break;
      
    case 'speech_stopped':
      logger.debug('Speech stopped');
      break;
      
    case 'error':
      logger.error('Transcript error', { error: event.error });
      break;
  }
}
