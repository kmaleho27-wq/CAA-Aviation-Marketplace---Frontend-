import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import {
  listMyRequests, createPartRequest,
  listQuotesForRequest, acceptQuote, formatPriceCents,
} from '../api/partRequests';
import { useToast } from '../lib/toast';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/my-requests — buyer's RFQ page.
//
// Buyer creates a part request → trigger auto-matches it against
// broker inventory → broker reviews + quotes → buyer sees quotes
// here (broker name + final price ONLY; no supplier or base).

const STATUS_TONE = {
  open:      { bg: 'rgba(212,169,52,0.10)', color: 'var(--text-warning)',    label: 'Open · awaiting quotes' },
  quoted:    { bg: 'rgba(58,138,110,0.12)', color: 'var(--color-sage-500)',  label: 'Quoted · review and accept' },
  accepted:  { bg: 'rgba(58,138,110,0.20)', color: 'var(--color-sage-500)',  label: '✓ Accepted' },
  fulfilled: { bg: 'rgba(58,138,110,0.20)', color: 'var(--color-sage-500)',  label: '✓ Fulfilled' },
  cancelled: { bg: 'rgba(196,48,48,0.10)',  color: 'var(--text-danger)',     label: '✕ Cancelled' },
  expired:   { bg: 'rgba(196,48,48,0.10)',  color: 'var(--text-danger)',     label: 'Expired' },
};

const URGENCY_BADGE = {
  aog:      { bg: 'var(--status-aog-bg)', color: 'var(--status-aog-text)', border: 'var(--status-aog-border)', label: '⚡ AOG' },
  urgent:   { bg: 'rgba(212,169,52,0.18)', color: 'var(--text-warning)',   border: 'rgba(212,169,52,0.30)',   label: 'Urgent' },
  standard: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)',    label: 'Standard' },
};

function RequestForm({ onClose, onCreated }) {
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [conditionMin, setConditionMin] = useState('Serviceable');
  const [urgency, setUrgency] = useState('standard');
  const [maxPrice, setMaxPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handle = async (e) => {
    e.preventDefault();
    if (!partNumber.trim()) return;
    setSubmitting(true);
    try {
      const { id } = await createPartRequest({
        partNumber,
        description: description || null,
        quantity,
        conditionMin,
        urgency,
        maxPriceZar: maxPrice ? Math.round(Number(maxPrice) * 100) : null,
        notes: notes || null,
      });
      toast.success('Request submitted — broker will match it shortly.');
      onCreated(id);
    } catch (err) {
      toast.error(err.message || 'Could not create request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <div>
            <div style={styles.overline}>New request</div>
            <h2 style={styles.modalTitle}>What part do you need?</h2>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">×</button>
        </div>
        <form onSubmit={handle} style={styles.modalBody}>
          <label style={styles.label}>Part number *</label>
          <input
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            placeholder="9514M54G05"
            style={styles.input}
            required
            autoFocus
          />

          <label style={styles.label}>Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Air duct for CFM56"
            style={styles.input}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={styles.label}>Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Minimum condition</label>
              <select value={conditionMin} onChange={(e) => setConditionMin(e.target.value)} style={styles.input}>
                <option value="New">New</option>
                <option value="Overhauled">Overhauled or better</option>
                <option value="Serviceable">Serviceable or better</option>
                <option value="As-removed">Any condition</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={styles.label}>Urgency</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={styles.input}>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
                <option value="aog">AOG</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Max price ZAR (optional)</label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No limit"
                style={styles.input}
              />
            </div>
          </div>

          <label style={styles.label}>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Need delivery to FAOR by Friday. CofC required."
            rows={3}
            style={{ ...styles.input, minHeight: 60, fontFamily: 'inherit', padding: 8 }}
          />

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={submitting || !partNumber.trim()} style={{
              ...styles.submitBtn, opacity: submitting || !partNumber.trim() ? 0.6 : 1,
            }}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestRow({ r, isExpanded, onToggle, onQuoteAccepted }) {
  const tone = STATUS_TONE[r.status] || STATUS_TONE.open;
  const urgency = URGENCY_BADGE[r.urgency] || URGENCY_BADGE.standard;
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!isExpanded) return;
    setLoading(true);
    listQuotesForRequest(r.id)
      .then(setQuotes)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [isExpanded, r.id]);

  const handleAccept = async (q) => {
    if (!window.confirm(`Accept quote of ${formatPriceCents(q.totalPriceCents)} from ${q.brokerName}?`)) return;
    setAccepting(q.matchId);
    try {
      await acceptQuote(q.matchId);
      toast.success(`Quote accepted — ${q.brokerName} notified.`);
      onQuoteAccepted();
    } catch (err) {
      toast.error(err.message || 'Could not accept quote.');
    } finally {
      setAccepting(null);
    }
  };

  return (
    <>
      <tr style={styles.tr} onClick={() => onToggle(r.id)}>
        <td style={styles.td}>
          <div style={styles.partRow}>
            <span style={{ ...styles.urgencyChip, background: urgency.bg, color: urgency.color, borderColor: urgency.border }}>
              {urgency.label}
            </span>
            <div>
              <div style={styles.partNumber}>{r.partNumber}</div>
              <div style={styles.partDesc}>{r.description || 'No description'}</div>
            </div>
          </div>
        </td>
        <td style={styles.td}>{r.quantity} × {r.conditionMin}</td>
        <td style={styles.td}>
          <span style={{ ...styles.statusPill, background: tone.bg, color: tone.color }}>
            {tone.label}
          </span>
        </td>
        <td style={{ ...styles.td, textAlign: 'right' }}>
          {isExpanded ? '▾' : '▸'}
        </td>
      </tr>
      {isExpanded && (
        <tr style={styles.expandRow}>
          <td colSpan={4} style={styles.expandCell}>
            {loading ? (
              <div style={styles.quotesLoading}>Loading quotes…</div>
            ) : quotes.length === 0 ? (
              <div style={styles.quotesEmpty}>
                No quotes yet. Broker is reviewing matches — typically within a few hours.
              </div>
            ) : (
              <div style={styles.quotesList}>
                <div style={styles.quotesHead}>{quotes.length} quote{quotes.length === 1 ? '' : 's'} received</div>
                {quotes.map((q) => (
                  <div key={q.matchId} style={styles.quoteCard}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={styles.quoteBroker}>via {q.brokerName}</div>
                      <div style={styles.quoteMeta}>
                        Total · {formatPriceCents(q.totalPriceCents)}
                        {q.status === 'accepted' && (
                          <span style={{ color: 'var(--color-sage-500)', marginLeft: 8 }}>✓ accepted</span>
                        )}
                        {q.status === 'declined' && (
                          <span style={{ color: 'var(--text-danger)', marginLeft: 8 }}>✕ declined</span>
                        )}
                      </div>
                    </div>
                    {q.status === 'quoted' && r.status !== 'accepted' && (
                      <button
                        onClick={() => handleAccept(q)}
                        disabled={accepting === q.matchId}
                        style={styles.acceptBtn}
                      >
                        {accepting === q.matchId ? 'Accepting…' : 'Accept'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function MyRequests() {
  const query = useApi(listMyRequests, []);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading your requests…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  const requests = query.data ?? [];
  const open = requests.filter((r) => r.status === 'open' || r.status === 'quoted').length;
  const accepted = requests.filter((r) => r.status === 'accepted' || r.status === 'fulfilled').length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>RFQ</div>
          <h1 style={styles.h1}>My part requests</h1>
          <div style={styles.sub}>
            Tell the broker what you need. They'll match it against their supplier network
            and quote you back. You see the final price; they handle everything else.
          </div>
        </div>
        <button onClick={() => setCreating(true)} style={styles.newBtn}>+ New request</button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>In flight</div>
          <div style={styles.statVal}>{open}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Accepted</div>
          <div style={{ ...styles.statVal, color: 'var(--color-sage-500)' }}>{accepted}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total requests</div>
          <div style={styles.statVal}>{requests.length}</div>
        </div>
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No requests yet</div>
          <div style={styles.emptySub}>
            Click <strong>New request</strong> above to ask the broker for a part.
          </div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Part needed</th>
                <th style={styles.th}>Qty / Condition</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <RequestRow
                  key={r.id}
                  r={r}
                  isExpanded={expanded === r.id}
                  onToggle={(id) => setExpanded((prev) => prev === id ? null : id)}
                  onQuoteAccepted={query.refetch}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <RequestForm
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); query.refetch(); }}
        />
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1000 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 16, flexWrap: 'wrap' },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 8 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 600, lineHeight: 1.55 },
  newBtn: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 },
  statCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  statLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6 },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', lineHeight: 1 },

  tableWrap: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' },
  tr: { borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' },
  td: { padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', verticalAlign: 'middle' },
  partRow: { display: 'flex', alignItems: 'center', gap: 10 },
  urgencyChip: { fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid', whiteSpace: 'nowrap' },
  partNumber: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  partDesc: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  statusPill: { fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-pill)' },

  expandRow: { borderBottom: '1px solid var(--border-subtle)' },
  expandCell: { padding: '0 14px 14px', background: 'var(--surface-raised)' },
  quotesLoading: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '14px 0' },
  quotesEmpty: { fontSize: 12, color: 'var(--text-tertiary)', padding: '14px 0' },
  quotesList: { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0' },
  quotesHead: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)' },
  quoteCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' },
  quoteBroker: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' },
  quoteMeta: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-warning)', marginTop: 2 },
  acceptBtn: { background: 'var(--color-sage-500)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)' },

  // Modal
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 12px', borderBottom: '1px solid var(--border-subtle)' },
  modalTitle: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--text-primary)', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0 },
  modalBody: { padding: '14px 24px 22px' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, marginTop: 12 },
  input: { display: 'block', width: '100%', height: 38, background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  submitBtn: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
