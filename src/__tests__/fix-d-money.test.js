// Регрессии аудита денег (FixD): «Можно сегодня» и общий бюджет, резерв до следующего дохода и потолок лимита,
// «Итоги на сегодня» к этому же дню, ночная сводка за вчера, неделя без авто-записей регулярных,
// цель, выполненная уже при создании. Без БД: репозитории и сервисы — моки, даты фиксированы.
const { computeAllowance, nextIncomeDate } = require('../utils/planning');
const { customPeriod, dayPeriod } = require('../utils/period');
const PlanningService = require('../services/PlanningService');
const PlanningHandlers = require('../handlers/PlanningHandlers');
const ReportService = require('../services/ReportService');
const DailySummaryService = require('../services/DailySummaryService');
const WeeklyInsightService = require('../services/WeeklyInsightService');
const SavingsService = require('../services/SavingsService');
const AchievementRepository = require('../repositories/AchievementRepository');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

const localization = new LocalizationService();
const identity = { convert: async (amount) => amount };

// ========================================
// «Можно сегодня»
// ========================================

function planningService({ today, startDay = 1, split, recurring = [], debts = [], incomeRows = [], budgets = [], subs = [] }) {
  const deps = {
    planningRepository: {
      getSpendSplit: jest.fn().mockResolvedValue(split),
      getDebts: jest.fn().mockResolvedValue(debts),
      getMonthlyContribution: jest.fn().mockResolvedValue(null),
      getIncomeRowsSince: jest.fn().mockResolvedValue(incomeRows)
    },
    expenseService: {
      getPeriodContext: jest.fn().mockResolvedValue({ timezone: 'UTC', currency: 'RUB', startDay, today, period: customPeriod(today, startDay, 0) })
    },
    recurringExpenseService: { list: jest.fn().mockResolvedValue(recurring) },
    budgetService: { getStatus: jest.fn().mockResolvedValue(budgets) },
    premiumService: { isPremiumUser: jest.fn().mockResolvedValue(true) },
    userService: { getUserById: jest.fn(), getUserLanguage: jest.fn().mockResolvedValue('ru') },
    userNotificationRepository: { markSent: jest.fn().mockResolvedValue(true) },
    notificationService: { sendMessage: jest.fn() },
    localizationService: localization,
    formatter: new Formatter(identity),
    currencyUtils: { convert: jest.fn(async (amount) => amount) }
  };
  const service = new PlanningService(deps);
  service.getSubscriptions = jest.fn().mockResolvedValue({ visible: subs });
  return { service, deps };
}

// Текст экрана «💸 Можно сегодня» (pla)
async function allowanceScreen(service) {
  const handlers = new PlanningHandlers({ planningService: service, userService: { getUserLanguage: async () => 'ru' }, localizationService: localization, formatter: new Formatter(identity) });
  const ctx = { from: { id: 777 }, reply: jest.fn() };
  await handlers.showAllowance(ctx);
  return ctx.reply.mock.calls[0][0];
}

const salary = ['2026-08-05', '2026-09-05', '2026-10-05'].map(date => ({ date, description: 'Зарплата', amount: 195000, currency: 'RUB' }));

describe('allowance: the total budget limits it even with income', () => {
  test('the smaller of income-based and budget-based allowance', () => {
    const a = computeAllowance({ daysLeft: 12, income: 195000, budget: 150000, spentBefore: 120000 });
    expect(a).toMatchObject({ mode: 'income', limitedBy: 'budget', free: 30000, budgetFree: 30000, daily: 2500, deficit: 0 });
    // Бюджет свободнее дохода — считаем от дохода
    expect(computeAllowance({ daysLeft: 12, income: 130000, budget: 150000, spentBefore: 120000 })).toMatchObject({ limitedBy: null, free: 10000 });
  });

  test('budget already exceeded: zero allowance and «plan exceeded 🔴» even though income is left', () => {
    const a = computeAllowance({ daysLeft: 28, income: 50000, budget: 8053, spentBefore: 9409, spentToday: 100 });
    expect(a).toMatchObject({ limitedBy: 'budget', daily: 0, deficit: 1356, pace: 'over' });
  });

  test('service: budget is fetched with income; the screen says it is limited by the budget', async () => {
    const { service, deps } = planningService({
      today: '2026-10-20',
      split: [{ currency: 'RUB', before: 120000, bills_today: 0, today: 0 }],
      incomeRows: salary,
      budgets: [{ category_name: 'Еда', limit: 1000 }, { category_name: null, limit: 150000 }]
    });
    const a = await service.getAllowance(777);
    expect(deps.budgetService.getStatus).toHaveBeenCalled();
    expect(a).toMatchObject({ mode: 'income', budget: 150000, limitedBy: 'budget', daysLeft: 12, free: 30000, daily: 2500 });
    const text = await allowanceScreen(service);
    expect(text).toContain('Ограничено общим бюджетом');
    expect(text).not.toMatch(/\{\w+\}/);

    deps.budgetService.getStatus.mockResolvedValue([{ category_name: null, limit: 100000 }]);
    const over = await service.getAllowance(777);
    expect(over).toMatchObject({ daily: 0, deficit: 20000 });
    expect(service.formatLine('ru', over)).toContain('превышен');
  });
});

describe('allowance: reserve until the next income and a cap on growth', () => {
  test('next expected income date from the payday streams', () => {
    const streams = [{ day: 5, lastDate: '2026-10-05', amount: 195000 }, { day: 20, lastDate: '2026-10-20', amount: 50000 }];
    expect(nextIncomeDate(streams, '2026-10-30', '2026-12-01')).toBe('2026-11-05');
    expect(nextIncomeDate([], '2026-10-30', '2026-12-01')).toBeNull();
  });

  test('daily allowance is capped at 2× the average day of the period', () => {
    const a = computeAllowance({ daysLeft: 2, periodDays: 31, income: 62000, spentBefore: 10000 });
    expect(a).toMatchObject({ rawDaily: 26000, cap: 4000, daily: 4000, capped: true, free: 52000 });
    expect(computeAllowance({ daysLeft: 20, periodDays: 31, income: 62000, spentBefore: 10000 })).toMatchObject({ daily: 2600, capped: false });
    // Без длины периода — без потолка
    expect(computeAllowance({ daysLeft: 2, income: 62000, spentBefore: 10000 })).toMatchObject({ daily: 26000, cap: null });
  });

  test('30.10: rent on 03.11, debt on 04.11 and a known subscription are reserved — salary only on 05.11', async () => {
    const { service } = planningService({
      today: '2026-10-30',
      split: [{ currency: 'RUB', before: 100000, bills_today: 0, today: 0 }],
      incomeRows: salary,
      recurring: [{ description: 'Аренда', amount: '35000', currency: 'RUB', day_of_month: 3, nextChargeDate: '2026-11-03' }],
      debts: [{ id: 1, name: 'Кредит', balance: 50000, currency: 'RUB', monthly_payment: 5000, due_day: 4 }],
      subs: [
        { label: 'Netflix', amount: 999, currency: 'RUB', cadence: 'monthly', nextDate: '2026-11-02', confirmed: false, known: true },
        { label: 'Кофейня', amount: 300, currency: 'RUB', cadence: 'weekly', nextDate: '2026-11-01', confirmed: false, known: false }
      ]
    });
    const a = await service.getAllowance(777);
    expect(a.period).toMatchObject({ start: '2026-10-01', end: '2026-11-01' });
    expect(a).toMatchObject({ nextIncome: '2026-11-05', reserveUntil: '2026-11-05', daysLeft: 2 });
    expect(a.bills).toBe(35999);
    expect(a.billsList).toHaveLength(2);
    expect(a.debtsTotal).toBe(5000);
    // Бюджета нет — платежи следующего периода в нём не нужны
    expect(a.budgetBills).toBe(0);
    expect(a.free).toBe(195000 - 100000 - 35999 - 5000);
    // Было бы 47 500 в день; без потолка — 27 000; потолок 2 × 195 000 / 31
    expect(a).toMatchObject({ rawDaily: 27000, cap: 12580, daily: 12580, capped: true });

    const text = await allowanceScreen(service);
    expect(text).toContain('до следующего дохода ~05.11');
    expect(text).toContain('Но не больше 2×');
    expect(text).not.toMatch(/\{\w+\}/);
  });

  test('next income inside the period: reserve only until the period end, as before', async () => {
    const { service } = planningService({
      today: '2026-10-28',
      startDay: 25,
      split: [{ currency: 'RUB', before: 10000, bills_today: 0, today: 0 }],
      incomeRows: salary,
      recurring: [{ description: 'Аренда', amount: '35000', currency: 'RUB', day_of_month: 3, nextChargeDate: '2026-11-03' }]
    });
    const a = await service.getAllowance(777);
    expect(a).toMatchObject({ nextIncome: '2026-11-05', reserveUntil: '2026-11-25', bills: 35000 });
  });
});

describe('planning: small fixes', () => {
  test('expected income is listed by date', async () => {
    const rows = [
      ...['2026-08-20', '2026-09-20', '2026-10-20'].map(date => ({ date, description: 'Аванс', amount: 50000, currency: 'RUB' })),
      ...['2026-08-05', '2026-09-05', '2026-10-05'].map(date => ({ date, description: 'Зарплата', amount: 130000, currency: 'RUB' }))
    ];
    const { service } = planningService({ today: '2026-10-28', startDay: 25, split: [], incomeRows: rows });
    const ctx = { today: '2026-10-28', startDay: 25, period: customPeriod('2026-10-28', 25, 0), timezone: 'UTC', currency: 'RUB' };
    const outlook = await service.incomeOutlook(777, ctx, async (amount) => amount);
    expect(outlook.upcomingList.map(item => [item.date, item.stream.label])).toEqual([['2026-11-05', 'Зарплата'], ['2026-11-20', 'Аванс']]);
  });

  test('subscription nudge names 3 and adds «and N more»', async () => {
    const { service } = planningService({ today: '2026-10-28', split: [] });
    service.getSubscriptions = jest.fn().mockResolvedValue({ visible: ['спортзал абонемент', 'ChatGPT Plus', 'Netflix', 'Okko'].map(label => ({ key: label, label, confirmed: false })) });
    const text = await service.subscriptionNudge(777, 'ru');
    expect(text).toContain('(4)');
    expect(text).toContain('Netflix и ещё 1');
    expect(text).not.toContain('Okko');
  });
});

// ========================================
// «Итоги на сегодня»
// ========================================

describe('report so far compares with the same days of the previous period', () => {
  const { comparablePrevious } = ReportService;

  test('cut of the previous period', () => {
    const period = customPeriod('2026-10-28', 25, 0);
    const previous = customPeriod('2026-10-28', 25, -1);
    expect(comparablePrevious(period, previous, '2026-10-28')).toEqual({ period: { start: '2026-09-25', end: '2026-09-29', last: '2026-09-28' }, days: 4 });
    // Последний день периода и прошлые периоды — целиком
    expect(comparablePrevious(period, previous, period.last)).toEqual({ period: previous, days: null });
    expect(comparablePrevious(previous, customPeriod('2026-10-28', 25, -2), '2026-10-28').days).toBeNull();
  });

  test('rp|0: totals, categories and «no spending this time» use the cut', async () => {
    const data = {
      '2026-10-25|2026-11-25': [{ name: 'Еда', total: 6000 }, { name: 'Транспорт', total: 3409 }],
      '2026-09-25|2026-09-29': [{ name: 'Еда', total: 8000 }, { name: 'Развлечения', total: 2992 }],
      '2026-09-25|2026-10-25': [{ name: 'Еда', total: 40000 }, { name: 'Развлечения', total: 10000 }, { name: 'Здоровье', total: 13644 }]
    };
    const rowsFor = (period) => data[`${period.start}|${period.end}`] || [];
    const expenseService = {
      getPeriodContext: jest.fn(async (userId, kind, offset) => ({ timezone: 'UTC', currency: 'RUB', today: '2026-10-28', period: customPeriod('2026-10-28', 25, offset) })),
      getTotals: jest.fn(async (userId, timezone, period) => ({ count: rowsFor(period).length, byCurrency: rowsFor(period).map(r => ({ currency: 'RUB', total: r.total })) })),
      getCategoryTotals: jest.fn(async (userId, timezone, period) => rowsFor(period).map((r, i) => ({ category_id: i + 1, name: r.name, icon: '•', currency: 'RUB', total: r.total }))),
      getExpenses: jest.fn(async () => [])
    };
    const formatter = new Formatter(identity);
    const service = new ReportService({
      expenseService,
      incomeService: { getTotals: async () => ({ count: 0, byCurrency: [] }) },
      budgetService: { getStatus: async () => [] },
      localizationService: localization,
      formatter,
      currencyUtils: identity
    });
    const { text } = await service.buildReport(1, 0, 'ru', { full: true });
    // 9 409 к 10 992 за 25–28.09, а не к 63 644 за весь прошлый период
    expect(text).toContain('К тем же 4 дн. прошлого периода: ↓ −14%');
    expect(text).toContain('Категории (к тем же 4 дн. прошлого периода)');
    expect(text).toContain('Еда — 6\u00a0000');
    expect(text).toContain('↓ −25%');
    expect(text).toContain('Без трат в этот раз: • Развлечения');
    expect(text).not.toContain('Здоровье');
    expect(expenseService.getTotals).not.toHaveBeenCalledWith(1, 'UTC', expect.objectContaining({ start: '2026-09-25', end: '2026-10-25' }));
  });
});

// ========================================
// Ежедневная сводка ночью
// ========================================

describe('daily summary at 00:00–03:00 is about the previous day', () => {
  // state.today — локальная дата «сейчас», state.hour — выбранный час сводки
  function build(state) {
    const sent = new Set();
    const userNotificationRepository = {
      getDailySummaryCandidates: jest.fn(async () => [{ id: 1, language: 'ru', timezone: 'Europe/Moscow', daily_summary_hour: state.hour }]),
      markSent: jest.fn(async (userId, kind, key) => (sent.has(key) ? false : (sent.add(key), true)))
    };
    const expenseService = {
      getPeriodContext: jest.fn(async (userId, kind, offset) => ({ timezone: 'Europe/Moscow', currency: 'RUB', today: state.today, period: dayPeriod(state.today, offset) })),
      // Траты были только 28.10
      getTotals: jest.fn(async (userId, timezone, period) => (period.start === '2026-10-28'
        ? { count: 2, byCurrency: [{ currency: 'RUB', total: 1410 }] }
        : { count: 0, byCurrency: [] }))
    };
    const service = new DailySummaryService({
      expenseService,
      incomeService: { getTotals: async () => ({ count: 0, byCurrency: [] }) },
      reportService: { categoryBreakdown: async () => [{ name: 'Еда', icon: '🍔', total: 1410 }], categoryLabel: (c) => `${c.icon} ${c.name}` },
      userNotificationRepository,
      notificationService: { sendMessage: jest.fn(async () => ({})) },
      localizationService: localization,
      formatter: new Formatter(identity)
    });
    return { service, expenseService, userNotificationRepository };
  }

  test('night hours → yesterday', () => {
    expect([0, 1, 2, 3, 4, 21].map(DailySummaryService.summaryDayOffset)).toEqual([-1, -1, -1, -1, 0, 0]);
  });

  test('00:00 on 29.10 sends the summary of 28.10 once, keyed by 28.10', async () => {
    const { service, expenseService, userNotificationRepository } = build({ today: '2026-10-29', hour: 0 });
    const midnight = new Date('2026-10-28T21:00:20Z'); // 00:00 в Москве
    expect(await service.processDue(midnight)).toBe(1);
    expect(await service.processDue(midnight)).toBe(0);
    expect(expenseService.getPeriodContext).toHaveBeenCalledWith(1, 'day', -1);
    expect(userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'daily_summary', '2026-10-28');
    const [, text, extra] = service.notificationService.sendMessage.mock.calls[0];
    expect(text).toContain('28.10.2026');
    expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe('dy|-1|0');
  });

  test('21:00 is about today; after switching to 00:00 the same day is not sent again', async () => {
    const state = { today: '2026-10-28', hour: 21 };
    const { service, userNotificationRepository } = build(state);
    expect(await service.buildSummary(1, 'ru')).toMatchObject({ day: '2026-10-28', dayOffset: 0 });
    expect(await service.processDue(new Date('2026-10-28T18:00:00Z'))).toBe(1); // 21:00 в Москве
    Object.assign(state, { today: '2026-10-29', hour: 0 });
    expect(await service.processDue(new Date('2026-10-28T21:00:00Z'))).toBe(0); // 00:00 — снова сводка за 28.10
    expect(userNotificationRepository.markSent).toHaveBeenCalledTimes(2);
    expect(userNotificationRepository.markSent).toHaveBeenLastCalledWith(1, 'daily_summary', '2026-10-28');
  });
});

// ========================================
// Сводка недели и регулярные платежи
// ========================================

describe('weekly insight: recurring auto-records do not distort the usual week', () => {
  const { summarizeWeeks } = WeeklyInsightService;
  const week = (categories) => ({
    total: categories.reduce((sum, c) => sum + c.total, 0),
    regular: categories.reduce((sum, c) => sum + (c.regular || 0), 0),
    categories: categories.map((c, i) => ({ id: i + 1, icon: '•', regular: 0, ...c }))
  });
  const usual = week([{ name: 'Еда', total: 10000 }]);
  const withRent = week([{ name: 'Еда', total: 10000 }, { name: 'Жильё', total: 35000, regular: 35000 }]);

  test('rent week in history: the average and categories ignore the rent', () => {
    const summary = summarizeWeeks(usual, [usual, withRent, usual, usual]);
    expect(summary).toMatchObject({ total: 10000, average: 10000, diff: 0, percent: 0, improvement: null, overspend: null });
  });

  test('rent this week: shown in the total, not compared', () => {
    const summary = summarizeWeeks(withRent, [usual, usual, usual, usual]);
    expect(summary).toMatchObject({ total: 45000, regular: 35000, percent: 0, overspend: null });
    expect(summary.top.map(c => c.name)).toEqual(['Еда']);
  });

  test('the message keeps the full week total and explains the recurring part', async () => {
    const rows = {
      '2026-10-19|2026-10-26': [{ name: 'Еда', total: 10000 }, { name: 'Жильё', total: 35000, regular: 35000 }],
      '2026-10-12|2026-10-19': [{ name: 'Еда', total: 10000 }],
      '2026-10-05|2026-10-12': [{ name: 'Еда', total: 10000 }],
      '2026-09-28|2026-10-05': [{ name: 'Еда', total: 10000 }]
    };
    const rowsFor = (period) => rows[`${period.start}|${period.end}`] || [];
    const expenseService = {
      getPeriodContext: async () => ({ timezone: 'Europe/Moscow', currency: 'RUB', startDay: 1 }),
      getTotals: async (userId, timezone, period) => ({ count: rowsFor(period).length, byCurrency: rowsFor(period).map(r => ({ currency: 'RUB', total: r.total })) }),
      getCategoryTotals: async (userId, timezone, period) => rowsFor(period).map((r, i) => ({ category_id: i + 1, name: r.name, icon: '•', currency: 'RUB', total: r.total, regular: r.regular || 0 }))
    };
    const formatter = new Formatter(identity);
    const reportService = new ReportService({ expenseService, localizationService: localization, formatter, currencyUtils: identity });
    const service = new WeeklyInsightService({
      expenseService,
      incomeService: { getTotals: async () => ({ count: 0, byCurrency: [] }) },
      reportService,
      budgetService: { getStatus: async () => [] },
      userNotificationRepository: {},
      notificationService: {},
      localizationService: localization,
      formatter
    });
    const { text } = await service.buildInsight(1, 'ru', new Date('2026-10-26T07:00:00Z'));
    expect(text).toContain('Потрачено за неделю: *45\u00a0000');
    expect(text).toContain('Из них регулярные платежи: 35\u00a0000');
    expect(text).toContain('Как обычно');
    expect(text).not.toContain('больше обычного');
  });
});

// ========================================
// Цель, выполненная уже при создании
// ========================================

describe('savings goal already reached at creation gives no «Dream come true»', () => {
  const CREATED = new Date('2025-01-15T10:00:00.123Z');

  function build() {
    const pots = [{ id: 1, kind: 'general', name: null, balance: '271062', currency: 'RUB', yield_rate: null, target_amount: null, monthly_payment: null }];
    let nextId = 5;
    const savingsRepository = {
      ensureGeneralPot: async () => pots[0],
      getSettings: async () => ({ monthly_contribution: '10000' }),
      getPots: async () => pots.map(p => ({ ...p })),
      countGoals: async () => pots.filter(p => p.kind === 'goal').length,
      createGoal: jest.fn(async (userId, { name, targetAmount, currency }) => {
        const goal = { id: nextId++, kind: 'goal', name, balance: '0', currency, target_amount: String(targetAmount), goal_mode: 'total', achieved_at: null, created_at: CREATED, target_date: null, yield_rate: null, monthly_payment: null };
        pots.push(goal);
        return { ...goal };
      }),
      updateGoal: jest.fn(async (userId, id, fields) => Object.assign(pots.find(p => p.id === id), fields))
    };
    const service = new SavingsService({
      savingsRepository,
      userService: { getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'UTC' },
      premiumService: { getUserLimits: async () => ({ MAX_SAVINGS_GOALS: 5 }) },
      currencyUtils: identity
    });
    return { service, savingsRepository, pots };
  }

  test('created reached: stamped with created_at, not congratulated; reached later by a deposit — congratulated', async () => {
    const { service, savingsRepository, pots } = build();
    await service.createGoal(7, { name: 'Отпуск', targetAmount: 150000, currency: 'RUB' });
    expect(savingsRepository.updateGoal).toHaveBeenCalledWith(7, 5, { achieved_at: CREATED });
    expect(await service.checkAchievements(7)).toEqual([]);

    await service.createGoal(7, { name: 'Машина', targetAmount: 500000, currency: 'RUB' });
    expect(pots.find(p => p.id === 6).achieved_at).toBeNull();
    pots[0].balance = '600000';
    const achieved = await service.checkAchievements(7);
    expect(achieved.map(g => g.id)).toEqual([6]);
    expect(pots.find(p => p.id === 6).achieved_at.getTime()).toBeGreaterThan(CREATED.getTime());
  });

  test('achievement stats count only goals reached after creation', async () => {
    const repository = new AchievementRepository();
    const calls = [];
    repository.query = async (sql) => {
      calls.push(sql);
      return { rows: [{}] };
    };
    await repository.getStats(7, 'UTC');
    expect(calls[0]).toMatch(/kind = 'goal' AND achieved_at > created_at\)::int AS goals_reached/);
  });
});

describe('fix D round 2: goals «from all savings» share the same money', () => {
  const SavingsHandlers = require('../handlers/SavingsHandlers');
  const goal = (id, name, target) => ({ id, kind: 'goal', name, goal_mode: 'total', target_amount: target, currency: 'RUB', balance: 0, balanceMain: 0 });
  const menu = async (goals, total) => {
    const handlers = new SavingsHandlers({
      userService: { getUserLanguage: async () => 'ru' },
      localizationService: localization,
      formatter: new Formatter(identity),
      savingsService: {
        getState: async () => ({ currency: 'RUB', total, debtTotal: 0, netWorth: total, today: '2026-10-28', pots: goals, accounts: [], goals, debts: [], monthly: null, parts: [], settings: {} }),
        goalStatus: async (g) => ({ current: total, target: g.target_amount, ratio: total / g.target_amount, achieved: total >= g.target_amount, etaNominal: null })
      }
    });
    let text = null;
    await handlers.showMenu({ from: { id: 1 }, chat: { id: 1, type: 'private' }, reply: async (t) => { text = t; return { message_id: 1 }; } });
    return text;
  };

  test('two goals from all savings: the note says how much all of them need and what is missing', async () => {
    const short = await menu([goal(1, 'отпуск', 150000), goal(2, 'ноутбук', 150000)], 271000);
    expect(short).toContain('считают одни и те же деньги');
    expect(short.replace(/\s/g, ' ')).toContain('не хватает 29 000');
    const enough = await menu([goal(1, 'отпуск', 100000), goal(2, 'ноутбук', 50000)], 271000);
    expect(enough).toContain('считают одни и те же деньги');
    expect(enough).not.toContain('не хватает');
    expect(await menu([goal(1, 'отпуск', 100000)], 271000)).not.toContain('одни и те же деньги');
  });
});
