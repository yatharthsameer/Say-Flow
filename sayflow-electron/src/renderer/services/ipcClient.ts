import { OutboxItem, Settings } from '../../shared/types';

// Type definitions for the exposed electron API
interface ElectronAPI {
  // Auth
  storeSession: (session: { accessToken: string; refreshToken: string }) => Promise<{ success: boolean; error?: string }>;
  getSession: () => Promise<{ success: boolean; session?: { accessToken: string; refreshToken: string } | null; error?: string }>;
  clearSession: () => Promise<{ success: boolean; error?: string }>;
  getAccessToken: () => Promise<{ success: boolean; token?: string | null; error?: string }>;
  updateAccessToken: (token: string) => Promise<{ success: boolean; error?: string }>;

  // Outbox
  getOutboxItems: () => Promise<{ success: boolean; items?: OutboxItem[]; error?: string }>;
  getOutboxItem: (id: string) => Promise<{ success: boolean; item?: OutboxItem; error?: string }>;
  deleteOutboxItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  retryOutboxItem: (id: string) => Promise<{ success: boolean; item?: OutboxItem; error?: string }>;
  retryAllOutbox: () => Promise<{ success: boolean; results?: { id: string; success: boolean; error?: string }[]; error?: string }>;
  copyTranscript: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Recording
  saveRecording: (audioData: ArrayBuffer, durationMs: number) => Promise<{ success: boolean; id?: string; text?: string; error?: string }>;
  cancelRecording: () => Promise<{ success: boolean }>;

  // Settings
  getSettings: () => Promise<{ success: boolean; settings?: Settings; error?: string }>;
  updateSettings: (updates: Partial<Settings>) => Promise<{ success: boolean; settings?: Settings; error?: string }>;
  resetSettings: () => Promise<{ success: boolean; settings?: Settings; error?: string }>;
  updateWidgetPosition: (x: number, y: number) => Promise<{ success: boolean; error?: string }>;

  // Event listeners
  onHotkeyDown: (callback: () => void) => () => void;
  onHotkeyUp: (callback: () => void) => () => void;
  onRecordingProcessing: (callback: (data: { id: string }) => void) => () => void;
  onRecordingSuccess: (callback: (data: { id: string; text: string }) => void) => () => void;
  onRecordingError: (callback: (data: { id?: string; error: string }) => void) => () => void;
  onRetryAll: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const ipcClient = {
  // Auth
  auth: {
    storeSession: (session: { accessToken: string; refreshToken: string }) =>
      window.electronAPI.storeSession(session),
    getSession: () => window.electronAPI.getSession(),
    clearSession: () => window.electronAPI.clearSession(),
    getAccessToken: () => window.electronAPI.getAccessToken(),
    updateAccessToken: (token: string) => window.electronAPI.updateAccessToken(token),
  },

  // Outbox
  outbox: {
    getItems: () => window.electronAPI.getOutboxItems(),
    getItem: (id: string) => window.electronAPI.getOutboxItem(id),
    deleteItem: (id: string) => window.electronAPI.deleteOutboxItem(id),
    retryItem: (id: string) => window.electronAPI.retryOutboxItem(id),
    retryAll: () => window.electronAPI.retryAllOutbox(),
    copyTranscript: (id: string) => window.electronAPI.copyTranscript(id),
  },

  // Recording
  recording: {
    save: (audioData: ArrayBuffer, durationMs: number) =>
      window.electronAPI.saveRecording(audioData, durationMs),
    cancel: () => window.electronAPI.cancelRecording(),
  },

  // Settings
  settings: {
    get: () => window.electronAPI.getSettings(),
    update: (updates: Partial<Settings>) => window.electronAPI.updateSettings(updates),
    reset: () => window.electronAPI.resetSettings(),
    updateWidgetPosition: (x: number, y: number) =>
      window.electronAPI.updateWidgetPosition(x, y),
  },

  // Events
  events: {
    onHotkeyDown: (callback: () => void) => window.electronAPI.onHotkeyDown(callback),
    onHotkeyUp: (callback: () => void) => window.electronAPI.onHotkeyUp(callback),
    onRecordingProcessing: (callback: (data: { id: string }) => void) =>
      window.electronAPI.onRecordingProcessing(callback),
    onRecordingSuccess: (callback: (data: { id: string; text: string }) => void) =>
      window.electronAPI.onRecordingSuccess(callback),
    onRecordingError: (callback: (data: { id?: string; error: string }) => void) =>
      window.electronAPI.onRecordingError(callback),
    onRetryAll: (callback: () => void) => window.electronAPI.onRetryAll(callback),
  },
};
