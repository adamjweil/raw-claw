import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Message, CronJob, Skill, GatewayStatus, GatewayConfig } from '../types';
import { GatewayClient } from './gateway';

interface AppState {
  config: GatewayConfig;
  connected: boolean;
  status: GatewayStatus | null;
  messages: Message[];
  cronJobs: CronJob[];
  skills: Skill[];
  client: GatewayClient | null;
}

type Action =
  | { type: 'SET_CONFIG'; config: GatewayConfig }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_STATUS'; status: GatewayStatus }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_CRON_JOBS'; cronJobs: CronJob[] }
  | { type: 'SET_SKILLS'; skills: Skill[] }
  | { type: 'SET_CLIENT'; client: GatewayClient };

const initialState: AppState = {
  config: { url: 'http://localhost:3000', token: '' },
  connected: false,
  status: null,
  messages: [],
  cronJobs: [],
  skills: [],
  client: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.config };
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };
    case 'SET_STATUS':
      return { ...state, status: action.status, connected: true };
    case 'ADD_MESSAGE':
      return { ...state, messages: [action.message, ...state.messages] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages };
    case 'SET_CRON_JOBS':
      return { ...state, cronJobs: action.cronJobs };
    case 'SET_SKILLS':
      return { ...state, skills: action.skills };
    case 'SET_CLIENT':
      return { ...state, client: action.client };
    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadConfig: () => Promise<void>;
  saveConfig: (config: GatewayConfig) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadConfig = useCallback(async () => {
    try {
      const url = await SecureStore.getItemAsync('gateway_url');
      const token = await SecureStore.getItemAsync('gateway_token');
      if (url || token) {
        const config = { url: url || 'http://localhost:3000', token: token || '' };
        dispatch({ type: 'SET_CONFIG', config });
        if (config.token) {
          const client = new GatewayClient(config.url, config.token);
          dispatch({ type: 'SET_CLIENT', client });
        }
      }
    } catch {}
  }, []);

  const saveConfig = useCallback(async (config: GatewayConfig) => {
    await SecureStore.setItemAsync('gateway_url', config.url);
    await SecureStore.setItemAsync('gateway_token', config.token);
    dispatch({ type: 'SET_CONFIG', config });
    const client = new GatewayClient(config.url, config.token);
    dispatch({ type: 'SET_CLIENT', client });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return React.createElement(
    StoreContext.Provider,
    { value: { state, dispatch, loadConfig, saveConfig } },
    children
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
