// «📊 Сценарии на год»: накопления через 12 месяцев при тратах как в среднем, по плану и как в этом месяце;
// в семейном контуре — доходы, траты и накопления всех участников. Без БД: сервисы — моки, даты фиксированы.
const SavingsScenarioService = require('../services/SavingsScenarioService');
const SavingsHandlers = require('../handlers/SavingsHandlers');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const charts = require('../utils/charts');
const { customPeriod } = require('../utils/period');

const localization = new LocalizationService();
const TODAY = '2026-11-06';

// Октябрь — 100 000 трат и 300 000 дохода (две записи участников), сентябрь — 80 000 трат, дохода нет;
// ноябрь: 01–05.11 по 2 000 в день, сегодня ничего; аренда 27 000 10.11 — регулярная Юли (участник 2)
function build({ family = true, budget = 150000, incomes = true } = {}) {
  const totalsBy = { '2026-10-01': 100000, '2026-09-01': 80000 };
  const expenseService = {
    getPeriodContext: jest.fn(async (userId, kind, offset) => ({ timezone: 'UTC', currency: 'RUB', startDay: 1, today: TODAY, period: customPeriod(TODAY, 1, offset) })),
    getTotals: jest.fn(async (owner, tz, period) => (totalsBy[period.start]
      ? { count: 10, byCurrency: [{ currency: 'RUB', total: totalsBy[period.start] }] }
      : { count: 0, byCurrency: [] })),
    getExpenses: jest.fn(async () => [1, 2, 3, 4, 5].map(d => ({ amount: '2000', currency: 'RUB', created_at_utc: `2026-11-0${d}T08:00:00Z` })))
  };
  const recurringExpenseService = { list: jest.fn(async (id) => (id === 2 ? [{ amount: '27000', currency: 'RUB', nextChargeDate: '2026-11-10' }] : [])) };
  const planningRepository = {
    getIncomeRowsSince: jest.fn(async (id) => (!incomes ? [] : id === 1
      ? [{ date: '2026-10-05', description: 'работа', amount: 200000, currency: 'RUB' }, { date: '2026-10-20', description: 'Перевод от К.', amount: 5000, currency: 'RUB', imported: true }]
      : [{ date: '2026-10-25', description: 'зарплата', amount: 100000, currency: 'RUB' }]))
  };
  const state = (total) => ({ currency: 'RUB', total, parts: [{ balance: total, yieldRate: null }], settings: { yieldRate: 0, inflationRate: 0, contributionGrowth: 0 } });
  const service = new SavingsScenarioService({
    savingsService: { getState: jest.fn(async (id) => state(id === 1 ? 800000 : 200000)) },
    expenseService,
    budgetService: {
      scopeFor: jest.fn(async (id) => (family ? { familyId: 7 } : id)),
      getStatus: jest.fn(async () => (budget ? [{ category_name: null, limit: budget }] : []))
    },
    recurringExpenseService,
    planningRepository,
    familyRepository: { getFamilyMembers: jest.fn(async () => [{ id: 1 }, { id: 2 }]) },
    currencyUtils: { convert: async (amount) => amount }
  });
  return { service, expenseService, planningRepository };
}

describe('savings scenarios for a year', () => {
  test('family: everyone\'s income, spending and savings; average, plan and this month give three monthly amounts', async () => {
    const { service, expenseService } = build();
    const result = await service.build(1);
    expect(expenseService.getTotals).toHaveBeenCalledWith({ userIds: [1, 2] }, 'UTC', expect.objectContaining({ start: '2026-10-01' }));
    // Доход: 200 000 + 100 000 за октябрь (перевод из выписки — не доход), один период с доходом
    expect(result).toMatchObject({ family: true, total: 1000000, income: { amount: 300000, periods: 1 } });
    // Ноябрь: 10 000 за 5 дней → 2 000 в день; сегодня по темпу, ещё 24 дня и аренда 27 000 = 10 000 + 2 000 × 25 + 27 000
    expect(result.scenarios.map(s => [s.key, Math.round(s.spending), Math.round(s.monthly)])).toEqual([
      ['average', 90000, 210000], ['plan', 150000, 150000], ['current', 87000, 213000]
    ]);
    const average = result.scenarios[0];
    expect(average.periods).toBe(2);
    expect(average.points).toHaveLength(13);
    expect(average.points[0]).toBe(1000000);
    expect(average.points[12]).toBeCloseTo(1000000 + 12 * 210000);
  });

  test('without a budget there is no plan curve; without income — nothing to count', async () => {
    const noBudget = await build({ budget: null, family: false }).service.build(1);
    expect(noBudget.family).toBe(false);
    expect(noBudget.scenarios.map(s => s.key)).toEqual(['average', 'current']);
    const noIncome = await build({ incomes: false }).service.build(1);
    expect(noIncome.income).toBeNull();
    expect(noIncome.scenarios).toEqual([]);
  });

  test('chart: a curve per scenario from the common «now» point, end labels kept apart', () => {
    const flat = (from, step) => Array.from({ length: 13 }, (_, k) => from + step * k);
    const svg = charts.savingsScenariosSvg({
      title: 'Накопления через год', monthLabels: Array.from({ length: 13 }, (_, k) => `m${k}`), nowLabel: 'сейчас', nowAmount: '1 млн ₽',
      lines: [
        { label: 'как в среднем', values: flat(1e6, 210000), color: '#ff8a5c', amount: '3,52 млн ₽' },
        { label: 'по плану', values: flat(1e6, 150000), color: '#b07cff', dash: '14 10', amount: '2,8 млн ₽' },
        { label: 'как в этом месяце', values: flat(1e6, 213000), color: '#4f9dff', amount: '3,56 млн ₽' }
      ]
    });
    const polylines = [...svg.matchAll(/<polyline points="([^"]+)"/g)].map(m => m[1].split(' '));
    expect(polylines).toHaveLength(3);
    expect(new Set(polylines.map(p => p[0])).size).toBe(1); // общая точка «сейчас»
    const ends = ['3,52 млн ₽', '3,56 млн ₽'].map(text => Number(svg.match(new RegExp(`y="(\\d+(?:\\.\\d+)?)"[^>]*>${text}<`))[1]));
    expect(Math.abs(ends[0] - ends[1])).toBeGreaterThanOrEqual(28); // почти равные суммы — подписи раздвинуты
  });

  test('screen: caption per scenario, family note; without income — the hint and «add income»', async () => {
    const { service } = build();
    const handlers = new SavingsHandlers({
      savingsService: {}, userService: { getUserLanguage: async () => 'ru' }, localizationService: localization,
      formatter: new Formatter({ convert: async (a) => a }), savingsScenarioService: service
    });
    const ctx = { from: { id: 1 }, callbackQuery: { data: 'svfs', message: { message_id: 3 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };
    await handlers.showScenarios(ctx);
    const [text, extra] = ctx.editMessageText.mock.calls[0];
    const sp = text.replace(/[\u00a0\u202f]/g, ' ');
    expect(sp).toContain('Сейчас: 1 млн ₽ · доход ≈ 300 тыс ₽ в месяц (средний за 1 мес.)');
    expect(sp).toContain('🟠 Траты как в среднем (90 тыс ₽ в месяц, 2 мес.): +210 тыс ₽ в месяц → *3,52 млн ₽*');
    expect(sp).toContain('🟣 Траты по плану (бюджет 150 тыс ₽): +150 тыс ₽ в месяц → *2,8 млн ₽*');
    expect(sp).toContain('🔵 Траты как в этом месяце (≈ 87 тыс ₽): +213 тыс ₽ в месяц → *3,56 млн ₽*');
    expect(sp).toContain(localization.getText('ru', 'savings_scen_family'));
    expect(extra.reply_markup.inline_keyboard).toEqual([[{ text: localization.getText('ru', 'savings_scen_back'), callback_data: 'svf' }]]);

    const none = new SavingsHandlers({
      savingsService: {}, userService: { getUserLanguage: async () => 'ru' }, localizationService: localization,
      formatter: new Formatter({ convert: async (a) => a }), savingsScenarioService: build({ incomes: false }).service
    });
    const noneCtx = { ...ctx, editMessageText: jest.fn(async () => true) };
    await none.showScenarios(noneCtx);
    expect(noneCtx.editMessageText.mock.calls[0][0]).toContain(localization.getText('ru', 'savings_scen_no_income'));
    expect(noneCtx.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard[0][0].callback_data).toBe('income_add');
  });
});
