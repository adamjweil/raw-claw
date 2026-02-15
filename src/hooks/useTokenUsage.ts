import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { TokenUsage } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds

export function useTokenUsage() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<TokenUsage> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getTokenUsage();
  }, [state.client]);

  return usePolling<TokenUsage>(fetcher, POLL_INTERVAL);
}

