import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as authRegister } from '../api/auth';
import Logo from '../components/Logo';

const ROLES = [
  { value: 'AME', label: 'AME — Maintenance Engineer' },
  { value: 'AMO', label: 'AMO — Maintenance Organisation' },
  { value: 'OPERATOR', label: 'Operator / Airline' },
  { value: 'SUPPLIER', label: 'Parts Supplier' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AME');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authRegister({ name, email, password, role });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message
          || err.message
          || 'Registration failed — check your details.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ marginBottom: 24 }}>
          <Logo size={32} subtitle="Aviation Platform" />
        </div>
        <div style={styles.overline}>Create account</div>
        <h1 style={styles.h1}>Join Naluka</h1>
        <p style={styles.sub}>Verified suppliers, contractors and operators across Africa.</p>

        <form onSubmit={handleRegister} style={{ marginTop: 22 }}>
          <label style={styles.label}>Full name</label>
          <input
            type="text"
            placeholder="Sipho Dlamini"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="you@operator.aero"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            minLength={8}
            required
          />

          <label style={styles.label}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.input}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting} style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
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
    background: 'radial-gradient(circle at 70% 20%, rgba(21,32,67,0.6) 0%, var(--surface-base) 60%)',
  },
  card: {
    width: '100%',
    maxWidth: 460,
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
