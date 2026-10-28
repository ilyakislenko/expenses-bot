// Разбор CSV-выписок: Т-Банк (известный набор столбцов) и любой CSV со строкой заголовков.
const fs = require('fs');
const path = require('path');
const {
  ImportError, parseAmount, parseDateTime, detectDateOrder, normalizeCurrency, isTransferLabel, isTransferDescription, makeOperation
} = require('./common');

const DELIMITERS = [';', ',', '\t', '|'];
const HEADER_SCAN_ROWS = 30;

// RFC 4180: кавычки, удвоенные кавычки, переводы строк внутри кавычек
function readCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let quoted = false;
  let blank = true; // в поле пока только пробелы: field.trim() на каждой кавычке давал квадратичное время
  const append = (c) => {
    field += c;
    if (blank && c.trim() !== '') blank = false;
  };
  const pushField = () => {
    row.push(quoted ? field : field.trim());
    field = '';
    quoted = false;
    blank = true;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          append('"');
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        append(c);
      }
    } else if (c === '"' && blank) {
      inQuotes = true;
      quoted = true;
      field = '';
    } else if (c === delimiter) {
      pushField();
    } else if (c === '\n') {
      pushField();
      rows.push(row);
      row = [];
    } else if (c !== '\r') {
      append(c);
    }
  }
  if (field !== '' || row.length) {
    pushField();
    rows.push(row);
  }
  return rows
    .map(cells => cells.map(cell => cell.trim()))
    .filter(cells => cells.some(cell => cell !== ''));
}

// Разделитель, при котором первые строки дают одинаковое (и наибольшее) число столбцов
function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 40).join('\n');
  let best = null;
  for (const delimiter of DELIMITERS) {
    const rows = readCsv(sample, delimiter).slice(0, 20);
    if (!rows.length) continue;
    const counts = new Map();
    for (const row of rows) {
      if (row.length >= 2) counts.set(row.length, (counts.get(row.length) || 0) + 1);
    }
    if (!counts.size) continue;
    const [width, frequency] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const score = frequency * 100 + width;
    if (!best || score > best.score) best = { delimiter, score };
  }
  return best ? best.delimiter : null;
}

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Подписи столбцов экспорта самого бота на всех языках (date_label, amount_label …)
let localeLabels = null;
function botExportLabels() {
  if (localeLabels) return localeLabels;
  localeLabels = { date: [], amount: [], currency: [], category: [], description: [] };
  const dir = path.join(__dirname, '..', '..', 'locales');
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.js'))) {
    const texts = require(path.join(dir, file));
    for (const role of Object.keys(localeLabels)) {
      const label = texts[`${role}_label`];
      if (label) localeLabels[role].push(normalizeHeader(label));
    }
  }
  return localeLabels;
}

const exact = (...words) => words.map(word => new RegExp(`^${word}$`));

// Признаки столбцов по заголовку: сначала точные совпадения, затем вхождения
function columnPatterns() {
  const labels = botExportLabels();
  const fromLabels = (role) => labels[role].map(label => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  return {
    date: [...exact('дата операции', 'дата и время операции', 'transaction date', 'date', 'дата', 'datum', 'fecha', 'data', 'tarih', 'date of transaction'),
      ...fromLabels('date'), /дата операц/, /transaction date/, /^дата/, /date/, /дата/, /datum/, /fecha/, /tarih/, /日期/, /日付/, /თარიღ/, /күн/, /sana/],
    amount: [...exact('сумма операции', 'сумма', 'amount', 'sum', 'сумма в валюте счета', 'сумма платежа', 'betrag', 'importe', 'montant', 'valor', 'tutar'),
      ...fromLabels('amount'), /сумма операц/, /сумма/, /amount/, /betrag/, /importe/, /montant/, /valor/, /tutar/, /金额/, /金額/, /თანხა/, /сома/, /summa/],
    debit: [/^расход/, /списан/, /^debit/, /^дебет/, /withdrawal/, /paid out/, /money out/, /outflow/, /^out$/, /^expense/],
    credit: [/^приход/, /поступлен/, /зачислен/, /^credit/, /^кредит/, /^deposit/, /paid in/, /money in/, /inflow/, /^in$/, /^income/],
    currency: [...exact('валюта операции', 'валюта', 'currency', 'ccy', 'cur', 'währung', 'moneda', 'devise', 'moeda', 'para birimi'),
      ...fromLabels('currency'), /валюта/, /currency/, /währung/, /moneda/, /devise/, /货币/, /通貨/],
    description: [...exact('описание', 'description', 'описание операции', 'назначение платежа', 'details', 'payee', 'merchant'),
      ...fromLabels('description'), /описание/, /назначение/, /description/, /details/, /детали/, /payee/, /merchant/, /получатель/, /контрагент/,
      /наименование/, /комментарий/, /memo/, /narrative/, /beschreibung/, /descripci/, /libell/, /açıklama/, /描述/, /説明/, /^name$/],
    category: [...exact('категория', 'category'), ...fromLabels('category'), /категори/, /category/, /kategor/, /categor/, /类别/, /カテゴリ/],
    status: [...exact('статус', 'status'), /статус/, /status/],
    mcc: [/^mcc$/],
    type: [...exact('тип операции', 'тип', 'type', 'transaction type', 'вид операции'), /тип операц/, /вид операц/, /transaction type/]
  };
}

const AMOUNT_EXCLUDE = /остаток|баланс|balance|saldo|кэшбэк|кешбэк|cashback|бонус|округлен|комисс|fee/;
const DATE_EXCLUDE = /рожден|birth/;

function findColumn(headers, patterns, used, exclude = null) {
  for (const pattern of patterns) {
    const index = headers.findIndex((header, i) => !used.has(i) && header && pattern.test(header) && !(exclude && exclude.test(header)));
    if (index >= 0) return index;
  }
  return -1;
}

// Столбцы по заголовку; null — нет даты или суммы (ни общей, ни расход/приход)
function mapColumns(rawHeaders) {
  const headers = rawHeaders.map(normalizeHeader);
  const patterns = columnPatterns();
  const used = new Set();
  const take = (role, exclude) => {
    const index = findColumn(headers, patterns[role], used, exclude);
    if (index >= 0) used.add(index);
    return index;
  };
  const columns = {};
  columns.date = take('date', DATE_EXCLUDE);
  columns.debit = take('debit', AMOUNT_EXCLUDE);
  columns.credit = take('credit', AMOUNT_EXCLUDE);
  columns.amount = take('amount', AMOUNT_EXCLUDE);
  columns.currency = take('currency');
  columns.status = take('status');
  columns.mcc = take('mcc');
  columns.category = take('category');
  columns.type = take('type');
  columns.description = take('description');
  const hasAmount = columns.amount >= 0 || columns.debit >= 0 || columns.credit >= 0;
  return columns.date >= 0 && hasAmount ? columns : null;
}

const FAILED_STATUS = /failed|declined|rejected|отклон|ошибк|неуспеш|отмен|cancel/i;
const EXPENSE_TYPE = /расход|списан|debit|expense|outgo|withdraw|покупк|оплат|payment|purchase/i;
const INCOME_TYPE = /приход|доход|зачисл|поступл|credit|income|deposit|refund|возврат/i;

const cell = (row, index) => (index >= 0 && index < row.length ? row[index] : '');

// Строки таблицы → операции. Сумма: столбец со знаком или пара расход/приход;
// если в файле нет ни одной отрицательной суммы и нет расход/приход — все строки считаются тратами
function parseRows(rows, columns, { defaultCurrency = null, amountFallback = -1, currencyFallback = -1, altAmount = -1, altCurrency = -1 } = {}) {
  const operations = [];
  const skipped = { failed: 0, invalid: 0 };
  const dateOrder = detectDateOrder(rows.map(row => cell(row, columns.date)));
  const amountOf = (row) => {
    let value = parseAmount(cell(row, columns.amount));
    if (value === null && amountFallback >= 0) value = parseAmount(cell(row, amountFallback));
    return value;
  };
  const splitAmounts = columns.amount < 0 || (columns.debit >= 0 && columns.credit >= 0);
  const anyNegative = !splitAmounts && rows.some(row => (amountOf(row) || 0) < 0);

  for (const row of rows) {
    const dateCell = cell(row, columns.date);
    let signed = null;
    let kind = null;
    if (splitAmounts) {
      const debit = parseAmount(cell(row, columns.debit));
      const credit = parseAmount(cell(row, columns.credit));
      if (debit) {
        signed = -Math.abs(debit);
      } else if (credit) {
        signed = Math.abs(credit);
      } else if (debit === 0 || credit === 0) {
        signed = 0;
      }
    } else {
      signed = amountOf(row);
      const typeText = cell(row, columns.type);
      if (typeText && EXPENSE_TYPE.test(typeText)) kind = 'expense';
      else if (typeText && INCOME_TYPE.test(typeText)) kind = 'income';
      else if (!anyNegative) kind = 'expense';
    }
    // Итоговые и пустые строки (нет суммы) не считаем
    const amountCells = splitAmounts ? [columns.debit, columns.credit] : [columns.amount, amountFallback];
    if (signed === null && amountCells.every(index => !cell(row, index))) continue;
    const date = parseDateTime(dateCell, dateOrder);
    if (!date || signed === null) {
      skipped.invalid++;
      continue;
    }
    if (signed === 0) continue;
    if (columns.status >= 0 && FAILED_STATUS.test(cell(row, columns.status))) {
      skipped.failed++;
      continue;
    }
    let currencyRaw = cell(row, columns.currency);
    if (!currencyRaw && currencyFallback >= 0) currencyRaw = cell(row, currencyFallback);
    const bankCategory = cell(row, columns.category);
    const typeText = cell(row, columns.type);
    const description = cell(row, columns.description);
    const alt = altAmount >= 0 ? parseAmount(cell(row, altAmount)) : null;
    const op = makeOperation({
      date,
      signedAmount: signed,
      kind,
      currency: normalizeCurrency(currencyRaw, defaultCurrency),
      description,
      bankCategory,
      mcc: cell(row, columns.mcc),
      isTransfer: isTransferLabel(bankCategory) || isTransferLabel(typeText) || isTransferDescription(description),
      altAmount: alt,
      altCurrency: altCurrency >= 0 ? normalizeCurrency(cell(row, altCurrency), null) : null
    });
    if (op) operations.push(op);
    else skipped.invalid++;
  }
  return { operations, skipped };
}

const TBANK_HEADERS = ['дата операции', 'статус', 'сумма операции', 'валюта операции', 'сумма платежа', 'валюта платежа', 'категория', 'описание'];

function isTbankHeader(headers) {
  const normalized = headers.map(normalizeHeader);
  return TBANK_HEADERS.every(header => normalized.includes(header));
}

// Т-Банк: сумма и валюта платежа (в валюте счёта), запасные — сумма и валюта операции; статус FAILED пропускается
function parseTbank(rows, headerIndex) {
  const headers = rows[headerIndex].map(normalizeHeader);
  const index = (name) => headers.indexOf(name);
  const columns = {
    date: index('дата операции'),
    amount: index('сумма платежа'),
    currency: index('валюта платежа'),
    status: index('статус'),
    category: index('категория'),
    mcc: index('mcc'),
    description: index('описание'),
    type: -1,
    debit: -1,
    credit: -1
  };
  const result = parseRows(rows.slice(headerIndex + 1), columns, {
    defaultCurrency: 'RUB',
    amountFallback: index('сумма операции'),
    currencyFallback: index('валюта операции'),
    altAmount: index('сумма операции'),
    altCurrency: index('валюта операции')
  });
  return { source: 'tbank', ...result };
}

// CSV-текст → { source, operations, skipped }. Без столбцов даты и суммы — ImportError('csv_columns').
// null — текст не похож на таблицу (может быть скопированной выпиской Сбера/Kaspi).
function parseCsvStatement(text) {
  const delimiter = detectDelimiter(text);
  if (!delimiter) return null;
  const rows = readCsv(text, delimiter);
  if (rows.length < 2) return null;
  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
    if (isTbankHeader(rows[i])) return parseTbank(rows, i);
  }
  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
    if (rows[i].length < 2) continue;
    const columns = mapColumns(rows[i]);
    if (columns) {
      return { source: 'csv', ...parseRows(rows.slice(i + 1), columns) };
    }
  }
  throw new ImportError('csv_columns');
}

module.exports = { readCsv, detectDelimiter, mapColumns, parseCsvStatement };
