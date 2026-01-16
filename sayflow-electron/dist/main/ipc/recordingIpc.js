"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRecordingIpc = void 0;
const electron_1 = require("electron");
const audioFileStore_1 = require("../services/audioFileStore");
const outboxStore_1 = require("../services/outboxStore");
const backendClient_1 = require("../services/backendClient");
const pasteService_1 = require("../services/pasteService");
const settingsStore_1 = require("../services/settingsStore");
const logger_1 = require("../util/logger");
const widgetWindow_1 = require("../windows/widgetWindow");
const registerRecordingIpc = () => {
    // Receive audio blob from widget
    electron_1.ipcMain.handle('recording:save', async (_, audioData, durationMs) => {
        const totalStart = Date.now();
        try {
            const settings = (0, settingsStore_1.getSettings)();
            const audioBuffer = Buffer.from(audioData);
            // Save audio file
            const saveStart = Date.now();
            const { id, audioPath } = (0, audioFileStore_1.saveAudioFile)(audioBuffer);
            logger_1.logger.info('⏱️ TIMING: Audio file saved', {
                ms: Date.now() - saveStart,
                sizeKB: Math.round(audioBuffer.length / 1024)
            });
            // Create outbox item
            const outboxItem = {
                id,
                createdAt: new Date().toISOString(),
                audioPath,
                durationMs,
                audioFormat: 'webm',
                language: settings.language,
                status: 'pending',
            };
            (0, outboxStore_1.addOutboxItem)(outboxItem);
            // Update widget to processing state
            (0, widgetWindow_1.sendToWidget)('recording:processing', { id });
            // Upload to backend
            const uploadStart = Date.now();
            const result = await (0, backendClient_1.uploadTranscription)({
                audioPath,
                durationMs,
                audioFormat: 'webm',
                language: settings.language,
                idempotencyKey: id,
                provider: settings.transcription?.provider,
                model: settings.transcription?.model,
            });
            logger_1.logger.info('⏱️ TIMING: Backend upload complete', {
                ms: Date.now() - uploadStart,
                provider: settings.transcription?.provider,
                model: settings.transcription?.model,
            });
            if (result.success && result.data) {
                // Log backend timing if available
                if (result.data.timing) {
                    logger_1.logger.info('⏱️ TIMING: Backend breakdown', {
                        provider: result.data.provider,
                        model: result.data.model,
                        provider_ms: result.data.timing.provider_latency_ms,
                        total_backend_ms: result.data.timing.total_latency_ms
                    });
                }
                // Update outbox with success
                (0, outboxStore_1.updateOutboxItem)(id, {
                    status: 'success',
                    transcriptText: result.data.text,
                });
                // Paste transcript
                const pasteStart = Date.now();
                await (0, pasteService_1.pasteTranscript)(result.data.text, {
                    autoPaste: settings.autoPaste,
                    restoreClipboard: settings.restoreClipboard,
                });
                logger_1.logger.info('⏱️ TIMING: Paste complete', { ms: Date.now() - pasteStart });
                // Delete audio file on success
                (0, audioFileStore_1.deleteAudioFile)(audioPath);
                // Notify widget of success
                (0, widgetWindow_1.sendToWidget)('recording:success', { id, text: result.data.text });
                logger_1.logger.info('⏱️ TIMING: TOTAL end-to-end', { ms: Date.now() - totalStart });
                return { success: true, id, text: result.data.text };
            }
            else {
                // Update outbox with failure
                (0, outboxStore_1.updateOutboxItem)(id, {
                    status: 'failed',
                    lastError: result.error,
                    lastAttemptAt: new Date().toISOString(),
                });
                // Notify widget of error
                (0, widgetWindow_1.sendToWidget)('recording:error', { id, error: result.error });
                return { success: false, id, error: result.error };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('IPC recording:save failed', error);
            (0, widgetWindow_1.sendToWidget)('recording:error', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    });
    // Cancel recording (before upload)
    electron_1.ipcMain.handle('recording:cancel', async () => {
        logger_1.logger.info('Recording cancelled');
        return { success: true };
    });
    logger_1.logger.info('Recording IPC handlers registered');
};
exports.registerRecordingIpc = registerRecordingIpc;
