import { useState } from 'react';
import { Link } from 'react-router-dom';

const PLANS = [
  {
    tier: 'Contractor',
    monthly: { price: 'Free',         suffix: '', note: '3% success fee per completed contract',  example: 'e.g. ZAR 4,200/day → ZAR 126 fee' },
    annual:  { price: 'Free',         suffix: '', note: '3% success fee per completed contract',  example: 'e.g. ZAR 4,200/day → ZAR 126 fee' },
    features: [
      'Digital Crew Wallet',
      'AI job matching by type rating',
      'SACAA e-Services verification badge',
      'Biometric RTS sign-off',
      'Real-time contract notifications',
      'Earnings dashboard',
    ],
    cta: 'Create Profile →',
    href: '/register',
    style: 'outline',
  },
  {
    tier: 'Enterprise',
    featured: true,
    monthly: { price: 'ZAR 12,500',   suffix: '/mo', note: '+ 3% transaction commission', example: 'For Airlines, MROs, Fleet Operators' },
    annual:  { price: 'ZAR 10,625',   suffix: '/mo', note: '+ 3% transaction commission · billed annually', example: 'Save ZAR 22,500 per year' },
    features: [
      'Everything in Contractor',
      'Fleet compliance dashboard',
      'Unlimited personnel management',
      'AOG rapid response — priority queue',
      'Compliance Vault + SACAA audit export',
      'Multi-user access with role-based permissions',
      'API access to "Naluka Verified" engine',
      'Dedicated account manager',
    ],
    cta: 'Get Started →',
    href: '/register',
    style: 'primary',
  },
  {
    tier: 'Supplier / MRO',
    monthly: { price: 'ZAR 4,500',    suffix: '/mo', note: '+ 5% on parts & services sold', example: 'AMOs, OEMs, Parts Distributors' },
    annual:  { price: 'ZAR 3,825',    suffix: '/mo', note: '+ 5% on parts & services sold · billed annually', example: 'Save ZAR 8,100 per year' },
    features: [
      'Unlimited parts listings',
      'Digital birth certificate upload (Form 1, 8130-3, SACAA F18)',
      'AOG priority matching & push alerts',
      'CSD verification badge',
      'Seller analytics dashboard',
      'Bulk inventory import (CSV/API)',
      'Custom pricing & quote workflows',
    ],
    cta: 'List Your Parts →',
    href: '/register',
    style: 'outline',
  },
];

const FAQ = [
  ['How does the 3% commission work?',
   'You only pay when a transaction completes — when a contractor contract is fulfilled and the Digital RTS is signed, or when a parts sale clears compliance. The fee is deducted automatically from the escrow payout.'],
  ['What happens to funds during escrow?',
   'Funds are held via Stripe Connect in a dedicated escrow account. Neither buyer nor seller can access them until the Technical Sign-off is complete. If a dispute arises, our Admin team reviews documentation before releasing.'],
  ['Can I use Naluka outside South Africa?',
   'Yes. We currently support South Africa (SACAA), Kenya (KCAA), and Ethiopia (ECAA). Transactions involving foreign assets automatically prompt for SACAA Form 18 validation.'],
  ['Is my licence data stored securely?',
   'All credentials are encrypted at rest (AES-256) and verified live against SACAA e-Services — we don\'t store your actual licence, only the verification status and expiry.'],
];

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div style={styles.headerGlow} />
        <div style={{ position: 'relative' }}>
          <div style={styles.rule} />
          <h1 style={styles.h1}>
            Simple, <span style={styles.h1Em}>performance-based</span> pricing.
          </h1>
          <p style={styles.lede}>
            You only pay when a transaction completes. No setup fees. No hidden charges. Cancel anytime.
          </p>

          <div style={styles.toggleWrap}>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              style={{
                ...styles.toggleBtn,
                ...(billing === 'monthly' ? styles.toggleBtnActive : {}),
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              style={{
                ...styles.toggleBtn,
                ...(billing === 'annual' ? styles.toggleBtnActive : {}),
              }}
            >
              Annual <span style={styles.discount}>−15%</span>
            </button>
          </div>
        </div>
      </section>

      <section style={styles.cardsSection}>
        <div style={styles.cardsGrid}>
          {PLANS.map((p) => {
            const tier = p[billing];
            return (
              <div
                key={p.tier}
                style={{
                  ...styles.card,
                  ...(p.featured ? styles.cardFeatured : {}),
                }}
              >
                {p.featured && <div style={styles.pill}>Most Popular</div>}
                <div style={{ ...styles.tier, color: p.featured ? 'var(--text-warning)' : 'var(--text-overline)' }}>
                  {p.tier}
                </div>
                <div style={styles.figure}>
                  {tier.price}
                  {tier.suffix && <span style={styles.suffix}>{tier.suffix}</span>}
                </div>
                <div style={styles.note}>{tier.note}</div>
                <div style={styles.example}>{tier.example}</div>

                <div style={styles.features}>
                  {p.features.map((f) => (
                    <div key={f} style={styles.feature}>
                      <span style={styles.checkmark}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>

                <Link
                  to={p.href}
                  style={p.style === 'primary' ? styles.btnPrimary : styles.btnOutline}
                >
                  {p.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <div style={styles.apiRow}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.apiTier}>API / Partner Access</div>
            <div style={styles.apiTitle}>Custom pricing for logistics &amp; HR integrations</div>
            <div style={styles.apiBody}>
              Access the "Naluka Verified" certification engine via REST API. Usage-based billing per
              verification call.
            </div>
          </div>
          <Link to="/login" style={styles.apiCta}>Contact Sales →</Link>
        </div>
      </section>

      <section style={styles.faqSection}>
        <h2 style={styles.faqH2}>Common questions</h2>
        <div>
          {FAQ.map(([q, a], i) => (
            <details key={q} style={{ ...styles.faqRow, borderBottom: i === FAQ.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
              <summary style={styles.faqQ}>{q}</summary>
              <div style={styles.faqA}>{a}</div>
            </details>
          ))}
        </div>
      </section>

      <section style={styles.ctaSection}>
        <h2 style={styles.ctaH2}>
          Start free today.<br />
          <span style={styles.h1Em}>No credit card required.</span>
        </h2>
        <p style={styles.ctaBody}>Get your SACAA Verified badge in under 5 minutes.</p>
        <Link to="/register" style={styles.ctaBtn}>Create Free Account →</Link>
      </section>
    </div>
  );
}

const styles = {
  page: { color: 'var(--text-primary)' },

  header: {
    textAlign: 'center',
    padding: 'clamp(60px, 8vw, 96px) clamp(20px, 4vw, 64px) 56px',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212,169,52,0.09), transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  rule: { width: 40, height: 3, background: 'var(--action-primary)', borderRadius: 2, margin: '0 auto 24px' },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(40px, 5vw, 60px)',
    letterSpacing: '0.01em',
    color: 'var(--text-primary)',
    marginBottom: 16,
    lineHeight: 1.05,
  },
  h1Em: { color: 'var(--text-warning)' },
  lede: {
    fontSize: 18,
    color: 'var(--text-tertiary)',
    maxWidth: 520,
    margin: '0 auto 32px',
    lineHeight: 1.65,
  },
  toggleWrap: {
    display: 'inline-flex',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-pill)',
    padding: 4,
  },
  toggleBtn: {
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    padding: '8px 20px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  },
  toggleBtnActive: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    fontWeight: 700,
  },
  discount: { color: 'var(--color-sage-500)', fontWeight: 600, marginLeft: 4 },

  cardsSection: { padding: '0 clamp(20px, 4vw, 64px) 80px' },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    maxWidth: 1100,
    margin: '0 auto',
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  cardFeatured: {
    background: 'rgba(212, 169, 52, 0.06)',
    borderColor: 'rgba(212, 169, 52, 0.40)',
  },
  pill: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    borderRadius: 'var(--radius-pill)',
    padding: '5px 16px',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  tier: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  figure: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 42,
    color: 'var(--text-primary)',
    lineHeight: 1,
    marginBottom: 4,
    letterSpacing: '0.01em',
  },
  suffix: { fontSize: 20, fontWeight: 400, color: 'var(--text-tertiary)' },
  note: { fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 8 },
  example: {
    fontSize: 12,
    color: 'var(--text-overline)',
    marginBottom: 28,
    fontFamily: 'var(--font-mono)',
  },
  features: { flex: 1, display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 },
  feature: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' },
  checkmark: { color: 'var(--color-sage-500)', fontWeight: 700, flexShrink: 0, marginTop: 1 },
  btnPrimary: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    padding: 13,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'block',
    transition: 'background var(--transition-fast)',
  },
  btnOutline: {
    background: 'transparent',
    color: 'var(--text-warning)',
    border: '1px solid rgba(212, 169, 52, 0.35)',
    borderRadius: 'var(--radius-lg)',
    padding: 13,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'block',
    transition: 'all var(--transition-fast)',
  },
  apiRow: {
    maxWidth: 1100,
    margin: '20px auto 0',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    padding: '28px 36px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 32,
    flexWrap: 'wrap',
  },
  apiTier: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  apiTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 20,
    color: 'var(--text-primary)',
    marginBottom: 4,
    letterSpacing: '0.02em',
  },
  apiBody: { fontSize: 13, color: 'var(--text-tertiary)' },
  apiCta: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '12px 20px',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
  },

  faqSection: {
    padding: '60px clamp(20px, 4vw, 64px)',
    borderTop: '1px solid var(--border-subtle)',
    maxWidth: 800,
    margin: '0 auto',
  },
  faqH2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    marginBottom: 32,
    textAlign: 'center',
  },
  faqRow: {
    padding: '20px 0',
    cursor: 'pointer',
  },
  faqQ: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    listStyle: 'none',
    cursor: 'pointer',
  },
  faqA: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    lineHeight: 1.65,
    marginTop: 8,
  },

  ctaSection: {
    textAlign: 'center',
    padding: 'clamp(48px, 7vw, 72px) clamp(20px, 4vw, 64px)',
    borderTop: '1px solid var(--border-subtle)',
  },
  ctaH2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(28px, 4vw, 36px)',
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    marginBottom: 16,
    lineHeight: 1.15,
  },
  ctaBody: { fontSize: 16, color: 'var(--text-tertiary)', marginBottom: 32 },
  ctaBtn: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 32px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
};
