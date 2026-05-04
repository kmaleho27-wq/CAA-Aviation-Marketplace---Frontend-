import { NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { NAV_ITEMS } from '../data/mock';
import { getUser, logout } from '../lib/auth';

const ICONS = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  package: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z" /><path d="M12 22V12" /><path d="M22 8.5L12 12 2 8.5" /><path d="M7 5.25l10 5.5" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  wrench: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  'credit-card': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export default function Sidebar({ aogCount = 0 }) {
  const navigate = useNavigate();
  const user = getUser() || { name: 'Naluka User', role: 'Operator' };
  const initials = user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItemStyle = ({ isActive }) => ({
    ...styles.navItem,
    ...(isActive ? styles.navItemActive : {}),
  });

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoWrap}>
        <Logo size={28} subtitle="Aviation Platform" />
      </div>

      {aogCount > 0 && (
        <div style={styles.aogBanner}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ fontWeight: 700, color: 'var(--text-aog)' }}>{aogCount} AOG Active</span>
        </div>
      )}

      <nav style={styles.nav}>
        <div style={styles.navSection}>MAIN</div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} to={item.path} style={navItemStyle}>
            {({ isActive }) => (
              <>
                <span style={{ opacity: isActive ? 1 : 0.6, display: 'flex' }}>{ICONS[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && !isActive && <span style={styles.navBadge}>{item.badge}</span>}
              </>
            )}
          </NavLink>
        ))}

        <div style={{ ...styles.navSection, marginTop: 16 }}>ACCOUNT</div>
        <NavLink to="/app/settings" style={navItemStyle}>
          {({ isActive }) => (
            <>
              <span style={{ opacity: isActive ? 1 : 0.6, display: 'flex' }}>{ICONS.settings}</span>
              <span style={{ flex: 1 }}>Settings</span>
            </>
          )}
        </NavLink>
      </nav>

      <div style={styles.userWrap}>
        <div style={styles.avatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.userName}>{user.name}</div>
          <div style={styles.userRole}>{user.role}</div>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn} aria-label="Sign out" title="Sign out">
          {ICONS.logout}
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    flexShrink: 0,
    background: 'var(--surface-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px 16px 16px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  aogBanner: {
    margin: '10px 12px 0',
    background: 'rgba(196, 66, 30, 0.15)',
    border: '1px solid rgba(196, 66, 30, 0.30)',
    borderRadius: 'var(--radius-md)',
    padding: '7px 10px',
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    fontSize: 12,
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflowY: 'auto',
  },
  navSection: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--text-overline)',
    padding: '6px 8px 4px',
    textTransform: 'uppercase',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
    width: '100%',
    textDecoration: 'none',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
    border: 'none',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'rgba(212, 169, 52, 0.10)',
    color: 'var(--text-accent)',
  },
  navBadge: {
    background: 'rgba(196, 66, 30, 0.20)',
    color: 'var(--text-aog)',
    borderRadius: 'var(--radius-pill)',
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 700,
  },
  userWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '12px 16px',
    borderTop: '1px solid var(--border-subtle)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--surface-input)',
    border: '1.5px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    padding: 6,
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
  },
};
