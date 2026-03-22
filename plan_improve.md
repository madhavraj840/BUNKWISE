# BunkWise — Improvement Plan
**Version:** 1.1 | **Date:** 2026-03-22 | **Status:** EXECUTING

---

## 0. Current Baseline (Evidence from PageSpeed Insights)

| Page | FCP | LCP | TBT | CLS | SI | Score |
|---|---|---|---|---|---|---|
| sgpa.html (mobile) | 4.4s | 7.4s | 200ms | 0.026 | 4.4s | 62 |
| cw.html (mobile) | 2.7s | 2.7s | 210ms | 0.053 | 2.7s | 87 |
| index.html (mobile) | 4.8s | 7.7s | 350ms | 0 | 5.6s | ~65 est. |

**Target:** ≥ 90 on all pages.

---

## 1. Files That Will Change

| File | Changes |
|---|---|
| `index.html` | Title, buttons, remove badge, SEO text, ad position, header, footer |
| `sgpa.html` | Title, header, footer, remove ad containers |
| `cw.html` | Title, header, footer, remove ad containers |
| `attendance.html` | Header, footer, remove ad containers |
| `rtu_result.html` | Header, footer, remove ad containers |
| `auto_result.html` | Header, footer, remove ad containers |
| `about.html` | Header, footer, remove ad containers |
| `contact.html` | Header, footer, add SEO text |
| `terms.html` | Header, footer, update content |
| `privacy.html` | Header, footer, update content |
| `creators.html` | Header, footer |
| `style.css` | Batman theme variables, colour overhaul, theme toggle icon, font loading |
| `app.js` | Batman theme cycle (light → dark → batman → light), updateThemeIcon |
| `sitemap.xml` | Add index.html URL, update lastmod dates |

---

## 2. Task Breakdown

---

### TASK 1 — Page Titles (HTML `<title>` tags)

**Files:** `index.html`, `sgpa.html`, `cw.html`

| File | Current Title | New Title |
|---|---|---|
| `index.html` | RTU Attendance & SGPA Calculator \| BunkWise | RTU SGPA Calculator & Attendance \| BunkWise |
| `sgpa.html` | RTU & SKIT SGPA Calculator (Result PDF Tool) \| BunkWise | RTU SGPA Calculator \| BunkWise |
| `cw.html` | BunkWise — Class Wise Calculator | RTU Class Wise Attendance Calculator \| BunkWise |

**Also update:** `og:title` and `twitter:title` meta tags in the same files to match.

---

### TASK 2 — Remove Ad Containers from All Pages

**Constraint:** Remove ONLY the `<div class="ad-container">` elements and the `<div class="ad-container ad-banner">` element. Do NOT remove the AdSense `<script async src="https://pagead2.googlesyndication.com/...">` tag — leave it in place. We will place ads back later.

**Reason for keeping AdSense script:** Removing it would de-register the publisher account from those pages.

**Files and line numbers to remove `<div class="ad-container">` from:**

| File | Count to remove |
|---|---|
| `index.html` | 1 (`ad-banner` class — inside `.home-inner`) |
| `sgpa.html` | 2 (left ad rail + inline) |
| `cw.html` | 2 (left ad rail + inline) |
| `attendance.html` | 3 (left ad rail + 2 inline) |
| `rtu_result.html` | 2 (left ad rail + inline) |
| `auto_result.html` | 2 (left ad rail + inline) |
| `about.html` | 2 (left ad rail + inline) |

**Also remove from `style.css`:** The `.ad-container` and `.ad-banner` CSS rules that set `min-height: 90px`, display placeholder borders, and the `::before { content: '// advertisement'; }` rule — these cause CLS (layout shift) when the slot is empty.

---

### TASK 3 — Index Page: Button Row Changes

**Current state (`index.html`):**
- Button: `<button class="btn-primary" id="btn-get-started">` → text says "Attendance Calculator" (already correct from previous session — verify before changing)
- Buttons already exist: SGPA Calculator + Class Wise as `btn-secondary`

**Changes:**
1. Rename button text from whatever it currently says to **"Attendance Calculator →"** (confirm current text first)
2. The three buttons (`Attendance Calculator`, `SGPA Calculator`, `Class Wise`) must sit in **a single row on ≥600px screens** and **stack vertically on <600px screens**
3. This is already implemented via `.home-btn-row` CSS — **verify it is working correctly, do not rebuild from scratch**

---

### TASK 4 — Index Page: Remove Home Badge

**Remove this exact element from `index.html`:**
```html
<div class="home-badge">attendance tracker</div>
```
**Also remove** the `.home-badge` CSS rule from `style.css`.

---

### TASK 5 — Index Page: SEO Text Section

**Location:** Below the ad container (which will be removed in Task 2), above the existing `.home-seo` div.

**Requirement:** Add SEO-optimised content using HTML headings (`<h2>`, `<h3>`) and `<p>` tags **inside the existing `.home-seo` div** — not as a new floating div. The existing `.home-seo` block already has content; expand it.

**Keywords to include (mandatory):**
- rtu sgpa calculator
- rtu attendance calculator
- rtu result calculator
- 75% attendance rule RTU
- SKIT autonomous SGPA
- bunk calculator
- Poornima, VGU, Arya, JECRC, SKIT Jaipur

**Content structure to add (headings + paragraphs):**
- One `<h2>` introducing BunkWise as a free tool for RTU students
- One section on the attendance calculator with an `<h3>`
- One section on SGPA calculator with an `<h3>`
- One section on Class Wise calculator with an `<h3>`
- One FAQ section reusing the existing `<details>` pattern already in `.home-seo`
- Keep the existing `.home-seo-divider` elements between sections

---

### TASK 6 — Index Page: Ad Container Position

After removing `<div class="ad-container ad-banner">` (Task 2), **nothing replaces it**. The ad container is simply removed. No repositioning needed — Task 2 handles this fully.

---

### TASK 7 — Header on All Pages (Wide Screens ≥900px)

**Current state:** Header (`<header class="site-header">`) only exists in `index.html`. All other pages only have the hamburger + side-menu.

**Requirement:** Add the identical header HTML block to ALL pages:
- `sgpa.html`, `cw.html`, `attendance.html`, `rtu_result.html`, `auto_result.html`, `about.html`, `contact.html`, `terms.html`, `privacy.html`, `creators.html`

**Header HTML to add (copy from index.html exactly):**
```html
<header class="site-header" role="banner">
    <a href="index.html" class="site-header-logo">BunkWise</a>
    <nav class="site-header-nav" aria-label="Main navigation">
        <a href="attendance.html">Attendance</a>
        <a href="sgpa.html">SGPA Calculator</a>
        <a href="cw.html">Class Wise</a>
        <a href="contact.html">Contact</a>
    </nav>
    <div class="site-header-right">
        <button class="site-header-theme" id="header-theme-toggle" aria-label="Switch theme">☀️</button>
    </div>
</header>
```

**Placement:** Immediately after `<body>` tag on every page, before `<button id="theme-toggle">`.

**CSS rule to add for non-index pages:** Currently the header hides hamburger only for `body.page-home-body`. For all other pages, the hamburger should also hide at ≥900px. Add to `style.css`:
```css
@media (min-width: 900px) {
    .site-header { display: flex; }
    .hamburger { display: none; }
}
```
**Critical constraint:** Do NOT add `padding-top: 56px` or any top offset to page content — this would push content down and hurt mobile UX. The header is `position: fixed` and overlaps content at top, which is acceptable since pages already have `padding-top: 5-6rem`.

**Behaviour:** On <900px screens the header hides and the hamburger shows — this is the existing CSS behaviour, no change needed.

---

### TASK 8 — Footer on All Pages (Wide Screens ≥900px)

**Current state:** Footer only exists in `index.html`.

**New footer HTML to add to ALL pages (matching index.html pattern but with updated links):**
```html
<footer class="site-footer">
    <span class="site-footer-copy">© 2026 BunkWise — Free tools for RTU students</span>
    <nav class="site-footer-links" aria-label="Footer navigation">
        <a href="about.html">About</a>
        <a href="terms.html">Terms</a>
        <a href="privacy.html">Privacy</a>
        <a href="creators.html">Creator</a>
        <a href="contact.html">Contact</a>
    </nav>
</footer>
```

**Placement:** Immediately before `<script src="app.js" defer></script>` on every page.

**CSS:** Footer already has `display: none` on mobile and `display: flex` at ≥900px — no CSS changes needed for the footer itself.

---

### TASK 9 — Theme Toggle: Icon Change (Minimalistic)

**Current state:** `btn.textContent = theme === 'light' ? '🌙' : '☀️'` — these emoji look "AI-made".

**Change:** Replace with minimal text/symbol icons:
- Dark mode active → show `○` (circle, meaning "switch to light")
- Light mode active → show `●` (filled circle, meaning "switch to dark")
- Batman mode active → show `◆` (diamond)

**Files to change:**
- `app.js` → `updateThemeIcon()` function
- `index.html` → initial `header-theme-toggle` button text
- All pages → initial `theme-toggle` button text

**Constraint:** Change ONLY the icon text/symbol. Do not change button size, position, shape, or any other property.

---

### TASK 10 — Batman Theme: Three-Way Cycle

**Cycle order:** `light → dark → batman → light → ...`

**Current state:** Two-way toggle `dark ↔ light` in `toggleTheme()` in `app.js`.

**localStorage key:** `bw-theme` — already in use. Batman value = `'batman'`.

**Changes needed in `app.js`:**

1. **`toggleTheme()` function** — change from two-way to three-way:
```javascript
// Current themes: 'dark', 'light'
// New order: light → dark → batman → light
const THEMES = ['light', 'dark', 'batman'];
const current = document.documentElement.dataset.theme || 'dark';
const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
const targetTheme = THEMES[nextIndex];
```

2. **`updateThemeIcon()` function** — update for three states:
```javascript
// dark → ○  |  light → ●  |  batman → ◆
```

3. **Theme init script (inline in every HTML `<head>`)** — currently only reads `dark`/`light`. Must now also accept `batman`:
```javascript
const saved = localStorage.getItem('bw-theme');
const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme = saved || preferred;
// No change needed — it already sets whatever is in localStorage
```
This already works correctly — no change needed to the init script.

**Changes needed in `style.css`:**

Add Batman theme CSS variables block:
```css
[data-theme="batman"] {
    --bg:           #0d0d0d;
    --bg-card:      #1a1a1a;
    --bg-card-h:    #222222;
    --bg-input:     #141414;
    --border:       #333333;
    --border-l:     #444444;

    --accent:       #f9d71c;      /* Bat-Signal Yellow */
    --accent-h:     #e6c400;
    --accent-glow:  rgba(249,215,28,0.35);

    --green:        #1ed97a;      /* keep green for pass/attendance */
    --green-dim:    rgba(30,217,122,0.12);

    --red:          #f04455;      /* keep red for fail/absent */
    --red-dim:      rgba(240,68,85,0.12);

    --text:         #ffffff;
    --text-sec:     #a1a1a1;
    --text-muted:   #555555;
    --overlay:      rgba(0,0,0,0.85);

    --r:    6px;      /* sharper corners vs dark theme's 14px */
    --r-sm: 4px;
    --r-lg: 10px;
}
```

**Batman-specific overrides (in `style.css`):**
```css
[data-theme="batman"] .home-title .hl {
    text-shadow: 0 0 18px rgba(249,215,28,0.5);
}
[data-theme="batman"] .btn-primary {
    background: #f9d71c;
    color: #000;
    box-shadow: 0 4px 20px rgba(249,215,28,0.4);
}
[data-theme="batman"] .btn-primary:hover {
    background: #e6c400;
}
[data-theme="batman"] .btn-secondary {
    border-color: #f9d71c;
    color: #f9d71c;
}
[data-theme="batman"] #page-home::after {
    background: radial-gradient(circle, rgba(249,215,28,0.08) 0%, transparent 70%);
}
```

**Constraint:** Do NOT change font, layout, button sizes, padding, or any structural property. Only colours and border-radius values change in batman mode.

---

### TASK 11 — Colour Overhaul (All Themes — Remove AI Blue)

**Problem:** `--accent: #4d8af0` (medium blue) makes the site look generic AI-generated.

**Changes to `:root` (dark theme) in `style.css`:**

| Variable | Current | New |
|---|---|---|
| `--accent` | `#4d8af0` | `#c9a84c` (burnished gold/ochre) |
| `--accent-h` | `#3772d8` | `#b08a35` |
| `--accent-glow` | `rgba(77,138,240,0.35)` | `rgba(201,168,76,0.35)` |

**Changes to `[data-theme="light"]` in `style.css`:**

| Variable | Current | New |
|---|---|---|
| `--accent` | `#2d5bbf` | `#8b6914` (deep ochre for warm bg) |
| `--accent-h` | `#1e459a` | `#6e5110` |
| `--accent-glow` | `rgba(45,91,191,0.30)` | `rgba(139,105,20,0.30)` |

**Scope of colour change:** This `--accent` variable is used throughout all pages and components (buttons, active nav, borders, gauge arc, etc.) — all update automatically via CSS variables. No per-component changes needed.

**Constraint:** Do NOT change `--green`, `--red`, or any layout/structural CSS. Only the accent colour.

---

### TASK 12 — Contact Page: Header + Footer + SEO Text

**Current state:** `contact.html` has Telegram and Email links. No header, no footer, no SEO text.

**Add:**
1. Header (same as Task 7)
2. Footer (same as Task 8)
3. Add an intro paragraph with SEO text about the contact page:
   - "BunkWise is built by one developer. For bugs, feature requests, or credit map corrections, reach out directly."
   - Include the word "BunkWise", "RTU", and "SKIT" in the text for keyword presence.

---

### TASK 13 — Sitemap Update

**File:** `sitemap.xml`

**Add missing URL:** `https://bunkwise.in/index.html` (currently only `https://bunkwise.in/` is listed — add the explicit `index.html` URL as well OR confirm the `/` URL is sufficient — since both resolve to the same page, adding both may cause duplicate content warning. **Decision: update the existing `/` entry to `https://bunkwise.in/index.html` AND keep the `/` entry for canonical purposes.**)

**Actually correct approach:** Leave `https://bunkwise.in/` as-is (canonical). Add `contact.html` which is missing from the sitemap.

**URLs to ADD:**
```xml
<url>
    <loc>https://bunkwise.in/contact.html</loc>
    <lastmod>2026-03-22</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
</url>
```

**Update all `<lastmod>` dates** from `2026-03-19` to `2026-03-22`.

---

### TASK 14 — Privacy & Terms Page Updates

**`privacy.html`:** Add a section noting the removal of ad containers from active display (ads are paused, AdSense script remains for publisher registration). Update "Last updated" date to March 2026.

**`terms.html`:** Update "Last updated" date to March 2026. No content changes required unless Batman theme affects data handling (it does not — it's purely cosmetic).

---

### TASK 15 — Performance Improvements (PageSpeed Score ≥90)

These are the direct fixes for the Lighthouse findings:

#### 15A — Remove Google Fonts render-blocking request (biggest FCP/LCP win)

**Current state (`cw.html` Lighthouse):** Google Fonts CSS is a render-blocking request causing 780ms delay.

**Current implementation (all pages):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="...fonts.googleapis.com/css2?..." as="style" onload="this.rel='stylesheet'">
<noscript><link href="..." rel="stylesheet"></noscript>
```

**Problem:** The `preload` + `onload` pattern is correct but `fonts.gstatic.com` is missing `crossorigin` on the preconnect in some pages. Verify all pages have:
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Also add `font-display: swap` equivalent** by appending `&display=swap` to the Google Fonts URL — already present in `index.html`, verify all pages have it.

#### 15B — AdSense Script: KEEP, Remove Only Containers

**Decision (confirmed):** Keep the `<script async src="https://pagead2.googlesyndication.com/...">` tag on ALL pages. Removing it would break AdSense site verification and cause application rejection.

**What to remove:** Only the `<div class="ad-container">` placeholder divs and their CSS `min-height` rules. The AdSense script without active ad slots will not load the heavy secondary scripts (`show_ads_impl` 179KB, `lidar.js`) — these only load when an ad slot div is present on the page.

#### 15C — Fix duplicate `generateReportPDF` (known bug from earlier audit)

**File:** `app.js` lines 3279 (async version) and 3482 (sync duplicate).

The sync duplicate at line 3482 overwrites the async version. **Delete lines 3482–3599** (the entire sync `function generateReportPDF()` block).

#### 15D — Fix `renderCWCards()` null crash

**File:** `app.js` — `renderCWCards()` function.

**Current code:**
```javascript
var list = document.getElementById('cw-subjects-list');
list.innerHTML = '';   // crashes — element does not exist in cw.html
```

**Fix:** Add null guard:
```javascript
var list = document.getElementById('cw-subjects-list');
if (!list) return;
list.innerHTML = '';
```

#### 15E — Minify CSS and JS (Est. savings: CSS 3KB, JS 14KB)

This is a build/deployment step, not a code change. These savings come from deploying minified versions. Since this is a static GitHub Pages site with no build pipeline, this is a deployment-level task.
- **For now:** Skip minification — it requires a build tool. Add as a future task.
- **Alternative:** Compress images and reduce unused CSS manually.

#### 15F — Cache Lifetime (Est. savings: 83KB)

Lighthouse reports `app.js` and `style.css` have only 10-minute cache TTL.

**Fix:** Add a `_headers` file (for Netlify/Cloudflare Pages) or `.htaccess` (Apache) or `vercel.json` to set cache headers. Since the site is on a custom domain (bunkwise.in), the server config is unknown. **This is flagged as a deployment task — not a code change.**

#### 15G — Deprecated API Warning (Google Ads `unload` event listener)

**Source:** `pagead2.googlesyndication.com/pagead/js/lidar.js` — Google's own AdSense library uses deprecated `unload` event listeners.

**Fix:** This is inside Google's third-party script — cannot be fixed by us. **Removing the AdSense script entirely (Task 15B) eliminates this warning.**

#### 15H — CLS Fix (Cumulative Layout Shift: 0.026–0.053)

**Cause:** Empty `.ad-container` divs with `min-height: 90px` shift layout as they load. Removing ad containers (Task 2) and their CSS (also Task 2) eliminates this entirely.

---

### TASK 16 — Accessibility Fixes (Score currently 90–93)

From the Lighthouse accessibility report:

1. **Low contrast: `auto-branch-label` text** (`SELECT YOUR BRANCH`) — the muted label colour does not meet WCAG AA. Fix: increase label colour to `--text` instead of `--text-muted` in `style.css` for `.auto-branch-label`.

2. **Heading order: `<h3>` without preceding `<h2>`** — the "// how to get your result pdf" `<h3>` inside `.instructions-box` on `sgpa.html` is not preceded by an `<h2>` in that section. Fix: either change it to `<h2>` or add a visually hidden `<h2>` before it.

---

## 3. Execution Order (When "EXECUTE" Is Called)

Execute tasks in this order to minimise re-work:

1. **TASK 15C** — Fix `generateReportPDF` duplicate in `app.js` (single surgical deletion)
2. **TASK 15D** — Fix `renderCWCards()` null guard in `app.js`
3. **TASK 10** — Batman theme JS changes in `app.js`
4. **TASK 9** — Theme toggle icon change in `app.js`
5. **TASK 11** — Colour overhaul + Batman CSS in `style.css`
6. **TASK 4** — Remove `.home-badge` CSS from `style.css`
7. **TASK 1** — Title changes in `index.html`, `sgpa.html`, `cw.html`
8. **TASK 2** — Remove all ad containers + AdSense scripts + ad CSS from all pages
9. **TASK 3** — Verify/update index.html button row text
10. **TASK 4** — Remove `<div class="home-badge">` from `index.html`
11. **TASK 5** — Add SEO text to `index.html`
12. **TASK 7** — Add header to all non-index pages
13. **TASK 8** — Add footer to all non-index pages
14. **TASK 12** — Update `contact.html`
15. **TASK 13** — Update `sitemap.xml`
16. **TASK 14** — Update `privacy.html` and `terms.html`
17. **TASK 15A/F/G** — Performance fixes (font preconnect check, cache note)
18. **TASK 16** — Accessibility fixes

---

## 4. Files NOT Being Changed

| File | Reason |
|---|---|
| `app.js` credit maps | No credit map changes requested |
| `robots.txt` | Already correct |
| `manifest.json` | No changes requested |
| `Ads.txt` | Keep as-is |
| `rtu_result.html` / `auto_result.html` content | Only add header + footer + remove ads |
| `about.html` content | Only add header + footer + remove ads |

---

## 5. Open Questions — ALL RESOLVED

| # | Question | Decision |
|---|---|---|
| 1 | Batman theme toggle icons | `○ ● ◆` confirmed acceptable |
| 2 | Hamburger on non-index pages | Header visible ≥900px on ALL pages; collapses to hamburger on <900px |
| 3 | Sitemap `/` vs `index.html` | Keep `/` canonical; only add missing `contact.html` |
| 4 | AdSense script removal | **KEEP** AdSense `<script>` on all pages; remove only `<div class="ad-container">` divs |

---

## 6. Expected PageSpeed Impact After All Tasks

| Metric | Before | Expected After |
|---|---|---|
| FCP | 4.4–4.8s | ~1.5–2s (removing 205KB AdSense JS) |
| LCP | 7.4–7.7s | ~2–3s |
| TBT | 200–350ms | ~50–100ms |
| CLS | 0.026–0.053 | ~0 (no empty ad containers) |
| SI | 4.4–5.6s | ~2–2.5s |
| Score | 62–87 | **90–95 est.** |
