// stripe-webhook
//
// Stripe → us. Verifies the signature, dedupes by event.id AND by
// (intent_id, event_type) (review fix H2), then dispatches:
//
//   payment_intent.succeeded → transaction.status stays 'in-escrow'
//                              (money is held; RTS sign-off releases via release-funds)
//   transfer.created         → transaction.status = 'completed', audit funds.released
//   charge.refunded          → transaction.status = 'completed', audit funds.refunded
//
// All state changes go through `record_transaction_event` so the audit
// chain and transaction.status update atomically (review fix H1).
//
// config.toml: verify_jwt = false (Stripe signs the request; we verify in-handler).

import Stripe from 'npm:stripe@^17.0.0';
import { adminClient } from '../_shared/supabase.ts';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const stripe = stripeKey
  ? new Stripe(stripeKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;
// Deno doesn't have Node's sync crypto; use SubtleCrypto for HMAC verification.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (!stripe || !webhookSecret) {
    return new Response('Stripe not configured', { status: 503 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing stripe-signature', { status: 400 });

  // MUST read body as raw text — Stripe verifies bytes, not parsed JSON.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  const sb = adminClient();

  // Dedupe by Stripe event_id (covers retries of the same delivery).
  {
    const { data } = await sb
      .from('stripe_processed_event')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle();
    if (data) return jsonResponse({ received: true, dedupe: 'event_id', eventId: event.id });
  }

  // Extract transactionId + intent id and decide the state transition.
  type Plan = {
    txnId?: string;
    intentId?: string;
    newStatus?: 'in-escrow' | 'completed';
    auditType?: 'funds.released' | 'funds.refunded';
    payload: Record<string, unknown>;
    actOnTxn: boolean;
  };

  let plan: Plan;
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      plan = {
        txnId: intent.metadata?.transactionId,
        intentId: intent.id,
        newStatus: 'in-escrow',
        // No audit entry yet — escrow funded is operational, not chain-worthy.
        // The audit happens on RTS sign (sign_rts RPC) or release.
        auditType: undefined,
        payload: { intentId: intent.id, amount: intent.amount, currency: intent.currency },
        actOnTxn: true,
      };
      break;
    }
    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
      plan = {
        txnId: transfer.metadata?.transactionId,
        intentId: transfer.transfer_group ?? undefined,
        newStatus: 'completed',
        auditType: 'funds.released',
        payload: { transferId: transfer.id, amount: transfer.amount, destination: transfer.destination },
        actOnTxn: true,
      };
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      let txnId = (charge.metadata?.transactionId as string | undefined) ?? undefined;
      if (!txnId && typeof charge.payment_intent === 'string') {
        const { data } = await sb
          .from('transaction')
          .select('id')
          .eq('stripe_intent_id', charge.payment_intent)
          .maybeSingle();
        txnId = data?.id;
      }
      plan = {
        txnId,
        intentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined,
        newStatus: 'completed',
        auditType: 'funds.refunded',
        payload: {
          chargeId: charge.id,
          intentId: charge.payment_intent,
          refundIds: (charge.refunds?.data ?? []).map((r) => r.id),
        },
        actOnTxn: true,
      };
      break;
    }
    default: {
      // Acknowledge but don't act — keeps Stripe happy, leaves a footprint.
      await sb.from('stripe_processed_event').insert({
        event_id: event.id,
        intent_id: null,
        event_type: event.type,
      });
      return jsonResponse({ received: true, ignored: event.type });
    }
  }

  // Second dedupe: same intent + event_type already processed (different event.id).
  if (plan.intentId) {
    const { data } = await sb
      .from('stripe_processed_event')
      .select('event_id')
      .eq('intent_id', plan.intentId)
      .eq('event_type', event.type)
      .maybeSingle();
    if (data) {
      // Still record this delivery so future retries dedupe by event.id.
      await sb.from('stripe_processed_event').insert({
        event_id: event.id,
        intent_id: plan.intentId,
        event_type: event.type,
      });
      return jsonResponse({ received: true, dedupe: 'intent+type', eventId: event.id });
    }
  }

  // No txnId in metadata — log it and bail. (Probably a Stripe-test event.)
  if (!plan.txnId) {
    await sb.from('stripe_processed_event').insert({
      event_id: event.id,
      intent_id: plan.intentId ?? null,
      event_type: event.type,
    });
    return jsonResponse({ received: true, no_txn: event.id });
  }

  // Apply the state change atomically.
  if (plan.auditType && plan.newStatus) {
    const { error: rpcErr } = await sb.rpc('record_transaction_event', {
      p_transaction_id: plan.txnId,
      p_new_status: plan.newStatus,
      p_event_type: plan.auditType,
      p_actor_id: null,
      p_payload: plan.payload,
    });
    if (rpcErr) {
      // Log but don't dedupe — let Stripe retry.
      console.error('record_transaction_event failed:', rpcErr);
      return new Response(`DB error: ${rpcErr.message}`, { status: 500 });
    }
  } else if (plan.actOnTxn && plan.newStatus) {
    // Status change without audit (payment_intent.succeeded — escrow is funded).
    const { error: updErr } = await sb
      .from('transaction')
      .update({ status: plan.newStatus })
      .eq('id', plan.txnId);
    if (updErr) {
      console.error('transaction status update failed:', updErr);
      return new Response(`DB error: ${updErr.message}`, { status: 500 });
    }
  }

  // Mark this event as processed so future retries are no-ops.
  await sb.from('stripe_processed_event').insert({
    event_id: event.id,
    intent_id: plan.intentId ?? null,
    event_type: event.type,
  });

  return jsonResponse({
    received: true,
    processed: event.type,
    transactionId: plan.txnId,
  });
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
