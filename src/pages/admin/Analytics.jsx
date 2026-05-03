import { useApi } from '../../lib/useApi';
import { getAnalytics } from '../../api/admin';
import Badge from '../../components/admin/Badge';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const TONE = {
  primary: 'var(--text-primary)',
  warning: 'var(--text-warning)',
  success: 'var(--color-sage-500)',
};

export default function Analytics() {
  const toast = useToast();
  const query = useApi(getAnalytics, []);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading analytics…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }
  const { kpis, gmv, expiryWatch } = query.data;
  const maxGmv = Math.max(...gmv.map((b) => b.gmv));
  const latest = gmv[gmv.length - 1].label;

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.overline}>Platform Health</div>
        <h1 style={styles.h1}>Compliance Analytics</h1>
      </div>

      <div style={styles.kpiRow}>
        {kpis.map((k) => (
          <div key={k.label} style={styles.kpiCard}>
            <div style={styles.kpiLabel}>{k.label}</div>
            <div style={{ ...styles.kpiVal, color: TONE[k.tone] }}>{k.value}</div>
            <div style={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>Gross Merchandise Value — ZAR Millions</div>
        <div style={styles.chartRow}>
          {gmv.map((b) => {
            const heightPct = (b.gmv / maxGmv) * 100;
            const isLatest = b.label === latest;
            return (
              <div key={b.label} style={styles.barCol}>
                <div style={{ fontSize: 10, color: 'var(--text-warning)', fontWeight: 600 }}>{b.gmv}M</div>
                <div
                  style={{
                    ...styles.bar,
                    height: `${Math.max(heightPct, 8)}%`,
                    opacity: isLatest ? 1 : 0.55,
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-overline)' }}>{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.watchCard}>
        <div style={styles.chartTitle}>Licence Expiry Watchdog — Next 90 Days</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {expiryWatch.map((e) => (
            <div key={e.doc} style={styles.watchRow}>
              <div style={styles.watchDoc}>{e.doc}</div>
              <div style={styles.watchName}>{e.name}</div>
              <Badge label={`${e.days} remaining`} scheme="pending" />
              <button
                onClick={() => toast.success(`Notification sent to ${e.name}`)}
                style={styles.notifyBtn}
              >
                Notify
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '26px 28px' },
  overline: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 28,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1,
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 10,
    marginBottom: 24,
  },
  kpiCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 16px',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 8,
  },
  kpiVal: {
    fontFamily: 'var(--font-display)',
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1,
    marginBottom: 4,
  },
  kpiSub: { fontSize: 11, color: 'var(--text-tertiary)' },
  chartCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
  chartRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
    height: 140,
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    background: 'linear-gradient(180deg, var(--text-warning) 0%, var(--color-mustard-500) 100%)',
    borderRadius: '4px 4px 0 0',
    minHeight: 8,
    transition: 'opacity var(--transition-base)',
  },
  watchCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
  },
  watchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  watchDoc: { flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  watchName: { fontSize: 11, color: 'var(--text-tertiary)' },
  notifyBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
};
