const CommandHandlers = require('../handlers/commands');
const ExpenseService = require('../services/ExpenseService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const {
  generateMainMenuKeyboard,
  generateSettingsKeyboard
} = require('../utils/constants');

function createCtx({ callback = false, text = '/start', languageCode } = {}) {
  const ctx = {
    from: { id: 1, username: 'testuser', first_name: 'Test', language_code: languageCode },
    message: { text },
    reply: jest.fn().mockResolvedValue({}),
    editMessageText: jest.fn().mockResolvedValue({}),
    answerCbQuery: jest.fn().mockResolvedValue(true)
  };
  if (callback) ctx.callbackQuery = { data: 'x', message: { message_id: 10 } };
  return ctx;
}

const buttons = (inlineKeyboard) => inlineKeyboard.flat();

describe('CommandHandlers flows', () => {
  let localizationService;
  let userService;
  let funnelService;
  let stateService;
  let premiumService;
  let familyService;
  let incomeService;
  let handlers;
  const t = (lang, key, params) => localizationService.getText(lang, key, params);

  beforeEach(() => {
    localizationService = new LocalizationService();
    userService = {
      registerUser: jest.fn().mockResolvedValue({ id: 1, isNew: false }),
      getUserLanguage: jest.fn().mockResolvedValue('en'),
      getUserCurrency: jest.fn().mockResolvedValue('USD'),
      // Без летнего времени (UTC-3) и с "_", который в Markdown нужно экранировать
      getUserTimezone: jest.fn().mockResolvedValue('America/Sao_Paulo'),
      getUserPeriodStartDay: jest.fn().mockResolvedValue(5),
      getReminderSettings: jest.fn().mockResolvedValue({ reminder_enabled: true, reminder_hours: [18, 9] }),
      getUserById: jest.fn().mockResolvedValue({ id: 1, family_mode: false })
    };
    funnelService = { registerSource: jest.fn(), track: jest.fn() };
    stateService = { setUserState: jest.fn(), getUserState: jest.fn(), clearUserState: jest.fn() };
    premiumService = { isPremiumUser: jest.fn().mockResolvedValue(false) };
    familyService = { getUserFamily: jest.fn().mockResolvedValue(null) };
    incomeService = { getIncomeCurrency: jest.fn().mockResolvedValue('EUR') };

    handlers = new CommandHandlers({
      userService,
      funnelService,
      stateService,
      premiumService,
      familyService,
      incomeService,
      localizationService,
      formatter: new Formatter({}),
      keyboardGenerators: {
        generateMainMenuKeyboard: (lang, showFamily) => generateMainMenuKeyboard(localizationService, lang, showFamily),
        generateSettingsKeyboard: (lang) => generateSettingsKeyboard(localizationService, lang)
      }
    });
  });

  describe('start', () => {
    test('new user: registers, records source and starts onboarding with language picker', async () => {
      userService.registerUser.mockResolvedValue({ id: 1, isNew: true });
      const ctx = createCtx({ text: '/start ads_tg', languageCode: 'ru' });

      await handlers.start(ctx);

      expect(userService.registerUser).toHaveBeenCalledWith(1, 'testuser', 'Test');
      expect(funnelService.registerSource).toHaveBeenCalledWith(1, 'ads_tg');
      expect(funnelService.track).toHaveBeenCalledWith(1, 'registered');
      // Шаг онбординга — в callback_data, а не в памяти
      expect(stateService.setUserState).not.toHaveBeenCalled();

      const [text, extra] = ctx.reply.mock.calls[0];
      expect(text).toBe(t('ru', 'language_select'));
      const data = buttons(extra.reply_markup.inline_keyboard).map((b) => b.callback_data);
      expect(data).toEqual(expect.arrayContaining(['set_language|ru|ob', 'set_language|en|ob']));
      expect(data.every((d) => d.startsWith('set_language|') && d.endsWith('|ob'))).toBe(true);
    });

    test('new user with unsupported Telegram language gets English onboarding', async () => {
      userService.registerUser.mockResolvedValue({ id: 1, isNew: true });
      const ctx = createCtx({ languageCode: 'xx' });

      await handlers.start(ctx);

      expect(ctx.reply.mock.calls[0][0]).toBe(t('en', 'language_select'));
    });

    test('returning user: greeted in own language with main menu, no onboarding', async () => {
      userService.getUserLanguage.mockResolvedValue('ru');
      const ctx = createCtx();

      await handlers.start(ctx);

      expect(stateService.setUserState).not.toHaveBeenCalled();
      expect(funnelService.track).not.toHaveBeenCalled();
      const [text, extra] = ctx.reply.mock.calls[0];
      expect(text).toBe(t('ru', 'start_returning'));
      expect(extra.parse_mode).toBe('Markdown');
      expect(extra.reply_markup.keyboard).toEqual(generateMainMenuKeyboard(localizationService, 'ru', false));
    });

    test('after onboarding: completes funnel step and sends the full welcome', async () => {
      const ctx = createCtx();

      await handlers.start(ctx, { afterOnboarding: true });

      expect(funnelService.track).toHaveBeenCalledWith(1, 'onboarding_completed');
      expect(ctx.reply.mock.calls[0][0]).toBe(
        `${t('en', 'start_message')}\n\n${t('en', 'start_reminders_note')}`
      );
    });

    test('main menu shows family expense button only for premium users in a family', async () => {
      premiumService.isPremiumUser.mockResolvedValue(true);
      familyService.getUserFamily.mockResolvedValue({ id: 7 });
      const ctx = createCtx();

      await handlers.start(ctx);

      const keyboard = ctx.reply.mock.calls[0][1].reply_markup.keyboard;
      expect(keyboard.flat().map((b) => b.text)).toContain(t('en', 'family_add_expense'));

      premiumService.isPremiumUser.mockResolvedValue(false);
      const ctx2 = createCtx();
      await handlers.start(ctx2);
      expect(ctx2.reply.mock.calls[0][1].reply_markup.keyboard.flat().map((b) => b.text))
        .not.toContain(t('en', 'family_add_expense'));
    });

    test('with the family mode on the quick button becomes «personal expense»', async () => {
      premiumService.isPremiumUser.mockResolvedValue(true);
      familyService.getUserFamily.mockResolvedValue({ id: 7 });
      userService.getUserById.mockResolvedValue({ id: 1, family_mode: true });
      const ctx = createCtx();

      await handlers.start(ctx);

      const buttons = ctx.reply.mock.calls[0][1].reply_markup.keyboard.flat().map((b) => b.text);
      expect(buttons).toContain(t('en', 'button_personal_expense'));
      expect(buttons).not.toContain(t('en', 'family_add_expense'));
    });
  });

  describe('help', () => {
    test('command: replies with help text and bug report / back buttons', async () => {
      const ctx = createCtx({ text: '/help' });

      await handlers.help(ctx);

      const [text, extra] = ctx.reply.mock.calls[0];
      // без распознавания чеков: справка и строка про вопросы боту
      expect(text).toBe(`${t('en', 'help_message')}\n\n${t('en', 'help_assistant')}`);
      expect(buttons(extra.reply_markup.inline_keyboard).map((b) => b.callback_data))
        .toEqual(['bug_report', 'back_to_menu']);
    });

    test('button: edits the current message instead of sending a new one', async () => {
      const ctx = createCtx({ callback: true });

      await handlers.help(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalledWith(`${t('en', 'help_message')}\n\n${t('en', 'help_assistant')}`, expect.any(Object));
      expect(ctx.reply).not.toHaveBeenCalled();
    });
  });

  test('currency: offers set_currency buttons for supported currencies and a back button', async () => {
    const ctx = createCtx({ text: '/currency' });

    await handlers.currency(ctx);

    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text).toBe(t('en', 'currency_select'));
    const data = buttons(extra.reply_markup.inline_keyboard).map((b) => b.callback_data);
    expect(data).toEqual(expect.arrayContaining(['set_currency|RUB', 'set_currency|USD', 'set_currency|EUR']));
    expect(data[data.length - 1]).toBe('settings_currencies');
  });

  describe('settings', () => {
    test('shows current currencies, timezone with its UTC offset, period start and sorted reminder hours', async () => {
      const ctx = createCtx({ text: '/settings' });

      await handlers.settings(ctx);

      const [text, extra] = ctx.reply.mock.calls[0];
      expect(text).toContain(t('en', 'settings_currency_line', { currency: 'USD', incomeCurrency: 'EUR' }));
      expect(text).toContain(t('en', 'settings_timezone_line', { timezone: 'America/Sao\\_Paulo (UTC-3)' }));
      expect(text).toContain(t('en', 'settings_period_line', { day: 5 }));
      expect(text).toContain(t('en', 'settings_reminders_on_line', { hours: '09:00, 18:00' }));
      expect(extra.reply_markup.inline_keyboard).toEqual(generateSettingsKeyboard(localizationService, 'en'));
    });

    test('shows reminders as disabled when turned off', async () => {
      userService.getReminderSettings.mockResolvedValue({ reminder_enabled: false, reminder_hours: [10] });
      const ctx = createCtx({ text: '/settings' });

      await handlers.settings(ctx);

      expect(ctx.reply.mock.calls[0][0]).toContain(t('en', 'settings_reminders_off_line'));
    });
  });
});

describe('ExpenseService.getCategories', () => {
  const build = (isPremium) => {
    const categoryRepository = {
      getCategoriesWithPremium: jest.fn().mockResolvedValue([
        { id: 1, name: 'Еда', icon: '🍕' },
        { id: 9, name: 'Котик', icon: '🐱' }
      ])
    };
    const premiumService = { isPremiumUser: jest.fn().mockResolvedValue(isPremium) };
    return { categoryRepository, service: new ExpenseService({}, {}, categoryRepository, premiumService, {}) };
  };

  test('passes premium status so custom categories are included only for premium', async () => {
    for (const isPremium of [true, false]) {
      const { categoryRepository, service } = build(isPremium);
      await service.getCategories(1);
      expect(categoryRepository.getCategoriesWithPremium).toHaveBeenCalledWith(1, isPremium);
    }
  });

  test('translates built-in category names and keeps custom ones', async () => {
    const localizationService = new LocalizationService();
    const { service } = build(true);

    const categories = await service.getCategories(1, localizationService, 'en');

    expect(categories).toEqual([
      { id: 1, name: localizationService.getText('en', 'category_food'), icon: '🍕' },
      { id: 9, name: 'Котик', icon: '🐱' }
    ]);
  });
});
