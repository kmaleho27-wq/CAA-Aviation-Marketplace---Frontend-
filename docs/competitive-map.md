# Competitive map

The autoplan CEO subagent flagged "no competitive section" as a critical
gap. This is the answer.

## Categories of competitor

Naluka straddles three product categories. Real competition shows up in
at least one of them, sometimes more.

```
                    Aviation marketplaces
                  (Aerlex, AvJobs, JSfirm)
                            |
                            |  ← personnel side
                            |
                  ┌─────────┴─────────┐
                  │       Naluka      │
                  └─────────┬─────────┘
                            |
                            |  ← compliance + escrow side
                            |
              ┌─────────────┴─────────────┐
              |                           |
   MRO/Compliance SaaS              Local SA consultancies
   (AMOS, CAMP, Rusada,            (Aerogenesis SA,
   Aerogility, IFS Aerospace)      Strategic Aviation Solutions)
```

## Personnel marketplaces (will eat the personnel side if we ship it bare)

### Aerlex
- **What they do:** Global aviation jobs marketplace, pilots and
  technicians. Listings, applications, profiles.
- **What they don't do:** Compliance verification, escrow, audit chain,
  document expiry tracking, anything regulator-shaped.
- **Will they enter SA?** Probably not as a first move — SA is a small
  TAM by their global standards and the regulatory localisation cost
  is high. They might enter via an aggregator if SA suddenly matters.
- **What we do they don't:** Compliance gating, escrow, SACAA-shaped
  documentation, audit chain integrity proofs.

### AvJobs / JSfirm
- Similar profile to Aerlex. Job-board model, no compliance layer.
- Same answer: lower threat unless we ship a personnel-only product.

### Implication
**If we ship personnel without compliance, we lose to Aerlex on
network effects.** Our defensible position is "personnel listings
that arrive with proof". Don't strip the compliance layer trying to
match their breadth.

## Compliance / MRO SaaS (the real competition for the wedge)

### CAMP (Certified Aviation Maintenance Programs)
- **What they do:** Aircraft maintenance tracking SaaS — track every
  AD, SB, life-limited part, due-date for every airframe in your fleet.
  Used by mid-tier operators (Comair-tier and up in SA) for decades.
- **Switching cost:** Real — CAMP holds maintenance histories that
  go back 20+ years for some operators. We don't displace this.
- **Their gap:** Crew compliance is bolt-on, not native. Audit pack
  generation is clunky. African localisation is non-existent.
- **Our angle:** Don't compete head-on with maintenance tracking.
  Sell *crew* compliance as the wedge, then add an integration story
  later if customers demand it.

### AMOS (Swiss-AS)
- **What they do:** Big enterprise MRO/M&E platform. Lufthansa, Cathay,
  many flag carriers. Comprehensive but heavyweight.
- **Switching cost:** Massive. They're embedded in flight operations.
- **Our angle:** AMOS customers are not our ICP. Naluka is for
  smaller-tier and mid-tier operators (5-50 aircraft fleets) who can't
  justify AMOS pricing.

### Rusada / ENVISION
- **What they do:** Mid-market M&E and MRO platform. AMOS-lite.
- **Switching cost:** Significant.
- **Our angle:** Same as AMOS — different ICP. We're for operators
  Rusada is too expensive or too generic for.

### Aerogility
- **What they do:** AI fleet planning + maintenance optimization.
  Heavy enterprise.
- **Threat to us:** None. Different problem.

### IFS Aerospace & Defense
- **What they do:** Tier-1 enterprise aviation ERP.
- **Threat to us:** None at our ICP.

### Implication
**The mid-market SA operator (1-30 aircraft, charter or scheduled,
crews of 10-200) does not currently have a fit-for-purpose tool.**
They use spreadsheets, generic ERPs, and CAMP if they're at the
bigger end. That's our gap.

## Local SA consultancies (potentially partners, potentially competitors)

### Aerogenesis SA
- **What they do:** SACAA compliance consultancy. Does the work
  manually for SA operators — submission packs, audit prep, regulatory
  liaison.
- **Switching cost:** Low for them, high for their customers (mostly
  relationship-based).
- **Threat to us:** Direct competition for the manual-compliance
  budget operators currently spend.
- **Opportunity:** **Partnership candidate.** They have the SACAA
  relationships and the operator trust we lack. Naluka could be the
  software they sell into their existing customers. Negotiable margin
  split or referral.

### Strategic Aviation Solutions
- Similar profile. Same logic: compete or partner.

### Various smaller consultancies
- Long tail of one-person shops doing SACAA paperwork at R500-R2000/h.
  Naluka eats their hourly billable work, but most of them don't have
  the volume to defend.

### Implication
**We should consider partnering with one or two SA aviation
consultancies before competing with them.** Their network is the
fastest path to first-customer revenue. Their margin is the cheapest
acquisition channel.

## SACAA itself

The single most important risk. SACAA can publish a free public
verification portal at any time — they have done so for pilots
already (the SACAA pilot lookup). When they do it for AMEs, ATCs,
and DAMEs, our "verified" claim becomes worse-than-them.

**Our defence:** the audit chain (`verify_chain` RPC) and escrow.
SACAA cannot replicate either. They're a regulator, not a payment or
audit platform. As long as our marketing doesn't depend on
"verification" being our core value, a free SACAA portal *strengthens*
us — every operator using SACAA's portal has more reason to want our
audit + escrow.

## What stops global competitors from entering SA in 12 months

1. **Regulatory localisation cost.** SACAA's parts (61-71) don't map
   1:1 to FAA/EASA/CASA. Building our discipline taxonomy correctly
   was non-trivial. A foreign player would underestimate this.
2. **Currency + payment rails.** PayFast is ZAR-domestic. Stripe doesn't
   support ZA sellers as connected accounts. Operating SA money flows
   from outside is hard.
3. **Banking + compliance overhead.** A foreign aviation platform
   handling SA escrow needs SARB (Reserve Bank) and FSCA (Financial
   Sector Conduct Authority) clearance. Months of work.
4. **POPI Act compliance.** Local data protection law with criminal
   penalties for breaches. Foreign platforms tend to slap a generic
   GDPR-like notice on it and hope.

## Implications for the plan

- **Don't market against Aerlex/AvJobs.** They're a different product.
- **Don't market against AMOS/Rusada.** They're a different ICP.
- **Do market against the spreadsheet** that 80% of mid-market SA
  operators use today. That's your real competitor.
- **Talk to Aerogenesis SA before customer #1.** They might be a
  short-cut to revenue.
- **Bake the audit chain into every demo.** It's the moat SACAA can't
  build, AMOS can't build, and consultancies can't build. Lead with it.
