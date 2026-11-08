// Общее для api/income.js и api/recurring.js (не модуль API — в api/index.js его нет): проверка валюты и описания
// как у ввода в боте, «Вернуть» после удаления, текст бота без Markdown.
const { SUPPORTED_CURRENCIES, BASE_CURRENCY } = require('../../config/currencies');
const { badRequest } = require('../http');

const CURRENCIES = new Set([BASE_CURRENCY, ...SUPPORTED_CURRENCIES]);

// Код валюты из списка бота; пусто — def
function currency(value, { def, code }) {
  if ((value === undefined || value === null || value === '') && def !== undefined) return def;
  const upper = String(value || '').toUpperCase();
  if (!CURRENCIES.has(upper)) throw badRequest(code);
  return upper;
}

// Описание как у ввода в боте (EnhancedValidator: без управляющих символов и <>, пробелы схлопываются), до max
// символов (USER_LIMITS.MAX_DESCRIPTION_LENGTH). Пусто — null или ошибка emptyCode
function description(value, { max, validator, code, emptyCode = null }) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) {
    if (emptyCode) throw badRequest(emptyCode);
    return null;
  }
  if (text.length > max || !validator.validateDescription(text, max).isValid) throw badRequest(code);
  return validator.sanitizeText(text, max);
}

// Удалённые строки на несколько минут: «Вернуть» в тосте восстанавливает ровно ту же запись (id, время, отметки).
// В памяти процесса — бот работает одним процессом, после перезапуска вернуть нельзя (как и кнопку старого сообщения)
const UNDO_TTL_MS = 10 * 60 * 1000;
function undoStore() {
  const rows = new Map();
  const prune = (now) => { for (const [key, entry] of rows) if (now - entry.at > UNDO_TTL_MS) rows.delete(key); };
  return {
    put(userId, id, row) {
      const now = Date.now();
      prune(now);
      rows.set(`${userId}:${id}`, { row, at: now });
    },
    take(userId, id) {
      prune(Date.now());
      const key = `${userId}:${id}`;
      const entry = rows.get(key);
      rows.delete(key);
      return entry ? entry.row : null;
    }
  };
}

// Строка бота с Markdown (предупреждения бюджета, заметки достижений) → обычный текст
function plain(text) {
  return String(text || '').replace(/\\(.)|[*_`]/g, (match, escaped) => escaped || '').trim();
}

module.exports = { currency, description, undoStore, plain };
