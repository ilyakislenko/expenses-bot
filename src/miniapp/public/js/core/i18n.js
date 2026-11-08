// Строки и форматирование: тексты — из /api/me (strings), деньги и даты — Intl на языке пользователя.
let boot = null;

export function setup(bootstrap) { boot = bootstrap; }
export function me() { return boot; }

// t('key', { n: 5 }) — строка с подстановкой {n}; нет ключа — сам ключ (видно в разработке)
export function t(key, params) {
  let text = (boot && boot.strings[key]) || key;
  if (params) for (const name of Object.keys(params)) text = text.split(`{${name}}`).join(String(params[name]));
  return text;
}

const formats = new Map();
function numberFormat(currency, digits) {
  const key = `${currency}|${digits}`;
  if (!formats.has(key)) {
    const options = currency
      ? { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: digits }
      : { minimumFractionDigits: 0, maximumFractionDigits: digits };
    let format;
    try { format = new Intl.NumberFormat(boot.locale, options); } catch (e) { format = new Intl.NumberFormat('ru-RU', options); }
    formats.set(key, format);
  }
  return formats.get(key);
}

// 1 234,5 ₽ — как в боте: до двух знаков, без лишних нулей
export function money(amount, currency = boot.currency) {
  return numberFormat(currency, 2).format(Number(amount) || 0);
}
// Без копеек — для сводок и графиков
export function moneyRound(amount, currency = boot.currency) {
  return numberFormat(currency, 0).format(Math.round(Number(amount) || 0));
}
export function signedMoney(amount, currency) {
  const value = Number(amount) || 0;
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${moneyRound(Math.abs(value), currency)}`;
}
export function number(value, digits = 0) { return numberFormat(null, digits).format(Number(value) || 0); }
export function percent(ratio) { return `${Math.round((Number(ratio) || 0) * 100)}%`; }

// «1,53 млн ₽», «241 тыс ₽» — те же единицы, что в боте (units из /api/me); валюта — основная
const PLAIN = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export function compact(amount, symbol = boot.units.symbol) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  const thousands = Math.round(abs / 1000);
  if (abs >= 1e6 || thousands >= 1000) {
    const millions = abs / 1e6;
    const [int, frac] = millions.toFixed(millions < 10 ? 2 : millions < 100 ? 1 : 0).split('.');
    const fraction = (frac || '').replace(/0+$/, '');
    const n = PLAIN.format(Number(int)) + (fraction ? (boot.units.comma ? ',' : '.') + fraction : '');
    return `${sign}${boot.units.million.replace('{n}', n)} ${symbol}`;
  }
  if (abs >= 10000) return `${sign}${boot.units.thousand.replace('{n}', PLAIN.format(thousands))} ${symbol}`;
  return `${sign}${PLAIN.format(Math.round(abs))} ${symbol}`;
}

// Даты — строки 'YYYY-MM-DD' в поясе пользователя (сервер отдаёт уже локальные)
const dateFormats = new Map();
function dateFormat(options) {
  const key = JSON.stringify(options);
  if (!dateFormats.has(key)) {
    let f;
    try { f = new Intl.DateTimeFormat(boot.locale, { timeZone: 'UTC', ...options }); } catch (e) { f = new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...options }); }
    dateFormats.set(key, f);
  }
  return dateFormats.get(key);
}
const asDate = (ymd) => new Date(`${ymd}T12:00:00Z`);

export function addDays(ymd, days) {
  const d = asDate(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(from, to) { return Math.round((asDate(to) - asDate(from)) / 86400000); }
export function today() { return boot.today; }

// «Сегодня», «Вчера», «пн, 3 ноября» (другой год — с годом)
export function dayLabel(ymd) {
  if (ymd === boot.today) return t('core_today');
  if (ymd === addDays(boot.today, -1)) return t('core_yesterday');
  if (ymd === addDays(boot.today, 1)) return t('core_tomorrow');
  const sameYear = ymd.slice(0, 4) === boot.today.slice(0, 4);
  return dateFormat(sameYear ? { weekday: 'short', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(asDate(ymd));
}
export function shortDate(ymd) { return dateFormat({ day: 'numeric', month: 'short' }).format(asDate(ymd)); }
export function longDate(ymd) { return dateFormat({ day: 'numeric', month: 'long', year: 'numeric' }).format(asDate(ymd)); }
export function monthLabel(ymd, { year = false } = {}) { return dateFormat(year ? { month: 'long', year: 'numeric' } : { month: 'long' }).format(asDate(ymd)); }
export function monthShort(ymd) { return dateFormat({ month: 'short' }).format(asDate(ymd)); }
// Период { start, last } → «1 – 30 нояб.» / «25 окт. – 24 нояб.»
export function periodLabel(period) {
  const s = asDate(period.start);
  const l = asDate(period.last);
  if (s.getUTCMonth() === l.getUTCMonth() && s.getUTCFullYear() === l.getUTCFullYear()) {
    return `${s.getUTCDate()} – ${dateFormat({ day: 'numeric', month: 'short' }).format(l)}`;
  }
  return `${shortDate(period.start)} – ${shortDate(period.last)}`;
}
// Время из ISO-строки UTC в поясе пользователя: «14:32»
export function time(iso) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: boot.timezone }).format(new Date(iso));
}
