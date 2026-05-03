# Naluka — Daily Launch Guide

Save this. Every time you want to run the app, follow it top to bottom.

---

## 🟢 Easy mode (no backend, no internet, no Docker)

Use this 99% of the time. The app runs offline with demo data.

### 1. Open PowerShell
Press the **Windows key**, type `powershell`, hit **Enter**.

### 2. Go to the project
Copy-paste this exact line, hit Enter:
```
cd C:\Users\kmale\Documents\GitHub\SACAA-Aviation-Marketplace---Frontend-
```

### 3. Make sure mock mode is on
Open `.env` in Notepad:
```
notepad .env
```
The very first non-comment line should say:
```
VITE_USE_MOCK_API=true
```
If it says `false`, change it to `true`. Save (**Ctrl+S**) and close.

### 4. Start the app
```
npm run dev
```
Wait until you see:
```
➜  Local:   http://localhost:5173/
```

### 5. Open in browser
Go to: **http://localhost:5173**

### 6. Sign in
Click **Sign in** (top-right). Use:
- Email: `operator@naluka.aero`
- Password: `demo1234`

Other accounts:
- `admin@naluka.aero` / `demo1234` → admin console at `/admin/overview`
- `contractor@naluka.aero` / `demo1234` → mobile app at `/m/jobs`

(Any email + a password starting with `demo` also works.)

### 7. To stop later
Go back to PowerShell, press **Ctrl+C**, then **Y**, then **Enter**.

---

## 🔵 Real mode (live Supabase backend)

Use this when you want real persisted data (procuring a part actually
saves it, sign-offs really hit the audit chain, etc.).

**One-time setup** — only the very first time:

### A. Create a Supabase project
1. Go to **https://app.supabase.com** and sign in (free tier is fine).
2. Click **New project**:
   - Name: `naluka`
   - Region: closest to you (Europe West for ZA)
   - Database password: **save this somewhere — you'll need it**
3. Wait ~2 minutes for the project to provision.

### B. Copy your keys
1. In Supabase: **Settings → API**.
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxxx.supabase.co`)
   - **anon public** key (the long one starting with `eyJ…`)
3. Open `.env` in your project: `notepad .env`
4. Paste them in:
   ```
   VITE_SUPABASE_URL=https://xxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Change `VITE_USE_MOCK_API=true` to `false`.
6. Save and close.

### C. Push the schema
You need the Supabase CLI. Install it once:
```
scoop install supabase
```
(If you don't have Scoop, get it from https://scoop.sh — or download
the CLI binary directly from
https://github.com/supabase/cli/releases.)

Then:
```
cd C:\Users\kmale\Documents\GitHub\SACAA-Aviation-Marketplace---Frontend-
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```
(Your `project-ref` is the part of the URL between `https://` and
`.supabase.co`.)

### D. Seed demo data
1. In Supabase dashboard: **Settings → API → service_role secret** —
   click **Reveal**, copy the long key.
2. In PowerShell:
   ```
   $env:SUPABASE_URL="https://xxxxxx.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   node scripts/seed-supabase.mjs
   ```
3. You should see "Seed complete" with counts of rows created.

**Daily launches in real mode** (after one-time setup):

### 1. Start the frontend
```
cd C:\Users\kmale\Documents\GitHub\SACAA-Aviation-Marketplace---Frontend-
npm run dev
```

### 2. Open the app
**http://localhost:5173**

### 3. Sign in
Same demo accounts as easy mode. The first time you log in,
Supabase will check the credentials against the seeded users.

### 4. Stop later
**Ctrl+C** in PowerShell. Supabase keeps running in the cloud — no
shutdown needed.

---

## 🔀 Switching between modes

Just edit `.env`:
- Easy mode: `VITE_USE_MOCK_API=true`
- Real mode: `VITE_USE_MOCK_API=false`

Save, and Vite auto-restarts. **Hard-refresh the browser** (Ctrl+Shift+R)
afterwards or you'll see stale cached code.

---

## 🆘 If something breaks

| Problem | Fix |
|---|---|
| Browser shows `Unexpected token '<'` | Hard-refresh: **Ctrl+Shift+R** |
| `cd : Cannot find path` | Use the full path: `cd C:\Users\kmale\Documents\GitHub\SACAA-Aviation-Marketplace---Frontend-` |
| `Port 5173 is already in use` | Old `npm run dev` still running. Find that PowerShell window and **Ctrl+C**, or just restart your computer. |
| Pages show "Not signed in" / errors after login | You're in real mode without keys. Either flip to mock (`VITE_USE_MOCK_API=true`) or fill in the Supabase keys. |
| Console says `[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set` | Same fix as above. |
| `npm install` errors | Delete the `node_modules` folder, run `npm install` again. |
| Can't sign in even with correct password (real mode) | The seed didn't run, or it ran against a different project. Re-run step **D** above. |
| Browser blank page | Open DevTools (**F12**) → Console tab → copy the red error text and ask me. |

---

## 🧠 Cheat sheet — what each command does

| Command | What it does |
|---|---|
| `cd <path>` | Move into a folder |
| `npm install` | Download all packages this project needs (one-time) |
| `npm run dev` | Start the Vite dev server on port 5173 |
| `notepad .env` | Open the env config file in Notepad |
| `supabase db push` | Apply migrations to your Supabase project |
| `supabase login` | Authenticate the CLI with your Supabase account |
| `Ctrl+C` | Stop whatever's running in this PowerShell window |
| `Ctrl+Shift+R` | Hard-refresh browser (clears cached files for that page) |

---

## 📋 The 5-second TL;DR

**Just want to see the app?**
```
cd C:\Users\kmale\Documents\GitHub\SACAA-Aviation-Marketplace---Frontend-
npm run dev
```
Open **http://localhost:5173**, log in with `operator@naluka.aero` /
`demo1234`. (Make sure `.env` has `VITE_USE_MOCK_API=true`.)

---

## 🗃️ Heads up — old guide is wrong

If you find a folder called `server/` with its own README — that was the
old Express + Prisma backend (built phases B0–B10). It's been replaced by
Supabase. **Don't run anything in there** — those instructions are stale.
The new schema lives in `supabase/migrations/` and the new API lives in
`supabase/functions/`.
