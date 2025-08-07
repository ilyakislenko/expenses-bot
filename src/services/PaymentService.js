const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.bot = null;
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
      
      // Определяем название тарифа
      const tariffName = duration === 30 ? '1 месяц' : 
                        duration === 90 ? '3 месяца' : 
                        duration === 180 ? '6 месяцев' : '1 год';
      
      // Создаем описание для инвойса
      const description = userLanguage === 'en' 
        ? `Premium subscription for ${tariffName} - ${stars} Stars`
        : `Премиум подписка на ${tariffName} - ${stars} ⭐️`;
      
      // Создаем инвойс используя правильный API Telegraf
      const invoice = await this.bot.telegram.sendInvoice(userId, {
        title: userLanguage === 'en' ? 'Premium Subscription' : 'Премиум подписка',
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
          label: userLanguage === 'en' ? 'Premium Subscription' : 'Премиум подписка',
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
      const { invoice_payload, total_amount } = payment;
      const payload = JSON.parse(invoice_payload);
      
      logger.info(`Successful payment received: ${JSON.stringify(payload)}`);
      
      const { user_id, tariff, stars } = payload;
      
      // Активируем премиум подписку с правильной логикой продления
      const result = await userService.activatePremium(user_id, tariff);
      
      logger.info(`Premium subscription ${result.isNewActivation ? 'activated' : 'extended'} for user ${user_id}, expires at ${result.newExpiryDate}`);
      
      return result;
      
    } catch (error) {
      logger.error('Error handling successful payment:', error);
      throw error;
    }
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
    
    const tariffName = duration === 30 ? '1 месяц' :
                      duration === 90 ? '3 месяца' :
                      duration === 180 ? '6 месяцев' : '1 год';
    
    const title = userLanguage === 'en' ? 'Premium Subscription' : 'Премиум подписка';
    const description = userLanguage === 'en' ? 
      `Premium subscription for ${tariffName}` : 
      `Премиум подписка на ${tariffName}`;
    
    const payload = JSON.stringify({
      type: 'premium_subscription',
      tariff: duration,
      stars: stars,
      user_id: userId
    });
    
    const prices = JSON.stringify([{
      label: userLanguage === 'en' ? 'Premium Subscription' : 'Премиум подписка',
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