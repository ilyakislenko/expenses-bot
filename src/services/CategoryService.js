const logger = require('../utils/logger');

class CategoryService {
  constructor(categoryRepository, premiumService) {
    this.categoryRepository = categoryRepository;
    this.premiumService = premiumService;
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

    const deleted = await this.categoryRepository.deleteUserCategory(userId, categoryId);
    return deleted;
  }

  async getCategoryById(categoryId) {
    return this.categoryRepository.getCategoryById(categoryId);
  }
}

module.exports = CategoryService;

