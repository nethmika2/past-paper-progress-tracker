# A/L Past Paper Command Centre 🎯

A past-paper tracking app built for a Sri Lankan GCE A/L **Mathematics stream** student (Combined Mathematics · Physics · Chemistry) preparing for the exam expected around **August 2027**.

One command centre for the three hardest questions of A/L prep:

1. **Which past-paper questions have I actually done?** — 2011–2025, all three subjects, 2,310 trackable questions.
2. **What did I skip because the syllabus wasn't finished?** — every skip is logged, linked to the unit it waits on, and **automatically unlocks** when you mark that unit done.
3. **Am I on track?** — syllabus coverage %, per-subject readiness score, weekly streak and an exam countdown.

No account, no server, no internet required after load — everything is stored locally in your browser and can be exported as JSON.

---

## Suggested solution: why this app (and what the alternatives are)

| Option | Good at | Weak at |
|---|---|---|
| **Notion / Google Sheets** | flexible tables, shareable | no question-level grid, deferred questions get buried, manual status cycling, formulas you'll maintain instead of studying |
| **Anki / SRS apps** | memorising facts & formulas | it's for flashcards, not for "which 2023 CM Paper I questions are done" |
| **Paper archive sites** (doenets.lk, agaram.lk) | getting the papers & schemes | they publish papers, they don't track your progress |
| **A plain to-do list** | simple | loses the *why* of a skip (syllabus vs concept vs time), no syllabus linkage |
| **✅ This app** | exactly your workflow: skip now → auto-remind later, syllabus coverage, readiness score, exam countdown | only does its one job — which is the point |

**Recommended setup:** this tracker + the official past papers & marking schemes from doenets.lk (links in the app's Plan and Settings pages). Keep the tracker open beside you while you solve; mark every question in the same minute you finish it.

---

## Run it

It's a static site — no build step.

```bash
# Option 1 — any static server (recommended)
python3 -m http.server 8321
# open http://localhost:8321

# Option 2 — just open the file
# double-click index.html (progress still persists in localStorage)
```

To use it on your phone during study sessions: serve it on your laptop and open `http://<laptop-ip>:8321` on the same Wi-Fi, or host the folder on any static host (GitHub Pages, Netlify…).

## Features

- **Dashboard** — exam countdown, per-subject cards (syllabus coverage, readiness %, done/skipped/redo counts), skip-reason donut, last-7-days activity, personalised insights.
- **Past Papers** — subject tabs → 2011–2025 strip → every question as a cyclable cell (`click` = cycle status, `right-click` = reverse, `double-click` = full details). Paper-level bulk actions, pending-only filter, one-line backup export.
- **Deferred Queue** — the heart of the app. Every skipped question with:
  - *Why* it was skipped: `syllabus` · `concept` · `time` · `wouldn't pick in exam` (Paper II optional selection) · other
  - *When* it unlocks: syllabus-linked skips open automatically when you finish that unit ("Ready now"), everything else is triaged by reason
  - one-tap "✓ Done", edit (reason/unit/note/minutes), or jump to the exact cell in the papers grid
- **Syllabus Coverage** — per-subject unit lists with ◐ in-progress tracking, ★ high-yield tags, one-tap status cycling, and support for adding your own units to match your school's scheme of work.
- **8-Month Game Plan** — a concrete Nov 2026 → Aug 2027 strategy: phases, weekly rhythm, the 3-bucket skipping policy, optional-section (Part B/C) choice strategy, readiness formula explained. Printable.
- **Settings & Backup** — name, exam date, weekly goal, JSON export/import, full reset.

## Question status model

`not attempted → Done ✓` · `Skipped ↷` (parked, always with a reason) · `Needs redo ↺` (did it, wasn't good enough) · cleared = not attempted again.

Readiness = **50% syllabus coverage + 50% questions marked Done** — an honest number: skipping doesn't inflate it.

## Paper structure (2019+ format, NIE)

| Subject | Paper I | Paper II |
|---|---|---|
| Combined Mathematics | 2 parts: 10 compulsory (25 m) + 5 of 7 (150 m) | same shape |
| Physics | 50 MCQ × 2 marks (2 h) | 4 structured × 10 m + 4 of 6 essays × 15 m |
| Chemistry | 50 MCQ × 1 mark (2 h) | 4 structured × 100 m + 2 of 3 (Part B) + 2 of 3 (Part C) × 150 m |

Older (pre-2019) papers differ slightly in part layout; question counts are kept identical so tracking stays valid.

## Project layout

```
index.html        — app shell (sidebar, topbar, 6 pages, question drawer)
css/style.css     — design system (dark "command centre" theme)
js/data.js        — seed: 3 subjects × 2011–2025 paper structures + syllabus units
js/store.js       — state, localStorage persistence, stats engine, import/export
js/app.js         — views, routing, interactions
```

Progress is stored under the `al_ppt_state_v1` localStorage key. **Export a backup weekly** — clearing browser data erases local state.

## Notes & disclaimer

- Unofficial study aid — not affiliated with the Department of Examinations or NIE. Always confirm the current syllabus & exam timetable with official sources.
- Unit lists are a practical summary of the NIE syllabi; edit them on the Syllabus page to match your school.
- Works fully offline once loaded. Your data never leaves your device unless you export it.
