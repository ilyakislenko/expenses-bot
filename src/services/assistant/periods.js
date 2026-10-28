// Периоды вопросов боту. Спецификация периода (после проверки в intent.js):
//   { kind: 'day', offset }               — сутки: 0 сегодня, -1 вчера
//   { kind: 'week', offset }              — календарная неделя пн–вс: 0 текущая, -1 прошлая
//   { kind: 'month', offset }             — пользовательский период (period_start_day), как в обзоре
//   { kind: 'named_month', month, year }  — календарный месяц («в сентябре»)
//   { kind: 'year', offset }              — календарный год
//   { kind: 'last_n_days', n }            — последние n дней, включая сегодня
//   { kind: 'custom', from, to }          — даты включительно
//   { kind: 'all' }                       — всё время
// Результат — полуинтервал локальных дат [start, end) и last — последний день (см. utils/period).
const { ymd, parseYmd, daysInMonth, addMonths, addDays, customPeriod, dayPeriod, lastDaysPeriod } = require('../../utils/period');

const ALL_TIME_START = '2000-01-01';

// Дней между датами 'YYYY-MM-DD' (to − from)
function daysBetween(from, to) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

// Понедельник недели даты
function weekStart(date) {
  const { y, m, d } = parseYmd(date);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 — понедельник
  return addDays(date, -weekday);
}

function calendarMonth(year, month) {
  const next = addMonths(year, month, 1);
  return { start: ymd(year, month, 1), end: ymd(next.y, next.m, 1), last: ymd(year, month, daysInMonth(year, month)) };
}

// spec → { start, end, last }; context: { today, startDay }
function resolvePeriod(spec, { today, startDay = 1 }) {
  switch (spec.kind) {
    case 'day':
      return dayPeriod(today, spec.offset);
    case 'week': {
      const start = addDays(weekStart(today), spec.offset * 7);
      return { start, end: addDays(start, 7), last: addDays(start, 6) };
    }
    case 'month':
      return customPeriod(today, startDay, spec.offset);
    case 'named_month':
      return calendarMonth(spec.year, spec.month);
    case 'year': {
      const year = parseYmd(today).y + spec.offset;
      return { start: ymd(year, 1, 1), end: ymd(year + 1, 1, 1), last: ymd(year, 12, 31) };
    }
    case 'last_n_days':
      return lastDaysPeriod(today, spec.n);
    case 'custom':
      return { start: spec.from, end: addDays(spec.to, 1), last: spec.to };
    case 'all':
    default:
      return { start: ALL_TIME_START, end: addDays(today, 1), last: today };
  }
}

// Предыдущий период того же вида (для сравнения): прошлые сутки/неделя/период/месяц/год, у произвольных — столько же
// дней прямо перед ними. У «всего времени» предыдущего нет — null.
function previousSpec(spec) {
  switch (spec.kind) {
    case 'day':
    case 'week':
    case 'month':
    case 'year':
      return { kind: spec.kind, offset: spec.offset - 1 };
    case 'named_month': {
      const prev = addMonths(spec.year, spec.month, -1);
      return { kind: 'named_month', month: prev.m, year: prev.y };
    }
    default:
      return null;
  }
}

function previousPeriod(spec, period, context) {
  const prev = previousSpec(spec);
  if (prev) return resolvePeriod(prev, context);
  if (spec.kind === 'all') return null;
  const length = daysBetween(period.start, period.end);
  return { start: addDays(period.start, -length), end: period.start, last: addDays(period.start, -1) };
}

// Сравнение: текущий незаконченный период сравниваем с тем же числом первых дней предыдущего («к этому же дню»),
// иначе прошлый период выглядел бы всегда больше. compareTo — явно названный второй период («больше/меньше» — у более
// позднего относительно более раннего, в каком порядке их ни назвали); если более поздний ещё идёт, оба тоже
// обрезаются до одинакового числа дней («сравни октябрь и сентябрь» 28 октября — 28 дней с 28 днями).
function comparisonPeriods(spec, compareTo, context) {
  const period = resolvePeriod(spec, context);
  let current = period;
  let previous;
  if (compareTo) {
    const second = resolvePeriod(compareTo, context);
    [current, previous] = second.start > period.start ? [second, period] : [period, second];
  } else {
    previous = previousPeriod(spec, period, context);
    if (!previous) return null;
  }
  if (current.last <= context.today) return { current, previous, toDate: false };
  const elapsed = daysBetween(current.start, addDays(context.today, 1));
  const currentToDate = { start: current.start, end: addDays(context.today, 1), last: context.today };
  const cut = addDays(previous.start, elapsed);
  const previousToDate = cut < previous.end ? { start: previous.start, end: cut, last: addDays(cut, -1) } : previous;
  return { current: currentToDate, previous: previousToDate, toDate: true, days: elapsed };
}

// Дней для средней траты: от начала периода до последнего дня, но не дальше сегодня
function elapsedDays(period, today) {
  const last = period.last < today ? period.last : today;
  return Math.max(1, daysBetween(period.start, addDays(last, 1)));
}

module.exports = {
  ALL_TIME_START, daysBetween, weekStart, calendarMonth, resolvePeriod, previousSpec, previousPeriod, comparisonPeriods, elapsedDays
};
