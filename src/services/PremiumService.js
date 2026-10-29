const { USER_LIMITS, FAMILY_PREMIUM } = require('../utils/constants');
const logger = require('../utils/logger');

// Семейный тариф участника кэшируется: isPremiumUser зовут по нескольку раз на апдейт. Срок хранится в записи
// и сравнивается при каждом чтении, поэтому окончание наступает вовремя; вступление, выход, покупка и возврат
// сбрасывают кэш (invalidateFamilyPremium)
const FAMILY_CACHE_TTL_MS = 60 * 1000;
const FAMILY_CACHE_MAX = 10000;

class PremiumService {
  constructor(userRepository, userService, familyPremiumRepository = null) {
    this.userRepository = userRepository;
    this.userService = userService;
    this.familyPremiumRepository = familyPremiumRepository;
    this.familyCache = new Map();
  }

  /**
   * Проверяет, является ли пользователь премиум: свой премиум или семейный тариф его семьи
   */
  async isPremiumUser(userId) {
    try {
      if (await this.userService.isPremiumActive(userId)) return true;
      const family = await this.getFamilyPremium(userId);
      return !!family && family.expiresAt > new Date();
    } catch (error) {
      logger.error('Error checking premium status:', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Семейный тариф, который покрывает пользователя (плательщика — тоже), или null.
   * { expiresAt, payerId, payerName, familyId, familyName, active }
   */
  async getFamilyPremium(userId) {
    if (!this.familyPremiumRepository) return null;
    const key = Number(userId);
    const cached = this.familyCache.get(key);
    let plan;
    if (cached && Date.now() - cached.at < FAMILY_CACHE_TTL_MS) {
      plan = cached.plan;
    } else {
      const row = await this.familyPremiumRepository.getCoveringPlan(key, FAMILY_PREMIUM.MAX_MEMBERS);
      plan = row ? {
        expiresAt: new Date(row.expires_at),
        payerId: row.payer_id,
        payerName: row.payer_first_name || row.payer_username || '',
        familyId: row.family_id,
        familyName: row.family_name
      } : null;
      if (this.familyCache.size >= FAMILY_CACHE_MAX) this.familyCache.clear();
      this.familyCache.set(key, { plan, at: Date.now() });
    }
    return plan ? { ...plan, active: plan.expiresAt > new Date() } : null;
  }

  // Членство в семьях или семейный срок изменились: без userId — сбрасываем всех (покупка, возврат, выход
  // сдвигают места остальных участников)
  invalidateFamilyPremium(userId = null) {
    if (userId === null) this.familyCache.clear();
    else this.familyCache.delete(Number(userId));
  }

  /**
   * Источник премиума для экранов: свой срок и семейный тариф, который даёт премиум кто-то другой
   * { isPremium, personalActive, personalExpiresAt, family } — family только если платит не сам пользователь
   */
  async getPremiumInfo(userId) {
    const [user, personalActive, family] = await Promise.all([
      this.userRepository.getUserById(userId),
      this.userService.isPremiumActive(userId),
      this.getFamilyPremium(userId).catch(() => null)
    ]);
    const inherited = family && family.active && family.payerId !== Number(userId) ? family : null;
    return {
      isPremium: personalActive || !!(family && family.active),
      personalActive,
      personalExpiresAt: user ? user.premium_expires_at : null,
      family: inherited
    };
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
    const info = await this.getPremiumInfo(userId);
    const limits = info.isPremium ? USER_LIMITS.premium : USER_LIMITS.regular;
    // Срок — свой, а без своего — семейный
    const expiresAt = info.personalActive ? info.personalExpiresAt : (info.family ? info.family.expiresAt : info.personalExpiresAt);

    return {
      isPremium: info.isPremium,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      allowCustomCategories: limits.ALLOW_CUSTOM_CATEGORIES,
      maxCustomCategories: limits.MAX_CUSTOM_CATEGORIES,
      premiumExpiresAt: expiresAt,
      daysRemaining: expiresAt ?
        Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      personalActive: info.personalActive,
      familyPremium: info.family
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