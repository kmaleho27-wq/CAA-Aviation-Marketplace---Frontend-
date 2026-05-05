// send-welcome-email
//
// Fired by approve_personnel RPC (migration 0016) via pg_net.http_post
// when an admin approves a self-registered or operator-added crew
// member. Sends a welcome email via Resend so the user knows they're
// now bookable.
//
// Body: { personnel_id: string }
// Returns: { sent: boolean, reason?: string }
//
// Auth: pg_net passes CRON_SECRET via x-cron-secret. Same auth pattern
// as the sweep functions — config.toml verify_jwt = false.
//
// Graceful degradation: if RESEND_API_KEY is unset, returns 200 with
// sent=false + reason. Lets us deploy this Edge Function before the
// secret is wired (so approve_personnel doesn't break when calling).

import { adminClient, isCronAuthorized } from '../_shared/supabase.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_ADDRESS = Deno.env.get('WELCOME_EMAIL_FROM') ?? 'Naluka <welcome@naluka.aero>';
const APP_BASE = Deno.env.get('APP_BASE_URL') ?? 'https://naluka.aero';

const DISCIPLINE_LABEL: Record<string, string> = {
  flight_crew:      'Pilot',
  national_pilot:   'National Pilot',
  flight_engineer:  'Flight Engineer',
  cabin_crew:       'Cabin Crew',
  atc:              'Air Traffic Controller',
  ame:              'Aircraft Maintenance Engineer',
  aviation_medical: 'Designated Aviation Medical Examiner',
  glider_pilot:     'Glider Pilot',
  balloon_pilot:    'Balloon Pilot',
  rpas_pilot:       'RPAS Pilot',
  non_licensed:     'Aviation Operations',
};

Deno.serve(async (req) => {
  if (!isCronAuthorized(req)) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json().catch(() => null) as { personnel_id?: string } | null;
  if (!body?.personnel_id) {
    return new Response(JSON.stringify({ sent: false, reason: 'missing personnel_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sb = adminClient();

  // Look up the personnel + linked profile (for email + name).
  const { data: ppl, error: pplErr } = await sb
    .from('personnel')
    .select('id, name, discipline, user_id')
    .eq('id', body.personnel_id)
    .maybeSingle();

  if (pplErr || !ppl) {
    return new Response(JSON.stringify({ sent: false, reason: 'personnel not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Operator-added crew with no auth account → no email to send.
  if (!ppl.user_id) {
    return new Response(JSON.stringify({ sent: false, reason: 'no linked user_id (operator-added crew)' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await sb
    .from('profile')
    .select('email, name')
    .eq('id', ppl.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return new Response(JSON.stringify({ sent: false, reason: 'no email on profile' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Graceful degradation when Resend isn't configured yet.
  if (!RESEND_API_KEY) {
    console.log('[send-welcome-email] RESEND_API_KEY not set — would have emailed', profile.email);
    return new Response(JSON.stringify({
      sent: false,
      reason: 'RESEND_API_KEY not configured — set the secret in Supabase to enable',
      would_have_sent_to: profile.email,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const disciplineLabel = DISCIPLINE_LABEL[ppl.discipline as string] ?? 'Aviation Professional';
  const firstName = (profile.name ?? '').split(/\s+/)[0] || 'there';

  const subject = 'Welcome to Naluka — your verification is approved';
  const text = `Hi ${firstName},

Your Naluka account is now verified — you're listed as a ${disciplineLabel} in the marketplace and operators can book you.

Next steps:
  1. Set yourself as available — sign in at ${APP_BASE}/login and toggle the "Available for Contracts" switch on your profile.
  2. Upload any remaining compliance documents from your profile so operators see a complete picture.
  3. Watch your bell for licence-expiry alerts — we'll ping you 90, 30, and 7 days before any of your documents lapse.

Questions? Reply to this email.

— The Naluka team
${APP_BASE}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #2A3040; line-height: 1.55;">
  <h1 style="font-weight: 400; font-size: 22px; color: #0F1A33; margin: 0 0 16px;">
    Welcome to Naluka
  </h1>
  <p>Hi ${firstName},</p>
  <p>Your account is <strong style="color: #3A8A6E;">verified</strong> — you're listed as a <strong>${disciplineLabel}</strong> in the marketplace and operators can book you.</p>
  <h2 style="font-size: 14px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #5C6786; margin: 24px 0 8px;">Next steps</h2>
  <ol style="padding-left: 20px;">
    <li><strong>Set yourself as available.</strong> Sign in at <a href="${APP_BASE}/login" style="color: #B84A1A;">${APP_BASE}/login</a> and toggle the "Available for Contracts" switch on your profile.</li>
    <li><strong>Upload any remaining compliance documents</strong> from your profile so operators see a complete picture.</li>
    <li><strong>Watch your bell</strong> — we'll ping you 90, 30, and 7 days before any of your licences expire.</li>
  </ol>
  <p style="margin-top: 24px;">Questions? Just reply to this email.</p>
  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
    Naluka — Africa's aviation marketplace · <a href="${APP_BASE}" style="color: #6B7280;">${APP_BASE.replace(/^https?:\/\//, '')}</a>
  </p>
</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [profile.email],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('[send-welcome-email] Resend error', res.status, errBody);
      return new Response(JSON.stringify({ sent: false, reason: `resend ${res.status}: ${errBody.slice(0, 200)}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const j = await res.json().catch(() => ({}));
    return new Response(JSON.stringify({ sent: true, resend_id: j.id ?? null, to: profile.email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-welcome-email] fetch failed', e);
    return new Response(JSON.stringify({ sent: false, reason: (e as Error).message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
