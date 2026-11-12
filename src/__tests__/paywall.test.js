// Путь к оплате: закрытая функция ведёт к тарифам (premiumGate), подтверждение оплаты с датой, конец пробного периода
// с личным итогом и ценой, одно сообщение о превышенном бюджете без премиума, шаги воронки. Без БД: сервисы — моки.
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const StateService = require('../services/StateService');
const CallbackHandlers = require('../handlers/callbacks');
const MessageHandlers = require('../handlers/messages');
const ExpenseHandlers = require('../handlers/ExpenseHandlers');
const AdminHandlers = require('../handlers/AdminHandlers');
const PremiumLifecycleService = require('../services/PremiumLifecycleService');
const PaymentService = require('../services/PaymentService');
const FunnelService = require('../services/FunnelService');
const registerBotRoutes = require('../botRoutes');

const localizationService = new LocalizationService();
const t = (key, params) => localizationService.getText('ru', key, params);
const formatter = new Formatter({ convert: async (amount) => Number(amount) });
const USER = 7778300042;

const callbackCtx = (data) => ({
  from: { id: USER },
  callbackQuery: { data, message: { message_id: 5 } },
  answerCbQuery: jest.fn(async () => true),
  editMessageText: jest.fn(async () => true),
  reply: jest.fn(async () => true)
});
const shown = (ctx) => {
  const [text, extra] = ((ctx.editMessageText && ctx.editMessageText.mock.calls[0]) || ctx.reply.mock.calls[0]);
  return { text, buttons: extra.reply_markup.inline_keyboard.map(row => row.map(b => b.callback_data)) };
};

describe('premium gate instead of a bare «only for premium»', () => {
  function callbacks(premium = false) {
    return new CallbackHandlers({
      premiumService: { isPremiumUser: jest.fn(async () => premium) },
      userService: { getUserLanguage: async () => 'ru' },
      familyService: { getUserFamily: jest.fn(async () => null) },
      categoryService: { getUserCategories: jest.fn(async () => []) },
      stateService: new StateService(),
      localizationService,
      formatter
    });
  }

  test.each([
    ['handleFamilyCreate', 'family_create'],
    ['handleFamilyJoin', 'family_join'],
    ['handleFamilyInvite', 'family_invite'],
    ['handleFamilyMembers', 'family_members'],
    ['handleFamilyAddExpense', 'family_add_expense'],
    ['handleFamilyDelete', 'family_delete']
  ])('%s: what the family gives and «⭐️ Премиум», back to the menu', async (method, data) => {
    const handlers = callbacks();
    const ctx = callbackCtx(data);
    await handlers[method](ctx);
    expect(shown(ctx)).toEqual({ text: t('premium_gate_family', { stars: 249, max: 5 }), buttons: [['premium_subscription'], ['back_to_menu']] });
    expect(ctx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard[0][0].text).toBe(t('button_premium'));
    expect(handlers.stateService.getUserState(USER)).toBeFalsy();
    expect(handlers.familyService.getUserFamily).not.toHaveBeenCalled();
  });

  test.each(['handleCustomCategoriesMenu', 'handleCustomCategoriesAdd', 'handleCustomCategoriesManage'])('%s: custom categories gate, back to settings', async (method) => {
    const handlers = callbacks();
    const ctx = callbackCtx('custom_categories');
    await handlers[method](ctx);
    expect(shown(ctx)).toEqual({ text: t('premium_gate_categories', { max: 5 }), buttons: [['premium_subscription'], ['back_to_settings']] });
    expect(handlers.categoryService.getUserCategories).not.toHaveBeenCalled();
  });

  test('premium users get the screen itself', async () => {
    const handlers = callbacks(true);
    const ctx = callbackCtx('custom_categories');
    await handlers.handleCustomCategoriesMenu(ctx);
    expect(ctx.editMessageText.mock.calls[0][0]).not.toBe(t('premium_gate_categories', { max: 5 }));
  });

  test('old «Семейная трата» keyboard button after premium ended: gate as a new message', async () => {
    const messages = new MessageHandlers({
      premiumService: { isPremiumUser: async () => false },
      familyService: { getUserFamily: jest.fn() },
      stateService: new StateService(),
      localizationService
    });
    const ctx = { from: { id: USER }, reply: jest.fn(async () => true) };
    await messages.startFamilyExpense(ctx, 'ru');
    expect(shown(ctx)).toEqual({ text: t('premium_gate_family', { stars: 249, max: 5 }), buttons: [['premium_subscription'], ['back_to_menu']] });
  });

  test('a custom category typed after premium ended: gate, the input state is dropped', async () => {
    const stateService = new StateService();
    stateService.setUserState(USER, 'adding_custom_category');
    const error = Object.assign(new Error('premium_required'), { code: 'PREMIUM_REQUIRED' });
    const messages = new MessageHandlers({
      categoryService: { createUserCategory: jest.fn(async () => { throw error; }) },
      userService: { getUserLanguage: async () => 'ru' },
      stateService,
      localizationService
    });
    const ctx = { from: { id: USER }, reply: jest.fn(async () => true) };
    await messages.handleAddCustomCategory(ctx, '🐱 Кот', 'ru');
    expect(shown(ctx)).toEqual({ text: t('premium_gate_categories', { max: 5 }), buttons: [['premium_subscription'], ['back_to_settings']] });
    expect(stateService.getUserState(USER)).toBeFalsy();
  });

  test('«to the family budget» on an old record card: gate with «Back» to the same card', async () => {
    const expenseHandlers = new ExpenseHandlers({
      premiumService: { isPremiumUser: async () => false },
      userService: { getUserLanguage: async () => 'ru' },
      expenseService: { getExpenseById: jest.fn() },
      localizationService,
      formatter
    });
    const ctx = { ...callbackCtx('xf|42|n'), match: ['xf|42|n', '42', 'n'] };
    await expenseHandlers.handleFamilyToggle(ctx, true);
    expect(shown(ctx).buttons).toEqual([['premium_subscription'], ['ex|42|n']]);
    expect(expenseHandlers.expenseService.getExpenseById).not.toHaveBeenCalled();
  });
});

describe('«How to buy Stars»', () => {
  test('from the subscription screen and from the plans: back to where it was opened', async () => {
    const handlers = new CallbackHandlers({ userService: { getUserLanguage: async () => 'ru' }, localizationService });
    for (const [data, back] of [['premium_stars_help', 'premium_subscription'], ['premium_stars_help|t', 'premium_tariffs']]) {
      const ctx = callbackCtx(data);
      await handlers.handlePremiumStarsHelp(ctx);
      expect(shown(ctx)).toEqual({ text: t('premium_stars_help_text'), buttons: [[back]] });
    }
    expect(t('premium_stars_help_text')).toContain('@PremiumBot');
  });
});

describe('payment confirmation', () => {
  // botRoutes целиком: обработчик successful_payment, остальное — заглушки
  function routes(handlers) {
    const listeners = {};
    const stub = new Proxy(function () {}, { get: (target, key) => (key === 'then' ? undefined : stub), apply: () => stub });
    const bot = new Proxy({}, { get: (target, key) => (key === 'on' ? (event, fn) => { listeners[event] = fn; } : () => {}) });
    const all = new Proxy({ errorHandler: (fn) => fn, ...handlers }, { get: (target, key) => (key in target ? target[key] : stub) });
    registerBotRoutes(bot, all);
    return listeners;
  }

  test('says until which date premium is active and offers to set a budget', async () => {
    const newExpiryDate = new Date('2027-11-13T10:00:00Z');
    const listeners = routes({
      paymentService: { handleSuccessfulPayment: jest.fn(async () => ({ type: 'premium_subscription', isRenewal: false, isNewActivation: true, newExpiryDate })) },
      userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Europe/Moscow' },
      localizationService,
      formatter
    });
    const ctx = { from: { id: USER }, message: { successful_payment: { invoice_payload: '{}' } }, reply: jest.fn(async () => true) };
    await listeners.successful_payment(ctx);
    const [text, extra] = ctx.reply.mock.calls[0];
    const date = formatter.formatDate(newExpiryDate, 'Europe/Moscow');
    expect(text).toBe(t('payment_success', { date }));
    expect(text).toContain(date);
    expect(extra.reply_markup.inline_keyboard).toEqual([[{ text: t('button_budgets'), callback_data: 'bg_menu' }]]);
  });
});

describe('end of the trial: personal summary, price and plan buttons', () => {
  const now = new Date('2026-10-27T12:00:00Z');
  const hoursFromNow = (h) => new Date(now.getTime() + h * 3600 * 1000);

  function lifecycle(candidate, { categoryRows = [], budgets = [] } = {}) {
    const sent = [];
    const deps = {
      expenseService: { getCategoryTotals: jest.fn(async () => categoryRows) },
      budgetService: { list: jest.fn(async () => budgets) },
      paymentService: { createInvoiceLink: jest.fn(async (userId, tariff) => `https://t.me/$inv${tariff.duration}`) },
      funnelService: { track: jest.fn(async () => {}) }
    };
    const service = new PremiumLifecycleService(
      { getPremiumLifecycleCandidates: async () => [candidate], markSent: async () => true },
      { sendMessage: jest.fn(async (id, text, extra) => { sent.push({ text, extra }); }) },
      localizationService,
      formatter,
      null,
      deps
    );
    return { service, sent, deps };
  }
  const base = { id: USER, language: 'ru', timezone: 'Europe/Moscow', has_active_subscription: false, last_refund_at: null, premium_source: 'trial' };
  const food = [
    { name: 'Еда', icon: '🍕', currency: 'RUB', count: 9 },
    { name: 'Еда', icon: '🍕', currency: 'USD', count: 3 },
    { name: 'Транспорт', icon: '🚗', currency: 'RUB', count: 5 }
  ];

  test('two days before: records, the most frequent category, budgets, price; year and month invoice links', async () => {
    const { service, sent, deps } = lifecycle({ ...base, premium_expires_at: hoursFromNow(30) }, { categoryRows: food, budgets: [{ id: 1 }, { id: 2 }] });
    await service.processDue(now);
    const [{ text, extra }] = sent;
    expect(text).toContain(t('premium_trial_summary_records', { count: 17 }));
    const foodName = formatter.escapeMarkdown(formatter.translateCategoryName('Еда', localizationService, 'ru'));
    expect(text).toContain(t('premium_trial_summary_top', { category: `🍕 ${foodName}` }));
    expect(text).toContain(t('premium_trial_summary_budgets', { count: 2 }));
    expect(text).toContain(t('premium_trial_price', { month: 149, year: 999, perMonth: 83, percent: 44 }));
    expect(text.startsWith(t('premium_expiring_trial', { date: formatter.formatDate(hoursFromNow(30), 'Europe/Moscow') }))).toBe(true);
    expect(extra.reply_markup.inline_keyboard).toEqual([
      [{ text: t('premium_pay_year', { stars: 999, percent: 44 }), url: 'https://t.me/$inv365' }],
      [{ text: t('premium_pay_month', { stars: 149 }), url: 'https://t.me/$inv30' }],
      [{ text: t('premium_tariff_button'), callback_data: 'premium_tariffs' }]
    ]);
    // Ссылки из рассылки — не шаг воронки «счёт»; «пробный закончился» — только после конца
    expect(deps.paymentService.createInvoiceLink.mock.calls.map(call => call[3])).toEqual([{ track: false }, { track: false }]);
    expect(deps.funnelService.track).not.toHaveBeenCalled();
  });

  test('after the end: trial_ended is recorded; nothing recorded — no summary, the price stays', async () => {
    const { service, sent, deps } = lifecycle({ ...base, premium_expires_at: hoursFromNow(-2) });
    await service.processDue(now);
    expect(deps.funnelService.track).toHaveBeenCalledWith(USER, 'trial_ended');
    expect(sent[0].text).not.toContain(t('premium_trial_summary_title', { days: 14 }));
    expect(sent[0].text).toContain(t('premium_trial_price', { month: 149, year: 999, perMonth: 83, percent: 44 }));
  });

  test('paid premium ending: the usual short text, no trial summary and no trial_ended', async () => {
    const { service, sent, deps } = lifecycle({ ...base, premium_source: 'paid', premium_expires_at: hoursFromNow(-2) }, { categoryRows: food });
    await service.processDue(now);
    expect(sent[0].text).toBe(t('premium_expired_paid', { date: formatter.formatDate(hoursFromNow(-2), 'Europe/Moscow') }));
    expect(sent[0].extra.reply_markup.inline_keyboard).toEqual([[{ text: t('button_view_tariffs'), callback_data: 'premium_tariffs' }]]);
    expect(deps.funnelService.track).not.toHaveBeenCalled();
    expect(deps.paymentService.createInvoiceLink).not.toHaveBeenCalled();
  });
});

describe('budget exceeded after the trial', () => {
  test('the one notice comes with «⭐️ Премиум» instead of «Бюджеты»', async () => {
    const locked = { id: 1, locked: true, level: 100 };
    const expenseHandlers = new ExpenseHandlers({
      budgetService: { checkAfterExpense: jest.fn(async () => [locked]), warningText: jest.fn(() => 'notice') },
      localizationService,
      formatter
    });
    const ctx = { from: { id: USER }, reply: jest.fn(async () => true) };
    await expenseHandlers.sendBudgetWarnings(ctx, USER, 'ru', 'Еда');
    expect(ctx.reply.mock.calls[0][1].reply_markup.inline_keyboard).toEqual([[{ text: t('button_premium'), callback_data: 'premium_subscription' }]]);
  });
});

describe('funnel steps', () => {
  test('invoice_created and trial_ended are known steps', () => {
    const service = new FunnelService({ track: jest.fn(async () => {}) });
    return Promise.all(['invoice_created', 'trial_ended'].map(event => expect(service.track(USER, event)).resolves.toBeUndefined()));
  });

  test('a premium invoice link records invoice_created, a link from a broadcast does not', async () => {
    const funnelService = { track: jest.fn(async () => {}) };
    const service = new PaymentService(null, localizationService, funnelService, null, null);
    service.requestInvoiceLink = jest.fn(async () => 'https://t.me/$inv');
    const { PREMIUM_TARIFFS } = require('../utils/constants');
    await service.createInvoiceLink(USER, PREMIUM_TARIFFS.MONTH_12, 'ru', { track: false });
    expect(funnelService.track).not.toHaveBeenCalled();
    await service.createInvoiceLink(USER, PREMIUM_TARIFFS.MONTH_12, 'ru');
    expect(funnelService.track).toHaveBeenCalledWith(USER, 'invoice_created');
  });

  test('the admin funnel shows the invoice and trial-ended steps after the paywall', async () => {
    const row = { source: '', registered: 10, trial_started: 10, onboarded: 8, first_expense: 6, returned_week2: 3, paywall_viewed: 5, tariffs_viewed: 4, invoice_created: 3, trial_ended: 7, paid: 1, stars: 999 };
    const admin = new AdminHandlers({ isUserAdmin: async () => true }, {}, localizationService, formatter, new StateService(), { getReport: async () => [row] }, {});
    const ctx = { from: { id: USER }, reply: jest.fn(async () => true) };
    await admin.showFunnel(ctx, 30);
    const [text] = ctx.reply.mock.calls[0];
    const line = text.split('\n').find(l => l.includes('смотрели премиум 5'));
    expect(line).toMatch(/смотрели премиум 5 · тарифы 4 · ссылка на счёт 3 · пробный закончился 7 · оплатили 1/);
    expect(text).toContain('пробный выдан 10');
  });

  // Mini App «⭐️ Премиум»: только модуль api/premium.js на express-роутере, контекст запроса — заглушка
  async function miniAppPremium({ isPremium, source }) {
    const express = require('express');
    const request = require('supertest');
    const http = require('../miniapp/http');
    const track = jest.fn(async () => {});
    const services = {
      premiumService: { getLimitsInfo: async () => ({ isPremium, personalActive: isPremium, premiumExpiresAt: isPremium ? new Date('2026-11-27T00:00:00Z') : null, daysRemaining: 14 }) },
      userService: { getActiveRecurringSubscription: async () => null },
      referralService: { getPremiumSource: async () => source, getStats: async () => null },
      expenseService: { getTotals: async () => ({ count: 3 }) },
      familyPremiumService: { getOwnerStatus: async () => ({ isOwner: false, planActive: false }) },
      funnelService: { track }
    };
    const app = express();
    const router = express.Router();
    require('../miniapp/api/premium')(router, { get: (name) => services[name], http });
    app.use((req, res, next) => { req.userId = USER; req.ctx = async () => ({ timezone: 'UTC', lang: 'ru', currency: 'RUB' }); next(); });
    app.use('/api', router);
    await request(app).get('/api/premium').expect(200);
    return track;
  }

  test('Mini App premium screen: paywall_viewed without premium and on the trial, not for paid premium', async () => {
    expect(await miniAppPremium({ isPremium: false, source: null })).toHaveBeenCalledWith(USER, 'paywall_viewed');
    expect(await miniAppPremium({ isPremium: true, source: 'trial' })).toHaveBeenCalledWith(USER, 'paywall_viewed');
    expect(await miniAppPremium({ isPremium: true, source: 'paid' })).not.toHaveBeenCalled();
  });
});
