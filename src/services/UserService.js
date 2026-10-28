const logger = require('../utils/logger');
const { newUsersTotal } = require('../utils/metrics');
const { TRIAL_PERIOD } = require('../utils/constants');

class UserService {
  constructor(userRepository, categoryRepository, premiumTransactionRepository) {
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
    this.premiumTransactionRepository = premiumTransactionRepository;
  }

  // Возвращает строку пользователя и:
  // - isNew: true только для вызова, который действительно создал запись;
  // - justCreated: запись создана несколько секунд назад (в т.ч. параллельным вызовом — дубль первого /start).
  // Telegraf обрабатывает пачку обновлений параллельно, поэтому два /start приходят одновременно:
  // признак «новый» берём из INSERT, а право на триал забираем атомарно.
  async registerUser(userId, username, firstName) {
    try {
      const created = await this.userRepository.createUser(userId, username, firstName);
      const isNew = Boolean(created && created.is_new);
      const justCreated = isNew || Boolean(created && created.just_created);
      if (isNew) newUsersTotal.inc({ source: 'telegram' });

      if (await this.claimTrial(userId)) {
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
        try {
          await this.activatePremium(userId, TRIAL_PERIOD.DAYS, trialTransactionData);
        } catch (error) {
          // Триал не выдан — возвращаем право на него
          await this.userRepository.query('UPDATE users SET has_trial = TRUE WHERE id = $1 AND premium_activated_at IS NULL', [userId]);
          throw error;
        }
        logger.info('User registered with trial premium', { userId, isNew, trialDays: TRIAL_PERIOD.DAYS });
      } else {
        logger.info('User registered (no trial premium)', { userId, isNew });
      }

      const user = created || await this.userRepository.getUserById(userId);
      return { ...user, isNew, justCreated };
    } catch (error) {
      logger.error('Failed to register user', {
        userId,
        error: error.message
      });
      throw error;
    }
    // Категории уже есть в БД как системные (user_id = 0)
  }

  // true — право на триал было и теперь забрано этим вызовом (ровно один из параллельных вызовов)
  async claimTrial(userId) {
    const result = await this.userRepository.query(
      'UPDATE users SET has_trial = FALSE WHERE id = $1 AND has_trial = TRUE AND premium_activated_at IS NULL RETURNING id',
      [userId]
    );
    return result.rowCount > 0;
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

  // Невалидный пояс в users.timezone ломает cron и `AT TIME ZONE` у всех пользователей — не пишем его
  async setUserTimezone(userId, timezone) {
    const { isValidTimezone } = require('../utils/timezoneCalculator');
    if (!isValidTimezone(timezone)) throw new RangeError(`Invalid timezone: ${timezone}`);
    return this.userRepository.setUserTimezone(userId, timezone);
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

  async setFamilyMode(userId, enabled) {
    return this.userRepository.setFamilyMode(userId, enabled);
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

  async setDailySummaryEnabled(userId, enabled) {
    return this.userRepository.setDailySummaryEnabled(userId, enabled);
  }

  async setDailySummaryHour(userId, hour) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('Invalid daily summary hour');
    return this.userRepository.setDailySummaryHour(userId, hour);
  }

  async setWeeklyInsightEnabled(userId, enabled) {
    return this.userRepository.setWeeklyInsightEnabled(userId, enabled);
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

  async getOnboarding(userId) {
    return this.userRepository.getOnboarding(userId);
  }

  async saveOnboarding(userId, answers, options) {
    return this.userRepository.saveOnboarding(userId, answers, options);
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
      
      // Даты премиума — TIMESTAMP без часового пояса, их пишет и читает Node в своём поясе:
      // время берём из Node, а не NOW() сессии Postgres (UTC)
      const query = `
        UPDATE users 
        SET premium = true, 
            premium_expires_at = $1,
            premium_activated_at = COALESCE(premium_activated_at, $3)
        WHERE id = $2
      `;
      
      await this.userRepository.query(query, [newExpiryDate, userId, now]);
      
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
          status: 'completed',
          is_recurring: transactionData.is_recurring === true,
          subscription_expires_at: transactionData.subscription_expires_at || null
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
      WHERE id = $1 AND premium = true AND premium_expires_at <= $2
    `;
    await this.userRepository.query(query, [userId, new Date()]);
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

  // Cron: снимает флаг premium у всех, чей срок истёк (флаг читают семейные приглашения и админка)
  async disableAllExpiredPremium() {
    const query = `
      UPDATE users 
      SET premium = false
      WHERE premium = true AND premium_expires_at <= $1
    `;
    const result = await this.userRepository.query(query, [new Date()]);
    if (result.rowCount > 0) logger.info(`Disabled expired premium for ${result.rowCount} users`);
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

  // Подписка Stars с автопродлением, по которой оплачен текущий период: { subscription_expires_at } или null
  async getActiveRecurringSubscription(userId) {
    return this.premiumTransactionRepository.getActiveRecurringSubscription(userId);
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