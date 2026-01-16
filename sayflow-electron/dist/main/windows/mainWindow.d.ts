import { BrowserWindow } from 'electron';
export declare const createMainWindow: () => BrowserWindow;
export declare const getMainWindow: () => BrowserWindow | null;
export declare const showMainWindow: () => void;
export declare const hideMainWindow: () => void;
declare global {
    var isQuitting: boolean;
}
//# sourceMappingURL=mainWindow.d.ts.map