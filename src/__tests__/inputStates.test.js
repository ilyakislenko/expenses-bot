// Ожидаемый ввод и черновики после перезапуска, сброс ввода командами, семейный черновик после выхода из семьи,
// регулярная трата двойным нажатием, /undo, разбор текста (вопрос / записи), правка записи, выход из семьи
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const StateService = require('../services/StateService');
const LocalizationService = require('../services/LocalizationService');
const ExpenseHandlers = require('../handlers/ExpenseHandlers');
const MessageHandlers = require('../handlers/messages');
const RecurringExpenseHandlers = require('../handlers/RecurringExpenseHandlers');
const CommandHandlers = require('../handlers/commands');
const CallbackHandlers = require('../handlers/callbacks');
const AssistantHandlers = require('../handlers/AssistantHandlers');
const stateCleanupMiddleware = require('../middleware/stateCleanupMiddleware');

const localizationService = new LocalizationService();
const t = (key, params) => localizationService.getText('ru', key, params);
const identityRates = { convert: async (amount) => Number(amount) };
const USER = 7778300001;

// user_input_states в памяти: те же операции, что у UserInputStateRepository
function memoryRepository() {
  const rows = new Map();
  const log = [];
  const key = (userId, kind, slot) => `${userId}|${kind}|${slot}`;
  return {
    rows,
    log,
    upsert: jest.fn(async (userId, kind, slot, value, expiresAt) => {
      log.push(['upsert', kind, String(slot), value]);
      rows.set(key(userId, kind, String(slot)), { user_id: String(userId), kind, slot: String(slot), value: JSON.parse(JSON.stringify(value ?? null)), expires_at: expiresAt });
    }),
    remove: jest.fn(async (userId, kind, slot) => {
      log.push(['remove', kind, String(slot)]);
      rows.delete(key(userId, kind, String(slot)));
    }),
    removeKinds: jest.fn(async (userId, kinds) => {
      for (const [k, row] of rows) if (row.user_id === String(userId) && kinds.includes(row.kind)) rows.delete(k);
    }),
    loadSince: jest.fn(async (since) => [...rows.values()].filter(row => row.expires_at > since)),
    purgeBefore: jest.fn(async (before) => {
      for (const [k, row] of rows) if (row.expires_at <= before) rows.delete(k);
    })
  };
}

// «Перезапуск»: новый StateService с тем же хранилищем
async function restart(repository) {
  const stateService = new StateService(repository);
  await stateService.hydrate();
  return stateService;
}

const messageCtx = (text, extra = {}) => ({
  from: { id: USER },
  chat: { id: USER, type: 'private' },
  message: { text, ...extra },
  updateType: 'message',
  reply: jest.fn(async () => ({ message_id: 900 }))
});

function messagesWith(stateService, extra = {}) {
  return new MessageHandlers({
    userService: { getUserLanguage: jest.fn(async () => 'ru') },
    localizationService,
    stateService,
    familyService: { getUserFamily: jest.fn(async () => ({ id: 31, name: 'Дом' })) },
    expenseHandlers: {
      handleExpenseInput: jest.fn(async () => true),
      handleDateInput: jest.fn(async () => {}),
      handleEditInput: jest.fn(async () => {}),
      showDay: jest.fn(async () => {})
    },
    incomeHandlers: { handleIncomeInput: jest.fn(async () => {}), handleEditInput: jest.fn(), handleDateInput: jest.fn(async () => {}) },
    recurringExpenseHandlers: { handleAmountInput: jest.fn(async () => {}), handleDayInput: jest.fn(async () => {}) },
    budgetHandlers: { handleAmountInput: jest.fn(async () => {}) },
    commandHandlers: {},
    multiEntryHandlers: { handleText: jest.fn(async () => false), singleEntryText: jest.fn(async (userId, text) => text) },
    assistantHandlers: { ask: jest.fn(async () => {}) },
    ...extra
  });
}

describe('StateService: input states and drafts survive a restart', () => {
  test('every kind is written through and restored by hydrate()', async () => {
    const repository = memoryRepository();
    const before = new StateService(repository);
    before.setUserState(USER, 'adding_personal_expense');
    before.setUserEditState(USER + 1, '705');
    before.setPendingExpense(USER, 1001, { amount: 250, currency: null, description: 'кофе', familyId: 31 });
    before.setPendingExpense(USER, 1002, { amount: 300, currency: 'USD', description: 'такси', familyId: null });
    before.takePendingExpense(USER, 1002);
    before.setPendingRecurring(USER + 2, { amount: 500, currency: null, description: 'netflix', dayOfMonth: 15, cardMessageId: 77 });
    before.setExportState(USER, { categoryIds: [13] });
    before.setUserState(USER + 3, { type: 'admin_broadcast_confirm', data: { message: 'привет' } });
    await before.flush();

    const after = await restart(repository);
    expect(after.getUserState(USER)).toBe('adding_personal_expense');
    expect(after.getUserEditState(USER + 1)).toBe('705');
    expect(after.takePendingExpense(USER, 1001)).toEqual({ amount: 250, currency: null, description: 'кофе', familyId: 31 });
    expect(after.takePendingExpense(USER, 1002)).toBeNull(); // уже записан до перезапуска — повторное нажатие молчит
    expect(after.getPendingRecurring(USER + 2)).toMatchObject({ description: 'netflix', cardMessageId: 77 });
    expect(after.getExportState(USER)).toEqual({ categoryIds: [13] });
    expect(after.getUserState(USER + 3)).toEqual({ type: 'admin_broadcast_confirm', data: { message: 'привет' } });
  });

  test('changes of one user are written in order; deletes and /cancel reach the store', async () => {
    const repository = memoryRepository();
    const stateService = new StateService(repository);
    stateService.setUserState(USER, 'adding_income');
    stateService.deleteUserState(USER);
    stateService.setUserState(USER, 'dt_in:x:5:400:n');
    await stateService.flush();
    expect(repository.log.map(([op, kind]) => `${op}:${kind}`)).toEqual(['upsert:state', 'remove:state', 'upsert:state']);
    expect((await restart(repository)).getUserState(USER)).toBe('dt_in:x:5:400:n');

    stateService.setPendingExpense(USER, 1, { amount: 1 });
    stateService.clearUserState(USER);
    await stateService.flush();
    expect(repository.rows.size).toBe(0);
    // Удаление того, чего нет, в БД не пишет
    const writes = repository.log.length;
    stateService.deleteUserState(USER);
    stateService.deleteUserEditState(USER);
    await stateService.flush();
    expect(repository.log).toHaveLength(writes);
  });

  test('expired input: dropped, the next text gets «ввод устарел» once (also after a restart)', async () => {
    const repository = memoryRepository();
    const stateService = new StateService(repository);
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      stateService.setUserState(USER, 'adding_income');
      stateService.setUserEditState(USER + 1, '9');
      await stateService.flush();
      spy.mockReturnValue(now + StateService.TTL_MS.state + 1000);
      const restarted = await restart(repository);
      expect(restarted.hasUserState(USER)).toBe(false);
      expect(restarted.takeExpiredInput(USER)).toBe(true);
      expect(restarted.takeExpiredInput(USER)).toBe(false);
      expect(restarted.hasUserEditState(USER + 1)).toBe(false);
      expect(restarted.takeExpiredInput(USER + 1)).toBe(true);
      expect(repository.rows.size).toBe(0); // истёкшие строки убраны при старте

      // Без перезапуска: срок вышел, пока процесс работал
      stateService.setUserState(USER + 2, 'setting_budget:total');
      spy.mockReturnValue(now + 2 * StateService.TTL_MS.state + 5000);
      expect(stateService.getUserState(USER + 2)).toBeUndefined();
      expect(stateService.takeExpiredInput(USER + 2)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  test('without a repository (tests) everything stays in memory', async () => {
    const stateService = new StateService();
    stateService.setUserState(USER, 'adding_income');
    await stateService.hydrate();
    await stateService.flush();
    expect(stateService.getUserState(USER)).toBe('adding_income');
  });
});

describe('after a restart the next text is handled as the input the user was in', () => {
  const restored = async (state) => {
    const repository = memoryRepository();
    const before = new StateService(repository);
    if (state.edit) before.setUserEditState(USER, state.edit);
    else before.setUserState(USER, state);
    await before.flush();
    return restart(repository);
  };

  test('«👤 Личная трата» stays personal, «💰 Семейная трата» goes to the family', async () => {
    const personal = messagesWith(await restored('adding_personal_expense'));
    await personal.handleExpense(messageCtx('777 секрет подарок'));
    expect(personal.expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '777 секрет подарок', 'ru', null);

    const family = messagesWith(await restored('adding_family_expense'));
    await family.handleExpense(messageCtx('800 пицца на всех'));
    expect(family.expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '800 пицца на всех', 'ru', 31);
  });

  test.each([
    ['record edit', { edit: '705' }, '750', (m) => m.expenseHandlers.handleEditInput],
    ['other date of a record', 'dt_in:x:705:400:n', '25.10', (m) => m.expenseHandlers.handleDateInput],
    ['other date of an income', 'dt_in:i:5:400', '1.10', (m) => m.incomeHandlers.handleDateInput],
    ['adding income', 'adding_income', '50000 зарплата', (m) => m.incomeHandlers.handleIncomeInput],
    ['recurring amount', 'adding_recurring', '500 netflix', (m) => m.recurringExpenseHandlers.handleAmountInput],
    ['recurring day', 'adding_recurring_day', '15', (m) => m.recurringExpenseHandlers.handleDayInput],
    ['budget limit', 'setting_budget:total', '10000', (m) => m.budgetHandlers.handleAmountInput]
  ])('%s', async (_, state, text, handler) => {
    const messages = messagesWith(await restored(state));
    await messages.handleExpense(messageCtx(text));
    expect(handler(messages)).toHaveBeenCalled();
    expect(messages.expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();
  });

  test('a receipt draft line edit is still routed to the draft', async () => {
    const receiptHandlers = { handleDraftInput: jest.fn(async () => {}) };
    const messages = messagesWith(await restored('rd_in:101:e:0'), { receiptHandlers });
    await messages.handleExpense(messageCtx('450 молоко'));
    expect(receiptHandlers.handleDraftInput).toHaveBeenCalledWith(expect.anything(), '450 молоко', 'ru', 'rd_in:101:e:0');
    expect(messages.expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();
  });

  test('expired input: «ввод устарел» instead of a wrong record, then normal input again', async () => {
    const stateService = new StateService();
    stateService.setUserState(USER, 'dt_in:x:705:400:n');
    stateService.expiresAt.set(stateService.key('state', USER), Date.now() - 1);
    const messages = messagesWith(stateService);
    const ctx = messageCtx('25.10');
    await messages.handleExpense(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(t('input_expired'));
    expect(messages.expenseHandlers.handleDateInput).not.toHaveBeenCalled();
    expect(messages.expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();

    await messages.handleExpense(messageCtx('250 кофе'));
    expect(messages.expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '250 кофе', 'ru');
  });
});

describe('commands drop the expected input (REC: «250 кофе» after /history became income)', () => {
  const command = (text) => ({
    from: { id: USER },
    updateType: 'message',
    message: { text, entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] }
  });

  test('/history drops adding income and a record edit; /cancel is left to its own handler', async () => {
    const stateService = new StateService();
    const middleware = stateCleanupMiddleware({ stateService });
    stateService.setUserState(USER, 'adding_income');
    stateService.setUserEditState(USER, '705');
    await middleware(command('/history'), async () => {});
    expect(stateService.hasUserState(USER)).toBe(false);
    expect(stateService.hasUserEditState(USER)).toBe(false);

    const messages = messagesWith(stateService);
    await messages.handleExpense(messageCtx('250 кофе'));
    expect(messages.incomeHandlers.handleIncomeInput).not.toHaveBeenCalled();
    expect(messages.expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '250 кофе', 'ru');

    stateService.setUserState(USER, 'adding_income');
    await middleware(command('/cancel'), async () => {});
    expect(stateService.getUserState(USER)).toBe('adding_income');
    await middleware(command('/undo@ExpensesAssistant_bot'), async () => {});
    expect(stateService.hasUserState(USER)).toBe(false);
  });

  test('typed text keeps the input; drafts on category cards survive commands; buttons drop a record edit', async () => {
    const stateService = new StateService();
    const middleware = stateCleanupMiddleware({ stateService });
    stateService.setUserState(USER, 'adding_income');
    stateService.setPendingExpense(USER, 555, { amount: 250 });
    await middleware({ from: { id: USER }, updateType: 'message', message: { text: '5000 премия' } }, async () => {});
    expect(stateService.getUserState(USER)).toBe('adding_income');
    await middleware(command('/stats'), async () => {});
    expect(stateService.takePendingExpense(USER, 555)).toEqual({ amount: 250 });

    stateService.setUserEditState(USER, '705');
    await middleware({ from: { id: USER }, updateType: 'callback_query', callbackQuery: { data: 'cancel_edit' } }, async () => {});
    expect(stateService.hasUserEditState(USER)).toBe(true); // «Отмена» самой правки сама скажет «отменено»
    await middleware({ from: { id: USER }, updateType: 'callback_query', callbackQuery: { data: 'dy|0|0' } }, async () => {});
    expect(stateService.hasUserEditState(USER)).toBe(false);
  });

  test('the middleware waits for the restored states before handling an update', async () => {
    const repository = memoryRepository();
    const before = new StateService(repository);
    before.setUserState(USER, 'adding_income');
    await before.flush();
    const stateService = new StateService(repository);
    stateService.hydrate();
    let seen;
    await stateCleanupMiddleware({ stateService })(messageCtx('5000 премия'), async () => { seen = stateService.getUserState(USER); });
    expect(seen).toBe('adding_income');
  });
});

// Обработчики трат с заглушками сервисов, черновики — в настоящем StateService
function buildExpenseFlow({ family = { id: 31, name: 'Дом' }, budgetWarnings = [] } = {}) {
  const stateService = new StateService();
  const cats = [{ id: 13, name: 'Еда', icon: '🍔' }, { id: 14, name: 'Транспорт', icon: '🚕' }];
  const expenses = [];
  const expenseService = {
    getCategories: jest.fn(async () => cats),
    getCategoryById: jest.fn(async (userId, id) => cats.find(c => c.id === id)),
    getRememberedCategory: jest.fn(async () => null),
    addExpense: jest.fn(async (userId, data) => {
      const expense = { id: expenses.length + 1, user_id: userId, ...data };
      expenses.push(expense);
      return expense;
    }),
    getExpenseById: jest.fn(async (userId, id) => {
      const e = expenses.find(x => x.id === id);
      const category = cats.find(c => c.id === e?.categoryId);
      return e && { ...e, amount: String(e.amount), currency: e.currency || 'RUB', category_id: e.categoryId, category_name: category?.name, category_icon: category?.icon, family_id: e.familyId, created_at_utc: new Date() };
    }),
    updateExpenseById: jest.fn(async (userId, id, data) => {
      const e = expenses.find(x => x.id === id && x.user_id === userId);
      if (!e) return undefined;
      Object.assign(e, data);
      return e;
    })
  };
  const familyService = { getUserFamily: jest.fn(async () => family) };
  const budgetService = {
    checkAfterExpense: jest.fn(async () => budgetWarnings),
    warningText: jest.fn(() => '🚨 Транспорт: бюджет превышен')
  };
  const expenseHandlers = new ExpenseHandlers({
    expenseService,
    userService: { getUserLanguage: jest.fn(async () => 'ru'), getUserCurrency: jest.fn(async () => 'RUB'), getUserTimezone: jest.fn(async () => 'UTC'), getUserById: jest.fn(async () => ({ family_mode: false })) },
    premiumService: { getUserLimits: jest.fn(async () => ({ MAX_DESCRIPTION_LENGTH: 60 })), isPremiumUser: jest.fn(async () => true) },
    familyService,
    localizationService,
    formatter: new Formatter(identityRates),
    stateService,
    validator: new EnhancedValidator(),
    budgetService
  });
  let nextMessageId = 100;
  const ctx = (extra = {}) => ({
    from: { id: USER },
    chat: { id: USER, type: 'private' },
    reply: jest.fn(async () => ({ message_id: nextMessageId++ })),
    answerCbQuery: jest.fn(async () => true),
    editMessageText: jest.fn(async () => true),
    telegram: { editMessageReplyMarkup: jest.fn(async () => true) },
    ...extra
  });
  return { stateService, expenseHandlers, expenseService, familyService, budgetService, expenses, ctx };
}

describe('a family draft after leaving the family is recorded as personal', () => {
  test('left the family while the category card was open', async () => {
    const flow = buildExpenseFlow();
    const input = flow.ctx({ message: { text: '1500 ужин семьёй' } });
    await flow.expenseHandlers.handleExpenseInput(input, '1500 ужин семьёй', 'ru', 31);
    const card = (await input.reply.mock.results[0].value).message_id;

    flow.familyService.getUserFamily.mockResolvedValue(null); // вышел из семьи
    const tap = flow.ctx({ callbackQuery: { data: 'category|13', message: { message_id: card } }, match: ['category|13', '13'] });
    await flow.expenseHandlers.handleCategorySelection(tap);
    expect(flow.expenseService.addExpense).toHaveBeenCalledWith(USER, expect.objectContaining({ familyId: null, categoryId: 13 }));
    expect(tap.editMessageText.mock.calls[0][0]).toContain(t('expense_family_gone'));
  });

  test('still in the same family — family expense; another family — personal', async () => {
    const flow = buildExpenseFlow();
    const input = flow.ctx();
    await flow.expenseHandlers.handleExpenseInput(input, '100 хлеб', 'ru', 31);
    await flow.expenseHandlers.handleExpenseInput(input, '200 сыр', 'ru', 31);
    const [first, second] = await Promise.all(input.reply.mock.results.map(r => r.value));
    await flow.expenseHandlers.handleCategorySelection(flow.ctx({ callbackQuery: { message: { message_id: first.message_id } }, match: ['', '13'] }));
    flow.familyService.getUserFamily.mockResolvedValue({ id: 99, name: 'Другая' });
    await flow.expenseHandlers.handleCategorySelection(flow.ctx({ callbackQuery: { message: { message_id: second.message_id } }, match: ['', '13'] }));
    expect(flow.expenses.map(e => e.familyId)).toEqual([31, null]);
  });
});

describe('record edit understands the input format and checks the budget', () => {
  const parse = (text) => buildExpenseFlow().expenseHandlers.parseEditInput(text, 60);

  test.each([
    ['750', { changes: { amount: 750, currency: null, description: null } }],
    ['20 USD такси', { changes: { amount: 20, currency: 'USD', description: 'такси' } }],
    ['кофе 250', { changes: { amount: 250, currency: null, description: 'кофе' } }],
    ['такси до дома', { changes: { description: 'такси до дома' } }],
    ['12,345', { error: 'format' }],
    ['-5', { error: 'amount' }],
    ['+5000 премия', { error: 'one_record' }],
    ['кофе 250, такси 400', { error: 'one_record' }],
    ['100000000', { error: 'amount' }]
  ])('%s', (text, expected) => {
    expect(parse(text)).toEqual(expected);
  });

  test('«20 USD такси» changes the currency, budget warnings follow, the edit mode ends', async () => {
    const flow = buildExpenseFlow({ budgetWarnings: [{ id: 1, level: 100 }] });
    await flow.expenseService.addExpense(USER, { amount: 500, currency: 'RUB', description: 'такси', categoryId: 14 });
    flow.stateService.setUserEditState(USER, '1');
    const ctx = flow.ctx();
    await flow.expenseHandlers.handleEditInput(ctx, '20 USD такси', 'ru', '1');
    expect(flow.expenseService.updateExpenseById).toHaveBeenCalledWith(USER, 1, { amount: 20, currency: 'USD', description: 'такси' });
    expect(ctx.reply.mock.calls[0][0]).toBe(t('expense_updated', { amount: new Formatter().formatAmount(20, 'USD'), description: 'такси' }));
    expect(flow.budgetService.checkAfterExpense).toHaveBeenCalledWith(USER, 'Транспорт');
    expect(ctx.reply.mock.calls[1][0]).toContain('🚨');
    expect(flow.stateService.hasUserEditState(USER)).toBe(false);
  });

  test('«1500» keeps description and currency; a wrong input keeps the edit mode and the record', async () => {
    const flow = buildExpenseFlow();
    await flow.expenseService.addExpense(USER, { amount: 500, currency: 'EUR', description: 'такси', categoryId: 14 });
    flow.stateService.setUserEditState(USER, '1');
    const bad = flow.ctx();
    await flow.expenseHandlers.handleEditInput(bad, 'кофе 250, такси 400', 'ru', 1);
    expect(bad.reply).toHaveBeenCalledWith(t('edit_one_record'), { parse_mode: 'Markdown' });
    expect(flow.expenseService.updateExpenseById).not.toHaveBeenCalled();
    expect(flow.stateService.hasUserEditState(USER)).toBe(true);

    await flow.expenseHandlers.handleEditInput(flow.ctx(), '1500', 'ru', 1);
    expect(flow.expenseService.updateExpenseById).toHaveBeenCalledWith(USER, 1, { amount: 1500, currency: 'EUR', description: 'такси' });
  });

  test('a date change sends budget warnings too', async () => {
    const flow = buildExpenseFlow({ budgetWarnings: [{ id: 1, level: 80 }] });
    flow.expenseService.setExpenseDate = jest.fn(async () => ({ id: 1, category_id: 14 }));
    flow.expenseHandlers.showCard = jest.fn(async () => {});
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ctx = flow.ctx({ match: ['', '1', today, 'n'] });
    await flow.expenseHandlers.handleSetDate(ctx);
    expect(flow.budgetService.checkAfterExpense).toHaveBeenCalledWith(USER, 'Транспорт');
  });
});

describe('recurring expense: the category card takes its own draft once', () => {
  const build = () => {
    const stateService = new StateService();
    let created = 0;
    const handlers = new RecurringExpenseHandlers({
      recurringExpenseService: {
        create: jest.fn(async () => {
          created++;
          await new Promise(resolve => setTimeout(resolve, 5));
          return { currency: 'RUB', chargedNow: true, nextChargeDate: '2026-11-28', budgetWarnings: [] };
        }),
        getMaxPerUser: () => 20
      },
      expenseService: { getCategories: async () => [{ id: 16, name: 'Связь', icon: '📱' }] },
      userService: { getUserLanguage: async () => 'ru' },
      premiumService: { getUserLimits: async () => ({ MAX_DESCRIPTION_LENGTH: 60 }) },
      localizationService,
      formatter: new Formatter(identityRates),
      stateService,
      validator: new EnhancedValidator(),
      budgetService: {}
    });
    let nextMessageId = 1000;
    const textCtx = () => ({ from: { id: USER }, reply: jest.fn(async () => ({ message_id: nextMessageId++ })) });
    const tap = (messageId) => ({
      from: { id: USER },
      match: ['recurring_category|16', '16'],
      callbackQuery: { data: 'recurring_category|16', message: { message_id: messageId } },
      answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => true),
      editMessageReplyMarkup: jest.fn(async () => true)
    });
    const createDraft = async (text, day) => {
      await handlers.handleAmountInput(textCtx(), text, 'ru');
      const ctx = textCtx();
      await handlers.handleDayInput(ctx, day, 'ru');
      return (await ctx.reply.mock.results[0].value).message_id;
    };
    return { handlers, stateService, createDraft, tap, created: () => created };
  };

  test('two simultaneous taps create one recurring expense', async () => {
    const flow = build();
    const card = await flow.createDraft('1000 интернет', '28');
    const [first, second] = [flow.tap(card), flow.tap(card)];
    await Promise.all([flow.handlers.handleCategorySelection(first), flow.handlers.handleCategorySelection(second)]);
    expect(flow.created()).toBe(1);
    expect(first.editMessageText).toHaveBeenCalledTimes(1);
    expect(second.editMessageText).not.toHaveBeenCalled();
    expect(second.answerCbQuery).toHaveBeenCalledWith();
  });

  test('the old card does not save the newer draft', async () => {
    const flow = build();
    const oldCard = await flow.createDraft('1000 интернет', '28');
    await flow.handlers.handleCategorySelection(flow.tap(oldCard));
    const newCard = await flow.createDraft('500 аренда', '29');
    const stale = flow.tap(oldCard);
    await flow.handlers.handleCategorySelection(stale);
    expect(flow.created()).toBe(1);
    expect(stale.answerCbQuery).toHaveBeenCalledWith(t('recurring_draft_outdated'), { show_alert: true });
    expect(stale.editMessageText).not.toHaveBeenCalled();

    const fresh = flow.tap(newCard);
    await flow.handlers.handleCategorySelection(fresh);
    expect(flow.created()).toBe(2);
    expect(fresh.editMessageText.mock.calls[0][0]).toContain('аренда');
  });
});

describe('/undo: the last entered record, expense or income, after a confirmation', () => {
  const build = (record) => {
    const expenseService = {
      getLastRecord: jest.fn(async () => record),
      deleteExpenseById: jest.fn(async (userId, id) => (id === record?.id ? record : undefined))
    };
    let incomeDeleted = false;
    const incomeService = {
      deleteIncome: jest.fn(async (userId, id) => {
        if (incomeDeleted || id !== record?.id) return undefined;
        incomeDeleted = true;
        return record;
      })
    };
    const handlers = new CommandHandlers({
      expenseService,
      incomeService,
      userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'UTC' },
      localizationService,
      formatter: new Formatter(identityRates)
    });
    const ctx = (data, match) => ({
      from: { id: USER },
      match,
      callbackQuery: data ? { data, message: { message_id: 5 } } : undefined,
      reply: jest.fn(async () => ({ message_id: 5 })),
      answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => true)
    });
    return { handlers, expenseService, incomeService, ctx };
  };

  test('the income just entered is offered, deleted only by the button, a second tap changes nothing', async () => {
    const income = { kind: 'income', id: 13, amount: '50000', currency: 'RUB', description: 'зарплата', created_at_utc: new Date('2026-10-28T10:00:00Z') };
    const { handlers, incomeService, expenseService, ctx } = build(income);
    const command = ctx();
    await handlers.undo(command);
    const [text, extra] = command.reply.mock.calls[0];
    expect(text).toContain(t('undo_confirm_income', { record: '' }).trim());
    expect(text).toContain('зарплата');
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['undo_ok|i|13', 'undo_no']);
    expect(incomeService.deleteIncome).not.toHaveBeenCalled();

    const ok = ctx('undo_ok|i|13', ['undo_ok|i|13', 'i', '13']);
    await handlers.confirmUndo(ok);
    expect(incomeService.deleteIncome).toHaveBeenCalledWith(USER, 13);
    expect(expenseService.deleteExpenseById).not.toHaveBeenCalled();
    expect(ok.editMessageText.mock.calls[0][0]).toContain('зарплата');

    const again = ctx('undo_ok|i|13', ['undo_ok|i|13', 'i', '13']);
    await handlers.confirmUndo(again);
    expect(again.answerCbQuery).toHaveBeenCalledWith(t('undo_already'));
    expect(again.editMessageText).not.toHaveBeenCalled();
  });

  test('an expense is deleted by id; «Отмена» keeps it; nothing to undo', async () => {
    const expense = { kind: 'expense', id: 705, amount: '300', currency: 'RUB', description: 'сыр', category_name: 'Еда', category_icon: '🍔', created_at_utc: new Date('2026-10-27T10:00:00Z') };
    const { handlers, expenseService, ctx } = build(expense);
    const command = ctx();
    await handlers.undo(command);
    expect(command.reply.mock.calls[0][1].reply_markup.inline_keyboard[0][0].callback_data).toBe('undo_ok|x|705');
    await handlers.cancelUndo(ctx('undo_no'));
    expect(expenseService.deleteExpenseById).not.toHaveBeenCalled();
    await handlers.confirmUndo(ctx('undo_ok|x|705', ['', 'x', '705']));
    expect(expenseService.deleteExpenseById).toHaveBeenCalledWith(USER, 705);

    const empty = build(undefined);
    const none = empty.ctx();
    await empty.handlers.undo(none);
    expect(none.reply).toHaveBeenCalledWith(t('no_expenses'));
  });
});

describe('text routing: question or records', () => {
  test.each([
    ['кофе 250, такси 400?', false],
    ['такси 400?', false],
    ['кофе 250 и такси 400?', false],
    ['14 сентября сколько потратил?', true],
    ['3 самых дорогих покупки в августе?', true],
    ['14 сентября сколько потратил', true],
    ['сколько я потратил вчера', true],
    ['скок ушло на такси в сентябре', true],
    ['how much did i spend yesterday', true],
    ['? сколько я потратил на такси', true],
    ['траты за неделю?', true],
    ['250 кофе', false],
    ['250 кофе?', false],
    ['кофе 250', false],
    ['что-то 250', false],
    ['+50000 зарплата', false],
    ['что?', false]
  ])('%s → question: %s', (text, expected) => {
    expect(AssistantHandlers.isQuestion(text)).toBe(expected);
  });

  test('voice: «кофе 250 и такси 400?» are records, «сколько я потратил вчера» is a question', () => {
    const MultiEntryHandlers = require('../handlers/MultiEntryHandlers');
    const handlers = Object.create(MultiEntryHandlers.prototype);
    handlers.assistantHandlers = {};
    expect(handlers.isSpokenQuestion('Кофе двести пятьдесят и такси четыреста?')).toBe(false);
    expect(handlers.isSpokenQuestion('Сколько я потратил вчера')).toBe(true);
  });

  test('messages: questions go to the bot, lists ending with «?» to records, «250 кофе» to the usual input', async () => {
    const messages = messagesWith(new StateService());
    await messages.handleExpense(messageCtx('14 сентября сколько потратил?'));
    await messages.handleExpense(messageCtx('сколько я потратил вчера'));
    expect(messages.assistantHandlers.ask.mock.calls.map(c => c[1])).toEqual(['14 сентября сколько потратил?', 'сколько я потратил вчера']);

    await messages.handleExpense(messageCtx('кофе 250, такси 400?'));
    expect(messages.multiEntryHandlers.handleText).toHaveBeenCalledWith(expect.anything(), 'кофе 250, такси 400?', 'ru');
    await messages.handleExpense(messageCtx('250 кофе'));
    expect(messages.expenseHandlers.handleExpenseInput).toHaveBeenLastCalledWith(expect.anything(), '250 кофе', 'ru');
    expect(messages.assistantHandlers.ask).toHaveBeenCalledTimes(2);
  });

  test('text without an amount: «Не понял» with a hint and «🤖 Спросить бота» that asks exactly this text once', async () => {
    const stateService = new StateService();
    const messages = messagesWith(stateService);
    const ctx = messageCtx('траты на такси вчера');
    await messages.handleExpense(ctx);
    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text).toBe(`${t('error_format')}\n\n${t('ask_bot_hint')}`);
    expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe('aitx');
    expect(messages.expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();

    const button = () => ({
      from: { id: USER },
      callbackQuery: { data: 'aitx', message: { message_id: 900 } },
      answerCbQuery: jest.fn(async () => true),
      editMessageReplyMarkup: jest.fn(async () => true)
    });
    const first = button();
    await messages.askPendingQuestion(first);
    expect(messages.assistantHandlers.ask).toHaveBeenCalledWith(first, 'траты на такси вчера', 'ru');
    const second = button();
    await messages.askPendingQuestion(second);
    expect(second.answerCbQuery).toHaveBeenCalledWith(t('ask_bot_outdated'), { show_alert: true });
    expect(messages.assistantHandlers.ask).toHaveBeenCalledTimes(1);
  });
});

describe('leaving a family asks first', () => {
  test('family_leave shows a confirmation, family_leave_confirm leaves', async () => {
    const familyService = {
      getUserFamily: jest.fn(async () => ({ id: 8, name: 'Дом_1' })),
      leaveFamily: jest.fn(async () => ({ id: 8, name: 'Дом_1' }))
    };
    const handlers = new CallbackHandlers({ familyService, localizationService, formatter: new Formatter(identityRates), userService: { getUserLanguage: async () => 'ru' } });
    const ctx = () => ({ from: { id: USER }, callbackQuery: { data: 'family_leave', message: { message_id: 3 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) });
    const ask = ctx();
    await handlers.handleFamilyLeave(ask);
    expect(familyService.leaveFamily).not.toHaveBeenCalled();
    const [text, extra] = ask.editMessageText.mock.calls[0];
    expect(text).toBe(t('family_leave_confirm', { name: 'Дом\\_1' }));
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['family_leave_confirm', 'family_menu']);

    const confirm = ctx();
    await handlers.handleFamilyLeaveConfirm(confirm);
    expect(familyService.leaveFamily).toHaveBeenCalledWith(USER);
    expect(confirm.editMessageText.mock.calls[0][0]).toBe(t('family_left', { name: 'Дом\\_1' }));
  });
});
