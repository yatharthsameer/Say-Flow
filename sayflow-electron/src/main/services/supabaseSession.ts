import keytar from 'keytar';
import { logger } from '../util/logger';

const SERVICE_NAME = 'sayflow';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export const storeSession = async (session: StoredSession): Promise<void> => {
  try {
    await keytar.setPassword(SERVICE_NAME, ACCESS_TOKEN_KEY, session.accessToken);
    await keytar.setPassword(SERVICE_NAME, REFRESH_TOKEN_KEY, session.refreshToken);
    logger.info('Session stored securely');
  } catch (error) {
    logger.error('Failed to store session', error);
    throw error;
  }
};

export const getSession = async (): Promise<StoredSession | null> => {
  try {
    const accessToken = await keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
    const refreshToken = await keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_KEY);

    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  } catch (error) {
    logger.error('Failed to get session', error);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    await keytar.deletePassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
    await keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_KEY);
    logger.info('Session cleared');
  } catch (error) {
    logger.error('Failed to clear session', error);
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
  } catch (error) {
    logger.error('Failed to get access token', error);
    return null;
  }
};

export const updateAccessToken = async (accessToken: string): Promise<void> => {
  try {
    await keytar.setPassword(SERVICE_NAME, ACCESS_TOKEN_KEY, accessToken);
    logger.debug('Access token updated');
  } catch (error) {
    logger.error('Failed to update access token', error);
    throw error;
  }
};
