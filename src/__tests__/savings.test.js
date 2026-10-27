// Накопления: математика прогноза, авто-взнос, статус цели, разбор ввода
const { simulate, monthsToTarget, requiredMonthly } = require('../utils/savingsForecast');
const SavingsService = require('../services/SavingsService');
const SavingsHandlers = require('../handlers/SavingsHandlers');
const EnhancedValidator = require('../utils/enhancedValidator');

const near = (value, expected) => expect(value).toBeCloseTo(expected, 2);

describe('savings forecast', () => {
  test('without rates the balance grows by the contribution', () => {
    const { points } = simulate({ balance: 100000, monthly: 10000, months: 12 });
    expect(points[12]).toEqual({ month: 12, nominal: 220000, real: 220000, simple: 220000 });
  });

  test('yield compounds monthly (12% a year → 1% a month), contribution at month end', () => {
    const { points } = simulate({ balance: 100000, monthly: 10000, yieldRate: 12, months: 12 });
    near(points[1].nominal, 111000);
    near(points[12].nominal, 100000 * 1.01 ** 12 + 10000 * (1.01 ** 12 - 1) / 0.01);
    expect(points[12].simple).toBe(220000);
  });

  test('«today\'s money» divides by a year of inflation after 12 months', () => {
    const { points } = simulate({ balance: 110000, monthly: 0, inflationRate: 10, months: 12 });
    near(points[12].real, 100000);
  });

  test('contribution growth applies once a year', () => {
    const { points } = simulate({ balance: 100000, monthly: 10000, contributionGrowth: 10, months: 24 });
    near(points[12].nominal, 220000);
    near(points[24].nominal, 220000 + 12 * 11000);
  });

  test('a negative contribution depletes savings and stops at zero', () => {
    const { points, depletedAt } = simulate({ balance: 30000, monthly: -10000, months: 6 });
    expect(depletedAt).toBe(3);
    expect(points[6].nominal).toBe(0);
    expect(points[6].simple).toBe(0);
  });

  test('months to target: plain and in today\'s prices', () => {
    expect(monthsToTarget({ balance: 0, monthly: 10000, target: 100000 })).toBe(10);
    expect(monthsToTarget({ balance: 100000, monthly: 0, target: 100000 })).toBe(0);
    expect(monthsToTarget({ balance: 0, monthly: 10000, inflationRate: 10, target: 100000, inToday: true })).toBe(11);
    expect(monthsToTarget({ balance: 0, monthly: 0, target: 1 })).toBeNull();
    // Взнос не успевает за ценами: в сегодняшних деньгах цель недостижима
    expect(monthsToTarget({ balance: 0, monthly: 1, inflationRate: 100, target: 1000000, inToday: true })).toBeNull();
  });

  test('required monthly contribution reaches the target exactly', () => {
    expect(requiredMonthly({ balance: 0, target: 120000, months: 12 })).toBeCloseTo(10000, 6);
    expect(requiredMonthly({ balance: 200000, target: 120000, months: 12 })).toBe(0);
    const rates = { yieldRate: 16, inflationRate: 8, contributionGrowth: 5 };
    const monthly = requiredMonthly({ balance: 50000, target: 1500000, months: 30, ...rates, inToday: true });
    const { points } = simulate({ balance: 50000, monthly, ...rates, months: 30 });
    near(points[30].real, 1500000);
  });
});

describe('SavingsService', () => {
  test('full months until a deadline: only contributions that arrive in time', () => {
    const { monthsUntil } = SavingsService;
    expect(monthsUntil('2026-10-27', '2027-12-31')).toBe(14);
    expect(monthsUntil('2026-10-27', '2026-11-26')).toBe(0);
    expect(monthsUntil('2026-10-27', '2026-11-27')).toBe(1);
    expect(monthsUntil('2026-10-27', '2026-01-01')).toBe(0);
  });

  // 3 прошлых периода: доходы есть в двух, в третьем только траты — его не учитываем
  function serviceWithHistory() {
    const totals = {
      '-1': { income: [{ currency: 'RUB', total: 150000 }], incomeCount: 2, expenses: [{ currency: 'RUB', total: 90000 }, { currency: 'USD', total: 100 }] },
      '-2': { income: [{ currency: 'RUB', total: 130000 }], incomeCount: 1, expenses: [{ currency: 'RUB', total: 100000 }] },
      '-3': { income: [], incomeCount: 0, expenses: [{ currency: 'RUB', total: 70000 }] }
    };
    const period = (offset) => ({ start: `p${offset}`, end: `e${offset}` });
    const offsetOf = (p) => p.start.slice(1);
    return new SavingsService({
      expenseService: {
        getPeriodContext: async (userId, kind, offset) => ({ timezone: 'UTC', period: period(offset) }),
        getTotals: async (userId, tz, p) => ({ byCurrency: totals[offsetOf(p)].expenses })
      },
      incomeService: {
        getTotals: async (userId, tz, p) => ({ byCurrency: totals[offsetOf(p)].income, count: totals[offsetOf(p)].incomeCount })
      },
      currencyUtils: { convert: async (amount, from) => (from === 'USD' ? amount * 100 : amount) }
    });
  }

  test('auto contribution: average income − expenses over periods that have incomes, in the main currency', async () => {
    const auto = await serviceWithHistory().autoMonthly(7, 'RUB');
    expect(auto).toEqual({ income: 140000, expenses: 100000, amount: 40000, periods: 2 });
  });

  test('no recorded incomes → auto contribution is unknown, not «minus expenses»', async () => {
    const service = new SavingsService({
      expenseService: { getPeriodContext: async () => ({ timezone: 'UTC', period: {} }), getTotals: async () => ({ byCurrency: [{ currency: 'RUB', total: 1000 }] }) },
      incomeService: { getTotals: async () => ({ byCurrency: [], count: 0 }) },
      currencyUtils: {}
    });
    expect(await service.autoMonthly(7, 'RUB')).toBeNull();
  });

  const state = (overrides = {}) => ({
    currency: 'RUB',
    today: '2026-10-27',
    total: 1000000,
    monthly: 50000,
    settings: { yieldRate: 0, inflationRate: 0, contributionGrowth: 0 },
    ...overrides
  });
  const service = new SavingsService({ currencyUtils: { convert: async (amount) => amount } });

  test('own-mode goal counts only its own pot, total-mode goal counts all savings', async () => {
    const goal = { goal_mode: 'own', balanceMain: 300000, target_amount: 1500000, currency: 'RUB', target_date: null };
    const own = await service.goalStatus(goal, state());
    expect(own).toMatchObject({ current: 300000, left: 1200000, achieved: false, etaNominal: 24 });
    const total = await service.goalStatus({ ...goal, goal_mode: 'total' }, state());
    expect(total).toMatchObject({ current: 1000000, left: 500000, etaNominal: 10 });
  });

  test('deadline gives the required contribution, with inflation it is higher', async () => {
    const goal = { goal_mode: 'own', balanceMain: 0, target_amount: 1200000, currency: 'RUB', target_date: '2027-10-27' };
    const status = await service.goalStatus(goal, state({ settings: { yieldRate: 0, inflationRate: 10, contributionGrowth: 0 } }));
    expect(status.monthsLeft).toBe(12);
    near(status.requiredNominal, 100000);
    near(status.requiredReal, 110000);
    expect(status.etaReal).toBeGreaterThan(status.etaNominal);
  });

  test('unknown contribution: no ETA, but the deadline still gives the required amount', async () => {
    const goal = { goal_mode: 'own', balanceMain: 0, target_amount: 120000, currency: 'RUB', target_date: '2027-10-27' };
    const status = await service.goalStatus(goal, state({ monthly: null }));
    expect(status.etaNominal).toBeNull();
    near(status.requiredNominal, 10000);
  });
});

describe('savings input parsing', () => {
  const handlers = new SavingsHandlers({
    validator: new EnhancedValidator(),
    savingsService: { toCurrency: async (amount, from) => (from === 'USD' ? amount * 100 : amount) }
  });

  test.each([
    ['12.2027', '2027-12-31'],
    ['2.2028', '2028-02-29'],
    ['31.12.2027', '2027-12-31'],
    ['1/3/2027', '2027-03-01']
  ])('deadline «%s» → %s', (input, expected) => {
    expect(handlers.parseDate(input, '2026-10-27')).toBe(expected);
  });

  test.each(['09.2026', '27.10.2026', '31.02.2027', '13.2027', 'завтра', '2027'])('deadline «%s» is rejected', (input) => {
    expect(handlers.parseDate(input, '2026-10-27')).toBeNull();
  });

  test('amounts: thousands, other currency converted into the pot currency, zero only where allowed', async () => {
    expect(await handlers.parseAmount('15 000', 'RUB', false)).toBe(15000);
    expect(await handlers.parseAmount('100 USD', 'RUB', false)).toBe(10000);
    expect(await handlers.parseAmount('0', 'RUB', true)).toBe(0);
    expect(await handlers.parseAmount('0', 'RUB', false)).toBeNull();
    expect(await handlers.parseAmount('15000 машина', 'RUB', false)).toBeNull();
  });
});
