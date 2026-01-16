import React, { useEffect, useState, useCallback } from 'react';
import { ipcClient } from '../../services/ipcClient';
import { OutboxItem } from '../../../shared/types';
import { Button, Card, useToast } from '../../components';

export const HomePage: React.FC = () => {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  const loadItems = useCallback(async () => {
    const result = await ipcClient.outbox.getItems();
    if (result.success && result.items) {
      setItems(result.items);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadItems();

    // Refresh on recording events
    const unsubSuccess = window.electronAPI.onRecordingSuccess(() => loadItems());
    const unsubError = window.electronAPI.onRecordingError(() => loadItems());

    return () => {
      unsubSuccess();
      unsubError();
    };
  }, [loadItems]);

  const handleCopy = async (id: string) => {
    const result = await ipcClient.outbox.copyTranscript(id);
    if (result.success) {
      showToast('Copied to clipboard', 'success');
    } else {
      showToast('Failed to copy', 'error');
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingIds((prev) => new Set(prev).add(id));
    const result = await ipcClient.outbox.retryItem(id);
    setRetryingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (result.success) {
      showToast('Transcription successful', 'success');
    } else {
      showToast(result.error || 'Retry failed', 'error');
    }
    loadItems();
  };

  const handleDelete = async (id: string) => {
    await ipcClient.outbox.deleteItem(id);
    loadItems();
    showToast('Item deleted', 'info');
  };

  const handleRetryAll = async () => {
    const failedItems = items.filter((item) => item.status === 'failed');
    if (failedItems.length === 0) return;

    failedItems.forEach((item) => {
      setRetryingIds((prev) => new Set(prev).add(item.id));
    });

    const result = await ipcClient.outbox.retryAll();
    setRetryingIds(new Set());

    if (result.success) {
      const successCount = result.results?.filter((r) => r.success).length || 0;
      showToast(`Retried ${successCount}/${failedItems.length} items`, 'info');
    } else {
      showToast('Retry all failed', 'error');
    }
    loadItems();
  };

  const failedCount = items.filter((item) => item.status === 'failed').length;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Transcriptions</h1>
        {failedCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleRetryAll}>
            Retry All ({failedCount})
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No transcriptions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Hold Option + Space to record, or click the widget
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.status === 'success'
                        ? 'Success'
                        : item.status === 'failed'
                        ? 'Failed'
                        : 'Pending'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(item.createdAt)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDuration(item.durationMs)}
                    </span>
                  </div>

                  {item.transcriptText ? (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {item.transcriptText}
                    </p>
                  ) : item.lastError ? (
                    <p className="text-sm text-red-600">{item.lastError}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Processing...</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {item.status === 'success' && item.transcriptText && (
                    <button
                      onClick={() => handleCopy(item.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  )}

                  {item.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(item.id)}
                      disabled={retryingIds.has(item.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Retry"
                    >
                      {retryingIds.has(item.id) ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
