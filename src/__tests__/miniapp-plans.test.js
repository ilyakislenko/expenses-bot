// Mini App «Планы» и бюджеты: API поверх тех же сервисов, что у бота (PlanningService, SubscriptionAlertService,
// BudgetService) — доступ только своему, проверка ввода, премиум 402, семья, «Как считаю», отметки подписок.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const SubscriptionAlertService = require('../services/SubscriptionAlertService');
const Formatter = require('../utils/formatter');
const { USER_LIMITS } = require('../utils/constants');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const TODAY = '2026-11-08';
const PERIOD = { start: '2026-11-01', end: '2026-12-01', last: '2026-11-30' };
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' }) }, TOKEN)}`;

const netflix = { kind: 'detected', id: 'aaaaaaaaaa', ref: 'r-netflix', key: 'netflix', label: 'Netflix', amount: 799, currency: 'RUB', cadence: 'monthly', day: 10, nextDate: '2026-11-10', confirmed: false, known: true, alert: null, monthlyMain: 799 };
const gym = { kind: 'recurring', id: 'bbbbbbbbbb', ref: 'r-gym', key: 'абонемент', label: 'Абонемент', amount: 5000, currency: 'RUB', cadence: 'monthly', day: 22, nextDate: '2026-11-22', confirmed: true, known: false, recurringId: 4, alert: { state: 'muted' }, monthlyMain: 5000 };
const sbol = { kind: 'detected', id: 'cccccccccc', ref: 'r-sbol', key: 'sbol', label: 'SBOL', amount: 15000, currency: 'RUB', cadence: 'monthly', day: 10, nextDate: '2026-10-27', confirmed: false, known: false, alert: null, monthlyMain: 15000 };
const hidden = { ...netflix, id: 'dddddddddd', ref: 'r-hidden', label: 'Okko', monthlyMain: 399 };

function allowance(overrides = {}) {
  return {
    mode: 'income', currency: 'RUB', today: TODAY, period: PERIOD, daysLeft: 23, days: 23, family: false,
    daily: 3800, rawDaily: 3800, capped: false, cap: 7600, spentToday: 1369.97, leftToday: 2430.03, pace: 'good', deficit: 0,
    free: 87414.85, pool: 190000, budgetFree: null, limitedBy: null, budget: null,
    outlook: { income: 200000, recorded: 100000, upcoming: 100000, upcomingList: [{ date: '2026-11-20', stream: { label: 'Зарплата', amount: 100000 } }], average: 150000, averagePeriods: 3 },
    spentBefore: 24335.15, bills: 38250, budgetBills: 27000, reserveUntil: '2026-12-05',
    billsList: [{ id: 1, description: 'аренда', amount: 20000, currency: 'RUB', date: '2026-11-10' }, { ...netflix, date: '2026-11-10' }],
    debtsTotal: 0, budgetDebts: 0, debtsProrated: false, savings: 10000,
    ...overrides
  };
}

function setup({ isPremium = true, family = false, statuses = null, trials = [], trialLimitOk = true } = {}) {
  const budgetStatuses = statuses || [
    { id: 1, category_name: null, amount: 150000, currency: 'RUB', icon: null, spent: 25705.12, limit: 150000, ratio: 0.17136 },
    { id: 2, category_name: 'Еда', amount: 200, currency: 'USD', icon: '🍕', spent: 22000, limit: 20000, ratio: 1.1 }
  ];
  const subs = { currency: 'RUB', today: TODAY, isPremium, all: [sbol, gym, netflix, hidden], shown: isPremium ? [sbol, gym, netflix, hidden] : [sbol, gym, netflix], dismissed: 2, hiddenCount: isPremium ? 0 : 1, hiddenMonthly: isPremium ? 0 : 399, totalMonthly: 21198, visible: [sbol, netflix] };
  const trialRows = trials;
  const services = {
    localizationService: new LocalizationService(),
    formatter: new Formatter(),
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Asia/Bangkok', getUserPeriodStartDay: async () => 1
    },
    premiumService: { isPremiumUser: async () => isPremium },
    achievementService: { track: jest.fn(async () => '🏆 *Новое достижение*: Бюджетник') },
    expenseService: {
      getPeriodContext: jest.fn(async () => ({ timezone: 'Asia/Bangkok', currency: 'RUB', startDay: 1, today: TODAY, period: PERIOD })),
      getCategories: jest.fn(async () => [{ id: 13, name: 'Еда', icon: '🍕' }, { id: 14, name: 'Транспорт', icon: '🚗' }])
    },
    budgetService: {
      scopeFor: jest.fn(async (id) => (family ? { familyId: 7 } : id)),
      getStatus: jest.fn(async () => budgetStatuses),
      setBudget: jest.fn(async () => ({ id: 9 })),
      deleteBudget: jest.fn(async (userId, id) => budgetStatuses.some(s => s.id === id))
    },
    planningService: {
      getSubscriptions: jest.fn(async () => subs),
      getAllowance: jest.fn(async () => allowance()),
      getCalendar: jest.fn(async () => ({
        today: TODAY, until: '2026-12-08', currency: 'RUB', outTotal: 26000, inTotal: 100000, remindersOn: false,
        items: [
          { date: TODAY, kind: 'recurring', label: 'Клод', amount: 8500, currency: 'RUB', paid: true, ref: 5 },
          { date: '2026-11-10', kind: 'recurring', label: 'аренда', amount: 20000, currency: 'RUB', paid: false, ref: 1 },
          { date: '2026-11-10', kind: 'subscription', label: 'Netflix', amount: 799, currency: 'RUB', paid: false, ref: netflix.id },
          { date: '2026-11-20', kind: 'income', label: 'Зарплата', amount: 100000, currency: 'RUB', ref: 'зарплата' },
          { date: '2026-11-25', kind: 'debt', label: 'Ипотека', amount: 5201, currency: 'RUB', ref: 3 }
        ],
        undated: [{ kind: 'debt', label: 'Карта', amount: 3000, currency: 'RUB', ref: 8 }],
        debts: [
          { id: 3, name: 'Ипотека', balance: 900000, currency: 'RUB', monthly_payment: 5201, due_day: 25 },
          { id: 8, name: 'Карта', balance: 20000, currency: 'RUB', monthly_payment: 3000, due_day: null },
          { id: 9, name: 'Закрытый', balance: 0, currency: 'RUB', monthly_payment: 1000, due_day: 5 }
        ]
      })),
      getInflation: jest.fn(async () => ({
        purchases: 86, currency: 'RUB', today: TODAY, isPremium, itemsLimit: isPremium ? 10 : 1,
        items: [{ name: 'Лук', oldPrice: 33.99, newPrice: 39.99, change: 0.1765, firstDate: '2026-11-01', lastDate: '2026-11-08' }, { name: 'Молоко', oldPrice: 100, newPrice: 90, change: -0.1, firstDate: '2026-10-20', lastDate: '2026-11-05' }],
        risers: [{ name: 'Лук', oldPrice: 33.99, newPrice: 39.99, change: 0.1765, firstDate: '2026-11-01', lastDate: '2026-11-08' }],
        fallers: [{ name: 'Молоко', oldPrice: 100, newPrice: 90, change: -0.1, firstDate: '2026-10-20', lastDate: '2026-11-05' }],
        basket: { change: 0.031, count: 2, since: '2026-10-20' }
      })),
      limits: jest.fn(async () => ({ isPremium, limits: isPremium ? USER_LIMITS.premium : USER_LIMITS.regular })),
      setDueDay: jest.fn(async (userId, id, day) => (id === 3 ? { id: 3, name: 'Ипотека', due_day: day } : null)),
      isBillRemindersEnabled: jest.fn(async () => true),
      setBillRemindersEnabled: jest.fn(async () => {}),
      confirmSubscription: jest.fn(async (userId, id) => (id === netflix.id ? { converted: true, sub: netflix, day: 10, recurring: { id: 11 } } : id === sbol.id ? { error: 'recurring_limit' } : { error: 'outdated' })),
      dismissSubscription: jest.fn(async (userId, id) => (id === netflix.id ? { sub: netflix } : { error: 'outdated' })),
      restoreDismissed: jest.fn(async () => 2),
      recurringExpenseService: { getMaxPerUser: () => 30 }
    },
    subscriptionAlertService: {
      getSettings: jest.fn(async () => ({ enabled: true, days: 2 })),
      setWarnEnabled: jest.fn(async (userId, value) => value),
      setWarnDays: jest.fn(async (userId, days) => ([1, 2, 3, 7].includes(days) ? days : null)),
      getTrials: jest.fn(async () => trialRows),
      canAddTrial: jest.fn(async () => ({ ok: trialLimitOk, max: isPremium ? Infinity : 1 })),
      today: jest.fn(async () => TODAY),
      getTrial: jest.fn(async (userId, id) => (userId === ME ? trialRows.find(t => t.id === id) || null : null)),
      deleteTrial: jest.fn(async (userId, id) => userId === ME && trialRows.some(t => t.id === id)),
      addTrial: jest.fn(async (userId, input) => (trialLimitOk
        ? { trial: { id: 5, name: input.name, end_date: input.endDate, amount: input.amount, currency: input.currency, state: 'active' }, today: TODAY }
        : { error: 'limit' })),
      keep: jest.fn(async () => ({})),
      cancel: jest.fn(async () => ({})),
      mute: jest.fn(async () => ({})),
      unmute: jest.fn(async (userId, ref) => (ref === 'r-gone' ? null : {})),
      cancelGuideInfo: jest.fn((target) => ({ service: null, apple: 'https://apps.apple.com/account/subscriptions', google: null, generic: true, recurringId: target.recurringId || null }))
    }
  };
  const get = jest.fn((name) => services[name]);
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get }).app, services };
}

describe('plans hub and allowance', () => {
  test('only with a Telegram signature', async () => {
    const { app, services } = setup();
    await request(app).get('/api/plans').expect(401);
    await request(app).get('/api/budgets').expect(401);
    expect(services.planningService.getSubscriptions).not.toHaveBeenCalled();
  });

  test('hub: allowance, next unpaid payments without income, subscriptions, budgets — subscriptions searched once', async () => {
    const { app, services } = setup();
    const res = await request(app).get('/api/plans').set('Authorization', auth()).expect(200);
    expect(services.planningService.getSubscriptions).toHaveBeenCalledTimes(1);
    const subs = await services.planningService.getSubscriptions.mock.results[0].value;
    expect(services.planningService.getAllowance).toHaveBeenCalledWith(ME, { subs });
    expect(services.planningService.getCalendar).toHaveBeenCalledWith(ME, { subs });
    expect(res.body.allowance).toMatchObject({ mode: 'income', daily: 3800, pace: 'good' });
    expect(res.body.next.map(i => i.label)).toEqual(['аренда', 'Netflix', 'Ипотека']);
    expect(res.body.payments).toBe(3);
    expect(res.body.subscriptions).toEqual({ count: 4, monthly: 21198 });
    expect(res.body.inflation).toEqual({ state: 'ok', change: 0.031, since: '2026-10-20' });
    expect(res.body.budgets).toMatchObject({ family: false, items: [{ id: 1, total: true }, { id: 2, total: false, category: { name: 'Еда', icon: '🍕' }, left: -2000 }] });
  });

  test('hub without premium: no budgets, inflation is locked', async () => {
    const { app, services } = setup({ isPremium: false });
    const res = await request(app).get('/api/plans').set('Authorization', auth()).expect(200);
    expect(res.body.budgets).toBeNull();
    expect(res.body.inflation.state).toBe('locked');
    expect(services.budgetService.getStatus).not.toHaveBeenCalled();
  });

  test('«how I count»: income parts, reserve until the next income, budget-only payments, savings', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/plans/allowance').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({
      mode: 'income', period: { start: '2026-11-01', last: '2026-11-30' }, spent: 24335.15, savings: 10000, free: 87414.85,
      income: { total: 200000, recorded: 100000, upcoming: 100000, expected: [{ date: '2026-11-20', label: 'Зарплата', amount: 100000 }], usesAverage: false },
      bills: { total: 38250, until: '2026-12-05', items: [{ kind: 'recurring', label: 'аренда' }, { kind: 'subscription', label: 'Netflix' }] },
      budgetBills: 27000, debts: { total: 0, prorated: false }
    });
  });

  test('no income and no budget — only the mode; family scope is marked', async () => {
    const { app, services } = setup();
    services.planningService.getAllowance.mockResolvedValueOnce({ mode: 'none', currency: 'RUB', today: TODAY, period: PERIOD, daysLeft: 23, family: true });
    const res = await request(app).get('/api/plans/allowance').set('Authorization', auth()).expect(200);
    expect(res.body).toEqual({ mode: 'none', currency: 'RUB', today: TODAY, period: { start: '2026-11-01', last: '2026-11-30' }, daysLeft: 23, family: true });
  });
});

describe('payments calendar', () => {
  test('items by date, debts with a payment (without a date first), reminder state', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/plans/calendar').set('Authorization', auth()).expect(200);
    expect(res.body.items[0]).toEqual({ date: TODAY, kind: 'recurring', label: 'Клод', amount: 8500, currency: 'RUB', paid: true, ref: 5 });
    expect(res.body.items[2].ref).toBe(netflix.id);
    expect(res.body.debts.map(d => [d.id, d.dueDay])).toEqual([[8, null], [3, 25]]);
    expect(res.body).toMatchObject({ outTotal: 26000, inTotal: 100000, remindersOn: false });
  });

  test('debt payment day: 1–31, 0 clears, another user\'s or unknown debt — 404', async () => {
    const { app, services } = setup();
    await request(app).put('/api/plans/debts/3/due-day').set('Authorization', auth()).send({ day: 32 }).expect(400, { error: 'due_day' });
    await request(app).put('/api/plans/debts/3/due-day').set('Authorization', auth()).send({ day: 'x' }).expect(400);
    const set = await request(app).put('/api/plans/debts/3/due-day').set('Authorization', auth()).send({ day: 31 }).expect(200);
    expect(set.body).toEqual({ id: 3, name: 'Ипотека', dueDay: 31 });
    await request(app).put('/api/plans/debts/3/due-day').set('Authorization', auth()).send({ day: 0 }).expect(200);
    expect(services.planningService.setDueDay).toHaveBeenLastCalledWith(ME, 3, null);
    await request(app).put('/api/plans/debts/77/due-day').set('Authorization', auth()).send({ day: 5 }).expect(404, { error: 'debt_not_found' });
  });

  test('reminders: bills on/off, warnings on/off, choosing days turns warnings on', async () => {
    const { app, services } = setup();
    const res = await request(app).get('/api/plans/reminders').set('Authorization', auth()).expect(200);
    expect(res.body).toEqual({ bills: true, subWarn: { enabled: true, days: 2, options: [1, 2, 3, 7] } });
    await request(app).put('/api/plans/reminders').set('Authorization', auth()).send({ bills: 'yes' }).expect(400);
    await request(app).put('/api/plans/reminders').set('Authorization', auth()).send({ bills: false, subWarn: false }).expect(200);
    expect(services.planningService.setBillRemindersEnabled).toHaveBeenCalledWith(ME, false);
    expect(services.subscriptionAlertService.setWarnEnabled).toHaveBeenCalledWith(ME, false);
    await request(app).put('/api/plans/reminders').set('Authorization', auth()).send({ subWarnDays: 5 }).expect(400, { error: 'bad_warn_days' });
    await request(app).put('/api/plans/reminders').set('Authorization', auth()).send({ subWarnDays: 7 }).expect(200);
    expect(services.subscriptionAlertService.setWarnDays).toHaveBeenLastCalledWith(ME, 7);
  });
});

describe('subscriptions', () => {
  test('without premium — the first 3 of the list, the rest as a number and sum; warn marks and states', async () => {
    const { app } = setup({ isPremium: false });
    const res = await request(app).get('/api/plans/subscriptions').set('Authorization', auth()).expect(200);
    expect(res.body.items.map(s => s.id)).toEqual([sbol.id, gym.id, netflix.id]);
    expect(res.body).toMatchObject({ count: 4, hidden: { count: 1, monthly: 399 }, dismissed: 2, limit: 3, isPremium: false, trialLimit: { ok: true, max: 1 } });
    const [s, g, n] = res.body.items;
    expect(s).toMatchObject({ isSub: false, warns: false, state: null });
    expect(g).toMatchObject({ kind: 'recurring', recurringId: 4, state: 'muted', warns: false });
    expect(n).toMatchObject({ isSub: true, warns: true });
  });

  test('a card only for a visible subscription; cancel guide data', async () => {
    const { app } = setup({ isPremium: false });
    await request(app).get(`/api/plans/subscriptions/${hidden.id}`).set('Authorization', auth()).expect(404, { error: 'subscription_outdated' });
    const res = await request(app).get(`/api/plans/subscriptions/${gym.id}`).set('Authorization', auth()).expect(200);
    expect(res.body.sub.label).toBe('Абонемент');
    expect(res.body.guide).toMatchObject({ generic: true, recurringId: 4 });
  });

  test('card actions go to the same service calls as the bot buttons, by the seller ref', async () => {
    const { app, services } = setup();
    for (const action of ['mute', 'unmute', 'cancel', 'keep']) {
      await request(app).post(`/api/plans/subscriptions/${netflix.id}/${action}`).set('Authorization', auth()).expect(200);
      expect(services.subscriptionAlertService[action]).toHaveBeenLastCalledWith(ME, 'r-netflix');
    }
    await request(app).post(`/api/plans/subscriptions/${netflix.id}/delete`).set('Authorization', auth()).expect(404);
    await request(app).post('/api/plans/subscriptions/zzzzzzzzzz/mute').set('Authorization', auth()).expect(404, { error: 'subscription_outdated' });
  });

  test('«it is a subscription»: monthly becomes recurring; recurring limit — 400 with the max; outdated — 404', async () => {
    const { app } = setup();
    const ok = await request(app).post(`/api/plans/subscriptions/${netflix.id}/confirm`).set('Authorization', auth()).expect(200);
    expect(ok.body).toEqual({ converted: true, day: 10, recurringId: 11 });
    await request(app).post(`/api/plans/subscriptions/${sbol.id}/confirm`).set('Authorization', auth()).expect(400, { error: 'subscription_recurring_limit', max: 30 });
    await request(app).post('/api/plans/subscriptions/zzzzzzzzzz/confirm').set('Authorization', auth()).expect(404);
  });

  test('«not a subscription» and «return hidden»', async () => {
    const { app } = setup();
    await request(app).post(`/api/plans/subscriptions/${netflix.id}/dismiss`).set('Authorization', auth()).expect(200, { ok: true });
    await request(app).post('/api/plans/subscriptions/zzzzzzzzzz/dismiss').set('Authorization', auth()).expect(404);
    await request(app).post('/api/plans/subscriptions/restore').set('Authorization', auth()).expect(200, { restored: 2 });
  });
});

describe('trials', () => {
  const trial = { id: 4, name: 'Кинопоиск', end_date: '2026-11-15', amount: 399, currency: 'RUB', state: 'active' };

  test('create: a name with letters, optional price in a known currency, end date; one at a time without premium — 402', async () => {
    const { app, services } = setup();
    await request(app).post('/api/plans/trials').set('Authorization', auth()).send({ name: '123', endDate: '2026-11-15' }).expect(400, { error: 'trial_name' });
    await request(app).post('/api/plans/trials').set('Authorization', auth()).send({ name: 'Okko', endDate: '15.11' }).expect(400, { error: 'trial_date' });
    await request(app).post('/api/plans/trials').set('Authorization', auth()).send({ name: 'Okko', amount: 5, currency: 'XXX', endDate: '2026-11-15' }).expect(400);
    const res = await request(app).post('/api/plans/trials').set('Authorization', auth()).send({ name: '  Spotify   Family ', amount: '11,99', currency: 'usd', endDate: '2026-11-15' }).expect(201);
    expect(services.subscriptionAlertService.addTrial).toHaveBeenLastCalledWith(ME, { name: 'Spotify Family', amount: 11.99, currency: 'USD', endDate: '2026-11-15', maxDays: 366 });
    expect(res.body).toEqual({ id: 5, name: 'Spotify Family', endDate: '2026-11-15', amount: 11.99, currency: 'USD', state: 'active', ended: false });
    await request(app).post('/api/plans/trials').set('Authorization', auth()).send({ name: 'Okko', endDate: '2026-11-15' }).expect(201);
    expect(services.subscriptionAlertService.addTrial).toHaveBeenLastCalledWith(ME, expect.objectContaining({ amount: null, currency: null }));

    const limited = setup({ isPremium: false, trialLimitOk: false });
    await request(limited.app).post('/api/plans/trials').set('Authorization', auth()).send({ name: 'Okko', endDate: '2026-11-15' }).expect(402);
  });

  test('card, state actions by t<id>, delete — only own', async () => {
    const { app, services } = setup({ trials: [trial] });
    const card = await request(app).get('/api/plans/trials/4').set('Authorization', auth()).expect(200);
    expect(card.body.trial).toMatchObject({ id: 4, name: 'Кинопоиск', endDate: '2026-11-15', state: 'active' });
    await request(app).get('/api/plans/trials/4').set('Authorization', auth(5)).expect(404, { error: 'trial_not_found' });
    await request(app).post('/api/plans/trials/4/cancel').set('Authorization', auth()).expect(200);
    expect(services.subscriptionAlertService.cancel).toHaveBeenLastCalledWith(ME, 't4');
    await request(app).post('/api/plans/trials/4/cancel').set('Authorization', auth(5)).expect(404);
    await request(app).delete('/api/plans/trials/4').set('Authorization', auth(5)).expect(404);
    await request(app).delete('/api/plans/trials/4').set('Authorization', auth()).expect(200);
  });
});

describe('my inflation', () => {
  test('premium — basket and lists; without — one example and the count, no basket', async () => {
    const premium = await request(setup().app).get('/api/plans/inflation').set('Authorization', auth()).expect(200);
    expect(premium.body).toMatchObject({ isPremium: true, basket: { change: 0.031, count: 2 }, risers: [{ name: 'Лук' }], fallers: [{ name: 'Молоко' }], teaser: null });
    const free = await request(setup({ isPremium: false }).app).get('/api/plans/inflation').set('Authorization', auth()).expect(200);
    expect(free.body).toMatchObject({ isPremium: false, basket: null, risers: [], fallers: [], count: 2, teaser: { name: 'Лук' } });
  });
});

describe('budgets', () => {
  test('premium only', async () => {
    const { app, services } = setup({ isPremium: false });
    await request(app).get('/api/budgets').set('Authorization', auth()).expect(402, { error: 'premium_required', feature: 'budgets' });
    await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 'total', amount: 1000 }).expect(402);
    expect(services.budgetService.setBudget).not.toHaveBeenCalled();
  });

  test('list of the period in the main currency, family scope, categories for the form', async () => {
    const { app } = setup({ family: true });
    const res = await request(app).get('/api/budgets').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ family: true, period: { start: '2026-11-01', last: '2026-11-30' }, currency: 'RUB' });
    expect(res.body.items[1]).toEqual({ id: 2, total: false, category: { name: 'Еда', label: 'Еда', icon: '🍕' }, amount: 200, currency: 'USD', limit: 20000, spent: 22000, left: -2000, ratio: 1.1 });
    expect(res.body.categories).toEqual([
      { id: 13, name: 'Еда', label: 'Еда', icon: '🍕', budgetId: 2 },
      { id: 14, name: 'Транспорт', label: 'Транспорт', icon: '🚗', budgetId: null }
    ]);
  });

  test('create: total or an available category, amount and currency checked; achievement note without markup', async () => {
    const { app, services } = setup();
    await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 99, amount: 1000 }).expect(400, { error: 'budget_category_gone' });
    await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 'total', amount: -5 }).expect(400);
    await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 'total', amount: 1000, currency: 'XYZ' }).expect(400);
    const res = await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 14, amount: 150, currency: 'usd' }).expect(201);
    expect(services.budgetService.setBudget).toHaveBeenLastCalledWith(ME, 'Транспорт', 150, 'USD');
    expect(res.body).toEqual({ id: 9, achievement: '🏆 Новое достижение: Бюджетник' });
    await request(app).post('/api/budgets').set('Authorization', auth()).send({ target: 'total', amount: 50000 }).expect(201);
    expect(services.budgetService.setBudget).toHaveBeenLastCalledWith(ME, null, 50000, 'RUB');
  });

  test('card, new limit by the same category, delete with data to undo; unknown id — 404', async () => {
    const { app, services } = setup();
    const card = await request(app).get('/api/budgets/2').set('Authorization', auth()).expect(200);
    expect(card.body).toMatchObject({ budget: { id: 2 }, target: 13 });
    await request(app).get('/api/budgets/55').set('Authorization', auth()).expect(404, { error: 'budget_not_found' });
    await request(app).put('/api/budgets/2').set('Authorization', auth()).send({ amount: 300 }).expect(200);
    expect(services.budgetService.setBudget).toHaveBeenLastCalledWith(ME, 'Еда', 300, 'RUB');
    const del = await request(app).delete('/api/budgets/2').set('Authorization', auth()).expect(200);
    expect(del.body).toEqual({ deleted: { target: 13, amount: 200, currency: 'USD' } });
    await request(app).delete('/api/budgets/55').set('Authorization', auth()).expect(404);
  });

  test('a budget for a category the user no longer has — only delete', async () => {
    const { app } = setup({ statuses: [{ id: 3, category_name: 'Старая', amount: 100, currency: 'RUB', icon: null, spent: 0, limit: 100, ratio: 0 }] });
    const card = await request(app).get('/api/budgets/3').set('Authorization', auth()).expect(200);
    expect(card.body.target).toBeNull();
    await request(app).put('/api/budgets/3').set('Authorization', auth()).send({ amount: 300 }).expect(400, { error: 'budget_category_gone' });
    const del = await request(app).delete('/api/budgets/3').set('Authorization', auth()).expect(200);
    expect(del.body).toEqual({ deleted: null });
  });
});

describe('SubscriptionAlertService for the mini app', () => {
  function service({ trials = 0, isPremium = false } = {}) {
    const deps = {
      planningService: { limits: jest.fn(async () => ({ isPremium, limits: isPremium ? USER_LIMITS.premium : USER_LIMITS.regular })) },
      planningRepository: {
        countActiveTrials: jest.fn(async () => trials),
        createTrialDraft: jest.fn(async () => 12),
        setTrialEnd: jest.fn(async (userId, id, endDate) => ({ id, name: 'Okko', end_date: endDate, state: 'active' })),
        setWarnEnabled: jest.fn()
      },
      expenseService: { getPeriodContext: jest.fn(async () => ({ today: TODAY })) },
      localizationService: new LocalizationService(),
      formatter: new Formatter()
    };
    return { s: new SubscriptionAlertService(deps), deps };
  }

  test('a trial in one step: the same draft and end date as the bot; date from today to a year; limit', async () => {
    const { s, deps } = service();
    expect(await s.addTrial(ME, { name: 'Okko', endDate: '2026-11-07' })).toEqual({ error: 'bad_date' });
    expect(await s.addTrial(ME, { name: 'Okko', endDate: '2027-11-10' })).toEqual({ error: 'bad_date' });
    expect(deps.planningRepository.createTrialDraft).not.toHaveBeenCalled();
    const ok = await s.addTrial(ME, { name: 'Okko', amount: 399, currency: 'RUB', endDate: TODAY });
    expect(ok).toEqual({ trial: { id: 12, name: 'Okko', end_date: TODAY, state: 'active' }, today: TODAY });
    expect(deps.planningRepository.createTrialDraft).toHaveBeenCalledWith(ME, { name: 'Okko', amount: 399, currency: 'RUB', createdOn: TODAY });
    expect(await service({ trials: 1 }).s.addTrial(ME, { name: 'Okko', endDate: TODAY })).toEqual({ error: 'limit' });
    expect((await service({ trials: 5, isPremium: true }).s.addTrial(ME, { name: 'Okko', endDate: TODAY })).trial).toBeTruthy();
  });

  test('warnings are set, not toggled', async () => {
    const { s, deps } = service();
    expect(await s.setWarnEnabled(ME, false)).toBe(false);
    expect(deps.planningRepository.setWarnEnabled).toHaveBeenCalledWith(ME, false);
  });

  test('cancel guide data matches the bot text: a known service, an app store subscription, an unknown one', () => {
    const { s } = service();
    expect(s.cancelGuideInfo({ name: 'NETFLIX.COM', key: 'netflix' })).toMatchObject({ service: { name: 'Netflix' }, apple: expect.any(String), google: expect.any(String), generic: false });
    const apple = s.cancelGuideInfo({ name: 'Apple.com/bill iCloud' });
    expect(apple).toMatchObject({ service: null, apple: 'https://apps.apple.com/account/subscriptions', google: null, generic: false });
    expect(s.cancelGuideInfo({ name: 'Спортзал', recurringId: 4 })).toMatchObject({ service: null, generic: true, recurringId: 4 });
    const bot = s.cancelGuide('ru', { name: 'Apple.com/bill iCloud' });
    expect(bot.urlRows.flat().map(b => b.url)).toEqual(['https://apps.apple.com/account/subscriptions']);
    const unknown = s.cancelGuide('ru', { name: 'Спортзал' });
    expect(unknown.text.match(/автопродление/g)).toHaveLength(1);
  });
});
