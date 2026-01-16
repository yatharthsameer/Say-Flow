"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMultipartFormData = exports.buildMultipartBody = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const buildMultipartBody = (fields, boundary) => {
    const parts = [];
    for (const field of fields) {
        let header = `--${boundary}\r\n`;
        if (field.filename) {
            header += `Content-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\n`;
            header += `Content-Type: ${field.contentType || 'application/octet-stream'}\r\n`;
        }
        else {
            header += `Content-Disposition: form-data; name="${field.name}"\r\n`;
        }
        header += '\r\n';
        parts.push(Buffer.from(header, 'utf-8'));
        parts.push(Buffer.isBuffer(field.value) ? field.value : Buffer.from(field.value, 'utf-8'));
        parts.push(Buffer.from('\r\n', 'utf-8'));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
    return Buffer.concat(parts);
};
exports.buildMultipartBody = buildMultipartBody;
const createMultipartFormData = async (params) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const audioBuffer = fs_1.default.readFileSync(params.audioPath);
    const filename = path_1.default.basename(params.audioPath);
    const fields = [
        {
            name: 'audio',
            value: audioBuffer,
            filename,
            contentType: 'audio/webm',
        },
        { name: 'duration_ms', value: String(params.durationMs) },
        { name: 'audio_format', value: params.audioFormat },
        { name: 'language', value: params.language },
    ];
    // Add provider and model if specified
    if (params.provider) {
        fields.push({ name: 'provider', value: params.provider });
    }
    if (params.model) {
        fields.push({ name: 'model', value: params.model });
    }
    const body = (0, exports.buildMultipartBody)(fields, boundary);
    return {
        body,
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
};
exports.createMultipartFormData = createMultipartFormData;
