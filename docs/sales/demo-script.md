# Demo script — 30-min customer-dev call

Walk-through for a Tier 0 customer-dev Zoom. Slide-by-slide
talking points + likely objections + the close.

**Pre-call:** Open `docs/naluka-pitch.pptx` in presenter view. Have
the live platform (`naluka.aero`) open in a second tab as a fallback
demo. Have your customer-dev tracking sheet open.

**Length:** 30 minutes hard cap. Save the last 5 minutes for the
close. Better to leave them wanting more than to overstay.

---

## Minutes 0–3 — Open

**Goal:** Set the frame. They should know within 90 seconds why
they're on this call and what you want from them.

**Script:**

> Thanks for taking the time. I'll keep this to 30 minutes. Quick
> agenda: I'll share my screen for ~15 minutes — show you what
> we've built and walk through how a customer like [THEIR ORG]
> would use it. Then I want to spend the rest of the time on your
> questions and your honest read. The only thing I'm asking for
> today is feedback — no commitment, no follow-up sales emails
> unless you ask me to.
>
> Sound fair? Anything you'd specifically like me to cover?

Then **listen for 30 seconds**. If they tell you what they care
about, prioritise that during the demo. If they say "go ahead",
proceed.

## Minutes 3–6 — Slide 1 (Cover) + Slide 2 (Problem)

**Slide 1 (Cover):** "Naluka — Compliance + Escrow OS for African
Aviation."

> One sentence: we help airlines and AMOs cut compliance admin from
> days to minutes, prove it to SACAA inspectors with one click,
> and pay contractors with the trust of a Part 145 contract.

Then go straight to the problem slide.

**Slide 2 (Problem):** the three customer quotes.

> Before I show you anything, I want to check: do these resonate?
> [Read the one most likely to apply to their org.] Is that
> familiar at [THEIR ORG]?

Then **shut up**. Whatever they say is the most valuable input of
the call. Take notes — verbatim if you can. If they don't recognise
any of these problems, they're not the ICP. Be honest about it
and pivot the call to their actual problem.

## Minutes 6–9 — Slide 3 (What We Do) + Slide 4 (Why Now)

**Slide 3 (3 pillars):** document expiry watchdog, one-click audit
pack, escrow.

> The three pillars in order of pain: track expiry so nobody flies
> with a lapsed medical, generate audit packs so SACAA inspections
> stop being a 3-week scramble, and put money in escrow so
> contractors and your finance team finally trust each other.

**Slide 4 (Why now):**

> Three trends made this product viable in 2026 that weren't true
> 5 years ago: SACAA's audit posture is hardening, mid-market
> aviation crew is increasingly contract not perm, and PayFast
> rails make escrow cheap enough to bake in.

Don't dwell. They'll engage on the parts they care about during
Q&A.

## Minutes 9–18 — Live demo

**Goal:** Show the *operator's view* end-to-end.

**Open the live site in your other tab, signed in as the seeded
operator account.** Walk through:

1. **Dashboard** — point at the AOG count, escrow total, expiring
   licences.
2. **Personnel** → "+ Add crew" and "Bulk import CSV". Show the
   discipline filter chips. Click into one crew member.
3. **Audit Pack** — open it, generate a 12-month pack live. Show
   the integrity proof at the top. This is the wow moment if
   they're a compliance officer — let it sit on screen for 10
   seconds.
4. **MRO Services** — show a quote being requested + the AMO's
   side of the workflow. Don't go full end-to-end (you don't have
   real money in escrow); say "and from there it goes through
   PayFast escrow exactly like crew hiring".
5. **Profile / Settings** — quickly: notification preferences, POPI
   right-to-export.

If they ask "can it do X?", be honest. "Yes, here's how" or "Not
yet, but it's on the roadmap and would be a fast addition" or
"No, and here's why we deliberately don't" — never pretend.

**Talking points to drop in during the demo:**

- "Notice every state change leaves an audit chain entry. SACAA
  inspectors get the receipt, not your word."
- "This badge says 'Documents on file', not 'SACAA-verified'. Until
  we have live SACAA API access, we don't claim more than we can
  prove."
- "Escrow takes 2 seconds. Funds release on digital sign-off, not
  on faith."

## Minutes 18–22 — Slide 8 (Pricing) + Slide 9 (Moat)

**Slide 8 (Pricing):** Three tiers.

> For an operator your size, you'd be on the OPERATOR tier — R12.5k
> a month plus 3% transaction commission. Free for your individual
> crew members. AMOs you work with would be on the AMO tier.

> If you're our first 5 paying customers I'm willing to discount
> to R6.5k for 12 months in exchange for a case study and
> introduction rights. That's an offer I'm prepared to make today.

**Slide 9 (Moat):**

> The reason we'll still exist in 5 years even if SACAA publishes
> a free verification portal: we have the audit chain, escrow rails,
> and the workflow embedded in your team's day. SACAA can't
> replicate any of that. We get stronger when verification becomes
> a commodity.

## Minutes 22–28 — The ask + Q&A

**Slide 10 (The Ask):**

> The honest question: would you pay R10k a month — or R6.5k under
> the early-customer offer — to replace your current compliance
> setup with this?
>
> Three answers and they're all useful to me:
>
> Yes, where do I sign — sign here, onboarding next week.
> Yes, but [some condition] — tell me what the condition is, that's
> the next sprint.
> No, here's why — that's the most valuable answer of the three.
>
> What's it for [THEIR ORG]?

Then **shut up and let them answer**. The temptation will be to
fill silence. Don't. Their answer is the most valuable thing in
the call.

**Listen for:**

- The exact words they use ("compliance officer", "expiry tracking",
  "8130 paperwork"). Mirror those words back into the marketing copy.
- Their objection. Write it down verbatim.
- What they actually want that we don't have. That's the next sprint.

## Minutes 28–30 — Close

Regardless of yes/no/maybe:

> Thank you, this was incredibly useful. Two things:
>
> 1. Would you be OK if I quoted [SOMETHING THEY SAID] in our
>    next round of customer development with [SIMILAR ROLE AT
>    OTHER ORG]?
>
> 2. Who else at [THEIR ORG] — or at peer organisations — should
>    I be talking to? I'm trying to talk to 10 operators / AMOs /
>    contractors before deciding what to build next.

The second question is the killer. **Every call should generate
1–2 referrals.** That's how you get to 10 calls without spending
on outreach.

If they said yes:

> I'll send you the contract and onboarding guide today. We can
> have you live by [DATE]. Anything you need from me to get
> internal sign-off?

If they said maybe:

> What would I need to show you in 30 days that would change a
> "maybe" into a "yes"? I want to know what to focus on next.

If they said no:

> Totally fair. If anything changes — or if a friend at another
> operator should see this — please send them my way.

---

## Likely objections + answers

### "We already use [CAMP / AMOS / spreadsheet / consultancy]."

> Good. We don't replace what they do, we replace what they
> *don't* do. CAMP tracks airframes, not crew. AMOS is too
> expensive for an operator your size. A spreadsheet doesn't
> notify you 90 days early. Naluka sits alongside whatever you
> have for the things they don't cover.

### "How is your verification different from SACAA's pilot lookup?"

> The badge on Naluka means we manually checked your record
> against the same registries you'd check yourself, and we keep
> a hash-chained audit trail of when we did it. So when SACAA
> inspects you, you're not asked to prove the licence is valid —
> you're asked to prove that *you checked* before you put the
> person on a flight. That's the audit chain, and it's the part
> SACAA can't give you for free.

### "What if SACAA builds their own version of this?"

> They probably will, for the verification piece. Already did for
> pilots. When they expand it, our verification stops being our
> moat — escrow and audit chain become it. We get easier to sell
> when verification becomes a commodity, because we own the parts
> of the workflow SACAA doesn't.

### "What about POPI compliance?"

> Information Officer designated, processor agreements in place,
> 90-day soft-delete with hard-purge after, in-app right-to-export.
> See `naluka.aero/privacy`. Happy to walk your data protection
> officer through it.

### "What's stopping me from building this myself?"

> Nothing. But the audit chain is hard to build right (we use
> hash-linked Postgres + SHA-256 over canonical JSONB), the
> compliance state machines have edge cases that take a year to
> shake out, and the SACAA partnership conversation alone takes
> months. R12.5k a month is cheaper than 6 months of one engineer.

### "What's your team behind this?"

Be honest. If it's just you, say so. **Don't pretend to be a 10-
person company.** "It's me, I built the platform end-to-end with
AI tooling. The reason I'm talking to you instead of more
engineers is that what we need next is your problem, not more
features." Most B2B buyers respect that more than fake gravitas.

### "What about pricing in [other African country]?"

> The platform is built for SA first. Pan-African expansion is
> Tier 2, dependent on (a) PayFast equivalent rails in the
> destination country, and (b) regulator-equivalent data feeds.
> If you operate cross-border, I'd love to understand which
> jurisdictions matter — that's the next territorial decision.

### "Who else is using this?"

If literally nobody yet, say so. **Don't lie.**

> You'd be among our first paying customers. That's why the
> R6.5k early-customer rate exists — we want partners, not
> proof-of-concept testers. In return I commit to weekly
> check-ins and shipping the changes that matter to you fastest.

That answer earns more credibility than fabricated logos.

---

## After the call

Within 4 hours:

1. Update your tracking sheet with verbatim notes.
2. Send a thank-you email summarising what they said and (if
   relevant) what you committed to.
3. If they referred you to anyone, send those follow-ups within
   24 hours.

Within 24 hours:

4. Pattern-match across all calls so far. Are 7/10 saying yes?
   You have PMF. Are they saying yes-but with the same "but"?
   That's your next sprint.
