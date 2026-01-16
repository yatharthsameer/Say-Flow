export type OutboxStatus = 'pending' | 'success' | 'failed';
export interface OutboxItem {
    id: string;
    createdAt: string;
    audioPath: string;
    durationMs: number;
    audioFormat: 'webm';
    language: string;
    status: OutboxStatus;
    transcriptText?: string;
    lastError?: string;
    lastAttemptAt?: string;
}
export interface OutboxState {
    items: OutboxItem[];
}
//# sourceMappingURL=outbox.d.ts.map