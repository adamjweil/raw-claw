import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, darkColors, lightColors } from './colors';
import { SpacingScale, RadiusScale, spacing, radius } from './spacing';
import { TypographyScale, typography } from './typography';

export { darkColors, lightColors } from './colors';
export { spacing, radius } from './spacing';
export { typography, monoFont } from './typography';
export type { ColorPalette } from './colors';
export type { SpacingScale, RadiusScale } from './spacing';
export type { TypographyScale, TypographyStyle } from './typography';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ColorPalette;
  spacing: SpacingScale;
  radius: RadiusScale;
  typography: TypographyScale;
  isDark: boolean;
}

interface ThemeContextValue extends Theme {
  preference: ThemePreference;
  setThemePreference: (mode: ThemePreference) => Promise<void>;
}

const THEME_STORAGE_KEY = 'paw_theme_preference';

const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  isDark: true,
};

const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  isDark: false,
};

const ThemeContext = createContext<ThemeContextValue>({
  ...darkTheme,
  preference: 'dark',
  setThemePreference: async () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
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

  const setThemePreference = useCallback(async (mode: ThemePreference) => {
    setPreferenceState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  // Resolve which theme to use
  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  const theme = resolvedScheme === 'light' ? lightTheme : darkTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...theme,
      preference,
      setThemePreference,
    }),
    [theme, preference, setThemePreference]
  );

  // Don't render until we've loaded the preference to avoid flicker
  if (!loaded) {
    return null;
  }

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
