import { useCallback, useEffect, useState } from 'react';
import type { AdminOverviewResponse } from '../../shared/api';
import { getAdminOverview } from '../services/admin-api';

export function useAdminOverview() {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal, background = false) => {
    if (!background) setLoading(true);
    try {
      const result = await getAdminOverview(signal);
      setOverview(result);
      setError('');
      return result;
    } catch (requestError) {
      if (signal?.aborted) return null;
      const message = requestError instanceof Error ? requestError.message : 'Could not load note management.';
      setError(message);
      throw requestError;
    } finally {
      if (!signal?.aborted && !background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (overview?.index.state !== 'indexing') return;
    const controller = new AbortController();
    let refreshing = false;
    const timer = window.setInterval(() => {
      if (refreshing) return;
      refreshing = true;
      void refresh(controller.signal, true)
        .catch(() => undefined)
        .finally(() => {
          refreshing = false;
        });
    }, 900);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [overview?.index.state, refresh]);

  return { overview, loading, error, refresh };
}
