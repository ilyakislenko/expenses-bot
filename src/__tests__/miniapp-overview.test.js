// Mini App «Обзор»: обзор периода (свой / семейный), записи категории, итоги периода и динамика — те же расчёты, что
// у бота (ChartService.planFactData / trendData, ReportService.reportData), доступ только к своему, премиум — 402.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const ChartService = require('../services/ChartService');
const ReportService = require('../services/ReportService');
const Formatter = require('../utils/formatter');
const { customPeriod } = require('../utils/period');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 1066875127;
const TODAY = '2026-10-28';
const rates = { RUB: 1, USD: 100 };
const currencyUtils = { convert: async (amount, from, to) => amount * rates[from] / rates[to] };
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' }) }, TOKEN)}`;
const sp = (text) => text.replace(/[\u00a0\u202f]/g, ' ');

const row = (id, amount, currency, day, extra = {}) => ({
  id, user_id: ME, amount: String(amount), currency, description: `трата ${id}`, category_id: 1, category_name: 'Еда', category_icon: '🍔',
  created_at_utc: `${day}T10:00:00Z`, family_id: null, recurring_expense_id: null, receipt_id: null, import_id: null, ...extra
});

// Контейнер-заглушка: настоящие ChartService и ReportService поверх заглушек репозиториев-сервисов
function setup({ premium = true, family = null, familyMode = false, expenses = [], categories = [], prevCategories = [], totals = null, prevTotals = null, budgets = [], recurring = [], familyRecurring = [], income = { count: 0, byCurrency: [] }, allowance = { mode: 'none' }, createdAt = '2025-01-01', perPeriod = null } = {}) {
  const formatter = new Formatter(currencyUtils);
  const localizationService = new LocalizationService();
  const current = customPeriod(TODAY, 1, 0);
  const sumRows = (rows) => {
    const map = new Map();
    for (const r of rows) map.set(r.currency, (map.get(r.currency) || 0) + Number(r.amount));
    return { byCurrency: [...map].map(([currency, total]) => ({ currency, total })), count: rows.length };
  };
  const expenseService = {
    getPeriodContext: jest.fn(async (userId, kind, offset) => ({ timezone: 'UTC', currency: 'RUB', startDay: 1, today: TODAY, period: customPeriod(TODAY, 1, offset) })),
    getTotals: jest.fn(async (owner, tz, period) => {
      if (perPeriod) return perPeriod(period);
      if (period.start === current.start) return totals || sumRows(expenses);
      return prevTotals || { byCurrency: [], count: 0 };
    }),
    getCategoryTotals: jest.fn(async (owner, tz, period) => (period.start === current.start ? categories : prevCategories)),
    getExpenses: jest.fn(async (owner, tz, period, categoryName = null) => expenses.filter(e => !categoryName || e.category_name === categoryName)),
    getMemberTotals: jest.fn(async () => [
      { user_id: ME, first_name: 'Ilya', currency: 'RUB', total: 3000 },
      { user_id: 2, username: 'yulia', currency: 'USD', total: 10 }
    ]),
    getCategoryById: jest.fn(async (userId, id) => (id === 1 ? { id: 1, name: 'Еда', icon: '🍔' } : null)),
    getFamilyCategoryById: jest.fn(async (familyId, id) => (id === 1 || id === 5 ? { id, name: id === 1 ? 'Еда' : 'Кафе', icon: '☕' } : null))
  };
  const budgetService = {
    scopeFor: jest.fn(async (id) => (family && familyMode ? { familyId: family.id } : id)),
    getStatus: jest.fn(async () => budgets),
    budgetName: (b) => b.category_name || 'Общий бюджет'
  };
  const recurringExpenseService = { list: jest.fn(async () => recurring), listFamily: jest.fn(async () => familyRecurring) };
  const incomeService = { getTotals: jest.fn(async () => income) };
  const reportService = new ReportService({ expenseService, incomeService, budgetService, localizationService, formatter, currencyUtils });
  const chartService = new ChartService({ expenseService, reportService, localizationService, formatter, chartRenderer: null, budgetService, recurringExpenseService });
  const services = {
    localizationService, formatter, expenseService, budgetService, recurringExpenseService, incomeService, reportService, chartService,
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'UTC', getUserPeriodStartDay: async () => 1,
      getUserById: async (id) => ({ id, created_at: createdAt })
    },
    premiumService: { isPremiumUser: async () => premium },
    familyService: { getUserFamily: jest.fn(async () => family) },
    planningService: { getAllowance: jest.fn(async () => allowance) }
  };
  const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
  return { app, ...services };
}

describe('GET /api/overview', () => {
  test('own period: spent in the main currency, categories with share and budget marks, plan and forecast numbers of the bot picture', async () => {
    const expenses = [row(1, 1000, 'RUB', '2026-10-01'), row(2, 20, 'USD', '2026-10-02'), row(3, 10000, 'RUB', '2026-10-10', { recurring_expense_id: 4 }), row(4, 3000, 'RUB', '2026-10-28')];
    const { app, planningService } = setup({
      expenses,
      categories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 6000, regular: 0 }, { category_id: 2, name: 'Дом', icon: '🏠', currency: 'RUB', total: 10000, regular: 10000 }],
      budgets: [{ id: 9, category_name: null, limit: 31000, spent: 16000, ratio: 16000 / 31000 }, { id: 10, category_name: 'Еда', limit: 5000, spent: 6000, ratio: 1.2 }, { id: 11, category_name: 'Дом', limit: 12000, spent: 10000, ratio: 10000 / 12000 }],
      recurring: [{ id: 7, amount: '3100', currency: 'RUB', description: 'интернет', nextChargeDate: '2026-10-30' }, { id: 8, amount: '500', currency: 'RUB', description: 'облако', nextChargeDate: '2026-11-05' }],
      income: { count: 1, byCurrency: [{ currency: 'USD', total: 300 }] },
      allowance: { mode: 'budget', daily: 1200.4, spentToday: 3000, leftToday: -1799.6, deficit: 0, pace: 'over' }
    });
    const res = await request(app).get('/api/overview').set('Authorization', auth()).expect(200);
    const body = res.body;
    expect(body).toMatchObject({ offset: 0, scope: 'mine', canSwitch: false, spent: 16000, count: 4, period: { start: '2026-10-01', last: '2026-10-31' } });
    expect(body.budget).toMatchObject({ id: 9, limit: 31000 });
    expect(body.categories.map(c => [c.label, c.total, Math.round(c.share * 100), c.budget && c.budget.level])).toEqual([['Дом', 10000, 63, 'warn'], ['Еда', 6000, 38, 'over']]);
    // Те же цифры, что строки бота «📉 План на конец 27.10: 25 590 ₽ · 🟢 запас 9 590 ₽» и «🔮 … 19 433 ₽»
    expect(Math.round(body.plan.planToDate.plan)).toBe(25590);
    expect(Math.round(body.plan.planToDate.diff)).toBe(-9590);
    expect(body.plan.planToDate.date).toBe('2026-10-27');
    expect(Math.round(body.plan.forecast.end)).toBe(19433);
    expect(body.plan.days).toHaveLength(31);
    expect(body.plan.lastIndex).toBe(27);
    expect(body.plan.actual).toHaveLength(28);
    expect(body.plan.planJumps[9]).toBe(10000); // аренда — ступенька в свой день
    expect(body.plan.bills).toBe(13100);
    expect(body.income).toEqual({ total: 30000, balance: 14000, parts: [{ currency: 'USD', total: 300 }] });
    expect(body.allowance).toMatchObject({ daily: 1200.4, spentToday: 3000, pace: 'over' });
    expect(planningService.getAllowance).toHaveBeenCalledWith(ME);
    expect(body.upcoming).toEqual([expect.objectContaining({ id: 7, description: 'интернет', date: '2026-10-30', mine: true, author: null })]);
    expect(body.donut).toBe(true);
  });

  test('past period: no budgets, allowance, forecast or upcoming; the ring of a past period needs premium, the overview itself does not', async () => {
    const { app, planningService } = setup({ premium: false, expenses: [row(1, 500, 'RUB', '2026-09-05')], prevTotals: { byCurrency: [{ currency: 'RUB', total: 500 }], count: 1 } });
    const res = await request(app).get('/api/overview?offset=-1').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ offset: -1, period: { start: '2026-09-01' }, budget: null, allowance: null, upcoming: [], donut: false });
    expect(res.body.plan.forecast).toBeNull();
    expect(res.body.plan.planLine).toBeNull();
    expect(res.body.plan.actual).toHaveLength(30); // прошлый период — до конца
    expect(planningService.getAllowance).not.toHaveBeenCalled();
    await request(app).get('/api/overview?offset=1').set('Authorization', auth()).expect(400, { error: 'bad_offset' });
    await request(app).get('/api/overview?offset=abc').set('Authorization', auth()).expect(400);
    await request(app).get('/api/overview?scope=all').set('Authorization', auth()).expect(400, { error: 'bad_scope' });
  });

  test('no income yet: the hint only for the first 14 days after registration', async () => {
    const fresh = setup({ createdAt: new Date(Date.now() - 3 * 86400000).toISOString() });
    expect((await request(fresh.app).get('/api/overview').set('Authorization', auth()).expect(200)).body).toMatchObject({ income: null, incomeHint: true });
    const old = setup();
    expect((await request(old.app).get('/api/overview').set('Authorization', auth()).expect(200)).body.incomeHint).toBe(false);
  });

  test('family: «all to family» opens the family view by default — records of all members, who spent what, family budget and recurring; «mine» has no ceiling', async () => {
    const family = { id: 7, owner_id: ME };
    const { app, expenseService, budgetService, recurringExpenseService, incomeService, planningService } = setup({
      family, familyMode: true,
      expenses: [row(1, 1000, 'RUB', '2026-10-03')],
      budgets: [{ id: 3, category_name: null, limit: 50000, spent: 4000, ratio: 0.08 }],
      familyRecurring: [{ id: 21, user_id: 2, first_name: 'Юля', amount: '900', currency: 'RUB', description: 'кружок', nextChargeDate: '2026-10-29' }],
      allowance: { mode: 'budget', daily: 1500, spentToday: 0, leftToday: 1500, deficit: 0, pace: 'good' }
    });
    const res = await request(app).get('/api/overview').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ scope: 'family', canSwitch: true, income: null, budget: { id: 3 } });
    expect(expenseService.getTotals).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', expect.any(Object));
    expect(budgetService.getStatus).toHaveBeenCalledWith({ familyId: 7 }, expect.any(Object));
    expect(incomeService.getTotals).not.toHaveBeenCalled();
    expect(res.body.members.map(m => [m.name, m.total, m.mine])).toEqual([['Ilya', 3000, true], ['yulia', 1000, false]]);
    expect(Math.round(res.body.members[0].share * 100)).toBe(75);
    expect(res.body.upcoming).toEqual([expect.objectContaining({ id: 21, mine: false, author: { id: 2, name: 'Юля' } })]);
    expect(recurringExpenseService.listFamily).toHaveBeenCalledWith(7);
    expect(res.body.allowance).toMatchObject({ daily: 1500 });

    budgetService.getStatus.mockClear();
    planningService.getAllowance.mockClear();
    const mine = await request(app).get('/api/overview?scope=mine').set('Authorization', auth()).expect(200);
    expect(mine.body).toMatchObject({ scope: 'mine', budget: null, allowance: null, members: [] });
    expect(mine.body.plan.planLine).toBeNull(); // потолок общий, траты свои — плана нет
    expect(budgetService.getStatus).not.toHaveBeenCalled();
    expect(planningService.getAllowance).not.toHaveBeenCalled();
  });

  test('family view without premium — 402, premium without a family — 403', async () => {
    await request(setup({ premium: false, family: { id: 7 } }).app).get('/api/overview?scope=family').set('Authorization', auth()).expect(402, { error: 'premium_required', feature: 'family' });
    await request(setup({ premium: true }).app).get('/api/overview?scope=family').set('Authorization', auth()).expect(403);
  });
});

describe('GET /api/overview/category/:id', () => {
  test('records of the category for the period, newest first, sum in the main currency and a 6-period trend with premium', async () => {
    const expenses = [row(1, 100, 'RUB', '2026-10-01'), row(2, 2, 'USD', '2026-10-05'), row(3, 50, 'RUB', '2026-10-06', { category_name: 'Дом' })];
    const { app, expenseService } = setup({ expenses, categories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 300, regular: 0 }] });
    const res = await request(app).get('/api/overview/category/1').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ category: { id: 1, label: 'Еда', icon: '🍔' }, spent: 300, count: 2, scope: 'mine' });
    expect(res.body.expenses.map(e => e.id)).toEqual([2, 1]);
    expect(res.body.expenses[0]).toMatchObject({ amount: 2, currency: 'USD', date: '2026-10-05', author: null, mine: true });
    expect(res.body.trend.periods.map(p => p.offset)).toEqual([-5, -4, -3, -2, -1, 0]);
    expect(res.body.trend.periods[5].value).toBe(300);
    expect(expenseService.getCategoryById).toHaveBeenCalledWith(ME, 1);
  });

  test('someone else\'s or unknown category — 404; without premium — records but no trend', async () => {
    const { app } = setup({ premium: false });
    await request(app).get('/api/overview/category/99').set('Authorization', auth()).expect(404);
    await request(app).get('/api/overview/category/abc').set('Authorization', auth()).expect(404);
    const res = await request(app).get('/api/overview/category/1').set('Authorization', auth()).expect(200);
    expect(res.body.trend).toBeNull();
  });

  test('family category: a member\'s category, family records with the author', async () => {
    const family = { id: 7, owner_id: ME };
    const { app, expenseService } = setup({ family, expenses: [row(1, 100, 'RUB', '2026-10-01', { user_id: 2, first_name: 'Юля', category_name: 'Кафе', family_id: 7 })] });
    const res = await request(app).get('/api/overview/category/5?scope=family').set('Authorization', auth()).expect(200);
    expect(expenseService.getFamilyCategoryById).toHaveBeenCalledWith(7, 5);
    expect(expenseService.getExpenses).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', expect.any(Object), 'Кафе');
    expect(res.body.expenses[0]).toMatchObject({ author: { id: 2, name: 'Юля' }, mine: false, family: true });
  });
});

describe('GET /api/report', () => {
  const data = {
    expenses: [row(1, 3000, 'RUB', '2026-10-03'), row(2, 10, 'USD', '2026-10-04', { category_name: 'Такси', category_icon: '🚕' })],
    categories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 3000, regular: 0 }, { category_id: 2, name: 'Такси', icon: '🚕', currency: 'USD', total: 10, regular: 0 },
      { category_id: 3, name: 'Дом', icon: '🏠', currency: 'RUB', total: 500, regular: 0 }, { category_id: 4, name: 'Кино', icon: '🎬', currency: 'RUB', total: 100, regular: 0 }],
    prevCategories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 5000, regular: 0 }, { category_id: 9, name: 'Кафе', icon: '☕', currency: 'RUB', total: 1000, regular: 0 }],
    totals: { byCurrency: [{ currency: 'RUB', total: 3600 }, { currency: 'USD', total: 10 }], count: 4 },
    prevTotals: { byCurrency: [{ currency: 'RUB', total: 6000 }], count: 3 },
    income: { count: 1, byCurrency: [{ currency: 'RUB', total: 10000 }] },
    budgets: [{ id: 1, category_name: null, spent: 4600, limit: 10000, ratio: 0.46, created_at: '2026-01-01' }, { id: 2, category_name: 'Еда', icon: '🍔', spent: 3000, limit: 2000, ratio: 1.5, created_at: '2026-11-15' }]
  };

  test('premium: comparison to the same days of the previous period, every category with its change, gone ones, budgets, per day, the biggest expense', async () => {
    const { app } = setup(data);
    const res = await request(app).get('/api/report').set('Authorization', auth()).expect(200);
    const body = res.body;
    expect(body).toMatchObject({ current: true, full: true, hasData: true, spent: 4600, count: 4, compared: true, income: { total: 10000, balance: 5400 } });
    expect(body.previous).toEqual({ spent: 6000, change: -23, days: 28 });
    expect(body.categories.map(c => [c.label, c.total, c.change])).toEqual([['Еда', 3000, -40], ['Такси', 1000, null], ['Дом', 500, null], ['Кино', 100, null]]);
    expect(body.gone.map(c => c.label)).toEqual(['Кафе']);
    expect(body.budgets.map(b => [b.id, b.category])).toEqual([[1, null]]); // заведённый после периода — не в итогах
    expect(body.perDay).toBe(Math.round(4600 / 28 * 100) / 100);
    expect(body.largest).toMatchObject({ value: 3000, expense: { id: 1, amount: 3000 } });
  });

  test('free: short report — top-3 categories with shares, nothing premium; the bot text is built from the same numbers', async () => {
    const { app, reportService } = setup(data);
    const free = setup({ ...data, premium: false });
    const res = await request(free.app).get('/api/report').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ full: false, spent: 4600 });
    expect(res.body.categories.map(c => [c.label, Math.round(c.share * 100)])).toEqual([['Еда', 65], ['Такси', 22], ['Дом', 11]]);
    expect(res.body).not.toHaveProperty('budgets');
    expect(res.body).not.toHaveProperty('largest');
    expect(res.body.categories[0]).not.toHaveProperty('change');

    const text = sp((await reportService.buildReport(ME, 0, 'ru', { full: true })).text);
    expect(text).toContain('К тем же 28 дн. прошлого периода: ↓ −23% (было 6 000 ₽)');
    expect(text).toContain('🍔 Еда — 3 000 ₽ · ↓ −40%');
    expect(text).toContain('Без трат в этот раз: ☕ Кафе');
    expect(text).not.toContain('Еда: 3 000 ₽ / 2 000 ₽');
    const short = sp((await reportService.buildReport(ME, 0, 'ru', { full: false })).text);
    expect(short).toContain('🍔 Еда — 3 000 ₽ (65%)');
    expect(short).not.toContain('Кино');
    expect(app).toBeDefined();
  });

  test('a period without expenses — no data; offset is validated', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/report?offset=-2').set('Authorization', auth()).expect(200)).body).toMatchObject({ hasData: false, offset: -2, period: { start: '2026-08-01' } });
    await request(app).get('/api/report?offset=-999').set('Authorization', auth()).expect(400);
  });
});

describe('GET /api/trends', () => {
  const values = { '2026-05-01': 1000, '2026-06-01': 2000, '2026-07-01': 3000, '2026-08-01': 2000, '2026-09-01': 4000, '2026-10-01': 500 };
  const perPeriod = (period) => (values[period.start] ? { byCurrency: [{ currency: 'RUB', total: values[period.start] }], count: 1 } : { byCurrency: [], count: 0 });

  test('premium only', async () => {
    await request(setup({ premium: false }).app).get('/api/trends').set('Authorization', auth()).expect(402, { error: 'premium_required', feature: 'trends' });
  });

  test('up to 12 periods from the first one with spending (at least 6), average without the running period, categories for the switch', async () => {
    const { app, expenseService } = setup({ perPeriod, categories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 900, regular: 0 }], prevCategories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 900, regular: 0 }] });
    const res = await request(app).get('/api/trends').set('Authorization', auth()).expect(200);
    expect(expenseService.getTotals).toHaveBeenCalledTimes(12);
    expect(res.body.periods.map(p => p.start)).toEqual(['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']);
    expect(res.body.periods.map(p => p.offset)).toEqual([-5, -4, -3, -2, -1, 0]);
    expect(res.body.average).toBe(2400); // (1000+2000+3000+2000+4000)/5, октябрь ещё идёт
    expect(res.body.category).toBeNull();
    expect(res.body.categories).toEqual([expect.objectContaining({ id: 1, label: 'Еда' })]);

    values['2025-12-01'] = 7000;
    const longer = await request(app).get('/api/trends').set('Authorization', auth()).expect(200);
    expect(longer.body.periods[0].start).toBe('2025-12-01');
    expect(longer.body.periods).toHaveLength(11);
    delete values['2025-12-01'];
  });

  test('one category; someone else\'s category — 404', async () => {
    const { app } = setup({ categories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 700, regular: 0 }], prevCategories: [{ category_id: 1, name: 'Еда', icon: '🍔', currency: 'RUB', total: 700, regular: 0 }] });
    const res = await request(app).get('/api/trends?category=1').set('Authorization', auth()).expect(200);
    expect(res.body.category).toMatchObject({ id: 1, label: 'Еда' });
    expect(res.body.periods.every(p => p.value === 700)).toBe(true);
    await request(app).get('/api/trends?category=99').set('Authorization', auth()).expect(404);
    await request(app).get('/api/trends?category=x').set('Authorization', auth()).expect(404);
  });
});

describe('API is only for the signed user', () => {
  test('without a signature — 401; another user\'s id in the signature sees only own data', async () => {
    const { app, expenseService } = setup();
    await request(app).get('/api/overview').expect(401);
    await request(app).get('/api/report').expect(401);
    await request(app).get('/api/overview').set('Authorization', auth(OTHER)).expect(200);
    expect(expenseService.getTotals).toHaveBeenCalledWith(OTHER, 'UTC', expect.any(Object));
    expect(expenseService.getTotals).not.toHaveBeenCalledWith(ME, expect.anything(), expect.anything());
  });
});

describe('ChartService data without drawing', () => {
  test('planFactData gives the numbers, planFact keeps the bot text from them', async () => {
    const { chartService } = setup({
      expenses: [row(1, 2700, 'RUB', '2026-10-01')],
      budgets: [{ category_name: null, limit: 3000 }]
    });
    const data = await chartService.planFactData(ME, 0);
    expect(Math.round(data.planToDate.plan)).toBe(2613);
    expect(Math.round(data.forecast.end)).toBe(3100);
    expect(data.limit).toBe(3000);
    const { summary, png } = await chartService.planFact(ME, 'ru', 0);
    expect(png).toBeNull(); // без рендера — только текст
    expect(sp(summary).split('\n')).toEqual(['📉 План на конец 27.10: 2 613 ₽ · 🔴 сверх плана 87 ₽', '🔮 Прогноз на 31.10 при таком темпе: 3 100 ₽ · 🔴 сверх бюджета 100 ₽']);
  });

  test('trendData: the family owner reads family records and a member\'s category', async () => {
    const { chartService, expenseService } = setup({ categories: [{ category_id: 5, name: 'Кафе', icon: '☕', currency: 'RUB', total: 200, regular: 0 }], prevCategories: [{ category_id: 5, name: 'Кафе', icon: '☕', currency: 'RUB', total: 200, regular: 0 }] });
    const data = await chartService.trendData(ME, 0, { categoryId: 5, familyId: 7 });
    expect(expenseService.getFamilyCategoryById).toHaveBeenCalledWith(7, 5);
    expect(expenseService.getCategoryTotals).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', expect.any(Object));
    expect(data.periods).toHaveLength(6);
    expect(data.average).toBe(200);
  });
});
