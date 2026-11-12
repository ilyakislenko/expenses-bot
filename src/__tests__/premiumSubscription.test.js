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
    const t = (key, params) => localizationService.getText('ru', key, params);

    // Экран подписки с реальными текстами: источник премиума, подписка и ссылки на счёт — моки
    async function open({ limitsInfo, source = null, subscription = null }) {
      const ctx = { from: { id: 123456 }, reply: jest.fn() };
      jest.spyOn(premiumService, 'getLimitsInfo').mockResolvedValue(limitsInfo);
      jest.spyOn(commandHandlers.userService, 'getActiveRecurringSubscription').mockResolvedValue(subscription);
      jest.spyOn(commandHandlers.referralService, 'getPremiumSource').mockResolvedValue(source);
      jest.spyOn(commandHandlers.referralService, 'getStats').mockResolvedValue(null);
      const track = jest.spyOn(commandHandlers.funnelService, 'track').mockResolvedValue(undefined);
      const createInvoiceLink = jest.fn(async (userId, tariff) => `https://t.me/$inv${tariff.duration}`);
      commandHandlers.paymentService = { createInvoiceLink };
      await commandHandlers.premiumSubscription(ctx);
      const [text, extra] = ctx.reply.mock.calls[0];
      return { text, keyboard: extra.reply_markup.inline_keyboard, track, createInvoiceLink, extra };
    }

    it('free user: one status line, no technical lines, year then month invoice buttons first, donation below', async () => {
      const { text, keyboard, track, createInvoiceLink, extra } = await open({ limitsInfo: { isPremium: false, maxDescriptionLength: 80 } });
      expect(extra.parse_mode).toBe('HTML');
      expect(text.startsWith(`${t('premium_subscription_title')}\n\n${t('premium_status_free')}`)).toBe(true);
      for (const technical of ['Привилегии', 'Макс. длина описания', 'Меню:']) expect(text).not.toContain(technical);
      expect(keyboard[0]).toEqual([{ text: t('premium_pay_year', { stars: 999, percent: 44 }), url: 'https://t.me/$inv365' }]);
      expect(keyboard[1]).toEqual([{ text: t('premium_pay_month', { stars: 149 }), url: 'https://t.me/$inv30' }]);
      expect(keyboard[2]).toEqual([{ text: t('premium_tariff_button'), callback_data: 'premium_tariffs' }]);
      expect(keyboard[3]).toEqual([{ text: t('premium_stars_help_button'), callback_data: 'premium_stars_help' }]);
      const callbacks = keyboard.map(row => row.map(b => b.callback_data));
      expect(callbacks).toContainEqual(['premium_purchases', 'premium_donate']);
      expect(callbacks[callbacks.length - 1]).toEqual(['back_to_menu']);
      expect(createInvoiceLink.mock.calls.map(([, tariff]) => tariff.duration)).toEqual([365, 30]);
      expect(track).toHaveBeenCalledWith(123456, 'paywall_viewed');
    });

    it('trial: «trial until DATE» and the paywall step is recorded', async () => {
      const premiumExpiresAt = new Date('2026-11-27T10:00:00Z');
      const { text, track } = await open({ limitsInfo: { isPremium: true, personalActive: true, premiumExpiresAt, daysRemaining: 14 }, source: 'trial' });
      expect(text).toContain(t('premium_status_trial', { date: commandHandlers.formatter.formatDate(premiumExpiresAt, 'UTC'), days: 14 }));
      expect(track).toHaveBeenCalledWith(123456, 'paywall_viewed');
    });

    it('paid premium: «premium until DATE», no paywall step, no second monthly subscription', async () => {
      const premiumExpiresAt = new Date('2025-12-31T23:59:59.000Z');
      const { text, keyboard, track, createInvoiceLink } = await open({
        limitsInfo: { isPremium: true, personalActive: true, premiumExpiresAt, daysRemaining: 145 },
        source: 'paid',
        subscription: { subscription_expires_at: new Date('2026-01-01T00:00:00Z') }
      });
      expect(text).toContain(t('premium_status_until', { date: commandHandlers.formatter.formatDate(premiumExpiresAt, 'UTC'), days: 145 }));
      expect(track).not.toHaveBeenCalledWith(123456, 'paywall_viewed');
      expect(createInvoiceLink.mock.calls.map(([, tariff]) => tariff.duration)).toEqual([365]);
      expect(keyboard[0][0].url).toBe('https://t.me/$inv365');
      expect(keyboard[1]).toEqual([{ text: t('premium_tariff_button'), callback_data: 'premium_tariffs' }]);
    });

    it('invoice links failed — the screen still opens with «All plans» first', async () => {
      const ctx = { from: { id: 123456 }, reply: jest.fn() };
      jest.spyOn(premiumService, 'getLimitsInfo').mockResolvedValue({ isPremium: false });
      jest.spyOn(commandHandlers.funnelService, 'track').mockResolvedValue(undefined);
      commandHandlers.paymentService = { createInvoiceLink: jest.fn().mockRejectedValue(new Error('timeout')) };
      await commandHandlers.premiumSubscription(ctx);
      const keyboard = ctx.reply.mock.calls[0][1].reply_markup.inline_keyboard;
      expect(keyboard[0]).toEqual([{ text: t('premium_tariff_button'), callback_data: 'premium_tariffs' }]);
    });
  });

  describe('CallbackHandlers.premiumTariffs', () => {
    it('should display premium tariffs information', async () => {
      const mockCtx = {
        from: { id: 123456 },
        callbackQuery: { data: 'premium_tariffs', message: { message_id: 1 } },
        editMessageText: jest.fn().mockResolvedValue(true),
        answerCbQuery: jest.fn().mockResolvedValue(true)
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
        callbackQuery: { data: 'premium_why_paid', message: { message_id: 1 } },
        editMessageText: jest.fn().mockResolvedValue(true),
        answerCbQuery: jest.fn().mockResolvedValue(true)
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