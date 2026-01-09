const logger = require('../utils/logger');

class CategoryService {
  constructor(categoryRepository, premiumService, expenseRepository, userRepository, categoryLimitRepository, formatter) {
    this.categoryRepository = categoryRepository;
    this.premiumService = premiumService;
    this.expenseRepository = expenseRepository;
    this.userRepository = userRepository;
    this.categoryLimitRepository = categoryLimitRepository;
    this.formatter = formatter;
  }

  async getUserCategories(userId) {
    return this.categoryRepository.getUserCategories(userId);
  }

  async getAllAvailableCategories(userId) {
    // Показываем системные + пользовательские категории для премиум
    const isPremium = await this.premiumService.isPremiumUser(userId);
    return this.categoryRepository.getCategoriesWithPremium(userId, isPremium);
  }

  async createUserCategory(userId, name, icon = '📦') {
    // Только премиум пользователи
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      const error = new Error('premium_required');
      error.code = 'PREMIUM_REQUIRED';
      throw error;
    }

    const existing = await this.categoryRepository.getUserCategories(userId);
    const limits = await this.premiumService.getUserLimits(userId);
    if (existing.length >= (limits.MAX_CUSTOM_CATEGORIES || 0)) {
      const error = new Error('custom_categories_limit_reached');
      error.code = 'LIMIT_REACHED';
      error.max = limits.MAX_CUSTOM_CATEGORIES || 0;
      throw error;
    }

    // Проверка дубликатов по имени среди пользовательских
    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      const error = new Error('custom_category_exists');
      error.code = 'ALREADY_EXISTS';
      throw error;
    }

    const created = await this.categoryRepository.createUserCategory(userId, name.trim(), icon);
    logger.info('User category created', { userId, categoryId: created.id, name: created.name });
    return created;
  }

  async deleteUserCategory(userId, categoryId) {
    // Только премиум пользователи могут управлять своими категориями
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      const error = new Error('premium_required');
      error.code = 'PREMIUM_REQUIRED';
      throw error;
    }

    // Находим системную категорию "Другое"
    let fallback = await this.categoryRepository.getCategoryByName(0, 'Другое');
    if (!fallback) {
      // На всякий случай получим первую системную
      const systemCategories = await this.categoryRepository.getCategories(0);
      if (!systemCategories.length) {
        const err = new Error('no_fallback_category');
        err.code = 'NO_FALLBACK';
        throw err;
      }
      fallback = systemCategories[0];
    }

    // Переназначаем все расходы пользователя с этой категории на "Другое"
    await this.expenseRepository.reassignExpensesCategory(userId, categoryId, fallback.id);

    // Удаляем категорию
    const deleted = await this.categoryRepository.deleteUserCategory(userId, categoryId);
    return deleted;
  }

  async getCategoryById(categoryId) {
    return this.categoryRepository.getCategoryById(categoryId);
  }

  async updateUserCategory(userId, categoryId, name, icon = '📦') {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      const error = new Error('premium_required');
      error.code = 'PREMIUM_REQUIRED';
      throw error;
    }

    const existing = await this.categoryRepository.getUserCategories(userId);
    const duplicate = existing.find(
      (c) => c.id !== Number(categoryId) && c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) {
      const error = new Error('custom_category_exists');
      error.code = 'ALREADY_EXISTS';
      throw error;
    }

    const updated = await this.categoryRepository.updateUserCategory(userId, categoryId, { name: name.trim(), icon });
    logger.info('User category renamed', { userId, categoryId, name });
    return updated;
  }

  // ===== Category limits (premium) =====
  async setCategoryLimit(userId, categoryId, limitAmount) {
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      const error = new Error('premium_required');
      error.code = 'PREMIUM_REQUIRED';
      throw error;
    }
    const amount = Number(limitAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      const error = new Error('invalid_limit_amount');
      error.code = 'INVALID_AMOUNT';
      throw error;
    }
    const currency = await this.userRepository.getUserCurrency(userId);
    return this.categoryLimitRepository.upsertLimit(userId, categoryId, amount, currency);
  }

  async getCategoryLimit(userId, categoryId) {
    return this.categoryLimitRepository.getLimit(userId, categoryId);
  }

  async getCategoryLimits(userId) {
    return this.categoryLimitRepository.getLimitsForUser(userId);
  }

  async isCategoryLimitExceeded(userId, categoryId) {
    const settings = await this.userRepository.getReminderSettings(userId);
    if (!settings.category_limits_enabled) return { enabled: false, exceeded: false };
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) return { enabled: false, exceeded: false };
    const limit = await this.categoryLimitRepository.getLimit(userId, categoryId);
    if (!limit) return { enabled: true, exceeded: false };
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    const startDay = await this.userRepository.getUserPeriodStartDay(userId);
    // Получаем суммы по валютам и конвертируем в валюту пользователя
    const totals = await this.expenseRepository.getCategoryTotalsByCurrencyForCustomMonth(userId, categoryId, userTimezone, startDay);
    let total = 0;
    for (const row of totals) {
      try {
        const converted = await this.formatter.currencyUtils.convert(Number(row.total), row.currency || 'RUB', userCurrency);
        if (Number.isFinite(converted)) total += converted;
        else if ((row.currency || 'RUB') === userCurrency) total += Number(row.total) || 0;
      } catch (_) {
        if ((row.currency || 'RUB') === userCurrency) total += Number(row.total) || 0;
      }
    }
    return {
      enabled: true,
      exceeded: total >= (await (async()=>{ try { const v = await this.formatter.currencyUtils.convert(Number(limit.limit_amount), limit.limit_currency || userCurrency, userCurrency); return Number.isFinite(v) ? v : Number(limit.limit_amount)||0; } catch(_){ return Number(limit.limit_amount)||0; } })()),
      limitAmount: Number(limit.limit_amount),
      limitCurrency: limit.limit_currency || userCurrency,
      currentAmount: total,
      currency: userCurrency
    };
  }
}

module.exports = CategoryService;

