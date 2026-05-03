// payfast-itn
//
// PayFast → us. The Instant Transaction Notification webhook. Receives
// form-urlencoded POST when a payment completes (or fails / is cancelled).
//
// Three-layer authentication per PayFast docs:
//   1. MD5 signature verification with passphrase
//   2. Source IP allowlist (production only)
//   3. Postback to PayFast's /eng/query/validate endpoint to confirm
//      the params we received match what they actually sent
//
// On payment_status = 'COMPLETE': call record_transaction_event RPC
// to flip status → 'completed' AND chain audit atomically (same path
// the original Stripe webhook used). Idempotent: dedupe by pf_payment_id.
//
// config.toml: verify_jwt = false (PayFast doesn't send a JWT).

import { adminClient } from '../_shared/supabase.ts';
import { payfastConfig, pfSign, pfValidatePostback, isPayfastSourceIp } from '../_shared/payfast.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // PayFast sends application/x-www-form-urlencoded
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  // Reconstruct field array in the order they arrived for signature check.
  // PayFast docs are explicit: SAME order, NOT sorted.
  const fields: Array<[string, string]> = [];
  for (const [k, v] of params) fields.push([k, v]);

  const cfg = payfastConfig();

  if (!cfg.enabled) {
    // Scaffold mode — accept without verification, log for debugging.
    console.log('[payfast-itn] received in scaffold mode:', Object.fromEntries(params));
    return new Response('ok (scaffold)', { status: 200 });
  }

  // ─── Layer 1: signature verification ────────────────────────────
  const receivedSig = params.get('signature') ?? '';
  const filteredFields = fields.filter(([k]) => k !== 'signature');
  const { sig: computedSig, signedString } = await pfSign(filteredFields, cfg.passphrase);
  if (receivedSig !== computedSig) {
    console.warn('[payfast-itn] signature mismatch', {
      received: receivedSig,
      computed: computedSig,
      signed_string: signedString,
      raw_body: rawBody,
      field_order: filteredFields.map(([k]) => k),
      passphrase_set: cfg.passphrase ? 'yes (' + cfg.passphrase.length + ' chars)' : 'no',
    });
    return new Response('Invalid signature', { status: 400 });
  }

  // ─── Layer 2: source IP allowlist (production) ─────────────────
  const sourceIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('cf-connecting-ip') ??
    null;
  if (!isPayfastSourceIp(sourceIp)) {
    console.warn('[payfast-itn] rejected source IP:', sourceIp);
    return new Response('Forbidden', { status: 403 });
  }

  // ─── Layer 3: postback validation ─────────────────────────────
  // Echo back to PayFast minus our signature. They respond "VALID" if
  // these params really came from them in the last few minutes.
  const echoParams = new URLSearchParams(rawBody);
  echoParams.delete('signature');
  const valid = await pfValidatePostback(echoParams, cfg.host);
  if (!valid) {
    console.warn('[payfast-itn] postback validation failed');
    return new Response('Validation failed', { status: 400 });
  }

  // ─── Idempotency ────────────────────────────────────────────────
  const pfPaymentId = params.get('pf_payment_id') ?? '';
  const txnId = params.get('m_payment_id') ?? params.get('custom_str1') ?? '';
  const status = params.get('payment_status') ?? '';

  if (!pfPaymentId || !txnId) {
    return new Response('Missing pf_payment_id or m_payment_id', { status: 400 });
  }

  const sb = adminClient();
  const { data: dupe } = await sb
    .from('stripe_processed_event')
    .select('event_id')
    .eq('event_id', pfPaymentId)
    .maybeSingle();
  if (dupe) {
    return jsonResponse({ received: true, dedupe: 'pf_payment_id' });
  }

  // ─── State transition ──────────────────────────────────────────
  // Only COMPLETE flips the transaction. Other statuses (FAILED,
  // CANCELLED) get logged but don't audit-chain.
  if (status === 'COMPLETE') {
    const { error: rpcErr } = await sb.rpc('record_transaction_event', {
      p_transaction_id: txnId,
      p_new_status: 'in-escrow',  // funds arrived; RTS sign still required to release
      p_event_type: 'funds.released',  // PayFast's "complete" = funds captured
      p_actor_id: null,
      p_payload: {
        pfPaymentId,
        amountGross: params.get('amount_gross'),
        amountFee: params.get('amount_fee'),
        amountNet: params.get('amount_net'),
        paymentMethod: params.get('payment_method'),
      },
    });
    if (rpcErr) {
      console.error('[payfast-itn] record_transaction_event failed:', rpcErr);
      return new Response(`DB error: ${rpcErr.message}`, { status: 500 });
    }
    // Also set the pf payment id on the transaction
    await sb.from('transaction').update({ stripe_intent_id: pfPaymentId }).eq('id', txnId);
  }

  // Always record the event so future deliveries dedupe.
  const { error: dedupeErr } = await sb.from('stripe_processed_event').insert({
    event_id: pfPaymentId,
    intent_id: pfPaymentId,
    event_type: `payfast.${status.toLowerCase()}`,
  });
  if (dedupeErr) {
    // Don't fail the whole request — state change already committed and
    // PayFast will treat a non-200 as a retry signal. Log loudly.
    console.warn('[payfast-itn] dedupe insert failed:', dedupeErr);
  }

  return jsonResponse({
    received: true,
    processed: status,
    transactionId: txnId,
  });
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
