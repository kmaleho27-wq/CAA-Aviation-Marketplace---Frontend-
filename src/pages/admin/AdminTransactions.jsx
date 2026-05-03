import { useMemo } from 'react';
import { useApi } from '../../lib/useApi';
import { listTransactions } from '../../api/transactions';
import Badge from '../../components/admin/Badge';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const STATUS_BADGE = {
  'rts-pending': { label: 'Awaiting RTS',     scheme: 'pending'  },
  'in-escrow':   { label: 'In Escrow',        scheme: 'pending'  },
  'completed':   { label: '✓ Completed',      scheme: 'verified' },
  'dispute':     { label: 'Dispute Open',     scheme: 'dispute'  },
};

function parseAmount(amount) {
  const n = Number(String(amount).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function AdminTransactions() {
  const query = useApi(listTransactions, []);
  const txns = query.data || [];
  const totals = useMemo(() => ({
    count: txns.length,
    escrow: txns
      .filter((t) => t.status === 'in-escrow' || t.status === 'rts-pending')
      .reduce((acc, t) => acc + parseAmount(t.amount), 0),
    disputes: txns.filter((t) => t.status === 'dispute').length,
    completed: txns.filter((t) => t.status === 'completed').length,
  }), [txns]);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading transactions…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.overline}>Platform Activity</div>
        <h1 style={styles.h1}>Transactions</h1>
      </div>

      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Volume</div>
          <div style={{ ...styles.kpiVal, color: 'var(--text-primary)' }}>{totals.count}</div>
          <div style={styles.kpiSub}>Across all parties</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>In Escrow</div>
          <div style={{ ...styles.kpiVal, color: 'var(--text-warning)' }}>
            ZAR {totals.escrow.toLocaleString('en-ZA')}
          </div>
          <div style={styles.kpiSub}>Locked pending RTS</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Completed</div>
          <div style={{ ...styles.kpiVal, color: 'var(--color-sage-500)' }}>{totals.completed}</div>
          <div style={styles.kpiSub}>Settled this period</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Disputes</div>
          <div style={{ ...styles.kpiVal, color: 'var(--text-aog)' }}>{totals.disputes}</div>
          <div style={styles.kpiSub}>Open</div>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['TXN ID', 'Type', 'Item', 'Buyer', 'Seller', 'Amount', 'Status', 'Updated'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => {
              const tone = STATUS_BADGE[t.status];
              return (
                <tr key={t.id}>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-warning)' }}>{t.id}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-tertiary)' }}>{t.type}</td>
                  <td style={{ ...styles.td, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{t.item}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-secondary)' }}>—</td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-secondary)' }}>{t.party}</td>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)' }}>{t.amount}</td>
                  <td style={styles.td}><Badge label={tone.label} scheme={tone.scheme} /></td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-overline)' }}>{t.updated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={styles.note}>Read-only view. Trust Engine cannot mutate operator-signed transactions.</div>
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
    marginBottom: 20,
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
  tableWrap: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  th: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    padding: '9px 14px',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-subtle)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    verticalAlign: 'middle',
  },
  note: {
    fontSize: 11,
    color: 'var(--text-overline)',
    marginTop: 10,
  },
};
