import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Message, CronJob, Skill, GatewayStatus, GatewayConfig, WSConnectionState, ChatSession } from '../types';
import { GatewayClient } from './gateway';
import { DemoGatewayClient } from './demoGateway';

interface AppState {
  config: GatewayConfig;
  connected: boolean;
  wsState: WSConnectionState;
  status: GatewayStatus | null;
  messages: Message[];
  cronJobs: CronJob[];
  skills: Skill[];
  client: GatewayClient | null;
  thinking: boolean;
  activeSessionId: string | null;
  chatSessions: ChatSession[];
  isDemoMode: boolean;
}

type Action =
  | { type: 'SET_CONFIG'; config: GatewayConfig }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_WS_STATE'; wsState: WSConnectionState }
  | { type: 'SET_STATUS'; status: GatewayStatus }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_CRON_JOBS'; cronJobs: CronJob[] }
  | { type: 'SET_SKILLS'; skills: Skill[] }
  | { type: 'SET_CLIENT'; client: GatewayClient }
  | { type: 'SET_THINKING'; thinking: boolean }
  | { type: 'SET_ACTIVE_SESSION'; sessionId: string | null }
  | { type: 'SET_CHAT_SESSIONS'; sessions: ChatSession[] }
  | { type: 'ADD_CHAT_SESSION'; session: ChatSession }
  | { type: 'REMOVE_CHAT_SESSION'; sessionId: string }
  | { type: 'UPDATE_CHAT_SESSION'; session: ChatSession }
  | { type: 'SET_DEMO_MODE'; isDemoMode: boolean };

const initialState: AppState = {
  config: { url: 'http://localhost:3000', token: '' },
  connected: false,
  wsState: 'disconnected',
  status: null,
  messages: [],
  cronJobs: [],
  skills: [],
  client: null,
  thinking: false,
  activeSessionId: null,
  chatSessions: [],
  isDemoMode: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.config };
    case 'SET_CONNECTED':
      return { ...state, connected: action.connected };
    case 'SET_WS_STATE':
      return {
        ...state,
        wsState: action.wsState,
        connected: action.wsState === 'connected',
      };
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
    case 'SET_THINKING':
      return { ...state, thinking: action.thinking };
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSessionId: action.sessionId };
    case 'SET_CHAT_SESSIONS':
      return { ...state, chatSessions: action.sessions };
    case 'ADD_CHAT_SESSION':
      return { ...state, chatSessions: [action.session, ...state.chatSessions] };
    case 'REMOVE_CHAT_SESSION':
      return {
        ...state,
        chatSessions: state.chatSessions.filter((s) => s.id !== action.sessionId),
        activeSessionId:
          state.activeSessionId === action.sessionId ? null : state.activeSessionId,
      };
    case 'UPDATE_CHAT_SESSION':
      return {
        ...state,
        chatSessions: state.chatSessions.map((s) =>
          s.id === action.session.id ? action.session : s
        ),
      };
    case 'SET_DEMO_MODE':
      return { ...state, isDemoMode: action.isDemoMode };
    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadConfig: () => Promise<void>;
  saveConfig: (config: GatewayConfig) => Promise<void>;
  activateDemoMode: () => void;
  deactivateDemoMode: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const connectClient = useCallback((client: GatewayClient) => {
    // Listen to WebSocket state changes
    client.onWsStateChange((wsState) => {
      dispatch({ type: 'SET_WS_STATE', wsState });
    });

    // Listen to incoming messages
    client.onMessage((msg) => {
      dispatch({ type: 'ADD_MESSAGE', message: msg });
    });

    // Establish WebSocket connection
    client.connect();
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const url = await SecureStore.getItemAsync('gateway_url');
      const token = await SecureStore.getItemAsync('gateway_token');
      if (url || token) {
        const config = { url: url || 'http://localhost:3000', token: token || '' };
        dispatch({ type: 'SET_CONFIG', config });
        if (config.url) {
          const client = new GatewayClient(config.url, config.token);
          dispatch({ type: 'SET_CLIENT', client });
          connectClient(client);
        }
      }
    } catch {
      // ignore load errors
    }
  }, [connectClient]);

  const saveConfig = useCallback(
    async (config: GatewayConfig) => {
      await SecureStore.setItemAsync('gateway_url', config.url);
      await SecureStore.setItemAsync('gateway_token', config.token);
      dispatch({ type: 'SET_CONFIG', config });

      // Disconnect previous client
      if (state.client) {
        state.client.disconnect();
      }

      // Create and connect new client
      const client = new GatewayClient(config.url, config.token);
      dispatch({ type: 'SET_CLIENT', client });

      if (config.url) {
        connectClient(client);
      }
    },
    [state.client, connectClient]
  );

  const activateDemoMode = useCallback(() => {
    if (state.client) {
      state.client.disconnect();
    }
    const demoClient = new DemoGatewayClient();
    dispatch({ type: 'SET_CLIENT', client: demoClient });
    dispatch({ type: 'SET_DEMO_MODE', isDemoMode: true });
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
    dispatch({ type: 'SET_MESSAGES', messages: [] });
    connectClient(demoClient);
  }, [state.client, connectClient]);

  const deactivateDemoMode = useCallback(() => {
    if (state.client) {
      state.client.disconnect();
    }
    dispatch({ type: 'SET_DEMO_MODE', isDemoMode: false });
    dispatch({ type: 'SET_CLIENT', client: null as unknown as GatewayClient });
    dispatch({ type: 'SET_WS_STATE', wsState: 'disconnected' });
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
    dispatch({ type: 'SET_MESSAGES', messages: [] });
    dispatch({ type: 'SET_CHAT_SESSIONS', sessions: [] });
  }, [state.client]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.client) {
        state.client.disconnect();
      }
    };
  }, [state.client]);

  return React.createElement(
    StoreContext.Provider,
    { value: { state, dispatch, loadConfig, saveConfig, activateDemoMode, deactivateDemoMode } },
    children
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

