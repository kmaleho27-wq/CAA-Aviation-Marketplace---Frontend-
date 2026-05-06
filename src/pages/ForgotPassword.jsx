import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';
import Logo from '../components/Logo';

// /forgot-password — user enters their email; we trigger a Supabase
// password reset email. The email link lands on /reset-password where
// the user types their new password.
//
// We always show the same success state regardless of whether the
// email exists in the database — common security practice to avoid
// leaking which addresses are registered.

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send reset email. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ marginBottom: 28 }}>
          <Logo size={32} subtitle="Aviation Platform" />
        </div>

        {sent ? (
          <>
            <div style={styles.overline}>Check your email</div>
            <h1 style={styles.h1}>Reset link sent</h1>
            <p style={styles.sub}>
              If an account exists for <strong>{email}</strong>, we've sent a password
              reset link. Open it on the device you want to sign in from. The link
              expires in 1 hour.
            </p>
            <div style={styles.helpBox}>
              <div style={styles.helpTitle}>Didn't get it?</div>
              <ul style={styles.helpList}>
                <li>Check your spam / promotions folder</li>
                <li>Confirm the email address is correct</li>
                <li>Wait 60 seconds and try again</li>
              </ul>
            </div>
            <Link to="/login" style={styles.backLink}>← Back to sign in</Link>
          </>
        ) : (
          <>
            <div style={styles.overline}>Forgotten password</div>
            <h1 style={styles.h1}>Reset your password</h1>
            <p style={styles.sub}>
              Enter the email you registered with. We'll send you a link to pick a new password.
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="you@operator.aero"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
                autoFocus
              />

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" disabled={submitting} style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p style={styles.footer}>
              Remembered it? <Link to="/login" style={styles.link}>Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    flex: 1,
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'radial-gradient(circle at 30% 20%, rgba(21,32,67,0.6) 0%, var(--surface-base) 60%)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px 32px 28px',
    boxShadow: 'var(--shadow-lg)',
  },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 28,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
  },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: 6, marginTop: 14,
  },
  input: {
    display: 'block', width: '100%', height: 40,
    background: 'var(--surface-input)', color: 'var(--text-primary)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  error: {
    marginTop: 16, padding: '10px 12px',
    background: 'rgba(212, 86, 86, 0.08)', border: '1px solid rgba(212, 86, 86, 0.30)',
    borderLeft: '3px solid var(--text-danger)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-danger)', fontSize: 12,
  },
  btn: {
    width: '100%', height: 40, marginTop: 22,
    background: 'var(--action-primary)', color: 'var(--action-primary-text)',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  footer: { marginTop: 22, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' },
  link: { color: 'var(--action-primary)', fontWeight: 600 },
  backLink: {
    display: 'inline-block', marginTop: 22, fontSize: 13,
    color: 'var(--action-primary)', fontWeight: 600, textDecoration: 'none',
  },
  helpBox: {
    marginTop: 18, padding: '12px 14px',
    background: 'rgba(212, 169, 52, 0.06)',
    border: '1px solid rgba(212, 169, 52, 0.20)',
    borderRadius: 'var(--radius-md)',
  },
  helpTitle: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6,
  },
  helpList: {
    margin: 0, paddingLeft: 18,
    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
  },
};
