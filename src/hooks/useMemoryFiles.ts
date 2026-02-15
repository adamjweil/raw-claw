import { useCallback } from 'react';
import { useStore } from '../services/store';
import { usePolling } from './usePolling';
import { MemoryFile, DailyNote, MemoryDiff } from '../types';

interface UseMemoryFilesResult {
  files: MemoryFile[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getFile: (name: string) => Promise<MemoryFile>;
  updateFile: (name: string, content: string) => Promise<MemoryFile>;
  getDiffs: (name: string) => Promise<MemoryDiff[]>;
  getDailyNotes: () => Promise<DailyNote[]>;
  searchMemory: (query: string) => Promise<MemoryFile[]>;
}

export function useMemoryFiles(): UseMemoryFilesResult {
  const { state } = useStore();

  const fetcher = useCallback(async () => {
    if (!state.client) throw new Error('No gateway client');
    return state.client.getMemoryFiles();
  }, [state.client]);

  const { data, loading, error, refresh } = usePolling<MemoryFile[]>(fetcher, 60000);

  const getFile = useCallback(
    async (name: string): Promise<MemoryFile> => {
      if (!state.client) throw new Error('Not connected');
      return state.client.getMemoryFile(name);
    },
    [state.client]
  );

  const updateFile = useCallback(
    async (name: string, content: string): Promise<MemoryFile> => {
      if (!state.client) throw new Error('Not connected');
      return state.client.updateMemoryFile(name, content);
    },
    [state.client]
  );

  const getDiffs = useCallback(
    async (name: string): Promise<MemoryDiff[]> => {
      if (!state.client) throw new Error('Not connected');
      return state.client.getMemoryDiffs(name);
    },
    [state.client]
  );

  const getDailyNotes = useCallback(async (): Promise<DailyNote[]> => {
    if (!state.client) throw new Error('Not connected');
    return state.client.getDailyNotes();
  }, [state.client]);

  const searchMemory = useCallback(
    async (query: string): Promise<MemoryFile[]> => {
      if (!state.client) throw new Error('Not connected');
      return state.client.searchMemory(query);
    },
    [state.client]
  );

  return {
    files: data,
    loading,
    error,
    refresh,
    getFile,
    updateFile,
    getDiffs,
    getDailyNotes,
    searchMemory,
  };
}

