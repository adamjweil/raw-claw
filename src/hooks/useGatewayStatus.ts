import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { GatewayStatus } from '../types';

const POLL_INTERVAL = 30000; // 30 seconds

export function useGatewayStatus() {
  const { state } = useStore();

  const fetcher = useCallback(async (): Promise<GatewayStatus> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getStatus();
  }, [state.client]);

  return usePolling<GatewayStatus>(fetcher, POLL_INTERVAL);
}

