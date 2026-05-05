import { useState } from 'react';

// AMO-side form for listing a new MRO service. Mirrors AddCrewModal
// pattern. Service starts as `status='pending'` until admin verifies
// the AMO is a legitimate Part 145 organisation, then it appears in
// the public marketplace via the existing mro_service_select_active
// RLS policy.

const CATEGORIES = [
  { key: 'a_check',          label: 'A-Check' },
  { key: 'b_check',          label: 'B-Check' },
  { key: 'c_check',          label: 'C-Check' },
  { key: 'd_check',          label: 'D-Check' },
  { key: 'engine_overhaul',  label: 'Engine Overhaul' },
  { key: 'avionics',         label: 'Avionics' },
  { key: 'paint_interior',   label: 'Paint / Interior' },
  { key: 'aog_response',     label: 'AOG Rapid Response' },
  { key: 'component',        label: 'Component Repair' },
  { key: 'other',            label: 'Other' },
];

export default function ListMroServiceModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('a_check');
  const [description, setDescription] = useState('');
  const [aircraftTypes, setAircraftTypes] = useState('');
  const [location, setLocation] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (submitting || !name.trim() || !location.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        description: description.trim() || null,
        aircraftTypes: aircraftTypes
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        location: location.trim(),
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
        priceFrom: priceFrom.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <div>
            <div style={styles.overline}>Add to your offerings</div>
            <h2 style={styles.h2}>List an MRO service</h2>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">×</button>
        </div>
        <form onSubmit={handle} style={styles.body}>
          <label style={styles.label}>Service name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="A-Check — B737-800"
            style={styles.input}
            required
          />

          <label style={styles.label}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          <label style={styles.label}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Line maintenance A-Check inspection per Boeing AMM. Includes EASA Form 1 and digital RTS sign-off."
            style={{ ...styles.input, minHeight: 64, fontFamily: 'inherit', padding: 8 }}
            rows={3}
          />

          <label style={styles.label}>Aircraft types (comma-separated)</label>
          <input
            value={aircraftTypes}
            onChange={(e) => setAircraftTypes(e.target.value)}
            placeholder="B737-800, B737NG"
            style={styles.input}
          />

          <label style={styles.label}>Location</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="FAOR · Johannesburg"
            style={styles.input}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={styles.label}>Typical lead time (days)</label>
              <input
                type="number"
                min="0"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="3"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Price from (display)</label>
              <input
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="ZAR 280,000"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.notice}>
            Your listing starts in <strong>pending verification</strong>. Once an admin
            confirms your AMO Part 145 status, the listing appears in the public
            marketplace.
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancel}>Cancel</button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !location.trim()}
              style={{
                ...styles.submit,
                opacity: submitting || !name.trim() || !location.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? 'Listing…' : 'List service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 12px', borderBottom: '1px solid var(--border-subtle)' },
  overline: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h2: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '0.01em', margin: 0 },
  close: { background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0 },
  body: { padding: '14px 24px 22px' },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, marginTop: 12 },
  input: { display: 'block', width: '100%', height: 38, background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  notice: { marginTop: 14, padding: '10px 12px', background: 'rgba(212, 169, 52, 0.06)', border: '1px solid rgba(212, 169, 52, 0.20)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: 11, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 },
  cancel: { background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  submit: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
};
