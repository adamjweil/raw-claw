import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { ActivityEvent } from '../types';

const POLL_INTERVAL = 30000; // 30 seconds

export function useActivityFeed() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<ActivityEvent[]> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getActivityFeed();
  }, [state.client]);

  return usePolling<ActivityEvent[]>(fetcher, POLL_INTERVAL);
}

