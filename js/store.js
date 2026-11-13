/* ============================================================
   store.js — State, persistence, stats & derived data
   Everything is stored client-side in localStorage.
   ============================================================ */

const STORAGE_KEY = 'al_ppt_state_v1';

const DEFAULT_EXAM_DATE = '2027-08-09'; // GCE A/L 2027 is expected around August 2027
const DEFAULT_WEEKLY_GOAL = 30;          // question-marks per week (done/review events)

function defaultState() {
  const syllabus = {};
  for (const sid of Object.keys(SYLLABUS_SEED)) {
    syllabus[sid] = SYLLABUS_SEED[sid].map(u => ({
      ...u,
      status: 'todo',          // todo | doing | done
      completedAt: null,
      custom: false,
    }));
  }
  return {
    version: 1,
    createdAt: Date.now(),
    settings: {
      name: '',
      examDate: DEFAULT_EXAM_DATE,
      weeklyGoal: DEFAULT_WEEKLY_GOAL,
    },
    syllabus,
    progress: {},   // qKey -> { status, reason, unlockUnit, note, minutes, updatedAt }
    activity: [],   // [{ ts, type, key, subjectId, label }]  (capped)
    ui: {
      page: 'dashboard',
      papers: { subjectId: 'cm', year: 2024, filter: 'all' },
      deferred: { filter: 'all' },
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    // Shallow-merge so new fields added in future versions survive old saves
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      syllabus: mergeSyllabus(base.syllabus, parsed.syllabus),
      progress: parsed.progress || {},
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      ui: { ...base.ui, ...(parsed.ui || {}) },
    };
  } catch (e) {
    console.error('State load failed, starting fresh', e);
    return defaultState();
  }
}

function mergeSyllabus(base, saved) {
  if (!saved) return base;
  const out = {};
  for (const sid of Object.keys(base)) {
    const savedUnits = saved[sid];
    if (!Array.isArray(savedUnits)) { out[sid] = base[sid]; continue; }
    const byId = new Map(savedUnits.map(u => [u.id, u]));
    const merged = base[sid].map(u => ({ ...u, ...(byId.get(u.id) || {}) }));
    const customs = savedUnits.filter(u => u.custom && !merged.some(m => m.id === u.id));
    out[sid] = merged.concat(customs);
  }
  return out;
}

let _state = loadState();

function getState() { return _state; }

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
}

function logActivity(type, key, subjectId, label, count) {
  _state.activity.push({ ts: Date.now(), type, key, subjectId, label, count: count || 1 });
  if (_state.activity.length > 800) _state.activity = _state.activity.slice(-800);
}

/* ---------- Question status helpers ---------- */
const cycleOrder = ['', 'done', 'skipped', 'review'];
const cycleBack = ['', 'review', 'skipped', 'done']; // right-click goes backwards

function getEntry(key) { return _state.progress[key] || null; }

function setStatus(key, status, subjectId, label, extra) {
  const prev = _state.progress[key] || {};
  if (!status) {
    delete _state.progress[key];
  } else {
    _state.progress[key] = {
      status,
      reason: prev.reason || '',
      unlockUnit: prev.unlockUnit || '',
      note: prev.note || '',
      minutes: prev.minutes || 0,
      ...(extra || {}),
      updatedAt: Date.now(),
    };
  }
  logActivity(status ? 'mark_' + status : 'clear', key, subjectId, label);
  saveState();
}

function patchEntry(key, patch) {
  const prev = _state.progress[key];
  if (!prev) return;
  _state.progress[key] = { ...prev, ...patch, updatedAt: Date.now() };
  saveState();
}

function entryLabel(q) {
  return `${subjectById(q.subjectId).short} ${q.year} · ${q.paperName.replace('Paper ', 'P')} · Q${q.qNo}`;
}

function subjectById(sid) { return SUBJECTS.find(s => s.id === sid); }
function unitById(sid, unitId) { return (_state.syllabus[sid] || []).find(u => u.id === unitId) || null; }

/* ============================================================
   Derived statistics
   ============================================================ */

function computeAll() {
  const perSubject = {};
  for (const s of SUBJECTS) {
    perSubject[s.id] = {
      subjectId: s.id,
      total: 0, done: 0, skipped: 0, review: 0, untouched: 0,
      byYear: {},                 // year -> {total, done, skipped, review}
      skipReasons: {},            // reason -> count
      deferredReady: 0, deferredWaiting: 0,
      minutes: 0,
    };
  }
  const totals = { total: 0, done: 0, skipped: 0, review: 0, untouched: 0 };

  for (const q of iterateAllQuestions()) {
    const st = perSubject[q.subjectId];
    const e = _state.progress[q.key];
    const status = e ? e.status : '';
    st.total++; totals.total++;
    if (!st.byYear[q.year]) st.byYear[q.year] = { total: 0, done: 0, skipped: 0, review: 0 };
    st.byYear[q.year].total++;

    if (status === 'done')    { st.done++;    totals.done++;    st.byYear[q.year].done++; }
    else if (status === 'review')  { st.review++;  totals.review++;  st.byYear[q.year].review++; }
    else if (status === 'skipped') {
      st.skipped++; totals.skipped++; st.byYear[q.year].skipped++;
      const r = e.reason || 'other';
      st.skipReasons[r] = (st.skipReasons[r] || 0) + 1;
      // Ready = not syllabus-gated, or the linked unit is now done
      if (r === 'syllabus') {
        const unit = e.unlockUnit ? unitById(q.subjectId, e.unlockUnit) : null;
        if (unit && unit.status === 'done') st.deferredReady++;
        else st.deferredWaiting++;
      } else {
        st.deferredReady++;
      }
    } else {
      st.untouched++; totals.untouched++;
    }
    if (e && e.minutes) st.minutes += Number(e.minutes) || 0;
  }

  const perSubjectList = SUBJECTS.map(s => {
    const st = perSubject[s.id];
    const units = _state.syllabus[s.id] || [];
    const unitsDone = units.filter(u => u.status === 'done').length;
    const unitsDoing = units.filter(u => u.status === 'doing').length;
    const highRemaining = units.filter(u => u.yield === 'high' && u.status !== 'done').length;
    const coverage = units.length ? unitsDone / units.length : 0;
    const qRate = st.total ? st.done / st.total : 0;
    // Readiness: half syllabus mastery, half question practice
    const readiness = Math.round(coverage * 50 + qRate * 50);
    return {
      ...st,
      coverage: Math.round(coverage * 100),
      unitsDone, unitsTotal: units.length, unitsDoing, highRemaining,
      doneRate: Math.round(qRate * 100),
      readiness,
    };
  });

  const donePapers = countCompletedPapers();
  totals.donePapers = donePapers;

  return { perSubject: perSubjectList, totals, weekly: weeklyProgress(), streak: currentStreak(), recent: recentActivity(8) };
}

function syllabusCoverage(sid) {
  const units = _state.syllabus[sid] || [];
  const done = units.filter(u => u.status === 'done').length;
  return units.length ? Math.round((done / units.length) * 100) : 0;
}

function countCompletedPapers() {
  let count = 0;
  for (const subject of SUBJECTS) {
    for (const year of YEARS) {
      for (const paper of subject.papers) {
        let all = true, any = false;
        for (const part of paper.parts) {
          for (let n = part.start; n < part.start + part.count; n++) {
            const e = _state.progress[qKey(subject.id, year, paper.id, part.id, n)];
            if (!e || e.status !== 'done') { all = false; break; }
            any = true;
          }
          if (!all) break;
        }
        if (all && any) count++;
      }
    }
  }
  return count;
}

/* ---------- Weekly goal & streaks ---------- */
function startOfLocalDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function weeklyProgress() {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  let count = 0;
  for (const a of _state.activity) {
    if (a.ts >= weekAgo && (a.type === 'mark_done' || a.type === 'mark_review')) count += (a.count || 1);
  }
  return { count, goal: Number(_state.settings.weeklyGoal) || DEFAULT_WEEKLY_GOAL };
}

function currentStreak() {
  if (!_state.activity.length) return 0;
  const days = new Set(_state.activity.map(a => startOfLocalDay(a.ts)));
  let streak = 0;
  let cursor = startOfLocalDay(Date.now());
  // Today may be empty but the streak still counts if yesterday was active
  if (!days.has(cursor)) cursor -= 24 * 3600 * 1000;
  while (days.has(cursor)) {
    streak++;
    cursor -= 24 * 3600 * 1000;
  }
  return streak;
}

function last7DaysActivity() {
  const out = [];
  const today = startOfLocalDay(Date.now());
  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * 24 * 3600 * 1000;
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const count = _state.activity.filter(a => a.ts >= dayStart && a.ts < dayEnd && a.type.startsWith('mark_')).length;
    out.push({ day: dayStart, count, label: new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }) });
  }
  return out;
}

function recentActivity(n) {
  return _state.activity.slice(-n).reverse();
}

/* ---------- Deferred queue ---------- */
function deferredItems() {
  const items = [];
  for (const q of iterateAllQuestions()) {
    const e = _state.progress[q.key];
    if (!e || e.status !== 'skipped') continue;
    const reason = e.reason || 'other';
    let ready = true;
    let unit = null;
    if (reason === 'syllabus') {
      unit = e.unlockUnit ? unitById(q.subjectId, e.unlockUnit) : null;
      ready = !!(unit && unit.status === 'done');
    } else {
      ready = true;
    }
    items.push({ ...q, entry: e, reason, ready, unit, subjectShort: subjectById(q.subjectId).short });
  }
  // Ready items first, then newest skip first
  items.sort((a, b) => (Number(b.ready) - Number(a.ready)) || (b.entry.updatedAt - a.entry.updatedAt));
  return items;
}

/* ---------- Import / export / reset ---------- */
function exportJSON() {
  return JSON.stringify(_state, null, 2);
}

function importJSON(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.progress) {
    throw new Error('Not a valid tracker export (missing progress data).');
  }
  const base = defaultState();
  _state = {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...(parsed.settings || {}) },
    syllabus: mergeSyllabus(base.syllabus, parsed.syllabus),
    ui: base.ui,
  };
  saveState();
}

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);
  _state = defaultState();
  saveState();
}
