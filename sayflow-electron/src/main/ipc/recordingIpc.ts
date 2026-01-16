import { ipcMain, BrowserWindow } from 'electron';
import { saveAudioFile, deleteAudioFile } from '../services/audioFileStore';
import { addOutboxItem, updateOutboxItem, getOutboxItem } from '../services/outboxStore';
import { uploadTranscription } from '../services/backendClient';
import { pasteTranscript } from '../services/pasteService';
import { getSettings } from '../services/settingsStore';
import { OutboxItem } from '../../shared/types';
import { logger } from '../util/logger';
import { sendToWidget } from '../windows/widgetWindow';

export const registerRecordingIpc = (): void => {
  // Receive audio blob from widget
  ipcMain.handle(
    'recording:save',
    async (_, audioData: ArrayBuffer, durationMs: number) => {
      const totalStart = Date.now();
      try {
        const settings = getSettings();
        const audioBuffer = Buffer.from(audioData);

        // Save audio file
        const saveStart = Date.now();
        const { id, audioPath } = saveAudioFile(audioBuffer);
        logger.info('⏱️ TIMING: Audio file saved', { 
          ms: Date.now() - saveStart,
          sizeKB: Math.round(audioBuffer.length / 1024)
        });

        // Create outbox item
        const outboxItem: OutboxItem = {
          id,
          createdAt: new Date().toISOString(),
          audioPath,
          durationMs,
          audioFormat: 'webm',
          language: settings.language,
          status: 'pending',
        };
        addOutboxItem(outboxItem);

        // Update widget to processing state
        sendToWidget('recording:processing', { id });

        // Upload to backend
        const uploadStart = Date.now();
        const result = await uploadTranscription({
          audioPath,
          durationMs,
          audioFormat: 'webm',
          language: settings.language,
          idempotencyKey: id,
          provider: settings.transcription?.provider,
          model: settings.transcription?.model,
        });
        logger.info('⏱️ TIMING: Backend upload complete', { 
          ms: Date.now() - uploadStart,
          provider: settings.transcription?.provider,
          model: settings.transcription?.model,
        });

        if (result.success && result.data) {
          // Log backend timing if available
          if (result.data.timing) {
            logger.info('⏱️ TIMING: Backend breakdown', {
              provider: result.data.provider,
              model: result.data.model,
              provider_ms: result.data.timing.provider_latency_ms,
              total_backend_ms: result.data.timing.total_latency_ms
            });
          }

          // Update outbox with success
          updateOutboxItem(id, {
            status: 'success',
            transcriptText: result.data.text,
          });

          // Paste transcript
          const pasteStart = Date.now();
          await pasteTranscript(result.data.text, {
            autoPaste: settings.autoPaste,
            restoreClipboard: settings.restoreClipboard,
          });
          logger.info('⏱️ TIMING: Paste complete', { ms: Date.now() - pasteStart });

          // Delete audio file on success
          deleteAudioFile(audioPath);

          // Notify widget of success
          sendToWidget('recording:success', { id, text: result.data.text });

          logger.info('⏱️ TIMING: TOTAL end-to-end', { ms: Date.now() - totalStart });
          return { success: true, id, text: result.data.text };
        } else {
          // Update outbox with failure
          updateOutboxItem(id, {
            status: 'failed',
            lastError: result.error,
            lastAttemptAt: new Date().toISOString(),
          });

          // Notify widget of error
          sendToWidget('recording:error', { id, error: result.error });

          return { success: false, id, error: result.error };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('IPC recording:save failed', error);
        sendToWidget('recording:error', { error: errorMessage });
        return { success: false, error: errorMessage };
      }
    }
  );

  // Cancel recording (before upload)
  ipcMain.handle('recording:cancel', async () => {
    logger.info('Recording cancelled');
    return { success: true };
  });

  logger.info('Recording IPC handlers registered');
};
