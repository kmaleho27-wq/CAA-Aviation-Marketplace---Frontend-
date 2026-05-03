import { Link, NavLink } from 'react-router-dom';
import { isTokenValid } from '../../lib/auth';

export default function MarketingNav() {
  const authed = isTokenValid();

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        Nalu<span style={{ color: 'var(--text-warning)' }}>ka</span>
      </Link>

      <ul style={styles.links}>
        <li><a href="/#features"   style={styles.link}>Platform</a></li>
        <li><a href="/#how"        style={styles.link}>How it works</a></li>
        <li><a href="/#compliance" style={styles.link}>Compliance</a></li>
        <li>
          <NavLink
            to="/pricing"
            style={({ isActive }) => ({ ...styles.link, color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' })}
          >
            Pricing
          </NavLink>
        </li>
      </ul>

      <div style={styles.cta}>
        {authed ? (
          <Link to="/app/dashboard" style={styles.primary}>Open Dashboard →</Link>
        ) : (
          <>
            <Link to="/login" style={styles.ghost}>Sign in</Link>
            <Link to="/register" style={styles.primary}>Get Started →</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(20px, 4vw, 64px)',
    background: 'rgba(7, 12, 32, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border-subtle)',
    flexShrink: 0,
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 20,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
    textDecoration: 'none',
  },
  links: {
    display: 'flex',
    gap: 'clamp(16px, 3vw, 32px)',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  link: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
  },
  cta: { display: 'flex', gap: 10, alignItems: 'center' },
  ghost: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
  },
  primary: {
    background: 'var(--action-primary)',
    border: 'none',
    color: 'var(--action-primary-text)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'background var(--transition-fast)',
  },
};
