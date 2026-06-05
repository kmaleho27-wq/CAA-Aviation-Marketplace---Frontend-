import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import {
  listOpenRequests, listMatchesForRequest,
  updateMatchMarkup, sendBrokerQuote, formatPriceCents,
} from '../api/partRequests';
import { useToast } from '../lib/toast';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/matchmaking — broker's matching surface.
//
// One row per open buyer request. Click into a row to see the
// auto-suggested matches from inventory (computed at request-insert
// time by the trigger from migration 0033). For each match the
// broker sees: supplier name, part name, base price, an inline
// markup slider, the live "buyer will see" price. Action: "Send
// quote" which flips the match to status='quoted'.
//
// Matches the broker hasn't quoted yet still show as 'auto_suggested'
// — buyer cannot see them at all.

const URGENCY_TONE = {
  aog:      { bg: 'var(--status-aog-bg)', color: 'var(--status-aog-text)', border: 'var(--status-aog-border)', label: '⚡ AOG' },
  urgent:   { bg: 'rgba(212,169,52,0.18)', color: 'var(--text-warning)',   border: 'rgba(212,169,52,0.30)',   label: 'Urgent' },
  standard: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)', border: 'var(--border-subtle)',    label: 'Standard' },
};

const MATCH_STATUS_TONE = {
  auto_suggested:  { color: 'var(--text-tertiary)', label: 'Suggested' },
  broker_reviewed: { color: 'var(--text-warning)',  label: 'Reviewed' },
  quoted:          { color: 'var(--color-sage-500)', label: '✓ Quoted' },
  accepted:        { color: 'var(--color-sage-500)', label: '✓✓ Accepted' },
  declined:        { color: 'var(--text-danger)',   label: '✕ Declined' },
};

const COUNTRY_FLAG = {
  ZA: '🇿🇦', GB: '🇬🇧', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', AE: '🇦🇪',
  IE: '🇮🇪', CZ: '🇨🇿', RU: '🇷🇺', ID: '🇮🇩', IN: '🇮🇳', PH: '🇵🇭',
};

function MatchRow({ m, onSendQuote }) {
  const [markup, setMarkup] = useState(Number(m.markupPct));
  const [sending, setSending] = useState(false);
  const tone = MATCH_STATUS_TONE[m.status] || MATCH_STATUS_TONE.auto_suggested;
  const isQuoted = m.status === 'quoted' || m.status === 'accepted';

  // Live price calc — basePriceCents is a string from PostgREST bigint
  const baseN = Number(m.basePriceCents);
  const buyerN = Math.round(baseN * (1 + markup / 100));

  const handleSendQuote = async () => {
    setSending(true);
    try {
      await onSendQuote(m.id, markup);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.matchCard}>
      <div style={styles.matchHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.matchName}>
            {m.partName || 'Unknown part'}
            {m.partPn && <span style={styles.matchPn}> · <code>{m.partPn}</code></span>}
          </div>
          <div style={styles.matchSupplier}>
            {m.supplierCountry && COUNTRY_FLAG[m.supplierCountry] && (
              <span>{COUNTRY_FLAG[m.supplierCountry]} </span>
            )}
            <strong>{m.supplierName || '—'}</strong>
            {m.partCondition && <> · {m.partCondition}</>}
            {m.partLocation && <> · {m.partLocation}</>}
          </div>
        </div>
        <span style={{ ...styles.statusPill, color: tone.color }}>{tone.label}</span>
      </div>

      <div style={styles.priceGrid}>
        <div>
          <div style={styles.priceLabel}>You pay supplier</div>
          <div style={styles.basePrice}>{formatPriceCents(m.basePriceCents)}</div>
        </div>
        <div>
          <div style={styles.priceLabel}>Your markup</div>
          <div style={styles.sliderRow}>
            <input
              type="range"
              min={20}
              max={200}
              step={1}
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
              disabled={isQuoted}
              style={styles.slider}
            />
            <span style={styles.markupValue}>{markup}%</span>
          </div>
        </div>
        <div>
          <div style={styles.priceLabel}>Buyer sees</div>
          <div style={styles.buyerPrice}>{formatPriceCents(buyerN)}</div>
        </div>
        <div>
          <div style={styles.priceLabel}>Your cut (50% of markup)</div>
          <div style={styles.cutPrice}>{formatPriceCents(Math.round((buyerN - baseN) * 0.5))}</div>
        </div>
      </div>

      {!isQuoted && (
        <div style={styles.matchActions}>
          <button onClick={handleSendQuote} disabled={sending} style={styles.sendBtn}>
            {sending ? 'Sending…' : 'Send quote to buyer →'}
          </button>
        </div>
      )}
    </div>
  );
}

function RequestRow({ r, isExpanded, onToggle, onMatchChanged }) {
  const urgency = URGENCY_TONE[r.urgency] || URGENCY_TONE.standard;
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const reload = async () => {
    if (!isExpanded) return;
    setLoading(true);
    try {
      const data = await listMatchesForRequest(r.id);
      setMatches(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [isExpanded, r.id]);

  const handleSendQuote = async (matchId, markupPct) => {
    try {
      await sendBrokerQuote(matchId, markupPct);
      toast.success('Quote sent to buyer.');
      await reload();
      onMatchChanged();
    } catch (err) {
      toast.error(err.message || 'Could not send quote.');
    }
  };

  return (
    <>
      <tr style={styles.tr} onClick={() => onToggle(r.id)}>
        <td style={styles.td}>
          <span style={{ ...styles.urgencyChip, background: urgency.bg, color: urgency.color, borderColor: urgency.border }}>
            {urgency.label}
          </span>
        </td>
        <td style={styles.td}>
          <div style={styles.partNumber}>{r.partNumber}</div>
          <div style={styles.partDesc}>{r.description || 'No description'}</div>
        </td>
        <td style={styles.td}>{r.quantity} × {r.conditionMin}</td>
        <td style={styles.td}>
          {new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </td>
        <td style={{ ...styles.td, textAlign: 'right' }}>{isExpanded ? '▾' : '▸'}</td>
      </tr>
      {isExpanded && (
        <tr style={styles.expandRow}>
          <td colSpan={5} style={styles.expandCell}>
            {loading ? (
              <div style={styles.matchesLoading}>Loading matches…</div>
            ) : matches.length === 0 ? (
              <div style={styles.noMatches}>
                <strong>No automatic matches found.</strong> The system didn't find any
                parts in your inventory whose name or part number matches <code>{r.partNumber}</code>.
                You may need to onboard a new supplier or check fuzzy variants.
              </div>
            ) : (
              <>
                <div style={styles.matchesHead}>
                  {matches.length} match{matches.length === 1 ? '' : 'es'} auto-suggested · cheapest first
                </div>
                <div style={styles.matchesList}>
                  {matches.map((m) => (
                    <MatchRow key={m.id} m={m} onSendQuote={handleSendQuote} />
                  ))}
                </div>
              </>
            )}
            {r.notes && (
              <div style={styles.buyerNotes}>
                <strong>Buyer notes:</strong> {r.notes}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Matchmaking() {
  const query = useApi(listOpenRequests, []);
  const [expanded, setExpanded] = useState(null);

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading open requests…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  const requests = query.data ?? [];
  const aogCount = requests.filter((r) => r.urgency === 'aog').length;
  const openCount = requests.filter((r) => r.status === 'open').length;
  const quotedCount = requests.filter((r) => r.status === 'quoted').length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Broker · Matchmaking</div>
          <h1 style={styles.h1}>Open requests</h1>
          <div style={styles.sub}>
            Buyer RFQs awaiting your quote. Click into a request to see auto-suggested
            matches from your inventory, set markup, and send the quote back.
          </div>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Open</div>
          <div style={styles.statVal}>{openCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Already quoted</div>
          <div style={{ ...styles.statVal, color: 'var(--color-sage-500)' }}>{quotedCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>AOG urgency</div>
          <div style={{ ...styles.statVal, color: aogCount > 0 ? 'var(--text-aog)' : 'var(--text-primary)' }}>{aogCount}</div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No open requests</div>
          <div style={styles.emptySub}>
            When buyers submit RFQs they'll appear here. You can also create a test
            request as a buyer at <code>/app/my-requests</code>.
          </div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Urgency</th>
                <th style={styles.th}>Part requested</th>
                <th style={styles.th}>Qty / Condition</th>
                <th style={styles.th}>Submitted</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <RequestRow
                  key={r.id}
                  r={r}
                  isExpanded={expanded === r.id}
                  onToggle={(id) => setExpanded((prev) => prev === id ? null : id)}
                  onMatchChanged={query.refetch}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1200 },
  header: { marginBottom: 22 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 8 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 700, lineHeight: 1.55 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 },
  statCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  statLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 6 },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', lineHeight: 1 },

  tableWrap: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' },
  tr: { borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' },
  td: { padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', verticalAlign: 'middle' },
  partNumber: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  partDesc: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 },
  urgencyChip: { fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid', whiteSpace: 'nowrap' },

  expandRow: { borderBottom: '1px solid var(--border-subtle)' },
  expandCell: { padding: '0 14px 14px', background: 'var(--surface-raised)' },
  matchesLoading: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '14px 0' },
  noMatches: { fontSize: 12, color: 'var(--text-tertiary)', padding: '14px 0', lineHeight: 1.5 },
  matchesHead: { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', padding: '14px 0 6px' },
  matchesList: { display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 10 },
  buyerNotes: { fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '10px 0 0', borderTop: '1px solid var(--border-subtle)', marginTop: 10 },

  matchCard: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  matchHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  matchName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  matchPn: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-warning)', fontWeight: 400 },
  matchSupplier: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 },
  statusPill: { fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  priceGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 14, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' },
  priceLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  basePrice: { fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 8 },
  slider: { flex: 1, accentColor: 'var(--action-primary)' },
  markupValue: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-warning)', minWidth: 36, textAlign: 'right' },
  buyerPrice: { fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-sage-500)' },
  cutPrice: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-accent)' },
  matchActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 12 },
  sendBtn: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 },
};
