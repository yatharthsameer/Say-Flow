export interface SaveAudioResult {
    id: string;
    audioPath: string;
}
export declare const saveAudioFile: (audioBuffer: Buffer) => SaveAudioResult;
export declare const deleteAudioFile: (audioPath: string) => boolean;
export declare const getAudioFileSize: (audioPath: string) => number;
export declare const audioFileExists: (audioPath: string) => boolean;
//# sourceMappingURL=audioFileStore.d.ts.map