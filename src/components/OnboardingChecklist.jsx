import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { listMyPersonnelDocs } from '../api/documents';
import { getDocRequirements } from '../data/document-requirements';

// Onboarding banner shown to self-registered aviation pros while
// their personnel.status = 'pending'. Replaces the previous
// "Awaiting Review" dead wall with productive tasks. Once verification
// lands, the banner disappears (status flips to 'verified').
//
// /autoplan design D2 — this is the activation cliff fix.

const STEPS = [
  {
    id: 'docs',
    label: 'Upload your compliance documents',
    body: (count, total) =>
      total === 0
        ? 'Upload your licence, medical, and any required endorsements.'
        : count === total
        ? `All ${total} required documents uploaded. ✓`
        : `${count} of ${total} required documents uploaded.`,
    cta: 'Open Profile →',
    href: '/m/profile',
  },
  {
    id: 'preview',
    label: 'Browse the marketplace in read-only mode',
    body: () => 'See live AOG events, available parts, and how operators describe their needs. You can\'t book yet, but you can prepare.',
    cta: 'Browse →',
    href: '/m/jobs',
  },
  {
    id: 'profile',
    label: 'Complete your professional profile',
    body: () => 'Add type ratings, base airfield, recent hours, and your day rate. Operators filter on this.',
    cta: 'Edit profile →',
    href: '/m/profile',
  },
];

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

export default function OnboardingChecklist() {
  const [state, setState] = useState({ loading: true, personnel: null, docCount: 0, requiredCount: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;

        const { data: ppl } = await supabase
          .from('personnel')
          .select('id, discipline, status, created_at')
          .eq('user_id', auth.user.id)
          .maybeSingle();

        if (cancelled || !ppl || ppl.status !== 'pending') {
          setState((s) => ({ ...s, loading: false, personnel: ppl }));
          return;
        }

        const docs = await listMyPersonnelDocs();
        const requirements = getDocRequirements(ppl.discipline);
        // Match uploaded doc to requirement by label (uploadPersonnelDoc
        // sets name = requirement label).
        const uploaded = new Set(docs.map((d) => d.name));
        const completed = requirements.filter((r) => uploaded.has(r.label)).length;

        if (!cancelled) {
          setState({
            loading: false,
            personnel: ppl,
            docCount: completed,
            requiredCount: requirements.length,
          });
        }
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Don't render anything if loading, or user has no personnel row, or
  // their status isn't pending.
  if (state.loading) return null;
  if (!state.personnel || state.personnel.status !== 'pending') return null;

  const docsComplete = state.requiredCount > 0 && state.docCount === state.requiredCount;
  const submittedAgo = fmtRelative(state.personnel.created_at);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.statusPill}>Awaiting verification</div>
        <div style={styles.eta}>
          Submitted {submittedAgo}. Typically reviewed within
          <strong style={{ color: 'var(--text-warning)' }}> 4 business hours</strong>.
        </div>
      </div>

      <h2 style={styles.title}>You're nearly live on Naluka</h2>
      <p style={styles.lead}>
        While our verification team checks your licence with SACAA, here's
        what you can do to be ready when you're approved.
      </p>

      <div style={styles.steps}>
        {STEPS.map((step, idx) => {
          const isDocs = step.id === 'docs';
          const completed = isDocs && docsComplete;
          return (
            <Link key={step.id} to={step.href} style={{ ...styles.step, ...(completed ? styles.stepDone : {}) }}>
              <div style={styles.stepNum}>
                {completed ? '✓' : idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.stepLabel}>{step.label}</div>
                <div style={styles.stepBody}>
                  {step.body(isDocs ? state.docCount : 0, isDocs ? state.requiredCount : 0)}
                </div>
              </div>
              <span style={styles.stepCta}>{step.cta}</span>
            </Link>
          );
        })}
      </div>

      <div style={styles.footer}>
        Need to chat with the verification team? Email
        <a href="mailto:support@naluka.aero" style={styles.link}> support@naluka.aero</a>.
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'linear-gradient(135deg, rgba(212,169,52,0.06), rgba(184,74,26,0.04))',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: 18,
    marginBottom: 14,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  statusPill: {
    background: 'rgba(212, 169, 52, 0.15)',
    color: 'var(--text-warning)',
    border: '1px solid rgba(212, 169, 52, 0.30)',
    borderRadius: 'var(--radius-pill)',
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
  },
  eta: { fontSize: 11, color: 'var(--text-tertiary)' },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 20,
    color: 'var(--text-primary)',
    margin: '0 0 6px',
    letterSpacing: '0.01em',
  },
  lead: { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.55, margin: '0 0 12px' },
  steps: { display: 'flex', flexDirection: 'column', gap: 6 },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background var(--transition-fast)',
  },
  stepDone: {
    background: 'rgba(58, 138, 110, 0.08)',
    borderColor: 'rgba(58, 138, 110, 0.25)',
  },
  stepNum: {
    width: 22, height: 22,
    borderRadius: '50%',
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  stepLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' },
  stepBody: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, lineHeight: 1.4 },
  stepCta: { fontSize: 10, color: 'var(--text-warning)', flexShrink: 0 },
  footer: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 12, lineHeight: 1.5 },
  link: { color: 'var(--text-warning)', textDecoration: 'none' },
};
