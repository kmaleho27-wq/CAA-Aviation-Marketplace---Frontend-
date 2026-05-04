# Custom SMTP — emails from `@naluka.aero`

Right now Supabase auth emails (signup confirmation, password reset, magic
links) come from `noreply@mail.app.supabase.io`. Gmail flags those as
suspicious for B2B recipients, and recipients see the wrong sender.

This wires Supabase Auth through your own SMTP so emails come from
`noreply@naluka.aero` (or whatever sender address you choose).

~1 hour if you already have an account with a transactional email
provider, ~2 hours if you're starting fresh.

## Pick a provider

Any will work — Supabase just needs SMTP credentials. Recommended for
South Africa-based projects:

- **Resend** (https://resend.com) — modern, generous free tier (3000/mo),
  fast setup. Recommended.
- **Postmark** — premium, expensive but excellent deliverability
- **SendGrid** — works, more setup overhead than Resend
- **Mailgun** — works, good for high volume
- **AWS SES** — cheapest at scale, more DNS work upfront

The rest of this doc assumes Resend. Other providers are similar — get
SMTP host / port / username / password and skip to step 4.

## 1. Sign up at Resend

- https://resend.com → sign up (free)
- Verify your email

## 2. Add and verify the sending domain

1. Resend dashboard → **Domains** → **Add Domain** → `naluka.aero`
2. Resend shows DNS records to add:
   - 3× TXT records (SPF + DKIM)
   - 1× MX record (optional, for receiving bounces)
3. Add those records at your DNS provider (Netlify DNS / your registrar)
4. Wait 5–60 min, click **Verify**. Status flips to ✅

This is critical — without DKIM your emails will go to spam regardless of
SMTP being correctly configured.

## 3. Generate an SMTP API key

- Resend dashboard → **API Keys** → **Create**
- Name: `supabase-auth`
- Permission: **Sending access** only
- Domain: `naluka.aero` (restrict scope)
- Copy the key — `re_...`. **Save it now**, it's shown once

## 4. Configure Supabase Auth SMTP

1. Supabase dashboard → **Authentication** → **Settings** → scroll to
   **SMTP Settings**
2. Toggle **Enable Custom SMTP**
3. Fill in:

   | Field            | Value                          |
   |------------------|--------------------------------|
   | Sender email     | `noreply@naluka.aero`          |
   | Sender name      | `Naluka`                       |
   | Host             | `smtp.resend.com`              |
   | Port             | `465` (SSL) or `587` (STARTTLS)|
   | Username         | `resend`                       |
   | Password         | `re_...` (the API key from step 3) |
   | Minimum interval | `60` seconds (rate limit)       |

4. **Save**

## 5. Update email templates (optional)

Supabase ships defaults, but they say "Supabase". Customise:

1. **Authentication** → **Email Templates**
2. For each (Confirm signup, Magic Link, Reset Password, Change Email):
   - Update the subject line — e.g. `Confirm your Naluka account`
   - Update the HTML body — replace "Supabase" with "Naluka",
     add your logo, etc.
3. Use the existing `{{ .ConfirmationURL }}` / `{{ .Token }}` /
   `{{ .Email }}` template variables — don't rename them

## 6. Test

1. Open an incognito window → register at `https://naluka.aero/register`
   with a real email you control
2. Check your inbox — should see:
   - **From:** `Naluka <noreply@naluka.aero>`
   - **Inbox**, not Spam
   - SPF / DKIM both pass (view email headers)
3. Click the confirmation link — should land at
   `https://naluka.aero/auth/callback` with you signed in

## Troubleshooting

- **Email lands in spam** → DKIM not yet verified. Re-check step 2 records.
- **"Email not sent" error in Supabase** → SMTP credentials wrong, or rate
  limit too aggressive. Check Resend logs: Resend dashboard → **Logs**.
- **Stuck "verifying domain"** → propagation. Most DNS providers take
  5–60 min. Cloudflare is instant if proxy is OFF.
- **Custom From shows as `via supabase.co`** → SPF record missing the
  Resend block. Add the TXT record exactly as Resend shows.

## Rotation policy

The API key only needs sending access on one domain — low blast radius if
leaked. Still:

- Rotate annually
- Rotate immediately if anyone outside Naluka had access to the Supabase
  dashboard during a session

## Cost

Free for the first 3000 emails/month. Past that, ~$20/mo for 50k.
For an early-stage marketplace this is essentially free for a long time.
