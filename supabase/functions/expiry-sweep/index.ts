// expiry-sweep
//
// Scheduled by pg_cron (see 0003_pg_cron.sql). Walks the document table
// and flips status based on the expires date:
//   - verified → expiring   when  expires < now + 30 days
//   - expiring → expired    when  expires < now
//
// Documents with no expires date are skipped.
//
// On every run, we call record_cron_run(...) so cron_health shows
// liveness — see migration 0013. A 30-day silent failure used to be
// possible; now it isn't.
//
// Auth: pg_cron passes CRON_SECRET via x-cron-secret header.
// config.toml: verify_jwt = false.

import { adminClient, isCronAuthorized } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (!isCronAuthorized(req)) {
    return new Response('Forbidden', { status: 403 });
  }

  const sb = adminClient();
  const now = Date.now();
  const expiringThreshold = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expiredThreshold = new Date(now).toISOString();

  let toExpiringCount = 0;
  let toExpiredCount = 0;
  let alertsFired: Array<{ threshold: number; alerts_fired: number }> = [];
  let errMessage: string | null = null;

  try {
    const [toExpiring, toExpired] = await Promise.all([
      sb.from('document')
        .update({ status: 'expiring' })
        .eq('status', 'verified')
        .not('expires', 'is', null)
        .lte('expires', expiringThreshold)
        .gt('expires', expiredThreshold)
        .select('id'),
      sb.from('document')
        .update({ status: 'expired' })
        .eq('status', 'expiring')
        .not('expires', 'is', null)
        .lte('expires', expiredThreshold)
        .select('id'),
    ]);

    if (toExpiring.error) throw toExpiring.error;
    if (toExpired.error) throw toExpired.error;

    toExpiringCount = toExpiring.data?.length ?? 0;
    toExpiredCount = toExpired.data?.length ?? 0;

    // ── Fire 90/30/7-day alerts for upcoming expiries (migration 0015)
    // The RPC is idempotent per (doc, threshold) — running it on every
    // cron tick is safe and correct; ledger prevents duplicate alerts.
    const { data: alerts, error: alertErr } = await sb.rpc('sweep_document_expiry_alerts');
    if (alertErr) throw alertErr;
    alertsFired = alerts ?? [];
  } catch (e) {
    errMessage = (e as Error).message ?? 'unknown error';
  }

  // ── Heartbeat: record the outcome regardless of success/failure ─
  const totalAlerts = alertsFired.reduce((s, a) => s + (a.alerts_fired ?? 0), 0);
  await sb.rpc('record_cron_run', {
    p_job: 'expiry-sweep',
    p_ok: errMessage === null,
    p_rows_affected: toExpiringCount + toExpiredCount + totalAlerts,
    p_error_msg: errMessage,
  });

  if (errMessage) {
    return new Response(`DB error: ${errMessage}`, { status: 500 });
  }

  return new Response(JSON.stringify({
    flipped_to_expiring: toExpiringCount,
    flipped_to_expired:  toExpiredCount,
    alerts_fired:        alertsFired,    // [{ threshold: 90, alerts_fired: N }, ...]
  }), { headers: { 'Content-Type': 'application/json' } });
});
