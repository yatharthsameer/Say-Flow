"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioFileExists = exports.getAudioFileSize = exports.deleteAudioFile = exports.saveAudioFile = void 0;
const fs_1 = __importDefault(require("fs"));
const paths_1 = require("../util/paths");
const uuid_1 = require("../util/uuid");
const logger_1 = require("../util/logger");
const saveAudioFile = (audioBuffer) => {
    const id = (0, uuid_1.generateUUID)();
    const audioPath = (0, paths_1.getAudioFilePath)(id);
    // Ensure recordings directory exists
    (0, paths_1.getRecordingsPath)();
    fs_1.default.writeFileSync(audioPath, audioBuffer);
    logger_1.logger.info('Audio file saved', { id, audioPath, size: audioBuffer.length });
    return { id, audioPath };
};
exports.saveAudioFile = saveAudioFile;
const deleteAudioFile = (audioPath) => {
    try {
        if (fs_1.default.existsSync(audioPath)) {
            fs_1.default.unlinkSync(audioPath);
            logger_1.logger.info('Audio file deleted', { audioPath });
            return true;
        }
        return false;
    }
    catch (error) {
        logger_1.logger.error('Failed to delete audio file', { audioPath, error });
        return false;
    }
};
exports.deleteAudioFile = deleteAudioFile;
const getAudioFileSize = (audioPath) => {
    try {
        const stats = fs_1.default.statSync(audioPath);
        return stats.size;
    }
    catch (error) {
        return 0;
    }
};
exports.getAudioFileSize = getAudioFileSize;
const audioFileExists = (audioPath) => {
    return fs_1.default.existsSync(audioPath);
};
exports.audioFileExists = audioFileExists;
