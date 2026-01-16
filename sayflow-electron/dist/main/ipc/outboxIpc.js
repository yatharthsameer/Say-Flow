"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOutboxIpc = void 0;
const electron_1 = require("electron");
const outboxStore_1 = require("../services/outboxStore");
const audioFileStore_1 = require("../services/audioFileStore");
const backendClient_1 = require("../services/backendClient");
const pasteService_1 = require("../services/pasteService");
const settingsStore_1 = require("../services/settingsStore");
const logger_1 = require("../util/logger");
const registerOutboxIpc = () => {
    // Get all outbox items
    electron_1.ipcMain.handle('outbox:get-items', async () => {
        try {
            const items = (0, outboxStore_1.getOutboxItems)();
            return { success: true, items };
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:get-items failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Get single item
    electron_1.ipcMain.handle('outbox:get-item', async (_, id) => {
        try {
            const item = (0, outboxStore_1.getOutboxItem)(id);
            return { success: true, item };
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:get-item failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Delete item
    electron_1.ipcMain.handle('outbox:delete-item', async (_, id) => {
        try {
            const item = (0, outboxStore_1.getOutboxItem)(id);
            if (item?.audioPath) {
                (0, audioFileStore_1.deleteAudioFile)(item.audioPath);
            }
            const deleted = (0, outboxStore_1.deleteOutboxItem)(id);
            return { success: deleted };
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:delete-item failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Retry single item
    electron_1.ipcMain.handle('outbox:retry-item', async (_, id) => {
        try {
            const item = (0, outboxStore_1.getOutboxItem)(id);
            if (!item) {
                return { success: false, error: 'Item not found' };
            }
            if (item.status !== 'failed') {
                return { success: false, error: 'Item is not in failed state' };
            }
            const settings = (0, settingsStore_1.getSettings)();
            (0, outboxStore_1.updateOutboxItem)(id, { status: 'pending', lastAttemptAt: new Date().toISOString() });
            const result = await (0, backendClient_1.uploadTranscription)({
                audioPath: item.audioPath,
                durationMs: item.durationMs,
                audioFormat: item.audioFormat,
                language: item.language,
                idempotencyKey: item.id,
                provider: settings.transcription?.provider,
                model: settings.transcription?.model,
            });
            if (result.success && result.data) {
                (0, outboxStore_1.updateOutboxItem)(id, {
                    status: 'success',
                    transcriptText: result.data.text,
                });
                // Paste transcript (reuse settings from above)
                await (0, pasteService_1.pasteTranscript)(result.data.text, {
                    autoPaste: settings.autoPaste,
                    restoreClipboard: settings.restoreClipboard,
                });
                // Delete audio file on success
                (0, audioFileStore_1.deleteAudioFile)(item.audioPath);
                return { success: true, item: (0, outboxStore_1.getOutboxItem)(id) };
            }
            else {
                (0, outboxStore_1.updateOutboxItem)(id, {
                    status: 'failed',
                    lastError: result.error,
                });
                return { success: false, error: result.error };
            }
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:retry-item failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Retry all failed items
    electron_1.ipcMain.handle('outbox:retry-all', async () => {
        try {
            const settings = (0, settingsStore_1.getSettings)();
            const failedItems = (0, outboxStore_1.getFailedItems)();
            const results = [];
            for (const item of failedItems) {
                (0, outboxStore_1.updateOutboxItem)(item.id, { status: 'pending', lastAttemptAt: new Date().toISOString() });
                const result = await (0, backendClient_1.uploadTranscription)({
                    audioPath: item.audioPath,
                    durationMs: item.durationMs,
                    audioFormat: item.audioFormat,
                    language: item.language,
                    idempotencyKey: item.id,
                    provider: settings.transcription?.provider,
                    model: settings.transcription?.model,
                });
                if (result.success && result.data) {
                    (0, outboxStore_1.updateOutboxItem)(item.id, {
                        status: 'success',
                        transcriptText: result.data.text,
                    });
                    (0, audioFileStore_1.deleteAudioFile)(item.audioPath);
                    results.push({ id: item.id, success: true });
                }
                else {
                    (0, outboxStore_1.updateOutboxItem)(item.id, {
                        status: 'failed',
                        lastError: result.error,
                    });
                    results.push({ id: item.id, success: false, error: result.error });
                }
            }
            return { success: true, results };
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:retry-all failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Copy transcript to clipboard
    electron_1.ipcMain.handle('outbox:copy-transcript', async (_, id) => {
        try {
            const item = (0, outboxStore_1.getOutboxItem)(id);
            if (!item?.transcriptText) {
                return { success: false, error: 'No transcript available' };
            }
            const { clipboard } = require('electron');
            clipboard.writeText(item.transcriptText);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('IPC outbox:copy-transcript failed', error);
            return { success: false, error: String(error) };
        }
    });
    logger_1.logger.info('Outbox IPC handlers registered');
};
exports.registerOutboxIpc = registerOutboxIpc;
