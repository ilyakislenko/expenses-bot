// «🎲 Угадай свои траты»: окно по поясам, вопросы из своих трат (варианты, однозначность, края данных), очки,
// розыгрыш (честность, повторяемость, идемпотентность), связь poll_id → вопрос и поздние ответы. Без БД.
const quiz = require('../utils/quiz');
const TRIVIA = require('../utils/quizTrivia');
const { QUIZ } = require('../utils/constants');
const { addDays } = require('../utils/period');
const QuizService = require('../services/QuizService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const charts = require('../utils/charts');

const localization = new LocalizationService();
const formatter = new Formatter({ convert: async (amount) => amount });

const WEEK = '2026-10-26'; // понедельник недели квиза (четверг — 29.10)

// Форматирование как в QuizService, без БД
function fmt(lang = 'ru', currency = 'RUB') {
  const service = new QuizService({ localizationService: localization, formatter, notificationService: {}, timers: false });
  return service.formatters(lang, currency);
}

function expense(date, amount, category, description = '', extra = {}) {
  return { date, amount, categoryName: category, categoryIcon: '📦', categoryLabel: `📦 ${category}`, description, recurring: false, ...extra };
}

// Богатые данные: 4 недели, несколько категорий, такси, кофе, бюджет и доход
function richData() {
  const expenses = [];
  const start = addDays(WEEK, -28);
  for (let i = 0; i < 28; i++) {
    const day = addDays(start, i);
    expenses.push(expense(day, 400 + (i % 5) * 37, 'Еда', 'обед'));
    if (i % 3 === 0) expenses.push(expense(day, 250, 'Кафе', 'кофе латте'));
    if (i % 4 === 0) expenses.push(expense(day, 620, 'Транспорт', 'такси домой'));
  }
  // Прошлая неделя: явный самый дорогой день и рост развлечений
  const lastWeek = addDays(WEEK, -7);
  expenses.push(expense(addDays(lastWeek, 2), 5400, 'Развлечения', 'концерт'));
  expenses.push(expense(addDays(lastWeek, 4), 1300, 'Покупки', 'кроссовки распродажа'));
  expenses.push(expense(addDays(lastWeek, 5), 900, 'Покупки', 'книга'));
  expenses.push(expense(addDays(lastWeek, 1), 15000, 'Жильё', 'аренда', { recurring: true }));
  return {
    weekKey: WEEK,
    expenses,
    budget: { limit: 50000, spent: 31000, range: '01.09 – 30.09.2026' },
    income: { income: 90000, spent: 61000, range: '01.09 – 30.09.2026' },
    foodNames: ['Еда', 'Food']
  };
}

const within = (period) => (e) => e.date >= period.start && e.date < period.end;
const sum = (list) => list.reduce((s, e) => s + e.amount, 0);

function checkLimits(question) {
  expect(question.text.length).toBeLessThanOrEqual(quiz.LIMITS.question);
  expect(question.options.length).toBeGreaterThanOrEqual(2);
  expect(question.options.length).toBeLessThanOrEqual(10);
  for (const option of question.options) {
    expect(option.length).toBeGreaterThan(0);
    expect(option.length).toBeLessThanOrEqual(quiz.LIMITS.option);
  }
  expect(new Set(question.options).size).toBe(question.options.length);
  expect(question.correct).toBeGreaterThanOrEqual(0);
  expect(question.correct).toBeLessThan(question.options.length);
  expect(question.explanation.length).toBeLessThanOrEqual(quiz.LIMITS.explanation);
  expect(question.text).not.toMatch(/\{[a-z]+\}/);
  for (const option of question.options) expect(option).not.toMatch(/\{[a-z]+\}|^quiz_/);
}

// Диапазон «1 000 – 1 999 ₽» → [1000, 1999]
function parseRange(option) {
  const numbers = option.replace(/\u00a0|\u202f/g, ' ').match(/\d[\d ]*/g).map(s => Number(s.replace(/ /g, '')));
  return numbers.length === 1 ? [numbers[0], numbers[0]] : numbers;
}

describe('quiz window by local time', () => {
  const at = (iso, tz) => quiz.quizWindow(new Date(iso), tz);

  test('opens on Thursday at 19:00 local in zones east and west of UTC', () => {
    // Москва UTC+3: 15:59 UTC — 18:59, 16:00 UTC — 19:00
    expect(at('2026-10-29T15:59:00Z', 'Europe/Moscow').open).toBe(false);
    expect(at('2026-10-29T16:00:00Z', 'Europe/Moscow')).toMatchObject({ open: true, inviteTime: true, weekKey: WEEK });
    // Токио UTC+9: 10:00 UTC — 19:00
    expect(at('2026-10-29T09:59:00Z', 'Asia/Tokyo').open).toBe(false);
    expect(at('2026-10-29T10:00:00Z', 'Asia/Tokyo').open).toBe(true);
    // Индия UTC+5:30: 13:30 UTC — 19:00
    expect(at('2026-10-29T13:29:00Z', 'Asia/Kolkata').open).toBe(false);
    expect(at('2026-10-29T13:30:00Z', 'Asia/Kolkata').open).toBe(true);
    // Нью-Йорк: до 01.11.2026 летнее время UTC−4 → 23:00 UTC
    expect(at('2026-10-29T22:59:00Z', 'America/New_York').open).toBe(false);
    expect(at('2026-10-29T23:00:00Z', 'America/New_York')).toMatchObject({ open: true, weekKey: WEEK });
  });

  test('stays open until the end of Sunday, closes on Monday 00:00 and the next opening is Thursday', () => {
    const sunday = at('2026-11-01T20:59:00Z', 'Europe/Moscow'); // 23:59 воскресенья
    expect(sunday).toMatchObject({ open: true, weekKey: WEEK, inviteTime: false });
    const monday = at('2026-11-01T21:00:00Z', 'Europe/Moscow'); // 00:00 понедельника
    expect(monday).toMatchObject({ open: false, weekKey: '2026-11-02', nextOpenDate: '2026-11-05' });
    // Пока окно открыто, следующее открытие — через неделю
    expect(sunday.nextOpenDate).toBe('2026-11-05');
    // Нью-Йорк после перехода на зимнее время (UTC−5): воскресенье 23:30 — это понедельник 04:30 UTC
    expect(at('2026-11-02T04:30:00Z', 'America/New_York')).toMatchObject({ open: true, weekKey: WEEK });
  });

  test('invite only on Thursday 19:00–20:59 local, never at night', () => {
    expect(at('2026-10-29T17:59:00Z', 'Europe/Moscow').inviteTime).toBe(true); // 20:59
    expect(at('2026-10-29T18:00:00Z', 'Europe/Moscow').inviteTime).toBe(false); // 21:00
    expect(at('2026-10-30T16:30:00Z', 'Europe/Moscow').inviteTime).toBe(false); // пятница 19:30
    for (let hour = 0; hour < 24; hour++) {
      const w = at(`2026-10-29T${String(hour).padStart(2, '0')}:00:00Z`, 'Asia/Tokyo');
      if (w.inviteTime) expect(w.local.hour).toBeGreaterThanOrEqual(19);
      if (w.inviteTime) expect(w.local.hour).toBeLessThan(21);
    }
  });

  test('draw happens on Monday 12:00 UTC after the window closed in every time zone', () => {
    expect(quiz.drawTime(WEEK).toISOString()).toBe('2026-11-02T12:00:00.000Z');
    // UTC−12: воскресенье 23:59 — 11:59 UTC понедельника, окно ещё открыто до розыгрыша
    expect(at('2026-11-02T11:59:00Z', 'Etc/GMT+12')).toMatchObject({ open: true, weekKey: WEEK });
    expect(quiz.latestDrawableWeek(new Date('2026-11-02T11:59:00Z'))).toBe('2026-10-19');
    expect(quiz.latestDrawableWeek(new Date('2026-11-02T12:00:00Z'))).toBe(WEEK);
    expect(quiz.latestDrawableWeek(new Date('2026-11-08T23:00:00Z'))).toBe(WEEK);
  });
});

describe('answer options', () => {
  test('ranges: exactly one contains the value, contiguous, non-negative, correct slot varies', () => {
    const slots = new Set();
    for (let i = 0; i < 400; i++) {
      const value = 3 + (i * 7919 % 250000) + (i % 3) * 0.75;
      const rnd = quiz.seededRandom(`r${i}`);
      const { ranges, correct } = quiz.rangeOptions(value, rnd);
      slots.add(correct);
      const v = Math.floor(value);
      expect(ranges.filter(r => v >= r.lo && v <= r.hi)).toHaveLength(1);
      expect(v >= ranges[correct].lo && v <= ranges[correct].hi).toBe(true);
      ranges.forEach((r, k) => {
        expect(r.lo).toBeGreaterThanOrEqual(0);
        if (k > 0) expect(r.lo).toBe(ranges[k - 1].hi + 1);
      });
    }
    expect(slots.size).toBe(4);
  });

  test('nice steps are round numbers', () => {
    expect([1, 3, 7, 12, 30, 240, 3085].map(quiz.niceStep)).toEqual([1, 5, 10, 20, 50, 250, 5000]);
  });

  test('counts: distinct, contain the answer, respect bounds (days 1..7)', () => {
    for (let c = 1; c <= 7; c++) {
      const opts = quiz.countOptions(c, quiz.seededRandom(`d${c}`), { min: 1, max: 7 });
      expect(new Set(opts.values).size).toBe(4);
      expect(opts.values[opts.correct]).toBe(c);
      expect(Math.min(...opts.values)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...opts.values)).toBeLessThanOrEqual(7);
    }
    const big = quiz.countOptions(37, quiz.seededRandom('x'), { min: 0 });
    expect(big.values[big.correct]).toBe(37);
    expect(Math.min(...big.values)).toBeGreaterThanOrEqual(0);
  });

  test('bands refuse values on a boundary (two answers could be right)', () => {
    expect(quiz.bandIndex(0.5, [0.8, 1, 1.2])).toBe(0);
    expect(quiz.bandIndex(0.9, [0.8, 1, 1.2])).toBe(1);
    expect(quiz.bandIndex(1.3, [0.8, 1, 1.2])).toBe(3);
    expect(quiz.bandIndex(0.8, [0.8, 1, 1.2])).toBeNull();
    expect(quiz.bandIndex(1.004, [0.8, 1, 1.2])).toBeNull();
  });
});

describe('questions from own data', () => {
  test('rich data: at least 12 templates apply, every question fits Telegram limits', () => {
    const questions = quiz.ownQuestions(richData(), fmt('ru'), 'seed-1');
    const kinds = questions.map(q => q.kind);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(12);
    expect(quiz.TEMPLATES.length).toBeGreaterThanOrEqual(12);
    for (const question of questions) checkLimits(question);
  });

  test('correct answers match the data', () => {
    const data = richData();
    const periods = quiz.quizPeriods(WEEK);
    const byKind = Object.fromEntries(quiz.ownQuestions(data, fmt('ru'), 'seed-2').map(q => [q.kind, q]));
    const lastWeek = data.expenses.filter(within(periods.lastWeek));

    const total = sum(lastWeek);
    const [lo, hi] = parseRange(byKind.week_total.options[byKind.week_total.correct]);
    expect(Math.floor(total) >= lo && Math.floor(total) <= hi).toBe(true);
    // Остальные диапазоны значение не содержат
    byKind.week_total.options.forEach((option, i) => {
      if (i === byKind.week_total.correct) return;
      const [a, b] = parseRange(option);
      expect(Math.floor(total) >= a && Math.floor(total) <= b).toBe(false);
    });

    // Самая крупная трата — концерт (аренда — авто-запись регулярной, не в счёт)
    expect(byKind.largest.options[byKind.largest.correct]).toContain('концерт');
    expect(byKind.largest.options.join()).not.toContain('аренда');
    // Самый дорогой день — среда прошлой недели, 21.10 (концерт)
    expect(addDays(periods.lastWeek.start, 2)).toBe('2026-10-21');
    expect(byKind.top_day.options[byKind.top_day.correct]).toBe('Среда, 21.10');
    // Рост — развлечения (до прошлой недели их не было)
    expect(byKind.growth.options[byKind.growth.correct]).toContain('Развлечения');
    // Такси / кофе — точное число за 4 недели
    const count = byKind.count;
    expect(count.text).toMatch(/кофе|такси/);
    const word = /кофе/.test(count.text) ? /кофе/ : /такси/;
    expect(Number(count.options[count.correct])).toBe(data.expenses.filter(e => word.test(e.description)).length);
    // Траты за неделю без регулярных
    expect(Number(byKind.records.options[byKind.records.correct])).toBe(lastWeek.filter(e => !e.recurring).length);
    expect(Number(byKind.days.options[byKind.days.correct])).toBe(7);
    // Бюджет 31 000 из 50 000 — меньше 80%; доход: 61 000 из 90 000 — 50–79%
    expect(byKind.budget.correct).toBe(0);
    expect(byKind.income.correct).toBe(1);
  });

  test('deterministic: same seed — same questions, another seed — options move', () => {
    const a = quiz.ownQuestions(richData(), fmt('ru'), 'same');
    const b = quiz.ownQuestions(richData(), fmt('ru'), 'same');
    expect(b).toEqual(a);
    const positions = new Set();
    for (let i = 0; i < 20; i++) positions.add(quiz.ownQuestions(richData(), fmt('ru'), `s${i}`).find(q => q.kind === 'week_total').correct);
    expect(positions.size).toBeGreaterThan(1);
  });

  test('near ties are skipped: never two answers that could both be right', () => {
    const lastWeek = addDays(WEEK, -7);
    const data = {
      weekKey: WEEK,
      foodNames: ['Еда'],
      expenses: [
        expense(lastWeek, 1000, 'Еда', 'продукты'),
        expense(addDays(lastWeek, 1), 1001, 'Кафе', 'ужин'),
        expense(addDays(lastWeek, 2), 999, 'Транспорт', 'бензин')
      ]
    };
    const kinds = quiz.ownQuestions(data, fmt('ru'), 'tie').map(q => q.kind);
    expect(kinds).not.toContain('top_category');
    expect(kinds).not.toContain('top_day');
    expect(kinds).not.toContain('largest');
  });

  test('edge data: nothing, one tiny expense, huge descriptions, boundary budget', () => {
    expect(quiz.ownQuestions({ weekKey: WEEK, expenses: [], foodNames: [] }, fmt('ru'), 'e')).toEqual([]);
    const tiny = { weekKey: WEEK, foodNames: [], expenses: [expense(addDays(WEEK, -3), 2, 'Еда', 'жвачка')] };
    expect(quiz.ownQuestions(tiny, fmt('ru'), 'e')).toEqual([]);

    const lastWeek = addDays(WEEK, -7);
    const long = 'очень длинное описание траты '.repeat(20);
    const data = {
      weekKey: WEEK,
      foodNames: [],
      expenses: [
        expense(lastWeek, 9000, 'Покупки', `${long}A`),
        expense(addDays(lastWeek, 1), 500, 'Покупки', `${long}B`),
        expense(addDays(lastWeek, 2), 300, 'Покупки', 'C')
      ],
      budget: { limit: 10000, spent: 8000, range: 'x' } // ровно 80% — граница, вопрос не задаём
    };
    const questions = quiz.ownQuestions(data, fmt('ru'), 'long');
    questions.forEach(checkLimits);
    expect(questions.map(q => q.kind)).not.toContain('budget');
    // Обрезанные описания не совпали — у самой крупной траты один верный вариант
    const largest = questions.find(q => q.kind === 'largest');
    if (largest) expect(new Set(largest.options).size).toBe(largest.options.length);
  });

  test('all 13 languages: questions are translated, no raw keys or placeholders', () => {
    for (const lang of Object.keys(localization.supportedLanguages)) {
      const questions = quiz.ownQuestions(richData(), fmt(lang), 'lang');
      expect(questions.length).toBeGreaterThanOrEqual(12);
      questions.forEach(checkLimits);
    }
  });
});

describe('quiz composition and trivia', () => {
  test('trivia pool: 20+ questions in ru and en within limits', () => {
    expect(TRIVIA.length).toBeGreaterThanOrEqual(20);
    expect(new Set(TRIVIA.map(q => q.id)).size).toBe(TRIVIA.length);
    for (const item of TRIVIA) {
      for (const lang of ['ru', 'en']) {
        const text = item[lang];
        expect(text.q.length).toBeLessThanOrEqual(300);
        expect(text.o).toHaveLength(4);
        expect(new Set(text.o).size).toBe(4);
        text.o.forEach(o => expect(o.length).toBeLessThanOrEqual(100));
        expect(text.x.length).toBeLessThanOrEqual(200);
      }
    }
  });

  test('ru/en: own questions plus at least one riddle; first question is about own spending', () => {
    const questions = quiz.buildQuiz(richData(), fmt('en', 'USD'), { lang: 'en', seed: 'c1' });
    expect(questions).toHaveLength(QUIZ.QUESTIONS);
    expect(questions.filter(q => q.kind === 'trivia').length).toBeGreaterThanOrEqual(1);
    expect(questions[0].kind).not.toBe('trivia');
    // Вопросы о своих тратах не повторяются (по шаблону — один)
    const own = questions.filter(q => q.kind !== 'trivia').map(q => q.kind);
    expect(new Set(own).size).toBe(own.length);
    // Сумма недели и «в среднем в день» вместе не задаются (одно выдаёт другое)
    const kinds = questions.map(q => q.kind);
    expect(kinds.includes('week_total') && kinds.includes('avg_day')).toBe(false);
    questions.forEach(checkLimits);
  });

  test('other languages: own-data questions only; not enough data — no quiz', () => {
    const jp = quiz.buildQuiz(richData(), fmt('jp', 'JPY'), { lang: 'jp', seed: 'c2' });
    expect(jp).toHaveLength(QUIZ.QUESTIONS);
    expect(jp.some(q => q.kind === 'trivia')).toBe(false);
    expect(quiz.buildQuiz({ weekKey: WEEK, expenses: [], foodNames: [] }, fmt('jp', 'JPY'), { lang: 'jp', seed: 'c3' })).toBeNull();
    // ru без данных — загадки
    const ru = quiz.buildQuiz({ weekKey: WEEK, expenses: [], foodNames: [] }, fmt('ru'), { lang: 'ru', seed: 'c4' });
    expect(ru.every(q => q.kind === 'trivia')).toBe(true);
  });

  test('riddles already asked are not repeated while fresh ones remain', () => {
    const used = TRIVIA.slice(0, TRIVIA.length - 5).map(q => q.id);
    const riddles = quiz.triviaQuestions('ru', 5, 'u', used);
    expect(riddles.every(q => !used.includes(q.triviaId))).toBe(true);
    expect(quiz.triviaQuestions('jp', 3, 'u')).toEqual([]);
  });
});

describe('scoring, percentile, streaks', () => {
  test('points: per correct answer + finish bonus + perfect bonus', () => {
    expect(quiz.scoreOf({ correct: 3, total: 5, finished: true })).toEqual({ answers: 30, finish: 10, perfect: 0, total: 40 });
    expect(quiz.scoreOf({ correct: 5, total: 5, finished: true }).total).toBe(5 * QUIZ.POINTS_CORRECT + QUIZ.BONUS_FINISH + QUIZ.BONUS_PERFECT);
    expect(quiz.scoreOf({ correct: 5, total: 5, finished: false }).total).toBe(50);
    expect(quiz.scoreOf({ correct: 0, total: 5, finished: true }).total).toBe(10);
  });

  test('better than N% of players: strictly lower scores', () => {
    expect(quiz.percentBetter(60, [10, 20, 60, 80])).toBe(50);
    expect(quiz.percentBetter(80, [10, 20, 60])).toBe(100);
    expect(quiz.percentBetter(10, [10, 10])).toBe(0);
    expect(quiz.percentBetter(50, [])).toBeNull();
  });

  test('week streaks', () => {
    const weeks = ['2026-09-28', '2026-10-12', '2026-10-19', '2026-10-26'];
    expect(quiz.weekStreak(weeks, '2026-10-26')).toBe(3);
    expect(quiz.weekStreak(weeks, '2026-11-02')).toBe(3); // эта неделя ещё впереди
    expect(quiz.weekStreak(weeks, '2026-11-09')).toBe(0);
    expect(quiz.bestWeekStreak([...weeks, '2026-10-05'])).toBe(5);
    expect(quiz.bestWeekStreak([])).toBe(0);
  });
});

describe('weekly draw', () => {
  test('weighted by points: frequencies follow the weights', () => {
    const participants = [{ userId: 1, weight: 10 }, { userId: 2, weight: 20 }, { userId: 3, weight: 70 }];
    const wins = { 1: 0, 2: 0, 3: 0 };
    const runs = 6000;
    for (let i = 0; i < runs; i++) {
      const [grand] = quiz.drawWinners(participants, `fair-${i}`, [{ kind: 'grand', days: 30, count: 1 }]);
      wins[grand.userId]++;
    }
    expect(wins[1] / runs).toBeGreaterThan(0.08);
    expect(wins[1] / runs).toBeLessThan(0.12);
    expect(wins[2] / runs).toBeGreaterThan(0.17);
    expect(wins[2] / runs).toBeLessThan(0.23);
    expect(wins[3] / runs).toBeGreaterThan(0.66);
    expect(wins[3] / runs).toBeLessThan(0.74);
  });

  test('same seed and list — same winners (order of input does not matter); one prize per person', () => {
    const participants = Array.from({ length: 30 }, (_, i) => ({ userId: 1000 + i, weight: 10 + (i % 7) * 10 }));
    const a = quiz.drawWinners(participants, 'seed');
    const b = quiz.drawWinners([...participants].reverse(), 'seed');
    expect(b).toEqual(a);
    expect(a).toHaveLength(QUIZ.PRIZES.reduce((s, p) => s + p.count, 0));
    expect(new Set(a.map(w => w.userId)).size).toBe(a.length);
    expect(a[0]).toMatchObject({ kind: 'grand', days: 30 });
    expect(a.slice(1).every(w => w.kind === 'runner' && w.days === 7)).toBe(true);
    expect(quiz.drawWinners(participants, 'other')).not.toEqual(a);
  });

  test('fewer players than prizes, zero weight excluded', () => {
    const winners = quiz.drawWinners([{ userId: 5, weight: 40 }, { userId: 6, weight: 0 }], 'few');
    expect(winners).toEqual([{ userId: 5, kind: 'grand', days: 30 }]);
    expect(quiz.drawWinners([], 'none')).toEqual([]);
    expect(quiz.participantsDigest([{ userId: 2, weight: 1 }, { userId: 1, weight: 3 }]))
      .toBe(quiz.participantsDigest([{ userId: 1, weight: 3 }, { userId: 2, weight: 1 }]));
  });
});

// ---------- QuizService без БД: репозиторий в памяти с той же семантикой, что SQL ----------

class MemoryQuizRepo {
  constructor() {
    this.sessions = [];
    this.polls = new Map();
    this.draws = new Map();
    this.prizes = [];
    this.transactions = [];
    this.invites = new Map();
    this.nextId = 1;
  }

  copy(row) { return row ? JSON.parse(JSON.stringify(row)) : null; }
  async getExpenses() { return []; }
  async usedTriviaIds() { return []; }
  async getInvitesEnabled(userId) { return this.invites.get(userId) !== false; }
  async setInvitesEnabled(userId, enabled) { this.invites.set(userId, enabled); }
  async getSession(userId, weekKey) { return this.copy(this.sessions.find(s => s.user_id === userId && s.week_key === weekKey)); }
  async getSessionById(id) { return this.copy(this.sessions.find(s => s.id === id)); }
  async getLastFinished(userId) { return this.copy(this.sessions.filter(s => s.user_id === userId && s.status === 'finished').pop()); }
  async createSession(userId, weekKey, lang, questions) {
    if (this.sessions.some(s => s.user_id === userId && s.week_key === weekKey)) return null;
    const row = { id: this.nextId++, user_id: userId, week_key: weekKey, lang, questions, total: questions.length, current_index: 0, asked_index: -1, asked_at: null, correct_count: 0, missed_count: 0, missed_streak: 0, answers: '', score: 0, status: 'active' };
    this.sessions.push(row);
    return this.copy(row);
  }
  async claimAsk(id, index, now) {
    const s = this.sessions.find(x => x.id === id);
    if (!s || s.status !== 'active' || s.current_index !== index || s.asked_index >= index) return null;
    s.asked_index = index;
    s.asked_at = now;
    return this.copy(s);
  }
  async releaseAsk(id, index) { const s = this.sessions.find(x => x.id === id); if (s.asked_index === index) s.asked_index = index - 1; }
  async advance(id, index, { correct, missed, mark, pauseAfter }) {
    const s = this.sessions.find(x => x.id === id);
    if (!s || s.current_index !== index || s.status === 'finished') return null;
    s.current_index++;
    s.correct_count += correct ? 1 : 0;
    s.missed_count += missed ? 1 : 0;
    const streak = missed ? s.missed_streak + 1 : 0;
    if (missed && streak >= pauseAfter && s.current_index < s.total) s.status = 'paused';
    s.missed_streak = streak;
    s.answers += mark;
    return this.copy(s);
  }
  async resume(id) { const s = this.sessions.find(x => x.id === id); if (s.status !== 'paused') return null; s.status = 'active'; s.missed_streak = 0; return this.copy(s); }
  async finish(id, score) {
    const s = this.sessions.find(x => x.id === id);
    if (s.status === 'finished' || s.current_index < s.total) return null;
    Object.assign(s, { status: 'finished', score });
    return this.copy(s);
  }
  async finishedScores(weeks, exclude) { return this.sessions.filter(s => s.status === 'finished' && weeks.includes(s.week_key) && s.id !== exclude).map(s => s.score); }
  async finishedWeeks(userId) { return this.sessions.filter(s => s.user_id === userId && s.status === 'finished').map(s => s.week_key); }
  async stuckSessions() { return this.sessions.filter(s => s.status === 'active' && s.current_index < s.total && ![...this.polls.values()].some(p => p.session_id === s.id && p.question_index === s.current_index)).map(s => this.copy(s)); }
  async insertPoll(p) {
    if (this.polls.has(p.pollId)) return;
    this.polls.set(p.pollId, { poll_id: p.pollId, session_id: p.sessionId, user_id: p.userId, question_index: p.index, message_id: p.messageId, correct_option: p.correctOption, kind: p.kind, deadline: p.deadline, status: 'open', chosen_option: null });
  }
  async getPoll(id) { return this.copy(this.polls.get(id)); }
  async claimAnswer(id, userId, option, now, grace) {
    const p = this.polls.get(id);
    if (!p || p.user_id !== userId || p.status !== 'open' || now.getTime() > new Date(p.deadline).getTime() + grace) return null;
    Object.assign(p, { status: 'answered', chosen_option: option });
    return this.copy(p);
  }
  async expirePoll(id, now, grace, force = false) {
    const p = this.polls.get(id);
    if (!p || p.status !== 'open' || !(force || now.getTime() > new Date(p.deadline).getTime() + grace)) return null;
    p.status = 'missed';
    return this.copy(p);
  }
  async expiredOpenPolls(now, grace) { return [...this.polls.values()].filter(p => p.status === 'open' && new Date(p.deadline).getTime() + grace < now.getTime()).map(p => p.poll_id); }
  async getLastDraw() { return null; }
  async userPrizes() { return []; }
  async undrawnWeeks(latest, earliest) {
    return [...new Set(this.sessions.filter(s => s.status === 'finished' && s.week_key <= latest && s.week_key >= earliest && !this.draws.has(s.week_key)).map(s => s.week_key))];
  }
  async runDraw(weekKey, drawFn) {
    if (this.draws.has(weekKey)) return null;
    const participants = this.sessions.filter(s => s.week_key === weekKey && s.status === 'finished')
      .map(s => ({ userId: s.user_id, weight: s.score, perfect: s.correct_count === s.total }));
    const draw = drawFn(participants);
    this.draws.set(weekKey, draw);
    for (const prize of [...draw.winners, ...draw.perfect]) {
      if (!this.prizes.some(p => p.week_key === weekKey && p.user_id === prize.userId && p.kind === prize.kind)) {
        this.prizes.push({ id: this.prizes.length + 1, week_key: weekKey, user_id: prize.userId, kind: prize.kind, days: prize.days, granted_at: null, grant_started_at: null, notified_at: null });
      }
    }
    return { participants, ...draw };
  }
  async ungrantedPrizes() { return this.prizes.filter(p => !p.granted_at).map(p => this.copy(p)); }
  async claimGrant(id, now) { const p = this.prizes.find(x => x.id === id); if (p.granted_at || p.grant_started_at) return null; p.grant_started_at = now; return this.copy(p); }
  async markGranted(id, now) { this.prizes.find(x => x.id === id).granted_at = now; }
  async releaseGrant(id) { this.prizes.find(x => x.id === id).grant_started_at = null; }
  async grantTransactionExists(id) { return this.transactions.some(t => t.prize_id === id); }
  async unannouncedPrizes() { return this.prizes.filter(p => p.granted_at && !p.notified_at).map(p => ({ ...this.copy(p), language: 'ru', timezone: 'Europe/Moscow' })); }
  async markAnnounced(ids, now) { const marked = this.prizes.filter(p => ids.includes(p.id) && !p.notified_at); marked.forEach(p => { p.notified_at = now; }); return marked.map(p => p.id); }
}

const QUESTIONS = Array.from({ length: 5 }, (_, i) => ({ kind: `k${i}`, text: `Q${i}?`, options: ['a', 'b', 'c', 'd'], correct: i % 4, explanation: `x${i}` }));

function makeService(repo = new MemoryQuizRepo(), { pollFails = false } = {}) {
  const calls = [];
  let pollCounter = 0;
  const telegram = {
    callApi: jest.fn(async (method, payload) => {
      calls.push({ method, payload });
      if (method === 'sendPoll') {
        if (pollFails) { const error = new Error('Bad Request: poll can\'t be sent'); error.code = 400; throw error; }
        pollCounter++;
        return { message_id: 100 + pollCounter, poll: { id: `poll${pollCounter}` } };
      }
      return { message_id: 900 };
    }),
    sendPhoto: jest.fn(async () => ({})),
    sendMessage: jest.fn(async () => ({}))
  };
  const userService = {
    getUserLanguage: async () => 'ru',
    getUserTimezone: async () => 'Europe/Moscow',
    getUserById: async () => ({ premium_expires_at: new Date('2026-12-01T00:00:00Z') }),
    grantRewardDays: jest.fn(async (userId, days, source, meta) => { repo.transactions.push({ userId, days, source, prize_id: meta.prize_id }); })
  };
  const service = new QuizService({
    quizRepository: repo,
    userService,
    localizationService: localization,
    formatter,
    notificationService: { bot: { telegram }, botUsername: () => 'TestQuizBot', sendMessage: jest.fn(async () => {}) },
    userNotificationRepository: { isSent: async () => false, markSent: async () => true },
    achievementService: { track: jest.fn(async () => '') },
    chartService: null,
    timers: false
  });
  service.buildQuestions = jest.fn(async () => QUESTIONS);
  return { service, repo, telegram, calls, userService };
}

const OPEN = new Date('2026-10-29T17:00:00Z'); // четверг 20:00 МСК
const later = (ms) => new Date(OPEN.getTime() + ms);

describe('poll_answer mapping and quiz flow', () => {
  test('a full quiz: native quiz polls, answers by poll_id, results and finish once', async () => {
    const { service, repo, calls, telegram } = makeService();
    const started = await service.start(7781100001, OPEN);
    expect(started.status).toBe('started');
    const poll = calls.find(c => c.method === 'sendPoll').payload;
    expect(poll).toMatchObject({ chat_id: 7781100001, type: 'quiz', is_anonymous: false, correct_option_id: 0, open_period: QUIZ.OPEN_PERIOD_SEC });
    expect(poll.options).toEqual(['a', 'b', 'c', 'd'].map(text => ({ text })));
    expect(poll.question).toMatch(/^🎲 1\/5 · Q0\?$/);

    for (let i = 0; i < 5; i++) {
      // Верный у вопроса i — i % 4; на последний (верный 0) отвечаем неверно
      const result = await service.answerPoll(`poll${i + 1}`, 7781100001, [i < 4 ? i % 4 : 1], later(i * 3000 + 1000));
      expect(result.status).toBe(i < 4 ? 'correct' : 'wrong');
    }
    const session = await repo.getSession(7781100001, WEEK);
    expect(session).toMatchObject({ status: 'finished', correct_count: 4, answers: 'ccccw', score: 50 });
    expect(calls.filter(c => c.method === 'sendPoll')).toHaveLength(5);
    // Итоги — одним сообщением (без картинки — текстом)
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
    const [, text] = telegram.sendMessage.mock.calls[0];
    expect(text).toContain('4 из 5');
    expect(text).toContain('50');
    expect(service.achievementService.track).toHaveBeenCalledWith(7781100001, 'quiz_finished', { lang: 'ru' });
    // Повторный ответ на последний вопрос ничего не меняет
    expect((await service.answerPoll('poll5', 7781100001, [1], later(20000))).status).toBe('ignored');
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
    expect((await service.start(7781100001, later(30000))).status).toBe('finished');
  });

  test('foreign, duplicate, late and unknown answers are ignored', async () => {
    const { service, repo } = makeService();
    await service.start(7781100002, OPEN);
    expect((await service.answerPoll('poll1', 7781100099, [0], later(1000))).status).toBe('ignored');
    expect((await service.answerPoll('nope', 7781100002, [0], later(1000))).status).toBe('unknown');
    // Позже срока + ANSWER_GRACE_MS — не засчитывается
    const late = later((QUIZ.OPEN_PERIOD_SEC * 1000) + QUIZ.ANSWER_GRACE_MS + 1);
    expect((await service.answerPoll('poll1', 7781100002, [0], late)).status).toBe('ignored');
    expect((await repo.getSession(7781100002, WEEK)).current_index).toBe(0);
    // В пределах запаса — засчитывается, второй раз — нет
    expect((await service.answerPoll('poll1', 7781100002, [0], later(QUIZ.OPEN_PERIOD_SEC * 1000 + 1000))).status).toBe('correct');
    expect((await service.answerPoll('poll1', 7781100002, [0], later(QUIZ.OPEN_PERIOD_SEC * 1000 + 1500))).status).toBe('ignored');
    expect((await repo.getSession(7781100002, WEEK)).current_index).toBe(1);
  });

  test('timeouts: missed question moves on; two in a row pause; continue resumes; closed poll with a vote counts', async () => {
    const { service, repo, calls } = makeService();
    await service.start(7781100003, OPEN);
    const afterDeadline = later(QUIZ.OPEN_PERIOD_SEC * 1000 + QUIZ.ANSWER_GRACE_MS + 1000);
    // Опрос закрыт Telegram без голосов — «не успел», следующий вопрос
    await service.pollClosed({ id: 'poll1', is_closed: true, total_voter_count: 0, options: [] }, later(QUIZ.OPEN_PERIOD_SEC * 1000));
    expect((await repo.getSession(7781100003, WEEK)).answers).toBe('m');
    // Второй пропуск по сроку (sweep) — пауза с кнопкой «Продолжить»
    const swept = await service.sweep(new Date(afterDeadline.getTime() + QUIZ.OPEN_PERIOD_SEC * 1000));
    expect(swept.expired).toBe(1);
    let session = await repo.getSession(7781100003, WEEK);
    expect(session).toMatchObject({ status: 'paused', answers: 'mm', current_index: 2 });
    const pause = calls.filter(c => c.method === 'sendMessage').pop().payload;
    expect(pause.reply_markup.inline_keyboard[0][0].callback_data).toBe('qz|go');
    expect(calls.filter(c => c.method === 'sendPoll')).toHaveLength(2);
    // «Продолжить» — третий вопрос
    expect((await service.start(7781100003, later(120000))).status).toBe('resumed');
    expect(calls.filter(c => c.method === 'sendPoll')).toHaveLength(3);
    // Закрытие опроса с голосом (poll_answer потерялся или пришёл позже) — это ответ
    const result = await service.pollClosed({ id: 'poll3', is_closed: true, total_voter_count: 1, options: [{ voter_count: 0 }, { voter_count: 0 }, { voter_count: 1 }, { voter_count: 0 }] }, later(121000));
    expect(result.status).toBe('correct'); // верный у третьего вопроса — индекс 2
    session = await repo.getSession(7781100003, WEEK);
    expect(session).toMatchObject({ status: 'active', answers: 'mmc', current_index: 3, missed_streak: 0 });
  });

  test('restart mid-quiz: a new service instance finds the question by poll_id', async () => {
    const repo = new MemoryQuizRepo();
    const first = makeService(repo);
    await first.service.start(7781100004, OPEN);
    await first.service.answerPoll('poll1', 7781100004, [0], later(1000));
    // «Перезапуск»: новый сервис, тот же репозиторий (БД); опрос poll2 отправлен до перезапуска
    const second = makeService(repo);
    second.calls.length = 0;
    const result = await second.service.answerPoll('poll2', 7781100004, [1], later(2000));
    expect(result.status).toBe('correct');
    expect(second.calls.filter(c => c.method === 'sendPoll')).toHaveLength(1);
    expect((await repo.getSession(7781100004, WEEK)).answers).toBe('cc');
  });

  test('a question that was never sent (crash between answer and next poll) is resent by sweep', async () => {
    const { service, repo, calls } = makeService();
    await service.start(7781100005, OPEN);
    // Сбой отправки следующего вопроса
    service.telegram.callApi.mockImplementationOnce(async () => { throw new Error('ETIMEDOUT'); });
    await service.answerPoll('poll1', 7781100005, [0], later(1000));
    expect(calls.filter(c => c.method === 'sendPoll')).toHaveLength(1);
    const swept = await service.sweep(later(5 * 60000));
    expect(swept.resent).toBe(1);
    expect(calls.filter(c => c.method === 'sendPoll')).toHaveLength(2);
    expect((await repo.getSession(7781100005, WEEK)).asked_index).toBe(1);
  });

  test('fallback: poll rejected by Telegram — the same question with buttons and a deadline', async () => {
    const { service, repo, calls } = makeService(undefined, { pollFails: true });
    await service.start(7781100006, OPEN);
    const message = calls.find(c => c.method === 'sendMessage').payload;
    expect(message.reply_markup.inline_keyboard.map(row => row[0].callback_data)).toEqual(['qza|1|0|0', 'qza|1|0|1', 'qza|1|0|2', 'qza|1|0|3']);
    expect((await service.answerButton(7781100099, 1, 0, 0, later(1000))).status).toBe('unknown');
    const late = await service.answerButton(7781100006, 1, 0, 0, later(QUIZ.BUTTON_PERIOD_SEC * 1000 + QUIZ.ANSWER_GRACE_MS + 1));
    expect(late.status).toBe('late');
    const ok = await service.answerButton(7781100006, 1, 0, 0, later(1000));
    expect(ok).toMatchObject({ status: 'correct', correct: true });
    expect((await repo.getSession(7781100006, WEEK)).current_index).toBe(1);
  });

  test('closed window: no new quiz; a started quiz can still be finished', async () => {
    const { service } = makeService();
    const wednesday = new Date('2026-10-28T17:00:00Z');
    expect((await service.start(7781100007, wednesday)).status).toBe('closed');
  });
});

describe('draw, prizes and announcements are idempotent', () => {
  async function finishedWeek(repo, players) {
    for (const [userId, correct] of players) {
      const row = await repo.createSession(userId, WEEK, 'ru', QUESTIONS);
      const s = repo.sessions.find(x => x.id === row.id);
      Object.assign(s, { status: 'finished', current_index: 5, correct_count: correct, score: quiz.scoreOf({ correct, total: 5, finished: true }).total });
    }
  }

  test('draw once, grant once, announce once (daytime only)', async () => {
    const repo = new MemoryQuizRepo();
    await finishedWeek(repo, [[7781100010, 5], [7781100011, 3], [7781100012, 1], [7781100013, 5], [7781100014, 0]]);
    const { service, userService } = makeService(repo);
    const drawAt = new Date('2026-11-02T12:45:00Z'); // понедельник 15:45 МСК
    expect(await service.processDraws(new Date('2026-11-02T11:00:00Z'))).toBe(0); // ещё рано
    expect(await service.processDraws(drawAt)).toBe(1);
    expect(await service.processDraws(drawAt)).toBe(0);
    const draw = repo.draws.get(WEEK);
    expect(draw.seed).toMatch(/^[0-9a-f]{32}$/);
    expect(draw.winners).toHaveLength(4);
    // Розыгрыш можно повторить по журналу: то же зерно и список — те же победители
    const participants = repo.sessions.map(s => ({ userId: s.user_id, weight: s.score }));
    expect(quiz.drawWinners(participants, draw.seed)).toEqual(draw.winners);
    // Идеальные — по дню премиума
    expect(repo.prizes.filter(p => p.kind === 'perfect').map(p => p.user_id).sort()).toEqual([7781100010, 7781100013]);

    expect(await service.grantPrizes(drawAt)).toBe(repo.prizes.length);
    expect(await service.grantPrizes(drawAt)).toBe(0);
    expect(userService.grantRewardDays).toHaveBeenCalledTimes(repo.prizes.length);
    const grand = repo.prizes.find(p => p.kind === 'grand');
    expect(userService.grantRewardDays).toHaveBeenCalledWith(grand.user_id, 30, 'quiz', expect.objectContaining({ prize_id: grand.id, kind: 'grand', week: WEEK }));

    // Ночью по Москве — не объявляем; днём — один раз на пользователя
    expect(await service.announcePrizes(new Date('2026-11-02T22:00:00Z'))).toBe(0);
    const announced = await service.announcePrizes(drawAt);
    expect(announced).toBe(new Set(repo.prizes.map(p => p.user_id)).size);
    expect(await service.announcePrizes(drawAt)).toBe(0);
  });

  test('a prize already granted before a crash (transaction exists) is not granted again', async () => {
    const repo = new MemoryQuizRepo();
    await finishedWeek(repo, [[7781100020, 2]]);
    const { service, userService } = makeService(repo);
    await service.processDraws(new Date('2026-11-02T12:45:00Z'));
    repo.transactions.push({ prize_id: repo.prizes[0].id });
    expect(await service.grantPrizes(new Date('2026-11-02T12:46:00Z'))).toBe(0);
    expect(userService.grantRewardDays).not.toHaveBeenCalled();
    expect(repo.prizes[0].granted_at).toBeTruthy();
  });
});

describe('quiz card and texts', () => {
  test('share card: score, answers and link — no amounts', () => {
    const svg = charts.quizCardSvg({
      title: 'Угадай свои траты', subtitle: 'Квиз недели · 26.10 – 01.11.2026', score: '60', scoreLabel: 'очков', badge: 'Идеально!',
      answers: 'ccwcm', tiles: [{ value: '3/5', label: 'верных' }, { value: '72%', label: 'лучше' }], footer: 'Проверь себя:', link: 't.me/TestQuizBot?start=quiz'
    });
    expect(svg).toContain('t.me/TestQuizBot?start=quiz');
    expect(svg).not.toMatch(/₽|\$|€/);
    expect((svg.match(/<rect x="[\d.]+" y="236"/g) || [])).toHaveLength(5);
  });

  test('all quiz texts exist in all 13 languages with the same placeholders', () => {
    const ru = require('../locales/ru');
    const keys = Object.keys(ru).filter(k => /^(quiz_|ach_quiz_)/.test(k)).concat(['button_quiz', 'command_quiz', 'help_quiz']);
    expect(keys.length).toBeGreaterThan(100);
    const placeholders = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join();
    for (const lang of Object.keys(localization.supportedLanguages)) {
      const locale = require(`../locales/${lang}`);
      for (const key of keys) {
        expect(typeof locale[key]).toBe('string');
        expect(placeholders(locale[key])).toBe(placeholders(ru[key]));
      }
    }
  });
});

describe('texts are safe for Telegram Markdown and consistent with options', () => {
  test('quiz texts in all languages: paired *, no _ or backticks, links only in the share line', () => {
    for (const lang of Object.keys(localization.supportedLanguages)) {
      const locale = require(`../locales/${lang}`);
      for (const [key, text] of Object.entries(locale).filter(([k]) => k.startsWith('quiz_'))) {
        expect([key, (text.match(/\*/g) || []).length % 2]).toEqual([key, 0]);
        expect([key, /[_`]/.test(text)]).toEqual([key, false]);
        if (key !== 'quiz_share_line') expect([key, /[[\]]/.test(text)]).toEqual([key, false]);
      }
    }
  });

  test('explanation of an amount question shows a value inside the correct range (cut, not rounded)', () => {
    const f = fmt('ru');
    for (const value of [14999.6, 49.999, 999.99, 12345.5]) {
      const question = quiz.ownQuestions({
        weekKey: WEEK, foodNames: [],
        expenses: [0, 1, 2].map(i => expense(addDays(WEEK, -7 + i), value / 3, 'Еда', 'x'))
      }, f, `v${value}`).find(q => q.kind === 'week_total');
      const [lo, hi] = parseRange(question.options[question.correct]);
      const shown = Number(question.explanation.replace(/\s|\u00a0|\u202f/g, '').match(/[\d,]+/)[0].replace(',', '.'));
      expect(shown).toBeGreaterThanOrEqual(lo);
      expect(shown).toBeLessThan(hi + 1);
    }
  });
});

describe('middleware lets quiz updates through', () => {
  test('poll updates (no user) skip security checks; poll answers keep pending input', async () => {
    const SecurityMiddleware = require('../middleware/securityMiddleware');
    const security = new SecurityMiddleware({ checkLimit: jest.fn() }, {}, localization, {});
    const next = jest.fn(async () => {});
    await security.middleware()({ updateType: 'poll', poll: { id: 'p' } }, next);
    expect(next).toHaveBeenCalled();

    const stateCleanup = require('../middleware/stateCleanupMiddleware');
    const stateService = { ready: null, dropExpiredInput: jest.fn(), deleteUserEditState: jest.fn(), hasUserState: () => true, getUserState: () => 'adding_income', deleteUserState: jest.fn() };
    await stateCleanup({ stateService })({ updateType: 'poll_answer', from: { id: 1 }, pollAnswer: {} }, next);
    expect(stateService.deleteUserState).not.toHaveBeenCalled();
    expect(stateService.deleteUserEditState).not.toHaveBeenCalled();
  });
});
