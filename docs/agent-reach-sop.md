# Agent Reach — AetherLink Source Scout SOP

## Purpose

Agent Reach is a **read-only source discovery and reconnaissance layer** for AetherLink.
It answers 4 questions:
1. Where else can we find good Zimbabwe jobs?
2. Which sources are worth scraping?
3. Which ones look risky?
4. Which parser do we need next?

## What Agent Reach Does NOT Do

- ❌ Write directly to the `jobs` table
- ❌ Write to `raw_data_archive`
- ❌ Replace the existing parser/promoter pipeline
- ❌ Bypass `site_scraper_engine.py`
- ❌ Use cookie-login platforms (Twitter/X, Reddit, LinkedIn) without explicit approval
- ❌ Use main personal social accounts

## Approved Channels (Phase 1)

| Channel | Tool | Status |
|---------|------|--------|
| Web reading | Jina Reader (`curl https://r.jina.ai/URL`) | ✅ Enabled |
| Web search | `web_search` tool | ✅ Enabled |
| RSS/Atom | `feedparser` | ✅ Enabled |
| GitHub | `gh CLI` | ⚠️ Needs `apt install gh` |
| YouTube | `yt-dlp` (public transcripts only) | ⚠️ JS runtime configured |
| Exa Search | `mcporter` + Exa MCP | ❌ Needs mcporter install |

## Blocked Channels (Require Explicit Approval)

| Channel | Reason |
|---------|--------|
| Twitter/X | Cookie-login, account risk |
| Reddit | Cookie-login, account risk |
| LinkedIn | Cookie-login, account risk |
| 小红书 | Cookie-login, account risk |
| 雪球 | Cookie-login, account risk |

## Data Flow

```
Agent Reach (discovery only)
   ↓
Source Scout reports (/root/Aetherlink/reports/source_scout/)
   ↓
Human / Hermes review
   ↓
Add approved sources to site_scraper_engine.py (SiteConfig entries)
   ↓
raw_data_archive (via existing scraper)
   ↓
existing parser/promoter pipeline
   ↓
jobs table
   ↓
AetherLink UI
```

## Installation Details

- **Venv:** `~/.agent-reach-venv/`
- **Config:** `~/.agent-reach/`
- **Skill:** `/root/.agents/skills/agent-reach/`
- **Version:** v1.5.0
- **Install command:** `pip install https://github.com/Panniantong/agent-reach/archive/main.zip`
- **Safe mode:** `agent-reach install --env=auto --safe`
- **Health check:** `agent-reach doctor`

## Scheduled Scout (Future — Daily 6am)

```
Task: AetherLink Daily Source Scout
Schedule: 0 6 * * *
Delivery: Save to /root/Aetherlink/reports/source_scout/YYYY-MM-DD/
Prompt:
  Run Agent Reach source scout for Zimbabwe job sources.
  Use only: Jina Reader, web_search, RSS, GitHub (no cookie platforms).
  Search: Zimbabwe jobs, Harare vacancies, Bulawayo vacancies,
          Zimbabwe NGO vacancies, graduate trainee, internships,
          site:.co.zw careers, site:.org.zw vacancies,
          site:.ac.zw vacancies, site:.gov.zw vacancies.
  Compare against existing sources in site_scraper_engine.py.
  Save report to /root/Aetherlink/reports/source_scout/YYYY-MM-DD/
  Do NOT write to any database.
  Do NOT modify the webapp.
```

## Key Phrase for Hermes

> "Install Agent Reach as a read-only Source Scout for AetherLink. Do not use it as the production scraper or direct database writer."

## Existing Sources (Do Not Duplicate)

1. VacancyMail — vacancymail.co.zw
2. iHarare Jobs — ihararejobs.com
3. Jobs Zimbabwe — jobszimbabwe.co.zw
4. Peicejob — peicejob.com
5. Zimbajob — zimbajob.com
6. classifieds.co.zw
7. Herald Zimbabwe — herald.co.zw
8. TechZim — techzim.co.zw
9. ZimPlaza Jobs — zimplazajobs.co.zw

## First Scout Results (2026-06-22)

14 new sources discovered. Top 5 quick wins:
1. ApplyNow Zimbabwe (applynow.co.zw) — WordPress blog, ~10-20 jobs/week
2. Bulawayo City Council (citybyo.co.zw) — Government, ~2-5 jobs/month
3. JobLink Zimbabwe (joblink.co.zw) — Standard job board
4. IDBZ (idbz.co.zw) — Development bank careers
5. NGO Jobs in Zimbabwe (ngojobsinzimbabwe.com) — New market segment

Full report: `/root/Aetherlink/reports/source_scout/2026-06-22_source_scout.md`
