const { USER_LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

class PremiumService {
  constructor(userRepository, expenseRepository) {
    this.userRepository = userRepository;
    this.expenseRepository = expenseRepository;
  }

  /**
   * Проверяет, является ли пользователь премиум
   */
  async isPremiumUser(userId) {
    try {
      const user = await this.userRepository.getUserById(userId);
      return user ? user.premium : false;
    } catch (error) {
      logger.error('Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Получает лимиты для пользователя
   */
  async getUserLimits(userId) {
    const isPremium = await this.isPremiumUser(userId);
    return isPremium ? USER_LIMITS.premium : USER_LIMITS.regular;
  }

  /**
   * Проверяет длину описания
   */
  async validateDescriptionLength(userId, description) {
    const limits = await this.getUserLimits(userId);
    const maxLength = limits.MAX_DESCRIPTION_LENGTH;
    
    if (description && description.length > maxLength) {
      return {
        isValid: false,
        error: 'too_long',
        maxLength,
        currentLength: description.length
      };
    }
    
    return { isValid: true };
  }

  /**
   * Проверяет лимит количества записей
   */
  async validateExpenseCount(userId) {
    try {
      const limits = await this.getUserLimits(userId);
      const currentCount = await this.expenseRepository.getExpenseCount(userId);
      
      if (currentCount >= limits.MAX_NOTES_COUNT) {
        return {
          isValid: false,
          error: 'limit_reached',
          currentCount,
          maxCount: limits.MAX_NOTES_COUNT
        };
      }
      
      return { 
        isValid: true, 
        currentCount, 
        maxCount: limits.MAX_NOTES_COUNT,
        remaining: limits.MAX_NOTES_COUNT - currentCount
      };
    } catch (error) {
      logger.error('Error validating expense count:', error);
      return { isValid: false, error: 'database_error' };
    }
  }

  /**
   * Получает информацию о лимитах пользователя
   */
  async getLimitsInfo(userId) {
    const isPremium = await this.isPremiumUser(userId);
    const limits = await this.getUserLimits(userId);
    const currentCount = await this.expenseRepository.getExpenseCount(userId);
    
    return {
      isPremium,
      currentCount,
      maxCount: limits.MAX_NOTES_COUNT,
      remaining: limits.MAX_NOTES_COUNT - currentCount,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      allowCustomCategories: limits.ALLOW_CUSTOM_CATEGORIES,
      maxCustomCategories: limits.MAX_CUSTOM_CATEGORIES,
      noteRetentionDays: limits.NOTE_RETENTION_DAYS,
      percentage: Math.round((currentCount / limits.MAX_NOTES_COUNT) * 100)
    };
  }

  /**
   * Устанавливает премиум статус пользователя
   */
  async setPremiumStatus(userId, isPremium) {
    try {
      await this.userRepository.updateUser(userId, { premium: isPremium });
      logger.info(`Premium status updated for user ${userId}: ${isPremium}`);
      return true;
    } catch (error) {
      logger.error('Error setting premium status:', error);
      return false;
    }
  }

  /**
   * Получает статистику использования лимитов
   */
  async getUsageStats(userId) {
    const limits = await this.getLimitsInfo(userId);
    const usagePercentage = Math.round((limits.currentCount / limits.maxCount) * 100);
    
    return {
      ...limits,
      usagePercentage,
      isNearLimit: usagePercentage >= 80,
      isAtLimit: usagePercentage >= 100
    };
  }
}

module.exports = PremiumService; 