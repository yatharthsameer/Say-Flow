import { BrowserWindow } from 'electron';
export declare const createWidgetWindow: () => BrowserWindow;
export declare const getWidgetWindow: () => BrowserWindow | null;
export declare const updateWidgetPosition: (x: number, y: number) => void;
export declare const sendToWidget: (channel: string, ...args: unknown[]) => void;
//# sourceMappingURL=widgetWindow.d.ts.map