export interface PasteOptions {
    autoPaste: boolean;
    restoreClipboard: boolean;
}
export declare const pasteTranscript: (text: string, options: PasteOptions) => Promise<{
    copied: boolean;
    pasted: boolean;
}>;
export declare const copyToClipboard: (text: string) => boolean;
//# sourceMappingURL=pasteService.d.ts.map