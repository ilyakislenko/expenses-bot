const PaymentService = require('../services/PaymentService');
const LocalizationService = require('../services/LocalizationService');
const { PREMIUM_TARIFFS } = require('../utils/constants');

const CYRILLIC = /[а-яё]/i;

const mockBot = {
  telegram: {
    sendInvoice: jest.fn(),
    callApi: jest.fn()
  },
  options: {
    username: 'test_bot'
  },
  token: 'test_token'
};

global.fetch = jest.fn();

function mockInvoiceLink(link) {
  mockBot.telegram.callApi.mockResolvedValue(link);
}

// Параметры последнего вызова createInvoiceLink через Telegraf
function lastInvoiceLinkParams() {
  const calls = mockBot.telegram.callApi.mock.calls.filter(([method]) => method === 'createInvoiceLink');
  return calls[calls.length - 1][1];
}

describe('PaymentService', () => {
  let paymentService;
  let localizationService;
  let donationRepository;
  let funnelService;

  beforeEach(() => {
    jest.clearAllMocks();
    localizationService = new LocalizationService();
    donationRepository = { markDonationCompleted: jest.fn().mockResolvedValue({ id: 7, status: 'completed' }) };
    funnelService = { track: jest.fn().mockResolvedValue(undefined) };
    paymentService = new PaymentService(donationRepository, localizationService, funnelService);
    paymentService.setBot(mockBot);
  });

  describe('createStarsInvoice', () => {
    it('charges the tariff price in Stars and encodes what to activate in the payload', async () => {
      const tariff = PREMIUM_TARIFFS.MONTH_1;
      mockBot.telegram.sendInvoice.mockResolvedValue({ invoice_id: 'test_invoice_id' });

      const result = await paymentService.createStarsInvoice(123456, tariff, 'ru');

      expect(result).toEqual({ invoice_id: 'test_invoice_id' });
      const [chatId, invoice] = mockBot.telegram.sendInvoice.mock.calls[0];
      expect(chatId).toBe(123456);
      expect(invoice.currency).toBe('XTR');
      expect(invoice.prices).toEqual([expect.objectContaining({ amount: tariff.stars })]);
      expect(JSON.parse(invoice.payload)).toEqual({
        type: 'premium_subscription',
        tariff: tariff.duration,
        stars: tariff.stars,
        user_id: 123456
      });
      expect(invoice.title).toBe(localizationService.getText('ru', 'premium_product'));
      expect(invoice.description).toContain(localizationService.getText('ru', 'tariff_button_30'));
    });

    it('shows an English-speaking user a fully English invoice', async () => {
      const tariff = PREMIUM_TARIFFS.MONTH_3;
      mockBot.telegram.sendInvoice.mockResolvedValue({ invoice_id: 'test_invoice_id_en' });

      await paymentService.createStarsInvoice(123456, tariff, 'en');

      const [, invoice] = mockBot.telegram.sendInvoice.mock.calls[0];
      expect(invoice.title).toBe(localizationService.getText('en', 'premium_product'));
      expect(invoice.description).toContain(localizationService.getText('en', 'tariff_button_90'));
      expect(invoice.description).toContain(String(tariff.stars));
      expect(invoice.title).not.toMatch(CYRILLIC);
      expect(invoice.description).not.toMatch(CYRILLIC);
      expect(invoice.prices[0].label).not.toMatch(CYRILLIC);
      expect(invoice.prices[0].amount).toBe(tariff.stars);
    });

    it('propagates Telegram errors', async () => {
      mockBot.telegram.sendInvoice.mockRejectedValue(new Error('Bad Request'));

      await expect(paymentService.createStarsInvoice(123456, PREMIUM_TARIFFS.MONTH_1, 'ru'))
        .rejects.toThrow('Bad Request');
    });
  });

  describe('createInvoiceLink', () => {
    it('returns the link and sells the monthly tariff as an auto-renewing 30-day subscription', async () => {
      const tariff = PREMIUM_TARIFFS.MONTH_1;
      mockInvoiceLink('https://t.me/bot?invoice=test_invoice_link');

      const result = await paymentService.createInvoiceLink(123456, tariff, 'ru');

      expect(result).toBe('https://t.me/bot?invoice=test_invoice_link');
      // Через Telegraf, с сигналом таймаута; прямого fetch с токеном в URL нет
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockBot.telegram.callApi.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
      const params = lastInvoiceLinkParams();
      expect(params.currency).toBe('XTR');
      expect(params.prices).toEqual([expect.objectContaining({ amount: tariff.stars })]);
      expect(JSON.parse(params.payload)).toEqual({
        type: 'premium_subscription',
        tariff: 30,
        stars: tariff.stars,
        user_id: 123456
      });
      expect(params.subscription_period).toBe(2592000);
    });

    it('sells longer tariffs as one-time payments (no subscription period)', async () => {
      mockInvoiceLink('https://t.me/bot?invoice=link_90');

      await paymentService.createInvoiceLink(123456, PREMIUM_TARIFFS.MONTH_3, 'ru');

      const params = lastInvoiceLinkParams();
      expect(params).not.toHaveProperty('subscription_period');
      expect(JSON.parse(params.payload).tariff).toBe(90);
    });

    it('creates a fully English invoice link for an English-speaking user', async () => {
      const tariff = PREMIUM_TARIFFS.MONTH_3;
      mockInvoiceLink('https://t.me/bot?invoice=test_invoice_link_en');

      const result = await paymentService.createInvoiceLink(123456, tariff, 'en');

      expect(result).toBe('https://t.me/bot?invoice=test_invoice_link_en');
      const params = lastInvoiceLinkParams();
      expect(params.title).toBe(localizationService.getText('en', 'premium_product'));
      expect(params.description).toContain(localizationService.getText('en', 'tariff_button_90'));
      expect(params.title).not.toMatch(CYRILLIC);
      expect(params.description).not.toMatch(CYRILLIC);
      expect(params.prices[0].label).not.toMatch(CYRILLIC);
    });

    it('throws when Telegram rejects the request', async () => {
      mockBot.telegram.callApi.mockRejectedValue(new Error('400: Bad Request: PAYMENT_PROVIDER_INVALID'));

      await expect(paymentService.createInvoiceLink(123456, PREMIUM_TARIFFS.MONTH_1, 'ru'))
        .rejects.toThrow('PAYMENT_PROVIDER_INVALID');
    });

    it('aborts a hanging request instead of waiting minutes', async () => {
      jest.useFakeTimers();
      try {
        mockBot.telegram.callApi.mockImplementation((method, payload, { signal }) => new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }));
        const pending = paymentService.createDonationInvoiceLink(123456, 50, 'ru', 7);
        const assertion = expect(pending).rejects.toThrow('aborted');
        jest.advanceTimersByTime(10000);
        await assertion;
      } finally {
        jest.useRealTimers();
        mockBot.telegram.callApi.mockReset();
      }
    });
  });

  describe('handleSuccessfulPayment', () => {
    let userService;

    beforeEach(() => {
      userService = {
        transactionExists: jest.fn().mockResolvedValue(false),
        activatePremium: jest.fn().mockResolvedValue({
          isNewActivation: true,
          newExpiryDate: new Date('2024-12-31T23:59:59Z'),
          daysAdded: 30
        })
      };
    });

    function premiumPayment(overrides = {}) {
      return {
        invoice_payload: JSON.stringify({
          type: 'premium_subscription',
          tariff: 30,
          stars: PREMIUM_TARIFFS.MONTH_1.stars,
          user_id: 123456
        }),
        total_amount: PREMIUM_TARIFFS.MONTH_1.stars,
        telegram_payment_charge_id: 'charge_1',
        ...overrides
      };
    }

    it('activates premium for the paid tariff and records the payment', async () => {
      const payment = premiumPayment();

      const result = await paymentService.handleSuccessfulPayment(payment, userService);

      expect(userService.activatePremium).toHaveBeenCalledTimes(1);
      const [userId, days, transactionData] = userService.activatePremium.mock.calls[0];
      expect(userId).toBe(123456);
      expect(days).toBe(30);
      expect(transactionData).toEqual(expect.objectContaining({
        stars: PREMIUM_TARIFFS.MONTH_1.stars,
        usd: PREMIUM_TARIFFS.MONTH_1.usd,
        rub: PREMIUM_TARIFFS.MONTH_1.rub,
        telegram_payment_id: 'charge_1',
        invoice_payload: payment.invoice_payload,
        is_recurring: false,
        subscription_expires_at: null
      }));
      expect(funnelService.track).toHaveBeenCalledWith(123456, 'paid');
      expect(result).toEqual(expect.objectContaining({
        type: 'premium_subscription',
        isRenewal: false,
        isNewActivation: true,
        daysAdded: 30
      }));
    });

    it('ignores a duplicate delivery of the same charge', async () => {
      userService.transactionExists.mockResolvedValue(true);

      const result = await paymentService.handleSuccessfulPayment(premiumPayment(), userService);

      expect(result).toEqual({ type: 'premium_subscription', status: 'duplicate' });
      expect(userService.activatePremium).not.toHaveBeenCalled();
      expect(funnelService.track).not.toHaveBeenCalled();
    });

    it('treats a recurring charge after the first one as a renewal and keeps the subscription end', async () => {
      const expiresTs = 1767225600; // 2026-01-01T00:00:00Z
      const result = await paymentService.handleSuccessfulPayment(premiumPayment({
        is_recurring: true,
        is_first_recurring: false,
        subscription_expiration_date: expiresTs
      }), userService);

      expect(result.isRenewal).toBe(true);
      const [, , transactionData] = userService.activatePremium.mock.calls[0];
      expect(transactionData.is_recurring).toBe(true);
      expect(transactionData.subscription_expires_at).toEqual(new Date(expiresTs * 1000));
    });

    it('does not count the first recurring charge as a renewal', async () => {
      const result = await paymentService.handleSuccessfulPayment(premiumPayment({
        is_recurring: true,
        is_first_recurring: true,
        subscription_expiration_date: 1767225600
      }), userService);

      expect(result.isRenewal).toBe(false);
    });

    it('completes a donation without granting premium', async () => {
      const payment = {
        invoice_payload: JSON.stringify({ type: 'donation', stars: 50, user_id: 123456, donation_id: 7 }),
        telegram_payment_charge_id: 'charge_donation'
      };

      const result = await paymentService.handleSuccessfulPayment(payment, userService);

      expect(result).toEqual({ type: 'donation', status: 'completed' });
      expect(donationRepository.markDonationCompleted).toHaveBeenCalledWith(7, 'charge_donation');
      expect(userService.activatePremium).not.toHaveBeenCalled();
    });

    it('ignores payments of unknown type', async () => {
      const payment = { invoice_payload: JSON.stringify({ type: 'something_else', user_id: 123456 }) };

      const result = await paymentService.handleSuccessfulPayment(payment, userService);

      expect(result).toEqual({ type: 'unknown', status: 'ignored' });
      expect(userService.activatePremium).not.toHaveBeenCalled();
    });
  });

  describe('createStarsPaymentLink', () => {
    it('creates a deep link to the bot with the tariff', () => {
      const link = paymentService.createStarsPaymentLink({ duration: 30, stars: 149 }, 'ru');

      expect(link).toBe('https://t.me/test_bot?start=stars_payment_30_149');
    });
  });
});
