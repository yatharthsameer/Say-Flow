"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStats = exports.uploadTranscription = void 0;
const electron_1 = require("electron");
const multipart_1 = require("../util/multipart");
const supabaseSession_1 = require("./supabaseSession");
const logger_1 = require("../util/logger");
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
logger_1.logger.info('Backend client initialized', { apiBaseUrl: API_BASE_URL });
const uploadTranscription = async (params) => {
    const tokenStart = Date.now();
    const accessToken = await (0, supabaseSession_1.getAccessToken)();
    logger_1.logger.info('⏱️ TIMING: Get access token', { ms: Date.now() - tokenStart });
    if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
    }
    try {
        const formDataStart = Date.now();
        const { body, contentType } = await (0, multipart_1.createMultipartFormData)({
            audioPath: params.audioPath,
            durationMs: params.durationMs,
            audioFormat: params.audioFormat,
            language: params.language,
            provider: params.provider,
            model: params.model,
        });
        logger_1.logger.info('⏱️ TIMING: Create multipart form data', {
            ms: Date.now() - formDataStart,
            provider: params.provider,
            model: params.model,
        });
        // Use Electron's net.fetch for proper main process networking
        const fetchStart = Date.now();
        const response = await electron_1.net.fetch(`${API_BASE_URL}/v1/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': contentType,
                'Idempotency-Key': params.idempotencyKey,
            },
            body,
        });
        logger_1.logger.info('⏱️ TIMING: net.fetch response received', { ms: Date.now() - fetchStart });
        if (!response.ok) {
            const errorText = await response.text();
            logger_1.logger.error('Backend upload failed', { status: response.status, error: errorText });
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }
        const parseStart = Date.now();
        const data = (await response.json());
        logger_1.logger.info('⏱️ TIMING: Parse JSON response', { ms: Date.now() - parseStart });
        logger_1.logger.info('Transcription uploaded successfully', { id: data.id });
        return { success: true, data };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';
        logger_1.logger.error('Backend upload error', {
            error: errorMessage,
            stack: errorStack,
            url: `${API_BASE_URL}/v1/transcriptions`
        });
        return { success: false, error: errorMessage };
    }
};
exports.uploadTranscription = uploadTranscription;
const fetchStats = async (range = 'today') => {
    const accessToken = await (0, supabaseSession_1.getAccessToken)();
    if (!accessToken) {
        return null;
    }
    try {
        const response = await electron_1.net.fetch(`${API_BASE_URL}/v1/stats?range=${range}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            return null;
        }
        return await response.json();
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch stats', error);
        return null;
    }
};
exports.fetchStats = fetchStats;
