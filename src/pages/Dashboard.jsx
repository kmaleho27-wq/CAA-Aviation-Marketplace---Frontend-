import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { getKpis, getAogEvents } from '../api/dashboard';
import { listPersonnel } from '../api/personnel';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

const STAT_TONES = {
  primary: 'var(--text-primary)',
  mustard: 'var(--color-mustard-500)',
  warning: 'var(--text-warning)',
  aog:     'var(--text-aog)',
};

const STATUS_MAP = {
  verified: { bg: 'var(--status-verified-bg)', color: 'var(--status-verified-text)', border: 'var(--status-verified-border)', label: '✓ Verified' },
  expiring: { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: 'Expiring' },
  expired:  { bg: 'var(--status-expired-bg)',  color: 'var(--status-expired-text)',  border: 'var(--status-expired-border)',  label: 'Expired' },
  pending:  { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: 'Pending' },
};

function StatCard({ label, value, sub, tone }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statVal, color: STAT_TONES[tone] || STAT_TONES.primary }}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

function AOGAlert({ reg, location, part, matches, onRespond }) {
  return (
    <div style={styles.aogCard}>
      <div style={styles.aogStripe} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={styles.aogBadge}>⚡ AOG ACTIVE</span>
          <span style={styles.aogReg}>{reg}</span>
          <span style={styles.aogLoc}>· {location}</span>
        </div>
        <div style={styles.aogPart}>{part}</div>
        <div style={styles.aogMeta}>
          {matches} verified supplier{matches !== 1 ? 's' : ''} matched · Escrow ready
        </div>
      </div>
      <button onClick={onRespond} style={styles.respondBtn}>Respond →</button>
    </div>
  );
}

function ComplianceRow({ name, license, rating, location, status, expires }) {
  const s = STATUS_MAP[status];
  return (
    <tr>
      <td style={styles.td}><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span></td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-accent)' }}>{license}</td>
      <td style={styles.td}>{rating}</td>
      <td style={styles.td}>{location}</td>
      <td style={styles.td}>
        <span
          style={{
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
            borderRadius: 'var(--radius-pill)',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-block',
          }}
        >
          {s.label}
        </span>
      </td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: expires === '—' ? 'var(--text-overline)' : 'var(--text-secondary)' }}>
        {expires}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const kpis = useApi(getKpis, []);
  const aog = useApi(getAogEvents, []);
  const personnel = useApi(() => listPersonnel({ filter: 'All' }), []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Fleet Overview</div>
          <h1 style={styles.h1}>Compliance Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.btnGhost}>Export Report</button>
          <button onClick={() => navigate('/app/marketplace')} style={styles.btnPrimary}>+ Post Requirement</button>
        </div>
      </div>

      {kpis.loading && !kpis.data ? (
        <LoadingBlock label="Loading KPIs…" minHeight={120} />
      ) : kpis.error ? (
        <ErrorBlock error={kpis.error} onRetry={kpis.refetch} />
      ) : (
        <div style={styles.statsRow}>
          {kpis.data.map((k) => <StatCard key={k.label} {...k} />)}
        </div>
      )}

      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>
          <span style={styles.aogDot} />
          Active AOG Events
        </div>
        <button onClick={() => navigate('/app/marketplace')} style={styles.sectionLink}>
          View all in Marketplace →
        </button>
      </div>
      {aog.loading && !aog.data ? (
        <LoadingBlock label="Loading AOG events…" minHeight={120} />
      ) : aog.error ? (
        <ErrorBlock error={aog.error} onRetry={aog.refetch} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {aog.data.map((a) => (
            <AOGAlert key={a.id} {...a} onRespond={() => navigate('/app/marketplace')} />
          ))}
        </div>
      )}

      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>Personnel — Licence Status</div>
        <button onClick={() => navigate('/app/personnel')} style={styles.sectionLink}>
          Manage personnel →
        </button>
      </div>
      {personnel.loading && !personnel.data ? (
        <LoadingBlock label="Loading personnel…" minHeight={200} />
      ) : personnel.error ? (
        <ErrorBlock error={personnel.error} onRetry={personnel.refetch} />
      ) : (
        <div style={styles.tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Licence Ref', 'Rating', 'Location', 'Status', 'Expires'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.data.slice(0, 5).map((p) => <ComplianceRow key={p.id} {...p} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: '28px 32px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1,
  },
  btnPrimary: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  btnGhost: {
    background: 'transparent',
    color: 'var(--text-accent)',
    border: '1px solid rgba(212, 169, 52, 0.30)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 8,
  },
  statVal: {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1,
    marginBottom: 6,
  },
  statSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  sectionLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-accent)',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  aogDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--color-rust-600)',
    display: 'inline-block',
    boxShadow: '0 0 8px rgba(196, 66, 30, 0.6)',
    animation: 'pulse 1.5s infinite',
  },
  aogCard: {
    background: 'rgba(196, 66, 30, 0.08)',
    border: '1px solid rgba(196, 66, 30, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  aogStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: 'var(--color-rust-600)',
    borderRadius: '8px 0 0 8px',
  },
  aogBadge: {
    background: 'var(--status-aog-bg)',
    color: 'var(--status-aog-text)',
    border: '1px solid var(--status-aog-border)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
  },
  aogReg: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-warning)' },
  aogLoc: { fontSize: 12, color: 'var(--text-tertiary)' },
  aogPart: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 },
  aogMeta: { fontSize: 11, color: 'var(--text-tertiary)' },
  respondBtn: {
    background: 'var(--action-aog)',
    color: 'var(--action-aog-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  tableWrap: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  th: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    padding: '10px 14px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  td: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    padding: '11px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
};
