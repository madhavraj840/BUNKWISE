<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal SGPA Calculator — BunkWise</title>
    <meta name="description" content="Free universal SGPA calculator for any university and any grading scale. Enter your subjects, credits and grade points and get your Semester Grade Point Average instantly.">
    <link rel="canonical" href="https://bunkwise.in/universal_sgpa.html" />
    <meta property="og:type"        content="website" />
    <meta property="og:url"         content="https://bunkwise.in/universal_sgpa.html" />
    <meta property="og:title"       content="Universal SGPA Calculator | BunkWise" />
    <meta property="og:description" content="Free universal SGPA calculator for any university. Enter subjects, credits and grade points — get your SGPA instantly. No login, no data stored." />
    <meta property="og:image"       content="https://bunkwise.in/icons/Icon-512.png" />
    <meta name="twitter:card"        content="summary" />
    <meta name="twitter:title"       content="Universal SGPA Calculator | BunkWise" />
    <meta name="twitter:description" content="Calculate SGPA for any university. Enter subjects, credits and grade points and get your result instantly." />
    <link rel="manifest" href="manifest.json" />


    <script>
        (function () {
            try {
                var saved = localStorage.getItem('bw-theme');
                var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.dataset.theme = saved || preferred;
            } catch (e) {
                document.documentElement.dataset.theme = 'dark';
            }
        })();
    </script>
    <script>
        if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
            var _gaScript = document.createElement('script');
            _gaScript.async = true;
            _gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-WSBK8SX5LT";
            document.head.appendChild(_gaScript);
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WSBK8SX5LT', { 'transport_type': 'beacon' });
        }
    </script>

    <!-- ── Critical CSS — inline for zero render-blocking (Instrument Cluster tokens) ── -->
    <style>
:root{--bg:#0b0f1a;--bg-card:#121829;--bg-card-h:#182138;--bg-input:#0c1120;--border:#1e2840;--border-l:#2d3a5c;--accent:#6c8cff;--accent-h:#5570e6;--accent-dim:rgba(108,140,255,.12);--accent-glow:rgba(108,140,255,.24);--green:#1ed97a;--red:#f04455;--text:#eaf0ff;--text-sec:#93a1c4;--text-muted:#515d80;--overlay:rgba(5,8,16,.78);--r:10px;--r-sm:7px;--r-lg:18px}
[data-theme=light]{--bg:#eef1f8;--bg-card:#fff;--bg-card-h:#f4f7fd;--bg-input:#e9edf6;--border:#d4dcec;--border-l:#bcc7e0;--accent:#3a52d6;--accent-h:#2c40b8;--accent-dim:rgba(58,82,214,.10);--accent-glow:rgba(58,82,214,.18);--green:#0e9f6e;--red:#d92d43;--text:#0e1426;--text-sec:#44506e;--text-muted:#8390ad;--overlay:rgba(15,20,40,.45)}
[data-theme=batman]{--bg:#05070c;--bg-card:#0d1018;--bg-card-h:#141926;--bg-input:#080b12;--border:#1c2030;--border-l:#2a3142;--accent:#ffd23f;--accent-h:#f0bd1f;--accent-dim:rgba(255,210,63,.10);--accent-glow:rgba(255,210,63,.22);--green:#1ed97a;--red:#f04455;--text:#f6f8ff;--text-sec:#9aa3b8;--text-muted:#586074;--overlay:rgba(0,0,0,.85)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
button{cursor:pointer}
.hidden{display:none!important}
.site-header{display:none;position:fixed;top:0;left:0;right:0;z-index:1050;height:58px;background:var(--bg-card);border-bottom:1px solid var(--border);align-items:center;padding:0 2rem;gap:1.5rem}
@media(min-width:900px){.site-header{display:flex}#theme-toggle{display:none!important}.hamburger{display:none!important}}
.site-header-logo{font-family:'Space Grotesk','Segoe UI',system-ui,sans-serif;font-size:1.18rem;font-weight:700;color:var(--text);text-decoration:none;letter-spacing:-.03em;white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;gap:.5rem}
.site-header-logo::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--accent);flex-shrink:0}
.site-header-nav{display:flex;align-items:center;gap:.2rem;flex:1;justify-content:flex-end}
.site-header-nav a{padding:.42rem .9rem;border-radius:var(--r-sm);color:var(--text-sec);text-decoration:none;font-size:.88rem;font-weight:600;white-space:nowrap}
.site-header-nav a:hover{background:var(--accent-dim);color:var(--accent)}
.site-header-right{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
.site-header-theme{width:36px;height:36px;background:var(--bg-input);border:1px solid var(--border-l);border-radius:var(--r-sm);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--accent)}
.site-header-theme svg{stroke:var(--accent)}
#theme-toggle{position:fixed;top:1rem;right:1rem;z-index:1100;width:44px;height:44px;background:var(--bg-card);border:1px solid var(--border-l);border-radius:var(--r-sm);cursor:pointer;display:none;align-items:center;justify-content:center;color:var(--accent)}
#theme-toggle svg{stroke:var(--accent)}
#theme-toggle.visible{display:flex}
.hamburger{position:fixed;top:1rem;left:1rem;z-index:1100;width:44px;height:44px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.hamburger span{display:block;width:20px;height:2px;background:var(--text);border-radius:2px}
.menu-backdrop{position:fixed;inset:0;background:var(--overlay);z-index:1040;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:none}
.menu-backdrop.visible{display:block}
.side-menu{position:fixed;top:0;left:-296px;width:276px;height:100vh;background:var(--bg-card);border-right:1px solid var(--border);z-index:1050;padding:4.5rem 1rem 2rem;transition:left .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;gap:2px;overflow-y:auto}
.side-menu.open{left:0}
.side-menu-label{font-family:'DM Mono','Consolas',monospace;font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;color:var(--text-muted);padding:.5rem .9rem;margin-bottom:.3rem}
.side-menu a{display:flex;align-items:center;gap:.85rem;padding:.7rem .9rem;border-radius:var(--r-sm);color:var(--text-sec);text-decoration:none;font-size:.88rem;font-weight:500;cursor:pointer}
.side-menu a:hover,.side-menu a.active{background:var(--accent-dim);color:var(--accent)}
.side-menu a .ico{font-size:.95rem;width:20px;text-align:center;flex-shrink:0}
.menu-div{height:1px;background:var(--border);margin:.55rem .6rem}
.site-footer{display:none;width:100%;border-top:1px solid var(--border);background:var(--bg-card);padding:1.1rem 2rem;box-sizing:border-box}
@media(min-width:900px){.site-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem}}
.site-footer-copy{font-family:'DM Mono','Consolas',monospace;font-size:.7rem;color:var(--text-muted);letter-spacing:.06em}
.site-footer-links{display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap}
.site-footer-links a{font-size:.82rem;color:var(--text-sec);text-decoration:none}
.site-footer-links a:hover{color:var(--accent)}
    </style>

    <!-- ── Rest of CSS deferred — non-blocking ── -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" as="style" onload="this.rel='stylesheet'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></noscript>
    <link rel="stylesheet" href="style.css?v=1.3" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="style.css?v=1.3"></noscript>
</head>
<body>

<header class="site-header" role="banner">
    <a href="/" class="site-header-logo">BunkWise</a>
    <nav class="site-header-nav" aria-label="Main navigation">
        <a href="attendance.html">Attendance</a>
        <a href="sgpa.html">SGPA Calculator</a>
        <a href="cw.html">Class Wise</a>
        <a href="contact.html">Contact</a>
    </nav>
    <div class="site-header-right">
        <button class="site-header-theme" id="header-theme-toggle" aria-label="Switch to batman mode"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></button>
    </div>
</header>

<button id="theme-toggle" aria-label="Switch to batman mode"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></button>

<button class="hamburger" id="hamburger" aria-label="Toggle navigation">
    <span></span><span></span><span></span>
</button>

<div class="menu-backdrop" id="menu-backdrop"></div>
<nav class="side-menu" id="side-menu">
    <div class="side-menu-label">// navigation</div>
    <a href="/"><span class="ico">⌂</span> Home</a>
    <a href="sgpa.html"><span class="ico">◎</span> SGPA Calculator</a>
    <a href="cw.html"><span class="ico">⊞</span> CW Calculator</a>
    <div class="menu-div"></div>
    <a href="about.html"><span class="ico">◈</span> About Us</a>
    <div class="menu-div"></div>
    <a href="terms.html"><span class="ico">◇</span> Terms &amp; Conditions</a>
    <a href="privacy.html"><span class="ico">◉</span> Privacy Policy</a>
    <div class="menu-div"></div>
    <a href="creators.html"><span class="ico">✦</span> Creator Description</a>
    <div class="menu-div"></div>
    <a href="contact.html"><span class="ico">✉</span> Contact</a>
</nav>

<main id="main-content">
<div id="page-universal-sgpa" class="page" style="justify-content:flex-start;align-items:center;padding-top:5.5rem;padding-bottom:4rem;">

    <!-- ── Calculator section ─────────────────────────── -->
    <div class="univ-wrap">

        <h1 class="page-title" style="text-align:center;margin-bottom:.35rem;">Universal SGPA Calculator</h1>
        <p class="page-sub" style="text-align:center;margin-bottom:2rem;">Works for any university and any grading scale. Enter your subjects below.</p>

        <!-- Back link -->
        <a href="sgpa.html" class="univ-back-link">← Back to SGPA Calculator</a>

        <!-- Error banner -->
        <div class="univ-error-banner" id="univ-error" role="alert"></div>

        <!-- Input table -->
        <div class="univ-table-wrap">
            <table class="univ-table" id="univ-table">
                <thead>
                    <tr>
                        <th class="univ-th-name">Subject Name</th>
                        <th class="univ-th-num">Credits</th>
                        <th class="univ-th-num">Grade Point</th>
                        <th class="univ-th-del" aria-label="Delete"></th>
                    </tr>
                </thead>
                <tbody id="univ-tbody"></tbody>
            </table>
        </div>

        <!-- Action buttons -->
        <div class="univ-actions">
            <button class="btn-primary" id="univ-btn-calc">
                Calculate SGPA <span class="btn-arrow">→</span>
            </button>
            <button class="univ-btn-add" id="univ-btn-add" aria-label="Add subject row">
                + Add Subject
            </button>
            <button class="btn-check-another" id="univ-btn-reset">
                ↺ Reset
            </button>
        </div>

        <!-- Result section -->
        <div class="univ-result hidden" id="univ-result">
            <div class="univ-result-header">
                <div class="univ-sgpa-label">Your SGPA</div>
                <div class="univ-sgpa-number sgpa-good" id="univ-sgpa-val">—</div>
            </div>

            <div class="univ-result-table-wrap">
                <table class="univ-result-table">
                    <thead>
                        <tr>
                            <th class="univ-th-name">Subject</th>
                            <th class="univ-th-num">Credits</th>
                            <th class="univ-th-num">Grade Point</th>
                            <th class="univ-th-num">Credit Points</th>
                        </tr>
                    </thead>
                    <tbody id="univ-result-tbody"></tbody>
                </table>
            </div>

            <div class="univ-formula-box" id="univ-formula">—</div>
        </div>

        <!-- How it works — SEO section -->
        <div class="seo-section" style="max-width:660px;margin-top:2.5rem;">
            <h2>How to Calculate SGPA</h2>
            <p>SGPA (Semester Grade Point Average) is calculated using a simple weighted average formula. Each subject has a certain number of <strong>credits</strong> and you earn a <strong>grade point</strong> based on your performance in that subject.</p>
            <div class="univ-formula-box" style="margin:1rem 0;">SGPA = Σ(Credits × Grade Points) ÷ Σ(Credits)</div>

            <h3 style="margin-top:1.25rem;margin-bottom:.6rem;font-size:.95rem;font-weight:600;">Step-by-Step Guide</h3>
            <ul>
                <li>List all your subjects for the semester along with their credit hours.</li>
                <li>Note the grade point you received for each subject as per your university's grading scale.</li>
                <li>Multiply each subject's credits by its grade point to get <strong>credit points</strong>.</li>
                <li>Add all credit points to get the <strong>total credit points</strong>.</li>
                <li>Add all credits to get the <strong>total credits</strong>.</li>
                <li>Divide total credit points by total credits — the result is your SGPA.</li>
            </ul>

            <div class="faq-section" style="margin-top:1.75rem;">
                <h2>Frequently Asked Questions</h2>

                <details class="faq-item">
                    <summary class="faq-question">Does this work for any university?</summary>
                    <div class="faq-answer">
                        <p>Yes. This calculator does not use any preset grade point scale. You enter your own grade points directly — whether your university uses a 10-point scale, a 4-point scale (GPA), or any other system. The formula is the same: total credit points divided by total credits.</p>
                    </div>
                </details>

                <details class="faq-item">
                    <summary class="faq-question">What grade point do I enter?</summary>
                    <div class="faq-answer">
                        <p>Enter the numeric grade point your university assigns. For RTU: A++ = 10, A+ = 9, A = 8.5, and so on. For a 4-point system: A = 4, B = 3, C = 2, D = 1. Check your university's grade point table to find the correct value for each grade you received.</p>
                    </div>
                </details>

                <details class="faq-item">
                    <summary class="faq-question">How is this different from the RTU SGPA Calculator?</summary>
                    <div class="faq-answer">
                        <p>The RTU SGPA Calculator on BunkWise reads your result PDF directly and calculates your SGPA automatically — no manual entry needed because it knows the credits and grade points from your RTU marksheet. This Universal Calculator is for anyone who wants to calculate SGPA manually, for any university, without uploading a PDF.</p>
                    </div>
                </details>

                <details class="faq-item">
                    <summary class="faq-question">Is any data stored or sent to a server?</summary>
                    <div class="faq-answer">
                        <p>No. Everything runs entirely in your browser. No data is sent to any server, no account is needed, and nothing is stored. When you close the tab, all data is gone.</p>
                    </div>
                </details>
            </div>
        </div>

    </div><!-- /univ-wrap -->

</div><!-- /page-universal-sgpa -->
</main>

<footer class="site-footer">
    <span class="site-footer-copy">&copy; 2026 BunkWise &mdash; Free tools for RTU students</span>
    <nav class="site-footer-links" aria-label="Footer navigation">
        <a href="about.html">About</a>
        <a href="terms.html">Terms</a>
        <a href="privacy.html">Privacy</a>
        <a href="creators.html">Creator</a>
        <a href="contact.html">Contact</a>
    </nav>
</footer>

<script src="app.js?v=1.2" defer></script>
<script src="universal-sgpa.js?v=1.0" defer></script>
</body>
</html>
