// Mini App, раздел «Расходы»: день, форма траты, несколько записей и голос, карточка записи, свои категории, чеки.
// Сервисы — заглушки с поведением бота; проверяем права, валидацию, премиум, семью и то, что зовутся те же сервисы.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const ExpenseService = require('../services/ExpenseService');
const { localToday } = require('../utils/period');
const { addDays } = require('../utils/period');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const WIFE = 1066875127;
const STRANGER = 555;
const TZ = 'Asia/Novosibirsk';
const TODAY = localToday(TZ);
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'X', language_code: 'ru' }) }, TOKEN)}`;

const CATEGORIES = [
  { id: 13, name: 'Еда', icon: '🍕', user_id: 0 },
  { id: 14, name: 'Транспорт', icon: '🚗', user_id: 0 },
  { id: 18, name: 'Другое', icon: '📦', user_id: 0 },
  { id: 715, name: 'Клоун', icon: '🤡', user_id: ME }
];

function row(overrides = {}) {
  return {
    id: 1, user_id: ME, amount: '250.00', currency: 'RUB', description: 'кофе', category_id: 13, category_name: 'Еда', category_icon: '🍕',
    created_at_utc: new Date(), family_id: null, recurring_expense_id: null, receipt_id: null, import_id: null, username: 'ilu', first_name: 'Илья',
    ...overrides
  };
}

function setup({ premium = true, family = { id: 7, owner_id: ME }, familyMode = false, homeFamily = false, expenses = {}, voiceConfigured = true, receiptConfigured = true } = {}) {
  const store = new Map(Object.entries(expenses).map(([id, value]) => [Number(id), value]));
  const services = {
    localizationService: new LocalizationService(),
    formatter: new Formatter({ convert: async (amount) => amount }),
    enhancedValidator: new (require('../utils/enhancedValidator'))(),
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => TZ, getUserPeriodStartDay: async () => 1,
      getUserById: async (id) => ({ id, family_mode: familyMode, created_at: new Date(Date.now() - 3 * 86400000) })
    },
    premiumService: {
      isPremiumUser: jest.fn(async () => premium),
      getUserLimits: jest.fn(async () => ({ MAX_DESCRIPTION_LENGTH: premium ? 160 : 80, MAX_CUSTOM_CATEGORIES: premium ? 5 : 0 }))
    },
    familyService: { getUserFamily: jest.fn(async () => family) },
    budgetService: {
      scopeFor: async (id) => (homeFamily && family ? { familyId: family.id } : id),
      checkAfterExpense: jest.fn(async (userId, name) => (name === 'Еда' ? [{ id: 3, level: 80, ratio: 0.85 }] : [])),
      warningText: () => '⚠️ *Бюджет* «Еда»: 85%'
    },
    expenseHandlers: { familyModeTarget: jest.fn(async () => (familyMode && premium && family ? family.id : null)) },
    achievementService: { track: jest.fn(async (userId, event) => (event === 'expense_added' ? '🪙 *+5 монет*' : '')) },
    roastService: { afterExpenses: jest.fn(async () => '') },
    planningService: { getAllowance: jest.fn(async () => ({ mode: 'income', daily: 3800.4, spentToday: 1370, deficit: 0, pace: 'good', currency: 'RUB' })) },
    expenseService: {
      getExpenses: jest.fn(async () => [row({ id: 1, created_at_utc: new Date(Date.now() - 3600000) }), row({ id: 2, amount: '400', description: 'такси', category_name: 'Транспорт', created_at_utc: new Date() })]),
      getCategories: jest.fn(async () => (premium ? CATEGORIES : CATEGORIES.filter(c => c.user_id === 0))),
      getCategoryUsage: jest.fn(async () => [{ categoryId: 14, count: 9 }, { categoryId: 715, count: 2 }]),
      getDefaultCategory: async () => CATEGORIES[2],
      getRememberedCategory: jest.fn(async (userId, description, categories) => (description && description.startsWith('такси') ? categories.find(c => c.id === 14) : null)),
      addExpense: jest.fn(async (userId, data) => { const created = row({ id: 99, ...data, amount: data.amount, category_id: data.categoryId, family_id: data.familyId, created_at_utc: data.createdAt || new Date() }); store.set(99, created); return created; }),
      getExpenseById: jest.fn(async (userId, id) => {
        const found = store.get(Number(id));
        if (!found) return undefined;
        if (Number(found.user_id) !== userId && !(found.family_id && family && found.family_id === family.id)) return undefined;
        return { ...found, user_username: found.username, user_first_name: found.first_name };
      }),
      updateExpenseById: jest.fn(async (userId, id, data) => Object.assign(store.get(id), data)),
      updateExpenseCategory: jest.fn(async (userId, id, categoryId) => Object.assign(store.get(id), { category_id: categoryId, category_name: CATEGORIES.find(c => c.id === categoryId).name })),
      setExpenseDate: jest.fn(async (userId, id) => store.get(id)),
      deleteExpenseById: jest.fn(async (userId, id) => { const found = store.get(id); store.delete(id); return found; }),
      restoreExpense: jest.fn(async (userId, deleted) => { const restored = { ...deleted, id: 500 }; store.set(500, restored); return restored; }),
      convertToFamilyExpense: jest.fn(async (userId, id, familyId) => Object.assign(store.get(id), { family_id: familyId })),
      removeFromFamilyExpense: jest.fn(async (userId, id) => Object.assign(store.get(id), { family_id: null }))
    },
    incomeService: { getIncomeCurrency: async () => 'USD', addIncome: jest.fn(async (userId, amount, currency, description) => ({ id: 41, amount, currency, description })) },
    entryBatchService: {
      record: jest.fn(async () => ({ batchId: 12, defaulted: 1 })),
      getItems: jest.fn(async () => ({ expenses: [row({ id: 61, description: 'кофе', category_name: 'Другое' }), row({ id: 62, description: 'такси', category_name: 'Транспорт' })], incomes: [] })),
      undo: jest.fn(async (userId, id) => (id === 12 ? { expenses: 2, incomes: 0 } : null))
    },
    voiceService: {
      configured: voiceConfigured, premiumLimit: 300,
      checkLimit: jest.fn(async () => ({ isPremium: premium, limit: 20, used: 3, remaining: 17 })),
      transcribe: jest.fn(async () => 'кофе двести пятьдесят такси четыреста')
    },
    categoryService: {
      getUserCategories: jest.fn(async () => CATEGORIES.filter(c => c.user_id === ME)),
      createUserCategory: jest.fn(async (userId, name, icon) => ({ id: 801, name, icon })),
      updateUserCategory: jest.fn(async (userId, id, name, icon) => ({ id, name, icon })),
      deleteUserCategory: jest.fn(async (userId, id) => (id === 715 ? { id } : null))
    },
    receiptService: {
      configured: receiptConfigured, premiumLimit: 300,
      checkLimit: jest.fn(async () => ({ isPremium: premium, limit: 10, used: 2, remaining: 8 })),
      recognizePhoto: jest.fn(),
      findDuplicate: jest.fn(async () => null),
      addAttempt: jest.fn(async () => 77),
      saveDraft: jest.fn(async () => {}),
      record: jest.fn(async () => 31),
      getExpenses: jest.fn(async () => [row({ id: 71, receipt_id: 31 }), row({ id: 72, receipt_id: 31, category_name: 'Транспорт' })]),
      deleteDraft: jest.fn(async () => {}),
      categoriesById: async () => new Map(CATEGORIES.map(c => [c.id, c])),
      getDraft: jest.fn(),
      updateDraft: jest.fn(),
      takeDraft: jest.fn(),
      releaseDraft: jest.fn(async () => {}),
      getReceipt: jest.fn(async (userId, id) => (userId === ME && id === 31 ? { id: 31, user_id: ME, status: 'active', merchant: 'SPAR', purchased_day: TODAY, purchased_hm: '18:42', currency: 'RUB', printed_total: '700', items_total: '650', created_at: new Date() } : undefined)),
      confirm: jest.fn(async () => ({ id: 31 })),
      undo: jest.fn(async () => ({ expenses: 2 })),
      setDate: jest.fn(async () => ({ expenses: 2 }))
    }
  };
  const get = (name) => services[name];
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get, rateLimit: 10000 }).app, services, store };
}

describe('mini app expenses: day', () => {
  test('own day: newest first, total in the main currency, «Можно сегодня» from planning, switch only with a family', async () => {
    const { app, services } = setup();
    const res = await request(app).get('/api/expenses/day').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ date: TODAY, scope: 'mine', homeScope: 'mine', canSwitch: true, total: 650, count: 2 });
    expect(res.body.expenses.map(e => e.id)).toEqual([2, 1]);
    expect(res.body.allowance).toEqual({ mode: 'income', daily: 3800, spentToday: 1370, deficit: 0, pace: 'good', currency: 'RUB' });
    expect(services.expenseService.getExpenses).toHaveBeenCalledWith(ME, TZ, { start: TODAY, end: addDays(TODAY, 1) });
  });

  test('family day: family records with author; «Можно сегодня» only on the home scope; future — 400', async () => {
    const { app, services } = setup();
    services.expenseService.getExpenses.mockResolvedValueOnce([row({ user_id: WIFE, family_id: 7, first_name: 'Юля' })]);
    const res = await request(app).get('/api/expenses/day?scope=family').set('Authorization', auth()).expect(200);
    expect(services.expenseService.getExpenses).toHaveBeenCalledWith({ familyId: 7 }, TZ, expect.any(Object));
    expect(res.body.expenses[0].author).toEqual({ id: WIFE, name: 'Юля' });
    expect(res.body.allowance).toBeNull();
    await request(app).get(`/api/expenses/day?date=${addDays(TODAY, 1)}`).set('Authorization', auth()).expect(400, { error: 'ex_date_future' });
  });

  test('family without premium — 402, without a family — 400', async () => {
    await request(setup({ premium: false }).app).get('/api/expenses/day?scope=family').set('Authorization', auth()).expect(402);
    await request(setup({ family: null }).app).get('/api/expenses/day?scope=family').set('Authorization', auth()).expect(400, { error: 'ex_not_family_member' });
  });

  test('«все траты в семью»: the day opens as family', async () => {
    const res = await request(setup({ familyMode: true, homeFamily: true }).app).get('/api/expenses/day').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ scope: 'family', homeScope: 'family' });
    expect(res.body.allowance).not.toBeNull();
  });
});

describe('mini app expenses: add', () => {
  test('form: frequent categories first, custom marked, family default from family mode', async () => {
    const res = await request(setup({ familyMode: true }).app).get('/api/expenses/form').set('Authorization', auth()).expect(200);
    expect(res.body.categories.map(c => c.id)).toEqual([14, 715, 13, 18]);
    expect(res.body.categories[1]).toMatchObject({ custom: true, used: true });
    expect(res.body).toMatchObject({ canFamily: true, familyDefault: true, maxDescription: 160, voice: true, receipts: true, defaultCategoryId: 18 });
  });

  test('suggest: the remembered category for the description', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/expenses/suggest?description=такси #отпуск').set('Authorization', auth()).expect(200)).body).toEqual({ categoryId: 14 });
    expect((await request(app).get('/api/expenses/suggest?description=хлеб').set('Authorization', auth()).expect(200)).body).toEqual({ categoryId: null });
  });

  test('save: family by family mode, notes — achievements and budget warning as plain text', async () => {
    const { app, services } = setup({ familyMode: true });
    const res = await request(app).post('/api/expenses').set('Authorization', auth())
      .send({ amount: '250,5', description: 'кофе #утро', categoryId: 13 }).expect(201);
    expect(services.expenseService.addExpense).toHaveBeenCalledWith(ME, { amount: 250.5, currency: 'RUB', description: 'кофе #утро', categoryId: 13, familyId: 7, createdAt: null });
    expect(res.body.notes).toEqual(['🪙 +5 монет', '⚠️ Бюджет «Еда»: 85%']);
    expect(services.budgetService.checkAfterExpense).toHaveBeenCalledWith(ME, 'Еда');
    expect(services.roastService.afterExpenses).toHaveBeenCalledWith({ chat: { type: 'private' }, from: { id: ME } }, expect.objectContaining({ userId: ME, source: 'text' }));
    expect(res.body.expense).toMatchObject({ id: 99, amount: 250.5, family: true, mine: true });
  });

  test('save on another day keeps the record in the past; explicit personal while family mode is on', async () => {
    const { app, services } = setup({ familyMode: true });
    await request(app).post('/api/expenses').set('Authorization', auth()).send({ amount: 100, categoryId: 14, date: addDays(TODAY, -2), family: false }).expect(201);
    const [, data] = services.expenseService.addExpense.mock.calls[0];
    expect(data.familyId).toBeNull();
    expect(data.createdAt).toBeInstanceOf(Date);
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(data.createdAt)).toBe(addDays(TODAY, -2));
  });

  test('validation: amount, currency, category of the user, description length, date range', async () => {
    const { app, services } = setup({ premium: false });
    const post = (body) => request(app).post('/api/expenses').set('Authorization', auth()).send({ amount: 100, categoryId: 13, ...body });
    await post({ amount: 0 }).expect(400, { error: 'ex_amount' });
    await post({ amount: 100000000 }).expect(400, { error: 'ex_amount' });
    await post({ currency: 'XXX' }).expect(400, { error: 'ex_bad_currency' });
    await post({ categoryId: 715 }).expect(400, { error: 'ex_bad_category' }); // своя категория без премиума недоступна
    await post({ description: 'а'.repeat(81) }).expect(400, { error: 'ex_description_too_long', max: 80 });
    await post({ date: addDays(TODAY, 1) }).expect(400, { error: 'ex_date_future' });
    await post({ date: addDays(TODAY, -366) }).expect(400, { error: 'ex_date_too_old' });
    await post({ family: true }).expect(402);
    expect(services.expenseService.addExpense).not.toHaveBeenCalled();
  });

  test('voice flag counts «первое голосовое» like the bot', async () => {
    const { app, services } = setup();
    await request(app).post('/api/expenses').set('Authorization', auth()).send({ amount: 100, categoryId: 14, voice: true }).expect(201);
    expect(services.achievementService.track.mock.calls.map(call => call[1])).toEqual(['expense_added', 'voice_used']);
  });
});

describe('mini app expenses: several entries and voice', () => {
  test('preview: currency and category as the bot would record; errors for too many and bad amounts', async () => {
    const { app } = setup();
    const res = await request(app).post('/api/expenses/parse').set('Authorization', auth()).send({ text: 'кофе 250, такси 400, +50000 зарплата' }).expect(200);
    expect(res.body.error).toBeNull();
    expect(res.body.entries).toEqual([
      { kind: 'expense', amount: 250, currency: 'RUB', description: 'кофе', category: { id: 18, name: 'Другое', label: 'Другое', icon: '📦' }, guessed: true },
      { kind: 'expense', amount: 400, currency: 'RUB', description: 'такси', category: { id: 14, name: 'Транспорт', label: 'Транспорт', icon: '🚗' }, guessed: false },
      { kind: 'income', amount: 50000, currency: 'USD', description: 'зарплата' }
    ]);
    const many = Array.from({ length: 21 }, (_, i) => `кофе ${i + 1}`).join(', ');
    expect((await request(app).post('/api/expenses/parse').set('Authorization', auth()).send({ text: many }).expect(200)).body.error).toBe('too_many');
    expect((await request(app).post('/api/expenses/parse').set('Authorization', auth()).send({ text: 'просто текст' }).expect(200)).body).toEqual({ entries: [], error: null });
  });

  test('batch: one transaction through EntryBatchService with family mode, notes once; undo all', async () => {
    const { app, services } = setup({ familyMode: true });
    const res = await request(app).post('/api/expenses/batch').set('Authorization', auth()).send({ text: 'кофе 250, такси 400' }).expect(201);
    expect(services.entryBatchService.record).toHaveBeenCalledWith(ME, [
      { kind: 'expense', amount: 250, currency: 'RUB', description: 'кофе' },
      { kind: 'expense', amount: 400, currency: 'RUB', description: 'такси' }
    ], { source: 'text', familyId: 7 });
    expect(res.body).toMatchObject({ batchId: 12, defaulted: 1 });
    expect(res.body.expenses.map(e => e.id)).toEqual([61, 62]);
    expect(services.achievementService.track).toHaveBeenCalledWith(ME, 'expense_added', expect.objectContaining({ categoryNames: ['Другое', 'Транспорт'] }));
    await request(app).post('/api/expenses/batch/12/undo').set('Authorization', auth()).expect(200, { removed: 2 });
    await request(app).post('/api/expenses/batch/13/undo').set('Authorization', auth()).expect(404, { error: 'ex_batch_undone' });
  });

  test('single income — through the income service, like «+50000 зарплата»; nothing — 400', async () => {
    const { app, services } = setup();
    const res = await request(app).post('/api/expenses/batch').set('Authorization', auth()).send({ text: '+50000 зарплата' }).expect(201);
    expect(services.incomeService.addIncome).toHaveBeenCalledWith(ME, 50000, 'USD', 'зарплата');
    expect(services.entryBatchService.record).not.toHaveBeenCalled();
    expect(res.body.incomes).toEqual([{ id: 41, amount: 50000, currency: 'USD', description: 'зарплата' }]);
    await request(app).post('/api/expenses/batch').set('Authorization', auth()).send({ text: 'привет' }).expect(400, { error: 'ex_no_entries' });
  });

  test('voice: transcription with the daily limit, spoken numbers become entries; limit and setup errors', async () => {
    const { app, services } = setup();
    const res = await request(app).post('/api/expenses/voice?duration=4').set('Authorization', auth()).set('Content-Type', 'audio/webm').send(Buffer.from('voice')).expect(200);
    expect(services.voiceService.transcribe).toHaveBeenCalledWith(ME, expect.any(Buffer), expect.objectContaining({ lang: 'ru', timezone: TZ, durationSec: 4 }));
    expect(res.body.transcript).toBe('кофе двести пятьдесят такси четыреста');
    expect(res.body.entries.map(e => [e.description, e.amount])).toEqual([['кофе', 250], ['такси', 400]]);

    services.voiceService.checkLimit.mockResolvedValueOnce({ isPremium: false, limit: 20, used: 20, remaining: 0 });
    await request(app).post('/api/expenses/voice').set('Authorization', auth()).set('Content-Type', 'audio/mp4').send(Buffer.from('v'))
      .expect(400, { error: 'voice_limit', used: 20, limit: 20, premium: 300, isPremium: false });
    await request(app).post('/api/expenses/voice?duration=61').set('Authorization', auth()).set('Content-Type', 'audio/webm').send(Buffer.from('v')).expect(400);
    await request(setup({ voiceConfigured: false }).app).post('/api/expenses/voice').set('Authorization', auth()).set('Content-Type', 'audio/webm').send(Buffer.from('v')).expect(400, { error: 'voice_not_configured' });
  });
});

describe('mini app expenses: record card', () => {
  const expenses = () => ({ 1: row({ id: 1 }), 2: row({ id: 2, user_id: WIFE, family_id: 7, first_name: 'Юля' }), 3: row({ id: 3, user_id: STRANGER }) });

  test('own record: editable, family action for premium with a family; others’ family record — view only; stranger — 404', async () => {
    const { app } = setup({ expenses: expenses() });
    const own = await request(app).get('/api/expenses/1').set('Authorization', auth()).expect(200);
    expect(own.body).toMatchObject({ canEdit: true, familyAction: 'add', maxDescription: 160 });
    const wife = await request(app).get('/api/expenses/2').set('Authorization', auth()).expect(200);
    expect(wife.body).toMatchObject({ canEdit: false, familyAction: null, maxDescription: null });
    expect(wife.body.expense.author).toEqual({ id: WIFE, name: 'Юля' });
    await request(app).get('/api/expenses/3').set('Authorization', auth()).expect(404);
    await request(app).patch('/api/expenses/2').set('Authorization', auth()).send({ amount: 1 }).expect(403, { error: 'ex_not_owner' });
    await request(app).delete('/api/expenses/2').set('Authorization', auth()).expect(403);
    await request(app).delete('/api/expenses/3').set('Authorization', auth()).expect(404);
  });

  test('edit in place: amount and currency, category (remembered from now on), date; budget warnings after', async () => {
    const { app, services } = setup({ expenses: expenses() });
    const res = await request(app).patch('/api/expenses/1').set('Authorization', auth()).send({ amount: 300, currency: 'usd', categoryId: 13, date: addDays(TODAY, -1) }).expect(200);
    expect(services.expenseService.updateExpenseById).toHaveBeenCalledWith(ME, 1, { amount: 300, currency: 'USD', description: 'кофе' });
    expect(services.expenseService.updateExpenseCategory).toHaveBeenCalledWith(ME, 1, 13);
    expect(services.expenseService.setExpenseDate).toHaveBeenCalledWith(ME, 1, addDays(TODAY, -1), TZ);
    expect(res.body.notes).toEqual(['⚠️ Бюджет «Еда»: 85%']);
    await request(app).patch('/api/expenses/1').set('Authorization', auth()).send({ categoryId: 999 }).expect(400, { error: 'ex_bad_category' });
  });

  test('family toggle: premium only, own only, needs a family', async () => {
    const { app, services } = setup({ expenses: expenses() });
    const res = await request(app).post('/api/expenses/1/family').set('Authorization', auth()).send({ family: true }).expect(200);
    expect(services.expenseService.convertToFamilyExpense).toHaveBeenCalledWith(ME, 1, 7);
    expect(res.body.expense.family).toBe(true);
    await request(app).post('/api/expenses/1/family').set('Authorization', auth()).send({ family: true }).expect(400, { error: 'ex_already_family' });
    await request(app).post('/api/expenses/1/family').set('Authorization', auth()).send({ family: false }).expect(200);
    await request(setup({ premium: false, expenses: expenses() }).app).post('/api/expenses/1/family').set('Authorization', auth()).send({ family: true }).expect(402);
  });

  test('delete and «Вернуть»: the same row back, only for the same user and once', async () => {
    const { app, services } = setup({ expenses: expenses() });
    const { body } = await request(app).delete('/api/expenses/1').set('Authorization', auth()).expect(200);
    expect(body.token).toMatch(/^[0-9a-f]{24}$/);
    await request(app).post('/api/expenses/restore').set('Authorization', auth(STRANGER)).send({ token: body.token }).expect(404, { error: 'ex_undo_expired' });
    const restored = await request(app).post('/api/expenses/restore').set('Authorization', auth()).send({ token: body.token }).expect(200);
    expect(services.expenseService.restoreExpense).toHaveBeenCalledWith(ME, expect.objectContaining({ id: 1, description: 'кофе' }));
    expect(restored.body.expense.id).toBe(500);
    await request(app).post('/api/expenses/restore').set('Authorization', auth()).send({ token: body.token }).expect(404);
  });
});

describe('mini app expenses: custom categories', () => {
  test('premium only; create with an emoji icon, limit and duplicate — bot error codes', async () => {
    await request(setup({ premium: false }).app).get('/api/categories').set('Authorization', auth()).expect(402);
    const { app, services } = setup();
    expect((await request(app).get('/api/categories').set('Authorization', auth()).expect(200)).body).toEqual({ categories: [{ id: 715, name: 'Клоун', icon: '🤡' }], max: 5, nameMax: 30 });
    await request(app).post('/api/categories').set('Authorization', auth()).send({ name: ' Питомец ', icon: '🐶' }).expect(201);
    expect(services.categoryService.createUserCategory).toHaveBeenCalledWith(ME, 'Питомец', '🐶');
    await request(app).post('/api/categories').set('Authorization', auth()).send({ name: 'a'.repeat(31) }).expect(400);
    await request(app).post('/api/categories').set('Authorization', auth()).send({ name: 'Кот', icon: 'ab' }).expect(400, { error: 'ex_bad_icon' });
    services.categoryService.createUserCategory.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'LIMIT_REACHED', max: 5 }));
    await request(app).post('/api/categories').set('Authorization', auth()).send({ name: 'Кот' }).expect(400, { error: 'ex_category_limit', max: 5 });
    services.categoryService.createUserCategory.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'ALREADY_EXISTS' }));
    await request(app).post('/api/categories').set('Authorization', auth()).send({ name: 'Клоун' }).expect(400, { error: 'ex_category_exists' });
  });

  test('rename keeps the icon unless a new one is given; others’ category — 404; delete moves expenses (service)', async () => {
    const { app, services } = setup();
    await request(app).patch('/api/categories/715').set('Authorization', auth()).send({ name: 'Цирк' }).expect(200);
    expect(services.categoryService.updateUserCategory).toHaveBeenCalledWith(ME, 715, 'Цирк', '🤡');
    await request(app).patch('/api/categories/13').set('Authorization', auth()).send({ name: 'Еда' }).expect(404);
    await request(app).delete('/api/categories/715').set('Authorization', auth()).expect(200);
    await request(app).delete('/api/categories/13').set('Authorization', auth()).expect(404);
  });
});

describe('mini app receipts', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const receipt = (overrides = {}) => ({ merchant: 'SPAR', date: TODAY, time: '18:42', currency: 'RUB', total: 650, itemsTotal: 650, lowConfidence: false, items: [{ id: 1, name: 'Молоко', amount: 650, quantity: 1, price: 650, categoryId: 13 }], checks: {}, nextLineId: 2, ...overrides });
  const until = async (app, id, status, user = ME) => {
    for (let i = 0; i < 50; i += 1) {
      const res = await request(app).get(`/api/receipts/jobs/${id}`).set('Authorization', auth(user));
      if (res.status !== 200 || res.body.status === status) return res;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('job did not settle');
  };

  test('confident receipt is recorded right away (family mode, attempt replaced), job visible only to its owner', async () => {
    const { app, services } = setup({ familyMode: true });
    services.receiptService.recognizePhoto.mockResolvedValue({ receipt: receipt(), image: jpeg, mimeType: 'image/jpeg', attempts: 1 });
    const { body } = await request(app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/jpeg').send(jpeg).expect(202);
    const done = await until(app, body.jobId, 'recorded');
    expect(done.body).toMatchObject({ status: 'recorded', receiptId: 31, dateUnknown: false, notes: ['⚠️ Бюджет «Еда»: 85%'] });
    expect(services.receiptService.record).toHaveBeenCalledWith(ME, expect.objectContaining({ merchant: 'SPAR' }), { timezone: TZ, familyId: 7, messageId: -body.jobId });
    expect(services.achievementService.track).toHaveBeenCalledWith(ME, 'receipt_recorded', expect.any(Object));
    await request(app).get(`/api/receipts/jobs/${body.jobId}`).set('Authorization', auth(STRANGER)).expect(404);
  });

  test('unsure or already recorded receipt becomes a draft counted once in the limit; unreadable counts too', async () => {
    const { app, services } = setup();
    services.receiptService.recognizePhoto.mockResolvedValueOnce({ receipt: receipt({ lowConfidence: true }), image: jpeg, mimeType: 'image/jpeg', attempts: 2 });
    services.receiptService.findDuplicate.mockResolvedValueOnce({ id: 9, created_at: '2026-11-01T10:00:00Z' });
    const first = (await request(app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/jpeg').send(jpeg).expect(202)).body;
    const draft = await until(app, first.jobId, 'draft');
    expect(draft.body).toMatchObject({ status: 'draft', draftId: first.jobId, canRotate: true });
    expect(services.receiptService.addAttempt).toHaveBeenCalledWith(ME, -first.jobId, 'draft');
    expect(services.receiptService.saveDraft).toHaveBeenCalledWith(ME, -first.jobId, { receipt: expect.objectContaining({ attemptId: 77, duplicateOf: { id: 9, createdAt: '2026-11-01T10:00:00Z' } }), timezone: TZ, frame: null });
    expect(services.receiptService.record).not.toHaveBeenCalled();

    services.receiptService.recognizePhoto.mockResolvedValueOnce({ error: { code: 'unreadable' }, image: jpeg, mimeType: 'image/jpeg', attempts: 2 });
    const second = (await request(app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/jpeg').send(jpeg).expect(202)).body;
    expect((await until(app, second.jobId, 'error')).body).toMatchObject({ status: 'error', code: 'unreadable' });
    expect(services.receiptService.addAttempt).toHaveBeenCalledWith(ME, -second.jobId, 'unreadable');
  });

  test('checks before recognition: configured, format, monthly limit', async () => {
    await request(setup({ receiptConfigured: false }).app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/jpeg').send(jpeg).expect(400, { error: 'receipt_not_configured' });
    const { app, services } = setup({ premium: false });
    await request(app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/gif').send(jpeg).expect(400, { error: 'receipt_format' });
    services.receiptService.checkLimit.mockResolvedValueOnce({ isPremium: false, limit: 10, used: 10, remaining: 0 });
    await request(app).post('/api/receipts').set('Authorization', auth()).set('Content-Type', 'image/jpeg').send(jpeg)
      .expect(400, { error: 'receipt_limit', used: 10, limit: 10, premium: 300, isPremium: false });
    expect(services.receiptService.recognizePhoto).not.toHaveBeenCalled();
  });

  test('draft: view with sum check, line edit by id through draftEdit, record once, outdated — 404', async () => {
    const { app, services } = setup();
    const stored = { status: 'ok', receipt: receipt({ total: 700, lowConfidence: true }), timezone: TZ, frame: null };
    services.receiptService.getDraft.mockResolvedValue(stored);
    const view = await request(app).get('/api/receipts/drafts/5').set('Authorization', auth()).expect(200);
    expect(view.body).toMatchObject({ id: 5, merchant: 'SPAR', itemsTotal: 650, total: 700, doubt: 'mismatch', check: { matches: false, exact: false, diff: -50 } });
    expect(view.body.items[0]).toMatchObject({ id: 1, name: 'Молоко', category: { id: 13, label: 'Еда' } });
    expect(services.receiptService.getDraft).toHaveBeenCalledWith(ME, -5);

    services.receiptService.updateDraft.mockImplementation(async (userId, key, change) => ({ ...stored, receipt: change(stored.receipt) }));
    const edited = await request(app).patch('/api/receipts/drafts/5/lines/1').set('Authorization', auth()).send({ amount: 700, categoryId: 14 }).expect(200);
    expect(edited.body).toMatchObject({ edited: true, doubt: null, itemsTotal: 700, check: { exact: true } });
    expect(edited.body.items[0].category.id).toBe(14);

    services.receiptService.takeDraft.mockResolvedValueOnce({ status: 'ok', receipt: { ...stored.receipt, attemptId: 77 }, timezone: TZ });
    const recorded = await request(app).post('/api/receipts/drafts/5/record').set('Authorization', auth()).expect(201);
    expect(recorded.body).toMatchObject({ receiptId: 31 });
    expect(services.receiptService.record).toHaveBeenCalledWith(ME, expect.objectContaining({ attemptId: 77 }), { timezone: TZ, familyId: null, messageId: null });
    expect(services.receiptService.deleteDraft).toHaveBeenCalledWith(ME, -5);
    expect(services.receiptService.checkLimit).not.toHaveBeenCalled(); // уже засчитан попыткой

    services.receiptService.takeDraft.mockResolvedValueOnce({ status: 'busy' });
    await request(app).post('/api/receipts/drafts/5/record').set('Authorization', auth()).expect(409, { error: 'draft_busy' });
    services.receiptService.getDraft.mockResolvedValueOnce({ status: 'missing' });
    await request(app).get('/api/receipts/drafts/5').set('Authorization', auth()).expect(404, { error: 'draft_outdated' });
  });

  test('recorded receipt: own only, mismatch with the printed total, date and undo', async () => {
    const { app, services } = setup();
    const res = await request(app).get('/api/receipts/31').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ merchant: 'SPAR', purchasedDate: TODAY, purchasedTime: '18:42', mismatch: true, printedTotal: 700, itemsTotal: 650, totals: [{ currency: 'RUB', amount: 500 }] });
    expect(res.body.expenses.map(e => e.id)).toEqual([71, 72]);
    await request(app).get('/api/receipts/31').set('Authorization', auth(STRANGER)).expect(404);
    await request(app).patch('/api/receipts/31').set('Authorization', auth()).send({ date: addDays(TODAY, -3) }).expect(200, { moved: 2 });
    expect(services.receiptService.setDate).toHaveBeenCalledWith(ME, 31, addDays(TODAY, -3), TZ);
    await request(app).patch('/api/receipts/31').set('Authorization', auth()).send({ date: addDays(TODAY, 2) }).expect(400, { error: 'ex_date_future' });
    await request(app).post('/api/receipts/31/undo').set('Authorization', auth()).expect(200, { removed: 2 });
  });
});

describe('ExpenseService for the mini app', () => {
  test('addExpense passes the moment of the record; usage — since N days; restore goes to the repository', async () => {
    const repo = {
      addExpense: jest.fn(async () => ({ id: 5 })),
      getCategoryUsage: jest.fn(async () => []),
      restoreExpense: jest.fn(async () => ({ id: 6 }))
    };
    const service = new ExpenseService(repo, { getUserCurrency: async () => 'RUB' }, {}, {}, { track: jest.fn() });
    const at = new Date('2026-11-01T10:00:00Z');
    await service.addExpense(1, { amount: 10, categoryId: 13, createdAt: at });
    expect(repo.addExpense).toHaveBeenCalledWith(1, 10, null, 13, 'RUB', null, null, at);
    await service.addExpense(1, { amount: 10, categoryId: 13 });
    expect(repo.addExpense).toHaveBeenLastCalledWith(1, 10, null, 13, 'RUB', null, null, null);
    await service.getCategoryUsage(1, 30);
    const since = repo.getCategoryUsage.mock.calls[0][1];
    expect(Math.round((Date.now() - since.getTime()) / 86400000)).toBe(30);
    expect(await service.restoreExpense(1, { id: 4 })).toEqual({ id: 6 });
  });
});
