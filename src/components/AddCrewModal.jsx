import { useState } from 'react';

// Operator-side form for adding a crew member to "their" team without
// asking each member to self-register (P2 #6). The shape mirrors what
// the contractor self-signup form collects (Register.jsx) so admins
// see a consistent pending-personnel queue.

const DISCIPLINES = [
  { key: 'flight_crew',     label: 'Pilot — Part 61',          sacaaPart: 61, subtypes: ['PPL','CPL','ATPL'], aircraft: 'aeroplane',  medical: 'class_1' },
  { key: 'national_pilot',  label: 'National Pilot — Part 62', sacaaPart: 62, subtypes: ['NPL'],              aircraft: 'microlight', medical: 'class_4' },
  { key: 'flight_engineer', label: 'Flight Engineer — Part 63',sacaaPart: 63, subtypes: ['FE'],               aircraft: 'aeroplane',  medical: 'class_1' },
  { key: 'cabin_crew',      label: 'Cabin Crew — Part 64',     sacaaPart: 64, subtypes: ['CCM'],              aircraft: 'aeroplane',  medical: 'class_2' },
  { key: 'atc',             label: 'ATC — Part 65',            sacaaPart: 65, subtypes: ['ATC-APP','ATC-ENR','ATC-AD','ASST'], aircraft: 'none', medical: 'class_2' },
  { key: 'ame',             label: 'AME — Part 66',            sacaaPart: 66, subtypes: ['Cat A','B1','B2','C'], aircraft: 'aeroplane', medical: 'none' },
  { key: 'aviation_medical',label: 'DAME — Part 67',           sacaaPart: 67, subtypes: ['DAME'],             aircraft: 'none',       medical: 'none' },
  { key: 'glider_pilot',    label: 'Glider — Part 68',         sacaaPart: 68, subtypes: [],                   aircraft: 'glider',     medical: 'class_4' },
  { key: 'balloon_pilot',   label: 'Balloon — Part 69',        sacaaPart: 69, subtypes: [],                   aircraft: 'balloon',    medical: 'class_4' },
  { key: 'rpas_pilot',      label: 'RPAS — Part 71',           sacaaPart: 71, subtypes: ['RPL'],              aircraft: 'rpas',       medical: 'class_4' },
  { key: 'non_licensed',    label: 'Ground Operations',        sacaaPart: null, subtypes: [],                 aircraft: 'none',       medical: 'none' },
];

const NON_LICENSED_ROLES = [
  { key: 'aviation_firefighter', label: 'Aviation Firefighter (RFF)' },
  { key: 'marshaller',           label: 'Aircraft Marshaller / Ramp Coordinator' },
  { key: 'refueler',             label: 'Aircraft Refueler' },
  { key: 'security',             label: 'Aviation Security' },
  { key: 'baggage_handler',      label: 'Baggage Handler' },
  { key: 'ground_handler',       label: 'Ground Handling Agent' },
  { key: 'other',                label: 'Other' },
];

export default function AddCrewModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState('flight_crew');
  const [licence, setLicence] = useState('');
  const [licenceSubtype, setLicenceSubtype] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');
  const [nonLicensedRole, setNonLicensedRole] = useState('aviation_firefighter');
  const [submitting, setSubmitting] = useState(false);

  const disc = DISCIPLINES.find((d) => d.key === discipline);
  const isNonLicensed = discipline === 'non_licensed';

  const handle = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        discipline,
        sacaaPart: disc.sacaaPart,
        licenceSubtype: isNonLicensed ? null : (licenceSubtype || null),
        license: isNonLicensed ? null : (licence || null),
        location: location || null,
        aircraftCategory: disc.aircraft,
        medicalClass: disc.medical,
        nonLicensedRole: isNonLicensed ? nonLicensedRole : null,
        rate: rate || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <div>
            <div style={styles.overline}>Add to your team</div>
            <h2 style={styles.h2}>New crew member</h2>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">×</button>
        </div>
        <form onSubmit={handle} style={styles.body}>
          <label style={styles.label}>Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sipho Dlamini"
            style={styles.input}
            required
          />

          <label style={styles.label}>Discipline</label>
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={styles.input}>
            {DISCIPLINES.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>

          <label style={styles.label}>Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Johannesburg"
            style={styles.input}
          />

          {isNonLicensed ? (
            <>
              <label style={styles.label}>Role</label>
              <select value={nonLicensedRole} onChange={(e) => setNonLicensedRole(e.target.value)} style={styles.input}>
                {NON_LICENSED_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label style={styles.label}>SACAA licence number</label>
              <input
                value={licence}
                onChange={(e) => setLicence(e.target.value)}
                placeholder="e.g. SA-0142-B1"
                style={styles.input}
              />

              {disc?.subtypes?.length > 0 && (
                <>
                  <label style={styles.label}>Subtype</label>
                  <select value={licenceSubtype} onChange={(e) => setLicenceSubtype(e.target.value)} style={styles.input}>
                    <option value="">— Select —</option>
                    {disc.subtypes.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}

          <label style={styles.label}>Day rate (optional)</label>
          <input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="ZAR 4,200/day"
            style={styles.input}
          />

          <div style={styles.notice}>
            This crew member will land in the admin verification queue and won't be
            bookable until SACAA verification clears. They can claim their own login later.
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancel}>Cancel</button>
            <button type="submit" disabled={submitting || !name.trim()} style={styles.submit}>
              {submitting ? 'Adding…' : 'Add crew member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflow: 'auto',
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px 12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  overline: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  h2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    margin: 0,
  },
  close: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-tertiary)',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },
  body: { padding: '14px 24px 22px' },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    display: 'block',
    width: '100%',
    height: 38,
    background: 'var(--surface-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0 12px',
    fontSize: 13,
    outline: 'none',
  },
  notice: {
    marginTop: 14,
    padding: '10px 12px',
    background: 'rgba(212, 169, 52, 0.06)',
    border: '1px solid rgba(212, 169, 52, 0.20)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-tertiary)',
    fontSize: 11,
    lineHeight: 1.5,
  },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 },
  cancel: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  submit: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
