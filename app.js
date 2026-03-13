(function () {
    'use strict';

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
    }

    /* ══════════════════════════════════════════════════════
       SGPA PAGE
       All code below only activates when sgpa.html
       is loaded (detected by presence of #btn-sgpa-upload).
    ══════════════════════════════════════════════════════ */

    var SGPA_STATE = { data: null };

    var GRADE_POINTS = {
        'A++': 10, 'A+': 9, 'A': 8.5,
        'B+': 8,  'B': 7.5,
        'C+': 7,  'C': 6.5,
        'D+': 6,  'D': 5.5,
        'E+': 5,  'E': 4,
        'F':  0,
    };

    var SEM_TO_CREDITS = [
        { 'Engineering Mathematics-I': 4, 'Engineering Chemistry': 4, 'Human Values': 2, 'Programming for Problem Solving': 2, 'Basic Civil Engineering': 2, 'Engineering Chemistry Lab': 1, 'Human Values Activities': 1, 'Computer Programming Lab': 1.5, 'Basic Civil Engineering Lab': 1, 'Computer Aided Engineering Graphics': 1.5, 'DECA': 0.5 },
        { 'Engineering Mathematics-II': 4, 'Engineering Physics': 4, 'Communication Skills': 2, 'Basic Mechanical Engineering': 2, 'Basic Electrical Engineering': 2, 'Engineering Physics Lab': 1, 'Language Lab': 1, 'Manufacturing Practices Workshop': 1.5, 'Basic Electrical Engineering Lab': 1, 'Computer Aided Machine Drawing': 1.5, 'DECA': 0.5 },
        { 'Advanced Engineering Mathematics': 3, 'Managerial Economics & Financial Accounting': 2, 'Technical Communication': 2, 'Digital Electronics': 3, 'Data Structures and Algorithms': 3, 'Object Oriented Programming': 3, 'Software Engineering': 3, 'Data Structures and Algorithms Lab': 1.5, 'Object Oriented Programming Lab': 1.5, 'Software Engineering Lab': 1.5, 'Digital Electronics Lab': 1.5 },
        { 'Discrete Mathematics Structure': 3, 'Technical Communication': 2, 'Managerial Economics & Financial Accounting': 2, 'Microprocessor & Interfaces': 3, 'Database Management System': 3, 'Theory of Computation': 3, 'Data Communication and Computer Networks': 3, 'Microprocessor & Interfaces Lab': 1, 'Database Management System Lab': 1.5, 'Network Programming Lab': 1.5, 'Linux Shell Programming Lab': 1, 'Java Lab': 1, 'Social Outreach, Discipline & Extracurricular Activities': 0.5 },
        { 'Information Theory & Coding': 2, 'Compiler Design': 3, 'Operating System': 3, 'Computer Graphics & Multimedia': 3, 'Analysis of Algorithms': 3, 'Human Computer Interaction': 2, 'Computer Graphics & Multimedia Lab': 1, 'Compiler Design Lab': 1, 'Analysis of Algorithms Lab': 1, 'Advance Java Lab': 1, 'Industrial Training': 2.5, 'Social Outreach, Discipline & Extracurricular Activities': 0.5 },
        { 'Digital Image Processing': 2, 'Machine Learning': 3, 'Information Security System': 2, 'Computer Architecture and Organization': 3, 'Artificial Intelligence': 2, 'Cloud Computing': 3, 'Distributed Systems': 2, 'Digital Image Processing Lab': 1.5, 'Machine Learning Lab': 1.5, 'Python Lab': 1.5, 'Mobile App Development Lab': 1.5, 'Social Outreach, Discipline & Extracurricular Activities': 0.5 },
        { 'Internet of Things': 3, 'Open Elective - I': 3, 'Internet of Things Lab': 2, 'Cyber Security Lab': 2, 'Industrial Training': 2.5, 'Seminar': 2, 'Social Outreach, Discipline & Extracurricular Activities': 0.5 },
        { 'Big Data Analytics': 3, 'Open Elective - II': 3, 'Big Data Analytics Lab': 1, 'Software Testing and Validation Lab': 1, 'Project': 7, 'Social Outreach, Discipline & Extracurricular Activities': 0.5 },
    ];

    // Flatten all semesters into one lowercase lookup map (first occurrence wins)
    var CREDIT_MAP = (function () {
        var map = {};
        SEM_TO_CREDITS.forEach(function (sem) {
            Object.keys(sem).forEach(function (subject) {
                var key = subject.toLowerCase().trim();
                if (!(key in map)) map[key] = sem[subject];
            });
        });
        return map;
    }());

    function lookupCredits(subjectName) {
        if (!subjectName) return null;
        var key = subjectName.toLowerCase().trim();
        return (key in CREDIT_MAP) ? CREDIT_MAP[key] : null;
    }

    async function extractPDFText(arrayBuffer) {
        var pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js not loaded');
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
            var credits      = lookupCredits(s.name);
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

    function generateReportPDF() {
        var data = SGPA_STATE.data;
        if (!data) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF generation library not loaded. Please check your internet connection and try again.');
            return;
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
    });

}());
