"use strict";
/**
 * Realtime Transcription IPC Handlers
 *
 * Handles IPC communication between the widget and the realtime transcription client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRealtimeIpc = void 0;
const electron_1 = require("electron");
const realtimeClient_1 = require("../services/realtimeClient");
const pasteService_1 = require("../services/pasteService");
const settingsStore_1 = require("../services/settingsStore");
const logger_1 = require("../util/logger");
const widgetWindow_1 = require("../windows/widgetWindow");
let realtimeClient = null;
let sessionStartTime = 0;
const registerRealtimeIpc = () => {
    // Get transcription mode from settings
    electron_1.ipcMain.handle('realtime:get-mode', async () => {
        const settings = (0, settingsStore_1.getSettings)();
        const mode = settings.transcription?.mode || 'standard';
        logger_1.logger.info('Widget requested transcription mode', {
            mode,
            transcription: settings.transcription
        });
        return mode;
    });
    // Start a realtime transcription session
    electron_1.ipcMain.handle('realtime:start-session', async () => {
        const settings = (0, settingsStore_1.getSettings)();
        // Check if realtime mode is enabled
        if (settings.transcription?.mode !== 'realtime') {
            logger_1.logger.warn('Realtime mode not enabled in settings');
            return { success: false, error: 'Realtime mode not enabled' };
        }
        sessionStartTime = Date.now();
        logger_1.logger.info('Starting realtime transcription session');
        try {
            // Create a new client for this session
            realtimeClient = new realtimeClient_1.RealtimeTranscriptionClient({
                model: settings.transcription?.model || 'gpt-4o-mini-transcribe',
                language: settings.language || 'en',
                onTranscript: (event) => {
                    handleTranscriptEvent(event);
                },
                onError: (error) => {
                    logger_1.logger.error('Realtime transcription error', { error: error.message });
                    (0, widgetWindow_1.sendToWidget)('recording:error', { error: error.message });
                },
                onClose: () => {
                    logger_1.logger.info('Realtime session closed');
                },
            });
            // Connect to the backend WebSocket
            await realtimeClient.connect();
            logger_1.logger.info('Realtime session started', {
                connectTime: Date.now() - sessionStartTime,
            });
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Failed to start realtime session', { error: errorMessage });
            (0, widgetWindow_1.sendToWidget)('recording:error', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
    });
    // Receive audio chunk from widget
    electron_1.ipcMain.on('realtime:audio-chunk', (_, audioData) => {
        if (!realtimeClient) {
            logger_1.logger.warn('Received audio chunk but no active session');
            return;
        }
        try {
            const buffer = Buffer.from(audioData);
            realtimeClient.sendAudioChunk(buffer);
        }
        catch (error) {
            logger_1.logger.error('Error sending audio chunk', { error });
        }
    });
    // Commit the session and get final transcript
    electron_1.ipcMain.handle('realtime:commit', async () => {
        if (!realtimeClient) {
            logger_1.logger.warn('Commit called but no active session');
            return { success: false, error: 'No active session' };
        }
        const commitStartTime = Date.now();
        try {
            // Commit and wait for final transcript
            const transcript = await realtimeClient.commit();
            const totalTime = Date.now() - sessionStartTime;
            const commitTime = Date.now() - commitStartTime;
            logger_1.logger.info('⏱️ TIMING: Realtime transcription complete', {
                totalTime,
                commitTime,
                transcriptLength: transcript.length,
            });
            if (transcript && transcript.trim().length > 0) {
                // Paste the transcript
                const settings = (0, settingsStore_1.getSettings)();
                const pasteStartTime = Date.now();
                await (0, pasteService_1.pasteTranscript)(transcript, {
                    autoPaste: settings.autoPaste,
                    restoreClipboard: settings.restoreClipboard,
                });
                logger_1.logger.info('⏱️ TIMING: Paste complete', { ms: Date.now() - pasteStartTime });
                // Notify widget of success
                (0, widgetWindow_1.sendToWidget)('recording:success', { id: 'realtime', text: transcript });
                return { success: true, text: transcript };
            }
            else {
                logger_1.logger.info('Empty transcript from realtime session');
                (0, widgetWindow_1.sendToWidget)('recording:success', { id: 'realtime', text: '' });
                return { success: true, text: '' };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error('Error committing realtime session', { error: errorMessage });
            (0, widgetWindow_1.sendToWidget)('recording:error', { error: errorMessage });
            return { success: false, error: errorMessage };
        }
        finally {
            // Clean up the session
            if (realtimeClient) {
                realtimeClient.close();
                realtimeClient = null;
            }
        }
    });
    // Cancel the current session
    electron_1.ipcMain.handle('realtime:cancel', async () => {
        if (realtimeClient) {
            realtimeClient.cancel();
            realtimeClient.close();
            realtimeClient = null;
        }
        return { success: true };
    });
    logger_1.logger.info('Realtime IPC handlers registered');
};
exports.registerRealtimeIpc = registerRealtimeIpc;
/**
 * Handle transcript events from the realtime client
 */
function handleTranscriptEvent(event) {
    switch (event.type) {
        case 'session_ready':
            logger_1.logger.info('Realtime session ready');
            break;
        case 'transcript_delta':
            // Could optionally show partial transcripts in the UI
            logger_1.logger.debug('Transcript delta', { delta: event.delta });
            break;
        case 'transcript_completed':
            logger_1.logger.info('Transcript segment completed', { transcript: event.transcript?.substring(0, 50) });
            break;
        case 'transcript_final':
            logger_1.logger.info('Final transcript received', { length: event.transcript?.length });
            break;
        case 'speech_started':
            logger_1.logger.debug('Speech started');
            break;
        case 'speech_stopped':
            logger_1.logger.debug('Speech stopped');
            break;
        case 'error':
            logger_1.logger.error('Transcript error', { error: event.error });
            break;
    }
}
