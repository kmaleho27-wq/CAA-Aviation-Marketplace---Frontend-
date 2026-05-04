# Naluka Roadmap — Path to Real Clients (Revised)

**Status:** Approved 2026-05-04 via `/autoplan` review
**Replaces:** Speculative 3-tier plan (A: friendly beta, B: paid sales, C: self-serve at scale)
**Revision driver:** CEO + design + eng review surfaced a fundamental reframe — compliance SaaS as wedge, marketplace as network effect — plus 30-40% effort under-estimation on Tier B and a critical PII bug shipped today.

---

## TL;DR

We are pivoting the framing. **Compliance SaaS is the wedge product, marketplace is the upsell.** Document expiry watchdog + audit pack export sells to one airline at R8k–R40k/month. Marketplace becomes the network effect that emerges once Tier 1 customers' crews are already in the platform.

Two tiers, not three. Anything beyond Tier 1 is decided by the first 10 paying customers, not by us.

---

## Tier 0 — Foundations & Validation (~30 calendar days, ~1 sprint CC)

Everything below MUST be done before Tier 1 engineering starts. Most of it is non-engineering work — your time, not the codebase's.

### Validation work (you, not me)

- [ ] **10 paid customer-dev calls** with target ICP operators (R5k total). One question: "If this existed today with platform-DB verification, would you pay R10k/month for compliance + crew management?" Hard kill criterion if the answer is no.
- [ ] **Founder dogfooding** — 30 days running end-to-end RTS sign-off, 8130 doc upload, expiry watchdog, MRO quote-to-RTS, as both an engineer AND an operator persona. Fix every workflow gap you hit. You haven't done this end-to-end yet.
- [ ] **Pre-mortem the no-SACAA-API world** — write the Tier 1 pitch deck assuming SACAA API never lands. If the deck doesn't work in that world, the plan is wrong. The audit chain (already shipped) is the moat that doesn't depend on SACAA cooperation.
- [ ] **Competitive section** — explicit map of: Aerlex / AvJobs (will eat marketplace side if we ship it bare), CASA tooling (Aerogility, Rusada, AMOS, CAMP — switching cost is real, we don't displace them), Aerogenesis SA + boutique consultancies (real Tier 1 competition; consider partnering not competing), SACAA themselves (they could publish a free verification portal at any time — what survives that?).

### Engineering foundations (me)

- [ ] **Migration 0012 — orphan crew PII fix** (✅ ready to apply; ships in this commit)
- [ ] **Vitest + minimal unit test coverage** — PayFast signature gen, ITN parsing, audit canonical_jsonb. Prerequisite for any money-handling code. ~2 days.
- [ ] **`cron_run` heartbeat + watchdog query** — every Edge Function sweep writes `(job, started_at, completed_at, rows_affected, ok)`. Watchdog query alerts on any job missing >36h. ~half a day.
- [ ] **PayFast idempotency hardening** — add `idempotency_key` column to `transaction`, switch to UUID txn IDs (current `TXN-YYYY-NNNN` has 9000-row birthday collision around N=100), add CHECK constraint linking `type` → required FK column. ~2 days.
- [ ] **Sentry client-side + UptimeRobot health checks** — half a day.
- [ ] **Replace "Verified" badge with two states** — `Self-declared` (grey) and `SACAA-verified` (blue, shows verification timestamp + license number suffix). Until real SACAA API access lands, NO row gets the verified badge. Half a day.

### Non-engineering foundations (you)

- [ ] **Custom domain** (`naluka.aero`) — runbook in `docs/custom-domain.md`. ~30 min.
- [ ] **Custom SMTP via Resend** — runbook in `docs/custom-smtp.md`. ~1 hour.
- [ ] **Terms of Service + Privacy Policy + POPI Act consent** — half-day to draft, lawyer review separately. Render at `/terms` and `/privacy`. Consent checkbox on `/register`.
- [ ] **Trust-signal inventory** — 7 trust signals every page must emit (lock icon on data, SACAA reference visible, named human support contact, response-SLA badge, version/build footer, real address, named ToS author). 1 day.

**Tier 0 exit criteria:** WTP validated → Tier 1 starts. WTP not validated → re-think product before any more engineering.

---

## Tier 1 — Compliance SaaS to 1–3 paying operators (~5–6 sprints)

**Goal:** Ship a compliance SaaS product that one paying airline can use end-to-end. Marketplace stays available but is secondary, not the lead.

### Wedge product: Compliance SaaS

- [ ] **Document expiry watchdog as the lead feature** — schema supports it (`document.expires`), `expiry-sweep` Edge Function exists. Add notification + email at 90/30/7 days. Operator dashboard shows aggregated expiry view across their entire crew. **This is the lead bullet on naluka.aero/pricing.** ~3 days.
- [ ] **Audit pack export for SACAA inspections** — operator clicks "Generate audit pack for last 12 months" → PDF/ZIP with all RTS sign-offs, dispute resolutions, document trail, hash-chained verify_chain proof. ~1 sprint.
- [ ] **Bulk crew CSV import** — wraps `createPersonnelByOperator` with parser + dry-run validation. RLS-respecting (operator can't inject other operators' SACAA refs). ~3 days.
- [ ] **Lock IA spine** — role-based shells (Individual / Operator / AMO / Admin) with each role seeing only 4-5 nav items. Compliance features (expiry, audit, escrow) progressive-disclose inside the relevant entity, not top-level nav. Half-day strategy work.

### Marketplace stays alive but secondary

- [ ] **AMO listing flow** — convert "+ List a service" placeholder into working modal. Mirror `AddCrewModal` pattern. ~3 days.
- [ ] **MRO escrow + 8130 doc + RTS sign-off flow** — re-estimated to 2–3 sprints (NOT 1). New `mro_quote` table, extended transaction.type enum, quote-acceptance state, doc upload flow with regulatory implications. **Sprint-level spec required before coding.**
- [ ] **"Awaiting Review" → 5-screen onboarding journey** — browse-in-read-only-preview, complete profile, set notification preferences, view 3 nearest local listings, ETA badge. Fixes the activation cliff. ~3 days.

### Mobile day-one for 4 critical flows ONLY

- [ ] RTS sign-off (engineers don't sign at desks)
- [ ] 8130 doc viewer (engineers read at hangar)
- [ ] AOG event response/accept (deep-link from notification)
- [ ] Document upload (camera capture, not file picker)

Everything else stays desktop-first through Tier 1.

### Operations & polish

- [ ] **States matrix per feature** — for every Tier 1 feature, enumerate `{empty, loading, partial, error, success, in-progress/limbo}` before ship. 1-day exercise per feature; blocks ship.
- [ ] **Customer support channel** — `support@naluka.aero` mailbox + contact form route + 24-hour response SLA. ~2 days.
- [ ] **POPI Act compliance audit** — data residency check (Supabase region matters), data export RPC, right-to-delete RPC. ~3 days.
- [ ] **Welcome email** triggered post-verification by admin.

### Tier 1 exit criteria

- 1 paying airline contract closed
- 50+ verified personnel in their team
- First successful audit pack generated for a SACAA inspection (or simulated inspection)
- No critical bugs in 30-day window

---

## Tier 2 — Whatever Tier 1 customers ask for (no spec)

**Replaces:** the original speculative 8-item Tier C list (subscription billing, mobile-responsive everywhere, POPI right-to-delete, audit logs visible to operators, real-time AOG matching, marketing assets, help centre, multi-currency).

**Why no spec:** the previous Tier C was eight unrelated workstreams glued together. By the time we get there, real paying customers will tell us what's actually missing. Building speculatively now wastes the most expensive 6 months of any startup.

**Likely candidates** (NOT commitments):

- Subscription billing wired to pricing page (currently static)
- Audit logs visible per-operator with Merkle inclusion proofs (1 sprint, not 3 days)
- Mobile-responsive pass on remaining pages (2 sprints, not 1)
- Multi-currency / multi-PSP (PayFast for ZAR, Stripe for international, ship one at a time, not both in parallel)
- POPI data export / delete UI

**Explicitly DELETED from previous Tier C:**

- ❌ **Real-time AOG matching engine** — AOG events in SA are perhaps 50/year industry-wide. Algorithm for that volume is engineering vanity. WhatsApp groups solve this today. Current static seeded `aog_event` rows continue to demo the concept; no real engine.
- ❌ **Help centre at docs.naluka.aero** — premature; build when 50+ users have asked the same question 3 times.

---

## Cross-tier risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| SACAA API access never granted | Critical | Tier 0 pre-mortem; audit chain is the moat; replace "Verified" with "Documents on file" wording |
| P1 (market demand) wrong | Critical | Tier 0 customer-dev calls; hard kill criterion |
| Tier 1 effort under-estimated by 30-40% | High | Re-estimated up; Sprint 0 hardening before Tier 1 starts |
| SACAA publishes free verification portal | Medium (12mo) → High (3yr) | Audit chain + escrow are differentiators they can't easily replicate |
| Operator-orphan crew PII leak | Critical (existing) | Migration 0012 ✅ shipping with this commit |
| Cron silent failure for 30 days | High | `cron_run` heartbeat in Sprint 0 |
| PayFast ITN replay double-release | High | Idempotency_key + UUID txn ID in Sprint 0 |

---

## Things explicitly out of plan (deferred indefinitely)

These were in the original speculative plan or floated by reviews. Parked here so we don't pretend they're committed:

- Native mobile apps (PWA suffices)
- Multi-language support (English-only is fine for SA + initial pan-African)
- Carrier integrations (DHL, courier rates for parts shipping)
- Insurance broker integration (could be Tier 2 if customers ask)
- Real-time AOG matching engine (deleted — see above)
- Help centre / docs site (deferred until customer demand)
- Marketing assets — case studies / demo video (deferred until 3+ Tier 1 customers exist)
- Multi-PSP architecture (commit to one PSP for international before Tier 2)
- Subscription billing self-serve (sales-led for Tier 1)

---

## Premises explicitly tested (or queued for testing)

| # | Premise | Status |
|---|---|---|
| P1 | Aviation pros + operators want a compliance product, marketplace optional | **TIER 0 VALIDATES** |
| P2 | SACAA API integration achievable on useful timeline | **PRE-MORTEM ASSUMES NO** |
| P3 | Compliance SaaS as wedge, marketplace as upsell, is right framing | **REVISED FROM ORIGINAL** |
| P4 | Trust signals are part of the product — but compliance value is the bigger constraint | **REFINED** |
| P5 | PayFast for ZAR, Stripe for international — pick ONE per region | **DECIDED** |
| P6 | Sales-led for Tier 1, self-serve maybe in Tier 2 | **ACCEPTED** |
| P7 | Founder hasn't end-to-end-tested as engineer/operator | **TIER 0 VALIDATES** |
| P8 | Speculative Tier C is wrong shape | **DELETED** |

---

## Decision log

The `/autoplan` review of 2026-05-04 produced 21 decisions:
- 11 auto-decided per the 6 principles
- 3 taste decisions accepted
- 7 user challenges all accepted ("approve as-is")

Restore point of original 3-tier plan: `~/.gstack/projects/kmaleho27-wq-CAA-Aviation-Marketplace---Frontend-/main-autoplan-restore-20260504-210231.md`
