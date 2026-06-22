# NGO Jobs in Africa — Source Adapter Report

**Date:** 2026-06-22  
**Source:** NGO Jobs in Africa (https://ngojobsinafrica.com/)  
**Discovered by:** Agent Reach  
**Report:** 2026-06-22_source_scout.md  

---

## Source Selection

**Selected:** NGO Jobs in Africa — third quick-win source after ApplyNow and JobLink.

**Why NGO Jobs:**
- Pan-African NGO job board with Zimbabwe-specific section
- WordPress + WP Job Manager (similar to JobLink/ApplyNow)
- Static HTML, no login required
- Clean structured data fields (Job no, Contract type, Duty Station, Location, Categories)
- High-quality NGO/UN jobs (UNICEF, Christian Aid, ECPAT, etc.)
- Low scam risk (established NGO job board)

**Structure Summary:**
| Property | Value |
|----------|-------|
| Platform | WordPress |
| Listing URLs | `/job-location/zimbabwe/` (Zimbabwe-specific), `/jobs/` (pan-African) |
| Job URL format | `/job/<slug>/` |
| Title | Line 0 (page title) or line 11 (H1) |
| Meta | Line 12: `<type> <location> <start> - <end> <category>` |
| Structured fields | "Job no:", "Contract type:", "Duty Station:", "Location:", "Categories:" |
| JS required | No |
| Login required | No |
| Zimbabwe jobs | ~2 on dedicated page; more on main /jobs/ page |

---

## Files Changed

### 1. `/root/aetherlink/site_scraper_engine.py`
- Added `ngojobsinafrica` SiteConfig (site_id=35, max_pages=3, max_details=20)
- Two start URLs: `/job-location/zimbabwe/` and `/jobs/`
- `looks_like_detail_url` rule: `/job/<slug>/` excluding `/job-` patterns
- `max_raw_chars=8000` — NGO job pages are very long (20-38K chars)

### 2. `/root/aetherlink/signal_classifier.py`
- Added `"ngojobsinafrica.com"` to `known_job_board_detail` domain list

### 3. `/root/aetherlink/job_structurer.py`
- Added `"ngojobsinafrica.com": 35` to `WEB_SITE_IDS`
- Added `"ngojobsinafrica.com"` to `known_job_board` in `_confidence()`
- Added `is_ngojobsinafrica()` — URL checker
- Added `parse_ngojobs_text()` — custom parser (parser_version=4)
- Added `elif is_ngojobsinafrica(source_url):` branch in `promote_row()`

### 4. `/root/aetherlink/supabase_client.py`
- Added safety guards to `delete()`:
  - Requires non-empty filters
  - Requires at least one of: `id`, `source_url`, `source_identifier`, `siteId`
  - Raises `ValueError` on unfiltered or broad deletes

### 5. Supabase `sites` table
- Inserted site ID 35: "NGO Jobs in Africa" → `https://ngojobsinafrica.com`

---

## Commands Run

```bash
# Dry-run
cd /root/aetherlink && .venv/bin/python run_site_scraper.py ngojobsinafrica --dry-run --max-pages 1 --max-details 5

# Real insert
cd /root/aetherlink && .venv/bin/python run_site_scraper.py ngojobsinafrica --max-pages 2 --max-details 5

# Classify + promote
cd /root/aetherlink && .venv/bin/python -c "
from signal_classifier import process_batch as classify
from job_structurer import process_batch as structure
print('Classifier:', classify(limit=20))
print('Structurer:', structure(limit=20))
"
```

---

## Results

| Metric | Value |
|--------|-------|
| Pages fetched | 2 |
| Job URLs discovered | 20 |
| Details checked | 5 |
| Raw rows inserted | 5 |
| Duplicates skipped | 0 |
| Errors | 0 |
| Classified as "job" | 5 |
| Classified as "other" | 0 |
| Promoted to jobs table | 5 |
| Rejected (low confidence) | 0 |

---

## Example Job IDs

| ID | Title | Company | Location | Closing | Category |
|----|-------|---------|----------|---------|----------|
| 645 | WASH Manager, P-4, TA (6 Months), #137428, Bunia, DRC | Unknown Employer | Democratic Republic of Congo | 2026-06-24 | WASH |
| 646 | Communication Specialist, P-3, TA (6 Months), #137426, Bunia, DRC | Unknown Employer | Democratic Republic of Congo | 2026-06-25 | Communication |
| 647 | Data and Analytics Manager (health/ISMT), P-4, TA (6 Months), #137392, Bunia, DRC | Unknown Employer | Democratic Republic of Congo | 2026-06-25 | Health, ICT |
| 648 | Programme & Planning Specialist, P-3, TA (6Months), #137387, Bunia, DRC | Unknown Employer | Democratic Republic of Congo | 2026-06-29 | Programme Management |
| 649 | UK Programmes & Office Assistant Intern, June 2026 | Unknown Employer | Remote | 2026-06-30 | — |

---

## Data Quality Assessment

### Fields Successfully Extracted
- ✅ **title** — extracted from page title (line 0)
- ✅ **location** — extracted from "Location:" structured field in body
- ✅ **closing_date** — extracted from meta line date range (end date)
- ✅ **category** — extracted from "Categories:" structured field
- ✅ **source_url** — preserved

### Fields Missing or Partial
- ⚠️ **companyName** — "Unknown Employer" for all 5. The org name (e.g., UNICEF) appears in the body text but not in a structured "Company:" field. Would need more sophisticated extraction.
- ⚠️ **employment_type** — None. The meta line (`Full Time <location> <start> - <end> <category>`) is beyond the 8000-char truncation. Would need to either increase `max_raw_chars` or fetch the meta line differently.
- ⚠️ **title suffix** — Some titles include " – NGO Jobs" or " – WCAR" suffixes. The regex strip handles most but not all cases.
- ⚠️ **application_email** — None extracted. These are UNICEF/UN jobs that link to external careers portals (apply now button), not email-based applications.
- ⚠️ **description** — Basic extraction from "Position Overview" section

### Custom Parser Needed?
**Yes** — the generic `structure_text()` parser produced poor titles (grabbing breadcrumb/navigation text) and missed structured fields. The custom parser fixes title extraction and pulls structured data from the page body.

---

## Regression Checks

- ✅ JobLink: 5 jobs, all correct titles/companies (siteId=33)
- ✅ ApplyNow: 5 jobs at siteId=32 (old), 0 at siteId=34 (not re-promoted yet)
- ✅ Jobs Zimbabwe: 3+ jobs at siteId=28, unaffected
- ✅ No broad production deletes (delete() guard works)
- ✅ Homepage renders without errors

---

## Is NGO Jobs Safe for Daily Scraping?

**Yes, with caveats:**

- ✅ Static WordPress, no login required
- ✅ Clean dedup via content hash
- ✅ Polite delays configured (2.5s)
- ✅ Low scam risk (established NGO board)
- ✅ Custom parser extracts titles, locations, categories, closing dates
- ⚠️ **Small Zimbabwe inventory** — only ~2 Zimbabwe-specific jobs on the dedicated page. The main `/jobs/` page has pan-African jobs (DRC, Kenya, etc.)
- ⚠️ **Employment type not extracted** — meta line is beyond 8000-char truncation
- ⚠️ **Company names not extracted** — org names in body text, not structured fields
- ⚠️ **No application emails** — most jobs link to external careers portals

**Recommendation:** Safe to add to daily cron with `max_pages=3, max_details=20`. The Zimbabwe-specific page should be the primary start URL. Consider increasing `max_raw_chars` to 12000 to capture the meta line for employment type extraction.

---

## Are We Ready to Build the Source Health Runner?

**Yes.** We now have 3 stable sources:
1. **ApplyNow** (site_id=34) — WordPress blog, custom parser not needed
2. **JobLink** (site_id=33) — WP Job Manager, custom parser v3
3. **NGO Jobs** (site_id=35) — WordPress, custom parser v4

All three use the same pipeline: `scrape → raw_data_archive → classifier → structurer/promoter → jobs`. The source health runner should be able to:
- Track pages fetched, jobs discovered, raw rows inserted, jobs promoted per source
- Alert on errors or zero-job runs
- Cycle through sources in priority order
- Respect per-source rate limits and max-pages configs
