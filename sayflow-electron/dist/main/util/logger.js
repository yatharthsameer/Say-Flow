"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const formatMessage = (level, message, data) => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
};
exports.logger = {
    debug: (message, data) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(formatMessage('debug', message, data));
        }
    },
    info: (message, data) => {
        console.log(formatMessage('info', message, data));
    },
    warn: (message, data) => {
        console.warn(formatMessage('warn', message, data));
    },
    error: (message, data) => {
        console.error(formatMessage('error', message, data));
    },
};
