import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ContractorSidebar from '../components/ContractorSidebar';
import { ToastProvider } from '../lib/toast';

// MobileShell — sidebar+main on desktop, drawer-toggle on mobile.
//
// On viewports < 700px (typical phones), the sidebar is hidden by
// default. A header bar with a hamburger toggles it as a left drawer.
// This matches expectations for an aviation pro signing an 8130-3 on
// their phone at 2am at FAOR.
//
// Tap targets honour the 44x44px minimum from Apple's HIG / Material's
// 48dp recommendation — see the .audit-pack-noprint button styles
// elsewhere; pages own their own tap targets but the shell ensures
// the drawer toggle and outer chrome work cleanly.

const RESPONSIVE_CSS = `
  @media (max-width: 700px) {
    .contractor-sidebar {
      position: fixed !important;
      top: 0; left: 0;
      height: 100vh;
      width: var(--sidebar-width);
      z-index: 200;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
    }
    .contractor-sidebar.open {
      transform: translateX(0);
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
    }
    .contractor-mobile-header {
      display: flex !important;
    }
    .contractor-backdrop {
      display: block !important;
    }
  }
`;

export default function MobileShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);

  return (
    <ToastProvider>
      <style>{RESPONSIVE_CSS}</style>
      <div style={styles.shell}>
        <div className={`contractor-sidebar${drawerOpen ? ' open' : ''}`}>
          <ContractorSidebar />
        </div>

        {/* Mobile-only backdrop to dismiss the drawer */}
        {drawerOpen && (
          <div
            className="contractor-backdrop"
            onClick={close}
            style={styles.backdrop}
          />
        )}

        <div style={styles.column}>
          {/* Mobile-only header bar with hamburger trigger. Hidden on desktop. */}
          <header
            className="contractor-mobile-header"
            style={styles.mobileHeader}
          >
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
          </header>

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
  backdrop: {
    display: 'none',  // shown by .contractor-backdrop CSS rule under 700px
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 150,
  },
  mobileHeader: {
    display: 'none',  // shown by .contractor-mobile-header CSS rule under 700px
    height: 56,
    flexShrink: 0,
    alignItems: 'center',
    gap: 12,
    padding: '0 14px',
    background: 'var(--surface-sidebar)',
    borderBottom: '1px solid var(--border-subtle)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  hamburger: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderRadius: 'var(--radius-md)',
    margin: '0 -10px',
    padding: 0,
  },
  brand: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
};
