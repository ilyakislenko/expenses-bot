const logger = require('../utils/logger');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { USER_LIMITS } = require('../utils/constants');
const { buildPrompt, SYSTEM_CATEGORY_HINTS } = require('./receipt/prompt');
const { normalizeReceipt, resolveReceiptTime, localMonthStart, localNow } = require('./receipt/normalize');
const { runImageTask } = require('./receipt/imageWorker');
const { ReceiptError } = require('./receipt/errors');
const { MAX_RECORD_AGE_DAYS } = require('../utils/recordDate');

const DRAFT_TTL_DAYS = 7; // черновик чека и кадр для «повернуть» (receipt_drafts)
const DRAFT_TAKE_STALE_SECONDS = 300; // захват черновика под запись, после которого его можно взять снова (сбой записи)

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
  // Возвращает { receipt | error, image, mimeType, turn, attempts, small, lowResolution } — image/mimeType кадра, давшего ответ
  // (его поворачивает кнопка «повернуть на 90°»), turn — на сколько градусов он повёрнут относительно подготовленного
  // (0 или 180); small — чек мелкий в кадре, lowResolution — к тому же сжатое фото
  async recognizePhoto(userId, { image, mimeType, lang, currency, timezone, onStatus, onRetry, prepared = false, retry = true, small = false, lowResolution = false }) {
    let prep = { image, mimeType, info: { prepared: true, reused: true, small, lowResolution } };
    if (!prepared) {
      prep = await runImageTask('prepare', image, { mimeType });
      logger.info('Receipt image prepared', { userId, ...prep.info });
    }
    const isSmall = Boolean(prep.info.small);
    const options = { lang, currency, timezone, onStatus };
    const run = async (frame, frameType, turn) => ({ ...distrustSparse(await this.attempt(userId, { ...options, image: frame, mimeType: frameType }), isSmall), image: frame, mimeType: frameType, turn });
    let best = await run(prep.image, prep.mimeType, 0);
    let attempts = 1;
    if (retry && needsRetry(best) && prep.mimeType === 'image/jpeg' && prep.info.prepared) {
      if (onRetry) await onRetry();
      const rotated = (await runImageTask('rotate', prep.image, { degrees: 180 })).image;
      best = pickBetter(best, await run(rotated, 'image/jpeg', 180));
      attempts = 2;
    }
    logger.info('Receipt recognition result', {
      userId, attempts, error: best.error ? best.error.code : null,
      lowConfidence: best.receipt ? best.receipt.lowConfidence : null, checks: best.receipt ? best.receipt.checks : null
    });
    return { ...best, attempts, small: isSmall, lowResolution: Boolean(prep.info.lowResolution) };
  }

  // ---------- Черновик неуверенно распознанного чека и кадр для «повернуть» ----------
  // Хранятся в БД (receipt_drafts) DRAFT_TTL_DAYS дней: кнопки работают и после перезапуска бота.
  // Сам кадр не хранится — только file_id фото в Telegram и поворот (frame.turn), по ним кадр готовится заново.

  async saveDraft(userId, messageId, { receipt = null, timezone = null, frame = null }) {
    await this.receiptRepository.saveDraft(userId, messageId, { receipt, timezone, frame }, DRAFT_TTL_DAYS);
  }

  // { status: 'ok', receipt, timezone } | { status: 'busy' } | { status: 'missing' }
  async takeDraft(userId, messageId) {
    return this.receiptRepository.takeDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS);
  }

  async releaseDraft(userId, messageId) {
    await this.receiptRepository.releaseDraft(userId, messageId);
  }

  async deleteDraft(userId, messageId) {
    await this.receiptRepository.deleteDraft(userId, messageId);
  }

  // Черновик для показа: { status: 'ok', receipt, frame, timezone } | { status: 'busy' } | { status: 'missing' }
  async getDraft(userId, messageId) {
    return this.receiptRepository.getDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS);
  }

  // Правка черновика: change(receipt) — функция из receipt/draftEdit.js (новый черновик или null — менять нечего).
  // Записывающийся черновик не правится. { status: 'ok' | 'unchanged', receipt, frame, timezone } | busy | missing
  async updateDraft(userId, messageId, change) {
    return this.receiptRepository.updateDraft(userId, messageId, DRAFT_TAKE_STALE_SECONDS, change);
  }

  // Черновик переехал на новое сообщение (прислан заново после ввода текстом). false — уже не переедет
  async moveDraft(userId, fromMessageId, toMessageId) {
    return this.receiptRepository.moveDraft(userId, fromMessageId, toMessageId);
  }

  // Кадр для «повернуть» (черновик этого сообщения уходит вместе с ним). null — нет или устарел
  async takeFrame(userId, messageId) {
    return this.receiptRepository.takeFrame(userId, messageId);
  }

  // Категории пользователя по id (для черновика чека до записи)
  async categoriesById(userId) {
    const categories = await this.expenseService.getCategories(userId);
    return new Map(categories.map(category => [category.id, category]));
  }

  // Записывает позиции тратами (описание — название позиции в пределах лимита описания пользователя).
  // Дата трат — дата чека, если она не в будущем и не старше 60 дней (выбранная в черновике вручную — года), иначе
  // сейчас. Возвращает id чека.
  async record(userId, receipt, { timezone, familyId = null }) {
    const limits = await this.premiumService.getUserLimits(userId);
    const items = receipt.items.map(item => ({
      amount: item.amount,
      categoryId: item.categoryId,
      description: item.name ? item.name.slice(0, limits.MAX_DESCRIPTION_LENGTH).trim() : null,
      quantity: item.quantity,
      unitPrice: item.price
    }));
    const receiptId = await this.receiptRepository.create(userId, {
      merchant: receipt.merchant,
      date: receipt.date,
      time: receipt.time,
      currency: receipt.currency,
      total: receipt.total,
      itemsTotal: receipt.itemsTotal,
      localAt: resolveReceiptTime(receipt.date, receipt.time, timezone, new Date(), receipt.dateManual ? MAX_RECORD_AGE_DAYS : undefined),
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

  // Другой день чека: purchased_date и все его оставшиеся траты одной транзакцией (время каждой остаётся).
  // null — чек не найден или отменён, иначе { expenses: перенесено трат }
  async setDate(userId, receiptId, date, timezone) {
    const result = await this.receiptRepository.setDate(userId, receiptId, date, timezone);
    if (result) logger.info('Receipt date changed', { userId, receiptId, date, ...result });
    return result;
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
