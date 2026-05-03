import { useMemo, useState, useEffect } from 'react';
import { useApi } from '../lib/useApi';
import { listTransactions } from '../api/transactions';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';
import RTSModal from '../components/RTSModal';

const STATUS_CFG = {
  'rts-pending': { bg: 'rgba(196, 66, 30, 0.12)',  color: 'var(--text-aog)',     border: 'rgba(196, 66, 30, 0.25)', label: 'Awaiting RTS Sign-off' },
  'in-escrow':   { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)', border: 'rgba(212, 169, 52, 0.20)', label: 'Funds in Escrow' },
  'completed':   { bg: 'var(--status-verified-bg)', color: 'var(--status-verified-text)', border: 'var(--status-verified-border)', label: '✓ Completed' },
  'dispute':     { bg: 'var(--status-expired-bg)',  color: 'var(--status-expired-text)',  border: 'var(--status-expired-border)',  label: '⚠ Dispute Open' },
};

const TYPE_CFG = {
  Parts:     { color: 'var(--text-warning)', bg: 'rgba(212, 169, 52, 0.10)' },
  Personnel: { color: 'var(--text-success)', bg: 'rgba(91, 170, 142, 0.10)' },
  MRO:       { color: 'var(--color-mustard-200)', bg: 'rgba(251, 208, 140, 0.10)' },
};

function parseAmount(amount) {
  const n = Number(String(amount).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatZar(n) {
  return `ZAR ${n.toLocaleString('en-ZA')}`;
}

function TxnRow({ txn, onOpen }) {
  const tone = STATUS_CFG[txn.status];
  const typeTone = TYPE_CFG[txn.type] || TYPE_CFG.Parts;
  const interactive = txn.status === 'rts-pending';

  return (
    <tr
      onClick={() => interactive && onOpen(txn)}
      style={{
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (interactive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <td style={styles.td}>
        <span style={styles.txnId}>{txn.id}</span>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.typeTag, background: typeTone.bg, color: typeTone.color }}>{txn.type}</span>
      </td>
      <td style={styles.td}>
        <span style={styles.itemText}>{txn.item}</span>
        {txn.aog && <span style={styles.aogPill}>AOG</span>}
      </td>
      <td style={{ ...styles.td, fontSize: 12, color: 'var(--text-tertiary)' }}>{txn.party}</td>
      <td style={{ ...styles.td, fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)' }}>{txn.amount}</td>
      <td style={styles.td}>
        <span style={{ ...styles.badge, background: tone.bg, color: tone.color, borderColor: tone.border }}>{tone.label}</span>
      </td>
      <td style={{ ...styles.td, fontSize: 11, color: 'var(--text-overline)' }}>{txn.updated}</td>
    </tr>
  );
}

export default function Transactions() {
  const query = useApi(listTransactions, []);
  const [txns, setTxns] = useState([]);
  const [rtsTarget, setRtsTarget] = useState(null);

  useEffect(() => {
    if (query.data) setTxns(query.data);
  }, [query.data]);

  const summary = useMemo(() => {
    const escrowSum = txns
      .filter((t) => t.status === 'in-escrow' || t.status === 'rts-pending')
      .reduce((acc, t) => acc + parseAmount(t.amount), 0);
    return {
      escrow: formatZar(escrowSum),
      pending: txns.filter((t) => t.status === 'rts-pending').length,
      completed: 14, // 30-day rolling figure (mock)
      disputes: txns.filter((t) => t.status === 'dispute').length,
    };
  }, [txns]);

  const handleSigned = (signedTxn) => {
    setTxns((prev) =>
      prev.map((t) =>
        t.id === signedTxn.id
          ? { ...t, status: 'completed', updated: 'just now', aog: false }
          : t
      )
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Escrow & Settlement</div>
          <h1 style={styles.h1}>Transactions</h1>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <SummaryCard label="Total in Escrow" value={summary.escrow} color="var(--color-mustard-500)" mono />
        <SummaryCard label="Awaiting RTS"     value={summary.pending}   color="var(--text-aog)" />
        <SummaryCard label="Completed (30d)"  value={summary.completed} color="var(--text-success)" />
        <SummaryCard label="Open Disputes"    value={summary.disputes}  color="var(--text-danger)" />
      </div>

      {query.loading && !query.data ? (
        <LoadingBlock label="Loading transactions…" />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={query.refetch} />
      ) : (
        <div style={styles.tableWrap}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['TXN ID', 'Type', 'Item', 'Counterparty', 'Amount', 'Status', 'Updated'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <TxnRow key={t.id} txn={t} onOpen={setRtsTarget} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={styles.tableHint}>
        Click any row marked <em style={{ color: 'var(--text-aog)', fontStyle: 'normal' }}>Awaiting RTS Sign-off</em> to open the Digital Release to Service workflow.
      </div>

      {rtsTarget && (
        <RTSModal txn={rtsTarget} onClose={() => setRtsTarget(null)} onSigned={handleSigned} />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, mono = false }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div
        style={{
          ...styles.summaryValue,
          color,
          fontFamily: mono ? 'var(--font-display)' : 'var(--font-display)',
        }}
      >
        {value}
      </div>
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
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 18px',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '0.01em',
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
  txnId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-warning)',
  },
  typeTag: {
    borderRadius: 'var(--radius-sm)',
    padding: '2px 7px',
    fontSize: 11,
    fontWeight: 500,
  },
  itemText: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  aogPill: {
    background: 'rgba(196, 66, 30, 0.15)',
    color: 'var(--text-aog)',
    borderRadius: 'var(--radius-pill)',
    padding: '1px 6px',
    fontSize: 9,
    fontWeight: 700,
    marginLeft: 6,
    letterSpacing: '0.05em',
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
  tableHint: {
    fontSize: 12,
    color: 'var(--text-overline)',
    marginTop: 10,
  },
};
