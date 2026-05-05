import { Fragment, useState } from 'react';
import { generateAuditPack } from '../api/auditPack';
import { useToast } from '../lib/toast';
import { LoadingBlock } from '../components/ApiState';

// /app/audit-pack — generates a SACAA-inspection-ready pack covering
// the last 12 months of transactions, documents, audit events, and the
// hash-chained verify_chain integrity proof. Two export formats:
//  - "Print / Save as PDF": browser native print dialog with print
//    styles below for a clean A4 layout. No server-side PDF lib needed.
//  - "Download JSON": machine-readable archive for ingestion into a
//    customer's compliance system.

const PRINT_STYLES = `
@media print {
  @page { margin: 18mm; size: A4; }
  body { background: white; color: black; }
  .audit-pack-noprint { display: none !important; }
  .audit-pack-page { background: white !important; color: black !important; padding: 0 !important; }
  .audit-pack-section { background: white !important; border: 1px solid #000 !important; page-break-inside: avoid; }
  .audit-pack-table th, .audit-pack-table td { border-color: #000 !important; }
  .audit-pack-h1, .audit-pack-h2, .audit-pack-section-label { color: black !important; }
  .audit-pack-meta-value, .audit-pack-cell { color: black !important; }
}
`;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function yearAgoIso() {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditPack() {
  const [from, setFrom] = useState(yearAgoIso());
  const [to, setTo] = useState(todayIso());
  const [pack, setPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const onGenerate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await generateAuditPack({ from, to });
      setPack(result);
      toast.success(`Audit pack generated (${result.transactions.length} txns, ${result.auditEvents.length} audit events)`);
    } catch (err) {
      toast.error(err.message || 'Could not generate audit pack.');
    } finally {
      setLoading(false);
    }
  };

  const onDownloadJson = () => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naluka-audit-pack-${pack.range.from}-to-${pack.range.to}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onPrint = () => window.print();

  return (
    <div style={styles.page} className="audit-pack-page">
      <style>{PRINT_STYLES}</style>

      <div style={styles.header} className="audit-pack-noprint">
        <div>
          <div style={styles.overline}>Compliance</div>
          <h1 style={styles.h1} className="audit-pack-h1">Audit Pack</h1>
          <div style={styles.sub}>
            Inspection-ready bundle: transactions, documents, audit events, and a
            hash-chained integrity proof. Print or export to JSON.
          </div>
        </div>
      </div>

      <div style={styles.controls} className="audit-pack-noprint">
        <label style={styles.label}>From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={styles.dateInput} />
        </label>
        <label style={styles.label}>To
          <input type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} style={styles.dateInput} />
        </label>
        <button onClick={onGenerate} disabled={loading} style={styles.btnPrimary}>
          {loading ? 'Generating…' : pack ? 'Regenerate' : 'Generate audit pack'}
        </button>
        {pack && (
          <>
            <button onClick={onPrint} style={styles.btnSecondary}>🖨 Print / Save as PDF</button>
            <button onClick={onDownloadJson} style={styles.btnSecondary}>⬇ Download JSON</button>
          </>
        )}
      </div>

      {loading && !pack && <LoadingBlock label="Pulling 12 months of data…" />}

      {pack && (
        <div style={styles.report}>
          {/* Cover header */}
          <div style={styles.cover} className="audit-pack-section">
            <h1 style={{ ...styles.h1, margin: 0 }} className="audit-pack-h1">Naluka — Audit Pack</h1>
            <div style={styles.coverMeta}>
              <div><div style={styles.metaLabel}>Generated</div><div style={styles.metaValue} className="audit-pack-meta-value">{fmtDateTime(pack.generatedAt)}</div></div>
              <div><div style={styles.metaLabel}>Generated by</div><div style={styles.metaValue} className="audit-pack-meta-value">{pack.generatedBy?.name ?? '—'} ({pack.generatedBy?.role})</div></div>
              <div><div style={styles.metaLabel}>Date range</div><div style={styles.metaValue} className="audit-pack-meta-value">{fmtDate(pack.range.from)} → {fmtDate(pack.range.to)}</div></div>
            </div>
          </div>

          {/* Integrity proof — the moat */}
          <div style={styles.section} className="audit-pack-section">
            <div style={styles.sectionLabel} className="audit-pack-section-label">Audit chain integrity proof</div>
            {pack.verifyChainProof ? (
              <div style={styles.integrityRow}>
                <div>
                  <div style={styles.metaLabel}>Status</div>
                  <div style={{ ...styles.metaValue, color: pack.verifyChainProof.valid ? 'var(--color-sage-500)' : 'var(--text-danger)' }} className="audit-pack-meta-value">
                    {pack.verifyChainProof.valid ? '✓ Chain VALID — no tampering' : '✕ Chain BROKEN at seq ' + pack.verifyChainProof.brokenAt}
                  </div>
                </div>
                <div>
                  <div style={styles.metaLabel}>Total events chained</div>
                  <div style={styles.metaValue} className="audit-pack-meta-value">{pack.verifyChainProof.total}</div>
                </div>
                {pack.verifyChainProof.reason && (
                  <div>
                    <div style={styles.metaLabel}>Reason</div>
                    <div style={styles.metaValue} className="audit-pack-meta-value">{pack.verifyChainProof.reason}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.empty}>verify_chain RPC unavailable to this caller (RLS — admin only). Ask an admin to attach the proof.</div>
            )}
          </div>

          {/* Transactions */}
          <div style={styles.section} className="audit-pack-section">
            <div style={styles.sectionLabel} className="audit-pack-section-label">Transactions ({pack.transactions.length})</div>
            {pack.transactions.length === 0 ? (
              <div style={styles.empty}>No transactions in this window.</div>
            ) : (
              <table style={styles.table} className="audit-pack-table">
                <thead><tr>
                  <th style={styles.th}>ID</th><th style={styles.th}>Type</th>
                  <th style={styles.th}>Item</th><th style={styles.th}>Party</th>
                  <th style={styles.th}>Amount</th><th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr></thead>
                <tbody>{pack.transactions.map((t) => (
                  <tr key={t.id}>
                    <td style={styles.tdMono}>{t.id}</td>
                    <td style={styles.td}>{t.type}</td>
                    <td style={styles.td}>{t.item}</td>
                    <td style={styles.td}>{t.party}</td>
                    <td style={styles.td}>{t.amount}</td>
                    <td style={styles.td}>{t.status}</td>
                    <td style={styles.td}>{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* Audit events */}
          <div style={styles.section} className="audit-pack-section">
            <div style={styles.sectionLabel} className="audit-pack-section-label">Audit events ({pack.auditEvents.length})</div>
            {pack.auditEvents.length === 0 ? (
              <div style={styles.empty}>No audit events in this window or RLS hides them from this caller.</div>
            ) : (
              <table style={styles.table} className="audit-pack-table">
                <thead><tr>
                  <th style={styles.th}>Seq</th><th style={styles.th}>Type</th>
                  <th style={styles.th}>Created</th><th style={styles.th}>Hash</th>
                </tr></thead>
                <tbody>{pack.auditEvents.map((e) => (
                  <tr key={e.seq}>
                    <td style={styles.tdMono}>{e.seq}</td>
                    <td style={styles.td}>{e.eventType ?? e.type}</td>
                    <td style={styles.td}>{fmtDateTime(e.createdAt)}</td>
                    <td style={{ ...styles.tdMono, fontSize: 9 }}>{e.curHash?.slice(0, 16) ?? e.hash?.slice(0, 16) ?? '—'}…</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* Documents */}
          <div style={styles.section} className="audit-pack-section">
            <div style={styles.sectionLabel} className="audit-pack-section-label">Documents on file ({pack.documents.length})</div>
            {pack.documents.length === 0 ? (
              <div style={styles.empty}>No documents issued in this window.</div>
            ) : (
              <table style={styles.table} className="audit-pack-table">
                <thead><tr>
                  <th style={styles.th}>Ref</th><th style={styles.th}>Name</th>
                  <th style={styles.th}>Type</th><th style={styles.th}>Status</th>
                  <th style={styles.th}>Issued</th><th style={styles.th}>Expires</th>
                </tr></thead>
                <tbody>{pack.documents.map((d) => (
                  <tr key={d.id}>
                    <td style={styles.tdMono}>{d.refNumber}</td>
                    <td style={styles.td}>{d.name}</td>
                    <td style={styles.td}>{d.type}</td>
                    <td style={styles.td}>{d.status}</td>
                    <td style={styles.td}>{fmtDate(d.issued)}</td>
                    <td style={styles.td}>{fmtDate(d.expires)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* Personnel snapshot — each row lists primary discipline,
              then any secondary credentials below so inspectors see the
              full SACAA-licence picture for multi-licensed crew. */}
          <div style={styles.section} className="audit-pack-section">
            <div style={styles.sectionLabel} className="audit-pack-section-label">
              Personnel snapshot ({pack.personnel.length}
              {pack.personnel.some((p) => (p.credentials?.length ?? 0) > 0)
                ? ` — incl. ${pack.personnel.reduce((s, p) => s + (p.credentials?.length ?? 0), 0)} additional credential(s)`
                : ''})
            </div>
            {pack.personnel.length === 0 ? (
              <div style={styles.empty}>No personnel rows visible to this caller.</div>
            ) : (
              <table style={styles.table} className="audit-pack-table">
                <thead><tr>
                  <th style={styles.th}>Name</th><th style={styles.th}>Discipline / Credential</th>
                  <th style={styles.th}>Licence</th><th style={styles.th}>Medical</th>
                  <th style={styles.th}>Status</th><th style={styles.th}>Expires</th>
                </tr></thead>
                <tbody>{pack.personnel.map((p) => {
                  const extras = p.credentials ?? [];
                  return (
                    <Fragment key={p.id}>
                      <tr>
                        <td style={styles.td} rowSpan={1 + extras.length}>{p.name}</td>
                        <td style={styles.td}>
                          <strong>{p.discipline ?? '—'}</strong>
                          {p.licenceSubtype ? ` · ${p.licenceSubtype}` : ''}
                          <span style={{ fontSize: 9, color: '#666', marginLeft: 6 }}>(primary)</span>
                        </td>
                        <td style={styles.tdMono}>{p.license ?? '—'}</td>
                        <td style={styles.td}>
                          {p.medicalClass && p.medicalClass !== 'none' ? p.medicalClass.replace('_', ' ') : '—'}
                        </td>
                        <td style={styles.td}>{p.status}</td>
                        <td style={styles.td}>{fmtDate(p.expires)}</td>
                      </tr>
                      {extras.map((c) => (
                        <tr key={c.id}>
                          <td style={styles.td}>
                            {c.discipline}
                            {c.licenceSubtype ? ` · ${c.licenceSubtype}` : ''}
                            {c.sacaaPart != null ? ` · Part ${c.sacaaPart}` : ''}
                          </td>
                          <td style={styles.tdMono}>{c.license ?? '—'}</td>
                          <td style={styles.td}>
                            {c.medicalClass && c.medicalClass !== 'none' ? c.medicalClass.replace('_', ' ') : '—'}
                          </td>
                          <td style={styles.td}>{c.status}</td>
                          <td style={styles.td}>{fmtDate(c.expires)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}</tbody>
              </table>
            )}
          </div>

          <div style={styles.footer} className="audit-pack-section-label">
            Generated by Naluka. Audit chain integrity proof is computed over the entire ledger
            at the time of generation. To verify externally, replay every audit_event in seq
            order and confirm each cur_hash = sha256(prev_hash || canonical_jsonb(payload)).
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100 },
  header: { marginBottom: 18 },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 4 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 600, lineHeight: 1.55 },
  controls: { display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 24, padding: 14, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  dateInput: { background: 'var(--surface-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '7px 10px', fontSize: 13 },
  btnPrimary: { background: 'var(--action-primary)', color: 'var(--action-primary-text)', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: 'var(--text-warning)', border: '1px solid rgba(212, 169, 52, 0.30)', borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  report: { display: 'flex', flexDirection: 'column', gap: 14 },
  cover: { background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20 },
  coverMeta: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 14 },
  section: { background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 10 },
  metaLabel: { fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 3 },
  metaValue: { fontSize: 13, color: 'var(--text-primary)' },
  integrityRow: { display: 'flex', gap: 32, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-default)', color: 'var(--text-overline)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 },
  td: { padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' },
  tdMono: { padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-warning)', fontFamily: 'var(--font-mono)', fontSize: 10 },
  empty: { fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' },
  footer: { fontSize: 10, color: 'var(--text-overline)', lineHeight: 1.5, padding: '12px 4px 0', borderTop: '1px solid var(--border-subtle)' },
};
