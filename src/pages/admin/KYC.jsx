import { useState, useEffect } from 'react';
import { useApi } from '../../lib/useApi';
import {
  listKyc, approveKyc, rejectKyc,
  listPendingPersonnel, approvePersonnel, rejectPersonnel,
} from '../../api/admin';
import { listPersonnelDocs, getPersonnelDocUrl } from '../../api/documents';
import { listPersonnelCredentials, verifyCredential, rejectCredential } from '../../api/credentials';
import Badge from '../../components/admin/Badge';
import { useToast } from '../../lib/toast';
import { LoadingBlock, ErrorBlock } from '../../components/ApiState';

const RISK_TO_BADGE = {
  low:    { label: 'Low Risk',     scheme: 'verified' },
  medium: { label: 'Medium Risk',  scheme: 'pending'  },
  high:   { label: 'High Risk',    scheme: 'rejected' },
};

// Discipline → display label + which fields matter for verification.
// Admin reviewers reading the card need to know:
//   1. What licence they're checking (Part / subtype)
//   2. Which medical class is required (or n/a)
//   3. Whether endorsements / type ratings are expected
const DISCIPLINE_INFO = {
  flight_crew:      { label: 'Pilot',                 part: 61, needsMedical: true,  needsTypes: true  },
  national_pilot:   { label: 'National Pilot',        part: 62, needsMedical: true,  needsTypes: false },
  flight_engineer:  { label: 'Flight Engineer',       part: 63, needsMedical: true,  needsTypes: true  },
  cabin_crew:       { label: 'Cabin Crew',            part: 64, needsMedical: true,  needsTypes: true  },
  atc:              { label: 'Air Traffic Controller',part: 65, needsMedical: true,  needsTypes: false },
  ame:              { label: 'AME',                   part: 66, needsMedical: false, needsTypes: true  },
  aviation_medical: { label: 'DAME',                  part: 67, needsMedical: false, needsTypes: false },
  glider_pilot:     { label: 'Glider Pilot',          part: 68, needsMedical: true,  needsTypes: false },
  balloon_pilot:    { label: 'Balloon Pilot',         part: 69, needsMedical: true,  needsTypes: false },
  rpas_pilot:       { label: 'RPAS Pilot',            part: 71, needsMedical: false, needsTypes: false },
  non_licensed:     { label: 'Ground Operations',     part: null, needsMedical: false, needsTypes: false },
};

// Pretty-prints a non_licensed_role enum value: "aviation_firefighter" → "Aviation Firefighter"
function prettyNonLicensed(v) {
  return (v || '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ISO 3166-1 alpha-2 → display label. Keep tight; "XX" is our marker
// for "Other (specified by user)" — actual text lives in user_metadata.
const NATIONALITY_LABEL = {
  ZA: '🇿🇦 SA', ZW: '🇿🇼 ZW', BW: '🇧🇼 BW', NA: '🇳🇦 NA', MZ: '🇲🇿 MZ',
  LS: '🇱🇸 LS', SZ: '🇸🇿 SZ', AO: '🇦🇴 AO', ZM: '🇿🇲 ZM', MW: '🇲🇼 MW',
  MG: '🇲🇬 MG', MU: '🇲🇺 MU', KE: '🇰🇪 KE', NG: '🇳🇬 NG', GH: '🇬🇭 GH',
  EG: '🇪🇬 EG', MA: '🇲🇦 MA', TZ: '🇹🇿 TZ', UG: '🇺🇬 UG', RW: '🇷🇼 RW',
  ET: '🇪🇹 ET', SN: '🇸🇳 SN',
  GB: '🇬🇧 UK', US: '🇺🇸 US', AU: '🇦🇺 AU', CA: '🇨🇦 CA', NZ: '🇳🇿 NZ',
  IE: '🇮🇪 IE', DE: '🇩🇪 DE', FR: '🇫🇷 FR', NL: '🇳🇱 NL', IN: '🇮🇳 IN',
  PK: '🇵🇰 PK', PH: '🇵🇭 PH', XX: '🌍 Other',
};

function PendingPersonnelCard({ p, onApprove, onReject, busy }) {
  const info = DISCIPLINE_INFO[p.discipline] || { label: p.discipline, part: p.sacaaPart };
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [extraCreds, setExtraCreds] = useState([]);
  const [credBusyId, setCredBusyId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    listPersonnelDocs(p.id)
      .then((rows) => { if (!cancelled) setUploadedDocs(rows); })
      .catch(() => { /* silent — empty state covers it */ });
    listPersonnelCredentials(p.id)
      .then((rows) => { if (!cancelled) setExtraCreds(rows); })
      .catch(() => { /* personnel row may have no extras */ });
    return () => { cancelled = true; };
  }, [p.id]);

  const handleVerifyCred = async (credId, label) => {
    setCredBusyId(credId);
    try {
      await verifyCredential(credId);
      setExtraCreds((prev) => prev.map((c) => c.id === credId ? { ...c, status: 'verified' } : c));
      toast.success(`Verified — ${label}`);
    } catch (err) {
      toast.error(err.message || 'Verify failed');
    } finally {
      setCredBusyId(null);
    }
  };

  const handleRejectCred = async (credId, label) => {
    const reason = window.prompt(`Reject ${label} — reason (sent to applicant):`, '');
    if (reason === null) return;
    setCredBusyId(credId);
    try {
      await rejectCredential(credId, reason);
      setExtraCreds((prev) => prev.map((c) => c.id === credId ? { ...c, status: 'rejected' } : c));
      toast.warning(`Rejected — ${label}`);
    } catch (err) {
      toast.error(err.message || 'Reject failed');
    } finally {
      setCredBusyId(null);
    }
  };

  const openDoc = async (id) => {
    try {
      const result = await getPersonnelDocUrl(id, { expiresIn: 60 });
      if (result?.url) window.open(result.url, '_blank', 'noopener');
    } catch { /* toasts handled in caller's catch */ }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.nameRow}>
            <span style={styles.name}>{p.name}</span>
            <Badge label={info.label} scheme="pending" />
            {p.profile?.email && (
              <span style={styles.emailChip}>{p.profile.email}</span>
            )}
          </div>

          <div style={styles.subRow}>
            {info.part != null ? (
              <>
                Part {info.part}
                {p.licenceSubtype ? ` · ${p.licenceSubtype}` : ''}
                {p.license ? <> · <span style={styles.licenseChip}>{p.license}</span></> : ''}
              </>
            ) : (
              <>Ground Ops · {prettyNonLicensed(p.nonLicensedRole)}</>
            )}
            {p.location && <> · 📍 {p.location}</>}
            {p.nationality && (
              <> · <span style={{
                ...styles.nationalityChip,
                ...(p.nationality !== 'ZA' ? styles.nationalityForeign : {}),
              }}>
                {NATIONALITY_LABEL[p.nationality] || p.nationality}
                {p.nationality !== 'ZA' && p.nationality !== 'XX' && (
                  <span style={styles.foreignTag}> · ICAO path</span>
                )}
              </span></>
            )}
          </div>

          {/* Discipline-specific verification checklist */}
          <div style={styles.checklist}>
            <div style={styles.checklistTitle}>
              To verify {p.nationality && p.nationality !== 'ZA' ? 'via ICAO state-of-licence:' : 'with SACAA:'}
            </div>
            <ul style={styles.checklistList}>
              {p.nationality && p.nationality !== 'ZA' && p.nationality !== 'XX' && (
                <li style={{ color: 'var(--text-warning)' }}>
                  <strong>Foreign national ({NATIONALITY_LABEL[p.nationality] || p.nationality})</strong> —
                  validate licence with home authority before accepting SACAA conversion or recognition certificate.
                </li>
              )}
              {info.part != null && (
                <li>
                  Part {info.part} licence {p.license ? <code>{p.license}</code> : '(missing — request from applicant)'}
                </li>
              )}
              {info.needsMedical && (
                <li>
                  Medical class {p.medicalClass && p.medicalClass !== 'none'
                    ? <strong>{p.medicalClass.replace('_', ' ')}</strong>
                    : 'required (not yet on file)'}
                </li>
              )}
              {info.needsTypes && (
                <li>
                  Type ratings {(p.types?.length ?? 0) > 0
                    ? <span>({p.types.join(', ')})</span>
                    : '(none submitted yet)'}
                </li>
              )}
              {p.discipline === 'non_licensed' && (
                <li>Employer ID / certification for {prettyNonLicensed(p.nonLicensedRole)}</li>
              )}
            </ul>
          </div>

          {(p.endorsements?.length ?? 0) > 0 && (
            <div style={styles.docsRow}>
              {p.endorsements.map((e) => (
                <span key={e} style={styles.docChip}>✓ {e}</span>
              ))}
            </div>
          )}

          {extraCreds.length > 0 && (
            <div style={styles.extraCreds}>
              <div style={styles.extraCredsLabel}>+ {extraCreds.length} additional credential{extraCreds.length === 1 ? '' : 's'}:</div>
              {extraCreds.map((c) => {
                const label = DISCIPLINE_INFO[c.discipline]?.label || c.discipline;
                const isPending = c.status === 'pending';
                const credBusy = credBusyId === c.id;
                return (
                  <div key={c.id} style={styles.extraCredRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>
                      {c.license ? <> · <code style={{ color: 'var(--text-warning)' }}>{c.license}</code></> : ''}
                      {c.licenceSubtype ? ` · ${c.licenceSubtype}` : ''}
                      {c.medicalClass && c.medicalClass !== 'none' ? ` · ${c.medicalClass.replace('_', ' ')}` : ''}
                      <span style={{
                        marginLeft: 8, fontSize: 10, fontWeight: 700,
                        color: c.status === 'verified' ? 'var(--color-sage-500)'
                             : c.status === 'rejected' ? 'var(--text-danger)'
                             : 'var(--text-warning)',
                      }}>
                        [{c.status}]
                      </span>
                    </div>
                    {isPending && (
                      <div style={styles.credBtnRow}>
                        <button
                          onClick={() => handleRejectCred(c.id, label)}
                          disabled={credBusy}
                          style={styles.credRejectBtn}
                          title="Reject this credential"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => handleVerifyCred(c.id, label)}
                          disabled={credBusy}
                          style={styles.credVerifyBtn}
                          title="Verify this credential"
                        >
                          ✓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {uploadedDocs.length > 0 ? (
            <div style={{ ...styles.docsRow, marginTop: 8 }}>
              {uploadedDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDoc(d.id)}
                  style={styles.docLink}
                  title={`Open ${d.name} in new tab`}
                >
                  📎 {d.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.noDocs}>No supporting documents uploaded yet.</div>
          )}
        </div>

        <div style={styles.actions}>
          <button onClick={() => onReject(p.id)} disabled={busy} style={styles.rejectBtn}>
            Reject
          </button>
          <button
            onClick={() => onApprove(p.id)}
            disabled={busy}
            style={{ ...styles.approveBtn, background: busy ? 'var(--surface-card)' : '#3A8A6E', color: busy ? 'var(--text-tertiary)' : '#fff' }}
          >
            Approve
          </button>
        </div>
      </div>
      <div style={styles.metaRow}>
        Self-registered · {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function KYC() {
  const query = useApi(listKyc, []);
  const pendingPplQuery = useApi(listPendingPersonnel, []);
  const [apps, setApps] = useState([]);
  const [pendingPpl, setPendingPpl] = useState([]);
  const [busyPplId, setBusyPplId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (query.data) setApps(query.data);
  }, [query.data]);

  useEffect(() => {
    if (pendingPplQuery.data) setPendingPpl(pendingPplQuery.data);
  }, [pendingPplQuery.data]);

  const approvePpl = async (id) => {
    const target = pendingPpl.find((p) => p.id === id);
    setBusyPplId(id);
    setPendingPpl((prev) => prev.filter((p) => p.id !== id));
    try {
      await approvePersonnel(id);
      if (target) toast.success(`Approved — ${target.name} (${DISCIPLINE_INFO[target.discipline]?.label || target.discipline})`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Approval failed');
      pendingPplQuery.refetch();
    } finally {
      setBusyPplId(null);
    }
  };

  const rejectPpl = async (id) => {
    const target = pendingPpl.find((p) => p.id === id);
    const reason = window.prompt(`Reject ${target?.name || 'applicant'} — reason (sent to applicant):`, '');
    if (reason === null) return; // cancelled
    setBusyPplId(id);
    setPendingPpl((prev) => prev.filter((p) => p.id !== id));
    try {
      await rejectPersonnel(id, reason);
      if (target) toast.warning(`Rejected — ${target.name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Rejection failed');
      pendingPplQuery.refetch();
    } finally {
      setBusyPplId(null);
    }
  };

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

      {/* Pending Personnel — self-signups awaiting verification */}
      <div style={styles.sectionHead}>
        <h2 style={styles.h2}>Pending personnel</h2>
        <span style={styles.countPill}>{pendingPpl.length}</span>
      </div>
      {pendingPplQuery.loading && !pendingPplQuery.data ? (
        <LoadingBlock label="Loading sign-ups…" />
      ) : pendingPpl.length === 0 ? (
        <div style={styles.empty}>No personnel awaiting verification.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {pendingPpl.map((p) => (
            <PendingPersonnelCard
              key={p.id}
              p={p}
              onApprove={approvePpl}
              onReject={rejectPpl}
              busy={busyPplId === p.id}
            />
          ))}
        </div>
      )}

      <div style={styles.sectionHead}>
        <h2 style={styles.h2}>KYC applications</h2>
        <span style={styles.countPill}>{apps.filter((a) => a.status === 'pending').length}</span>
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
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  h2: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 18,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
    margin: 0,
  },
  countPill: {
    background: 'rgba(212, 169, 52, 0.10)',
    color: 'var(--text-warning)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    borderRadius: 'var(--radius-pill)',
    padding: '1px 8px',
    fontSize: 11,
    fontWeight: 700,
  },
  empty: {
    background: 'var(--surface-card)',
    border: '1px dashed var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    fontSize: 13,
    color: 'var(--text-tertiary)',
    marginBottom: 28,
  },
  emailChip: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 8px',
  },
  checklist: {
    background: 'rgba(212, 169, 52, 0.04)',
    border: '1px solid rgba(212, 169, 52, 0.15)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    margin: '8px 0',
  },
  checklistTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 4,
  },
  checklistList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 12,
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
  },
  docLink: {
    background: 'rgba(212, 169, 52, 0.08)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    color: 'var(--text-warning)',
    borderRadius: 'var(--radius-pill)',
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  },
  noDocs: {
    fontSize: 11,
    color: 'var(--text-overline)',
    fontStyle: 'italic',
    marginTop: 8,
  },
  extraCreds: {
    background: 'rgba(58, 138, 110, 0.06)',
    border: '1px solid rgba(58, 138, 110, 0.20)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    margin: '8px 0',
  },
  extraCredsLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-overline)',
    marginBottom: 6,
  },
  extraCredRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    padding: '4px 0',
  },
  credBtnRow: { display: 'flex', gap: 4, flexShrink: 0 },
  credVerifyBtn: {
    width: 28, height: 28,
    background: 'rgba(58, 138, 110, 0.15)',
    color: 'var(--color-sage-500)',
    border: '1px solid rgba(58, 138, 110, 0.30)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer',
  },
  credRejectBtn: {
    width: 28, height: 28,
    background: 'rgba(196, 48, 48, 0.10)',
    color: 'var(--text-danger)',
    border: '1px solid rgba(196, 48, 48, 0.25)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
  },
  nationalityChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(58, 138, 110, 0.08)',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(58, 138, 110, 0.20)',
    borderRadius: 'var(--radius-pill)',
  },
  nationalityForeign: {
    background: 'rgba(212, 169, 52, 0.10)',
    border: '1px solid rgba(212, 169, 52, 0.25)',
    color: 'var(--text-warning)',
    fontWeight: 600,
  },
  foreignTag: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    opacity: 0.85,
  },
};
