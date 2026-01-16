"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllIpcHandlers = void 0;
const authIpc_1 = require("./authIpc");
const outboxIpc_1 = require("./outboxIpc");
const recordingIpc_1 = require("./recordingIpc");
const settingsIpc_1 = require("./settingsIpc");
const realtimeIpc_1 = require("./realtimeIpc");
const logger_1 = require("../util/logger");
const registerAllIpcHandlers = () => {
    (0, authIpc_1.registerAuthIpc)();
    (0, outboxIpc_1.registerOutboxIpc)();
    (0, recordingIpc_1.registerRecordingIpc)();
    (0, settingsIpc_1.registerSettingsIpc)();
    (0, realtimeIpc_1.registerRealtimeIpc)();
    logger_1.logger.info('All IPC handlers registered');
};
exports.registerAllIpcHandlers = registerAllIpcHandlers;
