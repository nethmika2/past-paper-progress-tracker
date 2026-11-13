/* ============================================================
   app.js — Views, routing and interactions
   ============================================================ */
'use strict';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
// CSS.escape with fallback (attribute selectors here only ever hold our safe qKeys)
const cssEscape = (window.CSS && CSS.escape) ? CSS.escape.bind(window.CSS) : (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  papers: 'Past Papers',
  deferred: 'Deferred Queue',
  syllabus: 'Syllabus Coverage',
  plan: '8-Month Game Plan',
  settings: 'Settings & Backup',
};

/* ---------- Small utilities ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function relTime(ts) {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntilExam() {
  const exam = new Date((getState().settings.examDate || DEFAULT_EXAM_DATE) + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((exam - now) / 86400000);
}
function readinessLabel(r) {
  if (r < 25) return 'Getting started';
  if (r < 50) return 'Building up';
  if (r < 75) return 'On track';
  if (r < 90) return 'Exam capable';
  return 'Exam ready';
}
function readinessClass(r) { return r < 50 ? 'ready-low' : r < 75 ? 'ready-mid' : 'ready-good'; }
function subjectHueClass(sid) { return sid === 'cm' ? 'gold' : sid === 'phy' ? 'sky' : 'emerald'; }
function fillClass(sid) { return sid === 'cm' ? 'fill-gold' : sid === 'phy' ? 'fill-sky' : 'fill-emerald'; }

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

/* ============================================================
   Router
   ============================================================ */
function navigate(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = $('#page-' + page);
  if (target) target.classList.add('active');
  $$('.nav-btn[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === page));
  $('#pageTitle').textContent = PAGE_TITLES[page] || page;
  getState().ui.page = page;
  saveState();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

/* ============================================================
   Chrome (sidebar countdown, topbar chips, deferred badge)
   ============================================================ */
function updateChrome() {
  const days = daysUntilExam();
  $('#sidebarDays').textContent = days >= 0 ? days : '0';
  const exam = new Date(getState().settings.examDate + 'T00:00:00');
  $('#sidebarExamDate').textContent = isNaN(exam) ? 'exam date not set'
    : 'exam expected · ' + exam.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  $('#chipWeeklyDone').textContent = weeklyProgress().count;
  $('#chipWeeklyGoal').textContent = weeklyProgress().goal;
  $('#chipStreak').textContent = currentStreak();

  const deferred = deferredItems();
  $('#deferredNavBadge').textContent = deferred.length;
  $('#deferredNavBadge').style.display = deferred.length ? '' : 'none';
}

/* ============================================================
   Dashboard
   ============================================================ */
const READINESS_TIP = 'Readiness = 50% syllabus coverage + 50% questions marked Done.';

function renderDashboard() {
  const stats = computeAll();
  const settings = getState().settings;
  const name = settings.name.trim();
  $('#heroGreeting').innerHTML = name
    ? `Alright <em>${esc(name)}</em> — let’s see the board.`
    : `Alright <em>scholar</em> — let’s see the board.`;

  $('#heroDone').textContent = stats.totals.done.toLocaleString();
  $('#heroPapers').textContent = stats.totals.donePapers;
  $('#heroDeferred').textContent = stats.totals.skipped;

  // Subject cards
  $('#subjectCards').innerHTML = stats.perSubject.map(s => `
    <article class="card subject-card">
      <div class="subject-head">
        <div class="subject-badge badge-${subjectHueClass(s.subjectId)}">${subjectById(s.subjectId).symbol}</div>
        <div>
          <h4>${esc(subjectById(s.subjectId).name)}</h4>
          <small>${s.total} questions trackable · 2011–2025</small>
        </div>
        <span class="readiness-pill ${readinessClass(s.readiness)}" title="${READINESS_TIP}">${s.readiness}% · ${readinessLabel(s.readiness)}</span>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:10.5px; color:var(--muted); margin-bottom:5px">
          <span>Syllabus coverage</span><span>${s.unitsDone}/${s.unitsTotal} units · ${s.coverage}%</span>
        </div>
        <div class="bar"><i class="${fillClass(s.subjectId)}" style="width:${s.coverage}%"></i></div>
      </div>
      <div class="stat-row">
        <div class="mini-stat good"><div class="n">${s.done}</div><div class="l">Done</div></div>
        <div class="mini-stat warn"><div class="n">${s.skipped}</div><div class="l">Skipped</div></div>
        <div class="mini-stat bad"><div class="n">${s.review}</div><div class="l">To redo</div></div>
        <div class="mini-stat"><div class="n">${s.untouched}</div><div class="l">Pending</div></div>
      </div>
      <div class="subject-foot">
        <span>${s.highRemaining > 0 ? `⚠ ${s.highRemaining} high-yield unit${s.highRemaining > 1 ? 's' : ''} remaining` : '✅ all high-yield units covered'}</span>
        <button class="link-arrow" data-goto-papers="${s.subjectId}">Practice papers →</button>
      </div>
    </article>`).join('');

  renderInsights(stats);
  renderDonut(stats);
  renderWeekChart();
  renderActivity();
}

function renderInsights(stats) {
  const out = [];
  const total = stats.totals;
  const readyCount = stats.perSubject.reduce((a, s) => a + s.deferredReady, 0);
  const waitingCount = stats.perSubject.reduce((a, s) => a + s.deferredWaiting, 0);
  const conceptCount = stats.perSubject.reduce((a, s) => a + (s.skipReasons.concept || 0), 0);
  const timeCount = stats.perSubject.reduce((a, s) => a + (s.skipReasons.time || 0), 0);
  const weakest = [...stats.perSubject].sort((a, b) => a.coverage - b.coverage)[0];
  const highYieldOpen = stats.perSubject.reduce((a, s) => a + s.highRemaining, 0);

  if (total.done === 0 && total.skipped === 0) {
    out.push({ cls: 'insight-violet', html: '<b>First move:</b> open <b>Past Papers</b>, pick the newest paper of your strongest subject and attempt one question. Mark it ✓ — the whole system comes alive from the first keystroke.' });
  }
  if (readyCount > 0) {
    out.push({ cls: 'insight-good', html: `<b>${readyCount} parked question${readyCount > 1 ? 's are' : ' is'} ready to unlock.</b> The syllabus units they were waiting on are done — they’re sitting in your Deferred Queue under “Ready now”.` });
  }
  if (waitingCount > 0) {
    out.push({ cls: 'insight-warn', html: `<b>${waitingCount} question${waitingCount > 1 ? 's' : ''} still locked behind the syllabus.</b> They release automatically as you finish units — no need to remember them; the queue does.` });
  }
  if (conceptCount >= 5) {
    out.push({ cls: 'insight-red', html: `<b>${conceptCount} skips are “concept unclear”.</b> Past a threshold, skipping stops being triage and becomes avoidance. Book one session per week purely to clear these — they’re the cheapest marks available to you.` });
  } else if (timeCount >= 8) {
    out.push({ cls: 'insight-red', html: `<b>${timeCount} questions were skipped for time.</b> Time-pressure skips mean your pace, not your knowledge, is the bottleneck. Once a week, redo one full paper strictly to the clock.` });
  }
  if (weakest && weakest.coverage < 60) {
    out.push({ cls: 'insight-warn', html: `<b>${esc(subjectById(weakest.subjectId).name)} coverage is only ${weakest.coverage}%.</b> With ~8 months to go, the fastest readiness gain per hour is finishing its remaining high-yield units — see the Syllabus page.` });
  }
  if (highYieldOpen === 0 && stats.totals.done > 0) {
    out.push({ cls: 'insight-good', html: '<b>Every high-yield unit is covered.</b> From here, pure paper volume + old mistakes decide your grade. Keep the weekly rhythm.' });
  }
  $('#insightsStack').innerHTML = out.slice(0, 3).map(i => `<div class="insight ${i.cls}">💡 <span>${i.html}</span></div>`).join('');
}

const DONUT_CATS = [
  { key: 'syllabus',     label: 'Syllabus not covered', color: '#f2b844' },
  { key: 'concept',      label: 'Concept unclear',      color: '#ff7a7a' },
  { key: 'time',         label: 'Ran out of time',      color: '#a78bfa' },
  { key: 'paper2choice', label: 'Wouldn’t pick in exam', color: '#56b6f7' },
  { key: 'other',        label: 'Other',                color: '#8d99c0' },
];

function renderDonut(stats) {
  const agg = {};
  let totalSkipped = 0;
  for (const s of stats.perSubject) {
    for (const [k, v] of Object.entries(s.skipReasons)) { agg[k] = (agg[k] || 0) + v; totalSkipped += v; }
  }
  const holder = $('#donutHolder');
  const legend = $('#donutLegend');
  if (totalSkipped === 0) {
    holder.innerHTML = `
      <svg viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="No skipped questions yet">
        <circle cx="64" cy="64" r="50" fill="none" stroke="rgba(148,170,230,0.12)" stroke-width="20"/>
      </svg>
      <div class="donut-total"><div class="n">0</div><div class="l">skipped</div></div>`;
    legend.innerHTML = '<div style="color:var(--faint)">Nothing parked yet.<br>When you skip a question,<br>its reason shows up here.</div>';
    return;
  }
  const R = 50, C = 2 * Math.PI * R;
  let offset = 0;
  const segments = DONUT_CATS
    .filter(c => agg[c.key])
    .map(c => {
      const frac = agg[c.key] / totalSkipped;
      const seg = { ...c, value: agg[c.key], dash: frac * C, offset };
      offset += frac * C;
      return seg;
    });
  holder.innerHTML = `
    <svg viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="Donut chart of skip reasons">
      <g transform="rotate(-90 64 64)">
        ${segments.map(s => `<circle cx="64" cy="64" r="${R}" fill="none" stroke="${s.color}" stroke-width="20" stroke-dasharray="${Math.max(s.dash - 1.5, 0.5)} ${C - Math.max(s.dash - 1.5, 0.5)}" stroke-dashoffset="${-s.offset}"><title>${esc(s.label)}: ${s.value}</title></circle>`).join('')}
      </g>
    </svg>
    <div class="donut-total"><div class="n">${totalSkipped}</div><div class="l">parked</div></div>`;
  legend.innerHTML = DONUT_CATS
    .filter(c => agg[c.key])
    .map(c => `<div><span class="dot" style="background:${c.color}"></span>${c.label} <b style="margin-left:auto; color:var(--text); font-family:var(--font-mono)">${agg[c.key]}</b></div>`)
    .join('');
}

function renderWeekChart() {
  const days = last7DaysActivity();
  const max = Math.max(...days.map(d => d.count), 1);
  $('#weekChart').innerHTML = days.map(d => `
    <div class="week-col" title="${d.count} action${d.count === 1 ? '' : 's'}">
      <div class="week-bar" style="height:${Math.max((d.count / max) * 100, 3)}%"></div>
      <span>${esc(d.label)}</span>
    </div>`).join('');
}

function activityIcon(type) {
  switch (type) {
    case 'mark_done': return { i: '✓', c: 'var(--emerald)' };
    case 'mark_skipped': return { i: '↷', c: 'var(--gold)' };
    case 'mark_review': return { i: '↺', c: 'var(--red)' };
    case 'clear': return { i: '∅', c: 'var(--muted)' };
    case 'bulk_done': return { i: '✓✓', c: 'var(--emerald)' };
    case 'bulk_clear': return { i: '∅∅', c: 'var(--muted)' };
    default: return { i: '•', c: 'var(--muted)' };
  }
}

function renderActivity() {
  const items = recentActivity(9);
  const list = $('#activityList');
  if (!items.length) {
    list.innerHTML = '<div class="activity-empty">Nothing logged yet — your very first marked question will appear here.</div>';
    return;
  }
  list.innerHTML = items.map(a => {
    const icon = activityIcon(a.type);
    return `<div class="activity-item">
      <span class="activity-time">${relTime(a.ts)}</span>
      <span style="color:${icon.c}; width:20px; flex-shrink:0; font-weight:700">${icon.i}</span>
      <span style="color:var(--muted)">${esc(a.label)}</span>
    </div>`;
  }).join('');
}

/* ============================================================
   Papers page
   ============================================================ */
function currentPapersUI() {
  const ui = getState().ui;
  if (!ui.papers) ui.papers = { subjectId: 'cm', year: 2024, filter: 'all' };
  if (!YEARS.includes(ui.papers.year)) ui.papers.year = YEARS[YEARS.length - 1];
  return ui.papers;
}

function renderSubjectTabs() {
  const ui = currentPapersUI();
  $('#subjectTabs').innerHTML = SUBJECTS.map(s => `
    <button class="subject-tab ${ui.subjectId === s.id ? 'active' : ''}" data-hue="${s.hue}" data-subject-tab="${s.id}" aria-pressed="${ui.subjectId === s.id}">
      <span class="subject-badge badge-${subjectHueClass(s.id)}">${s.symbol}</span>${esc(s.name)}
    </button>`).join('');
}

function renderYearStrip() {
  const ui = currentPapersUI();
  const stats = computeAll().perSubject.find(s => s.subjectId === ui.subjectId);
  $('#yearStrip').innerHTML = [...YEARS].reverse().map(y => {
    const yr = stats.byYear[y];
    const done = yr ? yr.done : 0;
    const total = yr ? yr.total : 0;
    const complete = total > 0 && done === total;
    return `<button class="year-chip ${ui.year === y ? 'active' : ''} ${complete ? 'complete' : ''}" data-year="${y}" title="${done}/${total} marked done">${y}<small>${done}/${total}</small></button>`;
  }).join('');
}

function paperCellHTML(q) {
  const e = getEntry(q.key);
  const status = e ? e.status : '';
  const filter = currentPapersUI().filter;
  const visible =
    filter === 'all' ? true :
    filter === 'untouched' ? !status :
    status === filter;
  const reason = e && e.reason ? e.reason : '';
  const title = `${q.paperName} · Q${q.qNo} — ${status ? (STATUS[status] || {}).label + (reason ? ' (' + (SKIP_REASONS[reason] || {}).short + ')' : '') : 'not attempted'}`;
  return `<button class="q-cell ${status} ${visible ? '' : 'filtered-out'}" data-qkey="${esc(q.key)}" title="${esc(title)}" aria-label="${esc(title)}">${q.qNo}${status === 'skipped' ? '<span class="tick">↷</span>' : ''}</button>`;
}

function renderPapersGrid() {
  const ui = currentPapersUI();
  const subject = subjectById(ui.subjectId);
  const grid = $('#papersGrid');

  grid.innerHTML = subject.papers.map(paper => {
    let total = 0, done = 0;
    for (const part of paper.parts) {
      for (let n = part.start; n < part.start + part.count; n++) {
        total++;
        const e = getEntry(qKey(subject.id, ui.year, paper.id, part.id, n));
        if (e && e.status === 'done') done++;
      }
    }
    const partsHTML = paper.parts.map(part => {
      const cells = [];
      for (let n = part.start; n < part.start + part.count; n++) {
        cells.push(paperCellHTML({ key: qKey(subject.id, ui.year, paper.id, part.id, n), subjectId: subject.id, year: ui.year, paperId: paper.id, paperName: paper.name, partId: part.id, partName: part.name, qNo: n }));
      }
      return `<div class="part-block">
        <div class="part-label">${esc(part.name)}</div>
        <div class="q-grid">${cells.join('')}</div>
      </div>`;
    }).join('');

    return `<article class="card paper-card">
      <div class="paper-head">
        <div>
          <h4>${ui.year} · ${esc(paper.name)}</h4>
          <div class="paper-meta">${esc(paper.meta)}</div>
        </div>
        <div class="paper-count"><b>${done}</b> / ${total} done</div>
      </div>
      ${partsHTML}
      <div class="paper-foot">
        <button class="btn btn-sm" data-bulk-done="${paper.id}">✓ Mark all ${total} done</button>
        <button class="btn btn-sm btn-ghost" data-bulk-clear="${paper.id}">Clear paper</button>
      </div>
    </article>`;
  }).join('');
}

function renderPapersPage() {
  renderSubjectTabs();
  renderYearStrip();
  $$('#statusFilter button').forEach(b => b.classList.toggle('active', b.dataset.filter === currentPapersUI().filter));
  renderPapersGrid();
}

function cycleQuestion(key, dir) {
  const order = dir >= 0 ? cycleOrder : cycleBack;
  const e = getEntry(key);
  const cur = e ? e.status : '';
  const idx = order.indexOf(cur);
  const next = order[(idx + 1) % order.length];
  const q = parseKey(key);
  const label = `${subjectById(q.subjectId).short} ${q.year} · ${q.paperId === 'P1' ? 'Paper I' : 'Paper II'} · Q${q.qNo} — ${next ? STATUS[next].label : 'cleared'}`;
  setStatus(key, next, q.subjectId, label);
  // marking skipped without details: default reason to syllabus so the user is prompted to link the unit
  if (next === 'skipped') {
    const cur2 = getEntry(key);
    if (!cur2.reason) patchEntry(key, { reason: 'syllabus' });
  }
  refreshAll();
  flashCell(key);
}

function parseKey(key) {
  const [subjectId, year, paperId, partId, qNo] = key.split('|');
  return { subjectId, year: Number(year), paperId, partId, qNo: Number(qNo) };
}

function flashCell(key) {
  const cell = $(`.q-cell[data-qkey="${cssEscape(key)}"]`);
  if (!cell) return;
  cell.classList.remove('flash');
  void cell.offsetWidth;
  cell.classList.add('flash');
}

function refreshAll() {
  updateChrome();
  renderDashboard();
  renderPapersPage();
  renderDeferredPage();
  renderSyllabusPage();
}

/* ============================================================
   Deferred queue
   ============================================================ */
function deferFilterOf() { return getState().ui.deferred?.filter || 'all'; }

function deferredVisible(item) {
  const f = deferFilterOf();
  switch (f) {
    case 'ready': return item.ready;
    case 'waiting': return !item.ready;
    case 'concept': return item.reason === 'concept';
    case 'time': return item.reason === 'time';
    default: return true;
  }
}

function renderDeferredPage() {
  const items = deferredItems();
  const ready = items.filter(i => i.ready).length;
  const waiting = items.length - ready;
  const concept = items.filter(i => i.reason === 'concept').length;
  const timeCount = items.filter(i => i.reason === 'time').length;

  $('#deferSummary').innerHTML = `
    <div class="defer-stat ready"><div class="n">${ready}</div><div class="l">Ready to attempt now</div></div>
    <div class="defer-stat waiting"><div class="n">${waiting}</div><div class="l">Locked behind syllabus</div></div>
    <div class="defer-stat concept"><div class="n">${concept}</div><div class="l">Concept unclear</div></div>
    <div class="defer-stat time"><div class="n">${timeCount}</div><div class="l">Ran out of time</div></div>`;

  $$('#deferFilter button').forEach(b => b.classList.toggle('active', b.dataset.dfilter === deferFilterOf()));

  const visible = items.filter(deferredVisible);
  const list = $('#deferList');
  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><div class="big">${items.length ? '✅' : '🎉'}</div>
      <b>${items.length ? 'Nothing in this filter right now.' : 'The queue is empty — everything you marked “skipped” has been done!'}</b>
      <div style="margin-top:6px; font-size:12px">${items.length ? 'Try another filter.' : 'Every skipped past-paper question has been cleared. Seriously — go get some sleep.'}</div>
    </div>`;
    return;
  }

  list.innerHTML = visible.map(item => {
    const e = item.entry;
    let unlockLine;
    if (item.reason === 'syllabus') {
      if (item.unit) {
        unlockLine = item.ready
          ? `<span class="unlock-note done">ready — “${esc(item.unit.name)}” is done ✓</span>`
          : `<span class="unlock-note">unlocks when “${esc(item.unit.name)}” is done</span>`;
      } else {
        unlockLine = '<span class="unlock-note">link the syllabus unit in the details panel to gate it</span>';
      }
    } else if (item.reason === 'concept') {
      unlockLine = '<span class="unlock-note">needs one focused session — not time</span>';
    } else if (item.reason === 'time') {
      unlockLine = '<span class="unlock-note">redo strictly to the clock</span>';
    } else {
      unlockLine = `<span class="unlock-note">${esc((SKIP_REASONS[item.reason] || SKIP_REASONS.other).label)}</span>`;
    }
    const mins = e.minutes ? `<span>· ~${esc(e.minutes)} min logged</span>` : '';
    const note = e.note ? `<span>· “${esc(e.note.length > 90 ? e.note.slice(0, 90) + '…' : e.note)}”</span>` : '';
    return `<div class="defer-item ${item.ready ? 'ready' : 'waiting'}" data-key="${esc(item.key)}">
      <div class="defer-subject"><b>${esc(subjectById(item.subjectId).symbol)}</b>${esc(item.subjectShort)}</div>
      <div>
        <div class="defer-title">${item.year} · ${esc(item.paperName)} · Question ${item.qNo}</div>
        <div class="defer-sub">
          <span class="reason-tag reason-${esc(item.reason)}">${esc((SKIP_REASONS[item.reason] || SKIP_REASONS.other).short)}</span>
          ${unlockLine}
          <span>· parked ${relTime(e.updatedAt)}</span>
          ${mins}${note}
        </div>
      </div>
      <div class="defer-actions">
        <button class="btn btn-sm" data-defer-done="${esc(item.key)}" title="Mark this question as done">✓ Done</button>
        <button class="btn btn-sm btn-ghost" data-defer-edit="${esc(item.key)}" title="Adjust reason, unit, note">Edit</button>
        <button class="btn btn-sm btn-ghost" data-defer-jump="${esc(item.key)}" title="Find it in the papers grid">Jump →</button>
      </div>
    </div>`;
  }).join('');
}

/* ============================================================
   Syllabus page
   ============================================================ */
const UNIT_CYCLE = { todo: 'doing', doing: 'done', done: 'todo' };
const UNIT_GLYPH = { todo: '○', doing: '◐', done: '✓' };

function renderSyllabusPage() {
  const state = getState();
  $('#syllabusCols').innerHTML = SUBJECTS.map(s => {
    const units = state.syllabus[s.id] || [];
    const done = units.filter(u => u.status === 'done').length;
    const highOpen = units.filter(u => u.yield === 'high' && u.status !== 'done').length;
    const coverage = units.length ? Math.round((done / units.length) * 100) : 0;

    // group by part, preserving order
    const groups = [];
    for (const u of units) {
      let g = groups.find(g => g.name === u.part);
      if (!g) { g = { name: u.part, units: [] }; groups.push(g); }
      g.units.push(u);
    }

    const groupsHTML = groups.map(g => `
      <div class="part-group-label">${esc(g.name)}</div>
      ${g.units.map(u => `
        <div class="unit-row" data-status="${u.status}" data-unit="${esc(u.id)}" data-subject="${s.id}">
          <button class="unit-cycle" data-cycle-unit="${esc(u.id)}" data-subject="${s.id}" title="Cycle: not started → in progress → done" aria-label="Cycle status of ${esc(u.name)}">${UNIT_GLYPH[u.status]}</button>
          <div style="flex:1; min-width:0">
            <div class="unit-name">${esc(u.name)}${u.custom ? ' <span style="color:var(--violet); font-size:9px">CUSTOM</span>' : ''}</div>
            ${u.status === 'done' && u.completedAt ? `<div class="unit-done-date">done ${fmtDate(u.completedAt)}</div>` : ''}
          </div>
          <span class="yield yield-${u.yield}">${u.yield === 'high' ? '★ high' : u.yield}</span>
          ${u.custom ? `<button class="unit-del" data-del-unit="${esc(u.id)}" data-subject="${s.id}" title="Remove custom unit" aria-label="Remove unit">×</button>` : ''}
        </div>`).join('')}
    `).join('');

    return `<article class="card syllabus-subject">
      <div class="syllabus-head">
        <div class="subject-badge badge-${subjectHueClass(s.id)}" style="width:40px;height:40px;font-size:17px">${s.symbol}</div>
        <div><h4>${esc(s.name)}</h4><small style="color:var(--muted);font-size:10.5px">${highOpen > 0 ? highOpen + ' high-yield left' : 'all high-yield covered ✅'}</small></div>
      </div>
      <div class="coverage-line"><span>${coverage}%</span><div class="bar"><i class="${fillClass(s.id)}" style="width:${coverage}%"></i></div><span>${done}/${units.length}</span></div>
      <div class="unit-list">${groupsHTML}</div>
      <form class="add-unit-form" data-add-unit-form="${s.id}">
        <input type="text" name="unitName" placeholder="Add a unit (e.g. Graphs of rational functions)…" maxlength="120" required aria-label="New unit name" />
        <select name="unitYield" aria-label="Expected frequency in papers">
          <option value="high">★ High yield</option>
          <option value="medium" selected>Medium yield</option>
          <option value="low">Low yield</option>
        </select>
        <button type="submit" class="btn btn-sm" title="Add unit">+ Add</button>
      </form>
    </article>`;
  }).join('');
}

function cycleUnit(subjectId, unitId) {
  const state = getState();
  const units = state.syllabus[subjectId];
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;
  const next = UNIT_CYCLE[unit.status] || 'todo';
  unit.status = next;
  unit.completedAt = next === 'done' ? Date.now() : null;
  saveState();

  if (next === 'done') {
    const unlocked = deferredItems().filter(i => i.reason === 'syllabus' && i.unlockUnit === unitId && i.ready).length;
    toast(unlocked > 0
      ? `🎉 Unit done! ${unlocked} parked question${unlocked > 1 ? 's' : ''} just unlocked in your Deferred Queue.`
      : 'Unit marked done. Nice closing of the loop.');
  } else {
    toast(`“${unit.name.slice(0, 60)}” → ${next === 'doing' ? 'in progress' : 'not started'}`);
  }
  refreshAll();
}

/* ============================================================
   Question drawer
   ============================================================ */
let drawerKey = null;

function openDrawer(key) {
  drawerKey = key;
  const q = parseKey(key);
  const subject = subjectById(q.subjectId);
  const paper = subject.papers.find(p => p.id === q.paperId);
  const part = paper ? paper.parts.find(p => p.id === q.partId) : null;
  const e = getEntry(key);

  $('#drawerTitle').textContent = `${q.year} · Q${q.qNo}`;
  $('#drawerPart').textContent = `${subject.name} · ${paper ? paper.name : q.paperId}${part ? ' · ' + part.name : ''}`;
  renderDrawerStatus(e ? e.status : '');
  $('#skipReason').innerHTML = Object.entries(SKIP_REASONS).map(([k, v]) =>
    `<option value="${k}">${esc(v.label)}</option>`).join('');
  $('#skipReason').value = (e && e.reason) || 'syllabus';
  $('#unlockUnit').innerHTML = '<option value="">— link the syllabus unit this question needs —</option>' +
    (getState().syllabus[q.subjectId] || []).map(u => `<option value="${esc(u.id)}" ${e && e.unlockUnit === u.id ? 'selected' : ''}>${u.status === 'done' ? '✓ ' : u.status === 'doing' ? '◐ ' : '○ '}${esc(u.name)}</option>`).join('');
  $('#skipTools').hidden = !(e && e.status === 'skipped');
  $('#qNote').value = e ? (e.note || '') : '';
  $('#qMinutes').value = e && e.minutes ? e.minutes : '';
  $('#drawerMeta').textContent = e ? `Last touched ${relTime(e.updatedAt)} · key ${key}` : `Never attempted · key ${key}`;

  $('#questionDrawer').classList.add('open');
  $('#drawerOverlay').classList.add('open');
  $('#questionDrawer').setAttribute('aria-hidden', 'false');
  $('#drawerOverlay').setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  drawerKey = null;
  $('#questionDrawer').classList.remove('open');
  $('#drawerOverlay').classList.remove('open');
  $('#questionDrawer').setAttribute('aria-hidden', 'true');
  $('#drawerOverlay').setAttribute('aria-hidden', 'true');
}

function renderDrawerStatus(status) {
  $$('.status-choice').forEach(btn => {
    const st = btn.dataset.st;
    const current = status || '';
    btn.classList.toggle('sel', st === 'clear' ? current === '' : st === current);
  });
}

function drawerSetStatus(status) {
  if (!drawerKey) return;
  const q = parseKey(drawerKey);
  const label = `${subjectById(q.subjectId).short} ${q.year} · ${q.paperId === 'P1' ? 'Paper I' : 'Paper II'} · Q${q.qNo} — ${status && STATUS[status] ? STATUS[status].label : 'cleared'}`;
  setStatus(drawerKey, status, q.subjectId, label);
  if (status === 'skipped') {
    const e = getEntry(drawerKey);
    if (e && !e.reason) patchEntry(drawerKey, { reason: 'syllabus' });
  }
  const e = getEntry(drawerKey);
  renderDrawerStatus(e ? e.status : '');
  $('#skipTools').hidden = !(e && e.status === 'skipped');
  $('#drawerMeta').textContent = e ? `Last touched just now · key ${drawerKey}` : `Cleared · key ${drawerKey}`;
  refreshAll();
}

/* ============================================================
   Settings
   ============================================================ */
function renderSettings() {
  const s = getState().settings;
  $('#setName').value = s.name || '';
  $('#setExamDate').value = s.examDate || DEFAULT_EXAM_DATE;
  $('#setWeeklyGoal').value = s.weeklyGoal;
}

function renderPlanLinks() {
  $('#archiveLinks').innerHTML = ARCHIVE_LINKS.map(l =>
    `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)}<small>${esc(l.note)}</small></a>`).join('');
}

function downloadBackup() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `al-past-paper-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Backup downloaded. Keep it somewhere safe (Drive/phone).');
}

/* ============================================================
   Wiring
   ============================================================ */
function init() {
  // topbar date
  $('#todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // nav
  $$('.nav-btn[data-nav]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.nav)));

  // dashboard: subject card shortcut to papers
  $('#subjectCards').addEventListener('click', e => {
    const btn = e.target.closest('[data-goto-papers]');
    if (!btn) return;
    const ui = currentPapersUI();
    ui.subjectId = btn.dataset.gotoPapers;
    navigate('papers');
    renderPapersPage();
  });

  // papers page: subject tabs & year strip
  $('#subjectTabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-subject-tab]');
    if (!tab) return;
    currentPapersUI().subjectId = tab.dataset.subjectTab;
    saveState();
    renderPapersPage();
  });
  $('#yearStrip').addEventListener('click', e => {
    const chip = e.target.closest('[data-year]');
    if (!chip) return;
    currentPapersUI().year = Number(chip.dataset.year);
    saveState();
    renderPapersPage();
  });
  $('#statusFilter').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    currentPapersUI().filter = btn.dataset.filter;
    saveState();
    renderPapersPage();
  });

  // papers grid: cycle (click), reverse-cycle (right-click), details (double-click), bulk actions
  $('#papersGrid').addEventListener('click', e => {
    const bulkDone = e.target.closest('[data-bulk-done]');
    const bulkClear = e.target.closest('[data-bulk-clear]');
    if (bulkDone) return bulkMarkPaper(bulkDone.dataset.bulkDone, true);
    if (bulkClear) return bulkMarkPaper(bulkClear.dataset.bulkClear, false);
    const cell = e.target.closest('.q-cell[data-qkey]');
    if (cell) cycleQuestion(cell.dataset.qkey, +1);
  });
  $('#papersGrid').addEventListener('contextmenu', e => {
    const cell = e.target.closest('.q-cell[data-qkey]');
    if (!cell) return;
    e.preventDefault();
    cycleQuestion(cell.dataset.qkey, -1);
  });
  $('#papersGrid').addEventListener('dblclick', e => {
    const cell = e.target.closest('.q-cell[data-qkey]');
    if (cell) openDrawer(cell.dataset.qkey);
  });

  // deferred queue actions
  $('#deferFilter').addEventListener('click', e => {
    const btn = e.target.closest('[data-dfilter]');
    if (!btn) return;
    getState().ui.deferred.filter = btn.dataset.dfilter;
    saveState();
    renderDeferredPage();
  });
  $('#deferList').addEventListener('click', e => {
    const doneBtn = e.target.closest('[data-defer-done]');
    const editBtn = e.target.closest('[data-defer-edit]');
    const jumpBtn = e.target.closest('[data-defer-jump]');
    if (doneBtn) {
      const q = parseKey(doneBtn.dataset.deferDone);
      const label = `${subjectById(q.subjectId).short} ${q.year} · ${q.paperId === 'P1' ? 'Paper I' : 'Paper II'} · Q${q.qNo} — Done (from Deferred Queue)`;
      setStatus(doneBtn.dataset.deferDone, 'done', q.subjectId, label);
      toast('Cleared from the Deferred Queue. 💪');
      refreshAll();
      return;
    }
    if (editBtn) return openDrawer(editBtn.dataset.deferEdit);
    if (jumpBtn) {
      const key = jumpBtn.dataset.deferJump;
      const q = parseKey(key);
      const ui = currentPapersUI();
      ui.subjectId = q.subjectId;
      ui.year = q.year;
      ui.filter = 'all';
      saveState();
      navigate('papers');
      renderPapersPage();
      requestAnimationFrame(() => {
        const cell = $(`.q-cell[data-qkey="${cssEscape(key)}"]`);
        if (cell) { cell.scrollIntoView({ block: 'center', behavior: 'smooth' }); flashCell(key); }
      });
    }
  });

  // syllabus page actions
  $('#syllabusCols').addEventListener('click', e => {
    const cycle = e.target.closest('[data-cycle-unit]');
    if (cycle) { cycleUnit(cycle.dataset.subject, cycle.dataset.cycleUnit); return; }
    const del = e.target.closest('[data-del-unit]');
    if (del) {
      const { subject, delUnit } = del.dataset;
      const state = getState();
      state.syllabus[subject] = state.syllabus[subject].filter(u => u.id !== delUnit);
      saveState();
      toast('Custom unit removed.');
      refreshAll();
    }
  });
  $('#syllabusCols').addEventListener('submit', e => {
    const form = e.target.closest('[data-add-unit-form]');
    if (!form) return;
    e.preventDefault();
    const sid = form.dataset.addUnitForm;
    const nameInput = form.elements.unitName;
    const yieldSel = form.elements.unitYield;
    const name = nameInput.value.trim();
    if (!name) return;
    getState().syllabus[sid].push({
      id: sid + '-custom-' + Date.now().toString(36),
      name,
      part: 'My units',
      yield: yieldSel.value,
      status: 'todo',
      completedAt: null,
      custom: true,
    });
    saveState();
    toast('Unit added — tap the circle to advance it as you go.');
    refreshAll();
  });

  // drawer wiring
  $('#closeDrawer').addEventListener('click', closeDrawer);
  $('#drawerOverlay').addEventListener('click', closeDrawer);
  $$('.status-choice').forEach(btn => btn.addEventListener('click', () => {
    drawerSetStatus(btn.dataset.st === 'clear' ? '' : btn.dataset.st);
  }));
  $('#skipReason').addEventListener('change', e => {
    if (!drawerKey) return;
    const reason = e.target.value;
    patchEntry(drawerKey, reason === 'syllabus' ? { reason } : { reason, unlockUnit: '' });
    $('#drawerMeta').textContent = 'Saved just now · key ' + drawerKey;
    refreshAll();
  });
  $('#unlockUnit').addEventListener('change', e => {
    if (!drawerKey) return;
    patchEntry(drawerKey, { unlockUnit: e.target.value });
    $('#drawerMeta').textContent = 'Saved just now · key ' + drawerKey;
    refreshAll();
  });
  $('#qNote').addEventListener('input', e => {
    if (!drawerKey) return;
    if (!getEntry(drawerKey)) { // typing a note on a pristine question auto-marks it as "review" so the note isn't lost
      setStatus(drawerKey, 'review', parseKey(drawerKey).subjectId, 'Note added — auto marked “Needs redo”');
      renderDrawerStatus('review');
      $('#skipTools').hidden = true;
    }
    patchEntry(drawerKey, { note: e.target.value });
  });
  $('#qMinutes').addEventListener('input', e => {
    if (!drawerKey) return;
    const v = Math.max(0, Math.min(600, Number(e.target.value) || 0));
    if (getEntry(drawerKey)) patchEntry(drawerKey, { minutes: v });
  });

  // settings
  $('#setName').addEventListener('input', e => { getState().settings.name = e.target.value; saveState(); renderDashboard(); });
  $('#setExamDate').addEventListener('change', e => {
    if (!e.target.value) return;
    getState().settings.examDate = e.target.value;
    saveState(); updateChrome();
    toast('Exam date updated — countdown recalculated.');
  });
  $('#setWeeklyGoal').addEventListener('change', e => {
    const v = Math.max(1, Math.min(400, Number(e.target.value) || DEFAULT_WEEKLY_GOAL));
    getState().settings.weeklyGoal = v;
    e.target.value = v;
    saveState(); updateChrome();
    toast('Weekly goal set to ' + v + ' questions.');
  });
  $('#exportBtn').addEventListener('click', downloadBackup);
  $('#exportQuickBtn').addEventListener('click', downloadBackup);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJSON(String(reader.result));
        toast('Backup restored. Welcome back.');
        renderSettings();
        refreshAll();
      } catch (err) {
        console.error(err);
        toast('Import failed: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Reset EVERYTHING — all paper progress, syllabus ticks, notes and streak? This cannot be undone. Export a backup first if in doubt.')) return;
    resetAll();
    renderSettings();
    refreshAll();
    navigate('dashboard');
    toast('Fresh slate. The grind begins again.');
  });

  // plan page
  $('#printPlanBtn').addEventListener('click', () => window.print());
  renderPlanLinks();

  // keyboard shortcuts
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (typing) return;
    const map = { 1: 'dashboard', 2: 'papers', 3: 'deferred', 4: 'syllabus', 5: 'plan', 6: 'settings' };
    if (map[e.key]) navigate(map[e.key]);
  });

  // first paint
  renderSettings();
  updateChrome();
  refreshAll();
  navigate(getState().ui.page || 'dashboard');
}

function bulkMarkPaper(paperId, markDone) {
  const ui = currentPapersUI();
  const subject = subjectById(ui.subjectId);
  const paper = subject.papers.find(p => p.id === paperId);
  if (!paper) return;
  const label = `${subject.short} ${ui.year} · ${paper.name} — ${markDone ? 'whole paper marked done' : 'paper cleared'}`;
  if (!markDone && !confirm(`Clear every mark on ${ui.year} · ${paper.name}? Notes and skip reasons in this paper will be deleted.`)) return;

  let count = 0;
  for (const part of paper.parts) {
    for (let n = part.start; n < part.start + part.count; n++) {
      const key = qKey(subject.id, ui.year, paper.id, part.id, n);
      if (markDone) {
        const prev = getState().progress[key] || {};
        getState().progress[key] = { ...prev, status: 'done', updatedAt: Date.now() };
      } else {
        delete getState().progress[key];
      }
      count++;
    }
  }
  getState().activity.push({ ts: Date.now(), type: markDone ? 'bulk_done' : 'bulk_clear', key: `${subject.id}|${ui.year}|${paperId}`, subjectId: subject.id, label, count });
  saveState();
  toast(markDone ? `${count} questions marked done. Crushing it.` : 'Paper cleared.');
  refreshAll();
}

let __booted = false;
function boot() {
  if (__booted) return;
  __booted = true;
  init();
}
document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();
