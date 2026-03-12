(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────
       STATE
    ────────────────────────────────────────────────────── */
    const STATE = {
        subjects:   [],
        desiredPct: 75,
        rawText:    '',
    };

    /* ──────────────────────────────────────────────────────
       PARSER  (Attendance)
    ────────────────────────────────────────────────────── */
    function validateInput(text) {
        if (!text || !text.trim()) return false;
        if (!text.includes('Attendance Report')) return false;
        if (text.includes('Faculty Name')) return false;
        return true;
    }

    function parseAttendance(rawText) {
        return rawText.split('\n').slice(3)
            .filter(l => l.trim())
            .map(line => {
                const c = line.split('\t');
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

    /* ──────────────────────────────────────────────────────
       CALCULATOR  (Attendance)
    ────────────────────────────────────────────────────── */
    function calcPct(p, o, m, a) {
        const total = p + o + a;
        if (total === 0) return 100;
        return ((p + o + m) / total) * 100;
    }

    function calcToTake(p, o, m, a, d) {
        const D = d / 100;
        if (D >= 1) return 9999;
        const T = p + o + a, A = p + o + m;
        const raw = (D * T - A) / (1 - D);
        return raw <= 0 ? 0 : Math.ceil(parseFloat(raw.toFixed(2)));
    }

    function calcToLeave(p, o, m, a, d) {
        const D = d / 100;
        if (D <= 0) return 9999;
        const T = p + o + a, A = p + o + m;
        return Math.floor(parseFloat((Math.abs((D * T - A) / D)).toFixed(2)));
    }

    function calcSubject(s, d) {
        const pct = calcPct(s.present, s.od, s.makeup, s.absent);
        return pct < d
            ? { pct, toTake: calcToTake(s.present, s.od, s.makeup, s.absent, d), toLeave: 0 }
            : { pct, toTake: 0, toLeave: calcToLeave(s.present, s.od, s.makeup, s.absent, d) };
    }

    function calcAggregate(subjects, d) {
        const sP = subjects.reduce((s, x) => s + x.present, 0);
        const sO = subjects.reduce((s, x) => s + x.od, 0);
        const sM = subjects.reduce((s, x) => s + x.makeup, 0);
        const sA = subjects.reduce((s, x) => s + x.absent, 0);
        const pct = calcPct(sP, sO, sM, sA);
        return {
            pct,
            toTake:  pct < d  ? calcToTake(sP, sO, sM, sA, d)  : 0,
            toLeave: pct >= d ? calcToLeave(sP, sO, sM, sA, d) : 0,
        };
    }

    /* ──────────────────────────────────────────────────────
       SVG GAUGE ENGINE
    ────────────────────────────────────────────────────── */
    function pPt(cx, cy, r, pct) {
        const a = Math.PI - (pct / 100) * Math.PI;
        return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
    }

    function arcD(cx, cy, r, pct) {
        if (pct <= 0) return '';
        if (pct >= 100) {
            const m = pPt(cx, cy, r, 50);
            return `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${m.x.toFixed(3)} ${m.y.toFixed(3)} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
        }
        const c = Math.min(pct, 99.99), pt = pPt(cx, cy, r, c);
        return `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`;
    }

    function fullD(cx, cy, r) {
        return `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    }

    const NS = 'http://www.w3.org/2000/svg';

    function se(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
        return e;
    }

    function drawGauge(svg, pct, green, mini) {
        const cp  = Math.max(0, Math.min(100, pct));
        const col = green ? '#1ed97a' : '#f04455';
        const W   = mini ? 160 : 270,
              H   = mini ? 100 : 165,
              cx  = W / 2,
              cy  = mini ? 94 : 148,
              R   = mini ? 72 : 120,
              sw  = mini ? 11 : 17,
              uid = 'g' + Math.random().toString(36).slice(2, 8);

        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.innerHTML = '';

        const defs = se('defs');
        defs.innerHTML = `
            <filter id="gl-${uid}" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="${mini ? 3 : 6}" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="sg-${uid}" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="${mini ? 8 : 14}"/>
            </filter>`;
        svg.appendChild(defs);

        svg.appendChild(se('path', {
            d: fullD(cx, cy, R), fill: 'none',
            stroke: '#1c2540', 'stroke-width': sw, 'stroke-linecap': 'round',
        }));

        if (!mini) {
            for (let i = 0; i <= 10; i++) {
                const tp = i * 10, maj = i % 5 === 0;
                const a = pPt(cx, cy, R - sw / 2 - (maj ? 5 : 2), tp);
                const b = pPt(cx, cy, R + sw / 2 + (maj ? 4 : 1), tp);
                svg.appendChild(se('line', {
                    x1: a.x.toFixed(2), y1: a.y.toFixed(2),
                    x2: b.x.toFixed(2), y2: b.y.toFixed(2),
                    stroke: '#2e3a5a', 'stroke-width': maj ? 2 : 1, 'stroke-linecap': 'round',
                }));
            }
        }

        if (cp > 0) {
            const aD = arcD(cx, cy, R, cp);
            svg.appendChild(se('path', {
                d: aD, fill: 'none', stroke: col,
                'stroke-width': sw + 10, 'stroke-linecap': 'round',
                opacity: '.18', filter: `url(#sg-${uid})`,
            }));
            svg.appendChild(se('path', {
                d: aD, fill: 'none', stroke: col,
                'stroke-width': sw, 'stroke-linecap': 'round',
                filter: `url(#gl-${uid})`,
            }));
        }

        const npt = pPt(cx, cy, R - sw / 2 - (mini ? 10 : 14), cp);
        svg.appendChild(se('line', {
            x1: cx, y1: cy, x2: npt.x.toFixed(3), y2: npt.y.toFixed(3),
            stroke: 'rgba(0,0,0,.5)', 'stroke-width': mini ? 3.5 : 5, 'stroke-linecap': 'round',
        }));
        svg.appendChild(se('line', {
            x1: cx, y1: cy, x2: npt.x.toFixed(3), y2: npt.y.toFixed(3),
            stroke: '#eef0f7', 'stroke-width': mini ? 2 : 3, 'stroke-linecap': 'round',
        }));
        svg.appendChild(se('circle', { cx, cy, r: mini ? 4 : 6, fill: '#eef0f7' }));
        svg.appendChild(se('circle', { cx, cy, r: mini ? 2 : 3, fill: '#0f1520' }));

        if (mini) {
            const t = document.createElementNS(NS, 'text');
            t.setAttribute('x', cx); t.setAttribute('y', cy + 15);
            t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', col);
            t.setAttribute('font-size', '12.5'); t.setAttribute('font-family', 'DM Mono,monospace');
            t.setAttribute('font-weight', '500');
            t.textContent = cp.toFixed(1) + '%';
            svg.appendChild(t);
        }
    }

    /* ──────────────────────────────────────────────────────
       UI RENDERING  (Attendance)
    ────────────────────────────────────────────────────── */
    function renderMain(agg, d) {
        const g = agg.pct >= d, c = g ? 'green' : 'red';
        drawGauge(document.getElementById('main-gauge-svg'), agg.pct, g, false);

        const pEl = document.getElementById('gauge-pct');
        pEl.textContent = agg.pct.toFixed(2) + '%';
        pEl.className = 'gauge-pct-text ' + c;

        const lEl = document.getElementById('action-label');
        const vEl = document.getElementById('action-value');
        lEl.className = 'g-label ' + c;
        vEl.className = 'g-value ' + c;
        lEl.textContent = g ? 'Can Bunk' : 'To Take';
        vEl.textContent = g ? agg.toLeave : agg.toTake;
        document.getElementById('desired-val').textContent = d + '%';

        const gs = document.getElementById('gauge-section');
        gs.classList.remove('s-green', 's-red');
        gs.classList.add(g ? 's-green' : 's-red');
    }

    function makeCard(subject, result, idx) {
        const g = result.pct >= STATE.desiredPct, c = g ? 'green' : 'red';
        const card = document.createElement('div');
        card.className = `subject-card ${c}`;
        card.style.animationDelay = `${idx * 45}ms`;

        const gCol = document.createElement('div');
        gCol.className = 'mini-gauge-col';
        const mSvg = document.createElementNS(NS, 'svg');
        mSvg.style.overflow = 'visible';
        gCol.appendChild(mSvg);
        card.appendChild(gCol);

        const info = document.createElement('div');
        info.className = 'subject-info';
        info.innerHTML = `<div class="subject-name" title="${subject.name}">${subject.name}</div>`;

        const stats = document.createElement('div');
        stats.className = 'subject-stats';
        [['Present', subject.present], ['Absent', subject.absent], ['OD', subject.od], ['Makeup', subject.makeup]]
            .forEach(([l, v]) => {
                stats.innerHTML += `<div class="stat-item"><span class="stat-lbl">${l}</span><span class="stat-val">${v}</span></div>`;
            });
        info.appendChild(stats);

        const act = document.createElement('span');
        act.className = `subject-action ${c}`;
        act.textContent = g ? `Can Bunk: ${result.toLeave}h` : `To Take: ${result.toTake}h`;
        info.appendChild(act);
        card.appendChild(info);

        requestAnimationFrame(() => {
            drawGauge(mSvg, result.pct, g, true);
            card.classList.add('in');
        });
        return card;
    }

    function renderResults() {
        const agg = calcAggregate(STATE.subjects, STATE.desiredPct);
        renderMain(agg, STATE.desiredPct);
        const list = document.getElementById('subjects-list');
        list.innerHTML = '';
        STATE.subjects.forEach((s, i) => list.appendChild(makeCard(s, calcSubject(s, STATE.desiredPct), i)));
    }

    /* ──────────────────────────────────────────────────────
       NAVIGATION
    ────────────────────────────────────────────────────── */
    function showPage(id) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('in');
        });
        const tgt = document.getElementById('page-' + id);
        if (!tgt) return;
        tgt.classList.remove('hidden');
        void tgt.offsetWidth;
        tgt.classList.add('in');
        window.scrollTo({ top: 0 });

        const fab = document.getElementById('fab-pen');
        id === 'results' ? fab.classList.add('visible') : fab.classList.remove('visible');

        // Theme toggle only visible on home page
        const toggle = document.getElementById('theme-toggle');
        id === 'home' ? toggle.classList.add('visible') : toggle.classList.remove('visible');

        document.querySelectorAll('.side-menu a').forEach(a =>
            a.classList.toggle('active', a.dataset.page === id)
        );
    }

    function closeMenu() {
        document.getElementById('side-menu').classList.remove('open');
        document.getElementById('hamburger').classList.remove('open');
        document.getElementById('menu-backdrop').classList.remove('visible');
    }

    function bump() {
        const e = document.getElementById('popup-pct');
        e.classList.remove('bump');
        void e.offsetWidth;
        e.classList.add('bump');
    }

    /* ──────────────────────────────────────────────────────
       THEME TOGGLE
       Uses the CSS View Transitions API so the browser
       takes a real snapshot of the old theme, switches to
       the new theme, then clips the new snapshot in with
       an expanding circle from the button's position.
       The old theme stays visible outside the circle until
       it is fully covered — exactly what the user asked for.
       Falls back to an instant switch on older browsers.
    ────────────────────────────────────────────────────── */
    function updateThemeIcon(theme) {
        const btn = document.getElementById('theme-toggle');
        // Show the icon that represents the OPPOSITE action
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
        btn.setAttribute('aria-label',
            theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    }

    function toggleTheme(buttonEl) {
        const isDark       = document.documentElement.dataset.theme !== 'light';
        const targetTheme  = isDark ? 'light' : 'dark';

        // Store button-centre position as CSS custom props on <html>
        // so the ::view-transition-new(root) animation can read them
        const rect = buttonEl.getBoundingClientRect();
        const x = ((rect.left + rect.width  / 2) / window.innerWidth  * 100).toFixed(2) + '%';
        const y = ((rect.top  + rect.height / 2) / window.innerHeight * 100).toFixed(2) + '%';
        document.documentElement.style.setProperty('--vt-x', x);
        document.documentElement.style.setProperty('--vt-y', y);

        // Apply the theme change
        function applyTheme() {
            document.documentElement.dataset.theme = targetTheme;
            updateThemeIcon(targetTheme);
        }

        if (!document.startViewTransition) {
            // Fallback: browsers without View Transitions API (Firefox < 126)
            applyTheme();
            return;
        }

        // View Transitions: browser snapshots old state, calls applyTheme(),
        // snapshots new state, then animates between them using the clip-path
        // defined in ::view-transition-new(root) in style.css.
        document.startViewTransition(applyTheme);
    }

    /* ──────────────────────────────────────────────────────
       PASTE FROM CLIPBOARD
    ────────────────────────────────────────────────────── */
    function handlePaste() {
        const zone        = document.getElementById('paste-zone');
        const hint        = document.getElementById('paste-hint');
        const errorBanner = document.getElementById('error-banner');

        zone.classList.remove('success', 'error-state');
        errorBanner.classList.remove('visible');

        if (!navigator.clipboard || !navigator.clipboard.readText) {
            hint.textContent = '⚠ Clipboard access not available. Please use HTTPS or allow clipboard permission.';
            zone.classList.add('error-state');
            return;
        }

        navigator.clipboard.readText()
            .then(text => {
                STATE.rawText = text;

                if (!validateInput(text)) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ Invalid Attendance Report — check your copied content and try again.';
                    errorBanner.classList.add('visible');
                    return;
                }

                const parsed = parseAttendance(text);
                if (!parsed.length) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ No subject rows found. Make sure you copied the full attendance table.';
                    errorBanner.classList.add('visible');
                    return;
                }

                zone.classList.add('success');
                hint.textContent = `✓ Attendance loaded — ${parsed.length} subject${parsed.length > 1 ? 's' : ''} found. Calculating…`;

                STATE.subjects   = parsed;
                STATE.desiredPct = 75;

                setTimeout(() => {
                    showPage('results');
                    renderResults();
                    zone.classList.remove('success');
                    hint.textContent = 'Your attendance data is ready to be pasted from clipboard';
                }, 700);
            })
            .catch(() => {
                zone.classList.add('error-state');
                hint.textContent = '⚠ Clipboard access was denied. Please allow clipboard permission and try again.';
            });
    }

    /* ──────────────────────────────────────────────────────
       FILE UPLOAD — CSV / XLSX  (Attendance)
       Uses SheetJS (loaded via CDN in index.html) to parse
       the file into rows, then feeds the same pipeline as
       the clipboard paste path.
    ────────────────────────────────────────────────────── */
    function parseRowsFromSheet(rows) {
        return rows
            .filter(r => r[2] && typeof r[2] === 'string' && r[2].trim() && !isNaN(parseInt(r[4])))
            .map(r => ({
                name:    String(r[2]).trim(),
                type:    String(r[3] || '').trim(),
                present: Math.max(0, parseInt(r[4]) || 0),
                od:      Math.max(0, parseInt(r[5]) || 0),
                makeup:  Math.max(0, parseInt(r[6]) || 0),
                absent:  Math.max(0, parseInt(r[7]) || 0),
            }));
    }

    function handleFileUpload(file) {
        const zone = document.getElementById('upload-zone');
        const hint = document.getElementById('upload-hint');

        zone.classList.remove('success', 'error-state');

        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Unsupported file type. Please upload a .csv or .xlsx file.';
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet     = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                const parsed = parseRowsFromSheet(rows);

                if (!parsed.length) {
                    zone.classList.add('error-state');
                    hint.textContent = '⚠ No subject rows found. Check that your file has the correct column layout.';
                    return;
                }

                zone.classList.add('success');
                hint.textContent = `✓ File loaded — ${parsed.length} subject${parsed.length > 1 ? 's' : ''} found. Calculating…`;

                STATE.subjects   = parsed;
                STATE.desiredPct = 75;

                setTimeout(() => {
                    showPage('results');
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

    /* ══════════════════════════════════════════════════════
       ██████████████████████████████████████████████████
       SGPA MODULE — RTU RESULT PDF ANALYSER
       ██████████████████████████████████████████████████
    ══════════════════════════════════════════════════════ */

    /* ── SGPA State ──────────────────────────────────────── */
    const SGPA_STATE = { data: null };

    /* ── Grade Point Map (RTU) ───────────────────────────── */
    const GRADE_POINTS = {
        'A++': 10,
        'A+':   9,
        'A':    8.5,
        'B+':   8,
        'B':    7.5,
        'C+':   7,
        'C':    6.5,
        'D+':   6,
        'D':    5.5,
        'E+':   5,
        'E':    4,
        'F':    0,
    };

    /* ── Credit Lookup Map (flattened from all semesters) ── */
    const SEM_TO_CREDITS = [
        {
            'Engineering Mathematics-I': 4,
            'Engineering Chemistry': 4,
            'Human Values': 2,
            'Programming for Problem Solving': 2,
            'Basic Civil Engineering': 2,
            'Engineering Chemistry Lab': 1,
            'Human Values Activities': 1,
            'Computer Programming Lab': 1.5,
            'Basic Civil Engineering Lab': 1,
            'Computer Aided Engineering Graphics': 1.5,
            'DECA': 0.5,
        },
        {
            'Engineering Mathematics-II': 4,
            'Engineering Physics': 4,
            'Communication Skills': 2,
            'Basic Mechanical Engineering': 2,
            'Basic Electrical Engineering': 2,
            'Engineering Physics Lab': 1,
            'Language Lab': 1,
            'Manufacturing Practices Workshop': 1.5,
            'Basic Electrical Engineering Lab': 1,
            'Computer Aided Machine Drawing': 1.5,
            'DECA': 0.5,
        },
        {
            'Advanced Engineering Mathematics': 3,
            'Managerial Economics & Financial Accounting': 2,
            'Technical Communication': 2,
            'Digital Electronics': 3,
            'Data Structures and Algorithms': 3,
            'Object Oriented Programming': 3,
            'Software Engineering': 3,
            'Data Structures and Algorithms Lab': 1.5,
            'Object Oriented Programming Lab': 1.5,
            'Software Engineering Lab': 1.5,
            'Digital Electronics Lab': 1.5,
        },
        {
            'Discrete Mathematics Structure': 3,
            'Technical Communication': 2,
            'Managerial Economics & Financial Accounting': 2,
            'Microprocessor & Interfaces': 3,
            'Database Management System': 3,
            'Theory of Computation': 3,
            'Data Communication and Computer Networks': 3,
            'Microprocessor & Interfaces Lab': 1,
            'Database Management System Lab': 1.5,
            'Network Programming Lab': 1.5,
            'Linux Shell Programming Lab': 1,
            'Java Lab': 1,
            'Social Outreach, Discipline & Extracurricular Activities': 0.5,
        },
        {
            'Information Theory & Coding': 2,
            'Compiler Design': 3,
            'Operating System': 3,
            'Computer Graphics & Multimedia': 3,
            'Analysis of Algorithms': 3,
            'Human Computer Interaction': 2,
            'Computer Graphics & Multimedia Lab': 1,
            'Compiler Design Lab': 1,
            'Analysis of Algorithms Lab': 1,
            'Advance Java Lab': 1,
            'Industrial Training': 2.5,
            'Social Outreach, Discipline & Extracurricular Activities': 0.5,
        },
        {
            'Digital Image Processing': 2,
            'Machine Learning': 3,
            'Information Security System': 2,
            'Computer Architecture and Organization': 3,
            'Artificial Intelligence': 2,
            'Cloud Computing': 3,
            'Distributed Systems': 2,
            'Digital Image Processing Lab': 1.5,
            'Machine Learning Lab': 1.5,
            'Python Lab': 1.5,
            'Mobile App Development Lab': 1.5,
            'Social Outreach, Discipline & Extracurricular Activities': 0.5,
        },
        {
            'Internet of Things': 3,
            'Open Elective - I': 3,
            'Internet of Things Lab': 2,
            'Cyber Security Lab': 2,
            'Industrial Training': 2.5,
            'Seminar': 2,
            'Social Outreach, Discipline & Extracurricular Activities': 0.5,
        },
        {
            'Big Data Analytics': 3,
            'Open Elective - II': 3,
            'Big Data Analytics Lab': 1,
            'Software Testing and Validation Lab': 1,
            'Project': 7,
            'Social Outreach, Discipline & Extracurricular Activities': 0.5,
        },
    ];

    // Build flat lookup: lowercase subject name → credits  (first occurrence wins)
    const CREDIT_MAP = (function () {
        const map = {};
        for (const semObj of SEM_TO_CREDITS) {
            for (const [subject, credits] of Object.entries(semObj)) {
                const key = subject.toLowerCase().trim();
                if (!(key in map)) map[key] = credits;
            }
        }
        return map;
    })();

    function lookupCredits(subjectName) {
        if (!subjectName) return null;
        const key = subjectName.toLowerCase().trim();
        if (key in CREDIT_MAP) return CREDIT_MAP[key];
        return null;
    }

    /* ── PDF.js Text Extraction ──────────────────────────── */
    async function extractPDFText(arrayBuffer) {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) throw new Error('PDF.js not loaded');

        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

        const allLines = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();

            // Group text items by Y coordinate (rounded to nearest 2pt for tolerance)
            // PDF Y is bottom-up: higher Y = higher on page
            const lineMap = new Map();
            for (const item of content.items) {
                if (!item.str || !item.str.trim()) continue;
                const y = Math.round(item.transform[5] / 2) * 2;
                if (!lineMap.has(y)) lineMap.set(y, []);
                lineMap.get(y).push({ x: item.transform[4], text: item.str.trim() });
            }

            // Sort Y descending so we read top-to-bottom
            const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

            for (const y of sortedYs) {
                const items = lineMap.get(y).sort((a, b) => a.x - b.x);
                const line = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
                if (line) allLines.push(line);
            }
        }

        return allLines.join('\n');
    }

    /* ── RTU Result Parser ───────────────────────────────── */
    function parseRTUResult(fullText) {
        const lines = fullText.split('\n');

        // ── Student info ──────────────────────────────────
        let studentName = '—', fatherName = '—', rollNo = '—', remarks = 'FAIL';

        for (const line of lines) {
            // Roll number: "Roll No : 23ESKCS132"
            if (rollNo === '—') {
                const m = line.match(/Roll\s*No\s*:\s*([A-Z0-9]+)/i);
                if (m) rollNo = m[1].trim();
            }

            // Remarks: "REMARKS : FAIL" or "REMARKS : PASS"
            const remM = line.match(/REMARKS\s*:\s*(PASS|FAIL)/i);
            if (remM) remarks = remM[1].toUpperCase();

            // Name and Father's Name — they typically appear on the same line:
            // "Name : MADHAV RAJ Father's Name : BHOJRAJ SINGH"
            if (line.match(/Father/i)) {
                // Father's Name
                if (fatherName === '—') {
                    const fM = line.match(/Father'?s?\s*Name\s*:\s*([A-Z][A-Z ]+?)(?:\s{2,}|\n|$)/i);
                    if (fM) fatherName = fM[1].trim();
                }
                // Student Name (before "Father" on the same line)
                if (studentName === '—') {
                    const nM = line.match(/(?:^|\s)Name\s*:\s*([A-Z][A-Z ]+?)(?=\s+Father)/i);
                    if (nM) studentName = nM[1].trim();
                }
            } else if (studentName === '—' && line.match(/\bName\s*:/i) && !line.match(/College|Course/i)) {
                const nM = line.match(/\bName\s*:\s*([A-Z][A-Z ]+?)(?:\s{2,}|\n|$)/i);
                if (nM) studentName = nM[1].trim();
            }
        }

        // ── Subject rows ──────────────────────────────────
        // Course code pattern: digit-led codes (e.g. 4CS1-03, 4CS4-07)
        //                   or letter-led codes (e.g. FEC27)
        // Regex: word-boundary, digit+uppercase+digit(s)+optional-hyphen+digit(s)
        //     OR uppercase(2-4)+digit(2+)
        const courseCodeRe = /\b([0-9][A-Z]{1,4}[0-9]{1,2}(?:-[0-9]{2})?|[A-Z]{2,4}[0-9]{2,})\b/;

        // Valid grade tokens
        const gradeRe = /^(A\+\+|A\+|A|B\+|B|C\+|C|D\+|D|E\+|E|F)$/;

        const subjects = [];
        let inTable = false;

        for (const line of lines) {
            // Detect table header
            if (line.match(/COURSE\s*TITLE|MARKS1|MARKS2/i)) {
                inTable = true;
                continue;
            }
            // Detect table end
            if (line.match(/REMARKS\s*:/i)) {
                break;
            }
            if (!inTable) continue;

            // Find course code in this line
            const codeMatch = line.match(courseCodeRe);
            if (!codeMatch) continue;

            const codeStr  = codeMatch[0];
            const codeIdx  = line.indexOf(codeStr);

            // Subject name = everything before the course code
            const rawName  = line.substring(0, codeIdx).trim();
            if (!rawName) continue;

            // Everything after the course code = marks + grade
            const afterCode = line.substring(codeIdx + codeStr.length).trim();

            // Remove asterisks (e.g. "16 *" → "16"), then split on whitespace
            const parts = afterCode.replace(/\*/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);

            if (parts.length === 0) continue;

            // Last token must be a valid grade
            const lastPart = parts[parts.length - 1];
            if (!gradeRe.test(lastPart)) continue;

            const grade     = lastPart;
            const numParts  = parts.slice(0, parts.length - 1).filter(p => /^\d+$/.test(p));

            let marks1 = null, marks2 = null;

            if (numParts.length >= 2) {
                // Both marks1 (midterm) and marks2 (endterm) present
                marks1 = parseInt(numParts[0]);
                marks2 = parseInt(numParts[1]);
            } else if (numParts.length === 1) {
                // Only marks2 present (e.g. Art of Happiness with only endterm)
                marks2 = parseInt(numParts[0]);
            }
            // If no numbers, marks remain null (grade-only subject)

            subjects.push({ name: rawName, courseCode: codeStr, marks1, marks2, grade });
        }

        return { studentName, fatherName, rollNo, remarks, subjects };
    }

    /* ── SGPA Calculator ─────────────────────────────────── */
    function computeSGPA(parsed) {
        const { subjects } = parsed;

        let sumCreditPoints = 0;
        let sumCredits      = 0;
        let sumMarks        = 0;

        const enriched = subjects.map(s => {
            const gradePoint  = GRADE_POINTS.hasOwnProperty(s.grade) ? GRADE_POINTS[s.grade] : null;
            const credits     = lookupCredits(s.name);
            let   creditPoints = null;

            if (gradePoint !== null && credits !== null) {
                creditPoints   = parseFloat((gradePoint * credits).toFixed(2));
                sumCreditPoints += creditPoints;
                sumCredits      += credits;
            }

            // Total marks for this subject
            const total = (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0);
            sumMarks += total;

            return { ...s, gradePoint, credits, creditPoints };
        });

        const sgpa = sumCredits > 0
            ? parseFloat((sumCreditPoints / sumCredits).toFixed(2))
            : null;

        return {
            subjects:          enriched,
            sgpa,
            totalMarks:        sumMarks,
            maxMarks:          subjects.length * 100,
            totalGP:           parseFloat(sumCreditPoints.toFixed(2)),
            totalCredits:      parseFloat(sumCredits.toFixed(1)),
            totalCreditPoints: parseFloat(sumCreditPoints.toFixed(2)),
        };
    }

    /* ── SGPA State helpers ──────────────────────────────── */
    function showSGPAState(state) {
        // state: 'upload' | 'loading' | 'results'
        ['upload', 'loading', 'results'].forEach(s => {
            const el = document.getElementById('sgpa-' + s + '-state');
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById('sgpa-' + state + '-state');
        if (target) target.classList.remove('hidden');
        window.scrollTo({ top: 0 });
    }

    function setSGPALoadingMsg(msg) {
        const el = document.getElementById('sgpa-loading-sub');
        if (el) el.textContent = msg;
    }

    function showSGPAError(msg) {
        const banner = document.getElementById('sgpa-error-banner');
        const text   = document.getElementById('sgpa-error-text');
        if (text)   text.textContent = msg;
        if (banner) banner.classList.add('visible');
    }

    function clearSGPAError() {
        const banner = document.getElementById('sgpa-error-banner');
        if (banner) banner.classList.remove('visible');
    }

    /* ── SGPA Renderer ───────────────────────────────────── */
    function renderSGPAResults(data) {
        const {
            studentName, fatherName, rollNo, remarks,
            subjects, sgpa,
            totalMarks, maxMarks, totalGP, totalCredits, totalCreditPoints,
        } = data;

        // Student info
        document.getElementById('sgpa-name').textContent   = studentName;
        document.getElementById('sgpa-father').textContent = fatherName;
        document.getElementById('sgpa-roll').textContent   = rollNo;

        const remEl = document.getElementById('sgpa-remarks');
        remEl.textContent = remarks;
        remEl.className   = 'sgpa-remarks ' + (remarks === 'PASS' ? 'pass' : 'fail');

        // Table rows
        const tbody = document.getElementById('sgpa-tbody');
        tbody.innerHTML = '';

        subjects.forEach((s, i) => {
            const tr = document.createElement('tr');
            if (s.grade === 'F') tr.classList.add('row-fail');

            const total = (s.marks1 !== null || s.marks2 !== null)
                ? (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0)
                : null;

            const gradeClass = s.grade === 'F' ? 'grade-fail' : 'grade-pass';

            const creditsCell = s.credits !== null
                ? s.credits
                : '<span class="credits-unknown">—</span>';

            const cpCell = s.creditPoints !== null
                ? s.creditPoints.toFixed(2)
                : '<span class="credits-unknown">—</span>';

            tr.innerHTML =
                `<td>${i + 1}</td>` +
                `<td class="col-subject">${s.name}</td>` +
                `<td>${s.marks1 !== null ? s.marks1 : '—'}</td>` +
                `<td>${s.marks2 !== null ? s.marks2 : '—'}</td>` +
                `<td>${total !== null ? total : '—'}</td>` +
                `<td><span class="grade-cell ${gradeClass}">${s.grade}</span></td>` +
                `<td>${creditsCell}</td>` +
                `<td>${cpCell}</td>`;

            tbody.appendChild(tr);
        });

        // Footer summary
        document.getElementById('sgpa-value').textContent         = sgpa !== null ? sgpa.toFixed(2) : '—';
        document.getElementById('sgpa-total-marks').textContent   = totalMarks;
        document.getElementById('sgpa-max-marks').textContent     = maxMarks;
        document.getElementById('sgpa-total-gp').textContent      = totalGP.toFixed(2);
        document.getElementById('sgpa-total-credits').textContent = totalCredits;
        document.getElementById('sgpa-total-cp').textContent      = totalCreditPoints.toFixed(2);
    }

    /* ── SGPA PDF File Handler ───────────────────────────── */
    async function handleSGPAFile(file) {
        const zone = document.getElementById('sgpa-upload-zone');
        const hint = document.getElementById('sgpa-hint');

        zone.classList.remove('success', 'error-state');
        clearSGPAError();

        // Basic validation: must be PDF
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            zone.classList.add('error-state');
            hint.textContent = '⚠ Please upload a PDF file.';
            showSGPAError('Only PDF files are supported. Please upload an RTU result PDF.');
            return;
        }

        // Show loading screen
        showSGPAState('loading');
        setSGPALoadingMsg('Reading PDF file…');

        try {
            // 1 — Read file as ArrayBuffer
            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = e => resolve(e.target.result);
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsArrayBuffer(file);
            });

            // 2 — Extract text via PDF.js
            setSGPALoadingMsg('Extracting text from PDF…');
            const fullText = await extractPDFText(arrayBuffer);

            // 3 — Parse RTU result structure
            setSGPALoadingMsg('Parsing result data…');
            const parsed = parseRTUResult(fullText);

            if (!parsed.subjects.length) {
                showSGPAState('upload');
                showSGPAError('No subject rows found. Please upload a valid RTU result PDF.');
                return;
            }

            // 4 — Compute SGPA
            setSGPALoadingMsg('Computing SGPA…');
            const computed = computeSGPA(parsed);

            // 5 — Store and render
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

    /* ── PDF Report Generator (jsPDF + autoTable) ─────────── */
    function generateReportPDF() {
        const data = SGPA_STATE.data;
        if (!data) return;

        const {
            studentName, fatherName, rollNo, remarks,
            subjects, sgpa,
            totalMarks, maxMarks, totalGP, totalCredits, totalCreditPoints,
        } = data;

        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('PDF generation library not loaded. Please check your internet connection and try again.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();   // 297mm for A4 landscape

        // ── Header band ──────────────────────────────────
        doc.setFillColor(9, 13, 20);
        doc.rect(0, 0, pageW, 30, 'F');

        doc.setTextColor(232, 237, 248);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('RAJASTHAN TECHNICAL UNIVERSITY — KOTA', pageW / 2, 13, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(125, 139, 170);
        doc.text('SGPA Result Analysis  •  Generated by BunkWise  •  bunkwise.app', pageW / 2, 22, { align: 'center' });

        // ── Student info row ──────────────────────────────
        doc.setFillColor(15, 21, 32);
        doc.rect(0, 30, pageW, 22, 'F');

        const fields = [
            { label: 'STUDENT NAME', value: studentName,  x: 14  },
            { label: "FATHER'S NAME", value: fatherName,  x: 90  },
            { label: 'ROLL NUMBER',  value: rollNo,        x: 176 },
            { label: 'REMARKS',      value: remarks,       x: 235, coloured: true },
        ];

        fields.forEach(f => {
            doc.setFontSize(6.5);
            doc.setTextColor(61, 77, 106);
            doc.setFont('helvetica', 'normal');
            doc.text(f.label, f.x, 37);

            if (f.coloured) {
                const isPass = remarks === 'PASS';
                doc.setTextColor(isPass ? 30 : 240, isPass ? 180 : 68, isPass ? 100 : 85);
            } else {
                doc.setTextColor(220, 228, 245);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(f.value, f.x, 46);
        });

        // ── Subject Table ────────────────────────────────
        const tableBody = subjects.map((s, i) => {
            const total = (s.marks1 !== null || s.marks2 !== null)
                ? (s.marks1 !== null ? s.marks1 : 0) + (s.marks2 !== null ? s.marks2 : 0)
                : '—';
            return [
                i + 1,
                s.name,
                s.marks1 !== null ? s.marks1 : '—',
                s.marks2 !== null ? s.marks2 : '—',
                total,
                s.grade,
                s.credits !== null ? s.credits : '—',
                s.creditPoints !== null ? s.creditPoints.toFixed(2) : '—',
            ];
        });

        doc.autoTable({
            startY: 56,
            head: [['#', 'Subject Name', 'Internal', 'External', 'Total', 'Grade', 'Credits', 'Credit Pts']],
            body: tableBody,
            foot: [[
                {
                    content: 'SGPA  ' + (sgpa !== null ? sgpa.toFixed(2) : '—'),
                    colSpan: 2,
                    styles: { fontStyle: 'bold', fontSize: 11, textColor: [77, 138, 240], halign: 'left' },
                },
                {
                    content: 'Total Marks: ' + totalMarks + ' / ' + maxMarks,
                    colSpan: 2,
                    styles: { fontStyle: 'bold', halign: 'center' },
                },
                {
                    content: 'GP: ' + totalGP.toFixed(2),
                    styles: { fontStyle: 'bold', halign: 'center' },
                },
                {
                    content: '',
                    styles: {},
                },
                {
                    content: 'Cr: ' + totalCredits,
                    styles: { fontStyle: 'bold', halign: 'center' },
                },
                {
                    content: 'CP: ' + totalCreditPoints.toFixed(2),
                    styles: { fontStyle: 'bold', halign: 'center' },
                },
            ]],
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
                textColor: [30, 35, 50],
                fillColor: [255, 255, 255],
                lineColor: [200, 210, 225],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [240, 243, 250],
                textColor: [80, 95, 120],
                fontSize: 7,
                fontStyle: 'bold',
                halign: 'center',
                lineColor: [200, 210, 225],
            },
            footStyles: {
                fillColor: [240, 243, 250],
                textColor: [80, 95, 120],
                fontSize: 8,
                lineColor: [200, 210, 225],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 253],
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 'auto', halign: 'left'   },
                2: { halign: 'center', cellWidth: 22 },
                3: { halign: 'center', cellWidth: 22 },
                4: { halign: 'center', cellWidth: 18 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'center', cellWidth: 18 },
                7: { halign: 'center', cellWidth: 24 },
            },
            didParseCell: function (hookData) {
                // Colour Grade column
                if (hookData.section === 'body' && hookData.column.index === 5) {
                    const grade = hookData.cell.raw;
                    if (grade === 'F') {
                        hookData.cell.styles.textColor   = [200, 40, 55];
                        hookData.cell.styles.fontStyle   = 'bold';
                        hookData.cell.styles.fillColor   = [255, 235, 235];
                    } else {
                        hookData.cell.styles.textColor   = [30, 100, 200];
                        hookData.cell.styles.fontStyle   = 'bold';
                    }
                }
                // Colour failing rows slightly
                if (hookData.section === 'body') {
                    const rowData = hookData.row.raw;
                    if (rowData && rowData[5] === 'F') {
                        if (hookData.column.index !== 5) {
                            hookData.cell.styles.textColor = [160, 60, 70];
                        }
                    }
                }
            },
            margin: { left: 12, right: 12 },
        });

        // ── Footer note ──────────────────────────────────
        const finalY = (doc.lastAutoTable || {}).finalY || 200;
        doc.setFontSize(6.5);
        doc.setTextColor(140, 150, 170);
        doc.setFont('helvetica', 'italic');
        doc.text(
            '* Subjects with credits shown as — are excluded from SGPA calculation. ' +
            'This report is for reference only. Always verify with official RTU mark-sheet.',
            12, finalY + 6
        );
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by BunkWise', pageW - 12, finalY + 6, { align: 'right' });

        doc.save('SGPA_' + (rollNo !== '—' ? rollNo : 'report') + '.pdf');
    }

    /* ══════════════════════════════════════════════════════
       EVENT WIRING
    ══════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {

        // ── Sync theme icon with system-detected theme ──
        updateThemeIcon(document.documentElement.dataset.theme || 'dark');

        // ── Hamburger ──
        document.getElementById('hamburger').addEventListener('click', () => {
            ['side-menu', 'hamburger', 'menu-backdrop'].forEach((id, i) => {
                document.getElementById(id).classList.toggle(i === 2 ? 'visible' : 'open');
            });
        });
        document.getElementById('menu-backdrop').addEventListener('click', closeMenu);

        // ── Nav links ──
        document.querySelectorAll('.side-menu a').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                showPage(a.dataset.page);
                closeMenu();
            });
        });

        // ── Get Started ──
        document.getElementById('btn-get-started').addEventListener('click', () => showPage('paste'));

        // ── Theme Toggle ──
        const themeBtn = document.getElementById('theme-toggle');
        themeBtn.addEventListener('click', () => toggleTheme(themeBtn));

        // ── Attendance: Paste ──
        document.getElementById('btn-paste').addEventListener('click', handlePaste);

        // ── Attendance: File Upload ──
        document.getElementById('btn-upload').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        document.getElementById('file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileUpload(file);
            e.target.value = '';
        });

        // ── FAB Pen ──
        document.getElementById('fab-pen').addEventListener('click', () => {
            document.getElementById('popup-pct').textContent = STATE.desiredPct + '%';
            document.getElementById('popup-overlay').classList.add('open');
        });

        // ── Popup close ──
        document.getElementById('popup-overlay').addEventListener('click', e => {
            if (e.target === document.getElementById('popup-overlay'))
                document.getElementById('popup-overlay').classList.remove('open');
        });
        document.getElementById('popup-close').addEventListener('click', () => {
            document.getElementById('popup-overlay').classList.remove('open');
        });

        // ── Desired % ─/+ ──
        document.getElementById('btn-decrease').addEventListener('click', () => {
            if (STATE.desiredPct > 1) {
                STATE.desiredPct--;
                document.getElementById('popup-pct').textContent = STATE.desiredPct + '%';
                bump();
                renderResults();
            }
        });
        document.getElementById('btn-increase').addEventListener('click', () => {
            if (STATE.desiredPct < 99) {
                STATE.desiredPct++;
                document.getElementById('popup-pct').textContent = STATE.desiredPct + '%';
                bump();
                renderResults();
            }
        });

        // ── SGPA: Upload button → open file picker ──────
        document.getElementById('btn-sgpa-upload').addEventListener('click', () => {
            document.getElementById('sgpa-file-input').click();
        });

        // ── SGPA: File selected ─────────────────────────
        document.getElementById('sgpa-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleSGPAFile(file);
            e.target.value = '';  // allow same file to be re-selected
        });

        // ── SGPA: Download Report ───────────────────────
        document.getElementById('btn-download-report').addEventListener('click', generateReportPDF);

        // ── SGPA: Check Another ─────────────────────────
        document.getElementById('btn-check-another').addEventListener('click', () => {
            SGPA_STATE.data = null;
            // Reset upload zone
            const zone = document.getElementById('sgpa-upload-zone');
            const hint = document.getElementById('sgpa-hint');
            zone.classList.remove('success', 'error-state');
            hint.textContent = 'Select your RTU result PDF to analyse';
            clearSGPAError();
            showSGPAState('upload');
        });

        // ── Init ──
        showPage('home');
    });

})();