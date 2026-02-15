import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../services/store';
import { CronRunRecord } from '../types';
import { getLocalRunHistory, mergeRunHistory } from '../services/runHistoryStore';

interface UseCronRunHistoryResult {
  data: CronRunRecord[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCronRunHistory(jobId: string): UseCronRunHistoryResult {
  const { state } = useStore();
  const [data, setData] = useState<CronRunRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!state.client || !jobId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch whatever the gateway returns (may be empty or partial)
      const gatewayRuns = await state.client.getCronRunHistory(jobId);

      // Merge gateway runs with locally persisted history
      const merged = await mergeRunHistory(jobId, gatewayRuns);

      if (mountedRef.current) {
        setData(merged);
        setLoading(false);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        // Even if the gateway call fails, try to show local history
        try {
          const localRuns = await getLocalRunHistory(jobId);
          if (localRuns.length > 0) {
            setData(localRuns);
            setLoading(false);
            return;
          }
        } catch {
          // ignore local read failure
        }

        const message =
          e instanceof Error
            ? e.message
            : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load run history';
        setError(message);
        setLoading(false);
      }
    }
  }, [state.client, jobId]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => {
      mountedRef.current = false;
    };
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
