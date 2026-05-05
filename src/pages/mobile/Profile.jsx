import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { getWallet } from '../../api/contractor';
import {
  uploadPersonnelDoc,
  listMyPersonnelDocs,
  getPersonnelDocUrl,
} from '../../api/documents';
import { downloadMyDataExport, requestAccountDeletion } from '../../api/popi';
import AdditionalCredentials from '../../components/AdditionalCredentials';
import { supabase } from '../../lib/supabase';
import { getDocRequirements } from '../../data/document-requirements';
import { PROFILE_STATS, SETTINGS_ROWS } from '../../data/mobile';
import { useToast } from '../../lib/toast';
import { logout, getUser } from '../../lib/auth';

const TONE_COLOR = {
  warning: 'var(--text-warning)',
  success: 'var(--color-sage-500)',
  primary: 'var(--text-primary)',
};

function initialsOf(name) {
  if (!name) return '—';
  return name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

// ── Compliance Documents (P1 #5) ─────────────────────────────────
// Lets a self-registered aviation pro upload the docs admin needs to
// verify them. Requirements come from src/data/document-requirements.js
// keyed on personnel.discipline.
function ComplianceDocs() {
  const [personnel, setPersonnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [busyLabel, setBusyLabel] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;
        const { data: ppl } = await supabase
          .from('personnel')
          .select('id, discipline, status')
          .eq('user_id', auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        setPersonnel(ppl);
        if (ppl?.id) {
          const list = await listMyPersonnelDocs();
          if (!cancelled) setDocs(list);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  // Operators / suppliers / admins don't have a personnel row — section
  // collapses entirely for them rather than showing an empty checklist.
  if (!personnel) return null;

  const requirements = getDocRequirements(personnel.discipline);
  if (requirements.length === 0) return null;

  // Match an uploaded doc against a requirement by `name === label` —
  // we set name to the requirement label when uploading.
  const docByLabel = Object.fromEntries(docs.map((d) => [d.name, d]));

  const onPick = async (req) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/png,image/jpeg,image/heic,image/webp';
    // On mobile, prefer the rear camera for snapping a licence card.
    // Browsers ignore this attribute on desktop, so it's safe to always set.
    input.setAttribute('capture', 'environment');
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBusyLabel(req.label);
      try {
        const row = await uploadPersonnelDoc({
          file,
          type: req.type,
          label: req.label,
          personnelId: personnel.id,
        });
        setDocs((prev) => [row, ...prev.filter((d) => d.name !== req.label)]);
        toast.success(`Uploaded — ${req.label}`);
      } catch (err) {
        toast.error(err.message || 'Upload failed.');
      } finally {
        setBusyLabel(null);
      }
    };
    input.click();
  };

  const onView = async (id) => {
    try {
      const result = await getPersonnelDocUrl(id, { expiresIn: 60 });
      if (result?.url) window.open(result.url, '_blank', 'noopener');
    } catch (err) {
      toast.error('Could not open file.');
    }
  };

  return (
    <div style={complianceStyles.wrap}>
      <div style={complianceStyles.header}>
        <div style={complianceStyles.title}>Compliance documents</div>
        <span style={{
          ...complianceStyles.statusPill,
          ...(personnel.status === 'pending'  ? complianceStyles.statusPending  : {}),
          ...(personnel.status === 'verified' ? complianceStyles.statusVerified : {}),
          ...(personnel.status === 'expired'  ? complianceStyles.statusExpired  : {}),
        }}>
          {personnel.status === 'verified' ? '✓ Verified'
            : personnel.status === 'pending' ? 'Awaiting review'
            : personnel.status === 'expired' ? 'Action needed'
            : personnel.status}
        </span>
      </div>
      <div style={complianceStyles.sub}>
        Upload these so the SACAA verification team can approve your account.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {requirements.map((req) => {
          const uploaded = docByLabel[req.label];
          const isBusy = busyLabel === req.label;
          return (
            <div key={req.label} style={complianceStyles.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={complianceStyles.rowLabel}>{req.label}</div>
                <div style={complianceStyles.rowHint}>{req.hint}</div>
              </div>
              {uploaded ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onView(uploaded.id)} style={complianceStyles.viewBtn}>View</button>
                  <button
                    onClick={() => onPick(req)}
                    style={complianceStyles.replaceBtn}
                    disabled={isBusy}
                  >
                    {isBusy ? '…' : 'Replace'}
                  </button>
                </div>
              ) : (
                <button onClick={() => onPick(req)} disabled={isBusy} style={complianceStyles.uploadBtn}>
                  {isBusy ? 'Uploading…' : 'Upload'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const complianceStyles = {
  wrap: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 12,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  sub: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 },
  statusPill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },
  statusPending:  { background: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',     borderColor: 'rgba(212, 169, 52, 0.25)' },
  statusVerified: { background: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)',   borderColor: 'rgba(58, 138, 110, 0.30)' },
  statusExpired:  { background: 'rgba(212, 86, 86, 0.10)',  color: 'var(--text-danger)',      borderColor: 'rgba(212, 86, 86, 0.25)' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
  },
  rowLabel: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  rowHint: { fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1, lineHeight: 1.35 },
  uploadBtn: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  viewBtn: {
    background: 'transparent',
    color: 'var(--text-warning)',
    border: '1px solid rgba(212, 169, 52, 0.30)',
    borderRadius: 'var(--radius-md)',
    padding: '5px 10px',
    fontSize: 11,
    cursor: 'pointer',
    flexShrink: 0,
  },
  replaceBtn: {
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '5px 10px',
    fontSize: 11,
    cursor: 'pointer',
    flexShrink: 0,
  },
};

export default function Profile() {
  const [available, setAvailable] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  // Real user (from Supabase auth) — falls back to a sane default if the
  // contractor hasn't been linked to a personnel row yet.
  const authUser = getUser();
  const wallet = useApi(getWallet, []);
  const profile = wallet.data?.user;

  const displayName = profile?.name || authUser?.name || 'Contractor';
  const displayRole = profile?.role || authUser?.role || 'AME';
  const displayLicense = profile?.license || '—';

  const onToggle = () => {
    setAvailable((prev) => {
      const next = !prev;
      toast.success(next ? 'Visible to AI matching engine' : 'Availability paused');
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
      '• Crew records retained 90 days for transaction traceability, then hard-purged.\n' +
      '• You will be signed out and can no longer log in with this email.\n\n' +
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
    <div style={styles.scroll}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={styles.avatar}>{initialsOf(displayName)}</div>
        <div style={styles.name}>{displayName}</div>
        <div style={styles.role}>{displayRole}{displayLicense !== '—' && ` · ${displayLicense}`}</div>
        <div style={styles.badge}>
          <span style={styles.badgeDot} />
          <span style={styles.badgeText}>SACAA Compliance Badge</span>
        </div>
      </div>

      <div style={styles.toggleCard}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.toggleLabel}>Available for Contracts</div>
          <div style={styles.toggleSub}>Visible to AI matching engine</div>
        </div>
        <button
          onClick={onToggle}
          aria-pressed={available}
          aria-label="Toggle availability"
          style={{
            ...styles.toggle,
            background: available ? 'var(--action-primary)' : '#243861',
            borderColor: available ? 'var(--action-primary)' : 'var(--border-subtle)',
          }}
        >
          <div style={{ ...styles.toggleKnob, left: available ? 22 : 3 }} />
        </button>
      </div>

      <div style={styles.statsGrid}>
        {PROFILE_STATS.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={{ ...styles.statValue, color: TONE_COLOR[s.tone] }}>{s.value}</div>
          </div>
        ))}
      </div>

      <AdditionalCredentials />

      <ComplianceDocs />

      {SETTINGS_ROWS.map((r) => (
        <button key={r.label} style={styles.settingRow} type="button">
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={styles.settingLabel}>{r.label}</div>
            <div style={styles.settingSub}>{r.sub}</div>
          </div>
          <span style={styles.chevron}>›</span>
        </button>
      ))}

      <button onClick={handleLogout} style={styles.signOut}>Sign out</button>

      {/* POPI Act §23 + §24 — right-to-export + right-to-delete. */}
      <div style={styles.popiBox}>
        <div style={styles.popiTitle}>Privacy &amp; data (POPI Act)</div>
        <button onClick={handleExportData} style={styles.popiBtn}>
          ⬇ Download my data
        </button>
        <button onClick={handleDeleteAccount} style={{ ...styles.popiBtn, color: 'var(--text-danger)', borderColor: 'rgba(212, 86, 86, 0.30)' }}>
          ✕ Delete my account
        </button>
        <div style={styles.popiSub}>
          Crew records are retained 90 days after deletion for transaction
          traceability, then hard-purged.
        </div>
      </div>
    </div>
  );
}

const styles = {
  scroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#243861',
    border: '2px solid rgba(212, 169, 52, 0.40)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    margin: '0 auto 10px',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  role: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(58, 138, 110, 0.15)',
    border: '1px solid rgba(58, 138, 110, 0.30)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 14px',
  },
  badgeDot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--color-sage-500)' },
  badgeText: { fontSize: 11, fontWeight: 600, color: 'var(--color-sage-500)' },
  toggleCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 12,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  toggleSub: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 'var(--radius-pill)',
    border: '1px solid transparent',
    cursor: 'pointer',
    position: 'relative',
    padding: 0,
    transition: 'background 0.2s, border-color 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--surface-base)',
    position: 'absolute',
    top: 2,
    transition: 'left 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '10px 12px',
  },
  statLabel: { fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 3 },
  statValue: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, letterSpacing: '0.01em' },
  settingRow: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    width: '100%',
    color: 'inherit',
    fontFamily: 'inherit',
    transition: 'background var(--transition-fast)',
  },
  settingLabel: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  settingSub: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  chevron: { color: 'var(--text-tertiary)', fontSize: 16 },
  signOut: {
    width: '100%',
    background: 'transparent',
    border: '1px solid rgba(212, 86, 86, 0.30)',
    color: 'var(--text-danger)',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 14,
  },
  popiBox: {
    marginTop: 16,
    padding: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
  },
  popiTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 10,
  },
  popiBtn: {
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 6,
  },
  popiSub: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
    marginTop: 6,
  },
};
