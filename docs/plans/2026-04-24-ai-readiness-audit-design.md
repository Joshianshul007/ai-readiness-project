# AI Readiness Audit — Design

**Date:** 2026-04-24
**Status:** Validated, ready for implementation
**Time budget:** 2–4 hours

---

## 1. Objective

Build a single web page where a user pastes a URL and gets back:

- An **AI Readiness Score** (0–100) + letter grade
- A list of 4–5 issues the page has, each with severity, evidence, and a recommended fix

The score is heuristic, but derived from real checks run against the actual fetched HTML — not random. This is the "light real" tier: real signals, no headless browser, no LLM.

Deliverables:

1. Working Next.js app runnable locally
2. Deployed to Vercel at a public URL
3. `README.md` write-up explaining approach, trade-offs, and what a "real" production tool would add

---

## 2. Architecture

```
Browser (app/page.js)
  └─► POST /api/audit { url }
        └─► Server-side handler
              1. Validate URL (URL constructor + http/https only + SSRF block)
              2. Fetch HTML with 8s timeout, spoofed User-Agent, 2 MB cap
              3. Parse with cheerio
              4. Run 5 check functions → [{ id, label, passed, severity, detail, weight, fix }]
              5. Compute score (sum of weights of passed checks) + grade
              6. Return JSON { url, score, grade, issues, passed, fetchedAt }
        ◄──
  └─► Render score dial + issue cards
```

**Key decisions:**

- **Single Next.js 14 App Router app, JavaScript, Tailwind.** One codebase, one deploy target.
- **No database.** Stateless; results live in React state.
- **One API route** (`app/api/audit/route.js`).
- **`cheerio`** for HTML parsing (lightweight, server-only). No headless browser — outside the time budget and not needed for the chosen checks.
- **Server-side fetch** avoids CORS and allows a realistic User-Agent.
- **No auth, no rate limiting, no persistence** — documented as known limitations.

---

## 3. The 5 Checks

Each check is a pure function `({ $, html, url }) => { passed, detail }` combined with static metadata (`id, label, severity, weight, fix`). Weights sum to 100.

| # | Check | Pass rule | Weight | Severity |
|---|---|---|---|---|
| 1 | **Structured data** | ≥1 `<script type="application/ld+json">` containing valid JSON | 25 | high |
| 2 | **FAQ content** | FAQPage JSON-LD **OR** heading matching `/faq\|frequently asked/i` with ≥2 question-like siblings | 20 | high |
| 3 | **Heading structure** | Exactly one `<h1>`, ≥1 `<h2>`, no skipped levels | 20 | medium |
| 4 | **Title + meta description** | `<title>` 10–70 chars **AND** `<meta name="description">` 50–160 chars | 20 | medium |
| 5 | **Open Graph tags** | All of `og:title`, `og:description`, `og:image` present and non-empty | 15 | low |

**Scoring:**

```
score = sum(check.weight for check in checks if check.passed)
grade = score >= 85 ? 'A'
      : score >= 70 ? 'B'
      : score >= 55 ? 'C'
      : score >= 40 ? 'D'
      : 'F'
```

**Each failing check yields an issue object** with a human label, evidence detail, severity, and a short `fix` recommendation.

**Per-check safety:** each check wraps its logic in try/catch. A thrown check contributes 0 points but does not abort the audit.

---

## 4. UI / UX

Single page. Three states: **idle → loading → results**.

**Layout:**

1. Header strip — small wordmark, subtle gradient.
2. Hero + input card (centered, max-w-2xl)
   - H1: "Is your site ready for AI?"
   - One-line subtitle
   - URL input + "Run audit" button
   - Inline validation errors
3. Loading state — skeleton card + "Fetching… Parsing… Scoring…" animated ticker.
4. Results
   - Score card with animated SVG circular dial (0 → score), number, grade, audited URL + timestamp
   - Issues list — one card per failing check (severity dot, label, evidence, collapsible "How to fix")
   - Collapsed chip: "N checks passed ✓"
   - "Audit another URL" resets state
5. Footer — "Checks run server-side. No data stored." + GitHub link.

**UX polish:**

- Auto-prepend `https://` if user types `example.com`
- `type="url"` input + client-side `new URL()` check
- Dial animates from 0 to final score on mount
- Tailwind only; no chart lib; hand-rolled SVG dial

---

## 5. Error Handling

| Scenario | HTTP | UI message |
|---|---|---|
| Missing/invalid URL | 400 `INVALID_URL` | "Please enter a valid URL" |
| Private/loopback host (SSRF guard) | 400 `BLOCKED_HOST` | "Private/internal URLs aren't supported" |
| DNS / refused | 502 `UNREACHABLE` | "Could not reach that site" |
| Timeout >8s | 504 `TIMEOUT` | "Site took too long to respond" |
| Non-2xx from site | 502 `HTTP_ERROR` | "Site returned HTTP {status}" |
| Non-HTML content-type | 415 `NOT_HTML` | "URL doesn't point to an HTML page" |
| Body >2 MB | — | Silently truncated |
| Cheerio parse throws | 500 `PARSE_FAILED` | "Couldn't parse the page" |
| Unknown | 500 `INTERNAL` | "Something went wrong" |

**SSRF block list:** `localhost`, `127.*`, `10.*`, `192.168.*`, `172.16–31.*`, `::1`, `fe80::/10`, `0.0.0.0`.

---

## 6. File Tree

```
ai-readiness-audit/
├── app/
│   ├── layout.js
│   ├── page.js
│   ├── globals.css
│   └── api/audit/route.js
├── lib/
│   ├── fetchPage.js
│   ├── parse.js
│   ├── score.js
│   └── checks/
│       ├── index.js
│       ├── structuredData.js
│       ├── faq.js
│       ├── headings.js
│       ├── metaTags.js
│       └── openGraph.js
├── components/
│   ├── AuditForm.js
│   ├── ScoreDial.js
│   ├── IssueCard.js
│   └── ResultsPanel.js
├── __tests__/
│   ├── checks.test.js
│   └── score.test.js
├── fixtures/
│   ├── perfect.html
│   ├── barebones.html
│   └── mixed.html
├── README.md
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jest.config.js
├── package.json
└── .gitignore
```

---

## 7. Time Budget

| Phase | Time |
|---|---|
| Scaffold Next.js + Tailwind + Jest | 15 min |
| Safe fetch + parse + 5 checks (TDD with fixtures) | 75 min |
| API route + scoring | 20 min |
| UI (form, dial, issue cards, states) | 60 min |
| Error states + polish | 20 min |
| README write-up | 20 min |
| Vercel deploy | 15 min |
| **Total** | **~3h 45min** |

---

## 8. Out of Scope (documented as limitations in README)

- JavaScript-rendered pages (would need Playwright)
- Authenticated or paywalled pages
- LLM-graded content quality
- Historical tracking of audits
- Rate limiting / abuse prevention
- Crawling beyond a single page
- `llms.txt`, robots.txt, sitemap (could be easy follow-ups)
