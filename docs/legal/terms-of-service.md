# Naluka — Terms of Service

**Effective date:** [DATE TBD]
**Last updated:** [DATE TBD]

> ⚠️ **Lawyer review required before launch.** This is starter copy
> drafted by Naluka's engineering team. It needs review by a South
> African attorney specialising in (a) the Protection of Personal
> Information Act ("POPI Act"), (b) consumer protection law (CPA),
> and (c) aviation-adjacent compliance issues before it goes live in
> production. Don't ship this as-is.

## 1. Who we are

Naluka ("we", "us", "the platform") is operated by [LEGAL ENTITY
NAME], a private company registered in South Africa under
registration number [REG NUMBER], with its registered office at
[REGISTERED ADDRESS].

You can reach us at:
- General: support@naluka.aero
- Information Officer (POPI): privacy@naluka.aero
- AOG / urgent operations: aog@naluka.aero

## 2. What Naluka does

Naluka is a software platform for South African aviation operators,
maintenance organisations (AMOs), aviation professionals, and parts
suppliers. Through Naluka you can:

- Maintain a digital record of crew compliance documents (SACAA
  licences, medicals, type ratings, Part 145 authorisations).
- Track document expiries with automated 90/30/7-day notifications.
- Generate audit packs for SACAA inspections.
- List parts, MRO services, and aviation crew on a marketplace.
- Pay and be paid via escrow held with PayFast, released on digital
  sign-off.
- Maintain a hash-chained audit ledger of regulated events.

**What Naluka is NOT:** Naluka is a platform, not a regulator and not
a SACAA-authorised certifier. We do not issue, withdraw, or determine
the validity of any SACAA licence, medical, or Part 145 approval.
References to "verification" on our platform mean we have records on
file that match the documents you uploaded — not that we have
independently certified those documents with SACAA. See the badge
states described in §6 below.

## 3. Acceptance and account eligibility

By creating an account, you confirm that:

- You are at least 18 years old.
- You have legal capacity to enter into binding contracts in South
  Africa.
- The information you provide about yourself or your organisation
  is accurate and current.
- You are authorised to bind any organisation you register on behalf
  of.
- You will keep your sign-in credentials confidential and accept
  responsibility for activity on your account.

We may suspend or terminate accounts where these conditions are not
met. See §11 (Termination).

## 4. Your obligations

When using Naluka, you agree to:

- Not impersonate another person or organisation.
- Not upload documents that are forged, altered, or that you don't
  have the right to share.
- Not represent any uploaded credential as "SACAA-verified" outside
  our platform unless we explicitly mark it that way.
- Not use Naluka to circumvent regulatory obligations (e.g. don't
  use the platform to hire a contractor whose licence has lapsed).
- Comply with all applicable South African aviation regulations,
  including but not limited to SACAA Civil Aviation Regulations
  (CARs), Part 145, and the Civil Aviation Act 2009.
- Pay applicable fees and commissions on time.

## 5. Verification of crew, parts, and AMOs

When you upload documents to Naluka:

- We will retain them in private encrypted storage (Supabase
  Storage, AES-256 at rest, TLS in transit).
- A Naluka administrator will perform a manual cross-check against
  publicly accessible SACAA records (the SACAA pilot lookup, the
  AMO certificate registry where applicable) within 4 South African
  business hours of submission.
- "Verified" status on Naluka indicates we have records matching
  the documents you uploaded — it does NOT constitute an
  authoritative SACAA validation.
- If we obtain live SACAA API access in future, profiles may be
  upgraded to "SACAA-verified" status with a clear visual
  distinction.

You remain responsible for the validity of your own documents.
Naluka does not warrant the accuracy of documents we did not
originate, and disclaims liability for any reliance you or any
counterparty places on platform records that subsequently prove
inaccurate. See §10 (Limitation of Liability).

## 6. Marketplace and transactions

### 6.1 Roles

- **Operator:** an airline, charter operator, or other entity that
  hires crew, procures parts, or contracts MRO services.
- **Aviation Professional / Contractor:** a SACAA-licenced (or
  non-licensed but aviation-credentialed) person who offers their
  services through Naluka.
- **Supplier:** a parts dealer, distributor, or manufacturer
  listing items for sale.
- **AMO:** a SACAA-approved Part 145 maintenance organisation
  offering MRO services.
- **Admin:** Naluka platform administrators.

### 6.2 Transactions

When a buyer initiates a transaction (hiring crew, buying a part,
accepting an MRO quote), funds are transferred via PayFast and
held in escrow. Funds are released to the seller only after:

- The licensed signatory completes a digital sign-off, OR
- An admin resolves a dispute in the seller's favour, OR
- The transaction otherwise reaches its terminal state per the
  state machine recorded in our audit ledger.

### 6.3 Commissions

Naluka takes the following commissions:

- **Aviation Professional / Contractor transactions:** 3% of the
  gross transaction value.
- **Parts transactions:** 5% of the gross transaction value.
- **MRO transactions:** 3% of the gross transaction value.

Commissions are deducted before funds are released to the seller.

### 6.4 Disputes

Either party may open a dispute via the platform. While a dispute
is open, escrowed funds are frozen. Naluka will arbitrate disputes
based on the audit chain record, uploaded documentation, and
direct communication with both parties. Naluka's dispute decision
is final unless overturned in subsequent legal proceedings.

### 6.5 Refunds

PayFast refunds are processed manually by Naluka admin on dispute
resolution or operator-initiated cancellation. Refund timelines
depend on PayFast and may take 5–10 business days. Naluka does not
charge a refund fee but may pass through any PayFast refund fee.

## 7. Subscription fees (where applicable)

Operators and AMOs may be charged a monthly subscription fee per
the pricing published on naluka.aero/pricing at the time of
sign-up. Fees are billed in advance, in ZAR, and are non-refundable
on a pro-rata basis except where required by law.

Pricing changes are notified at least 30 days in advance and apply
from the next billing cycle.

## 8. Data protection (POPI Act)

Naluka complies with the Protection of Personal Information Act 4
of 2013. See our [Privacy Policy](privacy-policy.md) for full
details on:

- What personal information we process and why
- Your rights of access, correction, and deletion
- How long we retain your data
- Cross-border data transfers
- Our Information Officer's contact details

You may request a data export or account deletion at any time via
your profile (POPI §23 right of access, §24 right of correction
and deletion). Deletion triggers a 90-day soft-delete (for
transaction-counterparty traceability) followed by permanent
purge.

## 9. Intellectual property

- The Naluka platform, software, designs, and brand are owned by
  [LEGAL ENTITY NAME].
- Documents you upload remain yours. By uploading, you grant
  Naluka a limited licence to store, process, display to authorised
  counterparties, and include in audit packs you generate, for the
  purpose of operating the platform.
- The hash-chained audit ledger is a service of Naluka. The
  cryptographic proofs we generate may be retained indefinitely
  for compliance and dispute purposes even after your account is
  closed.

## 10. Limitation of liability

To the maximum extent permitted by South African law, and subject
to non-excludable consumer rights under the CPA:

- Naluka does not warrant uninterrupted or error-free service.
- Naluka is not liable for losses arising from
  (a) document forgery or misrepresentation by users,
  (b) regulatory enforcement actions against users,
  (c) third-party service failures (PayFast, Supabase, SACAA),
  (d) the user's own non-compliance with aviation regulations.
- Naluka's aggregate liability for any claim is capped at the
  greater of (i) ZAR 10,000, or (ii) the total fees paid by the
  affected user to Naluka in the 12 months preceding the claim.
- Nothing in these Terms excludes liability for fraud, gross
  negligence, or claims that cannot be excluded by law.

## 11. Termination

You may close your account at any time via Profile → Delete my
account.

We may suspend or terminate your account if you breach these
Terms, engage in fraud, or use the platform unlawfully. Where
practical, we will give you written notice and an opportunity to
cure.

On termination:

- Outstanding escrow transactions follow their state machine to
  a terminal state (release, refund, or admin resolution).
- Personal data is retained for 90 days then purged per POPI.
- Audit chain entries are retained indefinitely for legal and
  compliance purposes.
- Outstanding fees remain due.

## 12. Governing law and dispute resolution

These Terms are governed by South African law. Any dispute is
subject to the exclusive jurisdiction of the South African courts
in [JURISDICTION TBD — usually Gauteng or where Naluka is
registered]. Where the user is a CPA-protected consumer,
mandatory consumer rights are not affected.

For non-litigation dispute resolution, parties agree to first
attempt resolution via [ARBITRATION PROVIDER TBD] before pursuing
litigation.

## 13. Changes to these Terms

We may update these Terms. Material changes (those affecting
fees, data handling, or your rights) will be notified at least 30
days in advance via email and an in-app banner. Continued use of
the platform after the effective date constitutes acceptance.

## 14. Contact

- Support: support@naluka.aero
- Privacy / POPI: privacy@naluka.aero
- Legal: legal@naluka.aero
- AOG / urgent ops: aog@naluka.aero
- Postal: [POSTAL ADDRESS TBD]

---

**Lawyer-review checklist before launch:**

- [ ] Confirm legal entity name + reg number + registered address
- [ ] Confirm exact commission rates with finance
- [ ] Confirm liability cap is enforceable under CPA / POPI
- [ ] Confirm jurisdiction clause (Gauteng vs operator's location)
- [ ] Confirm arbitration provider preference
- [ ] Confirm that "verified" disclaimer in §2 is sufficient
  defence against misrepresentation claims
- [ ] Confirm audit-chain indefinite retention is POPI-compatible
  (likely is, under §14 retention exemption for compliance)
- [ ] Confirm CPA cooling-off period treatment for the
  operator/AMO subscription tier (if applicable)
- [ ] Confirm cross-border data transfer language (Supabase EU
  region — see Privacy Policy)
- [ ] Confirm termination + dispute resolution language
- [ ] Decide on language version requirements (English mandatory;
  Afrikaans/other languages required by CPA?)
