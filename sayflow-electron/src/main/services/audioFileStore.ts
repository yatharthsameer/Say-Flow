import fs from 'fs';
import path from 'path';
import { getAudioFilePath, getRecordingsPath } from '../util/paths';
import { generateUUID } from '../util/uuid';
import { logger } from '../util/logger';

export interface SaveAudioResult {
  id: string;
  audioPath: string;
}

export const saveAudioFile = (audioBuffer: Buffer): SaveAudioResult => {
  const id = generateUUID();
  const audioPath = getAudioFilePath(id);

  // Ensure recordings directory exists
  getRecordingsPath();

  fs.writeFileSync(audioPath, audioBuffer);
  logger.info('Audio file saved', { id, audioPath, size: audioBuffer.length });

  return { id, audioPath };
};

export const deleteAudioFile = (audioPath: string): boolean => {
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      logger.info('Audio file deleted', { audioPath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to delete audio file', { audioPath, error });
    return false;
  }
};

export const getAudioFileSize = (audioPath: string): number => {
  try {
    const stats = fs.statSync(audioPath);
    return stats.size;
  } catch (error) {
    return 0;
  }
};

export const audioFileExists = (audioPath: string): boolean => {
  return fs.existsSync(audioPath);
};
