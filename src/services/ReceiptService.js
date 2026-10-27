const logger = require('../utils/logger');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { USER_LIMITS } = require('../utils/constants');
const { buildPrompt, SYSTEM_CATEGORY_HINTS } = require('./receipt/prompt');
const { normalizeReceipt, resolveReceiptTime, localMonthStart, localNow } = require('./receipt/normalize');
const { runImageTask } = require('./receipt/imageWorker');
const { ReceiptError } = require('./receipt/errors');

// Повторять с поворотом: ответ не разобран (в том числе битый JSON) или цифрам нельзя верить
function needsRetry(result) {
  return result.error ? result.error.code === 'unreadable' : result.receipt.lowConfidence;
}

// Строки, где сумма = round(количество × цена)
function exactLines(receipt) {
  return receipt.items.filter(item => item.price !== null && Math.abs(Math.round(item.quantity * item.price * 100) / 100 - item.amount) < 0.005).length;
}

// Лучший из двух ответов: распознанный лучше ошибки, уверенный лучше черновика, дальше — больше строк, где сумма =
// количество × цена, затем сумма ближе к итогу. При равенстве — первый
function pickBetter(first, second) {
  if (!first.receipt || !second.receipt) return first.receipt ? first : second.receipt ? second : first;
  const a = first.receipt;
  const b = second.receipt;
  if (a.lowConfidence !== b.lowConfidence) return a.lowConfidence ? second : first;
  const exactA = exactLines(a);
  const exactB = exactLines(b);
  if (exactA !== exactB) return exactB > exactA ? second : first;
  const deviation = (receipt) => (receipt.checks.sumDeviation === null ? 0 : receipt.checks.sumDeviation);
  return deviation(b) < deviation(a) ? second : first;
}

// Мелкий чек в кадре и одна-две позиции — типичная выдумка маленькой модели (например, одна строка на весь итог,
// которую нечем проверить): не записываем сами, показываем черновик
const SPARSE_ITEMS = 2;
function distrustSparse(result, small) {
  if (!small || !result.receipt || result.receipt.items.length > SPARSE_ITEMS) return result;
  const receipt = result.receipt;
  return { ...result, receipt: { ...receipt, lowConfidence: true, checks: { ...receipt.checks, smallImage: true } } };
}

// Фото чека → траты по позициям. Распознаёт провайдер (receipt/providers.js), ответ проверяет normalize.js,
// записываются все позиции сразу одной транзакцией.
class ReceiptService {
  constructor({ receiptRepository, provider, expenseService, premiumService, localizationService, funnelService, referralService = null }) {
    this.receiptRepository = receiptRepository;
    this.provider = provider;
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.funnelService = funnelService;
    this.referralService = referralService;
  }

  get configured() {
    return !!(this.provider && this.provider.configured);
  }

  // Сколько чеков в месяц даёт премиум (для подсказки при исчерпанном бесплатном лимите)
  get premiumLimit() {
    return USER_LIMITS.premium.MAX_RECEIPTS_PER_MONTH;
  }

  // Месячный лимит распознаваний (локальный календарный месяц; неудачные распознавания не считаются)
  async checkLimit(userId, timezone) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const limit = (isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_RECEIPTS_PER_MONTH;
    const used = await this.receiptRepository.countSince(userId, localMonthStart(timezone), timezone);
    return { isPremium, limit, used, remaining: Math.max(0, limit - used) };
  }

  // Категории пользователя для подсказки модели и обратного сопоставления (по названию на его языке и в БД)
  async categoryChoices(userId, lang) {
    const [categories, fallback] = await Promise.all([
      this.expenseService.getCategories(userId),
      this.expenseService.getDefaultCategory()
    ]);
    const label = (name) => this.expenseService.translateCategoryName(name, this.localizationService, lang);
    return {
      labels: categories.map(category => ({
        name: label(category.name),
        hint: Number(category.user_id) === 0 ? SYSTEM_CATEGORY_HINTS[category.name] : undefined
      })),
      fallbackLabel: label(fallback.name),
      fallbackCategoryId: fallback.id,
      choices: categories.map(category => ({ id: category.id, names: [label(category.name), category.name] }))
    };
  }

  // Распознаёт фото. Ошибки — ReceiptError (receipt/errors.js). onStatus({ position, local }) — очередь и начало работы слота
  async recognize(userId, { image, mimeType, lang, currency, timezone, onStatus }) {
    const { labels, fallbackLabel, fallbackCategoryId, choices } = await this.categoryChoices(userId, lang);
    const prompt = buildPrompt({ categories: labels, fallbackCategory: fallbackLabel, defaultCurrency: currency, today: localNow(timezone).date });
    const started = Date.now();
    const raw = await this.provider.recognize({ image, mimeType, prompt, onStatus });
    const receipt = normalizeReceipt(raw, { categories: choices, fallbackCategoryId, defaultCurrency: currency, supportedCurrencies: SUPPORTED_CURRENCIES });
    logger.info('Receipt recognized', {
      userId, items: receipt.items.length, mismatch: receipt.mismatch, lowConfidence: receipt.lowConfidence, checks: receipt.checks, ms: Date.now() - started
    });
    return receipt;
  }

  // Одна попытка: { receipt } или { error } (ReceiptError)
  async attempt(userId, options) {
    try {
      return { receipt: await this.recognize(userId, options) };
    } catch (error) {
      return { error: error instanceof ReceiptError ? error : new ReceiptError('unavailable', error.message) };
    }
  }

  // Фото → подготовка (EXIF, поиск чека, поворот строк, размер) → распознавание; если ответ не читается или ему
  // нельзя верить — ещё одна попытка с кадром, повёрнутым на 180°, и выбор лучшего ответа.
  // prepared — image уже подготовлен (повтор по кнопке «повернуть»; small/lowResolution — из первой подготовки),
  // retry — разрешена вторая попытка. onRetry() — перед второй попыткой.
  // Возвращает { receipt | error, image, mimeType, attempts, small, lowResolution } — image/mimeType кадра, давшего ответ
  // (его поворачивает кнопка «повернуть на 90°»); small — чек мелкий в кадре, lowResolution — к тому же сжатое фото
  async recognizePhoto(userId, { image, mimeType, lang, currency, timezone, onStatus, onRetry, prepared = false, retry = true, small = false, lowResolution = false }) {
    let prep = { image, mimeType, info: { prepared: true, reused: true, small, lowResolution } };
    if (!prepared) {
      prep = await runImageTask('prepare', image, { mimeType });
      logger.info('Receipt image prepared', { userId, ...prep.info });
    }
    const isSmall = Boolean(prep.info.small);
    const options = { lang, currency, timezone, onStatus };
    const run = async (frame, frameType) => ({ ...distrustSparse(await this.attempt(userId, { ...options, image: frame, mimeType: frameType }), isSmall), image: frame, mimeType: frameType });
    let best = await run(prep.image, prep.mimeType);
    let attempts = 1;
    if (retry && needsRetry(best) && prep.mimeType === 'image/jpeg' && prep.info.prepared) {
      if (onRetry) await onRetry();
      const rotated = (await runImageTask('rotate', prep.image, { degrees: 180 })).image;
      best = pickBetter(best, await run(rotated, 'image/jpeg'));
      attempts = 2;
    }
    logger.info('Receipt recognition result', {
      userId, attempts, error: best.error ? best.error.code : null,
      lowConfidence: best.receipt ? best.receipt.lowConfidence : null, checks: best.receipt ? best.receipt.checks : null
    });
    return { ...best, attempts, small: isSmall, lowResolution: Boolean(prep.info.lowResolution) };
  }

  // Категории пользователя по id (для черновика чека до записи)
  async categoriesById(userId) {
    const categories = await this.expenseService.getCategories(userId);
    return new Map(categories.map(category => [category.id, category]));
  }

  // Записывает позиции тратами (описание — название позиции в пределах лимита описания пользователя).
  // Дата трат — дата чека, если она не в будущем и не старше 60 дней, иначе сейчас. Возвращает id чека.
  async record(userId, receipt, { timezone, familyId = null }) {
    const limits = await this.premiumService.getUserLimits(userId);
    const items = receipt.items.map(item => ({
      amount: item.amount,
      categoryId: item.categoryId,
      description: item.name ? item.name.slice(0, limits.MAX_DESCRIPTION_LENGTH).trim() : null
    }));
    const receiptId = await this.receiptRepository.create(userId, {
      merchant: receipt.merchant,
      date: receipt.date,
      time: receipt.time,
      currency: receipt.currency,
      total: receipt.total,
      itemsTotal: receipt.itemsTotal,
      localAt: resolveReceiptTime(receipt.date, receipt.time, timezone),
      timezone,
      familyId,
      items
    });
    await this.funnelService.track(userId, 'first_expense');
    // Позиции чека — тоже траты: награда за приглашение в фоне (сервис сам ловит ошибки)
    if (this.referralService) this.referralService.onExpenseRecorded(userId);
    return receiptId;
  }

  async getReceipt(userId, receiptId) {
    return this.receiptRepository.getById(userId, receiptId);
  }

  async getExpenses(userId, receiptId) {
    return this.receiptRepository.getExpenses(userId, receiptId);
  }

  async confirm(userId, receiptId) {
    return this.receiptRepository.setStatus(userId, receiptId, 'confirmed');
  }

  async undo(userId, receiptId) {
    const result = await this.receiptRepository.undo(userId, receiptId);
    if (result) logger.info('Receipt undone', { userId, receiptId, ...result });
    return result;
  }
}

module.exports = ReceiptService;

ReceiptService.pickBetter = pickBetter;
ReceiptService.needsRetry = needsRetry;
ReceiptService.distrustSparse = distrustSparse;
