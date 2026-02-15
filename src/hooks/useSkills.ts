import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { Skill } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds

export function useSkills() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<Skill[]> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getSkills();
  }, [state.client]);

  return usePolling<Skill[]>(fetcher, POLL_INTERVAL);
}

