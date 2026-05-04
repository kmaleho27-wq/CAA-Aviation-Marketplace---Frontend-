import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Aviation Crew Marketplace',
    body: 'Find and hire SACAA-licensed pilots, cabin crew, ATC officers, flight engineers, AMEs, DAMEs, RPAS pilots and ground operations staff. Every professional carries a Digital Crew Wallet with live licence currency, type ratings and medical status.',
    href: '/login',
    cta: 'Browse crews →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: 'Parts & Asset Marketplace',
    body: 'Procure rotables, consumables and engines with one click — even during an AOG. Every part carries a digital birth certificate: EASA Form 1, FAA 8130-3, or SACAA Form 18.',
    href: '/login',
    cta: 'Browse parts →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z" />
        <path d="M12 22V12" />
        <path d="M22 8.5L12 12 2 8.5" />
      </svg>
    ),
  },
  {
    title: 'Regulatory Compliance Gateway',
    body: 'Live SACAA e-Services integration covering Parts 61–71. Funds are held in escrow and released only when the licensed signatory completes the Digital Sign-off — every flight, every contract, every time.',
    href: '#compliance',
    cta: 'How compliance works →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'AOG & Crew Rapid Response',
    body: 'Aircraft on ground or short a crew member? Our matching engine finds the nearest compliant part and the right licensed person — pilot, engineer or cabin crew — at the same time. Average response: under 90 minutes.',
    href: '/login',
    cta: 'See AOG flow →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: 'Escrow & Settlement',
    body: 'Multi-currency escrow via PayFast for South African flows. Funds lock until the Digital Sign-off is complete — protecting airline and contractor on every transaction.',
    href: '#how',
    cta: 'Learn about escrow →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    title: 'Fleet Operations Dashboard',
    body: 'Airlines, MROs and operators get a live operations dashboard — crew licence expiry watchdog, AOG tracker, escrow balance and a full audit vault for SACAA inspections.',
    href: '/login',
    cta: 'View dashboard →',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: '01', title: 'Post Requirement',     body: 'Airline or operator logs an AOG event, crew shortfall or routine requirement. The matching engine surfaces the nearest compliant part and the right licensed crew — pilot, engineer, cabin crew, ATC or ground ops.' },
  { num: '02', title: 'Compliance Check',     body: 'Supplier CSD status and SACAA licence currency (Parts 61–71) are verified live via e-Services. Non-compliant resources are blocked automatically.' },
  { num: '03', title: 'Funds to Escrow',      body: 'Airline initiates payment. Funds are locked in escrow — visible to both parties but inaccessible until work is complete and verified.' },
  { num: '04', title: 'Digital Sign-off',     body: 'The licensed signatory — Part 145 engineer, pilot in command or designated examiner — signs off via biometric authentication. Funds release instantly. Audit trail is permanently recorded.' },
];

const STATS = [
  { figure: '<90min', label: 'Average AOG response time' },
  { figure: '100%',   label: 'Transactions compliance-gated' },
  { figure: '3–5%',   label: 'Commission — only on success' },
  { figure: '54',     label: 'African countries in Phase 3 rollout' },
];

const CHECKS = [
  { title: 'SACAA e-Services live integration', body: 'Pilot, cabin crew, ATC, engineer, DAME and RPAS licences plus medical certificates and type ratings — all verified in real-time against SACAA\'s own databases before any match is made.' },
  { title: 'National Treasury CSD vetting',     body: 'All South African suppliers and operators are cross-referenced with the Central Supplier Database before funds are released.' },
  { title: 'Tamper-proof audit chain',          body: 'Every sign-off, escrow event and dispute resolution is permanently recorded on a hash-chained ledger — verifiable for SACAA inspections.' },
  { title: '90-day expiry watchdog',            body: 'The platform automatically flags crew licences, medicals and type ratings expiring within 90 days — preventing unlicensed operation before it happens.' },
];

const COMPLIANCE_VAULT_ROWS = [
  { name: 'Part 61 ATPL — Pilot',     ref: 'SA-0089-P1',         status: 'verified', label: '✓ Verified' },
  { name: 'Part 64 Cabin Crew',        ref: 'SA-CC-2024-0058',    status: 'verified', label: '✓ Verified' },
  { name: 'Part 66 AME Cat B1',        ref: 'SA-0142-B1',         status: 'verified', label: '✓ Verified' },
  { name: 'B737 Type Rating',          ref: 'TR-B737-SA-0089',    status: 'expiring', label: '⚠ 42d' },
  { name: 'Class 1 Medical',           ref: 'MED-SA-0089-CL1',    status: 'expiring', label: '⚠ 58d' },
  { name: 'Part 71 RPAS — RPL',        ref: 'SA-RPAS-2025-0042',  status: 'verified', label: '✓ Verified' },
];

const PRICING_TEASER = [
  {
    tier: 'Aviation Professional',
    price: 'Free',
    note: '3% success fee on completed contracts',
    features: ['Digital Crew Wallet', 'Job matching across Parts 61–71', 'SACAA verification badge', 'Digital sign-off (pilot, engineer, DAME)', 'Biometric authentication'],
    cta: 'Create Profile →',
    href: '/register',
    style: 'outline',
  },
  {
    tier: 'Airline / Operator',
    price: 'ZAR 12,500',
    suffix: '/mo',
    note: '+ 3% transaction commission',
    features: ['Fleet & crew compliance dashboard', 'Unlimited crew management', 'AOG & crew rapid response priority', 'Compliance Vault & audit export', 'Multi-user access & roles', 'SACAA inspection reporting'],
    cta: 'Get Started →',
    href: '/register',
    style: 'primary',
    featured: true,
  },
  {
    tier: 'Supplier / MRO',
    price: 'ZAR 4,500',
    suffix: '/mo',
    note: '+ 5% on parts sales',
    features: ['Unlimited parts listings', 'Digital birth certificate upload', 'AOG priority matching', 'CSD verification badge', 'Seller analytics dashboard'],
    cta: 'List Your Parts →',
    href: '/register',
    style: 'outline',
  },
];

const STATUS_BADGE = {
  verified: { bg: 'rgba(58, 138, 110, 0.12)', color: 'var(--color-sage-500)', border: 'rgba(58, 138, 110, 0.25)' },
  expiring: { bg: 'rgba(212, 169, 52, 0.12)', color: 'var(--text-warning)',   border: 'rgba(212, 169, 52, 0.25)' },
};

export default function Landing() {
  return (
    <div style={styles.page}>
      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroGrid} />
        <div style={{ ...styles.heroGlow, width: 900, height: 900, top: -200, right: -100, background: 'radial-gradient(circle, rgba(212,169,52,0.09), transparent 70%)' }} />
        <div style={{ ...styles.heroGlow, width: 500, height: 500, bottom: -100, left: -50, background: 'radial-gradient(circle, rgba(184,74,26,0.07), transparent 70%)' }} />

        <div style={styles.heroContent}>
          <div style={styles.overline}>
            <span style={styles.overlineRule} />
            Africa's Aviation Trust Engine
          </div>
          <h1 style={styles.heroH1}>
            Every flight.<br />
            Every crew.
            <em style={styles.heroEm}>Verified.</em>
          </h1>
          <p style={styles.heroBody}>
            Naluka is Africa's aviation marketplace — where airlines, MROs, pilots, cabin crew, engineers, ATC, ground ops and suppliers connect with SACAA compliance built into every transaction.
          </p>
          <div style={styles.heroActions}>
            <Link to="/register" style={styles.btnPrimaryLg}>Request Demo →</Link>
            <Link to="/login" style={styles.btnOutlineLg}>View Platform</Link>
          </div>
          <div style={styles.heroTrust}>
            {['SACAA Compliant', 'ICAO Aligned', 'Hash-Chained Audit', 'AES-256 Encrypted'].map((b) => (
              <a
                key={b}
                href="#compliance"
                style={styles.trustBadge}
                aria-label={`${b} — read more in compliance section`}
              >
                <span style={styles.trustDot} />
                {b}
              </a>
            ))}
          </div>
        </div>

        <div style={styles.heroVisual} aria-hidden>
          <div style={styles.dashboardPreview}>
            <div style={styles.dpBar}>
              <div style={{ ...styles.dpDot, background: '#B83838' }} />
              <div style={{ ...styles.dpDot, background: '#D4A934' }} />
              <div style={{ ...styles.dpDot, background: '#3A8A6E' }} />
              <span style={styles.dpBarLabel}>Naluka Dashboard</span>
            </div>
            <div style={styles.dpBody}>
              <div style={styles.dpStatRow}>
                {[['AOG Active', '3', 'var(--text-aog)'], ['In Escrow', 'ZAR 2.4M', 'var(--text-warning)'], ['Verified', '142', 'var(--color-sage-500)'], ['Expiring', '7', 'var(--text-warning)']].map(([l, v, c]) => (
                  <div key={l} style={styles.dpStat}>
                    <div style={styles.dpStatLabel}>{l}</div>
                    <div style={{ ...styles.dpStatVal, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={styles.dpAog}>
                <div style={styles.dpAogPulse} />
                <div>
                  <div style={styles.dpAogTitle}>⚡ AOG — ZS-OAL · FAOR</div>
                  <div style={styles.dpAogBody}>CFM56-7B Fuel Pump · 2 suppliers matched</div>
                </div>
                <div style={styles.dpAogBtn}>Respond</div>
              </div>
              <div style={styles.dpSection}>Personnel</div>
              <div style={styles.dpRow}>
                <span style={styles.dpName}>Sipho Dlamini</span>
                <span style={styles.dpCode}>SA-0142-B1</span>
                <span style={{ ...styles.dpBadge, background: 'rgba(58,138,110,0.15)', color: 'var(--color-sage-500)' }}>✓ Verified</span>
              </div>
              <div style={styles.dpRow}>
                <span style={styles.dpName}>Anele Mokoena</span>
                <span style={styles.dpCode}>SA-0089-P1</span>
                <span style={{ ...styles.dpBadge, background: 'rgba(212,169,52,0.12)', color: 'var(--text-warning)' }}>Expiring</span>
              </div>
              <div style={{ ...styles.dpRow, borderBottom: 'none' }}>
                <span style={styles.dpName}>Tariq Hassan</span>
                <span style={styles.dpCode}>KE-0301-ATC</span>
                <span style={{ ...styles.dpBadge, background: 'rgba(212,169,52,0.10)', color: 'var(--text-warning)' }}>Pending</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <div style={styles.logosBar}>
        <div style={styles.logosLabel}>Trusted by</div>
        <div style={styles.logosTrack}>
          {['South African Airways', 'FlySafair', 'Ethiopian Airlines', 'Kenya Airways', 'Airlink', 'ExecuJet MRO'].map((l) => (
            <div key={l} style={styles.logoItem}>{l}</div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.rule} />
          <h2 style={styles.sectionH2}>One platform for the <em style={styles.h2Em}>entire</em> aviation ecosystem.</h2>
          <p style={styles.sectionBody}>From an AOG emergency to a routine A-check, every transaction goes through the same compliance gate.</p>
        </div>
        <div style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.featCard}>
              <div style={styles.featIcon}>{f.icon}</div>
              <div style={styles.featTitle}>{f.title}</div>
              <div style={styles.featBody}>{f.body}</div>
              {f.href.startsWith('#') ? (
                <a href={f.href} style={styles.featLink}>{f.cta}</a>
              ) : (
                <Link to={f.href} style={styles.featLink}>{f.cta}</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ ...styles.section, ...styles.sectionMuted }}>
        <div style={styles.sectionHeader}>
          <div style={styles.rule} />
          <h2 style={styles.sectionH2}>From AOG event to <em style={styles.h2Em}>aircraft back in service.</em></h2>
        </div>
        <div style={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={styles.step}>
              <div style={styles.stepNum}>{s.num}</div>
              <div style={styles.stepTitle}>{s.title}</div>
              <div style={styles.stepBody}>{s.body}</div>
              {i < STEPS.length - 1 && <div style={styles.stepConnector} />}
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <div style={styles.statsSection}>
        <div style={styles.statsGrid}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={styles.statFigure}>{s.figure}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPLIANCE */}
      <section id="compliance" style={styles.section}>
        <div style={styles.complianceSplit}>
          <div>
            <div style={styles.rule} />
            <h2 style={styles.sectionH2}>Compliance isn't a checkbox. <em style={styles.h2Em}>It's the transaction.</em></h2>
            <p style={{ ...styles.sectionBody, marginBottom: 0 }}>
              Every step on Naluka is gated by real-time regulatory verification — not manual review.
            </p>
            <div style={styles.complianceChecks}>
              {CHECKS.map((c) => (
                <div key={c.title} style={styles.checkItem}>
                  <div style={styles.checkIcon}>✓</div>
                  <div>
                    <div style={styles.checkTitle}>{c.title}</div>
                    <div style={styles.checkBody}>{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.complianceVisual}>
            <div style={styles.cvHeader}>Compliance Vault — Active Licences</div>
            {COMPLIANCE_VAULT_ROWS.map((r, i) => {
              const tone = STATUS_BADGE[r.status];
              return (
                <div key={r.ref} style={{ ...styles.cvRow, borderBottom: i === COMPLIANCE_VAULT_ROWS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={styles.cvName}>{r.name}</div>
                    <div style={styles.cvRef}>{r.ref}</div>
                  </div>
                  <div style={{ ...styles.cvBadge, background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                    {r.label}
                  </div>
                </div>
              );
            })}
            <div style={styles.cvFooter}>
              <span style={{ color: 'var(--text-warning)', fontWeight: 600 }}>Expiry Watchdog: </span>
              2 licences expiring in &lt;90 days. Renewal reminders sent automatically.
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ ...styles.section, ...styles.sectionMuted }}>
        <div style={styles.sectionHeader}>
          <div style={styles.rule} />
          <h2 style={styles.sectionH2}>Simple, <em style={styles.h2Em}>performance-based</em> pricing.</h2>
          <p style={styles.sectionBody}>You only pay when a transaction completes. No hidden fees.</p>
        </div>
        <div style={styles.pricingGrid}>
          {PRICING_TEASER.map((p) => (
            <div
              key={p.tier}
              style={{
                ...styles.priceCard,
                ...(p.featured ? styles.priceCardFeatured : {}),
              }}
            >
              {p.featured && <div style={styles.pricePill}>Most Popular</div>}
              <div style={styles.priceTier}>{p.tier}</div>
              <div style={styles.priceFigure}>
                {p.price}
                {p.suffix && <span style={styles.priceSuffix}>{p.suffix}</span>}
              </div>
              <div style={styles.priceNote}>{p.note}</div>
              <div style={styles.priceFeatures}>
                {p.features.map((f) => (
                  <div key={f} style={styles.priceFeature}>
                    <span style={styles.priceCheck}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <Link
                to={p.href}
                style={p.style === 'primary' ? styles.priceBtnPrimary : styles.priceBtnOutline}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <div style={styles.pricingFooterLink}>
          <Link to="/pricing" style={{ color: 'var(--text-warning)', fontSize: 14 }}>
            Compare all features →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section style={{ ...styles.section, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={styles.ctaGlow} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ ...styles.rule, margin: '0 auto 24px' }} />
          <h2 style={styles.ctaH2}>
            Ready to connect to African<br />
            <em style={styles.h2Em}>aviation's trust layer?</em>
          </h2>
          <p style={styles.ctaBody}>Join the airlines, crews and suppliers already operating on Naluka.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ ...styles.btnPrimaryLg, fontSize: 15, padding: '14px 32px' }}>Request Demo →</Link>
            <a
              href="mailto:hello@naluka.aero?subject=Naluka%20—%20Sales%20enquiry"
              style={{ ...styles.btnOutlineLg, fontSize: 15, padding: '14px 24px' }}
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: { color: 'var(--text-primary)' },

  hero: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    padding: 'clamp(80px, 10vh, 120px) clamp(20px, 4vw, 64px) 80px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGrid: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(212,169,52,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(212,169,52,0.04) 1px, transparent 1px)',
    backgroundSize: '72px 72px',
  },
  heroGlow: { position: 'absolute', borderRadius: '50%', pointerEvents: 'none' },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 720 },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  overlineRule: { width: 24, height: 2, background: 'var(--action-primary)', borderRadius: 1 },
  heroH1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(48px, 6vw, 80px)',
    lineHeight: 0.97,
    letterSpacing: '0.01em',
    color: 'var(--text-primary)',
    marginBottom: 28,
  },
  heroEm: { color: 'var(--text-warning)', fontStyle: 'normal', display: 'block' },
  heroBody: {
    fontSize: 18,
    lineHeight: 1.65,
    color: 'var(--text-secondary)',
    maxWidth: 540,
    marginBottom: 40,
  },
  heroActions: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 56, flexWrap: 'wrap' },
  btnPrimaryLg: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background var(--transition-fast)',
  },
  btnOutlineLg: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 24px',
    fontSize: 15,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
  },
  heroTrust: { display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' },
  trustBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-pill)',
    padding: '5px 12px',
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background var(--transition-fast), border-color var(--transition-fast)',
  },
  trustDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--color-sage-500)' },

  heroVisual: {
    position: 'absolute',
    right: -40,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 600,
    pointerEvents: 'none',
    display: 'none',
  },
  dashboardPreview: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-default)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
    transform: 'perspective(1000px) rotateY(-8deg) rotateX(2deg)',
  },
  dpBar: {
    background: 'var(--surface-card)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dpDot: { width: 8, height: 8, borderRadius: '50%' },
  dpBarLabel: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-overline)', marginLeft: 8 },
  dpBody: { padding: 16 },
  dpStatRow: { display: 'flex', gap: 8, marginBottom: 10 },
  dpStat: {
    flex: 1,
    background: 'var(--surface-input)',
    borderRadius: 6,
    padding: '10px 12px',
  },
  dpStatLabel: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  dpStatVal: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400 },
  dpAog: {
    background: 'rgba(184, 74, 26, 0.10)',
    border: '1px solid rgba(184, 74, 26, 0.25)',
    borderLeft: '3px solid var(--color-rust-600)',
    borderRadius: 6,
    padding: '10px 12px',
    marginBottom: 10,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  dpAogPulse: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--color-rust-600)',
    animation: 'pulse 1.5s infinite',
    flexShrink: 0,
  },
  dpAogTitle: { fontSize: 9, fontWeight: 700, color: 'var(--text-aog)', marginBottom: 2 },
  dpAogBody: { fontSize: 9, color: 'var(--text-secondary)' },
  dpAogBtn: {
    marginLeft: 'auto',
    background: 'var(--color-rust-600)',
    color: '#fff',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 8,
    fontWeight: 700,
    flexShrink: 0,
  },
  dpSection: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  dpRow: {
    display: 'flex',
    gap: 8,
    padding: '7px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  dpName: { fontSize: 10, fontWeight: 500, color: 'var(--text-primary)', flex: 1 },
  dpCode: { fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-warning)' },
  dpBadge: { fontSize: 8, fontWeight: 600, borderRadius: 'var(--radius-pill)', padding: '2px 6px' },

  logosBar: {
    padding: '40px clamp(20px, 4vw, 64px)',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    flexWrap: 'wrap',
  },
  logosLabel: {
    fontSize: 11,
    color: 'var(--text-overline)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    marginRight: 40,
  },
  logosTrack: { display: 'flex', gap: 40, alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  logoItem: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 14,
    color: 'var(--text-overline)',
    letterSpacing: '0.01em',
    opacity: 0.6,
  },

  section: { padding: 'clamp(60px, 8vw, 100px) clamp(20px, 4vw, 64px)' },
  sectionMuted: {
    background: 'var(--surface-raised)',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionHeader: { maxWidth: 600 },
  rule: { width: 40, height: 3, background: 'var(--action-primary)', borderRadius: 2, marginBottom: 20 },
  sectionH2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(32px, 4vw, 48px)',
    letterSpacing: '0.01em',
    color: 'var(--text-primary)',
    marginBottom: 16,
    lineHeight: 1.1,
  },
  h2Em: { color: 'var(--text-warning)', fontStyle: 'normal' },
  sectionBody: { fontSize: 17, lineHeight: 1.65, color: 'var(--text-tertiary)' },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 2,
    marginTop: 60,
  },
  featCard: {
    background: 'var(--surface-card)',
    padding: '40px 36px',
    position: 'relative',
    overflow: 'hidden',
  },
  featIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'rgba(212, 169, 52, 0.12)',
    border: '1px solid rgba(212, 169, 52, 0.20)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    color: 'var(--action-primary)',
  },
  featTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    color: 'var(--text-primary)',
    marginBottom: 12,
    letterSpacing: '0.02em',
  },
  featBody: { fontSize: 15, lineHeight: 1.65, color: 'var(--text-tertiary)', marginBottom: 20 },
  featLink: {
    fontSize: 13,
    color: 'var(--text-warning)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },

  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
    marginTop: 56,
  },
  step: { position: 'relative' },
  stepNum: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 48,
    color: 'rgba(212, 169, 52, 0.20)',
    lineHeight: 1,
    marginBottom: 16,
  },
  stepTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
    marginBottom: 8,
    letterSpacing: '0.02em',
  },
  stepBody: { fontSize: 14, lineHeight: 1.65, color: 'var(--text-tertiary)' },
  stepConnector: {
    position: 'absolute',
    top: 24,
    right: -12,
    width: 24,
    height: 1,
    background: 'var(--border-default)',
  },

  statsSection: {
    background: 'var(--surface-raised)',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: 'clamp(40px, 6vw, 80px) clamp(20px, 4vw, 64px)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 40,
  },
  statFigure: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(36px, 4vw, 52px)',
    lineHeight: 1,
    letterSpacing: '0.01em',
    color: 'var(--text-warning)',
    marginBottom: 8,
  },
  statLabel: { fontSize: 14, color: 'var(--text-tertiary)' },

  complianceSplit: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 'clamp(40px, 6vw, 80px)',
    alignItems: 'center',
  },
  complianceChecks: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32 },
  checkItem: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(58, 138, 110, 0.15)',
    border: '1px solid rgba(58, 138, 110, 0.30)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: 'var(--color-sage-500)',
    flexShrink: 0,
    marginTop: 2,
  },
  checkTitle: { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 },
  checkBody: { fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' },

  complianceVisual: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 16,
    padding: 28,
  },
  cvHeader: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 16,
  },
  cvRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
    gap: 12,
  },
  cvName: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  cvRef: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-warning)', marginTop: 1 },
  cvBadge: {
    fontSize: 10,
    fontWeight: 600,
    borderRadius: 'var(--radius-pill)',
    padding: '3px 9px',
    whiteSpace: 'nowrap',
  },
  cvFooter: {
    marginTop: 16,
    padding: 12,
    background: 'rgba(212, 169, 52, 0.06)',
    border: '1px solid rgba(212, 169, 52, 0.15)',
    borderRadius: 'var(--radius-lg)',
    fontSize: 12,
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
  },

  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginTop: 56,
  },
  priceCard: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: '32px 28px',
    position: 'relative',
  },
  priceCardFeatured: {
    borderColor: 'rgba(212, 169, 52, 0.40)',
    background: 'rgba(212, 169, 52, 0.06)',
  },
  pricePill: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 14px',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  priceTier: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-overline)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 12,
  },
  priceFigure: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 36,
    color: 'var(--text-primary)',
    marginBottom: 4,
    letterSpacing: '0.01em',
  },
  priceSuffix: { fontSize: 18, fontWeight: 400, color: 'var(--text-tertiary)' },
  priceNote: { fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24 },
  priceFeatures: { display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 28 },
  priceFeature: { fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 },
  priceCheck: { color: 'var(--color-sage-500)', fontWeight: 700, flexShrink: 0 },
  priceBtnPrimary: {
    display: 'block',
    textAlign: 'center',
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    padding: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  priceBtnOutline: {
    display: 'block',
    textAlign: 'center',
    background: 'transparent',
    color: 'var(--text-warning)',
    border: '1px solid rgba(212, 169, 52, 0.35)',
    borderRadius: 'var(--radius-lg)',
    padding: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  pricingFooterLink: {
    textAlign: 'center',
    marginTop: 32,
  },

  ctaGlow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212,169,52,0.10), transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  ctaH2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(36px, 5vw, 60px)',
    letterSpacing: '0.01em',
    color: 'var(--text-primary)',
    marginBottom: 20,
    lineHeight: 1.05,
  },
  ctaBody: {
    fontSize: 18,
    color: 'var(--text-tertiary)',
    marginBottom: 40,
    maxWidth: 520,
    margin: '0 auto 40px',
  },
};
