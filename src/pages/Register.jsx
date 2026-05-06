import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as authRegister } from '../api/auth';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';

// Hide the marketing/brand panel on narrow viewports. The form column
// is `flex: 1 1 0`, so it expands to fill the page when this hides.
const RESPONSIVE_CSS = `
  @media (max-width: 900px) {
    .naluka-register-brand { display: none !important; }
  }
`;

// ── Account types ────────────────────────────────────────────────
// Maps each user-facing account type to the platform role enum
// (profile.role) and whether the discipline picker shows.
const ACCOUNT_TYPES = [
  {
    key: 'professional',
    label: 'Aviation Professional',
    sub: 'Pilot, cabin crew, engineer, ATC, DAME, RPAS or ground ops',
    role: 'AME',
    showDiscipline: true,
  },
  {
    key: 'operator',
    label: 'Airline / Operator',
    sub: 'Hire crews and procure parts',
    role: 'OPERATOR',
    showDiscipline: false,
  },
  {
    key: 'supplier',
    label: 'Parts Supplier',
    sub: 'List parts, rotables and consumables',
    role: 'SUPPLIER',
    showDiscipline: false,
  },
  {
    key: 'amo',
    label: 'MRO Organisation',
    sub: 'Offer maintenance services (Part 145 AMO)',
    role: 'AMO',
    showDiscipline: false,
  },
];

// ── SACAA disciplines ────────────────────────────────────────────
// Shape mirrors migration 0006 — sacaa_part nullable for non_licensed.
// `subtypes` drives the optional Subtype dropdown; `medical` is the
// default medical_class to seed (user can correct later via profile).
// `aircraft` is the default aircraft_category.
const DISCIPLINES = [
  { key: 'flight_crew',     label: 'Pilot — Part 61 (PPL / CPL / ATPL)',
    sacaa_part: 61, subtypes: ['PPL', 'CPL', 'ATPL'], aircraft: 'aeroplane',  medical: 'class_1' },
  { key: 'national_pilot',  label: 'National Pilot — Part 62 (NPL)',
    sacaa_part: 62, subtypes: ['NPL'],                aircraft: 'microlight', medical: 'class_4' },
  { key: 'flight_engineer', label: 'Flight Engineer — Part 63',
    sacaa_part: 63, subtypes: ['FE'],                 aircraft: 'aeroplane',  medical: 'class_1' },
  { key: 'cabin_crew',      label: 'Cabin Crew — Part 64',
    sacaa_part: 64, subtypes: ['CCM'],                aircraft: 'aeroplane',  medical: 'class_2' },
  { key: 'atc',             label: 'Air Traffic Controller — Part 65',
    sacaa_part: 65, subtypes: ['ATC-APP', 'ATC-ENR', 'ATC-AD', 'ASST'], aircraft: 'none', medical: 'class_2' },
  { key: 'ame',             label: 'Aircraft Maintenance Engineer — Part 66',
    sacaa_part: 66, subtypes: ['Cat A', 'B1', 'B2', 'C'], aircraft: 'aeroplane', medical: 'none' },
  { key: 'aviation_medical',label: 'Designated Aviation Medical Examiner — Part 67',
    sacaa_part: 67, subtypes: ['DAME'],               aircraft: 'none',       medical: 'none' },
  { key: 'glider_pilot',    label: 'Glider Pilot — Part 68',
    sacaa_part: 68, subtypes: [],                     aircraft: 'glider',     medical: 'class_4' },
  { key: 'balloon_pilot',   label: 'Balloon Pilot — Part 69',
    sacaa_part: 69, subtypes: [],                     aircraft: 'balloon',    medical: 'class_4' },
  { key: 'rpas_pilot',      label: 'RPAS Pilot — Part 71 (Drones)',
    sacaa_part: 71, subtypes: ['RPL'],                aircraft: 'rpas',       medical: 'class_4' },
  { key: 'non_licensed',    label: 'Ground Operations (non-licensed)',
    sacaa_part: null, subtypes: [],                   aircraft: 'none',       medical: 'none' },
];

// Translate raw Supabase signup errors into actionable messages.
// Critical case: "email rate limit exceeded" — Supabase free tier caps
// auth emails at ~30/hour. Real customers have hit this. Until custom
// SMTP via Resend is wired up, we explain what's happening so they
// don't think the platform is broken.
function humanizeRegisterError(err) {
  const raw = (err.response?.data?.message || err.message || '').toLowerCase();

  if (raw.includes('email rate limit') || raw.includes('rate limit')) {
    return 'Our email provider hit a temporary cap. Please wait ~60 minutes and try again. ' +
           'If this happens repeatedly, contact support@naluka.aero — we can create your account directly.';
  }
  if (raw.includes('already registered') || raw.includes('already exists') || raw.includes('user already')) {
    return 'An account with this email already exists. Try signing in, or use "Forgot password?" if you can\'t remember.';
  }
  if (raw.includes('invalid email') || raw.includes('email format')) {
    return 'That email doesn\'t look right. Double-check the format (e.g. you@example.com).';
  }
  if (raw.includes('password') && (raw.includes('weak') || raw.includes('short'))) {
    return 'Password too weak. Use at least 8 characters with a mix of letters and numbers.';
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'Couldn\'t reach the server. Check your internet connection and try again.';
  }
  return err.response?.data?.message || err.message ||
         'Registration failed — please check your details and try again.';
}

// Free-form ground ops roles — surfaces a dropdown for non_licensed
// instead of asking the user to invent a string.
const NON_LICENSED_ROLES = [
  { key: 'aviation_firefighter', label: 'Aviation Firefighter (RFF)' },
  { key: 'marshaller',           label: 'Aircraft Marshaller / Ramp Coordinator' },
  { key: 'refueler',             label: 'Aircraft Refueler' },
  { key: 'security',             label: 'Aviation Security' },
  { key: 'baggage_handler',      label: 'Baggage Handler' },
  { key: 'ground_handler',       label: 'Ground Handling Agent' },
  { key: 'other',                label: 'Other' },
];

export default function Register() {
  const [accountType, setAccountType] = useState('professional');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Discipline-only fields
  const [discipline, setDiscipline] = useState('flight_crew');
  const [licence, setLicence] = useState('');
  const [licenceSubtype, setLicenceSubtype] = useState('');
  const [location, setLocation] = useState('');
  const [nonLicensedRole, setNonLicensedRole] = useState('aviation_firefighter');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [consented, setConsented] = useState(false);
  const navigate = useNavigate();

  const account = ACCOUNT_TYPES.find((a) => a.key === accountType);
  const disc = DISCIPLINES.find((d) => d.key === discipline);
  const isNonLicensed = discipline === 'non_licensed';

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!consented) {
      setError('Please review and accept the Terms and Privacy Policy to continue.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Build the metadata payload — the handle_new_user trigger reads
      // these keys to populate the profile + personnel rows.
      const metadata = { name, role: account.role };

      if (account.showDiscipline) {
        Object.assign(metadata, {
          discipline,
          sacaa_part: disc.sacaa_part != null ? String(disc.sacaa_part) : '',
          licence_subtype: isNonLicensed ? '' : (licenceSubtype || ''),
          location: location || '',
          aircraft_category: disc.aircraft,
          medical_class: disc.medical,
          license: isNonLicensed ? '' : licence,
          non_licensed_role: isNonLicensed ? nonLicensedRole : '',
          role_title: disc.label.split(' — ')[0], // e.g. "Pilot", "Cabin Crew"
        });
      }

      const result = await authRegister({ name, email, password, role: account.role, metadata });

      if (result?.id && localStorage.getItem('token')) {
        navigate('/login', { replace: true });
      } else {
        setSubmitted({ email });
      }
    } catch (err) {
      setError(humanizeRegisterError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Left brand panel — same on submitted-success state and form state.
  // Hidden on viewports < 900px via the responsive <style> rule below.
  const BrandPanel = (
    <aside className="naluka-register-brand" style={styles.brandPanel}>
      <div style={styles.brandInner}>
        <Logo size={32} subtitle="Aviation Platform" />
        <div style={styles.brandHero}>
          <div style={styles.brandOverline}>
            <span style={styles.brandOverlineRule} />
            Africa's Aviation Trust Engine
          </div>
          <h2 style={styles.brandH2}>
            Every flight.<br />Every crew.<br />
            <em style={styles.brandH2Em}>Verified.</em>
          </h2>
          <p style={styles.brandLead}>
            Join Naluka and operate inside Africa's only SACAA-compliance-gated
            aviation marketplace — pilots, cabin crew, engineers, ATC, DAMEs,
            RPAS and ground ops.
          </p>
        </div>
        <div style={styles.brandTrust}>
          {[
            'SACAA Compliant',
            'ICAO Aligned',
            'Hash-Chained Audit',
            'AES-256 Encrypted',
          ].map((b) => (
            <span key={b} style={styles.brandPill}>
              <span style={styles.brandDot} />
              {b}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );

  if (submitted) {
    return (
      <div style={styles.page}>
        <style>{RESPONSIVE_CSS}</style>
        {BrandPanel}
        <div style={styles.formColumn}>
          <div style={styles.formInner}>
            <div style={styles.overline}>Almost there</div>
            <h1 style={styles.h1}>Check your inbox</h1>
            <p style={styles.sub}>
              We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{submitted.email}</strong>.
              Click the link to activate your account — it'll bring you back here signed in.
            </p>
            <div style={{ ...styles.error, background: 'rgba(58, 138, 110, 0.08)', borderLeft: '3px solid var(--color-sage-500)', color: 'var(--color-sage-500)', borderColor: 'rgba(58, 138, 110, 0.30)', marginTop: 22 }}>
              Email not arriving? Check your spam folder. The link expires in 24 hours.
            </div>
            <p style={styles.footer}>
              Already confirmed? <Link to="/login" style={styles.link}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{RESPONSIVE_CSS}</style>
      {BrandPanel}
      <div style={styles.formColumn}>
        <div style={styles.formInner}>
          <div style={styles.overline}>Create account</div>
          <h1 style={styles.h1}>Join Naluka</h1>
          <p style={styles.sub}>SACAA-verified crews, suppliers and operators across Africa.</p>

          <form onSubmit={handleRegister} style={{ marginTop: 22 }}>
          {/* Account type — radio cards */}
          <label style={styles.label}>I am a…</label>
          <div style={styles.accountTypeGrid}>
            {ACCOUNT_TYPES.map((a) => (
              <label
                key={a.key}
                style={{
                  ...styles.accountCard,
                  ...(accountType === a.key ? styles.accountCardActive : {}),
                }}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={a.key}
                  checked={accountType === a.key}
                  onChange={() => setAccountType(a.key)}
                  style={styles.radio}
                />
                <div>
                  <div style={styles.accountCardLabel}>{a.label}</div>
                  <div style={styles.accountCardSub}>{a.sub}</div>
                </div>
              </label>
            ))}
          </div>

          <label style={styles.label}>Full name</label>
          <input
            type="text"
            placeholder="Sipho Dlamini"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Email</label>
          <input
            type="email"
            placeholder="you@operator.aero"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Password</label>
          <PasswordInput
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          {/* Discipline-specific fields */}
          {account.showDiscipline && (
            <>
              <label style={styles.label}>Your discipline</label>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={styles.input}>
                {DISCIPLINES.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>

              <label style={styles.label}>Where are you based?</label>
              <input
                type="text"
                placeholder="Johannesburg"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={styles.input}
                required
              />

              {isNonLicensed ? (
                <>
                  <label style={styles.label}>Role</label>
                  <select
                    value={nonLicensedRole}
                    onChange={(e) => setNonLicensedRole(e.target.value)}
                    style={styles.input}
                  >
                    {NON_LICENSED_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label style={styles.label}>SACAA licence number</label>
                  <input
                    type="text"
                    placeholder="e.g. SA-0142-B1"
                    value={licence}
                    onChange={(e) => setLicence(e.target.value)}
                    style={styles.input}
                    required
                  />

                  {disc?.subtypes?.length > 0 && (
                    <>
                      <label style={styles.label}>Licence subtype</label>
                      <select
                        value={licenceSubtype}
                        onChange={(e) => setLicenceSubtype(e.target.value)}
                        style={styles.input}
                      >
                        <option value="">— Select —</option>
                        {disc.subtypes.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}

              <div style={styles.notice}>
                Your account starts in <strong>pending verification</strong>. An admin will check
                your licence with SACAA before you appear in the marketplace. You can upload
                supporting documents from your profile after sign-in.
              </div>
            </>
          )}

          {/* POPI Act + ToS consent — checkbox required for account creation */}
          <label style={styles.consentRow}>
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              style={styles.consentCheck}
            />
            <span style={styles.consentText}>
              I agree to Naluka's <Link to="/terms" target="_blank" rel="noreferrer" style={styles.consentLink}>Terms of Service</Link>
              {' '}and <Link to="/privacy" target="_blank" rel="noreferrer" style={styles.consentLink}>Privacy Policy</Link>,
              and consent to the processing of my personal information per the POPI Act for the purpose of operating the Naluka platform.
            </span>
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting || !consented} style={{ ...styles.btn, opacity: (submitting || !consented) ? 0.6 : 1 }}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
          </form>

          <p style={styles.footer}>
            Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  // ── Page-level grid ─────────────────────────────────────────────
  // Two-column split on desktop (brand panel + form column), single
  // column under 900px viewport (brand panel collapses out of flow).
  page: {
    flex: 1,
    minHeight: '100vh',
    display: 'flex',
    background: 'var(--surface-base)',
  },
  brandPanel: {
    flex: '1 1 0',
    minWidth: 0,
    background: 'radial-gradient(circle at 25% 30%, rgba(21,32,67,0.85) 0%, rgba(7,12,32,0.6) 60%), linear-gradient(135deg, rgba(184,74,26,0.10), transparent 60%)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 56px',
  },
  brandInner: {
    width: '100%',
    maxWidth: 460,
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  brandHero: { display: 'flex', flexDirection: 'column', gap: 16 },
  brandOverline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  brandOverlineRule: { width: 24, height: 2, background: 'var(--action-primary)', borderRadius: 1 },
  brandH2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 'clamp(36px, 4vw, 56px)',
    lineHeight: 0.98,
    letterSpacing: '0.01em',
    color: 'var(--text-primary)',
    margin: 0,
  },
  brandH2Em: { color: 'var(--text-warning)', fontStyle: 'normal' },
  brandLead: {
    fontSize: 15,
    color: 'var(--text-tertiary)',
    lineHeight: 1.6,
    margin: 0,
  },
  brandTrust: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  brandPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-pill)',
    padding: '5px 12px',
    fontSize: 11,
    color: 'var(--text-tertiary)',
  },
  brandDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--color-sage-500)' },

  // ── Form column ────────────────────────────────────────────────
  formColumn: {
    flex: '1 1 0',
    minWidth: 0,
    overflowY: 'auto',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '56px 32px',
  },
  formInner: {
    width: '100%',
    maxWidth: 460,
  },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    marginTop: 6,
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    display: 'block',
    width: '100%',
    height: 40,
    background: 'var(--surface-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  },
  accountTypeGrid: {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: '1fr 1fr',
    marginBottom: 6,
  },
  accountCard: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    background: 'var(--surface-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast), background var(--transition-fast)',
  },
  accountCardActive: {
    borderColor: 'var(--action-primary)',
    background: 'rgba(212, 169, 52, 0.08)',
  },
  accountCardLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  accountCardSub: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2,
    lineHeight: 1.35,
  },
  radio: {
    margin: '2px 0 0 0',
    accentColor: 'var(--action-primary)',
  },
  notice: {
    marginTop: 14,
    padding: '10px 12px',
    background: 'rgba(212, 169, 52, 0.06)',
    border: '1px solid rgba(212, 169, 52, 0.20)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-tertiary)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  consentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
    cursor: 'pointer',
  },
  consentCheck: {
    marginTop: 3,
    accentColor: 'var(--action-primary)',
    flexShrink: 0,
  },
  consentText: {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    lineHeight: 1.55,
  },
  consentLink: {
    color: 'var(--text-warning)',
    textDecoration: 'none',
  },
  error: {
    marginTop: 16,
    padding: '10px 12px',
    background: 'rgba(212, 86, 86, 0.08)',
    border: '1px solid rgba(212, 86, 86, 0.30)',
    borderLeft: '3px solid var(--text-danger)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-danger)',
    fontSize: 12,
  },
  btn: {
    width: '100%',
    height: 40,
    marginTop: 22,
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.01em',
    cursor: 'pointer',
  },
  footer: {
    marginTop: 22,
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--action-primary)',
    fontWeight: 600,
  },
};
