import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopBar from '../components/AdminTopBar';
import { ToastProvider } from '../lib/toast';

export default function AdminShell() {
  return (
    <ToastProvider>
      <div style={styles.shell}>
        <AdminSidebar />
        <div style={styles.column}>
          <AdminTopBar />
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
