// Смена дня записи: трата, доход, чек целиком и черновик чека. Даты — локальные строки 'YYYY-MM-DD' (utils/period),
// время суток записи при смене дня сохраняется (это делают запросы репозиториев).
const { addDays, daysInMonth, ymd } = require('./period');

const MAX_RECORD_AGE_DAYS = 365; // дальше года назад запись не переносим
const QUICK_DAYS = ['button_date_today', 'button_date_yesterday', 'button_date_before_yesterday'];
const SHORT_DAYS = 7; // после «Позавчера» — ещё неделя кнопками «Пн 21»
const SHORT_ROW = 4;
// Ошибка проверки даты → текст для пользователя
const DATE_ERROR_KEYS = { format: 'date_error_format', future: 'date_error_future', too_old: 'date_error_too_old' };

function validYmd(y, m, d) {
  if (!Number.isInteger(y) || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return ymd(y, m, d);
}

// 'YYYY-MM-DD' ↔ 'YYYYMMDD' в callback_data
function packDate(date) {
  return date.replace(/-/g, '');
}

function unpackDate(packed) {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(String(packed || ''));
  return match ? validYmd(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

// null — дату можно поставить; 'future' — ещё не наступила; 'too_old' — старше MAX_RECORD_AGE_DAYS
function checkRecordDate(date, today) {
  if (date > today) return 'future';
  if (date < addDays(today, -MAX_RECORD_AGE_DAYS)) return 'too_old';
  return null;
}

// Ввод «другой даты»: '25.10', '25.10.2026', '25.10.26' (разделитель — точка, косая черта или дефис).
// Без года — этот год; если такой день этого месяца ещё не наступил — «в будущем», более поздний месяц — прошлый год
// (в январе «25.12» — декабрь). Возвращает { date } или { error: 'format' | 'future' | 'too_old' }
function parseRecordDate(text, today) {
  const match = String(text || '').trim().match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}|\d{2}))?\.?$/);
  if (!match) return { error: 'format' };
  const d = Number(match[1]);
  const m = Number(match[2]);
  let date;
  if (match[3]) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    date = validYmd(year, m, d);
  } else {
    const year = Number(today.slice(0, 4));
    const laterMonth = m > Number(today.slice(5, 7));
    date = validYmd(laterMonth ? year - 1 : year, m, d);
  }
  if (!date) return { error: 'format' };
  const error = checkRecordDate(date, today);
  return error ? { error } : { date };
}

// Локальная дата момента времени в поясе пользователя
function localDateOf(moment, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(moment)).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zoneParts(instant, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(instant)).reduce((acc, part) => ({ ...acc, [part.type]: Number(part.value) }), {});
}

// Смещение пояса в момент instant (мс): местное время минус UTC
function zoneOffset(instant, timezone) {
  const p = zoneParts(instant, timezone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
}

// Тот же момент местного времени суток (в поясе timezone), но в день date: новый created_at_utc записи при смене даты.
// Несуществующее при переходе на летнее время местное время сдвигается на час; не позже now
function moveToDate(moment, date, timezone, now = new Date()) {
  const instant = new Date(moment).getTime();
  const local = zoneParts(instant, timezone);
  const [y, m, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, m - 1, d, local.hour % 24, local.minute, local.second) + (((instant % 1000) + 1000) % 1000);
  const guess = wall - zoneOffset(wall, timezone);
  const moved = wall - zoneOffset(guess, timezone);
  return new Date(Math.min(moved, now.getTime()));
}

// 0 — понедельник … 6 — воскресенье
function weekdayIndex(date) {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

// Кнопки выбора дня: «Сегодня», «Вчера», «Позавчера», неделя до них («Пн 21»), «✏️ Другая дата», «Назад».
// t(key) — текст на языке пользователя, current — текущая дата записи (помечается точкой) или null,
// pick(date) → callback_data выбранного дня, other / back — callback_data «другой даты» и «назад»
function datePickerKeyboard(t, { today, current = null, pick, other, back }) {
  const mark = (date, text) => (date === current ? `• ${text}` : text);
  const weekdays = t('date_weekdays_short').split(',');
  const quick = QUICK_DAYS.map((key, i) => {
    const date = addDays(today, -i);
    return { text: mark(date, t(key)), callback_data: pick(date) };
  });
  const short = [];
  for (let i = 0; i < SHORT_DAYS; i += 1) {
    const date = addDays(today, -QUICK_DAYS.length - i);
    short.push({ text: mark(date, `${weekdays[weekdayIndex(date)]} ${Number(date.slice(8))}`), callback_data: pick(date) });
  }
  const rows = [quick];
  for (let i = 0; i < short.length; i += SHORT_ROW) rows.push(short.slice(i, i + SHORT_ROW));
  rows.push([{ text: t('button_date_other'), callback_data: other }]);
  rows.push([{ text: t('button_back'), callback_data: back }]);
  return rows;
}

module.exports = {
  MAX_RECORD_AGE_DAYS,
  packDate,
  unpackDate,
  checkRecordDate,
  parseRecordDate,
  localDateOf,
  moveToDate,
  weekdayIndex,
  DATE_ERROR_KEYS,
  datePickerKeyboard
};
