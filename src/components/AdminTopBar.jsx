import { useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_NAV } from '../data/admin';
import { logout } from '../lib/auth';

function pageTitle(pathname) {
  const match = ADMIN_NAV.find((n) => pathname.startsWith(n.path));
  return match ? match.label : 'Admin';
}

export default function AdminTopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = pageTitle(pathname);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header style={styles.bar}>
      <div style={styles.title}>{title}</div>
      <div style={styles.right}>
        <div style={styles.version}>Naluka Admin · v1.0</div>
        <button onClick={handleLogout} style={styles.signOut}>Sign out</button>
        <div style={styles.avatar}>AD</div>
      </div>
    </header>
  );
}

const styles = {
  bar: {
    height: 50,
    background: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 22px',
    flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  right: { display: 'flex', gap: 10, alignItems: 'center' },
  version: { fontSize: 11, color: 'var(--text-overline)' },
  signOut: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '5px 12px',
    fontSize: 11,
    cursor: 'pointer',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--surface-input)',
    border: '1.5px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
};
