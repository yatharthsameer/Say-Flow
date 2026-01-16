import { TranscriptionResponse } from '../../shared/types';
export interface UploadTranscriptionParams {
    audioPath: string;
    durationMs: number;
    audioFormat: 'webm';
    language: string;
    idempotencyKey: string;
    provider?: string;
    model?: string;
}
export interface UploadResult {
    success: boolean;
    data?: TranscriptionResponse;
    error?: string;
}
export declare const uploadTranscription: (params: UploadTranscriptionParams) => Promise<UploadResult>;
export declare const fetchStats: (range?: "today" | "7d" | "30d") => Promise<unknown>;
//# sourceMappingURL=backendClient.d.ts.map