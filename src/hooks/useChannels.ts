import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { Channel } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds

export function useChannels() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<Channel[]> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getChannels();
  }, [state.client]);

  return usePolling<Channel[]>(fetcher, POLL_INTERVAL);
}

