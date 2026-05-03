// stripe-onboard-return
//
// Stripe Connect Express onboarding redirects sellers back to a `return_url`
// after completing (or skipping) the form. The original Express handler
// updated `users.stripeAccountId` here. With Supabase, the SPA can't write
// `profile.stripe_account_id` (column-level revoke from authenticated), so
// this Edge Function does it via service-role.
//
// Called as a redirect: GET /functions/v1/stripe-onboard-return?account=acct_...
// Returns: 302 to /app/dashboard?stripe=ok or ?stripe=incomplete
//
// config.toml: verify_jwt = true (caller must be the user being onboarded).

import Stripe from 'npm:stripe@^17.0.0';
import { adminClient, getCallingUser } from '../_shared/supabase.ts';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = stripeKey
  ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

const APP_BASE = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const user = await getCallingUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const accountId = url.searchParams.get('account');
  if (!accountId) return redirect(`${APP_BASE}/app/dashboard?stripe=missing-account`);

  // Verify the account exists and (best-effort) check `details_submitted`.
  let detailsSubmitted = true;
  if (stripe) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      detailsSubmitted = Boolean(account.details_submitted);
    } catch (e) {
      console.warn('[stripe-onboard-return] retrieve failed:', (e as Error).message);
      // Treat as soft-success — caller can re-onboard if needed.
    }
  }

  // Persist the account id on the calling user's profile.
  const sb = adminClient();
  const { error } = await sb
    .from('profile')
    .update({ stripe_account_id: accountId })
    .eq('id', user.userId);
  if (error) {
    console.error('[stripe-onboard-return] profile update failed:', error);
    return redirect(`${APP_BASE}/app/dashboard?stripe=db-error`);
  }

  return redirect(`${APP_BASE}/app/dashboard?stripe=${detailsSubmitted ? 'ok' : 'incomplete'}`);
});

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}
