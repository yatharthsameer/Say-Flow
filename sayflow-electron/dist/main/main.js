"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const mainWindow_1 = require("./windows/mainWindow");
const widgetWindow_1 = require("./windows/widgetWindow");
const ipc_1 = require("./ipc");
const settingsStore_1 = require("./services/settingsStore");
const hotkeyService_1 = require("./services/hotkeyService");
const logger_1 = require("./util/logger");
// Global flag to track if we're quitting
global.isQuitting = false;
// Enforce single instance
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        // Someone tried to run a second instance, show our window
        (0, mainWindow_1.showMainWindow)();
    });
}
const initialize = async () => {
    logger_1.logger.info('sayFlow starting...');
    // Register IPC handlers before creating windows
    (0, ipc_1.registerAllIpcHandlers)();
    // Load settings
    const settings = (0, settingsStore_1.loadSettings)();
    logger_1.logger.info('Settings loaded', { language: settings.language });
    // Create windows
    (0, widgetWindow_1.createWidgetWindow)();
    (0, mainWindow_1.createMainWindow)();
    // Initialize hotkey service
    (0, hotkeyService_1.initHotkeyService)(settings);
    logger_1.logger.info('sayFlow initialized');
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
electron_1.app.whenReady().then(initialize);
// Quit when all windows are closed, except on macOS.
electron_1.app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    // App should only quit when user explicitly quits
});
electron_1.app.on('activate', () => {
    // On macOS, re-create a window when dock icon is clicked
    (0, mainWindow_1.showMainWindow)();
});
electron_1.app.on('before-quit', () => {
    global.isQuitting = true;
    (0, hotkeyService_1.stopHotkeyService)();
    logger_1.logger.info('sayFlow quitting...');
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', error);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled rejection', reason);
});
