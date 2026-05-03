import { useEffect, useState } from 'react';
import { useToast } from '../lib/toast';
import { signRTS } from '../api/transactions';

const CHECKS = [
  { label: 'Airworthiness Review', note: 'All maintenance tasks completed per approved data' },
  { label: 'Documentation Check',  note: 'EASA Form 1 / SACAA certificates validated' },
  { label: 'Inspector Identity',   note: 'Part 145 authorisation verified via SACAA e-Services' },
];

export default function RTSModal({ txn, onClose, onSigned }) {
  const [signed, setSigned] = useState(false);
  const toast = useToast();

  useEffect(() => {
    function onEsc(e) {
      if (e.key === 'Escape' && !signed) onClose();
    }
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, signed]);

  const handleSign = async () => {
    if (signed) return;
    setSigned(true);
    try {
      const { transaction } = await signRTS(txn.id);
      toast.success(`RTS signed — ${transaction.amount} released to ${transaction.party}`);
      setTimeout(() => {
        if (onSigned) onSigned(transaction);
        onClose();
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not sign RTS.');
      setSigned(false);
    }
  };

  return (
    <div
      style={styles.backdrop}
      onClick={() => !signed && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Digital Release to Service"
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.overline}>Digital Release to Service</div>
        <div style={styles.title}>Sign-off Required</div>

        <div style={styles.txnCard}>
          <div style={styles.txnItem}>{txn.item}</div>
          <div style={styles.txnMeta}>
            Transaction <span style={styles.txnId}>{txn.id}</span> · {txn.party} · <span style={styles.txnAmount}>{txn.amount}</span>
          </div>
        </div>

        <p style={styles.body}>
          By signing this Digital Release to Service, you confirm the work has been completed to the required
          standard and the aircraft/component is airworthy and cleared for operation. This action is recorded
          on the immutable audit trail.
        </p>

        {CHECKS.map((c) => (
          <div key={c.label} style={styles.checkRow}>
            <div style={styles.checkPill}>✓</div>
            <div>
              <div style={styles.checkLabel}>{c.label}</div>
              <div style={styles.checkNote}>{c.note}</div>
            </div>
          </div>
        ))}

        <div style={styles.footer}>
          <button onClick={onClose} disabled={signed} style={styles.btnSecondary}>Cancel</button>
          <button
            onClick={handleSign}
            style={{
              ...styles.btnPrimary,
              ...(signed
                ? { background: 'var(--color-sage-500)', color: '#072018', cursor: 'default' }
                : { background: 'var(--action-primary)', color: 'var(--action-primary-text)' }),
            }}
          >
            {signed ? '✓ RTS Signed — Funds Released' : '✍ Sign & Release Funds'}
          </button>
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
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: 28,
  },
  overline: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 24,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    marginBottom: 16,
  },
  txnCard: {
    background: 'rgba(196, 66, 30, 0.08)',
    border: '1px solid rgba(196, 66, 30, 0.20)',
    borderLeft: '3px solid var(--color-rust-600)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 14px',
    marginBottom: 16,
  },
  txnItem: {
    fontWeight: 600,
    color: 'var(--text-aog)',
    fontSize: 13,
    marginBottom: 4,
  },
  txnMeta: { fontSize: 12, color: 'var(--color-rust-200)' },
  txnId: { fontFamily: 'var(--font-mono)', color: 'var(--text-warning)' },
  txnAmount: { fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' },
  body: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    marginBottom: 16,
    lineHeight: 1.6,
  },
  checkRow: { display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
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
    marginTop: 2,
  },
  checkLabel: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  checkNote: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  footer: { display: 'flex', gap: 10, marginTop: 20 },
  btnSecondary: {
    background: 'var(--surface-input)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 18px',
    fontSize: 13,
    cursor: 'pointer',
    flex: 1,
  },
  btnPrimary: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flex: 2,
    transition: 'background var(--transition-base)',
  },
};
