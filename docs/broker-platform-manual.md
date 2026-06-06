# Naluka — Broker Platform Manual

**Version**: Broker MVP (June 2026)
**Audience**: brokers, buyers, suppliers using Naluka via Aeropreserve

---

## 1. What this platform is

Naluka is a **three-sided aviation parts marketplace** with a confidentiality-preserving broker model at its core. Built for the way real aviation brokerage actually works:

- **Buyers** (airlines, MROs, operators) need parts and want one trusted point of contact, not a directory of suppliers to chase
- **Suppliers** (part traders, OEM secondary market) have inventory and want consistent demand without managing thousands of buyer relationships directly
- **Brokers** (like Aeropreserve) are the trusted intermediary who already has both sides in their Rolodex — they want to scale that trust with software, not lose it

Naluka makes the broker the spine of the deal flow while keeping their middleman position protected by design.

---

## 2. The confidentiality model

This is the most important thing to understand about Naluka. **Buyers never see suppliers. Suppliers never see buyers.** Only the broker sees both sides.

| Who | Sees buyer identity? | Sees supplier identity? | Sees base price? | Sees retail price? |
|-----|---|---|---|---|
| **Buyer** | self only | ❌ never | ❌ never | ✅ broker's quote |
| **Supplier** | ❌ never | self only | ✅ their own | ❌ never |
| **Broker** | ✅ all | ✅ all | ✅ all | ✅ all |

This is enforced server-side at the database level — not just hidden in the UI. The buyer's database query literally cannot return a supplier name. The supplier's database query literally cannot return a buyer name. The broker's economic moat is structural, not aspirational.

---

## 3. The deal flow

```
BUYER                 BROKER              SUPPLIER
─────                 ──────              ────────
1. Posts RFQ ────►
                      2. Auto-matches
                         against
                         inventory
                                          
                      3. Sets markup
                         per match
                                          
                      4. Sends quote ────► (still invisible)
   ◄──── 5. Receives                       
         quote (price                      
         + broker name                     
         only)                             
                                          
6. Accepts ─────►                          
                      7. Confirms          
                         match              
                                          ────► 8. Receives PO
                                                (broker name +
                                                 agreed base
                                                 price only)
                                          
                                          9. Ships to broker
                      10. Buyer pays
                          Naluka holds
                          escrow            
                      11. Buyer confirms                                
                          receipt           
                      12. Naluka splits     ────► supplier paid base
                          and releases:           broker paid 50% markup
                                                  platform keeps 50%
```

---

## 4. For BUYERS

### What you'll do

#### Sign up
- Register at `naluka.aero/register`
- Pick "Operator" or "AMO" role depending on your business
- Provide your nationality (used for compliance verification path)

#### Post a request (RFQ)
- Navigate to **My Requests** (`/app/my-requests`)
- Click **+ New request**
- Fill in:
  - **Part number** (required) — exact or partial part number
  - **Description** (optional) — helpful context, e.g. "for CFM56 engine, A-Check rotation"
  - **Quantity** — how many you need
  - **Minimum condition** — New / Overhauled / Serviceable / As-removed
  - **Urgency** — Standard / Urgent / AOG
  - **Max price (optional)** — your ceiling in ZAR
  - **Notes** — special delivery requirements, certifications needed

Once submitted, the system auto-matches your request against broker inventory in milliseconds.

#### Receive and accept quotes
- Quotes appear under your request, normally within a few hours
- Each quote shows:
  - **Broker name** (your point of contact)
  - **Total price** (what you'll pay)
  - **Quoted markup %** (transparency on the broker's margin)
- Compare multiple quotes if your broker sends several options
- Click **Accept** on the one you want — the others auto-decline

#### Why you'll never see supplier names
By design. Your broker is your trusted middleman. They handle the supplier relationship — sourcing, vetting, payment, escalation. You only deal with them. This protects you from being directly poached and protects them from being disintermediated.

---

## 5. For SUPPLIERS

### What you'll do

#### Get onboarded
You'll receive an invitation from your broker (typically Aeropreserve via WhatsApp) with a registration link. When you register using the email your broker invited, your account is automatically linked to their network. Sign-up takes 2 minutes.

#### List your inventory
- Two paths:
  - **Manual listing** — use the **+ List a Part** button in the marketplace surface
  - **API integration** (coming soon) — grant Naluka read access to your existing inventory system; we pull listings nightly
- For each part, you specify:
  - Part number, name, description
  - Condition (New / Overhauled / Serviceable / As-removed)
  - Your **net price** (what you want to receive — Naluka pays you this)
  - Certifications (8130-3, EASA Form 1, SACAA Form 18, CofC)
  - Location + lead time

You don't set markup. **Your price is your price.** The broker layers margin on top — that's their problem, not yours.

#### Receive orders
- Navigate to **Broker Orders** (`/app/orders`)
- Each card shows:
  - **Broker name** (your counterparty for fulfilment)
  - **Part name + part number**
  - **Quantity + required condition**
  - **What you will receive** (your agreed base price)
  - **Accepted timestamp**

When a card appears, the broker has accepted a buyer's commitment. You ship to the broker's nominated address. Naluka releases payment on confirmed delivery.

#### Why you'll never see buyer names
By design. Your broker's reputation depends on being the single point of contact for their buyer network. Naluka enforces that boundary so you can both trust the platform.

---

## 6. For the BROKER (Aeropreserve)

### What you'll do

#### Onboard your network
- Your suppliers and customers are pre-loaded as "prospects" — accounts that exist in the database but haven't claimed themselves yet
- View your prospects in **Referrals** (`/app/referrals`)
- WhatsApp each one with a personal note + registration link
- When they register with the matching email, the auto-link trigger stamps you as their referrer automatically — no manual reconciliation

You can update each prospect's status (Invited → Contacted → Signed up) directly from the dashboard.

#### Set markup per item
- Navigate to **Inventory** (`/app/inventory`)
- Every part + service your suppliers have listed appears as a row
- Inline slider per row: drag from 20% to 200% to set markup
- Live preview: "Buyer sees [marked-up price]" updates as you drag
- Saves automatically 400ms after you let go of the slider — no submit button

Markups can differ per item. A rare turbine vane might be 150%; a common bushing might be 30%. You know your margins better than any algorithm.

#### Match RFQs to inventory
- Navigate to **Matchmaking** (`/app/matchmaking`)
- All buyer RFQs awaiting your quote, AOG-first
- Click into any request → see auto-suggested matches from your inventory
- For each match:
  - You see supplier name + country flag + base price + part details
  - Drag the markup slider to set per-match margin
  - Live calculations:
    - **You pay supplier** (base)
    - **Buyer sees** (base × markup)
    - **Your cut** (50% of markup amount)
- Click **Send quote to buyer →** when ready

You can quote multiple matches per request — the buyer can pick the best one.

#### Track your earnings
- Navigate to **Referrals** (`/app/referrals`)
- Four headline cards:
  - **Introductions** — total prospects you've brought in
  - **Signed up** — how many became real users
  - **Deals closed** — confirmed transactions
  - **Your cut owed** — money the platform owes you
- Money breakdown below the table:
  - Total markup captured (the whole platform margin)
  - Your 50% cut (confirmed deals)
  - Pending (deals in flight)
  - Paid out + owed

Money cards stay at "—" until first real deal closes.

---

## 7. Pricing and economics

### The deal math
For each transaction:

1. **Supplier listed price** (base) — e.g. ZAR 12,500
2. **Broker markup** (20%–200%) — e.g. 80% → ZAR 22,500 quoted to buyer
3. **Buyer pays** ZAR 22,500
4. **Supplier receives** ZAR 12,500 (their base)
5. **Naluka markup** = ZAR 10,000 (the difference)
6. **Broker cut** = 50% of markup = ZAR 5,000
7. **Platform fee** = 50% of markup = ZAR 5,000

Currently no per-transaction fees on top of markup. Suppliers don't pay listing fees. Buyers don't pay membership.

### Refunds and disputes
- Buyer requests refund → broker mediates first → if unresolved, Naluka admin arbitrates
- Supplier disputes (wrong part, late shipment) → broker mediates → admin escalation
- Successful refunds reverse the referral cut (broker doesn't earn on failed deals)

---

## 8. Security and trust

### Identity verification
- Every account starts in `pending verification` until admin checks documents
- KYC includes nationality, SACAA licence checks (for technical roles), Part 145 verification (for AMOs)
- Foreign nationals get the ICAO state-of-licence verification path automatically

### Audit chain
- Every regulated event (RTS signed, funds released, KYC approved, dispute opened) is appended to a hash-chained audit ledger
- The chain can be cryptographically verified at any point — tampering breaks every subsequent hash
- Operators can export their own segment of the chain for SACAA inspectors

### Compliance
- POPI Act compliant (South Africa data protection)
- Right to export your data — Settings → Privacy → Download my data
- Right to deletion — Settings → Privacy → Delete my account (90-day retention for counterparty traceability, then hard purge)

---

## 9. FAQ

**Q: Can I see who the supplier is on my quote?**
A: No. The platform enforces this server-side; even Naluka admin doesn't override it casually. Your broker is your interface to the supply side.

**Q: As a supplier, what if I'm shipping internationally?**
A: Currently you ship to the broker's nominated address. Cross-border logistics, customs, and currency conversion are handled by the broker as part of their value-add.

**Q: What if the broker disappears mid-deal?**
A: Naluka admin can step in as fallback broker. Escrowed funds are held by the platform, not the broker, so buyer funds are always protected.

**Q: How does payment work if the supplier is in the US but the buyer pays in ZAR?**
A: V1 is ZAR-only. Multi-currency (USD, GBP, EUR) is on the next-quarter roadmap.

**Q: Can I be a buyer AND a supplier on the same account?**
A: Yes. The same account can post RFQs AND list inventory. Different surfaces show different data.

**Q: Can multiple brokers compete for the same buyer?**
A: Not in V1. Each buyer is attributed to one broker (whoever introduced them). V2 may add competitive broker bidding.

**Q: What about AOG (Aircraft On Ground)?**
A: AOG requests are prioritised in the broker's matchmaking queue. Future versions will WhatsApp the broker directly for sub-30-minute response.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| **AMO** | Approved Maintenance Organisation (SACAA Part 145 certified) |
| **AOG** | Aircraft On Ground — emergency, ground stop until part fixed |
| **Auto-match** | System trigger that finds inventory matching a new RFQ |
| **Broker** | Trusted middleman; controls markup, owns both sides of relationship |
| **Buyer** | Operator / MRO who needs a part |
| **EASA Form 1** | European Aviation Safety Agency airworthiness release |
| **FAA 8130-3** | US Federal Aviation Administration airworthiness certificate |
| **Markup** | % above supplier base price the broker charges the buyer; 20–200% |
| **PO** | Purchase Order — broker's binding commitment to a supplier |
| **Prospect** | Imported contact who hasn't signed up yet; auto-links on sign-up |
| **Referral cut** | 50% of markup amount, paid to broker on confirmed delivery |
| **RFQ** | Request for Quote — buyer's part need |
| **RTS** | Release to Service — signed airworthiness statement |
| **SACAA** | South African Civil Aviation Authority |
| **Supplier** | Part trader, OEM secondary market, parts distributor |

---

## 11. Where to go next

- **Quick demo**: [naluka.netlify.app](https://naluka.netlify.app)
- **Production app**: [naluka.aero](https://naluka.aero) (custom domain pending DNS)
- **Support**: support@naluka.aero
- **Bugs / feature requests**: GitHub issues (internal)

Built by Naluka, backed by Aeropreserve.
