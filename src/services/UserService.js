const logger = require('../utils/logger');
const { newUsersTotal } = require('../utils/metrics');

class UserService {
  constructor(userRepository, categoryRepository, premiumTransactionRepository) {
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
    this.premiumTransactionRepository = premiumTransactionRepository;
  }

  async registerUser(userId, username, firstName) {
    try {
      const user = await this.userRepository.createUser(userId, username, firstName);
      
      // Обновляем метрики
      newUsersTotal.inc({ source: 'telegram' });
      
      logger.info('New user registered', {
        userId,
        username,
        firstName,
        timestamp: new Date().toISOString()
      });
      
      return user;
    } catch (error) {
      logger.error('Failed to register user', {
        userId,
        username,
        firstName,
        error: error.message
      });
      throw error;
    }
    // Категории уже есть в БД как системные (user_id = 0)
  }

  async setUserCurrency(userId, currency) {
    return this.userRepository.setUserCurrency(userId, currency);
  }

  async getUserCurrency(userId) {
    return this.userRepository.getUserCurrency(userId);
  }

  async setUserPremium(userId, isPremium) {
    return this.userRepository.setUserPremium(userId, isPremium);
  }

  async getUserPremium(userId) {
    return this.userRepository.getUserPremium(userId);
  }

  async setUserTimezone(userId, timezone) {
    const result = await this.userRepository.setUserTimezone(userId, timezone);
    return result;
  }

  async getUserTimezone(userId) {
    return this.userRepository.getUserTimezone(userId);
  }

  async setUserLanguage(userId, language) {
    return this.userRepository.setUserLanguage(userId, language);
  }

  async getUserLanguage(userId) {
    return this.userRepository.getUserLanguage(userId);
  }

  // Методы для премиум-категорий
  async createUserCategory(userId, name, icon) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Premium feature not available');
    }
    return this.categoryRepository.createUserCategory(userId, name, icon);
  }

  async getUserCategories(userId) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      return []; // Обычные пользователи видят только системные категории
    }
    return this.categoryRepository.getUserCategories(userId);
  }

  // Метод для получения всех категорий с учетом премиум-статуса
  async getCategories(userId) {
    const isPremium = await this.getUserPremium(userId);
    return this.categoryRepository.getCategoriesWithPremium(userId, isPremium);
  }

  async deleteUserCategory(userId, categoryId) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Premium feature not available');
    }
    return this.categoryRepository.deleteUserCategory(userId, categoryId);
  }

  async getUserById(userId) {
    return this.userRepository.getUserById(userId);
  }

  async updateUserCategory(userId, categoryId, data) {
    const isPremium = await this.getUserPremium(userId);
    if (!isPremium) {
      throw new Error('Premium feature not available');
    }
    return this.categoryRepository.updateUserCategory(userId, categoryId, data);
  }

  async activatePremium(userId, daysToAdd, transactionData = null) {
    try {
      // Получаем текущий статус пользователя
      const user = await this.getUserById(userId);
      const now = new Date();
      
      let newExpiryDate;
      let isNewActivation = false;
      const previousExpiryDate = user.premium_expires_at;
      
      if (user.premium && user.premium_expires_at && user.premium_expires_at > now) {
        // У пользователя уже есть активная подписка - добавляем к существующей
        newExpiryDate = new Date(user.premium_expires_at.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        logger.info(`Extending existing premium subscription for user ${userId} by ${daysToAdd} days`);
      } else {
        // Новая подписка или истекшая - начинаем с текущей даты
        newExpiryDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        isNewActivation = true;
        logger.info(`Activating new premium subscription for user ${userId} for ${daysToAdd} days`);
      }
      
      const query = `
        UPDATE users 
        SET premium = true, 
            premium_expires_at = $1,
            premium_activated_at = CASE 
              WHEN premium_activated_at IS NULL THEN NOW()
              ELSE premium_activated_at 
            END
        WHERE id = $2
      `;
      
      await this.userRepository.query(query, [newExpiryDate, userId]);
      
      // Записываем транзакцию, если предоставлены данные
      if (transactionData) {
        const transactionType = isNewActivation ? 'activation' : 'extension';
        await this.premiumTransactionRepository.createTransaction({
          user_id: userId,
          transaction_type: transactionType,
          tariff_duration: daysToAdd,
          stars_amount: transactionData.stars || 0,
          usd_amount: transactionData.usd || 0,
          rub_amount: transactionData.rub || 0,
          telegram_payment_id: transactionData.telegram_payment_id || null,
          invoice_payload: transactionData.invoice_payload || null,
          previous_expiry_date: previousExpiryDate,
          new_expiry_date: newExpiryDate,
          status: 'completed'
        });
      }
      
      logger.info(`Premium subscription ${isNewActivation ? 'activated' : 'extended'} for user ${userId}, expires at ${newExpiryDate}`);
      
      return {
        isNewActivation,
        newExpiryDate,
        daysAdded: daysToAdd
      };
    } catch (error) {
      logger.error('Failed to activate premium subscription', {
        userId,
        daysToAdd,
        error: error.message
      });
      throw error;
    }
  }

  async isPremiumActive(userId) {
    const user = await this.getUserById(userId);
    if (!user.premium || !user.premium_expires_at) {
      return false;
    }
    
    const now = new Date();
    const isActive = user.premium_expires_at > now;
    
    // Если подписка истекла, но флаг premium все еще true, отключаем его
    if (!isActive && user.premium) {
      await this.disableExpiredPremium(userId);
      logger.info(`Automatically disabled expired premium for user ${userId}`);
    }
    
    return isActive;
  }

  async disableExpiredPremium(userId) {
    const query = `
      UPDATE users 
      SET premium = false
      WHERE id = $1 AND premium = true AND premium_expires_at <= NOW()
    `;
    await this.userRepository.query(query, [userId]);
  }

  async disableAllExpiredPremium() {
    const query = `
      UPDATE users 
      SET premium = false
      WHERE premium = true AND premium_expires_at <= NOW()
    `;
    const result = await this.userRepository.query(query);
    logger.info(`Disabled expired premium for ${result.rowCount} users`);
    return result.rowCount;
  }

  /**
   * Получает транзакции пользователя
   */
  async getUserTransactions(userId, limit = 50, offset = 0) {
    return this.premiumTransactionRepository.getUserTransactions(userId, limit, offset);
  }

  /**
   * Получает статистику транзакций пользователя
   */
  async getUserTransactionStats(userId) {
    return this.premiumTransactionRepository.getTransactionStats(userId);
  }

  /**
   * Получает общую статистику транзакций
   */
  async getGlobalTransactionStats() {
    return this.premiumTransactionRepository.getTransactionStats();
  }

  /**
   * Проверяет, существует ли транзакция с данным Telegram payment ID
   */
  async transactionExists(telegramPaymentId) {
    return this.premiumTransactionRepository.transactionExists(telegramPaymentId);
  }

  async getPremiumStatus(userId) {
    const user = await this.getUserById(userId);
    const now = new Date();
    
    const isPremium = user.premium && user.premium_expires_at && user.premium_expires_at > now;
    
    // Если подписка истекла, но флаг premium все еще true, отключаем его
    if (!isPremium && user.premium && user.premium_expires_at) {
      await this.disableExpiredPremium(userId);
      logger.info(`Automatically disabled expired premium for user ${userId} in getPremiumStatus`);
    }
    
    return {
      isPremium,
      expiresAt: user.premium_expires_at,
      activatedAt: user.premium_activated_at,
      daysRemaining: user.premium_expires_at && user.premium_expires_at > now ? 
        Math.ceil((user.premium_expires_at - now) / (1000 * 60 * 60 * 24)) : 0
    };
  }
}

module.exports = UserService; 