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
    { getByUser: async () => budgets },
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

  test('no alerts without premium', async () => {
    const service = makeService({
      premium: false,
      spentByCategory: () => ({ 'Еда': 12000 }),
      totalSpent: () => 12000,
      budgets: [{ id: 1, category_name: 'Еда', amount: 10000, currency: 'RUB' }]
    });
    expect(await service.checkAfterExpense(1, 'Еда')).toEqual([]);
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
