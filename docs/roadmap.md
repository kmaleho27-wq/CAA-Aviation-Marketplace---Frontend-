# Naluka Roadmap — As-Built (current state) + What's Next

**Last updated:** 2026-05-04 — replaces the original speculative roadmap with
what actually shipped + what's still on the table.

## What's actually been built (Tier 0 + Tier 1 fully shipped)

### Foundations (Sprint 0)

| Item | Where | State |
|---|---|---|
| Sentry client-side error monitoring | `src/lib/sentry.js` | ✅ Live, DSN wired |
| Vitest + first unit tests | `supabase/tests/unit/` | ✅ 13/13 passing |
| Cron heartbeat + watchdog | Migration 0013 | ✅ Live, all sweeps reporting |
| PayFast idempotency hardening | Migration 0014 | ✅ Live |
| Two-state TrustBadge | `src/components/TrustBadge.jsx` | ✅ Live, "Documents on file" by default |
| Orphan crew PII fix | Migration 0012 | ✅ Live |
| Vault for cron_secret | Migration 0004 | ✅ Live |

### Compliance SaaS wedge (Sprint 1A + 1B)

| Item | Where | State |
|---|---|---|
| IA spine — role-based sidebar nav | `src/data/mock.js` | ✅ Live |
| Document expiry watchdog → 90/30/7-day notifications | Migration 0015 + `expiry-sweep` | ✅ Live, deployed |
| Bulk crew CSV import | `BulkImportCrewModal.jsx` | ✅ Live |
| Audit pack export with hash-chained integrity proof | `/app/audit-pack` + `auditPack.ts` | ✅ Live |
| Welcome email post-verification | `send-welcome-email` Edge Function + Migration 0016 | ⏳ Deployed, awaiting `RESEND_API_KEY` secret |
| Onboarding cliff fix (5-screen checklist) | `OnboardingChecklist.jsx` | ✅ Live |

### Marketplace closing (Sprint 1C)

| Item | Where | State |
|---|---|---|
| AMO listing flow ("+ List a service") | `ListMroServiceModal.jsx` | ✅ Live |
| Customer support channel (`/app/support`) | Migration 0017 + `Support.jsx` | ✅ Live |
| POPI right-to-delete + right-to-export | Migration 0018 + `popi.ts` | ✅ Live |
| Mobile drawer for contractor shell | `MobileShell.jsx` | ✅ Live |
| MRO escrow MVP — quote/accept/escrow/release | Migration 0019 + `MroQuotesPanel.jsx` | ✅ Live, Edge Functions deployed |

### Personnel module (earlier)

| Item | Where | State |
|---|---|---|
| Discipline taxonomy (Parts 61-71 + non_licensed) | Migration 0006 | ✅ Live |
| Self-signup with discipline picker | Migration 0007 + `Register.jsx` | ✅ Live |
| Admin verification UI per discipline | Migration 0008 + `admin/KYC.jsx` | ✅ Live |
| Document upload to private bucket | Migration 0009 | ✅ Live |
| Operator-creates-personnel | Migration 0010 + `AddCrewModal.jsx` | ✅ Live |
| MRO marketplace foundation | Migration 0011 + `Mro.jsx` | ✅ Live |

---

## What's pending (your moves)

These are not engineering blockers — the platform works without them — but
ship them before commercial launch:

| Item | Effort | Why |
|---|---|---|
| **Custom domain** `naluka.aero` | ~30 min | `docs/custom-domain.md` runbook ready. Trust signal. |
| **Custom SMTP via Resend** | ~1 hour | `docs/custom-smtp.md` runbook ready. Auth emails out of spam. |
| **`RESEND_API_KEY`** Supabase secret | 5 min | Welcome emails actually fire |
| **ToS + Privacy Policy + POPI consent** | half day + lawyer | Required before paid users. Render at `/terms`, `/privacy`. |
| **Tier 0 customer-dev calls** | 2-3 weeks calendar | The most important non-engineering work. See `docs/pitch-deck.md`. |
| **Founder dogfooding** (30 days) | 30 days calendar | End-to-end RTS sign-off, audit pack, etc. as both engineer and operator |
| **Real-device mobile testing** | 1 hour | Mobile breakpoints shipped but iOS Safari quirks need real-device verify |
| **UptimeRobot** | 10 min | `docs/uptime-monitoring.md` runbook ready |

---

## Tier 2 — what real customers will likely ask for

Don't build this until at least 3 paying Tier 1 customers actually ask. But
here's the short list of likely candidates:

### Engineering candidates

| Item | Effort | Notes |
|---|---|---|
| **Audit logs visible per-operator with Merkle inclusion proofs** | 1 sprint | The compliance moat at scale. Currently `verify_chain` is admin-only — needs per-subject sub-chains. autoplan F6. |
| **Subscription billing** wired to pricing page | 1 sprint | Pricing page exists but is static. Wire PayFast recurring or Stripe Subscriptions. |
| **Mobile-responsive AppShell** (operator + admin) | 2 sprints | Currently only contractor shell is mobile-friendly. AppShell needs the same drawer treatment. |
| **MRO escrow tightenings** | 1 sprint | 8130 doc upload at "work complete", multi-step RTS sign-off, dispute UI, refund/cancel post-escrow. The current MVP is happy-path-only. |
| **Real-time AOG events via Supabase Realtime** | half day | Currently the dashboard count is fetched once. Live updates would be a nice demo. |
| **Discipline-specific KYC document validation** | 1 sprint | Current doc upload accepts anything. Could parse SACAA licence numbers, validate medical class on cert PDFs, etc. |

### Strategic candidates (decide before building)

| Item | Why decide first |
|---|---|
| **Multi-currency / multi-PSP** (KES, NGN, USD) | Pick PayFast OR Stripe per region — don't run both PSPs. autoplan F7. |
| **Stripe scaffolding cleanup** | Either commit to using Stripe for international or delete `stripe-webhook` / `payments-create-intent` / `stripe-onboard-return`. autoplan F10. |
| **Real SACAA API integration** | External dependency on SACAA. Pre-mortem in `docs/pre-mortem-no-sacaa-api.md` — assume it never lands. |
| **Insurance broker integration** | Possible high-margin partnership but deep regulatory work. |

### Explicitly deleted from earlier roadmaps

- ❌ Real-time AOG matching engine — autoplan flagged this as engineering vanity (50 events/year industry-wide; WhatsApp groups solve this).
- ❌ Native mobile apps — PWA suffices.
- ❌ Multi-language support (English / Afrikaans / French) — defer until pan-African expansion has signal.
- ❌ Carrier integrations (DHL etc) — defer; not on the critical path.
- ❌ Help centre at `docs.naluka.aero` — premature; FAQ on `/app/support` covers Tier 1.

---

## Risk register

The five risks from the autoplan we should re-check on every Tier 1 close:

| Risk | Status | Mitigation |
|---|---|---|
| SACAA API access never granted | Active | `docs/pre-mortem-no-sacaa-api.md` — audit chain is the moat |
| P1 (market demand) wrong | **Untested** | Tier 0 customer-dev calls — `docs/pitch-deck.md` |
| Tier 1 effort under-estimated | Resolved | Did re-estimate; shipped |
| SACAA publishes free verification portal | Future | Audit chain + escrow are differentiators |
| Operator-orphan crew PII leak | Resolved | Migration 0012 |
| Cron silent failure | Resolved | Migration 0013 + heartbeat |
| PayFast ITN replay double-release | Resolved | Migration 0014 idempotency |

---

## Decision history

The plan was reframed via `/autoplan` review on 2026-05-04 from "marketplace
with compliance" to "compliance SaaS as wedge, marketplace as upsell". The
original 3-tier speculation (A friendly beta / B paid sales / C self-serve)
collapsed into Tier 0 (validation) + Tier 1 (paying customers) + Tier 2
(decided by Tier 1 customers).

Restore point of original plan: `~/.gstack/projects/kmaleho27-wq-CAA-Aviation-Marketplace---Frontend-/main-autoplan-restore-20260504-210231.md`

---

## What "ship this to a real customer" looks like

The launch checklist before approaching paying customer #1:

- [ ] Custom domain live (`naluka.aero`)
- [ ] Custom SMTP — auth emails delivering
- [ ] ToS + Privacy + POPI consent live, lawyer-reviewed
- [ ] At least 5 Tier 0 customer-dev calls completed; WTP validated
- [ ] Audit pack export tested end-to-end with one real operator
- [ ] Welcome email + RESEND_API_KEY wired
- [ ] UptimeRobot monitoring all three endpoints
- [ ] Mobile-responsive smoke-tested on iPhone + Android
- [ ] Manual SACAA verification SLA documented (4 business hours)
- [ ] Sentry catching errors in production for at least 30 days

When all 10 are checked, we're past the technical bar and the question is
purely commercial.
