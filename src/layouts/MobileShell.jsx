import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ToastProvider } from '../lib/toast';
import { MOBILE_TABS } from '../data/mobile';
import { logout } from '../lib/auth';

const ICONS = {
  wallet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 14a1 1 0 110-2 1 1 0 010 2z" fill="currentColor" />
      <path d="M2 11h20M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" />
    </svg>
  ),
  jobs: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  signoff: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

const StatusBar = ({ onSignOut }) => (
  <div style={styles.statusBar}>
    <span style={styles.statusTime}>9:41</span>
    <span style={styles.statusCarrier}>••••• ZA</span>
    <div style={styles.statusRight}>
      <svg width="14" height="10" viewBox="0 0 14 10" fill="var(--text-tertiary)">
        <rect x="0" y="4" width="2" height="6" rx="1" />
        <rect x="3" y="2.5" width="2" height="7.5" rx="1" />
        <rect x="6" y="1" width="2" height="9" rx="1" />
        <rect x="9" y="0" width="2" height="10" rx="1" />
      </svg>
      <span style={styles.statusBattery}>88%</span>
      <button
        type="button"
        onClick={onSignOut}
        style={styles.signOutIcon}
        title="Sign out"
        aria-label="Sign out"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  </div>
);

export default function MobileShell() {
  const navigate = useNavigate();
  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <ToastProvider>
      <div style={styles.stage}>
        <div style={styles.phone}>
          <div style={styles.notch} />
          <StatusBar onSignOut={handleSignOut} />
          <div style={styles.screen}>
            <Outlet />
          </div>
          <nav style={styles.tabBar}>
            {MOBILE_TABS.map((t) => (
              <NavLink
                key={t.id}
                to={t.path}
                style={({ isActive }) => ({
                  ...styles.tab,
                  color: isActive ? 'var(--text-warning)' : 'var(--text-tertiary)',
                })}
              >
                {({ isActive }) => (
                  <>
                    {t.badge && !isActive && <span style={styles.badge}>{t.badge}</span>}
                    <span style={{ display: 'flex' }}>{ICONS[t.id]}</span>
                    <span style={styles.tabLabel}>{t.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}

const styles = {
  stage: {
    flex: 1,
    minHeight: '100vh',
    width: '100%',
    background: 'var(--surface-base)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    overflowY: 'auto',
  },
  phone: {
    width: 'min(375px, 100%)',
    height: 'min(780px, calc(100vh - 64px))',
    background: 'var(--surface-raised)',
    borderRadius: 44,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.10)',
    display: 'flex',
    flexDirection: 'column',
  },
  notch: {
    width: 120,
    height: 30,
    background: 'var(--surface-base)',
    borderRadius: '0 0 20px 20px',
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
  },
  statusBar: {
    height: 44,
    background: 'var(--surface-raised)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  statusTime: {
    fontFamily: 'var(--font-display)',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
  },
  statusCarrier: { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 1 },
  statusRight: { display: 'flex', gap: 4, alignItems: 'center' },
  statusBattery: { fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)' },
  signOutIcon: {
    background: 'transparent',
    border: 'none',
    padding: '2px 4px 2px 8px',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color var(--transition-fast)',
  },
  screen: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  tabBar: {
    height: 80,
    background: 'var(--surface-raised)',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: 8,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'none',
    position: 'relative',
    transition: 'color var(--transition-fast)',
  },
  tabLabel: { fontSize: 10, fontWeight: 500 },
  badge: {
    position: 'absolute',
    top: 0,
    right: '20%',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'var(--text-aog)',
    color: 'var(--surface-base)',
    fontSize: 8,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
