// Правка дохода: что меняется при разном вводе, премиум, чужие записи, брошенный ввод
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const StateService = require('../services/StateService');
const LocalizationService = require('../services/LocalizationService');
const IncomeHandlers = require('../handlers/IncomeHandlers');
const MessageHandlers = require('../handlers/messages');
const stateCleanupMiddleware = require('../middleware/stateCleanupMiddleware');

const localizationService = new LocalizationService();
const t = (key, params) => localizationService.getText('ru', key, params);
const USER = 7;

// Доходы в памяти; updateIncome как в репозитории — только своя запись
// Правка бесплатна: по умолчанию пользователь без премиума
function buildIncomeFlow({ premium = false, incomes } = {}) {
  const rows = incomes || [{ id: 1, user_id: USER, amount: '50000.00', currency: 'RUB', description: 'зарплата', created_at_utc: new Date('2026-10-05T10:00:00Z') }];
  const incomeService = {
    getIncome: jest.fn(async (userId, id) => rows.find(r => r.id === id && r.user_id === userId)),
    updateIncome: jest.fn(async (userId, id, changes) => {
      const row = rows.find(r => r.id === id && r.user_id === userId);
      if (!row) return undefined;
      Object.assign(row, { ...changes, amount: Number(changes.amount).toFixed(2) });
      return row;
    })
  };
  const stateService = new StateService();
  const handlers = new IncomeHandlers({
    incomeService,
    userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Europe/Moscow' },
    premiumService: { isPremiumUser: jest.fn(async () => premium), getUserLimits: async () => ({ MAX_DESCRIPTION_LENGTH: 160 }) },
    localizationService,
    formatter: new Formatter({ convert: async (amount) => Number(amount) }),
    stateService,
    validator: new EnhancedValidator()
  });
  const tapEdit = async (id) => {
    const ctx = { from: { id: USER }, match: [`ie|${id}`, String(id)], answerCbQuery: jest.fn(async () => true), reply: jest.fn(async () => ({})) };
    await handlers.startEdit(ctx);
    return ctx;
  };
  const type = async (text) => {
    const ctx = { from: { id: USER }, message: { text }, reply: jest.fn(async () => ({})) };
    const state = stateService.getUserState(USER);
    await handlers.handleEditInput(ctx, text, 'ru', parseInt(String(state).split(':')[1], 10));
    return ctx;
  };
  return { rows, incomeService, stateService, handlers, tapEdit, type };
}

describe('income edit', () => {
  test.each([
    ['60000', { amount: '60000.00', currency: 'RUB', description: 'зарплата' }],
    ['аванс', { amount: '50000.00', currency: 'RUB', description: 'аванс' }],
    ['+60 000 премия', { amount: '60000.00', currency: 'RUB', description: 'премия' }],
    ['1000 USD', { amount: '1000.00', currency: 'USD', description: 'зарплата' }],
    ['1500 $ фриланс', { amount: '1500.00', currency: 'USD', description: 'фриланс' }]
  ])('«%s» changes only what was typed', async (input, expected) => {
    const flow = buildIncomeFlow();
    await flow.tapEdit(1);
    expect(flow.stateService.getUserState(USER)).toBe('editing_income:1');

    const ctx = await flow.type(input);

    expect(flow.rows[0]).toMatchObject(expected);
    expect(flow.stateService.getUserState(USER)).toBeUndefined();
    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text.startsWith(t('income_updated'))).toBe(true);
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toContain('ie|1');
  });

  test('invalid amount keeps the record and the edit state, so the user can retry', async () => {
    const flow = buildIncomeFlow();
    await flow.tapEdit(1);
    const ctx = await flow.type('0');
    expect(flow.incomeService.updateIncome).not.toHaveBeenCalled();
    expect(flow.stateService.getUserState(USER)).toBe('editing_income:1');
    expect(ctx.reply.mock.calls[0][0]).toContain('❌');

    await flow.type('55000');
    expect(flow.rows[0].amount).toBe('55000.00');
  });

  test('someone else\'s income cannot be edited by a forged callback', async () => {
    const flow = buildIncomeFlow({ incomes: [{ id: 9, user_id: 42, amount: '100.00', currency: 'RUB', description: 'чужой', created_at_utc: new Date() }] });
    const ctx = await flow.tapEdit(9);
    expect(ctx.reply).toHaveBeenCalledWith(t('income_not_found'), expect.anything());
    expect(flow.stateService.getUserState(USER)).toBeUndefined();
    expect(flow.rows[0].amount).toBe('100.00');
  });
});

describe('abandoned text input does not swallow the next message', () => {
  const messagesWith = (stateService, extra = {}) => new MessageHandlers({
    userService: { getUserLanguage: jest.fn(async () => 'ru') },
    localizationService,
    stateService,
    expenseHandlers: { handleExpenseInput: jest.fn(async () => true), showDay: jest.fn(async () => {}) },
    incomeHandlers: { handleEditInput: jest.fn(), handleIncomeInput: jest.fn() },
    commandHandlers: {},
    multiEntryHandlers: { handleText: jest.fn(async () => false) },
    ...extra
  });
  const send = (messages, text) => messages.handleExpense({ from: { id: USER }, message: { text }, reply: jest.fn() });

  test.each([
    ['income edit', 'editing_income:1'],
    ['adding income', 'adding_income']
  ])('%s: a bottom-menu button drops it, the next «250 кофе» is an expense', async (_, state) => {
    const stateService = new StateService();
    stateService.setUserState(USER, state);
    const messages = messagesWith(stateService);

    await send(messages, t('button_today'));
    await send(messages, '250 кофе');

    expect(messages.incomeHandlers.handleEditInput).not.toHaveBeenCalled();
    expect(messages.incomeHandlers.handleIncomeInput).not.toHaveBeenCalled();
    expect(messages.expenseHandlers.handleExpenseInput).toHaveBeenCalledWith(expect.anything(), '250 кофе', 'ru');
  });

  test('a bottom-menu button keeps drafts waiting on category cards', async () => {
    const stateService = new StateService();
    stateService.setPendingExpense(USER, 555, { amount: 250, description: 'кофе' });
    await send(messagesWith(stateService), t('button_today'));
    expect(stateService.takePendingExpense(USER, 555)).toMatchObject({ amount: 250 });
  });

  test('an inline button (e.g. «Cancel» on the prompt) drops the income edit', async () => {
    const stateService = new StateService();
    stateService.setUserState(USER, 'editing_income:1');
    await stateCleanupMiddleware({ stateService })({ from: { id: USER }, updateType: 'callback_query', callbackQuery: { data: 'in|1' } }, jest.fn());
    expect(stateService.getUserState(USER)).toBeUndefined();
  });
});
