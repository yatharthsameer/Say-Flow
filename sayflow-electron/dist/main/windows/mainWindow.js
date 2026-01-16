"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hideMainWindow = exports.showMainWindow = exports.getMainWindow = exports.createMainWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const logger_1 = require("../util/logger");
let mainWindow = null;
const createMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        return mainWindow;
    }
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, '../preload.js'),
        },
    });
    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173/renderer/index.html');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../../renderer/renderer/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Hide window instead of closing (app stays running)
    mainWindow.on('close', (event) => {
        if (!global.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
            logger_1.logger.info('Main window hidden');
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    logger_1.logger.info('Main window created');
    return mainWindow;
};
exports.createMainWindow = createMainWindow;
const getMainWindow = () => mainWindow;
exports.getMainWindow = getMainWindow;
const showMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
    }
    else {
        (0, exports.createMainWindow)();
    }
};
exports.showMainWindow = showMainWindow;
const hideMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
    }
};
exports.hideMainWindow = hideMainWindow;
