"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAudioFilePath = exports.getSettingsPath = exports.getOutboxPath = exports.getRecordingsPath = exports.getUserDataPath = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getUserDataPath = () => {
    return electron_1.app.getPath('userData');
};
exports.getUserDataPath = getUserDataPath;
const getRecordingsPath = () => {
    const recordingsPath = path_1.default.join((0, exports.getUserDataPath)(), 'recordings');
    if (!fs_1.default.existsSync(recordingsPath)) {
        fs_1.default.mkdirSync(recordingsPath, { recursive: true });
    }
    return recordingsPath;
};
exports.getRecordingsPath = getRecordingsPath;
const getOutboxPath = () => {
    return path_1.default.join((0, exports.getUserDataPath)(), 'outbox.json');
};
exports.getOutboxPath = getOutboxPath;
const getSettingsPath = () => {
    return path_1.default.join((0, exports.getUserDataPath)(), 'settings.json');
};
exports.getSettingsPath = getSettingsPath;
const getAudioFilePath = (id) => {
    return path_1.default.join((0, exports.getRecordingsPath)(), `${id}.webm`);
};
exports.getAudioFilePath = getAudioFilePath;
