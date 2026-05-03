import { useEffect, useState } from 'react';
import { useToast } from '../lib/toast';
import { hireContractor } from '../api/personnel';

function profileRows(c) {
  return [
    ['License', c.license, true],
    ['Rating', c.rating, false],
    ['Location', c.location, false],
    ['Rate', c.rate, false],
    ['Licence Expiry', c.expires, true],
  ];
}

function verificationItems(c) {
  return [
    { label: 'License Currency',     note: `${c.rating} — Current and Proficient`,         ok: c.status !== 'expired' },
    { label: 'Medical Certificate',  note: 'Class 1 Medical — Valid',                       ok: c.status !== 'expired' },
    { label: 'Type Rating Check',    note: `${c.types.join(', ')} — All current`,           ok: true },
    { label: 'CSD / KYC Status',     note: 'South African National ID verified',            ok: c.status !== 'pending' && c.status !== 'expired' },
  ];
}

export default function HireModal({ contractor: c, onClose }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contractId, setContractId] = useState(null);
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
    if (step === 0) {
      setStep(1);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      // payfast-create-payment returns transactionId/checkoutUrl/mode.
      // Live/sandbox: redirect to PayFast. Scaffold: record only.
      const result = await hireContractor(c.id);
      setContractId(result.transactionId);

      if (result.checkoutUrl) {
        toast.info('Redirecting to PayFast — pay deposit to confirm contract');
        window.location.href = result.checkoutUrl;
        return;
      }

      setDone(true);
      toast.success(`Contract sent to ${c.name} (scaffold, no real payment)`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not send contract.');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel = done
    ? '✓ Contract Sent — Close'
    : submitting
    ? 'Sending contract…'
    : step === 0
    ? 'Confirm & Send Contract →'
    : 'Send Contract';

  const primaryStyle = done
    ? { background: 'var(--color-sage-500)', color: '#072018' }
    : { background: 'var(--action-primary)', color: 'var(--action-primary-text)' };

  return (
    <div style={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Hire contractor">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <button onClick={onClose} style={styles.backBtn}>← Back to Personnel</button>
            <h1 style={styles.h1}>{done ? 'Contract Sent' : 'Hire Contractor'}</h1>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close">×</button>
        </div>

        {done ? (
          <div style={styles.successCard}>
            <div style={styles.successDot}>✓</div>
            <div style={styles.successTitle}>{c.name} has been notified</div>
            <div style={styles.successSub}>
              Contract for {c.rate} sent to {c.name}. They have 24 hours to accept.
              You'll be alerted on response and the engagement will appear in Transactions on acceptance.
            </div>
            <div style={styles.successMeta}>
              <span style={styles.metaLabel}>CONTRACT</span>
              <span style={styles.metaValue}>{contractId}</span>
            </div>
          </div>
        ) : (
          <div style={styles.body}>
            <section style={styles.card}>
              <div style={styles.sectionLabel}>Contractor Profile</div>
              <div style={styles.profileHead}>
                <div style={styles.avatar}>{c.initials}</div>
                <div>
                  <div style={styles.name}>{c.name}</div>
                  <div style={styles.role}>{c.role}</div>
                </div>
              </div>
              {profileRows(c).map(([k, v, mono]) => (
                <div key={k} style={styles.kvRow}>
                  <span style={styles.kvKey}>{k}</span>
                  <span style={{ ...styles.kvVal, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </section>

            <section style={styles.card}>
              <div style={styles.sectionLabel}>SACAA Verification</div>
              {verificationItems(c).map((item) => (
                <div key={item.label} style={styles.verifRow}>
                  <div
                    style={{
                      ...styles.checkPill,
                      background: item.ok ? 'rgba(58, 138, 110, 0.15)' : 'rgba(212, 169, 52, 0.10)',
                      borderColor: item.ok ? 'rgba(58, 138, 110, 0.30)' : 'rgba(212, 169, 52, 0.25)',
                      color: item.ok ? 'var(--text-success)' : 'var(--text-warning)',
                    }}
                  >
                    {item.ok ? '✓' : '…'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.verifLabel}>{item.label}</div>
                    <div style={styles.verifNote}>{item.note}</div>
                  </div>
                </div>
              ))}

              {step >= 1 && (
                <div style={styles.contractBlock}>
                  <div style={styles.sectionLabel}>Contract Terms</div>
                  <div style={styles.kvRow}>
                    <span style={styles.kvKey}>Day Rate</span>
                    <span style={{ ...styles.kvVal, fontFamily: 'var(--font-mono)', color: 'var(--text-warning)' }}>{c.rate}</span>
                  </div>
                  <div style={styles.kvRow}>
                    <span style={styles.kvKey}>Engagement</span>
                    <span style={styles.kvVal}>2 weeks · renewable</span>
                  </div>
                  <div style={styles.kvRow}>
                    <span style={styles.kvKey}>Escrow</span>
                    <span style={styles.kvVal}>10% deposit on acceptance</span>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        <div style={styles.footer}>
          {!done && step > 0 && (
            <button onClick={() => setStep(0)} style={styles.btnSecondary}>Back</button>
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
    maxWidth: 880,
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
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 14,
  },
  profileHead: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'rgba(212, 169, 52, 0.15)',
    border: '1.5px solid var(--border-default)',
    color: 'var(--text-warning)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
  },
  name: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' },
  role: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 },
  kvRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 12,
    gap: 12,
  },
  kvKey: { color: 'var(--text-overline)' },
  kvVal: { color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' },
  verifRow: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  checkPill: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '1px solid transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    flexShrink: 0,
    marginTop: 2,
  },
  verifLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 1,
  },
  verifNote: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  contractBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px dashed var(--border-subtle)',
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
