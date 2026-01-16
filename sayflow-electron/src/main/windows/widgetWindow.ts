import { BrowserWindow, screen, Menu } from 'electron';
import path from 'path';
import { logger } from '../util/logger';
import { showMainWindow } from './mainWindow';

let widgetWindow: BrowserWindow | null = null;

const WIDGET_SIZE = { width: 60, height: 60 };

export const createWidgetWindow = (): BrowserWindow => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return widgetWindow;
  }

  // Position in bottom-right corner
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const x = screenWidth - WIDGET_SIZE.width - 20;
  const y = screenHeight - WIDGET_SIZE.height - 20;

  widgetWindow = new BrowserWindow({
    width: WIDGET_SIZE.width,
    height: WIDGET_SIZE.height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false, // Prevent widget from stealing focus from target app
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
  });

  // Set widget to float above full-screen apps
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWindow.setAlwaysOnTop(true, 'floating');

  // Load the widget renderer
  if (process.env.NODE_ENV === 'development') {
    // Try common Vite dev ports
    const devPort = process.env.VITE_DEV_PORT || '5173';
    const widgetUrl = `http://localhost:${devPort}/widget/widget.html`;
    logger.info('Loading widget from', { url: widgetUrl });
    
    widgetWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('Widget failed to load', { errorCode, errorDescription, url: widgetUrl });
    });
    
    widgetWindow.webContents.on('did-finish-load', () => {
      logger.info('Widget loaded successfully');
    });
    
    widgetWindow.loadURL(widgetUrl);
    
    // Open devtools for debugging (detached)
    widgetWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    widgetWindow.loadFile(path.join(__dirname, '../../renderer/widget/widget.html'));
  }

  // Context menu
  widgetWindow.webContents.on('context-menu', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open sayFlow',
        click: () => showMainWindow(),
      },
      {
        label: 'Retry All Failed',
        click: () => {
          widgetWindow?.webContents.send('widget:retry-all');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          global.isQuitting = true;
          const { app } = require('electron');
          app.quit();
        },
      },
    ]);
    contextMenu.popup({ window: widgetWindow! });
  });

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  logger.info('Widget window created');
  return widgetWindow;
};

export const getWidgetWindow = (): BrowserWindow | null => widgetWindow;

export const updateWidgetPosition = (x: number, y: number): void => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.setPosition(x, y);
  }
};

export const sendToWidget = (channel: string, ...args: unknown[]): void => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    logger.info('Sending to widget', { channel, args });
    widgetWindow.webContents.send(channel, ...args);
  } else {
    logger.warn('Widget window not available', { channel });
  }
};
