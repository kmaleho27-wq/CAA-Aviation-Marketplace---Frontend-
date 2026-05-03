import { useApi } from '../../lib/useApi';
import { getWallet } from '../../api/contractor';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const STATUS_TONE = {
  verified: { bg: 'rgba(58, 138, 110, 0.12)', color: 'var(--color-sage-500)', border: 'rgba(58, 138, 110, 0.25)', label: '✓ Verified' },
  expiring: { bg: 'rgba(212, 169, 52, 0.12)', color: 'var(--text-warning)',  border: 'rgba(212, 169, 52, 0.25)', label: '⚠ Expiring' },
};

const TONE_COLOR = {
  success: 'var(--color-sage-500)',
  warning: 'var(--text-warning)',
};

export default function Wallet() {
  const query = useApi(getWallet, []);

  if (query.loading && !query.data) return <div style={styles.scroll}><LoadingBlock label="Loading wallet…" /></div>;
  if (query.error) return <div style={styles.scroll}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;

  const { user, docs, earnings } = query.data;

  return (
    <div style={styles.scroll}>
      <div style={styles.hero}>
        <div style={styles.heroOrb} />
        <div style={styles.overline}>Digital Crew Wallet</div>
        <div style={styles.heroName}>{user.name}</div>
        <div style={styles.heroSub}>{user.role} · {user.rating}</div>
        <div style={styles.verifiedPill}>
          <span style={styles.verifiedDot} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-sage-500)' }}>SACAA Verified</span>
        </div>
        <div style={styles.heroLicense}>{user.license} · Active &amp; Current</div>
      </div>

      <div style={styles.sectionLabel}>Licences &amp; Certificates</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {docs.map((d) => {
          const tone = STATUS_TONE[d.status];
          return (
            <div key={d.ref} style={styles.docCard}>
              <div style={{ minWidth: 0 }}>
                <div style={styles.docName}>{d.name}</div>
                <div style={styles.docRef}>{d.ref}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...styles.statusBadge, background: tone.bg, color: tone.color, borderColor: tone.border }}>{tone.label}</div>
                <div style={styles.expiry}>{d.expires}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...styles.sectionLabel, margin: '14px 0 8px' }}>Earnings — November</div>
      <div style={styles.earningsGrid}>
        {earnings.map((e) => (
          <div key={e.label} style={styles.earningsCard}>
            <div style={styles.earningsLabel}>{e.label}</div>
            <div style={{ ...styles.earningsValue, color: TONE_COLOR[e.tone] }}>{e.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  scroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px' },
  hero: {
    background: 'linear-gradient(135deg, #243861 0%, #1B2C5E 100%)',
    border: '1px solid var(--border-default)',
    borderRadius: 16,
    padding: '20px 18px',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(212, 169, 52, 0.08)',
  },
  overline: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 12,
  },
  heroName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    color: 'var(--text-primary)',
    marginBottom: 2,
    letterSpacing: '0.01em',
  },
  heroSub: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 },
  verifiedPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(58, 138, 110, 0.20)',
    border: '1px solid rgba(58, 138, 110, 0.35)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 12px',
  },
  verifiedDot: { width: 6, height: 6, borderRadius: '50%', background: 'var(--color-sage-500)' },
  heroLicense: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-tertiary)',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 8,
  },
  docCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '11px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  docName: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 },
  docRef: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-mustard-500)' },
  statusBadge: {
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 3,
    border: '1px solid transparent',
    display: 'inline-block',
  },
  expiry: { fontSize: 9, color: 'var(--text-tertiary)' },
  earningsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  earningsCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    padding: '12px 14px',
  },
  earningsLabel: { fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 },
  earningsValue: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400, letterSpacing: '0.01em' },
};
