import { useState, useEffect } from 'react';
import { useApi } from '../../lib/useApi';
import { listDisputes, resolveDispute } from '../../api/admin';
import Badge from '../../components/admin/Badge';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

export default function Disputes() {
  const query = useApi(listDisputes, []);
  const [resolved, setResolved] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (query.data) {
      const seed = {};
      query.data.forEach((d) => {
        if (['released', 'refunded'].includes(d.status)) seed[d.id] = d.status;
      });
      setResolved(seed);
    }
  }, [query.data]);

  const resolve = async (d, outcome) => {
    setResolved((prev) => ({ ...prev, [d.id]: outcome }));
    if (outcome === 'released') {
      toast.success(`${d.id} resolved — ${d.amount} released to ${d.seller}`);
    } else if (outcome === 'refunded') {
      toast.warning(`${d.id} refunded — ${d.amount} returned to ${d.buyer}`);
    } else {
      toast.info(`Documents requested from ${d.seller}`);
    }
    try {
      await resolveDispute(d.id, outcome);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save resolution');
      query.refetch();
    }
  };

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading disputes…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }
  const disputes = query.data;

  return (
    <div style={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.overline}>Escrow Management</div>
        <h1 style={styles.h1}>Dispute Resolution</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {disputes.map((d) => {
          const outcome = resolved[d.id];
          const isResolved = outcome === 'released' || outcome === 'refunded';
          const borderColor = isResolved
            ? outcome === 'released'
              ? 'rgba(58, 138, 110, 0.30)'
              : 'rgba(196, 48, 48, 0.30)'
            : 'rgba(184, 74, 26, 0.30)';

          return (
            <div
              key={d.id}
              style={{
                ...styles.card,
                borderColor,
                opacity: isResolved ? 0.65 : 1,
              }}
            >
              <div style={styles.head}>
                <div>
                  <div style={styles.headRow}>
                    <span style={styles.txnId}>{d.id}</span>
                    {isResolved ? (
                      <Badge
                        label={outcome === 'released' ? '✓ Released to seller' : '↩ Refunded buyer'}
                        scheme={outcome === 'released' ? 'verified' : 'rejected'}
                      />
                    ) : (
                      <Badge label={`Open ${d.days}d`} scheme="dispute" />
                    )}
                  </div>
                  <div style={styles.itemTitle}>{d.item}</div>
                </div>
                <div style={styles.amount}>{d.amount}</div>
              </div>

              <div style={styles.partiesRow}>
                <div><span style={styles.partyKey}>Buyer: </span><span style={styles.partyVal}>{d.buyer}</span></div>
                <div><span style={styles.partyKey}>Seller: </span><span style={styles.partyVal}>{d.seller}</span></div>
              </div>

              <div style={styles.reasonBox}>
                <span style={styles.reasonLabel}>Dispute reason: </span>
                {d.reason}
              </div>

              {!isResolved && (
                <div style={styles.actionRow}>
                  <button onClick={() => resolve(d, 'released')} style={styles.releaseBtn}>Release to Seller</button>
                  <button onClick={() => resolve(d, 'refunded')} style={styles.refundBtn}>Refund Buyer</button>
                  <button onClick={() => resolve(d, 'docs')} style={styles.docsBtn}>Request Documents</button>
                </div>
              )}
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
    border: '1px solid',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 18px',
    transition: 'opacity var(--transition-base), border-color var(--transition-base)',
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  headRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  txnId: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-warning)',
  },
  itemTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  amount: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
    letterSpacing: '0.01em',
  },
  partiesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 8,
    marginBottom: 12,
    fontSize: 12,
  },
  partyKey: { color: 'var(--text-overline)' },
  partyVal: { color: 'var(--text-secondary)' },
  reasonBox: {
    background: 'rgba(184, 74, 26, 0.08)',
    border: '1px solid rgba(184, 74, 26, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    marginBottom: 12,
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
  reasonLabel: { color: 'var(--text-aog)', fontWeight: 600 },
  actionRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  releaseBtn: {
    background: '#3A8A6E',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  refundBtn: {
    background: 'var(--action-aog)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  docsBtn: {
    background: 'transparent',
    border: '1px solid var(--border-default)',
    color: 'var(--text-tertiary)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: 12,
    cursor: 'pointer',
  },
};
