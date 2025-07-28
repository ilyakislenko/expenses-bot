const CommandHandlers = require('../../commandHandlersInstance');
const ExpenseService = require('../services/ExpenseService');
const UserService = require('../services/UserService');
const Formatter = require('../utils/formatter');

jest.mock('../database', () => ({
  createUser: jest.fn().mockResolvedValue({ id: 1, username: 'testuser', first_name: 'Test' }),
  getCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Еда', icon: '🍕' },
    { id: 2, name: 'Транспорт', icon: '🚗' }
  ]),
  getUserCurrency: jest.fn().mockResolvedValue('RUB'),
  getTotalExpenses: jest.fn().mockResolvedValue({ total: 1000, currency: 'RUB', count: 5 }),
  getDailyExpenses: jest.fn().mockResolvedValue([
    { amount: 200, description: 'продукты', category_name: 'Еда', category_icon: '🍕' }
  ]),
  getExpensesByCategory: jest.fn().mockResolvedValue([
    { category: 'Еда', total: 500 },
    { category: 'Транспорт', total: 500 }
  ]),
  deleteLastExpense: jest.fn().mockResolvedValue({ amount: 100, description: 'кофе' }),
  exportExpenses: jest.fn().mockResolvedValue([
    { amount: 100, description: 'кофе', currency: 'RUB' }
  ]),
  setUserCurrency: jest.fn().mockResolvedValue(true),
}));

// Мок для ctx
function createMockCtx() {
  return {
    from: { id: 1, username: 'testuser', first_name: 'Test' },
    reply: jest.fn(),
    replyWithDocument: jest.fn(),
    editMessageText: jest.fn(),
    answerCbQuery: jest.fn(),
    message: { text: '' },
    callbackQuery: { data: '' },
    match: []
  };
}

describe('CommandHandlers', () => {
  let ctx;
  beforeEach(() => {
    ctx = createMockCtx();
  });

  it('start: sends welcome message', async () => {
    await CommandHandlers.start(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Привет'), expect.objectContaining({ parse_mode: 'Markdown' }));
  });

  it('help: sends help message', async () => {
    await CommandHandlers.help(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Справка по командам'), expect.objectContaining({ parse_mode: 'Markdown' }));
  });

  it('currency: sends currency keyboard', async () => {
    await CommandHandlers.currency(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ reply_markup: expect.any(Object) }));
  });

  it('settings: sends settings keyboard', async () => {
    await CommandHandlers.settings(ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Настройки:', expect.objectContaining({ reply_markup: expect.any(Object) }));
  });
});

describe('ExpenseService', () => {
  it('getCategories returns array', async () => {
    const categories = await ExpenseService.getCategories(1);
    expect(Array.isArray(categories)).toBe(true);
  });
});

describe('UserService', () => {
  it('getUserCurrency returns string', async () => {
    const currency = await UserService.getUserCurrency(1);
    expect(typeof currency === 'string' || currency === null).toBe(true);
  });
});

describe('Formatter', () => {
  it('formatAmount returns string', () => {
    expect(typeof Formatter.formatAmount(100, 'RUB')).toBe('string');
  });
}); 