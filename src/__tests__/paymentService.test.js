const PaymentService = require('../services/PaymentService');

// Mock bot
const mockBot = {
  telegram: {
    sendInvoice: jest.fn()
  },
  options: {
    username: 'test_bot'
  },
  token: 'test_token'
};

// Mock fetch globally
global.fetch = jest.fn();

describe('PaymentService', () => {
  let paymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    paymentService.setBot(mockBot);
  });

  describe('createStarsInvoice', () => {
    it('should create invoice with correct parameters', async () => {
      const userId = 123456;
      const tariff = {
        duration: 30,
        stars: 149,
        usd: 2.99,
        rub: 259
      };
      const userLanguage = 'ru';

      mockBot.telegram.sendInvoice.mockResolvedValue({
        invoice_id: 'test_invoice_id'
      });

      const result = await paymentService.createStarsInvoice(userId, tariff, userLanguage);

      expect(mockBot.telegram.sendInvoice).toHaveBeenCalledWith(userId, {
        title: 'Премиум подписка',
        description: 'Премиум подписка на 1 месяц - 149 ⭐️',
        payload: JSON.stringify({
          type: 'premium_subscription',
          tariff: 30,
          stars: 149,
          user_id: userId
        }),
        provider_token: '',
        currency: 'XTR',
        prices: [{
          label: 'Премиум подписка',
          amount: 149
        }],
        start_parameter: 'premium_30_149',
        need_name: false,
        need_phone_number: false,
        need_email: false,
        need_shipping_address: false,
        is_flexible: false
      });

      expect(result).toEqual({
        invoice_id: 'test_invoice_id'
      });
    });

    it('should create invoice in English', async () => {
      const userId = 123456;
      const tariff = {
        duration: 90,
        stars: 349,
        usd: 6.99,
        rub: 589
      };
      const userLanguage = 'en';

      mockBot.telegram.sendInvoice.mockResolvedValue({
        invoice_id: 'test_invoice_id_en'
      });

      await paymentService.createStarsInvoice(userId, tariff, userLanguage);

      expect(mockBot.telegram.sendInvoice).toHaveBeenCalledWith(userId,
        expect.objectContaining({
          title: 'Premium Subscription',
          description: 'Premium subscription for 3 месяца - 349 Stars',
          prices: [{
            label: 'Premium Subscription',
            amount: 349
          }]
        })
      );
    });
  });

  describe('handleSuccessfulPayment', () => {
    it('should handle successful payment correctly', async () => {
      const payment = {
        invoice_payload: JSON.stringify({
          type: 'premium_subscription',
          tariff: 30,
          stars: 149,
          user_id: 123456
        }),
        total_amount: 14900
      };

      // PaymentService uses logger, so we just test that it doesn't throw
      const mockUserService = {
        activatePremium: jest.fn().mockResolvedValue({
          isNewActivation: true,
          newExpiryDate: new Date('2024-12-31T23:59:59Z'),
          daysAdded: 30
        })
      };
      
      const result = await paymentService.handleSuccessfulPayment(payment, mockUserService);
      
      expect(mockUserService.activatePremium).toHaveBeenCalledWith(123456, 30);
      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
    });
  });

  describe('createStarsPaymentLink', () => {
    it('should create correct payment link', () => {
      const tariff = {
        duration: 30,
        stars: 149
      };
      const userLanguage = 'ru';

      const link = paymentService.createStarsPaymentLink(tariff, userLanguage);

      expect(link).toBe('https://t.me/test_bot?start=stars_payment_30_149');
    });
  });

  describe('createInvoiceLink', () => {
    it('should create invoice link with correct parameters', async () => {
      const userId = 123456;
      const tariff = { duration: 30, stars: 149 };
      const userLanguage = 'ru';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/bot?invoice=test_invoice_link'
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await paymentService.createInvoiceLink(userId, tariff, userLanguage);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.telegram.org/bottest_token/createInvoiceLink')
      );
      expect(result).toBe('https://t.me/bot?invoice=test_invoice_link');
    });

    it('should create invoice link in English', async () => {
      const userId = 123456;
      const tariff = { duration: 90, stars: 349 };
      const userLanguage = 'en';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: true,
          result: 'https://t.me/bot?invoice=test_invoice_link_en'
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await paymentService.createInvoiceLink(userId, tariff, userLanguage);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('title=Premium+Subscription')
      );
      expect(result).toBe('https://t.me/bot?invoice=test_invoice_link_en');
    });

    it('should handle API errors', async () => {
      const userId = 123456;
      const tariff = { duration: 30, stars: 149 };
      const userLanguage = 'ru';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          ok: false,
          description: 'PAYMENT_PROVIDER_INVALID'
        })
      };
      global.fetch.mockResolvedValue(mockResponse);

      await expect(paymentService.createInvoiceLink(userId, tariff, userLanguage))
        .rejects.toThrow('Telegram API error: PAYMENT_PROVIDER_INVALID');
    });
  });
}); 