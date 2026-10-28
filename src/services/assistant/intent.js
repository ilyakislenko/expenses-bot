// Намерение вопроса — строгий JSON по маленькой схеме. Его присылает модель (или быстрый разбор fastPath.js), здесь
// оно проверяется: только типы из списка, периоды в разумных пределах, категории — только свои, текст поиска — короткий.
// Модель не пишет ни SQL, ни числа: из её ответа берутся только эти поля.
//
// Сырой формат (модель): { type, period, compare_to, categories: [имена], text_filter, limit, currency }
// Проверенный: { type, period: spec, compareTo: spec|null, categories: [категории], terms: [строки], limit, currency }
const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { parseYmd, daysInMonth, ymd } = require('../../utils/period');
const { ALL_TIME_START } = require('./periods');
const { normalizeText, plainWords, matchCategory, mentionsCategory } = require('./text');

const TYPES = [
  'spend_total', 'spend_by_category', 'top_expenses', 'largest_purchase', 'compare_periods', 'average_daily',
  'income_total', 'balance', 'savings_status', 'budget_status', 'count_records', 'subscriptions', 'debt_status'
];
const TYPE_ALIASES = {
  total: 'spend_total', spend: 'spend_total', spent: 'spend_total', spending: 'spend_total', expenses: 'spend_total',
  categories: 'spend_by_category', by_category: 'spend_by_category', category_breakdown: 'spend_by_category',
  top: 'top_expenses', top_expense: 'top_expenses', largest: 'largest_purchase', biggest: 'largest_purchase',
  largest_expense: 'largest_purchase', compare: 'compare_periods', comparison: 'compare_periods',
  average: 'average_daily', avg_daily: 'average_daily', income: 'income_total', incomes: 'income_total',
  savings: 'savings_status', budget: 'budget_status', budgets: 'budget_status', count: 'count_records',
  subscription: 'subscriptions', subscriptions_status: 'subscriptions', debt: 'debt_status', debts: 'debt_status',
  loans: 'debt_status', debt_total: 'debt_status'
};
// Без периода: накопления и долги — на сейчас, бюджеты — всегда текущий период, подписки — найденные по истории
const NO_PERIOD_TYPES = new Set(['savings_status', 'budget_status', 'subscriptions', 'debt_status']);
// Фильтры по категориям и описанию имеют смысл только у трат
const EXPENSE_TYPES = new Set(['spend_total', 'spend_by_category', 'top_expenses', 'largest_purchase', 'compare_periods', 'average_daily', 'count_records']);

const MAX_LIMIT = 10;
const DEFAULT_TOP = 5;
const MAX_TERM_LENGTH = 40;
const MAX_TERMS = 3;
const MIN_OFFSET = { day: -3650, week: -520, month: -120, year: -30 };
const MAX_DAYS = 3650;
const PER_VALUES = ['day', 'week', 'month'];
const PER_DEFAULT_DAYS = 90;

// Слова, которые модель иногда кладёт в фильтр, хотя это не фильтр
const GENERIC_TERMS = new Set([
  'трата', 'траты', 'трат', 'расход', 'расходы', 'расходов', 'деньги', 'денег', 'все', 'всё', 'всего', 'покупка', 'покупки',
  'покупок', 'запись', 'записи', 'записей', 'spend', 'spent', 'spending', 'expense', 'expenses', 'money', 'all', 'everything',
  'purchase', 'purchases', 'total', 'records', 'record', 'null', 'none', 'any'
]);

const MONTHS = {
  январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6, июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function monthNumber(value) {
  const number = Number(value);
  if (Number.isInteger(number)) return number >= 1 && number <= 12 ? number : null;
  const word = normalizeText(value);
  if (!word) return null;
  const key = Object.keys(MONTHS).sort((a, b) => b.length - a.length).find(prefix => word.startsWith(prefix));
  if (key === 'ма' && !/^ма[йяе]$/.test(word)) return null; // «май/мая/мае», а не «март»
  return key ? MONTHS[key] : null;
}

function toInt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^\s*[-+]?\d+\s*$/.test(value)) return parseInt(value, 10);
  return null;
}

// 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD.MM' (текущий год) → 'YYYY-MM-DD' или null
function parseDate(value, today) {
  const text = String(value || '').trim();
  let y;
  let m;
  let d;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = text.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/))) {
    [d, m] = [Number(match[1]), Number(match[2])];
    y = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : parseYmd(today).y;
  } else return null;
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100 || d > daysInMonth(y, m)) return null;
  return ymd(y, m, d);
}

const SIMPLE_PERIODS = {
  today: { kind: 'day', offset: 0 },
  yesterday: { kind: 'day', offset: -1 },
  this_week: { kind: 'week', offset: 0 },
  last_week: { kind: 'week', offset: -1 },
  this_month: { kind: 'month', offset: 0 },
  last_month: { kind: 'month', offset: -1 },
  this_year: { kind: 'year', offset: 0 },
  last_year: { kind: 'year', offset: -1 },
  all: { kind: 'all' },
  all_time: { kind: 'all' }
};
const KIND_ALIASES = {
  days: 'last_n_days', last_days: 'last_n_days', calendar_month: 'named_month', range: 'custom', dates: 'custom',
  period: 'month', all_time: 'all', today: 'day', yesterday: 'day'
};

// Период из ответа модели → { spec } | { error: 'future' | 'invalid' } | null (не задан)
function normalizePeriod(raw, today) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'string') {
    const simple = SIMPLE_PERIODS[normalizeText(raw).replace(/\s+/g, '_')];
    return simple ? { spec: { ...simple } } : { error: 'invalid' };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return { error: 'invalid' };
  let kind = normalizeText(raw.kind || raw.type);
  if (SIMPLE_PERIODS[kind] && kind !== 'all') return { spec: { ...SIMPLE_PERIODS[kind] } };
  kind = KIND_ALIASES[kind] || kind;
  const offset = raw.offset === undefined || raw.offset === null ? 0 : toInt(raw.offset);
  const t = parseYmd(today);

  if (MIN_OFFSET[kind] !== undefined) {
    if (offset === null) return { error: 'invalid' };
    if (offset > 0) return { error: 'future' };
    return { spec: { kind, offset: Math.max(MIN_OFFSET[kind], offset) } };
  }
  if (kind === 'last_n_days') {
    const n = toInt(raw.n !== undefined ? raw.n : raw.days);
    if (n === null || n < 1) return { error: 'invalid' };
    return { spec: { kind, n: Math.min(MAX_DAYS, n) } };
  }
  if (kind === 'named_month') {
    const month = monthNumber(raw.month);
    if (!month) return { error: 'invalid' };
    let year = raw.year === undefined || raw.year === null || raw.year === '' ? null : toInt(raw.year);
    if (year === null) year = month <= t.m ? t.y : t.y - 1; // «в декабре» в октябре — прошлогодний
    if (year < 2000 || year > t.y + 1) return { error: 'invalid' };
    if (year > t.y || (year === t.y && month > t.m)) return { error: 'future' };
    return { spec: { kind, month, year } };
  }
  if (kind === 'custom') {
    let from = parseDate(raw.from, today);
    let to = raw.to === undefined || raw.to === null || raw.to === '' ? from : parseDate(raw.to, today);
    if (!from || !to) return { error: 'invalid' };
    if (from > to) [from, to] = [to, from];
    if (from > today) return { error: 'future' };
    if (to > today) to = today;
    if (from < ALL_TIME_START) from = ALL_TIME_START;
    return { spec: { kind, from, to } };
  }
  if (kind === 'all') return { spec: { kind } };
  return { error: 'invalid' };
}

function cleanTerm(value) {
  const term = plainWords(value).slice(0, MAX_TERM_LENGTH).trim();
  if (!term || !/\p{L}/u.test(term) || GENERIC_TERMS.has(term)) return null;
  // «с 20 числа», «за 5-е» — дата, а не слово из описания: с цифрами нужно хоть одно содержательное слово
  if (/\d/.test(term) && !term.split(' ').some(w => /^\p{L}{3,}$/u.test(w) && !/^(?:числ|чис)/u.test(w))) return null;
  // «лunch» — модель смешала алфавиты в одном слове: такого в описаниях не бывает
  if (term.split(' ').some(w => /[а-я]/.test(w) && /[a-z]/.test(w))) return null;
  return term;
}

// raw — объект из модели/быстрого разбора; context: { categories, today, question }.
// { ok: true, intent, defaultedPeriod } | { ok: false, reason: 'unknown' | 'future' }. defaultedPeriod — период не
// задан (или не разобран) и взят по умолчанию: этот месяц
function normalizeIntent(raw, { categories = [], today, question = null }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'unknown' };
  let type = normalizeText(raw.type).replace(/[\s-]+/g, '_');
  type = TYPE_ALIASES[type] || type;
  if (!TYPES.includes(type)) return { ok: false, reason: 'unknown' };

  let period = null;
  let compareTo = null;
  let defaultedPeriod = false;
  if (!NO_PERIOD_TYPES.has(type)) {
    const parsed = normalizePeriod(raw.period, today);
    if (parsed && parsed.error === 'future') return { ok: false, reason: 'future' };
    defaultedPeriod = !(parsed && parsed.spec);
    period = defaultedPeriod ? { kind: 'month', offset: 0 } : parsed.spec;
    // средняя в неделю/месяц без периода — за последние PER_DEFAULT_DAYS дней (средняя за один неполный месяц мало значит)
    if (defaultedPeriod && type === 'average_daily' && PER_VALUES.includes(raw.per) && raw.per !== 'day') {
      period = { kind: 'last_n_days', n: PER_DEFAULT_DAYS };
    }
    if (type === 'compare_periods') {
      const second = normalizePeriod(raw.compare_to, today);
      compareTo = second && second.spec ? second.spec : null;
    }
  }

  // Категории — только свои; неизвестное имя — это, скорее всего, слово из описания («такси», «кофе»)
  const matched = [];
  const terms = [];
  if (EXPENSE_TYPES.has(type)) {
    const names = Array.isArray(raw.categories) ? raw.categories : (raw.categories ? [raw.categories] : []);
    const filters = Array.isArray(raw.text_filter) ? raw.text_filter : [raw.text_filter];
    for (const value of [...names, ...filters]) {
      if (typeof value !== 'string') continue;
      const category = matchCategory(value, categories);
      if (category) {
        if (!matched.includes(category)) matched.push(category);
        continue;
      }
      const term = cleanTerm(value);
      if (term && !terms.includes(term) && terms.length < MAX_TERMS) terms.push(term);
    }
    // Модель любит добавлять к поиску «кофе» категорию «Еда» — пересечение потеряет кофе из другой категории.
    // Категорию вместе с поиском по описанию оставляем, только если она названа в вопросе
    if (terms.length && question) {
      for (let i = matched.length - 1; i >= 0; i--) {
        if (!mentionsCategory(question, matched[i])) matched.splice(i, 1);
      }
    }
  }

  let limit = toInt(raw.limit);
  if (type === 'largest_purchase') limit = 1;
  else if (type === 'top_expenses') limit = limit > 0 ? Math.min(MAX_LIMIT, limit) : DEFAULT_TOP;
  else limit = null;

  const currency = String(raw.currency || '').trim().toUpperCase();
  return {
    ok: true,
    defaultedPeriod,
    intent: {
      type,
      period,
      compareTo,
      categories: matched,
      terms,
      limit,
      currency: SUPPORTED_CURRENCIES.includes(currency) ? currency : null,
      // средняя: в день / в неделю / в месяц (только у average_daily)
      per: type === 'average_daily' && PER_VALUES.includes(raw.per) ? raw.per : null
    }
  };
}

module.exports = { TYPES, normalizeIntent, normalizePeriod, parseDate, monthNumber, cleanTerm, MAX_LIMIT };
