import { useEffect, useState } from 'react';
import { useToast } from '../lib/toast';
import { procurePart } from '../api/parts';

const STEPS = ['Review Part', 'Compliance Gate', 'Confirm & Escrow'];

function complianceItems(part) {
  return [
    { label: 'Supplier SACAA/CSD Status', note: `${part.supplier} — CSD #ZA-2024-0041` },
    { label: 'Part Certificate Validity',  note: `${part.cert} — Valid, expiry 2026-04-01` },
    { label: 'Buyer Authorisation',        note: 'Fleet Manager role — SAA Ops' },
    { label: 'Escrow Account',             note: `${part.price} available for lock` },
  ];
}

function detailRows(part) {
  return [
    ['Supplier', part.supplier],
    ['Location', part.location],
    ['Condition', part.condition],
    ['Certificate', part.cert],
    ['Price', part.price],
  ];
}

export default function ProcurementWizard({ part, onClose, onCompleted }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txnId, setTxnId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    function onEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const next = async () => {
    if (done) return onClose();
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      // payfast-create-payment returns:
      //   { transactionId, pfPaymentId, checkoutUrl, params, enabled, mode }
      // mode='scaffold' → no real checkout, just record the transaction
      // mode='sandbox' or 'live' → redirect the browser to PayFast
      const result = await procurePart(part.id);
      setTxnId(result.transactionId);

      if (result.checkoutUrl) {
        toast.info('Redirecting to PayFast — complete payment to lock escrow');
        // Hard navigation to PayFast's hosted checkout. PayFast then
        // redirects back to /app/transactions?pf=ok&txn=... and the
        // ITN webhook server-side finalizes status + audit chain.
        window.location.href = result.checkoutUrl;
        return;
      }

      // Scaffold mode — no real PayFast call. Treat as completed inline.
      setDone(true);
      toast.success(`Order placed — ${part.name} (scaffold, no real payment)`);
      if (onCompleted) onCompleted({ id: result.transactionId });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const primaryLabel = done
    ? '✓ Order Placed — Close'
    : submitting
    ? 'Placing order…'
    : step === 0
    ? 'Confirm Details →'
    : step === 1
    ? 'Lock Funds in Escrow →'
    : 'Place Order';

  const primaryStyle = done
    ? { background: 'var(--color-sage-500)', color: '#072018' }
    : { background: 'var(--action-primary)', color: 'var(--action-primary-text)' };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Procurement wizard">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <button onClick={onClose} style={styles.backBtn}>← Back to Marketplace</button>
            <h1 style={styles.h1}>{done ? 'Order Confirmed' : 'Procure Part'}</h1>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">×</button>
        </div>

        <div style={styles.steps}>
          {STEPS.map((s, i) => {
            const reached = done ? i <= STEPS.length - 1 : i <= step;
            const completed = done ? true : i < step;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      ...styles.stepDot,
                      background: reached ? 'var(--action-primary)' : 'var(--surface-input)',
                      color: reached ? 'var(--action-primary-text)' : 'var(--text-overline)',
                    }}
                  >
                    {completed ? '✓' : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: reached ? 'var(--text-primary)' : 'var(--text-overline)',
                      fontWeight: i === step && !done ? 600 : 400,
                    }}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div style={styles.stepLine} />}
              </div>
            );
          })}
        </div>

        {done ? (
          <div style={styles.successCard}>
            <div style={styles.successDot}>✓</div>
            <div style={styles.successTitle}>Funds locked, supplier notified</div>
            <div style={styles.successSub}>
              Escrow holds {part.price}. {part.supplier} will dispatch from {part.location}. Track delivery in
              Transactions; funds release on RTS sign-off.
            </div>
            <div style={styles.successMeta}>
              <span style={styles.metaLabel}>TXN</span>
              <span style={styles.metaValue}>{txnId}</span>
            </div>
          </div>
        ) : (
          <div style={styles.body}>
            <section style={styles.card}>
              <div style={styles.sectionLabel}>Part Details</div>
              <div style={styles.partName}>{part.name}</div>
              <div style={styles.pn}>P/N: {part.pn}</div>
              <div style={styles.detailGrid}>
                {detailRows(part).map(([k, v]) => (
                  <div key={k}>
                    <div style={styles.detailKey}>{k}</div>
                    <div style={styles.detailVal}>{v}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.sectionLabel}>Compliance Gate</div>
              {complianceItems(part).map((item) => (
                <div key={item.label} style={styles.complianceRow}>
                  <div style={styles.checkPill}>✓</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.complianceLabel}>{item.label}</div>
                    <div style={styles.complianceNote}>{item.note}</div>
                  </div>
                </div>
              ))}
              {step >= 2 && (
                <div style={styles.escrowBlock}>
                  <div style={styles.sectionLabel}>Escrow Lock</div>
                  <div style={styles.escrowRow}>
                    <span>Amount</span>
                    <span style={styles.escrowAmount}>{part.price}</span>
                  </div>
                  <div style={styles.escrowRow}>
                    <span>Release</span>
                    <span style={{ color: 'var(--text-secondary)' }}>On RTS sign-off</span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <div style={styles.footer}>
          {!done && step > 0 && (
            <button onClick={back} style={styles.btnSecondary}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={next} style={{ ...styles.btnPrimary, ...primaryStyle }}>{primaryLabel}</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(7, 12, 32, 0.85)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    animation: 'toastIn 200ms ease-out',
  },
  modal: {
    width: '100%',
    maxWidth: 920,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: '24px 28px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
    gap: 12,
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-accent)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
    marginBottom: 8,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 28,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border-subtle)',
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-tertiary)',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
  },
  stepLine: {
    width: 40,
    height: 1,
    background: 'rgba(255, 255, 255, 0.10)',
    margin: '0 12px',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 14,
  },
  partName: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  pn: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-warning)',
    marginBottom: 12,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 20px',
    fontSize: 12,
  },
  detailKey: { color: 'var(--text-overline)', marginBottom: 1 },
  detailVal: { color: 'var(--text-secondary)', fontWeight: 500 },
  complianceRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkPill: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'rgba(58, 138, 110, 0.15)',
    border: '1px solid rgba(58, 138, 110, 0.30)',
    color: 'var(--text-success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    flexShrink: 0,
    marginTop: 1,
  },
  complianceLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 1,
  },
  complianceNote: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  escrowBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px dashed var(--border-subtle)',
  },
  escrowRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginBottom: 4,
  },
  escrowAmount: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-warning)',
    fontWeight: 600,
  },
  footer: {
    display: 'flex',
    gap: 10,
    marginTop: 24,
    paddingTop: 18,
    borderTop: '1px solid var(--border-subtle)',
  },
  btnSecondary: {
    background: 'var(--surface-input)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 18px',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnPrimary: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  successCard: {
    background: 'var(--surface-card)',
    border: '1px solid rgba(91, 170, 142, 0.30)',
    borderTop: '1px solid rgba(91, 170, 142, 0.50)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    textAlign: 'center',
    boxShadow: '0 0 24px rgba(91, 170, 142, 0.10)',
  },
  successDot: {
    width: 44,
    height: 44,
    margin: '0 auto 12px',
    borderRadius: '50%',
    background: 'rgba(91, 170, 142, 0.15)',
    border: '1px solid rgba(91, 170, 142, 0.40)',
    color: 'var(--text-success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 700,
  },
  successTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    maxWidth: 480,
    margin: '0 auto 18px',
  },
  successMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'var(--text-overline)',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-warning)',
  },
};
