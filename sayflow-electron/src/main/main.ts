import { app, BrowserWindow } from 'electron';
import path from 'path';
import { createMainWindow, showMainWindow } from './windows/mainWindow';
import { createWidgetWindow } from './windows/widgetWindow';
import { registerAllIpcHandlers } from './ipc';
import { loadSettings } from './services/settingsStore';
import { initHotkeyService, stopHotkeyService } from './services/hotkeyService';
import { logger } from './util/logger';

// Global flag to track if we're quitting
global.isQuitting = false;

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, show our window
    showMainWindow();
  });
}

const initialize = async (): Promise<void> => {
  logger.info('sayFlow starting...');

  // Register IPC handlers before creating windows
  registerAllIpcHandlers();

  // Load settings
  const settings = loadSettings();
  logger.info('Settings loaded', { language: settings.language });

  // Create windows
  createWidgetWindow();
  createMainWindow();

  // Initialize hotkey service
  initHotkeyService(settings);

  logger.info('sayFlow initialized');
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(initialize);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  // App should only quit when user explicitly quits
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked
  showMainWindow();
});

app.on('before-quit', () => {
  global.isQuitting = true;
  stopHotkeyService();
  logger.info('sayFlow quitting...');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});
