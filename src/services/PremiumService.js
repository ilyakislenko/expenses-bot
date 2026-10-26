const { USER_LIMITS } = require('../utils/constants');
const logger = require('../utils/logger');

class PremiumService {
  constructor(userRepository, userService) {
    this.userRepository = userRepository;
    this.userService = userService;
  }

  /**
   * Проверяет, является ли пользователь премиум
   */
  async isPremiumUser(userId) {
    try {
      return await this.userService.isPremiumActive(userId);
    } catch (error) {
      logger.error('Error checking premium status:', { userId, error: error.message });
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
   * Получает информацию о лимитах пользователя
   */
  async getLimitsInfo(userId) {
    const isPremium = await this.isPremiumUser(userId);
    const limits = await this.getUserLimits(userId);
    const user = await this.userRepository.getUserById(userId);

    return {
      isPremium,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      allowCustomCategories: limits.ALLOW_CUSTOM_CATEGORIES,
      maxCustomCategories: limits.MAX_CUSTOM_CATEGORIES,
      premiumExpiresAt: user.premium_expires_at,
      daysRemaining: user.premium_expires_at ?
        Math.ceil((user.premium_expires_at - new Date()) / (1000 * 60 * 60 * 24)) : 0
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
}

module.exports = PremiumService; 