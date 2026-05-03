import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login as authLogin } from '../api/auth';
import Logo from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/app/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // In mock mode this stores token/user via setSession internally.
      // In real mode Supabase persists the session and lib/auth.jsx mirrors it.
      await authLogin(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message
          || err.message
          || 'Login failed — check your email and password.',
      );
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
        <div style={styles.overline}>Operator Sign-in</div>
        <h1 style={styles.h1}>Welcome back</h1>
        <p style={styles.sub}>Access your fleet, marketplace and compliance vault.</p>

        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
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

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting} style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
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
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    marginTop: 6,
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    display: 'block',
    width: '100%',
    height: 40,
    background: 'var(--surface-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  error: {
    marginTop: 16,
    padding: '10px 12px',
    background: 'rgba(212, 86, 86, 0.08)',
    border: '1px solid rgba(212, 86, 86, 0.30)',
    borderLeft: '3px solid var(--text-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-danger)',
    fontSize: 12,
  },
  btn: {
    width: '100%',
    height: 40,
    marginTop: 22,
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  footer: {
    marginTop: 22,
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--action-primary)',
    fontWeight: 600,
  },
};
