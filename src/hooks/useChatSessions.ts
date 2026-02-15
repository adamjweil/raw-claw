import { useCallback, useEffect } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { ChatSession } from '../types';

interface UseChatSessionsResult {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
  selectSession: (id: string) => void;
  createSession: () => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  refresh: () => void;
}

export function useChatSessions(): UseChatSessionsResult {
  const { state, dispatch } = useStore();

  const fetcher = useCallback(async () => {
    if (!state.client) return [];
    return state.client.getChatSessions();
  }, [state.client]);

  const { data, loading, error, refresh } = usePolling<ChatSession[]>(fetcher, 30000);

  // Sync polling data with store
  useEffect(() => {
    if (data) {
      dispatch({ type: 'SET_CHAT_SESSIONS', sessions: data });
      // Auto-select first session if none selected
      if (!state.activeSessionId && data.length > 0) {
        dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: data[0].id });
      }
    }
  }, [data, dispatch, state.activeSessionId]);

  const selectSession = useCallback(
    (id: string) => {
      dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: id });
    },
    [dispatch]
  );

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: `Chat ${(state.chatSessions.length || 0) + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    dispatch({ type: 'ADD_CHAT_SESSION', session: newSession });
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: newSession.id });
  }, [dispatch, state.chatSessions.length]);

  const renameSession = useCallback(
    (id: string, title: string) => {
      const session = state.chatSessions.find((s) => s.id === id);
      if (session) {
        dispatch({
          type: 'UPDATE_CHAT_SESSION',
          session: { ...session, title, updatedAt: new Date().toISOString() },
        });
      }
    },
    [dispatch, state.chatSessions]
  );

  const deleteSession = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_CHAT_SESSION', sessionId: id });
    },
    [dispatch]
  );

  return {
    sessions: state.chatSessions,
    activeSessionId: state.activeSessionId,
    loading,
    error,
    selectSession,
    createSession,
    renameSession,
    deleteSession,
    refresh,
  };
}

