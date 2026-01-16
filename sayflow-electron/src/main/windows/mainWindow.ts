import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { logger } from '../util/logger';

let mainWindow: BrowserWindow | null = null;

export const createMainWindow = (): BrowserWindow => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/renderer/index.html');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Hide window instead of closing (app stays running)
  mainWindow.on('close', (event) => {
    if (!global.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      logger.info('Main window hidden');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  logger.info('Main window created');
  return mainWindow;
};

export const getMainWindow = (): BrowserWindow | null => mainWindow;

export const showMainWindow = (): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
};

export const hideMainWindow = (): void => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
};

// Declare global type for isQuitting flag
declare global {
  var isQuitting: boolean;
}
