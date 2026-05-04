// Sentry client-side error monitoring.
//
// Captures uncaught JS errors + unhandled promise rejections + React
// component errors (via the SentryErrorBoundary export) and ships them
// to https://sentry.io for the Naluka frontend project.
//
// DSN gated behind VITE_SENTRY_DSN — if unset (e.g. local dev without
// the env var), Sentry stays inert and nothing is sent. This keeps
// developer machines off the production error stream by default.
//
// User context: when a user signs in, we tag their auth.id + role so
// errors are attributable. We DO NOT send email or name to Sentry —
// the auth.id is the minimum identifier needed to match an error to
// a support request, and respects POPI minimisation.

import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    if (import.meta.env.DEV) {
      // Quiet hint for devs — only on dev builds.
      console.info('[sentry] VITE_SENTRY_DSN not set — error monitoring inactive.');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,             // "production" | "development"
    release: import.meta.env.VITE_SENTRY_RELEASE,  // optional — set in Netlify build hook
    // No `integrations` key passed → Sentry uses its safe defaults
    // (GlobalHandlers, Breadcrumbs, Dedupe, etc.). DO NOT pass
    // `integrations: []` here — that overrides defaults and silently
    // disables uncaught-error capture, which is the whole point.
    //
    // Heavier opt-in integrations like browserTracingIntegration() and
    // replayIntegration() stay off until we explicitly want them
    // (cost + privacy considerations).
    tracesSampleRate: 0,
    // beforeSend lets us scrub PII before transmit. Currently a no-op
    // but the hook is here as a defence-in-depth point if we ever
    // capture form values etc.
    beforeSend(event) {
      return event;
    },
  });
}

/** Tag the current Sentry scope with the signed-in user. Call from
 *  src/lib/auth after login + on session restore.
 *  Pass null on logout to clear. */
export function setSentryUser(user) {
  if (!DSN) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    // POPI: no email, no name. role is enough to triage by audience.
    role: user.role,
  });
}

/** Re-export the React ErrorBoundary so callers don't import @sentry/react
 *  directly — keeps the integration surface small. */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/** Manually capture a non-thrown error or a captured warning. */
export function captureMessage(message, level = 'info') {
  if (!DSN) return;
  Sentry.captureMessage(message, level);
}
