// «Сегодня», обзор и записи категории — одни экраны для своих записей и для семьи: семейный вид берёт семейные записи
// всех участников за тот же пользовательский период, листается так же и показывает, кто потратил. Без БД: сервисы — моки.
const Formatter = require('../utils/formatter');
const LocalizationService = require('../services/LocalizationService');
const ExpenseHandlers = require('../handlers/ExpenseHandlers');

const localizationService = new LocalizationService();
const t = (key, params) => localizationService.getText('ru', key, params);
const identityRates = { convert: async (amount) => Number(amount) };
const FAMILY = { id: 7 };
const DAY = { start: '2026-11-05', last: '2026-11-05', end: '2026-11-06' };
const MONTH = { start: '2026-11-01', last: '2026-11-30', end: '2026-12-01' };

const rows = [
  { id: 11, amount: '500', currency: 'RUB', category_icon: '🍕', category_name: 'Еда', description: 'обед', created_at_utc: '2026-11-05T05:00:00Z', user_id: 1, username: 'ilya', family_id: 7 },
  { id: 12, amount: '300', currency: 'RUB', category_icon: '🚗', category_name: 'Транспорт', description: 'такси', created_at_utc: '2026-11-05T09:00:00Z', user_id: 2, first_name: 'Света', family_id: 7 }
];

function build({ premium = true, family = FAMILY } = {}) {
  const expenseService = {
    getPeriodContext: jest.fn(async (userId, kind) => ({ timezone: 'UTC', currency: 'RUB', today: '2026-11-05', period: kind === 'day' ? DAY : MONTH })),
    getExpenses: jest.fn(async () => rows),
    getTotals: jest.fn(async () => ({ byCurrency: [{ currency: 'RUB', total: 800 }], count: 2 })),
    getMemberTotals: jest.fn(async () => [
      { user_id: 1, username: 'ilya', currency: 'RUB', total: 200 },
      { user_id: 2, first_name: 'Света', currency: 'RUB', total: 300 },
      { user_id: 1, username: 'ilya', currency: 'USD', total: 3 } // вторая валюта того же участника
    ]),
    getFamilyCategoryById: jest.fn(async (familyId, id) => (id === 5 ? { id: 5, name: 'Еда', icon: '🍕' } : undefined)),
    getCategoryById: jest.fn()
  };
  const deps = {
    expenseService,
    reportService: { categoryBreakdown: jest.fn(async () => [{ id: 5, name: 'Еда', icon: '🍕', total: 500 }, { id: 9, name: 'Транспорт', icon: '🚗', total: 300 }]) },
    incomeService: { getTotals: jest.fn(async () => ({ byCurrency: [], count: 0 })) },
    budgetService: { getStatus: jest.fn(async () => []) },
    recurringExpenseService: { list: jest.fn(async () => []) },
    planningService: { allowanceLine: jest.fn(async () => '💸 Можно сегодня: 3 603 ₽') },
    premiumService: { isPremiumUser: jest.fn(async () => premium) },
    familyService: { getUserFamily: jest.fn(async () => family) },
    userService: { getUserLanguage: async () => 'ru', getUserById: async () => ({ created_at: '2025-01-01' }) },
    localizationService,
    formatter: new Formatter(identityRates)
  };
  return { handlers: new ExpenseHandlers(deps), deps };
}

function ctxFor(data) {
  return { from: { id: 1 }, callbackQuery: { data, message: { message_id: 5 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true), reply: jest.fn(async () => true) };
}
const screen = (ctx) => ({ text: ctx.editMessageText.mock.calls[0][0], buttons: ctx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.map(row => row.map(b => b.callback_data)) });

describe('family and personal screens are the same screens', () => {
  test('family day: any day, all members with the author, same list; switch to own records and back to the family menu', async () => {
    const { handlers, deps } = build();
    const ctx = ctxFor('fdy|-1|0');
    await handlers.showDay(ctx, -1, 0, { family: true });
    expect(deps.expenseService.getPeriodContext).toHaveBeenCalledWith(1, 'day', -1);
    expect(deps.expenseService.getExpenses).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', DAY);
    const { text, buttons } = screen(ctx);
    const date = deps.formatter.formatLocalDate(DAY.start);
    expect(text.startsWith(`👨‍👩‍👧‍👦 *${t('family_scope_title', { title: t('day_title_yesterday', { date }) })}*`)).toBe(true);
    expect(text).toContain('· 👤 ilya');
    expect(text).toContain('· 👤 Света');
    expect(deps.planningService.allowanceLine).not.toHaveBeenCalled(); // «Можно сегодня» — личное
    expect(buttons).toEqual([
      ['ex|11|f.-1.0', 'ex|12|f.-1.0'],
      ['fdy|-2|0', 'fdy|0|0'],
      ['dy|-1|0', 'family_menu']
    ]);
  });

  test('own day shows the family switch only to a premium family member', async () => {
    const own = build();
    const ctx = ctxFor('dy|0|0');
    await own.handlers.showDay(ctx, 0, 0);
    expect(own.deps.expenseService.getExpenses).toHaveBeenCalledWith(1, 'UTC', DAY);
    expect(screen(ctx).buttons.slice(-2)).toEqual([['dy|-1|0', 'pla'], ['fdy|0|0']]);

    const alone = build({ family: null });
    const aloneCtx = ctxFor('dy|0|0');
    await alone.handlers.showDay(aloneCtx, 0, 0);
    expect(screen(aloneCtx).buttons.flat()).not.toContain('fdy|0|0');
  });

  test('family overview: the user period with ◀️, who spent how much, categories open the family list; personal parts stay personal', async () => {
    const { handlers, deps } = build();
    const ctx = ctxFor('fov|-1');
    await handlers.showOverview(ctx, -1, { family: true });
    expect(deps.expenseService.getPeriodContext).toHaveBeenCalledWith(1, 'month', -1);
    expect(deps.reportService.categoryBreakdown).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', MONTH, 'RUB');
    expect(deps.expenseService.getMemberTotals).toHaveBeenCalledWith(7, 'UTC', MONTH);
    expect(deps.budgetService.getStatus).not.toHaveBeenCalled();
    expect(deps.incomeService.getTotals).not.toHaveBeenCalled();
    const { text, buttons } = screen(ctx);
    const sp = text.replace(/[\u00a0\u202f]/g, ' ');
    // ilya: 200 ₽ + 3 USD (курс 1:1 в тесте) = 203 — участник собирается из всех валют
    expect(sp).toContain(`*${t('overview_by_members')}*\n👤 Света: 300 ₽ (60%)\n👤 ilya: 203 ₽ (40%)`);
    expect(buttons).toEqual([
      ['foc|5|-1|0', 'foc|9|-1|0'],
      ['fov|-2', 'fov|0'],
      ['ov|-1', 'family_menu']
    ]);
  });

  test('family category list: members\' records with the author, back to the family overview', async () => {
    const { handlers, deps } = build();
    const ctx = ctxFor('foc|5|0|0');
    await handlers.showCategoryList(ctx, 5, 0, 0, { family: true });
    expect(deps.expenseService.getFamilyCategoryById).toHaveBeenCalledWith(7, 5);
    expect(deps.expenseService.getExpenses).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', MONTH, 'Еда');
    const { text, buttons } = screen(ctx);
    expect(text).toContain('· 👤 Света');
    expect(buttons).toEqual([['ex|11|g.5.0.0', 'ex|12|g.5.0.0'], ['fovb|0']]);
  });

  test('family screen without a family or premium explains why and leads to the family menu', async () => {
    const { handlers, deps } = build({ family: null });
    const ctx = ctxFor('fov|0');
    await handlers.showOverview(ctx, 0, { family: true });
    expect(deps.expenseService.getTotals).not.toHaveBeenCalled();
    expect(screen(ctx)).toEqual({ text: t('not_family_member'), buttons: [['family_menu']] });

    const free = build({ premium: false });
    const freeCtx = ctxFor('fdy|0|0');
    await free.handlers.showDay(freeCtx, 0, 0, { family: true });
    expect(screen(freeCtx).text).toBe(t('premium_required'));
  });

  test('a record card returns to the family day it was opened from; old «today» buttons still work', async () => {
    const pattern = new RegExp(`^(${ExpenseHandlers.BACK_VIEW_PATTERN})$`);
    for (const back of ['f.-3.1', 'f.2', 'g.5.-1.0']) expect(pattern.test(back)).toBe(true);
    const { handlers } = build();
    handlers.showDay = jest.fn();
    handlers.showCategoryList = jest.fn();
    const ctx = ctxFor('x');
    await handlers.showBackView(ctx, 'f.-3.1');
    await handlers.showBackView(ctx, 'f.2');
    await handlers.showBackView(ctx, 'g.5.-1.0');
    expect(handlers.showDay.mock.calls.map(call => call.slice(1))).toEqual([[-3, 1, { family: true }], [0, 2, { family: true }]]);
    expect(handlers.showCategoryList).toHaveBeenCalledWith(ctx, 5, -1, 0, { family: true });
  });
});
