/**
 * Theme Utilities
 *
 * Functions for applying and initializing themes on the DOM.
 * Works with CSS classes defined in globals.css.
 */

import type { ThemeMode, ColorTheme, ThemePreference } from './storage';

/**
 * Color theme to CSS class mapping
 * Sir Hires (default) has no class - it uses the base :root styles
 */
const COLOR_THEME_CLASSES: Record<ColorTheme, string | null> = {
  'sir-hires': null,
  lancelot: 'theme-lancelot',
  gawain: 'theme-gawain',
  yvain: 'theme-yvain',
};

/**
 * Get the effective theme mode (resolves 'system' to actual preference)
 */
export function getEffectiveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

/**
 * Apply theme to the document
 * Sets dark mode class and color theme class on <html> element
 */
export function applyTheme(preference: ThemePreference): void {
  const html = document.documentElement;
  const effectiveMode = getEffectiveMode(preference.mode);

  // Apply dark mode
  if (effectiveMode === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }

  // Remove all color theme classes first
  Object.values(COLOR_THEME_CLASSES).forEach((className) => {
    if (className) {
      html.classList.remove(className);
    }
  });

  // Apply color theme class (if not default)
  const themeClass = COLOR_THEME_CLASSES[preference.colorTheme];
  if (themeClass) {
    html.classList.add(themeClass);
  }
}

/**
 * Initialize theme from storage
 * Call this early in app initialization to prevent FOUC
 */
export async function initializeTheme(): Promise<ThemePreference> {
  // Dynamic import to avoid circular dependencies
  const { themePreferenceStorage } = await import('./storage');
  const preference = await themePreferenceStorage.getValue();
  applyTheme(preference);
  return preference;
}

/**
 * Watch for system theme changes when mode is 'system'
 * Returns cleanup function
 */
export function watchSystemTheme(
  mode: ThemeMode,
  colorTheme: ColorTheme
): () => void {
  if (mode !== 'system') {
    return () => {}; // No-op cleanup
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = () => {
    applyTheme({ mode, colorTheme });
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}
