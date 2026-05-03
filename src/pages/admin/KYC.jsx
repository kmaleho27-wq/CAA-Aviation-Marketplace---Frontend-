import { useState, useEffect } from 'react';
import { useApi } from '../../lib/useApi';
import { listKyc, approveKyc, rejectKyc } from '../../api/admin';
import Badge from '../../components/admin/Badge';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const RISK_TO_BADGE = {
  low:    { label: 'Low Risk',     scheme: 'verified' },
  medium: { label: 'Medium Risk',  scheme: 'pending'  },
  high:   { label: 'High Risk',    scheme: 'rejected' },
};

export default function KYC() {
  const query = useApi(listKyc, []);
  const [apps, setApps] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (query.data) setApps(query.data);
  }, [query.data]);

  const approve = async (id) => {
    const target = apps.find((a) => a.id === id);
    setApps((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)));
    try {
      await approveKyc(id);
      if (target) toast.success(`Approved — ${target.name} (${target.license})`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
      query.refetch();
    }
  };

  const reject = async (id) => {
    const target = apps.find((a) => a.id === id);
    setApps((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)));
    try {
      await rejectKyc(id);
      if (target) toast.warning(`Rejected — ${target.name} (${target.license})`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
      query.refetch();
    }
  };

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading queue…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.overline}>Identity &amp; Compliance</div>
        <h1 style={styles.h1}>KYC Verification Queue</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {apps.map((a) => {
          const risk = RISK_TO_BADGE[a.risk];
          const isPending = a.status === 'pending';
          return (
            <div
              key={a.id}
              style={{
                ...styles.card,
                borderColor:
                  a.status === 'approved' ? 'rgba(58, 138, 110, 0.30)'
                  : a.status === 'rejected' ? 'rgba(196, 48, 48, 0.25)'
                  : 'var(--border-subtle)',
                opacity: isPending ? 1 : 0.65,
              }}
            >
              <div style={styles.cardHead}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.nameRow}>
                    <span style={styles.name}>{a.name}</span>
                    <Badge label={risk.label} scheme={risk.scheme} />
                    {a.status !== 'pending' && (
                      <Badge
                        label={a.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                        scheme={a.status === 'approved' ? 'verified' : 'rejected'}
                      />
                    )}
                  </div>
                  <div style={styles.subRow}>
                    {a.type} · <span style={styles.licenseChip}>{a.license}</span>
                  </div>
                  <div style={styles.docsRow}>
                    {a.docs.map((d) => (
                      <span key={d} style={styles.docChip}>✓ {d}</span>
                    ))}
                  </div>
                </div>
                <div style={styles.actions}>
                  <button
                    onClick={() => reject(a.id)}
                    disabled={!isPending}
                    style={{
                      ...styles.rejectBtn,
                      cursor: isPending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approve(a.id)}
                    disabled={!isPending}
                    style={{
                      ...styles.approveBtn,
                      background: isPending ? '#3A8A6E' : 'var(--surface-card)',
                      color: isPending ? '#fff' : 'var(--text-tertiary)',
                      cursor: isPending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {a.status === 'approved' ? '✓ Approved' : 'Approve'}
                  </button>
                </div>
              </div>
              <div style={styles.metaRow}>{a.id} · Submitted {a.submitted}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '26px 28px' },
  overline: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  h1: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 28,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
    lineHeight: 1,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '14px 16px',
    transition: 'opacity var(--transition-base), border-color var(--transition-base)',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  name: { fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' },
  subRow: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 },
  licenseChip: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-warning)',
  },
  docsRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  docChip: {
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 8px',
    fontSize: 10,
    color: 'var(--text-secondary)',
  },
  actions: { display: 'flex', gap: 6, flexShrink: 0 },
  rejectBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '7px 12px',
    fontSize: 11,
  },
  approveBtn: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '7px 14px',
    fontSize: 11,
    fontWeight: 700,
  },
  metaRow: {
    fontSize: 10,
    color: 'var(--text-overline)',
    marginTop: 8,
    fontFamily: 'var(--font-mono)',
  },
};
