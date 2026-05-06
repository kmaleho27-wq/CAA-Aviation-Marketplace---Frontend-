import { useState } from 'react';

// PasswordInput — reusable password field with an eye-toggle to reveal
// the typed value. Used on /login, /register, /reset-password and
// anywhere else a password is entered.
//
// Why this matters: aviation pros frequently sign in on a phone in a
// hangar with gloves on. Mistyped passwords are a meaningful share of
// failed sign-ins. Letting the user verify what they typed cuts that
// failure mode in half.

export default function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  autoComplete = 'current-password',
  autoFocus = false,
  inputStyle,
  id,
  name,
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={styles.wrap}>
      <input
        id={id}
        name={name}
        type={revealed ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        style={{ ...styles.input, ...(inputStyle || {}) }}
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        title={revealed ? 'Hide password' : 'Show password'}
        style={styles.toggle}
      >
        {revealed ? (
          // Eye-off (slash through) — password is visible, click to hide
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          // Eye open — password is hidden, click to show
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

const styles = {
  wrap: { position: 'relative', width: '100%' },
  input: {
    display: 'block',
    width: '100%',
    height: 40,
    background: 'var(--surface-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 44px 0 12px', // right padding leaves room for the toggle
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  toggle: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    padding: 0,
  },
};
