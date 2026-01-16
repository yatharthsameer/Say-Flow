"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthIpc = void 0;
const electron_1 = require("electron");
const supabaseSession_1 = require("../services/supabaseSession");
const logger_1 = require("../util/logger");
const registerAuthIpc = () => {
    // Store session tokens
    electron_1.ipcMain.handle('auth:store-session', async (_, session) => {
        try {
            await (0, supabaseSession_1.storeSession)(session);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('IPC auth:store-session failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Get stored session
    electron_1.ipcMain.handle('auth:get-session', async () => {
        try {
            const session = await (0, supabaseSession_1.getSession)();
            return { success: true, session };
        }
        catch (error) {
            logger_1.logger.error('IPC auth:get-session failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Clear session (logout)
    electron_1.ipcMain.handle('auth:clear-session', async () => {
        try {
            await (0, supabaseSession_1.clearSession)();
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('IPC auth:clear-session failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Get access token only
    electron_1.ipcMain.handle('auth:get-access-token', async () => {
        try {
            const token = await (0, supabaseSession_1.getAccessToken)();
            return { success: true, token };
        }
        catch (error) {
            logger_1.logger.error('IPC auth:get-access-token failed', error);
            return { success: false, error: String(error) };
        }
    });
    // Update access token (after refresh)
    electron_1.ipcMain.handle('auth:update-access-token', async (_, token) => {
        try {
            await (0, supabaseSession_1.updateAccessToken)(token);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('IPC auth:update-access-token failed', error);
            return { success: false, error: String(error) };
        }
    });
    logger_1.logger.info('Auth IPC handlers registered');
};
exports.registerAuthIpc = registerAuthIpc;
