import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import NotifPanel from '../components/NotifPanel';
import { ToastProvider } from '../lib/toast';
import { listNotifications, markAllRead } from '../api/notifications';
import { getAogEvents } from '../api/dashboard';

// Operator + AMO + Supplier shell. Mobile drawer pattern matches
// MobileShell — sidebar collapses < 700px, hamburger toggles.

const RESPONSIVE_CSS = `
  @media (max-width: 700px) {
    .app-sidebar {
      position: fixed !important;
      top: 0; left: 0;
      height: 100vh;
      width: var(--sidebar-width);
      z-index: 200;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .app-sidebar.open {
      transform: translateX(0);
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
    }
    .app-mobile-header {
      display: flex !important;
    }
    .app-backdrop {
      display: block !important;
    }
    .app-desktop-topbar {
      display: none !important;
    }
  }
`;

export default function AppShell() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [aogCount, setAogCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((data) => { if (!cancelled) setNotifications(data); })
      .catch(() => { /* surface in TopBar dot only — non-blocking */ });
    getAogEvents()
      .then((data) => { if (!cancelled) setAogCount(data.length); })
      .catch(() => { /* sidebar banner stays hidden if it fails */ });
    return () => { cancelled = true; };
  }, []);

  const unread = notifications.filter((n) => n.unread).length;

  const toggleNotif = useCallback(() => setNotifOpen((o) => !o), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try { await markAllRead(); } catch { /* optimistic update is fine */ }
  }, []);

  return (
    <ToastProvider>
      <style>{RESPONSIVE_CSS}</style>
      <div style={styles.shell}>
        <div className={`app-sidebar${drawerOpen ? ' open' : ''}`}>
          <Sidebar aogCount={aogCount} />
        </div>

        {drawerOpen && (
          <div className="app-backdrop" onClick={closeDrawer} style={styles.backdrop} />
        )}

        <div style={styles.column}>
          {/* Mobile-only header — desktop keeps its standard TopBar. */}
          <header className="app-mobile-header" style={styles.mobileHeader}>
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              style={styles.hamburger}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={styles.brand}>
              Nalu<span style={{ color: 'var(--text-warning)' }}>ka</span>
            </div>
            <button
              type="button"
              onClick={toggleNotif}
              style={styles.bellButton}
              aria-label="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unread > 0 && <span style={styles.bellDot} />}
            </button>
          </header>

          <div className="app-desktop-topbar">
            <TopBar unread={unread} onNotifClick={toggleNotif} />
          </div>

          <main style={styles.main} onClick={drawerOpen ? closeDrawer : undefined}>
            <Outlet />
          </main>
        </div>

        <NotifPanel
          open={notifOpen}
          onClose={closeNotif}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />
      </div>
    </ToastProvider>
  );
}

const styles = {
  shell: { display: 'flex', flex: 1, minHeight: '100vh', height: '100vh', overflow: 'hidden', background: 'var(--surface-base)', position: 'relative' },
  column: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' },
  backdrop: { display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 150 },
  mobileHeader: {
    display: 'none',
    height: 56, flexShrink: 0,
    alignItems: 'center', gap: 12,
    padding: '0 14px',
    background: 'var(--surface-sidebar)',
    borderBottom: '1px solid var(--border-subtle)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  hamburger: {
    width: 44, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer',
    borderRadius: 'var(--radius-md)', margin: '0 -10px', padding: 0,
  },
  brand: {
    flex: 1,
    fontFamily: 'var(--font-display)', fontSize: 18,
    color: 'var(--text-primary)', letterSpacing: '0.02em',
  },
  bellButton: {
    width: 44, height: 44,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none',
    color: 'var(--text-secondary)', cursor: 'pointer',
    borderRadius: 'var(--radius-md)', position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 12, right: 12,
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--text-aog)',
    border: '1.5px solid var(--surface-sidebar)',
  },
};
