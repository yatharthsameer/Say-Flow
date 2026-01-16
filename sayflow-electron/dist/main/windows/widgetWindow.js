"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToWidget = exports.updateWidgetPosition = exports.getWidgetWindow = exports.createWidgetWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const logger_1 = require("../util/logger");
const mainWindow_1 = require("./mainWindow");
let widgetWindow = null;
const WIDGET_SIZE = { width: 60, height: 60 };
const createWidgetWindow = () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        return widgetWindow;
    }
    // Position in bottom-right corner
    const { width: screenWidth, height: screenHeight } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    const x = screenWidth - WIDGET_SIZE.width - 20;
    const y = screenHeight - WIDGET_SIZE.height - 20;
    widgetWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, '../preload.js'),
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
        logger_1.logger.info('Loading widget from', { url: widgetUrl });
        widgetWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            logger_1.logger.error('Widget failed to load', { errorCode, errorDescription, url: widgetUrl });
        });
        widgetWindow.webContents.on('did-finish-load', () => {
            logger_1.logger.info('Widget loaded successfully');
        });
        widgetWindow.loadURL(widgetUrl);
        // Open devtools for debugging (detached)
        widgetWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        widgetWindow.loadFile(path_1.default.join(__dirname, '../../renderer/widget/widget.html'));
    }
    // Context menu
    widgetWindow.webContents.on('context-menu', () => {
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Open sayFlow',
                click: () => (0, mainWindow_1.showMainWindow)(),
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
        contextMenu.popup({ window: widgetWindow });
    });
    widgetWindow.on('closed', () => {
        widgetWindow = null;
    });
    logger_1.logger.info('Widget window created');
    return widgetWindow;
};
exports.createWidgetWindow = createWidgetWindow;
const getWidgetWindow = () => widgetWindow;
exports.getWidgetWindow = getWidgetWindow;
const updateWidgetPosition = (x, y) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setPosition(x, y);
    }
};
exports.updateWidgetPosition = updateWidgetPosition;
const sendToWidget = (channel, ...args) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        logger_1.logger.info('Sending to widget', { channel, args });
        widgetWindow.webContents.send(channel, ...args);
    }
    else {
        logger_1.logger.warn('Widget window not available', { channel });
    }
};
exports.sendToWidget = sendToWidget;
