# AI Readiness Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single Next.js page where a user pastes a URL and gets back an AI Readiness Score (0–100) plus 4–5 issues derived from real checks against the fetched HTML.

**Architecture:** Next.js 14 App Router (JavaScript), single `/api/audit` route that fetches the URL server-side, parses with cheerio, runs 5 pure-function checks, and returns a weighted score + issue list. Stateless. Deployed to Vercel.

**Tech Stack:** Next.js 14 (App Router, JS), React 18, Tailwind CSS, cheerio, Jest + @testing-library/react, Vercel.

**Reference:** See `docs/plans/2026-04-24-ai-readiness-audit-design.md` for the full validated design, including check specs, weights, SSRF block list, and UX copy.

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `next.config.js`, `jsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `app/layout.js`, `app/page.js`, `app/globals.css`, `.gitignore`

**Step 1: Initialize Next.js**

Run in the project root (`d:\ai-readiness-project`):

```bash
npx create-next-app@14 . --js --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```

If prompted about existing files (`.git`, `.claude/`, `docs/`), accept. This creates the app in the current directory.

**Step 2: Install runtime + dev deps**

```bash
npm install cheerio
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Step 3: Add npm scripts to `package.json`**

Ensure the `scripts` block contains:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  }
}
```

**Step 4: Create `jest.config.js`**

```js
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
});
```

Create `jest.setup.js`:

```js
require('@testing-library/jest-dom');
```

**Step 5: Verify scaffold**

```bash
npm run dev
```
Expected: Next.js starts on `http://localhost:3000` showing default page. Ctrl-C to stop.

```bash
npm test
```
Expected: "No tests found" (fine — we'll add them next).

**Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js 14 app with Tailwind and Jest"
```

---

## Task 2: Create HTML fixtures for check tests

**Files:**
- Create: `fixtures/perfect.html`, `fixtures/barebones.html`, `fixtures/mixed.html`

**Step 1: Write `fixtures/perfect.html`** — should pass all 5 checks (score 100)

```html
<!doctype html>
<html lang="en">
<head>
  <title>Perfect Example — AI Readiness Demo</title>
  <meta name="description" content="A fully-optimized page demonstrating structured data, FAQ schema, clean headings, meta tags, and Open Graph for AI readiness testing.">
  <meta property="og:title" content="Perfect Example">
  <meta property="og:description" content="A fully-optimized page for AI readiness">
  <meta property="og:image" content="https://example.com/og.png">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type":"Question","name":"What is this?","acceptedAnswer":{"@type":"Answer","text":"A demo page."}},
      {"@type":"Question","name":"Why?","acceptedAnswer":{"@type":"Answer","text":"Testing."}}
    ]
  }
  </script>
</head>
<body>
  <h1>Perfect Example</h1>
  <h2>Overview</h2>
  <p>Body copy.</p>
  <h2>FAQ</h2>
  <h3>What is this?</h3>
  <p>A demo.</p>
  <h3>Why?</h3>
  <p>Testing.</p>
</body>
</html>
```

**Step 2: Write `fixtures/barebones.html`** — should fail all 5 checks (score 0)

```html
<!doctype html>
<html>
<body>
<p>hello</p>
</body>
</html>
```

**Step 3: Write `fixtures/mixed.html`** — some pass, some fail

```html
<!doctype html>
<html>
<head>
  <title>Mixed Page Example Title</title>
  <meta name="description" content="This page has a title and description but is missing structured data, FAQ content, and Open Graph tags for demonstration purposes.">
</head>
<body>
  <h1>Heading One</h1>
  <h1>Another H1</h1>
  <h2>Section</h2>
</body>
</html>
```
This one: title+meta pass (20), headings fail (two H1s), no JSON-LD (fail), no FAQ (fail), no OG (fail). Expected score: **20**.

**Step 4: Commit**

```bash
git add fixtures/
git commit -m "test: add HTML fixtures for check tests"
```

---

## Task 3: Implement check 1 — structured data (TDD)

**REQUIRED SUB-SKILL:** Use superpowers:test-driven-development for this and every subsequent check task.

**Files:**
- Create: `lib/checks/structuredData.js`, `__tests__/checks/structuredData.test.js`

**Step 1: Write the failing test**

`__tests__/checks/structuredData.test.js`:

```js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const check = require('@/lib/checks/structuredData').default;

function load(name) {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', name), 'utf8');
  return { $: cheerio.load(html), html, url: 'https://example.com' };
}

describe('structuredData check', () => {
  it('passes when valid JSON-LD exists', () => {
    const result = check(load('perfect.html'));
    expect(result.passed).toBe(true);
  });

  it('fails when no JSON-LD present', () => {
    const result = check(load('barebones.html'));
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/no.*json-ld/i);
  });

  it('fails when JSON-LD is malformed', () => {
    const $ = cheerio.load('<script type="application/ld+json">{broken</script>');
    const result = check({ $, html: '', url: '' });
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/invalid/i);
  });
});
```

**Step 2: Run test, expect FAIL**

```bash
npm test -- structuredData
```
Expected: module not found / `check is not a function`.

**Step 3: Implement `lib/checks/structuredData.js`**

```js
export const meta = {
  id: 'structuredData',
  label: 'Structured data (schema.org JSON-LD)',
  severity: 'high',
  weight: 25,
  fix: 'Add a <script type="application/ld+json"> block describing your page using schema.org vocabulary.',
};

export default function check({ $ }) {
  const scripts = $('script[type="application/ld+json"]');
  if (scripts.length === 0) {
    return { ...meta, passed: false, detail: 'No JSON-LD script tags found.' };
  }
  let validCount = 0;
  scripts.each((_, el) => {
    try { JSON.parse($(el).contents().text()); validCount++; } catch {}
  });
  if (validCount === 0) {
    return { ...meta, passed: false, detail: `Found ${scripts.length} JSON-LD block(s) but all had invalid JSON.` };
  }
  return { ...meta, passed: true, detail: `Found ${validCount} valid JSON-LD block(s).` };
}
```

**Step 4: Run test, expect PASS**

```bash
npm test -- structuredData
```
Expected: 3 passing.

**Step 5: Commit**

```bash
git add lib/checks/structuredData.js __tests__/checks/structuredData.test.js
git commit -m "feat(checks): add structured data JSON-LD check"
```

---

## Task 4: Implement check 2 — FAQ content (TDD)

**Files:**
- Create: `lib/checks/faq.js`, `__tests__/checks/faq.test.js`

**Step 1: Failing test**

```js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const check = require('@/lib/checks/faq').default;

function load(name) {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', name), 'utf8');
  return { $: cheerio.load(html), html, url: '' };
}

describe('faq check', () => {
  it('passes when FAQPage JSON-LD exists', () => {
    expect(check(load('perfect.html')).passed).toBe(true);
  });
  it('passes when a heading says FAQ and has question children', () => {
    const $ = cheerio.load('<h2>FAQ</h2><h3>What?</h3><h3>Why?</h3>');
    expect(check({ $, html: '', url: '' }).passed).toBe(true);
  });
  it('fails when page has no FAQ signal', () => {
    expect(check(load('barebones.html')).passed).toBe(false);
  });
});
```

**Step 2: Run test, FAIL**

```bash
npm test -- faq
```

**Step 3: Implement `lib/checks/faq.js`**

```js
export const meta = {
  id: 'faq',
  label: 'FAQ content',
  severity: 'high',
  weight: 20,
  fix: 'Add an FAQ section (heading "FAQ" + question/answer pairs) or FAQPage schema.org JSON-LD.',
};

export default function check({ $ }) {
  let hasFaqSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const types = [].concat(data).flatMap(d => [].concat(d['@type'] || []));
      if (types.includes('FAQPage')) hasFaqSchema = true;
    } catch {}
  });
  if (hasFaqSchema) return { ...meta, passed: true, detail: 'FAQPage JSON-LD detected.' };

  const faqHeading = $('h1,h2,h3').filter((_, el) => /faq|frequently asked/i.test($(el).text())).first();
  if (faqHeading.length) {
    const questionLike = faqHeading.nextAll('h2,h3,h4,dt,summary').length;
    if (questionLike >= 2) {
      return { ...meta, passed: true, detail: `FAQ heading found with ${questionLike} question-like siblings.` };
    }
  }
  return { ...meta, passed: false, detail: 'No FAQPage schema or FAQ section detected.' };
}
```

**Step 4: Run, expect PASS. Step 5: Commit.**

```bash
npm test -- faq
git add lib/checks/faq.js __tests__/checks/faq.test.js
git commit -m "feat(checks): add FAQ content check"
```

---

## Task 5: Implement check 3 — heading structure (TDD)

**Files:** `lib/checks/headings.js`, `__tests__/checks/headings.test.js`

**Step 1: Failing test**

```js
const cheerio = require('cheerio');
const check = require('@/lib/checks/headings').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

describe('headings check', () => {
  it('passes with exactly one h1 and h2s and no skipped levels', () => {
    expect(run('<h1>A</h1><h2>B</h2><h3>C</h3>').passed).toBe(true);
  });
  it('fails with zero h1', () => {
    expect(run('<h2>B</h2>').passed).toBe(false);
  });
  it('fails with multiple h1', () => {
    expect(run('<h1>A</h1><h1>B</h1><h2>C</h2>').passed).toBe(false);
  });
  it('fails when h3 appears without h2', () => {
    expect(run('<h1>A</h1><h3>C</h3>').passed).toBe(false);
  });
});
```

**Step 2: Run, FAIL. Step 3: Implement:**

```js
export const meta = {
  id: 'headings',
  label: 'Heading structure',
  severity: 'medium',
  weight: 20,
  fix: 'Use exactly one <h1>, include <h2> sections, and never skip heading levels.',
};

export default function check({ $ }) {
  const levels = [];
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    levels.push(parseInt(el.tagName.slice(1), 10));
  });
  const h1Count = levels.filter(l => l === 1).length;
  const h2Count = levels.filter(l => l === 2).length;

  if (h1Count !== 1) {
    return { ...meta, passed: false, detail: `Expected exactly 1 <h1>, found ${h1Count}.` };
  }
  if (h2Count < 1) {
    return { ...meta, passed: false, detail: 'No <h2> headings found.' };
  }
  const seen = new Set();
  for (const l of levels) {
    seen.add(l);
    if (l > 1 && !seen.has(l - 1)) {
      return { ...meta, passed: false, detail: `Heading level h${l} appears before h${l - 1}.` };
    }
  }
  return { ...meta, passed: true, detail: `1 h1, ${h2Count} h2(s), no skipped levels.` };
}
```

**Step 4: PASS. Step 5: Commit.**

```bash
npm test -- headings
git add lib/checks/headings.js __tests__/checks/headings.test.js
git commit -m "feat(checks): add heading structure check"
```

---

## Task 6: Implement check 4 — meta tags (TDD)

**Files:** `lib/checks/metaTags.js`, `__tests__/checks/metaTags.test.js`

**Step 1: Failing test**

```js
const cheerio = require('cheerio');
const check = require('@/lib/checks/metaTags').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

describe('metaTags check', () => {
  it('passes with good title and description', () => {
    expect(run('<title>A Good Title Example</title><meta name="description" content="This meta description is definitely long enough to satisfy the length requirement of at least fifty characters.">').passed).toBe(true);
  });
  it('fails with missing title', () => {
    expect(run('<meta name="description" content="ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok">').passed).toBe(false);
  });
  it('fails with too-short description', () => {
    expect(run('<title>Reasonable Title</title><meta name="description" content="short">').passed).toBe(false);
  });
});
```

**Step 2: FAIL. Step 3: Implement:**

```js
export const meta = {
  id: 'metaTags',
  label: 'Title and meta description',
  severity: 'medium',
  weight: 20,
  fix: 'Add a <title> (10–70 chars) and <meta name="description"> (50–160 chars).',
};

export default function check({ $ }) {
  const title = ($('title').first().text() || '').trim();
  const desc = ($('meta[name="description"]').attr('content') || '').trim();
  const titleOk = title.length >= 10 && title.length <= 70;
  const descOk = desc.length >= 50 && desc.length <= 160;
  if (titleOk && descOk) {
    return { ...meta, passed: true, detail: `Title ${title.length} chars, description ${desc.length} chars.` };
  }
  const reasons = [];
  if (!title) reasons.push('title missing');
  else if (!titleOk) reasons.push(`title ${title.length} chars (want 10–70)`);
  if (!desc) reasons.push('description missing');
  else if (!descOk) reasons.push(`description ${desc.length} chars (want 50–160)`);
  return { ...meta, passed: false, detail: reasons.join('; ') };
}
```

**Step 4: PASS. Step 5: Commit.**

```bash
npm test -- metaTags
git add lib/checks/metaTags.js __tests__/checks/metaTags.test.js
git commit -m "feat(checks): add title and meta description check"
```

---

## Task 7: Implement check 5 — Open Graph (TDD)

**Files:** `lib/checks/openGraph.js`, `__tests__/checks/openGraph.test.js`

**Step 1: Failing test**

```js
const cheerio = require('cheerio');
const check = require('@/lib/checks/openGraph').default;
const run = (html) => check({ $: cheerio.load(html), html, url: '' });

describe('openGraph check', () => {
  it('passes when all three OG tags present', () => {
    expect(run('<meta property="og:title" content="A"><meta property="og:description" content="B"><meta property="og:image" content="C">').passed).toBe(true);
  });
  it('fails when og:image missing', () => {
    expect(run('<meta property="og:title" content="A"><meta property="og:description" content="B">').passed).toBe(false);
  });
});
```

**Step 2: FAIL. Step 3: Implement:**

```js
export const meta = {
  id: 'openGraph',
  label: 'Open Graph tags',
  severity: 'low',
  weight: 15,
  fix: 'Add <meta property="og:title">, og:description, and og:image for social/AI previews.',
};

const REQUIRED = ['og:title', 'og:description', 'og:image'];

export default function check({ $ }) {
  const missing = REQUIRED.filter(p => {
    const v = ($(`meta[property="${p}"]`).attr('content') || '').trim();
    return !v;
  });
  if (missing.length === 0) {
    return { ...meta, passed: true, detail: 'og:title, og:description, og:image all present.' };
  }
  return { ...meta, passed: false, detail: `Missing: ${missing.join(', ')}.` };
}
```

**Step 4: PASS. Step 5: Commit.**

```bash
npm test -- openGraph
git add lib/checks/openGraph.js __tests__/checks/openGraph.test.js
git commit -m "feat(checks): add Open Graph tags check"
```

---

## Task 8: Check registry + scoring (TDD)

**Files:** `lib/checks/index.js`, `lib/score.js`, `__tests__/score.test.js`

**Step 1: Failing test** (`__tests__/score.test.js`):

```js
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { audit } = require('@/lib/score');

function ctx(name) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'fixtures', name), 'utf8');
  return { $: cheerio.load(html), html, url: 'https://example.com' };
}

describe('audit scoring', () => {
  it('perfect.html scores 100 with grade A', () => {
    const r = audit(ctx('perfect.html'));
    expect(r.score).toBe(100);
    expect(r.grade).toBe('A');
    expect(r.issues).toHaveLength(0);
  });
  it('barebones.html scores 0 with grade F', () => {
    const r = audit(ctx('barebones.html'));
    expect(r.score).toBe(0);
    expect(r.grade).toBe('F');
    expect(r.issues.length).toBe(5);
  });
  it('mixed.html scores 20', () => {
    const r = audit(ctx('mixed.html'));
    expect(r.score).toBe(20);
    expect(r.issues.map(i => i.id)).toEqual(
      expect.arrayContaining(['structuredData', 'faq', 'headings', 'openGraph'])
    );
  });
});
```

**Step 2: FAIL. Step 3: Implement:**

`lib/checks/index.js`:

```js
import structuredData from './structuredData';
import faq from './faq';
import headings from './headings';
import metaTags from './metaTags';
import openGraph from './openGraph';

export const CHECKS = [structuredData, faq, headings, metaTags, openGraph];
```

`lib/score.js`:

```js
import { CHECKS } from './checks';

export function audit(context) {
  const results = CHECKS.map(fn => {
    try { return fn(context); }
    catch (e) { return { id: fn.name || 'unknown', label: 'Check errored', passed: false, severity: 'low', weight: 0, detail: e.message, fix: '' }; }
  });
  const score = results.filter(r => r.passed).reduce((s, r) => s + r.weight, 0);
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  const issues = results.filter(r => !r.passed);
  const passed = results.filter(r => r.passed);
  return { score, grade, issues, passed };
}
```

**Step 4: PASS. Step 5: Commit.**

```bash
npm test
git add lib/checks/index.js lib/score.js __tests__/score.test.js
git commit -m "feat: scoring engine combines 5 checks into weighted score + grade"
```

---

## Task 9: Safe fetchPage utility (TDD)

**Files:** `lib/fetchPage.js`, `__tests__/fetchPage.test.js`

**Step 1: Failing test** — focus on URL validation and SSRF block since network calls are harder to unit test:

```js
const { validateUrl } = require('@/lib/fetchPage');

describe('validateUrl', () => {
  it('accepts https URLs', () => {
    expect(validateUrl('https://example.com').ok).toBe(true);
  });
  it('accepts http URLs', () => {
    expect(validateUrl('http://example.com').ok).toBe(true);
  });
  it('rejects non-http(s)', () => {
    expect(validateUrl('ftp://example.com').ok).toBe(false);
  });
  it('rejects garbage', () => {
    expect(validateUrl('not a url').ok).toBe(false);
  });
  it('blocks localhost', () => {
    expect(validateUrl('http://localhost:3000').ok).toBe(false);
  });
  it('blocks 127.0.0.1', () => {
    expect(validateUrl('http://127.0.0.1').ok).toBe(false);
  });
  it('blocks 10.x private', () => {
    expect(validateUrl('http://10.0.0.1').ok).toBe(false);
  });
  it('blocks 192.168.x private', () => {
    expect(validateUrl('http://192.168.1.1').ok).toBe(false);
  });
});
```

**Step 2: FAIL. Step 3: Implement `lib/fetchPage.js`:**

```js
const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fe80:/i,
];

export function validateUrl(input) {
  let u;
  try { u = new URL(input); } catch { return { ok: false, error: 'INVALID_URL' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, error: 'INVALID_URL' };
  if (PRIVATE_PATTERNS.some(p => p.test(u.hostname))) return { ok: false, error: 'BLOCKED_HOST' };
  return { ok: true, url: u.toString() };
}

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const UA = 'Mozilla/5.0 (compatible; AIReadinessBot/1.0; +https://example.com/bot)';

export async function fetchPage(rawUrl) {
  const v = validateUrl(rawUrl);
  if (!v.ok) return { ok: false, error: v.error };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(v.url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
    });
    if (!res.ok) return { ok: false, error: 'HTTP_ERROR', status: res.status };
    const ct = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(ct)) return { ok: false, error: 'NOT_HTML' };
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    const html = new TextDecoder('utf-8').decode(bytes);
    return { ok: true, url: v.url, html };
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, error: 'TIMEOUT' };
    return { ok: false, error: 'UNREACHABLE' };
  } finally {
    clearTimeout(t);
  }
}
```

**Step 4: PASS. Step 5: Commit.**

```bash
npm test -- fetchPage
git add lib/fetchPage.js __tests__/fetchPage.test.js
git commit -m "feat: safe server-side page fetch with SSRF guard, timeout, size cap"
```

---

## Task 10: API route `/api/audit`

**Files:** `app/api/audit/route.js`

**Step 1: Write the file**

```js
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { fetchPage } from '@/lib/fetchPage';
import { audit } from '@/lib/score';

const ERROR_STATUS = {
  INVALID_URL: 400,
  BLOCKED_HOST: 400,
  NOT_HTML: 415,
  TIMEOUT: 504,
  HTTP_ERROR: 502,
  UNREACHABLE: 502,
  PARSE_FAILED: 500,
  INTERNAL: 500,
};

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 }); }

  const fetched = await fetchPage(body?.url);
  if (!fetched.ok) {
    return NextResponse.json(
      { error: fetched.error, status: fetched.status },
      { status: ERROR_STATUS[fetched.error] ?? 500 }
    );
  }

  let $;
  try { $ = cheerio.load(fetched.html); }
  catch { return NextResponse.json({ error: 'PARSE_FAILED' }, { status: 500 }); }

  const result = audit({ $, html: fetched.html, url: fetched.url });
  return NextResponse.json({
    url: fetched.url,
    fetchedAt: new Date().toISOString(),
    ...result,
  });
}
```

**Step 2: Manual smoke test**

```bash
npm run dev
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/audit -H "Content-Type: application/json" -d "{\"url\":\"https://example.com\"}"
```
Expected: JSON with `score`, `grade`, `issues`, `passed`.

Test error case:

```bash
curl -X POST http://localhost:3000/api/audit -H "Content-Type: application/json" -d "{\"url\":\"http://localhost:9999\"}"
```
Expected: 400 `BLOCKED_HOST`.

**Step 3: Commit**

```bash
git add app/api/audit/route.js
git commit -m "feat: POST /api/audit endpoint"
```

---

## Task 11: UI — AuditForm component

**Files:** `components/AuditForm.js`

```js
'use client';
import { useState } from 'react';

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function AuditForm({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const url = normalizeUrl(value);
    try { new URL(url); }
    catch { setError('Please enter a valid URL'); return; }
    setError('');
    onSubmit(url);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          disabled={loading}
          aria-label="URL to audit"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Auditing…' : 'Run audit'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

**Commit:**

```bash
git add components/AuditForm.js
git commit -m "feat(ui): AuditForm component with URL validation"
```

---

## Task 12: UI — ScoreDial component

**Files:** `components/ScoreDial.js`

```js
'use client';
import { useEffect, useState } from 'react';

export default function ScoreDial({ score, grade }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplayed(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - displayed / 100);
  const color = score >= 85 ? '#16a34a' : score >= 70 ? '#65a30d' : score >= 55 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} stroke="#e2e8f0" strokeWidth="14" fill="none" />
        <circle cx="90" cy="90" r={r} stroke={color} strokeWidth="14" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <div className="text-4xl font-bold text-slate-900">{displayed}</div>
        <div className="text-sm text-slate-500">Grade {grade}</div>
      </div>
    </div>
  );
}
```

**Commit:**

```bash
git add components/ScoreDial.js
git commit -m "feat(ui): animated SVG ScoreDial"
```

---

## Task 13: UI — IssueCard and ResultsPanel

**Files:** `components/IssueCard.js`, `components/ResultsPanel.js`

`components/IssueCard.js`:

```js
'use client';
import { useState } from 'react';

const DOT = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-400' };

export default function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${DOT[issue.severity] || DOT.low}`} />
        <div className="flex-1">
          <div className="font-semibold text-slate-900">{issue.label}</div>
          <div className="mt-1 font-mono text-xs text-slate-600">{issue.detail}</div>
          {issue.fix && (
            <button onClick={() => setOpen(!open)} className="mt-2 text-sm text-slate-700 underline">
              {open ? 'Hide fix' : 'How to fix'}
            </button>
          )}
          {open && issue.fix && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{issue.fix}</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

`components/ResultsPanel.js`:

```js
'use client';
import ScoreDial from './ScoreDial';
import IssueCard from './IssueCard';

export default function ResultsPanel({ result, onReset }) {
  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ScoreDial score={result.score} grade={result.grade} />
        <div className="text-center">
          <div className="break-all text-sm text-slate-600">{result.url}</div>
          <div className="text-xs text-slate-400">Audited {new Date(result.fetchedAt).toLocaleString()}</div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">
        {result.issues.length === 0 ? 'No issues found' : `${result.issues.length} issue(s) found`}
      </h2>
      <div className="mt-3 space-y-3">
        {result.issues.map(i => <IssueCard key={i.id} issue={i} />)}
      </div>

      {result.passed.length > 0 && (
        <details className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer">{result.passed.length} checks passed ✓</summary>
          <ul className="mt-2 space-y-1">
            {result.passed.map(p => <li key={p.id}>• {p.label}</li>)}
          </ul>
        </details>
      )}

      <button onClick={onReset} className="mt-6 text-sm text-slate-700 underline">Audit another URL</button>
    </div>
  );
}
```

**Commit:**

```bash
git add components/IssueCard.js components/ResultsPanel.js
git commit -m "feat(ui): IssueCard and ResultsPanel"
```

---

## Task 14: Wire up `app/page.js`

**Files:** `app/page.js`, `app/layout.js`

Replace `app/page.js`:

```js
'use client';
import { useState } from 'react';
import AuditForm from '@/components/AuditForm';
import ResultsPanel from '@/components/ResultsPanel';

const ERROR_COPY = {
  INVALID_URL: 'Please enter a valid URL.',
  BLOCKED_HOST: "Private/internal URLs aren't supported.",
  NOT_HTML: "That URL doesn't point to an HTML page.",
  TIMEOUT: 'Site took too long to respond.',
  HTTP_ERROR: 'The site returned an error status.',
  UNREACHABLE: 'Could not reach that site.',
  PARSE_FAILED: "Couldn't parse the page.",
  INTERNAL: 'Something went wrong.',
};

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function runAudit(url) {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) { setError(ERROR_COPY[data.error] || ERROR_COPY.INTERNAL); return; }
      setResult(data);
    } catch {
      setError(ERROR_COPY.INTERNAL);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="mx-auto max-w-5xl px-6 py-6">
        <div className="text-sm font-semibold tracking-tight text-slate-900">AI Readiness Audit</div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-8">
        <h1 className="text-center text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Is your site ready for AI?
        </h1>
        <p className="mt-3 max-w-xl text-center text-slate-600">
          Paste a URL. We'll fetch it, check 5 AI-readiness signals, and score it out of 100.
        </p>

        <div className="mt-8 w-full flex justify-center">
          <AuditForm onSubmit={runAudit} loading={loading} />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {loading && (
          <div className="mt-10 w-full max-w-2xl animate-pulse rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-40 w-40 rounded-full bg-slate-100" />
            <div className="mt-6 space-y-2">
              <div className="h-4 w-1/2 rounded bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">Fetching… Parsing… Scoring…</p>
          </div>
        )}

        {result && !loading && (
          <ResultsPanel result={result} onReset={() => setResult(null)} />
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-slate-500">
          Checks run server-side. No data stored.
        </div>
      </footer>
    </main>
  );
}
```

Update `app/layout.js` metadata:

```js
export const metadata = {
  title: 'AI Readiness Audit',
  description: 'Check if your site is AI-ready. Paste a URL, get a score.',
};
```

**Manual test:**

```bash
npm run dev
```
- Open `http://localhost:3000`
- Enter `example.com` → should auto-prepend https, score the page
- Enter `not a url` → inline error
- Enter `http://localhost:9999` → "Private/internal URLs aren't supported"

**Commit:**

```bash
git add app/page.js app/layout.js
git commit -m "feat(ui): wire up audit page with form, loading, results"
```

---

## Task 15: README write-up

**Files:** `README.md` (overwrite)

```markdown
# AI Readiness Audit

A single-page tool that audits any public URL for AI-readiness signals and scores it out of 100.

## Live demo

[https://ai-readiness-audit.vercel.app](https://ai-readiness-audit.vercel.app)

## Run locally

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

## How it works

1. You enter a URL.
2. The server (Next.js route handler at `/api/audit`) fetches the page with a realistic User-Agent, 8-second timeout, and 2 MB body cap. Private/loopback hosts are blocked to prevent SSRF.
3. The HTML is parsed with `cheerio`.
4. Five pure-function checks run against the parsed tree:

| Check | Weight | Why it matters for AI |
|---|---|---|
| Structured data (JSON-LD) | 25 | Schema.org markup is the most reliable way for AI systems to understand page semantics. |
| FAQ content | 20 | FAQPage schema and clear Q&A structure is heavily used by AI answer engines. |
| Heading structure | 20 | One H1, hierarchical H2/H3s make documents easy to segment and summarize. |
| Title + meta description | 20 | Basic discovery signals — still used everywhere. |
| Open Graph tags | 15 | Consistent metadata for previews and cross-system understanding. |

5. Score = sum of weights of passing checks. Grade is a letter band (A ≥85, B ≥70, C ≥55, D ≥40, F below).
6. The UI shows an animated dial, a list of failing checks with evidence and fix suggestions, and a collapsed list of passing checks.

## What's "mock" and what's real

- **Real:** the HTML fetch, the parse, the 5 checks, the evidence strings, the weighted math.
- **Heuristic:** the specific weight numbers. Each is a defensible guess, not a validated model.

## Known limitations (what "real" would add)

- **No JavaScript rendering.** Sites that render content client-side (e.g., SPAs without SSR) will look empty. A production tool would use Playwright or Chromium.
- **No authentication.** Paywalled / logged-in pages aren't supported.
- **No content-quality grading.** We check structure, not whether the content is actually good. An LLM pass would add that.
- **No rate limiting or caching.** One audit per request, no abuse prevention.
- **Single page only.** No crawl, no sitemap, no `llms.txt` / `robots.txt` analysis. Those are easy follow-ups.
- **Weights are opinions.** A real version would calibrate them against outcomes (e.g., AI-engine inclusion rates).

## Stack

Next.js 14 (App Router, JavaScript) · React 18 · Tailwind CSS · cheerio · Jest.

## Tests

\`\`\`bash
npm test
\`\`\`

Covers all 5 checks and the scoring engine via three HTML fixtures (`perfect`, `barebones`, `mixed`).

## Deployment

Push to GitHub, import in Vercel, deploy. No env vars required.
```

**Commit:**

```bash
git add README.md
git commit -m "docs: README explaining approach, checks, and limitations"
```

---

## Task 16: Final test run + Vercel deploy

**Step 1: Full test suite**

```bash
npm test
npm run build
```
Expected: all tests pass, production build succeeds.

**Step 2: Push to GitHub**

```bash
git push origin main
```

**Step 3: Deploy to Vercel**

- Go to [vercel.com/new](https://vercel.com/new)
- Import `Joshianshul007/ai-readiness-project`
- Framework: Next.js (auto-detected)
- No env vars
- Deploy

**Step 4: Smoke test production**

- Visit the Vercel URL
- Audit `https://example.com` → should render score + issues
- Audit `https://en.wikipedia.org/wiki/Main_Page` → should score well

**Step 5: Update README with live URL (if Vercel URL differs)** and commit.

---

## Verification Checklist

**REQUIRED SUB-SKILL:** Use superpowers:verification-before-completion before claiming done.

- [ ] `npm test` — all green
- [ ] `npm run build` — succeeds, no errors
- [ ] `npm run dev` — page loads, form works
- [ ] Happy path: audit `https://example.com` returns score + issues
- [ ] Error path: audit `http://localhost:9999` shows "Private/internal URLs aren't supported"
- [ ] Error path: audit `not-a-url` shows inline validation error
- [ ] Deployed URL serves the same experience as local
- [ ] README live-demo link points to the Vercel URL

---

## Execution Options

Plan complete and saved. Two execution options:

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.
2. **Parallel Session (separate)** — You open a new session with `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
