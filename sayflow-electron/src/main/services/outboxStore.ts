import fs from 'fs';
import { OutboxItem, OutboxState } from '../../shared/types';
import { getOutboxPath } from '../util/paths';
import { logger } from '../util/logger';

const MAX_ITEMS = 50;

const readOutbox = (): OutboxState => {
  const outboxPath = getOutboxPath();
  try {
    if (fs.existsSync(outboxPath)) {
      const data = fs.readFileSync(outboxPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Failed to read outbox', error);
  }
  return { items: [] };
};

const writeOutbox = (state: OutboxState): void => {
  const outboxPath = getOutboxPath();
  try {
    fs.writeFileSync(outboxPath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to write outbox', error);
    throw error;
  }
};

export const getOutboxItems = (): OutboxItem[] => {
  return readOutbox().items;
};

export const addOutboxItem = (item: OutboxItem): void => {
  const state = readOutbox();
  state.items.unshift(item);
  
  // Enforce max items limit
  if (state.items.length > MAX_ITEMS) {
    state.items = state.items.slice(0, MAX_ITEMS);
  }
  
  writeOutbox(state);
  logger.info('Outbox item added', { id: item.id });
};

export const updateOutboxItem = (id: string, updates: Partial<OutboxItem>): OutboxItem | null => {
  const state = readOutbox();
  const index = state.items.findIndex((item) => item.id === id);
  
  if (index === -1) {
    logger.warn('Outbox item not found', { id });
    return null;
  }
  
  state.items[index] = { ...state.items[index], ...updates };
  writeOutbox(state);
  logger.info('Outbox item updated', { id, updates });
  
  return state.items[index];
};

export const deleteOutboxItem = (id: string): boolean => {
  const state = readOutbox();
  const initialLength = state.items.length;
  state.items = state.items.filter((item) => item.id !== id);
  
  if (state.items.length < initialLength) {
    writeOutbox(state);
    logger.info('Outbox item deleted', { id });
    return true;
  }
  
  return false;
};

export const getFailedItems = (): OutboxItem[] => {
  return readOutbox().items.filter((item) => item.status === 'failed');
};

export const getOutboxItem = (id: string): OutboxItem | undefined => {
  return readOutbox().items.find((item) => item.id === id);
};
