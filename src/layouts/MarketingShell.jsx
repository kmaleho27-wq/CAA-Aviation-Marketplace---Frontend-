import { Outlet } from 'react-router-dom';
import MarketingNav from '../components/marketing/MarketingNav';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function MarketingShell() {
  return (
    <div style={styles.shell}>
      <MarketingNav />
      <main style={styles.main}>
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}

const styles = {
  shell: {
    flex: 1,
    minWidth: 0,
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: 'var(--surface-base)',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
  },
};
