// Регрессии аудита, слайс B: ввод сумм, черновики трат, сброс состояний, CSV, длина списков, владелец категории
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const StateService = require('../services/StateService');
const LocalizationService = require('../services/LocalizationService');
const ExpenseHandlers = require('../handlers/ExpenseHandlers');
const CallbackHandlers = require('../handlers/callbacks');
const MessageHandlers = require('../handlers/messages');
const IncomeHandlers = require('../handlers/IncomeHandlers');
const RecurringExpenseHandlers = require('../handlers/RecurringExpenseHandlers');
const RecurringExpenseService = require('../services/RecurringExpenseService');
const CategoryService = require('../services/CategoryService');
const CategoryRepository = require('../repositories/CategoryRepository');
const stateCleanupMiddleware = require('../middleware/stateCleanupMiddleware');

const localizationService = new LocalizationService();
const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'ka', 'kz', 'uz', 'hi', 'jp', 'zh'];
const identityRates = { convert: async (amount) => Number(amount) };

describe('money input parsing (REC-3, REC-4, REC-5)', () => {
  const validator = new EnhancedValidator();
  const expense = { maxAmount: validator.limits.maxAmount, maxDescriptionLength: 160, requireDescription: false };

  test.each([
    ['1 000 кофе', 1000, null, 'кофе'],
    ['15 000 зарплата', 15000, null, 'зарплата'],
    ['1 000,50 € кофе', 1000.5, 'EUR', 'кофе'],
    ['50 000 аренда', 50000, null, 'аренда'],
    ['1\u00a0000 такси', 1000, null, 'такси'],
    ['12 345 678 машина', 12345678, null, 'машина'],
    ['100 2020 год', 100, null, '2020 год'],
    ['250 кофе', 250, null, 'кофе'],
    ['300$', 300, 'USD', null]
  ])('%s → %d', (input, amount, currency, description) => {
    expect(validator.parseMoneyInput(input, expense)).toEqual({ isValid: true, amount, currency, description });
  });

  test('limit is the expenses.amount column limit, not 999 999', () => {
    expect(validator.parseMoneyInput('1500000 UZS аренда', expense)).toMatchObject({ isValid: true, amount: 1500000, currency: 'UZS' });
    expect(validator.parseMoneyInput('99999999 аренда', expense)).toMatchObject({ isValid: true, amount: 99999999 });
    expect(validator.parseMoneyInput('100000000 аренда', expense)).toMatchObject({ isValid: false, error: 'amount' });
  });

  test.each(['350 bottle of wine', '500 robot vacuum', '200 Abbott pharmacy', '90 administration fee', '700 sound system', '40 beetroot', '15 spam musubi'])(
    'ordinary words pass: %s', (input) => {
      expect(validator.parseMoneyInput(input, expense)).toMatchObject({ isValid: true });
    }
  );

  test('real checks stay: control characters and length', () => {
    expect(validator.parseMoneyInput('500 кофе\u0007', expense).isValid).toBe(false);
    expect(validator.parseMoneyInput(`500 ${'a'.repeat(161)}`, expense)).toMatchObject({ isValid: false, error: 'too_long' });
  });

  test('edit: thousands separator and stop words', () => {
    expect(validator.parseEditExpense('1 000')).toEqual({ isValid: true, amount: 1000, description: undefined });
    expect(validator.parseEditExpense('1 000 обед')).toEqual({ isValid: true, amount: 1000, description: 'обед' });
    expect(validator.parseEditExpense('1500000 аренда')).toMatchObject({ isValid: true, amount: 1500000 });
    expect(validator.parseEditExpense('100000000')).toMatchObject({ isValid: false, error: 'amount' });
    expect(validator.parseEditExpense('robot vacuum')).toEqual({ isValid: true, amount: undefined, description: 'robot vacuum' });
  });
});

describe('CSV export (REC-6, REC-7, Q5)', () => {
  const formatter = new Formatter(identityRates);
  const row = (description, extra = {}) => ({
    amount: '10.00', currency: 'RUB', category_name: 'Еда', description, created_at_utc: new Date('2026-10-01T10:00:00Z'), ...extra
  });

  test('starts with BOM; Russian Excel format: ";" delimiter and decimal comma', async () => {
    const csv = await formatter.formatCSV([row('обед; с другом')], 'RUB', 'UTC', localizationService, 'ru');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const [header, line] = csv.slice(1).split('\n');
    expect(header.split(';')).toHaveLength(5);
    expect(line).toBe('"01.10.2026, 10:00";"10,00";"RUB";"Еда";"обед; с другом"');
  });

  test('English Excel format: "," delimiter and decimal point', async () => {
    const csv = await formatter.formatCSV([row('lunch, with a friend')], 'USD', 'UTC', localizationService, 'en');
    const [header, line] = csv.slice(1).split('\n');
    expect(header.split(',')).toHaveLength(5);
    expect(line).toBe('"01.10.2026, 10:00","10.00","RUB","Food","lunch, with a friend"');
  });

  test('neutralises formulas in text cells, leaves the amount alone', async () => {
    const csv = await formatter.formatCSV([
      row('=HYPERLINK("http://evil","x")'), row('+cmd'), row('-2+3'), row('@SUM(1)'), row('\tx'), row('обычное')
    ], 'RUB', 'UTC');
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"",""x"")"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'-2+3"');
    expect(csv).toContain('"\'@SUM(1)"');
    expect(csv).toContain('"\'\tx"');
    expect(csv).toContain('"обычное"');
    expect(csv).toContain('"10,00"');
    expect(csv).not.toMatch(/(^|;)"[=+\-@]/m);
  });

  test('currency totals have no float noise', async () => {
    const csv = await formatter.formatCSV([row('a', { amount: '0.10' }), row('b', { amount: '0.20' })], 'RUB', 'UTC');
    expect(csv).not.toContain('0.30000000000000004');
    expect(csv).toContain(`"RUB: ${formatter.formatAmount(0.3, 'RUB')}"`);
  });
});

describe('Markdown in statistics and category screen (TG-1, TG-2)', () => {
  test('family statistics escape custom category names', async () => {
    const formatter = new Formatter(identityRates);
    const text = await formatter.formatStats(
      { byCurrency: [{ currency: 'RUB', total: 12 }], count: 1 },
      [{ icon: '📦', name: 'kids_stuff*', total: 12, currency: 'RUB' }],
      'RUB', 'month', localizationService, 'ru'
    );
    expect(text).toContain('kids\\_stuff\\*');
  });
});

// Обработчики трат с заглушками сервисов; черновики — в настоящем StateService
function buildExpenseFlow({ stateService = new StateService(), categories, familyMode = false, premium = false, family = null } = {}) {
  let nextMessageId = 100;
  const expenses = [];
  const cats = categories || [{ id: 13, name: 'Еда', icon: '🍔', user_id: 0 }, { id: 14, name: 'Транспорт', icon: '🚕', user_id: 0 }];
  const expenseService = {
    getCategories: jest.fn(async () => cats),
    getRememberedCategory: jest.fn(async () => null),
    getDefaultCategory: jest.fn(async () => cats[0]),
    addExpense: jest.fn(async (userId, data) => {
      const expense = { id: expenses.length + 1, user_id: userId, ...data };
      expenses.push(expense);
      return expense;
    }),
    getExpenseById: jest.fn(async (userId, id) => {
      const e = expenses.find(x => x.id === id);
      const category = cats.find(c => c.id === e?.categoryId);
      return e && { ...e, amount: String(e.amount), currency: e.currency || 'RUB', category_name: category?.name, category_icon: category?.icon, created_at_utc: new Date() };
    })
  };
  const userService = {
    getUserLanguage: jest.fn(async () => 'ru'),
    getUserCurrency: jest.fn(async () => 'RUB'),
    getUserTimezone: jest.fn(async () => 'UTC'),
    getUserById: jest.fn(async (id) => ({ id, family_mode: familyMode }))
  };
  const premiumService = {
    getUserLimits: jest.fn(async () => ({ MAX_DESCRIPTION_LENGTH: 60 })),
    isPremiumUser: jest.fn(async () => premium)
  };
  const expenseHandlers = new ExpenseHandlers({
    expenseService,
    userService,
    premiumService,
    familyService: { getUserFamily: jest.fn(async () => family) },
    localizationService,
    formatter: new Formatter(identityRates),
    stateService,
    validator: new EnhancedValidator(),
    budgetService: { checkAfterExpense: jest.fn(async () => []) }
  });
  const callbackHandlers = new CallbackHandlers({ userService, localizationService, stateService, expenseService, premiumService });

  const messageCtx = (text) => ({
    from: { id: 7 },
    message: { text },
    reply: jest.fn(async () => ({ message_id: nextMessageId++ }))
  });
  const callbackCtx = (data, messageId) => ({
    from: { id: 7 },
    callbackQuery: { data, message: { message_id: messageId } },
    match: data.match(/^category\|(\d+)$/),
    answerCbQuery: jest.fn(async () => true),
    editMessageText: jest.fn(async () => true),
    reply: jest.fn(async () => ({ message_id: nextMessageId++ }))
  });
  const send = async (text) => {
    const ctx = messageCtx(text);
    await expenseHandlers.handleExpenseInput(ctx, text, 'ru');
    return ctx.reply.mock.results[0].value.then(m => m.message_id);
  };
  const tap = async (categoryId, messageId) => {
    const ctx = callbackCtx(`category|${categoryId}`, messageId);
    await expenseHandlers.handleCategorySelection(ctx);
    return ctx;
  };
  return { stateService, expenseHandlers, callbackHandlers, expenseService, expenses, send, tap, callbackCtx };
}

const outdated = localizationService.getText('ru', 'expense_draft_outdated');

describe('expense draft is bound to its category card (REC-2, TG-4, PLT-4)', () => {
  test('the first card records its own draft, the second card its own', async () => {
    const flow = buildExpenseFlow();
    const first = await flow.send('500 подарок маме');
    const second = await flow.send('300 такси до дома');

    await flow.tap(13, first);
    await flow.tap(14, second);

    expect(flow.expenses.map(e => [Number(e.amount), e.description, e.categoryId])).toEqual([
      [500, 'подарок маме', 13],
      [300, 'такси до дома', 14]
    ]);
  });

  test('cancel deletes the draft: its buttons no longer record anything', async () => {
    const flow = buildExpenseFlow();
    const card = await flow.send('900 новая куртка');
    await flow.callbackHandlers.handleCancel(flow.callbackCtx('cancel', card));
    expect(flow.stateService.hasPendingExpense(7)).toBe(false);

    const ctx = await flow.tap(13, card);
    expect(flow.expenseService.addExpense).not.toHaveBeenCalled();
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(outdated, { show_alert: true });
  });

  test('cancel on one card keeps the other draft', async () => {
    const flow = buildExpenseFlow();
    const first = await flow.send('250 первый');
    const second = await flow.send('777 второй');
    await flow.callbackHandlers.handleCancel(flow.callbackCtx('cancel', second));
    await flow.tap(13, first);
    expect(flow.expenses.map(e => [Number(e.amount), e.description])).toEqual([[250, 'первый']]);
  });

  test('after a restart a stale card says the draft is outdated', async () => {
    const flow = buildExpenseFlow();
    const card = await flow.send('250 обед');
    const restarted = buildExpenseFlow({ stateService: new StateService() });
    const ctx = await restarted.tap(13, card);
    expect(restarted.expenseService.addExpense).not.toHaveBeenCalled();
    expect(ctx.answerCbQuery).toHaveBeenCalledWith(outdated, { show_alert: true });
  });

  test('a double tap processed in parallel records one expense', async () => {
    const flow = buildExpenseFlow();
    const card = await flow.send('250 обед');
    const [a, b] = await Promise.all([flow.tap(13, card), flow.tap(14, card)]);
    expect(flow.expenseService.addExpense).toHaveBeenCalledTimes(1);
    // Второе нажатие не просит прислать трату заново
    const answers = [...a.answerCbQuery.mock.calls, ...b.answerCbQuery.mock.calls];
    expect(answers.some(([text]) => text === outdated)).toBe(false);
  });

  test('if saving fails the draft stays on its card', async () => {
    const flow = buildExpenseFlow();
    const card = await flow.send('250 обед');
    flow.expenseService.addExpense.mockRejectedValueOnce(new Error('db down'));
    await expect(flow.tap(13, card)).rejects.toThrow('db down');
    await flow.tap(13, card);
    expect(flow.expenses).toHaveLength(1);
  });

  test('drafts of abandoned cards are capped', () => {
    const stateService = new StateService();
    for (let i = 0; i < 50; i++) stateService.setPendingExpense(7, i, { amount: i });
    expect(stateService.pendingExpenses.get(7).size).toBe(20);
    expect(stateService.takePendingExpense(7, 49)).toEqual({ amount: 49 });
    expect(stateService.takePendingExpense(7, 0)).toBeUndefined();
  });
});

describe('family mode: all new expenses go to the family', () => {
  const recordedFamily = async (options, familyId) => {
    const flow = buildExpenseFlow(options);
    const ctx = { from: { id: 7 }, message: { text: '250 кофе' }, reply: jest.fn(async () => ({ message_id: 900 })) };
    await flow.expenseHandlers.handleExpenseInput(ctx, '250 кофе', 'ru', familyId);
    await flow.tap(13, 900);
    return flow.expenses[0].familyId;
  };

  test('plain input is recorded to the family when the mode is on', async () => {
    expect(await recordedFamily({ familyMode: true, premium: true, family: { id: 5 } })).toBe(5);
  });

  test('the mode does nothing without premium or without a family', async () => {
    expect(await recordedFamily({ familyMode: true, premium: false, family: { id: 5 } })).toBeNull();
    expect(await recordedFamily({ familyMode: true, premium: true, family: null })).toBeNull();
  });

  test('mode off keeps plain input personal', async () => {
    expect(await recordedFamily({ familyMode: false, premium: true, family: { id: 5 } })).toBeNull();
  });

  test('the personal-expense button overrides the mode', async () => {
    expect(await recordedFamily({ familyMode: true, premium: true, family: { id: 5 } }, null)).toBeNull();
  });
});

describe('inline buttons reset text-input states (REC-1, TG-3, SEC-6, PLT-3)', () => {
  const run = async (stateService, ctx) => {
    const next = jest.fn();
    await stateCleanupMiddleware({ stateService })(ctx, next);
    expect(next).toHaveBeenCalled();
  };
  const button = (data) => ({ from: { id: 7 }, updateType: 'callback_query', callbackQuery: { data } });

  test('abandoned category rename does not swallow the next expense', async () => {
    const stateService = new StateService();
    stateService.setUserState(7, 'renaming_custom_category:738');
    await run(stateService, button('custom_categories_manage'));
    expect(stateService.getUserState(7)).toBeUndefined();

    const expenseHandlers = { handleExpenseInput: jest.fn(async () => true) };
    const categoryService = { updateUserCategory: jest.fn() };
    const messages = new MessageHandlers({
      userService: { getUserLanguage: jest.fn(async () => 'ru') },
      localizationService,
      stateService,
      expenseHandlers,
      categoryService,
      commandHandlers: {},
      multiEntryHandlers: { handleText: jest.fn(async () => false) }
    });
    await messages.handleExpense({ from: { id: 7 }, message: { text: '250 кофе' }, reply: jest.fn() });
    expect(categoryService.updateUserCategory).not.toHaveBeenCalled();
    expect(expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '250 кофе', 'ru');
  });

  test('typed text keeps the rename state', async () => {
    const stateService = new StateService();
    stateService.setUserState(7, 'renaming_custom_category:738');
    await run(stateService, { from: { id: 7 }, updateType: 'message', message: { text: 'Кафе' } });
    expect(stateService.getUserState(7)).toBe('renaming_custom_category:738');
  });

  test('admin refund search and a leftover refund confirmation are reset by other buttons', async () => {
    const stateService = new StateService();
    stateService.setUserState(7, 'admin_refund_search:42');
    await run(stateService, button('panel_user_42'));
    expect(stateService.getUserState(7)).toBeUndefined();

    stateService.setUserState(7, { type: 'admin_refund_confirm', data: { userId: 42, paymentId: 'ch_1' } });
    await run(stateService, button('panel_refund_exec'));
    expect(stateService.getUserState(7)).toMatchObject({ type: 'admin_refund_confirm' });
    await run(stateService, button('panel_user_42'));
    expect(stateService.getUserState(7)).toBeUndefined();
  });
});

describe('income and recurring lists fit into one Telegram message (REC-12, TG-7)', () => {
  const longText = `${'Очень_длинное *описание* '.repeat(8)}`.slice(0, 160);
  const period = { start: '2026-10-01', last: '2026-10-31', end: '2026-11-01' };

  test.each(LANGS)('income list, 30 entries with 160-char descriptions (%s)', async (lang) => {
    const ctx = { from: { id: 7 }, reply: jest.fn() };
    const handlers = new IncomeHandlers({
      incomeService: {
        getIncomes: async () => Array.from({ length: 30 }, (_, i) => ({ id: i + 1, amount: '1234567.89', currency: 'UZS', description: longText, created_at_utc: new Date() })),
        getTotals: async () => ({ byCurrency: [{ currency: 'UZS', total: 37037036.7 }, { currency: 'USD', total: 1 }], count: 30 }),
        getIncomeCurrency: async () => 'UZS'
      },
      expenseService: {
        getPeriodContext: async () => ({ timezone: 'UTC', currency: 'RUB', period }),
        getTotals: async () => ({ byCurrency: [{ currency: 'RUB', total: 1000 }], count: 1 })
      },
      userService: { getUserLanguage: async () => lang },
      localizationService,
      formatter: new Formatter(identityRates)
    });
    await handlers.showMenu(ctx);
    const [text] = ctx.reply.mock.calls[0];
    expect(text.length).toBeLessThanOrEqual(4096);
    expect(text).toContain('…');
  });

  test.each(LANGS)('recurring list, 20 entries with 160-char descriptions (%s)', async (lang) => {
    const ctx = { from: { id: 7 }, reply: jest.fn() };
    const handlers = new RecurringExpenseHandlers({
      recurringExpenseService: {
        list: async () => Array.from({ length: 20 }, (_, i) => ({ id: i + 1, amount: '12345678.90', currency: 'UZS', description: longText, category_icon: '🏠', day_of_month: 28, nextChargeDate: '2026-11-28' }))
      },
      userService: { getUserLanguage: async () => lang, getUserCurrency: async () => 'RUB' },
      localizationService,
      formatter: new Formatter(identityRates)
    });
    await handlers.showMenu(ctx);
    const [text] = ctx.reply.mock.calls[0];
    expect(text.length).toBeLessThanOrEqual(4096);
  });
});

describe('category ownership (REC-11, SEC-13, PLT-16)', () => {
  // Таблица categories в памяти; запросы репозитория разбираются по параметрам
  function categoryRepositoryWith(rows) {
    const repo = Object.create(CategoryRepository.prototype);
    repo.query = jest.fn(async (sql, [id, userId]) => ({
      rows: rows.filter(c => c.id === id && (c.user_id === 0 || c.user_id === userId))
    }));
    return repo;
  }

  test('oc|<id> of another user\'s category falls back to the overview', async () => {
    const repo = categoryRepositoryWith([{ id: 13, user_id: 0, name: 'Еда', icon: '🍔' }, { id: 99, user_id: 2, name: 'Секретная категория', icon: '🔒' }]);
    expect(await repo.getAvailableCategoryById(1, 99)).toBeUndefined();
    expect(await repo.getAvailableCategoryById(2, 99)).toMatchObject({ name: 'Секретная категория' });
    expect(await repo.getAvailableCategoryById(1, 13)).toMatchObject({ name: 'Еда' });

    const handlers = new ExpenseHandlers({
      expenseService: { getCategoryById: (userId, id) => repo.getAvailableCategoryById(userId, id), getExpenses: jest.fn() },
      userService: { getUserLanguage: async () => 'ru' },
      localizationService,
      formatter: new Formatter(identityRates)
    });
    handlers.showOverview = jest.fn();
    const ctx = { from: { id: 1 }, callbackQuery: { data: 'oc|99|0|0' }, answerCbQuery: jest.fn(async () => true) };
    await handlers.showCategoryList(ctx, 99, 0, 0);
    expect(handlers.showOverview).toHaveBeenCalledWith(ctx, 0);
  });

  test('category title keeps the name outside of bold', async () => {
    const handlers = new ExpenseHandlers({
      expenseService: {
        getCategoryById: async () => ({ id: 50, user_id: 1, name: 'Kids*', icon: '🧸' }),
        getPeriodContext: async () => ({ timezone: 'UTC', currency: 'RUB', period: { start: '2026-10-01', last: '2026-10-31', end: '2026-11-01' } }),
        getExpenses: async () => []
      },
      userService: { getUserLanguage: async () => 'ru' },
      localizationService,
      formatter: new Formatter(identityRates)
    });
    const ctx = { from: { id: 1 }, callbackQuery: { data: 'oc|50|0|0', message: { message_id: 3 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };
    await handlers.showCategoryList(ctx, 50, 0, 0);
    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text.split('\n')[0]).toBe('🧸 Kids\\* · *01.10 – 31.10.2026*');
  });

  test('deleting a foreign/system category by id moves no expenses', async () => {
    const sql = [];
    const repo = Object.create(CategoryRepository.prototype);
    repo.transaction = async (callback) => callback({
      query: async (text, params) => {
        sql.push(text);
        return { rows: [] }; // категория не принадлежит пользователю
      }
    });
    repo.getCategoryByName = async () => ({ id: 20, name: 'Другое', user_id: 0 });
    const budgetRepository = { deleteOrphan: jest.fn() };
    const service = new CategoryService(repo, { isPremiumUser: async () => true }, budgetRepository);

    expect(await service.deleteUserCategory(1, 13)).toBeNull();
    expect(sql.some(text => /UPDATE expenses/.test(text))).toBe(false);
    expect(sql.some(text => /DELETE FROM categories/.test(text))).toBe(false);
    expect(budgetRepository.deleteOrphan).not.toHaveBeenCalled();
  });

  test('own category: expenses move to the fallback before the category is deleted', async () => {
    const sql = [];
    const repo = Object.create(CategoryRepository.prototype);
    repo.transaction = async (callback) => callback({
      query: async (text, params) => {
        sql.push([text.split(' ')[0], params]);
        if (/^SELECT/.test(text)) return { rows: [{ id: 50 }] };
        if (/^DELETE/.test(text)) return { rows: [{ id: 50, name: 'Кафе', user_id: 1 }] };
        return { rows: [], rowCount: 3 };
      }
    });
    repo.getCategoryByName = async () => ({ id: 20, name: 'Другое', user_id: 0 });
    const budgetRepository = { deleteOrphan: jest.fn() };
    const service = new CategoryService(repo, { isPremiumUser: async () => true }, budgetRepository);

    expect(await service.deleteUserCategory(1, 50)).toMatchObject({ name: 'Кафе' });
    expect(sql).toEqual([['SELECT', [50, 1]], ['UPDATE', [1, 50, 20]], ['DELETE', [50, 1]]]);
    expect(budgetRepository.deleteOrphan).toHaveBeenCalledWith(1, 'Кафе');
  });
});

describe('recurring expense charged on creation checks the budget (REC-10)', () => {
  test('warnings are returned and shown', async () => {
    const today = new Date().getUTCDate();
    const warning = { id: 1, level: 100, category_name: null };
    const budgetService = {
      checkAfterExpense: jest.fn(async () => [warning]),
      warningText: jest.fn(() => '🚨 budget exceeded')
    };
    const service = new RecurringExpenseService(
      {
        countByUser: async () => 0,
        create: async () => ({ id: 5 }),
        getDueForUser: async () => [{ id: 5, user_id: 7, amount: '5000', currency: 'RUB', description: 'аренда', category_name: 'Жильё', charge_month: '2026-10-01' }],
        chargeForMonth: async () => ({ id: 9 })
      },
      { getUserTimezone: async () => 'UTC', getUserCurrency: async () => 'RUB' },
      {},
      localizationService,
      new Formatter(identityRates),
      budgetService
    );

    const created = await service.create(7, { amount: 5000, currency: null, description: 'аренда', dayOfMonth: today, categoryId: 3 });
    expect(created.chargedNow).toBe(true);
    expect(created.budgetWarnings).toEqual([warning]);
    expect(budgetService.checkAfterExpense).toHaveBeenCalledWith(7, 'Жильё');

    const stateService = new StateService();
    stateService.setPendingRecurring(7, { amount: 5000, currency: null, description: 'аренда', dayOfMonth: today, cardMessageId: 4 });
    const handlers = new RecurringExpenseHandlers({
      recurringExpenseService: { create: async () => created, getMaxPerUser: () => 20 },
      expenseService: { getCategories: async () => [{ id: 3, name: 'Жильё', icon: '🏠' }] },
      userService: { getUserLanguage: async () => 'ru' },
      localizationService,
      formatter: new Formatter(identityRates),
      stateService,
      budgetService
    });
    const ctx = {
      from: { id: 7 },
      match: ['recurring_category|3', '3'],
      callbackQuery: { data: 'recurring_category|3', message: { message_id: 4 } },
      answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => true)
    };
    await handlers.handleCategorySelection(ctx);
    const [text, extra] = ctx.editMessageText.mock.calls[0];
    expect(text).toContain('🚨 budget exceeded');
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toContain('bg_menu');
  });
});
