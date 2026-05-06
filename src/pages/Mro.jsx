import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import {
  listMroServices, requestMroQuote, createMroService,
  listMroQuotes, respondMroQuote, declineMroQuote,
  acceptMroQuote, markMroWorkComplete, releaseMroEscrow,
} from '../api/mro';
import { LoadingBlock, ErrorBlock } from '../components/ApiState';
import { useToast } from '../lib/toast';
import { getUser } from '../lib/auth';
import ListMroServiceModal from '../components/ListMroServiceModal';
import MroQuotesPanel from '../components/MroQuotesPanel';

const CATEGORIES = [
  { key: 'all',             label: 'All' },
  { key: 'a_check',         label: 'A-Check' },
  { key: 'b_check',         label: 'B-Check' },
  { key: 'c_check',         label: 'C-Check' },
  { key: 'd_check',         label: 'D-Check' },
  { key: 'engine_overhaul', label: 'Engine Overhaul' },
  { key: 'avionics',        label: 'Avionics' },
  { key: 'paint_interior',  label: 'Paint / Interior' },
  { key: 'aog_response',    label: 'AOG Response' },
  { key: 'component',       label: 'Component' },
];

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

// Pretty discipline labels for the AMO crew display. Matches the
// labels used elsewhere (compliance dashboard, audit pack).
const DISCIPLINE_LABEL = {
  flight_crew: 'Pilot', national_pilot: 'NPL', glider_pilot: 'Glider',
  balloon_pilot: 'Balloon', rpas_pilot: 'RPAS', flight_engineer: 'FE',
  cabin_crew: 'Cabin', atc: 'ATC', ame: 'AME', aviation_medical: 'DAME',
  non_licensed: 'Ground',
};

const STATUS_TONE = {
  verified: { bg: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)', border: 'rgba(58, 138, 110, 0.30)', label: '✓ Verified AMO' },
  pending:  { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',   border: 'rgba(212, 169, 52, 0.25)', label: 'Pending verification' },
  expiring: { bg: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)',   border: 'rgba(212, 169, 52, 0.25)', label: 'Renewal due' },
  expired:  { bg: 'rgba(212, 86, 86, 0.08)',  color: 'var(--text-danger)',    border: 'rgba(212, 86, 86, 0.25)',  label: 'Lapsed' },
};

function ServiceCard({ s, onQuote, busy }) {
  const tone = STATUS_TONE[s.status] || STATUS_TONE.pending;
  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.title}>{s.name}</div>
          <div style={styles.amo}>{s.mro?.name || 'AMO'}</div>
        </div>
        <span style={{ ...styles.badge, background: tone.bg, color: tone.color, borderColor: tone.border }}>{tone.label}</span>
      </div>

      {s.description && <div style={styles.desc}>{s.description}</div>}

      <div style={styles.metaGrid}>
        <div><div style={styles.metaLabel}>Category</div><div style={styles.metaValue}>{CATEGORY_LABEL[s.category] || s.category}</div></div>
        <div><div style={styles.metaLabel}>Location</div><div style={styles.metaValue}>{s.location}</div></div>
        {s.leadTimeDays != null && (
          <div><div style={styles.metaLabel}>Lead time</div><div style={styles.metaValue}>{s.leadTimeDays} {s.leadTimeDays === 1 ? 'day' : 'days'}</div></div>
        )}
        {s.priceFrom && (
          <div><div style={styles.metaLabel}>From</div><div style={{ ...styles.metaValue, color: 'var(--text-warning)' }}>{s.priceFrom}</div></div>
        )}
      </div>

      {(s.aircraftTypes?.length ?? 0) > 0 && (
        <div style={styles.tagsRow}>
          {s.aircraftTypes.map((t) => <span key={t} style={styles.tag}>{t}</span>)}
        </div>
      )}

      {/* Verified crew disciplines on staff at this AMO. Operator
          shopping for a B1-only job can see at a glance whether this
          shop has B1 engineers. Empty means the shop has no verified
          crew on Naluka yet — not "no engineers", just "not declared". */}
      {(s.crewDisciplines?.length ?? 0) > 0 && (
        <div style={styles.crewRow}>
          <span style={styles.crewLabel}>Verified crew:</span>
          {s.crewDisciplines.map(({ discipline, count }) => (
            <span key={discipline} style={styles.crewChip}>
              {count} {DISCIPLINE_LABEL[discipline] || discipline}
            </span>
          ))}
        </div>
      )}

      <div style={styles.cardFooter}>
        {s.rating != null && (
          <span style={styles.rating}>★ {Number(s.rating).toFixed(1)}</span>
        )}
        <button onClick={() => onQuote(s)} disabled={busy} style={styles.quoteBtn}>
          {busy ? 'Sending…' : 'Request quote →'}
        </button>
      </div>
    </div>
  );
}

// Disciplines an operator typically searches for when picking an AMO.
// Pilots / cabin crew / ATC are filtered out — operators hire AMOs for
// engineering and ground-ops work, not flight crew.
const FILTERABLE_DISCIPLINES = [
  { key: 'ame',             label: 'AME (Part 66)' },
  { key: 'flight_engineer', label: 'Flight Engineer' },
  { key: 'aviation_medical',label: 'DAME' },
  { key: 'non_licensed',    label: 'Ground Ops' },
];

export default function Mro() {
  const [category, setCategory] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState(new Set());
  const [busyId, setBusyId] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const toast = useToast();
  const authUser = getUser();
  const isAmo = authUser?.role === 'AMO' || authUser?.role === 'ADMIN';

  const filterArg = category === 'all' ? {} : { category };
  const query = useApi(() => listMroServices(filterArg), [category]);
  const allServices = query.data || [];

  // Apply discipline filter client-side (we already loaded crew counts
  // per service in listMroServices). Empty set = show all. Multi-select
  // is AND — operator looking for both B1 + DAME wants shops with both.
  const services = disciplineFilter.size === 0
    ? allServices
    : allServices.filter((s) => {
        const disciplinesOnStaff = new Set((s.crewDisciplines ?? []).map((c) => c.discipline));
        return Array.from(disciplineFilter).every((d) => disciplinesOnStaff.has(d));
      });

  const toggleDiscipline = (key) => {
    setDisciplineFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const onQuote = async (service) => {
    if (busyId) return;
    setBusyId(service.id);
    try {
      await requestMroQuote(service.id);
      toast.success(`Quote requested — ${service.name}. AMO will respond shortly.`);
    } catch (err) {
      toast.error(err.message || 'Could not request quote.');
    } finally {
      setBusyId(null);
    }
  };

  const onListService = async (payload) => {
    try {
      await createMroService(payload);
      toast.success(`${payload.name} listed — pending admin verification`);
      setListOpen(false);
      query.refetch();
    } catch (err) {
      toast.error(err.message || 'Could not list service.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.overline}>Maintenance &amp; Engineering</div>
          <h1 style={styles.h1}>MRO Services</h1>
          <div style={styles.sub}>Request quotes from Part 145 AMOs across the continent.</div>
        </div>
        {isAmo && (
          <button onClick={() => setListOpen(true)} style={styles.btnPrimary}>
            + List a service
          </button>
        )}
      </div>

      {/* Quotes panel — visible to anyone with quotes (RLS gates rows). */}
      <MroQuotesPanel />

      {/* Discipline filter — narrows to AMOs that have verified crew
          for ALL selected disciplines on staff. Hidden from AMO/admin
          users since they're not shopping for shops. */}
      {!isAmo && (
        <div style={styles.disciplineFilterRow}>
          <span style={styles.disciplineFilterLabel}>Required crew:</span>
          {FILTERABLE_DISCIPLINES.map((d) => {
            const active = disciplineFilter.has(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggleDiscipline(d.key)}
                style={{ ...styles.disciplineChip, ...(active ? styles.disciplineChipActive : {}) }}
              >
                {active ? '✓ ' : ''}{d.label}
              </button>
            );
          })}
          {disciplineFilter.size > 0 && (
            <button onClick={() => setDisciplineFilter(new Set())} style={styles.clearChip}>
              Clear
            </button>
          )}
        </div>
      )}

      <div style={styles.filterRow}>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{ ...styles.filterBtn, ...(category === c.key ? styles.filterBtnActive : {}) }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {query.loading && !query.data ? (
        <LoadingBlock label="Loading MRO services…" />
      ) : query.error ? (
        <ErrorBlock error={query.error} onRetry={query.refetch} />
      ) : services.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>
            {disciplineFilter.size > 0
              ? `No AMOs match those discipline requirements`
              : `No services match this category`}
          </div>
          <div style={styles.emptySub}>
            {disciplineFilter.size > 0
              ? 'Try fewer required disciplines, or pick a different category.'
              : 'Try "All" or pick a different category.'}
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} onQuote={onQuote} busy={busyId === s.id} />
          ))}
        </div>
      )}

      {listOpen && (
        <ListMroServiceModal onClose={() => setListOpen(false)} onSubmit={onListService} />
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6 },
  btnPrimary: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  filterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 },
  filterBtn: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 12, cursor: 'pointer' },
  filterBtnActive: { background: 'rgba(212, 169, 52, 0.12)', borderColor: 'rgba(212, 169, 52, 0.30)', color: 'var(--text-accent)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderTop: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 16 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  title: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  amo: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 },
  desc: { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0 12px' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' },
  metaLabel: { fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 2 },
  metaValue: { fontSize: 12, color: 'var(--text-secondary)' },
  tagsRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  tag: { background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 7px', fontSize: 11 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' },
  rating: { fontSize: 12, fontWeight: 600, color: 'var(--text-warning)' },
  quoteBtn: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  badge: { borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 10, fontWeight: 600, border: '1px solid transparent', whiteSpace: 'nowrap', flexShrink: 0 },
  empty: { background: 'var(--surface-card)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 },
  emptySub: { fontSize: 12, color: 'var(--text-tertiary)' },
  crewRow: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' },
  crewLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)' },
  crewChip: { background: 'rgba(58, 138, 110, 0.10)', color: 'var(--color-sage-500)', border: '1px solid rgba(58, 138, 110, 0.25)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: 10, fontWeight: 600 },
  disciplineFilterRow: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' },
  disciplineFilterLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginRight: 4 },
  disciplineChip: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-pill)', padding: '4px 12px', fontSize: 11, cursor: 'pointer' },
  disciplineChipActive: { background: 'rgba(58, 138, 110, 0.10)', borderColor: 'rgba(58, 138, 110, 0.35)', color: 'var(--color-sage-500)', fontWeight: 600 },
  clearChip: { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: '4px 8px' },
};
