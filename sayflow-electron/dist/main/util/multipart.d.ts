interface MultipartField {
    name: string;
    value: string | Buffer;
    filename?: string;
    contentType?: string;
}
export declare const buildMultipartBody: (fields: MultipartField[], boundary: string) => Buffer;
export interface TranscriptionFormParams {
    audioPath: string;
    durationMs: number;
    audioFormat: string;
    language: string;
    provider?: string;
    model?: string;
}
export declare const createMultipartFormData: (params: TranscriptionFormParams) => Promise<{
    body: Buffer;
    contentType: string;
}>;
export {};
//# sourceMappingURL=multipart.d.ts.map