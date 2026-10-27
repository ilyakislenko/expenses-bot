// Быстрый разбор частых вопросов без нейросети (ru/en): период, тип, фильтр «на такси / on coffee». Работает,
// даже когда модель недоступна или занята. confident — вопрос разобран целиком (не осталось незнакомых слов):
// тогда модель не спрашиваем. Иначе результат — запасной вариант, если модель не ответила.
// Возвращает сырое намерение в том же формате, что и модель (проверяет intent.js), или null.
const { addDays, parseYmd, ymd, daysInMonth } = require('../../utils/period');
const { normalizeText } = require('./text');
const { monthNumber } = require('./intent');

const L = '\\p{L}\\p{N}';
// Целые слова: \b в JS не работает с кириллицей
const word = (source, flags = 'u') => new RegExp(`(?<![${L}])(?:${source})(?![${L}])`, flags);

const RU_MONTH = 'январ\\p{L}*|феврал\\p{L}*|март\\p{L}*|апрел\\p{L}*|ма[йяе]|июн\\p{L}*|июл\\p{L}*|август\\p{L}*|сентябр\\p{L}*|октябр\\p{L}*|ноябр\\p{L}*|декабр\\p{L}*';
const EN_MONTH = 'january|february|march|april|may|june|july|august|september|sept|october|november|december';
const MONTH = `${RU_MONTH}|${EN_MONTH}`;
const THIS = '(?:этот|этом|эту|этой|текущий|текущем|текущую|текущей|нынешний|нынешнем)';
const LAST = '(?:прошлый|прошлом|прошлую|прошлой|предыдущий|предыдущем|предыдущую|предыдущей)';
const PRE = '(?:(?:в|во|за|на)\\s+)?';
const DATE = '\\d{1,2}[./]\\d{1,2}(?:[./]\\d{2,4})?';

// Год для дат без года: если такая дата в этом году ещё не наступила — прошлый год
function withYear(day, month, year, today) {
  const t = parseYmd(today);
  let y = year || t.y;
  if (!year && ymd(y, month, Math.min(day, daysInMonth(y, month))) > today) y -= 1;
  return ymd(y, month, Math.min(day, daysInMonth(y, month)));
}

function numericDate(text, today) {
  const [d, m, y] = text.split(/[./]/).map(Number);
  if (!m || m > 12 || !d) return null;
  const year = y ? (y < 100 ? 2000 + y : y) : null;
  return withYear(d, m, year, today);
}

const PERIODS = [
  // «с 1 по 15 октября», «с 1 сентября по 15 октября 2026», «from 1 to 15 october»
  [word(`(?:с|from)\\s+(\\d{1,2})(?:\\s+(${MONTH}))?\\s+(?:по|до|to|till|until|-|–)\\s+(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => {
      const year = m[5] ? Number(m[5]) : null;
      const endMonth = monthNumber(m[4]);
      const startMonth = m[2] ? monthNumber(m[2]) : endMonth;
      const to = withYear(Number(m[3]), endMonth, year, today);
      const toYear = parseYmd(to).y;
      const from = withYear(Number(m[1]), startMonth, startMonth > endMonth ? toYear - 1 : toYear, today);
      return { kind: 'custom', from, to };
    }],
  // «from october 1 to 15»
  [word(`from\\s+(${EN_MONTH})\\s+(\\d{1,2})\\s+(?:to|till|until|-)\\s+(?:(${EN_MONTH})\\s+)?(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => {
      const year = m[5] ? Number(m[5]) : null;
      const startMonth = monthNumber(m[1]);
      const endMonth = m[3] ? monthNumber(m[3]) : startMonth;
      const to = withYear(Number(m[4]), endMonth, year, today);
      const from = withYear(Number(m[2]), startMonth, startMonth > endMonth ? parseYmd(to).y - 1 : parseYmd(to).y, today);
      return { kind: 'custom', from, to };
    }],
  // «с 01.10 по 15.10», «01.10.2026 - 15.10.2026»
  [word(`(?:(?:с|from)\\s+)?(${DATE})\\s*(?:по|до|to|-|–)\\s*(${DATE})`),
    (m, today) => ({ kind: 'custom', from: numericDate(m[1], today), to: numericDate(m[2], today) })],
  // «с 1 октября», «since october 1», «с 01.10», «с сентября» — от даты до сегодня
  [word(`(?:since|starting|с|начиная\\s+с)\\s+(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => ({ kind: 'custom', from: withYear(Number(m[1]), monthNumber(m[2]), m[3] ? Number(m[3]) : null, today), to: today })],
  [word(`(?:since|starting)\\s+(${EN_MONTH})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => ({ kind: 'custom', from: withYear(Number(m[2]), monthNumber(m[1]), m[3] ? Number(m[3]) : null, today), to: today })],
  [word(`(?:since|starting|с|начиная\\s+с)\\s+(${DATE})`), (m, today) => ({ kind: 'custom', from: numericDate(m[1], today), to: today })],
  // только родительный падеж: «сравни сентябрь с августом» — это не «с августа»
  [word(`(?:since|starting)\\s+(?:the\\s+start\\s+of\\s+)?(${EN_MONTH})(?:\\s+(\\d{4}))?|(?:с|начиная\\s+с)\\s+(?:начала\\s+)?(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\\s+(\\d{4}))?`),
    (m, today) => {
      const year = m[2] || m[4];
      return { kind: 'custom', from: withYear(1, monthNumber(m[1] || m[3]), year ? Number(year) : null, today), to: today };
    }],
  // «5 октября», «october 5»
  [word(`(?:(?:за|on)\\s+)?(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => {
      const day = withYear(Number(m[1]), monthNumber(m[2]), m[3] ? Number(m[3]) : null, today);
      return { kind: 'custom', from: day, to: day };
    }],
  [word(`(?:on\\s+)?(${EN_MONTH})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => {
      const day = withYear(Number(m[2]), monthNumber(m[1]), m[3] ? Number(m[3]) : null, today);
      return { kind: 'custom', from: day, to: day };
    }],
  [word(`(?:(?:за|on)\\s+)?(${DATE})`), (m, today) => {
    const day = numericDate(m[1], today);
    return { kind: 'custom', from: day, to: day };
  }],
  // «в сентябре», «за август 2025», «in september»
  [word(`(?:(?:в|во|за|in|for|during)\\s+)?(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m) => ({ kind: 'named_month', month: monthNumber(m[1]), year: m[2] ? Number(m[2]) : null })],
  [word('(?:за\\s+)?позавчера|day before yesterday'), () => ({ kind: 'day', offset: -2 })],
  [word('(?:за\\s+)?сегодня|today'), () => ({ kind: 'day', offset: 0 })],
  [word('(?:за\\s+)?вчера|yesterday'), () => ({ kind: 'day', offset: -1 })],
  [word(`${PRE}${THIS}\\s+недел\\p{L}*|this week|current week`), () => ({ kind: 'week', offset: 0 })],
  [word(`${PRE}${LAST}\\s+недел\\p{L}*|last week|previous week`), () => ({ kind: 'week', offset: -1 })],
  [word('за\\s+(?:последние\\s+)?(\\d{1,4})\\s+(?:дн\\p{L}*|день|суток)|(?:in\\s+)?(?:the\\s+)?(?:last|past)\\s+(\\d{1,4})\\s+days?'),
    (m) => ({ kind: 'last_n_days', n: Number(m[1] || m[2]) })],
  [word('за\\s+(?:последнюю\\s+)?неделю|(?:in\\s+)?(?:the\\s+)?past week|(?:in\\s+)?(?:the\\s+)?last 7 days|за неделю'), () => ({ kind: 'last_n_days', n: 7 })],
  [word(`${PRE}позапрошл\\p{L}*\\s+месяц\\p{L}*|month before last`), () => ({ kind: 'month', offset: -2 })],
  [word(`${PRE}${THIS}\\s+(?:месяц\\p{L}*|период\\p{L}*)|this month|current month|this period|за месяц`), () => ({ kind: 'month', offset: 0 })],
  [word(`${PRE}${LAST}\\s+(?:месяц\\p{L}*|период\\p{L}*)|last month|previous month|last period`), () => ({ kind: 'month', offset: -1 })],
  [word(`${PRE}${THIS}\\s+год\\p{L}*|this year|за год`), () => ({ kind: 'year', offset: 0 })],
  [word(`${PRE}${LAST}\\s+год\\p{L}*|last year|previous year`), () => ({ kind: 'year', offset: -1 })],
  [word('за\\s+вс[её]\\s+время|за\\s+всю\\s+историю|(?:of\\s+)?all\\s+time|ever'), () => ({ kind: 'all' })]
];

// Порядок важен: «сколько осталось в бюджете» — бюджет, а не остаток; «в среднем» раньше «сколько потратил»
const TYPES = [
  ['compare_periods', word('сравни\\p{L}*|сравнение|по\\s+сравнению\\s+с|compare\\p{L}*|comparison|vs|versus')],
  ['count_records', word('сколько\\s+(?:было\\s+)?(?:раз|записей|трат|покупок)|how\\s+many\\s+(?:times|expenses|purchases|records)|(?:число|количество)\\s+(?:трат|записей|покупок)')],
  ['top_expenses', word('(?:топ|top)[\\s-]*(\\d{1,2})?(?:\\s+(?:самых\\s+)?(?:крупных|больших|дорогих))?(?:\\s+(?:трат|покупок|расходов|expenses|purchases))?|(\\d{1,2})\\s+(?:самых\\s+)?(?:крупных|больших|дорогих)\\s+(?:трат|покупок|расходов)|(?:самые|самых)\\s+(?:крупные|большие|дорогие|крупных|больших|дорогих)\\s+(?:траты|покупки|расходы|трат|покупок)|(?:biggest|largest)\\s+(\\d{1,2})?\\s*(?:expenses|purchases)')],
  ['largest_purchase', word('(?:сама[яю]|самой)\\s+(?:крупн|больш|дорог)\\p{L}*\\s+(?:трат|покупк)\\p{L}*|(?:biggest|largest|most expensive)\\s+(?:expense|purchase)')],
  ['budget_status', word('бюджет\\p{L}*|лимит\\p{L}*|budgets?')],
  ['average_daily', word('(?:в\\s+среднем|средн\\p{L}*)(?:\\s+(?:трат\\p{L}*\\s+)?(?:в|за)\\s+день)?|в\\s+день|per\\s+day|a\\s+day|daily\\s+average|(?:on\\s+)?average(?:\\s+(?:daily|per\\s+day))?')],
  ['spend_by_category', word('по\\s+категориям|by\\s+categor\\p{L}*|на\\s+что\\s+(?:я\\s+)?(?:больше\\s+всего\\s+)?(?:трачу|тратил\\p{L}*|потратил\\p{L}*|ушли|уходят|ушло|уходит)(?:\\s+больше\\s+всего)?(?:\\s+денег|\\s+деньги)?|куда\\s+(?:ушли|уходят|ушло|делись)(?:\\s+(?:все\\s+)?деньги)?|what\\s+did\\s+i\\s+spend\\s+(?:the\\s+)?most\\s+on|where\\s+did\\s+(?:all\\s+)?(?:my\\s+)?money\\s+go|(?:top|main)\\s+categor\\p{L}*')],
  ['income_total', word('доход\\p{L}*|заработ\\p{L}*|зарплат\\p{L}*|income\\p{L}*|earn\\p{L}*|salary')],
  ['balance', word('остат\\p{L}*|баланс\\p{L}*|сколько\\s+(?:у\\s+меня\\s+)?осталось|в\\s+плюсе|в\\s+минусе|balance|left\\s+over|how\\s+much\\s+(?:do\\s+i\\s+have\\s+)?left')],
  ['savings_status', word('накоп\\p{L}*|сбереж\\p{L}*|копил\\p{L}*|копилк\\p{L}*|отложил\\p{L}*|цел[иьей]\\p{L}*|savings?|saved|goals?')],
  ['spend_total', word('сколько\\s+(?:я\\s+)?(?:всего\\s+)?(?:потратил\\p{L}*|трачу|тратил\\p{L}*|ушло|ушли|уходит|отдал\\p{L}*)|how\\s+much\\s+(?:did|have|do)\\s+i\\s+(?:spend|spent)|how\\s+much\\s+i\\s+spent|(?:total\\s+)?(?:траты|расходы|потрачено|spending|expenses)')]
];

// Остатки «сравни этот месяц с прошлым»
const COMPARE_TAIL = word('(?:с|and|with)\\s+(?:прошлым|предыдущим|previous|last(?:\\s+one)?)(?:\\s+(?:месяцем|периодом|неделей|годом|month|week|year))?');
// Слова-связки и глаголы «потратил», не меняющие смысла вопроса
const NOISE = word([
  'сколько', 'потратил\\p{L}*', 'трачу', 'тратил\\p{L}*', 'потрачено', 'ушло', 'ушли', 'уходит', 'я', 'мне', 'меня', 'мой', 'мои',
  'у', 'всего', 'вообще', 'было', 'ли', 'ну', 'же', 'пожалуйста', 'скажи', 'покажи', 'подскажи', 'бот', 'а', 'и', 'в', 'за',
  'денег', 'деньги', 'трат', 'траты', 'how', 'much', 'many', 'did', 'do', 'does', 'i', 'my', 'me', 'in', 'the', 'total',
  'please', 'show', 'tell', 'what', 'was', 'is', 'are', 'have', 'has', 'money', 'spend', 'spent', 'spending', 'so', 'far',
  'mine', 'all', 'of', 'на', 'on', 'for', 'больше', 'всего', 'most', 'какой', 'какая', 'какие', 'каков', 'какова', 'осталось',
  'left', 'whats', 's', 'it', 'now', 'сейчас', 'там', 'currently', 'current'
].join('|'), 'gu');

const FILTER_CATEGORY = word(`(?:в\\s+категори\\p{L}*|(?:in|for)\\s+(?:the\\s+)?categor\\p{L}*)\\s+([${L}][${L}\\s-]{0,40})$`);
const FILTER = word(`(?:на|on|for)\\s+([${L}][${L}\\s-]{0,40})$`);
const MAX_FILTER_WORDS = 3;

function take(text, regex) {
  const match = text.match(regex);
  if (!match) return null;
  return { match, rest: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim() };
}

function cleanQuestion(text) {
  return normalizeText(text)
    .replace(/^\/ask(?:@\w+)?\s*/, '')
    .replace(/^[?？¿\s]+/, '')
    .replace(/[?？!.…,;:\s]+$/, '')
    .replace(/[«»"“”]/g, '')
    .replace(/\s*,\s*/g, ' ');
}

// today — локальная дата пользователя 'YYYY-MM-DD'
function parseFastPath(question, { today }) {
  let text = cleanQuestion(question);
  if (!text) return null;

  let period = null;
  for (const [regex, build] of PERIODS) {
    const found = take(text, regex);
    if (!found) continue;
    period = build(found.match, today);
    text = found.rest;
    break;
  }

  let type = null;
  let limit = null;
  for (const [candidate, regex] of TYPES) {
    const found = take(text, regex);
    if (!found) continue;
    type = candidate;
    text = found.rest;
    if (candidate === 'top_expenses') {
      const n = found.match.slice(1).find(Boolean);
      limit = n ? Number(n) : null;
    }
    // «per day … on average» — оба куска про одно и то же
    for (let again = take(text, regex); again; again = take(text, regex)) text = again.rest;
    break;
  }
  if (type === 'compare_periods') {
    const tail = take(text, COMPARE_TAIL);
    if (tail) text = tail.rest;
  }

  const categories = [];
  let textFilter = null;
  const byCategory = take(text, FILTER_CATEGORY);
  const filter = byCategory || take(text, FILTER);
  let tooLong = false;
  if (filter) {
    const value = filter.match[1].trim();
    if (value.split(' ').length <= MAX_FILTER_WORDS) {
      if (byCategory) categories.push(value);
      else textFilter = value;
      text = filter.rest;
    } else {
      tooLong = true;
    }
  }

  const leftover = text.replace(NOISE, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!type && !period && !textFilter && !categories.length) return null;
  const unknownWords = leftover ? leftover.split(' ').length : 0;
  return {
    // Разобран целиком — модель не нужна
    confident: !!type && !unknownWords && !tooLong,
    // Запасной вариант, когда модель недоступна: тип назван и непонятного не больше одного слова (а при поиске по
    // описанию — ни одного: лишнее слово, скорее всего, часть того, что искать) — иначе честнее сказать «не разобрал»
    usable: !!type && unknownWords <= (textFilter ? 0 : 1) && !tooLong,
    intent: {
      type: type || 'spend_total',
      period,
      categories,
      text_filter: textFilter,
      limit
    }
  };
}

module.exports = { parseFastPath, cleanQuestion };
