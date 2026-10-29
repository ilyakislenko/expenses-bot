const { Telegraf, Telegram } = require('telegraf');
const OnboardingHandlers = require('../handlers/OnboardingHandlers');
const OnboardingService = require('../services/OnboardingService');
const RoastHandlers = require('../handlers/RoastHandlers');
const MessageHandlers = require('../handlers/messages');
const LocalizationService = require('../services/LocalizationService');
const StateService = require('../services/StateService');
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const stateCleanupMiddleware = require('../middleware/stateCleanupMiddleware');
const registerBotRoutes = require('../botRoutes');
const rules = require('../utils/onboarding');

const localizationService = new LocalizationService();
const LANGS = Object.keys(localizationService.supportedLanguages);
const buttons = (keyboard) => keyboard.flat();
const dataOf = (extra) => buttons(extra.reply_markup.inline_keyboard).map((b) => b.callback_data);

// Пользователь в памяти вместо БД: опрос, валюта, настройки напоминаний — то, что меняет опрос
function createStore(overrides = {}) {
  return {
    exists: true, language: 'ru', currency: 'RUB', timezone: 'UTC', periodStartDay: 1,
    reminder_enabled: true, reminder_hours: null, daily_summary_enabled: false, weekly_insight_enabled: false,
    wrapped: true, bills: false, onboarding: null, completedAt: null,
    roast: { level: 'off', gender: null, adultConfirmed: false },
    premium: true, premiumSource: 'trial', premiumExpiresAt: new Date('2026-11-11T12:00:00'),
    ...overrides
  };
}

function build({ store = createStore(), voice = false, receipt = false } = {}) {
  const userService = {
    registerUser: jest.fn(async () => ({ id: 1, isNew: false })),
    getUserLanguage: jest.fn(async () => store.language),
    getUserCurrency: jest.fn(async () => store.currency),
    setUserCurrency: jest.fn(async (id, c) => { store.currency = c; }),
    getUserTimezone: jest.fn(async () => store.timezone),
    setUserTimezone: jest.fn(async (id, tz) => { store.timezone = tz; }),
    setUserPeriodStartDay: jest.fn(async (id, d) => { store.periodStartDay = d; }),
    getReminderSettings: jest.fn(async () => ({ ...store })),
    setReminderHours: jest.fn(async (id, h) => { store.reminder_hours = h; }),
    setReminderEnabled: jest.fn(async (id, v) => { store.reminder_enabled = v; }),
    setDailySummaryEnabled: jest.fn(async (id, v) => { store.daily_summary_enabled = v; }),
    setWeeklyInsightEnabled: jest.fn(async (id, v) => { store.weekly_insight_enabled = v; }),
    getPremiumStatus: jest.fn(async () => ({ isPremium: store.premium, expiresAt: store.premiumExpiresAt })),
    getOnboarding: jest.fn(async () => (store.exists ? { answers: store.onboarding ? JSON.parse(JSON.stringify(store.onboarding)) : null, completedAt: store.completedAt } : null)),
    saveOnboarding: jest.fn(async (id, answers, { finished = false } = {}) => {
      store.onboarding = JSON.parse(JSON.stringify(answers));
      if (finished) store.completedAt = new Date();
    })
  };
  const budgetService = { setBudget: jest.fn(async () => ({})) };
  const planningService = {
    isBillRemindersEnabled: jest.fn(async () => store.bills),
    setBillRemindersEnabled: jest.fn(async (id, v) => { store.bills = v; })
  };
  const achievementService = {
    isWrappedEnabled: jest.fn(async () => store.wrapped),
    setWrappedEnabled: jest.fn(async (id, v) => { store.wrapped = v; })
  };
  const premiumService = { isPremiumUser: jest.fn(async () => store.premium) };
  const funnelService = { track: jest.fn(async () => {}), hasEvent: jest.fn(async (id, event) => event === 'first_expense' && !!store.recorded) };
  const referralService = {
    getPremiumSource: jest.fn(async () => store.premiumSource),
    getPendingInviter: jest.fn(async () => null),
    config: { ACTIVATION_EXPENSES: 3, ACTIVATION_DAYS: 2 },
    rewardDays: 7
  };
  const roastService = {
    getSettings: jest.fn(async () => ({ ...store.roast })),
    setLevel: jest.fn(async (id, level) => { store.roast.level = level; }),
    setGender: jest.fn(async (id, gender) => { store.roast.gender = gender; }),
    confirmAdult: jest.fn(async () => { store.roast.adultConfirmed = true; }),
    savageAllowed: jest.fn(async () => true),
    sampleLine: jest.fn((lang, level) => `😈 sample ${level}`)
  };
  const commandHandlers = {
    start: jest.fn(async () => {}),
    onboardingLanguage: jest.fn(async () => {}),
    mainKeyboardMarkup: jest.fn(async () => ({ keyboard: [['MAIN']], resize_keyboard: true }))
  };
  const stateService = new StateService();
  const roastHandlers = new RoastHandlers({ roastService, userService, localizationService });
  const onboardingService = new OnboardingService({ userService, budgetService, planningService, achievementService, premiumService, funnelService });
  const onboardingHandlers = new OnboardingHandlers({
    onboardingService, userService, roastService, roastHandlers, commandHandlers, localizationService,
    formatter: new Formatter({}), stateService, validator: new EnhancedValidator(), premiumService, referralService,
    voiceService: { configured: voice }, receiptService: { configured: receipt }
  });
  return { store, userService, budgetService, planningService, achievementService, funnelService, roastService, commandHandlers, stateService, roastHandlers, onboardingService, onboardingHandlers };
}

let messageSeq = 100;
function callbackCtx(data, { messageId = 50 } = {}) {
  return {
    from: { id: 1, first_name: 'U' },
    chat: { id: 1, type: 'private' },
    callbackQuery: { data, message: { message_id: messageId, date: Math.floor(Date.now() / 1000) } },
    match: null,
    reply: jest.fn(async () => ({ message_id: ++messageSeq })),
    editMessageText: jest.fn(async () => ({})),
    editMessageReplyMarkup: jest.fn(async () => ({})),
    answerCbQuery: jest.fn(async () => true),
    telegram: { editMessageReplyMarkup: jest.fn(async () => ({})), sendMessage: jest.fn(async () => ({})) }
  };
}

function textCtx(text) {
  return {
    from: { id: 1, first_name: 'U' },
    chat: { id: 1, type: 'private' },
    message: { text },
    reply: jest.fn(async () => ({ message_id: ++messageSeq })),
    telegram: { editMessageReplyMarkup: jest.fn(async () => ({})) }
  };
}

// Нажатие кнопки опроса так, как это сделал бы роутер (rstl/rstgs/rsty — через RoastHandlers с ctx.match)
async function press(env, data) {
  const ctx = callbackCtx(data);
  const h = env.onboardingHandlers;
  let m;
  if (/^onb\|/.test(data)) await h.handle(ctx);
  else if ((m = data.match(/^set_currency\|([A-Z]{3})\|ob$/))) await h.answerCurrency(ctx, m[1]);
  else if ((m = data.match(/^rstl\|(off|spicy|savage)\|(s|m|o)$/))) { ctx.match = m; await env.roastHandlers.chooseLevel(ctx); }
  else if ((m = data.match(/^rstgs\|(m|f|x)\|(off|spicy|savage|-)\|(s|m|o)$/))) { ctx.match = m; await env.roastHandlers.setGender(ctx); }
  else if ((m = data.match(/^rsty\|(s|m|o)$/))) { ctx.match = m; await env.roastHandlers.confirmAdult(ctx); }
  else throw new Error(`unrouted ${data}`);
  return ctx;
}

const lastScreen = (ctx) => {
  const calls = ctx.editMessageText.mock.calls.length ? ctx.editMessageText.mock.calls : ctx.reply.mock.calls;
  const [text, extra] = calls[calls.length - 1];
  return { text, extra, data: extra && extra.reply_markup && extra.reply_markup.inline_keyboard ? dataOf(extra) : [] };
};
const t = (lang, key, params) => localizationService.getText(lang, key, params);

describe('onboarding rules', () => {
  test('budget question only with the «budget» goal and premium; timezone only for new users', () => {
    const draft = rules.newDraft('new', { budgetAllowed: true });
    expect(rules.steps(draft)).toEqual(['g', 'c', 'z', 'p', 'i', 'r', 'n', 'm']);
    draft.goals = ['budget'];
    expect(rules.steps(draft)).toEqual(['g', 'c', 'z', 'p', 'b', 'i', 'r', 'n', 'm']);
    expect(rules.progress(draft, 'b')).toEqual({ n: 5, total: 9 });
    expect(rules.steps({ ...draft, budgetAllowed: false })).not.toContain('b');
    expect(rules.steps({ ...rules.newDraft('setup', { budgetAllowed: true }), goals: ['budget'] })).toEqual(['g', 'c', 'p', 'b', 'i', 'r', 'n', 'm']);
  });

  test('answer → settings mapping', () => {
    expect(rules.reminderPlan('e')).toEqual({ enabled: true, hours: [21] });
    expect(rules.reminderPlan('me')).toEqual({ enabled: true, hours: [9, 21] });
    expect(rules.reminderPlan('no')).toEqual({ enabled: false, hours: null });
    expect(rules.reminderPlan('xx')).toBeNull();
    expect(rules.paydayToPeriodDay(0)).toBe(1); // нерегулярно — с 1-го
    expect(rules.paydayToPeriodDay('25')).toBe(25);
    expect(rules.paydayToPeriodDay(32)).toBeNull();
    expect(rules.notifyPlan(['daily', 'bills'])).toEqual({ plan: false, daily: true, weekly: false, month: false, bills: true });
    expect(rules.inputOptions({ voice: false, receipt: true })).toEqual(['text', 'receipt', 'statement']);
    const draft = { goals: ['track', 'budget', 'save', 'debt', 'family', 'subs'], inputs: ['statement'] };
    expect(rules.finalActions(draft).map((a) => a.callback)).toEqual(['svgn', 'import', 'svbn', 'family']);
    expect(rules.finalActions({ goals: ['subs', 'track'], inputs: [] }).map((a) => a.callback)).toEqual(['pls', 'ov|0']);
    expect(rules.finalActions({ goals: [], inputs: [] })).toEqual([]);
  });
});

describe('full run (ru, all goals)', () => {
  test('every answer changes the real setting, final screen lists only applied settings', async () => {
    const env = build({ voice: true, receipt: true });
    const { store } = env;

    // Язык выбран (set_language|ru|ob) — первый вопрос, валюта по языку
    const first = callbackCtx('set_language|ru|ob');
    await env.onboardingHandlers.beginNew(first, 'ru');
    expect(env.funnelService.track).toHaveBeenCalledWith(1, 'onboarding_started');
    let screen = lastScreen(first);
    expect(screen.text).toContain(t('ru', 'onb_header', { n: 1, total: 8 }));
    expect(screen.data).toEqual(expect.arrayContaining(['onb|g|t|budget', 'onb|g|n', 'onb|g|s', 'onb|x', 'ob_language']));
    expect(first.editMessageText).toHaveBeenCalled(); // то же сообщение

    for (const goal of rules.GOALS) await press(env, `onb|g|t|${goal}`);
    screen = lastScreen(await press(env, 'onb|g|n'));
    expect(screen.text).toContain('2/9'); // с бюджетом вопросов 9
    expect(buttons(screen.extra.reply_markup.inline_keyboard).find((b) => b.callback_data === 'set_currency|RUB|ob').text).toMatch(/^✅/);

    screen = lastScreen(await press(env, 'set_currency|EUR|ob'));
    expect(store.currency).toBe('EUR');
    expect(screen.data.filter((d) => d.startsWith('time|')).length).toBe(24);

    await env.onboardingHandlers.afterTimezone(callbackCtx('time|13|0|ob'), 'Europe/Moscow');
    screen = lastScreen(await press(env, 'onb|p|d'));
    expect(screen.data).toContain('onb|p|a|31');
    screen = lastScreen(await press(env, 'onb|p|a|5'));
    expect(store.periodStartDay).toBe(5);
    expect(screen.text).toContain(t('ru', 'onb_budget_trial', { date: '11.11.2026' }));
    expect(env.stateService.getUserState(1)).toBe('onb_budget');

    // Бюджет: неверная сумма, затем верная
    const bad = textCtx('-500');
    expect(await env.onboardingHandlers.handleBudgetInput(bad, '-500', 'ru')).toBe(true);
    expect(bad.reply.mock.calls[0][0]).toBe(t('ru', 'onb_budget_invalid'));
    const good = textCtx('30 000');
    expect(await env.onboardingHandlers.handleBudgetInput(good, '30 000', 'ru')).toBe(true);
    expect(env.budgetService.setBudget).toHaveBeenCalledWith(1, null, 30000, 'EUR');
    expect(env.stateService.getUserState(1)).toBeUndefined();
    expect(good.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(1, 50, undefined, { inline_keyboard: [] }); // старый вопрос без кнопок
    expect(good.reply.mock.calls[0][0]).toContain('6/9');

    for (const code of ['voice', 'receipt', 'statement']) await press(env, `onb|i|t|${code}`);
    screen = lastScreen(await press(env, 'onb|i|n'));
    screen = lastScreen(await press(env, 'onb|r|a|me'));
    expect(store.reminder_hours).toEqual([9, 21]);
    expect(store.reminder_enabled).toBe(true);
    // «Что присылать»: изначально — текущие настройки + подсказки по целям (подписки → платежи, «куда уходят» → неделя)
    expect(buttons(screen.extra.reply_markup.inline_keyboard).filter((b) => b.text.startsWith('✅')).map((b) => b.callback_data))
      .toEqual(['onb|n|t|weekly', 'onb|n|t|month', 'onb|n|t|bills']);
    await press(env, 'onb|n|t|daily');
    await press(env, 'onb|n|t|month');
    screen = lastScreen(await press(env, 'onb|n|n'));
    expect(store).toMatchObject({ daily_summary_enabled: true, weekly_insight_enabled: true, wrapped: false, bills: true });
    expect(screen.data).toEqual(expect.arrayContaining(['rstl|off|o', 'rstl|spicy|o', 'rstl|savage|o', 'onb|m|s']));

    // Злой режим: пол спрашивает существующий экран, потом — итог
    screen = lastScreen(await press(env, 'rstl|spicy|o'));
    expect(screen.data).toEqual(['rstgs|m|spicy|o', 'rstgs|f|spicy|o', 'rstgs|x|spicy|o', 'onb|o|m']);
    const done = await press(env, 'rstgs|f|spicy|o');
    expect(store.roast).toMatchObject({ level: 'spicy', gender: 'f' });
    expect(env.funnelService.track).toHaveBeenCalledWith(1, 'onboarding_completed');
    expect(store.onboarding.status).toBe('completed');
    expect(store.completedAt).toBeInstanceOf(Date);

    const [finalText, finalExtra] = done.editMessageText.mock.calls[done.editMessageText.mock.calls.length - 1];
    expect(finalText).toContain(t('ru', 'onb_done_title'));
    expect(finalText).toContain(t('ru', 'onb_done_currency', { currency: 'EUR' }));
    expect(finalText).toContain(t('ru', 'onb_done_period', { day: 5 }));
    expect(finalText).toContain(t('ru', 'onb_done_reminders', { hours: '09:00, 21:00' }));
    expect(finalText).toContain(t('ru', 'onb_done_roast', { level: t('ru', 'roast_level_spicy') }));
    expect(finalText).toContain(t('ru', 'onb_done_first_step'));
    expect(finalText).toContain(t('ru', 'onb_done_tip_voice'));
    expect(dataOf(finalExtra)).toEqual(['svgn', 'import', 'svbn', 'family']);
    // Главная клавиатура — отдельным сообщением
    const [note, noteExtra] = done.reply.mock.calls[done.reply.mock.calls.length - 1];
    expect(note).toBe(t('ru', 'onb_keyboard_note'));
    expect(noteExtra.reply_markup.keyboard).toEqual([['MAIN']]);
    expect(store.onboarding).toMatchObject({ goals: rules.GOALS, inputs: ['voice', 'receipt', 'statement'], answers: { reminders: 'me', roast: 'spicy', payday: 5 } });
  });
});

describe('skip and skip all', () => {
  test('«Пропустить» leaves the setting as is and moves on; «Пропустить всё» finishes with the main keyboard', async () => {
    const env = build({ store: createStore({ premium: false, language: 'en' }) });
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|en|ob'), 'en');
    await press(env, 'onb|g|t|save');
    let screen = lastScreen(await press(env, 'onb|g|s'));
    expect(env.store.onboarding.goals).toEqual([]);
    expect(env.store.onboarding.skipped).toEqual(['g']);
    expect(screen.text).toContain('2/8');
    // «Пропустить всё» заканчивает опрос сразу: итог, главная клавиатура, затем необязательный вопрос о времени
    const done = await press(env, 'onb|x');
    expect(env.funnelService.track).toHaveBeenCalledWith(1, 'onboarding_skipped');
    expect(env.store.onboarding.status).toBe('skipped');
    expect(env.userService.setUserPeriodStartDay).not.toHaveBeenCalled();
    // Без пояса (en не угадать) напоминания выключены, а не каждый день в 21:00 по UTC
    expect(env.store.reminder_enabled).toBe(false);
    const finalText = done.editMessageText.mock.calls[0][0];
    expect(finalText).toContain(t('en', 'onb_done_currency', { currency: 'USD' })); // валюта по языку — уже стоит
    expect(finalText).toContain(t('en', 'onb_done_first_step'));
    expect(finalText).toContain(t('en', 'onb_done_reminders_auto_off'));
    expect(done.reply.mock.calls[0][1].reply_markup.keyboard).toEqual([['MAIN']]);
    const [question, questionExtra] = done.reply.mock.calls[1];
    expect(question).toBe(t('en', 'onb_q_timezone_last', { timezone: 'UTC+0' }));
    expect(dataOf(questionExtra).filter((d) => d.startsWith('time|')).every((d) => d.endsWith('|ob'))).toBe(true);
    expect(dataOf(questionExtra)).not.toContain('ob_currency');
  });

  test('skipping the last question completes the run', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|o|m');
    await press(env, 'onb|m|s');
    expect(env.store.onboarding.status).toBe('completed');
    expect(env.roastService.setLevel).not.toHaveBeenCalled();
  });

  test('irregular payday keeps the month from day 1', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|p|a|0');
    expect(env.store.periodStartDay).toBe(1);
    expect(env.store.onboarding.answers).toMatchObject({ payday: 0, periodDay: 1 });
  });
});

describe('conditional budget question', () => {
  test('without the budget goal payday leads to the input question', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|g|t|save');
    await press(env, 'onb|g|n');
    await press(env, 'onb|o|p');
    await press(env, 'onb|p|a|10');
    expect(env.store.onboarding.step).toBe('i');
  });

  test('budget goal without premium: no budget question', async () => {
    const env = build({ store: createStore({ premium: false, premiumSource: null }) });
    const ctx = textCtx('/setup');
    await env.onboardingHandlers.setup(ctx);
    await press(env, 'onb|g|t|budget');
    await press(env, 'onb|g|n');
    await press(env, 'onb|p|a|15');
    expect(env.store.onboarding.step).toBe('i');
  });
});

describe('resume, restart and stale buttons', () => {
  test('/start mid-way shows the current question again (new message, old keyboard removed)', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|p|a|20');
    // «Рестарт»: новые экземпляры на тех же данных
    const fresh = build({ store: env.store });
    const ctx = textCtx('/start');
    await fresh.onboardingHandlers.start(ctx);
    expect(fresh.commandHandlers.start).not.toHaveBeenCalled();
    expect(ctx.reply.mock.calls[0][0]).toContain(t('ru', 'onb_q_input'));
    expect(ctx.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(1, 50, undefined, { inline_keyboard: [] });
    // Старая кнопка предыдущего шага продолжает с правильного места
    await press(fresh, 'onb|r|a|e');
    expect(fresh.store.reminder_hours).toEqual([21]);
    expect(fresh.store.onboarding.step).toBe('n');
  });

  test('/start without an active run is the usual /start', async () => {
    const env = build();
    await env.onboardingHandlers.start(textCtx('/start'));
    expect(env.commandHandlers.start).toHaveBeenCalled();
  });

  test('buttons of a finished run: alert, keyboard removed, nothing changed', async () => {
    const env = build({ store: createStore({ onboarding: { ...rules.newDraft('new'), status: 'completed' }, completedAt: new Date() }) });
    for (const data of ['onb|r|a|e', 'onb|g|t|save', 'onb|x', 'onb|o|c']) {
      const ctx = await press(env, data);
      expect(ctx.answerCbQuery).toHaveBeenCalledWith(t('ru', 'onb_stale'), { show_alert: true });
      expect(ctx.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [] });
    }
    expect(env.userService.setReminderHours).not.toHaveBeenCalled();
    expect(env.userService.saveOnboarding).not.toHaveBeenCalled();
    // Валюта из старого сообщения сохраняется (явный выбор), опрос не начинается заново
    await press(env, 'set_currency|USD|ob');
    expect(env.store.currency).toBe('USD');
    expect(env.store.onboarding.status).toBe('completed');
  });

  test('junk values and steps outside this run re-show the current question', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    for (const data of ['onb|g|t|zzz', 'onb|p|a|99', 'onb|r|a|zz', 'onb|b|s', 'onb|z|q']) {
      const ctx = await press(env, data);
      expect(ctx.answerCbQuery).toHaveBeenCalled();
    }
    expect(env.store.onboarding.goals).toEqual([]);
    expect(env.userService.setUserPeriodStartDay).not.toHaveBeenCalled();
  });

  test('someone who already records expenses gets «as usual», not «first expense»', async () => {
    const env = build({ store: createStore({ recorded: true, onboarding: { ...rules.newDraft('new'), status: 'completed' }, completedAt: new Date() }) });
    await env.onboardingHandlers.setup(textCtx('/setup'));
    const done = await press(env, 'onb|x');
    const finalText = done.editMessageText.mock.calls[0][0];
    expect(finalText).toContain(t('ru', 'onb_done_next_step'));
    expect(finalText).not.toContain(t('ru', 'onb_done_first_step'));
    expect(done.reply.mock.calls[0][0]).toBe(t('ru', 'onb_keyboard_note_short'));
  });

  test('/setup re-entry: existing user, previous goals pre-selected, no timezone question, Back → Settings', async () => {
    const previous = { ...rules.newDraft('new'), goals: ['debt'], status: 'completed' };
    const env = build({ store: createStore({ onboarding: previous, completedAt: new Date() }) });
    const ctx = textCtx('/setup');
    await env.onboardingHandlers.setup(ctx);
    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text).toContain('1/7');
    expect(buttons(extra.reply_markup.inline_keyboard).find((b) => b.callback_data === 'onb|g|t|debt').text).toMatch(/^✅/);
    expect(dataOf(extra)).toContain('settings');
    expect(env.funnelService.track).not.toHaveBeenCalledWith(1, 'onboarding_started');
    expect(env.store.onboarding).toMatchObject({ status: 'active', mode: 'setup' });
  });

  test('/setup by someone not in the DB yet is the usual /start (registration and language)', async () => {
    const env = build({ store: createStore({ exists: false }) });
    await env.onboardingHandlers.setup(textCtx('/setup'));
    expect(env.commandHandlers.start).toHaveBeenCalled();
  });
});

describe('expense text mid-onboarding', () => {
  function messageHandlers(env) {
    const expenseHandlers = { handleExpenseInput: jest.fn(async () => true) };
    const handlers = new MessageHandlers({
      userService: env.userService, localizationService, stateService: env.stateService,
      commandHandlers: env.commandHandlers, validator: new EnhancedValidator(), expenseHandlers,
      incomeHandlers: { handleIncomeInput: jest.fn() }, multiEntryHandlers: { handleText: jest.fn(async () => false) },
      onboardingHandlers: env.onboardingHandlers
    });
    return { handlers, expenseHandlers };
  }

  test('«250 кофе» while the budget question waits is recorded as an expense, the question keeps waiting', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|g|t|budget');
    await press(env, 'onb|g|n');
    await press(env, 'onb|o|p');
    await press(env, 'onb|p|a|1');
    expect(env.stateService.getUserState(1)).toBe('onb_budget');
    const { handlers, expenseHandlers } = messageHandlers(env);

    await handlers.handleExpense(textCtx('250 кофе'));
    expect(expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '250 кофе', 'ru');
    expect(env.budgetService.setBudget).not.toHaveBeenCalled();
    expect(env.stateService.getUserState(1)).toBe('onb_budget');

    // Выбор категории для этой траты состояние не сбрасывает, другая кнопка — сбрасывает
    const next = jest.fn();
    await stateCleanupMiddleware({ stateService: env.stateService })({ from: { id: 1 }, updateType: 'callback_query', callbackQuery: { data: 'category|3' } }, next);
    expect(env.stateService.getUserState(1)).toBe('onb_budget');

    await handlers.handleExpense(textCtx('45000'));
    expect(env.budgetService.setBudget).toHaveBeenCalledWith(1, null, 45000, 'RUB');
    expect(expenseHandlers.handleExpenseInput).toHaveBeenCalledTimes(1);

    await stateCleanupMiddleware({ stateService: env.stateService })({ from: { id: 1 }, updateType: 'callback_query', callbackQuery: { data: 'ov|0' } }, next);
    expect(env.stateService.getUserState(1)).toBeUndefined();
  });

  test('outside the budget question any expense text goes straight to the expense flow', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    const { handlers, expenseHandlers } = messageHandlers(env);
    await handlers.handleExpense(textCtx('250 кофе'));
    expect(expenseHandlers.handleExpenseInput).toHaveBeenCalled();
    expect(env.store.onboarding.step).toBe('g');
  });
});

describe('roast question reuses the gender and 18+ screens', () => {
  test('savage without 18+ confirmation → existing 18+ screen with origin o → saved, run finished', async () => {
    const env = build({ store: createStore({ roast: { level: 'off', gender: 'm', adultConfirmed: false } }) });
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|o|m');
    let screen = lastScreen(await press(env, 'rstl|savage|o'));
    expect(screen.text).toContain(t('ru', 'roast_adult_title'));
    expect(screen.data).toEqual(['rsty|o', 'rstl|spicy|o']);
    expect(env.roastService.setLevel).not.toHaveBeenCalled();
    await press(env, 'rsty|o');
    expect(env.store.roast).toMatchObject({ level: 'savage', adultConfirmed: true });
    expect(env.store.onboarding).toMatchObject({ status: 'completed', answers: { roast: 'savage' } });
  });

  test('«🙂 Обычный» saves off without asking gender', async () => {
    const env = build();
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await press(env, 'onb|o|m');
    await press(env, 'rstl|off|o');
    expect(env.roastService.setGender).not.toHaveBeenCalled();
    expect(env.store.onboarding.answers.roast).toBe('off');
  });

  test('settings origins are unchanged', () => {
    const env = build();
    expect(env.roastHandlers.backFor('s')).toBe('rst');
    expect(env.roastHandlers.backFor('m')).toBe('rsm');
    expect(env.roastHandlers.backFor('o')).toBe('onb|o|m');
  });
});

describe('all 13 locales', () => {
  const KEYS = Object.keys(require('../locales/ru')).filter((k) => k.startsWith('onb_')).concat(['command_setup', 'help_setup', 'button_onboarding_setup']);
  const stripPlaceholders = (s) => s.replace(/\{[a-zA-Z]+\}/g, '');
  const balanced = (s) => (s.match(/\*/g) || []).length % 2 === 0 && (s.match(/`/g) || []).length % 2 === 0;

  test.each(LANGS)('%s: every key translated, Markdown balanced', (lang) => {
    const locale = localizationService.supportedLanguages[lang].locale;
    for (const key of KEYS) {
      expect(typeof locale[key]).toBe('string');
      expect(balanced(stripPlaceholders(locale[key]))).toBe(true);
      expect(locale[key]).not.toMatch(/[_[\]]/);
    }
    expect(locale.command_setup.length).toBeLessThanOrEqual(40);
  });

  test.each(LANGS)('%s: every screen renders without placeholders, balanced Markdown, callback_data ≤ 64 bytes', async (lang) => {
    const env = build({ store: createStore({ language: lang }), voice: true, receipt: true });
    const screens = [];
    const collect = (ctx) => {
      const calls = [...(ctx.editMessageText ? ctx.editMessageText.mock.calls : []), ...ctx.reply.mock.calls];
      for (const [text, extra] of calls) screens.push({ text, extra });
    };
    const begin = callbackCtx(`set_language|${lang}|ob`);
    await env.onboardingHandlers.beginNew(begin, lang);
    collect(begin);
    for (const goal of rules.GOALS) collect(await press(env, `onb|g|t|${goal}`));
    collect(await press(env, 'onb|g|n'));
    collect(await press(env, 'onb|o|z'));
    collect(await press(env, 'onb|o|p'));
    collect(await press(env, 'onb|p|d'));
    collect(await press(env, 'onb|p|a|25'));
    const budget = textCtx('1');
    await env.onboardingHandlers.handleBudgetInput(budget, 'x1', lang);
    await env.onboardingHandlers.handleBudgetInput(budget, '1000', lang);
    collect(budget);
    for (const code of rules.INPUTS) collect(await press(env, `onb|i|t|${code}`));
    collect(await press(env, 'onb|i|n'));
    collect(await press(env, 'onb|r|a|e'));
    collect(await press(env, 'onb|n|t|daily'));
    collect(await press(env, 'onb|n|n'));
    collect(await press(env, 'rstl|spicy|o'));
    collect(await press(env, 'rstgs|x|spicy|o'));
    expect(env.store.onboarding.status).toBe('completed');
    expect(screens.length).toBeGreaterThan(15);
    for (const { text, extra } of screens) {
      expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(text).not.toMatch(/^onb_|\sonb_/); // ключ без перевода
      expect(text).not.toBe(t(lang, 'error'));
      if (extra && extra.parse_mode === 'Markdown') expect(balanced(text)).toBe(true);
      if (extra && extra.reply_markup && extra.reply_markup.inline_keyboard) {
        for (const b of buttons(extra.reply_markup.inline_keyboard)) {
          expect(Buffer.byteLength(b.callback_data)).toBeLessThanOrEqual(64);
          expect(b.text).not.toMatch(/^onb_|^button_/);
        }
      }
    }
  });
});

describe('routing', () => {
  let bot;
  let handlers;
  beforeEach(() => {
    bot = new Telegraf('123:TEST');
    bot.botInfo = { id: 1, is_bot: true, username: 'test_bot', first_name: 'Test' };
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async () => true);
    const any = () => {
      const fns = {};
      return new Proxy({}, { get: (target, name) => (fns[name] = fns[name] || jest.fn().mockResolvedValue(undefined)) });
    };
    handlers = {
      errorHandler: (fn) => fn,
      commandHandlers: any(), messageHandlers: any(), callbackHandlers: any(), onboardingHandlers: any(), roastHandlers: any(),
      stateService: new StateService(), localizationService,
      userService: { getUserLanguage: jest.fn().mockResolvedValue('en'), userRepository: { refreshProfile: jest.fn() } },
      enhancedValidator: new EnhancedValidator()
    };
    registerBotRoutes(bot, handlers);
  });
  afterEach(() => jest.restoreAllMocks());

  const from = { id: 1, is_bot: false, first_name: 'U' };
  const press = (data) => bot.handleUpdate({
    update_id: 1,
    callback_query: { id: 'q', data, chat_instance: 'c', from, message: { message_id: 10, date: 1, chat: { id: 1, type: 'private' } } }
  });
  const command = (text) => bot.handleUpdate({
    update_id: 2,
    message: { message_id: 11, date: 1, text, from, chat: { id: 1, type: 'private' }, entities: [{ type: 'bot_command', offset: 0, length: text.length }] }
  });

  test('onb| callbacks, /setup, /start and onb_setup go to the questionnaire', async () => {
    for (const data of ['onb|x', 'onb|o|g', 'onb|g|t|budget', 'onb|p|a|25', 'onb|r|a|me', 'onb|n|n', 'onb|m|s']) await press(data);
    expect(handlers.onboardingHandlers.handle).toHaveBeenCalledTimes(7);
    for (const data of ['onb|', 'onb|gg', 'onb|g|t|' + 'a'.repeat(11), 'onb|G|s']) await press(data);
    expect(handlers.onboardingHandlers.handle).toHaveBeenCalledTimes(7);
    await press('onb_setup');
    await command('/setup');
    await command('/start');
    expect(handlers.onboardingHandlers.setup).toHaveBeenCalledTimes(2);
    expect(handlers.onboardingHandlers.start).toHaveBeenCalledTimes(1);
  });

  test('currency |ob goes to the questionnaire, plain set_currency to Settings; roast origin o is routed', async () => {
    await press('set_currency|EUR|ob');
    expect(handlers.onboardingHandlers.answerCurrency).toHaveBeenCalledWith(expect.anything(), 'EUR');
    await press('ob_currency');
    expect(handlers.onboardingHandlers.openCurrency).toHaveBeenCalled();
    for (const data of ['rstl|spicy|o', 'rstgs|f|spicy|o', 'rsty|o', 'rstg|o']) await press(data);
    expect(handlers.roastHandlers.chooseLevel).toHaveBeenCalledTimes(1);
    expect(handlers.roastHandlers.setGender).toHaveBeenCalledTimes(1);
    expect(handlers.roastHandlers.confirmAdult).toHaveBeenCalledTimes(1);
    expect(handlers.roastHandlers.showGender).toHaveBeenCalledWith(expect.anything(), { origin: 'o' });
  });
});

// Fix E: «Пропустить всё» не оставляет пояс UTC и 3 напоминания в день по UTC
describe('skip all: timezone and reminders are not left at UTC', () => {
  test('ru: timezone guessed from language, one evening reminder; skip all finishes at once, the time question is optional', async () => {
    const env = build({ store: createStore({ premium: false }) });
    const { store } = env;
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    expect(store.timezone).toBe('Europe/Moscow');
    expect(store.reminder_hours).toEqual([21]);
    expect(store.reminder_enabled).toBe(true);

    const ctx = await press(env, 'onb|x');
    expect(store.completedAt).not.toBeNull();
    expect(store.onboarding.status).toBe('skipped');
    const summary = ctx.editMessageText.mock.calls[0][0];
    expect(summary).toContain(t('ru', 'onb_done_timezone_guess', { timezone: 'Europe/Moscow (UTC+3)' }));
    expect(summary).toContain(t('ru', 'onb_done_reminders', { hours: '21:00' }));
    expect(ctx.reply.mock.calls[0][1].reply_markup.keyboard).toEqual([['MAIN']]);
    expect(ctx.reply.mock.calls[1][0]).toBe(t('ru', 'onb_q_timezone_last', { timezone: 'Europe/Moscow (UTC+3)' }));

    // /start после этого — обычный, а не снова вопрос о времени
    await env.onboardingHandlers.start(textCtx('/start'));
    expect(env.commandHandlers.start).toHaveBeenCalledTimes(1);
  });

  test('en: reminders stay off until the time is known; a later answer to the time question turns the evening one on', async () => {
    const env = build({ store: createStore({ language: 'en', premium: false }) });
    const { store } = env;
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|en|ob'), 'en');
    expect(store.timezone).toBe('UTC');
    expect(store.reminder_enabled).toBe(false);

    await press(env, 'onb|x');
    expect(store.onboarding.status).toBe('skipped');
    expect(store.reminder_enabled).toBe(false);
    expect(store.onboarding.lastCall).toBe(true);

    // Переключатель минут на необязательном вопросе работает и после конца опроса
    const toggle = callbackCtx('tzh|1|ob');
    await env.onboardingHandlers.showTimezone(toggle, true);
    expect(lastScreen(toggle).data.some((d) => /^time\|\d+\|\d+\|h\|ob$/.test(d))).toBe(true);

    // Ответ позже: пояс сохранён обработчиком time|…|ob, напоминание включается, сообщение говорит что настроено
    store.timezone = 'Etc/GMT+5';
    const ctx = callbackCtx('time|9|0|ob');
    await env.onboardingHandlers.afterTimezone(ctx, 'Etc/GMT+5');
    expect(store.reminder_enabled).toBe(true);
    expect(store.reminder_hours).toEqual([21]);
    expect(store.onboarding.answers.timezone).toBe('Etc/GMT+5');
    const { text, data } = lastScreen(ctx);
    expect(text).toContain(t('en', 'onb_done_timezone', { timezone: 'UTC-5' }));
    expect(text).toContain(t('en', 'onb_done_reminders', { hours: '21:00' }));
    expect(data).toEqual([]);
  });

  test('an old questionnaire stuck on the last time question is finished by /start', async () => {
    const env = build({ store: createStore({ language: 'en', premium: false }) });
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|en|ob'), 'en');
    env.store.onboarding = { ...env.store.onboarding, lastCall: true, step: 'z' };
    const ctx = textCtx('/start');
    ctx.editMessageText = jest.fn(async () => ({}));
    await env.onboardingHandlers.start(ctx);
    expect(env.store.onboarding.status).toBe('skipped');
    expect(env.commandHandlers.start).not.toHaveBeenCalled();
    expect(ctx.reply.mock.calls.some(([, extra]) => extra && extra.reply_markup && extra.reply_markup.keyboard)).toBe(true);
  });

  test('an explicit reminders answer is kept; changing the language moves the guessed timezone', async () => {
    const env = build({ store: createStore({ premium: false }) });
    const { store } = env;
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|jp|ob'), 'jp');
    expect(store.timezone).toBe('Asia/Tokyo');
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|en|ob'), 'en');
    expect(store.timezone).toBe('UTC');
    expect(store.reminder_enabled).toBe(false);
    await env.onboardingHandlers.beginNew(callbackCtx('set_language|ru|ob'), 'ru');
    const draft = await env.onboardingService.getActive(1);
    await env.onboardingService.answerReminders(1, draft, 'no');
    await env.onboardingService.finish(1, draft, 'skipped', { language: 'ru' });
    expect(store.reminder_enabled).toBe(false);
  });

  test('budget question: text without digits and a huge amount get their own hints', async () => {
    const env = build({ store: createStore({ currency: 'USD' }) });
    env.store.onboarding = { ...rules.newDraft('new', { budgetAllowed: true }), goals: ['budget'], step: 'b' };
    const words = textCtx('abc');
    expect(await env.onboardingHandlers.handleBudgetInput(words, 'abc', 'ru')).toBe(true);
    expect(words.reply.mock.calls[0][0]).toBe(t('ru', 'onb_budget_need_number', { example: '30000 USD' }));
    const huge = textCtx('999999999999');
    expect(await env.onboardingHandlers.handleBudgetInput(huge, '999999999999', 'ru')).toBe(true);
    expect(huge.reply.mock.calls[0][0]).toMatch(/^❌/);
    expect(huge.reply.mock.calls[0][0]).not.toBe(t('ru', 'onb_budget_invalid'));
    // Трата «250 кофе» — как обычно
    expect(await env.onboardingHandlers.handleBudgetInput(textCtx('250 кофе'), '250 кофе', 'ru')).toBe(false);
  });

  test('roast question: no «uncensored» outside ru/en; enabling in the questionnaire shows a sample', async () => {
    const env = build({ store: createStore({ language: 'de', premium: false }) });
    env.store.onboarding = { ...rules.newDraft('setup'), step: 'm' };
    const ctx = await press(env, 'onb|o|m');
    const screen = lastScreen(ctx);
    expect(screen.data).not.toContain('rstl|savage|o');
    expect(screen.text).toContain(t('de', 'onb_q_roast_spicy_only').split('\n')[1]);
    env.store.roast.gender = 'm';
    const done = await press(env, 'rstl|spicy|o');
    expect(lastScreen(done).text).toContain(t('de', 'roast_enabled_sample', { sample: '😈 sample spicy' }));
  });
});
