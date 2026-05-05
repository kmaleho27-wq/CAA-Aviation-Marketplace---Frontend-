import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

// Public /status page — no auth required. Shows whether each system
// is up. Used for sales credibility (link from footer "All systems
// operational") and as a transparency signal for paying customers.
//
// Pulls minimal data via the anon key. RLS gates which rows are visible.
// We don't need privileged data — we just need probes that confirm
// the API + Edge Functions + cron heartbeat are alive.

const PROBES = [
  {
    id: 'api',
    label: 'Supabase API',
    detail: 'PostgREST + Auth gateway',
    probe: async () => {
      const { error } = await supabase.from('mro_service').select('id', { head: true, count: 'exact' });
      // RLS may block reads — but the call returning anything other than a
      // gateway-level error means the API is up.
      return { ok: !error || !/upstream|connect/.test(error.message), detail: error?.message };
    },
  },
  {
    id: 'edge',
    label: 'Edge Functions gateway',
    detail: 'sacaa-verify probe (no auth — expect 401)',
    probe: async () => {
      try {
        const res = await fetch('https://hrimskndpuuvftdskuae.supabase.co/functions/v1/sacaa-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        // 401 = function alive + auth-required (correct behaviour).
        // 5xx or network error = gateway down.
        return { ok: res.status === 401 || res.status === 200, detail: `HTTP ${res.status}` };
      } catch (e) {
        return { ok: false, detail: e.message };
      }
    },
  },
  {
    id: 'site',
    label: 'naluka.aero',
    detail: 'Frontend (this page is loading, so… ✓)',
    probe: async () => ({ ok: true, detail: 'this page rendered' }),
  },
];

export default function Status() {
  const [probeResults, setProbeResults] = useState({});
  const [running, setRunning] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = {};
      await Promise.all(
        PROBES.map(async (p) => {
          try {
            results[p.id] = await p.probe();
          } catch (e) {
            results[p.id] = { ok: false, detail: e.message };
          }
        }),
      );
      if (!cancelled) {
        setProbeResults(results);
        setRunning(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allOk = Object.values(probeResults).every((r) => r.ok);
  const anyFail = !running && Object.values(probeResults).some((r) => !r.ok);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link to="/" style={{ textDecoration: 'none' }}><Logo size={28} subtitle="Aviation Platform" /></Link>
      </header>

      <main style={styles.main}>
        <div style={styles.overline}>System status</div>
        <h1 style={styles.h1}>
          {running
            ? 'Checking systems…'
            : allOk
              ? 'All systems operational'
              : anyFail
                ? 'Degraded service'
                : '—'}
        </h1>
        <div style={styles.lastChecked}>
          Last checked just now · auto-refreshes when you reload the page
        </div>

        <div style={styles.probes}>
          {PROBES.map((p) => {
            const r = probeResults[p.id];
            const tone = running ? 'pending' : r?.ok ? 'ok' : 'fail';
            return (
              <div key={p.id} style={{ ...styles.probe, ...styles[`probe_${tone}`] }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.probeLabel}>{p.label}</div>
                  <div style={styles.probeDetail}>{r?.detail || p.detail}</div>
                </div>
                <div style={{ ...styles.statusPip, ...styles[`pip_${tone}`] }}>
                  {tone === 'ok' ? '✓ Operational' : tone === 'fail' ? '✕ Issue' : '◌ Checking'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.footer}>
          <p>
            Detected an issue not shown here?
            Email <a href="mailto:support@naluka.aero" style={styles.link}>support@naluka.aero</a>.
            For AOG emergencies during a service degradation, escalate to
            <a href="mailto:aog@naluka.aero" style={styles.link}> aog@naluka.aero</a>.
          </p>
          <p style={styles.subFooter}>
            Audit chain integrity is verified continuously by our cron heartbeat
            (every 24 hours). Detailed audit-event integrity proofs are available
            via the <Link to="/app/audit-pack" style={styles.link}>Audit Pack</Link> for
            authenticated users.
          </p>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--surface-base)', display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 32px', borderBottom: '1px solid var(--border-subtle)' },
  main: { flex: 1, padding: '40px 32px', maxWidth: 720, width: '100%', margin: '0 auto' },
  overline: { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-overline)', marginBottom: 8 },
  h1: { fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 36, color: 'var(--text-primary)', letterSpacing: '0.01em', lineHeight: 1.05, marginBottom: 8 },
  lastChecked: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 28 },
  probes: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 },
  probe: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' },
  probe_ok: { borderColor: 'rgba(58, 138, 110, 0.25)' },
  probe_fail: { borderColor: 'rgba(212, 86, 86, 0.30)' },
  probe_pending: {},
  probeLabel: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  probeDetail: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' },
  statusPip: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' },
  pip_ok: { background: 'rgba(58, 138, 110, 0.15)', color: 'var(--color-sage-500)' },
  pip_fail: { background: 'rgba(212, 86, 86, 0.10)', color: 'var(--text-danger)' },
  pip_pending: { background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' },
  footer: { fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' },
  subFooter: { fontSize: 12, marginTop: 8 },
  link: { color: 'var(--text-warning)', textDecoration: 'none' },
};
