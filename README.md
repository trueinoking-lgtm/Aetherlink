# AetherLink

WhatsApp-sourced job feed with client-side matching, CV optimization, and Gmail-native applications.

## Apps

| Path | Purpose |
|------|---------|
| `apps/webapp` | Next.js PWA — feed, job detail, CV builder, tracker |
| `apps/waBot` | Baileys WhatsApp ingestion (deploy to Railway) |
| `apps/backend/supabase` | Schema, migrations, edge functions |

## Packages

| Package | Purpose |
|---------|---------|
| `@aetherlink/core` | Shared types, scorer, AI routing |
| `@aetherlink/ui` | Shared React components and Supabase client API |

## Quick start

1. Apply migration: `apps/backend/supabase/migrations/20250605000000_aetherlink.sql`
2. Copy `.env.example` → `.env` and fill values
3. `pnpm install && pnpm --filter @aetherlink/core build`
4. `pnpm --filter @aetherlink/webapp dev` (port 3002)
5. `pnpm --filter @aetherlink/wa-bot dev` (separate terminal)

See [AETHERLINK_DOGFOOD.md](./AETHERLINK_DOGFOOD.md) for the full validation loop.

## AI

All LLM calls use **Fireworks DeepSeek V4 Flash** via `libraries/core/src/ai/`.

## Docker (optional)

```bash
pnpm up
```
