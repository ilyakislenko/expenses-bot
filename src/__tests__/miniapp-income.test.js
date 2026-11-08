// Mini App, раздел «Доходы и регулярные траты»: API доходов (период, итог и остаток, запись с днём, правка, удаление с
// «Вернуть», валюта дохода) и регулярных трат (список, создание, правка, семейный, «Уже оплатил», предупреждение о
// списании, удаление с «Вернуть»). Доходы — настоящий IncomeService над репозиторием в памяти.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const IncomeService = require('../services/IncomeService');
const RecurringExpenseService = require('../services/RecurringExpenseService');
const EnhancedValidator = require('../utils/enhancedValidator');
const { localToday, addDays } = require('../utils/period');
const { localDate } = require('../miniapp/serialize');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 1066875127;
const TZ = 'Europe/Moscow';
const auth = (id = ME) => `tma ${signInitData({
  auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya', language_code: 'ru' })
}, TOKEN)}`;

// Доходы в памяти: те же методы, что IncomeRepository
function incomeRepository() {
  const rows = [];
  let nextId = 1;
  const local = (row) => localDate(row.created_at_utc, TZ);
  return {
    rows,
    async addIncome(userId, amount, currency, description) {
      const row = { id: nextId++, user_id: String(userId), amount: amount.toFixed(2), currency, description, created_at_utc: new Date(), import_id: null, batch_id: null };
      rows.push(row);
      return { ...row };
    },
    async getIncomesBetween(userId, timezone, start, end) {
      return rows.filter(r => Number(r.user_id) === userId && local(r) >= start && local(r) < end)
        .sort((a, b) => a.created_at_utc - b.created_at_utc).map(r => ({ ...r, batch_source: r.batch_source || null }));
    },
    async getTotalsBetween(userId, timezone, start, end) {
      const byCurrency = {};
      let count = 0;
      for (const r of await this.getIncomesBetween(userId, timezone, start, end)) {
        byCurrency[r.currency] = (byCurrency[r.currency] || 0) + Number(r.amount);
        count++;
      }
      return { byCurrency: Object.entries(byCurrency).map(([currency, total]) => ({ currency, total })), count };
    },
    async getIncomeById(userId, id) {
      const row = rows.find(r => r.id === id && Number(r.user_id) === userId);
      return row ? { ...row, batch_source: row.batch_source || null } : undefined;
    },
    async updateIncome(userId, id, { amount, currency, description }) {
      const row = rows.find(r => r.id === id && Number(r.user_id) === userId);
      if (!row) return undefined;
      Object.assign(row, { amount: String(amount), currency, description });
      return { ...row };
    },
    async setIncomeCreatedAt(userId, id, createdAt) {
      const row = rows.find(r => r.id === id && Number(r.user_id) === userId);
      if (!row) return undefined;
      row.created_at_utc = new Date(createdAt);
      return { ...row };
    },
    async deleteIncomeById(userId, id) {
      const i = rows.findIndex(r => r.id === id && Number(r.user_id) === userId);
      if (i < 0) return undefined;
      const [row] = rows.splice(i, 1);
      return { ...row };
    },
    async restoreIncome(row) {
      if (rows.some(r => r.id === row.id)) return undefined;
      rows.push({ ...row });
      return { ...row };
    }
  };
}

const CATEGORIES = [{ id: 13, name: 'Еда', icon: '🍕' }, { id: 18, name: 'Другое', icon: '📦' }];
const recurringRow = (over = {}) => ({
  id: 1, user_id: String(ME), amount: '20000.00', currency: 'RUB', description: 'аренда', day_of_month: 10, category_id: 18, is_family: true,
  last_charged_month: null, category_name: 'Другое', category_icon: '📦', nextChargeDate: '2026-11-10', ...over
});

function setup({ premium = true, family = { id: 7 }, familyMode = false } = {}) {
  const incomes = incomeRepository();
  const userRepository = {
    incomeCurrency: { [ME]: 'USD' },
    async getUserIncomeCurrency(id) { return this.incomeCurrency[id] || 'RUB'; },
    async setUserIncomeCurrency(id, currency) { this.incomeCurrency[id] = currency; }
  };
  const recurring = {
    list: jest.fn(async () => [
      recurringRow({ id: 1, nextChargeDate: '2026-11-20' }),
      recurringRow({ id: 2, amount: '10.00', currency: 'USD', description: 'Netflix', is_family: false, nextChargeDate: '2026-11-12' })
    ]),
    get: jest.fn(async (userId, id) => (userId === ME && id === 1 ? recurringRow({ last_charged_month: '2026-10-01' }) : null)),
    getMaxPerUser: () => 20,
    create: jest.fn(async () => ({ id: 5, currency: 'RUB', chargedNow: true, budgetWarnings: [{ level: 80 }], nextChargeDate: '2026-12-08' })),
    update: jest.fn(async (userId, id, data) => (id === 1 ? { item: recurringRow({ amount: String(data.amount), day_of_month: data.dayOfMonth }), chargedNow: false, budgetWarnings: [] } : null)),
    setFamily: jest.fn(async (userId, id) => id === 1),
    payAhead: jest.fn(async (userId, id, month) => {
      if (id !== 1) return { status: 'missing' };
      if (month !== '2026-11-01') return { status: 'duplicate' };
      return { status: 'ok', expense: { id: 77, amount: '20000.00', currency: 'RUB' }, month, paidDate: '2026-11-10', nextChargeDate: '2026-12-10', warnings: [] };
    }),
    undoPayAhead: jest.fn(async (userId, id, month, expenseId) => expenseId === 77),
    delete: jest.fn(async (userId, id) => (id === 1 ? recurringRow() : undefined)),
    restore: jest.fn(async (userId, row) => (Number(row.user_id) === userId ? recurringRow() : null))
  };
  const alerts = {
    status: { subscription: false, enabled: true, days: 2 },
    recurringStatus: jest.fn(async () => alerts.status),
    toggleRecurring: jest.fn(async (userId, id) => {
      if (id !== 1) return null;
      alerts.status = { subscription: true, ref: 'abc', muted: false, cancelling: false, locked: false, enabled: true, days: 2 };
      return true;
    })
  };
  const services = {
    localizationService: new LocalizationService(),
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => TZ, getUserPeriodStartDay: async () => 1,
      getUserById: async (id) => ({ id, family_mode: familyMode })
    },
    premiumService: { isPremiumUser: async () => premium },
    enhancedValidator: new EnhancedValidator(),
    formatter: {
      sumInCurrency: async (list) => list.reduce((sum, { currency, total }) => sum + Number(total) * (currency === 'USD' ? 100 : 1), 0),
      translateCategoryName: (name) => (name === 'Еда' ? 'Еда и продукты' : name)
    },
    incomeService: new IncomeService(incomes, userRepository),
    expenseService: {
      getTotals: jest.fn(async () => ({ byCurrency: [{ currency: 'RUB', total: 3000 }], count: 2 })),
      getCategories: jest.fn(async () => CATEGORIES)
    },
    achievementService: { track: jest.fn(async () => '🏅 *Первый доход*') },
    recurringExpenseService: recurring,
    familyService: { getUserFamily: jest.fn(async () => family) },
    planningService: { getSubscriptions: jest.fn(async () => ({ all: [{ kind: 'recurring', recurringId: 2 }, { kind: 'detected' }] })) },
    subscriptionAlertService: alerts,
    budgetService: { warningText: (lang, w) => `⚠️ Бюджет *Еда* — ${w.level}%` }
  };
  const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
  return { app, services, incomes, userRepository, recurring, alerts };
}

describe('mini app income', () => {
  const today = localToday(TZ);

  test('period list: newest first, totals in the main currency, spent and what is left; only own incomes', async () => {
    const { app, incomes } = setup();
    await request(app).post('/api/income').set('Authorization', auth()).send({ amount: 50000, currency: 'RUB', description: 'зарплата' }).expect(201);
    await request(app).post('/api/income').set('Authorization', auth()).send({ amount: 100, description: 'фриланс' }).expect(201);
    await request(app).post('/api/income').set('Authorization', auth(OTHER)).send({ amount: 7, currency: 'RUB' }).expect(201);
    incomes.rows[0].batch_source = 'bank';
    incomes.rows[1].import_id = 4;

    const res = await request(app).get('/api/income').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ currency: 'RUB', incomeCurrency: 'USD', count: 2, total: 60000, spent: 3000, balance: 57000 });
    expect(res.body.period).toMatchObject({ offset: 0, start: `${today.slice(0, 7)}-01` });
    expect(res.body.items.map(i => [i.description, i.currency, i.source])).toEqual([['фриланс', 'USD', 'import'], ['зарплата', 'RUB', 'bank']]);

    const past = await request(app).get('/api/income?offset=-1').set('Authorization', auth()).expect(200);
    expect(past.body).toMatchObject({ count: 0, items: [], total: 0 });
    await request(app).get('/api/income?offset=1').set('Authorization', auth()).expect(400);
  });

  test('new income: income currency by default, another day keeps the time of day, achievements note without markup', async () => {
    const { app, services } = setup();
    const yesterday = addDays(today, -1);
    const res = await request(app).post('/api/income').set('Authorization', auth()).send({ amount: '1500,50', description: '  аванс  ', date: yesterday }).expect(201);
    expect(res.body.income).toMatchObject({ amount: 1500.5, currency: 'USD', description: 'аванс', date: yesterday });
    expect(res.body.note).toBe('🏅 Первый доход');
    expect(services.achievementService.track).toHaveBeenCalledWith(ME, 'income_added', { lang: 'ru' });

    const none = await request(app).post('/api/income').set('Authorization', auth()).send({ amount: 10 }).expect(201);
    expect(none.body.income).toMatchObject({ description: null, date: today });
  });

  test('bad input is refused like in the bot: amount, currency, future or too old day, long description without premium', async () => {
    const { app } = setup({ premium: false });
    const post = (body) => request(app).post('/api/income').set('Authorization', auth()).send(body);
    await post({ amount: 0 }).expect(400, { error: 'income_amount' });
    await post({ amount: 1e11 }).expect(400, { error: 'income_amount' });
    await post({ amount: 5, currency: 'XXX' }).expect(400, { error: 'income_currency' });
    await post({ amount: 5, date: addDays(today, 1) }).expect(400, { error: 'income_date_future' });
    await post({ amount: 5, date: addDays(today, -400) }).expect(400, { error: 'income_date_too_old' });
    await post({ amount: 5, description: 'я'.repeat(81) }).expect(400, { error: 'income_description' });
    await post({ amount: 5, description: 'я'.repeat(80) }).expect(201);
  });

  test('edit, delete and «Undo»: someone else\'s income is not found, undo returns the same record once', async () => {
    const { app, incomes } = setup();
    const { body } = await request(app).post('/api/income').set('Authorization', auth()).send({ amount: 100, currency: 'RUB', description: 'бонус' }).expect(201);
    const id = body.income.id;
    incomes.rows[0].import_id = 9;

    await request(app).get(`/api/income/${id}`).set('Authorization', auth(OTHER)).expect(404, { error: 'income_not_found' });
    await request(app).put(`/api/income/${id}`).set('Authorization', auth(OTHER)).send({ amount: 1 }).expect(404);
    await request(app).delete(`/api/income/${id}`).set('Authorization', auth(OTHER)).expect(404);

    const yesterday = addDays(today, -1);
    const edited = await request(app).put(`/api/income/${id}`).set('Authorization', auth()).send({ amount: 250, currency: 'EUR', description: '', date: yesterday }).expect(200);
    expect(edited.body.income).toMatchObject({ amount: 250, currency: 'EUR', description: null, date: yesterday, source: 'import' });

    await request(app).delete(`/api/income/${id}`).set('Authorization', auth()).expect(200);
    expect(incomes.rows).toHaveLength(0);
    await request(app).post(`/api/income/${id}/restore`).set('Authorization', auth(OTHER)).expect(400, { error: 'income_restore_gone' });
    const restored = await request(app).post(`/api/income/${id}/restore`).set('Authorization', auth()).expect(200);
    expect(restored.body.income).toMatchObject({ id, amount: 250, currency: 'EUR', source: 'import', date: yesterday });
    await request(app).post(`/api/income/${id}/restore`).set('Authorization', auth()).expect(400);
  });

  test('income currency: only currencies of the bot', async () => {
    const { app, userRepository } = setup();
    await request(app).put('/api/income/currency').set('Authorization', auth()).send({ currency: 'nope' }).expect(400, { error: 'income_currency' });
    await request(app).put('/api/income/currency').set('Authorization', auth()).send({ currency: 'eur' }).expect(200, { currency: 'EUR' });
    expect(userRepository.incomeCurrency[ME]).toBe('EUR');
    const defaults = await request(app).get('/api/income/defaults').set('Authorization', auth()).expect(200);
    expect(defaults.body).toMatchObject({ currency: 'EUR', descriptionMax: 160, today });
  });
});

describe('mini app recurring expenses', () => {
  test('list: by next record date, total per month in the main currency, subscriptions and family marks', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/recurring').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ currency: 'RUB', monthly: 21000, count: 2, max: 20, family: true });
    expect(res.body.items.map(i => [i.id, i.subscription, i.isFamily, i.category && i.category.icon])).toEqual([[2, true, false, '📦'], [1, false, true, '📦']]);
    const solo = await request(setup({ premium: false }).app).get('/api/recurring').set('Authorization', auth()).expect(200);
    expect(solo.body.family).toBe(false);
  });

  test('create: category must be available, family only for a premium family member (by «all expenses to family» by default)', async () => {
    const { app, recurring } = setup({ familyMode: true });
    const body = { amount: 20000, description: 'аренда', dayOfMonth: 10, categoryId: 13 };
    await request(app).post('/api/recurring').set('Authorization', auth()).send({ ...body, categoryId: 999 }).expect(400, { error: 'recurring_category' });
    await request(app).post('/api/recurring').set('Authorization', auth()).send({ ...body, dayOfMonth: 32 }).expect(400, { error: 'recurring_day' });
    await request(app).post('/api/recurring').set('Authorization', auth()).send({ ...body, description: ' ' }).expect(400, { error: 'recurring_description_empty' });
    await request(app).post('/api/recurring').set('Authorization', auth()).send({ ...body, amount: 100000000 }).expect(400, { error: 'recurring_amount' });

    const res = await request(app).post('/api/recurring').set('Authorization', auth()).send(body).expect(201);
    expect(res.body).toEqual({ id: 5, chargedNow: true, nextChargeDate: '2026-12-08', warnings: ['⚠️ Бюджет Еда — 80%'] });
    expect(recurring.create).toHaveBeenLastCalledWith(ME, { amount: 20000, currency: 'RUB', description: 'аренда', dayOfMonth: 10, categoryId: 13, isFamily: true });
    await request(app).post('/api/recurring').set('Authorization', auth()).send({ ...body, isFamily: false }).expect(201);
    expect(recurring.create.mock.calls[1][1].isFamily).toBe(false);

    const free = setup({ premium: false, familyMode: true });
    await request(free.app).post('/api/recurring').set('Authorization', auth()).send({ ...body, isFamily: true }).expect(201);
    expect(free.recurring.create.mock.calls[0][1].isFamily).toBe(false);

    const full = setup();
    full.recurring.create.mockRejectedValueOnce(Object.assign(new Error('recurring_limit'), { code: 'recurring_limit' }));
    await request(full.app).post('/api/recurring').set('Authorization', auth()).send(body).expect(400, { error: 'recurring_limit' });
  });

  test('card: item, warning state and form options; someone else\'s — not found', async () => {
    const { app } = setup();
    await request(app).get('/api/recurring/1').set('Authorization', auth(OTHER)).expect(404, { error: 'recurring_not_found' });
    const res = await request(app).get('/api/recurring/1').set('Authorization', auth()).expect(200);
    expect(res.body.item).toMatchObject({ id: 1, dayOfMonth: 10, lastChargedMonth: '2026-10-01', isFamily: true, subscription: false });
    expect(res.body.alert).toEqual({ on: false, state: 'off', days: 2, lockedCount: 3 });
    expect(res.body.options).toMatchObject({ currency: 'RUB', family: true, familyDefault: false, max: 20, categories: [{ id: 13, label: expect.any(String), icon: '🍕' }, { id: 18 }] });
  });

  test('edit goes through the service with the same checks; unknown id — 404', async () => {
    const { app, recurring } = setup();
    const body = { amount: 25000, currency: 'usd', description: 'аренда', dayOfMonth: 5, categoryId: 18 };
    const res = await request(app).put('/api/recurring/1').set('Authorization', auth()).send(body).expect(200);
    expect(recurring.update).toHaveBeenCalledWith(ME, 1, { amount: 25000, currency: 'USD', description: 'аренда', dayOfMonth: 5, categoryId: 18 });
    expect(res.body).toMatchObject({ item: { amount: 25000, dayOfMonth: 5 }, chargedNow: false, warnings: [] });
    await request(app).put('/api/recurring/3').set('Authorization', auth()).send(body).expect(404);
  });

  test('family switch: premium and a family are needed', async () => {
    await request(setup({ premium: false }).app).put('/api/recurring/1/family').set('Authorization', auth()).send({ family: true }).expect(402);
    await request(setup({ family: null }).app).put('/api/recurring/1/family').set('Authorization', auth()).send({ family: true }).expect(403, { error: 'recurring_no_family' });
    const { app, recurring } = setup();
    await request(app).put('/api/recurring/1/family').set('Authorization', auth()).send({ family: false }).expect(200, { isFamily: false });
    expect(recurring.setFamily).toHaveBeenCalledWith(ME, 1, false);
    await request(app).put('/api/recurring/4/family').set('Authorization', auth()).send({ family: false }).expect(404);
  });

  test('«Already paid» with the month from the screen, an outdated screen does not pay the next month; undo', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/recurring/1/pay').set('Authorization', auth()).send({ month: '2026-11-01' }).expect(200);
    expect(res.body).toEqual({ expenseId: 77, month: '2026-11-01', paidDate: '2026-11-10', nextChargeDate: '2026-12-10', amount: 20000, currency: 'RUB', warnings: [] });
    await request(app).post('/api/recurring/1/pay').set('Authorization', auth()).send({ month: '2026-12-01' }).expect(409, { error: 'recurring_paid_already' });
    await request(app).post('/api/recurring/9/pay').set('Authorization', auth()).send({ month: '2026-11-01' }).expect(404);
    await request(app).post('/api/recurring/1/pay').set('Authorization', auth()).send({ month: 'ноябрь' }).expect(400);

    const undo = await request(app).post('/api/recurring/1/pay/undo').set('Authorization', auth()).send({ month: '2026-11-01', expenseId: 77 }).expect(200);
    expect(undo.body.item).toMatchObject({ id: 1 });
    await request(app).post('/api/recurring/1/pay/undo').set('Authorization', auth()).send({ month: '2026-11-01', expenseId: 78 }).expect(409, { error: 'recurring_paid_undo_gone' });
  });

  test('charge warning switch goes through SubscriptionAlertService', async () => {
    const { app, alerts } = setup();
    const res = await request(app).post('/api/recurring/1/alert').set('Authorization', auth()).expect(200);
    expect(alerts.toggleRecurring).toHaveBeenCalledWith(ME, 1);
    expect(res.body.alert).toMatchObject({ on: true, state: 'on', days: 2 });
    await request(app).post('/api/recurring/2/alert').set('Authorization', auth()).expect(404);
  });

  test('delete and «Undo» once; nobody else can restore it', async () => {
    const { app, recurring } = setup();
    await request(app).delete('/api/recurring/2').set('Authorization', auth()).expect(404);
    await request(app).delete('/api/recurring/1').set('Authorization', auth()).expect(200, { deleted: true });
    await request(app).post('/api/recurring/1/restore').set('Authorization', auth(OTHER)).expect(400, { error: 'recurring_restore_gone' });
    await request(app).post('/api/recurring/1/restore').set('Authorization', auth()).expect(200);
    expect(recurring.restore).toHaveBeenCalledWith(ME, expect.objectContaining({ id: 1, last_charged_month: null }));
    await request(app).post('/api/recurring/1/restore').set('Authorization', auth()).expect(400);
  });
});

describe('RecurringExpenseService.update / restore', () => {
  const due = { id: 1, user_id: ME, amount: '500.00', currency: 'RUB', description: 'интернет', category_id: 7, category_name: 'Дом', is_family: false, charge_month: '2026-11-01' };
  function service({ updated = true, dueRows = [] } = {}) {
    const repository = {
      update: jest.fn(async () => (updated ? { id: 1 } : undefined)),
      getDueForUser: jest.fn(async () => dueRows),
      chargeForMonth: jest.fn(async () => ({ id: 90, amount: '500.00', currency: 'RUB' })),
      getById: jest.fn(async () => ({ id: 1, day_of_month: 5, last_charged_month: '2026-11-01' })),
      countByUser: jest.fn(async () => 3),
      restore: jest.fn(async (row) => ({ id: row.id }))
    };
    const budgetService = { checkAfterExpense: jest.fn(async () => [{ level: 100 }]) };
    const users = { getUserTimezone: async () => TZ };
    return { repository, budgetService, svc: new RecurringExpenseService(repository, users, {}, {}, { formatAmount: String, escapeMarkdown: String }, budgetService) };
  }

  test('a new day that has come this month while the month is not recorded — this month is recorded now (like cron)', async () => {
    const { svc, repository } = service({ dueRows: [due, { ...due, id: 2 }] });
    const result = await svc.update(ME, 1, { amount: 500, currency: 'RUB', description: 'интернет', dayOfMonth: 5, categoryId: 7 });
    expect(repository.update).toHaveBeenCalledWith(ME, 1, { amount: 500, currency: 'RUB', description: 'интернет', dayOfMonth: 5, categoryId: 7 });
    expect(repository.chargeForMonth).toHaveBeenCalledTimes(1);
    expect(repository.chargeForMonth).toHaveBeenCalledWith(due, '2026-11-01');
    expect(result).toMatchObject({ chargedNow: true, budgetWarnings: [{ level: 100 }], item: { id: 1 } });
  });

  test('not due — nothing is recorded; missing — null', async () => {
    const { svc, repository } = service();
    expect(await svc.update(ME, 1, { amount: 1, currency: 'RUB', description: 'x', dayOfMonth: 20, categoryId: 7 })).toMatchObject({ chargedNow: false });
    expect(repository.chargeForMonth).not.toHaveBeenCalled();
    expect(await service({ updated: false }).svc.update(ME, 1, { amount: 1, currency: 'RUB', description: 'x', dayOfMonth: 20, categoryId: 7 })).toBeNull();
  });

  test('restore: only own row, limit holds', async () => {
    const { svc, repository } = service();
    expect(await svc.restore(OTHER, { id: 1, user_id: String(ME) })).toBeNull();
    expect(await svc.restore(ME, { id: 1, user_id: String(ME) })).toMatchObject({ id: 1 });
    repository.countByUser.mockResolvedValueOnce(20);
    await expect(svc.restore(ME, { id: 1, user_id: String(ME) })).rejects.toMatchObject({ code: 'recurring_limit' });
  });
});
