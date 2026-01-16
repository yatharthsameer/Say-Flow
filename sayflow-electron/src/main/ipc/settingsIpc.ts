import { ipcMain } from 'electron';
import { getSettings, updateSettings, resetSettings } from '../services/settingsStore';
import { updateHotkey } from '../services/hotkeyService';
import { updateWidgetPosition, sendToWidget } from '../windows/widgetWindow';
import { Settings, HotkeyConfig } from '../../shared/types';
import { logger } from '../util/logger';

export const registerSettingsIpc = (): void => {
  // Get current settings
  ipcMain.handle('settings:get', async () => {
    try {
      const settings = getSettings();
      return { success: true, settings };
    } catch (error) {
      logger.error('IPC settings:get failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Update settings
  ipcMain.handle('settings:update', async (_, updates: Partial<Settings>) => {
    try {
      const settings = updateSettings(updates);

      // If hotkey was updated, update the hotkey service
      if (updates.hotkey) {
        updateHotkey(updates.hotkey);
      }

      // If transcription mode was updated, notify the widget
      if (updates.transcription?.mode) {
        logger.info('Transcription mode changed', { mode: updates.transcription.mode });
        sendToWidget('realtime:mode-change', updates.transcription.mode);
      }

      return { success: true, settings };
    } catch (error) {
      logger.error('IPC settings:update failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Reset settings to defaults
  ipcMain.handle('settings:reset', async () => {
    try {
      const settings = resetSettings();
      updateHotkey(settings.hotkey);
      return { success: true, settings };
    } catch (error) {
      logger.error('IPC settings:reset failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Update widget position
  ipcMain.handle('settings:update-widget-position', async (_, x: number, y: number) => {
    try {
      updateWidgetPosition(x, y);
      updateSettings({ widgetPosition: { x, y } });
      return { success: true };
    } catch (error) {
      logger.error('IPC settings:update-widget-position failed', error);
      return { success: false, error: String(error) };
    }
  });

  logger.info('Settings IPC handlers registered');
};
