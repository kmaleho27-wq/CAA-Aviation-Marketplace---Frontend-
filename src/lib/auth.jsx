import { Navigate, useLocation } from 'react-router-dom';
import { supabase, userFromSession, decodeJwtClaims } from './supabase';
import { setSentryUser } from './sentry';

// ────────────────────────────────────────────────────────────────────
// Auth helpers — preserved signatures so consumers don't change.
//
// Storage layout (unchanged from the JWT-based implementation):
//   localStorage.token  → access token (mock JWT or supabase JWT)
//   localStorage.user   → JSON of {id, email, name, role}
//
// In MOCK mode: src/api/auth.js writes both keys via setSession() after a
// successful axios+mockAdapter login.
//
// In REAL mode: bootstrap() below subscribes to Supabase's onAuthStateChange
// and mirrors the session into the same two keys, so getToken/getUser/
// isTokenValid look identical to consumers.
// ────────────────────────────────────────────────────────────────────

let _bootstrapped = false;

function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;

  // Hydrate from any existing Supabase session (page reload).
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session) mirrorToLocalStorage(data.session);
  });

  // Mirror future auth events. Covers SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT.
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) mirrorToLocalStorage(session);
    else clearLocalStorage();
  });
}

function mirrorToLocalStorage(session) {
  const user = userFromSession(session);
  if (session.access_token) localStorage.setItem('token', session.access_token);
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
    setSentryUser(user);  // Tag Sentry scope so errors are attributable.
  }
}

function clearLocalStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setSentryUser(null);    // Clear Sentry user on logout.
}

// Run once at module import. Safe in mock mode — Supabase listener fires
// SIGNED_OUT and clears localStorage, which would clobber the mock token
// the user just set. Guard: only clear on the second-or-later SIGNED_OUT
// event (the first one is the no-session-on-load).
//
// Simpler approach: don't bootstrap in mock mode. Mock owns localStorage.
const isMockApi = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';
if (!isMockApi) bootstrap();

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  const raw = localStorage.getItem('user');
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  // Last-resort: decode whatever's in `token`. Works for both mock JWTs and
  // Supabase JWTs (both are real base64url-encoded payloads).
  const token = getToken();
  if (!token) return null;
  const claims = decodeJwtClaims(token);
  if (!claims.sub && !claims.email) return null;
  return {
    id: claims.sub,
    email: claims.email || 'user@naluka.com',
    role: claims.app_role || claims.role || 'AME',
    name: claims.name || (claims.email ? claims.email.split('@')[0] : 'Naluka User'),
  };
}

export function isTokenValid() {
  const token = getToken();
  if (!token) return false;
  const { exp } = decodeJwtClaims(token);
  if (!exp) return true;  // mock JWTs sometimes omit exp
  return exp * 1000 > Date.now();
}

/**
 * Used by mock-mode login flow only. In real mode, Supabase manages session
 * persistence and onAuthStateChange writes the same keys — calling setSession
 * is harmless but redundant.
 */
export function setSession({ token, user }) {
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
}

export function logout() {
  // Clear our keys synchronously first so callers that don't await still
  // see an immediately-logged-out app. Supabase signOut runs in background.
  clearLocalStorage();
  if (!isMockApi) {
    supabase.auth.signOut().catch(() => { /* ignore — already cleared locally */ });
  }
}

export function RequireAuth({ children }) {
  const location = useLocation();
  if (!isTokenValid()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * Bounce users to their proper surface if they hit a route their role
 * isn't allowed on. Sits inside RequireAuth so authentication is already
 * verified by the time RoleGate runs.
 *
 *   <RoleGate allow={['OPERATOR', 'SUPPLIER', 'AMO']}>...</RoleGate>
 *   <RoleGate allow="ADMIN">...</RoleGate>
 */
export function RoleGate({ allow, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!allowed.includes(user.role)) {
    return <Navigate to={landingPathForRole(user.role)} replace />;
  }
  return children;
}

/**
 * Where each role lands after login. Maps role enum → SPA route.
 *   ADMIN                     → /admin/overview (admin trust engine)
 *   AME                       → /m/jobs        (contractor mobile app)
 *   OPERATOR / AMO / SUPPLIER → /app/dashboard (operator web app)
 */
export function landingPathForRole(role) {
  switch (role) {
    case 'ADMIN':    return '/admin/overview';
    case 'AME':      return '/m/jobs';
    case 'OPERATOR':
    case 'AMO':
    case 'SUPPLIER':
    default:         return '/app/dashboard';
  }
}

/**
 * Human label for the role chip in the topbar. AME → "Engineer" reads
 * better than "Ame".
 */
export function roleLabel(role) {
  switch (role) {
    case 'ADMIN':    return 'Admin';
    case 'AME':      return 'Engineer';
    case 'AMO':      return 'Maintenance Org';
    case 'OPERATOR': return 'Operator';
    case 'SUPPLIER': return 'Supplier';
    default:         return 'User';
  }
}
