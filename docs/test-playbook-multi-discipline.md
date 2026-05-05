# Multi-discipline credentials — manual test playbook

A 10-minute end-to-end smoke test you can run yourself in the browser
to confirm everything we just shipped actually works in the wild.

You'll need:

- An empty browser window (or two — Chrome + Firefox is easiest)
- Two test accounts (one personnel, one admin) — or be ready to switch
  roles by toggling `profile.role` in the SQL editor between steps
- The deployed Naluka site URL (Netlify preview or production)

---

## Test 1 — Personnel adds a secondary credential

**Goal:** confirm a user with one primary discipline can add additional
SACAA licences and they land in `pending` status.

1. Sign in as a **personnel** user (anyone with a row in `personnel`).
2. Navigate to `/m/profile`.
3. Scroll down past `ComplianceDocs`. You should see a section titled
   **"Additional credentials"** with text:
   > Hold multiple SACAA licences? Add each one — pilot + engineer +
   > DAME are separate credentials with their own expiry and medical
   > class.
4. Click **+ Add credential**.
5. The form opens. The **Discipline** dropdown should:
   - **NOT** include the user's primary discipline (excluded by UI)
   - Include all other 9 disciplines
6. Pick a discipline (say, **AME — Part 66**).
7. Enter a fake licence number: `SA-TEST-B1-001`
8. Pick a subtype if shown (e.g. `B1`).
9. Click **Add**.
10. ✅ Expect a green toast: "AME — Part 66 added — pending admin verification"
11. ✅ Expect the row to appear in the list with a `Pending` chip.
12. **Click + Add credential again.** The dropdown should now exclude
    BOTH the primary AND the AME you just added.

**If anything fails here:** check the browser console for the RPC
error message. Most likely: migration `0024` didn't apply, or the
`sacaa_discipline` enum is missing values.

---

## Test 2 — Admin verifies the new credential

**Goal:** confirm admins see the secondary credential on the KYC card
with working ✓/✕ buttons.

1. Sign out, sign in as an **admin** (`profile.role = 'ADMIN'`).
2. Navigate to `/admin/kyc`.
3. Find the same person from Test 1 in the **Pending personnel** list.
4. Look at their card — you should see a green-tinted block:
   > **+ 1 additional credential:**
   > **AME** · `SA-TEST-B1-001` · B1 [pending]
5. Inside that block, on the right, you should see a small **✕** and
   a small **✓** button.
6. Click **✓** on the AME row.
7. ✅ Expect a green toast: "Verified — AME"
8. ✅ Expect the `[pending]` text to flip to `[verified]` in green.
9. ✅ The ✓/✕ buttons should disappear (only render when pending).

Then verify the notification fired:

10. Sign out, sign back in as the **personnel** user from Test 1.
11. Open the notification bell (or wherever notifications surface).
12. ✅ Expect a recent **success** notification: "Credential verified
    — Your ame credential has been verified by Naluka admin..."

---

## Test 3 — Admin rejects with reason

**Goal:** confirm rejection sends a reason to the applicant.

1. As personnel, add a second credential (say **DAME — Part 67**).
2. Sign in as admin, go to `/admin/kyc`.
3. On the new DAME row, click **✕**.
4. A browser prompt appears asking for a reason. Type:
   `Test rejection — please re-upload SACAA Form 21 with valid stamp`
5. Click OK.
6. ✅ Expect a yellow/warning toast: "Rejected — DAME"
7. ✅ The status should flip to `[rejected]` in red.

Then check the notification:

8. Sign in as personnel.
9. ✅ Expect a warning notification with body:
   > "Your aviation_medical credential could not be verified. Reason:
   > Test rejection — please re-upload SACAA Form 21 with valid
   > stamp. You can edit it in your profile and re-submit."

---

## Test 4 — Operator marketplace filters by secondary credential

**Goal:** confirm a verified secondary credential makes the personnel
discoverable when an operator filters by that discipline.

**Setup:** the personnel you used in Test 1 should have a primary
discipline that's **NOT** AME (e.g. `flight_crew`), AND now have a
verified AME secondary credential from Test 2.

1. Sign in as an **operator** (`profile.role = 'OPERATOR'`).
2. Navigate to `/personnel` (or wherever the personnel marketplace is).
3. Click the **AME (66)** filter chip.
4. ✅ Expect the test person to appear in the results, even though
   their primary discipline is `flight_crew`.
5. Look at their card. Below the "Part 61" line, you should see in
   small green italic text:
   > `+ also AME`

   (Or, if they have multiple verified secondaries: `+ also AME · DAME`)

6. Click the **Pilots (61)** filter chip.
7. ✅ Expect the same person to still appear (their primary is
   flight_crew — they're a pilot first).

This is the key UX win: an operator searching for a B1 engineer in
Cape Town now finds the ATPL pilot who's *also* a verified B1
engineer, instead of missing them entirely.

---

## Test 5 — Personnel deletes a secondary credential

**Goal:** confirm cleanup works.

1. As the personnel user from Test 1, go to `/m/profile`.
2. On any of your secondary credential rows, click the **✕** on the
   right-hand side.
3. Confirm the prompt.
4. ✅ Expect a yellow toast: "Credential removed."
5. ✅ Expect the row to disappear.
6. Also: clicking **+ Add credential** should now allow you to add
   that discipline back (it's no longer in the "already added" list).

---

## Test 6 — Expiry watchdog (optional, requires waiting or trigger)

**Goal:** confirm credentials with an `expires` date in the next 90
days actually fire alerts.

This one's harder to test without waiting for the cron to run. Two
options:

### Option A: Wait (easy but slow)

After tomorrow's cron fires, run in SQL editor:

```sql
select * from public.cron_run
 where job = 'expiry-sweep'
 order by started_at desc
 limit 1;
```

Should show `ok = true` and a recent `started_at`. The
`rows_affected` count is the sum of doc + credential changes.

### Option B: Manually inject a soon-expiring credential and trigger

In SQL editor, set one of your test credentials to expire in 89 days:

```sql
update public.personnel_credential
   set expires = now() + interval '89 days'
 where license = 'SA-TEST-B1-001';
```

Then manually invoke the Edge Function:

```sql
-- Run from SQL editor as a privileged role
select net.http_post(
  url := 'https://<your-project-ref>.supabase.co/functions/v1/expiry-sweep',
  headers := jsonb_build_object('x-cron-secret', '<your-cron-secret>')
);
```

Then check:

```sql
select * from public.notification
 where user_id = '<your-test-user-id>'
 order by created_at desc limit 5;
```

✅ Expect a "AME credential expiring in 90 days" notification.

```sql
select * from public.personnel_credential_expiry_alert
 where credential_id = (
   select id from public.personnel_credential where license = 'SA-TEST-B1-001'
 );
```

✅ Expect one row with `threshold_days = 90`.

Then run the same trigger AGAIN. Check the count:

```sql
select count(*) from public.personnel_credential_expiry_alert
 where credential_id = (
   select id from public.personnel_credential where license = 'SA-TEST-B1-001'
 );
```

✅ Expect still 1 (idempotency — same threshold can't fire twice).

---

## Test 7 — Operator compliance dashboard

**Goal:** confirm the compliance page rolls up primary + secondary
credentials + documents into the right stat cards and crew table.

**Setup needed:** sign in as an operator who has at least one crew
member added via `+ Add` on the Crew page (so `created_by_operator`
is set). Even better: add 2–3 crew members and give one an expiring
secondary credential from earlier tests.

1. Sign in as the operator. In the sidebar, click **Compliance**
   (with the new shield+check icon).
2. Page should load at `/app/compliance`.
3. ✅ Expect 4 stat cards across the top:
   - **Verified %** — proportion whose primary + all credentials +
     all documents are `verified`. Green if ≥80%, amber if ≥50%,
     red below.
   - **At risk (≤30 days)** — crew with anything expiring within 30
     days OR already in `expiring`/`expired` status.
   - **Expired** — crew where any credential or document has lapsed.
   - **Pending verification** — crew awaiting Naluka admin review.
4. ✅ Crew table sorted **at-risk first**, then by earliest expiry.
   So the most urgent person is at the top.
5. ✅ Each row shows:
   - Initials avatar
   - Name
   - Primary discipline (e.g. "Pilot")
   - Secondary disciplines in green ("+ AME · DAME") when the crew
     member has verified secondaries
   - Document count ("· 3 docs") when documents exist
   - Status pill (Verified / Expiring / Expired / Pending / Action needed)
   - Earliest expiry date
   - "Time left" column ("12d", "45d ago") with colour coding

### Test 7a — Hired contractor inclusion

If you've hired a contractor via the marketplace and the transaction
is in `in-escrow` or `rts-pending` status:

1. The hired contractor should appear in your crew table.
2. ✅ Their name has a small mustard "**Hired**" badge next to it.
3. ✅ The footer at the bottom shows the count:
   "5 crew members (1 hired) · naluka.aero"

The "Hired" badge tells you visually that this person isn't your
direct crew — they're on a contract — but you have visibility for
the duration of the engagement.

### Test 7b — Documents factored in

If a crew member has a document (medical, Form 21, etc.) with
`expires` set in the next 30 days, OR with status `expiring` /
`expired`:

1. ✅ That crew member appears in the at-risk count.
2. ✅ The earliest-expiry column shows the document's expiry if
   it's earlier than any credential expiry.
3. ✅ The status pill flips appropriately.

### Test 7c — Print/Save PDF

1. Click **Print / Save PDF** in the top right.
2. ✅ The browser's print dialog opens.
3. ✅ The button itself **does not appear** in the print preview
   (it has the `audit-pack-noprint` class).
4. ✅ The footer shows "Generated [datetime]..." — useful as proof
   of when the snapshot was taken.

This is the file an operator would email to SACAA when audited:
"here's our compliance picture as of this date, here's who's at
risk, here are the action items."

### Test 7d — Empty state

Sign in as an operator with no crew yet (or a fresh test account):

1. Land on `/app/compliance`.
2. ✅ Empty state shows: "No crew yet — Add crew members from
   Crew → + Add to start tracking compliance."
3. ✅ Stat cards do NOT render (only the empty state).

---

## Cleanup

After testing, leave the test credentials in or delete them — your
call. To delete:

```sql
delete from public.personnel_credential where license like 'SA-TEST-%';
```

The expiry-alert ledger rows cascade-delete automatically.

---

## What to do if something fails

| Symptom | Most likely cause |
|---------|-------------------|
| "Add credential" gives RPC error | Migration 0024 not applied |
| Verify/reject buttons throw 403 | Migration 0025 not applied, or `is_admin()` returning false for your test admin |
| Filter by AME doesn't find verified secondary | Frontend not rebuilt after the personnel.ts change — re-deploy |
| No expiry notification fires | Migration 0026 not applied, or expiry-sweep edge function not redeployed |
| Notification fires but body says `aviation_medical` instead of `DAME` | Cosmetic — the discipline enum value renders raw. Add a label map in 0026's RPC if it bothers you |

Paste the failing step + any error toasts/console output back to
Claude and we'll diagnose.
