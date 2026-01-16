import { ipcMain } from 'electron';
import {
  getOutboxItems,
  addOutboxItem,
  updateOutboxItem,
  deleteOutboxItem,
  getFailedItems,
  getOutboxItem,
} from '../services/outboxStore';
import { deleteAudioFile } from '../services/audioFileStore';
import { uploadTranscription } from '../services/backendClient';
import { pasteTranscript } from '../services/pasteService';
import { getSettings } from '../services/settingsStore';
import { OutboxItem } from '../../shared/types';
import { logger } from '../util/logger';

export const registerOutboxIpc = (): void => {
  // Get all outbox items
  ipcMain.handle('outbox:get-items', async () => {
    try {
      const items = getOutboxItems();
      return { success: true, items };
    } catch (error) {
      logger.error('IPC outbox:get-items failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Get single item
  ipcMain.handle('outbox:get-item', async (_, id: string) => {
    try {
      const item = getOutboxItem(id);
      return { success: true, item };
    } catch (error) {
      logger.error('IPC outbox:get-item failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete item
  ipcMain.handle('outbox:delete-item', async (_, id: string) => {
    try {
      const item = getOutboxItem(id);
      if (item?.audioPath) {
        deleteAudioFile(item.audioPath);
      }
      const deleted = deleteOutboxItem(id);
      return { success: deleted };
    } catch (error) {
      logger.error('IPC outbox:delete-item failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Retry single item
  ipcMain.handle('outbox:retry-item', async (_, id: string) => {
    try {
      const item = getOutboxItem(id);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      if (item.status !== 'failed') {
        return { success: false, error: 'Item is not in failed state' };
      }

      const settings = getSettings();
      updateOutboxItem(id, { status: 'pending', lastAttemptAt: new Date().toISOString() });

      const result = await uploadTranscription({
        audioPath: item.audioPath,
        durationMs: item.durationMs,
        audioFormat: item.audioFormat,
        language: item.language,
        idempotencyKey: item.id,
        provider: settings.transcription?.provider,
        model: settings.transcription?.model,
      });

      if (result.success && result.data) {
        updateOutboxItem(id, {
          status: 'success',
          transcriptText: result.data.text,
        });

        // Paste transcript (reuse settings from above)
        await pasteTranscript(result.data.text, {
          autoPaste: settings.autoPaste,
          restoreClipboard: settings.restoreClipboard,
        });

        // Delete audio file on success
        deleteAudioFile(item.audioPath);

        return { success: true, item: getOutboxItem(id) };
      } else {
        updateOutboxItem(id, {
          status: 'failed',
          lastError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      logger.error('IPC outbox:retry-item failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Retry all failed items
  ipcMain.handle('outbox:retry-all', async () => {
    try {
      const settings = getSettings();
      const failedItems = getFailedItems();
      const results: { id: string; success: boolean; error?: string }[] = [];

      for (const item of failedItems) {
        updateOutboxItem(item.id, { status: 'pending', lastAttemptAt: new Date().toISOString() });

        const result = await uploadTranscription({
          audioPath: item.audioPath,
          durationMs: item.durationMs,
          audioFormat: item.audioFormat,
          language: item.language,
          idempotencyKey: item.id,
          provider: settings.transcription?.provider,
          model: settings.transcription?.model,
        });

        if (result.success && result.data) {
          updateOutboxItem(item.id, {
            status: 'success',
            transcriptText: result.data.text,
          });
          deleteAudioFile(item.audioPath);
          results.push({ id: item.id, success: true });
        } else {
          updateOutboxItem(item.id, {
            status: 'failed',
            lastError: result.error,
          });
          results.push({ id: item.id, success: false, error: result.error });
        }
      }

      return { success: true, results };
    } catch (error) {
      logger.error('IPC outbox:retry-all failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Copy transcript to clipboard
  ipcMain.handle('outbox:copy-transcript', async (_, id: string) => {
    try {
      const item = getOutboxItem(id);
      if (!item?.transcriptText) {
        return { success: false, error: 'No transcript available' };
      }

      const { clipboard } = require('electron');
      clipboard.writeText(item.transcriptText);
      return { success: true };
    } catch (error) {
      logger.error('IPC outbox:copy-transcript failed', error);
      return { success: false, error: String(error) };
    }
  });

  logger.info('Outbox IPC handlers registered');
};
