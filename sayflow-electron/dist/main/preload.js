"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    storeSession: (session) => electron_1.ipcRenderer.invoke('auth:store-session', session),
    getSession: () => electron_1.ipcRenderer.invoke('auth:get-session'),
    clearSession: () => electron_1.ipcRenderer.invoke('auth:clear-session'),
    getAccessToken: () => electron_1.ipcRenderer.invoke('auth:get-access-token'),
    updateAccessToken: (token) => electron_1.ipcRenderer.invoke('auth:update-access-token', token),
    // Outbox
    getOutboxItems: () => electron_1.ipcRenderer.invoke('outbox:get-items'),
    getOutboxItem: (id) => electron_1.ipcRenderer.invoke('outbox:get-item', id),
    deleteOutboxItem: (id) => electron_1.ipcRenderer.invoke('outbox:delete-item', id),
    retryOutboxItem: (id) => electron_1.ipcRenderer.invoke('outbox:retry-item', id),
    retryAllOutbox: () => electron_1.ipcRenderer.invoke('outbox:retry-all'),
    copyTranscript: (id) => electron_1.ipcRenderer.invoke('outbox:copy-transcript', id),
    // Standard Recording
    saveRecording: (audioData, durationMs) => electron_1.ipcRenderer.invoke('recording:save', audioData, durationMs),
    cancelRecording: () => electron_1.ipcRenderer.invoke('recording:cancel'),
    // Realtime Transcription
    getTranscriptionMode: () => electron_1.ipcRenderer.invoke('realtime:get-mode'),
    startRealtimeSession: () => electron_1.ipcRenderer.invoke('realtime:start-session'),
    sendRealtimeAudioChunk: (audioData) => electron_1.ipcRenderer.send('realtime:audio-chunk', audioData),
    commitRealtimeSession: () => electron_1.ipcRenderer.invoke('realtime:commit'),
    onTranscriptionModeChange: (callback) => {
        electron_1.ipcRenderer.on('realtime:mode-change', (_, mode) => callback(mode));
        return () => electron_1.ipcRenderer.removeListener('realtime:mode-change', () => { });
    },
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('settings:get'),
    updateSettings: (updates) => electron_1.ipcRenderer.invoke('settings:update', updates),
    resetSettings: () => electron_1.ipcRenderer.invoke('settings:reset'),
    updateWidgetPosition: (x, y) => electron_1.ipcRenderer.invoke('settings:update-widget-position', x, y),
    // Event listeners for widget
    onHotkeyDown: (callback) => {
        electron_1.ipcRenderer.on('hotkey:down', callback);
        return () => electron_1.ipcRenderer.removeListener('hotkey:down', callback);
    },
    onHotkeyUp: (callback) => {
        electron_1.ipcRenderer.on('hotkey:up', callback);
        return () => electron_1.ipcRenderer.removeListener('hotkey:up', callback);
    },
    onRecordingProcessing: (callback) => {
        electron_1.ipcRenderer.on('recording:processing', (_, data) => callback(data));
        return () => electron_1.ipcRenderer.removeListener('recording:processing', () => { });
    },
    onRecordingSuccess: (callback) => {
        electron_1.ipcRenderer.on('recording:success', (_, data) => callback(data));
        return () => electron_1.ipcRenderer.removeListener('recording:success', () => { });
    },
    onRecordingError: (callback) => {
        electron_1.ipcRenderer.on('recording:error', (_, data) => callback(data));
        return () => electron_1.ipcRenderer.removeListener('recording:error', () => { });
    },
    onRetryAll: (callback) => {
        electron_1.ipcRenderer.on('widget:retry-all', callback);
        return () => electron_1.ipcRenderer.removeListener('widget:retry-all', callback);
    },
});
