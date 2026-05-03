# Naluka — Aviation Ecosystem Marketplace

> Africa's aviation trust engine — verified parts, verified personnel,
> compliance built into every transaction.

[Live demo](https://naluka.netlify.app) · [Design system](./design-reference) (gitignored)

---

## What's in this repo

```
.
├── src/                    Vite + React frontend (Netlify)
├── design-reference/       Source-of-truth design system (zips, gitignored)
├── supabase/               Postgres schema, RLS, Edge Functions
│   ├── migrations/         0001_init, 0002_user_rpcs, 0003_pg_cron
│   ├── functions/          Deno Edge Functions (Stripe, SACAA, sweeps)
│   └── config.toml         Project + auth + storage + functions config
├── scripts/seed-supabase.mjs  One-shot demo-data seeder (service-role)
├── DEPLOY.md               Supabase + Netlify runbook
└── README.md               This file
```

Three user surfaces, one codebase:
- **Operator web app** at `/app/*` — Dashboard, Marketplace, Personnel, Vault, Transactions
- **Contractor mobile app** at `/m/*` — Wallet, Jobs, Sign-off, Profile (rendered in a phone frame on desktop)
- **Admin trust engine** at `/admin/*` — KYC queue, dispute resolution, analytics

Public marketing pages at `/` and `/pricing`.

---

## Quick start

### 1. Frontend only (mock API — UI demo, no backend needed)

```bash
npm install
npm run dev                # http://localhost:5173
```

Demo credentials: `operator@naluka.aero` / `demo1234`. The mock adapter
serves canned fixture data for the auth flow; the rest of the pages will
show empty / error states without a live Supabase project.

### 2. Frontend + Supabase (real backend)

```bash
# 1. Create a free Supabase project at https://app.supabase.com
# 2. Apply the schema:
supabase link --project-ref <your-ref>
supabase db push

# 3. Seed demo data (service-role required):
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run db:seed

# 4. Configure the frontend
cp .env.example .env
# Paste VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY, set VITE_USE_MOCK_API=false

npm install
npm run dev                # http://localhost:5173
```

### 3. Production deploy

See [DEPLOY.md](./DEPLOY.md) for the full Supabase + Netlify runbook
(13 sections: project setup, migrations, secrets, Stripe wiring, custom domain).

---

## Tech stack

**Frontend** (React 18 + Vite 5)
- Routing: react-router-dom v6 (BrowserRouter)
- Data: `@supabase/supabase-js` for queries, RPCs, storage, and auth
- Auth: Supabase Auth (email/password), session in localStorage,
  custom JWT claim `app_role` from `profile.role` for RLS predicates
- Styling: inline style objects + CSS custom properties (no Tailwind, no UI lib)
- Mock mode: `VITE_USE_MOCK_API=true` keeps the auth flow alive against
  fixtures via the legacy axios adapter (UI-demo only — D3 decision)

**Backend** (Supabase)
- Postgres 15 with Row Level Security on every public table
- 14 domain tables, 14 enums, plus support tables (`stripe_processed_event`,
  `rate_limit`)
- Hash-chained `audit_event` table — append-only ledger with deterministic
  SHA-256 chain. Append goes through `audit_append()` plpgsql function
  (`ACCESS EXCLUSIVE` lock, `MAX(seq)+1` inside the lock). `verify_chain()`
  runs as admin to detect tampering.
- 6 user-callable RPCs in `0002_user_rpcs.sql`: `sign_rts`, `approve_kyc`,
  `reject_kyc`, `resolve_dispute`, `accept_job`, `sign_work_order`
- Storage: private `vault` bucket for compliance documents, RLS-gated
  signed-URL downloads
- Edge Functions (Deno):
  - `payments-create-intent` — Stripe PaymentIntent + transaction insert
  - `stripe-webhook` — signature verification, two-level dedupe, atomic
    `record_transaction_event` writes
  - `stripe-onboard-return` — Connect Express return URL handler
  - `sacaa-verify` — SACAA e-Services proxy with platform-DB fallback
  - `sacaa-sweep` / `expiry-sweep` — daily `pg_cron`-triggered jobs

---

## Supabase data model

The schema lives in `supabase/migrations/0001_init.sql`. RLS predicates use
the JWT custom claim `app_role` (set by the `custom_access_token_hook`)
to gate access by role: AME, AMO, OPERATOR, SUPPLIER, ADMIN.

| Domain | Tables |
|---|---|
| Auth | `profile` (extends `auth.users`) |
| Marketplace | `part`, `personnel`, `personnel_public` (PII-masked view) |
| Vault | `document` (links to part / personnel; storage_path → `vault` bucket) |
| Escrow | `transaction`, `dispute`, `stripe_processed_event` |
| Operations | `aog_event`, `notification`, `kyc_application`, `job`, `work_order` |
| Audit | `audit_event` (hash-chained, service-role-only writes) |
| Ops support | `rate_limit` |

---

## Compliance & regulatory notes

This is a marketplace platform; Naluka does not itself perform aviation
maintenance, certification, or licensing. The platform integrates with:

- **SACAA e-Services** for live licence and medical certificate verification
  (Edge Function `sacaa-verify`, falls back to platform DB when the API is
  unreachable or unconfigured)
- **National Treasury CSD** for supplier tax-compliance vetting (same fallback)
- **Stripe Connect** for escrow and multi-currency settlement (scaffold mode
  emits synthetic IDs when `STRIPE_SECRET_KEY` is unset, so flows still
  exercise end-to-end)
- **Hyperledger-style audit trail** (Postgres-backed today, Hyperledger Fabric
  the long-term target) for tamper-evident Release-to-Service records

Every flow works end-to-end without external integrations — so the platform
can be demo'd, piloted, and tested before regulatory MOUs are signed.

---

## License

Private — all rights reserved.
