import { OutboxItem } from '../../shared/types';
export declare const getOutboxItems: () => OutboxItem[];
export declare const addOutboxItem: (item: OutboxItem) => void;
export declare const updateOutboxItem: (id: string, updates: Partial<OutboxItem>) => OutboxItem | null;
export declare const deleteOutboxItem: (id: string) => boolean;
export declare const getFailedItems: () => OutboxItem[];
export declare const getOutboxItem: (id: string) => OutboxItem | undefined;
//# sourceMappingURL=outboxStore.d.ts.map