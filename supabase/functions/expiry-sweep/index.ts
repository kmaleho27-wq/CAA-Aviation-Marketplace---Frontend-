// expiry-sweep
//
// Scheduled by pg_cron (see 0003_pg_cron.sql). Walks the document table
// and flips status based on the expires date:
//   - verified → expiring   when  expires < now + 30 days
//   - expiring → expired    when  expires < now
//
// Documents with no expires date are skipped.
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

  // Two batched updates — set-based, no row-by-row loop needed.
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

  if (toExpiring.error) return errResp(toExpiring.error);
  if (toExpired.error)  return errResp(toExpired.error);

  return new Response(JSON.stringify({
    flipped_to_expiring: toExpiring.data?.length ?? 0,
    flipped_to_expired:  toExpired.data?.length ?? 0,
  }), { headers: { 'Content-Type': 'application/json' } });
});

function errResp(e: { message?: string }): Response {
  return new Response(`DB error: ${e.message ?? 'unknown'}`, { status: 500 });
}
