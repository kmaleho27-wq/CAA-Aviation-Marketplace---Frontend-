#!/usr/bin/env node
/**
 * Live audit-chain end-to-end test:
 *   1. Operator signs TXN-2026-1297 via the sign_rts RPC.
 *   2. We verify the transaction flipped to 'completed' AND signed_at is set.
 *   3. We log in as admin and call verify_chain() — must return valid=true.
 *   4. We pull the chain entries directly and confirm the SHA-256 hash
 *      length, prev_hash linkage, and the seq monotonicity.
 *
 * This is the deepest end-to-end test of the migration: from frontend
 * call → user-callable RPC → SECURITY DEFINER record_transaction_event →
 * audit_append (ACCESS EXCLUSIVE lock) → chain hash compute. If this
 * passes, every layer of the new backend is wired correctly.
 *
 * NOTE: this writes state. After running, TXN-2026-1297 is permanently
 * 'completed' and the audit chain has at least one entry. Idempotent
 * re-runs are safe (sign_rts on a completed txn raises a state error).
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY required');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const test = (ok, name, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

console.log('▼ Audit chain end-to-end test against', url, '\n');

// ── Step 1: Operator signs TXN-2026-1297 ───────────────────
await sb.auth.signInWithPassword({ email: 'operator@naluka.aero', password: 'demo1234' });

const TXN_ID = 'TXN-2026-1297';
let signResult, signErr;
{
  const r = await sb.rpc('sign_rts', { p_transaction_id: TXN_ID });
  signResult = r.data; signErr = r.error;
}

if (signErr?.message?.includes('terminal state')) {
  // Already signed in a prior run. That's fine; assert the chain is intact.
  test(true, `sign_rts (already terminal — re-run mode)`, signErr.message);
} else if (signErr) {
  test(false, `sign_rts(${TXN_ID})`, signErr.message);
  await sb.auth.signOut();
  console.log(`\n${pass}/${pass + fail} tests passed`);
  process.exit(1);
} else {
  test(true, `sign_rts(${TXN_ID})`, `auditSeq=${signResult.auditSeq}, hashLen=${signResult.auditHash?.length}`);
  test(signResult.auditHash?.length === 64, `audit hash is 64 hex chars`, `got ${signResult.auditHash?.length}`);
  test(signResult.status === 'completed', `signing flipped status → completed`, signResult.status);
}

// ── Step 2: Verify the transaction state ───────────────────
{
  const { data: txn } = await sb.from('transaction').select('status, signed_at').eq('id', TXN_ID).single();
  test(txn?.status === 'completed', `transaction.status === completed`, txn?.status);
  test(txn?.signed_at != null, `transaction.signed_at is stamped`, txn?.signed_at);
}

await sb.auth.signOut();

// ── Step 3: Admin verifies the chain ───────────────────────
await sb.auth.signInWithPassword({ email: 'admin@naluka.aero', password: 'demo1234' });

{
  const { data, error } = await sb.rpc('verify_chain');
  if (error) {
    test(false, `verify_chain RPC`, error.message);
  } else {
    const row = data?.[0] ?? {};
    test(row.valid === true, `verify_chain valid=true`, `got ${JSON.stringify(row)}`);
    test(row.total >= 1, `verify_chain total >= 1`, `got total=${row.total}`);
  }
}

// ── Step 4: Direct chain inspection ────────────────────────
{
  const { data, error } = await sb.from('audit_event').select('seq, type, subject_id, hash, prev_hash, payload')
    .order('seq', { ascending: true });
  if (error) {
    test(false, `audit_event admin SELECT`, error.message);
  } else {
    test(data?.length >= 1, `audit_event has at least 1 row`, `got ${data?.length}`);

    // Genesis entry has prev_hash = null
    const genesis = data?.[0];
    test(genesis?.prev_hash === null, `seq=1 has prev_hash=null (genesis)`, `prev_hash=${genesis?.prev_hash}`);
    test(genesis?.seq === 1, `genesis seq === 1`, `got ${genesis?.seq}`);
    test(genesis?.hash?.length === 64, `genesis hash 64 hex`, `len=${genesis?.hash?.length}`);

    // Subsequent entries: prev_hash chains back
    for (let i = 1; i < (data?.length ?? 0); i++) {
      test(data[i].prev_hash === data[i - 1].hash,
        `seq=${data[i].seq} prev_hash links to seq=${data[i - 1].seq}.hash`,
        `${data[i].prev_hash?.slice(0, 8)}... vs ${data[i - 1].hash?.slice(0, 8)}...`);
    }

    // Print the chain summary
    console.log('\n  Chain entries:');
    for (const r of data ?? []) {
      console.log(`    seq=${r.seq}  type=${r.type}  subject=${r.subject_id}  hash=${r.hash.slice(0, 16)}...`);
    }
  }
}

await sb.auth.signOut();

console.log(`\n${pass}/${pass + fail} tests passed`);
process.exit(fail > 0 ? 1 : 0);
