const logger = require('../utils/logger');
const { newUsersTotal } = require('../utils/metrics');
const { TRIAL_PERIOD } = require('../utils/constants');

class UserService {
  constructor(userRepository, categoryRepository, premiumTransactionRepository) {
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
    this.premiumTransactionRepository = premiumTransactionRepository;
  }

  async registerUser(userId, username, firstName) {
    try {
      const user = await this.userRepository.createUser(userId, username, firstName);
      
      // Проверяем, был ли у пользователя уже премиум когда-либо
      // Если premium_activated_at не NULL, значит премиум уже был активирован
      if (!user.premium_activated_at) {
        // Даем пробный премиум на 14 дней только новым пользователям
        const trialTransactionData = {
          stars: 0,
          usd: 0,
          rub: 0,
          telegram_payment_id: null,
          invoice_payload: JSON.stringify({
            user_id: userId,
            tariff: TRIAL_PERIOD.DAYS,
            stars: 0,
            type: TRIAL_PERIOD.TYPE
          })
        };
        
        await this.activatePremium(userId, TRIAL_PERIOD.DAYS, trialTransactionData);
        
        // Обновляем метрики
        newUsersTotal.inc({ source: 'telegram' });
        
        logger.info('New user registered with trial premium', {
          userId,
          username,
          firstName,
          trialDays: TRIAL_PERIOD.DAYS,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.info('Existing user registered (no trial premium)', {
          userId,
          username,
          firstName,
          timestamp: new Date().toISOString()
        });
      }
      
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

  async getReminderSettings(userId) {
    return this.userRepository.getReminderSettings(userId);
  }

  async setReminderEnabled(userId, enabled) {
    return this.userRepository.setReminderEnabled(userId, enabled);
  }

  async updateLastReminderLocalDate(userId, dateStr) {
    return this.userRepository.updateLastReminderLocalDate(userId, dateStr);
  }

  async setReminderHours(userId, hoursArray) {
    // NULL — означает дефолтные часы; [] — означает, что пользователь отключил все (не рекомендуем, но позволим)
    if (hoursArray === null) {
      return this.userRepository.setReminderHours(userId, null);
    }
    if (!Array.isArray(hoursArray)) throw new Error('Invalid reminder hours');
    const clean = [...new Set(hoursArray.map(h => parseInt(h, 10)))]
      .filter(h => Number.isInteger(h) && h >= 0 && h <= 23)
      .slice(0, 3)
      .sort((a, b) => a - b);
    return this.userRepository.setReminderHours(userId, clean);
  }

  async setReminderSentTodayHours(userId, hoursArray) {
    const clean = Array.isArray(hoursArray) ? [...new Set(hoursArray.map(h => parseInt(h, 10)))].filter(h => Number.isInteger(h)) : null;
    return this.userRepository.setReminderSentTodayHours(userId, clean);
  }

  async setUserPeriodStartDay(userId, day) {
    if (typeof day !== 'number' || day < 1 || day > 31) {
      throw new Error('Invalid period start day');
    }
    return this.userRepository.setUserPeriodStartDay(userId, day);
  }

  async getUserPeriodStartDay(userId) {
    return this.userRepository.getUserPeriodStartDay(userId);
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
      
      // Проверяем, является ли это попыткой активации триального премиума
      let isTrialAttempt = false;
      if (transactionData && transactionData.invoice_payload) {
        try {
          const payload = JSON.parse(transactionData.invoice_payload);
          if (payload.type === 'trial') {
            isTrialAttempt = true;
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
      
      // Если это попытка активации триального премиума и у пользователя уже был премиум, запрещаем
      if (isTrialAttempt && user.premium_activated_at) {
        logger.warn(`Trial premium activation blocked for user ${userId} - user already had premium`, {
          userId,
          premium_activated_at: user.premium_activated_at,
          timestamp: new Date().toISOString()
        });
        throw new Error('Trial premium is not available for users who already had premium');
      }
      
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
        let transactionType = isNewActivation ? 'activation' : 'extension';
        
        // Определяем тип транзакции на основе данных
        if (transactionData.invoice_payload) {
          try {
            const payload = JSON.parse(transactionData.invoice_payload);
            if (payload.type === 'trial') {
              transactionType = 'trial';
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
        
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
    // Если пользователь не найден, считаем, что премиума нет
    if (!user) {
      logger.info('isPremiumActive: user not found, treating as non-premium', { userId });
      return false;
    }
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

  async setPremiumExpiry(userId, expiryDate) {
    // Если даты нет или она в прошлом — выключаем премиум
    if (!expiryDate) {
      await this.userRepository.updateUser(userId, { premium: false, premium_expires_at: null });
      return;
    }
    const expiry = new Date(expiryDate);
    if (!(expiry instanceof Date) || isNaN(expiry.getTime())) {
      // Неверная дата — безопасно выключим премиум
      await this.userRepository.updateUser(userId, { premium: false, premium_expires_at: null });
      return;
    }
    if (expiry <= new Date()) {
      await this.userRepository.updateUser(userId, { premium: false, premium_expires_at: null });
      return;
    }
    await this.userRepository.updateUser(userId, { premium: true, premium_expires_at: expiry });
  }

  /**
   * Пересчитать премиум после серии рефандов: проигрываем все завершенные покупки в порядке времени
   */
  async recomputePremiumAfterRefunds(userId) {
    const txs = await this.premiumTransactionRepository.getCompletedTransactionsForUser(userId);
    const lastRefundTs = await this.premiumTransactionRepository.getLatestRefundedAt(userId);
    const lastRefund = lastRefundTs ? new Date(lastRefundTs) : null;
    let expiry = null;
    for (const tx of txs) {
      const days = parseInt(tx.tariff_duration, 10) || 0;
      if (days <= 0) continue;
      const txCreatedAt = tx.created_at ? new Date(tx.created_at) : new Date();
      // Если до транзакции были возвраты, базой будет максимум из previous_expiry_date и момента последнего возврата,
      // чтобы исключить «хвосты» при ручных манипуляциях
      const prevExpiry = tx.previous_expiry_date ? new Date(tx.previous_expiry_date) : null;
      const minBase = lastRefund && (!prevExpiry || lastRefund > prevExpiry) ? lastRefund : prevExpiry;
      const baseCandidate = (expiry ? expiry : (minBase || txCreatedAt));
      const base = (expiry && expiry > baseCandidate) ? expiry : baseCandidate;
      expiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    }
    await this.setPremiumExpiry(userId, expiry);
    return expiry;
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
    if (!user) {
      return {
        isPremium: false,
        expiresAt: null,
        activatedAt: null,
        daysRemaining: 0
      };
    }
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

  // Административные методы
  async isUserAdmin(userId) {
    return this.userRepository.isUserAdmin(userId);
  }

  async setUserAdmin(userId, isAdmin) {
    return this.userRepository.setUserAdmin(userId, isAdmin);
  }

  async getAllAdmins() {
    return this.userRepository.getAllAdmins();
  }

  async getUserById(userId) {
    return this.userRepository.getUserById(userId);
  }

  async getUserByUsername(username) {
    return this.userRepository.getUserByUsername(username);
  }

  async getAllUsers(limit = 50, offset = 0) {
    return this.userRepository.getAllUsers(limit, offset);
  }

  async getUsersCount() {
    return this.userRepository.getUsersCount();
  }

  async deactivatePremium(userId) {
    await this.userRepository.deactivatePremium(userId);
    
    logger.info('Premium deactivated', {
      userId,
      timestamp: new Date().toISOString()
    });
  }

  async getAllUsersForBroadcast() {
    return this.userRepository.getAllUsersForBroadcast();
  }
}

module.exports = UserService; 