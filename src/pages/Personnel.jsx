import { useState } from 'react';
import { useApi } from '../lib/useApi';
import { listPersonnel } from '../api/personnel';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';
import HireModal from '../components/HireModal';

// Filter chips. Each one maps to a `listPersonnel` filter object —
// see resolveFilter() below. Order matches the SACAA Parts plus
// availability and a few popular city shortcuts.
const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'available',    label: 'Available' },
  // SACAA Parts
  { key: 'flight_crew',     label: 'Pilots (61)' },
  { key: 'national_pilot',  label: 'NPL (62)' },
  { key: 'flight_engineer', label: 'Flight Engineer (63)' },
  { key: 'cabin_crew',      label: 'Cabin Crew (64)' },
  { key: 'atc',             label: 'ATC (65)' },
  { key: 'ame',             label: 'AME (66)' },
  { key: 'aviation_medical',label: 'DAME (67)' },
  { key: 'glider_pilot',    label: 'Glider (68)' },
  { key: 'balloon_pilot',   label: 'Balloon (69)' },
  { key: 'rpas_pilot',      label: 'RPAS (71)' },
  { key: 'non_licensed',    label: 'Ground Ops' },
  // Cities
  { key: 'loc:Johannesburg', label: 'Johannesburg' },
  { key: 'loc:Cape Town',    label: 'Cape Town' },
  { key: 'loc:Pretoria',     label: 'Pretoria' },
];

function resolveFilter(key) {
  if (key === 'all') return {};
  if (key === 'available') return { availableOnly: true };
  if (key.startsWith('loc:')) return { location: key.slice(4) };
  return { discipline: key };
}

// Discipline → short label shown on the contractor card.
const DISCIPLINE_LABEL = {
  flight_crew:      'Pilot',
  national_pilot:   'NPL',
  glider_pilot:     'Glider',
  balloon_pilot:    'Balloon',
  rpas_pilot:       'RPAS',
  flight_engineer:  'FE',
  cabin_crew:       'Cabin Crew',
  atc:              'ATC',
  ame:              'AME',
  aviation_medical: 'DAME',
  non_licensed:     'Ground Ops',
};

const STATUS_CFG = {
  verified: { bg: 'var(--status-verified-bg)', color: 'var(--status-verified-text)', border: 'var(--status-verified-border)', label: '✓ Verified' },
  expiring: { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: 'Expiring' },
  expired:  { bg: 'var(--status-expired-bg)',  color: 'var(--status-expired-text)',  border: 'var(--status-expired-border)',  label: 'Expired' },
  pending:  { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: 'Pending' },
};

const STAT_PILLS = [
  { value: '142', label: 'Total Verified',  color: 'var(--text-primary)' },
  { value: '64',  label: 'Available Now',   color: 'var(--text-success)' },
  { value: '7',   label: 'Expiring <90d',   color: 'var(--text-warning)' },
  { value: '3',   label: 'Expired',         color: 'var(--text-danger)' },
];

function ContractorCard({ c, onHire }) {
  const tone = STATUS_CFG[c.status] || STATUS_CFG.pending;
  const disabled = !c.available || c.status === 'expired';
  const hireLabel = !c.available
    ? 'Unavailable'
    : c.status === 'expired'
    ? 'Licence Expired'
    : 'Hire Contractor';

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          style={{
            ...styles.avatar,
            background: c.available ? 'rgba(212, 169, 52, 0.15)' : 'var(--surface-input)',
            color: c.available ? 'var(--text-warning)' : 'var(--text-secondary)',
          }}
        >
          {c.initials}
          {c.available && <span style={styles.availDot} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={styles.name}>{c.name}</div>
            <span style={{ ...styles.badge, background: tone.bg, color: tone.color, borderColor: tone.border }}>
              {tone.label}
            </span>
          </div>
          <div style={styles.role}>{c.role}</div>
          <div style={styles.licence}>
            {c.sacaaPart ? `Part ${c.sacaaPart}` : DISCIPLINE_LABEL[c.discipline] || c.rating}
            {c.licenceSubtype ? ` · ${c.licenceSubtype}` : ''}
            {c.medicalClass && c.medicalClass !== 'none' ? ` · ${c.medicalClass.replace('_', ' ')}` : ''}
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {(c.types || []).map((t) => <span key={`t-${t}`} style={styles.typeTag}>{t}</span>)}
        {(c.endorsements || []).slice(0, 3).map((e) => (
          <span key={`e-${e}`} style={{ ...styles.typeTag, color: 'var(--text-warning)' }}>{e}</span>
        ))}
        <span style={{ ...styles.typeTag, marginLeft: 'auto', color: 'var(--text-tertiary)' }}>{c.location}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={styles.rate}>{c.rate}</div>
        <button
          onClick={() => onHire(c)}
          disabled={disabled}
          style={{ ...styles.hireBtn, ...(disabled ? styles.hireBtnDisabled : {}) }}
        >
          {hireLabel}
        </button>
      </div>
    </div>
  );
}

export default function Personnel() {
  const [filter, setFilter] = useState('all');
  const [hired, setHired] = useState(null);

  const query = useApi(() => listPersonnel(resolveFilter(filter)), [filter]);
  const filtered = query.data || [];
  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label ?? filter;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Supply Side</div>
          <h1 style={styles.h1}>Personnel Marketplace</h1>
        </div>
        <button style={styles.btnPrimary}>+ Post Requirement</button>
      </div>

      <div style={styles.stats}>
        {STAT_PILLS.map((s) => (
          <div key={s.label} style={styles.statPill}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</span>
            <span style={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={styles.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.loading && !query.data ? (
        <LoadingBlock label="Loading contractors…" />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={query.refetch} />
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No contractors match "{activeFilterLabel}"</div>
          <div style={styles.emptySub}>Switch back to "All" or try another category.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((c) => <ContractorCard key={c.id} c={c} onHire={setHired} />)}
        </div>
      )}

      {hired && <HireModal contractor={hired} onClose={() => setHired(null)} />}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  stats: { display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' },
  statPill: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '10px 18px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
  },
  statLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 },
  filterBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
  },
  filterBtnActive: {
    background: 'rgba(212, 169, 52, 0.12)',
    borderColor: 'rgba(212, 169, 52, 0.30)',
    color: 'var(--text-accent)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: 14,
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: '1.5px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    position: 'relative',
  },
  availDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#3A8A6E',
    border: '2px solid var(--surface-card)',
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  role: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 },
  licence: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-warning)',
    marginTop: 2,
  },
  badge: {
    borderRadius: 'var(--radius-pill)',
    padding: '2px 7px',
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  divider: { height: 1, background: 'rgba(255, 255, 255, 0.06)', margin: '12px 0' },
  typeTag: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-secondary)',
    borderRadius: 4,
    padding: '2px 7px',
    fontSize: 11,
  },
  rate: {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  hireBtn: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hireBtnDisabled: {
    background: 'var(--surface-input)',
    color: 'var(--text-overline)',
    cursor: 'not-allowed',
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
};
