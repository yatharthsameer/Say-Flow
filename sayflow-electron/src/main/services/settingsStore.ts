import fs from 'fs';
import { Settings, DEFAULT_SETTINGS } from '../../shared/types';
import { getSettingsPath } from '../util/paths';
import { logger } from '../util/logger';

let cachedSettings: Settings | null = null;

export const loadSettings = (): Settings => {
  if (cachedSettings) {
    return cachedSettings;
  }

  const settingsPath = getSettingsPath();
  
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(data) } as Settings;
      cachedSettings = loaded;
      logger.info('Settings loaded');
      return loaded;
    }
  } catch (error) {
    logger.error('Failed to load settings', error);
  }

  const defaults = { ...DEFAULT_SETTINGS };
  cachedSettings = defaults;
  saveSettings(defaults);
  return defaults;
};

export const saveSettings = (settings: Settings): void => {
  const settingsPath = getSettingsPath();
  
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    cachedSettings = settings;
    logger.info('Settings saved');
  } catch (error) {
    logger.error('Failed to save settings', error);
    throw error;
  }
};

export const updateSettings = (updates: Partial<Settings>): Settings => {
  const current = loadSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
};

export const getSettings = (): Settings => {
  return loadSettings();
};

export const resetSettings = (): Settings => {
  cachedSettings = null;
  saveSettings({ ...DEFAULT_SETTINGS });
  return loadSettings();
};
