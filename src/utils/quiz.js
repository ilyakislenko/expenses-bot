// «🎲 Угадай свои траты»: чистые функции квиза недели — окно по местному времени, вопросы из своих трат
// (шаблоны, правдоподобные неправильные ответы), очки, «лучше, чем N% игроков», серия недель и честный розыгрыш.
// Случайность — детерминированная (sha256 от зерна): те же данные и зерно дают те же вопросы и тот же розыгрыш.
const crypto = require('crypto');
const { addDays, parseYmd } = require('./period');
const { KEYWORDS } = require('./wrapped');
const { QUIZ } = require('./constants');
const TRIVIA = require('./quizTrivia');

// Пределы Telegram для опроса-викторины
const LIMITS = { question: 300, option: 100, explanation: 200, minOptions: 2, maxOptions: 10 };
// «Больше всех» засчитывается, только если первое место заметно впереди: почти ничья — два верных ответа
const UNIQUE_MARGIN = 1.05;
// Порог-граница вариантов (80% бюджета, 20% роста…): значение ближе этого к границе — вопрос не задаём
const BOUNDARY_EPSILON = 0.01;
const DAY_MS = 86400000;
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

// ---------- Время ----------

// День недели локальной даты: 1 — понедельник … 7 — воскресенье
function isoWeekday(dateStr) {
  const { y, m, d } = parseYmd(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

function weekStart(dateStr) {
  return addDays(dateStr, 1 - isoWeekday(dateStr));
}

// Локальные дата, час и день недели момента now (летнее время учитывает Intl)
function localMoment(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, hour: Number(parts.hour) % 24, weekday: isoWeekday(date) };
}

// Окно квиза недели по местному времени: открыт с четверга OPEN_HOUR:00 до конца воскресенья.
// weekKey — понедельник недели; nextOpen — дата ближайшего (или текущего) открытия
function quizWindow(now, timezone) {
  const local = localMoment(now, timezone);
  const weekKey = weekStart(local.date);
  const openDate = addDays(weekKey, QUIZ.OPEN_WEEKDAY - 1);
  const open = local.date > openDate || (local.date === openDate && local.hour >= QUIZ.OPEN_HOUR);
  const inviteTime = local.date === openDate && local.hour >= QUIZ.INVITE_FROM_HOUR && local.hour < QUIZ.INVITE_TO_HOUR;
  return {
    weekKey, open, inviteTime, local, openDate,
    closeDate: addDays(weekKey, 6),
    nextOpenDate: open ? addDays(openDate, 7) : openDate
  };
}

// Розыгрыш недели weekKey — в понедельник после неё, DRAW_HOUR_UTC:00 UTC: воскресенье 23:59 в UTC−12 — это 11:59 UTC
function drawTime(weekKey) {
  const { y, m, d } = parseYmd(addDays(weekKey, 7));
  return new Date(Date.UTC(y, m - 1, d, QUIZ.DRAW_HOUR_UTC));
}

// Последняя неделя, розыгрыш которой уже наступил к моменту now
function latestDrawableWeek(now) {
  const utcDate = now.toISOString().slice(0, 10);
  let week = addDays(weekStart(utcDate), -7);
  if (now < drawTime(week)) week = addDays(week, -7);
  return week;
}

function weeksBetween(a, b) {
  const pa = parseYmd(a);
  const pb = parseYmd(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / (7 * DAY_MS));
}

// Серия недель подряд с пройденным квизом, заканчивающаяся неделей currentWeek (или прошлой — эта ещё может быть впереди)
function weekStreak(weekKeys, currentWeek) {
  const set = new Set(weekKeys);
  let week = set.has(currentWeek) ? currentWeek : addDays(currentWeek, -7);
  let count = 0;
  while (set.has(week)) {
    count++;
    week = addDays(week, -7);
  }
  return count;
}

function bestWeekStreak(weekKeys) {
  const sorted = [...new Set(weekKeys)].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((week, i) => {
    run = i > 0 && weeksBetween(sorted[i - 1], week) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// ---------- Случайность ----------

// Детерминированный генератор [0, 1) из строки-зерна: sha256(зерно:счётчик), 48 бит
function seededRandom(seed) {
  let counter = 0;
  return () => {
    const hash = crypto.createHash('sha256').update(`${seed}:${counter++}`).digest();
    return hash.readUIntBE(0, 6) / 2 ** 48;
  };
}

function pickIndex(rnd, length) {
  return Math.min(length - 1, Math.floor(rnd() * length));
}

// Перемешивание Фишера — Йетса (копия)
function shuffle(items, rnd) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = pickIndex(rnd, i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ---------- Текст ----------

// Обрезка по графемам с «…» (пределы Telegram — в символах UTF-16, считаем строже)
function clip(text, max) {
  const str = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (str.length <= max) return str;
  const parts = [...graphemes.segment(str)].map(s => s.segment);
  while (parts.length && `${parts.join('').trimEnd()}…`.length > max) parts.pop();
  return `${parts.join('').trimEnd()}…`;
}

// ---------- Варианты ответа ----------

// «Круглый» шаг: 1, 2, 2,5, 5 × 10^k (2,5 — только от 25, чтобы границы были целыми)
function niceStep(raw) {
  if (raw <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const multipliers = pow >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  for (const m of multipliers) if (m * pow >= raw) return m * pow;
  return 10 * pow;
}

// 4 соседних непересекающихся диапазона целых [lo, hi]; верный — тот, где целая часть значения. Место верного
// диапазона среди четырёх — случайное (не всегда «второй»), но не ниже нуля
function rangeOptions(value, rnd, count = 4) {
  const v = Math.floor(value);
  const step = niceStep(Math.max(1, v / 4));
  const base = Math.floor(v / step) * step;
  const below = Math.min(count - 1, Math.floor(base / step));
  const k = pickIndex(rnd, below + 1);
  const start = base - k * step;
  const ranges = Array.from({ length: count }, (_, i) => ({ lo: start + i * step, hi: start + (i + 1) * step - 1 }));
  return { ranges, correct: k };
}

// 4 разных целых с шагом ~четверть значения, в пределах [min, max] (не влезает — шаг 1); верное — c
function countOptions(c, rnd, { min = 0, max = Infinity, count = 4 } = {}) {
  for (const step of [...new Set([Math.max(1, Math.round(c / 4)), 1])]) {
    const positions = [];
    for (let k = 0; k < count; k++) {
      if (c - k * step >= min && c + (count - 1 - k) * step <= max) positions.push(k);
    }
    if (!positions.length) continue;
    const k = positions[pickIndex(rnd, positions.length)];
    return { values: Array.from({ length: count }, (_, i) => c + (i - k) * step), correct: k };
  }
  return null;
}

// Номер полосы по границам [b1, b2, b3]: значение ближе BOUNDARY_EPSILON к границе — null (спорно)
function bandIndex(value, bounds) {
  if (bounds.some(b => Math.abs(value - b) < BOUNDARY_EPSILON)) return null;
  const index = bounds.findIndex(b => value < b);
  return index === -1 ? bounds.length : index;
}

// Перемешанные варианты-подписи с верным (уникальные подписи, верный — первый во входном списке)
function labeledOptions(correctLabel, distractors, rnd, count = 4) {
  const seen = new Set([correctLabel]);
  const others = [];
  for (const label of distractors) {
    if (others.length >= count - 1) break;
    if (!label || seen.has(label)) continue;
    seen.add(label);
    others.push(label);
  }
  const options = shuffle([correctLabel, ...others], rnd);
  return { options, correct: options.indexOf(correctLabel) };
}

// ---------- Данные ----------

// Периоды относительно недели квиза: прошлая полная неделя, позапрошлая, 4 полные недели до текущей
function quizPeriods(weekKey) {
  return {
    lastWeek: { start: addDays(weekKey, -7), end: weekKey, last: addDays(weekKey, -1) },
    prevWeek: { start: addDays(weekKey, -14), end: addDays(weekKey, -7), last: addDays(weekKey, -8) },
    history: { start: addDays(weekKey, -28), end: addDays(weekKey, -7) }, // 3 недели до прошлой
    month: { start: addDays(weekKey, -28), end: weekKey, last: addDays(weekKey, -1) }
  };
}

const within = (period) => (e) => e.date >= period.start && e.date < period.end;
const sum = (items) => items.reduce((total, e) => total + e.amount, 0);

// Суммы по подписи категории (две категории с одной подписью — одна строка), по убыванию
function byCategory(expenses) {
  const map = new Map();
  for (const e of expenses) {
    const entry = map.get(e.categoryLabel) || { label: e.categoryLabel, name: e.categoryName, total: 0, count: 0 };
    entry.total += e.amount;
    entry.count++;
    map.set(e.categoryLabel, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function clearlyFirst(sorted, key = 'total') {
  return sorted.length >= 2 && sorted[0][key] > 0 && sorted[0][key] >= sorted[1][key] * UNIQUE_MARGIN && sorted[0][key] - sorted[1][key] >= 1;
}

// ---------- Шаблоны вопросов ----------
// build(ctx, rnd) → { text, options, correct, explanation } или null (данных не хватает / ответ спорный).
// ctx: { data, periods, f } — f: t(key, params), money(v), num(v), weekday(date)

function amountQuestion(ctx, rnd, textKey, value, params = {}) {
  const { f } = ctx;
  if (!(Math.floor(value) >= 4)) return null; // меньше 4 единиц валюты — диапазоны вырождаются в отдельные числа
  const { ranges, correct } = rangeOptions(value, rnd);
  const label = (r) => (r.lo === r.hi ? f.money(r.lo) : `${f.num(r.lo)} – ${f.money(r.hi)}`);
  return {
    text: f.t(textKey, params),
    options: ranges.map(label),
    correct,
    explanation: f.t('quiz_explain_value', { value: f.money(value) })
  };
}

const TEMPLATES = [
  {
    kind: 'week_total',
    group: 'week_amount',
    build(ctx, rnd) {
      const week = ctx.data.expenses.filter(within(ctx.periods.lastWeek));
      if (week.length < 3) return null;
      return amountQuestion(ctx, rnd, 'quiz_q_week_total', sum(week));
    }
  },
  {
    kind: 'avg_day',
    group: 'week_amount',
    build(ctx, rnd) {
      const week = ctx.data.expenses.filter(within(ctx.periods.lastWeek));
      if (week.length < 3 || sum(week) / 7 < 1) return null;
      return amountQuestion(ctx, rnd, 'quiz_q_avg_day', sum(week) / 7);
    }
  },
  {
    kind: 'week_category',
    build(ctx, rnd) {
      const categories = byCategory(ctx.data.expenses.filter(within(ctx.periods.lastWeek)));
      if (categories.length < 2) return null;
      // Еда — если её покупали хотя бы дважды; иначе вторая по сумме (первую спрашивает «на что больше всего»)
      const food = categories.find(c => ctx.data.foodNames.includes(c.name) && c.count >= 2);
      const category = food || categories.slice(1).find(c => c.count >= 2);
      if (!category) return null;
      return amountQuestion(ctx, rnd, 'quiz_q_week_category', category.total, { category: category.label });
    }
  },
  {
    kind: 'top_category',
    build(ctx, rnd) {
      const { f } = ctx;
      const week = byCategory(ctx.data.expenses.filter(within(ctx.periods.lastWeek)));
      if (week.length < 3 || !clearlyFirst(week)) return null;
      const month = byCategory(ctx.data.expenses.filter(within(ctx.periods.month)));
      const distractors = [...week.slice(1), ...month].map(c => c.label);
      const { options, correct } = labeledOptions(week[0].label, distractors, rnd);
      return { text: f.t('quiz_q_top_category'), options, correct, explanation: f.t('quiz_explain_detail', { answer: week[0].label, detail: f.money(week[0].total) }) };
    }
  },
  {
    kind: 'top_day',
    build(ctx, rnd) {
      const { f } = ctx;
      const week = ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.lastWeek));
      const days = new Map();
      for (const e of week) days.set(e.date, (days.get(e.date) || 0) + e.amount);
      const sorted = [...days].map(([date, total]) => ({ date, total })).sort((a, b) => b.total - a.total);
      if (sorted.length < 3 || !clearlyFirst(sorted)) return null;
      // Остальные три — сначала дни с тратами (правдоподобнее), затем без трат; в порядке дней недели
      const all = Array.from({ length: 7 }, (_, i) => addDays(ctx.periods.lastWeek.start, i));
      const rest = shuffle(sorted.slice(1).map(d => d.date), rnd).concat(shuffle(all.filter(d => !days.has(d)), rnd));
      const picked = [sorted[0].date, ...rest.slice(0, 3)].sort();
      return {
        text: f.t('quiz_q_top_day'),
        options: picked.map(d => f.weekday(d)),
        correct: picked.indexOf(sorted[0].date),
        explanation: f.t('quiz_explain_detail', { answer: f.weekday(sorted[0].date), detail: f.money(sorted[0].total) })
      };
    }
  },
  {
    kind: 'growth',
    build(ctx, rnd) {
      const { f } = ctx;
      const own = ctx.data.expenses.filter(e => !e.recurring);
      const history = own.filter(within(ctx.periods.history));
      if (!history.length) return null;
      const last = new Map(byCategory(own.filter(within(ctx.periods.lastWeek))).map(c => [c.label, c.total]));
      const base = new Map(byCategory(history).map(c => [c.label, c.total / 3]));
      const labels = [...new Set([...last.keys(), ...base.keys()])];
      if (labels.length < 3) return null;
      const growth = labels.map(label => ({ label, total: (last.get(label) || 0) - (base.get(label) || 0), last: last.get(label) || 0, base: base.get(label) || 0 }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
      const top = growth[0];
      if (top.total <= 0 || !(growth[1].total <= 0 || top.total >= growth[1].total * 1.1)) return null;
      const { options, correct } = labeledOptions(top.label, shuffle(growth.slice(1).map(g => g.label), rnd), rnd);
      return {
        text: f.t('quiz_q_growth'), options, correct,
        explanation: f.t('quiz_explain_growth', { answer: top.label, last: f.money(top.last), base: f.money(top.base) })
      };
    }
  },
  {
    kind: 'count',
    build(ctx, rnd) {
      const { f } = ctx;
      const month = ctx.data.expenses.filter(e => !e.recurring && e.description).filter(within(ctx.periods.month));
      const counts = KEYWORDS.map(({ key, pattern }) => ({ key, count: month.filter(e => pattern.test(e.description)).length }))
        .filter(c => c.count >= 2)
        .sort((a, b) => b.count - a.count);
      if (!counts.length) return null;
      const { key, count } = counts[0];
      const opts = countOptions(count, rnd, { min: 0 });
      return { text: f.t(`quiz_q_count_${key}`), options: opts.values.map(String), correct: opts.correct, explanation: f.t('quiz_explain_value', { value: String(count) }) };
    }
  },
  {
    kind: 'largest',
    build(ctx, rnd) {
      const { f } = ctx;
      const week = ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.lastWeek))
        .map(e => ({ ...e, label: clip(e.description ? `${e.categoryIcon || ''} ${e.description}`.trim() : e.categoryLabel, 60) }))
        .sort((a, b) => b.amount - a.amount);
      if (week.length < 3) return null;
      const top = week[0];
      // Самая крупная — одна: следующая с другим названием заметно меньше, а траты с тем же названием не путают ответ
      const others = week.slice(1).filter(e => e.label !== top.label);
      if (others.length < 2 || top.amount < others[0].amount * UNIQUE_MARGIN) return null;
      const { options, correct } = labeledOptions(top.label, others.map(e => e.label), rnd);
      if (options.length < 3) return null;
      return { text: f.t('quiz_q_largest'), options, correct, explanation: f.t('quiz_explain_value', { value: f.money(top.amount) }) };
    }
  },
  {
    kind: 'largest_amount',
    build(ctx, rnd) {
      const month = ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.month));
      if (month.length < 5) return null;
      return amountQuestion(ctx, rnd, 'quiz_q_largest_amount', Math.max(...month.map(e => e.amount)));
    }
  },
  {
    kind: 'week_vs_prev',
    build(ctx) {
      const { f } = ctx;
      const last = sum(ctx.data.expenses.filter(within(ctx.periods.lastWeek)));
      const prev = sum(ctx.data.expenses.filter(within(ctx.periods.prevWeek)));
      if (last <= 0 || prev <= 0) return null;
      const change = (last - prev) / prev;
      if (Math.abs(change) < BOUNDARY_EPSILON) return null; // «так же» — ни дороже, ни дешевле
      // Полосы: ≤ −20% · (−20%, 0) · (0, +20%) · ≥ +20%
      const band = bandIndex(change, [-0.2, 0, 0.2]);
      if (band === null) return null;
      const correct = 3 - band; // варианты от «дороже» к «дешевле»
      return {
        text: f.t('quiz_q_week_vs_prev'),
        options: [1, 2, 3, 4].map(i => f.t(`quiz_o_cmp_${i}`)),
        correct,
        explanation: f.t('quiz_explain_compare', { last: f.money(last), prev: f.money(prev) })
      };
    }
  },
  {
    kind: 'records',
    build(ctx, rnd) {
      const { f } = ctx;
      const count = ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.lastWeek)).length;
      if (count < 3) return null;
      const opts = countOptions(count, rnd, { min: 1 });
      return { text: f.t('quiz_q_records'), options: opts.values.map(String), correct: opts.correct, explanation: f.t('quiz_explain_value', { value: String(count) }) };
    }
  },
  {
    kind: 'days',
    build(ctx, rnd) {
      const { f } = ctx;
      const days = new Set(ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.lastWeek)).map(e => e.date)).size;
      if (days < 2) return null;
      const opts = countOptions(days, rnd, { min: 1, max: 7 });
      return { text: f.t('quiz_q_days'), options: opts.values.map(String), correct: opts.correct, explanation: f.t('quiz_explain_value', { value: String(days) }) };
    }
  },
  {
    kind: 'share',
    build(ctx) {
      const { f } = ctx;
      const month = ctx.data.expenses.filter(within(ctx.periods.month));
      const categories = byCategory(month);
      const total = sum(month);
      if (categories.length < 2 || total <= 0) return null;
      const share = categories[0].total / total;
      const band = bandIndex(share, [0.25, 0.5, 0.75]);
      if (band === null) return null;
      return {
        text: f.t('quiz_q_share', { category: categories[0].label }),
        options: ['0–24%', '25–49%', '50–74%', '75–100%'],
        correct: band,
        explanation: f.t('quiz_explain_value', { value: `${Math.round(share * 100)}%` })
      };
    }
  },
  {
    kind: 'weekend',
    build(ctx) {
      const { f } = ctx;
      const month = ctx.data.expenses.filter(e => !e.recurring).filter(within(ctx.periods.month));
      if (month.length < 8) return null;
      const weekend = sum(month.filter(e => isoWeekday(e.date) >= 6)) / 8; // 4 недели = 8 выходных дней
      const weekdays = sum(month.filter(e => isoWeekday(e.date) <= 5)) / 20;
      const diff = (weekend - weekdays) / Math.max(weekend, weekdays);
      if (Math.abs(Math.abs(diff) - 0.1) < BOUNDARY_EPSILON) return null;
      const correct = Math.abs(diff) < 0.1 ? 2 : (diff < 0 ? 0 : 1);
      return {
        text: f.t('quiz_q_weekend'),
        options: [f.t('quiz_o_weekdays'), f.t('quiz_o_weekend'), f.t('quiz_o_same')],
        correct,
        explanation: f.t('quiz_explain_weekend', { weekdays: f.money(weekdays), weekend: f.money(weekend) })
      };
    }
  },
  {
    kind: 'budget',
    build(ctx) {
      const { f } = ctx;
      const budget = ctx.data.budget;
      if (!budget || !(budget.limit > 0) || !(budget.spent > 0)) return null;
      const band = bandIndex(budget.spent / budget.limit, [0.8, 1.0, 1.2]);
      if (band === null) return null;
      return {
        text: f.t('quiz_q_budget', { range: budget.range }),
        options: [1, 2, 3, 4].map(i => f.t(`quiz_o_budget_${i}`)),
        correct: band,
        explanation: f.t('quiz_explain_budget', { spent: f.money(budget.spent), limit: f.money(budget.limit) })
      };
    }
  },
  {
    kind: 'income',
    build(ctx) {
      const { f } = ctx;
      const income = ctx.data.income;
      if (!income || !(income.income > 0) || !(income.spent > 0)) return null;
      const band = bandIndex(income.spent / income.income, [0.5, 0.8, 1.0]);
      if (band === null) return null;
      return {
        text: f.t('quiz_q_income', { range: income.range }),
        options: [1, 2, 3, 4].map(i => f.t(`quiz_o_income_${i}`)),
        correct: band,
        explanation: f.t('quiz_explain_budget', { spent: f.money(income.spent), limit: f.money(income.income) })
      };
    }
  }
];

// Вопрос в пределах Telegram: текст ≤ 300, варианты ≤ 100 и уникальны, верный — в списке
function finalize(question) {
  if (!question) return null;
  const options = question.options.map(o => clip(o, LIMITS.option));
  if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions) return null;
  if (new Set(options).size !== options.length) return null;
  if (!(question.correct >= 0 && question.correct < options.length)) return null;
  return {
    ...question,
    text: clip(question.text, LIMITS.question),
    options,
    explanation: clip(question.explanation || '', LIMITS.explanation)
  };
}

// Все вопросы о своих тратах, которые можно задать по этим данным (в порядке шаблонов)
function ownQuestions(data, f, seed) {
  const ctx = { data, periods: quizPeriods(data.weekKey), f };
  const result = [];
  for (const template of TEMPLATES) {
    const question = finalize(template.build(ctx, seededRandom(`${seed}:${template.kind}`)));
    if (question) result.push({ kind: template.kind, group: template.group || template.kind, ...question });
  }
  return result;
}

// Загадки про деньги (только ru/en): ещё не заданные этому пользователю, варианты перемешаны
function triviaQuestions(lang, count, seed, usedIds = []) {
  if (!QUIZ.TRIVIA_LANGUAGES.includes(lang) || count <= 0) return [];
  const used = new Set(usedIds.map(String));
  const fresh = TRIVIA.filter(q => !used.has(q.id));
  const pool = fresh.length >= count ? fresh : TRIVIA;
  return shuffle(pool, seededRandom(`${seed}:trivia`)).slice(0, count).map((item) => {
    const text = item[lang];
    const order = shuffle(text.o.map((_, i) => i), seededRandom(`${seed}:trivia:${item.id}`));
    return finalize({
      kind: 'trivia',
      group: `trivia_${item.id}`,
      triviaId: item.id,
      text: text.q,
      options: order.map(i => text.o[i]),
      correct: order.indexOf(0),
      explanation: text.x
    });
  }).filter(Boolean);
}

// Вопросы квиза: до MAX_OWN_WITH_TRIVIA о своих тратах + загадки (ru/en) или QUESTIONS о своих тратах (остальные
// языки). Из группы (сумма недели / в среднем в день — одно выдаёт другое) — один вопрос. null — вопросов не хватает
function buildQuiz(data, f, { lang, seed, usedTrivia = [], total = QUIZ.QUESTIONS } = {}) {
  const rnd = seededRandom(`${seed}:pick`);
  const groups = new Set();
  const own = [];
  for (const question of shuffle(ownQuestions(data, f, seed), rnd)) {
    if (groups.has(question.group)) continue;
    groups.add(question.group);
    own.push(question);
  }
  const withTrivia = QUIZ.TRIVIA_LANGUAGES.includes(lang);
  const ownCount = Math.min(own.length, withTrivia ? QUIZ.MAX_OWN_WITH_TRIVIA : total);
  const trivia = triviaQuestions(lang, total - ownCount, seed, usedTrivia);
  const questions = [...own.slice(0, ownCount), ...trivia];
  if (questions.length < total) return null;
  // Загадки — вперемешку со своими, но первый вопрос — всегда о своих тратах (если есть)
  const ordered = shuffle(questions, seededRandom(`${seed}:order`));
  const firstOwn = ordered.findIndex(q => q.kind !== 'trivia');
  if (firstOwn > 0) ordered.unshift(...ordered.splice(firstOwn, 1));
  return ordered.map(({ group, ...question }) => question);
}

// ---------- Очки ----------

function scoreOf({ correct, total, finished }) {
  const answers = correct * QUIZ.POINTS_CORRECT;
  const finish = finished ? QUIZ.BONUS_FINISH : 0;
  const perfect = finished && total > 0 && correct === total ? QUIZ.BONUS_PERFECT : 0;
  return { answers, finish, perfect, total: answers + finish + perfect };
}

// «Лучше, чем N% игроков»: доля других результатов строго ниже; null — сравнивать не с кем
function percentBetter(score, otherScores) {
  if (!otherScores.length) return null;
  return Math.floor(100 * otherScores.filter(s => s < score).length / otherScores.length);
}

// ---------- Розыгрыш ----------

// Взвешенный выбор без возвращения: шанс участника на каждый приз пропорционален его очкам среди оставшихся.
// Участники сортируются по id — результат зависит только от списка и зерна (его пишем в журнал розыгрыша)
function drawWinners(participants, seed, prizes = QUIZ.PRIZES) {
  const pool = participants.filter(p => p.weight > 0).map(p => ({ userId: Number(p.userId), weight: p.weight }))
    .sort((a, b) => a.userId - b.userId);
  const rnd = seededRandom(`draw:${seed}`);
  const winners = [];
  for (const prize of prizes) {
    for (let i = 0; i < prize.count && pool.length; i++) {
      const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
      let r = rnd() * totalWeight;
      let index = pool.findIndex((p) => (r -= p.weight) < 0);
      if (index === -1) index = pool.length - 1;
      winners.push({ userId: pool[index].userId, kind: prize.kind, days: prize.days });
      pool.splice(index, 1);
    }
  }
  return winners;
}

// Отпечаток списка участников для журнала: по нему можно проверить, что розыгрыш шёл по этому списку
function participantsDigest(participants) {
  const line = [...participants].map(p => `${p.userId}:${p.weight}`).sort().join(';');
  return crypto.createHash('sha256').update(line).digest('hex');
}

module.exports = {
  LIMITS,
  UNIQUE_MARGIN,
  TEMPLATES,
  isoWeekday,
  weekStart,
  localMoment,
  quizWindow,
  drawTime,
  latestDrawableWeek,
  weekStreak,
  bestWeekStreak,
  seededRandom,
  shuffle,
  clip,
  niceStep,
  rangeOptions,
  countOptions,
  bandIndex,
  quizPeriods,
  ownQuestions,
  triviaQuestions,
  buildQuiz,
  scoreOf,
  percentBetter,
  drawWinners,
  participantsDigest
};
