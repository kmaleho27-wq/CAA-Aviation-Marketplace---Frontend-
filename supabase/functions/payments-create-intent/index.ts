// payments-create-intent
//
// Called by src/api/parts.js (procurePart) and src/api/personnel.js
// (hireContractor). Creates a `transaction` row in 'in-escrow' status and
// a Stripe PaymentIntent, returning the client secret so the SPA can
// confirm the payment.
//
// Auth: requires a Supabase user JWT (verify_jwt = true in config.toml).
//
// Body:
//   { kind: 'parts' | 'personnel', partId?: string, personnelId?: string }
//
// Response:
//   { transactionId, intentId, clientSecret, enabled }
//
// "Scaffold mode": when STRIPE_SECRET_KEY is unset, returns mock intent
// IDs so the frontend flow still works in dev/CI.

import Stripe from 'npm:stripe@^17.0.0';
import { adminClient, getCallingUser } from '../_shared/supabase.ts';
import { json, error, preflight } from '../_shared/cors.ts';

const COMMISSION_RATE = 0.03;

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripe = stripeKey
  ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return error('Method not allowed', 405);

  const user = await getCallingUser(req);
  if (!user) return error('Unauthorized', 401);

  const body = await req.json().catch(() => null);
  if (!body) return error('Invalid JSON body');
  const { kind, partId, personnelId } = body as {
    kind?: 'parts' | 'personnel';
    partId?: string;
    personnelId?: string;
  };

  if (kind !== 'parts' && kind !== 'personnel') {
    return error('kind must be "parts" or "personnel"');
  }

  const sb = adminClient();

  // Look up the item to get amount + display fields
  let item: string;
  let party: string;
  let amount: string;
  let aog = false;

  if (kind === 'parts') {
    if (!partId) return error('partId required when kind=parts');
    const { data: part, error: partErr } = await sb
      .from('part').select('*').eq('id', partId).single();
    if (partErr) return error(`Part not found: ${partErr.message}`, 404);
    item = part.name; party = part.supplier; amount = part.price; aog = part.aog;
  } else {
    if (!personnelId) return error('personnelId required when kind=personnel');
    const { data: ppl, error: pplErr } = await sb
      .from('personnel').select('*').eq('id', personnelId).single();
    if (pplErr) return error(`Personnel not found: ${pplErr.message}`, 404);
    item = `${ppl.role} — ${ppl.name}`;
    party = ppl.name;
    amount = ppl.rate;
  }

  const amountCents = parseAmount(amount) * 100;
  if (amountCents <= 0) return error('Cannot bill ZAR 0');
  const feeCents = Math.round(amountCents * COMMISSION_RATE);

  // Create transaction row first so we have an id to attach intent metadata.
  const txnId = makeTxnId();
  const { error: txnErr } = await sb.from('transaction').insert({
    id: txnId,
    type: kind === 'parts' ? 'Parts' : 'Personnel',
    item, party, amount,
    status: 'in-escrow',
    aog,
    part_id: partId ?? null,
    personnel_id: personnelId ?? null,
    buyer_id: user.userId,
    application_fee_cents: feeCents,
  });
  if (txnErr) return error(`Failed to create transaction: ${txnErr.message}`, 500);

  // Scaffold mode: synth the Stripe IDs so the frontend flow works without keys.
  if (!stripe) {
    const intentId = `pi_mock_${cryptoHex(12)}`;
    await sb.from('transaction').update({ stripe_intent_id: intentId }).eq('id', txnId);
    return json({
      transactionId: txnId,
      intentId,
      clientSecret: `${intentId}_secret_mock`,
      enabled: false,
    });
  }

  // Real Stripe path
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'zar',
      metadata: { transactionId: txnId },
      receipt_email: user.email,
    });
  } catch (e) {
    return error(`Stripe error: ${(e as Error).message}`, 502);
  }

  await sb.from('transaction').update({ stripe_intent_id: intent.id }).eq('id', txnId);

  return json({
    transactionId: txnId,
    intentId: intent.id,
    clientSecret: intent.client_secret,
    enabled: true,
  });
});

// ─── Helpers ───────────────────────────────────────────────────────
function parseAmount(s: string): number {
  return Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
}

function cryptoHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeTxnId(): string {
  // Human-readable like the existing seed: TXN-YYYY-NNNN
  const yr = new Date().getFullYear();
  const tail = Math.floor(Math.random() * 9000 + 1000);
  return `TXN-${yr}-${tail}`;
}
