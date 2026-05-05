import { useEffect, useState } from 'react';
import { listMyCredentials, addCredential, deleteCredential } from '../api/credentials';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';

// Additional-credentials section on /m/profile. Lets a user with
// multiple SACAA licences (e.g. an ATPL who's also a Cat B1 engineer
// and a DAME) add each one with its own metadata. The primary
// credential stays on personnel.discipline; secondary ones live in
// personnel_credential.

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

const STATUS_TONE = {
  verified: { color: 'var(--color-sage-500)', label: '✓ Verified' },
  expiring: { color: 'var(--text-warning)',   label: '⚠ Expiring' },
  expired:  { color: 'var(--text-danger)',    label: '✕ Expired' },
  pending:  { color: 'var(--text-warning)',   label: 'Pending' },
};

export default function AdditionalCredentials() {
  const [primaryDiscipline, setPrimaryDiscipline] = useState(null);
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discipline, setDiscipline] = useState('ame');
  const [licence, setLicence] = useState('');
  const [licenceSubtype, setLicenceSubtype] = useState('');
  const toast = useToast();

  const reload = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data: ppl } = await supabase
        .from('personnel')
        .select('discipline')
        .eq('user_id', u.user.id)
        .maybeSingle();
      setPrimaryDiscipline(ppl?.discipline ?? null);

      const list = await listMyCredentials();
      setCreds(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  // Filter the picker so users can't add their primary discipline
  // again (the RPC also enforces this — UI is a courtesy).
  const availableDisciplines = DISCIPLINES.filter(
    (d) => d.key !== primaryDiscipline && !creds.some((c) => c.discipline === d.key),
  );
  const disc = DISCIPLINES.find((d) => d.key === discipline);
  const isNonLicensed = discipline === 'non_licensed';

  const onAdd = async () => {
    if (submitting) return;
    if (!isNonLicensed && !licence.trim()) {
      toast.error('Licence number required for licensed disciplines.');
      return;
    }
    setSubmitting(true);
    try {
      await addCredential({
        discipline,
        sacaaPart: disc.sacaaPart,
        licenceSubtype: isNonLicensed ? null : (licenceSubtype || null),
        license: isNonLicensed ? null : licence,
        aircraftCategory: disc.aircraft,
        medicalClass: disc.medical,
      });
      toast.success(`${disc.label} added — pending admin verification`);
      setAdding(false);
      setLicence('');
      setLicenceSubtype('');
      // Reset to first remaining available discipline
      const next = availableDisciplines.find((d) => d.key !== discipline);
      if (next) setDiscipline(next.key);
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not add credential.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id, label) => {
    if (!window.confirm(`Remove your ${label} credential?\n\nThis can't be undone — but you can re-add it later.`)) return;
    try {
      await deleteCredential(id);
      toast.warning('Credential removed.');
      await reload();
    } catch (err) {
      toast.error(err.message || 'Could not remove.');
    }
  };

  if (loading) return null;
  // Hide entirely for users with no personnel row (operators, suppliers, admins)
  if (!primaryDiscipline) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.title}>Additional credentials</div>
        {!adding && availableDisciplines.length > 0 && (
          <button onClick={() => setAdding(true)} style={styles.addBtn}>
            + Add credential
          </button>
        )}
      </div>
      <div style={styles.sub}>
        Hold multiple SACAA licences? Add each one — pilot + engineer + DAME are
        separate credentials with their own expiry and medical class.
      </div>

      {creds.length === 0 && !adding ? (
        <div style={styles.empty}>
          No additional credentials yet. Your primary discipline shows above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {creds.map((c) => {
            const d = DISCIPLINES.find((x) => x.key === c.discipline);
            const tone = STATUS_TONE[c.status] || STATUS_TONE.pending;
            return (
              <div key={c.id} style={styles.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowLabel}>{d?.label ?? c.discipline}</div>
                  <div style={styles.rowMeta}>
                    {c.license ? <span style={styles.licenseChip}>{c.license}</span> : null}
                    {c.licenceSubtype ? <> · {c.licenceSubtype}</> : null}
                    {c.medicalClass && c.medicalClass !== 'none' ? <> · {c.medicalClass.replace('_', ' ')}</> : null}
                  </div>
                </div>
                <span style={{ ...styles.statusPill, color: tone.color, borderColor: tone.color }}>
                  {tone.label}
                </span>
                <button onClick={() => onDelete(c.id, d?.label ?? c.discipline)} style={styles.removeBtn} title="Remove">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div style={styles.addBox}>
          <div style={styles.cardLabel}>Add a credential</div>

          <label style={styles.label}>Discipline</label>
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} style={styles.input}>
            {availableDisciplines.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>

          {!isNonLicensed && (
            <>
              <label style={styles.label}>SACAA licence number</label>
              <input
                type="text"
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
                    {disc.subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}
            </>
          )}

          <div style={styles.actions}>
            <button onClick={() => setAdding(false)} style={styles.cancelBtn}>Cancel</button>
            <button onClick={onAdd} disabled={submitting} style={{ ...styles.submitBtn, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { background: '#1B2C5E', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  sub: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 },
  addBtn: {
    background: 'var(--action-primary)', color: 'var(--action-primary-text)',
    border: 'none', borderRadius: 'var(--radius-md)',
    padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  },
  empty: { fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: 10 },
  row: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
  },
  rowLabel: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  rowMeta: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  licenseChip: { fontFamily: 'var(--font-mono)', color: 'var(--text-warning)' },
  statusPill: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid', whiteSpace: 'nowrap' },
  removeBtn: {
    background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
    cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 'var(--radius-sm)',
  },
  addBox: {
    marginTop: 12, padding: 12,
    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
    borderRadius: 8,
  },
  cardLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 8 },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 8 },
  input: { display: 'block', width: '100%', height: 34, background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  actions: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)', padding: '5px 10px', fontSize: 11, cursor: 'pointer' },
  submitBtn: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
};
