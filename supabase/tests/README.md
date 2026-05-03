# Migration smoke tests

Local-only validation. Validates the parts of `supabase/migrations/` that
would be expensive to debug post-deploy: `canonical_jsonb` determinism,
`audit_append` chain monotonicity, `sign_rts` atomicity, tamper
detection, and `personnel_public` PII masking.

## Why this exists

Supabase migrations target a Supabase-managed Postgres (with `auth.*`
schema, custom roles, `pg_cron`, etc.). The CLI provides `supabase start`
to validate locally, but pulling that 3 GB Docker stack just to
syntax-check a migration is heavy. This harness applies the migrations
to a vanilla `postgres:15-alpine` container with the Supabase-specific
bits stubbed, so syntax + plpgsql logic gets validated in seconds.

## What it does NOT cover

- `0003_pg_cron.sql` — pg_cron isn't in stock Postgres. Validate this
  against a real Supabase project.
- RLS predicate evaluation as a non-superuser — the test harness runs
  as `postgres` (bypasses RLS). Use `supabase start` for end-to-end RLS.
- The custom access token hook running inside Supabase Auth.
- Edge Functions (Deno runtime).

## Running

Requires Docker.

```bash
# 1. Boot a clean Postgres 15
docker run --rm -d --name sb-validate \
  -e POSTGRES_PASSWORD=test -p 54330:5432 \
  postgres:15-alpine

# 2. Wait a few seconds, then apply harness + migrations + smoke tests
sleep 4
docker exec -i sb-validate psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/test-harness.sql
docker exec -i sb-validate psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/0001_init.sql
docker exec -i sb-validate psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/0002_user_rpcs.sql
docker exec -i sb-validate psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/smoke-test.sql

# 3. Tear down
docker rm -f sb-validate
```

Expected: every smoke test prints a passing row and EXIT=0.

## CI integration

`.github/workflows/ci.yml` runs all of these on every push to `main` and on every PR.

To enable the **live** tests in CI, add two repository secrets at
https://github.com/kmaleho27-wq/CAA-Aviation-Marketplace---Frontend-/settings/secrets/actions:

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | `https://hrimskndpuuvftdskuae.supabase.co` (or the prod project URL once you have one) |
| `SUPABASE_ANON_KEY` | the anon key from Supabase → Settings → API |

Without those secrets, CI runs the build only (no live tests) — keeps PRs from random
contributors from failing on missing secrets.

To turn off live tests entirely (e.g. while migrating between projects), set repo
**variable** `SKIP_LIVE_TESTS=true`.

## What's tested

| # | Name | What it validates |
|---|---|---|
| 1 | canonical_jsonb determinism | Same JSON object with reordered keys produces identical canonical strings (required for hash chain reproducibility) |
| 2 | Seed minimum users + transaction | `handle_new_user` trigger creates profile rows; FK chain works |
| 3 | sign_rts atomicity | RPC flips status to 'completed', stamps signed_at, appends audit_event with 64-char hex hash, all in one transaction |
| 4 | verify_chain (admin-only) | Walks the chain, confirms hashes reproduce, returns valid=true |
| 5 | Tamper detection | After mutating a payload byte, verify_chain returns valid=false with the offending seq |
| 6 | personnel_public masks PII | View exposes id/name/initials/role/rating/types/location/status/available — does NOT expose license/rate/expires |
| 7 | sign_rts state guard | Second call on a 'completed' transaction rejects with "transaction already in terminal state" |
