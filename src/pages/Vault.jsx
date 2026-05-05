import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { listDocuments } from '../api/documents';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

const TYPE_FILTERS = [
  'All',
  'Personnel Licence',
  'Release Certificate',
  'Organisation Cert',
  'Medical Certificate',
  'Release to Service',
  'Import Clearance',
];

const STATUS_CFG = {
  verified: { bg: 'var(--status-verified-bg)', color: 'var(--status-verified-text)', border: 'var(--status-verified-border)', label: '✓ Verified' },
  expiring: { bg: 'var(--status-expiring-bg)', color: 'var(--status-expiring-text)', border: 'var(--status-expiring-border)', label: '⚠ Expiring' },
  expired:  { bg: 'var(--status-expired-bg)',  color: 'var(--status-expired-text)',  border: 'var(--status-expired-border)',  label: '✕ Expired' },
};

const TYPE_ICONS = {
  'Personnel Licence': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  'Release Certificate': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  'Organisation Cert': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  ),
  'Medical Certificate': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  'Release to Service': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  'Import Clearance': (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

const SUMMARY_PILLS = [
  { key: 'All',      label: 'Total Documents', color: 'var(--text-primary)', outline: 'rgba(255, 255, 255, 0.20)' },
  { key: 'verified', label: 'Verified',         color: 'var(--text-success)', outline: 'rgba(91, 170, 142, 0.40)' },
  { key: 'expiring', label: 'Expiring Soon',    color: 'var(--text-warning)', outline: 'rgba(212, 169, 52, 0.40)' },
  { key: 'expired',  label: 'Expired',          color: 'var(--text-danger)',  outline: 'rgba(212, 86, 86, 0.40)'  },
];

function expiryColor(status) {
  if (status === 'expired')  return 'var(--text-danger)';
  if (status === 'expiring') return 'var(--text-warning)';
  return 'var(--text-secondary)';
}

function DocRow({ doc }) {
  const tone = STATUS_CFG[doc.status];
  const icon = TYPE_ICONS[doc.type] || TYPE_ICONS['Release Certificate'];
  return (
    <tr>
      <td style={styles.td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex' }}>{icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={styles.docName}>{doc.name}</div>
            <div style={styles.docRef}>{doc.ref}</div>
          </div>
        </div>
      </td>
      <td style={{ ...styles.td, fontSize: 12, color: 'var(--text-tertiary)' }}>{doc.type}</td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>{doc.issued}</td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: expiryColor(doc.status) }}>{doc.expires}</td>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: tone.bg, color: tone.color, borderColor: tone.border }}>{tone.label}</span>
      </td>
      <td style={styles.td}>
        <button style={styles.viewBtn}>View ↗</button>
      </td>
    </tr>
  );
}

export default function Vault() {
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Always fetch the full list so the summary pills can show full counts;
  // filter client-side to keep summary + table responsive on toggles.
  const query = useApi(() => listDocuments(), []);
  const all = query.data || [];

  const counts = useMemo(() => ({
    All: all.length,
    verified: all.filter((d) => d.status === 'verified').length,
    expiring: all.filter((d) => d.status === 'expiring').length,
    expired:  all.filter((d) => d.status === 'expired').length,
  }), [all]);

  const filtered = useMemo(() => all.filter((d) => {
    if (typeFilter !== 'All' && d.type !== typeFilter) return false;
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    return true;
  }), [all, typeFilter, statusFilter]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Document Management</div>
          <h1 style={styles.h1}>Compliance Vault</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/app/audit-pack" style={{ ...styles.btnGhost, textDecoration: 'none' }}>
            📋 Audit Pack
          </Link>
          <button style={styles.btnPrimary}>+ Upload Certificate</button>
        </div>
      </div>

      <div style={styles.summaryRow}>
        {SUMMARY_PILLS.map((p) => {
          const active = statusFilter === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setStatusFilter(p.key)}
              style={{
                ...styles.summaryPill,
                outline: active ? `1px solid ${p.outline}` : 'none',
                background: active ? 'rgba(255, 255, 255, 0.04)' : 'var(--surface-card)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: p.color, lineHeight: 1 }}>
                {counts[p.key]}
              </span>
              <span style={styles.summaryLabel}>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            style={{ ...styles.filterBtn, ...(typeFilter === f ? styles.filterBtnActive : {}) }}
          >
            {f}
          </button>
        ))}
      </div>

      {query.loading && !query.data ? (
        <LoadingBlock label="Loading documents…" />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={query.refetch} />
      ) : (
        <div style={styles.tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Document', 'Type', 'Issued', 'Expires', 'Status', ''].map((h, i) => (
                  <th key={h || `col-${i}`} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    No documents match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => <DocRow key={d.id} doc={d} />)
              )}
            </tbody>
          </table>
        </div>
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
  btnGhost: {
    background: 'transparent',
    color: 'var(--text-accent)',
    border: '1px solid rgba(212, 169, 52, 0.30)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  summaryRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  summaryPill: {
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    minWidth: 140,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background var(--transition-fast), outline var(--transition-fast)',
  },
  summaryLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  filterBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
  },
  filterBtnActive: {
    background: 'rgba(212, 169, 52, 0.12)',
    borderColor: 'rgba(212, 169, 52, 0.30)',
    color: 'var(--text-accent)',
  },
  tableWrap: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  th: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    padding: '10px 14px',
    textAlign: 'left',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    verticalAlign: 'middle',
  },
  docName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  docRef: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-warning)',
    marginTop: 1,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  },
  viewBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px 10px',
    fontSize: 11,
    cursor: 'pointer',
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--text-tertiary)',
  },
};
