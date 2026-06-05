-- Naluka — allow referrers to update their own prospective accounts.
--
-- Migration 0030 only let admins write to prospective_account. Sound
-- in principle but breaks the broker dashboard flow — Aeropreserve
-- (and any future broker) needs to flip a prospect's status from
-- 'invited' → 'contacted' as they reach out via WhatsApp. They can't
-- if RLS only allows admins.
--
-- Fix: add a second policy that lets a referrer update their OWN
-- prospect rows. The fields they can change are status, contact
-- details, suggested markup, and notes — they CANNOT change
-- referrer_id (no privilege escalation), organization, or
-- account_type. Strict column gating via the with-check expression.

create policy prospective_account_self_update on public.prospective_account
  for update to authenticated
  using (referrer_id = auth.uid())
  with check (
    referrer_id = auth.uid()
    -- These should never change after creation — protect from
    -- accidental or malicious self-promotion.
    and organization      = (select organization      from public.prospective_account p2 where p2.id = prospective_account.id)
    and account_type      = (select account_type      from public.prospective_account p2 where p2.id = prospective_account.id)
    and linked_profile_id is not distinct from
        (select linked_profile_id from public.prospective_account p2 where p2.id = prospective_account.id)
  );
