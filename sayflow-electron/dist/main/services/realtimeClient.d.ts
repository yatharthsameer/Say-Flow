/**
 * Realtime Transcription Client
 *
 * WebSocket client for streaming audio to the backend for real-time transcription
 * via OpenAI's Realtime API.
 */
export interface RealtimeTranscriptEvent {
    type: 'session_ready' | 'transcript_delta' | 'transcript_completed' | 'transcript_final' | 'speech_started' | 'speech_stopped' | 'error';
    delta?: string;
    transcript?: string;
    error?: string;
}
export interface RealtimeClientOptions {
    model?: string;
    language?: string;
    onTranscript?: (event: RealtimeTranscriptEvent) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}
export declare class RealtimeTranscriptionClient {
    private ws;
    private options;
    private isConnected;
    private accumulatedTranscript;
    private connectPromise;
    private resolveConnect;
    private rejectConnect;
    constructor(options?: RealtimeClientOptions);
    /**
     * Connect to the backend WebSocket for realtime transcription
     */
    connect(): Promise<void>;
    /**
     * Handle incoming messages from the WebSocket
     */
    private handleMessage;
    /**
     * Send an audio chunk to the backend
     * @param pcmData - PCM audio data as Int16Array or Buffer
     */
    sendAudioChunk(pcmData: Int16Array | Buffer): void;
    /**
     * Commit the audio buffer to signal end of speech
     * Returns the final accumulated transcript
     */
    commit(): Promise<string>;
    /**
     * Cancel the current transcription session
     */
    cancel(): void;
    /**
     * Close the WebSocket connection
     */
    close(): void;
    /**
     * Get the current accumulated transcript
     */
    getTranscript(): string;
    /**
     * Check if currently connected
     */
    get connected(): boolean;
}
/**
 * Get or create a realtime transcription client
 */
export declare function getRealtimeClient(options?: RealtimeClientOptions): RealtimeTranscriptionClient;
/**
 * Reset the realtime client (e.g., when settings change)
 */
export declare function resetRealtimeClient(): void;
//# sourceMappingURL=realtimeClient.d.ts.map