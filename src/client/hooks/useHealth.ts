import { useCallback, useEffect, useState } from 'react';
import type { HealthResponse } from '../../shared/api';
import { getHealth, ingestNotes } from '../services/notes-api';

const HEALTH_SYNC_INTERVAL_MS = 2_000;

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [manualReindexing, setManualReindexing] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<HealthResponse | null> => {
    try {
      const result = await getHealth(signal);
      setHealth(result);
      setHealthError(false);
      return result;
    } catch (error) {
      if (signal?.aborted) return null;
      setHealthError(true);
      throw error;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let syncing = false;

    const sync = () => {
      if (syncing || document.visibilityState === 'hidden') return;
      syncing = true;
      void refresh(controller.signal)
        .catch(() => undefined)
        .finally(() => {
          syncing = false;
        });
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };

    sync();
    const timer = window.setInterval(sync, HEALTH_SYNC_INTERVAL_MS);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', syncWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, [refresh]);

  async function reindex(): Promise<void> {
    setManualReindexing(true);
    try {
      await ingestNotes();
      await refresh();
    } finally {
      setManualReindexing(false);
    }
  }

  const reindexing = manualReindexing || health?.indexState === 'indexing';
  return { health, healthError, reindexing, reindex };
}
