import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { getKpis, getAogEvents } from '../api/dashboard';
import { listPersonnel } from '../api/personnel';
import { listTransactions } from '../api/transactions';
import { getComplianceSummary } from '../api/compliance';
import { supabase } from '../lib/supabase';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// Pretty labels for raw sacaa_discipline enum values shown on the
// dashboard's personnel preview table. Matches the labels used in
// /app/personnel and /app/compliance for visual consistency.
const DISCIPLINE_LABEL = {
  flight_crew:      'Pilot',
  national_pilot:   'NPL',
  glider_pilot:     'Glider',
  balloon_pilot:    'Balloon',
  rpas_pilot:       'RPAS',
  flight_engineer:  'FE',
  cabin_crew:       'Cabin',
  atc:              'ATC',
  ame:              'AME',
  aviation_medical: 'DAME',
  non_licensed:     'Ground',
};

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

function ComplianceRow({ p }) {
  const s = STATUS_MAP[p.status] || STATUS_MAP.pending;
  const extraCount = (p.extraDisciplines || []).length;
  return (
    <tr>
      <td style={styles.td}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</span>
        {extraCount > 0 && (
          <span style={{ fontSize: 10, color: 'var(--color-sage-500)', marginLeft: 8 }}>
            + {p.extraDisciplines.map((d) => DISCIPLINE_LABEL[d] || d).join(' · ')}
          </span>
        )}
      </td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-accent)' }}>{p.license || '—'}</td>
      <td style={styles.td}>{DISCIPLINE_LABEL[p.discipline] || p.discipline}</td>
      <td style={styles.td}>{p.location || '—'}</td>
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
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: !p.expires ? 'var(--text-overline)' : 'var(--text-secondary)' }}>
        {p.expires ? new Date(p.expires).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const kpis = useApi(getKpis, []);
  const aog = useApi(getAogEvents, []);
  const personnel = useApi(() => listPersonnel({ filter: 'All' }), []);
  const txns = useApi(listTransactions, []);
  // getComplianceSummary returns total=0 for users without crew —
  // banner gracefully renders nothing in that case.
  const compliance = useApi(getComplianceSummary, []);

  const pendingActions = (txns.data ?? []).filter((t) =>
    t.status === 'rts-pending' || t.status === 'in-escrow',
  );

  // Realtime: refresh AOG events + KPIs whenever a row in aog_event changes.
  // Requires the table to be in the supabase_realtime publication
  // (supabase/migrations/0005_realtime_publication.sql). Without that the
  // subscription resolves but no events fire — graceful degradation.
  useEffect(() => {
    const channel = supabase
      .channel('aog_event_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aog_event' },
        () => {
          aog.refetch();
          kpis.refetch();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {pendingActions.length > 0 && (
        <div style={styles.actionBanner} onClick={() => navigate('/app/transactions')}>
          <span style={styles.actionDot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.actionTitle}>
              {pendingActions.length} transaction{pendingActions.length === 1 ? '' : 's'} awaiting your sign-off
            </div>
            <div style={styles.actionSub}>
              Funds are in escrow until you sign Release-to-Service. Click to review.
            </div>
          </div>
          <span style={styles.actionArrow}>→</span>
        </div>
      )}

      {/* Compliance health banner — only renders for operators with crew.
          Surfaces at-risk count + verified % so the operator sees the
          most urgent compliance signal on every login. */}
      {compliance.data && compliance.data.total > 0 && (
        <div
          style={{
            ...styles.complianceBanner,
            ...(compliance.data.atRisk30 > 0 ? styles.complianceBannerAlert : styles.complianceBannerHealthy),
          }}
          onClick={() => navigate('/app/compliance')}
        >
          <div style={styles.complianceLeft}>
            <div style={styles.complianceTitle}>
              {compliance.data.atRisk30 > 0
                ? `${compliance.data.atRisk30} crew member${compliance.data.atRisk30 === 1 ? '' : 's'} at risk in the next 30 days`
                : `All ${compliance.data.total} crew compliant — ${compliance.data.verifiedPct}% fully verified`}
            </div>
            <div style={styles.complianceSub}>
              {compliance.data.expired > 0 && `${compliance.data.expired} expired · `}
              {compliance.data.pending > 0 && `${compliance.data.pending} pending verification · `}
              Click to view full compliance picture
            </div>
          </div>
          <span style={styles.complianceArrow}>→</span>
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
      ) : aog.data.length === 0 ? (
        <div style={styles.aogEmpty}>
          <span style={styles.aogEmptyIcon}>✈️</span>
          <div>
            <div style={styles.aogEmptyTitle}>No active AOG events</div>
            <div style={styles.aogEmptySub}>Your fleet is in the air. Live AOG events appear here in real time.</div>
          </div>
        </div>
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
      ) : personnel.data.length === 0 ? (
        <div style={styles.personnelEmpty}>
          <div style={styles.personnelEmptyTitle}>No crew yet</div>
          <div style={styles.personnelEmptySub}>
            Add your first crew member to start tracking SACAA licence and medical status.
          </div>
          <button onClick={() => navigate('/app/personnel')} style={styles.personnelEmptyBtn}>
            + Add crew member
          </button>
        </div>
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
              {personnel.data.slice(0, 5).map((p) => <ComplianceRow key={p.id} p={p} />)}
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
  actionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(212, 169, 52, 0.08)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderLeft: '3px solid var(--color-mustard-500)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 16px',
    marginBottom: 24,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--color-mustard-500)',
    boxShadow: 'var(--glow-mustard)',
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  actionArrow: {
    color: 'var(--color-mustard-500)',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  complianceBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderRadius: 'var(--radius-lg)',
    padding: '12px 16px',
    marginBottom: 24,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  complianceBannerAlert: {
    background: 'rgba(196, 48, 48, 0.06)',
    border: '1px solid rgba(196, 48, 48, 0.20)',
    borderLeft: '3px solid var(--text-danger)',
  },
  complianceBannerHealthy: {
    background: 'rgba(58, 138, 110, 0.06)',
    border: '1px solid rgba(58, 138, 110, 0.20)',
    borderLeft: '3px solid var(--color-sage-500)',
  },
  complianceLeft: { flex: 1, minWidth: 0 },
  complianceTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 2,
  },
  complianceSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  complianceArrow: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  aogEmpty: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 18px',
    marginBottom: 28,
  },
  aogEmptyIcon: { fontSize: 22 },
  aogEmptyTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 },
  aogEmptySub: { fontSize: 11, color: 'var(--text-tertiary)' },
  personnelEmpty: {
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px 24px',
    textAlign: 'center',
  },
  personnelEmptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 },
  personnelEmptySub: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 },
  personnelEmptyBtn: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
