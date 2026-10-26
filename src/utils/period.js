// Локальные даты пользователя как строки 'YYYY-MM-DD' (без JS Date, чтобы не зависеть от TZ процесса).
// Периоды — полуинтервалы [start, end) в локальном времени пользователя.

function pad(n) {
  return String(n).padStart(2, '0');
}

function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseYmd(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addMonths(y, m, delta) {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

function addDays(dateStr, delta) {
  const { y, m, d } = parseYmd(dateStr);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

// Число месяца, ограниченное длиной месяца (31 → 30/28/29)
function clampDay(y, m, day) {
  return Math.min(day, daysInMonth(y, m));
}

function localToday(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Пользовательский "месяц", начинающийся с числа startDay (в коротких месяцах — последний день).
// offset = 0 — текущий период, -1 — предыдущий и т.д.
function customPeriod(today, startDay, offset = 0) {
  const t = parseYmd(today);
  const currentMonthStart = ymd(t.y, t.m, clampDay(t.y, t.m, startDay));
  const base = today >= currentMonthStart ? { y: t.y, m: t.m } : addMonths(t.y, t.m, -1);
  const s = addMonths(base.y, base.m, offset);
  const n = addMonths(s.y, s.m, 1);
  const start = ymd(s.y, s.m, clampDay(s.y, s.m, startDay));
  const end = ymd(n.y, n.m, clampDay(n.y, n.m, startDay));
  return { start, end, last: addDays(end, -1) };
}

function dayPeriod(today, offset = 0) {
  const start = addDays(today, offset);
  return { start, end: addDays(start, 1), last: start };
}

module.exports = {
  pad,
  ymd,
  parseYmd,
  daysInMonth,
  addMonths,
  addDays,
  clampDay,
  localToday,
  customPeriod,
  dayPeriod
};
