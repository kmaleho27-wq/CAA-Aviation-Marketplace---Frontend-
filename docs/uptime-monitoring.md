# Uptime Monitoring — UptimeRobot

External uptime checks so you know within 5 minutes when the site /
API is down, not when a user emails you. Free tier covers what we
need for early stage.

~10 minutes setup. All work happens in the UptimeRobot dashboard.

## What we monitor

Three independent endpoints — each fails for a different reason, so
we want them all watched:

| Monitor | URL | Reason it might fail |
|---|---|---|
| **Frontend** | `https://naluka.aero` (or current Netlify URL) | Netlify outage, build pipeline broken, custom domain DNS broken |
| **Supabase REST** | `https://hrimskndpuuvftdskuae.supabase.co/rest/v1/` | Supabase project paused, region outage, JWT secret rotated incorrectly |
| **Cron heartbeat** | A custom endpoint we build that returns 200 only if `cron_health` shows all jobs healthy in the last 36h | Cron silently dead (bug we already fixed in migration 0013, but defence in depth) |

## 1. Sign up at UptimeRobot

- https://uptimerobot.com → free account (50 monitors, 5-min interval)
- Verify email

## 2. Add monitor — Frontend

- Click **Add New Monitor**
- **Type:** HTTP(s)
- **Friendly Name:** `Naluka Frontend`
- **URL:** `https://naluka.aero` (or `https://<your-netlify-subdomain>.netlify.app` if domain isn't live yet)
- **Monitoring Interval:** 5 minutes
- **HTTP Method:** GET
- **Send alert when down for:** 1 (alerts after first failed check)
- **Notifications:** add your email and/or Slack webhook (see below)
- **Save**

UptimeRobot will start probing immediately. Status flips to ✅ green within 5 minutes.

## 3. Add monitor — Supabase REST

- Click **Add New Monitor**
- **Type:** HTTP(s)
- **Friendly Name:** `Naluka Supabase API`
- **URL:** `https://hrimskndpuuvftdskuae.supabase.co/rest/v1/`
- **Monitoring Interval:** 5 minutes
- **Custom HTTP Headers:** add header
  - Header name: `apikey`
  - Header value: `<paste VITE_SUPABASE_ANON_KEY value>`
- **Save**

Supabase REST returns 200 with the OpenAPI catalogue when the API is up. If the project is paused or the region has an outage, this returns 5xx or times out → UptimeRobot alerts you.

## 4. Add monitor — Cron heartbeat (optional but recommended)

The site can be up while cron is silently dead. To monitor cron, expose a
read-only endpoint that returns 200 only when all jobs in `cron_health`
have `status='healthy'`.

### Option A — Supabase Edge Function

Deploy a small Edge Function `cron-healthcheck`:

```ts
// supabase/functions/cron-healthcheck/index.ts
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async () => {
  const sb = adminClient();
  const { data, error } = await sb.from('cron_health').select('*');
  if (error) return new Response('db error', { status: 500 });

  const unhealthy = (data ?? []).filter((r) => r.status !== 'healthy');
  if (unhealthy.length > 0) {
    return new Response(
      'unhealthy: ' + unhealthy.map((r) => `${r.job}:${r.status}`).join(','),
      { status: 503 }
    );
  }
  return new Response('all green', { status: 200 });
});
```

Deploy: `supabase functions deploy cron-healthcheck`. Then point UptimeRobot at:

- **URL:** `https://hrimskndpuuvftdskuae.supabase.co/functions/v1/cron-healthcheck`
- **Custom HTTP Headers:** `Authorization: Bearer <SUPABASE_ANON_KEY>`
- **Monitoring Interval:** 5 minutes

### Option B — skip and rely on the cron_health view directly

If you'd rather not deploy another Edge Function, manually check the
`cron_health` view weekly via the Supabase dashboard. Less rigorous;
easier to defer.

## 5. Notification channels

UptimeRobot → **My Settings** → **Alert Contacts**:

- **Email:** add `keith@naluka.aero` (or whichever address you read)
- **Slack:** if you have a Slack workspace, add the Slack webhook (free
  tier supports it). One channel like `#naluka-alerts` is plenty.
- **SMS:** paid tier only; not worth it at this stage

Tie each monitor to all alert contacts.

## 6. Status page (optional, free)

UptimeRobot offers a public status page (e.g.
`https://stats.uptimerobot.com/abc123`). Useful when you have paying
clients — link from the footer or a "/status" route. Skip for now.

## What does success look like

After an hour: all three monitors show ✅ with response times under 1
second. If anything goes red, you get an email/Slack within 5
minutes. If anything stays red for over 30 minutes, you investigate.

## When to revisit

- Once you have 50+ users → add a synthetic transaction monitor
  ("login + view dashboard") that runs every 15 minutes
- Once you're paying → consider Pingdom or Datadog (paid) for real
  user monitoring (RUM) and page-load performance tracking
- Once you're at multi-region → multi-location uptime probes
