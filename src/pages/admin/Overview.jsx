import { useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { getAdminOverview } from '../../api/admin';
import Badge from '../../components/admin/Badge';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const TONE = {
  primary: 'var(--text-primary)',
  warning: 'var(--text-warning)',
  success: 'var(--color-sage-500)',
  aog:     'var(--text-aog)',
};

const RISK_TO_BADGE = {
  low:    { label: 'Low Risk',    scheme: 'verified' },
  medium: { label: 'Review',      scheme: 'pending'  },
  high:   { label: 'High Risk',   scheme: 'rejected' },
};

export default function Overview() {
  const navigate = useNavigate();
  const query = useApi(getAdminOverview, []);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading overview…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }
  const { kpis, recentKyc, openDisputes } = query.data;

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 22 }}>
        <div style={styles.overline}>Trust Engine</div>
        <h1 style={styles.h1}>Platform Overview</h1>
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

      {openDisputes > 0 && (
        <div style={styles.disputeAlert}>
          <div style={styles.disputeStripe} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.disputeTitle}>{openDisputes} Active Dispute{openDisputes === 1 ? '' : 's'} Require Review</div>
            <div style={styles.disputeBody}>Funds locked pending resolution</div>
          </div>
          <button onClick={() => navigate('/admin/disputes')} style={styles.disputeBtn}>Review →</button>
        </div>
      )}

      <div style={styles.sectionRow}>
        <div style={styles.sectionTitle}>Recent KYC Applications</div>
        <button onClick={() => navigate('/admin/kyc')} style={styles.viewAll}>View all →</button>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Type', 'Licence', 'Risk', 'Submitted', 'Action'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentKyc.map((a) => {
              const tone = RISK_TO_BADGE[a.risk];
              return (
                <tr key={a.id}>
                  <td style={{ ...styles.td, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{a.name}</td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-secondary)' }}>{a.type}</td>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-warning)' }}>{a.license}</td>
                  <td style={styles.td}><Badge label={tone.label} scheme={tone.scheme} /></td>
                  <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-overline)' }}>{a.submitted}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate('/admin/kyc')} style={styles.approveBtn}>Approve</button>
                      <button onClick={() => navigate('/admin/kyc')} style={styles.reviewBtn}>Review</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
    fontSize: 26,
    fontWeight: 400,
    lineHeight: 1,
    marginBottom: 5,
  },
  kpiSub: { fontSize: 11, color: 'var(--text-tertiary)' },
  disputeAlert: {
    background: 'rgba(184, 74, 26, 0.08)',
    border: '1px solid rgba(184, 74, 26, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 16px',
    marginBottom: 20,
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  disputeStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: 'var(--color-rust-600)',
  },
  disputeTitle: { fontWeight: 600, color: 'var(--text-aog)', fontSize: 13, marginBottom: 2 },
  disputeBody: { fontSize: 11, color: 'var(--text-secondary)' },
  disputeBtn: {
    background: 'var(--action-aog)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  sectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  viewAll: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-warning)',
    fontSize: 12,
    cursor: 'pointer',
  },
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
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    verticalAlign: 'middle',
  },
  approveBtn: {
    background: '#3A8A6E',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  },
  reviewBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 8px',
    fontSize: 10,
    cursor: 'pointer',
  },
};
