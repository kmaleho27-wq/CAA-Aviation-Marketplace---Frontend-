# Naluka — Investor One-Pager

**One-line:** The compliance + escrow operating system for African
aviation. We help airlines and AMOs cut compliance admin from days
to minutes, prove it to SACAA inspectors with one click, and pay
contractors with the trust of a Part 145 contract.

**Stage:** Pre-revenue, post-MVP. Live platform at naluka.aero.
Currently in customer discovery — targeting 10 paid pilots in Q3.

**Founder:** [YOUR NAME] · [LINKEDIN] · [EMAIL]
**Based:** Johannesburg, South Africa
**Asking:** [TBD — typical pre-seed ZAR 3M–8M / USD 150k–400k for
12–18 month runway]

---

## Problem

Mid-market South African aviation operators (5–30 aircraft fleets,
~150 such operators in SA, ~600 across SADC) manage SACAA
compliance with **spreadsheets, panicked PDF hunts, and trusted
relationships in lieu of contracts**. Three pain patterns recur in
customer interviews:

1. **Document expiry surprises.** A pilot's Class 1 medical lapses
   by 2 days because nobody tracks it. SACAA finds it on
   inspection. Operator gets a finding, sometimes a suspension.
2. **Inspection prep takes 3 person-weeks.** Compliance officer
   hunts down PDFs from 47 sources. Often misses one.
3. **Contractor payment friction.** AMOs and contractors invoice
   and chase payment 30–90 days after work-complete. Operators
   pay in trust because there's no escrow. Both sides distrust the
   counterparty.

Existing tools (CAMP, AMOS, Rusada) are airframe-focused, enterprise-
priced, and culturally foreign to SA operators. Aviation
consultancies fix the symptom (manual compliance work) at R500–
R2000/hour but don't sell software. The market gap is software for
the compliance officer at a 15-aircraft charter operator who can't
afford AMOS and can't keep paying a consultancy.

## Solution

A web platform that delivers three pillars in order of pain:

1. **Document expiry watchdog** — every licence, medical, type
   rating tracked with auto-notifications at 90/30/7 days. Hash-
   chained audit ledger so SACAA can verify the operator's records
   aren't post-hoc.
2. **One-click audit pack** — operator picks a date range, gets a
   PDF + JSON bundle with hash-chain integrity proof. Inspection
   prep goes from 3 weeks to 3 seconds.
3. **PayFast escrow** for crew, parts, and MRO transactions. Money
   locks on hire, releases on digital sign-off. Both sides trust
   the platform, not each other.

Built. Live. We've shipped 30+ commits, 20 migrations, full
self-signup with discipline picker covering SACAA Parts 61-71 plus
non-licensed ground ops, MRO escrow MVP, POPI-compliant data
handling, mobile-responsive shells.

## Traction

- **Platform:** built in 4 months with AI-assisted development
  (Claude Code + paired tooling). Cost-to-build under $20k of
  founder time + $200/mo of infra.
- **Live demos:** to [N TBD — fill in real number or leave blank]
  early advisors / domain operators.
- **Customer development:** in active discovery — running 10
  paid customer interviews ($50 incentive each) targeting
  compliance officers, AMO ops managers, and aviation contractors.
- **Letters of intent:** [TBD — list any if you have them]

## Why now

- SACAA enforcement has tightened — fines and suspensions up YoY.
- Mid-market crews are increasingly contract — the post-COVID
  norm. Compliance tracking on a workforce you don't fully employ
  is harder than ever.
- Fintech rails (PayFast in ZA, Stripe internationally) finally
  make escrow cheap enough to bake in. Five years ago this was
  4× the cost to build.
- AI-assisted development collapsed the build cost. A solo
  technical founder can now ship a multi-tenant compliance
  platform in months, not years.

## Market

**TAM (South Africa):**
- ~150 mid-market operators × R12,500/month = R22.5M/yr ARR cap on
  operator subscriptions
- ~80 AMOs × R4,500/month = R4.3M/yr ARR cap on AMO subscriptions
- ~3% commission on transaction GMV. Estimated SA aviation crew
  contracting market: R200M/yr → R6M/yr commission.
- ~5% commission on parts marketplace GMV. Estimated: R500M/yr →
  R25M/yr commission.
- **Conservative TAM: R55M/yr ARR if we capture 100% of SA mid-
  market.** Realistic 3-year capture: 15–25% = R8M–R14M ARR.

**Expansion:**
- SADC pan-African aviation: ~10× SA TAM, but each country needs
  PayFast-equivalent rails + regulator localisation. 18-24 month
  expansion cycle per country.
- Insurance broker integration: aviation insurers pay for
  compliance attestations they currently get manually. Untapped.
- Enterprise tier (operators >30 aircraft + flag carriers):
  current product underprices for them; future Enterprise tier at
  R50k+/month feasible.

## Moat

When SACAA eventually publishes a free verification portal (they've
already done so for pilots), the platform's defensibility doesn't
collapse — it strengthens. We have:

1. **Hash-chained audit ledger.** SHA-256 over canonical JSONB,
   verifiable independently of SACAA. Inspectors can cryptographic-
   ally confirm an operator's record integrity without trusting us.
   Nobody else does this in SA aviation.
2. **PayFast escrow rails.** 12 months of integration depth — ITN
   replay protection, idempotency keys, signature verification.
   Hard to replicate by a regulator or consultancy.
3. **Embedded workflow.** Compliance officers use the platform
   daily. Switching cost real once 6 months of audit chain accrues.

## Competition

| Competitor | What they do | Our edge |
|---|---|---|
| **Spreadsheets + email** | The default | Structured product, notifications, audit trail |
| **CAMP** (mid-market) | Airframe maintenance tracking | Crew compliance native, escrow native, cheaper |
| **AMOS / Rusada** (enterprise) | Full E&M + MRO platforms | We're not their customer; different ICP |
| **Aerogenesis SA** (consultancy) | Manual SACAA work for SA operators | Partnership candidate, not competitor |
| **Aerlex / AvJobs** | Aviation jobs marketplace | They list. We close — escrow + sign-off + audit |
| **SACAA themselves** | Free pilot lookup | They can't build escrow or audit chain |

## Team

[FILL IN HONESTLY]

If solo: "Founder built the platform end-to-end. Aviation domain
expertise via [SOURCE — work history, family, SACAA relationships,
prior project, etc.]. Plan to hire [ROLE 1] and [ROLE 2] post-
funding."

If you have advisors / first hires lined up: list them here with
their relevance.

## Use of funds (if pre-seed)

| Category | % | Why |
|---|---|---|
| Founder + 1 hire (12 months) | 50% | Maintain build velocity; specialist hire (compliance / sales) |
| Sales + customer success (8 months) | 25% | Close 10–20 paying customers, learn what to build next |
| Legal + regulatory | 10% | POPI compliance audit, SACAA partnership negotiations |
| Infra + tooling | 5% | Supabase paid tier, Sentry paid tier, monitoring |
| Marketing + content | 5% | Targeted at compliance officers (LinkedIn, niche aviation press) |
| Reserve | 5% | Cushion |

## Milestones — next 12 months

| Month | Milestone |
|---|---|
| M+3 | 10 paid customer-dev calls completed; PMF question answered yes/no |
| M+6 | 3 paying operator customers; first audit pack used in real SACAA inspection |
| M+9 | 10 paying customers; Aerogenesis-style partnership locked in |
| M+12 | R500k ARR; SACAA API access conversation initiated; ready to raise seed |

## Risks

| Risk | Mitigation |
|---|---|
| SACAA API never granted | Already mitigated — `docs/pre-mortem-no-sacaa-api.md`. Audit chain is the moat regardless. |
| Slow B2B sales cycle | Discount-for-case-study early-customer offer (R6.5k/mo for 12 mo). |
| Single-founder execution risk | First post-funding hire mitigates. AI tooling extends solo runway. |
| POPI Act fine | Information Officer designated, processor agreements in place, lawyer review pre-launch. |
| Competitor (incl. SACAA) entry | Audit chain + escrow not replicable; embedded workflow creates switching cost. |

## Asks

If you're an investor reading this:

- 30-min Zoom for a live platform demo + Q&A
- Intros to operators / AMOs / aviation insurers in SA
- Intros to other African aviation regulators (Kenya CAA, NCAA
  Nigeria) for Tier 2 expansion conversations

[YOUR EMAIL] · [PHONE]

---

## Appendices (link-only — not on the one-page)

- Pre-mortem (no-SACAA-API future): `docs/pre-mortem-no-sacaa-api.md`
- Competitive map: `docs/competitive-map.md`
- Pitch deck: `docs/naluka-pitch.pptx`
- Sales pitch markdown: `docs/pitch-deck.md`
- Live platform: `naluka.aero`
- Public status: `naluka.aero/status`
- Privacy / POPI: `naluka.aero/privacy`
