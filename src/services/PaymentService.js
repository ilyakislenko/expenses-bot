const logger = require('../utils/logger');

// Месячный тариф продаётся как подписка Telegram Stars с автопродлением (Telegram допускает только 30 дней)
const STARS_SUBSCRIPTION_PERIOD_SECONDS = 2592000;
const SUBSCRIPTION_TARIFF_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

class PaymentService {
  constructor(donationRepository, localizationService, funnelService, premiumTransactionRepository, userRepository) {
    this.bot = null;
    this.donationRepository = donationRepository;
    this.localizationService = localizationService;
    this.funnelService = funnelService;
    this.premiumTransactionRepository = premiumTransactionRepository;
    this.userRepository = userRepository;
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
      const { invoice_payload, total_amount, telegram_payment_charge_id, is_recurring, is_first_recurring, subscription_expiration_date } = payment;
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
        // Telegram может прислать то же обновление повторно — один платёж засчитываем один раз
        if (telegram_payment_charge_id && await userService.transactionExists(telegram_payment_charge_id)) {
          logger.warn('Duplicate successful_payment ignored', { user_id, telegram_payment_charge_id });
          return { type: 'premium_subscription', status: 'duplicate' };
        }
        // Премиум подписка (для автопродления каждый месяц приходит новый платёж с тем же payload)
        const tariffData = this.getTariffData(tariff);
        const transactionData = {
          stars: stars,
          usd: tariffData.usd,
          rub: tariffData.rub,
          telegram_payment_id: telegram_payment_charge_id || null,
          invoice_payload: invoice_payload,
          is_recurring: is_recurring === true,
          subscription_expires_at: subscription_expiration_date ? new Date(subscription_expiration_date * 1000) : null
        };
        const result = await userService.activatePremium(user_id, tariff, transactionData);
        if (this.funnelService) await this.funnelService.track(user_id, 'paid');
        const isRenewal = is_recurring === true && is_first_recurring !== true;
        logger.info(`Premium subscription ${isRenewal ? 'renewed' : (result.isNewActivation ? 'activated' : 'extended')} for user ${user_id}, expires at ${result.newExpiryDate}`);
        return { type: 'premium_subscription', isRenewal, ...result };
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
   * Проверка перед оплатой (pre_checkout_query). Ссылки на оплату не истекают, поэтому старый счёт
   * после смены цен отклоняем: сумма должна совпадать с текущим тарифом.
   * @returns {{ ok: boolean, reason?: string }}
   */
  validatePreCheckout({ currency, total_amount: totalAmount, invoice_payload: invoicePayload }) {
    let payload;
    try {
      payload = JSON.parse(invoicePayload);
    } catch (error) {
      return { ok: false, reason: 'bad_payload' };
    }
    if (currency !== 'XTR') return { ok: false, reason: 'currency' };
    if (payload.type === 'donation') {
      return payload.donation_id && totalAmount > 0 ? { ok: true } : { ok: false, reason: 'donation' };
    }
    if (payload.type === 'premium_subscription') {
      const tariff = this.getTariffData(payload.tariff);
      if (!tariff.stars) return { ok: false, reason: 'unknown_tariff' };
      return tariff.stars === totalAmount ? { ok: true } : { ok: false, reason: 'price_changed' };
    }
    return { ok: false, reason: 'unknown_type' };
  }

  /**
   * Возврат платежа (из админки или refunded_payment от Telegram): снимает премиум, выданный этим платежом,
   * и отменяет подписку, если платёж был по ней. Повторный вызов для того же платежа ничего не меняет.
   * @param {string} chargeId - telegram_payment_charge_id
   */
  async revokeRefundedPayment(chargeId) {
    const transaction = await this.premiumTransactionRepository.getTransactionByTelegramPaymentId(chargeId);
    if (!transaction) {
      logger.warn('Refund for an unknown payment', { chargeId });
      return { status: 'unknown' };
    }
    if (transaction.status === 'refunded') return { status: 'already_refunded' };
    await this.premiumTransactionRepository.updateTransactionStatus(transaction.id, 'refunded', null);

    // Вычитаем срок этой покупки из текущей даты окончания премиума
    const userId = Number(transaction.user_id);
    const user = await this.userRepository.getUserById(userId);
    const now = new Date();
    const currentExpiry = user && user.premium_expires_at ? new Date(user.premium_expires_at) : null;
    const days = parseInt(transaction.tariff_duration, 10) || 0;
    const newExpiry = currentExpiry && currentExpiry > now ? new Date(currentExpiry.getTime() - days * DAY_MS) : now;
    const stillPremium = newExpiry > now;
    await this.userRepository.updateUser(userId, { premium: stillPremium, premium_expires_at: stillPremium ? newExpiry : now });

    // Иначе Telegram продолжит списывать подписку и премиум включится снова
    if (transaction.is_recurring) await this.cancelStarsSubscription(userId, chargeId);

    logger.info('Payment refunded, premium revoked', { userId, chargeId, premiumUntil: stillPremium ? newExpiry : null });
    return { status: 'refunded', userId, premiumUntil: stillPremium ? newExpiry : null };
  }

  async cancelStarsSubscription(userId, chargeId) {
    try {
      await this.bot.telegram.callApi('editUserStarSubscription', {
        user_id: userId,
        telegram_payment_charge_id: chargeId,
        is_canceled: true
      });
    } catch (error) {
      // Подписка могла быть уже отменена пользователем
      logger.warn('Stars subscription not canceled', { userId, chargeId, error: error.message });
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
    
    const invoiceParams = {
      title: title,
      description: description,
      payload: payload,
      provider_token: '', // Для Telegram Stars токен провайдера не нужен
      currency: 'XTR',
      prices: prices
    };
    if (duration === SUBSCRIPTION_TARIFF_DAYS) {
      invoiceParams.subscription_period = String(STARS_SUBSCRIPTION_PERIOD_SECONDS);
    }
    const params = new URLSearchParams(invoiceParams).toString();
    
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

  /**
   * Возврат платежа Telegram Stars
   * @param {number} userId
   * @param {string} telegramPaymentId - telegram_payment_charge_id
   */
  async refundStarsPayment(userId, telegramPaymentId) {
    if (!this.bot) {
      throw new Error('Bot instance is not set');
    }
    try {
      const res = await this.bot.telegram.callApi('refundStarPayment', {
        user_id: userId,
        telegram_payment_charge_id: telegramPaymentId
      });
      return res;
    } catch (error) {
      logger.error('Error refunding Stars payment', { userId, telegramPaymentId, error: error.message });
      throw error;
    }
  }
}

module.exports = PaymentService; 