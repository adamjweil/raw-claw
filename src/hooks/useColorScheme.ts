import { useEffect, useState, useCallback } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'paw_theme_preference';

/**
 * Hook that manages theme preference with persistence.
 * Returns the resolved theme mode ('light' | 'dark') and a setter.
 */
export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreferenceState(saved);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback(async (mode: ThemePreference) => {
    setPreferenceState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  // Resolve the actual color scheme
  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  return {
    preference,
    setPreference,
    resolvedScheme,
    loaded,
  };
}

