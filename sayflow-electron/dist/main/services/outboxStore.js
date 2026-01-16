"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutboxItem = exports.getFailedItems = exports.deleteOutboxItem = exports.updateOutboxItem = exports.addOutboxItem = exports.getOutboxItems = void 0;
const fs_1 = __importDefault(require("fs"));
const paths_1 = require("../util/paths");
const logger_1 = require("../util/logger");
const MAX_ITEMS = 50;
const readOutbox = () => {
    const outboxPath = (0, paths_1.getOutboxPath)();
    try {
        if (fs_1.default.existsSync(outboxPath)) {
            const data = fs_1.default.readFileSync(outboxPath, 'utf-8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to read outbox', error);
    }
    return { items: [] };
};
const writeOutbox = (state) => {
    const outboxPath = (0, paths_1.getOutboxPath)();
    try {
        fs_1.default.writeFileSync(outboxPath, JSON.stringify(state, null, 2), 'utf-8');
    }
    catch (error) {
        logger_1.logger.error('Failed to write outbox', error);
        throw error;
    }
};
const getOutboxItems = () => {
    return readOutbox().items;
};
exports.getOutboxItems = getOutboxItems;
const addOutboxItem = (item) => {
    const state = readOutbox();
    state.items.unshift(item);
    // Enforce max items limit
    if (state.items.length > MAX_ITEMS) {
        state.items = state.items.slice(0, MAX_ITEMS);
    }
    writeOutbox(state);
    logger_1.logger.info('Outbox item added', { id: item.id });
};
exports.addOutboxItem = addOutboxItem;
const updateOutboxItem = (id, updates) => {
    const state = readOutbox();
    const index = state.items.findIndex((item) => item.id === id);
    if (index === -1) {
        logger_1.logger.warn('Outbox item not found', { id });
        return null;
    }
    state.items[index] = { ...state.items[index], ...updates };
    writeOutbox(state);
    logger_1.logger.info('Outbox item updated', { id, updates });
    return state.items[index];
};
exports.updateOutboxItem = updateOutboxItem;
const deleteOutboxItem = (id) => {
    const state = readOutbox();
    const initialLength = state.items.length;
    state.items = state.items.filter((item) => item.id !== id);
    if (state.items.length < initialLength) {
        writeOutbox(state);
        logger_1.logger.info('Outbox item deleted', { id });
        return true;
    }
    return false;
};
exports.deleteOutboxItem = deleteOutboxItem;
const getFailedItems = () => {
    return readOutbox().items.filter((item) => item.status === 'failed');
};
exports.getFailedItems = getFailedItems;
const getOutboxItem = (id) => {
    return readOutbox().items.find((item) => item.id === id);
};
exports.getOutboxItem = getOutboxItem;
