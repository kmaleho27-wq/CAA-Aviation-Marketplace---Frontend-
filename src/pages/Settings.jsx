import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { downloadMyDataExport, requestAccountDeletion } from '../api/popi';
import { updatePassword } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../components/PasswordInput';

const PREF_FIELDS = [
  { key: 'expiry_alerts',   label: 'Document expiry alerts',  hint: 'We notify you 90/30/7 days before any of your documents expire.' },
  { key: 'aog_events',      label: 'AOG broadcasts',           hint: 'Live AOG events you can respond to.' },
  { key: 'mro_updates',     label: 'MRO quote updates',        hint: 'Quote responses, escrow events, work-complete alerts.' },
  { key: 'kyc_updates',     label: 'Verification updates',     hint: 'Admin approval / rejection notifications.' },
  { key: 'support_replies', label: 'Support replies',          hint: 'When admin responds to your tickets. Recommended on.' },
];

export default function Settings() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Password change form state. Kept local — not persisted, no telemetry.
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) return;
        const { data: profile } = await supabase
          .from('profile')
          .select('notification_prefs')
          .eq('id', u.user.id)
          .maybeSingle();
        if (!cancelled) {
          setPrefs(profile?.notification_prefs || {
            expiry_alerts: true, aog_events: true, mro_updates: true,
            kyc_updates: true, support_replies: true,
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const togglePref = async (key) => {
    if (!prefs || saving) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);   // optimistic
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_notification_prefs', {
        p_prefs: { [key]: next[key] },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message || 'Could not save preference');
      setPrefs((p) => ({ ...p, [key]: !next[key] }));   // revert
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwNew.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(pwNew);
      toast.success('Password updated. You can sign in with your new password next time.');
      setPwNew('');
      setPwConfirm('');
    } catch (err) {
      setPwError(err.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      await downloadMyDataExport();
      toast.success('Your data export downloaded.');
    } catch (err) {
      toast.error(err.message || 'Could not export data.');
    }
  };

  const handleDeleteAccount = async () => {
    const ok = window.confirm(
      'Delete your Naluka account?\n\n' +
      '• Your profile is anonymised immediately.\n' +
      '• Crew and transaction records retained 90 days for traceability, then hard-purged.\n' +
      '• You will be signed out and cannot log in with this email again.\n\n' +
      'This cannot be undone. Continue?'
    );
    if (!ok) return;
    try {
      const result = await requestAccountDeletion();
      toast.warning(`Account scheduled for purge after ${result.purge_after.slice(0, 10)}.`);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Could not delete account.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.overline}>Account</div>
        <h1 style={styles.h1}>Settings</h1>
      </div>

      <section style={styles.section}>
        <div style={styles.sectionLabel}>Notification preferences</div>
        <div style={styles.sectionLead}>
          You can opt out of any of these. Critical security alerts always fire.
        </div>

        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : (
          <div style={styles.prefList}>
            {PREF_FIELDS.map((f) => {
              const enabled = prefs?.[f.key] ?? true;
              return (
                <label key={f.key} style={styles.prefRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.prefLabel}>{f.label}</div>
                    <div style={styles.prefHint}>{f.hint}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref(f.key)}
                    disabled={saving}
                    aria-pressed={enabled}
                    aria-label={`Toggle ${f.label}`}
                    style={{
                      ...styles.toggle,
                      background: enabled ? 'var(--action-primary)' : 'var(--surface-input)',
                      borderColor: enabled ? 'var(--action-primary)' : 'var(--border-default)',
                    }}
                  >
                    <span style={{ ...styles.toggleKnob, left: enabled ? 22 : 3 }} />
                  </button>
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionLabel}>Change password</div>
        <div style={styles.sectionLead}>
          Pick a new password to use next time you sign in. Use the eye icon to verify what you typed.
        </div>
        <form onSubmit={handlePasswordChange} style={{ maxWidth: 360 }}>
          <label style={styles.pwLabel}>New password</label>
          <PasswordInput
            placeholder="At least 8 characters"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            autoComplete="new-password"
          />
          <label style={{ ...styles.pwLabel, marginTop: 12 }}>Confirm new password</label>
          <PasswordInput
            placeholder="Type it again"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {pwError && <div style={styles.pwError}>{pwError}</div>}
          <button
            type="submit"
            disabled={pwSaving || !pwNew || !pwConfirm}
            style={{ ...styles.pwBtn, opacity: (pwSaving || !pwNew || !pwConfirm) ? 0.6 : 1 }}
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionLabel}>Privacy & data</div>
        <div style={styles.sectionLead}>POPI Act §23 (right to export) + §24 (right to deletion).</div>
        <div style={styles.privacyActions}>
          <button onClick={handleExportData} style={styles.btnSecondary}>
            ⬇ Download my data
          </button>
          <button onClick={handleDeleteAccount} style={styles.btnDanger}>
            ✕ Delete my account
          </button>
        </div>
        <div style={styles.fineprint}>
          Crew + transaction records are retained 90 days after deletion for
          counterparty traceability, then hard-purged. Admin can purge
          immediately on regulator request.
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionLabel}>About</div>
        <div style={styles.sectionLead}>
          Naluka platform · build {import.meta.env.MODE} · view <a href="/status" style={styles.link}>system status</a>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 720 },
  header: { marginBottom: 22 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1 },
  section: { marginBottom: 28, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 18 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6 },
  sectionLead: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14, lineHeight: 1.5 },
  prefList: { display: 'flex', flexDirection: 'column', gap: 10 },
  prefRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer' },
  prefLabel: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  prefHint: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 },
  toggle: { width: 44, height: 24, borderRadius: 'var(--radius-pill)', border: '1px solid', cursor: 'pointer', position: 'relative', padding: 0, transition: 'background 0.2s', flexShrink: 0 },
  toggleKnob: { width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, transition: 'left 0.2s' },
  privacyActions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  btnSecondary: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  btnDanger: { background: 'transparent', color: 'var(--text-danger)', border: '1px solid rgba(212, 86, 86, 0.30)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  fineprint: { fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, marginTop: 6 },
  empty: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' },
  link: { color: 'var(--text-warning)', textDecoration: 'none' },
  pwLabel: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 },
  pwError: { marginTop: 12, padding: '8px 10px', background: 'rgba(212, 86, 86, 0.08)', border: '1px solid rgba(212, 86, 86, 0.30)', borderLeft: '3px solid var(--text-danger)', borderRadius: 'var(--radius-md)', color: 'var(--text-danger)', fontSize: 12 },
  pwBtn: { marginTop: 16, height: 38, padding: '0 18px', background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
