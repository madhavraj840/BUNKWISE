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
{
'Engineering Mathematics-I': 4,
'Engineering Physics': 4,
'Engineering Chemistry': 4,
'Communication Skills': 2,
'Human Values': 2,
'Programming for Problem Solving': 2,
'Basic Mechanical Engineering': 2,
'Basic Electrical Engineering': 2,
'Basic Civil Engineering': 2,
'Engineering Physics Lab': 1,
'Engineering Chemistry Lab': 1,
'Language Lab': 1,
'Human Values Activities': 1,
'Computer Programming Lab': 1.5,
'Manufacturing Practices Workshop': 1.5,
'Basic Electrical Engineering Lab': 1,
'Basic Civil Engineering Lab': 1,
'Computer Aided Engineering Graphics': 1.5,
'Computer Aided Machine Drawing': 1.5,
'Engineering Mathematics-II': 4,

'Advance Engineering Mathematics -I': 3,
'Advanced Engineering Mathematics-I': 3,
'Advanced Engineering Mathematics': 3,
'Advance Mathematics': 3,
'Advance Engineering Mathematics -II': 2,
'Advanced Engineering Mathematics-II': 3,

'Technical Communication': 2,
'Managerial Economics & Financial Accounting': 2,
'Managerial Economics and Financial Accounting': 2,

'Engineering Mechanics': 2,
'Surveying': 3,
'Fluid Mechanics': 2,
'Building Materials and Construction': 3,
'Engineering Geology': 2,
'Surveying Lab': 1.5,
'Fluid Mechanics Lab': 1,
'Computer Aided Civil Engineering Drawing': 1.5,
'Civil Engineering Maretials Lab': 1,
'Geolgy Lab': 1,

'Basic Electronics for Civil Engineering Applications': 2,
'Strength of Materials': 3,
'Hydraulics Engineering': 3,
'Building Planning': 2,
'Concrete Technology': 3,
'Material Testing Lab': 1,
'Hydraulics Engineering Lab': 1,
'Building Drawing': 1.5,
'Advanced Surveying Lab': 1,
'Concrete Lab': 1.5,

'Construction Technology & Equipments': 2,
'Structural Analysis-I': 2,
'Design of Concrete Structures': 3,
'Geotechnical Engineering': 3,
'Water Resource Engineering': 2,
'Air & Noise Pollution and Control': 2,
'Disaster Management': 2,
'Town Planning': 2,
'Repair and Rehabilitation of Structures': 2,
'Ground Improvement Techniques': 2,
'Energy Science & Engineering': 2,
'Concrete Structures Design': 1.5,
'Geotechnical Engineering Lab': 1.5,
'Water Resource Engineering Design': 1,

'Wind & Seismic Analysis': 2,
'Structural Analysis-II': 3,
'Environmental Engineering': 3,
'Design of Steel Structures': 3,
'Estimating & Costing': 2,
'Pre-stressed Concrete': 2,
'Solid and Hazardous Waste Management': 2,
'Traffic Engineering and Management': 2,
'Bridge Engineering': 2,
'Rock Engineering': 2,
'Geographic Information System & Remote Sensing': 2,
'Environmental Engineering Design and Lab': 1.5,
'Steel Structure Design': 1.5,
'Quantity Surveying and Valuation': 1,
'Water and Earth Retaining Structures Design': 1,
'Foundation Design': 1,

'Transportation Engineering': 3,
'Open Elective-I': 3,
'Open Elective - I': 3,
'OpenElective–I': 3,

'Road Material Testing Lab': 1,
'Professional Practices & Field Engineering Lab': 1,
'Soft Skills Lab': 1,
'Environmental Monitoring and Design Lab': 1,
'Practical Training': 2.5,
'Seminar': 2,
'SODECA': 0.5,

'Project Planning and Construction Management': 3,
'Open Elective-II': 3,
'Open Elective - II': 3,
'Open Elective–II': 3,

'Project Planning & Construction Management Lab': 1,
'Pavement Design': 1,
'Project': 7,

'Power generation Process': 2,
'Electrical Circuit Analysis': 3,
'Analog Electronics': 3,
'Electrical Machine - I': 3,
'Electromagnetic Field': 2,
'Analog Electronics Lab': 1,
'Electrical Machine-I Lab': 2,
'Electrical circuit design Lab': 2,

'Biology': 2,
'Electronic Measurement & Instrumentation': 2,
'Electrical Machine - II': 3,
'Power Electronics': 3,
'Signals & Systems': 3,
'Digital Electronics': 2,
'Electrical Machine - II Lab': 2,
'Power Electronics Lab': 2,
'Digital Electronics Lab': 1,
'Measurement Lab': 1,

'Electrical Materials': 2,
'Power System - I': 3,
'Control System': 3,
'Microprocessor': 3,
'Electrical Machine Design': 3,
'Restructured Power System': 2,
'Electromagnetic Wave': 2,
'Digital Control System': 2,
'Power System - I Lab': 1,
'Control System Lab': 1,
'Microprocessor Lab': 1,
'System Programming Lab': 1,

'Computer Architecture': 2,
'Power System - II': 3,
'Power System Protection': 3,
'Electrical Energy Conversion and Auditing': 3,
'Electric Drives': 3,
'Power System Planning': 3,
'Digital Signal Processing': 3,
'Electrical and Hybrid Vehicles': 3,
'Power System - II Lab': 2,
'Electric Drives Lab': 2,
'Power System Protection Lab': 1,
'Modelling and simulation lab': 1,

'Wind and Solar Energy Systems': 3,
'Power Quality and FACTS': 3,
'Control System Design': 3,
'Embedded Systems Lab': 2,
'Advance control system lab': 2,

'HVDC Transmission System': 3,
'Line Commutated and active rectifiers': 3,
'Advanced Electric Drives': 3,
'Energy Systems Lab': 2,

'Digital System Design': 3,
'Signal & Systems': 3,
'Network Theory': 4,
'Electronics Devices': 4,
'Electronics Devices Lab': 1,
'Digital System Design Lab': 1,
'Signal Processing Lab': 1,
'Computer Programming Lab-I': 1,

'Analog Circuits': 3,
'Microcontrollers': 3,
'Analog and Digital Communication': 3,
'Analog and Digital Communication Lab': 1.5,
'Analog Circuits Lab': 1.5,
'Microcontrollers Lab': 1.5,
'Electronics Measurement & Instrumentation Lab': 1.5,

'Electromagnetics Waves': 3,
'Control system': 3,
'Microwave Theory & Techniques': 3,
'Bio-Medical Electronics': 2,
'Embedded Systems': 2,
'Probability Theory & Stochastic Process': 2,
'Satellite Communication': 2,
'RF Simulation Lab': 1.5,
'Digital Signal Processing Lab': 1.5,
'Microwave Lab': 1,

'Computer Network': 3,
'Fiber Optics Communications': 3,
'Antennas and Propagation': 3,
'Information theory and coding': 3,
'Introduction to MEMS': 3,
'Nano Electronics': 3,
'Neural Network And Fuzzy Logic Control': 3,
'High Speed Electronics': 3,
'Computer Network Lab': 2,
'Antenna and wave propagation Lab': 1,
'Electronics Design Lab': 2,

'VLSI Design': 3,
'Mixed Signal Design': 3,
'CMOS design': 3,
'VLSI Design Lab': 2,
'Advance communication lab (MATLAB Simulation)': 1,
'Optical Communication Lab': 1,

'Artificial Intelligence And Expert Systems': 3,
'Digital Image and Video Processing': 3,
'Adaptive Signal Processing': 3,
'Internet of Things (IOT) Lab': 1,
'Skill Development Lab': 1,

'Discrete Mathematics Structure': 3,
'Principle of Communication': 3,
'Database Management System': 3,
'Theory of Computation': 3,
'Theory Of Computation': 3,
'Data Communication and Computer Networks': 3,

'Linux Shell Programming Lab': 1,
'Database Management System Lab': 1.5,
'Network Programming Lab': 1.5,
'Java Lab': 1,
'Web Technology Lab': 1,

'Microprocessor And Interfaces': 2,
'Microprocessor & Interfaces': 3,
'Microprocessor & Interfaces Lab': 1,

'Compiler Design': 3,
'Operating System': 3,
'Computer Graphics & Multimedia': 3,
'Analysis of Algorithms': 3,
'Wireless Communication': 2,
'Software Testing and Project Management': 2,
'Bioinformatics': 2,
'Computer Graphics & Multimedia Lab': 1,
'Compiler Design Lab': 1,
'Analysis of Algorithms Lab': 1,
'Advanced Java Lab': 1,
'Advance Java Lab': 1,

'Digital Image Processing': 2,
'Machine Learning': 3,
'Information Security System': 2,
'Computer Architecture and Organization': 3,
'Artificial Intelligence': 2,
'Distributed System': 3,
'Distributed System': 2,
'Information Theory & Coding': 2,
'Cloud Computing': 2,
'Cloud Computing': 3,
'Ecommerce & ERP': 2,
'Ecommerce and ERP': 2,

'Digital Image Processing Lab': 1.5,
'Machine Learning Lab': 1.5,
'Python Lab': 1.5,
'Mobile Application Development Lab': 1.5,

'Big Data Analytics': 3,
'Big Data Analytics Lab': 2,
'Big Data Analytics Lab': 1,
'Cyber Security Lab': 2,

'Internet of Things': 3,
'Internet of Things Lab': 2,
'Internet of Things Lab': 1,
'Software Testing and Validation Lab': 1,

'Data Mining-Concepts and Techniques': 2,
'Fundamentals of Blockchain': 2,
'Fundamentals of Block chain': 2,
'Mathematical Modelling for Data Science': 2,
'Programming for Data Science': 2,
'Data visualization- R Programming/ Power BI': 3,
'Probability and Statistics for Data Science': 2,
'R Programming Lab': 1,

'Principles of Artificial Intelligence': 2,
'Artificial Neural Network': 2,
'Nature Inspired Computing (NLP)': 2,
'Natural Language Processing (NLP)': 2,
'Predictive Modeling and Analytics': 3,

'Data Visualization and Exploration With R': 3,
'Data Visualization And Exploration With R Lab': 2,
'Social Media Analytics Lab': 2,
'IndustrialTraining': 2.5,
'Deep Learning and Its Applications': 3,
'Deep Learning and Its Application Lab': 1,
'Robot Programming Lab': 1,

'Industrial Training': 1,
'Industrial Training': 2.5,
'Social Outreach, Discipline & Extra Curricular Activities': 0.5,
'Social Outreach Discipline & Extra Curricular Activities': 0.5
}
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
    }

    /* ══════════════════════════════════════════════════════
       AUTONOMOUS SGPA PAGE
       All code below only activates when sgpa.html is loaded
       (detected by presence of #btn-auto-upload).
       RTU pipeline above is NOT touched.
    ══════════════════════════════════════════════════════ */

    /* ── State ───────────────────────────────────────────── */
    var AUTO_STATE = { data: null };

    /* ── Gemini API key and model ────────────────────────── */
    var GEMINI_API_KEY   = 'AIzaSyC_lZsLjtl1I1-zyV53VY1bx6G8dQbH-B8';
    var GEMINI_MODEL     = 'gemini-2.0-flash-lite';
    var GEMINI_ENDPOINT  = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                           GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY;

    /* ── Credit map (user-provided revised scheme) ───────── */
    var AUTO_CREDIT_MAP = {
        'engineering mathematics-i': 4,
        'engineering mathematics-ii': 4,
        'advanced engineering mathematics-i': 4,
        'advanced engineering mathematics-ii': 3,
        'advanced engineering mathematics-iii': 3,
        'statistics and probability theory': 3,
        'higher engineering mathematics': 3,
        'linear algebra and numerical analysis': 4,
        'probablity and stochastic process': 2,
        'engineering physics': 4,
        'engineering chemistry': 4,
        'engineering physics lab': 1,
        'engineering chemistry lab': 1,
        'communication skills': 2,
        'universal human values': 2,
        'language lab': 1,
        'universal human values lab': 1,
        'computational thinking and programming': 2,
        'c programming lab': 1,
        'problem solving using object oriented paradigm': 2,
        'object oriented programming lab': 1,
        'data structures and algorithms': 4,
        'data structure and algorithm': 2,
        'data structure and algorithm lab': 1,
        'data structures and algorithms lab': 1.5,
        'operating system': 3,
        'software engineering and project management': 3,
        'software engineering lab': 1.5,
        'theory of computation': 3,
        'database management system': 3,
        'database systems lab': 1.5,
        'computer networks': 3,
        'computer network': 3,
        'network programming lab': 1.5,
        'full stack development': 2,
        'full stack development lab': 1.5,
        'web development lab': 1.5,
        'foundation of data science': 3,
        'python for data science lab': 1.5,
        'foundation of artificial intelligence': 3,
        'artificial intelligence': 2,
        'electronic system for iot': 3,
        'electronic system for iot lab': 1.5,
        'data analytics for iot': 2,
        'data analytics': 3,
        'data analytics and visualization lab': 1.5,
        'programming in java lab': 1.5,
        'logic programming lab': 1.5,
        'r-programming for data science': 1.5,
        'python programming lab': 1,
        'discrete mathematics and linear algebra': 3,
        'computer architecture and microprocessor': 2,
        'computer architecture & microprocessor': 2,
        'microprocessor lab': 1.5,
        'microprocessor and microcontroller': 3,
        'microprocessor and microcontroller lab': 1,
        'managerial economics and financial accounting': 1,
        'technical communication': 1,
        'computer aided engineering graphics': 1.5,
        'computer aided machine drawing': 1.5,
        'strength of materials': 3,
        'surveying': 3,
        'building materials and construction': 3,
        'engineering geology': 3,
        'structural analysis-i': 3,
        'fluid mechanics and hydraulic engineering': 4,
        'concrete technology': 3,
        'environmental engineering': 3,
        'surveying lab': 1.5,
        'professional development lab': 1,
        'geology lab': 1,
        'building planning and drafting lab-i': 1.5,
        'building planning and drafting lab-ii': 1.5,
        'building material testing lab': 1,
        'fluid mechanics and hydraulic engineering lab': 1,
        'concrete lab': 1.5,
        'environmental engineering lab': 1,
        'structural engineering lab': 1,
        'electrical measurement & instrumentation': 3,
        'generation of electrical power': 2,
        'circuit analysis-i': 3,
        'circuit analysis-ii': 3,
        'analog electronics': 2,
        'electrical machine-i': 3,
        'electrical machine-ii': 3,
        'power electronics': 3,
        'signal and systems': 3,
        'analog electronics lab': 1.5,
        'electrical machine lab-i': 1.5,
        'electrical machine lab-ii': 1.5,
        'computer programming lab (c++)': 1.5,
        'electrical circuit design lab': 1.5,
        'matlab programming lab': 1.5,
        'electrical measurement lab': 1.5,
        'electronic devices and circuits': 3,
        'digital system design': 3,
        'circuit theory': 4,
        'electronics devices lab': 1.5,
        'digital system design lab': 1.5,
        'circuit simulation and pcb design lab': 2,
        'analog and digital communication': 3,
        'analog and digital communication lab': 1.5,
        'electronics measurement and instrumentaion': 2,
        'electronics measurement and instrumentaion lab': 1,
        'engineering mechanics': 3,
        'engineering thermodynamics': 3,
        'mechanics of solids': 4,
        'materials science and engineering': 3,
        'fluid mechanics and fluid machines': 4,
        'manufacturing processes': 3,
        'theory of machines': 4,
        'basic mechanical engineering lab': 1.5,
        'computer aided design lab': 1.5,
        'materials testing lab': 1.5,
        'programming using matlab': 1.5,
        'fluid mechanics and hydraulic machines lab': 1.5,
        'production engineering lab': 2,
        'theory of machines lab': 1.5,
        'digital electronics lab': 1.5,
        'digital electronics': 2,
        'basic civil engineering': 2,
        'basic mechanical engineering': 2,
        'basic electrical & electronics engineering': 2,
        'basic electrical & electronics engineering lab': 1,
        'basic civil engineering lab': 1,
        'manufacturing practice workshop': 1,
        'innovation & entrepreneurship': 1,
        'industrial training': 1,
        'industry training': 1,
        'social outreach, discipline & extra curricular activities': 0.5,
        'social outreach, discipline and extra curricular activities': 0.5,
        'social outreach, discipline and extra-curricular activities (sodeca)': 0.5,
        'sodeca': 0.5,
        'audit course': 0,
        'technical training': 0,
        'soft skills training': 0,
        'soft skill training': 0,
        'skill development courses': 0,
        'yoga': 0
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
            .replace(/\s*\/\s*/g, '/');   // slash spacing variants
    }

    /* ── Credit lookup ───────────────────────────────────── */
    function lookupAutoCredits(subjectName) {
        var key = normalizeAutoSubject(subjectName);
        return (key in AUTO_CREDIT_MAP) ? AUTO_CREDIT_MAP[key] : null;
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

    /* ── Rate limit check (2 per day via localStorage) ───── */
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
            '  - name: the course title in UPPERCASE as it appears\n' +
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
                    temperature:      0,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            var errBody = '';
            try { errBody = await response.text(); } catch(e) {}
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
                // Cap at 10
                if (gradePoint > 10) gradePoint = 10;
                grade = getAutoGradeLabel(gradePoint);
            }

            // Credits
            var credits = lookupAutoCredits(cleanName);

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
    function generateAutoReportPDF() {
        var data = AUTO_STATE.data;
        if (!data) return;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF generation library not loaded. Please check your connection and try again.');
            return;
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

        // ── Rate limit check ──
        var usage = checkAutoRateLimit();
        if (usage.count >= 2) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Daily limit reached.';
            showAutoError('Daily limit reached. You can check 2 results per day. Try again tomorrow.');
            return;
        }

        // ── Validate PDF extension ──
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Please upload a PDF file.';
            showAutoError('Only PDF files are supported. Please upload a valid SKIT autonomous result PDF.');
            return;
        }

        // ── Check PDF.js loaded ──
        if (!window.pdfjsLib) {
            showAutoError('PDF library not available. Please check your internet connection and refresh.');
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

        } catch (err) {
            console.error('[AUTO] Error:', err);
            showSGPAState('upload');
            if (err && err.message && err.message.indexOf('Gemini API error') !== -1) {
                showAutoError('AI analysis failed. Please check your connection and try again.');
            } else if (err && err.message && err.message.indexOf('JSON') !== -1) {
                showAutoError('Could not read result. The PDF may not be a valid SKIT result. Try again.');
            } else if (err && err.message && err.message.indexOf('fetch') !== -1) {
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