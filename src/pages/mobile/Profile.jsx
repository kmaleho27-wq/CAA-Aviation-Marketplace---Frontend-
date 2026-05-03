import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { getWallet } from '../../api/contractor';
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
};
