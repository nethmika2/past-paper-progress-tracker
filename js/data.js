/* ============================================================
   data.js — Static seed data for the A/L Past Paper Tracker
   Subjects: Combined Mathematics · Physics · Chemistry
   Paper structures follow the G.C.E. (A/L) examination format
   in effect from 2019 onwards (NIE / Department of Examinations).
   Everything here is seed data — your progress lives in
   localStorage and can be exported from the Settings page.
   ============================================================ */

// Years currently available for tracking (last 15 A/L sittings)
const YEARS = [];
for (let y = 2011; y <= 2025; y++) YEARS.push(y);

// Paper structures per subject.
// parts[].count = how many questions the part lists
// parts[].start = first question number in the part
const SUBJECTS = [
  {
    id: 'cm',
    name: 'Combined Mathematics',
    short: 'Combined Maths',
    symbol: '∑',
    hue: 'gold',
    papers: [
      {
        id: 'P1',
        name: 'Paper I',
        meta: '3 h · 2 parts · Pure Mathematics',
        parts: [
          { id: 'A', name: 'Part A — 10 compulsory · 25 marks each (250)', count: 10, start: 1 },
          { id: 'B', name: 'Part B — answer 5 of 7 · 150 marks each (750)', count: 7, start: 11 }
        ]
      },
      {
        id: 'P2',
        name: 'Paper II',
        meta: '3 h · 2 parts · Applied Mathematics',
        parts: [
          { id: 'A', name: 'Part A — 10 compulsory · 25 marks each (250)', count: 10, start: 1 },
          { id: 'B', name: 'Part B — answer 5 of 7 · 150 marks each (750)', count: 7, start: 11 }
        ]
      }
    ]
  },
  {
    id: 'phy',
    name: 'Physics',
    short: 'Physics',
    symbol: '⚛',
    hue: 'sky',
    papers: [
      {
        id: 'P1',
        name: 'Paper I',
        meta: '2 h · 50 MCQ · 5 options · 2 marks each',
        parts: [
          { id: 'MCQ', name: '50 multiple-choice questions · 2 marks each', count: 50, start: 1 }
        ]
      },
      {
        id: 'P2',
        name: 'Paper II',
        meta: '3 h · structured + essays · choose 4 of 6 in Part B',
        parts: [
          { id: 'A', name: 'Part A — 4 structured essays · all · 10 marks each (40)', count: 4, start: 1 },
          { id: 'B', name: 'Part B — answer 4 of 6 · 15 marks each (60)', count: 6, start: 5 }
        ]
      }
    ]
  },
  {
    id: 'chem',
    name: 'Chemistry',
    short: 'Chemistry',
    symbol: '⚗',
    hue: 'emerald',
    papers: [
      {
        id: 'P1',
        name: 'Paper I',
        meta: '2 h · 50 MCQ · 5 options · 1 mark each',
        parts: [
          { id: 'MCQ', name: '50 multiple-choice questions · 1 mark each', count: 50, start: 1 }
        ]
      },
      {
        id: 'P2',
        name: 'Paper II',
        meta: '3 h · Part A all; answer 2 of 3 in Parts B & C',
        parts: [
          { id: 'A', name: 'Part A — General · Inorganic · Physical · Organic · all · 100 marks each (400)', count: 4, start: 1 },
          { id: 'B', name: 'Part B — answer 2 of 3 · 150 marks each (300)', count: 3, start: 5 },
          { id: 'C', name: 'Part C — answer 2 of 3 · 150 marks each (300)', count: 3, start: 8 }
        ]
      }
    ]
  }
];

/* ---------- Syllabus seed (editable from the Syllabus page) ----------
   yield: high | medium | low  (how strongly the unit tends to recur
   in past papers — use it to prioritise unfinished quarters)        */
const SYLLABUS_SEED = {
  cm: [
    // —— Combined Mathematics I (Pure) ——
    { id: 'cm-1',  name: 'Mathematical Induction & Number Systems', part: 'Part I · Pure', yield: 'medium' },
    { id: 'cm-2',  name: 'Functions, Quadratics & Inequalities',    part: 'Part I · Pure', yield: 'high'   },
    { id: 'cm-3',  name: 'Trigonometry (identities, equations)',    part: 'Part I · Pure', yield: 'high'   },
    { id: 'cm-4',  name: 'Sequences, Series & Binomial Theorem',    part: 'Part I · Pure', yield: 'medium' },
    { id: 'cm-5',  name: 'Coordinate Geometry (lines, circles)',    part: 'Part I · Pure', yield: 'high'   },
    { id: 'cm-6',  name: 'Differentiation & Applications',          part: 'Part I · Pure', yield: 'high'   },
    { id: 'cm-7',  name: 'Integration & Applications',              part: 'Part I · Pure', yield: 'high'   },
    { id: 'cm-8',  name: 'Complex Numbers',                         part: 'Part I · Pure', yield: 'medium' },
    { id: 'cm-9',  name: 'Matrices',                                part: 'Part I · Pure', yield: 'low'    },
    { id: 'cm-10', name: 'Permutations & Combinations',             part: 'Part I · Pure', yield: 'medium' },
    // —— Combined Mathematics II (Applied) ——
    { id: 'cm-11', name: 'Vectors',                                 part: 'Part II · Applied', yield: 'high'   },
    { id: 'cm-12', name: 'Systems of Coplanar Forces',              part: 'Part II · Applied', yield: 'medium' },
    { id: 'cm-13', name: 'Newtonian Mechanics (motion & momentum)', part: 'Part II · Applied', yield: 'high'   },
    { id: 'cm-14', name: 'Probability',                             part: 'Part II · Applied', yield: 'high'   },
    { id: 'cm-15', name: 'Statistics (distributions, inference)',   part: 'Part II · Applied', yield: 'high'   },
  ],
  phy: [
    { id: 'phy-1',  name: 'Kinematics & Vectors',                    part: 'Mechanics',      yield: 'high'   },
    { id: 'phy-2',  name: 'Forces & Newton’s Laws',                  part: 'Mechanics',      yield: 'high'   },
    { id: 'phy-3',  name: 'Work, Energy & Power',                    part: 'Mechanics',      yield: 'high'   },
    { id: 'phy-4',  name: 'Circular Motion & Gravitation',           part: 'Mechanics',      yield: 'medium' },
    { id: 'phy-5',  name: 'Properties of Matter (fluids, elasticity)', part: 'Matter & Heat', yield: 'medium' },
    { id: 'phy-6',  name: 'Thermal & Heat Physics',                  part: 'Matter & Heat',  yield: 'medium' },
    { id: 'phy-7',  name: 'Waves, Sound & Optics',                   part: 'Waves',          yield: 'high'   },
    { id: 'phy-8',  name: 'Electrostatics & Current Electricity',    part: 'Electricity',    yield: 'high'   },
    { id: 'phy-9',  name: 'Electromagnetism & Induction',            part: 'Electricity',    yield: 'medium' },
    { id: 'phy-10', name: 'Electronics (semiconductors, logic)',     part: 'Electronics',    yield: 'medium' },
    { id: 'phy-11', name: 'Modern Physics & Radioactivity',          part: 'Modern Physics', yield: 'medium' },
    { id: 'phy-12', name: 'Experimental & Practical Skills',         part: 'Practical',      yield: 'low'    },
  ],
  chem: [
    { id: 'chem-1',  name: 'Chemical Calculations & Atomic Structure', part: 'General Chemistry',   yield: 'medium' },
    { id: 'chem-2',  name: 'Periodicity & Chemical Bonding',           part: 'General Chemistry',   yield: 'high'   },
    { id: 'chem-3',  name: 'Gases, Liquids & Solutions',               part: 'Physical Chemistry',  yield: 'medium' },
    { id: 'chem-4',  name: 'Thermochemistry & Energetics',             part: 'Physical Chemistry',  yield: 'medium' },
    { id: 'chem-5',  name: 'Chemical Kinetics',                        part: 'Physical Chemistry',  yield: 'medium' },
    { id: 'chem-6',  name: 'Chemical Equilibrium',                     part: 'Physical Chemistry',  yield: 'high'   },
    { id: 'chem-7',  name: 'Acids, Bases & Volumetric Analysis',      part: 'Physical Chemistry',  yield: 'medium' },
    { id: 'chem-8',  name: 'Electrochemistry & Redox',                 part: 'Physical Chemistry',  yield: 'medium' },
    { id: 'chem-9',  name: 'Inorganic — s & p Block & Extraction',     part: 'Inorganic Chemistry', yield: 'high'   },
    { id: 'chem-10', name: 'Inorganic — d Block & Coordination',       part: 'Inorganic Chemistry', yield: 'low'    },
    { id: 'chem-11', name: 'Organic — Hydrocarbons & Haloalkanes',     part: 'Organic Chemistry',   yield: 'medium' },
    { id: 'chem-12', name: 'Organic — Oxygen & Nitrogen Compounds',    part: 'Organic Chemistry',   yield: 'high'   },
    { id: 'chem-13', name: 'Practical & Qualitative Analysis',         part: 'Practical',           yield: 'medium' },
    { id: 'chem-14', name: 'Environmental Chemistry',                  part: 'General Chemistry',   yield: 'low'    },
  ],
};

/* ---------- Reasons a question can be deferred ---------- */
const SKIP_REASONS = {
  syllabus: { label: 'Syllabus not covered yet', short: 'Syllabus',  desc: 'Waiting for this unit to be taught' },
  concept:  { label: 'Concept not clear',        short: 'Concept',   desc: 'Needs teaching, a video or a teacher — do it after revision' },
  time:     { label: 'Ran out of time',          short: 'Time',      desc: 'Paper done under time pressure — redo seriously later' },
  paper2choice: { label: 'Wouldn’t pick in exam', short: 'Choice',   desc: 'Optional question you’d never select — lower priority' },
  other:    { label: 'Other',                    short: 'Other',     desc: 'Any other reason' },
};

const STATUS = {
  done:    { label: 'Done',        glyph: '✓' },
  skipped: { label: 'Skipped',     glyph: '↷' },
  review:  { label: 'Needs redo',  glyph: '↺' },
};

// Handy links to official past-paper archives (shown in Plan & Settings)
const ARCHIVE_LINKS = [
  { name: 'Department of Examinations · Sri Lanka', note: 'doenets.lk — official papers & marking schemes', url: 'https://doenets.lk/' },
  { name: 'NIE — National Institute of Education',  note: 'Syllabi and 2019+ paper structures (nie.lk)',     url: 'https://www.nie.lk/' },
  { name: 'Agaram.lk past papers',                 note: 'Combined Mathematics · Physics · Chemistry papers', url: 'https://www.agaram.lk/' },
];

// Key used for one question-occurrence, e.g. "cm|2024|P1|A|3"
function qKey(subjectId, year, paperId, partId, qNo) {
  return [subjectId, year, paperId, partId, qNo].join('|');
}

// Iterate every question occurrence in the seeded universe
function* iterateAllQuestions() {
  for (const s of SUBJECTS) {
    for (const year of YEARS) {
      for (const paper of s.papers) {
        for (const part of paper.parts) {
          for (let n = part.start; n < part.start + part.count; n++) {
            yield {
              key: qKey(s.id, year, paper.id, part.id, n),
              subjectId: s.id, year,
              paperId: paper.id, paperName: paper.name,
              partId: part.id, partName: part.name,
              qNo: n,
            };
          }
        }
      }
    }
  }
}
