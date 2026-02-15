import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { CronJob } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds

export function useCronJobs() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<CronJob[]> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getCronJobs();
  }, [state.client]);

  return usePolling<CronJob[]>(fetcher, POLL_INTERVAL);
}

