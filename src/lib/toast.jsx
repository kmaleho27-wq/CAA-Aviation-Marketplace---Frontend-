import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const ICONS = { success: '✓', warning: '⚠', error: '✕', aog: '⚡', info: 'ℹ' };
const COLORS = {
  success: 'var(--text-success)',
  warning: 'var(--text-warning)',
  error:   'var(--text-danger)',
  aog:     'var(--text-aog)',
  info:    'var(--text-accent)',
};
const ACCENTS = {
  success: '#5BAA8E',
  warning: '#E8C45C',
  error:   '#E07070',
  aog:     '#DC5A36',
  info:    '#D4A934',
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((msg, type = 'success', ttl = 3500) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, msg, type }]);
    if (ttl > 0) {
      setTimeout(() => dismiss(id), ttl);
    }
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    push,
    dismiss,
    success: (msg, ttl) => push(msg, 'success', ttl),
    warning: (msg, ttl) => push(msg, 'warning', ttl),
    error:   (msg, ttl) => push(msg, 'error',   ttl),
    aog:     (msg, ttl) => push(msg, 'aog',     ttl),
    info:    (msg, ttl) => push(msg, 'info',    ttl),
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={stackStyle} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => dismiss(t.id)}
            style={{ ...toastStyle, borderLeft: `3px solid ${ACCENTS[t.type]}`, ...(t.type === 'aog' ? aogTint : {}) }}
          >
            <span style={{ color: COLORS[t.type], fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>
              {ICONS[t.type] || ICONS.info}
            </span>
            <span style={{ flex: 1 }}>{t.msg}</span>
            <span style={dismissStyle} aria-hidden>×</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {},
      dismiss: () => {},
      success: () => {},
      warning: () => {},
      error: () => {},
      aog: () => {},
      info: () => {},
    };
  }
  return ctx;
}

// Optional helper for components that want to fire-and-forget without holding the hook
export function useToastEffect(fn, deps) {
  const toast = useToast();
  useEffect(() => fn(toast), deps);
}

const stackStyle = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 500,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
};

const toastStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: '11px 14px 11px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 280,
  maxWidth: 380,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.50)',
  pointerEvents: 'all',
  fontSize: 13,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  animation: 'toastIn 250ms ease-out',
};

const aogTint = { background: 'rgba(184, 74, 26, 0.15)' };

const dismissStyle = {
  color: 'var(--text-overline)',
  fontSize: 16,
  lineHeight: 1,
  marginLeft: 4,
  flexShrink: 0,
};
