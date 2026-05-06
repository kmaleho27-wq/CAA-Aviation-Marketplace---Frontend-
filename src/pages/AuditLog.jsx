import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyAuditEvents, verifyChainSegment } from '../api/auditLog';
import { useToast } from '../lib/toast';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/audit-log — operator/AMO/admin-visible audit chain.
//
// Shows every audit_event that touches the caller's entities
// (personnel, transactions, MRO quotes). Each row carries seq, type,
// timestamp, and a short hash. A "Verify chain" button calls
// verify_chain_segment(min_seq, max_seq) and renders the result —
// the cryptographic proof that the chain hasn't been tampered with
// in the segment relevant to this user.
//
// This is the operator-facing version of /admin/* verify_chain. Per
// migration 0022, the global chain integrity proof stays admin-only;
// operators get segment-level proofs of just their events.

// Filter chip groups. Keys map to event_type prefixes so a single chip
// can capture related events ('rts.*', 'funds.*', etc.) without
// listing every variant.
const EVENT_TYPE_FILTERS = [
  { key: 'all',      label: 'All',      match: () => true },
  { key: 'rts',      label: 'RTS',      match: (t) => t?.startsWith('rts.') },
  { key: 'funds',    label: 'Funds',    match: (t) => t?.startsWith('funds.') },
  { key: 'kyc',      label: 'KYC',      match: (t) => t?.startsWith('kyc.') },
  { key: 'dispute',  label: 'Disputes', match: (t) => t?.startsWith('dispute.') },
];

const TYPE_LABEL = {
  'rts.signed':        { label: 'RTS signed',        color: 'var(--color-sage-500)' },
  'funds.released':    { label: 'Funds released',    color: 'var(--color-sage-500)' },
  'funds.refunded':    { label: 'Funds refunded',    color: 'var(--text-warning)' },
  'kyc.approved':      { label: 'KYC approved',      color: 'var(--color-sage-500)' },
  'kyc.rejected':      { label: 'KYC rejected',      color: 'var(--text-danger)' },
  'dispute.opened':    { label: 'Dispute opened',    color: 'var(--text-warning)' },
  'dispute.resolved':  { label: 'Dispute resolved',  color: 'var(--color-sage-500)' },
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortHash(h) {
  if (!h) return '—';
  return h.slice(0, 12) + '…';
}

function payloadSummary(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const keys = Object.keys(payload);
  if (keys.length === 0) return '';
  const first = keys[0];
  const v = payload[first];
  return `${first}: ${typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60)}`;
}

export default function AuditLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proof, setProof] = useState(null);
  const [verifying, setVerifying] = useState(false);
  // Filter state — chip filter for event type, free-text search across
  // subject id + payload. Both apply client-side over the loaded set.
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    getMyAuditEvents({ limit: 500 })
      .then((data) => { if (!cancelled) { setEvents(data); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  const onVerify = async () => {
    if (events.length === 0) {
      toast.warning('No events to verify.');
      return;
    }
    setVerifying(true);
    setProof(null);
    try {
      const minSeq = Math.min(...events.map((e) => e.eventSeq));
      const maxSeq = Math.max(...events.map((e) => e.eventSeq));
      const result = await verifyChainSegment(minSeq, maxSeq);
      setProof(result);
      toast.success(result.valid ? 'Chain segment verified ✓' : 'Chain integrity FAILED');
    } catch (e) {
      toast.error(e.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Build a CSV from the current filtered set. Naive escaping — wrap
  // every value in double quotes and escape inner quotes by doubling.
  // Fine for SACAA inspectors opening in Excel; not RFC 4180-perfect.
  const downloadCsv = () => {
    if (filteredEvents.length === 0) return;
    const cols = ['seq', 'type', 'subject_id', 'created_at', 'hash', 'payload'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredEvents.map((e) => [
      e.eventSeq,
      e.eventType,
      e.subjectId,
      e.createdAt,
      e.hash,
      JSON.stringify(e.payload ?? {}),
    ].map(escape).join(','));
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naluka-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEvents.length} events to CSV`);
  };

  const downloadJson = () => {
    if (filteredEvents.length === 0) return;
    const payload = {
      generated_at: new Date().toISOString(),
      filter: { type: typeFilter, search: search || null },
      events_count: filteredEvents.length,
      events: filteredEvents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naluka-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEvents.length} events to JSON`);
  };

  const onCopyProof = () => {
    if (!proof) return;
    const minSeq = Math.min(...events.map((e) => e.eventSeq));
    const maxSeq = Math.max(...events.map((e) => e.eventSeq));
    const summary = `Naluka audit chain segment proof
Range:           seq ${minSeq} → ${maxSeq}
Rows checked:    ${proof.rowsChecked}
Valid:           ${proof.valid ? 'YES — no tampering detected' : 'NO — broken at seq ' + proof.brokenAtSeq}
Reason:          ${proof.reason || 'n/a'}
Verified at:     ${new Date().toISOString()}
Operator:        (signed-in user)
Verified via:    naluka.aero/app/audit-log

This proof confirms the integrity of audit events visible to the
operator. To prove the segment is part of Naluka's canonical chain,
request a global verify_chain() result from a Naluka admin.`;
    navigator.clipboard.writeText(summary).then(() => toast.success('Proof summary copied'));
  };

  if (loading) return <div style={styles.page}><LoadingBlock label="Loading audit events…" /></div>;
  if (error) return <div style={styles.page}><ErrorBlock error={error} onRetry={() => window.location.reload()} /></div>;

  // Compute filtered set — chip narrows by event type prefix, search
  // matches against subject id (case-insensitive) or stringified payload.
  const matcher = EVENT_TYPE_FILTERS.find((f) => f.key === typeFilter)?.match || (() => true);
  const q = search.trim().toLowerCase();
  const filteredEvents = events.filter((e) => {
    if (!matcher(e.eventType)) return false;
    if (!q) return true;
    if (e.subjectId?.toLowerCase().includes(q)) return true;
    if (JSON.stringify(e.payload || {}).toLowerCase().includes(q)) return true;
    if (e.eventType?.toLowerCase().includes(q)) return true;
    return false;
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Compliance · Audit chain</div>
          <h1 style={styles.h1}>Audit log</h1>
          <div style={styles.sub}>
            Every regulated event that touches your crew, transactions, or MRO quotes —
            cryptographically chained. Verify the segment in one click for SACAA inspectors
            or insurance auditors.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={downloadCsv}
            disabled={filteredEvents.length === 0}
            style={{ ...styles.btnGhost, opacity: filteredEvents.length === 0 ? 0.5 : 1 }}
            title="Export the current filtered view to CSV"
          >
            ⬇ CSV
          </button>
          <button
            onClick={downloadJson}
            disabled={filteredEvents.length === 0}
            style={{ ...styles.btnGhost, opacity: filteredEvents.length === 0 ? 0.5 : 1 }}
            title="Export the current filtered view to JSON"
          >
            ⬇ JSON
          </button>
          <Link to="/app/audit-pack" style={{ ...styles.btnGhost, textDecoration: 'none' }}>📋 Audit Pack</Link>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.controlsLeft}>
          <span style={styles.eventCount}>{filteredEvents.length}</span>
          <span style={styles.eventLabel}>
            {filteredEvents.length === events.length
              ? 'events visible to you'
              : `of ${events.length} events match`}
          </span>
        </div>
        <button onClick={onVerify} disabled={verifying || events.length === 0} style={styles.btnPrimary}>
          {verifying ? 'Verifying…' : '🔐 Verify chain segment'}
        </button>
      </div>

      {/* Filter chips + search — applied client-side over the loaded set.
          getMyAuditEvents already caps at limit:500 server-side, so this
          stays cheap. If we hit operators with 5000+ events we'll move
          this server-side. */}
      {events.length > 0 && (
        <div style={styles.filterBar}>
          <div style={styles.filterChips}>
            {EVENT_TYPE_FILTERS.map((f) => {
              const active = typeFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject or payload…"
            style={styles.searchInput}
          />
        </div>
      )}

      {proof && (
        <div style={{ ...styles.proofCard, ...(proof.valid ? styles.proofOk : styles.proofFail) }}>
          <div style={styles.proofHead}>
            <span style={{ ...styles.proofPip, color: proof.valid ? 'var(--color-sage-500)' : 'var(--text-danger)' }}>
              {proof.valid ? '✓ Chain integrity confirmed' : '✕ Chain integrity broken'}
            </span>
            <button onClick={onCopyProof} style={styles.copyBtn}>Copy proof</button>
          </div>
          <div style={styles.proofBody}>
            <div><strong>{proof.rowsChecked}</strong> rows verified</div>
            {proof.brokenAtSeq && <div>Broken at seq <strong>{proof.brokenAtSeq}</strong></div>}
            {proof.reason && <div style={{ color: 'var(--text-danger)' }}>{proof.reason}</div>}
            {proof.valid && <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
              Verified at {new Date().toLocaleString('en-GB')}. Pair with a global verify_chain proof from admin to confirm the segment is part of the canonical chain.
            </div>}
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No audit events yet</div>
          <div style={styles.emptyBody}>
            Events appear here when your crew is verified, transactions are escrowed and released,
            or disputes are opened. Once you have transactions in flight, the chain starts populating.
          </div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Seq</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Subject</th>
              <th style={styles.th}>When</th>
              <th style={styles.th}>Hash</th>
              <th style={styles.th}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((e) => {
              const tone = TYPE_LABEL[e.eventType] || { label: e.eventType, color: 'var(--text-secondary)' };
              return (
                <tr key={e.eventId} style={styles.tr}>
                  <td style={styles.tdMono}>{e.eventSeq}</td>
                  <td style={{ ...styles.td, color: tone.color, fontWeight: 600 }}>{tone.label}</td>
                  <td style={styles.tdMono}>{e.subjectId.slice(0, 16)}{e.subjectId.length > 16 ? '…' : ''}</td>
                  <td style={styles.td}>{fmtDateTime(e.createdAt)}</td>
                  <td style={styles.tdMono} title={e.hash}>{shortHash(e.hash)}</td>
                  <td style={styles.td}>{payloadSummary(e.payload)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={styles.footnote}>
        Each row is hash-linked to the previous one with SHA-256.
        Tamper with any past row and every subsequent hash breaks. The
        "Verify chain segment" button replays the links and confirms
        no row in your visible range has been modified.
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 16, flexWrap: 'wrap' },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 640, lineHeight: 1.55 },
  btnGhost: { background: 'transparent', color: 'var(--text-warning)', border: '1px solid rgba(212, 169, 52, 0.30)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  btnPrimary: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '14px 16px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' },
  controlsLeft: { display: 'flex', alignItems: 'baseline', gap: 8 },
  eventCount: { fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-warning)' },
  eventLabel: { fontSize: 12, color: 'var(--text-tertiary)' },
  proofCard: { padding: '14px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid', marginBottom: 16 },
  proofOk: { background: 'rgba(58, 138, 110, 0.06)', borderColor: 'rgba(58, 138, 110, 0.30)' },
  proofFail: { background: 'rgba(212, 86, 86, 0.06)', borderColor: 'rgba(212, 86, 86, 0.30)' },
  proofHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  proofPip: { fontSize: 14, fontWeight: 700 },
  copyBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px 10px', fontSize: 11, cursor: 'pointer' },
  proofBody: { fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-overline)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 },
  tr: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '7px 10px', color: 'var(--text-secondary)' },
  tdMono: { padding: '7px 10px', color: 'var(--text-warning)', fontFamily: 'var(--font-mono)', fontSize: 11 },
  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 },
  emptyBody: { fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 },
  footnote: { fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, padding: '12px 4px 0', borderTop: '1px solid var(--border-subtle)' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  filterChips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 11, cursor: 'pointer' },
  chipActive: { background: 'rgba(212, 169, 52, 0.12)', borderColor: 'rgba(212, 169, 52, 0.30)', color: 'var(--text-accent)' },
  searchInput: { background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 12, height: 30, outline: 'none', minWidth: 200 },
};
