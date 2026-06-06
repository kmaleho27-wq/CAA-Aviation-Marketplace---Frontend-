import { useApi } from '../lib/useApi';
import { listMyOrders } from '../api/supplierOrders';
import { formatPriceCents } from '../api/partRequests';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/orders — supplier view of broker POs.
//
// What the supplier sees here:
//   - Broker name (the person who placed the order — their counterparty)
//   - Their part being ordered
//   - Quantity + required condition
//   - The price they will be paid (their listed base, not the retail)
//   - When the order was accepted
//
// What they DO NOT see:
//   - Buyer identity (broker's middleman moat protected)
//   - Retail price (broker's markup protected)
//   - Other quotes / matches on the same request
//
// This is the third leg of the confidentiality triangle. Buyer talks
// only to broker; supplier talks only to broker. Broker is the only
// party with full visibility.

function OrderCard({ o }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.partName}>
            {o.partName}
            {o.partPn && <span style={styles.partPn}> · <code>{o.partPn}</code></span>}
          </div>
          <div style={styles.broker}>
            Order from <strong>{o.brokerName}</strong>
          </div>
        </div>
        <span style={styles.acceptedPill}>✓ Accepted</span>
      </div>

      <div style={styles.metaGrid}>
        <div>
          <div style={styles.metaLabel}>Quantity</div>
          <div style={styles.metaValue}>{o.quantity}</div>
        </div>
        <div>
          <div style={styles.metaLabel}>Required condition</div>
          <div style={styles.metaValue}>{o.requiredCondition} or better</div>
        </div>
        <div>
          <div style={styles.metaLabel}>You will receive</div>
          <div style={{ ...styles.metaValue, color: 'var(--color-sage-500)', fontWeight: 700 }}>
            {formatPriceCents(o.agreedPriceCents)}
          </div>
        </div>
        <div>
          <div style={styles.metaLabel}>Accepted</div>
          <div style={styles.metaValue}>
            {o.acceptedAt
              ? new Date(o.acceptedAt).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : '—'}
          </div>
        </div>
      </div>

      <div style={styles.footerNote}>
        Ship to broker's nominated address. Naluka releases payment on confirmed delivery.
      </div>
    </div>
  );
}

export default function SupplierOrders() {
  const query = useApi(listMyOrders, []);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading your orders…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  const orders = query.data ?? [];
  const total = orders.length;
  const totalCents = orders.reduce((sum, o) => sum + Number(o.agreedPriceCents || 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Supplier · Incoming orders</div>
          <h1 style={styles.h1}>Broker purchase orders</h1>
          <div style={styles.sub}>
            Orders placed by brokers for parts you've listed on Naluka. Ship to the
            broker; Naluka releases payment on confirmed delivery. You never need
            to see or contact the end buyer.
          </div>
        </div>
      </div>

      {/* Headline numbers */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Open orders</div>
          <div style={styles.statVal}>{total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total to receive</div>
          <div style={{ ...styles.statVal, color: 'var(--color-sage-500)' }}>
            {formatPriceCents(totalCents)}
          </div>
        </div>
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No broker orders yet</div>
          <div style={styles.emptySub}>
            When a broker has a buyer that accepts a quote for one of your listed
            parts, the order appears here. You ship to the broker; Naluka handles
            payment release on confirmed delivery.
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {orders.map((o) => <OrderCard key={o.matchId} o={o} />)}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1000 },
  header: { marginBottom: 22 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 8 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 700, lineHeight: 1.55 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 },
  statCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  statLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6 },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', lineHeight: 1 },

  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  partName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  partPn: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-warning)', fontWeight: 400 },
  broker: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 },
  acceptedPill: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)', border: '1px solid rgba(58, 138, 110, 0.30)', whiteSpace: 'nowrap' },

  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border-subtle)' },
  metaLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  metaValue: { fontSize: 13, color: 'var(--text-secondary)' },
  footerNote: { fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '10px 0 0', borderTop: '1px solid var(--border-subtle)' },

  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 540, margin: '0 auto', lineHeight: 1.5 },
};
