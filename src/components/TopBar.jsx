import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../data/mock';
import { getUser, roleLabel } from '../lib/auth';

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

function pageTitle(pathname) {
  const match = NAV_ITEMS.find((n) => pathname.startsWith(n.path));
  if (match) return match.label;
  if (pathname.startsWith('/app/settings')) return 'Settings';
  return 'Naluka';
}

export default function TopBar({ unread = 0, onNotifClick }) {
  const { pathname } = useLocation();
  const title = pageTitle(pathname);
  const user = getUser();
  const modeLabel = `${roleLabel(user?.role)} Mode`;

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.crumb}>Naluka</div>
        <span style={styles.crumbSep}>/</span>
        <div style={styles.title}>{title}</div>
      </div>

      <div style={styles.right}>
        <div style={styles.searchWrap}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search parts, personnel, transactions…"
            style={styles.searchInput}
          />
          <span style={styles.searchKbd}>⌘K</span>
        </div>

        <button
          type="button"
          onClick={onNotifClick}
          style={styles.iconBtn}
          aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        >
          <BellIcon />
          {unread > 0 && <span style={styles.notifDot} />}
        </button>

        <div style={styles.roleChip}>
          <span style={styles.roleDot} />
          {modeLabel}
        </div>
      </div>
    </header>
  );
}

const styles = {
  bar: {
    height: 'var(--topbar-height)',
    background: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  left: { display: 'flex', alignItems: 'center', gap: 8 },
  crumb: { fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 },
  crumbSep: { color: 'var(--text-overline)' },
  title: { fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 10px',
    height: 32,
    width: 320,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  searchKbd: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-tertiary)',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border-subtle)',
    padding: '1px 5px',
    borderRadius: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--color-mustard-500)',
    boxShadow: '0 0 0 2px var(--surface-raised)',
  },
  roleChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    background: 'rgba(212, 169, 52, 0.10)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderRadius: 'var(--radius-pill)',
    fontSize: 12,
    color: 'var(--text-accent)',
    fontWeight: 600,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--color-mustard-500)',
    boxShadow: 'var(--glow-mustard)',
  },
};
