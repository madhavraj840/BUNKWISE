# BunkWise

**A free, no-login academic tool for college students.**
Calculate attendance, predict bunks, and compute SGPA — all inside your browser. No data sent anywhere.

🔗 **Live site:** [madhavraj840.github.io/BUNKWISE](https://bunkwise.in/)

---

## Features

### 📊 Attendance Calculator
- Paste your attendance report directly from your college ERP portal
- Or upload a CSV / Excel file
- Get subject-wise and aggregate attendance percentage instantly
- Set a desired attendance target (default 75%) and see exactly how many classes you can bunk or must attend per subject
- Live speedometer gauge — green when safe, red when below target
- Everything updates in real time as you change the target percentage

### 📈 Class Wise (CW) Calculator
- Predicts your **future attendance** based on classes you plan to attend or skip
- Side-by-side view of current vs future attendance
- Input positive numbers to attend more classes, negative to skip

### 🧮 SGPA Calculator — RTU
- Upload your **RTU (Rajasthan Technical University)** result PDF
- Automatically extracts subject names, marks, grades, and credits
- Computes SGPA using the RTU formula
- Full subject-wise breakdown with downloadable PDF report

### 🤖 SGPA Calculator — Autonomous (SKIT)
- Upload your **SKIT (Swami Keshvanand Institute of Technology)** autonomous result PDF
- AI-powered parsing using **Google Gemini** — works regardless of PDF format variations
- Select your branch from the dropdown (First Year / CSE / ECE / EE / IT / ME / CE and specialisations)
- Branch-specific credit maps ensure accurate SGPA for every branch
- Downloadable PDF report
- Rate limited to 2 analyses per device per day

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| PDF Parsing | PDF.js (Mozilla) |
| AI Analysis | Google Gemini API (via Cloudflare Worker proxy) |
| File Reading | SheetJS (CSV/XLSX) |
| PDF Reports | jsPDF + jsPDF-AutoTable |
| Hosting | GitHub Pages |
| Analytics | Google Analytics (GA4) |
| API Proxy | Cloudflare Workers |

---

## Project Structure

```
BUNKWISE/
├── index.html          — Home page
├── attendance.html     — Attendance Calculator
├── sgpa.html           — SGPA Calculator (RTU + Autonomous)
├── cw.html             — Class Wise Calculator
├── about.html          — About Us
├── terms.html          — Terms & Conditions
├── privacy.html        — Privacy Policy
├── creators.html       — Creator Description
├── app.js              — All JavaScript logic
└── style.css           — All styles (dark + light theme)
to be updated
```

---

## Privacy

- **Attendance data** — processed entirely in your browser. Never sent to any server.
- **RTU result PDFs** — parsed locally using PDF.js. Never leaves your device.
- **SKIT result PDFs** — raw text is sent to Google Gemini API for analysis via a secure Cloudflare Worker proxy. The API key is stored in Cloudflare — never in the source code.
- **Analytics** — Google Analytics collects anonymous usage data (pages visited, device type, location). No personal data is collected by BunkWise.

Full details in the [Privacy Policy](https://bunkwise.in/privacy.html).

---

## Supported Branches (Autonomous SGPA)

Currently supports **2nd Year** students of the following SKIT branches:

- First Year (all branches, Sem 1 & Sem 2)
- Computer Science & Engineering
- CSE (Artificial Intelligence)
- CSE (Data Science)
- CSE (IOT)
- Electronics & Communication Engineering
- Electrical Engineering
- Information Technology
- Mechanical Engineering
- Civil Engineering

3rd Year support will be added in a future update.

---

## Running Locally

No build step required. Just open any HTML file directly in a browser or use a local server:

```bash
# Using VS Code Live Server — right click index.html → Open with Live Server
# Or using Python
python -m http.server 8000
```

Note: The Autonomous SGPA feature (Gemini API call) will not work on localhost because the Cloudflare Worker is restricted to the live GitHub Pages domain. All other features work fully on localhost.

---

## Creator

**Madhav Raj** — [github.com/madhavraj840](https://github.com/madhavraj840)

Built to save every college student the five minutes of painful mental math before bunking a class.

Found a bug or wrong result? Message on Telegram: [t.me/madhavraj840](https://t.me/madhavraj840)
