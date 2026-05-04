// TrustBadge — two-state verification badge.
//
// /autoplan design + eng review (D1 + F9): a single "✓ Verified" badge
// that's actually backed only by platform DB records (no live SACAA
// verification yet) is a reputation + legal risk for a SACAA-aligned
// product. One screenshot of a falsely-badged engineer on aviation
// Twitter ends the company.
//
// This component renders TWO distinct states:
//   - 'self_declared'  → grey neutral pill — "Documents on file"
//   - 'sacaa_verified' → blue pill with timestamp + license suffix
//
// Until live SACAA API access lands (Tier 1 SACAA partnership), every
// row defaults to 'self_declared' regardless of the database
// `status='verified'` value. The mapping is centralised here so when
// SACAA API access lands, we flip ONE function and every badge in the
// product upgrades automatically.

import React from 'react';

// ── Single source of truth: when does a row qualify as SACAA-verified?
// Currently: never (no live SACAA API). When `sacaa_verification`
// column ships (a future migration), check that column. Until then,
// platform-DB `status='verified'` maps to 'self_declared' — accurate
// to what's actually backing the badge.
function resolveTrustState(row) {
  if (!row) return 'self_declared';

  // Future: when SACAA API confirmation is recorded on the row,
  // return 'sacaa_verified' for those. Schema TBD.
  // if (row.sacaa_verification?.confirmedAt) return 'sacaa_verified';

  // Current state: any row whose platform record is "verified" still
  // shows as "Documents on file" — honest framing.
  return 'self_declared';
}

const STATES = {
  self_declared: {
    label: 'Documents on file',
    title: 'This profile has uploaded documents on the platform. Live SACAA verification is pending.',
    bg: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-tertiary)',
    border: 'var(--border-default)',
    iconColor: 'var(--text-tertiary)',
  },
  sacaa_verified: {
    label: 'SACAA-verified',
    title: 'This profile was checked against the SACAA registry within the last 30 days.',
    bg: 'rgba(58, 138, 110, 0.15)',
    color: 'var(--color-sage-500)',
    border: 'rgba(58, 138, 110, 0.30)',
    iconColor: 'var(--color-sage-500)',
  },
  expiring: {
    label: 'Expiring soon',
    title: 'A document on this profile is within 30 days of its expiry.',
    bg: 'rgba(212, 169, 52, 0.10)',
    color: 'var(--text-warning)',
    border: 'rgba(212, 169, 52, 0.25)',
    iconColor: 'var(--text-warning)',
  },
  expired: {
    label: 'Action required',
    title: 'A document on this profile has lapsed.',
    bg: 'rgba(212, 86, 86, 0.08)',
    color: 'var(--text-danger)',
    border: 'rgba(212, 86, 86, 0.25)',
    iconColor: 'var(--text-danger)',
  },
  pending: {
    label: 'Awaiting review',
    title: 'This profile is in the admin verification queue.',
    bg: 'rgba(212, 169, 52, 0.06)',
    color: 'var(--text-warning)',
    border: 'rgba(212, 169, 52, 0.20)',
    iconColor: 'var(--text-warning)',
  },
};

export default function TrustBadge({ row, status, size = 'md' }) {
  // Allow callers to either pass a personnel row (preferred — uses
  // resolveTrustState) or override the state directly via `status`.
  // Status values map: 'verified' → resolves dynamically;
  // 'expiring'|'expired'|'pending' → direct map.
  let state;
  if (status === 'expiring' || status === 'expired' || status === 'pending') {
    state = status;
  } else if (status === 'verified' || row) {
    state = resolveTrustState(row || { status });
  } else {
    state = 'self_declared';
  }

  const cfg = STATES[state] || STATES.self_declared;
  const fontSize = size === 'sm' ? 10 : 11;
  const padding = size === 'sm' ? '2px 7px' : '3px 9px';

  return (
    <span
      title={cfg.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-pill)',
        padding,
        fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {state === 'sacaa_verified' && <span aria-hidden>✓</span>}
      {state === 'expiring' && <span aria-hidden>⚠</span>}
      {state === 'expired' && <span aria-hidden>✕</span>}
      {state === 'self_declared' && <span aria-hidden>📄</span>}
      {cfg.label}
    </span>
  );
}

// Exported for tests and for callers that need the resolution logic
// without the visual.
export { resolveTrustState, STATES };
