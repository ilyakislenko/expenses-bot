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

  test('each account grows at its own rate; accounts without a rate and new contributions use the default', () => {
    const parts = [{ balance: 100000, yieldRate: 0 }, { balance: 100000, yieldRate: 12 }, { balance: 100000, yieldRate: null }];
    const { points } = simulate({ parts, monthly: 10000, yieldRate: 24, months: 12 });
    const contributions = 10000 * (1.02 ** 12 - 1) / 0.02;
    near(points[12].nominal, 100000 + 100000 * 1.01 ** 12 + 100000 * 1.02 ** 12 + contributions);
    expect(points[12].simple).toBe(300000 + 120000);
    const monthly = requiredMonthly({ parts, target: 1000000, months: 24, yieldRate: 24 });
    near(simulate({ parts, monthly, yieldRate: 24, months: 24 }).points[24].nominal, 1000000);
    expect(monthsToTarget({ parts: [{ balance: 100000, yieldRate: 0 }], monthly: 0, yieldRate: 50, target: 100001 })).toBeNull();
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
    parts: [{ balance: 1000000, yieldRate: null }],
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

  test('a goal «from all savings» grows with the accounts\' own rates', async () => {
    const goal = { goal_mode: 'total', balanceMain: 0, target_amount: 1200000, currency: 'RUB', target_date: null };
    const cash = await service.goalStatus(goal, state({ monthly: 0, parts: [{ balance: 1000000, yieldRate: 0 }] }));
    const deposit = await service.goalStatus(goal, state({ monthly: 0, parts: [{ balance: 1000000, yieldRate: 12 }] }));
    expect(cash.etaNominal).toBeNull();
    expect(deposit.etaNominal).toBe(19); // 1.01^19 ≈ 1.208
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

  test.each([
    ['Наличные USD', { name: 'Наличные', currency: 'USD', yieldRate: null }],
    ['Вклад 16%', { name: 'Вклад', currency: 'RUB', yieldRate: 16 }],
    ['$ под подушкой', { name: 'под подушкой', currency: 'USD', yieldRate: null }],
    ['Крипта USDT', { name: 'Крипта', currency: 'USD', yieldRate: null }],
    ['Счёт в банке EUR 3,5%', { name: 'Счёт в банке', currency: 'EUR', yieldRate: 3.5 }],
    ['Скины Steam usd', { name: 'Скины Steam', currency: 'USD', yieldRate: null }]
  ])('account «%s»', (input, expected) => {
    expect(handlers.parseAccountInput(input, 'RUB')).toEqual(expected);
  });

  test.each(['USD', '16%', '   '])('account «%s» without a name is rejected', (input) => {
    expect(handlers.parseAccountInput(input, 'RUB')).toBeNull();
  });
});

describe('debt amortization', () => {
  const { amortize, projectDebt } = require('../utils/debtForecast');

  test('interest-free debt: plain division, the last payment is partial', () => {
    expect(amortize({ balance: 12000, payment: 1000 })).toMatchObject({ paidOff: true, months: 12, totalInterest: 0, lastPayment: 1000 });
    expect(amortize({ balance: 10500, rate: null, payment: 1000 })).toMatchObject({ paidOff: true, months: 11, totalInterest: 0, lastPayment: 500 });
  });

  test('interest accrues monthly (12% a year → 1% a month) before the payment', () => {
    const plan = amortize({ balance: 100000, rate: 12, payment: 10000 });
    // n = −ln(1 − B·i/P) / ln(1 + i) ≈ 10.59 → 11 payments, the last one partial
    expect(plan.months).toBe(11);
    expect(plan.interest).toBeCloseTo(1000, 6);
    near(plan.totalInterest, 10 * 10000 + plan.lastPayment - 100000);
    expect(plan.lastPayment).toBeLessThan(10000);
  });

  test('annuity payment repays the loan exactly in its term', () => {
    const balance = 1000000;
    const i = 0.01;
    const payment = balance * i / (1 - Math.pow(1 + i, -120));
    const plan = amortize({ balance, rate: 12, payment });
    expect(plan.months).toBe(120);
    near(plan.totalInterest, 120 * payment - balance);
  });

  test('payment not above the monthly interest never repays the debt', () => {
    expect(amortize({ balance: 100000, rate: 12, payment: 1000 })).toMatchObject({ paidOff: false, reason: 'below_interest', interest: 1000 });
    expect(amortize({ balance: 100000, rate: 12, payment: 500 })).toMatchObject({ paidOff: false, reason: 'below_interest' });
    expect(amortize({ balance: 100000, rate: 12, payment: 1001 })).toMatchObject({ paidOff: false, reason: 'too_long' });
  });

  test('no payment, nothing owed', () => {
    expect(amortize({ balance: 5000, rate: 20, payment: null })).toMatchObject({ paidOff: false, reason: 'no_payment' });
    expect(amortize({ balance: 5000, payment: 0 })).toMatchObject({ paidOff: false, reason: 'no_payment', interest: 0 });
    expect(amortize({ balance: 0, rate: 20, payment: null })).toMatchObject({ paidOff: true, months: 0 });
  });

  test('projection: grows with interest without a payment, stops at zero once repaid', () => {
    const grow = projectDebt({ balance: 1000, rate: 12, months: 12 });
    near(grow[12], 1000 * 1.01 ** 12);
    expect(projectDebt({ balance: 1000, months: 3 })).toEqual([1000, 1000, 1000, 1000]);
    expect(projectDebt({ balance: 2500, payment: 1000, months: 5 })).toEqual([2500, 1500, 500, 0, 0, 0]);
    near(projectDebt({ balance: 100000, rate: 12, payment: 10000, months: 1 })[1], 91000);
  });
});

describe('debts in the savings state', () => {
  const service = new SavingsService({
    userService: { getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'UTC' },
    savingsRepository: {
      ensureGeneralPot: async () => ({}),
      getSettings: async () => ({ monthly_contribution: '10000' }),
      getPots: async () => [
        { id: 1, kind: 'general', name: null, balance: '100000', currency: 'RUB', yield_rate: null, target_amount: null, monthly_payment: null },
        { id: 2, kind: 'account', name: 'Cash', balance: '1000', currency: 'USD', yield_rate: '0', target_amount: null, monthly_payment: null },
        { id: 3, kind: 'debt', name: 'Mortgage', balance: '300000', currency: 'RUB', yield_rate: '12', target_amount: null, monthly_payment: '20000' },
        { id: 4, kind: 'debt', name: 'Loan', balance: '100', currency: 'USD', yield_rate: null, target_amount: null, monthly_payment: null }
      ]
    },
    currencyUtils: { convert: async (amount, from) => (from === 'USD' ? amount * 100 : amount) }
  });

  test('debts are not savings: excluded from total, accounts and forecast parts; net worth = savings − debts', async () => {
    const state = await service.getState(7);
    expect(state.total).toBe(200000);
    expect(state.debtTotal).toBe(310000);
    expect(state.netWorth).toBe(-110000);
    expect(state.accounts.map(p => p.id)).toEqual([1, 2]);
    expect(state.debts.map(p => p.id)).toEqual([3, 4]);
    expect(state.debts[0].monthly_payment).toBe(20000);
    expect(state.parts).toEqual([{ balance: 100000, yieldRate: null }, { balance: 100000, yieldRate: 0 }]);
    // Цель «от всех накоплений» считает только накопления
    const status = await service.goalStatus({ goal_mode: 'total', target_amount: 400000, currency: 'RUB', target_date: null }, state);
    expect(status.current).toBe(200000);
  });

  test('forecast sums debts in the main currency at the current rate', async () => {
    const state = await service.getState(7);
    const handlers = new SavingsHandlers({});
    const points = handlers.projectDebts(state.debts, 1);
    near(points[0], 310000);
    near(points[1], 300000 * 1.01 - 20000 + 10000);
  });
});

describe('debt input parsing', () => {
  const handlers = new SavingsHandlers({ validator: new EnhancedValidator() });

  test.each([
    ['Ипотека 3 500 000 12%', { name: 'Ипотека', amount: 3500000, currency: 'RUB', rate: 12 }],
    ['Кредитка 45000 29,9%', { name: 'Кредитка', amount: 45000, currency: 'RUB', rate: 29.9 }],
    ['Долг Пете 15000', { name: 'Долг Пете', amount: 15000, currency: 'RUB', rate: null }],
    ['Рассрочка USD 1200', { name: 'Рассрочка', amount: 1200, currency: 'USD', rate: null }],
    ['12% Ипотека 3500000', { name: 'Ипотека', amount: 3500000, currency: 'RUB', rate: 12 }],
    ['Loan to Mike $500', { name: 'Loan to Mike', amount: 500, currency: 'USD', rate: null }],
    ['Кредит 1200,50 eur 0%', { name: 'Кредит', amount: 1200.5, currency: 'EUR', rate: null }],
    ['Кредит на iPhone 15 120000', { name: 'Кредит на iPhone 15', amount: 120000, currency: 'RUB', rate: null }],
    ['房贷 1 000 000 4%', { name: '房贷', amount: 1000000, currency: 'RUB', rate: 4 }]
  ])('debt «%s»', (input, expected) => {
    expect(handlers.parseDebtInput(input, 'RUB')).toEqual(expected);
  });

  test.each(['Ипотека', '15000', 'USD 1200 12%', 'Ипотека 3 500 000 12', 'Долг 0', 'Долг 99999999999'])('debt «%s» is rejected', (input) => {
    expect(handlers.parseDebtInput(input, 'RUB')).toBeNull();
  });
});
