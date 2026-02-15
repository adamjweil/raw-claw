import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { PairedNode } from '../types';

const POLL_INTERVAL = 60000; // 60 seconds

export function usePairedNodes() {
  const { state } = useStore();
  const connected = state.connected;

  const fetcher = useCallback(async (): Promise<PairedNode[]> => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getPairedNodes();
  }, [state.client]);

  const { data: gatewayNodes, loading, error, refresh } = usePolling<PairedNode[]>(fetcher, POLL_INTERVAL);

  // Build synthetic nodes from known info + merge real gateway nodes
  const nodes = useMemo<PairedNode[]>(() => {
    const result: PairedNode[] = [];

    // 1. Gateway host (the computer running OpenClaw)
    let hostLabel = 'Gateway Host';
    try {
      const urlObj = new URL(state.config.url);
      const hostname = urlObj.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        hostLabel = 'This Mac';
      } else {
        hostLabel = hostname;
      }
    } catch {
      // keep default label
    }
    result.push({
      id: '_gateway_host',
      name: hostLabel,
      type: 'Mac',
      status: connected ? 'online' : 'offline',
      lastSeen: new Date().toISOString(),
    });

    // 2. This device (the phone / tablet running RawClaw)
    const platformName =
      Platform.OS === 'ios'
        ? 'iPhone'
        : Platform.OS === 'android'
        ? 'Android'
        : Platform.OS;
    result.push({
      id: '_this_device',
      name: 'RawClaw Mobile',
      type: platformName,
      status: 'online',
      lastSeen: new Date().toISOString(),
    });

    // 3. Merge any real nodes from the gateway (deduplicate by id)
    const syntheticIds = new Set(result.map((n) => n.id));
    if (gatewayNodes) {
      for (const gn of gatewayNodes) {
        if (!syntheticIds.has(gn.id)) {
          result.push(gn);
        }
      }
    }

    return result;
  }, [connected, state.config.url, gatewayNodes]);

  return { nodes, loading, error, refresh };
}

