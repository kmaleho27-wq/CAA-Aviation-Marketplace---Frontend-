# Custom Domain — `naluka.aero`

Step-by-step to put `naluka.aero` (apex) and `www.naluka.aero` in front of
the Netlify deployment. ~30 min if DNS is already with a registrar you
control.

## Pre-flight

- You own `naluka.aero` (or whatever apex you're using)
- You have access to its DNS records at the registrar (e.g. domains.co.za, Cloudflare, GoDaddy)
- You're logged in as Owner of the Netlify site for the project

## 1. Add the domain in Netlify

1. Open the site in Netlify dashboard → **Domain management**
2. Click **Add a domain** → enter `naluka.aero` → **Verify**
3. Netlify asks if you want to use Netlify DNS or external DNS. Pick:
   - **Netlify DNS** (recommended) — Netlify hosts the zone, easier
   - **External DNS** if you'd rather keep DNS at your existing registrar (e.g. you have other records there)

Both work. Netlify DNS gets you faster propagation and free Let's Encrypt
without you adding any records yourself.

## 2a. If you picked Netlify DNS

- Netlify shows you 4 nameservers like
  `dns1.p01.nsone.net` … `dns4.p01.nsone.net`
- Go to your registrar's DNS settings → **change nameservers** to those 4
- Save. Propagation takes 15 min – 24 h (usually <1 h)
- Once nameservers propagate, Netlify auto-provisions Let's Encrypt cert and shows ✅

## 2b. If you picked external DNS

Add these records at your registrar:

| Type  | Host  | Value                              | TTL    |
|-------|-------|------------------------------------|--------|
| ALIAS / ANAME / flattened A | `@` (apex) | `apex-loadbalancer.netlify.com` | 3600 |
| CNAME | `www` | `<your-site-name>.netlify.app`     | 3600   |

Notes:
- Many registrars don't support ALIAS at the apex. If yours doesn't, use
  **A records** to Netlify's load balancer IPs (see Netlify docs — they
  rotate, so always copy from the dashboard at the moment you set up).
- After records propagate, click **Verify DNS** in Netlify. SSL provisions automatically.

## 3. Set the primary domain

In Netlify → Domain management → click `naluka.aero` row → **Set as primary**.
This makes Netlify 301-redirect `www.naluka.aero` → `naluka.aero` (or vice versa
if you prefer www-primary).

## 4. Update Supabase auth redirect URLs

The auth confirmation links currently redirect to the Netlify subdomain.
Add the new domain as an authorised redirect:

1. Supabase dashboard → **Authentication** → **URL Configuration**
2. **Site URL** → `https://naluka.aero`
3. **Additional Redirect URLs** → add `https://naluka.aero/auth/callback` and
   `https://www.naluka.aero/auth/callback`
4. Save

Without this, signup confirmation emails will bounce users back to the old
Netlify subdomain.

## 5. Update PayFast return / cancel / notify URLs

If you're using PayFast and configured return URLs in the Edge Function env
or PayFast dashboard:

- `PAYFAST_RETURN_URL` → `https://naluka.aero/payments/return`
- `PAYFAST_CANCEL_URL` → `https://naluka.aero/payments/cancel`
- `PAYFAST_NOTIFY_URL` → `https://naluka.aero/functions/v1/payfast-itn`
  (or whatever your Edge Function path resolves to)

## 6. Verify

```
curl -I https://naluka.aero
```

Should return `HTTP/2 200` with a Netlify edge header. Open the site in
an incognito tab — fresh cert, no warnings.

## Rollback

If anything's wrong, in Netlify → Domain management → **Remove domain**.
The `*.netlify.app` URL keeps working unaffected.
