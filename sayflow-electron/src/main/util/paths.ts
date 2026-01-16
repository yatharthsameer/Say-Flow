import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export const getUserDataPath = (): string => {
  return app.getPath('userData');
};

export const getRecordingsPath = (): string => {
  const recordingsPath = path.join(getUserDataPath(), 'recordings');
  if (!fs.existsSync(recordingsPath)) {
    fs.mkdirSync(recordingsPath, { recursive: true });
  }
  return recordingsPath;
};

export const getOutboxPath = (): string => {
  return path.join(getUserDataPath(), 'outbox.json');
};

export const getSettingsPath = (): string => {
  return path.join(getUserDataPath(), 'settings.json');
};

export const getAudioFilePath = (id: string): string => {
  return path.join(getRecordingsPath(), `${id}.webm`);
};
