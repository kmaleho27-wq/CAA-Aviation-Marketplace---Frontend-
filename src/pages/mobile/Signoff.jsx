import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { getWorkOrder, signWorkOrder } from '../../api/contractor';
import { CURRENT_USER } from '../../data/mobile';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const STEPS = ['Review Work', 'Authenticate', 'Sign RTS'];

export default function Signoff() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const query = useApi(getWorkOrder, []);

  const wo = query.data;
  const workRows = wo
    ? [
        ['Aircraft',  wo.aircraft,  false],
        ['Task',      wo.task,      false],
        ['Airline',   wo.airline,   false],
        ['Reference', wo.reference, true],
        ['Part Used', wo.partUsed,  true],
      ]
    : [];

  const advance = async () => {
    if (step >= 3) return;
    if (step !== 2) {
      setStep((s) => Math.min(s + 1, 3));
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await signWorkOrder();
      toast.success(`RTS signed — ${wo.payout} released from escrow`);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  if (query.loading && !query.data) return <div style={styles.scroll}><LoadingBlock label="Loading work order…" minHeight={140} /></div>;
  if (query.error) return <div style={styles.scroll}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  if (!wo) {
    return (
      <div style={styles.scroll}>
        <div style={styles.overline}>Active Contract</div>
        <div style={styles.title}>Digital Release to Service</div>
        <div style={{ ...styles.workCard, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📋</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, fontWeight: 500 }}>
            No active work order
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            When an operator assigns you to a job and the part arrives,
            the work order shows up here for digital sign-off.
          </div>
        </div>
      </div>
    );
  }

  const primaryLabel = step === 0
    ? 'Review Complete →'
    : step === 1
    ? 'Authenticate Identity →'
    : step === 2
    ? (submitting ? 'Signing…' : '✍ Sign Release to Service')
    : '✓ RTS Signed — Funds Released';

  return (
    <div style={styles.scroll}>
      <div style={styles.overline}>Active Contract</div>
      <div style={styles.title}>Digital Release to Service</div>

      <div style={styles.stepsRow}>
        {STEPS.map((label, i) => (
          <div key={label} style={styles.stepWrap}>
            <div style={styles.stepCol}>
              <div
                style={{
                  ...styles.stepDot,
                  background: i <= step ? 'var(--action-primary)' : '#1B2C5E',
                  color: i <= step ? 'var(--action-primary-text)' : 'var(--text-tertiary)',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: i <= step ? 'var(--text-warning)' : 'var(--text-tertiary)',
                  fontWeight: i === step ? 600 : 400,
                  textAlign: 'center',
                }}
              >
                {label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  ...styles.stepLine,
                  background: i < step ? 'var(--action-primary)' : 'rgba(255,255,255,0.08)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={styles.workCard}>
        <div style={styles.sectionLabel}>Work Order</div>
        {workRows.map(([k, v, mono]) => (
          <div key={k} style={styles.workRow}>
            <span style={styles.workKey}>{k}</span>
            <span
              style={{
                ...styles.workVal,
                fontFamily: mono ? 'var(--font-mono)' : 'inherit',
                fontSize: mono ? 10 : 11,
              }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={styles.bioCard}>
          <div style={styles.bioTitle}>Biometric Authentication</div>
          <div style={styles.bioIcon}>👆</div>
          <div style={styles.bioSub}>
            Use Touch ID or Face ID to confirm your identity as the authorised Part 145 signatory
          </div>
        </div>
      )}

      {step >= 2 && (
        <div style={styles.legalCard}>
          <div style={styles.legalText}>
            I, <strong style={styles.legalStrong}>{CURRENT_USER.name}</strong> ({CURRENT_USER.license}), certify that
            the work described has been carried out in accordance with the requirements of{' '}
            <strong style={styles.legalStrong}>SACAA Part 145</strong> and in respect to that work the
            aircraft/component is considered ready for release to service.
          </div>
        </div>
      )}

      <button
        onClick={advance}
        style={{
          ...styles.cta,
          background: step >= 3 ? 'var(--color-sage-500)' : 'var(--action-primary)',
        }}
        disabled={step >= 3}
      >
        {primaryLabel}
      </button>

      {step >= 3 && (
        <div style={styles.payoutLine}>
          Payment of {wo.payout} released from escrow
        </div>
      )}
    </div>
  );
}

const styles = {
  scroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px' },
  overline: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
  stepsRow: { display: 'flex', gap: 0, marginBottom: 20 },
  stepWrap: { display: 'flex', alignItems: 'center', flex: 1 },
  stepCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
  },
  stepLine: {
    width: 24,
    height: 1,
    flexShrink: 0,
    marginBottom: 14,
  },
  workCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 10,
  },
  workRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 11, gap: 10 },
  workKey: { color: 'var(--text-tertiary)', flexShrink: 0 },
  workVal: { color: 'var(--text-primary)', textAlign: 'right' },
  bioCard: {
    background: 'rgba(212, 169, 52, 0.08)',
    border: '1px solid rgba(212, 169, 52, 0.20)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    textAlign: 'center',
  },
  bioTitle: { fontSize: 12, color: 'var(--text-warning)', marginBottom: 8, fontWeight: 500 },
  bioIcon: { fontSize: 32, marginBottom: 8 },
  bioSub: { fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 },
  legalCard: {
    background: 'rgba(58, 138, 110, 0.08)',
    border: '1px solid rgba(58, 138, 110, 0.20)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  legalText: { fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 },
  legalStrong: { color: 'var(--text-primary)' },
  cta: {
    width: '100%',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  payoutLine: {
    textAlign: 'center',
    fontSize: 11,
    color: 'var(--color-sage-500)',
    marginTop: 8,
  },
};
