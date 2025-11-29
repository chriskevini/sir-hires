/**
 * useTheme Hook
 *
 * Provides theme state and setters for React components.
 * Syncs with WXT storage and applies theme to DOM.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode, ColorTheme, ThemePreference } from '../utils/storage';
import { themePreferenceStorage } from '../utils/storage';
import { applyTheme, watchSystemTheme } from '../utils/theme-utils';

const DEFAULT_PREFERENCE: ThemePreference = {
  mode: 'system',
  colorTheme: 'sir-hires',
};

export interface UseThemeReturn {
  /** Current theme mode (light/dark/system) */
  mode: ThemeMode;
  /** Current color theme */
  colorTheme: ColorTheme;
  /** Set the theme mode */
  setMode: (mode: ThemeMode) => Promise<void>;
  /** Set the color theme */
  setColorTheme: (colorTheme: ColorTheme) => Promise<void>;
  /** Whether theme has been loaded from storage */
  isLoaded: boolean;
}

/**
 * Hook for managing theme preferences
 *
 * @example
 * ```tsx
 * const { mode, colorTheme, setMode, setColorTheme } = useTheme();
 * ```
 */
export function useTheme(): UseThemeReturn {
  const [preference, setPreference] =
    useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial preference from storage
  useEffect(() => {
    themePreferenceStorage.getValue().then((stored) => {
      setPreference(stored);
      applyTheme(stored);
      // Sync to localStorage for FOUC prevention scripts
      localStorage.setItem('local:themePreference', JSON.stringify(stored));
      setIsLoaded(true);
    });
  }, []);

  // Watch for storage changes (sync across tabs/windows)
  useEffect(() => {
    const unwatch = themePreferenceStorage.watch((newValue) => {
      if (newValue) {
        setPreference(newValue);
        applyTheme(newValue);
        // Sync to localStorage for FOUC prevention scripts
        localStorage.setItem('local:themePreference', JSON.stringify(newValue));
      }
    });

    return () => {
      unwatch();
    };
  }, []);

  // Watch for system theme changes when mode is 'system'
  useEffect(() => {
    const cleanup = watchSystemTheme(preference.mode, preference.colorTheme);
    return cleanup;
  }, [preference.mode, preference.colorTheme]);

  // Set theme mode
  const setMode = useCallback(
    async (mode: ThemeMode) => {
      const newPreference = { ...preference, mode };
      setPreference(newPreference);
      applyTheme(newPreference);
      // Sync to localStorage for FOUC prevention scripts
      localStorage.setItem(
        'local:themePreference',
        JSON.stringify(newPreference)
      );
      await themePreferenceStorage.setValue(newPreference);
    },
    [preference]
  );

  // Set color theme
  const setColorTheme = useCallback(
    async (colorTheme: ColorTheme) => {
      const newPreference = { ...preference, colorTheme };
      setPreference(newPreference);
      applyTheme(newPreference);
      // Sync to localStorage for FOUC prevention scripts
      localStorage.setItem(
        'local:themePreference',
        JSON.stringify(newPreference)
      );
      await themePreferenceStorage.setValue(newPreference);
    },
    [preference]
  );

  return {
    mode: preference.mode,
    colorTheme: preference.colorTheme,
    setMode,
    setColorTheme,
    isLoaded,
  };
}
