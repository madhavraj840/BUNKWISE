(function () {
    'use strict';

    /* ── Lazy script loader ──────────────────────────────────
       Returns a Promise that resolves once the script is loaded.
       Safe to call multiple times — skips if already in DOM.
    ────────────────────────────────────────────────────────── */
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) {
                resolve(); return;
            }
            var s = document.createElement('script');
            s.src = src;
            s.onload  = resolve;
            s.onerror = function () { reject(new Error('Failed to load ' + src)); };
            document.head.appendChild(s);
        });
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
    function updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
        btn.setAttribute('aria-label',
            theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }

    function toggleTheme(buttonEl) {
        const isDark      = document.documentElement.dataset.theme !== 'light';
        const targetTheme = isDark ? 'light' : 'dark';

        const rect = buttonEl.getBoundingClientRect();
        const x = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
        const y = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';
        document.documentElement.style.setProperty('--vt-x', x);
        document.documentElement.style.setProperty('--vt-y', y);

        function applyTheme() {
            document.documentElement.dataset.theme = targetTheme;
            localStorage.setItem('bw-theme', targetTheme);
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
        if (!paste || !results) return;

        if (id === 'results') {
            paste.classList.add('hidden');
            paste.classList.remove('in');
            results.classList.remove('hidden');
            void results.offsetWidth;
            results.classList.add('in');
            if (fab) fab.classList.add('visible');
        } else {
            results.classList.add('hidden');
            results.classList.remove('in');
            paste.classList.remove('hidden');
            void paste.offsetWidth;
            paste.classList.add('in');
            if (fab) fab.classList.remove('visible');
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

        svg.appendChild(se('path', { d: fullD(cx, cy, R), fill: 'none', stroke: '#1c2540', 'stroke-width': sw, 'stroke-linecap': 'round' }));

        if (!mini) {
            for (var i = 0; i <= 10; i++) {
                var tp = i * 10, maj = i % 5 === 0;
                var a = pPt(cx, cy, R - sw / 2 - (maj ? 5 : 2), tp);
                var b = pPt(cx, cy, R + sw / 2 + (maj ? 4 : 1), tp);
                svg.appendChild(se('line', {
                    x1: a.x.toFixed(2), y1: a.y.toFixed(2),
                    x2: b.x.toFixed(2), y2: b.y.toFixed(2),
                    stroke: '#2e3a5a', 'stroke-width': maj ? 2 : 1, 'stroke-linecap': 'round',
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
        svg.appendChild(se('line', { x1: cx, y1: cy, x2: npt.x.toFixed(3), y2: npt.y.toFixed(3), stroke: '#eef0f7', 'stroke-width': mini ? 2 : 3, 'stroke-linecap': 'round' }));
        svg.appendChild(se('circle', { cx: cx, cy: cy, r: mini ? 4 : 6, fill: '#eef0f7' }));
        svg.appendChild(se('circle', { cx: cx, cy: cy, r: mini ? 2 : 3, fill: '#0f1520' }));

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
        info.innerHTML = '<div class="subject-name" title="' + subject.name + '">' + subject.name + '</div>';

        var stats = document.createElement('div');
        stats.className = 'subject-stats';
        [['Present', subject.present], ['Absent', subject.absent], ['OD', subject.od], ['Makeup', subject.makeup]]
            .forEach(function (pair) {
                stats.innerHTML += '<div class="stat-item"><span class="stat-lbl">' + pair[0] + '</span><span class="stat-val">' + pair[1] + '</span></div>';
            });
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

        var ext = file.name.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Unsupported file type. Please upload a .csv or .xlsx file.';
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
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
        };

        reader.onerror = function () {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File read failed. Please try again.';
        };

        reader.readAsArrayBuffer(file);
    }

    /* ── Wire attendance page ────────────────────────────── */
    /* ── Share handler ───────────────────────────────────── */
    function handleShare(buttonEl) {
        var shareData = {
            title: 'BunkWise — Attendance & SGPA Calculator',
            text:  'Check your attendance, predict bunks, and calculate SGPA instantly. No login needed.',
            url:   'https://madhavraj840.github.io/BUNKWISE'
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

        document.getElementById('btn-decrease').addEventListener('click', function () {
            if (ATT_STATE.desiredPct > 1) {
                ATT_STATE.desiredPct--;
                document.getElementById('popup-pct').textContent = ATT_STATE.desiredPct + '%';
                bump();
                renderResults();
            }
        });
        document.getElementById('btn-increase').addEventListener('click', function () {
            if (ATT_STATE.desiredPct < 99) {
                ATT_STATE.desiredPct++;
                document.getElementById('popup-pct').textContent = ATT_STATE.desiredPct + '%';
                bump();
                renderResults();
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

    var SGPA_STATE = { data: null, branch: null };

    var GRADE_POINTS = {
        'A++': 10, 'A+': 9, 'A': 8.5,
        'B+': 8,  'B': 7.5,
        'C+': 7,  'C': 6.5,
        'D+': 6,  'D': 5.5,
        'E+': 5,  'E': 4,
        'F':  0,
    };

    /* ── RTU Credit maps — one per branch ───────────────── */
    var RTU_CREDIT_MAPS = {

        /* ── First Year ─────────────────────────────────────── */
        'firstyear': {
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'engineering mathematics ii': 4,
        
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Civil Engineering ───────────────────────────────── */
        'ce': {
            /* ── SEMESTER I & II — Common to all branches ── */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'social outreach, discipline & extra curricular activities': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,

            /* ── SEMESTER III ── */
            'advance engineering mathematics-i': 3,
            'advance engineering mathematics 1': 3,
            'advance engineering mathematics i': 3,
            'advanced engineering mathematics-i': 3,
            'advanced engineering mathematics 1': 3,
            'advanced engineering mathematics i': 3,
            'technical communication': 2,
            'managerial economics & financial accounting': 2,
            'managerial economics and financial accounting': 2,
            'engineering mechanics': 2,
            'surveying': 3,
            'fluid mechanics': 2,
            'building materials and construction': 3,
            'building materials & construction': 3,
            'engineering geology': 2,
            'surveying lab': 1.5,
            'fluid mechanics lab': 1,
            'computer aided civil engineering drawing': 1.5,
            'civil engineering materials lab': 1,
            'geology lab': 1,
            'industrial training': 1,

            /* ── SEMESTER IV ── */
            'advance engineering mathematics-ii': 2,
            'advance engineering mathematics 2': 2,
            'advance engineering mathematics ii': 2,
            'advanced engineering mathematics-ii': 2,
            'advanced engineering mathematics ii': 2,
            'basic electronics for civil engineering applications': 2,
            'strength of materials': 3,
            'hydraulics engineering': 3,
            'building planning': 2,
            'concrete technology': 3,
            'material testing lab': 1,
            'hydraulics engineering lab': 1,
            'building drawing': 1.5,
            'advanced surveying lab': 1,
            'concrete lab': 1.5,

            /* ── SEMESTER V ── */
            'construction technology and equipment': 2,
            'construction technology & equipment': 2,
            'construction technology and equipments': 2,
            'construction technology & equipments': 2,
            'structural analysis-i': 2,
            'structural analysis 1': 2,
            'structural analysis i': 2,
            'structure analysis-i': 2,
            'structure analysis i': 2,
            'design of concrete structures': 3,
            'geotechnical engineering': 3,
            'water resource engineering': 2,
            'water resources engineering': 2,
            /* Departmental Elective – I */
            'air & noise pollution and control': 2,
            'air and noise pollution and control': 2,
            'disaster management': 2,
            'town planning': 2,
            /* Departmental Elective – II */
            'repair and rehabilitation of structures': 2,
            'ground improvement techniques': 2,
            'energy science and engineering': 2,
            'energy science & engineering': 2,
            /* Labs – V */
            'concrete structures design': 1.5,
            'concrete structures design lab': 1.5,
            'geotechnical engineering lab': 1.5,
            'geotechnical engineerding lab': 1.5,
            'water resources engineering design': 1,
            'water resources engineering design lab': 1,
            'water resource engineering design': 1,
            'water resource engineering design lab': 1,

            /* ── SEMESTER VI ── */
            'wind and seismic analysis': 2,
            'wind & seismic analysis': 2,
            'structural analysis-ii': 3,
            'structural analysis 2': 3,
            'structural analysis ii': 3,
            'structure analysis-ii': 3,
            'structure analysis ii': 3,
            'environmental engineering': 3,
            'design of steel structures': 3,
            'estimating & costing': 2,
            'estimating and costing': 2,
            /* Departmental Elective – III */
            'pre-stressed concrete': 2,
            'prestressed concrete': 2,
            'pre stressed concrete': 2,
            'solid and hazardous waste management': 2,
            'solid & hazardous waste management': 2,
            'traffic engineering and management': 2,
            'traffic engineering & management': 2,
            /* Departmental Elective – IV */
            'bridge engineering': 2,
            'rock engineering': 2,
            'geographic information system & remote sensing': 2,
            'geographic information system and remote sensing': 2,
            'gis & remote sensing': 2,
            'gis and remote sensing': 2,
            /* Labs – VI */
            'environmental engineering design and lab': 1.5,
            'environmental engineering design & lab': 1.5,
            'steel structures design': 1.5,
            'steel structure design': 1.5,
            'quantity surveying and valuation': 1,
            'quantity surveying & valuation': 1,
            'water and earth retaining structures design': 1,
            'water & earth retaining structures design': 1,
            'foundation engineering': 1,
            'foundation design': 1,

            /* ── SEMESTER VII ── */
            'transportation engineering': 3,
            'road material testing lab': 1,
            'professional practices and field engineering lab': 1,
            'professional practices & field engineering lab': 1,
            'soft skills lab': 1,
            'environmental monitoring and design lab': 1,
            'practical training': 2.5,
            'seminar': 2,

            /* ── SEMESTER VIII ── */
            'project planning and construction management': 3,
            'project planning & construction management': 3,
            'project planning and construction management lab': 1,
            'project planning & construction management lab': 1,
            'pavement design': 1,
            'project': 7,

            /* ── OPEN ELECTIVE – I (Semester VII) ── */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'quality management/iso 9000': 3,
            'quality management iso 9000': 3,
            'quality management': 3,
            'cyber security': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'principles of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'rock engineering': 2,           /* dept elective credit takes precedence */
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ── OPEN ELECTIVE – II (Semester VIII) ── */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'big data analytics': 3,
            'big data analytic': 3,
            'ipr, copyright and cyber law of india': 3,
            'ipr copyright and cyber law of india': 3,
            'energy audit and demand side management': 3,
            'energy audit and demand-side management': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'robotics & control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'material and human resource management': 3,
            'material & human resource management': 3,
                        'sports-i': 0.5,
                        'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'disaster management': 2,        /* dept elective credit takes precedence */
    
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'data communication and computer network': 3,
            'data communication & computer network': 3,
            'internet of thing': 3,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'advance engineering mathematics-1': 3,
            'advanced engineering mathematics-1': 3,
            'advance engineering mathematics-2': 2,
            'advanced engineering mathematics 2': 2,
            'advanced engineering mathematics-2': 2,
            'structural analysis-1': 2,
            'structure analysis 1': 2,
            'structure analysis-1': 2,
            'structural analysis-2': 3,
            'structure analysis 2': 3,
            'structure analysis-2': 3,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Computer Science & Engineering ─────────────────── */
        'cse': {
            /* ── SEMESTER I & II (Common) ── */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,

            /* ── SEMESTER III ── */
            'advanced engineering mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'digital electronics': 3,
            'data structures and algorithms': 3,
            'data structures & algorithms': 3,
            'object oriented programming': 3,
            'object-oriented programming': 3,
            'software engineering': 3,
            'data structures and algorithms lab': 1.5,
            'data structures & algorithms lab': 1.5,
            'object oriented programming lab': 1.5,
            'object-oriented programming lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 2.5,

            /* ── SEMESTER IV ── */
            'discrete mathematics structure': 3,
            'discrete mathematics': 3,
            'microprocessor & interfaces': 3,
            'microprocessor & interface': 3,
            'microprocessor and interfaces': 3,
            'microprocessor and interface': 3,
            'database management system': 3,
            'theory of computation': 3,
            'data communication and computer networks': 3,
            'data communication and computer network': 3,
            'data communication & computer networks': 3,
            'data communication & computer network': 3,
            'microprocessor & interfaces lab': 1,
            'microprocessor and interfaces lab': 1,
            'database management system lab': 1.5,
            'network programming lab': 1.5,
            'linux shell programming lab': 1,
            'java lab': 1,

            /* ── SEMESTER V ── */
            'information theory & coding': 2,
            'information theory and coding': 2,
            'compiler design': 3,
            'operating system': 3,
            'computer graphics & multimedia': 3,
            'computer graphics and multimedia': 3,
            'analysis of algorithms': 3,
            /* Professional Elective I (credit 2 each) */
            'wireless communication': 2,
            'human-computer interaction': 2,
            'human computer interaction': 2,
            'bioinformatics': 2,
            'computer graphics & multimedia lab': 1,
            'computer graphics and multimedia lab': 1,
            'compiler design lab': 1,
            'analysis of algorithms lab': 1,
            'advance java lab': 1,
            'seminar': 2,

            /* ── SEMESTER VI ── */
            'digital image processing': 2,
            'machine learning': 3,
            'information security system': 2,
            'computer architecture and organization': 3,
            'computer architecture & organization': 3,
            'artificial intelligence': 2,
            'cloud computing': 3,
            /* Professional Elective I VI (credit 2 each) */
            'distributed system': 2,
            'software defined network': 2,
            'ecommerce and erp': 2,
            'ecommerce & erp': 2,
            'digital image processing lab': 1.5,
            'machine learning lab': 1.5,
            'python lab': 1.5,
            'mobile application development lab': 1.5,

            /* ── SEMESTER VII ── */
            'internet of things': 3,
            'internet of thing': 3,
            'internet of things lab': 2,
            'internet of thing lab': 2,
            'cyber security lab': 2,

            /* ── SEMESTER VIII ── */
            'big data analytics': 3,
            'big data analytic': 3,
            'big data analytics lab': 1,
            'software testing and validation lab': 1,
            'software testing & validation lab': 1,
            'project': 7,

            /* ── OPEN ELECTIVE – I ── */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ── OPEN ELECTIVE – II ── */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'energy audit and demand side management': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
            
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor interfaces lab': 1,
        },

        /* ── CSE (Artificial Intelligence) ──────────────────── */
       'cse-ai': {
            /* II Year - III Semester */
            'advanced engineering mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'digital electronics': 3,
            'data structures and algorithms': 3,
            'data structures & algorithms': 3,
            'object oriented programming': 3,
            'software engineering': 3,
            'data structures and algorithms lab': 1.5,
            'data structures & algorithms lab': 1.5,
            'object oriented programming lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,

            /* II Year - IV Semester */
            'discrete mathematics structure': 3,
            'microprocessor & interfaces': 3,
            'microprocessor & interface': 3,
            'microprocessor and interfaces': 3,
            'microprocessor and interface': 3,
            'database management system': 3,
            'theory of computation': 3,
            'data communication and computer networks': 3,
            'data communication and computer network': 3,
            'data communication & computer networks': 3,
            'data communication & computer network': 3,
            'microprocessor & interfaces lab': 1,
            'microprocessor and interfaces lab': 1,
            'database management system lab': 1.5,
            'network programming lab': 1.5,
            'linux shell programming lab': 1,
            'java lab': 1,

            /* III Year - V Semester */
            'data mining-concepts and techniques': 2,
            'data mining concepts and techniques': 2,
            'data mining concepts & techniques': 2,
            'compiler design': 3,
            'operating system': 3,
            'computer graphics & multimedia': 3,
            'computer graphics and multimedia': 3,
            'analysis of algorithms': 3,
            'fundamentals of blockchain': 2,
            'mathematical modelling for data science': 2,
            'mathematical modeling for data science': 2,
            'programming for data science': 2,
            'computer graphics & multimedia lab': 1,
            'computer graphics and multimedia lab': 1,
            'compiler design lab': 1,
            'analysis of algorithms lab': 1,
            'advance java lab': 1,
            'advanced java lab': 1,

            /* III Year - VI Semester */
            'digital image processing': 2,
            'machine learning': 3,
            'information security system': 2,
            'computer architecture and organization': 3,
            'computer architecture & organization': 3,
            'principles of artificial intelligence': 2,
            'cloud computing': 3,
            'artificial neural network': 2,
            'natural language processing': 2,
            'natural language processing (nlp)': 2,
            'predictive modeling and analytics': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytics': 3,
            'predictive modelling and analytic': 3,
            'digital image processing lab': 1.5,
            'machine learning lab': 1.5,
            'python lab': 1.5,
            'mobile application development lab': 1.5,

            /* IV Year - VII Semester */
            'deep learning and its applications': 3,
            'deep learning and its application': 3,
            'deep learning and its applications lab': 2,
            'deep learning and its application lab': 2,
            'computer vision lab': 2,
            'industrial training': 2.5,
            'seminar': 2,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,
            'social outreach, discipline & extra curricular activities': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,

            /* IV Year - VIII Semester */
            'big data analytics': 3,
            'big data analytic': 3,
            'big data analytics lab': 1,
            'robot programming lab': 1,
            'robot programing lab': 1,
            'project': 7,

            /* OPEN ELECTIVE - I (all 3 credits) */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'data visualization and communication': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* OPEN ELECTIVE - II (all 3 credits) */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'fundamentals of robotic system': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'energy audit and demand side management': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
             'sports-i': 0.5,
             'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
        
            'communication skill': 2,
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'human value': 2,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'internet of thing': 3,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'internet of thing': 3,
            'internet of thing lab': 2,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor interfaces lab': 1,
        },

        /* ── CSE (Data Science) ──────────────────────────────── */
        'cse-ds': {
            /* ── III SEMESTER ── */
            'advanced engineering mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'digital electronics': 3,
            'data structures and algorithms': 3,
            'data structures & algorithms': 3,
            'object oriented programming': 3,
            'software engineering': 3,
            'data structures and algorithms lab': 1.5,
            'data structures & algorithms lab': 1.5,
            'object oriented programming lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 2.5,
            'social outreach discipline and extra curricular activities': 0.5,
            'social outreach discipline & extra curricular activities': 0.5,

            /* ── IV SEMESTER ── */
            'discrete mathematics structure': 3,
            'microprocessor and interfaces': 3,
            'microprocessor and interface': 3,
            'microprocessor & interfaces': 3,
            'microprocessor & interface': 3,
            'database management system': 3,
            'theory of computation': 3,
            'data communication and computer networks': 3,
            'data communication and computer network': 3,
            'data communication & computer networks': 3,
            'data communication & computer network': 3,
            'microprocessor and interfaces lab': 1,
            'microprocessor & interfaces lab': 1,
            'database management system lab': 1.5,
            'network programming lab': 1.5,
            'linux shell programming lab': 1,
            'java lab': 1,

            /* ── V SEMESTER ── */
            'data mining-concepts and techniques': 2,
            'data mining concepts and techniques': 2,
            'data mining concepts & techniques': 2,
            'compiler design': 3,
            'operating system': 3,
            'data visualization r programming power bi': 3,
            'data visualization- r programming/ power bi': 3,
            'analysis of algorithms': 3,
            'fundamentals of blockchain': 2,
            'fundamentals of block chain': 2,
            'probability and statistics for data science': 2,
            'programming for data science': 2,
            'r programming lab': 1,
            'compiler design lab': 1,
            'analysis of algorithms lab': 1,
            'advance java lab': 1,

            /* ── VI SEMESTER ── */
            'digital image processing': 2,
            'machine learning': 3,
            'information security system': 2,
            'computer architecture and organization': 3,
            'principles of artificial intelligence': 2,
            'cloud computing': 3,
            'artificial neural network': 2,
            'nature inspired computing': 2,
            'big data analytics and hadoop': 2,
            'big data analytics & hadoop': 2,
            'digital image processing lab': 1.5,
            'machine learning lab': 1.5,
            'python lab': 1.5,
            'mobile application development lab': 1.5,

            /* ── VII SEMESTER ── */
            'data visualization and exploration with r': 3,
            'data visualization & exploration with r': 3,
            'data visualization and exploration with r lab': 2,
            'data visualization & exploration with r lab': 2,
            'social media analytics lab': 2,
            'seminar': 2,

            /* ── VIII SEMESTER ── */
            'deep learning and its applications': 3,
            'deep learning and its application lab': 1,
            'robot programming lab': 1,
            'robot programing lab': 1,
            'project': 7,

            /* OPEN ELECTIVE – I */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'foundation of computer vision': 3,
            'foundations of computer vision': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science and technology': 3,
            'introduction to ceramic science & technology': 3,
            'plant equipment and furnace design': 3,
            'plant, equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* OPEN ELECTIVE – II */
            'energy management': 3,
            'waste and byproduct utilization': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'energy audit and demand side management': 3,
            'energy audit and demandsidemanagement': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management and policy': 3,
            'energy management & policy': 3,
             'sports-i': 0.5,
             'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
            
            'communication skill': 2,
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'human value': 2,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'big data analytic': 3,
            'internet of thing': 3,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'internet of thing': 3,
            'internet of thing lab': 2,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor interfaces lab': 1,
        },

        /* ── Electronics & Communication Engineering ────────── */
        'ece': {
            /* ── SEMESTER I & II (Common to all branches) ── */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,

            /* ── SEMESTER III ── */
            'advanced engineering mathematics-i': 3,
            'advanced engineering mathematics 1': 3,
            'advanced engineering mathematics i': 3,
            'advance engineering mathematics-i': 3,
            'advance engineering mathematics 1': 3,
            'advance engineering mathematics i': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'digital system design': 3,
            'signals & systems': 3,
            'signals and systems': 3,
            'network theory': 4,
            'electronic devices': 4,
            'electronics devices lab': 1,
            'electronic devices lab': 1,
            'digital system design lab': 1,
            'signal processing lab': 1,
            'computer programming lab-i': 1,
            'computer programming lab i': 1,
            'industrial training': 2.5,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,

            /* ── SEMESTER IV ── */
            'advanced engineering mathematics-ii': 3,
            'advanced engineering mathematics 2': 3,
            'advanced engineering mathematics ii': 3,
            'advance engineering mathematics-ii': 3,
            'advance engineering mathematics ii': 3,
            'analog circuits': 3,
            'analog circuit': 3,
            'microcontrollers': 3,
            'microcontroller': 3,
            'electronics measurement & instrumentation': 3,
            'electronics measurement and instrumentation': 3,
            'analog and digital communication': 3,
            'analog & digital communication': 3,
            'analog and digital communication lab': 1.5,
            'analog & digital communication lab': 1.5,
            'analog circuits lab': 1.5,
            'microcontrollers lab': 1.5,
            'electronics measurement & instrumentation lab': 1.5,
            'electronics measurement and instrumentation lab': 1.5,

            /* ── SEMESTER V ── */
            'computer architecture': 2,
            'electromagnetics waves': 3,
            'electromagnetic waves': 3,
            'control system': 3,
            'digital signal processing': 3,
            'microwave theory & techniques': 3,
            'microwave theory and techniques': 3,
            /* Professional Elective I (any one) – 2 credits */
            'bio-medical electronics': 2,
            'biomedical electronics': 2,
            'bio medical electronics': 2,
            'embedded systems': 2,
            'probability theory & stochastic process': 2,
            'probability theory and stochastic process': 2,
            'satellite communication': 2,
            /* Labs */
            'rf simulation lab': 1.5,
            'digital signal processing lab': 1.5,
            'microwave lab': 1,

            /* ── SEMESTER VI ── */
            'power electronics': 2,
            'computer network': 3,
            'fiber optics communications': 3,
            'fiber optics communication': 3,
            'antennas and propagation': 3,
            'antennas & propagation': 3,
            'information theory and coding': 3,
            'information theory & coding': 3,
            /* Professional Elective II (any one) – 3 credits */
            'introduction to mems': 3,
            'nano electronics': 3,
            'nanoelectronics': 3,
            'neural network and fuzzy logic control': 3,
            'neural network & fuzzy logic control': 3,
            'high speed electronics': 3,
            /* Labs */
            'computer network lab': 2,
            'antenna and wave propagation lab': 1,
            'antenna & wave propagation lab': 1,
            'electronics design lab': 2,
            'power electronics lab': 1,

            /* ── SEMESTER VII ── */
            /* Professional Elective III (any one) – 3 credits */
            'vlsi design': 3,
            'mixed signal design': 3,
            'cmos design': 3,
            /* Open Elective I – 3 credits */
            'vlsi design lab': 2,
            'advance communication lab': 1,
            'advanced communication lab': 1,
            'advance communication lab (matlab simulation)': 1,
            'optical communication lab': 1,
            'seminar': 2,

            /* ── SEMESTER VIII ── */
            /* Professional Elective IV (any one) – 3 credits */
            'artificial intelligence and expert systems': 3,
            'artificial intelligence & expert systems': 3,
            'digital image and video processing': 3,
            'digital image & video processing': 3,
            'adaptive signal processing': 3,
            /* Open Elective II – 3 credits */
            'internet of things (iot) lab': 1,
            'internet of things lab': 1,
            'internet of thing lab': 1,
            'iot lab': 1,
            'skill development lab': 1,
            'project': 7,

            /* ── OPEN ELECTIVE – I (VII Semester) ── */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'quality management/iso 9000': 3,
            'quality management iso 9000': 3,
            'cyber security': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ── OPEN ELECTIVE – II (VIII Semester) ── */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'big data analytics': 3,
            'big data analytic': 3,
            'ipr, copyright and cyber law of india': 3,
            'ipr copyright and cyber law of india': 3,
            'energy audit and demand side management': 3,
            'energy audit & demand side management': 3,
            'soft computing': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
        
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'data communication and computer network': 3,
            'data communication & computer network': 3,
            'internet of thing': 3,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'line commutated and active rectifier': 3,
            'line commutated and active pwm rectifier': 3,
            'advanced engineering mathematics-1': 3,
            'advanced engineering mathematics-2': 3,
            'analog and digital communication 1': 3,
            'analog circuits 1': 3,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Electrical Engineering ──────────────────────────── */
        'ee': {
            /* ── SEMESTER I & II (Common First Year) ── */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,
            'social outreach, discipline & extra curricular activities': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,

            /* ── SEMESTER III ── */
            'advance mathematics': 3,
            'advanced mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'power generation process': 2,
            'power generation processes': 2,
            'electrical circuit analysis': 3,
            'analog electronics': 3,
            'electrical machine-i': 3,
            'electrical machine i': 3,
            'electrical machine - i': 3,
            'electrical machine 1': 3,
            'electromagnetic field': 2,
            'electromagnetic fields': 2,
            'analog electronics lab': 1,
            'electrical machine-i lab': 2,
            'electrical machine i lab': 2,
            'electrical machines-i lab': 2,
            'electrical machines i lab': 2,
            'electrical circuit design lab': 2,
            'industrial training': 2.5,

            /* ── SEMESTER IV ── */
            'biology': 2,
            'electronic measurement & instrumentation': 2,
            'electronic measurement and instrumentation': 2,
            'electrical machine-ii': 3,
            'electrical machine ii': 3,
            'electrical machine - ii': 3,
            'electrical machine 2': 3,
            'electrical machines-ii': 3,
            'electrical machines ii': 3,
            'power electronics': 3,
            'signals & systems': 3,
            'signals and systems': 3,
            'digital electronics': 2,
            'electrical machine-ii lab': 2,
            'electrical machine ii lab': 2,
            'electrical machine - ii lab': 2,
            'electrical machines-ii lab': 2,
            'electrical machines ii lab': 2,
            'power electronics lab': 2,
            'digital electronics lab': 1,
            'measurement lab': 1,

            /* ── SEMESTER V ── */
            'electrical materials': 2,
            'power system - i': 3,
            'power system 1': 3,
            'power system i': 3,
            'power system-i': 3,
            'control system': 3,
            'microprocessor': 3,
            'electrical machine design': 3,
            /* Professional Elective – I (any one, 2 credits) */
            'restructured power system': 2,
            'electromagnetic wave': 2,
            'digital control system': 2,
            /* Labs */
            'power system - i lab': 1,
            'power system i lab': 1,
            'power system-i lab': 1,
            'control system lab': 1,
            'microprocessor lab': 1,
            'system programming lab': 1,
            'seminar': 2,

            /* ── SEMESTER VI ── */
            'computer architecture': 2,
            'power system - ii': 3,
            'power system 2': 3,
            'power system ii': 3,
            'power system-ii': 3,
            'power system protection': 3,
            'electrical energy conservation and auditing': 3,
            'electrical energy conservation & auditing': 3,
            'electric drives': 3,
            /* Professional Elective – II (any one, 3 credits) */
            'power system planning': 3,
            'digital signal processing': 3,
            'electrical and hybrid vehicles': 3,
            'electrical and hybrid vehicle': 3,
            /* Labs */
            'power system - ii lab': 2,
            'power system ii lab': 2,
            'power system-ii lab': 2,
            'electric drives lab': 2,
            'electric drive lab': 2,
            'power system protection lab': 1,
            'modelling and simulation lab': 1,
            'modeling and simulation lab': 1,

            /* ── SEMESTER VII ── */
            /* Professional Elective – III (any one, 3 credits) */
            'wind and solar energy systems': 3,
            'wind and solar energy system': 3,
            'power quality and facts': 3,
            'control system design': 3,
            /* Labs */
            'embedded systems lab': 2,
            'embedded system lab': 2,
            'advance control system lab': 2,
            'advanced control system lab': 2,

            /* ── SEMESTER VIII ── */
            /* Professional Elective – IV (any one) */
            'hvdc transmission system': 3,
            'line commutated and active rectifiers': 3,
            'line commutated and active rectifier': 3,
            'line commutated and active pwm rectifiers': 3,
            'line commutated and active pwm rectifier': 3,
            'advanced electric drives': 2,
            /* Labs & Project */
            'energy systems lab': 2,
            'project': 7,

            /* ── OPEN ELECTIVE – I (any one, 3 credits) ── */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'quality management/iso 9000': 3,
            'quality management iso 9000': 3,
            'cyber security': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ── OPEN ELECTIVE – II (any one, 3 credits) ── */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'big data analytics': 3,
            'big data analytic': 3,
            'ipr, copyright and cyber law of india': 3,
            'ipr copyright and cyber law of india': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
        
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'data communication and computer network': 3,
            'data communication & computer network': 3,
            'internet of thing': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'electrical & hybrid vehicle': 3,
            'electrical machine-1': 3,
            'electrical machine-2': 3,
            'power system-1': 3,
            'power system-2': 3,
            'circuit analysis 1': 3,
            'circuit analysis-1': 3,
            'circuit analysis 2': 3,
            'circuit analysis-2': 3,
            'advance engineering mathematics 1': 3,
            'advance engineering mathematics-1': 3,
            'advance engineering mathematics 3': 3,
            'advance engineering mathematics-3': 3,
            'advanced engineering mathematics 1': 3,
            'advanced engineering mathematics-1': 3,
            'advanced engineering mathematics 3': 3,
            'advanced engineering mathematics-3': 3,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Information Technology ──────────────────────────── */
        'it': {
            /* ===================== SEMESTER I & II (Common) ===================== */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,

            /* ===================== SEMESTER III ===================== */
            'advanced engineering mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'digital electronics': 3,
            'data structures and algorithms': 3,
            'data structures & algorithms': 3,
            'object oriented programming': 3,
            'software engineering': 3,
            'data structures and algorithms lab': 1.5,
            'data structures & algorithms lab': 1.5,
            'object oriented programming lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 2.5,

            /* ===================== SEMESTER IV ===================== */
            'discrete mathematics structure': 3,
            'discrete mathematics': 3,
            'principles of communication': 3,
            'principle of communication': 3,
            'database management system': 3,
            'theory of computation': 3,
            'data communication and computer networks': 3,
            'data communication and computer network': 3,
            'data communication & computer networks': 3,
            'data communication & computer network': 3,
            'linux shell programming lab': 1,
            'database management system lab': 1.5,
            'network programming lab': 1.5,
            'java lab': 1,
            'web technology lab': 1,

            /* ===================== SEMESTER V ===================== */
            'microprocessor and interfaces': 2,
            'microprocessor & interfaces': 2,
            'compiler design': 3,
            'operating system': 3,
            'computer graphics & multimedia': 3,
            'computer graphics and multimedia': 3,
            'analysis of algorithms': 3,
            /* Professional Elective I (any one) */
            'wireless communication': 2,
            'software testing and project management': 2,
            'bioinformatics': 2,
            'computer graphics & multimedia lab': 1,
            'computer graphics and multimedia lab': 1,
            'compiler design lab': 1,
            'analysis of algorithms lab': 1,
            'advanced java lab': 1,

            /* ===================== SEMESTER VI ===================== */
            'digital image processing': 2,
            'machine learning': 3,
            'information security system': 2,
            'computer architecture and organization': 3,
            'computer architecture & organization': 3,
            'artificial intelligence': 2,
            'distributed system': 3,
            /* Professional Elective II (any one) */
            'information theory & coding': 2,
            'information theory and coding': 2,
            'cloud computing': 2,
            'ecommerce & erp': 2,
            'ecommerce and erp': 2,
            'digital image processing lab': 1.5,
            'machine learning lab': 1.5,
            'python lab': 1.5,
            'mobile application development lab': 1.5,

            /* ===================== SEMESTER VII ===================== */
            'big data analytics': 3,
            'big data analytic': 3,
            'big data analytics lab': 2,
            'cyber security lab': 2,
            'security lab': 2,
            'seminar': 2,

            /* ===================== SEMESTER VIII ===================== */
            'internet of things': 3,
            'internet of thing': 3,
            'internet of things lab': 1,
            'internet of thing lab': 1,
            'software testing and validation lab': 1,
            'software testing & validation lab': 1,
            'project': 7,

            /* ===================== OPEN ELECTIVE – I ===================== */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'finite element analysis': 3,
            'quality management': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ===================== OPEN ELECTIVE – II ===================== */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'energy audit and demand side management': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'operations research': 3,
            'simulation modeling and analysis': 3,
            'simulation modelling and analysis': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
        
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'microprocessor & interface': 3,
            'microprocessor and interface': 3,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor & interface lab': 1,
            'microprocessor and interface lab': 1,
            'microprocessor interfaces lab': 1,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Mechanical Engineering ──────────────────────────── */
        'me': {
            /* ===================== SEMESTER I & II (Common) ===================== */
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics i': 4,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics ii': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'human values': 2,
            'human value': 2,
            'programming for problem solving': 2,
            'basic mechanical engineering': 2,
            'basic electrical engineering': 2,
            'basic civil engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'human values activities': 1,
            'computer programming lab': 1.5,
            'manufacturing practices workshop': 1.5,
            'basic electrical engineering lab': 1,
            'basic civil engineering lab': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'social outreach discipline & extra curricular activities': 0.5,
            'social outreach discipline and extra curricular activities': 0.5,

            /* ===================== SEMESTER III ===================== */
            'advance engineering mathematics-i': 3,
            'advance engineering mathematics 1': 3,
            'advance engineering mathematics i': 3,
            'advanced engineering mathematics': 3,
            'technical communication': 2,
            'managerial economics and financial accounting': 2,
            'managerial economics & financial accounting': 2,
            'engineering mechanics': 2,
            'engineering thermodynamics': 3,
            'materials science and engineering': 3,
            'material science and engineering': 3,
            'mechanics of solids': 4,
            'mechanics of solid': 4,
            'machine drawing practice': 1.5,
            'materials testing lab': 1.5,
            'material testing lab': 1.5,
            'basic mechanical engineering lab': 1.5,
            'programming using matlab': 1.5,
            'industrial training': 2.5,

            /* ===================== SEMESTER IV ===================== */
            'data analytics': 2,
            'data analytic': 2,
            'digital electronics': 2,
            'fluid mechanics and fluid machines': 4,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machines': 4,
            'fluid mechanics & fluid machine': 4,
            'manufacturing processes': 3,
            'theory of machines': 4,
            'theory of machine': 4,
            'digital electronics lab': 1.5,
            'fluid mechanics lab': 1.5,
            'production practice lab': 1.5,
            'theory of machines lab': 1.5,

            /* ===================== SEMESTER V ===================== */
            'mechatronic systems': 2,
            'mechatronics systems': 2,
            'heat transfer': 3,
            'manufacturing technology': 3,
            'design of machine elements i': 3,
            'design of machine elements - i': 3,
            'design of machine elements-i': 3,
            'design of machine elements 1': 3,
            'principles of management': 2,
            /* Professional Elective I (any one) - Credit 3 */
            'steam engineering': 3,
            'automobile engineering': 3,
            'non destructive evaluation and testing': 3,
            'non destructive evaluation & testing': 3,
            'non-destructive evaluation and testing': 3,
            'mechatronic lab': 1,
            'mechatronics lab': 1,
            'heat transfer lab': 1,
            'production engineering lab': 1,
            'machine design practice i': 1,
            'machine design practice - i': 1,

            /* ===================== SEMESTER VI ===================== */
            'measurement and metrology': 2,
            'measurement & metrology': 2,
            'computer integrated manufacturing systems': 3,
            'cims': 3,
            'mechanical vibrations': 3,
            'mechanical vibration': 3,
            'design of machine elements ii': 3,
            'design of machine elements - ii': 3,
            'design of machine elements-ii': 3,
            'design of machine elements 2': 3,
            'quality management': 3,
            /* Professional Elective II (any one) - Credit 3 */
            'refrigeration and air conditioning': 3,
            'refrigeration & air conditioning': 3,
            'non conventional machining methods': 3,
            'non conventional machining method': 3,
            'mems and microsystems': 3,
            'mems and microsystem': 3,
            'mems & microsystems': 3,
            'mems & microsystem': 3,
            'micro electro and mechanical systems and microsystems': 3,
            'cims lab': 1.5,
            'vibration lab': 1.5,
            'machine design practice ii': 1.5,
            'machine design practice - ii': 1.5,
            'thermal engineering lab i': 1.5,
            'thermal engineering lab-i': 1.5,
            'thermal engineering lab 1': 1.5,

            /* ===================== SEMESTER VII ===================== */
            /* Professional Elective (any one) - Credit 3 */
            'i. c. engines': 3,
            'i. c. engine': 3,
            'i.c. engines': 3,
            'i.c. engine': 3,
            'ic engines': 3,
            'ic engine': 3,
            'internal combustion engines': 3,
            'internal combustion engine': 3,
            'operations research': 3,
            'turbomachines': 3,
            'turbomachine': 3,
            'fea lab': 1.5,
            'thermal engineering lab ii': 1.5,
            'thermal engineering lab-ii': 1.5,
            'thermal engineering lab 2': 1.5,
            'quality control lab': 1,
            'seminar': 2,

            /* ===================== SEMESTER VIII ===================== */
            /* Professional Elective (any one) - Credit 3 */
            'hybrid and electric vehicles': 3,
            'hybrid and electric vehicle': 3,
            'hybrid & electric vehicles': 3,
            'hybrid & electric vehicle': 3,
            'supply and operations management': 3,
            'supply & operations management': 3,
            'additive manufacturing': 3,
            'industrial engineering lab': 1,
            'metrology lab': 1,
            'project': 7,

            /* ===================== OPEN ELECTIVE – I ===================== */
            'human engineering and safety': 3,
            'environmental engineering and disaster management': 3,
            'aircraft avionic system': 3,
            'non-destructive testing': 3,
            'non destructive testing': 3,
            'optimization techniques': 3,
            'sustainable engineering': 3,
            'introduction to ceramic science & technology': 3,
            'introduction to ceramic science and technology': 3,
            'plant, equipment and furnace design': 3,
            'plant equipment and furnace design': 3,
            'environmental impact analysis': 3,
            'disaster management': 3,
            'quality management/iso 9000': 3,
            'quality management iso 9000': 3,
            'cyber security': 3,
            'electrical machines and drives': 3,
            'power generation sources': 3,
            'principle of electronic communication': 3,
            'micro and smart system technology': 3,
            'rock engineering': 3,
            'mineral processing': 3,
            'pipeline engineering': 3,
            'water pollution control engineering': 3,
            'technical textiles': 3,
            'technical textile': 3,
            'garment manufacturing technology': 3,

            /* ===================== OPEN ELECTIVE – II ===================== */
            'energy management': 3,
            'waste and by-product utilization': 3,
            'waste and by product utilization': 3,
            'finite element methods': 3,
            'finite element method': 3,
            'factor of human interactions': 3,
            'factor of human interaction': 3,
            'refinery engineering design': 3,
            'fertilizer technology': 3,
            'electrical and electronic ceramics': 3,
            'biomaterials': 3,
            'composite materials': 3,
            'fire and safety engineering': 3,
            'big data analytics': 3,
            'big data analytic': 3,
            'ipr copyright and cyber law of india': 3,
            'ipr, copyright and cyber law of india': 3,
            'energy audit and demand side management': 3,
            'soft computing': 3,
            'industrial and biomedical applications of rf energy': 3,
            'robotics and control': 3,
            'experimental stress analysis': 3,
            'maintenance management': 3,
            'unconventional hydrocarbon resources': 3,
            'energy management & policy': 3,
            'energy management and policy': 3,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'material and human resource management': 3,
        
            'tinkering & element of design': 0.5,
            'tinkering and element of design': 0.5,
            'sketch & rendering': 0.5,
            'sketch and rendering': 0.5,
            'engineering mathematics-1': 4,
            'engineering mathematics-2': 4,
            'human value activitie': 1,
            'human value activity': 1,
            'computer aided engineering graphic': 1.5,
            'data communication and computer network': 3,
            'data communication & computer network': 3,
            'internet of thing': 3,
            'electrical and hybrid vehicle': 3,
            'electrical & hybrid vehicle': 3,
            'predictive modeling and analytic': 3,
            'predictive modelling and analytic': 3,
            'supply and operation management': 3,
            'supply & operation management': 3,
            'design of machine elements-1': 3,
            'design of machine element 1': 3,
            'design of machine element-1': 3,
            'design of machine elements-2': 3,
            'design of machine element 2': 3,
            'design of machine element-2': 3,
            'machine design practice 1': 1,
            'machine design practice-1': 1,
            'machine design practice 2': 1.5,
            'machine design practice-2': 1.5,
            'thermal engineering lab-1': 1,
            'thermal engineering lab-2': 1.5,
            'advance engineering mathematics-1': 3,
        
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'software engineering and project management': 3,
            'discrete mathematics and linear algebra': 3,
            'computer architecture and microprocessor': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        }

    };

    function normalizeRtuKey(name) {
        if (!name) return '';
        return name
            .replace(/\n/g, ' ')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/ & /g, ' and ')
            .replace(/\s*-\s*/g, '-')   // normalise spaces around hyphens
            .replace(/[.,]+$/, '')        // strip trailing punctuation
            .replace(/\s*\/\s*/g, '/');  // slash spacing
    }

    function stripSingular(key) {
        // Strip trailing 's' safely — only from last word, only if result is meaningful
        var words = key.split(' ');
        var last  = words[words.length - 1];
        if (last.length > 2 && last.endsWith('s') && !last.endsWith('ss')) {
            words[words.length - 1] = last.slice(0, -1);
            return words.join(' ');
        }
        return null;
    }

    function partialMatchRtu(map, key) {
        // Strip last word progressively (max 3 attempts) to handle extra suffixes
        var words = key.split(' ');
        for (var i = 0; i < 3; i++) {
            if (words.length <= 2) break;
            words.pop();
            var partial = words.join(' ');
            if (partial in map) return map[partial];
        }
        return null;
    }

    function lookupCredits(subjectName, branch) {
        if (!subjectName) return null;
        var map = RTU_CREDIT_MAPS[branch];
        if (!map) return null;
        var key = normalizeRtuKey(subjectName);

        // 1. Exact match
        if (key in map) return map[key];

        // 2. Singular variant
        var singular = stripSingular(key);
        if (singular && singular in map) return map[singular];

        // 3. Partial match (strip trailing extra words progressively)
        var partial = partialMatchRtu(map, key);
        if (partial !== null) return partial;

        // 4. Partial match on singular
        if (singular) {
            var partialSing = partialMatchRtu(map, singular);
            if (partialSing !== null) return partialSing;
        }

        return null;
    }

    async function extractPDFText(arrayBuffer) {
        if (!window.pdfjsLib) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        }
        var pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js failed to load');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        var typedArray = new Uint8Array(arrayBuffer);
        var pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        var allLines = [];

        for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            var page    = await pdf.getPage(pageNum);
            var content = await page.getTextContent();
            var lineMap = new Map();

            content.items.forEach(function (item) {
                if (!item.str || !item.str.trim()) return;
                var y = Math.round(item.transform[5] / 2) * 2;
                if (!lineMap.has(y)) lineMap.set(y, []);
                lineMap.get(y).push({ x: item.transform[4], text: item.str.trim() });
            });

            var sortedYs = Array.from(lineMap.keys()).sort(function (a, b) { return b - a; });
            sortedYs.forEach(function (y) {
                var items = lineMap.get(y).sort(function (a, b) { return a.x - b.x; });
                var line  = items.map(function (i) { return i.text; }).join(' ').replace(/\s+/g, ' ').trim();
                if (line) allLines.push(line);
            });
        }

        return allLines.join('\n');
    }

    function parseRTUResult(fullText) {
        var lines = fullText.split('\n');
        var studentName = '—', fatherName = '—', rollNo = '—', remarks = 'FAIL';

        lines.forEach(function (line) {
            if (rollNo === '—') {
                var m = line.match(/Roll\s*No\s*:\s*([A-Z0-9]+)/i);
                if (m) rollNo = m[1].trim();
            }
            var remM = line.match(/REMARKS\s*:\s*(PASS|FAIL)/i);
            if (remM) remarks = remM[1].toUpperCase();

            if (line.match(/Father/i)) {
                if (fatherName === '—') {
                    var fM = line.match(/Father'?s?\s*Name\s*:\s*([A-Z][A-Z ]+?)(?:\s{2,}|\n|$)/i);
                    if (fM) fatherName = fM[1].trim();
                }
                if (studentName === '—') {
                    var nM = line.match(/(?:^|\s)Name\s*:\s*([A-Z][A-Z ]+?)(?=\s+Father)/i);
                    if (nM) studentName = nM[1].trim();
                }
            } else if (studentName === '—' && line.match(/\bName\s*:/i) && !line.match(/College|Course/i)) {
                var nM2 = line.match(/\bName\s*:\s*([A-Z][A-Z ]+?)(?:\s{2,}|\n|$)/i);
                if (nM2) studentName = nM2[1].trim();
            }
        });

        var courseCodeRe = /\b([0-9][A-Z]{1,4}[0-9]{1,2}(?:-[0-9]{2})?|[A-Z]{2,4}[0-9]{2,})\b/;
        var gradeRe      = /^(A\+\+|A\+|A|B\+|B|C\+|C|D\+|D|E\+|E|F)$/;
        var subjects     = [];
        var inTable      = false;

        lines.forEach(function (line) {
            if (line.match(/COURSE\s*TITLE|MARKS1|MARKS2/i)) { inTable = true; return; }
            if (line.match(/REMARKS\s*:/i)) { inTable = false; return; }
            if (!inTable) return;

            var codeMatch = line.match(courseCodeRe);
            if (!codeMatch) return;

            var codeStr  = codeMatch[0];
            var codeIdx  = line.indexOf(codeStr);
            var rawName  = line.substring(0, codeIdx).trim();
            if (!rawName) return;

            var afterCode = line.substring(codeIdx + codeStr.length).trim();
            var parts     = afterCode.replace(/\*/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
            if (!parts.length) return;

            var lastPart = parts[parts.length - 1];
            if (!gradeRe.test(lastPart)) return;

            var grade    = lastPart;
            var numParts = parts.slice(0, parts.length - 1).filter(function (p) { return /^\d+$/.test(p); });

            var marks1 = null, marks2 = null;
            if (numParts.length >= 2) {
                marks1 = parseInt(numParts[0]);
                marks2 = parseInt(numParts[1]);
            } else if (numParts.length === 1) {
                marks2 = parseInt(numParts[0]);
            }

            subjects.push({ name: rawName, courseCode: codeStr, marks1: marks1, marks2: marks2, grade: grade });
        });

        return { studentName: studentName, fatherName: fatherName, rollNo: rollNo, remarks: remarks, subjects: subjects };
    }

    function computeSGPA(parsed) {
        var subjects = parsed.subjects;
        var sumCreditPoints = 0, sumCredits = 0, sumMarks = 0;

        var enriched = subjects.map(function (s) {
            var gradePoint   = GRADE_POINTS.hasOwnProperty(s.grade) ? GRADE_POINTS[s.grade] : null;
            var credits      = lookupCredits(s.name, SGPA_STATE.branch);
            var creditPoints = null;

            if (gradePoint !== null && credits !== null) {
                creditPoints     = parseFloat((gradePoint * credits).toFixed(2));
                sumCreditPoints += creditPoints;
                sumCredits      += credits;
            }

            var total = (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0);
            sumMarks += total;

            return Object.assign({}, s, { gradePoint: gradePoint, credits: credits, creditPoints: creditPoints });
        });

        var sgpa = sumCredits > 0 ? parseFloat((sumCreditPoints / sumCredits).toFixed(2)) : null;

        return {
            subjects:          enriched,
            sgpa:              sgpa,
            totalMarks:        sumMarks,
            maxMarks:          subjects.length * 100,
            totalGP:           parseFloat(sumCreditPoints.toFixed(2)),
            totalCredits:      parseFloat(sumCredits.toFixed(1)),
            totalCreditPoints: parseFloat(sumCreditPoints.toFixed(2)),
        };
    }

    function showSGPAState(state) {
        ['upload', 'loading', 'results'].forEach(function (s) {
            var el = document.getElementById('sgpa-' + s + '-state');
            if (el) el.classList.add('hidden');
        });
        var target = document.getElementById('sgpa-' + state + '-state');
        if (target) target.classList.remove('hidden');
        window.scrollTo({ top: 0 });
    }

    function setSGPALoadingMsg(msg) {
        var el = document.getElementById('sgpa-loading-sub');
        if (el) el.textContent = msg;
    }

    function showSGPAError(msg) {
        var banner = document.getElementById('sgpa-error-banner');
        var text   = document.getElementById('sgpa-error-text');
        if (text)   text.textContent = msg;
        if (banner) banner.classList.add('visible');
    }

    function clearSGPAError() {
        var banner = document.getElementById('sgpa-error-banner');
        if (banner) banner.classList.remove('visible');
    }

    function renderSGPAResults(data) {
        document.getElementById('sgpa-name').textContent   = data.studentName;
        document.getElementById('sgpa-father').textContent = data.fatherName;
        document.getElementById('sgpa-roll').textContent   = data.rollNo;

        var remEl       = document.getElementById('sgpa-remarks');
        remEl.textContent = data.remarks;
        remEl.className   = 'sgpa-remarks ' + (data.remarks === 'PASS' ? 'pass' : 'fail');

        var tbody = document.getElementById('sgpa-tbody');
        tbody.innerHTML = '';

        data.subjects.forEach(function (s, i) {
            var tr    = document.createElement('tr');
            if (s.grade === 'F') tr.classList.add('row-fail');

            var total = (s.marks1 !== null || s.marks2 !== null)
                ? (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0)
                : null;

            var gradeClass   = s.grade === 'F' ? 'grade-fail' : 'grade-pass';
            var creditsCell  = s.credits !== null ? s.credits : '<span class="credits-unknown">—</span>';
            var cpCell       = s.creditPoints !== null ? s.creditPoints.toFixed(2) : '<span class="credits-unknown">—</span>';

            tr.innerHTML =
                '<td>' + (i + 1) + '</td>' +
                '<td class="col-subject">' + s.name + '</td>' +
                '<td>' + (s.marks1 !== null ? s.marks1 : '—') + '</td>' +
                '<td>' + (s.marks2 !== null ? s.marks2 : '—') + '</td>' +
                '<td>' + (total !== null ? total : '—') + '</td>' +
                '<td><span class="grade-cell ' + gradeClass + '">' + s.grade + '</span></td>' +
                '<td>' + creditsCell + '</td>' +
                '<td>' + cpCell + '</td>';

            tbody.appendChild(tr);
        });

        document.getElementById('sgpa-value').textContent         = data.sgpa !== null ? data.sgpa.toFixed(2) : '—';
        document.getElementById('sgpa-total-marks').textContent   = data.totalMarks;
        document.getElementById('sgpa-max-marks').textContent     = data.maxMarks;
        document.getElementById('sgpa-total-gp').textContent      = data.totalGP.toFixed(2);
        document.getElementById('sgpa-total-credits').textContent = data.totalCredits;
        document.getElementById('sgpa-total-cp').textContent      = data.totalCreditPoints.toFixed(2);
    }

    async function handleSGPAFile(file) {
        var zone = document.getElementById('sgpa-upload-zone');
        var hint = document.getElementById('sgpa-hint');

        zone.classList.remove('success', 'error-state');
        clearSGPAError();

        // ── Branch validation ──
        if (!SGPA_STATE.branch) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Please select your branch before uploading.';
            showSGPAError('Please select your branch before uploading your result PDF.');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Please upload a PDF file.';
            showSGPAError('Only PDF files are supported. Please upload an RTU result PDF.');
            return;
        }

        showSGPAState('loading');
        setSGPALoadingMsg('Reading PDF file…');

        try {
            var arrayBuffer = await new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload  = function (e) { resolve(e.target.result); };
                reader.onerror = function () { reject(new Error('FileReader failed')); };
                reader.readAsArrayBuffer(file);
            });

            setSGPALoadingMsg('Extracting text from PDF…');
            var fullText = await extractPDFText(arrayBuffer);

            setSGPALoadingMsg('Parsing result data…');
            var parsed = parseRTUResult(fullText);

            if (!parsed.subjects.length) {
                showSGPAState('upload');
                showSGPAError('No subject rows found. Please upload a valid RTU result PDF.');
                return;
            }

            setSGPALoadingMsg('Computing SGPA…');
            var computed = computeSGPA(parsed);

            SGPA_STATE.data = Object.assign({}, parsed, computed);

            setSGPALoadingMsg('Rendering results…');
            renderSGPAResults(SGPA_STATE.data);
            showSGPAState('results');

        } catch (err) {
            console.error('[SGPA] Parse error:', err);
            showSGPAState('upload');
            showSGPAError('Could not process this PDF. Ensure it is a valid RTU result PDF and try again.');
        }
    }

    async function generateReportPDF() {
        var data = SGPA_STATE.data;
        if (!data) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js');
            } catch (e) {
                alert('PDF generation library not loaded. Please check your internet connection and try again.');
                return;
            }
        }

        var jsPDF  = window.jspdf.jsPDF;
        var doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        var pageW  = doc.internal.pageSize.getWidth();

        doc.setFillColor(9, 13, 20);
        doc.rect(0, 0, pageW, 30, 'F');
        doc.setTextColor(232, 237, 248);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('RAJASTHAN TECHNICAL UNIVERSITY — KOTA', pageW / 2, 13, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(125, 139, 170);
        doc.text('SGPA Result Analysis  •  Generated by BunkWise', pageW / 2, 22, { align: 'center' });

        doc.setFillColor(15, 21, 32);
        doc.rect(0, 30, pageW, 22, 'F');

        var fields = [
            { label: 'STUDENT NAME',  value: data.studentName, x: 14  },
            { label: "FATHER'S NAME", value: data.fatherName,  x: 90  },
            { label: 'ROLL NUMBER',   value: data.rollNo,      x: 176 },
            { label: 'REMARKS',       value: data.remarks,     x: 235, coloured: true },
        ];
        fields.forEach(function (f) {
            doc.setFontSize(6.5);
            doc.setTextColor(61, 77, 106);
            doc.setFont('helvetica', 'normal');
            doc.text(f.label, f.x, 37);
            if (f.coloured) {
                var isPass = data.remarks === 'PASS';
                doc.setTextColor(isPass ? 30 : 240, isPass ? 180 : 68, isPass ? 100 : 85);
            } else {
                doc.setTextColor(220, 228, 245);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(f.value, f.x, 46);
        });

        var tableBody = data.subjects.map(function (s, i) {
            var total = (s.marks1 !== null || s.marks2 !== null)
                ? (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0)
                : '—';
            return [
                i + 1, s.name,
                s.marks1 !== null ? s.marks1 : '—',
                s.marks2 !== null ? s.marks2 : '—',
                total, s.grade,
                s.credits !== null ? s.credits : '—',
                s.creditPoints !== null ? s.creditPoints.toFixed(2) : '—',
            ];
        });

        doc.autoTable({
            startY: 56,
            head: [['#', 'Subject Name', 'Internal', 'External', 'Total', 'Grade', 'Credits', 'Credit Pts']],
            body: tableBody,
            foot: [[
                { content: 'SGPA  ' + (data.sgpa !== null ? data.sgpa.toFixed(2) : '—'), colSpan: 2, styles: { fontStyle: 'bold', fontSize: 11, textColor: [77, 138, 240], halign: 'left' } },
                { content: 'Total Marks: ' + data.totalMarks + ' / ' + data.maxMarks, colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'GP: ' + data.totalGP.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
                { content: '', styles: {} },
                { content: 'Cr: ' + data.totalCredits, styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'CP: ' + data.totalCreditPoints.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
            ]],
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }, textColor: [30, 35, 50], fillColor: [255, 255, 255], lineColor: [200, 210, 225], lineWidth: 0.2 },
            headStyles: { fillColor: [240, 243, 250], textColor: [80, 95, 120], fontSize: 7, fontStyle: 'bold', halign: 'center', lineColor: [200, 210, 225] },
            footStyles: { fillColor: [240, 243, 250], textColor: [80, 95, 120], fontSize: 8, lineColor: [200, 210, 225] },
            alternateRowStyles: { fillColor: [248, 250, 253] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 'auto', halign: 'left' },
                2: { halign: 'center', cellWidth: 22 },
                3: { halign: 'center', cellWidth: 22 },
                4: { halign: 'center', cellWidth: 18 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'center', cellWidth: 18 },
                7: { halign: 'center', cellWidth: 24 },
            },
            didParseCell: function (hookData) {
                if (hookData.section === 'body' && hookData.column.index === 5) {
                    if (hookData.cell.raw === 'F') {
                        hookData.cell.styles.textColor = [200, 40, 55];
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.fillColor = [255, 235, 235];
                    } else {
                        hookData.cell.styles.textColor = [30, 100, 200];
                        hookData.cell.styles.fontStyle = 'bold';
                    }
                }
                if (hookData.section === 'body' && hookData.row.raw && hookData.row.raw[5] === 'F' && hookData.column.index !== 5) {
                    hookData.cell.styles.textColor = [160, 60, 70];
                }
            },
            margin: { left: 12, right: 12 },
        });

        var finalY = (doc.lastAutoTable || {}).finalY || 200;
        doc.setFontSize(6.5);
        doc.setTextColor(140, 150, 170);
        doc.setFont('helvetica', 'italic');
        doc.text('* Subjects with credits shown as — are excluded from SGPA calculation. This report is for reference only. Always verify with official RTU mark-sheet.', 12, finalY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by BunkWise', pageW - 12, finalY + 6, { align: 'right' });

        doc.save('SGPA_' + (data.rollNo !== '—' ? data.rollNo : 'report') + '.pdf');
    }

    /* ── Wire SGPA page ──────────────────────────────────── */
    function initSGPAPage() {
        var btnUpload = document.getElementById('btn-sgpa-upload');
        if (!btnUpload) return;   // not on sgpa.html — exit

        btnUpload.addEventListener('click', function () {
            document.getElementById('sgpa-file-input').click();
        });

        document.getElementById('sgpa-file-input').addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (file) handleSGPAFile(file);
            e.target.value = '';
        });

        document.getElementById('btn-download-report').addEventListener('click', generateReportPDF);

        document.getElementById('btn-check-another').addEventListener('click', function () {
            SGPA_STATE.data = null;
            var zone = document.getElementById('sgpa-upload-zone');
            var hint = document.getElementById('sgpa-hint');
            zone.classList.remove('success', 'error-state');
            hint.textContent = 'Select your RTU result PDF to analyse';
            clearSGPAError();
            showSGPAState('upload');
        });

        // ── RTU Branch selector ──
        var rtuBranchSelect = document.getElementById('rtu-branch-select');
        if (rtuBranchSelect) {
            rtuBranchSelect.addEventListener('change', function () {
                SGPA_STATE.branch = rtuBranchSelect.value || null;
            });
        }

        // ── Autonomous upload button ──
        var btnAutoUpload = document.getElementById('btn-auto-upload');
        if (btnAutoUpload) {
            btnAutoUpload.addEventListener('click', function () {
                document.getElementById('auto-file-input').click();
            });
            document.getElementById('auto-file-input').addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (file) handleAutoFile(file);
                e.target.value = '';
            });
        }

        // ── Autonomous check another ──
        var btnAutoAnother = document.getElementById('btn-auto-check-another');
        if (btnAutoAnother) {
            btnAutoAnother.addEventListener('click', function () {
                AUTO_STATE.data = null;
                var autoRes = document.getElementById('auto-results-state');
                if (autoRes) autoRes.classList.add('hidden');
                var zone = document.getElementById('auto-upload-zone');
                var hint = document.getElementById('auto-hint');
                if (zone) zone.classList.remove('success', 'error-state');
                if (hint) hint.textContent = 'Select your AUTONOMOUS (SKIT) result PDF to analyse';
                clearAutoError();
                updateAutoCounter();
                showSGPAState('upload');
            });
        }

        // ── Autonomous download ──
        var btnAutoDownload = document.getElementById('btn-auto-download');
        if (btnAutoDownload) {
            btnAutoDownload.addEventListener('click', function () {
                if (AUTO_STATE.data) generateAutoReportPDF();
            });
        }

        // ── Branch selector ──
        var branchSelect = document.getElementById('auto-branch-select');
        if (branchSelect) {
            branchSelect.addEventListener('change', function () {
                AUTO_STATE.branch = branchSelect.value || null;
            });
        }

        // ── Show usage counter on load ──
        updateAutoCounter();

        // ── Share buttons ──
        var btnShareSgpa = document.getElementById('btn-share-sgpa');
        if (btnShareSgpa) {
            btnShareSgpa.addEventListener('click', function () { handleShare(btnShareSgpa); });
        }
        var btnShareAuto = document.getElementById('btn-share-auto');
        if (btnShareAuto) {
            btnShareAuto.addEventListener('click', function () { handleShare(btnShareAuto); });
        }
    }

    /* ══════════════════════════════════════════════════════
       AUTONOMOUS SGPA PAGE
       All code below only activates when sgpa.html is loaded
       (detected by presence of #btn-auto-upload).
       RTU pipeline above is NOT touched.
    ══════════════════════════════════════════════════════ */

    /* ── State ───────────────────────────────────────────── */
    var AUTO_STATE = { data: null, branch: null };

    /* ── Cloudflare Worker proxy (API key stored in Cloudflare — not in code) ── */
    var GEMINI_ENDPOINT  = 'https://gemni-proxy.madhavu2027.workers.dev';

    /* ── Credit maps — one per branch (user-provided data) ── */
    var AUTO_CREDIT_MAPS = {

        /* ── First Year (Sem 1 + Sem 2 combined) ────────── */
        'firstyear': {
            'engineering mathematics-i': 4,
            'engineering mathematics 1': 4,
            'engineering physics': 4,
            'engineering chemistry': 4,
            'communication skills': 2,
            'communication skill': 2,
            'universal human values': 2,
            'universal human value': 2,
            'computational thinking and programming': 2,
            'basic electrical and electronics engineering': 2,
            'basic civil engineering': 2,
            'basic mechanical engineering': 2,
            'engineering physics lab': 1,
            'engineering chemistry lab': 1,
            'language lab': 1,
            'universal human values lab': 1,
            'c programming lab': 1,
            'basic electrical and electronics engineering lab': 1,
            'basic civil engineering lab': 1,
            'manufacturing practice workshop': 1,
            'computer aided engineering graphics': 1.5,
            'computer aided machine drawing': 1.5,
            'social outreach, discipline and extra-curricular activities (sodeca)': 0.5,
            'audit course': 0,
            'engineering mathematics-ii': 4,
            'engineering mathematics 2': 4,
            'innovation and entrepreneurship': 1,
            'problem solving using object oriented paradigm': 2,
            'object oriented programming lab': 1,
            'technical training': 0,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'soft skills training': 0,
            'yoga': 0.5
        },

        /* ── Civil Engineering — 2nd Year ───────────────── */
        'ce': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'advanced engineering mathematics-i': 4,
            'strength of materials': 4,
            'surveying': 4,
            'building materials and construction': 4,
            'engineering geology': 2,
            'surveying lab': 2,
            'professional development lab': 2,
            'geology lab': 1,
            'building planning and drafting lab-i': 1.5,
            'building material testing lab': 1,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'soft skills training': 0,
            'advanced engineering mathematics-ii': 3,
            'advanced engineering mathematics 2': 3,
            'structural analysis-i': 3,
            'fluid mechanics and hydraulic engineering': 4,
            'concrete technology': 3,
            'environmental engineering': 3,
            'fluid mechanics and hydraulic engineering lab': 1,
            'concrete lab': 1.5,
            'building planning and drafting lab-ii': 1.5,
            'environmental engineering lab': 1,
            'structural engineering lab': 1,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'yoga': 0.5
        },

        /* ── Computer Science & Engineering — 2nd Year ───── */
        'cs': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'statistics and probability theory': 3,
            'data structure and algorithms': 4,
            'operating system': 3,
            'software engineering and project management': 3,
            'digital electronics': 3,
            'data structure and algorithms lab': 1.5,
            'programming in java lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'soft skills training': 0,
            'discrete mathematics and linear algebra': 3,
            'database management system': 3,
            'theory of computation': 3,
            'computer networks': 3,
            'artificial intelligence': 2,
            'computer architecture and microprocessor': 2,
            'database systems lab': 1.5,
            'network programming lab': 1.5,
            'microprocessor lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'data analytics and visualization lab': 1.5,
            'yoga': 0.5,
        
            'communication skill': 2,
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── CSE (Artificial Intelligence) — 2nd Year ────── */
        'cs-ai': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'statistics and probability theory': 3,
            'data structures and algorithms': 4,
            'foundation of artificial intelligence': 3,
            'software engineering and project management': 3,
            'digital electronics': 3,
            'data structures and algorithms lab': 1.5,
            'programming in java lab': 1.5,
            'logic programming lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'audit course': 0,
            'discrete mathematics and linear algebra': 3,
            'database management system': 3,
            'full stack development': 2,
            'computer networks': 3,
            'operating system': 3,
            'computer architecture and microprocessor': 2,
            'database systems lab': 1.5,
            'full stack development lab': 1.5,
            'microprocessor lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'data analytics and visualization lab': 1.5,
            'yoga': 0.5,
        
            'communication skill': 2,
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── CSE (Data Science) — 2nd Year ─────────────── */
        'cs-ds': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'statistics and probability theory': 3,
            'data structures and algorithms': 4,
            'foundation of data science': 3,
            'software engineering and project management': 3,
            'digital electronics': 3,
            'data structures and algorithms lab': 1.5,
            'programming in java lab': 1.5,
            'python for data science lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'soft skills training': 0,
            'discrete mathematics and linear algebra': 3,
            'database management system': 3,
            'full stack development': 2,
            'computer network': 3,
            'computer networks': 3,
            'operating system': 3,
            'computer architecture and microprocessor': 2,
            'database systems lab': 1.5,
            'full stack development lab': 1.5,
            'microprocessor lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'r-programming for data science': 1.5,
            'yoga': 0.5,
        
            'communication skill': 2,
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── CSE (IOT) — 2nd Year ───────────────────────── */
        'cs-iot': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'statistics and probability theory': 3,
            'data structures and algorithms': 4,
            'electronic system for iot': 3,
            'software engineering and project management': 3,
            'digital electronics': 3,
            'data structures and algorithms lab': 1.5,
            'programming in java lab': 1.5,
            'electronic system for iot lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 1,
            'sodeca': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,
            'audit course': 0,
            'discrete mathematics and linear algebra': 3,
            'database management system': 3,
            'data analytics for iot': 2,
            'computer networks': 3,
            'operating system': 3,
            'computer architecture and microprocessor': 2,
            'database systems lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'network programming lab': 1.5,
            'microprocessor lab': 1.5,
            'data analytics and visualization lab': 1.5,
            'yoga': 0.5,
        
            'communication skill': 2,
            'electronic devices and circuit': 3,
            'electronic devices & circuit': 3,
            'mechanics of solid': 4,
            'data analytic': 3,
            'fluid mechanics and fluid machine': 4,
            'fluid mechanics & fluid machine': 4,
            'theory of machine': 4,
            'microcontroller': 3,
            'universal human value': 2,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
            'data structure & algorithm': 4,
            'data structures & algorithm': 4,
            'engineering mathematics 1': 4,
            'engineering mathematics-1': 4,
            'engineering mathematics 2': 4,
            'engineering mathematics-2': 4,
            'data structure and algorithm': 4,
            'data structures and algorithm': 4,
        },

        /* ── Electronics & Communication Engineering — 2nd Year */
        'ece': {
            'linear algebra and numerical analysis': 4,
            'technical communication': 1,
            'managerial economics and financial accounting': 1,
            'electronic devices and circuits': 3,
            'electronic devices and circuit': 3,
            'digital system design': 3,
            'circuit theory': 4,
            'data structure and algorithm': 2,
            'electronics devices lab': 1.5,
            'digital system design lab': 1.5,
            'circuit simulation and pcb design lab': 2,
            'data structure and algorithm lab': 1,
            'industry training': 1,
            'industrial training': 1,
            'sodeca': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'skill development courses': 0,
            'skill development course': 0,
            'probablity and stochastic process': 2,
            'analog electronics': 3,
            'signal and systems': 3,
            'analog and digital communication': 3,
            'microprocessor and microcontroller': 3,
            'electronics measurement and instrumentaion': 2,
            'analog electronics lab': 1.5,
            'python programming lab': 1,
            'analog and digital communication lab': 1.5,
            'microprocessor and microcontroller lab': 1,
            'electronics measurement and instrumentaion lab': 1,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'yoga': 0.5
        },

        /* ── Electrical Engineering — 2nd Year ─────────── */
        'ee': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'advanced engineering mathematics-i': 3,
            'advanced engineering mathematics 1': 3,
            'electrical measurement and instrumentation': 3,
            'generation of electrical power': 2,
            'circuit analysis-i': 3,
            'circuit analysis 1': 3,
            'analog electronics': 2,
            'electrical machine-i': 3,
            'analog electronics lab': 1.5,
            'electrical machine lab-i': 1.5,
            'computer programming lab (c++)': 1.5,
            'electrical circuit design lab': 1.5,
            'industrial training': 1,
            'sodeca': 0.5,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'soft skills training': 0,
            'advanced engineering mathematics-iii': 3,
            'circuit analysis-ii': 3,
            'circuit analysis 2': 3,
            'signal and systems': 2,
            'electrical machine-ii': 3,
            'power electronics': 3,
            'digital electronics': 2,
            'electrical machine lab-ii': 1.5,
            'matlab programming lab': 1.5,
            'digital electronics lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'electrical measurement lab': 1.5,
            'yoga': 0.5
        },

        /* ── Information Technology — 2nd Year ─────────── */
        'it': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'statistics and probability theory': 3,
            'data structures and algorithms': 4,
            'operating system': 3,
            'software engineering and project management': 3,
            'digital electronics': 3,
            'data structures and algorithms lab': 1.5,
            'programming in java lab': 1.5,
            'software engineering lab': 1.5,
            'digital electronics lab': 1.5,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'audit course': 0,
            'discrete mathematics and linear algebra': 3,
            'database management system': 3,
            'theory of computation': 3,
            'computer networks': 3,
            'artificial intelligence': 2,
            'computer architecture and microprocessor': 2,
            'database systems lab': 1.5,
            'network programming lab': 1.5,
            'web development lab': 1.5,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'data analytics and visualization lab': 1.5,
            'yoga': 0.5
        },

        /* ── Mechanical Engineering — 2nd Year ─────────── */
        'me': {
            'managerial economics and financial accounting': 1,
            'technical communication': 1,
            'higher engineering mathematics': 3,
            'engineering mechanics': 3,
            'engineering thermodynamics': 3,
            'mechanics of solids': 4,
            'mechanics of solid': 4,
            'materials science and engineering': 3,
            'basic mechanical engineering lab': 1.5,
            'computer aided design lab': 1.5,
            'materials testing lab': 1.5,
            'programming using matlab': 1.5,
            'industrial training': 1,
            'social outreach, discipline and extra curricular activities': 0.5,
            'technical training': 0,
            'soft skills training': 0,
            'data analytics': 3,
            'data analytic': 3,
            'digital electronics': 2,
            'fluid mechanics and fluid machines': 4,
            'fluid mechanics and fluid machine': 4,
            'manufacturing processes': 3,
            'theory of machines': 4,
            'theory of machine': 4,
            'digital electronics lab': 1,
            'fluid mechanics and hydraulic machines lab': 1.5,
            'production engineering lab': 2,
            'sports-i': 0.5,
            'sport-i': 0.5,
            'sports i': 0.5,
            'sport i': 0.5,
            'sports ii': 0.5,
            'sport ii': 0.5,
            'sports-ii': 0.5,
            'sport-ii': 0.5,
            'national service scheme (nss)': 0.5,
            'national service scheme': 0.5,
            'national cadet corps (ncc)': 0.5,
            'national cadet corps': 0.5,
            'national cadet corp': 0.5,
            'physical education, health and sports': 0.5,
            'physical education, health and sport': 0.5,
            'physical education, health & sports': 0.5,
            'physical education, health & sport': 0.5,
            'corporate social responsibilities': 0.5,
            'financial literacy': 0.5,
            'financial statements analysis': 0.5,
            'psychology for everyday living': 0.5,
            'french': 0.5,
            'mandarin chinese': 0.5,
            'japanese': 0.5,
            'german': 0.5,
            'spanish': 0.5,
            'logical reasoning': 0.5,
            'business communication and presentation skills': 0.5,
            'business communication and presentation skill': 0.5,
            'business communication & presentation skills': 0.5,
            'business communication & presentation skill': 0.5,
            'public speaking': 0.5,
            'entrepreneurship development': 0.5,
            'tinkering & elements of design': 0.5,
            'tinkering and elements of design': 0.5,
            'fostering social responsibility and community engagement': 0.5,
            'fostering social responsibility & community engagement': 0.5,
            'sketching & rendering': 0.5,
            'sketching and rendering': 0.5,
            'theatre': 0.5,
            'dance': 0.5,
            'yoga': 0.5,
            'digital film making': 0.5,
            'music': 0.5,
            'art of happiness': 0.5,
            'satkaam: preparing from campus to corporate life': 0.5,
            'satkaam preparing from campus to corporate life': 0.5,
            'theory of machines lab': 1.5,
            'yoga': 0.5
        }

    };

    /* ── Normalize subject name for credit lookup ────────── */
    function normalizeAutoSubject(name) {
        if (!name) return '';
        return name
            .replace(/\n/g, ' ')          // fix PDF line-wrap splits
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')         // collapse multiple spaces
            .replace(/ & /g, ' and ')     // ampersand variants
            .replace(/\s*-\s*/g, '-')    // spaces around hyphens
            .replace(/[.,]+$/, '')         // trailing punctuation
            .replace(/\s*\/\s*/g, '/');  // slash spacing variants
    }

    function partialMatchAuto(map, key) {
        var words = key.split(' ');
        for (var i = 0; i < 3; i++) {
            if (words.length <= 2) break;
            words.pop();
            var partial = words.join(' ');
            if (partial in map) return map[partial];
        }
        return null;
    }

    /* ── Credit lookup — branch specific ────────────────── */
    function lookupAutoCredits(subjectName, branch) {
        var map = AUTO_CREDIT_MAPS[branch];
        if (!map) return null;
        var key = normalizeAutoSubject(subjectName);

        // 1. Exact match
        if (key in map) return map[key];

        // 2. Singular variant (strip trailing s from last word)
        var singular = null;  // declared here so step 4 can safely reference it
        var words = key.split(' ');
        var last  = words[words.length - 1];
        if (last.length > 2 && last.endsWith('s') && !last.endsWith('ss')) {
            var singWords = words.slice();
            singWords[singWords.length - 1] = last.slice(0, -1);
            singular = singWords.join(' ');
            if (singular in map) return map[singular];
        }

        // 3. Partial match on exact key
        var partial = partialMatchAuto(map, key);
        if (partial !== null) return partial;

        // 4. Partial match on singular key (only if singular was computed)
        if (singular !== null) {
            var partialSing = partialMatchAuto(map, singular);
            if (partialSing !== null) return partialSing;
        }

        return null;
    }

    /* ── Grade label from grade point ───────────────────── */
    function getAutoGradeLabel(gradePoint) {
        if (gradePoint === 10) return 'O';
        if (gradePoint === 9)  return 'A+';
        if (gradePoint === 8)  return 'A';
        if (gradePoint === 7)  return 'B+';
        if (gradePoint === 6)  return 'B';
        if (gradePoint === 5)  return 'C';
        if (gradePoint === 4)  return 'D';
        if (gradePoint === 0)  return 'F';
        return '—';
    }

    /* ── Error helpers ───────────────────────────────────── */
    function showAutoError(msg) {
        var banner = document.getElementById('auto-error-banner');
        var text   = document.getElementById('auto-error-text');
        if (text)   text.textContent = msg;
        if (banner) banner.classList.add('visible');
    }

    function clearAutoError() {
        var banner = document.getElementById('auto-error-banner');
        if (banner) banner.classList.remove('visible');
    }

    /* ── Show autonomous results state ──────────────────── */
    function showAutoResults() {
        ['upload', 'loading', 'results'].forEach(function (s) {
            var el = document.getElementById('sgpa-' + s + '-state');
            if (el) el.classList.add('hidden');
        });
        var autoEl = document.getElementById('auto-results-state');
        if (autoEl) autoEl.classList.remove('hidden');
        window.scrollTo({ top: 0 });
    }

    /* ── Client-side rate limit hint (mirrors server-side KV limit of 5/day) ─── */
    function checkAutoRateLimit() {
        var today = new Date().toISOString().slice(0, 10);
        var raw   = localStorage.getItem('bw-auto-usage');
        var usage = { date: '', count: 0 };
        try { if (raw) usage = JSON.parse(raw); } catch (e) { usage = { date: '', count: 0 }; }
        if (usage.date !== today) usage = { date: today, count: 0 };
        return usage;
    }

    function incrementAutoRateLimit() {
        var today = new Date().toISOString().slice(0, 10);
        var raw   = localStorage.getItem('bw-auto-usage');
        var usage = { date: today, count: 0 };
        try { if (raw) usage = JSON.parse(raw); } catch (e) { usage = { date: today, count: 0 }; }
        if (usage.date !== today) usage = { date: today, count: 0 };
        usage.count = usage.count + 1;
        localStorage.setItem('bw-auto-usage', JSON.stringify(usage));
    }

    /* ── Update the "X of 3 remaining" counter in the upload zone ── */
    function updateAutoCounter() {
        var el = document.getElementById('auto-ai-counter');
        if (!el) return;
        var LIMIT   = 3;
        var usage   = checkAutoRateLimit();
        var used    = usage.count;
        var remaining = Math.max(0, LIMIT - used);
        el.classList.remove('warn', 'exhausted');
        if (remaining === 0) {
            el.textContent = 'Daily limit reached — resets at midnight';
            el.classList.add('exhausted');
        } else if (remaining === 1) {
            el.textContent = remaining + ' of ' + LIMIT + ' AI analyses remaining today';
            el.classList.add('warn');
        } else {
            el.textContent = remaining + ' of ' + LIMIT + ' AI analyses remaining today';
        }
    }

    /* ── Gemini API call ─────────────────────────────────── */
    async function callGeminiAPI(rawText) {
        var prompt =
            'You are a data extraction tool. Extract student result data from the following raw text from a SKIT (Swami Keshvanand Institute of Technology) result PDF.\n\n' +
            'Return ONLY a valid JSON object. No explanation, no markdown, no code blocks. Just the raw JSON.\n\n' +
            'The JSON must have this exact structure:\n' +
            '{\n' +
            '  "studentName": "string",\n' +
            '  "fatherName": "string",\n' +
            '  "rollNo": "string",\n' +
            '  "subjects": [\n' +
            '    {\n' +
            '      "name": "string",\n' +
            '      "courseCode": "string",\n' +
            '      "ise": number or null,\n' +
            '      "see": number or null,\n' +
            '      "total": number or null,\n' +
            '      "remarks": "PASS" or "FAIL"\n' +
            '    }\n' +
            '  ]\n' +
            '}\n\n' +
            'Rules:\n' +
            '- studentName: extract from "Name :" field\n' +
            '- fatherName: extract from "Father\'s Name :" field\n' +
            '- rollNo: extract from "Roll No. :" field\n' +
            '- For each subject row between the table header and "Instruction :" line:\n' +
            '  - name: the course title in UPPERCASE with all spelling mistakes corrected (e.g. "INDUSTIAL" becomes "INDUSTRIAL", "INSTRUMENTAION" becomes "INSTRUMENTATION", "PROBABLITY" becomes "PROBABILITY")\n' +
            '  - courseCode: the course code (alphanumeric code after the course title)\n' +
            '  - ise: the internal marks number, or null if "----", "--", or missing\n' +
            '  - see: the external marks number, or null if "----", "--", or missing\n' +
            '  - total: the total marks number, or null if missing\n' +
            '  - remarks: "PASS" or "FAIL" as it appears in the row\n' +
            '- If a subject has only one numeric value and no clear ISE/SEE split, set ise and see to null and put the number in total\n' +
            '- Include ALL subjects including SOFT SKILL TRAINING and YOGA\n' +
            '- Do not include the header row as a subject\n\n' +
            'Raw PDF text:\n' + rawText;

        var response = await fetch(GEMINI_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0
                }
            })
        });

        if (!response.ok) {
            var errBody = '';
            try { errBody = await response.text(); } catch(e) {}
            // Server-side rate limit (from Cloudflare Worker)
            if (response.status === 429) {
                var retryAfter = response.headers.get('Retry-After') || '';
                var waitMsg = retryAfter && parseInt(retryAfter, 10) > 60
                    ? 'Daily limit reached. Try again tomorrow.'
                    : 'AI service is busy. Please wait 60 seconds and try again.';
                throw new Error('RATE_LIMITED:' + waitMsg);
            }
            // Origin blocked by Worker
            if (response.status === 403) {
                throw new Error('BLOCKED:Access denied. Please use BunkWise from the official website.');
            }
            // Payload too large
            if (response.status === 413) {
                throw new Error('TOO_LARGE:PDF is too large for AI analysis. Please upload a single-semester result PDF.');
            }
            throw new Error('Gemini API error ' + response.status + ': ' + errBody);
        }

        var json = await response.json();
        var text = json.candidates &&
                   json.candidates[0] &&
                   json.candidates[0].content &&
                   json.candidates[0].content.parts &&
                   json.candidates[0].content.parts[0] &&
                   json.candidates[0].content.parts[0].text;

        if (!text) throw new Error('Gemini returned empty response');

        // Strip any markdown fences that may appear despite responseMimeType
        text = text.replace(/^```json\s*/i, '').replace(/```\s*$/,'').trim();

        var parsed = JSON.parse(text);
        return parsed;
    }

    /* ── Compute autonomous SGPA ─────────────────────────── */
    function computeAutoSGPA(geminiData) {
        var sumCreditPoints = 0, sumCredits = 0, sumMarks = 0;
        var overallFail = false;

        var enriched = geminiData.subjects.map(function (s) {
            // Normalize name for display — replace \n with space
            var cleanName = s.name ? s.name.replace(/\n/g, ' ').trim() : '—';

            // Total marks — use provided total, or sum ise+see if total is null
            var total = null;
            if (s.total !== null && s.total !== undefined) {
                total = s.total;
            } else if (s.ise !== null && s.ise !== undefined &&
                       s.see !== null && s.see !== undefined) {
                total = s.ise + s.see;
            } else if (s.ise !== null && s.ise !== undefined) {
                total = s.ise;
            } else if (s.see !== null && s.see !== undefined) {
                total = s.see;
            }

            sumMarks += (total !== null ? total : 0);

            // Grade point
            var gradePoint, grade;
            if (s.remarks === 'FAIL') {
                gradePoint = 0;
                grade      = 'F';
                overallFail = true;
            } else if (total === null) {
                gradePoint = null;
                grade      = '—';
            } else {
                gradePoint = Math.ceil(total / 10);
                // Cap at 2
                if (gradePoint > 10) gradePoint = 10;
                grade = getAutoGradeLabel(gradePoint);
            }

            // Credits — branch specific
            var credits = lookupAutoCredits(cleanName, AUTO_STATE.branch);

            // Credit points — only if credits > 0 and gradePoint not null
            var creditPoints = null;
            if (gradePoint !== null && credits !== null && credits > 0) {
                creditPoints     = parseFloat((gradePoint * credits).toFixed(2));
                sumCreditPoints += creditPoints;
                sumCredits      += credits;
            }

            return {
                name:         cleanName,
                courseCode:   s.courseCode || '—',
                ise:          (s.ise  !== null && s.ise  !== undefined) ? s.ise  : null,
                see:          (s.see  !== null && s.see  !== undefined) ? s.see  : null,
                total:        total,
                remarks:      s.remarks || 'PASS',
                gradePoint:   gradePoint,
                grade:        grade,
                credits:      credits,
                creditPoints: creditPoints
            };
        });

        var sgpa = sumCredits > 0
            ? parseFloat((sumCreditPoints / sumCredits).toFixed(2))
            : null;

        return {
            studentName:        geminiData.studentName || '—',
            fatherName:         geminiData.fatherName  || '—',
            rollNo:             geminiData.rollNo      || '—',
            remarks:            overallFail ? 'FAIL' : 'PASS',
            subjects:           enriched,
            sgpa:               sgpa,
            totalMarks:         sumMarks,
            maxMarks:           geminiData.subjects.length * 100,
            totalGP:            parseFloat(sumCreditPoints.toFixed(2)),
            totalCredits:       parseFloat(sumCredits.toFixed(1)),
            totalCreditPoints:  parseFloat(sumCreditPoints.toFixed(2))
        };
    }

    /* ── Render autonomous results ───────────────────────── */
    function renderAutoResults(data) {
        document.getElementById('auto-name').textContent   = data.studentName;
        document.getElementById('auto-father').textContent = data.fatherName;
        document.getElementById('auto-roll').textContent   = data.rollNo;

        var remEl = document.getElementById('auto-remarks');
        remEl.textContent = data.remarks;
        remEl.className   = 'sgpa-remarks ' + (data.remarks === 'PASS' ? 'pass' : 'fail');

        var tbody = document.getElementById('auto-tbody');
        tbody.innerHTML = '';

        data.subjects.forEach(function (s, i) {
            var tr = document.createElement('tr');
            if (s.remarks === 'FAIL') tr.classList.add('row-fail');

            var gradeClass  = (s.grade === 'F') ? 'grade-fail' : 'grade-pass';
            var creditsCell = (s.credits !== null)
                ? s.credits
                : '<span class="credits-unknown">—</span>';
            var cpCell      = (s.creditPoints !== null)
                ? s.creditPoints.toFixed(2)
                : '<span class="credits-unknown">—</span>';

            tr.innerHTML =
                '<td>' + (i + 1) + '</td>' +
                '<td class="col-subject">' + s.name + '</td>' +
                '<td>' + (s.ise   !== null ? s.ise   : '—') + '</td>' +
                '<td>' + (s.see   !== null ? s.see   : '—') + '</td>' +
                '<td>' + (s.total !== null ? s.total : '—') + '</td>' +
                '<td><span class="grade-cell ' + gradeClass + '">' + s.grade + '</span></td>' +
                '<td>' + creditsCell + '</td>' +
                '<td>' + cpCell + '</td>';

            tbody.appendChild(tr);
        });

        document.getElementById('auto-value').textContent         = data.sgpa !== null ? data.sgpa.toFixed(2) : '—';
        document.getElementById('auto-total-marks').textContent   = data.totalMarks;
        document.getElementById('auto-max-marks').textContent     = data.maxMarks;
        document.getElementById('auto-total-gp').textContent      = data.totalGP.toFixed(2);
        document.getElementById('auto-total-credits').textContent = data.totalCredits;
        document.getElementById('auto-total-cp').textContent      = data.totalCreditPoints.toFixed(2);
    }

    /* ── Generate autonomous PDF report ─────────────────── */
    async function generateAutoReportPDF() {
        var data = AUTO_STATE.data;
        if (!data) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js');
            } catch (e) {
                alert('PDF generation library not loaded. Please check your connection and try again.');
                return;
            }
        }

        var jsPDF = window.jspdf.jsPDF;
        var doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        var pageW = doc.internal.pageSize.getWidth();

        // Header band
        doc.setFillColor(9, 13, 20);
        doc.rect(0, 0, pageW, 30, 'F');
        doc.setTextColor(232, 237, 248);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('SWAMI KESHVANAND INSTITUTE OF TECHNOLOGY — JAIPUR', pageW / 2, 13, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(125, 139, 170);
        doc.text('Autonomous SGPA Result Analysis  •  Generated by BunkWise', pageW / 2, 22, { align: 'center' });

        // Student info band
        doc.setFillColor(15, 21, 32);
        doc.rect(0, 30, pageW, 22, 'F');

        var fields = [
            { label: 'STUDENT NAME',  value: data.studentName, x: 14  },
            { label: "FATHER'S NAME", value: data.fatherName,  x: 90  },
            { label: 'ROLL NUMBER',   value: data.rollNo,      x: 176 },
            { label: 'REMARKS',       value: data.remarks,     x: 235, coloured: true }
        ];
        fields.forEach(function (f) {
            doc.setFontSize(6.5);
            doc.setTextColor(61, 77, 106);
            doc.setFont('helvetica', 'normal');
            doc.text(f.label, f.x, 37);
            if (f.coloured) {
                var isPass = data.remarks === 'PASS';
                doc.setTextColor(isPass ? 30 : 240, isPass ? 180 : 68, isPass ? 100 : 85);
            } else {
                doc.setTextColor(220, 228, 245);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(String(f.value), f.x, 46);
        });

        var tableBody = data.subjects.map(function (s, i) {
            return [
                i + 1,
                s.name,
                s.ise   !== null ? s.ise   : '—',
                s.see   !== null ? s.see   : '—',
                s.total !== null ? s.total : '—',
                s.grade,
                s.credits      !== null ? s.credits                    : '—',
                s.creditPoints !== null ? s.creditPoints.toFixed(2)    : '—'
            ];
        });

        doc.autoTable({
            startY: 56,
            head: [['#', 'Subject Name', 'Internal', 'External', 'Total', 'Grade', 'Credits', 'Credit Pts']],
            body: tableBody,
            foot: [[
                { content: 'SGPA  ' + (data.sgpa !== null ? data.sgpa.toFixed(2) : '—'), colSpan: 2, styles: { fontStyle: 'bold', fontSize: 11, textColor: [77, 138, 240], halign: 'left' } },
                { content: 'Total Marks: ' + data.totalMarks + ' / ' + data.maxMarks, colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'GP: ' + data.totalGP.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } },
                { content: '', styles: {} },
                { content: 'Cr: ' + data.totalCredits, styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'CP: ' + data.totalCreditPoints.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } }
            ]],
            styles:             { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }, textColor: [30, 35, 50], fillColor: [255, 255, 255], lineColor: [200, 210, 225], lineWidth: 0.2 },
            headStyles:         { fillColor: [240, 243, 250], textColor: [80, 95, 120], fontSize: 7, fontStyle: 'bold', halign: 'center', lineColor: [200, 210, 225] },
            footStyles:         { fillColor: [240, 243, 250], textColor: [80, 95, 120], fontSize: 8, lineColor: [200, 210, 225] },
            alternateRowStyles: { fillColor: [248, 250, 253] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 'auto', halign: 'left' },
                2: { halign: 'center', cellWidth: 22 },
                3: { halign: 'center', cellWidth: 22 },
                4: { halign: 'center', cellWidth: 18 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'center', cellWidth: 18 },
                7: { halign: 'center', cellWidth: 24 }
            },
            didParseCell: function (hookData) {
                if (hookData.section === 'body' && hookData.column.index === 5) {
                    if (hookData.cell.raw === 'F') {
                        hookData.cell.styles.textColor  = [200, 40, 55];
                        hookData.cell.styles.fontStyle  = 'bold';
                        hookData.cell.styles.fillColor  = [255, 235, 235];
                    } else {
                        hookData.cell.styles.textColor  = [30, 100, 200];
                        hookData.cell.styles.fontStyle  = 'bold';
                    }
                }
                if (hookData.section === 'body' && hookData.row.raw && hookData.row.raw[5] === 'F' && hookData.column.index !== 5) {
                    hookData.cell.styles.textColor = [160, 60, 70];
                }
            },
            margin: { left: 12, right: 12 }
        });

        var finalY = (doc.lastAutoTable || {}).finalY || 200;
        doc.setFontSize(6.5);
        doc.setTextColor(140, 150, 170);
        doc.setFont('helvetica', 'italic');
        doc.text('* Subjects with credits shown as — are excluded from SGPA calculation. This report is for reference only. Always verify with official mark-sheet.', 12, finalY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by BunkWise — Autonomous SGPA Report', pageW - 12, finalY + 6, { align: 'right' });

        doc.save('SGPA_AUTO_' + (data.rollNo !== '—' ? data.rollNo : 'report') + '.pdf');
    }

    /* ── Handle autonomous file upload ──────────────────── */
    async function handleAutoFile(file) {
        var zone = document.getElementById('auto-upload-zone');
        var hint = document.getElementById('auto-hint');

        clearAutoError();
        zone.classList.remove('success', 'error-state');

        // ── Branch validation ──
        if (!AUTO_STATE.branch) {
            showAutoError('Please select your branch before uploading.');
            return;
        }

        // ── PDF size check (5 MB hard limit before any processing) ──
        var MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
        if (file.size > MAX_PDF_BYTES) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ File too large.';
            showAutoError('PDF is too large (' + (file.size / (1024*1024)).toFixed(1) + ' MB). Maximum allowed size is 5 MB. Please upload your single-semester result PDF only.');
            return;
        }

        // ── Client-side rate limit hint (real enforcement is server-side) ──
        var usage = checkAutoRateLimit();
        if (usage.count >= 3) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Daily limit reached.';
            showAutoError('Daily limit reached. You can analyse 3 results per day. Try again tomorrow.');
            return;
        }

        // ── Validate PDF extension ──
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Please upload a PDF file.';
            showAutoError('Only PDF files are supported. Please upload a valid SKIT autonomous result PDF.');
            return;
        }

        showSGPAState('loading');
        setSGPALoadingMsg('Reading PDF file…');

        try {
            var arrayBuffer = await new Promise(function (resolve, reject) {
                var reader = new FileReader();
                reader.onload  = function (e) { resolve(e.target.result); };
                reader.onerror = function () { reject(new Error('FileReader failed')); };
                reader.readAsArrayBuffer(file);
            });

            setSGPALoadingMsg('Extracting text from PDF…');
            var fullText = await extractPDFText(arrayBuffer);

            setSGPALoadingMsg('Analysing result with AI…');
            var geminiData = await callGeminiAPI(fullText);

            if (!geminiData || !geminiData.subjects || !geminiData.subjects.length) {
                showSGPAState('upload');
                showAutoError('No subjects found in this PDF. Please upload a valid SKIT autonomous result PDF.');
                return;
            }

            setSGPALoadingMsg('Computing SGPA…');
            var result = computeAutoSGPA(geminiData);

            AUTO_STATE.data = result;

            setSGPALoadingMsg('Rendering results…');
            renderAutoResults(result);
            showAutoResults();

            // Increment rate limit counter only on success
            incrementAutoRateLimit();
            updateAutoCounter();

        } catch (err) {
            console.error('[AUTO] Error:', err);
            showSGPAState('upload');
            var msg = err && err.message ? err.message : '';
            if (msg.indexOf('RATE_LIMITED:') === 0) {
                zone.classList.add('error-state');
                hint.textContent = '⚠ Limit reached.';
                showAutoError(msg.slice('RATE_LIMITED:'.length));
            } else if (msg.indexOf('BLOCKED:') === 0) {
                showAutoError(msg.slice('BLOCKED:'.length));
            } else if (msg.indexOf('TOO_LARGE:') === 0) {
                zone.classList.add('error-state');
                hint.textContent = '⚠ File too large.';
                showAutoError(msg.slice('TOO_LARGE:'.length));
            } else if (msg.indexOf('Gemini API error') !== -1) {
                showAutoError('AI analysis failed. Please check your connection and try again.');
            } else if (msg.indexOf('Gemini returned empty') !== -1) {
                showAutoError('AI returned no response. The PDF may be too complex or the AI service is temporarily unavailable. Please try again in a moment.');
            } else if (msg.indexOf('JSON') !== -1) {
                showAutoError('Could not read result. The PDF may not be a valid SKIT result. Try again.');
            } else if (msg.indexOf('fetch') !== -1 || msg.indexOf('network') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
                showAutoError('No internet connection detected. Please check your network and try again.');
            } else {
                showAutoError('Could not process this PDF. Please ensure it is a valid SKIT autonomous result PDF.');
            }
        }
    }

    /* ══════════════════════════════════════════════════════
       CW (CLASS WISE) PAGE
       All code below only activates when cw.html
       is loaded (detected by presence of #btn-cw-paste).
    ══════════════════════════════════════════════════════ */

    /* ── State ───────────────────────────────────────────── */
    var CW_STATE = {
        subjects:     [],   // same structure as ATT_STATE.subjects
        classesInput: 0,    // integer — positive = attend more, negative = skip
    };

    /* ── Internal section switch (paste ↔ results) ───────── */
    function showCWSection(id) {
        var paste   = document.getElementById('page-cw-paste');
        var results = document.getElementById('page-cw-results');
        var fab     = document.getElementById('cw-fab-pen');
        if (!paste || !results) return;

        if (id === 'results') {
            paste.classList.add('hidden');
            paste.classList.remove('in');
            results.classList.remove('hidden');
            void results.offsetWidth;
            results.classList.add('in');
            if (fab) fab.classList.add('visible');
        } else {
            results.classList.add('hidden');
            results.classList.remove('in');
            paste.classList.remove('hidden');
            void paste.offsetWidth;
            paste.classList.add('in');
            if (fab) fab.classList.remove('visible');
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

        var ext = file.name.split('.').pop().toLowerCase();
        if (['csv', 'xlsx', 'xls'].indexOf(ext) === -1) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Unsupported file type. Please upload a .csv or .xlsx file.';
            return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
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

        document.getElementById('cw-btn-decrease').addEventListener('click', function () {
            CW_STATE.classesInput--;
            updateCWDisplay();
            bumpCW();
            renderCWMain();
        });

        document.getElementById('cw-btn-increase').addEventListener('click', function () {
            CW_STATE.classesInput++;
            updateCWDisplay();
            bumpCW();
            renderCWMain();
        });

        // ── Share button ──
        var btnShareCw = document.getElementById('btn-share-cw');
        if (btnShareCw) {
            btnShareCw.addEventListener('click', function () { handleShare(btnShareCw); });
        }
    }

    /* ══════════════════════════════════════════════════════
       DOM READY — wire everything
    ══════════════════════════════════════════════════════ */
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

        // ── SHARED: theme toggle (visible only on index.html) ──
        var themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            var currentFile = (window.location.pathname.split('/').pop() || 'index.html');
            if (currentFile === '' || currentFile === 'index.html') {
                themeToggle.classList.add('visible');
            }
            themeToggle.addEventListener('click', function () { toggleTheme(themeToggle); });
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

        // ── SGPA page ──
        initSGPAPage();

        // ── CW page ──
        initCWPage();
    });

}());