// Shared PayFast helpers for Edge Functions.
//
// PayFast (payfast.co.za) is a South African payment processor — used
// here in place of Stripe Connect because Stripe doesn't support ZA
// sellers as connected accounts. Their integration is hosted-checkout:
//
//   1. We POST signed payload → PayFast hosts the checkout page
//   2. User pays at PayFast
//   3. PayFast sends ITN (server-to-server) to our payfast-itn function
//   4. We verify the signature + call back to PayFast's validate endpoint
//   5. On COMPLETE we call record_transaction_event to flip status +
//      chain audit
//
// Signature: MD5 of `key=value&key=value&...&passphrase=...` where keys
// are in submission order (NOT sorted), values are URL-encoded uppercase
// (PHP urlencode default), excluding any empty fields and the signature
// field itself.

import { crypto as stdCrypto } from 'jsr:@std/crypto@1';
import { encodeHex } from 'jsr:@std/encoding@1/hex';

export const PAYFAST_LIVE_HOST = 'https://www.payfast.co.za';
export const PAYFAST_SANDBOX_HOST = 'https://sandbox.payfast.co.za';

export function payfastConfig() {
  const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID') ?? '';
  const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY') ?? '';
  const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? '';
  const live = Deno.env.get('PAYFAST_LIVE') === 'true';
  const enabled = Boolean(merchantId && merchantKey);
  return {
    merchantId,
    merchantKey,
    passphrase,
    host: live ? PAYFAST_LIVE_HOST : PAYFAST_SANDBOX_HOST,
    enabled,
  };
}

/**
 * URL-encode a value the way PHP's urlencode does — RFC 1738 with
 * uppercase hex digits and `+` for spaces. This is what PayFast's
 * signature algorithm expects.
 */
export function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Compute the PayFast signature for a set of fields. Order of keys is
 * preserved as given — DO NOT pass a sorted Map; PayFast wants the
 * order matching the form submission. Pass an array of [key, value]
 * tuples or a Map (which preserves insertion order).
 */
export async function pfSign(
  fields: Array<[string, string]>,
  passphrase: string,
): Promise<{ sig: string; signedString: string }> {
  const parts: string[] = [];
  for (const [k, v] of fields) {
    if (v === null || v === undefined) continue;
    if (k === 'signature') continue;
    // Include empty-string fields as `key=` — PayFast's ITN signature
    // includes empty fields even though their docs say to exclude them.
    // Verified against a real ITN payload (commit log).
    parts.push(`${k}=${pfEncode(String(v))}`);
  }
  let signedString = parts.join('&');
  if (passphrase) {
    signedString += `&passphrase=${pfEncode(passphrase)}`;
  }

  const buf = new TextEncoder().encode(signedString);
  const hash = await stdCrypto.subtle.digest('MD5', buf);
  return { sig: encodeHex(new Uint8Array(hash)), signedString };
}

/**
 * Server-side verification step required by PayFast: POST the received
 * params back to PayFast's /eng/query/validate endpoint. PayFast
 * responds with "VALID" if the params it sent are real (anti-replay /
 * anti-spoof). We always do this in addition to signature verification.
 */
export async function pfValidatePostback(
  params: URLSearchParams,
  host: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const text = (await res.text()).trim();
    return text === 'VALID';
  } catch (e) {
    console.error('[payfast] validate-postback failed:', e);
    return false;
  }
}

/**
 * IP-allowlist check (last layer of the 3-layer ITN auth: signature,
 * source IP, validate-postback). Approved PayFast source IPs from their
 * docs as of 2024.
 */
const PAYFAST_ALLOWED_IPS = new Set([
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.146',
  '197.97.145.147',
  '197.97.145.148',
  '197.97.145.149',
  '197.97.145.150',
  '197.97.145.151',
  '197.97.145.152',
  '197.97.145.153',
  '197.97.145.154',
  '197.97.145.155',
  '197.97.145.156',
  '197.97.145.157',
  '197.97.145.158',
  '197.97.145.159',
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
  '41.74.179.198',
  '41.74.179.199',
  '41.74.179.200',
  '41.74.179.203',
  '41.74.179.204',
  '41.74.179.210',
]);

export function isPayfastSourceIp(ip: string | null): boolean {
  if (!ip) return false;
  // Sandbox traffic comes from a wider set including Cloudflare. Skip the
  // strict check in sandbox; signature + validate-postback are still in force.
  if (Deno.env.get('PAYFAST_LIVE') !== 'true') return true;
  return PAYFAST_ALLOWED_IPS.has(ip.trim());
}
