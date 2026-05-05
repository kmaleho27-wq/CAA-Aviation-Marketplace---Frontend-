import { useEffect, useState } from 'react';
import {
  listMroQuotes, respondMroQuote, declineMroQuote,
  acceptMroQuote, markMroWorkComplete, releaseMroEscrow,
  cancelMroQuote, disputeMroQuote, uploadMroCompletionDoc,
  resumeMroPayment,
} from '../api/mro';
import { useToast } from '../lib/toast';
import { getUser } from '../lib/auth';

// MRO quote panel — visible to operators (their requests) and AMOs
// (incoming quote requests). State machine status drives which
// actions are available.
//
// State flow:
//   requested → quoted → accepted → escrowed → work_complete → released
//                ↓
//             declined / cancelled

const STATUS_TONE = {
  requested:     { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',     label: 'Awaiting your quote' },
  quoted:        { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',     label: 'Awaiting acceptance' },
  accepted:      { bg: 'rgba(58, 138, 110, 0.12)', color: 'var(--color-sage-500)',   label: 'Checkout in flight' },
  escrowed:      { bg: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)',   label: 'Funds escrowed' },
  work_complete: { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',     label: 'Confirm to release' },
  released:      { bg: 'rgba(58, 138, 110, 0.20)', color: 'var(--color-sage-500)',   label: '✓ Released' },
  declined:      { bg: 'rgba(212, 86, 86, 0.08)',  color: 'var(--text-danger)',      label: 'Declined' },
  cancelled:     { bg: 'rgba(212, 86, 86, 0.08)',  color: 'var(--text-danger)',      label: 'Cancelled' },
};

function fmtRelative(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MroQuotesPanel({ refreshKey }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [responding, setResponding] = useState(null);   // quote.id when AMO is entering price
  const [responseAmount, setResponseAmount] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const toast = useToast();
  const user = getUser();

  const reload = async () => {
    try {
      const data = await listMroQuotes();
      setQuotes(data);
    } catch {
      // RLS may legitimately return zero rows for users not party to any quote
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [refreshKey]);

  if (loading) return null;
  if (quotes.length === 0) return null;

  const onSubmitResponse = async (q) => {
    if (!responseAmount.trim()) { toast.error('Amount required'); return; }
    setBusyId(q.id);
    try {
      await respondMroQuote(q.id, responseAmount.trim(), responseNotes.trim());
      toast.success(`Quote sent to ${q.operator?.name || 'operator'}`);
      setResponding(null);
      setResponseAmount('');
      setResponseNotes('');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not send quote');
    } finally { setBusyId(null); }
  };

  const onDecline = async (q) => {
    const reason = window.prompt(`Decline this quote? (Optional reason)`, '');
    if (reason === null) return;
    setBusyId(q.id);
    try {
      await declineMroQuote(q.id, reason);
      toast.warning('Quote declined.');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not decline');
    } finally { setBusyId(null); }
  };

  const onAccept = async (q) => {
    setBusyId(q.id);
    try {
      const result = await acceptMroQuote(q.id);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else if (result.mode === 'scaffold') {
        toast.warning('PayFast not configured — would have charged ' + q.amountQuoted);
        await reload();
      }
    } catch (err) {
      toast.error(err.message || 'Could not accept');
      setBusyId(null);
    }
  };

  // Resume an "accepted but never paid" quote — operator clicked
  // Accept, then closed the PayFast tab. Pulls the same idempotency
  // key + transaction id so they land in the original checkout flow.
  const onResume = async (q) => {
    setBusyId(q.id);
    try {
      const result = await resumeMroPayment(q.id);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast.warning('Could not get a fresh checkout URL. Try cancelling and re-quoting.');
        setBusyId(null);
      }
    } catch (err) {
      toast.error(err.message || 'Could not resume');
      setBusyId(null);
    }
  };

  const onMarkComplete = async (q) => {
    // Prompt the AMO to optionally attach an 8130/RTS doc. If they skip,
    // the work_complete state still works — doc upload is encouraged
    // not required at MVP.
    const wantsDoc = window.confirm(
      `Mark ${q.service?.name || 'this work'} complete?\n\n` +
      `OK = upload an 8130 / RTS doc now (recommended)\n` +
      `Cancel = mark complete without a doc (you can dispute-block-prone)`
    );

    let docPath = null;
    if (wantsDoc) {
      const file = await new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,image/png,image/jpeg,image/heic,image/webp';
        input.onchange = (e) => resolve(e.target.files?.[0] || null);
        input.oncancel = () => resolve(null);
        input.click();
      });
      if (!file) {
        toast.warning('No file selected — cancelled.');
        return;
      }
      setBusyId(q.id);
      try {
        docPath = await uploadMroCompletionDoc(q.id, file);
      } catch (err) {
        toast.error(err.message || 'Upload failed.');
        setBusyId(null);
        return;
      }
    } else {
      setBusyId(q.id);
    }

    try {
      await markMroWorkComplete(q.id, docPath);
      toast.success(docPath
        ? '8130/RTS uploaded. Operator notified — can now release escrow.'
        : 'Operator notified — they can now release escrow.');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not mark complete');
    } finally { setBusyId(null); }
  };

  const onCancel = async (q) => {
    const reason = window.prompt(`Cancel this MRO quote? (Optional reason)`, '');
    if (reason === null) return;
    setBusyId(q.id);
    try {
      const result = await cancelMroQuote(q.id, reason);
      if (result.requires_refund) {
        toast.warning('Cancelled. Funds in escrow → admin will process refund.');
      } else {
        toast.warning('Cancelled.');
      }
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not cancel.');
    } finally { setBusyId(null); }
  };

  const onDispute = async (q) => {
    const reason = window.prompt(
      `Dispute completed work?\n\n` +
      `Describe what's wrong (minimum 10 chars). Admin will review and arbitrate.`,
      ''
    );
    if (reason === null) return;
    if (reason.trim().length < 10) {
      toast.error('Please give at least 10 characters of detail.');
      return;
    }
    setBusyId(q.id);
    try {
      await disputeMroQuote(q.id, reason);
      toast.warning('Dispute opened. Admin notified.');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not open dispute.');
    } finally { setBusyId(null); }
  };

  const onRelease = async (q) => {
    if (!window.confirm(`Confirm work complete and release ${q.amountQuoted} from escrow?`)) return;
    setBusyId(q.id);
    try {
      await releaseMroEscrow(q.id);
      toast.success(`Escrow released — ${q.amountQuoted}`);
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not release');
    } finally { setBusyId(null); }
  };

  return (
    <div style={styles.section}>
      <div style={styles.sectionHead}>
        <h2 style={styles.h2}>Your quotes</h2>
        <span style={styles.count}>{quotes.length}</span>
      </div>

      <div style={styles.list}>
        {quotes.map((q) => {
          const tone = STATUS_TONE[q.status] || STATUS_TONE.requested;
          const isAmo = q.amoId === user?.id;
          const isOperator = q.operatorId === user?.id;
          const isResponding = responding === q.id;

          return (
            <div key={q.id} style={styles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.rowHead}>
                  <span style={styles.serviceName}>{q.service?.name ?? 'MRO Service'}</span>
                  <span style={{ ...styles.statusPill, background: tone.bg, color: tone.color }}>{tone.label}</span>
                </div>
                <div style={styles.meta}>
                  {isAmo
                    ? `Requested by ${q.operator?.name ?? '—'}`
                    : `From ${q.amo?.name ?? '—'}`}
                  {' · '}
                  {fmtRelative(q.createdAt)}
                </div>
                {q.message && <div style={styles.message}>"{q.message}"</div>}
                {q.amountQuoted && (
                  <div style={styles.amount}>
                    Quoted: <strong>{q.amountQuoted}</strong>
                    {q.amoNotes && <span style={styles.notes}> — {q.amoNotes}</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                {/* AMO: respond to a fresh request */}
                {isAmo && q.status === 'requested' && !isResponding && (
                  <button onClick={() => setResponding(q.id)} disabled={busyId === q.id} style={styles.btnPrimary}>
                    Send quote
                  </button>
                )}
                {isAmo && q.status === 'requested' && isResponding && (
                  <div style={styles.responseForm}>
                    <input
                      placeholder="ZAR 280,000"
                      value={responseAmount}
                      onChange={(e) => setResponseAmount(e.target.value)}
                      style={styles.smallInput}
                    />
                    <input
                      placeholder="Notes (optional)"
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      style={styles.smallInput}
                    />
                    <button onClick={() => onSubmitResponse(q)} disabled={busyId === q.id} style={styles.btnPrimary}>
                      Send
                    </button>
                    <button onClick={() => setResponding(null)} style={styles.btnGhost}>Cancel</button>
                  </div>
                )}

                {/* Operator: accept or decline a quoted price */}
                {isOperator && q.status === 'quoted' && (
                  <>
                    <button onClick={() => onDecline(q)} disabled={busyId === q.id} style={styles.btnGhost}>Decline</button>
                    <button onClick={() => onAccept(q)} disabled={busyId === q.id} style={styles.btnPrimary}>
                      Accept &amp; pay
                    </button>
                  </>
                )}

                {/* Operator: accepted-but-not-paid (PayFast tab abandoned).
                    "Resume" reuses the same idempotency key + checkout URL. */}
                {isOperator && q.status === 'accepted' && (
                  <button onClick={() => onResume(q)} disabled={busyId === q.id} style={styles.btnPrimary}>
                    Resume payment →
                  </button>
                )}

                {/* AMO: mark work complete after escrow funded */}
                {isAmo && q.status === 'escrowed' && (
                  <button onClick={() => onMarkComplete(q)} disabled={busyId === q.id} style={styles.btnPrimary}>
                    ✓ Mark work complete
                  </button>
                )}

                {/* Operator: confirm + release escrow OR open dispute */}
                {isOperator && q.status === 'work_complete' && (
                  <>
                    <button onClick={() => onDispute(q)} disabled={busyId === q.id} style={styles.btnDanger}>
                      Dispute
                    </button>
                    <button onClick={() => onRelease(q)} disabled={busyId === q.id} style={styles.btnPrimary}>
                      Release escrow
                    </button>
                  </>
                )}

                {/* Either party: cancel pre-release. Post-completion the
                    operator uses Dispute instead (released = terminal). */}
                {(isOperator || isAmo)
                  && ['requested', 'quoted', 'accepted', 'escrowed'].includes(q.status) && (
                  <button onClick={() => onCancel(q)} disabled={busyId === q.id} style={styles.btnGhost}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  section: { marginBottom: 24, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  h2: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '0.02em', margin: 0 },
  count: { background: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)', border: '1px solid rgba(212, 169, 52, 0.25)', borderRadius: 'var(--radius-pill)', padding: '1px 8px', fontSize: 11, fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  row: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, flexWrap: 'wrap' },
  rowHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  serviceName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  statusPill: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)' },
  meta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 },
  message: { fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 6 },
  amount: { fontSize: 13, color: 'var(--text-warning)', marginTop: 6 },
  notes: { fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' },
  actions: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  responseForm: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  smallInput: { background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 12, height: 32, minWidth: 130 },
  btnPrimary: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnGhost: { background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDanger: { background: 'transparent', color: 'var(--text-danger)', border: '1px solid rgba(212, 86, 86, 0.30)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
};
