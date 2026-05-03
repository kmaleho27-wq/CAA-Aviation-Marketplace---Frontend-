import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isTokenValid, getUser, landingPathForRole } from '../lib/auth';

/**
 * Lands here from Supabase Auth redirects:
 *   - Email confirmation: /auth/callback?type=signup&token_hash=...
 *   - Password reset:     /auth/callback?type=recovery&token_hash=...
 *   - Magic link:         /auth/callback#access_token=...&refresh_token=...
 *
 * supabase.js is configured with `detectSessionInUrl: true`, so the
 * client picks up the session automatically when this page mounts. We
 * just need to wait one tick, then route the user to the right surface.
 *
 * On first signup confirmation, profile.role defaults to AME (set by the
 * handle_new_user trigger from raw_user_meta_data). That can be changed
 * later in the operator's Settings page.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();

  useEffect(() => {
    // Force a session read so detectSessionInUrl runs synchronously.
    supabase.auth.getSession();
  }, []);

  // After Supabase swallows the URL hash/query, isTokenValid flips true.
  if (isTokenValid()) {
    const u = getUser();
    return <Navigate to={landingPathForRole(u?.role)} replace />;
  }

  // If the URL had an error code (expired token, invalid hash, etc.),
  // surface it. Otherwise show a tiny loading state.
  const err = params.get('error_description') ?? params.get('error');

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner} />
        <div style={styles.title}>{err ? 'Sign-in failed' : 'Confirming your account'}</div>
        <div style={styles.sub}>
          {err
            ? err
            : 'One moment — verifying the link from your email…'}
        </div>
        {err && (
          <a href="/login" style={styles.link}>Return to sign in</a>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    flex: 1,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 20%, rgba(21,32,67,0.6) 0%, var(--surface-base) 60%)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderTop: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl)',
    padding: '32px 28px',
    textAlign: 'center',
    boxShadow: 'var(--shadow-lg)',
  },
  spinner: {
    width: 32,
    height: 32,
    margin: '0 auto 18px',
    border: '2px solid rgba(212, 169, 52, 0.20)',
    borderTopColor: 'var(--color-mustard-500)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 400,
    fontSize: 22,
    color: 'var(--text-primary)',
    marginBottom: 6,
    letterSpacing: '0.01em',
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    lineHeight: 1.5,
  },
  link: {
    display: 'inline-block',
    marginTop: 16,
    color: 'var(--action-primary)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
};
