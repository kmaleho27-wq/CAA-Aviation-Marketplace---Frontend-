import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { listMyProspects, getMyReferralSummary, formatCents, updateProspect } from '../api/referrals';
import { useToast } from '../lib/toast';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/referrals — the broker dashboard.
//
// Aeropreserve lands here after sign-in and sees:
//   1. Headline numbers (total introductions, signed up, deals,
//      money owed)
//   2. Their referral pipeline (prospect list with status chips,
//      inline status updates)
//   3. Recent deal activity from broker_referral_summary
//
// The narrative we want him to feel: "the platform is doing the work
// I used to do, and showing me what it owes me." That's why the
// money section sits below the network section — first the proof
// you're earning trust, then the proof you're earning money.

const ACCOUNT_TYPE_LABEL = {
  supplier:          { label: 'Supplier',     color: 'var(--text-accent)' },
  mro_customer:      { label: 'MRO Customer', color: 'var(--color-sage-500)' },
  airline_customer:  { label: 'Airline',      color: 'var(--text-warning)' },
};

const STATUS_TONE = {
  invited:    { label: '✉ Invited',     bg: 'rgba(212,169,52,0.10)', color: 'var(--text-warning)',    border: 'rgba(212,169,52,0.30)' },
  contacted:  { label: '☎ Contacted',   bg: 'rgba(212,169,52,0.15)', color: 'var(--text-warning)',    border: 'rgba(212,169,52,0.35)' },
  signed_up:  { label: '✓ Signed up',   bg: 'rgba(58,138,110,0.15)', color: 'var(--color-sage-500)',  border: 'rgba(58,138,110,0.35)' },
  declined:   { label: '✕ Declined',    bg: 'rgba(196,48,48,0.10)',  color: 'var(--text-danger)',     border: 'rgba(196,48,48,0.30)' },
};

const COUNTRY_FLAG = {
  ZA: '🇿🇦', GB: '🇬🇧', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', AE: '🇦🇪',
  IE: '🇮🇪', CZ: '🇨🇿', RU: '🇷🇺', ID: '🇮🇩', IN: '🇮🇳', PH: '🇵🇭',
};

function StatCard({ label, value, sub, tone }) {
  const valueColor =
    tone === 'success' ? 'var(--color-sage-500)' :
    tone === 'warning' ? 'var(--text-warning)' :
    tone === 'danger'  ? 'var(--text-danger)' :
                         'var(--text-primary)';
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statVal, color: valueColor }}>{value}</div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

function ProspectRow({ p, onStatusChange }) {
  const tone = STATUS_TONE[p.status] || STATUS_TONE.invited;
  const typeInfo = ACCOUNT_TYPE_LABEL[p.accountType] || { label: p.accountType, color: 'var(--text-secondary)' };
  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p.country && COUNTRY_FLAG[p.country] && (
            <span style={{ fontSize: 16 }}>{COUNTRY_FLAG[p.country]}</span>
          )}
          <div>
            <div style={styles.orgName}>{p.organization}</div>
            <div style={styles.orgMeta}>
              <span style={{ color: typeInfo.color, fontWeight: 600 }}>{typeInfo.label}</span>
              {p.country && <> · {p.country}</>}
              {p.suggestedMarkupPct != null && (
                <> · suggested {Math.round(p.suggestedMarkupPct)}%</>
              )}
            </div>
          </div>
        </div>
      </td>
      <td style={styles.td}>
        <div style={styles.contactStack}>
          {p.contactEmail && <span style={styles.email}>{p.contactEmail}</span>}
          {p.contactPhone && <span style={styles.phone}>{p.contactPhone}</span>}
          {!p.contactEmail && !p.contactPhone && (
            <span style={styles.missing}>No contact yet</span>
          )}
        </div>
      </td>
      <td style={styles.td}>
        <select
          value={p.status}
          onChange={(e) => onStatusChange(p.id, e.target.value)}
          style={{
            ...styles.statusSelect,
            background: tone.bg,
            color: tone.color,
            borderColor: tone.border,
          }}
        >
          <option value="invited">Invited</option>
          <option value="contacted">Contacted</option>
          <option value="signed_up">Signed up</option>
          <option value="declined">Declined</option>
        </select>
      </td>
    </tr>
  );
}

export default function Referrals() {
  const prospectsQuery = useApi(listMyProspects, []);
  const summaryQuery   = useApi(getMyReferralSummary, []);
  const [prospects, setProspects] = useState([]);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  useEffect(() => {
    if (prospectsQuery.data) setProspects(prospectsQuery.data);
  }, [prospectsQuery.data]);

  const handleStatusChange = async (id, nextStatus) => {
    // Optimistic update — feels instant; revert on error.
    const prev = prospects;
    setProspects((rows) =>
      rows.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)),
    );
    try {
      await updateProspect(id, { status: nextStatus });
      toast.success(`Status updated`);
    } catch (err) {
      setProspects(prev);
      toast.error(err.message || 'Could not update status');
    }
  };

  if (prospectsQuery.loading && !prospectsQuery.data) {
    return <div style={styles.page}><LoadingBlock label="Loading your network…" /></div>;
  }
  if (prospectsQuery.error) {
    return <div style={styles.page}><ErrorBlock error={prospectsQuery.error} onRetry={prospectsQuery.refetch} /></div>;
  }

  const allProspects = prospects;
  const suppliers       = allProspects.filter((p) => p.accountType === 'supplier');
  const mroCustomers    = allProspects.filter((p) => p.accountType === 'mro_customer');
  const signedUp        = allProspects.filter((p) => p.status === 'signed_up').length;
  const summary         = summaryQuery.data;

  const filteredProspects = filter === 'all' ? allProspects
    : filter === 'signed_up' ? allProspects.filter((p) => p.status === 'signed_up')
    : filter === 'pending'   ? allProspects.filter((p) => p.status !== 'signed_up' && p.status !== 'declined')
    : allProspects.filter((p) => p.accountType === filter);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Referrals</div>
          <h1 style={styles.h1}>Your network</h1>
          <div style={styles.sub}>
            Companies you've introduced to Naluka. When they sign up and transact,
            your 50% share of the platform markup lands here automatically.
          </div>
        </div>
      </div>

      {/* Headline numbers */}
      <div style={styles.statsRow}>
        <StatCard
          label="Introductions"
          value={allProspects.length}
          sub={`${suppliers.length} suppliers · ${mroCustomers.length} MROs`}
        />
        <StatCard
          label="Signed up"
          value={`${signedUp} / ${allProspects.length}`}
          sub={signedUp === 0 ? 'Get them on the platform' : 'Real users now'}
          tone={signedUp > 0 ? 'success' : undefined}
        />
        <StatCard
          label="Deals closed"
          value={summary?.confirmedDeals ?? 0}
          sub={summary && summary.pendingDeals > 0 ? `+ ${summary.pendingDeals} in flight` : 'awaiting first deal'}
        />
        <StatCard
          label="Your cut owed"
          value={formatCents(summary?.owedCents)}
          sub={summary && summary.paidOutCents !== '0' ? `${formatCents(summary?.paidOutCents)} paid` : 'pre-payout'}
          tone="success"
        />
      </div>

      {/* Filter chips */}
      <div style={styles.filterRow}>
        {[
          { key: 'all',          label: `All (${allProspects.length})` },
          { key: 'signed_up',    label: `Signed up (${signedUp})` },
          { key: 'pending',      label: `Pending follow-up (${allProspects.length - signedUp - allProspects.filter(p=>p.status==='declined').length})` },
          { key: 'supplier',     label: `Suppliers (${suppliers.length})` },
          { key: 'mro_customer', label: `MROs (${mroCustomers.length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{ ...styles.chip, ...(filter === f.key ? styles.chipActive : {}) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Prospect table */}
      {filteredProspects.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No prospects match this filter</div>
          <div style={styles.emptySub}>Try "All" to see everyone, or pick a different category.</div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Organisation</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProspects.map((p) => (
                <ProspectRow key={p.id} p={p} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Money section — only renders once there's ledger activity.
          Until first real deal, the headline cards say it all. */}
      {summary && summary.totalDeals > 0 && (
        <div style={styles.moneySection}>
          <div style={styles.sectionHead}>
            <h2 style={styles.h2}>Money summary</h2>
          </div>
          <div style={styles.moneyGrid}>
            <div style={styles.moneyRow}>
              <span style={styles.moneyLabel}>Total markup captured</span>
              <span style={styles.moneyValue}>{formatCents(summary.totalMarkupCents)}</span>
            </div>
            <div style={styles.moneyRow}>
              <span style={styles.moneyLabel}>Your cut (confirmed)</span>
              <span style={{ ...styles.moneyValue, color: 'var(--color-sage-500)' }}>
                {formatCents(summary.totalCutConfirmedCents)}
              </span>
            </div>
            <div style={styles.moneyRow}>
              <span style={styles.moneyLabel}>Pending (in flight)</span>
              <span style={{ ...styles.moneyValue, color: 'var(--text-warning)' }}>
                {formatCents(summary.pendingCutCents)}
              </span>
            </div>
            <div style={styles.moneyRow}>
              <span style={styles.moneyLabel}>Paid out to date</span>
              <span style={styles.moneyValue}>{formatCents(summary.paidOutCents)}</span>
            </div>
            <div style={styles.moneyRow}>
              <span style={styles.moneyLabel}>Owed (confirmed, awaiting payout)</span>
              <span style={{ ...styles.moneyValue, color: 'var(--color-sage-500)', fontWeight: 700 }}>
                {formatCents(summary.owedCents)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  header: { marginBottom: 22 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 8 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 640, lineHeight: 1.55 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 22 },
  statCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  statLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6 },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, lineHeight: 1.1, marginBottom: 4 },
  statSub: { fontSize: 11, color: 'var(--text-tertiary)' },

  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  chip: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 11, cursor: 'pointer' },
  chipActive: { background: 'rgba(212,169,52,0.12)', borderColor: 'rgba(212,169,52,0.30)', color: 'var(--text-accent)' },

  tableWrap: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 22 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' },
  tr: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', verticalAlign: 'middle' },
  orgName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  orgMeta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
  contactStack: { display: 'flex', flexDirection: 'column', gap: 2 },
  email: { fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' },
  phone: { fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' },
  missing: { fontSize: 11, color: 'var(--text-overline)', fontStyle: 'italic' },
  statusSelect: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid', cursor: 'pointer', outline: 'none', minWidth: 110 },

  moneySection: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' },
  sectionHead: { marginBottom: 12 },
  h2: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '0.02em', margin: 0 },
  moneyGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  moneyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' },
  moneyLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  moneyValue: { fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },

  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center', marginBottom: 22 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)' },
};
