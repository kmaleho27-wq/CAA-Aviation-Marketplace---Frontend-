# Deploying Naluka

One stack, two providers:

- **Frontend** (Vite SPA, repo root) → **Netlify**
- **Backend** (Postgres + Auth + Storage + Edge Functions, `supabase/`) → **Supabase**

The migration from Render+Express+Prisma+Vercel landed in `supabase/migrations/0001_init.sql` through `0003_pg_cron.sql`.

---

## 1. Create the Supabase project

1. Sign in at https://app.supabase.com → **New project**.
2. Pick a region close to your users (`af-south-1` if available, otherwise `eu-west-2`).
3. Save the **project ref** (looks like `xyzabc123`) and the database password — both go into env files / secrets below.

Repeat for two projects: `naluka-dev` and `naluka-prod` (free-tier covers both at this volume).

---

## 2. Link and apply migrations

```bash
# One-time install
npm i -g supabase   # or: scoop install supabase | brew install supabase/tap/supabase

# Link this repo to the dev project
supabase login
supabase link --project-ref <dev-project-ref>

# Apply all three migrations
supabase db push
```

The push runs in order:

| File | What it does |
|---|---|
| `0001_init.sql` | 14 enums, 14 tables, 33 RLS policies, hash-chained audit + helper functions, `personnel_public` view, `vault` storage bucket policies |
| `0002_user_rpcs.sql` | User-callable RPCs (`sign_rts`, `approve_kyc`, `reject_kyc`, `resolve_dispute`, `accept_job`, `sign_work_order`) — wrap the service-role-only audit primitives with role checks |
| `0003_pg_cron.sql` | Schedules `sacaa-sweep` and `expiry-sweep` daily, plus rate-limit and stripe-event GC |

---

## 3. Configure Auth

In the Supabase dashboard:

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173` (dev) or `https://naluka.netlify.app` (prod)
   - Additional Redirect URLs: add both
2. **Authentication → Hooks → Custom Access Token**
   - Hook URL: `pg-functions://postgres/public/custom_access_token_hook` (already in `supabase/config.toml`; the dashboard mirrors it)
   - This injects the `app_role` JWT claim from `profile.role` so RLS can read `auth.jwt() ->> 'app_role'`.
3. **Authentication → Providers → Email**
   - For demo: turn off **Confirm email** (already off in `config.toml`).
   - For prod: turn it on. Add an `/auth/callback` route handler (Supabase client already has `detectSessionInUrl: true`).

---

## 4. Set Edge Function secrets

```bash
# Stripe — leave blank to run in scaffold mode (synthetic IDs)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# SACAA — leave blank to use platform-DB fallback
supabase secrets set SACAA_API_BASE=https://api.sacaa.co.za
supabase secrets set SACAA_API_KEY=...

# Cron secret — generate fresh, never check in
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# Used by stripe-onboard-return for the post-Connect redirect
supabase secrets set APP_BASE_URL=https://naluka.netlify.app
```

Then mirror two values into Postgres so `pg_cron` can pass the secret along:

```sql
-- Run in the Supabase SQL editor (use the same CRON_SECRET as above)
ALTER DATABASE postgres SET app.project_ref = '<your-project-ref>';
ALTER DATABASE postgres SET app.cron_secret = '<same-as-CRON_SECRET>';
```

---

## 5. Seed demo data

The seed script creates three demo accounts (operator, admin, contractor) and the full marketplace fixture set in dependency order.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys --project-ref <ref> | grep service_role | awk '{print $2}') \
npm run db:seed
```

Demo logins (password `demo1234`):

| Email | Role |
|---|---|
| `operator@naluka.aero` | OPERATOR |
| `admin@naluka.aero` | ADMIN |
| `contractor@naluka.aero` | AME |

Idempotent — re-run any time.

---

## 6. Deploy Edge Functions

```bash
supabase functions deploy stripe-webhook
supabase functions deploy payments-create-intent
supabase functions deploy stripe-onboard-return
supabase functions deploy sacaa-verify
supabase functions deploy sacaa-sweep
supabase functions deploy expiry-sweep
```

Verify they're live:

```bash
curl -i https://<ref>.supabase.co/functions/v1/stripe-webhook
# → 405 Method Not Allowed   (good — function is reachable, just needs POST)
```

---

## 7. Wire the Stripe webhook

1. **Stripe dashboard → Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://<ref>.supabase.co/functions/v1/stripe-webhook`
3. Events to send:
   - `payment_intent.succeeded`
   - `transfer.created`
   - `charge.refunded`
4. Copy the **signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` (step 4 above) and redeploy `stripe-webhook`.

Test locally:

```bash
# Terminal A
supabase functions serve stripe-webhook --no-verify-jwt --env-file ./supabase/.env.local
# Terminal B
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
# Terminal C
stripe trigger payment_intent.succeeded
```

---

## 8. Frontend — Netlify

1. **Add new site → Import an existing project** → connect this repo.
2. Build settings auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Site settings → Environment variables**:

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<prod-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the anon key from Supabase → Settings → API |
   | `VITE_USE_MOCK_API` | `false` |

4. Deploy. The SPA fallback redirect in `netlify.toml` handles deep-link routing.

---

## 9. Custom domain

- **Netlify**: Domain settings → add `app.naluka.aero`. Netlify provisions Let's Encrypt automatically.
- **Supabase**: Authentication → URL Configuration → update Site URL + Redirect URLs to the new domain.
- Update `APP_BASE_URL` Edge Function secret (step 4) and redeploy `stripe-onboard-return`.

---

## 10. Local development

```bash
git clone <repo>
cd <repo>
npm install
cp .env.example .env

# Paste VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from the dev Supabase project
# Set VITE_USE_MOCK_API=false (or keep =true for offline UI demo mode)

npm run dev
```

The `.env.example` block documents every variable. Service-role and Stripe keys are NEVER prefixed `VITE_` — they only live in Edge Function secrets and `scripts/seed-supabase.mjs`.

For Edge Function local dev:

```bash
supabase functions serve <function-name> --env-file ./supabase/.env.local
```

---

## 11. Rollback

Per phase, since each migration landed independently:

| Layer | Rollback |
|---|---|
| Migration | `supabase migration repair <version> --status reverted`, then a new migration that undoes the change |
| Edge Function | `supabase functions deploy <name>` from a previous git ref |
| Netlify | Deploys → ⋯ → **Publish deploy** on a previous build |
| Supabase | No PITR on free tier. Pro: dashboard → Database → Backups → Restore |

Tag `pre-supabase-decommission` before merging Phase 6 — that's your one-shot rollback to the old Render+Vercel stack if you need it.

---

## 12. Cost on free tier

- **Supabase free**: 500 MB DB, 2 GB egress, 500 K Edge Function invocations/month, no PITR. Two projects fit comfortably for dev + early-prod.
- **Supabase Pro** ($25/project/month): daily backups + 7-day PITR + larger limits. Required for production once you ship to real users.
- **Netlify hobby**: free for personal projects. Bandwidth and build minutes are generous.

Budget after launch: **~$25/month** (Pro on prod project). Compare with the previous Render+Vercel cost (~$14/month) — the +$11 buys backups, Storage, and Edge Functions on one bill.

---

## 13. Audit chain integrity

Sanity-check the hash chain anytime (admin only):

```sql
-- In Supabase SQL editor, signed in as an ADMIN user
select * from public.verify_chain();
-- → (true, N, null, null) when intact
-- → (false, N, broken_at_seq, reason) on tamper
```

The chain is append-only; only `audit_append` (service-role) can write. Production checklist:
- Schedule `verify_chain()` weekly via `pg_cron` (snapshot result, alert on `valid=false`).
- Backup `audit_event` separately to off-platform storage (Cloudflare R2 ~$0/mo).
