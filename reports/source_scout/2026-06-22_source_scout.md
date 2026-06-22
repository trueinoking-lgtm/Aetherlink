# AetherLink Source Scout Report — 2026-06-22

**Tool:** Agent Reach v1.5.0 (safe mode) + Jina Reader + web_search  
**Channels used:** Jina Reader (web), web_search, RSS  
**Channels NOT used (per instructions):** Twitter/X, Reddit, LinkedIn, 小红书, 雪球, private WhatsApp  
**Production writes:** None. Read-only reconnaissance.

---

## Existing Sources (9 — already scraped by AetherLink)

| # | Source | URL | Type |
|---|--------|-----|------|
| 1 | VacancyMail | https://vacancymail.co.zw/ | job_board |
| 2 | iHarare Jobs | https://ihararejobs.com/ | job_board |
| 3 | Jobs Zimbabwe | https://jobszimbabwe.co.zw/ | job_board |
| 4 | Peicejob | https://peicejob.com/ | job_board |
| 5 | Zimbajob | https://www.zimbajob.com/ | job_board |
| 6 | classifieds.co.zw | https://www.classifieds.co.zw/ | job_board |
| 7 | Herald Zimbabwe | https://www.herald.co.zw/ | job_board |
| 8 | TechZim | https://www.techzim.co.zw/ | job_board |
| 9 | ZimPlaza Jobs | https://www.zimplazajobs.co.zw/ | job_board |

---

## Top 10 High-Value Sources to Add Next

Ranked by (Zimbabwe relevance × 2) - (scraper difficulty) - (scam risk × 2):

### 1. 🥇 ApplyNow Zimbabwe — https://applynow.co.zw/
- **Type:** job_board (WordPress blog)
- **Zim Relevance:** 95/100 | **Scrape Difficulty:** 25/100 | **Scam Risk:** 5/100
- **Why:** High-quality curated job blog. Posts include Econet graduate programme, City of Bulawayo positions, corporate vacancies. Very clean HTML structure.
- **Parser:** WordPress-style blog scrape. Each post = one job listing.
- **Sample jobs:** Econet Graduate Trainee, City of Bulawayo Senior Roads Works Supervisor
- **Quick win:** Yes — WordPress structure is trivial to parse.

### 2. 🥈 JobLink Zimbabwe — https://joblink.co.zw/
- **Type:** job_board
- **Zim Relevance:** 95/100 | **Scrape Difficulty:** 30/100 | **Scam Risk:** 10/100
- **Why:** Dedicated Zimbabwe job board with regional filtering (Bulawayo, Harare), graduate trainee category, deadlines. Structured listings.
- **Parser:** Standard HTML scrape with category/region extraction.
- **Sample jobs:** Loans Officer (Bulawayo), Legal Graduate Trainee
- **Quick win:** Yes — clean listing structure similar to existing scrapers.

### 3. 🥉 NGO Jobs in Zimbabwe — https://ngojobsinzimbabwe.com/
- **Type:** NGO
- **Zim Relevance:** 90/100 | **Scrape Difficulty:** 30/100 | **Scam Risk:** 5/100
- **Why:** Dedicated NGO job board — a completely new source type for AetherLink. Covers Jointed Hands and other NGOs. NGO jobs are high-quality and stable.
- **Parser:** Standard HTML scrape with deadline extraction.
- **Quick win:** Yes — simple structure, new market segment.

### 4. Bulawayo City Council — https://citybyo.co.zw/
- **Type:** government
- **Zim Relevance:** 95/100 | **Scrape Difficulty:** 20/100 | **Scam Risk:** 0/100
- **Why:** Official municipal government jobs. Competitive salaries, fringe benefits. Zero scam risk. Covers engineering, admin, water/sanitation roles.
- **Parser:** Simple HTML scrape of vacancy pages.
- **Quick win:** Yes — government pages are well-structured.

### 5. ZimCareerHub — https://zimcareerhub.co.zw/
- **Type:** job_board
- **Zim Relevance:** 90/100 | **Scrape Difficulty:** 35/100 | **Scam Risk:** 10/100
- **Why:** Dedicated to graduate trainee programs and internships — a segment AetherLink under-reaches. Clean .co.zw domain.
- **Parser:** Standard HTML scrape focused on graduate/internship listings.
- **Quick win:** Yes — targets the exact demographic AetherLink wants.

### 6. University of Zimbabwe — https://www.uz.ac.zw/
- **Type:** university
- **Zim Relevance:** 90/100 | **Scrape Difficulty:** 25/100 | **Scam Risk:** 0/100
- **Why:** Zimbabwe's largest university. Academic and administrative vacancies. Zero scam risk. Regular postings.
- **Parser:** Standard HTML scrape of university career pages.
- **Quick win:** Yes — predictable university vacancy format.

### 7. IDBZ — https://www.idbz.co.zw/careers/vacancies
- **Type:** company_careers (development bank)
- **Zim Relevance:** 90/100 | **Scrape Difficulty:** 20/100 | **Scam Risk:** 0/100
- **Why:** Infrastructure Development Bank of Zimbabwe. High-quality financial sector jobs. Official .co.zw domain.
- **Parser:** Simple HTML scrape of corporate career page.
- **Quick win:** Yes — single career page, well-structured.

### 8. Harare Institute of Technology — https://www.hit.ac.zw/
- **Type:** university
- **Zim Relevance:** 85/100 | **Scrape Difficulty:** 25/100 | **Scam Risk:** 0/100
- **Why:** HIT regularly advertises academic and technical positions. Recent vacancies posted Jan 2026.
- **Parser:** Standard HTML scrape of university career pages.
- **Quick win:** Yes — similar to UZ.

### 9. NUST Zimbabwe — https://www.nust.ac.zw/
- **Type:** university
- **Zim Relevance:** 85/100 | **Scrape Difficulty:** 25/100 | **Scam Risk:** 0/100
- **Why:** National University of Science and Technology. Regular academic vacancies in STEM fields.
- **Parser:** Standard HTML scrape of university career pages.
- **Quick win:** Yes — similar to UZ and HIT.

### 10. CV People Africa — https://www.cvpeopleafrica.com/
- **Type:** job_board (pan-African)
- **Zim Relevance:** 85/100 | **Scrape Difficulty:** 40/100 | **Scam Risk:** 15/100
- **Why:** Pan-African job portal with Zimbabwe listings. Broader reach. Moderate difficulty due to pan-African scope (need Zimbabwe filtering).
- **Parser:** Standard HTML scrape with country filter.
- **Quick win:** Moderate — needs Zimbabwe-specific filtering logic.

---

## Sources Already Covered (No Action Needed)

These were discovered in search but are already scraped by AetherLink:
- **VacancyMail** — already scraped ✅
- **Jobs Zimbabwe (jobszimbabwe.co.zw)** — already scraped ✅
- **classifieds.co.zw** — already scraped ✅
- **Zimbajob** — already scraped ✅
- **iHarare Jobs** — already scraped ✅

---

## Sources Needing Custom Parsers

| Source | Challenge |
|--------|-----------|
| ApplyNow Zimbabwe | WordPress blog format — each post is a job, not a listing page. Needs date-based dedup. |
| CV People Africa | Pan-African — needs Zimbabwe-specific filtering by location/country. |
| ZiGoats | Blog-style curation with external apply links. Needs link-following logic. |

---

## Sources to Avoid

| Source | Reason |
|--------|--------|
| AllJobsPo (jobsinzimbabwe.alljobspo.com) | Aggregator of aggregators. Likely duplicates from existing sources. Low original content. |
| TikTok job posts | Not scrapable. Social media format. No structured data. |
| AgriUniverse | Business directory, not a job board. Jobs are incidental. |

---

## Quick Wins (Can Be Added to Existing Scraper in < 1 Day Each)

1. **ApplyNow Zimbabwe** — WordPress blog, clean HTML, ~10-20 new jobs/week
2. **Bulawayo City Council** — Government page, simple structure, ~2-5 jobs/month
3. **JobLink Zimbabwe** — Standard job board, similar to existing sources
4. **IDBZ** — Single corporate career page, ~1-3 jobs/month
5. **NGO Jobs in Zimbabwe** — Simple structure, new market segment

---

## Commands Used

```
agent-reach install --env=auto --safe
agent-reach doctor
web_search: "Zimbabwe jobs site:.co.zw careers vacancies"
web_search: "Zimbabwe job board vacancies 2025 2026"
web_search: "Harare vacancies site:.co.zw"
web_search: "Bulawayo vacancies jobs site:.co.zw"
web_search: "Zimbabwe NGO vacancies careers site:.org.zw"
web_search: "Zimbabwe graduate trainee internships 2025 2026"
web_search: "site:.ac.zw vacancies careers Zimbabwe university"
web_search: "site:.gov.zw vacancies careers Zimbabwe government"
web_search: "Zimbabwe company careers page site:.co.zw hiring"
Jina Reader: https://r.jina.ai/https://joblink.co.zw/
Jina Reader: https://r.jina.ai/https://applynow.co.zw/
Jina Reader: https://r.jina.ai/https://zimcareerhub.co.zw/
Jina Reader: https://r.jina.ai/https://www.cvpeopleafrica.com/
Jina Reader: https://r.jina.ai/https://ngojobsinzimbabwe.com/
Jina Reader: https://r.jina.ai/https://www.recruitmentmatters.co.zw/
Jina Reader: https://r.jina.ai/https://citybyo.co.zw/
Jina Reader: https://r.jina.ai/https://www.uz.ac.zw/
Jina Reader: https://r.jina.ai/https://www.hit.ac.zw/
Jina Reader: https://r.jina.ai/https://www.nust.ac.zw/
Jina Reader: https://r.jina.ai/https://www.cut.ac.zw/
Jina Reader: https://r.jina.ai/https://www.idbz.co.zw/careers/vacancies
Jina Reader: https://r.jina.ai/https://www.bayer.co.zw/
Jina Reader: https://r.jina.ai/https://zigoats.com/
```

---

## Notes

- No production database writes were made.
- No cookies or personal accounts were used.
- No changes to nginx, Supabase auth, or the deployed webapp.
- All Agent Reach config stored under `~/.agent-reach/` — nothing in `/root/Aetherlink`.
- The existing scraper at `/root/aetherlink/site_scraper_engine.py` uses `SiteConfig` objects with `key`, `name`, `start_urls`, `allowed_domains` — new sources can be added using the same pattern.
