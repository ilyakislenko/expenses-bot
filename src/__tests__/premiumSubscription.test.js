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
  return jest.fn().mockImplementation(() => ({
    getExpenseCount: jest.fn().mockResolvedValue(45)
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

  describe('Inline Menu Integration', () => {
    it('should include premium subscription button in inline main menu', () => {
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = {
          'premium_subscription_title': '⭐️ Подписка',
          'button_help': '❓ Справка',
          'button_expenses_month': '💰 Траты за месяц',
          'button_expenses_day': '💰 Траты за день',
          'button_expenses_categories': '💰 Траты по категориям',
          'button_family': '👨‍👩‍👧‍👦 Семья',
          'button_settings': '⚙️ Настройки',
          'button_delete_last': '🗑️ Удалить последнюю запись'
        };
        return texts[key] || key;
      });

      const inlineMenu = keyboardGenerators.generateInlineMainMenu('ru');

      // Проверяем, что кнопка премиум подписки присутствует в меню
      const premiumButton = inlineMenu.flat().find(button => 
        button.callback_data === 'premium_subscription'
      );

      expect(premiumButton).toBeDefined();
      expect(premiumButton.text).toBe('⭐️ Подписка');
      expect(premiumButton.callback_data).toBe('premium_subscription');
    });

    it('should display premium subscription button in /menu command', async () => {
      const mockCtx = {
        from: { id: 123456 },
        reply: jest.fn()
      };

      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key) => {
        const texts = {
          'main_menu_title': '🏠 *Главное меню*\n\nВыберите действие:',
          'premium_subscription_title': '⭐️ Подписка',
          'button_help': '❓ Справка',
          'button_expenses_month': '💰 Траты за месяц',
          'button_expenses_day': '💰 Траты за день',
          'button_expenses_categories': '💰 Траты по категориям',
          'button_family': '👨‍👩‍👧‍👦 Семья',
          'button_settings': '⚙️ Настройки',
          'button_delete_last': '🗑️ Удалить последнюю запись'
        };
        return texts[key] || key;
      });

      await commandHandlers.mainMenu(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('🏠 *Главное меню*'),
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
        currentCount: 45,
        maxCount: 100,
        remaining: 55,
        maxDescriptionLength: 80,
        percentage: 45
      };

      jest.spyOn(premiumService, 'getLimitsInfo').mockResolvedValue(mockLimitsInfo);
      jest.spyOn(localizationService, 'getText').mockImplementation((lang, key, params) => {
        const texts = {
          'premium_subscription_title': '⭐️ Подписка',
          'premium_status_header': '<b>Ваш статус:</b>',
          'status_regular': '👤 Стандарт',
          'premium_privileges': `Привилегии: ${params?.status || '👤 Обычный'}`,
          'records_usage': `<b>Записей:</b> ${params?.current || 0}/${params?.max || 0} (${params?.percentage || 0}%)`,
          'records_remaining': `<b>Осталось:</b> ${params?.remaining || 0} записей`,
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
        currentCount: 45,
        maxCount: 1000,
        remaining: 955,
        maxDescriptionLength: 200,
        percentage: 4.5,
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
          'records_usage': `<b>Записей:</b> ${params?.current || 0}/${params?.max || 0} (${params?.percentage || 0}%)`,
          'records_remaining': `<b>Осталось:</b> ${params?.remaining || 0} записей`,
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