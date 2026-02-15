import { useState, useCallback, useRef } from 'react';
import { useStore } from '../services/store';
import { Skill } from '../types';

interface UseClawHubResult {
  skills: Skill[];
  loading: boolean;
  error: string | null;
  search: (query?: string, category?: string) => void;
  install: (skillId: string) => Promise<boolean>;
  installing: string | null;
}

export function useClawHub(): UseClawHubResult {
  const { state } = useStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const search = useCallback(
    async (query?: string, category?: string) => {
      if (!state.client) {
        setError('Not connected to gateway');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let result = await state.client.getClawHubSkills(query, category);
        // Apply client-side filtering if query is provided
        // (the ClawHub REST API may not support server-side search)
        if (query && result.length > 0) {
          const q = query.toLowerCase();
          result = result.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q)
          );
        }
        if (mountedRef.current) {
          setSkills(result);
        }
      } catch (e: unknown) {
        if (mountedRef.current) {
          const message =
            e instanceof Error
              ? e.message
              : typeof e === 'object' && e !== null && 'message' in e
              ? String((e as { message: unknown }).message)
              : 'Failed to search ClawHub';
          setError(message);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [state.client]
  );

  const install = useCallback(
    async (skillId: string): Promise<boolean> => {
      if (!state.client) return false;
      setInstalling(skillId);
      try {
        await state.client.installSkill(skillId);
        // Remove from ClawHub list after install
        setSkills((prev) => prev.filter((s) => s.id !== skillId));
        return true;
      } catch {
        return false;
      } finally {
        if (mountedRef.current) setInstalling(null);
      }
    },
    [state.client]
  );

  return { skills, loading, error, search, install, installing };
}

