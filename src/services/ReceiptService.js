const logger = require('../utils/logger');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { USER_LIMITS } = require('../utils/constants');
const { buildPrompt, SYSTEM_CATEGORY_HINTS } = require('./receipt/prompt');
const { normalizeReceipt, resolveReceiptTime, localMonthStart, localNow } = require('./receipt/normalize');

// Фото чека → траты по позициям. Распознаёт провайдер (receipt/providers.js), ответ проверяет normalize.js,
// записываются все позиции сразу одной транзакцией.
class ReceiptService {
  constructor({ receiptRepository, provider, expenseService, premiumService, localizationService, funnelService }) {
    this.receiptRepository = receiptRepository;
    this.provider = provider;
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.funnelService = funnelService;
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
