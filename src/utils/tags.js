// Теги в описании трат: «250 кофе #отпуск» — тег «отпуск». Хранятся прямо в описании (работают во всех способах
// записи: текст, голос, несколько записей, импорт), отдельной колонки нет. Тег — «#» и всё до пробела; по краям
// отрезаются знаки («#отпуск,» — «отпуск»), регистр не важен. Для запоминания категории по описанию теги
// отрезаются (stripTags): «кофе #отпуск» — та же категория, что «кофе». SQL-двойник — TAG_SQL_PATTERN.
const TOKEN = /#\S+/gu;
const STRIP = /\s*#\S+/gu;
const EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const MAX_TAG_LENGTH = 20;
const MAX_TAG_BYTES = 56; // tg|<тег> в callback_data не длиннее 64 байт
const TAG_SQL_PATTERN = '\\s*#\\S+';

function normalizeTag(token) {
  let tag = String(token).replace(/^#+/, '').replace(EDGE, '').toLowerCase();
  tag = [...tag].slice(0, MAX_TAG_LENGTH).join('');
  while (Buffer.byteLength(tag) > MAX_TAG_BYTES) tag = [...tag].slice(0, -1).join('');
  return tag;
}

// Теги описания без повторов, в порядке появления
function extractTags(text) {
  if (!text) return [];
  const tags = [];
  for (const token of String(text).match(TOKEN) || []) {
    const tag = normalizeTag(token);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function stripTags(text) {
  return String(text || '').replace(STRIP, '').trim();
}

// Суммы по тегам — общие для бота (TagHandlers) и Mini App (api/tags.js). rows — траты (новые первыми),
// convert(amount, currency) → сумма в основной валюте. → Map<тег, { total, count, rows: [{ ...row, value }] }>,
// теги по убыванию суммы, записи тега — в порядке rows
async function summarizeTags(rows, convert) {
  const tags = new Map();
  for (const row of rows) {
    const value = await convert(Number(row.amount), row.currency);
    for (const tag of extractTags(row.description)) {
      const entry = tags.get(tag) || { total: 0, count: 0, rows: [] };
      entry.total += value;
      entry.count += 1;
      entry.rows.push({ ...row, value });
      tags.set(tag, entry);
    }
  }
  return new Map([...tags].sort((a, b) => b[1].total - a[1].total));
}

// Перевод в основную валюту с кешем курса на время одного подсчёта
function currencyConverter(currencyUtils, currency) {
  const rates = new Map();
  return async (amount, from) => {
    if (!from || from === currency) return amount;
    if (!rates.has(from)) rates.set(from, await currencyUtils.convert(1, from, currency));
    return amount * rates.get(from);
  };
}

module.exports = { extractTags, stripTags, normalizeTag, summarizeTags, currencyConverter, TAG_SQL_PATTERN, MAX_TAG_LENGTH };
