import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../services/store';
import { CronRunRecord } from '../types';

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
      const result = await state.client.getCronRunHistory(jobId);
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
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

