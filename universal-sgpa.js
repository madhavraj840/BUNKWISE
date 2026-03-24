(function () {
    'use strict';

    /* ── Universal SGPA Calculator ───────────────────────────
       Works for any university, any grading scale.
       No PDF parsing, no credit maps — pure arithmetic.
    ────────────────────────────────────────────────────────── */

    var rowCount = 0;

    /* ── Add a new subject row ───────────────────────────── */
    function addRow(name, credits, gradePoint) {
        var tbody = document.getElementById('univ-tbody');
        if (!tbody) return;

        rowCount++;
        var rid = 'row-' + rowCount;
           var subjectPlaceholder = 'Subject ' + rowCount;

        var tr = document.createElement('tr');
        tr.id = rid;
        tr.innerHTML =
              '<td class="univ-td-name"><input type="text" class="univ-input univ-input-name" placeholder="' + subjectPlaceholder + '" value="' + (name || '') + '" aria-label="Subject name"></td>' +
            '<td class="univ-td-num"><input type="number" class="univ-input univ-input-num" placeholder="e.g. 4" min="0" step="0.5" value="' + (credits !== undefined ? credits : '') + '" aria-label="Credits"></td>' +
            '<td class="univ-td-num"><input type="number" class="univ-input univ-input-num" placeholder="e.g. 9" min="0" max="10" step="0.5" value="' + (gradePoint !== undefined ? gradePoint : '') + '" aria-label="Grade point"></td>' +
            '<td class="univ-td-del"><button class="univ-del-btn" aria-label="Delete row" onclick="univDeleteRow(\'' + rid + '\')">✕</button></td>';

        tbody.appendChild(tr);
    }

    /* ── Delete a row ────────────────────────────────────── */
    window.univDeleteRow = function (rid) {
        var tbody = document.getElementById('univ-tbody');
        if (!tbody) return;
        var rows = tbody.querySelectorAll('tr');
        if (rows.length <= 1) {
            // Don't delete the last row — just clear it
            var inputs = rows[0].querySelectorAll('input');
            inputs.forEach(function (inp) { inp.value = ''; });
            return;
        }
        var row = document.getElementById(rid);
        if (row) row.remove();
    };

    /* ── Calculate SGPA ──────────────────────────────────── */
    function calculate() {
        var tbody = document.getElementById('univ-tbody');
        if (!tbody) return;

        var rows = tbody.querySelectorAll('tr');
        var subjects = [];
        var hasError = false;

        rows.forEach(function (row) {
            var inputs = row.querySelectorAll('input');
            var name   = inputs[0].value.trim() || ('Subject ' + (subjects.length + 1));
            var credits    = parseFloat(inputs[1].value);
            var gradePoint = parseFloat(inputs[2].value);

            // Skip entirely empty rows
            if (inputs[1].value === '' && inputs[2].value === '') return;

            if (isNaN(credits) || credits <= 0) {
                showError('Credits must be a positive number for every filled row.');
                hasError = true;
                inputs[1].classList.add('univ-input-error');
                return;
            }
            if (isNaN(gradePoint) || gradePoint < 0) {
                showError('Grade point must be 0 or higher for every filled row.');
                hasError = true;
                inputs[2].classList.add('univ-input-error');
                return;
            }

            // Clear any previous error highlight
            inputs[1].classList.remove('univ-input-error');
            inputs[2].classList.remove('univ-input-error');

            subjects.push({ name: name, credits: credits, gradePoint: gradePoint });
        });

        if (hasError) return;

        if (subjects.length === 0) {
            showError('Please enter at least one subject with credits and grade point.');
            return;
        }

        clearError();

        var totalCreditPoints = 0;
        var totalCredits      = 0;
        subjects.forEach(function (s) {
            totalCreditPoints += s.credits * s.gradePoint;
            totalCredits      += s.credits;
        });

        var sgpa = totalCredits > 0 ? (totalCreditPoints / totalCredits) : 0;
        renderResult(subjects, sgpa, totalCreditPoints, totalCredits);
    }

    /* ── Render result ───────────────────────────────────── */
    function renderResult(subjects, sgpa, totalCreditPoints, totalCredits) {
        var resultSection = document.getElementById('univ-result');
        if (!resultSection) return;

        // SGPA number
        document.getElementById('univ-sgpa-val').textContent = sgpa.toFixed(2);

        // Color-code the SGPA display
        var valEl = document.getElementById('univ-sgpa-val');
        valEl.className = 'univ-sgpa-number ' + (sgpa >= 7.5 ? 'sgpa-good' : sgpa >= 5 ? 'sgpa-avg' : 'sgpa-low');

        // Subject breakdown table
        var rtbody = document.getElementById('univ-result-tbody');
        rtbody.innerHTML = '';
        subjects.forEach(function (s) {
            var cp = (s.credits * s.gradePoint).toFixed(2);
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="univ-res-name">' + escHtml(s.name) + '</td>' +
                '<td>' + s.credits + '</td>' +
                '<td>' + s.gradePoint + '</td>' +
                '<td>' + cp + '</td>';
            rtbody.appendChild(tr);
        });

        // Formula display
        document.getElementById('univ-formula').textContent =
            'SGPA = ' + totalCreditPoints.toFixed(2) + ' ÷ ' + totalCredits.toFixed(1) + ' = ' + sgpa.toFixed(2);

        // Show result section
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ── Error helpers ───────────────────────────────────── */
    function showError(msg) {
        var el = document.getElementById('univ-error');
        if (el) { el.textContent = msg; el.classList.add('visible'); }
    }
    function clearError() {
        var el = document.getElementById('univ-error');
        if (el) { el.classList.remove('visible'); }
        // Clear all red highlights
        document.querySelectorAll('.univ-input-error').forEach(function (inp) {
            inp.classList.remove('univ-input-error');
        });
    }

    /* ── XSS-safe HTML escape ────────────────────────────── */
    function escHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Reset ───────────────────────────────────────────── */
    function reset() {
        var tbody = document.getElementById('univ-tbody');
        if (tbody) tbody.innerHTML = '';
        rowCount = 0;
        // Re-add 5 blank rows
        for (var i = 0; i < 5; i++) addRow();
        clearError();
        var resultSection = document.getElementById('univ-result');
        if (resultSection) resultSection.classList.add('hidden');
    }

    /* ── Wire up on DOMContentLoaded ────────────────────── */
    document.addEventListener('DOMContentLoaded', function () {
        // Only run on the universal SGPA page
        var sentinel = document.getElementById('page-universal-sgpa');
        if (!sentinel) return;

        // Seed 5 empty rows
        for (var i = 0; i < 5; i++) addRow();

        var btnAdd     = document.getElementById('univ-btn-add');
        var btnCalc    = document.getElementById('univ-btn-calc');
        var btnReset   = document.getElementById('univ-btn-reset');

        if (btnAdd)   btnAdd.addEventListener('click', function () { addRow(); });
        if (btnCalc)  btnCalc.addEventListener('click', calculate);
        if (btnReset) btnReset.addEventListener('click', reset);
    });

}());