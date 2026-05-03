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
 * IP allowlist — DISABLED.
 *
 * PayFast's documented IP ranges go stale faster than we can update them.
 * Real ITN traffic in production has been observed from 102.216.36.x
 * (AFRINIC) which isn't in any of their published lists. Maintaining
 * the allowlist creates more outages than it prevents intrusions.
 *
 * The other two layers are sufficient on their own:
 *   - MD5 signature with merchant-only passphrase (forge-resistant)
 *   - Server-to-server postback to /eng/query/validate (anti-replay,
 *     anti-spoof; PayFast confirms the params are theirs)
 *
 * If PayFast publishes a stable IP list as a JSON endpoint in future,
 * we can re-enable a dynamically-fetched allowlist as defense in depth.
 */
export function isPayfastSourceIp(_ip: string | null): boolean {
  return true;
}
