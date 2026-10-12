export type ThemeSetting = 'dark' | 'light' | 'auto';
export type Theme = 'dark' | 'light';

export const THEME_KEY = 'spendr.theme';

/** Browser bar and status bar colours for each theme (matches --page). */
const CHROME: Record<Theme, string> = { dark: '#05080F', light: '#F2F2F7' };

export function readThemeSetting(): ThemeSetting {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light' || v === 'auto') return v;
  } catch {
    /* storage unavailable */
  }
  return 'dark';
}

export function resolveTheme(setting: ThemeSetting): Theme {
  if (setting !== 'auto') return setting;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Applies a theme to the page. index.html runs the same steps before the first paint, which is
 * also the only time iOS reads the status bar style, so that changes on the next launch.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[theme]);
}
