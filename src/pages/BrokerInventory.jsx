import { useEffect, useRef, useState } from 'react';
import { useApi } from '../lib/useApi';
import {
  listBrokerInventory, updateInventoryMarkup, applyMarkupToString,
} from '../api/brokerInventory';
import { useToast } from '../lib/toast';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';

// /app/inventory — the broker's control surface.
//
// One row per part/service from suppliers the broker introduced.
// Each row carries an inline markup slider (20-200%) that the
// broker drags to set their margin. "You receive" stays at the
// supplier's net; "Buyer sees" updates live as the slider moves.
//
// Persistence is debounced: slider drag fires onChange many times,
// we save 400ms after the last move. Avoids hammering the DB while
// the broker is exploring values.

const COUNTRY_FLAG = {
  ZA: '🇿🇦', GB: '🇬🇧', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', AE: '🇦🇪',
  IE: '🇮🇪', CZ: '🇨🇿', RU: '🇷🇺', ID: '🇮🇩', IN: '🇮🇳', PH: '🇵🇭',
};

function InventoryRow({ item, onSave }) {
  // Local slider state lets the user drag without persistence on every
  // tick. Save is debounced via the parent (see Inventory below).
  const [markup, setMarkup] = useState(item.markupPct);

  // Keep local state in sync if the parent reloads (e.g. after refresh)
  useEffect(() => { setMarkup(item.markupPct); }, [item.markupPct]);

  const handle = (next) => {
    setMarkup(next);
    onSave(item, next);
  };

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={styles.supplierCell}>
          {item.supplierCountry && COUNTRY_FLAG[item.supplierCountry] && (
            <span style={styles.flag}>{COUNTRY_FLAG[item.supplierCountry]}</span>
          )}
          <div>
            <div style={styles.supplierName}>{item.supplierName}</div>
            <div style={styles.kindLine}>
              {item.kind === 'part' ? 'Part' : 'Service'}
              {item.sku && <> · <code style={styles.sku}>{item.sku}</code></>}
            </div>
          </div>
        </div>
      </td>
      <td style={styles.td}>
        <div style={styles.partName}>{item.name}</div>
      </td>
      <td style={styles.td}>
        <span style={styles.basePrice}>{item.basePrice || '—'}</span>
      </td>
      <td style={styles.td}>
        <div style={styles.sliderCell}>
          <input
            type="range"
            min={20}
            max={200}
            step={1}
            value={markup}
            onChange={(e) => handle(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.markupValue}>{markup}%</span>
        </div>
      </td>
      <td style={styles.td}>
        <span style={styles.buyerSees}>
          {applyMarkupToString(item.basePrice, markup)}
        </span>
      </td>
    </tr>
  );
}

export default function BrokerInventory() {
  const query = useApi(listBrokerInventory, []);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const toast = useToast();
  // One debounce timer per row id. Slider drag schedules a save 400ms
  // after the last change; subsequent changes reset the timer so the
  // database only sees the final value the user landed on.
  const saveTimers = useRef(new Map());

  useEffect(() => {
    if (query.data) setItems(query.data);
  }, [query.data]);

  const handleSave = (item, nextMarkup) => {
    // Optimistic local update so other UI bits stay in sync
    setItems((rows) => rows.map((r) =>
      r.id === item.id && r.kind === item.kind ? { ...r, markupPct: nextMarkup } : r,
    ));

    const key = `${item.kind}:${item.id}`;
    const prev = saveTimers.current.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(async () => {
      try {
        await updateInventoryMarkup(item, nextMarkup);
        toast.success(`${item.name} → ${nextMarkup}%`);
      } catch (err) {
        toast.error(err.message || 'Could not save markup');
        // Revert on failure
        setItems((rows) => rows.map((r) =>
          r.id === item.id && r.kind === item.kind ? { ...r, markupPct: item.markupPct } : r,
        ));
      }
      saveTimers.current.delete(key);
    }, 400);
    saveTimers.current.set(key, t);
  };

  if (query.loading && !query.data) {
    return <div style={styles.page}><LoadingBlock label="Loading your inventory…" /></div>;
  }
  if (query.error) {
    return <div style={styles.page}><ErrorBlock error={query.error} onRetry={query.refetch} /></div>;
  }

  // Group counts for the filter chips
  const partCount = items.filter((i) => i.kind === 'part').length;
  const serviceCount = items.filter((i) => i.kind === 'service').length;

  // Apply filter + search
  const q = search.trim().toLowerCase();
  const filtered = items.filter((i) => {
    if (filter === 'parts' && i.kind !== 'part') return false;
    if (filter === 'services' && i.kind !== 'service') return false;
    if (!q) return true;
    return (
      i.name.toLowerCase().includes(q) ||
      i.supplierName.toLowerCase().includes(q) ||
      (i.sku && i.sku.toLowerCase().includes(q))
    );
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Broker Control</div>
          <h1 style={styles.h1}>Inventory & markup</h1>
          <div style={styles.sub}>
            Every part and service from suppliers you've introduced. Drag the slider on
            any row to set your margin — supplier sees their net, buyer sees your price.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.toolbar}>
        <div style={styles.filterChips}>
          {[
            { key: 'all',      label: `All (${items.length})` },
            { key: 'parts',    label: `Parts (${partCount})` },
            { key: 'services', label: `Services (${serviceCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ ...styles.chip, ...(filter === f.key ? styles.chipActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by part, supplier, or SKU…"
          style={styles.searchInput}
        />
      </div>

      {/* Empty state — no inventory yet OR filtered out everything */}
      {items.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No inventory yet</div>
          <div style={styles.emptySub}>
            Your suppliers haven't listed any parts or services on Naluka yet. Once
            they sign in and start listing, every item will appear here ready for
            you to set markup.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>No matches</div>
          <div style={styles.emptySub}>Try clearing the search or pick a different filter.</div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Base (you pay)</th>
                <th style={styles.th}>Markup</th>
                <th style={styles.th}>Buyer sees</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <InventoryRow
                  key={`${item.kind}:${item.id}`}
                  item={item}
                  onSave={handleSave}
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

  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  filterChips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  chip: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 11, cursor: 'pointer' },
  chipActive: { background: 'rgba(212,169,52,0.12)', borderColor: 'rgba(212,169,52,0.30)', color: 'var(--text-accent)' },
  searchInput: { background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 12, height: 30, outline: 'none', minWidth: 220 },

  tableWrap: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' },
  tr: { borderBottom: '1px solid var(--border-subtle)' },
  td: { padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)', verticalAlign: 'middle' },
  supplierCell: { display: 'flex', alignItems: 'center', gap: 8 },
  flag: { fontSize: 16 },
  supplierName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  kindLine: { fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 },
  sku: { fontFamily: 'var(--font-mono)', color: 'var(--text-accent)', fontSize: 10 },
  partName: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  basePrice: { fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 12 },
  sliderCell: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 },
  slider: { flex: 1, accentColor: 'var(--action-primary)' },
  markupValue: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--text-warning)', minWidth: 36, textAlign: 'right' },
  buyerSees: { fontFamily: 'var(--font-mono)', color: 'var(--color-sage-500)', fontWeight: 700, fontSize: 12 },

  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.5 },
};
