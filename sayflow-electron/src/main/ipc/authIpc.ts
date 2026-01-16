import { ipcMain } from 'electron';
import {
  storeSession,
  getSession,
  clearSession,
  getAccessToken,
  updateAccessToken,
  StoredSession,
} from '../services/supabaseSession';
import { logger } from '../util/logger';

export const registerAuthIpc = (): void => {
  // Store session tokens
  ipcMain.handle('auth:store-session', async (_, session: StoredSession) => {
    try {
      await storeSession(session);
      return { success: true };
    } catch (error) {
      logger.error('IPC auth:store-session failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Get stored session
  ipcMain.handle('auth:get-session', async () => {
    try {
      const session = await getSession();
      return { success: true, session };
    } catch (error) {
      logger.error('IPC auth:get-session failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Clear session (logout)
  ipcMain.handle('auth:clear-session', async () => {
    try {
      await clearSession();
      return { success: true };
    } catch (error) {
      logger.error('IPC auth:clear-session failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Get access token only
  ipcMain.handle('auth:get-access-token', async () => {
    try {
      const token = await getAccessToken();
      return { success: true, token };
    } catch (error) {
      logger.error('IPC auth:get-access-token failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Update access token (after refresh)
  ipcMain.handle('auth:update-access-token', async (_, token: string) => {
    try {
      await updateAccessToken(token);
      return { success: true };
    } catch (error) {
      logger.error('IPC auth:update-access-token failed', error);
      return { success: false, error: String(error) };
    }
  });

  logger.info('Auth IPC handlers registered');
};
