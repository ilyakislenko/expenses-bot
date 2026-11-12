const { localToday } = require('../utils/period');

// Общие помощники API Mini App: ошибки с кодом, обёртка async-обработчиков, проверка ввода, контекст пользователя.

// Ошибка с HTTP-статусом и машинным кодом (клиент показывает текст по коду: t(`error_${code}`) или общий)
class HttpError extends Error {
  constructor(status, code, extra = null) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const badRequest = (code = 'bad_request', extra) => new HttpError(400, code, extra);
const notFound = (code = 'not_found') => new HttpError(404, code);
const forbidden = (code = 'forbidden', extra) => new HttpError(403, code, extra);
// Нужен премиум: клиент показывает предложение премиума
const premiumRequired = (feature = null) => new HttpError(402, 'premium_required', feature ? { feature } : null);

// Express 5 сам ловит ошибки промисов, обёртка — для явности и Express 4-совместимости
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Лимит общего с ботом rateLimiter (utils/rateLimiter.js, тип type) для пользователя: сверх — 429 с кодом и
// retryAfter (через сколько секунд можно снова). Код по умолчанию 'rate' — клиент пишет «слишком часто»
function rateLimit(get, userId, type, code = 'rate') {
  const limit = get('rateLimiter').checkLimit(userId, type);
  if (!limit.allowed) throw new HttpError(429, code, { retryAfter: limit.resetTime || null });
}

// Целое из строки запроса/тела в пределах [min, max]; нет значения — def (undefined → ошибка)
function int(value, { min = -Infinity, max = Infinity, def, code = 'bad_int' } = {}) {
  if (value === undefined || value === null || value === '') {
    if (def !== undefined) return def;
    throw badRequest(code);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest(code);
  return n;
}

// Строка: обрезка пробелов, максимум длины; пустая — def (undefined → ошибка)
function str(value, { max = 500, def, code = 'bad_string' } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (def !== undefined) return def;
    throw badRequest(code);
  }
  const s = String(value).trim();
  if (s.length > max) throw badRequest(code);
  return s;
}

// Сумма > 0 с не более чем двумя знаками после запятой, не больше max
function money(value, { max = 99999999, code = 'bad_amount' } = {}) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.').replace(/\s/g, ''));
  // Копейки сравниваем с допуском: 4.35 * 100 = 434.99999999999994
  if (!Number.isFinite(n) || n <= 0 || n > max || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) throw badRequest(code);
  return Math.round(n * 100) / 100;
}

// Дата 'YYYY-MM-DD', существующая в календаре (2026-02-30 — ошибка)
function ymd(value, { def, code = 'bad_date' } = {}) {
  if ((value === undefined || value === null || value === '') && def !== undefined) return def;
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw badRequest(code);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) throw badRequest(code);
  return text;
}

// Контекст пользователя запроса, один раз на запрос: язык, валюта, пояс, сегодня, начало периода, премиум, перевод
function attachContext(get) {
  return (req, res, next) => {
    let promise = null;
    req.ctx = () => {
      if (!promise) {
        promise = (async () => {
          const userService = get('userService');
          const [lang, currency, timezone, startDay, isPremium] = await Promise.all([
            userService.getUserLanguage(req.userId),
            userService.getUserCurrency(req.userId),
            userService.getUserTimezone(req.userId),
            userService.getUserPeriodStartDay(req.userId),
            get('premiumService').isPremiumUser(req.userId)
          ]);
          const localization = get('localizationService');
          return {
            userId: req.userId,
            lang,
            currency,
            timezone: timezone || 'UTC',
            startDay: startDay || 1,
            today: localToday(timezone || 'UTC'),
            isPremium,
            t: (key, params) => localization.getText(lang, key, params)
          };
        })();
      }
      return promise;
    };
    next();
  };
}

module.exports = { HttpError, badRequest, notFound, forbidden, premiumRequired, wrap, rateLimit, int, str, money, ymd, attachContext };
