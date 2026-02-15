import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../services/store';

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Generic polling hook that calls a fetcher function at a given interval.
 * Only polls when the gateway client exists.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 60000
): UsePollingResult<T> {
  const { state } = useStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  // Keep fetcher ref up to date to avoid stale closures
  fetcherRef.current = fetcher;

  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLoading(false);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        const message = e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : 'Unknown error';
        setError(message);
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;

    if (!state.client) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Initial fetch
    doFetch();

    // Set up polling
    intervalRef.current = setInterval(doFetch, intervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.client, intervalMs, doFetch]);

  return { data, loading, error, refresh };
}

