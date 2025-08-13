const logger = require('../utils/logger');

class PaymentService {
  constructor(donationRepository, localizationService) {
    this.bot = null;
    this.donationRepository = donationRepository;
    this.localizationService = localizationService;
  }

  setBot(bot) {
    this.bot = bot;
  }

  /**
   * Создает инвойс для Telegram Stars
   * @param {number} userId - ID пользователя
   * @param {Object} tariff - Тариф из констант
   * @param {string} userLanguage - Язык пользователя
   * @returns {Promise<Object>} Результат создания инвойса
   */
  async createStarsInvoice(userId, tariff, userLanguage) {
    try {
      const { duration, stars, usd, rub } = tariff;
      
      // Определяем локализованное название тарифа
      const durationKey = duration === 30 ? 'tariff_button_30' :
                        duration === 90 ? 'tariff_button_90' :
                        duration === 180 ? 'tariff_button_180' : 'tariff_button_365';
      const tariffName = this.localizationService
        ? this.localizationService.getText(userLanguage, durationKey)
        : `${duration}d`;
      
      const productName = this.localizationService
        ? this.localizationService.getText(userLanguage, 'premium_product')
        : (userLanguage === 'en' ? 'Premium subscription' : 'Премиум подписка');

      // Создаем описание для инвойса
      const description = `${productName} — ${tariffName} • ${stars} ⭐️`;
      
      // Создаем инвойс используя правильный API Telegraf
      const invoice = await this.bot.telegram.sendInvoice(userId, {
        title: productName,
        description: description,
        payload: JSON.stringify({
          type: 'premium_subscription',
          tariff: duration,
          stars: stars,
          user_id: userId
        }),
        provider_token: '', // Тестовый токен, нужно заменить на реальный
        currency: 'XTR', // Telegram Stars
        prices: [{
          label: productName,
          amount: stars  // Сумма в копейках (1 звезда = 100 копеек)
        }],
        start_parameter: `premium_${duration}_${stars}`,
        need_name: false,
        need_phone_number: false,
        need_email: false,
        need_shipping_address: false,
        is_flexible: false
      });
      
      logger.info(`Created Stars invoice for user ${userId}, tariff: ${duration} days, stars: ${stars}`);
      return invoice;
      
    } catch (error) {
      logger.error('Error creating Stars invoice:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает успешную оплату
   * @param {Object} payment - Данные платежа
   * @param {UserService} userService - Сервис для работы с пользователями
   * @returns {Promise<void>}
   */
  async handleSuccessfulPayment(payment, userService) {
    try {
      const { invoice_payload, total_amount, telegram_payment_charge_id } = payment;
      const payload = JSON.parse(invoice_payload);
      
      logger.info(`Successful payment received: ${JSON.stringify(payload)}`);
      
      const { user_id, tariff, stars, type, donation_id } = payload;
      
      if (type === 'donation') {
        if (!this.donationRepository || !donation_id) {
          logger.warn('Donation payment received without repository or donation_id');
          return { type: 'donation', status: 'ignored' };
        }
        await this.donationRepository.markDonationCompleted(donation_id, telegram_payment_charge_id || null);
        logger.info(`Donation completed for user ${user_id}, stars: ${stars}`);
        return { type: 'donation', status: 'completed' };
      } else if (type === 'premium_subscription') {
        // Премиум подписка
        const tariffData = this.getTariffData(tariff);
        const transactionData = {
          stars: stars,
          usd: tariffData.usd,
          rub: tariffData.rub,
          telegram_payment_id: telegram_payment_charge_id || null,
          invoice_payload: invoice_payload
        };
        const result = await userService.activatePremium(user_id, tariff, transactionData);
        logger.info(`Premium subscription ${result.isNewActivation ? 'activated' : 'extended'} for user ${user_id}, expires at ${result.newExpiryDate}`);
        return { type: 'premium_subscription', ...result };
      } else {
        // Неизвестный тип платежа
        logger.warn(`Unknown payment type: ${type}, payload: ${JSON.stringify(payload)}`);
        return { type: 'unknown', status: 'ignored' };
      }
      
    } catch (error) {
      logger.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Получает данные тарифа по количеству дней
   */
  getTariffData(days) {
    const { PREMIUM_TARIFFS } = require('../utils/constants');
    
    for (const [key, tariff] of Object.entries(PREMIUM_TARIFFS)) {
      if (tariff.duration === days) {
        return tariff;
      }
    }
    
    // Возвращаем дефолтные значения, если тариф не найден
    return { usd: 0, rub: 0 };
  }

  /**
   * Создает прямую ссылку на оплату через createInvoiceLink
   * @param {number} userId - ID пользователя
   * @param {Object} tariff - Тариф из констант
   * @param {string} userLanguage - Язык пользователя
   * @returns {Promise<string>} Прямая ссылка на оплату
   */
  async createInvoiceLink(userId, tariff, userLanguage) {
    const { duration, stars } = tariff;
    
    const durationKey = duration === 30 ? 'tariff_button_30' :
                      duration === 90 ? 'tariff_button_90' :
                      duration === 180 ? 'tariff_button_180' : 'tariff_button_365';
    const tariffName = this.localizationService
      ? this.localizationService.getText(userLanguage, durationKey)
      : `${duration}d`;
    
    const productName = this.localizationService
      ? this.localizationService.getText(userLanguage, 'premium_product')
      : (userLanguage === 'en' ? 'Premium subscription' : 'Премиум подписка');

    const title = productName;
    const description = `${productName} — ${tariffName}`;
    
    const payload = JSON.stringify({
      type: 'premium_subscription',
      tariff: duration,
      stars: stars,
      user_id: userId
    });
    
    const prices = JSON.stringify([{
      label: productName,
      amount: stars
    }]);
    
    const params = new URLSearchParams({
      title: title,
      description: description,
      payload: payload,
      provider_token: '', // Тестовый токен, нужно заменить на реальный
      currency: 'XTR',
      prices: prices
    }).toString();
    
    const url = `https://api.telegram.org/bot${this.bot.token}/createInvoiceLink?${params}`;
    
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      
      logger.info(`Created invoice link for user ${userId}, tariff: ${duration} days, stars: ${stars}`);
      return result.result;
      
    } catch (error) {
      logger.error('Error creating invoice link:', error);
      throw error;
    }
  }

  /**
   * Создает прямую ссылку для доната через createInvoiceLink
   */
  async createDonationInvoiceLink(userId, stars, userLanguage, donationId) {
    const title = userLanguage === 'en' ? 'Donation' : 'Пожертвование';
    const description = userLanguage === 'en' ? 'Support the project' : 'Поддержать проект';
    const payload = JSON.stringify({
      type: 'donation',
      stars,
      user_id: userId,
      donation_id: donationId
    });

    const prices = JSON.stringify([{ label: title, amount: stars }]);

    const params = new URLSearchParams({
      title,
      description,
      payload,
      provider_token: '',
      currency: 'XTR',
      prices
    }).toString();

    const url = `https://api.telegram.org/bot${this.bot.token}/createInvoiceLink?${params}`;

    try {
      const response = await fetch(url);
      const result = await response.json();
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      return result.result;
    } catch (error) {
      logger.error('Error creating donation invoice link:', error);
      throw error;
    }
  }

  /**
   * Создает платежную ссылку для Telegram Stars
   * @param {Object} tariff - Тариф из констант
   * @param {string} userLanguage - Язык пользователя
   * @returns {string} Платежная ссылка
   */
  createStarsPaymentLink(tariff, userLanguage) {
    const { duration, stars } = tariff;
    
    // Создаем специальную ссылку для Telegram Stars
    // Формат: https://t.me/your_bot?start=stars_payment_<duration>_<stars>
    return `https://t.me/${this.bot.options.username}?start=stars_payment_${duration}_${stars}`;
  }
}

module.exports = PaymentService; 