const Container = require('../container');

// Mock repositories
jest.mock('../repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getUserById: jest.fn().mockResolvedValue({ id: 123456, premium: false }),
    getUserLanguage: jest.fn().mockResolvedValue('ru'),
    getUserTimezone: jest.fn().mockResolvedValue('UTC'),
    getUserCurrency: jest.fn().mockResolvedValue('RUB')
  }));
});

jest.mock('../repositories/ExpenseRepository', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../repositories/PremiumTransactionRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getActiveRecurringSubscription: jest.fn().mockResolvedValue(null)
  }));
});

jest.mock('../repositories/FunnelRepository', () => {
  return jest.fn().mockImplementation(() => ({
    track: jest.fn().mockResolvedValue(undefined)
  }));
});

describe('Premium Subscription Menu', () => {
  let commandHandlers;
  let callbackHandlers;
  let localizationService;
  let premiumService;
  let keyboardGenerators;

  beforeEach(() => {
    const container = new Container();
    commandHandlers = container.get('commandHandlers');
    callbackHandlers = container.get('callbackHandlers');
    localizationService = container.get('localizationService');
    premiumService = container.get('premiumService');
    keyboardGenerators = container.get('keyboardGenerators');
  });

  describe('More Menu Integration', () => {
    it('should include premium subscription button in the «Ещё» menu', () => {
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = { 'premium_subscription_title': '⭐️ Подписка' };
        return texts[key] || key;
      });

      const moreMenu = keyboardGenerators.generateMoreMenu('ru');

      const premiumButton = moreMenu.flat().find(button =>
        button.callback_data === 'premium_subscription'
      );

      expect(premiumButton).toBeDefined();
      expect(premiumButton.text).toBe('⭐️ Подписка');
    });

    it('should display premium subscription button in /menu command', async () => {
      const mockCtx = {
        from: { id: 123456 },
        reply: jest.fn()
      };

      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = {
          'more_menu_title': '☰ *Ещё*',
          'premium_subscription_title': '⭐️ Подписка'
        };
        return texts[key] || key;
      });
      jest.spyOn(commandHandlers.userService, 'getUserLanguage').mockResolvedValue('ru');
      jest.spyOn(commandHandlers.userService, 'isUserAdmin').mockResolvedValue(false);

      await commandHandlers.mainMenu(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('☰ *Ещё*'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⭐️ Подписка', callback_data: 'premium_subscription' })
              ])
            ])
          })
        })
      );
    });
  });

  describe('CommandHandlers.premiumSubscription', () => {
    it('should generate premium subscription menu with user status', async () => {
      // Mock context
      const mockCtx = {
        from: { id: 123456 },
        reply: jest.fn()
      };

      // Mock premium service
      const mockLimitsInfo = {
        isPremium: false,
        maxDescriptionLength: 80
      };

      jest.spyOn(premiumService, 'getLimitsInfo').mockResolvedValue(mockLimitsInfo);
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key, params) => {
        const texts = {
          'premium_subscription_title': '⭐️ Подписка',
          'premium_status_header': '<b>Ваш статус:</b>',
          'status_regular': '👤 Стандарт',
          'premium_privileges': `Привилегии: ${params?.status || '👤 Обычный'}`,
          'max_description_length': `<b>Макс. длина описания:</b> ${params?.length || 0} символов`,
          'premium_menu_title': '<b>Меню:</b>',
          'premium_tariff_button': '⭐️ Тариф',
          'premium_why_paid_button': '👀 Почему сервис платный?',
          'premium_back_button': '⬅️ Назад'
        };
        return texts[key] || key;
      });

      await commandHandlers.premiumSubscription(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('⭐️ Подписка'),
        expect.objectContaining({
          parse_mode: 'HTML',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⭐️ Тариф', callback_data: 'premium_tariffs' })
              ]),
              expect.arrayContaining([
                expect.objectContaining({ text: '👀 Почему сервис платный?', callback_data: 'premium_why_paid' })
              ]),
              expect.arrayContaining([
                expect.objectContaining({ text: '⬅️ Назад', callback_data: 'back_to_menu' })
              ])
            ])
          })
        })
      );
    });

    it('should generate premium subscription menu with premium user and expiry date', async () => {
      // Mock context
      const mockCtx = {
        from: { id: 123456 },
        reply: jest.fn()
      };

      // Mock premium service with premium user
      const mockLimitsInfo = {
        isPremium: true,
        maxDescriptionLength: 200,
        premiumExpiresAt: new Date('2025-12-31T23:59:59.000Z'),
        daysRemaining: 145
      };

      jest.spyOn(premiumService, 'getLimitsInfo').mockResolvedValue(mockLimitsInfo);
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key, params) => {
        const texts = {
          'premium_subscription_title': '⭐️ Подписка',
          'premium_status_header': '<b>Ваш статус:</b>',
          'status_premium': '⭐️ Премиум',
          'premium_privileges': `Привилегии: ${params?.status || '👤 Обычный'}`,
          'max_description_length': `<b>Макс. длина описания:</b> ${params?.length || 0} символов`,
          'premium_expires': `📅 Премиум подписка действительна до: <b>${params?.date || 'Unknown'}</b>\n⏰ Осталось дней: <b>${params?.days || 0}</b>`,
          'premium_menu_title': '<b>Меню:</b>',
          'premium_tariff_button': '⭐️ Тариф',
          'premium_why_paid_button': '👀 Почему сервис платный?',
          'premium_back_button': '⬅️ Назад'
        };
        return texts[key] || key;
      });

      await commandHandlers.premiumSubscription(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('⭐️ Подписка'),
        expect.stringContaining('📅 Премиум подписка действительна до:'),
        expect.objectContaining({
          parse_mode: 'HTML',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⭐️ Тариф', callback_data: 'premium_tariffs' })
              ]),
              expect.arrayContaining([
                expect.objectContaining({ text: '👀 Почему сервис платный?', callback_data: 'premium_why_paid' })
              ]),
              expect.arrayContaining([
                expect.objectContaining({ text: '⬅️ Назад', callback_data: 'back_to_menu' })
              ])
            ])
          })
        })
      );
    });
  });

  describe('CallbackHandlers.premiumTariffs', () => {
    it('should display premium tariffs information', async () => {
      const mockCtx = {
        from: { id: 123456 },
        editMessageText: jest.fn(),
        answerCbQuery: jest.fn()
      };

      // Mock PaymentService
      const mockPaymentService = {
        createInvoiceLink: jest.fn().mockResolvedValue('https://t.me/bot?invoice=test_link')
      };
      callbackHandlers.paymentService = mockPaymentService;

      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = {
          'premium_tariffs_title': '⭐️ Тарифы (Telegram Stars)',
          'premium_payment_info': '💳 Оплата происходит с помощью Telegram Stars',
          'premium_renewal_info': '📅 Продлить подписку можно в любой момент',
          'premium_stars_info': '💡 Приобрести звёзды без комиссии',
          'premium_back_button': '⬅️ Назад'
        };
        return texts[key] || key;
      });

      await callbackHandlers.handlePremiumTariffs(mockCtx);

      expect(mockCtx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('⭐️ Тарифы (Telegram Stars)'),
        expect.objectContaining({
          parse_mode: 'HTML',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⬅️ Назад', callback_data: 'premium_subscription' })
              ])
            ])
          })
        })
      );
    });
  });

  describe('CallbackHandlers.premiumWhyPaid', () => {
    it('should display why service is paid information', async () => {
      const mockCtx = {
        from: { id: 123456 },
        editMessageText: jest.fn()
      };

      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = {
          'premium_why_paid_title': '👀 Почему сервис платный?',
          'premium_why_paid_text': 'Наш сервис предоставляет расширенные возможности',
          'premium_back_button': '⬅️ Назад'
        };
        return texts[key] || key;
      });

      await callbackHandlers.handlePremiumWhyPaid(mockCtx);

      expect(mockCtx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining('👀 Почему сервис платный?'),
        expect.objectContaining({
          parse_mode: 'HTML',
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '⬅️ Назад', callback_data: 'premium_subscription' })
              ])
            ])
          })
        })
      );
    });
  });
}); 