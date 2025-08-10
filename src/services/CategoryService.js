const logger = require('../utils/logger');

class CategoryService {
  constructor(categoryRepository, premiumService, expenseRepository) {
    this.categoryRepository = categoryRepository;
    this.premiumService = premiumService;
    this.expenseRepository = expenseRepository;
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
}

module.exports = CategoryService;

