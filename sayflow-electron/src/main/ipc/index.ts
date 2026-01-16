import { registerAuthIpc } from './authIpc';
import { registerOutboxIpc } from './outboxIpc';
import { registerRecordingIpc } from './recordingIpc';
import { registerSettingsIpc } from './settingsIpc';
import { registerRealtimeIpc } from './realtimeIpc';
import { logger } from '../util/logger';

export const registerAllIpcHandlers = (): void => {
  registerAuthIpc();
  registerOutboxIpc();
  registerRecordingIpc();
  registerSettingsIpc();
  registerRealtimeIpc();
  logger.info('All IPC handlers registered');
};
