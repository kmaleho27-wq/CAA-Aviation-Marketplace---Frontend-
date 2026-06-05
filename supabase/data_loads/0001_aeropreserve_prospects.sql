-- ─────────────────────────────────────────────────────────────────
-- Aeropreserve prospect import — 28 suppliers + 2 MRO customers
-- ─────────────────────────────────────────────────────────────────
--
-- Run AFTER migrations 0029 + 0030 are applied.
--
-- PREREQ — create Aeropreserve's account first:
--   1. Supabase dashboard → Authentication → Users → Add user
--   2. Email: kmaleho27@gmail.com   (or whatever Aeropreserve uses)
--   3. Password: pick anything; they'll reset on first sign-in
--   4. ✅ tick "Auto Confirm User"
--   5. Click Create user
--   6. Copy the new user's UUID (visible in the Users table)
--
-- Then EDIT THE LINE BELOW with that UUID:

-- ⚠️  REPLACE THIS WITH AEROPRESERVE'S REAL UUID  ⚠️
do $$
declare
  v_aeropreserve_id constant uuid := '00000000-0000-0000-0000-000000000000';
  v_count int;
begin
  if v_aeropreserve_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Edit this file: replace v_aeropreserve_id with Aeropreserve''s real auth.users UUID before running.';
  end if;

  -- Sanity check the user exists
  if not exists (select 1 from public.profile where id = v_aeropreserve_id) then
    raise exception 'No profile row for UUID %. Create Aeropreserve via Supabase Auth dashboard first.', v_aeropreserve_id;
  end if;

  -- Mark Aeropreserve as a broker with the agreed 50% cut
  update public.profile
     set referrer_cut_pct = 50.00
   where id = v_aeropreserve_id;

  -- Bulk insert all 30 prospects
  v_count := public.bulk_insert_prospects(
    v_aeropreserve_id,
    $JSON$
[
  {"organization": "AMP-Aero",                 "account_type": "supplier",      "suggested_markup_pct": "20"},
  {"organization": "Advantage",                "account_type": "supplier",      "suggested_markup_pct": "114.27"},
  {"organization": "AerFin",                   "account_type": "supplier",      "contact_email": "info@aerfin.com",                "contact_phone": "+44 (0) 2920 109 890",   "country": "GB", "suggested_markup_pct": "34.29"},
  {"organization": "Aeras Aviation",           "account_type": "supplier",      "contact_email": "sales@aerasaviation.com",        "contact_phone": "+971 4 564 0410",        "country": "AE", "suggested_markup_pct": "106.04"},
  {"organization": "Aermach",                  "account_type": "supplier",      "contact_email": "sales@aermach.co.uk",            "contact_phone": "029 2115 1045",          "country": "GB", "suggested_markup_pct": "20"},
  {"organization": "Aero Engines Services",    "account_type": "supplier",      "suggested_markup_pct": "62.94"},
  {"organization": "Aerobay",                  "account_type": "supplier",      "contact_email": "contact@aero-bay.com",           "contact_phone": "+33 9 86 76 78 33",      "country": "FR", "suggested_markup_pct": "200"},
  {"organization": "Aerofulcrum Inc",          "account_type": "supplier"},
  {"organization": "Aviation Power",           "account_type": "supplier",      "suggested_markup_pct": "94.09"},
  {"organization": "Beach Aviation",           "account_type": "supplier",      "contact_phone": "+1 772 577 7787",                "country": "US", "suggested_markup_pct": "100"},
  {"organization": "Czech Airlines Technics",  "account_type": "supplier",      "contact_email": "sales@csatechnics.com",          "contact_phone": "+420 220 114 544",       "country": "CZ", "suggested_markup_pct": "130.41"},
  {"organization": "Euram Air Leases",         "account_type": "supplier",      "contact_phone": "+353 57 860 6970",               "country": "IE", "suggested_markup_pct": "46.15"},
  {"organization": "GA Telesis",               "account_type": "supplier",      "contact_email": "sales@gatelesis.com",            "contact_phone": "+1 954 676 3111",        "country": "US", "suggested_markup_pct": "73.51"},
  {"organization": "GMF Aero Asia",            "account_type": "supplier",      "country": "ID", "suggested_markup_pct": "70.16"},
  {"organization": "Heico",                    "account_type": "supplier",      "contact_email": "sales@heico.com",                "contact_phone": "+1 (954) 987-4000",      "country": "US"},
  {"organization": "JAD Aero",                 "account_type": "supplier",      "contact_email": "sales@jadaero.com",              "contact_phone": "+1 786 788 5249",        "country": "US", "suggested_markup_pct": "64.64"},
  {"organization": "Jet International",        "account_type": "supplier",      "suggested_markup_pct": "91.32"},
  {"organization": "Magellan",                 "account_type": "supplier",      "suggested_markup_pct": "100.56",                  "notes": "Highest-volume supplier in historical orders (12 deals)"},
  {"organization": "Mitchell Aviation",        "account_type": "supplier",      "suggested_markup_pct": "133.61"},
  {"organization": "PDQ Spares",               "account_type": "supplier",      "suggested_markup_pct": "91"},
  {"organization": "Setna IO",                 "account_type": "supplier",      "contact_email": "info@setnaio.com",               "contact_phone": "+1 (312) 549-4459",      "country": "US", "suggested_markup_pct": "100"},
  {"organization": "Skytronics",               "account_type": "supplier",      "contact_phone": "(562) 741-5475",                 "country": "US", "suggested_markup_pct": "45.83"},
  {"organization": "TCAS Aero",                "account_type": "supplier",      "contact_email": "general.manager@tcasaero.com",                                              "suggested_markup_pct": "81.25"},
  {"organization": "Talon Talon Air Services", "account_type": "supplier",      "suggested_markup_pct": "100"},
  {"organization": "Tradex Aviation Solutions","account_type": "supplier",      "suggested_markup_pct": "118.75"},
  {"organization": "True Aero",                "account_type": "supplier",      "contact_email": "sales@trueaero.com",             "contact_phone": "+1 772 925 8026",        "country": "US", "suggested_markup_pct": "110.8"},
  {"organization": "VC Aerospace",             "account_type": "supplier",      "contact_email": "sales@vcaerospace.com",          "contact_phone": "+1 352 796 0060",        "country": "US", "suggested_markup_pct": "85.88"},
  {"organization": "Viman Aviation",           "account_type": "supplier",      "contact_email": "sales@vimanaviation.com",        "contact_phone": "+1 866 858 3118",        "country": "US", "suggested_markup_pct": "100"},
  {"organization": "S7 Engineering LLC",       "account_type": "mro_customer",  "country": "RU", "notes": "Engine MRO subsidiary of S7 Airlines"},
  {"organization": "Aero Thrust Technics",     "account_type": "mro_customer",  "country": "US", "notes": "US-based engine MRO"}
]
    $JSON$::jsonb
  );

  raise notice 'Imported % prospects attributed to Aeropreserve (%)', v_count, v_aeropreserve_id;
end$$;

-- Verify import worked
select
  account_type,
  count(*)                                                  as count,
  count(*) filter (where contact_email is not null)         as with_email,
  count(*) filter (where contact_phone is not null)         as with_phone,
  count(*) filter (where suggested_markup_pct is not null)  as with_markup_pct,
  round(avg(suggested_markup_pct), 1)                       as avg_suggested_markup_pct
from public.prospective_account
group by account_type
order by account_type;
