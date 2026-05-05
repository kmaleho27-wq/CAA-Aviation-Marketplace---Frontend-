# Pre-mortem — what if SACAA API access never lands?

The autoplan CEO review specifically flagged this scenario as the single most
dangerous wrong premise (P2). This doc walks through the worst case so we have
a working answer when a customer or investor asks "but how do you actually
verify a licence?"

## The bet

Naluka's marketing language is **"SACAA-compliance-gated marketplace"**. The
implicit promise: every verified person and part has been checked against
SACAA's records, in real time, by an authoritative source.

Reality today: `sacaa-verify` Edge Function tries SACAA's API, falls back to
the platform DB, and returns whichever it found. We have no guarantee SACAA
will ever grant API access — they're a regulator with no commercial incentive
to help a startup brand itself with their name.

## The pre-mortem

It's December 2027. SACAA still hasn't issued us API credentials. What does
Naluka look like? What survived?

**Things that lived:**

- The hash-chained audit ledger (`audit_event` + `verify_chain`). Every
  RTS sign-off, every escrow release, every dispute resolution is
  cryptographically chained. **A SACAA inspector or insurance underwriter
  can verify the integrity of any operator's last 12 months without
  asking SACAA.** This is the moat we already own.
- PayFast escrow rails — cleared their fence in 2026. Money flows.
- Document expiry watchdog — operators get 90/30/7-day alerts. This is
  pure SaaS value, no SACAA dependency.
- Operator-side bulk crew management. Airlines stay because we save
  them admin time, not because we verify against SACAA.
- MRO escrow flow — quote-to-RTS-sign-off is platform-internal, SACAA
  involvement is zero except for who's licenced.

**Things that died:**

- The "✓ SACAA-verified" claim. Already replaced with "📄 Documents on
  file" in TrustBadge component as defence in depth (see commit `524f540`).
- Real-time cross-checking when an operator views a candidate. Replaced
  with "verified by Naluka admin within 30 days" — a manually-staffed
  verification SLA.
- The marketing line "live SACAA e-Services integration". Replaced with
  "we maintain SACAA-equivalent records and give you a tamper-evident
  audit chain" — true, defensible, less sexy.

## The actual product

Without SACAA API, Naluka is **a compliance + escrow operating system for
African aviation operators**. The pitch:

1. **You already manage your crew compliance somehow** — usually a
   spreadsheet, a person, or both. We replace that with a structured
   product that nags everyone 90 days early.
2. **You already pay your contractors and AMOs somehow** — usually
   delayed invoices and trust. We replace that with PayFast escrow gated
   by digital sign-off.
3. **You already prepare for SACAA inspections somehow** — usually a
   panicked week of PDF hunting. We give you a one-click audit pack.
4. **The crew records you keep with us are checked manually by our
   verification team within 4 business hours of submission**, against
   the same public SACAA registries you'd check yourself. We just do it
   faster, more consistently, and we keep the receipts.

This is honest. It's also a smaller story than "live SACAA integration".
But it's a story we can ship today and that won't blow up the day a
journalist or competitor checks our claims.

## What changes if SACAA *does* grant API access

We add an **automated** verification layer on top of the manual one. The
TrustBadge flips a small subset of rows from "📄 Documents on file" to
"✓ SACAA-verified" with a timestamp. Marketing copy gains an asterisk.
Legal exposure on the badge claim drops to zero.

That's it. **The core product doesn't change.** Which means we should
build like SACAA API will never come, and treat its eventual arrival as
nice-to-have.

## Concrete commitments

1. **Marketing copy never claims real-time SACAA verification** — replaced
   with "Documents on file, manually verified within 4 business hours".
2. **The `sacaa-verify` Edge Function is renamed (mentally) to
   `crew-verify`** — its job is to return whatever we know about the
   crew member, with a `source: 'platform-db' | 'sacaa-api'` field that's
   visible in admin tooling.
3. **The badge component (`TrustBadge`) ships with two states from day
   one** — done in commit `524f540`. When SACAA API access lands, we add
   a third state without changing existing rows.
4. **The audit pack export** (`docs/roadmap.md` Tier 1) is the moat. It
   does NOT depend on SACAA — it's a hash-chained proof of the operator's
   own records. We market this hard.
5. **A "Verification SLA" page** — promise 4 business hours, document
   what's checked manually (SACAA pilot lookup, AMO certificate registry,
   AMP issue dates). This becomes the operator-facing SLA we're held to.

## The conversation that proves we're right

When a customer or investor asks "what's your moat?", the answer is **not**
"we have the SACAA API". It's:

> "We're the only platform that ships you an audit-ready, hash-chained
> proof of every transaction, every sign-off, every renewal — provable
> without needing SACAA to bless it. SACAA themselves can't give you that.
> When they eventually publish their own free verification portal, we
> still have escrow, audit, and the workflow your team already uses."

If that answer isn't compelling, we have a deeper product problem than
SACAA access.
