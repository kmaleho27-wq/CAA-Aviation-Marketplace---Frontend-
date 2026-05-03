import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { listJobs, acceptJob } from '../../api/contractor';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const COMPLIANCE = [
  'Your Part 66 Cat B1 matches requirement',
  'B737 Type Rating current',
  'Medical Certificate valid',
  'SACAA verification active',
];

function JobCard({ job, onOpen }) {
  const isAog = job.urgency === 'aog';
  return (
    <button onClick={() => onOpen(job)} style={{ ...styles.card, borderColor: isAog ? 'rgba(184, 74, 26, 0.40)' : 'var(--border-subtle)' }}>
      {isAog && <div style={styles.cardStripe} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        {isAog ? (
          <span style={styles.aogPill}>⚡ AOG PRIORITY</span>
        ) : (
          <span style={styles.standardPill}>Standard</span>
        )}
        <span style={styles.matchPill}>{job.match} match</span>
      </div>
      <div style={styles.cardTitle}>{job.title}</div>
      <div style={styles.cardAirline}>{job.airline}</div>
      <div style={styles.metaRow}>
        <span>📍 {job.location}</span>
        <span>⏱ {job.duration}</span>
      </div>
      <div style={styles.cardFooter}>
        <div style={styles.cardRate}>{job.rate}</div>
        <div style={styles.viewBtn}>View Job →</div>
      </div>
    </button>
  );
}

function JobDetail({ job, onBack }) {
  const [accepted, setAccepted] = useState(job.accepted || false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleAccept = async () => {
    if (accepted || submitting) return;
    setSubmitting(true);
    try {
      await acceptJob(job.id);
      setAccepted(true);
      toast.success(`Contract ${job.id} accepted — operator notified`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept contract.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.scroll}>
      <button onClick={onBack} style={styles.backBtn}>← Back to Jobs</button>

      {job.urgency === 'aog' && (
        <div style={styles.aogBanner}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div style={styles.aogText}>AOG Priority — Aircraft grounded. Immediate response required.</div>
        </div>
      )}

      <div style={styles.detailTitle}>{job.title}</div>
      <div style={styles.detailSub}>{job.airline} · {job.location}</div>

      <div style={styles.detailGrid}>
        {[
          ['Duration', job.duration, false],
          ['Daily Rate', job.rate, false],
          ['Required Rating', job.rating, false],
          ['Job Ref', job.id, true],
        ].map(([k, v, mono]) => (
          <div key={k} style={styles.detailCard}>
            <div style={styles.detailKey}>{k}</div>
            <div style={{ ...styles.detailVal, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={styles.sectionLabel}>Compliance Pre-Check</div>
      {COMPLIANCE.map((label) => (
        <div key={label} style={styles.checkRow}>
          <div style={styles.checkPill}>✓</div>
          <div style={styles.checkLabel}>{label}</div>
        </div>
      ))}

      <button
        onClick={handleAccept}
        disabled={accepted || submitting}
        style={{
          ...styles.acceptBtn,
          background: accepted ? 'var(--color-sage-500)' : 'var(--action-primary)',
        }}
      >
        {accepted ? '✓ Contract Accepted — Awaiting Confirmation' : submitting ? 'Accepting…' : 'Accept Contract'}
      </button>
    </div>
  );
}

export default function Jobs() {
  const [activeJob, setActiveJob] = useState(null);
  const query = useApi(listJobs, []);

  if (activeJob) return <JobDetail job={activeJob} onBack={() => setActiveJob(null)} />;

  if (query.loading && !query.data) return <div style={styles.scroll}><LoadingBlock label="Matching jobs…" minHeight={140} /></div>;
  if (query.error) return <div style={styles.scroll}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;

  const jobs = query.data;

  return (
    <div style={styles.scroll}>
      <div style={styles.header}>
        <div>
          <div style={styles.smartLabel}>Smart Match</div>
          <div style={styles.headerTitle}>Available Jobs</div>
        </div>
        <div style={styles.matchedPill}>{jobs.length} matched</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {jobs.map((job) => <JobCard key={job.id} job={job} onOpen={setActiveJob} />)}
      </div>
    </div>
  );
}

const styles = {
  scroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 8px', animation: 'toastIn 0.2s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  smartLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 2,
  },
  headerTitle: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--text-primary)' },
  matchedPill: {
    background: 'rgba(212, 169, 52, 0.15)',
    border: '1px solid rgba(212, 169, 52, 0.30)',
    borderRadius: 'var(--radius-pill)',
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-warning)',
  },
  card: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: 14,
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    textAlign: 'left',
    color: 'inherit',
    fontFamily: 'inherit',
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    background: 'var(--text-aog)',
    borderRadius: '12px 0 0 12px',
  },
  aogPill: {
    background: 'rgba(184, 74, 26, 0.18)',
    color: 'var(--text-aog)',
    border: '1px solid rgba(184, 74, 26, 0.30)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  standardPill: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 9,
  },
  matchPill: {
    background: 'rgba(58, 138, 110, 0.15)',
    color: 'var(--color-sage-500)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
    fontSize: 9,
    fontWeight: 600,
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.3 },
  cardAirline: { fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 },
  metaRow: { display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-tertiary)' },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid var(--border-subtle)',
  },
  cardRate: { fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-primary)' },
  viewBtn: {
    background: 'var(--action-primary)',
    color: 'var(--action-primary-text)',
    borderRadius: 'var(--radius-md)',
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 700,
  },

  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-warning)',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  aogBanner: {
    background: 'rgba(184, 74, 26, 0.12)',
    border: '1px solid rgba(184, 74, 26, 0.30)',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 14,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  aogText: { fontSize: 11, fontWeight: 700, color: 'var(--text-aog)' },
  detailTitle: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 },
  detailSub: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 14,
  },
  detailCard: {
    background: '#1B2C5E',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    padding: '10px 12px',
  },
  detailKey: { fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 },
  detailVal: { fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    marginBottom: 8,
  },
  checkRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  checkPill: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'rgba(58, 138, 110, 0.15)',
    border: '1px solid rgba(58, 138, 110, 0.30)',
    color: 'var(--color-sage-500)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    flexShrink: 0,
  },
  checkLabel: { fontSize: 12, color: 'var(--text-secondary)' },
  acceptBtn: {
    width: '100%',
    color: 'var(--action-primary-text)',
    border: 'none',
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 16,
    transition: 'background 0.2s',
  },
};
