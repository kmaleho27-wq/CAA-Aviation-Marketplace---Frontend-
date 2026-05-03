import { useState } from 'react';
import { useApi } from '../lib/useApi';
import { listParts } from '../api/parts';
import { getAogEvents } from '../api/dashboard';
import { LoadingBlock, ErrorBlock } from './../components/ApiState';
import ProcurementWizard from '../components/ProcurementWizard';

const CATEGORIES = ['All', 'AOG Priority', 'Rotables', 'Consumables', 'Avionics', 'Engines', 'Landing Gear'];

const STATUS_TONES = {
  verified: { bg: 'var(--status-verified-bg)', color: 'var(--status-verified-text)', border: 'var(--status-verified-border)', label: '✓ Verified' },
  expiring: { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: 'Cert Expiring' },
};

const CONDITION_COLOR = {
  New:          'var(--text-success)',
  Overhauled:   'var(--text-warning)',
  Serviceable:  'var(--text-secondary)',
};

function PartCard({ part, onBuy }) {
  const tone = STATUS_TONES[part.status] || STATUS_TONES.verified;

  return (
    <div style={styles.card}>
      {part.aog && <div style={styles.aogRibbon}>⚡ AOG</div>}
      <div style={styles.cardImg}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2E6199" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z" />
          <path d="M12 22V12" />
          <path d="M22 8.5L12 12 2 8.5" />
        </svg>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={styles.partName}>{part.name}</div>
        <div style={styles.pn}>{part.pn}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ ...styles.tag, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>{tone.label}</span>
          <span style={styles.tag}>{part.cert}</span>
          <span style={{ ...styles.tag, color: CONDITION_COLOR[part.condition] || 'var(--text-secondary)' }}>{part.condition}</span>
        </div>
        <div style={styles.supplier}>{part.supplier} · {part.location}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={styles.price}>{part.price}</div>
          <button onClick={() => onBuy(part)} style={part.aog ? styles.btnAog : styles.btnBuy}>
            {part.aog ? 'AOG Procure' : 'Request Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const partsQuery = useApi(() => listParts({ search, category }), [search, category]);
  const aogQuery = useApi(getAogEvents, []);

  const filtered = partsQuery.data || [];
  const showAogBanner = (category === 'All' || category === 'AOG Priority') && (aogQuery.data?.length || 0) > 0;
  const aogCount = aogQuery.data?.length || 0;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Parts &amp; Assets</div>
          <h1 style={styles.h1}>Marketplace</h1>
        </div>
        <button style={styles.btnPrimary}>+ List a Part</button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by part name or P/N…"
            style={styles.searchInput}
          />
        </div>
        <div style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{ ...styles.catBtn, ...(category === c ? styles.catBtnActive : {}) }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {showAogBanner && (
        <div style={styles.aogBanner}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={styles.aogTitle}>{aogCount} Active AOG Events — Priority Matching Active</div>
            <div style={styles.aogSub}>AI has pre-identified nearest compliant suppliers. Escrow available for immediate dispatch.</div>
          </div>
        </div>
      )}

      {partsQuery.loading && !partsQuery.data ? (
        <LoadingBlock label="Loading parts…" />
      ) : partsQuery.error ? (
        <ErrorBlock error={partsQuery.error} onRetry={partsQuery.refetch} />
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No parts match your filters</div>
          <div style={styles.emptySub}>Try clearing the search or switching to "All".</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((p) => <PartCard key={p.id} part={p} onBuy={setSelected} />)}
        </div>
      )}

      {selected && (
        <ProcurementWizard
          part={selected}
          onClose={() => setSelected(null)}
          onCompleted={() => partsQuery.refetch()}
        />
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
  toolbar: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    flex: '0 0 280px',
    height: 36,
  },
  searchInput: {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: 13,
    width: '100%',
    height: '100%',
  },
  catRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  catBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
  },
  catBtnActive: {
    background: 'rgba(212, 169, 52, 0.12)',
    borderColor: 'rgba(212, 169, 52, 0.30)',
    color: 'var(--text-accent)',
  },
  aogBanner: {
    background: 'rgba(196, 66, 30, 0.10)',
    border: '1px solid rgba(196, 66, 30, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 16px',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  aogTitle: { fontWeight: 700, color: 'var(--text-aog)', fontSize: 13 },
  aogSub: { fontSize: 12, color: 'var(--color-rust-200)', marginTop: 1 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 14,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    position: 'relative',
    transition: 'border-color var(--transition-base)',
  },
  aogRibbon: {
    background: 'var(--color-rust-600)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 'var(--radius-md)',
    letterSpacing: '0.05em',
  },
  cardImg: {
    background: 'var(--surface-raised)',
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 3,
    lineHeight: 1.3,
  },
  pn: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-warning)',
  },
  tag: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 500,
    border: '1px solid transparent',
  },
  supplier: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 6,
  },
  price: {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 400,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  btnAog: {
    background: 'var(--action-aog)',
    color: 'var(--action-aog-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnBuy: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
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
