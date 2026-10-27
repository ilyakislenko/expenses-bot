// Общие помощники разбора банковских выписок: кодировка, суммы, даты, валюты, переводы.
// Нормализованная операция: { date: 'YYYY-MM-DD HH:MM:SS' (локальное время выписки), amount > 0,
// kind: 'expense' | 'income', currency, description, bankCategory, mcc, isTransfer, altAmount?, altCurrency? }

const MAX_AMOUNT = 99999999.99; // предел колонки expenses.amount DECIMAL(10,2)
const DESCRIPTION_MAX = 120;

class ImportError extends Error {
  // code: 'csv_columns' | 'unknown_format' | 'pdf' | 'empty' | 'too_many'
  constructor(code, params = {}) {
    super(`Statement import error: ${code}`);
    this.code = code;
    this.params = params;
  }
}

// UTF-8 (с BOM или без), UTF-16 по BOM, иначе windows-1251 (выгрузки Т-Банка и старых банков)
function decodeText(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer.subarray(2));
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch (error) {
    return new TextDecoder('windows-1251').decode(buffer);
  }
}

const SPACES = /[\s\u00a0\u202f\u2009']/g;

// '-1 234,56', '1,234.56', '1.234,56', '(12.50)', '+500 ₽', '123.45-' → число со знаком; null — не сумма
function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let negative = false;
  const parenthesized = s.match(/^\((.*)\)$/);
  if (parenthesized) {
    negative = true;
    s = parenthesized[1];
  }
  s = s.replace(/[\u2212\u2012\u2013\u2014]/g, '-').replace(SPACES, '').replace(/[^\d.,+-]/g, '');
  const signed = s.match(/^([+-]?)([\d.,]+)(-?)$/);
  if (!signed || !/\d/.test(signed[2])) return null;
  if (signed[1] === '-' || signed[3] === '-') negative = !negative;
  let digits = signed[2];
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    digits = digits.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = digits.split(sep);
    const groupsOfThree = parts.length > 2 && parts.slice(1).every(part => part.length === 3);
    // Одна запятая и ровно 3 цифры после неё ('1,234') — разделитель тысяч; одна точка — всегда десятичная
    const singleCommaThousands = sep === ',' && parts.length === 2 && parts[1].length === 3 && /^[1-9]\d{0,2}$/.test(parts[0]);
    if (groupsOfThree || singleCommaThousands) digits = parts.join('');
    else if (parts.length === 2) digits = `${parts[0]}.${parts[1]}`;
    else return null;
  }
  if (!/^\d+(\.\d+)?$/.test(digits) && !/^\d*\.\d+$/.test(digits)) return null;
  const value = Math.round(Number(digits) * 100) / 100;
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildDate(y, m, d, h = 12, mi = 0, s = 0) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
}

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const DMY_DATE = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4}|\d{2})(?:[\s,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

// Дата и необязательное время. order — порядок для dd/mm и mm/dd ('dmy' | 'mdy', определяется по столбцу).
// Без времени — полдень, чтобы операция не уехала в соседний день. null — не дата.
function parseDateTime(raw, order = 'dmy') {
  const s = String(raw || '').trim();
  if (!s) return null;
  const toTime = (h, mi, sec) => (h === undefined ? [12, 0, 0] : [Number(h), Number(mi), Number(sec || 0)]);
  const iso = s.match(ISO_DATE);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]), ...toTime(iso[4], iso[5], iso[6]));
  const dmy = s.match(DMY_DATE);
  if (!dmy) return null;
  let year = Number(dmy[4]);
  if (dmy[4].length === 2) year += 2000;
  const first = Number(dmy[1]);
  const second = Number(dmy[3]);
  const [day, month] = order === 'mdy' ? [second, first] : [first, second];
  return buildDate(year, month, day, ...toTime(dmy[5], dmy[6], dmy[7]));
}

// Порядок дня и месяца по всем значениям столбца: первое число > 12 — dd/mm, второе > 12 — mm/dd,
// иначе (неоднозначно) — dd/mm
function detectDateOrder(values) {
  let dayFirst = false;
  let monthFirst = false;
  for (const value of values) {
    const match = String(value || '').trim().match(DMY_DATE);
    if (!match) continue;
    if (Number(match[1]) > 12) dayFirst = true;
    if (Number(match[3]) > 12) monthFirst = true;
  }
  return monthFirst && !dayFirst ? 'mdy' : 'dmy';
}

const CURRENCY_ALIASES = {
  '₽': 'RUB', 'РУБ': 'RUB', 'РУБ.': 'RUB', 'Р': 'RUB', 'Р.': 'RUB', 'RUR': 'RUB', 'RUB': 'RUB', 'РУБЛЬ': 'RUB', 'РОССИЙСКИЙ РУБЛЬ': 'RUB',
  '$': 'USD', 'US$': 'USD', 'ДОЛЛАР США': 'USD',
  '€': 'EUR', 'ЕВРО': 'EUR',
  '₸': 'KZT', 'ТГ': 'KZT', 'ТГ.': 'KZT', 'ТЕНГЕ': 'KZT',
  '₺': 'TRY', '₾': 'GEL', '₹': 'INR', '฿': 'THB', 'СУМ': 'UZS', "SO'M": 'UZS', 'ЮАНЬ': 'CNY', 'CNH': 'CNY'
};

// Код валюты ISO из кода, символа или названия; пусто → fallback. Неизвестное возвращается как есть (в верхнем регистре).
function normalizeCurrency(raw, fallback) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return fallback;
  return CURRENCY_ALIASES[s] || s;
}

// Переводы, пополнения и снятия между счетами — их пользователь решает учитывать или нет
const TRANSFER_LABEL = /(перевод|пополнен|снятие|снятия|наличн|внесение|между (своими )?счетами|внутрибанк|transfer|top[- ]?up|replenish|withdraw|\bcash\b|\batm\b|банкомат|аударым|толықтыру|ақша алу)/i;
const TRANSFER_DESCRIPTION = /^(перевод|пополнение|внутренний перевод|снятие наличных|выдача наличных|внесение наличных|transfer|top[- ]?up|atm|cash withdrawal)/i;

function isTransferLabel(label) {
  return !!label && TRANSFER_LABEL.test(label) && !/кэшбэк|cashback|кешбэк/i.test(label);
}

function isTransferDescription(description) {
  return !!description && TRANSFER_DESCRIPTION.test(description.trim());
}

function cleanDescription(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > DESCRIPTION_MAX ? `${s.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : s;
}

// Операция из знаковой суммы; null — сумма нулевая или вне допустимого диапазона
function makeOperation({ date, signedAmount, kind = null, currency, description, bankCategory = '', mcc = '', isTransfer, altAmount = null, altCurrency = null }) {
  const amount = Math.abs(signedAmount);
  if (!date || !Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  const desc = cleanDescription(description) || cleanDescription(bankCategory);
  const op = {
    date,
    amount,
    kind: kind || (signedAmount < 0 ? 'expense' : 'income'),
    currency,
    description: desc,
    bankCategory: cleanDescription(bankCategory),
    mcc: String(mcc || '').trim(),
    isTransfer: isTransfer !== undefined ? isTransfer : (isTransferLabel(bankCategory) || isTransferDescription(desc))
  };
  if (altAmount && altCurrency && Math.abs(altAmount) > 0) {
    op.altAmount = Math.abs(altAmount);
    op.altCurrency = altCurrency;
  }
  return op;
}

module.exports = {
  ImportError,
  MAX_AMOUNT,
  decodeText,
  parseAmount,
  parseDateTime,
  detectDateOrder,
  buildDate,
  normalizeCurrency,
  isTransferLabel,
  isTransferDescription,
  cleanDescription,
  makeOperation
};
