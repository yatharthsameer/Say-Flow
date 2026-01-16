import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  storeSession: (session: { accessToken: string; refreshToken: string }) =>
    ipcRenderer.invoke('auth:store-session', session),
  getSession: () => ipcRenderer.invoke('auth:get-session'),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
  getAccessToken: () => ipcRenderer.invoke('auth:get-access-token'),
  updateAccessToken: (token: string) =>
    ipcRenderer.invoke('auth:update-access-token', token),

  // Outbox
  getOutboxItems: () => ipcRenderer.invoke('outbox:get-items'),
  getOutboxItem: (id: string) => ipcRenderer.invoke('outbox:get-item', id),
  deleteOutboxItem: (id: string) => ipcRenderer.invoke('outbox:delete-item', id),
  retryOutboxItem: (id: string) => ipcRenderer.invoke('outbox:retry-item', id),
  retryAllOutbox: () => ipcRenderer.invoke('outbox:retry-all'),
  copyTranscript: (id: string) => ipcRenderer.invoke('outbox:copy-transcript', id),

  // Standard Recording
  saveRecording: (audioData: ArrayBuffer, durationMs: number) =>
    ipcRenderer.invoke('recording:save', audioData, durationMs),
  cancelRecording: () => ipcRenderer.invoke('recording:cancel'),
  
  // Realtime Transcription
  getTranscriptionMode: () => ipcRenderer.invoke('realtime:get-mode'),
  startRealtimeSession: () => ipcRenderer.invoke('realtime:start-session'),
  sendRealtimeAudioChunk: (audioData: ArrayBuffer) =>
    ipcRenderer.send('realtime:audio-chunk', audioData),
  commitRealtimeSession: () => ipcRenderer.invoke('realtime:commit'),
  onTranscriptionModeChange: (callback: (mode: string) => void) => {
    ipcRenderer.on('realtime:mode-change', (_, mode) => callback(mode));
    return () => ipcRenderer.removeListener('realtime:mode-change', () => {});
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (updates: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', updates),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  updateWidgetPosition: (x: number, y: number) =>
    ipcRenderer.invoke('settings:update-widget-position', x, y),

  // Event listeners for widget
  onHotkeyDown: (callback: () => void) => {
    ipcRenderer.on('hotkey:down', callback);
    return () => ipcRenderer.removeListener('hotkey:down', callback);
  },
  onHotkeyUp: (callback: () => void) => {
    ipcRenderer.on('hotkey:up', callback);
    return () => ipcRenderer.removeListener('hotkey:up', callback);
  },
  onRecordingProcessing: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('recording:processing', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('recording:processing', () => {});
  },
  onRecordingSuccess: (callback: (data: { id: string; text: string }) => void) => {
    ipcRenderer.on('recording:success', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('recording:success', () => {});
  },
  onRecordingError: (callback: (data: { id?: string; error: string }) => void) => {
    ipcRenderer.on('recording:error', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('recording:error', () => {});
  },
  onRetryAll: (callback: () => void) => {
    ipcRenderer.on('widget:retry-all', callback);
    return () => ipcRenderer.removeListener('widget:retry-all', callback);
  },
});
