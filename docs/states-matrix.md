# UX states matrix audit

The autoplan design subagent flagged "missing UX states are systemic, not
per-feature" as a high severity gap. This doc enumerates every Tier 1
feature against {empty, loading, partial, error, success, in-progress
limbo} and flags gaps for fixing.

## Legend

- ✅ Has decent state — handled visually with appropriate copy
- ⚠ Has the state but copy/design is generic / could be sharper
- ❌ Missing — falls back to a default loader or generic error

---

## /register (self-signup with discipline)

| State | Status | Notes |
|---|---|---|
| Empty (no input) | ✅ | Form starts blank with placeholders |
| Loading (submitting) | ✅ | "Creating account…" button + disabled |
| Partial (account created, awaiting confirmation email) | ✅ | "Check your inbox" panel |
| Error (validation) | ✅ | Inline error block; HTML5 `required` |
| Error (auth — duplicate email) | ✅ | Translated via `normalizeAuthError` |
| Success | ✅ | Redirect or "check inbox" view |

---

## /admin/kyc (admin verification queue)

| State | Status | Notes |
|---|---|---|
| Empty (no pending personnel) | ✅ | "No personnel awaiting verification." copy |
| Loading | ✅ | LoadingBlock label="Loading sign-ups…" |
| Partial (uploaded docs but missing some) | ⚠ | The discipline checklist shows "(missing — request from applicant)" but no per-doc explicit state |
| Error (RPC permission) | ⚠ | Only generic toast on approve fail. Should distinguish "row already approved by another admin" from real errors |
| Success | ✅ | Toast + optimistic removal from list |
| In-progress (RPC running) | ⚠ | `busyPplId` disables both buttons but no spinner |

**Fix priority:** medium. Add a per-card "Approval pending" overlay on `busy`.

---

## /m/profile — Compliance documents (contractor)

| State | Status | Notes |
|---|---|---|
| Empty (no docs uploaded) | ✅ | Each requirement shows hint text + Upload button |
| Loading (initial fetch) | ✅ | Section returns null until loaded — no skeleton |
| Partial (some uploaded, some missing) | ✅ | Per-requirement Upload/View/Replace |
| Error (upload fails — file too big, wrong type, network) | ⚠ | Generic toast.error(err.message). Should map common errors to friendlier copy |
| Success (just uploaded) | ✅ | Toast + immediate state update |
| In-progress (uploading) | ✅ | "Uploading…" button label |

**Fix priority:** low. Map common upload errors (size, type, MIME mismatch) to specific copy. ~30 min.

---

## /app/personnel (operator marketplace + crew management)

| State | Status | Notes |
|---|---|---|
| Empty (no rows match filter) | ✅ | "No contractors match …" message |
| Loading | ✅ | LoadingBlock |
| Error (RLS / network) | ✅ | ErrorBlock with retry |
| Empty (no crew of yours) | ⚠ | When operator selects "My crew" filter and has zero, falls through to generic empty. Should prompt "Add your first crew member →" |

**Fix priority:** low. Edit the empty-state copy to be filter-aware. ~15 min.

---

## /app/personnel — Bulk CSV import modal

| State | Status | Notes |
|---|---|---|
| Empty (initial pick-file step) | ✅ | Example CSV shown |
| Parsing | ✅ | Implicit; jumps to preview on file select |
| Validation errors | ✅ | Per-row + header-level error summary |
| Importing (running) | ✅ | "Importing…" + spinner |
| Partial success | ✅ | Per-row pass/fail report |
| All-error scenarios (file unparseable) | ⚠ | Will throw; not gracefully wrapped |

**Fix priority:** medium. Wrap `parseCsv` in try/catch, show user-friendly "Could not parse this file — is it a valid CSV?" if it crashes.

---

## /app/audit-pack

| State | Status | Notes |
|---|---|---|
| Empty (no transactions in range) | ✅ | "No transactions in this window." per section |
| Loading | ✅ | LoadingBlock + "Pulling 12 months of data…" |
| Partial (RLS hides some sections) | ✅ | "RPC unavailable to this caller (RLS — admin only)" notice |
| Error (network) | ⚠ | Caught at top level via toast; could be cleaner |
| Success (generated) | ✅ | Live render + Print/Download JSON buttons |
| Print preview | ✅ | Custom print stylesheet (A4, B&W) |

**Fix priority:** low. Already in good shape.

---

## /app/mro — Marketplace + quotes panel

| State | Status | Notes |
|---|---|---|
| Empty (no services in category) | ✅ | "No services match …" |
| Empty (no quotes) | ⚠ | Panel hides entirely instead of saying "no quotes yet — request one from a service" |
| Loading | ✅ | LoadingBlock |
| Quote in `requested` state, AMO not yet seen | ⚠ | Operator's view shows "Awaiting your quote" but it's actually awaiting AMO's quote — confusing label depending on viewer |
| Quote in `accepted` (PayFast checkout in flight) | ⚠ | Operator gets redirected to PayFast; if they bounce back without paying, the quote stays accepted forever. No "checkout abandoned — retry?" UX |
| Quote in `escrowed` | ✅ | "Funds escrowed" with appropriate next-action button |
| Quote `released` | ✅ | "✓ Released" terminal state |

**Fix priority:** medium-high. The accepted-but-abandoned-checkout state is a real bug — operator can lose their place. Need a "Resume checkout" path or auto-cancel after N hours.

---

## /m/wallet — Onboarding checklist (pending users)

| State | Status | Notes |
|---|---|---|
| Verified — checklist hidden | ✅ | Returns null gracefully |
| Pending — checklist shown | ✅ | ETA badge + 3 steps |
| Loading | ✅ | Returns null while loading |
| Doc requirements unknown for discipline | ⚠ | Falls through to "no requirements" — could prompt support |

**Fix priority:** low.

---

## /app/transactions

| State | Status | Notes |
|---|---|---|
| Empty | ✅ | |
| Loading | ✅ | |
| Error | ✅ | |
| In-flight (rts-pending → in-escrow → completed) | ✅ | Status pill |
| Disputed | ✅ | Special badge + link to dispute view |

**Fix priority:** none. Solid.

---

## Notifications panel

| State | Status | Notes |
|---|---|---|
| Empty (no notifications) | ⚠ | Currently just empty list — no "you're caught up" state |
| Loading | ✅ | |
| Mixed read/unread | ✅ | Badge dot |

**Fix priority:** low. Add "🎉 You're all caught up" empty state.

---

## /app/support

| State | Status | Notes |
|---|---|---|
| Empty (no prior tickets) | ✅ | Section hides |
| Submitting | ✅ | "Submitting…" button label |
| Validation error | ⚠ | Generic toast; could surface inline |
| Network error | ⚠ | Generic toast |

**Fix priority:** low.

---

## Cross-cutting gaps to address (priority order)

1. **MRO checkout-abandoned state** — operator opens PayFast, closes browser, comes back. Quote is stuck `accepted`. Need timeout + resume path. ~1 hour.
2. **Bulk CSV unparseable file** — wrap parser in try/catch with friendly copy. ~15 min.
3. **Filter-aware empty states** — Personnel, Marketplace, MRO. ~30 min total.
4. **"Caught up" empty for notifications panel.** ~10 min.
5. **Per-card busy spinner on admin KYC approve/reject.** ~30 min.
6. **Friendly upload error copy** for doc upload size/type errors. ~30 min.

**Total to close all medium-priority gaps:** ~3 hours. Defer the lows.

---

## Cross-cutting state coverage standard (going forward)

For every new feature, before merging:

- [ ] Empty state has explicit copy (not just `[]`)
- [ ] Loading state has an explicit visual (skeleton, spinner, label)
- [ ] Error states map common cases to friendly copy
- [ ] Success state confirms what happened
- [ ] In-progress states disable the trigger to prevent double-fire
- [ ] Partial states (when applicable) explain what's missing

Add to PR template once we have one.
