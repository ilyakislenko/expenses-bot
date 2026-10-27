const {
  computeAllowance, expectedIncome, paceOf, normalizeMerchant, normalizeItemName, detectSubscriptions,
  detectPaydays, nextPayday, buildCalendar, computeInflation, monthlyDates, subscriptionDates
} = require('../utils/planning');
const { customPeriod } = require('../utils/period');
const RecurringExpenseService = require('../services/RecurringExpenseService');
const PlanningService = require('../services/PlanningService');
const WeeklyInsightService = require('../services/WeeklyInsightService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { localToday, parseYmd, ymd } = require('../utils/period');

const TODAY = '2026-10-28';

describe('safe-to-spend: allowance math', () => {
  test('income minus spent, bills, debts and savings, split over the days left (today included)', () => {
    const a = computeAllowance({ daysLeft: 10, income: 100000, spentBefore: 40000, spentToday: 1000, bills: 5000, debts: 15000, savings: 10000 });
    expect(a).toMatchObject({ mode: 'income', free: 30000, daily: 3000, leftToday: 2000, deficit: 0, pace: 'good' });
  });

  test('pace: up to 70% green, up to 100% yellow, above red', () => {
    const base = { daysLeft: 10, income: 40000 }; // 4000 в день
    expect(computeAllowance({ ...base, spentToday: 2800 }).pace).toBe('good');
    expect(computeAllowance({ ...base, spentToday: 2801 }).pace).toBe('warn');
    expect(computeAllowance({ ...base, spentToday: 4000 }).pace).toBe('warn');
    expect(computeAllowance({ ...base, spentToday: 4001 }).pace).toBe('over');
    expect(paceOf(0, 0)).toBe('over');
  });

  test('last day of the period: the whole rest is for today; zero days is treated as one', () => {
    expect(computeAllowance({ daysLeft: 1, income: 50000, spentBefore: 48000 })).toMatchObject({ daily: 2000, days: 1 });
    expect(computeAllowance({ daysLeft: 0, income: 50000, spentBefore: 48000 })).toMatchObject({ daily: 2000, days: 1 });
  });

  test('overspent plan: no allowance, deficit reported, red pace', () => {
    const a = computeAllowance({ daysLeft: 5, income: 50000, spentBefore: 55000, bills: 3000, debts: 2000 });
    expect(a).toMatchObject({ daily: 0, deficit: 10000, pace: 'over', free: -10000 });
    // ровно ноль — тоже «нечего тратить», но не дефицит
    expect(computeAllowance({ daysLeft: 5, income: 10000, spentBefore: 10000 })).toMatchObject({ daily: 0, deficit: 0 });
  });

  test('daily is rounded down to whole units', () => {
    expect(computeAllowance({ daysLeft: 3, income: 1000 }).daily).toBe(333);
  });

  test('no income → total budget (savings contribution ignored), no data at all → none', () => {
    const a = computeAllowance({ daysLeft: 15, budget: 50000, spentBefore: 20000, savings: 10000 });
    expect(a).toMatchObject({ mode: 'budget', free: 30000, daily: 2000 });
    expect(computeAllowance({ daysLeft: 15, spentBefore: 100 })).toEqual({ mode: 'none' });
    // доход 0 (записан и потрачен) — всё ещё режим дохода, а не бюджета
    expect(computeAllowance({ daysLeft: 15, income: 0, budget: 50000 }).mode).toBe('income');
  });

  test('expected income: recorded + upcoming paydays or the average of past periods, whichever is larger', () => {
    expect(expectedIncome({ recorded: 60000, upcoming: 60000, average: 100000 })).toBe(120000);
    expect(expectedIncome({ recorded: 20000, upcoming: 0, average: 80000 })).toBe(80000);
    expect(expectedIncome({ recorded: 5000 })).toBe(5000);
    expect(expectedIncome({ average: 70000 })).toBe(70000);
    expect(expectedIncome({})).toBeNull();
  });
});

describe('subscription detection', () => {
  const row = (date, description, amount, extra = {}) => ({ date, description, amount, currency: 'RUB', category_id: 3, recurring_expense_id: null, ...extra });
  const keys = (subs) => subs.map(s => s.key);

  test('merchant normalization ignores case, digits, domains and payment noise words', () => {
    expect(normalizeMerchant('NETFLIX.COM 0912')).toBe('netflix');
    expect(normalizeMerchant('Оплата подписки Яндекс Плюс')).toBe('подписки яндекс плюс');
    expect(normalizeMerchant('Подписка Яндекс Плюс')).toBe('яндекс плюс');
    expect(normalizeMerchant('Ёлка')).toBe('елка');
    expect(normalizeMerchant('12345')).toBe('');
    expect(normalizeMerchant(null)).toBe('');
  });

  test('monthly series with a stable amount: next date, monthly cost, latest description', () => {
    const subs = detectSubscriptions([
      row('2026-07-15', 'NETFLIX.COM 1', 799), row('2026-08-15', 'Netflix.com', 799),
      row('2026-09-15', 'NETFLIX.COM 3', 799), row('2026-10-15', 'Netflix', 799)
    ], { today: TODAY });
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ key: 'netflix', cadence: 'monthly', amount: 799, monthlyCost: 799, count: 4, lastDate: '2026-10-15', nextDate: '2026-11-15', label: 'Netflix', categoryId: 3 });
    expect(subs[0].id).toMatch(/^[0-9a-f]{10}$/);
  });

  test('two monthly charges are enough only when the amount is identical', () => {
    expect(keys(detectSubscriptions([row('2026-09-20', 'Spotify', 169), row('2026-10-20', 'Spotify', 169)], { today: TODAY }))).toEqual(['spotify']);
    expect(detectSubscriptions([row('2026-09-05', 'Gym', 1000), row('2026-10-05', 'Gym', 1050)], { today: TODAY })).toEqual([]);
    expect(keys(detectSubscriptions([row('2026-08-05', 'Gym', 1000), row('2026-09-05', 'Gym', 1050), row('2026-10-05', 'Gym', 980)], { today: TODAY }))).toEqual(['gym']);
  });

  test('amount tolerance ±10%: small price changes pass, alternating amounts do not', () => {
    const ok = detectSubscriptions([
      row('2026-07-03', 'Интернет Дом.ру', 500), row('2026-08-03', 'Интернет Дом.ру', 520),
      row('2026-09-03', 'Интернет Дом.ру', 480), row('2026-10-03', 'Интернет Дом.ру', 510)
    ], { today: TODAY });
    expect(ok).toHaveLength(1);
    expect(ok[0]).toMatchObject({ amount: 510, cadence: 'monthly' });
    const alternating = detectSubscriptions([
      row('2026-07-03', 'Такси', 500), row('2026-08-03', 'Такси', 700),
      row('2026-09-03', 'Такси', 500), row('2026-10-03', 'Такси', 700)
    ], { today: TODAY });
    expect(alternating).toEqual([]);
  });

  test('weekly and yearly cadences; monthly cost is normalized', () => {
    const subs = detectSubscriptions([
      ...['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map(d => row(d, 'Кофейня у дома', 250)),
      row('2025-10-20', 'iCloud 2TB', 3588), row('2026-10-20', 'iCloud 2TB', 3588)
    ], { today: TODAY });
    const weekly = subs.find(s => s.cadence === 'weekly');
    const yearly = subs.find(s => s.cadence === 'yearly');
    expect(weekly).toMatchObject({ key: 'кофейня дома', nextDate: '2026-11-02' });
    expect(weekly.monthlyCost).toBeCloseTo(1083.33, 2);
    expect(yearly).toMatchObject({ key: 'icloud tb', nextDate: '2027-10-20', monthlyCost: 299 });
  });

  test('irregular purchases at the same shop, stale series and same-day duplicates are not subscriptions', () => {
    const subs = detectSubscriptions([
      // продукты: суммы похожи, интервалы 3–9 дней
      row('2026-10-01', 'Пятёрочка', 800), row('2026-10-04', 'Пятёрочка', 820), row('2026-10-11', 'Пятёрочка', 790), row('2026-10-20', 'Пятёрочка', 810),
      // прекратилась полгода назад
      row('2026-03-10', 'Old sub', 300), row('2026-04-10', 'Old sub', 300), row('2026-05-10', 'Old sub', 300),
      // будущая дата и нулевая сумма игнорируются
      row('2026-11-10', 'Future', 100), row('2026-10-10', 'Zero', 0)
    ], { today: TODAY });
    expect(subs).toEqual([]);
  });

  test('excludes auto-charged recurring rows and descriptions of configured recurring expenses', () => {
    const rows = [
      ...['2026-08-01', '2026-09-01', '2026-10-01'].map(d => row(d, 'Аренда', 30000, { recurring_expense_id: 5 })),
      ...['2026-08-10', '2026-09-10', '2026-10-10'].map(d => row(d, 'Интернет', 600)),
      ...['2026-08-12', '2026-09-12', '2026-10-12'].map(d => row(d, 'ivi', 399))
    ];
    expect(keys(detectSubscriptions(rows, { today: TODAY, excludeKeys: new Set(['интернет']) }))).toEqual(['ivi']);
  });

  test('currencies are separate series; results sorted by monthly cost', () => {
    const subs = detectSubscriptions([
      ...['2026-08-01', '2026-09-01', '2026-10-01'].map(d => row(d, 'ChatGPT', 20, { currency: 'USD' })),
      ...['2026-08-02', '2026-09-02', '2026-10-02'].map(d => row(d, 'Кинопоиск', 299))
    ], { today: TODAY });
    expect(subs.map(s => `${s.key}|${s.currency}`)).toEqual(['кинопоиск|RUB', 'chatgpt|USD']);
  });
});

describe('paydays', () => {
  const income = (date, description, amount) => ({ date, description, amount });

  test('salary and advance streams by description and day of month; one-offs ignored', () => {
    const streams = detectPaydays([
      income('2026-08-05', 'Зарплата', 60000), income('2026-09-04', 'Зарплата', 60000), income('2026-10-05', 'зарплата', 62000),
      income('2026-08-20', 'Аванс', 30000), income('2026-09-20', 'Аванс', 30000), income('2026-10-20', 'Аванс', 30000),
      income('2026-09-12', 'Подарок', 5000)
    ], { today: TODAY });
    expect(streams.map(s => [s.key, s.day, s.amount, s.lastDate])).toEqual([
      ['зарплата', 5, 60000, '2026-10-05'],
      ['аванс', 20, 30000, '2026-10-20']
    ]);
  });

  test('next payday: after the last receipt, late ones expected today, very late — next month', () => {
    const stream = { day: 5, lastDate: '2026-10-05' };
    expect(nextPayday(stream, TODAY)).toBe('2026-11-05');
    expect(nextPayday({ day: 5, lastDate: '2026-09-05' }, '2026-10-07')).toBe('2026-10-07');
    expect(nextPayday({ day: 5, lastDate: '2026-09-05' }, '2026-10-20')).toBe('2026-11-05');
    expect(nextPayday({ day: 31, lastDate: '2026-10-31' }, '2026-11-02')).toBe('2026-11-30');
  });
});

describe('payments calendar', () => {
  const nextChargeDate = RecurringExpenseService.nextChargeDate;
  const recurring = (id, description, amount, day, lastChargedMonth) => ({
    id, description, amount: String(amount), currency: 'RUB', day_of_month: day,
    last_charged_month: lastChargedMonth, nextChargeDate: nextChargeDate(day, lastChargedMonth, TODAY)
  });

  test('assembles recurring, debts, subscriptions and expected income for 30 days', () => {
    const cal = buildCalendar({
      today: TODAY,
      recurring: [recurring(1, 'Аренда', 30000, 31, '2026-09-01'), recurring(2, 'Netflix', 799, 28, '2026-10-01')],
      debts: [
        { id: 7, name: 'Ипотека', monthly_payment: 35000, balance: 2000000, currency: 'RUB', due_day: 5 },
        { id: 8, name: 'Кредитка', monthly_payment: 5000, balance: 20000, currency: 'RUB', due_day: null },
        { id: 9, name: 'аренда', monthly_payment: 30000, balance: 1, currency: 'RUB', due_day: 10 },
        { id: 10, name: 'Долг другу', monthly_payment: null, balance: 1000, currency: 'RUB', due_day: 3 },
        { id: 11, name: 'Погашен', monthly_payment: 1000, balance: 0, currency: 'RUB', due_day: 3 }
      ],
      subscriptions: [{ id: 'abc', label: 'Кофе', amount: 250, currency: 'RUB', cadence: 'weekly', nextDate: '2026-10-26' }],
      paydays: [{ key: 'зарплата', label: 'Зарплата', day: 5, amount: 60000, lastDate: '2026-10-05', currency: 'RUB' }]
    });
    expect(cal.until).toBe('2026-11-27');
    expect(cal.items.map(i => `${i.date} ${i.kind} ${i.label}${i.paid ? ' paid' : ''}`)).toEqual([
      '2026-10-28 recurring Netflix paid',
      '2026-10-28 subscription Кофе',
      '2026-10-31 recurring Аренда',
      '2026-11-02 subscription Кофе',
      '2026-11-05 income Зарплата',
      '2026-11-05 debt Ипотека',
      '2026-11-09 subscription Кофе',
      '2026-11-16 subscription Кофе',
      '2026-11-23 subscription Кофе'
    ]);
    expect(cal.undated).toEqual([{ kind: 'debt', label: 'Кредитка', amount: 5000, currency: 'RUB', ref: 8 }]);
  });

  test('month-end days clamp in short months and repeat within the window', () => {
    expect(monthlyDates('2027-01-31', 31, '2027-04-01')).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
    const cal = buildCalendar({ today: '2027-01-30', days: 45, debts: [{ id: 1, name: 'Кредит', monthly_payment: 100, balance: 1000, currency: 'RUB', due_day: 31 }] });
    expect(cal.items.map(i => i.date)).toEqual(['2027-01-31', '2027-02-28']);
  });

  test('overdue subscription is expected today, then by cadence', () => {
    expect(subscriptionDates({ cadence: 'monthly', nextDate: '2026-10-20' }, TODAY, '2026-12-01')).toEqual(['2026-10-28', '2026-11-20']);
    expect(subscriptionDates({ cadence: 'yearly', nextDate: '2027-03-01' }, TODAY, '2026-11-27')).toEqual([]);
  });
});

describe('personal inflation from receipt items', () => {
  test('item names lose sizes, fat percentages, digits and packaging words', () => {
    expect(normalizeItemName('МОЛОКО ПРОСТОКВАШИНО 3,2% 930МЛ')).toBe('молоко простоквашино');
    expect(normalizeItemName('Молоко Простоквашино 3.2% 930 мл')).toBe('молоко простоквашино');
    expect(normalizeItemName('Бананы вес 1кг')).toBe('бананы');
    expect(normalizeItemName('Хлеб Бородинский 400г нарезка в/у')).toBe('хлеб бородинский нарезка');
    expect(normalizeItemName('Гречка ядрица 900 г')).toBe('гречка ядрица');
    expect(normalizeItemName('Coca-Cola 0.5l PET')).toBe('coca cola pet');
    expect(normalizeItemName('12345')).toBe('');
  });

  test('unit price per kg/pcs, risers and fallers, Laspeyres basket over items bought on 2+ days', () => {
    const result = computeInflation([
      { date: '2026-07-01', name: 'Молоко Простоквашино 930мл', amount: 50, quantity: 1 }, // старше окна (92 дня)
      { date: '2026-08-01', name: 'МОЛОКО ПРОСТОКВАШИНО 3,2% 930МЛ', amount: 179.8, quantity: 2 },
      { date: '2026-10-20', name: 'Молоко Простоквашино 3.2% 930 мл', amount: 99.9, quantity: 1 },
      { date: '2026-08-10', name: 'Бананы', amount: 64.5, quantity: 0.5 },
      { date: '2026-10-01', name: 'Бананы вес', amount: 119.4, quantity: 1.2 },
      { date: '2026-09-01', name: 'Хлеб Бородинский 400г', amount: 60, quantity: 1 }, // одна покупка
      { date: '2026-10-20', name: 'Сыр', amount: 300, quantity: null }, // две покупки за неделю — мало
      { date: '2026-10-25', name: 'Сыр', amount: 350, quantity: null }
    ], { today: TODAY });
    expect(result.purchases).toBe(7);
    expect(result.items).toHaveLength(2);
    const milk = result.items.find(i => i.key === 'молоко простоквашино');
    expect(milk).toMatchObject({ oldPrice: 89.9, newPrice: 99.9, firstDate: '2026-08-01', purchases: 2, name: 'Молоко Простоквашино 3.2% 930 мл' });
    expect(milk.change).toBeCloseTo(0.1112, 4);
    expect(result.risers.map(i => i.key)).toEqual(['молоко простоквашино']);
    expect(result.fallers.map(i => i.key)).toEqual(['бананы']);
    expect(result.fallers[0]).toMatchObject({ oldPrice: 129, newPrice: 99.5 });
    // Σ new·w / Σ old·w − 1: w = обычное количество (молоко 1.5, бананы 0.85)
    expect(result.basket.change).toBeCloseTo((99.9 * 1.5 + 99.5 * 0.85) / (89.9 * 1.5 + 129 * 0.85) - 1, 6);
    expect(result.basket).toMatchObject({ count: 2, since: '2026-08-01' });
  });

  test('same-day lines are merged; unchanged prices are neither risers nor fallers; empty input', () => {
    const result = computeInflation([
      { date: '2026-09-01', name: 'Кефир', amount: 80, quantity: 1 },
      { date: '2026-09-01', name: 'Кефир', amount: 80, quantity: 1 },
      { date: '2026-10-01', name: 'Кефир 1%', amount: 80.2, quantity: 1 }
    ], { today: TODAY });
    expect(result.items[0]).toMatchObject({ oldPrice: 80, newPrice: 80.2, weight: 1.5 });
    expect(result.risers).toEqual([]);
    expect(result.fallers).toEqual([]);
    expect(computeInflation([], { today: TODAY })).toMatchObject({ purchases: 0, items: [], basket: null });
  });
});

describe('PlanningService', () => {
  const localization = new LocalizationService();
  const formatter = new Formatter({ convert: async (amount) => amount });

  function createService(overrides = {}) {
    const deps = {
      planningRepository: {
        getSpendSplit: jest.fn().mockResolvedValue([{ currency: 'RUB', before: 20000, bills_today: 1000, today: 500 }]),
        getDebts: jest.fn().mockResolvedValue([
          { id: 1, name: 'Кредит', balance: 100000, currency: 'RUB', monthly_payment: 3100, due_day: null },
          { id: 2, name: 'Ипотека', balance: 1000000, currency: 'RUB', monthly_payment: 20000, due_day: 25 },
          { id: 3, name: 'Интернет', balance: 5000, currency: 'RUB', monthly_payment: 1000, due_day: 25 } // = регулярная
        ]),
        getMonthlyContribution: jest.fn().mockResolvedValue(5000),
        getIncomeRowsSince: jest.fn().mockResolvedValue([
          { date: '2026-08-05', description: 'Зарплата', amount: 60000, currency: 'RUB' },
          { date: '2026-09-05', description: 'Зарплата', amount: 60000, currency: 'RUB' },
          { date: '2026-10-05', description: 'Зарплата', amount: 600, currency: 'USD' }
        ]),
        getBillReminderCandidates: jest.fn().mockResolvedValue([{ id: 1, language: 'ru', timezone: 'UTC' }]),
        setMark: jest.fn()
      },
      expenseService: {
        getPeriodContext: jest.fn().mockResolvedValue({ timezone: 'UTC', currency: 'RUB', startDay: 1, today: '2026-10-21', period: customPeriod('2026-10-21', 1, 0) }),
        getCategories: jest.fn().mockResolvedValue([{ id: 3, name: 'Подписки' }]),
        getDefaultCategory: jest.fn().mockResolvedValue({ id: 99 })
      },
      recurringExpenseService: {
        list: jest.fn().mockResolvedValue([{ description: 'Интернет', amount: '1000.00', currency: 'RUB', day_of_month: 25, nextChargeDate: '2026-10-25' }]),
        create: jest.fn().mockResolvedValue({ id: 50 })
      },
      budgetService: { getStatus: jest.fn().mockResolvedValue([]) },
      premiumService: { isPremiumUser: jest.fn().mockResolvedValue(false) },
      userService: { getUserById: jest.fn().mockResolvedValue({ created_at: new Date() }) },
      userNotificationRepository: { markSent: jest.fn().mockResolvedValue(true) },
      notificationService: { sendMessage: jest.fn().mockResolvedValue({}) },
      localizationService: localization,
      formatter,
      currencyUtils: { convert: jest.fn(async (amount, from) => (from === 'USD' ? amount * 100 : amount)) }
    };
    Object.assign(deps, overrides);
    return { service: new PlanningService(deps), deps };
  }

  test('getAllowance: recurring charged today counts as already spent, debts by date or prorated, savings and converted income', async () => {
    const { service, deps } = createService();
    const a = await service.getAllowance(777);
    // доход: 600 USD × 100 = 60 000 за период, среднее прошлых периодов тоже 60 000
    expect(a.outlook).toMatchObject({ recorded: 60000, average: 60000, upcoming: 0, income: 60000 });
    expect(a).toMatchObject({ mode: 'income', daysLeft: 11, spentBefore: 21000, spentToday: 500, bills: 1000, savings: 5000 });
    // Кредит без даты: 3100 × 11 / 31 = 1100; Ипотека 25-го — в периоде; «Интернет» — уже регулярная
    expect(a.debtsTotal).toBe(21100);
    expect(a.debtsProrated).toBe(true);
    expect(a.free).toBe(60000 - 5000 - 21000 - 1000 - 21100);
    expect(a.daily).toBe(Math.floor(11900 / 11));
    expect(a.pace).toBe('good');
    expect(deps.currencyUtils.convert).toHaveBeenCalledTimes(1); // один курс на валюту
    expect(deps.budgetService.getStatus).not.toHaveBeenCalled();
    const line = service.formatLine('ru', a);
    expect(line).toContain('*1');
    expect(line).toContain('🟢');
    expect(line).not.toMatch(/\{\w+\}/);
  });

  test('getAllowance without income falls back to the total budget, without both — none and a hint for new users only', async () => {
    const noIncome = { getIncomeRowsSince: jest.fn().mockResolvedValue([]) };
    const { service, deps } = createService();
    Object.assign(deps.planningRepository, noIncome);
    deps.budgetService.getStatus.mockResolvedValue([{ category_name: null, limit: 40000 }]);
    const a = await service.getAllowance(777);
    expect(a).toMatchObject({ mode: 'budget', budget: 40000, savings: 0 });
    expect(a.free).toBe(40000 - 21000 - 1000 - 21100);
    expect(a.deficit).toBe(3100);
    expect(service.formatLine('ru', a)).toContain('🔴');

    deps.budgetService.getStatus.mockResolvedValue([]);
    expect((await service.getAllowance(777)).mode).toBe('none');
    expect(await service.allowanceLine(777, 'ru')).toBe(localization.getText('ru', 'pl_line_none'));
    deps.userService.getUserById.mockResolvedValue({ created_at: new Date(Date.now() - 30 * 86400000) });
    expect(await service.allowanceLine(777, 'ru')).toBeNull();
  });

  test('allowanceLine never breaks the screen', async () => {
    const { service, deps } = createService();
    deps.planningRepository.getSpendSplit.mockRejectedValue(new Error('db down'));
    expect(await service.allowanceLine(777, 'ru')).toBeNull();
  });

  test('confirmSubscription: monthly → recurring expense on the same day, skipping this month if already paid', async () => {
    const { service, deps } = createService();
    const sub = (id, lastDate, cadence = 'monthly') => ({ id, key: `k${id}`, label: `Sub ${id}`, amount: 299, currency: 'RUB', cadence, lastDate, categoryId: 3 });
    service.getSubscriptions = jest.fn().mockResolvedValue({ today: '2026-10-21', visible: [sub('a', '2026-10-15'), sub('b', '2026-09-30'), sub('c', '2026-10-01', 'weekly')] });

    expect(await service.confirmSubscription(777, 'a')).toMatchObject({ converted: true, day: 15 });
    expect(deps.recurringExpenseService.create).toHaveBeenLastCalledWith(777, expect.objectContaining({ dayOfMonth: 15, paidThisMonth: true, categoryId: 3, amount: 299, description: 'Sub a' }));
    await service.confirmSubscription(777, 'b');
    expect(deps.recurringExpenseService.create).toHaveBeenLastCalledWith(777, expect.objectContaining({ dayOfMonth: 30, paidThisMonth: false }));
    expect(await service.confirmSubscription(777, 'c')).toMatchObject({ converted: false });
    expect(deps.recurringExpenseService.create).toHaveBeenCalledTimes(2);
    expect(deps.planningRepository.setMark).toHaveBeenLastCalledWith(777, 'kc', 'confirmed');
    expect(await service.confirmSubscription(777, 'zzz')).toEqual({ error: 'outdated' });

    const limit = new Error('recurring_limit');
    limit.code = 'recurring_limit';
    deps.recurringExpenseService.create.mockRejectedValueOnce(limit);
    expect(await service.confirmSubscription(777, 'a')).toEqual({ error: 'recurring_limit' });
  });

  test('bill reminders: only at 9:00 local time and once per day', async () => {
    const { service, deps } = createService();
    service.buildBillReminder = jest.fn().mockResolvedValue({ text: 'x', today: '2026-10-28' });
    deps.userNotificationRepository.markSent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await service.processBillReminders(new Date('2026-10-28T08:00:00Z'))).toBe(0);
    expect(await service.processBillReminders(new Date('2026-10-28T09:00:00Z'))).toBe(1);
    expect(await service.processBillReminders(new Date('2026-10-28T09:30:00Z'))).toBe(0);
    expect(deps.userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'bill_reminder', '2026-10-28');
    expect(deps.notificationService.sendMessage).toHaveBeenCalledTimes(1);
    expect(deps.notificationService.sendMessage.mock.calls[0][2].reply_markup.inline_keyboard[0][0].callback_data).toBe('plc');
  });

  test('subscription nudge lists only newly found, unconfirmed subscriptions, once', async () => {
    const { service, deps } = createService();
    service.getSubscriptions = jest.fn().mockResolvedValue({ visible: [
      { key: 'netflix', label: 'Netflix_HD', confirmed: false }, { key: 'ivi', label: 'ivi', confirmed: true }
    ] });
    const text = await service.subscriptionNudge(777, 'ru');
    expect(text).toContain('Netflix\\_HD');
    expect(text).not.toContain('ivi');
    expect(deps.userNotificationRepository.markSent).toHaveBeenCalledWith(777, 'subscription_found', 'netflix');
    deps.userNotificationRepository.markSent.mockResolvedValue(false);
    expect(await service.subscriptionNudge(777, 'ru')).toBe('');
  });

  test('percent formatting follows the language decimal separator', () => {
    const { service } = createService();
    expect(service.formatPercent('ru', 0.0412)).toBe('+4,1%');
    expect(service.formatPercent('en', -0.2287)).toBe('−22.9%');
    expect(service.formatPercent('en', 0)).toBe('0.0%');
  });
});

describe('integration points', () => {
  test('recurring expense created from a paid subscription starts next month', async () => {
    const repo = {
      countByUser: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 1 }),
      getDueForUser: jest.fn().mockResolvedValue([])
    };
    const userRepository = { getUserTimezone: jest.fn().mockResolvedValue('UTC'), getUserCurrency: jest.fn().mockResolvedValue('RUB') };
    const service = new RecurringExpenseService(repo, userRepository, {}, {}, { formatAmount: String, escapeMarkdown: String }, {});
    const t = parseYmd(localToday('UTC'));
    const thisMonth = ymd(t.y, t.m, 1);
    await service.create(1, { amount: 299, currency: 'RUB', description: 'Netflix', dayOfMonth: 31, categoryId: 3, paidThisMonth: true });
    expect(repo.create).toHaveBeenLastCalledWith(1, expect.objectContaining({ lastChargedMonth: thisMonth }));
    await service.create(1, { amount: 299, currency: 'RUB', description: 'Netflix', dayOfMonth: 31, categoryId: 3 });
    // без paidThisMonth: число 31 ещё не прошло (в коротком месяце — последний день) — первое списание в этом месяце
    expect(repo.create.mock.calls[1][1].lastChargedMonth).toBeNull();
  });

  test('weekly insight keyboard gets a subscriptions button only with a nudge', () => {
    const service = new WeeklyInsightService({ localizationService: new LocalizationService() });
    expect(service.keyboard('ru').inline_keyboard.map(r => r[0].callback_data)).toEqual(['ov|0', 'weekly_insight_off']);
    expect(service.keyboard('ru', { subscriptions: true }).inline_keyboard.map(r => r[0].callback_data)).toEqual(['ov|0', 'pls', 'weekly_insight_off']);
  });
});
