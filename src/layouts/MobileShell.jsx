import { Outlet } from 'react-router-dom';
import ContractorSidebar from '../components/ContractorSidebar';
import { ToastProvider } from '../lib/toast';

// MobileShell — historically wrapped contractor pages in a phone-frame
// mockup. That gave a narrow centered card with empty space on the
// sides on desktop, which felt off vs the admin/operator shells.
//
// This now matches AppShell + AdminShell exactly: a fixed sidebar
// (ContractorSidebar) and a flexible main area filling the rest. The
// inner contractor pages (Wallet / Jobs / Sign-off / Profile) live
// inside `main` and naturally inherit the full content width.
//
// File name retained to keep route imports stable — see App.jsx.

export default function MobileShell() {
  return (
    <ToastProvider>
      <div style={styles.shell}>
        <ContractorSidebar />
        <div style={styles.column}>
          <main style={styles.main}>
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

const styles = {
  shell: {
    display: 'flex',
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--surface-base)',
  },
  column: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
};
