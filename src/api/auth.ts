import api, { isMockApi } from '../lib/api';
import { setSession } from '../lib/auth';
import { supabase, userFromSession } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Auth API.
//
// Two paths:
//   - MOCK (VITE_USE_MOCK_API=true): axios + mockAdapter, fixtures issue a
//     local JWT, setSession persists. Existing UI-demo flow.
//   - REAL: supabase.auth.* — Supabase manages tokens; src/lib/auth.jsx
//     mirrors session into localStorage.token / .user via onAuthStateChange.
//
// Both paths return the same shape: { id, email, name, role } for login/me,
// and the new user for register.
// ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  if (isMockApi) {
    const r = await api.post('/auth/login', { email, password });
    setSession({ token: r.data.token, user: r.data.user });
    return r.data.user;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw normalizeAuthError(error);
  const user = userFromSession(data.session);
  // Populate localStorage synchronously so the next render of TopBar / RequireAuth
  // sees the user immediately. Without this, the onAuthStateChange listener races
  // with the navigate() call and TopBar reads stale/empty user → wrong "Mode" chip.
  setSession({ token: data.session.access_token, user });
  return user;
}

export async function register({ name, email, password, role }) {
  if (isMockApi) {
    const r = await api.post('/auth/register', { name, email, password, role });
    return r.data;
  }

  // user_metadata.name + role get picked up by the handle_new_user trigger
  // (server-side: see supabase/migrations/0001_init.sql).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });
  if (error) throw normalizeAuthError(error);

  // If email confirmation is enabled in config.toml, `data.session` is null
  // until the user confirms. Caller (Register.jsx) navigates to /login either way.
  return {
    id: data.user?.id,
    email: data.user?.email,
    name,
    role,
  };
}

export async function me() {
  if (isMockApi) return api.get('/auth/me').then((r) => r.data);

  const { data, error } = await supabase.auth.getUser();
  if (error) throw normalizeAuthError(error);
  if (!data.user) throw new Error('Not signed in.');

  // Pull role + name from profile (the trigger inserted on signup).
  const { data: profile } = await supabase
    .from('profile')
    .select('id, email, name, role, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email,
    name: profile?.name || data.user.user_metadata?.name || (data.user.email ?? '').split('@')[0],
    role: profile?.role || data.user.user_metadata?.role || 'AME',
    avatarUrl: profile?.avatar_url ?? null,
  };
}

/** Normalize Supabase AuthError → axios-style err.response.data.message
 * so existing catch blocks keep working unchanged. */
function normalizeAuthError(err: { message?: string }): Error & {
  response?: { data: { message?: string } };
} {
  const wrapped = new Error(err.message || 'Authentication failed.') as Error & {
    response?: { data: { message?: string } };
  };
  wrapped.response = { data: { message: err.message } };
  wrapped.cause = err;
  return wrapped;
}
