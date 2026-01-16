"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSettingsIpc = void 0;
const electron_1 = require("electron");
const settingsStore_1 = require("../services/settingsStore");
const hotkeyService_1 = require("../services/hotkeyService");
const widgetWindow_1 = require("../windows/widgetWindow");
const logger_1 = require("../util/logger");
const registerSettingsIpc = () => {
    // Get current settings
    electron_1.ipcMain.handle('settings:get', async () => {
        try {
            const settings = (0, settingsStore_1.getSettings)();
            return { success: true, settings };
        }
        catch (error) {
            logger_1.logger.error('IPC settings:get failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Update settings
    electron_1.ipcMain.handle('settings:update', async (_, updates) => {
        try {
            const settings = (0, settingsStore_1.updateSettings)(updates);
            // If hotkey was updated, update the hotkey service
            if (updates.hotkey) {
                (0, hotkeyService_1.updateHotkey)(updates.hotkey);
            }
            // If transcription mode was updated, notify the widget
            if (updates.transcription?.mode) {
                logger_1.logger.info('Transcription mode changed', { mode: updates.transcription.mode });
                (0, widgetWindow_1.sendToWidget)('realtime:mode-change', updates.transcription.mode);
            }
            return { success: true, settings };
        }
        catch (error) {
            logger_1.logger.error('IPC settings:update failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Reset settings to defaults
    electron_1.ipcMain.handle('settings:reset', async () => {
        try {
            const settings = (0, settingsStore_1.resetSettings)();
            (0, hotkeyService_1.updateHotkey)(settings.hotkey);
            return { success: true, settings };
        }
        catch (error) {
            logger_1.logger.error('IPC settings:reset failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Update widget position
    electron_1.ipcMain.handle('settings:update-widget-position', async (_, x, y) => {
        try {
            (0, widgetWindow_1.updateWidgetPosition)(x, y);
            (0, settingsStore_1.updateSettings)({ widgetPosition: { x, y } });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('IPC settings:update-widget-position failed', error);
            return { success: false, error: String(error) };
        }
    });
    logger_1.logger.info('Settings IPC handlers registered');
};
exports.registerSettingsIpc = registerSettingsIpc;
