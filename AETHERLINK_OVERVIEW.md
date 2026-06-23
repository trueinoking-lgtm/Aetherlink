# AetherLink — Product & Architecture Overview

> **Version**: 2.4.0 | **Last updated**: June 2026

---

## 1. What Is AetherLink?

AetherLink is a **Zimbabwe-focused job aggregation platform** that:

1. **Ingests** job postings from WhatsApp groups, job boards (Jobs Zimbabwe, VacancyMail, etc.), and other public sources
2. **Structures** raw text into structured data (title, company, requirements, deadline, salary, application method) using AI
3. **Matches** jobs to users based on their skills, location, and preferences
4. **Serves** a mobile-first PWA where users browse, save, apply to jobs, and track applications
5. **Tracks** CTA clicks, saves, and application patterns for analytics

**Core value**: Instead of scraping full structured data (which fails on 80% of African job posts), AetherLink uses a **source-first model** — always linking to the original listing, surfacing what it can extract, and being transparent about completeness.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA INGESTION                                │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐      │
│  │  WhatsApp     │    │  Site        │    │  Manual / API        │      │
│  │  (waBot)      │    │  Scrapers    │    │  Ingestion           │      │
│  │  Baileys      │    │  (Python)    │    │                      │      │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘      │
│         │                   │                       │                  │
└─────────┼───────────────────┼───────────────────────┼──────────────────┘
          │                   │                       │
          ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PROCESSING PIPELINE                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │  Python Backend (/root/aetherlink/)                          │       │
│  │                                                              │       │
│  │  1. raw_archive_writer → archive raw text to DB              │       │
│  │  2. job_structurer     → is_publishable() quality gate      │       │
│  │  3. parsers/jobs_zimbabwe → extract structured fields        │       │
│  │  4. scorer             → compute match scores                │       │
│  │  5. backfill_incomplete → re-parse archived raw data         │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  Supabase (PostgreSQL + Auth + RLS + Realtime)           │          │
│  │                                                          │          │
│  │  Tables:                                                 │          │
│  │  ├── jobs (core listings, is_publishable flag)           │          │
│  │  ├── saved_jobs (user saves + applied status)            │          │
│  │  ├── job_cta_clicks (CTA analytics)                      │          │
│  │  ├── raw_data_archive (original text for re-parsing)     │          │
│  │  ├── profiles (user skills, preferences)                 │          │
│  │  ├── applications (legacy, replaced by saved_jobs)       │          │
│  │  ├── employer_signals (verified employers)               │          │
│  │  └── links, sites, notes, reviews                        │          │
│  │                                                          │          │
│  │  Key RPCs:                                               │          │
│  │  ├── list_feed_jobs (paginated, publishable-only)        │          │
│  │  ├── get_feed_job (single job, publishable-only)         │          │
│  │  ├── track_cta_click (analytics insert)                  │          │
│  │  ├── toggle_save_job (save/unsave)                       │          │
│  │  ├── mark_job_applied (mark saved as applied)            │          │
│  │  └── list_saved_jobs (user's tracked jobs)               │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       FRONTEND (Next.js PWA)                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  apps/webapp (Next.js 16, App Router, React 19)          │          │
│  │                                                          │          │
│  │  Pages:                                                  │          │
│  │  ├── /                     → Landing / login              │          │
│  │  ├── /feed                 → Job feed with filters       │          │
│  │  ├── /feed/[id]            → Job detail + CTA + save     │          │
│  │  ├── /applied              → Application tracker          │          │
│  │  ├── /cv                   → CV builder                   │          │
│  │  ├── /onboarding           → Skill/preference setup       │          │
│  │  ├── /dashboard            → Main dashboard               │          │
│  │  └── /tracker              → Legacy tracker redirect      │          │
│  │                                                          │          │
│  │  Key Components:                                         │          │
│  │  ├── getApplicationAction() → CTA priority logic         │          │
│  │  ├── SaveJobButton          → Save with Supabase sync    │          │
│  │  ├── MarkAsAppliedButton    → Manual applied tracking     │          │
│  │  ├── trackCtaClick()        → Fire-and-forget analytics   │          │
│  │  ├── useSavedJobs()         → localStorage save hook      │          │
│  │  └── ScoreCircle            → Match score visualization   │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                                                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE                                    │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────┐        │
│  │  CloudDNS   │───▶│  nginx      │───▶│  PM2 (standalone     │        │
│  │  DDNS       │    │  (443→3002) │    │  Next.js server)     │        │
│  │  (dynamic)  │    │  SSL proxy  │    │  port 3002           │        │
│  └─────────────┘    └─────────────┘    └──────────────────────┘        │
│                                                                         │
│  Domain: aetherlink.cloud-ip.cc                                        │
│  Server: 178.104.213.110 (self-hosted VPS)                             │
│  Deploy: `bash scripts/deploy.sh`                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. How Part A Reacts to Part B

### 3.1 WhatsApp Message → Job Listing

```
WhatsApp Group Message
        │
        ▼
waBot (pipeline.ts)
    ├── isJobPost() → keyword filter (cv, hiring, vacancy, etc.)
    ├── archiveRawMessage() → store in raw_data_archive
    ├── isDuplicate() → MD5 hash check against existing jobs
    ├── compressText() → strip emojis, URLs, non-ASCII
    └── structureJobPost() → Fireworks AI extraction
            │
            ▼
    Supabase INSERT into `jobs`
    (is_shared=true, is_publishable determined by job_structurer)
            │
            ▼
    job_structurer.py (quality gate)
    ├── is_publishable() → title + ≥2 detail fields + source_url
    └── promote_row() → set is_publishable=true
            │
            ▼
    Feed becomes visible to users
```

### 3.2 Website Scraper → Job Listing

```
Site Scraper Engine (site_scraper_engine.py)
    ├── Discover detail URLs from listing pages
    ├── Fetch each detail page (requests + Playwright fallback)
    ├── write_raw() → archive to raw_data_archive
    └── For each new listing:
            │
            ▼
    run_structurer.py → job_structurer.py
    ├── Parse raw text (Jobs Zimbabwe format)
    ├── is_publishable() quality gate
    └── promote_row() → insert/update job
            │
            ▼
    Feed updated
```

### 3.3 User Browses Feed → CTA Click

```
User opens /feed/[id]
        │
        ▼
getFeedJob RPC → returns job (only if is_publishable=true)
        │
        ▼
getApplicationAction() determines CTA:
    Priority: source_url → application_url → email → WhatsApp → phone → instructions → none
        │
        ▼
User clicks CTA
    ├── trackCtaClick() → fire-and-forget Supabase insert
    ├── SaveJobButton → toggle_save_job RPC + localStorage
    └── MarkAsAppliedButton → mark_job_applied RPC + localStorage
```

### 3.4 User Saves a Job → Tracker Page

```
User clicks "Save" on /feed/[id]
        │
        ▼
toggle_save_job RPC
    ├── If exists → DELETE (unsave)
    └── If new → INSERT into saved_jobs
        │
        ▼
localStorage fallback (offline support)
        │
        ▼
User visits /applied
    ├── list_saved_jobs RPC → returns job details + applied status
    ├── Filter tabs: All / Saved / Applied
    └── Remove button → delete from Supabase + localStorage
```

---

## 4. Component Behaviors

### 4.1 Quality Gate (`is_publishable`)

Located in `job_structurer.py`, this function decides whether a job appears in the feed:

| Check | Requirement |
|-------|-------------|
| Title | Must be non-empty |
| Detail fields | ≥ 2 of: summary, responsibilities, requirements, application_email, application_url, how_to_apply |
| Source URL | Required for all website-scraped jobs (source_group starts with "http") |
| Application method | Must have email/phone/url/instructions OR valid source_url |

**Result**: Jobs that fail are archived but hidden from feed. They can be re-parsed via `backfill_incomplete_jobs.py`.

### 4.2 CTA Resolution (`getApplicationAction`)

Frontend function in `/feed/[id]/page.tsx`. Determines what button to show:

| Priority | Field | Button Label | Icon |
|----------|-------|-------------|------|
| 1 | `source_url` | "View original listing" | external |
| 2 | `application_url` | "Open application link" | external |
| 3 | `application_email` | "Email employer" | email |
| 4 | `application_phone` + WhatsApp | "Contact via WhatsApp" | whatsapp |
| 5 | `application_phone` | "Contact employer" | phone |
| 6 | `how_to_apply` | "View application instructions" | instructions |
| 7 | `externalUrl` | "View original listing" | external |
| 8 | none | muted text (no button) | unavailable |

### 4.3 Match Scoring (`computeMatchScore`)

Keyword-overlap scoring between job requirements and user skills/certifications/experience:

- Score = matched requirements / total requirements × 100
- ≥ 80% → "Strong match" (green)
- ≥ 50% → "Good match" (amber)
- < 50% → "Low match" (red)
- Requires ≥ 3 user skills to activate

### 4.4 Feed Filtering

Client-side filters on `/feed`:

| Filter | Logic |
|--------|-------|
| Search | Title/company contains query |
| Job type | Exact match (remote/hybrid/onsite) |
| Salary range | Numeric parse + range check |
| Date posted | Created within period |
| Trust: Newest | Sort by created_at desc |
| Trust: Closing soon | Has future deadline, sort ascending |
| Trust: Best match | Match score ≥ 50, sort desc |
| Trust: Has source | source_group is non-empty |
| Trust: Has deadline | closing_date is non-empty |
| Suited for me | Match score ≥ 80 |

### 4.5 Data Flow: Supabase RLS (Row Level Security)

| Table | Authenticated Users | Service Role |
|-------|-------------------|--------------|
| `jobs` | Read-only (via RPCs) | Full CRUD |
| `saved_jobs` | Manage own rows only | Full access |
| `job_cta_clicks` | Read own clicks | Full access |
| `profiles` | Read/update own | Full access |

---

## 5. Repository Structure

```
Aetherlink/                          ← pnpm monorepo root
├── apps/
│   ├── webapp/                      ← Next.js frontend
│   │   ├── src/app/
│   │   │   ├── page.tsx             ← Landing
│   │   │   ├── (dashboard)/
│   │   │   │   ├── feed/            ← Job feed + detail
│   │   │   │   ├── applied/         ← Tracker
│   │   │   │   ├── cv/              ← CV builder
│   │   │   │   ├── cv-builder/     ← CV tailoring
│   │   │   │   ├── dashboard/      ← Main dashboard
│   │   │   │   └── onboarding/     ← Setup wizard
│   │   │   └── api/                ← API routes
│   │   ├── src/components/         ← Shared UI components
│   │   ├── src/lib/                ← Utilities, supabase client
│   │   └── supabase/migrations/    ← Webapp-specific migrations
│   │
│   ├── waBot/                       ← WhatsApp ingestion bot
│   │   └── src/
│   │       ├── pipeline.ts          ← Message processing
│   │       ├── archive.ts           ← Raw message storage
│   │       ├── supabase.ts          ← DB client
│   │       └── alerts.ts            ← Error notifications
│   │
│   └── backend/
│       └── supabase/migrations/    ← All SQL migrations
│
├── libraries/
│   ├── core/                        ← @aetherlink/core
│   │   ├── src/types.ts             ← All TypeScript types + DbSchema
│   │   ├── src/scorer.ts            ← Match scoring algorithm
│   │   ├── src/parsing/             ← Job text parsers
│   │   ├── src/ai/                  ← Fireworks AI integration
│   │   └── src/sdk.ts               ← SDK exports
│   │
│   └── ui/                          ← @aetherlink/ui
│       ├── src/lib/supabaseApi.ts   ← Typed Supabase client API
│       ├── src/lib/labels.ts        ← Job label definitions
│       └── src/hooks/               ← Shared React hooks
│
├── scripts/                         ← Utility scripts
│   ├── deploy.sh                    ← VPS deployment
│   ├── trust_polish.py              ← SQL + detail page edits
│   ├── trust_polish_ui.py           ← Feed + applied page edits
│   └── fix_types.py                 ← Type cast fixes
│
├── CLAUDE.md                        ← AI agent directives
└── package.json                     ← Workspace config (pnpm 10)
```

---

## 6. Key Design Decisions

### 6.1 Source-First Model
Most African job boards publish unstructured text. Instead of failing when extraction is incomplete, AetherLink:
- Always shows the source URL as the primary CTA
- Displays a disclaimer: "AetherLink summarizes this job from the original source"
- Shows "Application details are currently unavailable" instead of a broken button
- Uses `is_publishable` gate to hide only truly empty listings

### 6.2 Hybrid Storage (Supabase + localStorage)
- **Supabase**: Source of truth for saves, applied status, CTA analytics
- **localStorage**: Offline fallback; instant UI updates; works during Supabase outages
- On page load: localStorage provides immediate state, Supabase syncs in background

### 6.3 Standalone Next.js Server
- Production runs via `server.js` from `.next/standalone/`
- Static assets copied to `.next/standalone/apps/webapp/.next/static`
- PM2 manages the process (not `npm run start` or `next start`)
- nginx proxies 443 → 127.0.0.1:3002 with 16k proxy buffer for auth cookies

### 6.4 Quality Gate Over Parser Perfection
Rather than requiring perfect extraction before showing a job:
- Jobs need only title + ≥2 detail fields + source_url to be publishable
- Incomplete jobs show a warning banner
- `backfill_incomplete_jobs.py` re-parses from archived raw data

---

## 7. Data Flow Diagram (End-to-End)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ WhatsApp  │     │ Website  │     │ Manual   │     │  API     │
│ Group    │     │ Scraper  │     │ Upload   │     │  Ingest  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    raw_data_archive                          │
│                    (raw text backup)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    job_structurer.py                         │
│                    ┌─────────────────┐                      │
│                    │ is_publishable() │                      │
│                    │  ├─ title?       │                      │
│                    │  ├─ ≥2 details?  │                      │
│                    │  ├─ source_url?   │                      │
│                    │  └─ app method?  │                      │
│                    └────────┬────────┘                      │
│                             │                               │
│                    ┌────────▼────────┐                      │
│                    │  promote_row()  │                      │
│                    │  → jobs table   │                      │
│                    └─────────────────┘                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase jobs table                       │
│                    (is_shared=true, is_publishable=true)    │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ list_    │ │ get_     │ │ CTA      │
        │ feed_    │ │ feed_    │ │ analytics│
        │ jobs     │ │ job      │ │ RPCs     │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│                                                             │
│  /feed ──────────▶ list_feed_jobs ──▶ render cards         │
│  /feed/[id] ─────▶ get_feed_job ───▶ render detail         │
│                    ├── getApplicationAction() ──▶ CTA       │
│                    ├── trackCtaClick() ──▶ analytics         │
│                    ├── SaveJobButton ──▶ saved_jobs         │
│                    └── MarkAsAppliedButton ──▶ saved_jobs   │
│  /applied ───────▶ list_saved_jobs ──▶ render tracker      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Environment & Credentials

| Component | Location | Purpose |
|-----------|----------|---------|
| Supabase URL | `/root/supabase_credentials.env` | Backend API URL |
| Service Role Key | `/root/supabase_credentials.env` | Bypasses RLS for admin ops |
| Webapp env | `apps/webapp/.env.local` | Client-side env vars |
| Fireworks API | `apps/waBot/.env` | AI job extraction |
| Supabase migrations | `apps/backend/supabase/migrations/` | Schema changes |

**Security**: All credentials stored in `.env` files, never committed. Service role key used only for backend scripts and RLS-bypassing RPCs.

---

## 9. Monitoring & QA

| Tool | Purpose |
|------|---------|
| `qa_production.py` | Samples 20 publishable jobs, reports health score |
| `pm2 list` | Process health, restarts, memory |
| `systemctl status nginx` | Web server status |
| Supabase Dashboard | Table contents, RPC logs, auth users |
| `?debug=true` query param | Enables mock data, bypasses auth |

---

## 10. Deployment

```bash
# Full deploy (from VPS)
cd /root/Aetherlink
bash scripts/deploy.sh

# Steps:
# 1. rm -rf .next
# 2. pnpm build
# 3. cp static + public → .next/standalone/
# 4. pm2 restart aetherlink-webapp (standalone server.js)
# 5. systemctl reload nginx
# 6. Verify _next/static returns 200
```

---

## 11. Current State (June 2026)

| Metric | Value |
|--------|-------|
| Total jobs in DB | ~568 shared |
| Publishable jobs | ~298 (52%) |
| Source URL coverage | 100% of publishable |
| Company name coverage | ~10% (known gap) |
| Responsibilities coverage | ~15% |
| Deadline coverage | ~35% |
| Feed health score | 69/100 🟡 |

**Known gaps**: Company name extraction is the biggest quality issue. The parser extracts titles and source URLs well but struggles with company names from unstructured Zimbabwean job posts. This is a parser improvement opportunity, not an architecture issue.
