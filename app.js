(function () {
    'use strict';

    /* ── Safe localStorage wrapper ───────────────────────────
       Prevents QuotaExceededError crash in Safari Private mode.
       All localStorage access goes through these helpers.
    ────────────────────────────────────────────────────────── */
    var _store = {
        get: function (key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set: function (key, val) {
            try { localStorage.setItem(key, val); } catch (e) {}
        },
        remove: function (key) {
            try { localStorage.removeItem(key); } catch (e) {}
        }
    };

    /* ── Lazy script loader ──────────────────────────────────
       Returns a Promise that resolves once the script is loaded.
       Safe to call multiple times — skips if already in DOM.
    ────────────────────────────────────────────────────────── */
    var _loadingScripts = {};
    function loadScript(src) {
        // Return in-flight promise if already loading — prevents double-inject on rapid calls
        if (_loadingScripts[src]) return _loadingScripts[src];
        if (document.querySelector('script[src="' + src + '"]')) {
            return (_loadingScripts[src] = Promise.resolve());
        }
        var p = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload  = function () {
                delete _loadingScripts[src]; // clean cache after success
                resolve();
            };
            s.onerror = function () {
                delete _loadingScripts[src]; // clean cache after failure
                reject(new Error('Failed to load ' + src));
            };
            document.head.appendChild(s);
        });
        _loadingScripts[src] = p;
        return p;
    }
    /* ── HTML escape — prevents XSS when injecting external data into innerHTML ── */
    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Safe AdSense push — no-op if ad-blocked or already pushed ──────────
       Called the exact moment a result container becomes visible to the user.
       Wrapped in try/catch so ad-blocker failures never break the tool.
    ───────────────────────────────────────────────────────────────────────── */
    function _adPush(containerEl) {
        if (!containerEl) return;
        if (containerEl.dataset.adPushed) return; // guard: push once per slot only
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            containerEl.dataset.adPushed = 'true';
        } catch (e) {
            // Ad blocked or AdSense not loaded — tool continues normally
        }
    }

    // ── DevTools deterrent ────────────────────────────────
/*(function () {
    // Block right click
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });

    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
    document.addEventListener('keydown', function (e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
            (e.ctrlKey && e.key.toUpperCase() === 'U')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Detect DevTools open via window size difference
    var threshold = 160;
    setInterval(function () {
        var widthDiff  = window.outerWidth  - window.innerWidth;
        var heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > threshold || heightDiff > threshold) {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;font-size:1.2rem;background:#090d14;color:#f04455;">Developer tools are not allowed on this page.</div>';
        }
    }, 1000);
}());*/

    /* ══════════════════════════════════════════════════════
       SHARED — runs on every page
    ══════════════════════════════════════════════════════ */

    /* ── Active nav item ─────────────────────────────────
       Reads the current filename from the URL and marks
       the matching <a href> in the side menu as active.
    ────────────────────────────────────────────────────── */
    function markActiveNav() {
        const path = window.location.pathname;
        const file = path.split('/').pop() || 'index.html';
        // Treat empty string and '/' as index.html
        const current = (file === '' || file === '/') ? 'index.html' : file;

        document.querySelectorAll('.side-menu a').forEach(function (a) {
            const href = a.getAttribute('href');
            a.classList.toggle('active', href === current);
        });
    }

    /* ── Hamburger / side menu ───────────────────────────── */
    function closeMenu() {
        const menu     = document.getElementById('side-menu');
        const burger   = document.getElementById('hamburger');
        const backdrop = document.getElementById('menu-backdrop');
        if (menu)     menu.classList.remove('open');
        if (burger)   burger.classList.remove('open');
        if (backdrop) backdrop.classList.remove('visible');
    }

    /* ── Theme toggle ────────────────────────────────────── */
    // Cycle order: light → dark → batman → light
    var _THEMES = ['light', 'dark', 'batman'];

    var _THEME_ICONS = {
        dark: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',
        light: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
        batman: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 3L10 7.5H14L17 3V11C17 11 16 13 12 13C8 13 7 11 7 11V3Z"/><path d="M2 11C2 9 4 8 7 8L10 11.5H14L17 8C20 8 22 9 22 11V16C22 19 19 21 12 21C5 21 2 19 2 16V11Z"/></svg>'
    };

    function updateThemeIcon(theme) {
        var icon  = _THEME_ICONS[theme] || _THEME_ICONS.dark;
        var label = theme === 'light'  ? 'Switch to dark mode'
                  : theme === 'batman' ? 'Switch to light mode'
                  : 'Switch to batman mode';
        // Update floating toggle
        var btn = document.getElementById('theme-toggle');
        if (btn) { btn.innerHTML = icon; btn.setAttribute('aria-label', label); }
        // Update header toggle (desktop header — all pages ≥900px)
        var hBtn = document.getElementById('header-theme-toggle');
        if (hBtn) { hBtn.innerHTML = icon; hBtn.setAttribute('aria-label', label); }
        // Update side-menu theme item (mobile on FAB pages)
        var smIcon = document.getElementById('side-menu-theme-icon');
        if (smIcon) { smIcon.innerHTML = icon; }
        var smBtn = document.getElementById('side-menu-theme');
        if (smBtn) { smBtn.setAttribute('aria-label', label); }
    }

    function toggleTheme(buttonEl) {
        var current = document.documentElement.dataset.theme || 'dark';
        var idx = _THEMES.indexOf(current);
        var targetTheme = _THEMES[(idx + 1) % _THEMES.length];

        var rect = buttonEl.getBoundingClientRect();
        var x = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
        var y = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';
        document.documentElement.style.setProperty('--vt-x', x);
        document.documentElement.style.setProperty('--vt-y', y);

        function applyTheme() {
            document.documentElement.dataset.theme = targetTheme;
            _store.set('bw-theme', targetTheme);
            updateThemeIcon(targetTheme);
        }

        if (!document.startViewTransition) {
            applyTheme();
            return;
        }
        document.startViewTransition(applyTheme);
    }

    /* ══════════════════════════════════════════════════════
       ATTENDANCE PAGE
       All code below only activates when attendance.html
       is loaded (detected by presence of #btn-paste).
    ══════════════════════════════════════════════════════ */

    /* ── State ───────────────────────────────────────────── */
    var ATT_STATE = {
        subjects:   [],
        desiredPct: 75,
        rawText:    '',
    };

    /* ── Internal section switch (paste ↔ results) ───────── */
    function showSection(id) {
        var paste   = document.getElementById('page-paste');
        var results = document.getElementById('page-results');
        var fab     = document.getElementById('fab-pen');
        var toggle  = document.getElementById('theme-toggle');
        if (!paste || !results) return;

        if (id === 'results') {
            paste.classList.add('hidden');
            paste.classList.remove('in');
            results.classList.remove('hidden');
            void results.offsetWidth;
            results.classList.add('in');
            if (fab)    fab.classList.add('visible');
            if (toggle) toggle.classList.remove('visible');
            if (toggle) toggle.style.display = 'none'; // ensure hidden on results
            // JIT ad push — fires only now that the results div is visible
            _adPush(results.querySelector('.ad-container'));
        } else {
            results.classList.add('hidden');
            results.classList.remove('in');
            paste.classList.remove('hidden');
            void paste.offsetWidth;
            paste.classList.add('in');
            if (fab)    fab.classList.remove('visible');
            // floating toggle stays hidden on FAB pages — use side menu or header
        }
        window.scrollTo({ top: 0 });
    }

    /* ── Parser ──────────────────────────────────────────── */
    function validateInput(text) {
        if (!text || !text.trim()) return false;
        if (!text.includes('Attendance Report')) return false;
        if (text.includes('Faculty Name')) return false;
        return true;
    }

    function parseAttendance(rawText) {
        return rawText.split('\n').slice(3)
            .filter(function (l) { return l.trim(); })
            .map(function (line) {
                var c = line.split('\t');
                if (!c[2] || !c[2].trim()) return null;
                return {
                    name:    c[2].trim(),
                    type:    (c[3] || '').trim(),
                    present: Math.max(0, parseInt(c[4]) || 0),
                    od:      Math.max(0, parseInt(c[5]) || 0),
                    makeup:  Math.max(0, parseInt(c[6]) || 0),
                    absent:  Math.max(0, parseInt(c[7]) || 0),
                };
            })
            .filter(Boolean);
    }

    /* ── Calculator ──────────────────────────────────────── */
    function calcPct(p, o, m, a) {
        var total = p + o + a;
        if (total === 0) return 100;
        return ((p + o + m) / total) * 100;
    }

    function calcToTake(p, o, m, a, d) {
        var D = d / 100;
        if (D >= 1) return 9999;
        var T = p + o + a, A = p + o + m;
        var raw = (D * T - A) / (1 - D);
        return raw <= 0 ? 0 : Math.ceil(parseFloat(raw.toFixed(2)));
    }

    function calcToLeave(p, o, m, a, d) {
        var D = d / 100;
        if (D <= 0) return 9999;
        var T = p + o + a, A = p + o + m;
        return Math.floor(parseFloat((Math.abs((D * T - A) / D)).toFixed(2)));
    }

    function calcSubject(s, d) {
        var pct = calcPct(s.present, s.od, s.makeup, s.absent);
        return pct < d
            ? { pct: pct, toTake: calcToTake(s.present, s.od, s.makeup, s.absent, d), toLeave: 0 }
            : { pct: pct, toTake: 0, toLeave: calcToLeave(s.present, s.od, s.makeup, s.absent, d) };
    }

    function calcAggregate(subjects, d) {
        var sP = subjects.reduce(function (s, x) { return s + x.present; }, 0);
        var sO = subjects.reduce(function (s, x) { return s + x.od; }, 0);
        var sM = subjects.reduce(function (s, x) { return s + x.makeup; }, 0);
        var sA = subjects.reduce(function (s, x) { return s + x.absent; }, 0);
        var pct = calcPct(sP, sO, sM, sA);
        return {
            pct:     pct,
            toTake:  pct < d  ? calcToTake(sP, sO, sM, sA, d)  : 0,
            toLeave: pct >= d ? calcToLeave(sP, sO, sM, sA, d) : 0,
        };
    }

    /* ── SVG Gauge ───────────────────────────────────────── */
    var NS = 'http://www.w3.org/2000/svg';

    function se(tag, attrs) {
        var e = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    function pPt(cx, cy, r, pct) {
        var a = Math.PI - (pct / 100) * Math.PI;
        return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
    }

    function arcD(cx, cy, r, pct) {
        if (pct <= 0) return '';
        if (pct >= 100) {
            var m = pPt(cx, cy, r, 50);
            return 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + m.x.toFixed(3) + ' ' + m.y.toFixed(3) + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
        }
        var c = Math.min(pct, 99.99), pt = pPt(cx, cy, r, c);
        return 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + pt.x.toFixed(3) + ' ' + pt.y.toFixed(3);
    }

    function fullD(cx, cy, r) {
        return 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;
    }

    function drawGauge(svg, pct, green, mini) {
        var cp  = Math.max(0, Math.min(100, pct));
        var col = green ? '#1ed97a' : '#f04455';

        // ── Theme-aware colors — gauge is readable in both dark and light mode ──
        var isDark     = document.documentElement.dataset.theme !== 'light';
        var trackCol   = isDark ? '#1c2540' : '#dde1e7';
        var tickCol    = isDark ? '#2e3a5a' : '#c4b9a8';
        var needleCol  = isDark ? '#eef0f7' : '#1a1208';
        var hubOuter   = isDark ? '#eef0f7' : '#1a1208';
        var hubInner   = isDark ? '#0f1520' : '#f8f9fa';

        var W   = mini ? 160 : 270,
            H   = mini ? 100 : 165,
            cx  = W / 2,
            cy  = mini ? 94 : 148,
            R   = mini ? 72 : 120,
            sw  = mini ? 11 : 17,
            uid = 'g' + Math.random().toString(36).slice(2, 8);

        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.innerHTML = '';

        var defs = se('defs');
        defs.innerHTML =
            '<filter id="gl-' + uid + '" x="-50%" y="-50%" width="200%" height="200%">' +
            '<feGaussianBlur stdDeviation="' + (mini ? 3 : 6) + '" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<filter id="sg-' + uid + '" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="' + (mini ? 8 : 14) + '"/></filter>';
        svg.appendChild(defs);

        svg.appendChild(se('path', { d: fullD(cx, cy, R), fill: 'none', stroke: trackCol, 'stroke-width': sw, 'stroke-linecap': 'round' }));

        if (!mini) {
            for (var i = 0; i <= 10; i++) {
                var tp = i * 10, maj = i % 5 === 0;
                var a = pPt(cx, cy, R - sw / 2 - (maj ? 5 : 2), tp);
                var b = pPt(cx, cy, R + sw / 2 + (maj ? 4 : 1), tp);
                svg.appendChild(se('line', {
                    x1: a.x.toFixed(2), y1: a.y.toFixed(2),
                    x2: b.x.toFixed(2), y2: b.y.toFixed(2),
                    stroke: tickCol, 'stroke-width': maj ? 2 : 1, 'stroke-linecap': 'round',
                }));
            }
        }

        if (cp > 0) {
            var aD = arcD(cx, cy, R, cp);
            svg.appendChild(se('path', { d: aD, fill: 'none', stroke: col, 'stroke-width': sw + 10, 'stroke-linecap': 'round', opacity: '.18', filter: 'url(#sg-' + uid + ')' }));
            svg.appendChild(se('path', { d: aD, fill: 'none', stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round', filter: 'url(#gl-' + uid + ')' }));
        }

        var npt = pPt(cx, cy, R - sw / 2 - (mini ? 10 : 14), cp);
        svg.appendChild(se('line', { x1: cx, y1: cy, x2: npt.x.toFixed(3), y2: npt.y.toFixed(3), stroke: 'rgba(0,0,0,.5)', 'stroke-width': mini ? 3.5 : 5, 'stroke-linecap': 'round' }));
        svg.appendChild(se('line', { x1: cx, y1: cy, x2: npt.x.toFixed(3), y2: npt.y.toFixed(3), stroke: needleCol, 'stroke-width': mini ? 2 : 3, 'stroke-linecap': 'round' }));
        svg.appendChild(se('circle', { cx: cx, cy: cy, r: mini ? 4 : 6, fill: hubOuter }));
        svg.appendChild(se('circle', { cx: cx, cy: cy, r: mini ? 2 : 3, fill: hubInner }));

        if (mini) {
            var t = document.createElementNS(NS, 'text');
            t.setAttribute('x', cx); t.setAttribute('y', cy + 15);
            t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', col);
            t.setAttribute('font-size', '12.5'); t.setAttribute('font-family', 'DM Mono,monospace');
            t.setAttribute('font-weight', '500');
            t.textContent = cp.toFixed(1) + '%';
            svg.appendChild(t);
        }
    }

    /* ── UI Rendering ────────────────────────────────────── */
    function renderMain(agg, d) {
        var g = agg.pct >= d, c = g ? 'green' : 'red';
        drawGauge(document.getElementById('main-gauge-svg'), agg.pct, g, false);

        var pEl = document.getElementById('gauge-pct');
        pEl.textContent = agg.pct.toFixed(2) + '%';
        pEl.className = 'gauge-pct-text ' + c;

        var lEl = document.getElementById('action-label');
        var vEl = document.getElementById('action-value');
        lEl.className = 'g-label ' + c;
        vEl.className = 'g-value ' + c;
        lEl.textContent = g ? 'Can Bunk' : 'To Take';
        vEl.textContent = g ? agg.toLeave : agg.toTake;
        document.getElementById('desired-val').textContent = d + '%';

        var gs = document.getElementById('gauge-section');
        gs.classList.remove('s-green', 's-red');
        gs.classList.add(g ? 's-green' : 's-red');
    }

    function makeCard(subject, result, idx) {
        var g = result.pct >= ATT_STATE.desiredPct, c = g ? 'green' : 'red';
        var card = document.createElement('div');
        card.className = 'subject-card ' + c;
        card.style.animationDelay = (idx * 45) + 'ms';

        var gCol = document.createElement('div');
        gCol.className = 'mini-gauge-col';
        var mSvg = document.createElementNS(NS, 'svg');
        mSvg.style.overflow = 'visible';
        gCol.appendChild(mSvg);
        card.appendChild(gCol);

        var info = document.createElement('div');
        info.className = 'subject-info';
        info.innerHTML = '<div class="subject-name" title="' + esc(subject.name) + '">' + esc(subject.name) + '</div>';

        var stats = document.createElement('div');
        stats.className = 'subject-stats';
        var statsHtml = '';
        [['Present', subject.present], ['Absent', subject.absent], ['OD', subject.od], ['Makeup', subject.makeup]]
            .forEach(function (pair) {
                statsHtml += '<div class="stat-item"><span class="stat-lbl">' + pair[0] + '</span><span class="stat-val">' + pair[1] + '</span></div>';
            });
        stats.innerHTML = statsHtml;
        info.appendChild(stats);

        var act = document.createElement('span');
        act.className = 'subject-action ' + c;
        act.textContent = g ? ('Can Bunk: ' + result.toLeave + 'h') : ('To Take: ' + result.toTake + 'h');
        info.appendChild(act);
        card.appendChild(info);

        requestAnimationFrame(function () {
            drawGauge(mSvg, result.pct, g, true);
            card.classList.add('in');
        });
        return card;
    }

    function renderResults() {
        var agg = calcAggregate(ATT_STATE.subjects, ATT_STATE.desiredPct);
        renderMain(agg, ATT_STATE.desiredPct);
        var list = document.getElementById('subjects-list');
        list.innerHTML = '';
        ATT_STATE.subjects.forEach(function (s, i) {
            list.appendChild(makeCard(s, calcSubject(s, ATT_STATE.desiredPct), i));
        });
    }

    /* ── Bump animation ──────────────────────────────────── */
    function bump() {
        var e = document.getElementById('popup-pct');
        if (!e) return;
        e.classList.remove('bump');
        void e.offsetWidth;
        e.classList.add('bump');
    }

    /* ── Parse rows from SheetJS 2-D array ───────────────── */
    function parseRowsFromSheet(rows) {
        return rows
            .filter(function (r) { return r[2] && typeof r[2] === 'string' && r[2].trim() && !isNaN(parseInt(r[4])); })
            .map(function (r) {
                return {
                    name:    String(r[2]).trim(),
                    type:    String(r[3] || '').trim(),
                    present: Math.max(0, parseInt(r[4]) || 0),
                    od:      Math.max(0, parseInt(r[5]) || 0),
                    makeup:  Math.max(0, parseInt(r[6]) || 0),
                    absent:  Math.max(0, parseInt(r[7]) || 0),
                };
            });
    }

    /* ── Paste from clipboard ────────────────────────────── */
    function handlePaste() {
        var zone        = document.getElementById('paste-zone');
        var hint        = document.getElementById('paste-hint');
        var errorBanner = document.getElementById('error-banner');

        zone.classList.remove('success', 'error-state');
        errorBanner.classList.remove('visible');

        if (!navigator.clipboard || !navigator.clipboard.readText) {
            hint.textContent = '⚠ Clipboard access not available. Please use HTTPS or allow clipboard permission.';
            zone.classList.add('error-state');
            return;
        }

        navigator.clipboard.readText()
            .then(function (text) {
                ATT_STATE.rawText = text;

                if (!validateInput(text)) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ Invalid Attendance Report — check your copied content and try again.';
                    errorBanner.classList.add('visible');
                    return;
                }

                var parsed = parseAttendance(text);
                if (!parsed.length) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ No subject rows found. Make sure you copied the full attendance table.';
                    errorBanner.classList.add('visible');
                    return;
                }

                zone.classList.add('success');
                hint.textContent = '✓ Attendance loaded — ' + parsed.length + ' subject' + (parsed.length > 1 ? 's' : '') + ' found. Calculating…';

                ATT_STATE.subjects   = parsed;
                ATT_STATE.desiredPct = 75;

                setTimeout(function () {
                    showSection('results');
                    renderResults();
                    zone.classList.remove('success');
                    hint.textContent = 'Your attendance data is ready to be pasted from clipboard';
                }, 700);
            })
            .catch(function () {
                zone.classList.add('error-state');
                hint.textContent = '⚠ Clipboard access was denied. Please allow clipboard permission and try again.';
            });
    }

    /* ── File upload (CSV / XLSX) ────────────────────────── */
    function handleFileUpload(file) {
        var zone = document.getElementById('upload-zone');
        var hint = document.getElementById('upload-hint');

        zone.classList.remove('success', 'error-state');

        if (!file) return;

        // ── File size guard: 10 MB — prevents main-thread freeze from XLSX.read() ──
        if (file.size > 10 * 1024 * 1024) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File too large. Please upload your exported attendance file only (max 10 MB).';
            return;
        }

        var ext = file.name.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Unsupported file type. Please upload a .csv or .xlsx file.';
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            // ── Lazy-load XLSX only when a file is actually being parsed ──
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
                .then(function () {
                    try {
                        var data     = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var sheet    = workbook.Sheets[workbook.SheetNames[0]];
                        var rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                        var parsed   = parseRowsFromSheet(rows);

                        if (!parsed.length) {
                            zone.classList.add('error-state');
                            hint.textContent = '⚠ No subject rows found. Check that your file has the correct column layout.';
                            return;
                        }

                        zone.classList.add('success');
                        hint.textContent = '✓ File loaded — ' + parsed.length + ' subject' + (parsed.length > 1 ? 's' : '') + ' found. Calculating…';

                        ATT_STATE.subjects   = parsed;
                        ATT_STATE.desiredPct = 75;

                        setTimeout(function () {
                            showSection('results');
                            renderResults();
                            zone.classList.remove('success');
                            hint.textContent = 'Upload your attendance CSV or Excel file to compute attendance';
                        }, 700);

                    } catch (err) {
                        zone.classList.add('error-state');
                        hint.textContent = '⚠ Could not read file. Make sure it is a valid CSV or Excel file.';
                    }
                })
                .catch(function () {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ Could not load Excel reader. Please check your connection and try again.';
                });
        };

        reader.onerror = function () {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File read failed. Please try again.';
        };

        reader.readAsArrayBuffer(file);
    }

    /* ── Canonical site root — single place to change if domain ever moves ── */
    var SITE_URL = window.location.origin || 'https://bunkwise.in';

    /* ── Wire attendance page ────────────────────────────── */
    /* ── Share handler ───────────────────────────────────── */
    function handleShare(buttonEl) {
        var shareData = {
            title: 'BunkWise — Attendance & SGPA Calculator',
            text:  'Check your attendance, predict bunks, and calculate SGPA instantly. No login needed.',
            url:   SITE_URL
        };

        if (navigator.share) {
            navigator.share(shareData).catch(function () {});
        } else {
            // Fallback — copy link to clipboard
            navigator.clipboard.writeText(shareData.url).then(function () {
                var orig = buttonEl.textContent;
                buttonEl.textContent = '✓ Link copied!';
                setTimeout(function () { buttonEl.textContent = orig; }, 2000);
            }).catch(function () {});
        }
    }

    function initAttendancePage() {
        var btnPaste = document.getElementById('btn-paste');
        if (!btnPaste) return;   // not on attendance.html — exit

        btnPaste.addEventListener('click', handlePaste);

        document.getElementById('btn-upload').addEventListener('click', function () {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
        });

        document.getElementById('fab-pen').addEventListener('click', function () {
            document.getElementById('popup-pct').textContent = ATT_STATE.desiredPct + '%';
            document.getElementById('popup-overlay').classList.add('open');
        });

        document.getElementById('popup-overlay').addEventListener('click', function (e) {
            if (e.target === document.getElementById('popup-overlay'))
                document.getElementById('popup-overlay').classList.remove('open');
        });
        document.getElementById('popup-close').addEventListener('click', function () {
            document.getElementById('popup-overlay').classList.remove('open');
        });

        // ── Hold-to-repeat: tap = single step; hold = accelerating repeat ──
        var _attRenderTimer;
        function _scheduleRender() {
            clearTimeout(_attRenderTimer);
            _attRenderTimer = setTimeout(renderResults, 60);
        }

        function _makeHoldBtn(btnId, stepFn) {
            var btn = document.getElementById(btnId);
            var holdTimer, repeatInterval;
            function doStep() { stepFn(); }
            function startHold(e) {
                e.preventDefault();
                doStep();
                holdTimer = setTimeout(function () {
                    repeatInterval = setInterval(doStep, 80);
                }, 400);
            }
            function stopHold() {
                clearTimeout(holdTimer);
                clearInterval(repeatInterval);
            }
            btn.addEventListener('mousedown',  startHold);
            btn.addEventListener('touchstart', startHold, { passive: false });
            btn.addEventListener('mouseup',    stopHold);
            btn.addEventListener('mouseleave', stopHold);
            btn.addEventListener('touchend',   stopHold);
            btn.addEventListener('touchcancel',stopHold);
        }

        _makeHoldBtn('btn-decrease', function () {
            if (ATT_STATE.desiredPct > 1) {
                ATT_STATE.desiredPct--;
                document.getElementById('popup-pct').textContent = ATT_STATE.desiredPct + '%';
                bump();
                _scheduleRender();
            }
        });
        _makeHoldBtn('btn-increase', function () {
            if (ATT_STATE.desiredPct < 99) {
                ATT_STATE.desiredPct++;
                document.getElementById('popup-pct').textContent = ATT_STATE.desiredPct + '%';
                bump();
                _scheduleRender();
            }
        });

        // ── Share button ──
        var btnShareAtt = document.getElementById('btn-share-att');
        if (btnShareAtt) {
            btnShareAtt.addEventListener('click', function () { handleShare(btnShareAtt); });
        }
    }

    /* ══════════════════════════════════════════════════════
       SGPA PAGE
       All code below only activates when sgpa.html
       is loaded (detected by presence of #btn-sgpa-upload).
    ══════════════════════════════════════════════════════ */


    /* ══════════════════════════════════════════════════════
       CW (CLASS WISE) PAGE
    ══════════════════════════════════════════════════════ */
    var CW_STATE = {
        subjects:     [],   // same structure as ATT_STATE.subjects
        classesInput: 0,    // integer — positive = attend more, negative = skip
    };

    /* ── Internal section switch (paste ↔ results) ───────── */
    function showCWSection(id) {
        var paste   = document.getElementById('page-cw-paste');
        var results = document.getElementById('page-cw-results');
        var fab     = document.getElementById('cw-fab-pen');
        var toggle  = document.getElementById('theme-toggle');
        if (!paste || !results) return;

        if (id === 'results') {
            paste.classList.add('hidden');
            paste.classList.remove('in');
            results.classList.remove('hidden');
            void results.offsetWidth;
            results.classList.add('in');
            if (fab)    fab.classList.add('visible');
            if (toggle) toggle.classList.remove('visible');
            if (toggle) toggle.style.display = 'none'; // ensure hidden on results
            // JIT ad push — fires only now that the CW results div is visible
            _adPush(results.querySelector('.ad-container'));
        } else {
            results.classList.add('hidden');
            results.classList.remove('in');
            paste.classList.remove('hidden');
            void paste.offsetWidth;
            paste.classList.add('in');
            if (fab)    fab.classList.remove('visible');
            // floating toggle stays hidden on FAB pages — use side menu or header
        }
        window.scrollTo({ top: 0 });
    }

    /* ── Future attendance formula ───────────────────────── */
    function calcFuturePct(totalP, totalO, totalM, totalA, classesInput) {
        var N = Math.abs(classesInput);
        var num, den;
        if (classesInput >= 0) {
            // Attending N more classes — both numerator and denominator grow by N
            num = totalP + N + totalO + totalM;
            den = totalP + totalO + totalA + N;
        } else {
            // Skipping N classes — only denominator grows by N (absences increase)
            num = totalP + totalO + totalM;
            den = totalP + totalO + totalA + N;
        }
        if (den === 0) return 100;
        return (num / den) * 100;
    }

    /* ── Update popup display value and colour ───────────── */
    function updateCWDisplay() {
        var el = document.getElementById('cw-classes-display');
        if (!el) return;
        var n = CW_STATE.classesInput;
        if (n === 0) {
            el.textContent  = '0';
            el.style.color  = '';           // revert to CSS default (var(--accent))
        } else if (n > 0) {
            el.textContent  = '+' + n;
            el.style.color  = 'var(--green)';
        } else {
            el.textContent  = String(n);    // already has minus sign
            el.style.color  = 'var(--red)';
        }
    }

    /* ── Bump animation on cw-classes-display ────────────── */
    function bumpCW() {
        var e = document.getElementById('cw-classes-display');
        if (!e) return;
        e.classList.remove('bump');
        void e.offsetWidth;
        e.classList.add('bump');
    }

    /* ── Render both gauges and sub-label ────────────────── */
    function renderCWMain() {
        var totalP = CW_STATE.subjects.reduce(function (s, x) { return s + x.present; }, 0);
        var totalO = CW_STATE.subjects.reduce(function (s, x) { return s + x.od;      }, 0);
        var totalM = CW_STATE.subjects.reduce(function (s, x) { return s + x.makeup;  }, 0);
        var totalA = CW_STATE.subjects.reduce(function (s, x) { return s + x.absent;  }, 0);

        var currentPct = calcPct(totalP, totalO, totalM, totalA);
        var futurePct  = calcFuturePct(totalP, totalO, totalM, totalA, CW_STATE.classesInput);

        // ── Current gauge (left panel) ──
        var isCurGreen = currentPct >= 75;
        drawGauge(document.getElementById('cw-current-gauge'), currentPct, isCurGreen, false);
        var curEl = document.getElementById('cw-current-pct');
        curEl.textContent = currentPct.toFixed(2) + '%';
        curEl.className   = 'gauge-pct-text ' + (isCurGreen ? 'green' : 'red');

        // ── Future gauge (right panel) ──
        var isFutGreen = futurePct >= 75;
        drawGauge(document.getElementById('cw-future-gauge'), futurePct, isFutGreen, false);
        var futEl = document.getElementById('cw-future-pct');
        futEl.textContent = futurePct.toFixed(2) + '%';
        futEl.className   = 'cw-future-pct ' + (isFutGreen ? 'green' : 'red');

        // ── Sub-label below future gauge ──
        var subEl = document.getElementById('cw-future-sub');
        var n = CW_STATE.classesInput;
        if (n === 0) {
            subEl.textContent = 'No change';
        } else if (n > 0) {
            subEl.textContent = 'After +' + n + ' classes';
        } else {
            subEl.textContent = 'After \u2212' + Math.abs(n) + ' classes';
        }
    }

    /* ── Render subject cards ────────────────────────────── */
    function renderCWCards() {
        var list = document.getElementById('cw-subjects-list');
        if (!list) return;   // element not present on cw.html by design — no subject cards shown
        list.innerHTML = '';
        // calcSubject uses 75 as fixed threshold — ATT_STATE.desiredPct is also 75
        // on cw.html (initAttendancePage never runs there, so it is never changed)
        CW_STATE.subjects.forEach(function (s, i) {
            list.appendChild(makeCard(s, calcSubject(s, 75), i));
        });
    }

    /* ── Paste from clipboard (CW) ───────────────────────── */
    function handleCWPaste() {
        var zone        = document.getElementById('cw-paste-zone');
        var hint        = document.getElementById('cw-paste-hint');
        var errorBanner = document.getElementById('cw-error-banner');

        zone.classList.remove('success', 'error-state');
        errorBanner.classList.remove('visible');

        if (!navigator.clipboard || !navigator.clipboard.readText) {
            hint.textContent = '⚠ Clipboard access not available. Please use HTTPS or allow clipboard permission.';
            zone.classList.add('error-state');
            return;
        }

        navigator.clipboard.readText()
            .then(function (text) {
                if (!validateInput(text)) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ Invalid Attendance Report — check your copied content and try again.';
                    errorBanner.classList.add('visible');
                    return;
                }

                var parsed = parseAttendance(text);
                if (!parsed.length) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ No subject rows found. Make sure you copied the full attendance table.';
                    errorBanner.classList.add('visible');
                    return;
                }

                zone.classList.add('success');
                hint.textContent = '✓ Attendance loaded — ' + parsed.length + ' subject' + (parsed.length > 1 ? 's' : '') + ' found. Calculating…';

                CW_STATE.subjects     = parsed;
                CW_STATE.classesInput = 0;

                setTimeout(function () {
                    showCWSection('results');
                    renderCWMain();
                    renderCWCards();
                    zone.classList.remove('success');
                    hint.textContent = 'Your attendance data is ready to be pasted from clipboard';
                }, 700);
            })
            .catch(function () {
                zone.classList.add('error-state');
                hint.textContent = '⚠ Clipboard access was denied. Please allow clipboard permission and try again.';
            });
    }

    /* ── File upload CSV / XLSX (CW) ────────────────────── */
    function handleCWFileUpload(file) {
        var zone = document.getElementById('cw-upload-zone');
        var hint = document.getElementById('cw-upload-hint');

        zone.classList.remove('success', 'error-state');

        if (!file) return;

        // ── File size guard: 10 MB — prevents main-thread freeze from XLSX.read() ──
        if (file.size > 10 * 1024 * 1024) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File too large. Please upload your exported attendance file only (max 10 MB).';
            return;
        }

        var ext = file.name.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Unsupported file type. Please upload a .csv or .xlsx file.';
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            // ── Lazy-load XLSX only when a file is actually being parsed ──
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
                .then(function () {
                    try {
                        var data     = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var sheet    = workbook.Sheets[workbook.SheetNames[0]];
                        var rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                        var parsed   = parseRowsFromSheet(rows);

                        if (!parsed.length) {
                            zone.classList.add('error-state');
                            hint.textContent = '⚠ No subject rows found. Check that your file has the correct column layout.';
                            return;
                        }

                        zone.classList.add('success');
                        hint.textContent = '✓ File loaded — ' + parsed.length + ' subject' + (parsed.length > 1 ? 's' : '') + ' found. Calculating…';

                        CW_STATE.subjects     = parsed;
                        CW_STATE.classesInput = 0;

                        setTimeout(function () {
                            showCWSection('results');
                            renderCWMain();
                            renderCWCards();
                            zone.classList.remove('success');
                            hint.textContent = 'Upload your attendance CSV or Excel file to compute attendance';
                        }, 700);

                    } catch (err) {
                        zone.classList.add('error-state');
                        hint.textContent = '⚠ Could not read file. Make sure it is a valid CSV or Excel file.';
                    }
                })
                .catch(function () {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ Could not load Excel reader. Please check your connection and try again.';
                });
        };

        reader.onerror = function () {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File read failed. Please try again.';
        };

        reader.readAsArrayBuffer(file);
    }

    /* ── Wire CW page ────────────────────────────────────── */
    function initCWPage() {
        var btnPaste = document.getElementById('btn-cw-paste');
        if (!btnPaste) return;   // not on cw.html — exit

        btnPaste.addEventListener('click', handleCWPaste);

        document.getElementById('btn-cw-upload').addEventListener('click', function () {
            document.getElementById('cw-file-input').click();
        });
        document.getElementById('cw-file-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) handleCWFileUpload(file);
            e.target.value = '';
        });

        document.getElementById('cw-fab-pen').addEventListener('click', function () {
            updateCWDisplay();
            document.getElementById('cw-popup-overlay').classList.add('open');
        });

        document.getElementById('cw-popup-overlay').addEventListener('click', function (e) {
            if (e.target === document.getElementById('cw-popup-overlay'))
                document.getElementById('cw-popup-overlay').classList.remove('open');
        });
        document.getElementById('cw-popup-close').addEventListener('click', function () {
            document.getElementById('cw-popup-overlay').classList.remove('open');
        });

        // ── Hold-to-repeat: tap = single step; hold = accelerating repeat ──
        var _cwRenderTimer;
        function _scheduleCWRender() {
            clearTimeout(_cwRenderTimer);
            _cwRenderTimer = setTimeout(renderCWMain, 60);
        }

        function _makeCWHoldBtn(btnId, stepFn) {
            var btn = document.getElementById(btnId);
            var holdTimer, repeatInterval;
            function doStep() { stepFn(); }
            function startHold(e) {
                e.preventDefault();
                doStep();
                holdTimer = setTimeout(function () {
                    repeatInterval = setInterval(doStep, 80);
                }, 400);
            }
            function stopHold() {
                clearTimeout(holdTimer);
                clearInterval(repeatInterval);
            }
            btn.addEventListener('mousedown',  startHold);
            btn.addEventListener('touchstart', startHold, { passive: false });
            btn.addEventListener('mouseup',    stopHold);
            btn.addEventListener('mouseleave', stopHold);
            btn.addEventListener('touchend',   stopHold);
            btn.addEventListener('touchcancel',stopHold);
        }

        _makeCWHoldBtn('cw-btn-decrease', function () {
            CW_STATE.classesInput--;
            updateCWDisplay();
            bumpCW();
            _scheduleCWRender();
        });
        _makeCWHoldBtn('cw-btn-increase', function () {
            CW_STATE.classesInput++;
            updateCWDisplay();
            bumpCW();
            _scheduleCWRender();
        });

        // ── Share button ──
        var btnShareCw = document.getElementById('btn-share-cw');
        if (btnShareCw) {
            btnShareCw.addEventListener('click', function () { handleShare(btnShareCw); });
        }
    }


    /* ── Expose shared utilities for bw-sgpa.js ─────────────── */
    window._bwShared = {
        store:       _store,
        loadScript:  loadScript,
        esc:         esc,
        handleShare: handleShare,
        drawGauge:   drawGauge
    };

    document.addEventListener('DOMContentLoaded', function () {

        // ── SHARED: theme icon ──
        updateThemeIcon(document.documentElement.dataset.theme || 'dark');

        // ── SHARED: hamburger ──
        var hamburger = document.getElementById('hamburger');
        var backdrop  = document.getElementById('menu-backdrop');
        if (hamburger) {
            hamburger.addEventListener('click', function () {
                document.getElementById('side-menu').classList.toggle('open');
                hamburger.classList.toggle('open');
                backdrop.classList.toggle('visible');
            });
        }
        if (backdrop) backdrop.addEventListener('click', closeMenu);

        // ── SHARED: active nav item ──
        markActiveNav();

        // ── SHARED: theme toggle — hidden on FAB pages (attendance, cw)
        //    to prevent overlap with the FAB pen button on mobile.
        //    These pages use the header toggle (≥900px) or side-menu toggle (mobile).
        var themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            var _hasFab = document.getElementById('fab-pen') || document.getElementById('cw-fab-pen');
            if (!_hasFab) {
                themeToggle.classList.add('visible');
            }
            themeToggle.addEventListener('click', function () { toggleTheme(themeToggle); });
        }

        // ── Header theme toggle (desktop header — all pages ≥900px) ──
        var headerThemeToggle = document.getElementById('header-theme-toggle');
        if (headerThemeToggle) {
            headerThemeToggle.addEventListener('click', function () { toggleTheme(headerThemeToggle); });
        }

        // ── Side-menu theme toggle (mobile on FAB pages) ──
        var sideMenuTheme = document.getElementById('side-menu-theme');
        if (sideMenuTheme) {
            sideMenuTheme.addEventListener('click', function () { toggleTheme(sideMenuTheme); });
        }

        // ── INDEX: Get Started button ──
        var btnGetStarted = document.getElementById('btn-get-started');
        if (btnGetStarted) {
            btnGetStarted.addEventListener('click', function () {
                window.location.href = 'attendance.html';
            });
        }

        // ── ATTENDANCE page ──
        initAttendancePage();

        // ── CW page ──
        initCWPage();

        // ── SGPA / Result pages: only present when bw-sgpa.js is loaded ──
        if (window._bwSGPA && typeof window._bwSGPA.init === 'function') {
            window._bwSGPA.init();
        }
    });

}());