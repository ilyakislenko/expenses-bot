const { Telegraf, Telegram } = require('telegraf');
const CommandHandlers = require('../handlers/commands');
const CallbackHandlers = require('../handlers/callbacks');
const LocalizationService = require('../services/LocalizationService');
const StateService = require('../services/StateService');
const UserService = require('../services/UserService');
const Formatter = require('../utils/formatter');
const registerBotRoutes = require('../botRoutes');
const { calculateTimezoneFromUserTime, isValidTimezone } = require('../utils/timezoneCalculator');
const { generateMainMenuKeyboard, generateTimeKeyboard, generateCurrencyKeyboard } = require('../utils/constants');

const buttons = (keyboard) => keyboard.flat();
const nowSeconds = () => Math.floor(Date.now() / 1000);

// Обработчики команд и кнопок с реальными локализацией, StateService и форматтером; БД заменена моками
function build({ language = 'en' } = {}) {
  const localizationService = new LocalizationService();
  const stateService = new StateService();
  let currentLanguage = language;
  const userService = {
    registerUser: jest.fn().mockResolvedValue({ id: 1, isNew: false }),
    getUserLanguage: jest.fn(async () => currentLanguage),
    setUserLanguage: jest.fn(async (id, lang) => { currentLanguage = lang; }),
    setUserCurrency: jest.fn(),
    setUserTimezone: jest.fn()
  };
  const funnelService = { registerSource: jest.fn(), track: jest.fn() };
  const commandHandlers = new CommandHandlers({
    userService,
    funnelService,
    stateService,
    localizationService,
    premiumService: { isPremiumUser: jest.fn().mockResolvedValue(false) },
    familyService: { getUserFamily: jest.fn().mockResolvedValue(null) },
    formatter: new Formatter({}),
    keyboardGenerators: {
      generateMainMenuKeyboard: (lang, showFamily) => generateMainMenuKeyboard(localizationService, lang, showFamily)
    }
  });
  const callbackHandlers = new CallbackHandlers({ userService, localizationService, stateService, commandHandlers });
  return { localizationService, stateService, userService, funnelService, commandHandlers, callbackHandlers };
}

function callbackCtx(data, message = { message_id: 10, date: nowSeconds() }) {
  return {
    from: { id: 1, username: 'u', first_name: 'U' },
    chat: { id: 1 },
    callbackQuery: { data, message },
    reply: jest.fn().mockResolvedValue({}),
    editMessageText: jest.fn().mockResolvedValue({}),
    answerCbQuery: jest.fn().mockResolvedValue(true),
    telegram: { sendMessage: jest.fn().mockResolvedValue({}) }
  };
}

// Кнопка «у меня сейчас HH:MM» для пользователя в UTC+offset на момент shownAt (минуты — UTC, как на клавиатуре)
function timeButton(shownAt, offsetHours, suffix = '') {
  const hour = (shownAt.getUTCHours() + offsetHours + 24) % 24;
  return `time|${hour}|${shownAt.getUTCMinutes()}${suffix}`;
}

describe('time| input validation (SEC-1 / PLT-1)', () => {
  test('calculateTimezoneFromUserTime rejects non-numeric and out-of-range values', () => {
    const at = new Date('2026-01-15T12:15:00Z');
    for (const [h, m] of [[NaN, 0], [0, NaN], [24, 0], [99, 0], [-1, 0], [0, 60], [1.5, 0], ['3', 0]]) {
      expect(() => calculateTimezoneFromUserTime(h, m, at)).toThrow(RangeError);
    }
    expect(() => calculateTimezoneFromUserTime(12, 15, new Date('junk'))).toThrow(RangeError);
    expect(calculateTimezoneFromUserTime(23, 59, new Date('2026-01-15T23:59:00Z'))).toBe('UTC');
  });

  test('isValidTimezone accepts zones Intl knows and rejects the rest', () => {
    for (const tz of ['UTC', 'Europe/Moscow', 'Asia/Kolkata', 'Etc/GMT-14', 'Etc/GMT+12']) expect(isValidTimezone(tz)).toBe(true);
    for (const tz of ['Etc/GMT+NaN', 'Mars/Olympus', '', null, undefined, 42]) expect(isValidTimezone(tz)).toBe(false);
  });

  test('handler: out-of-range time answers with an error and saves nothing', async () => {
    const { callbackHandlers, userService, localizationService } = build();
    for (const data of ['time|99|0', 'time|0|60', 'time|24|00']) {
      const ctx = callbackCtx(data);
      await callbackHandlers.handleTimezoneSelection(ctx);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(localizationService.getText('en', 'timezone_error'));
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    }
    expect(userService.setUserTimezone).not.toHaveBeenCalled();
  });

  test('UserService.setUserTimezone refuses an invalid zone without touching the DB', async () => {
    const userRepository = { setUserTimezone: jest.fn() };
    const service = new UserService(userRepository, {}, {});
    await expect(service.setUserTimezone(1, 'Etc/GMT+NaN')).rejects.toThrow(RangeError);
    await expect(service.setUserTimezone(1, 'Etc/GMT-58')).rejects.toThrow(RangeError);
    expect(userRepository.setUserTimezone).not.toHaveBeenCalled();
    await service.setUserTimezone(1, 'Etc/GMT-5');
    expect(userRepository.setUserTimezone).toHaveBeenCalledWith(1, 'Etc/GMT-5');
  });

  describe('routing', () => {
    let bot;
    let handlers;
    let calls;

    beforeEach(() => {
      const localizationService = new LocalizationService();
      calls = [];
      bot = new Telegraf('123:TEST');
      bot.botInfo = { id: 1, is_bot: true, username: 'test_bot', first_name: 'Test' };
      jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async (method, payload) => { calls.push({ method, payload }); return true; });
      // Обработчик-заглушка на каждое имя метода (одна и та же jest.fn при повторном обращении)
      const any = () => {
        const fns = {};
        return new Proxy({}, { get: (target, name) => (fns[name] = fns[name] || jest.fn().mockResolvedValue(undefined)) });
      };
      handlers = {
        errorHandler: (fn) => fn,
        commandHandlers: any(),
        messageHandlers: any(),
        callbackHandlers: any(),
        adminHandlers: any(),
        incomeHandlers: any(),
        recurringExpenseHandlers: any(),
        expenseHandlers: any(),
        budgetHandlers: any(),
        exportHandlers: any(),
        stateService: new StateService(),
        localizationService,
        userService: { getUserLanguage: jest.fn().mockResolvedValue('en') }
      };
      registerBotRoutes(bot, handlers);
    });

    afterEach(() => jest.restoreAllMocks());

    const press = (data) => bot.handleUpdate({
      update_id: 1,
      callback_query: {
        id: 'q', data, chat_instance: 'c',
        from: { id: 1, is_bot: false, first_name: 'U' },
        message: { message_id: 10, date: nowSeconds(), chat: { id: 1, type: 'private' } }
      }
    });

    test('junk time| payloads never reach the timezone handler', async () => {
      for (const data of ['time|abc|0', 'time|1|x', 'time|123|0', 'time|1|2|3', 'time|1|2|ob|x', 'time|', 'time|-1|0']) {
        await press(data);
      }
      expect(handlers.callbackHandlers.handleTimezoneSelection).not.toHaveBeenCalled();
      expect(calls.filter((c) => c.method === 'answerCallbackQuery')).toHaveLength(7);
    });

    test('well-formed time| and set_language| payloads (with or without |ob) are routed', async () => {
      await press('time|13|5');
      await press('time|13|5|ob');
      await press('set_language|jp|ob');
      expect(handlers.callbackHandlers.handleTimezoneSelection).toHaveBeenCalledTimes(2);
      expect(handlers.callbackHandlers.handleLanguageSelection).toHaveBeenCalledTimes(1);
    });
  });
});

describe('time| reference time is when the keyboard was shown (PLT-8)', () => {
  test('a keyboard pressed 2 hours later still gives the zone of the moment it was shown', async () => {
    const { callbackHandlers, userService } = build();
    const shownAt = new Date((nowSeconds() - 2 * 3600) * 1000);
    const ctx = callbackCtx(timeButton(shownAt, 3), { message_id: 10, date: shownAt.getTime() / 1000 });

    await callbackHandlers.handleTimezoneSelection(ctx);

    expect(userService.setUserTimezone).toHaveBeenCalledWith(1, 'Europe/Moscow');
  });

  test('edit_date (keyboard shown by editing the message) wins over the original send date', async () => {
    const { callbackHandlers, userService } = build();
    const sentAt = nowSeconds() - 10 * 3600;
    const shownAt = new Date((nowSeconds() - 3600) * 1000);
    const ctx = callbackCtx(timeButton(shownAt, -5), { message_id: 10, date: sentAt, edit_date: shownAt.getTime() / 1000 });

    await callbackHandlers.handleTimezoneSelection(ctx);

    expect(userService.setUserTimezone).toHaveBeenCalledWith(1, 'Etc/GMT+5');
  });
});

describe('onboarding survives a restart (PLT-7 / TG-12)', () => {
  test('language → currency → timezone continue after StateService.clearAll() and finish with the welcome', async () => {
    const { callbackHandlers, stateService, userService, funnelService, localizationService } = build();
    const t = (lang, key, params) => localizationService.getText(lang, key, params);

    // Шаг 1: язык. Перед нажатием процесс «перезапустился»
    stateService.clearAll();
    const langCtx = callbackCtx('set_language|de|ob');
    await callbackHandlers.handleLanguageSelection(langCtx);
    expect(userService.setUserLanguage).toHaveBeenCalledWith(1, 'de');
    const [currencyText, currencyExtra] = langCtx.editMessageText.mock.calls[0];
    expect(currencyText).toBe(t('de', 'currency_select'));
    const currencyData = buttons(currencyExtra.reply_markup.inline_keyboard).map((b) => b.callback_data);
    expect(currencyData).toContain('set_currency|EUR|ob');
    expect(currencyData[currencyData.length - 1]).toBe('ob_language'); // «Назад» — к языку, не в Настройки
    expect(currencyData).not.toContain('back_to_settings');
    expect(langCtx.telegram.sendMessage).not.toHaveBeenCalled();

    // Шаг 3 (после ещё одного рестарта): часовой пояс завершает онбординг
    stateService.clearAll();
    const shownAt = new Date();
    const timeCtx = callbackCtx(timeButton(shownAt, 1, '|ob'), { message_id: 10, date: Math.floor(shownAt.getTime() / 1000) });
    await callbackHandlers.handleTimezoneSelection(timeCtx);
    expect(userService.setUserTimezone).toHaveBeenCalledWith(1, 'Etc/GMT-1');
    expect(funnelService.track).toHaveBeenCalledWith(1, 'onboarding_completed');
    // Сообщение с кнопками онбординга закрыто, приветствие пришло новым сообщением с главной клавиатурой
    expect(timeCtx.editMessageText.mock.calls[0][1].reply_markup).toBeUndefined();
    const [welcome, welcomeExtra] = timeCtx.reply.mock.calls[0];
    expect(welcome).toBe(`${t('de', 'start_message')}\n\n${t('de', 'start_reminders_note')}`);
    expect(welcomeExtra.reply_markup.keyboard).toEqual(generateMainMenuKeyboard(localizationService, 'de', false));
  });

  test('currency step with |ob moves on to the onboarding timezone keyboard', async () => {
    const { commandHandlers } = build({ language: 'ru' });
    const ctx = callbackCtx('set_currency|RUB|ob');

    await commandHandlers.timezone(ctx, { onboarding: true });

    const data = buttons(ctx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard).map((b) => b.callback_data);
    expect(data.filter((d) => d.startsWith('time|')).every((d) => /^time\|\d{1,2}\|\d{1,2}\|ob$/.test(d))).toBe(true);
    expect(data[data.length - 1]).toBe('ob_currency');
  });

  test('settings flow is unchanged: no |ob, Back returns to Settings, keyboard refreshed', async () => {
    const { callbackHandlers, commandHandlers } = build();
    commandHandlers.mainKeyboardMarkup = jest.fn().mockResolvedValue({ keyboard: [] });
    const ctx = callbackCtx('set_language|fr');

    await callbackHandlers.handleLanguageSelection(ctx);

    expect(buttons(ctx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard).map((b) => b.callback_data)).toEqual(['back_to_settings']);
    expect(ctx.telegram.sendMessage).toHaveBeenCalled();
  });

  test('all onboarding and settings callback_data fit Telegram 64-byte limit', () => {
    const localizationService = new LocalizationService();
    const all = [
      ...buttons(localizationService.getLanguageKeyboardLocalized('en', { onboarding: true })),
      ...buttons(generateCurrencyKeyboard(localizationService, 'en', 'set_currency', 'ob_language', '|ob')),
      ...buttons(generateTimeKeyboard(localizationService, 'en', { onboarding: true }))
    ].map((b) => b.callback_data);
    expect(all.every((d) => Buffer.byteLength(d) <= 64)).toBe(true);
    // На первом шаге «Назад» нет: из онбординга нельзя попасть в Настройки
    expect(all).not.toContain('settings');
  });
});

describe('Telegram language codes (PLT-15)', () => {
  const localizationService = new LocalizationService();

  test.each([
    ['ja', 'jp'], ['kk', 'kz'], ['pt-br', 'pt'], ['pt-BR', 'pt'], ['zh-hans', 'zh'], ['zh-Hant', 'zh'],
    ['en-US', 'en'], ['ru', 'ru'], ['ka', 'ka'], ['uz', 'uz'], ['hi', 'hi'], ['es-419', 'es']
  ])('%s → %s', (code, expected) => {
    expect(localizationService.resolveTelegramLanguage(code)).toBe(expected);
  });

  test.each([['xx'], [''], [undefined], [null], ['constructor'], ['__proto__']])('unsupported %p → null', (code) => {
    expect(localizationService.resolveTelegramLanguage(code)).toBeNull();
  });

  test('new Japanese user gets the language picker in Japanese', async () => {
    const { commandHandlers, userService, localizationService: ls } = build();
    userService.registerUser.mockResolvedValue({ id: 1, isNew: true });
    const ctx = {
      from: { id: 1, username: 'u', first_name: 'U', language_code: 'ja' },
      message: { text: '/start' },
      reply: jest.fn().mockResolvedValue({})
    };

    await commandHandlers.start(ctx);

    expect(ctx.reply.mock.calls[0][0]).toBe(ls.getText('jp', 'language_select'));
  });
});
