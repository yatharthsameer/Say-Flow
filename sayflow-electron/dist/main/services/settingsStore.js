"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSettings = exports.getSettings = exports.updateSettings = exports.saveSettings = exports.loadSettings = void 0;
const fs_1 = __importDefault(require("fs"));
const types_1 = require("../../shared/types");
const paths_1 = require("../util/paths");
const logger_1 = require("../util/logger");
let cachedSettings = null;
const loadSettings = () => {
    if (cachedSettings) {
        return cachedSettings;
    }
    const settingsPath = (0, paths_1.getSettingsPath)();
    try {
        if (fs_1.default.existsSync(settingsPath)) {
            const data = fs_1.default.readFileSync(settingsPath, 'utf-8');
            const loaded = { ...types_1.DEFAULT_SETTINGS, ...JSON.parse(data) };
            cachedSettings = loaded;
            logger_1.logger.info('Settings loaded');
            return loaded;
        }
    }
    catch (error) {
        logger_1.logger.error('Failed to load settings', error);
    }
    const defaults = { ...types_1.DEFAULT_SETTINGS };
    cachedSettings = defaults;
    (0, exports.saveSettings)(defaults);
    return defaults;
};
exports.loadSettings = loadSettings;
const saveSettings = (settings) => {
    const settingsPath = (0, paths_1.getSettingsPath)();
    try {
        fs_1.default.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        cachedSettings = settings;
        logger_1.logger.info('Settings saved');
    }
    catch (error) {
        logger_1.logger.error('Failed to save settings', error);
        throw error;
    }
};
exports.saveSettings = saveSettings;
const updateSettings = (updates) => {
    const current = (0, exports.loadSettings)();
    const updated = { ...current, ...updates };
    (0, exports.saveSettings)(updated);
    return updated;
};
exports.updateSettings = updateSettings;
const getSettings = () => {
    return (0, exports.loadSettings)();
};
exports.getSettings = getSettings;
const resetSettings = () => {
    cachedSettings = null;
    (0, exports.saveSettings)({ ...types_1.DEFAULT_SETTINGS });
    return (0, exports.loadSettings)();
};
exports.resetSettings = resetSettings;
