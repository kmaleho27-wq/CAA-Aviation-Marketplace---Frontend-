import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword } from '../api/auth';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';

// /reset-password — user lands here from the password-reset email.
// Supabase's detectSessionInUrl picks up the recovery token, so by
// the time this component mounts we should have a recovery session.
//
// We listen for PASSWORD_RECOVERY events explicitly, since that's the
// canonical signal that the URL contained a valid recovery link. If
// nothing fires, we tell the user the link is invalid/expired and
// nudge them back to /forgot-password.

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 1) If a session already exists when we land (detectSessionInUrl
    //    swallowed the recovery token), trust it. 2) Also subscribe to
    //    auth state changes — PASSWORD_RECOVERY fires once the
    //    recovery link is validated.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      // Sign out so the user re-authenticates with the new password.
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      setError(err.message || 'Could not update password. The link may have expired.');
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

        {done ? (
          <>
            <div style={styles.overline}>Password updated</div>
            <h1 style={styles.h1}>You're all set</h1>
            <p style={styles.sub}>
              Your password has been changed. Redirecting you to sign in…
            </p>
          </>
        ) : !recoveryReady ? (
          <>
            <div style={styles.overline}>Reset password</div>
            <h1 style={styles.h1}>Verifying link…</h1>
            <p style={styles.sub}>
              Confirming your reset link with Supabase. If this takes more than a
              few seconds the link may be invalid or expired.
            </p>
            <div style={styles.helpBox}>
              <div style={styles.helpTitle}>Link not working?</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Reset links expire after 1 hour and only work once. If yours has
                lapsed, request a new one.
              </p>
              <Link to="/forgot-password" style={{ ...styles.link, fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                Request a new reset link →
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={styles.overline}>Reset password</div>
            <h1 style={styles.h1}>Pick a new password</h1>
            <p style={styles.sub}>
              Choose something at least 8 characters long. Use the eye icon to
              double-check what you typed.
            </p>

            <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
              <label style={styles.label}>New password</label>
              <PasswordInput
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />

              <label style={styles.label}>Confirm new password</label>
              <PasswordInput
                placeholder="Type it again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />

              {error && <div style={styles.error}>{error}</div>}

              <button type="submit" disabled={submitting} style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
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
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6,
  },
  h1: {
    fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28,
    color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1.1,
  },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.5 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: 6, marginTop: 14,
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
  link: { color: 'var(--action-primary)', fontWeight: 600, textDecoration: 'none' },
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
};
