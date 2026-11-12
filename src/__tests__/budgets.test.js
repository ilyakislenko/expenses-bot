const BudgetService = require('../services/BudgetService');
const ReportService = require('../services/ReportService');
const Formatter = require('../utils/formatter');

// Бюджеты в RUB, курс 1:1 — проверяем только логику порогов
function makeService({ premium = true, spentByCategory, totalSpent, budgets }) {
  const sent = new Set();
  const expenseService = {
    getPeriodContext: async () => ({ timezone: 'UTC', currency: 'RUB', period: { start: '2026-10-01', end: '2026-11-01' } }),
    getTotals: async () => ({ byCurrency: [{ currency: 'RUB', total: totalSpent() }], count: 1 }),
    getCategoryTotals: async () => Object.entries(spentByCategory()).map(([name, total]) => ({ name, currency: 'RUB', total }))
  };
  const service = new BudgetService(
    { getByOwner: async () => budgets },
    expenseService,
    { markSent: async (userId, kind, ref) => (sent.has(`${kind}:${ref}`) ? false : (sent.add(`${kind}:${ref}`), true)) },
    { isPremiumUser: async () => premium },
    { convert: async (amount) => amount },
    { getText: (lang, key) => key },
    new Formatter({ convert: async (a) => a })
  );
  return service;
}

describe('BudgetService.checkAfterExpense', () => {
  test('warns at 80% once per period, then once more when exceeded', async () => {
    let food = 7000;
    const service = makeService({
      spentByCategory: () => ({ 'Еда': food }),
      totalSpent: () => food,
      budgets: [{ id: 1, category_name: 'Еда', amount: 10000, currency: 'RUB' }]
    });
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
    food = 8500;
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.level)).toEqual([80]);
    food = 9000;
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
    food = 10500;
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.level)).toEqual([100]);
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
  });

  test('jumping straight over the limit gives one alert and no later 80% alert', async () => {
    const service = makeService({
      spentByCategory: () => ({ 'Еда': 12000 }),
      totalSpent: () => 12000,
      budgets: [{ id: 1, category_name: 'Еда', amount: 10000, currency: 'RUB' }]
    });
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.level)).toEqual([100]);
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
  });


  test('after the limit is changed, alerts for the new limit come again in the same period', async () => {
    let food = 5100;
    const budgets = [{ id: 1, category_name: 'Еда', amount: 5000, currency: 'RUB' }];
    const service = makeService({ spentByCategory: () => ({ 'Еда': food }), totalSpent: () => food, budgets });
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.level)).toEqual([100]);
    budgets[0].amount = 8000;
    food = 7000;
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.level)).toEqual([80]);
  });
  test('only the category of the expense and the whole-month budget are checked', async () => {
    const service = makeService({
      spentByCategory: () => ({ 'Еда': 9000, 'Транспорт': 9000 }),
      totalSpent: () => 18000,
      budgets: [
        { id: 1, category_name: 'Еда', amount: 10000, currency: 'RUB' },
        { id: 2, category_name: 'Транспорт', amount: 10000, currency: 'RUB' },
        { id: 3, category_name: null, amount: 20000, currency: 'RUB' }
      ]
    });
    const warnings = await service.checkAfterExpense(1, 'Еда');
    expect(warnings.map(w => w.id).sort()).toEqual([1, 3]);
  });

  test('without premium: no 80% alerts; an exceeded budget gives one "alerts come with premium" notice per period', async () => {
    let food = 8500;
    const service = makeService({
      premium: false,
      spentByCategory: () => ({ 'Еда': food }),
      totalSpent: () => food,
      budgets: [{ id: 1, category_name: 'Еда', amount: 10000, currency: 'RUB' }, { id: 2, category_name: 'Кафе', amount: 100, currency: 'RUB' }]
    });
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
    food = 12000;
    const [notice, ...rest] = await service.checkAfterExpense(1, 'Еда');
    expect(rest).toEqual([]);
    expect(notice).toMatchObject({ id: 1, locked: true, level: 100, currency: 'RUB', spent: 12000, limit: 10000 });
    expect(service.warningText('ru', notice)).toBe('budget_locked_notice');
    food = 15000;
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
    // Новый период — снова одно сообщение
    service.expenseService.getPeriodContext = async () => ({ timezone: 'UTC', currency: 'RUB', period: { start: '2026-11-01', end: '2026-12-01' } });
    expect((await service.checkAfterExpense(1, 'Еда')).map(w => w.locked)).toEqual([true]);
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
  });

  test('without premium and without budgets nothing is computed', async () => {
    const service = makeService({ premium: false, spentByCategory: () => ({}), totalSpent: () => 0, budgets: [] });
    service.expenseService.getPeriodContext = jest.fn();
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
    expect(service.expenseService.getPeriodContext).not.toHaveBeenCalled();
  });
});

describe('BudgetService: the family ceiling', () => {
  function familyService({ familyMode = true, premium = true, family = { id: 7 } } = {}) {
    const byOwner = { personal: [{ id: 1, category_name: null, amount: 50000, currency: 'RUB' }], family: [{ id: 2, category_name: null, amount: 150000, currency: 'RUB', family_id: 7 }] };
    const repo = {
      getByOwner: jest.fn(async (owner) => (typeof owner === 'object' ? byOwner.family : byOwner.personal)),
      upsert: jest.fn(async () => ({ id: 3 }))
    };
    const expenseService = {
      getTotals: jest.fn(async (owner) => ({ byCurrency: [{ currency: 'RUB', total: typeof owner === 'object' ? 12609 : 800 }] })),
      getCategoryTotals: jest.fn(async () => [])
    };
    const service = new BudgetService(repo, expenseService, {}, { isPremiumUser: async () => premium }, { convert: async (a) => a }, { getText: (l, k) => k }, new Formatter({ convert: async (a) => a }),
      { getUserFamily: async () => family }, { getUserById: async () => ({ family_mode: familyMode }) });
    return { service, repo, expenseService };
  }
  const period = { timezone: 'UTC', currency: 'RUB', period: { start: '2026-11-01', end: '2026-12-01' } };

  test('«all expenses to family»: the budget is the family one, counted on every member\'s spending, and new budgets go there', async () => {
    const { service, repo, expenseService } = familyService();
    expect(await service.scopeFor(1)).toEqual({ familyId: 7 });
    const [total] = await service.getStatus(1, period);
    expect(total).toMatchObject({ id: 2, limit: 150000, spent: 12609 });
    expect(expenseService.getTotals).toHaveBeenCalledWith({ familyId: 7 }, 'UTC', period.period);
    await service.setBudget(1, null, 160000, 'RUB');
    expect(repo.upsert).toHaveBeenCalledWith({ familyId: 7 }, 1, null, 160000, 'RUB');
  });

  test('without family mode, premium or a family — own budget and own spending', async () => {
    for (const options of [{ familyMode: false }, { premium: false }, { family: null }]) {
      const { service } = familyService(options);
      expect(await service.scopeFor(1)).toBe(1);
      expect((await service.getStatus(1, period))[0]).toMatchObject({ id: 1, spent: 800 });
    }
  });
});

describe('ReportService.changePercent', () => {
  test('relative change to the previous period, none when nothing to compare', () => {
    expect(ReportService.changePercent(1200, 1000)).toBe(20);
    expect(ReportService.changePercent(700, 1000)).toBe(-30);
    expect(ReportService.changePercent(500, 0)).toBeNull();
    expect(ReportService.changePercent(500, undefined)).toBeNull();
  });
});

describe('Formatter.progressBar', () => {
  const formatter = new Formatter({});
  test('scales to 10 cells and caps overspending', () => {
    expect(formatter.progressBar(0)).toBe('░░░░░░░░░░');
    expect(formatter.progressBar(0.72)).toBe('▓▓▓▓▓▓▓░░░');
    expect(formatter.progressBar(1.4)).toBe('▓▓▓▓▓▓▓▓▓▓');
  });
});
