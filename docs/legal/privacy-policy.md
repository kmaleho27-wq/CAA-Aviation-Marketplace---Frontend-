# Naluka — Privacy Policy

**Effective date:** [DATE TBD]
**Last updated:** [DATE TBD]
**Information Officer:** [NAME], privacy@naluka.aero

> ⚠️ **Lawyer review required before launch.** This is starter copy
> that should be reviewed by a South African attorney before going
> live. POPI Act compliance is non-trivial and the Information
> Regulator can fine non-compliant operators.

## 1. Who we are

This Privacy Policy describes how Naluka ("we", "us", "the platform"),
operated by [LEGAL ENTITY NAME] (registration number [REG NUMBER]),
processes personal information under the Protection of Personal
Information Act, 4 of 2013 ("POPI Act").

## 2. Our Information Officer

In line with POPI Act §55, our designated Information Officer is:

- **Name:** [TBD]
- **Email:** privacy@naluka.aero
- **Postal:** [POSTAL ADDRESS TBD]

You can contact our Information Officer for any privacy questions,
requests under POPI §23 (right of access), §24 (right of
correction/deletion), or to lodge a complaint before escalating to
the Information Regulator.

## 3. What personal information we process

| Category | Examples | Purpose | Lawful basis |
|---|---|---|---|
| Identity | Name, date of birth, ID number, email, phone | Account creation, identity verification | Contract performance + consent |
| Aviation credentials | SACAA licence numbers, medical class, type ratings, AMO authorisations | Compliance verification, marketplace listing | Contract performance |
| Documents | Uploaded copies of licences, medicals, RTS certs, 8130 forms | Verification, audit packs, dispute evidence | Contract performance |
| Transaction data | Hires, parts purchases, MRO quotes, escrow events, payment refs | Marketplace operation, audit chain, regulatory reporting | Contract performance |
| Communication | Support tickets, in-app messages, email correspondence | Support delivery, dispute records | Legitimate interest |
| Technical | IP address, browser/device, error events | Security, debugging (Sentry), uptime | Legitimate interest |
| Operational metadata | Login times, page views, feature usage | Product analytics, fraud prevention | Legitimate interest |

## 4. How we collect personal information

- **From you directly** when you register, upload documents, request
  quotes, accept transactions, or contact support.
- **From your employer** if an operator adds you to their crew via
  bulk import (your operator certifies that they have your authority
  to share your information with us).
- **Automatically** via your browser (IP, user-agent, error events
  caught by Sentry).
- **From third parties** — PayFast for payment confirmations; SACAA
  public records when we manually verify a licence (no API access
  to SACAA at this time).

## 5. How we use personal information

We use your personal information to:

- Operate the platform (verify identities, list crew, process
  transactions, generate audit packs).
- Send you notifications you've opted into (document expiry alerts,
  AOG events, MRO quote updates, KYC outcomes, support replies).
- Comply with legal obligations (regulatory reporting, dispute
  arbitration, audit retention).
- Prevent fraud and protect the security of the platform.
- Improve the platform based on aggregate, de-identified usage
  patterns.

We will **not** use your information for direct marketing without
explicit opt-in. We will **not** sell your information to third
parties.

## 6. Who we share with

We share information only with operators, suppliers, AMOs, and
contractors as required to complete a transaction you initiate. We
also share with the following processors (POPI Act §72):

| Processor | What | Where | Why |
|---|---|---|---|
| **Supabase Inc.** | All platform data (Postgres, storage, auth) | EU region (Frankfurt) | Hosting + database |
| **PayFast (Pty) Ltd** | Payment metadata only | South Africa | Payment processing |
| **Resend** | Email recipient address + content | EU/US (Resend hosts) | Transactional email |
| **Sentry** | Error events with `user.id` + `role` (no PII) | DE region | Error monitoring |
| **Netlify** | Static hosting only (no PII at rest beyond build artefacts) | EU/US edge | Frontend delivery |

Each processor is bound by a data processing agreement requiring
POPI-compatible safeguards. Cross-border transfers are subject to
POPI §72 — we rely on (a) processor adequacy where applicable, and
(b) contractual safeguards equivalent to those in POPI Chapter 3.

## 7. Cross-border transfers

The Supabase project hosting your data is located in the EU
(Frankfurt). Some processors (Resend, Sentry) may also transfer to
the United States. POPI §72 requires that:

- The recipient is subject to a law providing protection
  substantially similar to POPI, OR
- The data subject (you) consents, OR
- The transfer is necessary for performance of a contract with you.

For Naluka, we rely primarily on (c) — your use of the platform
necessarily requires storing your data in our hosted environment.
If you object to EU storage of your data, please contact us at
privacy@naluka.aero before signing up — we cannot operate the
platform without that processor.

## 8. Retention

| Data type | Retention period |
|---|---|
| Active account profile | Until deletion + 90 days |
| Compliance documents | Until deletion + 90 days, OR longer if part of an open dispute or audit |
| Transaction records | 7 years from transaction date (CPA + tax law) |
| Audit chain entries | Indefinite (for compliance + dispute proof; see POPI §14 retention exemption for legal compliance) |
| Support tickets | 3 years from closure |
| Logs / Sentry errors | 90 days |

After deletion, your profile is anonymised (name → "Deleted user",
email scrubbed) but the underlying audit chain entries referencing
you remain — they identify you only by your user ID and the
discipline at the time of the event, not by name or contact.

## 9. Your rights

Under POPI Act §23 and §24, you have the right to:

- **Access** the personal information we hold about you. Use
  Profile → Settings → "Download my data" for an instant JSON
  export, or email privacy@naluka.aero for a formal access request.
- **Correct** inaccurate information. Edit your profile or contact
  privacy@naluka.aero.
- **Delete** your account. Use Profile → Settings → "Delete my
  account". For immediate hard-purge (vs the 90-day soft-delete),
  email privacy@naluka.aero with the reason.
- **Object** to processing for legitimate-interest purposes (e.g.
  notifications). Toggle off in Profile → Settings.
- **Restrict** processing where you contest accuracy. Email
  privacy@naluka.aero.
- **Lodge a complaint** with the Information Regulator if we don't
  resolve your issue:
  - https://inforegulator.org.za/
  - Email: enquiries@inforegulator.org.za

We respond to access and deletion requests within **30 days** as
required by POPI Act §23(1).

## 10. Security

- Database and storage are encrypted at rest (AES-256) and in
  transit (TLS 1.2+).
- Access to production data is limited to Naluka admins on a
  need-to-know basis with audit logging via the hash-chained
  ledger.
- We use row-level security (RLS) in our database so that even an
  authenticated user can only read records they are authorised to
  see.
- Documents you upload are stored in a private Supabase Storage
  bucket; access requires a signed URL valid for 60 seconds.
- We monitor for security incidents via Sentry. We will notify you
  and (where required) the Information Regulator within 72 hours
  of becoming aware of a personal information breach affecting
  your data, per POPI §22.

## 11. Children's data

Naluka is intended for adults (18+) and is not directed at
children. We do not knowingly collect children's personal
information. If you believe we have collected information about a
child, contact privacy@naluka.aero and we'll delete it promptly.

## 12. Cookies and similar technologies

We use cookies for:

- **Authentication** (session token in localStorage, set by
  Supabase Auth) — strictly necessary, no consent required.
- **Service worker / PWA caching** — strictly necessary for
  offline support and faster loads.

We do **not** use third-party advertising or tracking cookies. We
do not use Google Analytics. Sentry sets no cookies; it sends
errors via direct API calls.

## 13. Changes to this Policy

We may update this Privacy Policy. Material changes (those
affecting your rights, our processors, or retention periods) will
be notified at least 30 days in advance via email and an in-app
banner. The "Last updated" date at the top reflects the latest
revision.

## 14. Contact

- Privacy / POPI: privacy@naluka.aero
- Information Officer: [NAME] — privacy@naluka.aero
- Postal: [POSTAL ADDRESS TBD]
- Information Regulator (SA): https://inforegulator.org.za/

---

**Lawyer-review checklist before launch:**

- [ ] Confirm Information Officer is named and registered with the
  Information Regulator
- [ ] Confirm Supabase EU region storage is documented in a written
  data processing agreement (POPI §72)
- [ ] Confirm Resend + Sentry + PayFast + Netlify each have a
  written DPA with us
- [ ] Confirm 7-year transaction retention is correct under SARS +
  Companies Act
- [ ] Confirm audit-chain indefinite retention is defensible under
  POPI §14 (likely is, but get written sign-off)
- [ ] Confirm 72-hour breach notification protocol is defined
  internally
- [ ] Confirm cookies disclosure is sufficient (we don't use any
  marketing cookies, but check)
- [ ] If we add Google Analytics or other tracking later, this doc
  needs material update + 30-day notice
