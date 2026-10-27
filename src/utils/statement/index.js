// Разбор файла выписки: определение формата по содержимому, нормализация и фильтр валют.
const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { ImportError, decodeText } = require('./common');
const { parseCsvStatement } = require('./csv');
const { parseBankText } = require('./bankText');
const { extractPdfText } = require('./pdfText');
const { mapBankCategory } = require('./categories');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_OPERATIONS = 5000;
const SUPPORTED_EXTENSIONS = ['csv', 'pdf', 'txt'];
const SUPPORTED_MIME = /^(text\/(csv|plain|comma-separated-values|tab-separated-values)|application\/(pdf|csv|vnd\.ms-excel))$/i;

function fileExtension(fileName) {
  const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

// Документ Telegram похож на выписку: .csv/.pdf/.txt (или такой MIME-тип без расширения)
function isSupportedDocument({ file_name: fileName, mime_type: mimeType } = {}) {
  const ext = fileExtension(fileName);
  if (ext) return SUPPORTED_EXTENSIONS.includes(ext);
  return SUPPORTED_MIME.test(mimeType || '');
}

function isPdf(buffer) {
  return buffer.subarray(0, 1024).includes('%PDF-');
}

// Валюта: пустая → defaultCurrency; не из SUPPORTED_CURRENCIES → пропуск со счётчиком
function finalize(result, defaultCurrency) {
  const operations = [];
  let unsupportedCurrency = 0;
  for (const op of result.operations) {
    const currency = op.currency || defaultCurrency;
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      unsupportedCurrency++;
      continue;
    }
    const normalized = { ...op, currency };
    if (normalized.altCurrency && !SUPPORTED_CURRENCIES.includes(normalized.altCurrency)) {
      delete normalized.altAmount;
      delete normalized.altCurrency;
    }
    operations.push(normalized);
  }
  if (operations.length > MAX_OPERATIONS) throw new ImportError('too_many', { max: MAX_OPERATIONS });
  if (!operations.length && !result.skipped.failed && !unsupportedCurrency) throw new ImportError('empty');
  operations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return {
    source: result.source,
    operations,
    skipped: { failed: result.skipped.failed, invalid: result.skipped.invalid, currency: unsupportedCurrency }
  };
}

// Текст выписки (CSV или скопированный/извлечённый из PDF) → результат разбора
function parseStatementText(text, { defaultCurrency = 'RUB', fromPdf = false } = {}) {
  let result = null;
  let csvError = null;
  if (!fromPdf) {
    try {
      result = parseCsvStatement(text);
    } catch (error) {
      if (!(error instanceof ImportError)) throw error;
      csvError = error;
    }
  }
  if (!result || !result.operations.length) {
    const bank = parseBankText(text);
    if (bank) result = bank;
  }
  if (!result) throw csvError || new ImportError('unknown_format');
  return finalize(result, defaultCurrency);
}

// Буфер файла → { source: 'tbank'|'sber'|'kaspi'|'csv', operations, skipped: { failed, invalid, currency } }
async function parseStatement(buffer, { defaultCurrency = 'RUB' } = {}) {
  if (isPdf(buffer)) {
    const text = await extractPdfText(buffer);
    return parseStatementText(text, { defaultCurrency, fromPdf: true });
  }
  return parseStatementText(decodeText(buffer), { defaultCurrency });
}

module.exports = {
  ImportError,
  MAX_FILE_BYTES,
  MAX_OPERATIONS,
  isSupportedDocument,
  parseStatement,
  parseStatementText,
  mapBankCategory
};
