export interface HotkeyConfig {
    keyCode: number;
    modifiers: {
        alt: boolean;
        ctrl: boolean;
        meta: boolean;
        shift: boolean;
    };
    displayName: string;
}
export type TranscriptionProvider = 'gemini' | 'openai';
export type TranscriptionMode = 'standard' | 'realtime';
export interface TranscriptionModelConfig {
    provider: TranscriptionProvider;
    model: string;
    mode: TranscriptionMode;
}
export interface Settings {
    language: string;
    hotkey: HotkeyConfig;
    autoPaste: boolean;
    restoreClipboard: boolean;
    widgetPosition?: {
        x: number;
        y: number;
    };
    transcription: TranscriptionModelConfig;
}
export declare const PROVIDER_MODELS: Record<TranscriptionProvider, {
    value: string;
    label: string;
}[]>;
export declare const REALTIME_MODELS: {
    value: string;
    label: string;
}[];
export declare const TRANSCRIPTION_MODES: {
    value: TranscriptionMode;
    label: string;
    description: string;
}[];
export declare const UIOHOOK_KEYCODES: {
    readonly SPACE: 57;
    readonly ESCAPE: 1;
    readonly C: 46;
    readonly LEFT_SHIFT: 42;
    readonly RIGHT_SHIFT: 54;
    readonly F1: 59;
    readonly F2: 60;
    readonly F3: 61;
    readonly F4: 62;
    readonly F5: 63;
    readonly F6: 64;
    readonly F7: 65;
    readonly F8: 66;
    readonly F9: 67;
    readonly F10: 68;
    readonly F11: 87;
    readonly F12: 88;
};
export declare const DEFAULT_SETTINGS: Settings;
//# sourceMappingURL=settings.d.ts.map