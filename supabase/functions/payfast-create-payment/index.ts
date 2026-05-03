// payfast-create-payment
//
// Replaces the (Stripe-flavored) payments-create-intent for South African
// payments via PayFast. Called from src/api/parts.ts (procurePart) and
// src/api/personnel.ts (hireContractor).
//
// Flow:
//   1. Validate the calling user (JWT)
//   2. Look up the part / personnel row to get amount + display fields
//   3. Insert a transaction row in 'in-escrow' status, buyer_id = user
//   4. Build the signed PayFast payload
//   5. Return { transactionId, checkoutUrl, params } — frontend either
//      redirects to checkoutUrl OR posts a form to PAYFAST_HOST/eng/process
//      with the params (form-post is required for POST-only PayFast
//      sandbox; GET works in production with proper signing)
//
// Scaffold mode: when PAYFAST_MERCHANT_ID is unset, returns mock IDs
// so frontend flows still work without real credentials. Same pattern
// the original Stripe scaffold used — flip on when you have creds.
//
// config.toml: verify_jwt = true (caller must be the buyer).

import { adminClient, getCallingUser } from '../_shared/supabase.ts';
import { json, error, preflight } from '../_shared/cors.ts';
import { payfastConfig, pfSign } from '../_shared/payfast.ts';

const COMMISSION_RATE = 0.03;
const APP_BASE = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';

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

  // Lookup item
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

  const amountZar = parseAmount(amount);
  if (amountZar <= 0) return error('Cannot bill ZAR 0');
  const feeCents = Math.round(amountZar * 100 * COMMISSION_RATE);

  // Create transaction row
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

  const cfg = payfastConfig();

  // Scaffold mode — no merchant credentials, return mock IDs.
  if (!cfg.enabled) {
    const mockPfId = `pf_mock_${cryptoHex(12)}`;
    await sb.from('transaction').update({ stripe_intent_id: mockPfId }).eq('id', txnId);
    return json({
      transactionId: txnId,
      pfPaymentId: mockPfId,
      checkoutUrl: null,
      enabled: false,
      mode: 'scaffold',
      message: 'PAYFAST_MERCHANT_ID not set — mock IDs returned. See DEPLOY.md to wire real creds.',
    });
  }

  // Real PayFast: build signed form payload. Order of fields matters
  // for the signature (PayFast wants submission order, not sorted).
  const fields: Array<[string, string]> = [
    ['merchant_id', cfg.merchantId],
    ['merchant_key', cfg.merchantKey],
    ['return_url', `${APP_BASE}/app/transactions?pf=ok&txn=${txnId}`],
    ['cancel_url', `${APP_BASE}/app/transactions?pf=cancel&txn=${txnId}`],
    ['notify_url', `${Deno.env.get('SUPABASE_URL')}/functions/v1/payfast-itn`],
    ['email_address', user.email],
    ['m_payment_id', txnId],
    ['amount', amountZar.toFixed(2)],
    ['item_name', truncate(item, 100)],
    ['item_description', truncate(`${party} · ${kind}`, 255)],
    ['custom_str1', txnId],
    ['custom_str2', kind],
    ['custom_str3', user.userId],
  ];

  const signature = await pfSign(fields, cfg.passphrase);
  fields.push(['signature', signature]);

  const params = new URLSearchParams();
  for (const [k, v] of fields) params.set(k, v);

  return json({
    transactionId: txnId,
    pfPaymentId: txnId,           // m_payment_id is our id
    checkoutUrl: `${cfg.host}/eng/process?${params.toString()}`,
    params: Object.fromEntries(fields),
    enabled: true,
    mode: cfg.host.includes('sandbox') ? 'sandbox' : 'live',
  });
});

// ─── Helpers ────────────────────────────────────────────────────────
function parseAmount(s: string): number {
  // 'ZAR 142,500' → 142500
  return Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
}

function cryptoHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function makeTxnId(): string {
  const yr = new Date().getFullYear();
  const tail = Math.floor(Math.random() * 9000 + 1000);
  return `TXN-${yr}-${tail}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
