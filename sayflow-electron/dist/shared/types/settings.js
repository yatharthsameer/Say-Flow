"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = exports.UIOHOOK_KEYCODES = exports.TRANSCRIPTION_MODES = exports.REALTIME_MODELS = exports.PROVIDER_MODELS = void 0;
// Available models per provider (standard mode)
exports.PROVIDER_MODELS = {
    gemini: [
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Default)' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
    openai: [
        { value: 'gpt-4o-mini-transcribe', label: 'GPT-4o Mini Transcribe (Default)' },
        { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe' },
        { value: 'whisper-1', label: 'Whisper v1' },
    ],
};
// Models that support realtime streaming (OpenAI only for now)
// These use the Realtime API with gpt-4o-*-realtime-preview models
exports.REALTIME_MODELS = [
    { value: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o Mini Realtime (Faster)' },
    { value: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime (Higher Quality)' },
];
// Mode options
exports.TRANSCRIPTION_MODES = [
    {
        value: 'standard',
        label: 'Standard',
        description: 'Record complete audio, then transcribe (5-6s latency)'
    },
    {
        value: 'realtime',
        label: 'Realtime',
        description: 'Stream audio for instant transcription (OpenAI only)'
    },
];
// uiohook-napi keycodes (different from browser keyCodes!)
// See: https://github.com/pjimenezmateo/uiohook-napi
exports.UIOHOOK_KEYCODES = {
    SPACE: 57,
    ESCAPE: 1,
    C: 46,
    LEFT_SHIFT: 42,
    RIGHT_SHIFT: 54,
    F1: 59,
    F2: 60,
    F3: 61,
    F4: 62,
    F5: 63,
    F6: 64,
    F7: 65,
    F8: 66,
    F9: 67,
    F10: 68,
    F11: 87,
    F12: 88,
};
exports.DEFAULT_SETTINGS = {
    language: 'en',
    hotkey: {
        keyCode: exports.UIOHOOK_KEYCODES.LEFT_SHIFT, // 42 in uiohook-napi
        modifiers: {
            alt: true,
            ctrl: false,
            meta: false,
            shift: false, // We detect Shift as the main key, not as a modifier
        },
        displayName: 'Option + Shift',
    },
    autoPaste: true,
    restoreClipboard: true,
    transcription: {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        mode: 'standard',
    },
};
