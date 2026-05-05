import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { ToastProvider } from '../lib/toast';
import { ThemeToggle } from '../lib/theme';

// Admin shell — same drawer pattern as AppShell + MobileShell.
// Admins are usually at desks, but a quick check on the phone for an
// AOG event in the middle of the night is a real workflow.

const RESPONSIVE_CSS = `
  @media (max-width: 700px) {
    .admin-sidebar {
      position: fixed !important;
      top: 0; left: 0;
      height: 100vh;
      width: var(--sidebar-width);
      z-index: 200;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .admin-sidebar.open {
      transform: translateX(0);
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
    }
    .admin-mobile-header {
      display: flex !important;
    }
    .admin-backdrop {
      display: block !important;
    }
    .admin-desktop-topbar {
      display: none !important;
    }
  }
`;

export default function AdminShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);

  return (
    <ToastProvider>
      <style>{RESPONSIVE_CSS}</style>
      <div style={styles.shell}>
        <div className={`admin-sidebar${drawerOpen ? ' open' : ''}`}>
          <AdminSidebar />
        </div>
        {drawerOpen && (
          <div className="admin-backdrop" onClick={close} style={styles.backdrop} />
        )}

        <div style={styles.column}>
          <header className="admin-mobile-header" style={styles.mobileHeader}>
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
              <span style={styles.adminTag}>Admin</span>
            </div>
            <ThemeToggle size={44} />
          </header>

          <div className="admin-desktop-topbar">
            <AdminTopBar />
          </div>

          <main style={styles.main} onClick={drawerOpen ? close : undefined}>
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

const styles = {
  shell: { display: 'flex', flex: 1, minHeight: '100vh', height: '100vh', overflow: 'hidden', background: 'var(--surface-base)', position: 'relative' },
  column: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  main: { flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' },
  backdrop: { display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 150 },
  mobileHeader: { display: 'none', height: 56, flexShrink: 0, alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 100 },
  hamburger: { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-md)', margin: '0 -10px', padding: 0 },
  brand: { flex: 1, fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 },
  adminTag: { fontSize: 10, fontWeight: 700, padding: '2px 6px', background: 'rgba(212, 169, 52, 0.15)', color: 'var(--text-warning)', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(212, 169, 52, 0.30)' },
};
