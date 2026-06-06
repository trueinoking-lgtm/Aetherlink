# AetherLink — Dogfood checklist

Complete these steps before calling the product ready.

## 1. Database

```bash
cd apps/backend
npx supabase db push
# or apply migrations/20250605000000_aetherlink.sql in Supabase Studio
```

Create a bot system user in Auth, set `AETHERLINK_BOT_USER_ID` to that UUID.

## 2. WhatsApp bot (Railway)

1. Deploy `apps/waBot` with env from `.env.example`
2. Mount volume at `/data`
3. Scan QR from Railway logs
4. Confirm rows in `jobs` and `raw_data_archive`

If groups are quiet, run snippets from `seed_aetherlink_jobs.sql`.

## 3. Webapp

```bash
pnpm install
pnpm --filter @aetherlink/core build
pnpm --filter @aetherlink/webapp dev
```

Set all webapp env vars (Supabase, Fireworks, Google OAuth, encryption key).

## 4. API smoke tests

```bash
# CV rewrite (session cookie required)
curl -X POST http://localhost:3002/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{"bullets":["Managed accounts"],"jobTitle":"Accountant","missingRequirements":["QuickBooks"]}'
```

## 5. Gmail + apply loop

1. Sign up → onboarding → CV builder
2. Connect Gmail at `/api/auth/gmail/connect`
3. Open a job with `hr_email` on `/j/[id]`
4. Apply — verify email arrives from **your** Gmail address
5. If you would not send that email to a real HR contact, fix prompts and retry

## 6. Mobile

Install PWA on phone over mobile data; confirm `/feed` loads on 3G.
