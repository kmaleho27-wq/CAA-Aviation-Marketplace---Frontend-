import { useState } from 'react';
import { createPersonnelByOperator } from '../api/personnel';
import { useToast } from '../lib/toast';

// Bulk crew CSV import (Tier 1 — ICP airline can't enter 200 pilots
// one at a time). Three steps:
//   1. Pick file → parse + dry-run validation (client-side)
//   2. Preview the parsed rows + flagged errors
//   3. Confirm → bulk insert via createPersonnelByOperator
//
// Parse is intentionally minimal — no Papa Parse dep. CSV is "header
// row + comma-separated, double-quotes optional". Anything weirder
// gets flagged as an unparseable row in the dry-run.

const VALID_DISCIPLINES = new Set([
  'flight_crew', 'national_pilot', 'flight_engineer', 'cabin_crew',
  'atc', 'ame', 'aviation_medical', 'glider_pilot', 'balloon_pilot',
  'rpas_pilot', 'non_licensed',
]);

const DISCIPLINE_AIRCRAFT = {
  flight_crew: 'aeroplane',     national_pilot: 'microlight',
  flight_engineer: 'aeroplane', cabin_crew: 'aeroplane',
  atc: 'none',                  ame: 'aeroplane',
  aviation_medical: 'none',     glider_pilot: 'glider',
  balloon_pilot: 'balloon',     rpas_pilot: 'rpas',
  non_licensed: 'none',
};

const DISCIPLINE_MEDICAL = {
  flight_crew: 'class_1',       national_pilot: 'class_4',
  flight_engineer: 'class_1',   cabin_crew: 'class_2',
  atc: 'class_2',               ame: 'none',
  aviation_medical: 'none',     glider_pilot: 'class_4',
  balloon_pilot: 'class_4',     rpas_pilot: 'class_4',
  non_licensed: 'none',
};

const REQUIRED_HEADERS = ['name', 'discipline'];                 // hard-required
const KNOWN_HEADERS = [
  'name', 'discipline', 'license', 'location', 'sacaa_part',
  'licence_subtype', 'non_licensed_role', 'rate',
];

// ── Minimal CSV parser ─────────────────────────────────────────
// Handles: quoted fields, escaped quotes inside quoted fields,
// trailing newline, CRLF, leading BOM.
function parseCsv(text) {
  // Strip UTF-8 BOM if present (Excel adds it).
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let row = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuote = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (cell !== '' || row.length > 0) {
        row.push(cell); cell = '';
        rows.push(row); row = [];
      }
      // skip the \n after \r
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

function validate(rows) {
  if (rows.length < 2) return { headers: [], records: [], errors: ['CSV is empty or missing data rows.'] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const errors = [];

  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) errors.push(`Missing required column: "${required}".`);
  }
  const unknown = headers.filter((h) => !KNOWN_HEADERS.includes(h));
  if (unknown.length) errors.push(`Unknown columns will be ignored: ${unknown.join(', ')}.`);

  const records = [];
  const licensesSeen = new Map();   // license → row index (for duplicate detection)

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    if (raw.every((c) => c === '')) continue;            // skip blank rows
    const obj = Object.fromEntries(headers.map((h, j) => [h, (raw[j] ?? '').trim()]));
    const rowErrors = [];

    if (!obj.name) rowErrors.push('name is required');
    if (!VALID_DISCIPLINES.has(obj.discipline)) {
      rowErrors.push(`discipline must be one of ${[...VALID_DISCIPLINES].join('|')}`);
    }
    if (obj.discipline === 'non_licensed' && !obj.non_licensed_role) {
      rowErrors.push('non_licensed_role required when discipline=non_licensed');
    }
    if (obj.discipline !== 'non_licensed' && !obj.license) {
      rowErrors.push('license required for licensed disciplines');
    }
    if (obj.license) {
      const prev = licensesSeen.get(obj.license);
      if (prev != null) rowErrors.push(`duplicate license in row ${prev + 1}`);
      licensesSeen.set(obj.license, i);
    }

    records.push({ rowNumber: i + 1, data: obj, errors: rowErrors });
  }

  return { headers, records, errors };
}

export default function BulkImportCrewModal({ onClose, onComplete }) {
  const [step, setStep] = useState('pick');     // pick | preview | importing | done
  const [parsed, setParsed] = useState(null);   // { headers, records, errors }
  const [results, setResults] = useState([]);    // [{ rowNumber, name, status, error? }]
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleFile = async (file) => {
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      toast.error('Could not read the file. Try saving it as UTF-8 CSV and uploading again.');
      return;
    }

    let rows;
    try {
      rows = parseCsv(text);
    } catch (err) {
      toast.error('Could not parse the file as CSV. Check the file is plain CSV with comma separators and a header row.');
      return;
    }

    if (!Array.isArray(rows) || rows.length < 2) {
      toast.error('The file appears empty or has no data rows. CSV needs a header row plus at least one data row.');
      return;
    }

    const v = validate(rows);
    setParsed(v);
    setStep('preview');
  };

  const validRows = parsed?.records.filter((r) => r.errors.length === 0) ?? [];
  const invalidRows = parsed?.records.filter((r) => r.errors.length > 0) ?? [];

  const handleImport = async () => {
    if (submitting || validRows.length === 0) return;
    setSubmitting(true);
    setStep('importing');
    const res = [];
    for (const r of validRows) {
      const d = r.data;
      try {
        await createPersonnelByOperator({
          name: d.name,
          discipline: d.discipline,
          sacaaPart: d.sacaa_part ? Number(d.sacaa_part) : null,
          licenceSubtype: d.licence_subtype || null,
          license: d.license || null,
          location: d.location || null,
          aircraftCategory: DISCIPLINE_AIRCRAFT[d.discipline] || 'aeroplane',
          medicalClass: DISCIPLINE_MEDICAL[d.discipline] || 'none',
          nonLicensedRole: d.non_licensed_role || null,
          rate: d.rate || null,
        });
        res.push({ rowNumber: r.rowNumber, name: d.name, status: 'ok' });
      } catch (err) {
        res.push({
          rowNumber: r.rowNumber,
          name: d.name,
          status: 'fail',
          error: err.message || 'Insert failed',
        });
      }
    }
    setResults(res);
    setStep('done');
    setSubmitting(false);

    const okCount = res.filter((r) => r.status === 'ok').length;
    const failCount = res.length - okCount;
    if (failCount === 0) {
      toast.success(`Imported ${okCount} crew members — pending verification`);
    } else {
      toast.warning(`Imported ${okCount}, ${failCount} failed`);
    }

    if (onComplete) onComplete({ ok: okCount, fail: failCount });
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <div>
            <div style={styles.overline}>Bulk import</div>
            <h2 style={styles.h2}>Add multiple crew members</h2>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">×</button>
        </div>

        <div style={styles.body}>
          {step === 'pick' && (
            <>
              <p style={styles.intro}>
                Upload a CSV with one row per crew member. Required columns:
                <code style={styles.code}>name, discipline</code>.
                Recommended additional columns:
                <code style={styles.code}>license, location, sacaa_part, licence_subtype, non_licensed_role, rate</code>.
              </p>
              <div style={styles.exampleBox}>
                <div style={styles.exampleHead}>Example</div>
                <pre style={styles.example}>{`name,discipline,license,location,sacaa_part,licence_subtype
Sipho Dlamini,ame,SA-0142-B1,Johannesburg,66,B1
Anele Mokoena,flight_crew,SA-0089-P1,Cape Town,61,ATPL
Themba Zulu,non_licensed,,Johannesburg,,
`}</pre>
              </div>
              <p style={styles.hint}>
                <strong>Discipline values:</strong> flight_crew, national_pilot, flight_engineer,
                cabin_crew, atc, ame, aviation_medical, glider_pilot, balloon_pilot, rpas_pilot, non_licensed.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
                style={styles.fileInput}
              />
            </>
          )}

          {step === 'preview' && parsed && (
            <>
              <div style={styles.summaryRow}>
                <div style={{ ...styles.summaryPill, ...styles.summaryOk }}>
                  ✓ {validRows.length} valid
                </div>
                {invalidRows.length > 0 && (
                  <div style={{ ...styles.summaryPill, ...styles.summaryWarn }}>
                    ⚠ {invalidRows.length} with errors (will be skipped)
                  </div>
                )}
              </div>

              {parsed.errors.length > 0 && (
                <div style={styles.headerErrors}>
                  {parsed.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}

              <div style={styles.table}>
                <div style={{ ...styles.tableRow, ...styles.tableHead }}>
                  <div style={{ ...styles.tableCell, width: 40 }}>#</div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>Name</div>
                  <div style={{ ...styles.tableCell, width: 120 }}>Discipline</div>
                  <div style={{ ...styles.tableCell, width: 130 }}>Licence</div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>Errors</div>
                </div>
                {parsed.records.slice(0, 50).map((r) => (
                  <div
                    key={r.rowNumber}
                    style={{
                      ...styles.tableRow,
                      background: r.errors.length ? 'rgba(212, 86, 86, 0.06)' : 'transparent',
                    }}
                  >
                    <div style={{ ...styles.tableCell, width: 40, color: 'var(--text-tertiary)' }}>{r.rowNumber}</div>
                    <div style={{ ...styles.tableCell, flex: 1 }}>{r.data.name || <em>—</em>}</div>
                    <div style={{ ...styles.tableCell, width: 120, color: 'var(--text-tertiary)', fontSize: 11 }}>{r.data.discipline || <em>—</em>}</div>
                    <div style={{ ...styles.tableCell, width: 130, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-warning)' }}>{r.data.license || <em>—</em>}</div>
                    <div style={{ ...styles.tableCell, flex: 1, fontSize: 11, color: 'var(--text-danger)' }}>
                      {r.errors.join('; ') || <span style={{ color: 'var(--color-sage-500)' }}>OK</span>}
                    </div>
                  </div>
                ))}
                {parsed.records.length > 50 && (
                  <div style={{ ...styles.tableRow, color: 'var(--text-tertiary)', fontSize: 11, justifyContent: 'center' }}>
                    + {parsed.records.length - 50} more rows (will be processed but not shown here)
                  </div>
                )}
              </div>

              <div style={styles.actions}>
                <button onClick={() => setStep('pick')} style={styles.secondary}>Pick a different file</button>
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  style={{ ...styles.primary, opacity: validRows.length === 0 ? 0.5 : 1 }}
                >
                  Import {validRows.length} crew member{validRows.length === 1 ? '' : 's'}
                </button>
              </div>
            </>
          )}

          {step === 'importing' && (
            <div style={styles.importing}>
              Importing {validRows.length} crew member{validRows.length === 1 ? '' : 's'}…
              <div style={styles.spinner} />
            </div>
          )}

          {step === 'done' && (
            <>
              <div style={styles.summaryRow}>
                <div style={{ ...styles.summaryPill, ...styles.summaryOk }}>
                  ✓ {results.filter((r) => r.status === 'ok').length} imported
                </div>
                {results.filter((r) => r.status === 'fail').length > 0 && (
                  <div style={{ ...styles.summaryPill, ...styles.summaryWarn }}>
                    ✕ {results.filter((r) => r.status === 'fail').length} failed
                  </div>
                )}
              </div>
              <p style={styles.hint}>
                All imported crew members are <strong>status: pending</strong> until admin verification.
              </p>
              <div style={styles.table}>
                {results.map((r) => (
                  <div key={r.rowNumber} style={{ ...styles.tableRow, background: r.status === 'fail' ? 'rgba(212, 86, 86, 0.06)' : 'transparent' }}>
                    <div style={{ ...styles.tableCell, width: 40, color: 'var(--text-tertiary)' }}>{r.rowNumber}</div>
                    <div style={{ ...styles.tableCell, flex: 1 }}>{r.name}</div>
                    <div style={{ ...styles.tableCell, width: 80, color: r.status === 'ok' ? 'var(--color-sage-500)' : 'var(--text-danger)' }}>
                      {r.status === 'ok' ? '✓ OK' : '✕ FAIL'}
                    </div>
                    <div style={{ ...styles.tableCell, flex: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {r.error || ''}
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.actions}>
                <button onClick={onClose} style={styles.primary}>Done</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'auto',
    background: 'var(--surface-card)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)',
  },
  head: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '20px 24px 12px', borderBottom: '1px solid var(--border-subtle)',
  },
  overline: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-overline)', marginBottom: 4,
  },
  h2: {
    fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22,
    color: 'var(--text-primary)', letterSpacing: '0.01em', margin: 0,
  },
  close: {
    background: 'transparent', border: 'none',
    color: 'var(--text-tertiary)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  body: { padding: 24 },
  intro: { fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' },
  code: {
    background: 'var(--surface-input)', padding: '2px 6px', borderRadius: 4,
    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-warning)',
    margin: '0 4px',
  },
  exampleBox: {
    marginTop: 12, padding: 12,
    background: 'var(--surface-input)', borderRadius: 8,
    border: '1px solid var(--border-subtle)',
  },
  exampleHead: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-overline)', marginBottom: 6 },
  example: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre' },
  hint: { fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6, marginTop: 12 },
  fileInput: {
    display: 'block', marginTop: 16, padding: 8,
    background: 'var(--surface-input)', borderRadius: 8,
    border: '1px dashed var(--border-default)', color: 'var(--text-secondary)',
    width: '100%',
  },
  summaryRow: { display: 'flex', gap: 8, marginBottom: 12 },
  summaryPill: {
    fontSize: 12, fontWeight: 700, padding: '4px 12px',
    borderRadius: 'var(--radius-pill)', border: '1px solid transparent',
  },
  summaryOk: { background: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)', borderColor: 'rgba(58, 138, 110, 0.30)' },
  summaryWarn: { background: 'rgba(212, 169, 52, 0.10)', color: 'var(--text-warning)', borderColor: 'rgba(212, 169, 52, 0.25)' },
  headerErrors: {
    background: 'rgba(212, 86, 86, 0.06)', border: '1px solid rgba(212, 86, 86, 0.20)',
    borderRadius: 8, padding: 10, marginBottom: 12,
    color: 'var(--text-danger)', fontSize: 12,
  },
  table: { border: '1px solid var(--border-subtle)', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  tableRow: {
    display: 'flex', borderBottom: '1px solid var(--border-subtle)',
    fontSize: 12, alignItems: 'center',
  },
  tableHead: {
    background: 'var(--surface-input)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-overline)',
  },
  tableCell: { padding: '7px 10px', overflow: 'hidden', textOverflow: 'ellipsis' },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 },
  primary: {
    background: 'var(--action-primary)', color: 'var(--action-primary-text)',
    border: 'none', borderRadius: 'var(--radius-md)',
    padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  secondary: {
    background: 'transparent', color: 'var(--text-tertiary)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    padding: '8px 14px', fontSize: 13, cursor: 'pointer',
  },
  importing: { padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)' },
  spinner: {
    width: 20, height: 20, margin: '12px auto 0',
    border: '2px solid var(--border-default)', borderTopColor: 'var(--action-primary)',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
};
