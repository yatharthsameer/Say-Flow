"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAccessToken = exports.getAccessToken = exports.clearSession = exports.getSession = exports.storeSession = void 0;
const keytar_1 = __importDefault(require("keytar"));
const logger_1 = require("../util/logger");
const SERVICE_NAME = 'sayflow';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const storeSession = async (session) => {
    try {
        await keytar_1.default.setPassword(SERVICE_NAME, ACCESS_TOKEN_KEY, session.accessToken);
        await keytar_1.default.setPassword(SERVICE_NAME, REFRESH_TOKEN_KEY, session.refreshToken);
        logger_1.logger.info('Session stored securely');
    }
    catch (error) {
        logger_1.logger.error('Failed to store session', error);
        throw error;
    }
};
exports.storeSession = storeSession;
const getSession = async () => {
    try {
        const accessToken = await keytar_1.default.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
        const refreshToken = await keytar_1.default.getPassword(SERVICE_NAME, REFRESH_TOKEN_KEY);
        if (accessToken && refreshToken) {
            return { accessToken, refreshToken };
        }
        return null;
    }
    catch (error) {
        logger_1.logger.error('Failed to get session', error);
        return null;
    }
};
exports.getSession = getSession;
const clearSession = async () => {
    try {
        await keytar_1.default.deletePassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
        await keytar_1.default.deletePassword(SERVICE_NAME, REFRESH_TOKEN_KEY);
        logger_1.logger.info('Session cleared');
    }
    catch (error) {
        logger_1.logger.error('Failed to clear session', error);
    }
};
exports.clearSession = clearSession;
const getAccessToken = async () => {
    try {
        return await keytar_1.default.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
    }
    catch (error) {
        logger_1.logger.error('Failed to get access token', error);
        return null;
    }
};
exports.getAccessToken = getAccessToken;
const updateAccessToken = async (accessToken) => {
    try {
        await keytar_1.default.setPassword(SERVICE_NAME, ACCESS_TOKEN_KEY, accessToken);
        logger_1.logger.debug('Access token updated');
    }
    catch (error) {
        logger_1.logger.error('Failed to update access token', error);
        throw error;
    }
};
exports.updateAccessToken = updateAccessToken;
