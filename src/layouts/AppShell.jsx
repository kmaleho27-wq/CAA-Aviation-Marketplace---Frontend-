import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import NotifPanel from '../components/NotifPanel';
import { ToastProvider } from '../lib/toast';
import { listNotifications, markAllRead } from '../api/notifications';
import { getAogEvents } from '../api/dashboard';

export default function AppShell() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [aogCount, setAogCount] = useState(0);

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
      <div style={styles.shell}>
        <Sidebar aogCount={aogCount} />
        <div style={styles.column}>
          <TopBar unread={unread} onNotifClick={toggleNotif} />
          <main style={styles.main}>
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
