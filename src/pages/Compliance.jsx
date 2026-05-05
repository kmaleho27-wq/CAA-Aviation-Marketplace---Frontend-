import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { getComplianceSummary } from '../api/compliance';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// Operator compliance dashboard. The single screenshot a Director of
// Quality sends to SACAA when audited: "here's our crew, here's their
// status, here's what's expiring." Designed to be print-friendly and
// not require explanation — the colors do the work.

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

const STATUS_TONE = {
  verified: { bg: 'rgba(58, 138, 110, 0.14)', color: 'var(--color-sage-500)',  border: 'rgba(58, 138, 110, 0.30)', label: '✓ Verified' },
  expiring: { bg: 'rgba(212, 169, 52, 0.14)', color: 'var(--text-warning)',    border: 'rgba(212, 169, 52, 0.30)', label: '⚠ Expiring' },
  expired:  { bg: 'rgba(196, 48, 48, 0.10)',  color: 'var(--text-danger)',     border: 'rgba(196, 48, 48, 0.25)',  label: '✕ Expired' },
  pending:  { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',    border: 'rgba(212, 169, 52, 0.25)', label: 'Pending' },
  rejected: { bg: 'rgba(196, 48, 48, 0.10)',  color: 'var(--text-danger)',     border: 'rgba(196, 48, 48, 0.25)',  label: 'Rejected' },
  mixed:    { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',    border: 'rgba(212, 169, 52, 0.25)', label: 'Action needed' },
};

function StatCard({ label, value, sub, tone = 'primary' }) {
  const colors = {
    primary: 'var(--text-primary)',
    success: 'var(--color-sage-500)',
    warning: 'var(--text-warning)',
    danger:  'var(--text-danger)',
  };
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statVal, color: colors[tone] }}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function CrewRow({ c }) {
  const days = daysUntil(c.earliestExpiry);
  const tone = STATUS_TONE[c.overallStatus] || STATUS_TONE.pending;
  const dayColor = days == null ? 'var(--text-overline)'
    : days < 0 ? 'var(--text-danger)'
    : days <= 30 ? 'var(--text-warning)'
    : days <= 90 ? 'var(--text-warning)'
    : 'var(--text-secondary)';

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.avatar}>{c.initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.crewName}>
              {c.name}
              {c.source === 'hired' && (
                <span style={styles.hiredBadge} title="Active engagement (not your direct crew)">
                  Hired
                </span>
              )}
            </div>
            <div style={styles.crewSub}>
              {DISCIPLINE_LABEL[c.primaryDiscipline] || c.primaryDiscipline}
              {c.credentials.length > 0 && (
                <span style={{ color: 'var(--color-sage-500)' }}>
                  {' '}+ {c.credentials.map((d) => DISCIPLINE_LABEL[d.discipline] || d.discipline).join(' · ')}
                </span>
              )}
              {c.documents.length > 0 && (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {' · '}{c.documents.length} doc{c.documents.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.statusPill, background: tone.bg, color: tone.color, borderColor: tone.border }}>
          {tone.label}
        </span>
      </td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        {fmtDate(c.earliestExpiry)}
      </td>
      <td style={{ ...styles.td, color: dayColor, fontWeight: days != null && days <= 30 ? 600 : 400 }}>
        {days == null ? '—' : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
      </td>
    </tr>
  );
}

export default function Compliance() {
  const query = useApi(getComplianceSummary, []);
  const navigate = useNavigate();

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading compliance picture…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  const s = query.data;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Compliance</div>
          <h1 style={styles.h1}>Crew compliance</h1>
          <div style={styles.sub}>
            Snapshot of your crew's SACAA credential status — primary discipline, additional credentials, and on-file documents. Sorted by urgency, at-risk crew at the top.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }} className="audit-pack-noprint">
          <button onClick={() => navigate('/app/audit-pack')} style={styles.auditBtn}>
            Generate audit pack →
          </button>
          <button onClick={() => window.print()} style={styles.printBtn}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {s.total === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No crew yet</div>
          <div style={styles.emptySub}>
            Add crew members from <strong>Crew → + Add</strong> to start tracking compliance.
          </div>
        </div>
      ) : (
        <>
          <div style={styles.statsGrid}>
            <StatCard
              label="Verified"
              value={`${s.verifiedPct}%`}
              sub={`${s.verified} of ${s.total} crew`}
              tone={s.verifiedPct >= 80 ? 'success' : s.verifiedPct >= 50 ? 'warning' : 'danger'}
            />
            <StatCard
              label="At risk (≤30 days)"
              value={s.atRisk30}
              sub="Need action this month"
              tone={s.atRisk30 === 0 ? 'success' : 'warning'}
            />
            <StatCard
              label="Expired"
              value={s.expired}
              sub="Already non-compliant"
              tone={s.expired === 0 ? 'success' : 'danger'}
            />
            <StatCard
              label="Pending verification"
              value={s.pending}
              sub="Awaiting Naluka admin"
              tone={s.pending === 0 ? 'success' : 'warning'}
            />
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Crew member</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Earliest expiry</th>
                  <th style={styles.th}>Time left</th>
                </tr>
              </thead>
              <tbody>
                {s.crew.map((c) => <CrewRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>

          <div style={styles.footer}>
            Generated {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {s.total} crew member{s.total === 1 ? '' : 's'}
            {s.hiredCount > 0 ? ` (${s.hiredCount} hired)` : ''}
            {' · '}
            naluka.aero
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
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
  sub: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 520, lineHeight: 1.5 },
  printBtn: {
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
  auditBtn: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 22,
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
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 8,
  },
  statVal: {
    fontFamily: 'var(--font-display)',
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1,
    marginBottom: 6,
  },
  statSub: { fontSize: 11, color: 'var(--text-tertiary)' },
  tableWrap: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--surface-raised)',
  },
  tr: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', verticalAlign: 'middle' },
  avatar: {
    width: 32, height: 32,
    background: 'rgba(212, 169, 52, 0.15)',
    color: 'var(--text-warning)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
    flexShrink: 0,
  },
  crewName: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 },
  hiredBadge: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--text-warning)',
    background: 'rgba(212, 169, 52, 0.10)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderRadius: 'var(--radius-pill)',
    padding: '1px 6px',
  },
  crewSub: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  statusPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  empty: {
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 24px',
    textAlign: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)' },
  footer: {
    marginTop: 16,
    fontSize: 10,
    color: 'var(--text-overline)',
    fontFamily: 'var(--font-mono)',
    textAlign: 'right',
  },
};
