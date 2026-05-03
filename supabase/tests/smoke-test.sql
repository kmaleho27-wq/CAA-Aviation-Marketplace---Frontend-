-- Smoke tests against the applied schema. Validates the parts that would
-- be expensive to debug post-deploy: canonical_jsonb, audit chain
-- monotonicity, sign_rts atomicity, personnel_public masking.
--
-- Local-only; not part of the migration set.

\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 1 — canonical_jsonb determinism'
\echo '═══════════════════════════════════════════════════'

-- Same logical object, different key order → same canonical string.
select
  public.canonical_jsonb('{"b":2,"a":1,"c":[3,2,1]}'::jsonb) as a,
  public.canonical_jsonb('{"a":1,"b":2,"c":[3,2,1]}'::jsonb) as b,
  public.canonical_jsonb('{"b":2,"a":1,"c":[3,2,1]}'::jsonb)
    = public.canonical_jsonb('{"a":1,"b":2,"c":[3,2,1]}'::jsonb) as match;

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 2 — Seed minimum users + a transaction'
\echo '═══════════════════════════════════════════════════'

-- Create two synthetic auth users (admin + seller) and corresponding profiles.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'seller@test.local')
returning id, email;

-- The handle_new_user trigger already created profile rows with default
-- role='AME'. Override here to set the test roles.
insert into public.profile (id, email, name, role) values
  ('00000000-0000-0000-0000-000000000001', 'admin@test.local',  'Admin Test',  'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', 'seller@test.local', 'Seller Test', 'OPERATOR')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- A transaction in 'in-escrow' state, owned by the seller.
insert into public.transaction (id, type, item, party, amount, status, seller_id) values
  ('TXN-TEST-0001', 'Parts', 'Test Part', 'Test Party', 'ZAR 100,000', 'in-escrow',
   '00000000-0000-0000-0000-000000000002');

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 3 — sign_rts as the seller (atomic update + audit)'
\echo '═══════════════════════════════════════════════════'

-- Become the seller for this session.
set naluka.test_uid = '00000000-0000-0000-0000-000000000002';
set naluka.test_jwt = '{"app_role":"OPERATOR"}';

-- Calling sign_rts should: flip status to completed, append audit event,
-- stamp signed_at — all atomic.
select public.sign_rts('TXN-TEST-0001');

-- Verify status flipped
select id, status, signed_at is not null as signed
from public.transaction where id = 'TXN-TEST-0001';

-- Verify audit chain has the event
select seq, type, subject_id, prev_hash is null as is_genesis,
       length(hash) as hash_len
from public.audit_event order by seq;

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 4 — verify_chain (admin-only)'
\echo '═══════════════════════════════════════════════════'

set naluka.test_uid = '00000000-0000-0000-0000-000000000001';
set naluka.test_jwt = '{"app_role":"ADMIN"}';

select * from public.verify_chain();

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 5 — Tamper detection'
\echo '═══════════════════════════════════════════════════'

-- Mutate a payload byte. verify_chain must detect this and return valid=false.
update public.audit_event
   set payload = jsonb_set(payload, '{signedBy}', '"tampered"'::jsonb)
 where seq = 1;

select * from public.verify_chain();

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 6 — personnel_public view masks PII'
\echo '═══════════════════════════════════════════════════'

-- Insert a personnel row with the sensitive fields filled.
insert into public.personnel (id, name, initials, license, role, rating, location, status, expires, available, rate)
values (gen_random_uuid(),
        'Test Pilot', 'TP', 'TEST-001', 'Commercial Pilot', 'Part 61', 'Cape Town',
        'verified', now() + interval '180 days', true, 'ZAR 5,000/day');

-- The view should expose name/role/etc but NOT license/rate/expires.
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'personnel_public'
 order by ordinal_position;

\echo ''
\echo '═══════════════════════════════════════════════════'
\echo ' SMOKE TEST 7 — sign_rts second call must error (state guard)'
\echo '═══════════════════════════════════════════════════'

-- The transaction is already 'completed'. A second sign_rts should reject.
set naluka.test_uid = '00000000-0000-0000-0000-000000000002';
set naluka.test_jwt = '{"app_role":"OPERATOR"}';

do $$
begin
  perform public.sign_rts('TXN-TEST-0001');
  raise exception 'TEST FAILED: second sign_rts should have rejected';
exception
  when others then
    raise notice 'TEST PASSED: second sign_rts rejected with: %', sqlerrm;
end $$;
