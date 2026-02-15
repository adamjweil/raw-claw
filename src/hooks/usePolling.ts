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
 * Only polls when the gateway client exists and WebSocket is connected.
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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  // Keep fetcher ref up to date to avoid stale closures
  fetcherRef.current = fetcher;

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

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

  // Main polling effect — re-runs when the client is set or when WS connects
  useEffect(() => {
    mountedRef.current = true;
    clearTimers();

    if (!state.client) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Only fetch when WebSocket is actually connected (RPC requires open WS)
    if (!state.connected) {
      // Client exists but WS not yet connected — keep loading state
      setLoading(true);
      return () => {
        mountedRef.current = false;
        clearTimers();
      };
    }

    // WS is connected — fetch immediately
    setLoading(true);
    doFetch();

    // Set up polling
    intervalRef.current = setInterval(doFetch, intervalMs);

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [state.client, state.connected, intervalMs, doFetch, clearTimers]);

  return { data, loading, error, refresh };
}

