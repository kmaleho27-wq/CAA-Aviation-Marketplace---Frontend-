# Naluka — Frontend API Contract

The frontend talks to a single REST API at `VITE_API_URL` (default
`http://localhost:5000/api`). In development, requests are intercepted by a
self-contained mock adapter at `src/api/mockAdapter.js`, so every page works
end-to-end without a backend running. Set `VITE_USE_MOCK_API=false` in `.env`
to send the same calls to your real backend.

All requests carry `Authorization: Bearer <jwt>` (set on login). A 401 from
any endpoint clears the token and bounces to `/login`.

---

## Auth

### `POST /auth/login`
Request: `{ email, password }`
Response: `{ token, user: { id, email, name, role } }`
Errors: `400` missing fields · `401` bad credentials.

### `POST /auth/register`
Request: `{ name, email, password, role }` where role ∈ `AME | AMO | OPERATOR | SUPPLIER`.
Response: `{ id, email, name, role }`.

### `GET /auth/me`
Returns the user encoded in the bearer token: `{ id, email, name, role }`.

---

## Operator dashboard

### `GET /dashboard/kpis`
Returns 5 KPI cards: `[{ label, value, sub, tone }]` (`tone` ∈ `primary|warning|success|aog|mustard`).

### `GET /dashboard/aog`
Returns active AOG events: `[{ id, reg, location, part, matches }]`.

---

## Marketplace

### `GET /parts?search=&category=`
Returns parts matching filters. `category=AOG Priority` filters to `aog: true` items.
Each item: `{ id, name, pn, cert, supplier, location, price, status, condition, aog }`.

### `POST /parts/:id/procure`
Locks escrow + creates a transaction. Response: `{ transaction: <Transaction> }`.

---

## Personnel

### `GET /personnel?filter=`
Filter values: `All | Available | Part 66 | Part 61 | Part 64 | Johannesburg | Cape Town`.
Each item: `{ id, name, initials, license, role, rating, types, location, status, expires, available, rate }`.

### `POST /personnel/:id/hire`
Returns `{ contractId, transaction }` and creates an in-escrow Personnel transaction.

---

## Compliance Vault

### `GET /documents?type=&status=`
Each item: `{ id, name, ref, type, issued, expires, status, cert }`.
`type` matches the type filter pills; `status` ∈ `verified | expiring | expired`.

---

## Transactions / Escrow

### `GET /transactions`
Each item: `{ id, type, item, party, amount, status, created, updated, aog }`.
`status` ∈ `rts-pending | in-escrow | completed | dispute`.

### `POST /transactions/:id/sign-rts`
Releases funds. Response: `{ transaction }` with `status: 'completed'`.
Errors: `400` if status was not `rts-pending`.

---

## Notifications

### `GET /notifications`
Each item: `{ id, type, title, title2, time, unread }`. `type` ∈ `aog | warning | success`.

### `POST /notifications/mark-all-read`
Response: `{ unread: 0 }`.

---

## Admin (Trust Engine)

All admin endpoints assume the JWT contains `role: 'ADMIN'` (mock skips this check).

### `GET /admin/overview`
`{ kpis: [...], recentKyc: [...], openDisputes: <number> }`.

### `GET /admin/kyc`
Each item: `{ id, name, type, license, docs[], risk, submitted, status }` with `status ∈ pending|approved|rejected`.

### `POST /admin/kyc/:id/approve`
### `POST /admin/kyc/:id/reject`
Mutate status; respond with the updated app.

### `GET /admin/disputes`
Each item: `{ id, item, buyer, seller, amount, reason, days, status }` with `status ∈ open|released|refunded|docs`.

### `POST /admin/disputes/:id/resolve`
Body: `{ outcome }` where outcome ∈ `released | refunded | docs`.

### `GET /admin/analytics`
`{ kpis: [...], gmv: [{ label, gmv, txns }], expiryWatch: [{ doc, name, days }] }`.

---

## Contractor (Mobile)

### `GET /contractor/wallet`
`{ user: <Profile>, docs: [...], earnings: [{ label, value, tone }] }`.

### `GET /contractor/jobs`
Each item: `{ id, title, airline, location, duration, rate, urgency, match, rating, accepted }`.

### `POST /contractor/jobs/:id/accept`
Marks `accepted: true` and returns the job.

### `GET /contractor/work-order`
Returns the active assignment: `{ aircraft, task, airline, reference, partUsed, payout, signed }`.

### `POST /contractor/work-order/sign`
Signs the digital RTS and returns the work order with `signed: true`.

---

## Payments (Stripe Connect — added in Phase B6)

### `GET /payments/status`
`{ enabled, commission, note }` — frontend can render a banner when
running in scaffold mode (no Stripe key set).

### `POST /payments/setup-account`
Body: `{ returnUrl }`. Creates an Express Connect account for the seller
(or returns a synthetic id in scaffold mode) and returns
`{ accountId, onboardingUrl, enabled }`.

### `POST /payments/intent`
Body: `{ transactionId }`. Creates a Stripe `PaymentIntent` for the txn
amount, persists `stripeIntentId` and the 3% application fee in cents.
Returns `{ intentId, clientSecret, enabled }`.

### `POST /payments/webhook` (raw body, signed)
Stripe webhook receiver. Uses `STRIPE_WEBHOOK_SECRET` to verify the
signature. Handles `payment_intent.succeeded`, `transfer.created/paid`,
`charge.refunded`. **No auth required** — Stripe authenticates via
signature.

---

## Compliance (SACAA — added in Phase B7)

### `GET /compliance/status`
`{ sacaa: 'live' | 'fallback', note }` — reports whether the SACAA
e-Services API is reachable or the platform DB fallback is in use.

### `GET /compliance/licence?licence=…`
`{ licence, valid, holderName, rating, expires, source, reason? }` —
verifies a SACAA licence number; falls back to the platform's `Personnel`
table when the live API isn't configured.

### `GET /compliance/medical?licence=…`
`{ licence, classOne, expires, source }` — class 1 medical certificate
validity for the licence holder.

### `GET /compliance/csd?csd=…`
`{ csdNumber, active, taxCompliant, source }` — National Treasury CSD
vetting (regex-based shape check in fallback mode).

---

## Audit (Hyperledger-style ledger — added in Phase B8)

### `GET /audit/recent`
Returns the latest 100 audit events. Each: `{ id, seq, type, subjectId,
actorId, payload, hash, prevHash, createdAt }`. Event types: `rts.signed`,
`funds.released`, `funds.refunded`, `kyc.approved`, `kyc.rejected`,
`dispute.opened`, `dispute.resolved`.

### `GET /audit/subject/:id`
All events for a transaction or KYC application id, oldest first.

### `GET /audit/verify` *(admin only)*
Re-derives every event's hash and walks the prev-hash chain. Returns
`{ valid, total, brokenAt?, reason? }`. SACAA inspectors can run this
against any production snapshot to detect tampering.

---

## Switching from mock to real backend

The real backend lives in `/server` (Express + TypeScript + Prisma + Postgres).
See [DEPLOY.md](./DEPLOY.md) for the Render + Vercel runbook.

1. Run the API locally OR deploy it (see DEPLOY.md).
2. In `.env`:
   ```
   VITE_API_URL=http://localhost:5000/api          # or https://naluka-api.onrender.com/api
   VITE_USE_MOCK_API=false
   ```
3. Restart Vite. No source changes required — `src/lib/api.js` swaps the axios
   adapter conditionally based on `VITE_USE_MOCK_API`.

### Demo credentials (mock only)

- `operator@naluka.aero` / `demo1234` (operator)
- `admin@naluka.aero`    / `demo1234` (admin)
- `contractor@naluka.aero` / `demo1234` (contractor)
- Any other email + a password starting with `demo` is also accepted as a guest operator.

### Pseudo-JWT format

The mock issues an unsigned JWT with the standard three-segment layout. The
real backend should issue a properly signed JWT containing at minimum:
`{ sub, email, name, role, iat, exp }`. The frontend reads `role` to decide
which sidebar/CTAs to surface, and `exp` for `isTokenValid()`.
