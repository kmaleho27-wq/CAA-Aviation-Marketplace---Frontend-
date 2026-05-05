import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Theme system. Three values stored in localStorage:
//   'dark'   — force dark
//   'light'  — force light
//   'system' — follow OS preference (default for new users)
//
// The render-time `data-theme` attribute on <html> is always either
// 'dark' or 'light' — 'system' is resolved against matchMedia at
// mount and refreshed on OS-level theme changes.

const STORAGE_KEY = 'naluka-theme';

function readPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* localStorage may be blocked */ }
  return 'system';
}

function osPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return true; // server fallback: dark
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return osPrefersDark() ? 'dark' : 'light';
}

function apply(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

const ThemeContext = createContext({
  preference: 'system',
  resolved: 'dark',
  setPreference: () => {},
  cycle: () => {},
});

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readPref);
  const [resolved, setResolved] = useState(() => resolve(readPref()));

  // Apply current resolved theme on mount + whenever it changes
  useEffect(() => { apply(resolved); }, [resolved]);

  // Listen for OS preference changes when in 'system' mode
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    setResolved(resolve(next));
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const cycle = useCallback(() => {
    const next =
      preference === 'dark'   ? 'light' :
      preference === 'light'  ? 'system' :
                                'dark';
    setPreference(next);
  }, [preference, setPreference]);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Toggle button — sun / moon / system ──────────────────────
// Cycles through dark → light → system → dark on click. Tooltip
// shows the current preference. The visual icon reflects the
// resolved theme (what's actually rendering), not the preference.

const ICONS = {
  sun: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  moon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  system: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 22h8M12 18v4" />
    </svg>
  ),
};

export function ThemeToggle({ size = 36, style = {} }) {
  const { preference, resolved, cycle } = useTheme();

  // Icon shows resolved state (what's painted) for `dark` / `light`
  // preferences, and shows a "system" icon when explicitly set to
  // follow OS — so users know their pref vs the rendered theme.
  const icon = preference === 'system' ? ICONS.system : (resolved === 'dark' ? ICONS.moon : ICONS.sun);
  const label =
    preference === 'system' ? 'Theme: follows system'
    : preference === 'light' ? 'Theme: light mode'
    : 'Theme: dark mode';

  return (
    <button
      type="button"
      onClick={cycle}
      title={label + ' — click to cycle (dark → light → system)'}
      aria-label={label}
      style={{
        width: size, height: size,
        background: 'transparent',
        border: 'none',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
        ...style,
      }}
    >
      {icon}
    </button>
  );
}
