import { NavLink } from 'react-router-dom';
import { ADMIN_NAV } from '../data/admin';

const ICONS = {
  grid: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  card: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  alert: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  chart: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

export default function AdminSidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.brand}>
          Nalu<span style={{ color: 'var(--text-warning)' }}>ka</span>
        </div>
        <div style={styles.tag}>Admin Console</div>
      </div>

      <nav style={styles.nav}>
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ opacity: isActive ? 1 : 0.6, display: 'flex' }}>{ICONS[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span style={styles.badge}>{item.badge}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <div style={styles.avatar}>AD</div>
        <div style={{ minWidth: 0 }}>
          <div style={styles.footerName}>Admin</div>
          <div style={styles.footerRole}>Trust Engine</div>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 200,
    flexShrink: 0,
    background: 'var(--surface-sidebar)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  },
  header: {
    padding: '18px 14px 14px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 15,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  tag: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-accent)',
    marginTop: 3,
  },
  nav: {
    flex: 1,
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'left',
    width: '100%',
    textDecoration: 'none',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  },
  navItemActive: {
    background: 'rgba(212, 169, 52, 0.10)',
    color: 'var(--text-warning)',
  },
  badge: {
    background: 'rgba(184, 74, 26, 0.20)',
    color: 'var(--text-aog)',
    borderRadius: 'var(--radius-pill)',
    padding: '1px 6px',
    fontSize: 9,
    fontWeight: 700,
  },
  footer: {
    padding: '12px 14px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
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
  footerName: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' },
  footerRole: { fontSize: 10, color: 'var(--text-overline)' },
};
