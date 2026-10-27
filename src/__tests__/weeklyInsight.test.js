const WeeklyInsightService = require('../services/WeeklyInsightService');
const ReportService = require('../services/ReportService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

const { localMoment, weekStart, insightWeeks, historyWeekCount, summarizeWeeks, projectPace, percentChange } = WeeklyInsightService;

describe('weekly insight: local time and week boundaries', () => {
  test('Monday 10:00 local in zones without DST', () => {
    expect(localMoment(new Date('2026-10-26T07:00:00Z'), 'Europe/Moscow')).toEqual({ date: '2026-10-26', hour: 10, weekday: 1 });
    expect(localMoment(new Date('2026-10-26T05:00:00Z'), 'Etc/GMT-5')).toEqual({ date: '2026-10-26', hour: 10, weekday: 1 });
    // UTC+9: воскресенье 23:30 UTC — уже понедельник по местному времени
    expect(localMoment(new Date('2026-10-25T23:30:00Z'), 'Asia/Tokyo')).toEqual({ date: '2026-10-26', hour: 8, weekday: 1 });
    // UTC+5:30 — час считается по местному времени
    expect(localMoment(new Date('2026-10-26T05:00:00Z'), 'Asia/Kolkata')).toEqual({ date: '2026-10-26', hour: 10, weekday: 1 });
  });

  test('Monday 10:00 local in DST zones on both sides of the switch', () => {
    // Берлин: летнее время (UTC+2) в марте после перехода, зимнее (UTC+1) после 25.10.2026
    expect(localMoment(new Date('2026-03-30T08:00:00Z'), 'Europe/Berlin')).toEqual({ date: '2026-03-30', hour: 10, weekday: 1 });
    expect(localMoment(new Date('2026-10-26T09:00:00Z'), 'Europe/Berlin')).toEqual({ date: '2026-10-26', hour: 10, weekday: 1 });
    expect(localMoment(new Date('2026-10-26T08:00:00Z'), 'Europe/Berlin').hour).toBe(9);
    // Нью-Йорк: летнее время до 01.11.2026, 02.11 — уже зимнее (UTC−5)
    expect(localMoment(new Date('2026-10-26T14:00:00Z'), 'America/New_York')).toEqual({ date: '2026-10-26', hour: 10, weekday: 1 });
    expect(localMoment(new Date('2026-11-02T15:00:00Z'), 'America/New_York')).toEqual({ date: '2026-11-02', hour: 10, weekday: 1 });
    // Воскресенье вечером по местному времени, хотя в UTC уже понедельник
    expect(localMoment(new Date('2026-11-02T03:00:00Z'), 'America/New_York')).toEqual({ date: '2026-11-01', hour: 22, weekday: 7 });
  });

  test('weekStart is the Monday of the local date, across months and years', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-10-01')).toBe('2026-09-28');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });

  test('insightWeeks: last full Mon–Sun week and 4 weeks before it', () => {
    for (const today of ['2026-10-26', '2026-10-28', '2026-11-01']) {
      const { week, previous, thisMonday } = insightWeeks(today);
      expect(thisMonday).toBe('2026-10-26');
      expect(week).toEqual({ start: '2026-10-19', end: '2026-10-26', last: '2026-10-25' });
      expect(previous.map(p => p.start)).toEqual(['2026-10-12', '2026-10-05', '2026-09-28', '2026-09-21']);
      expect(previous[3]).toEqual({ start: '2026-09-21', end: '2026-09-28', last: '2026-09-27' });
    }
  });
});

describe('weekly insight: averages and categories', () => {
  const week = (total, categories = {}) => ({
    total,
    categories: Object.entries(categories).map(([name, value], index) => ({ id: index + 1, name, icon: '•', total: value }))
  });

  test('history starts at the oldest week with expenses; empty weeks in between count', () => {
    expect(historyWeekCount([0, 0, 0, 0])).toBe(0);
    expect(historyWeekCount([100, 0, 0, 0])).toBe(1);
    expect(historyWeekCount([0, 100, 0, 0])).toBe(2);
    expect(historyWeekCount([100, 0, 0, 50])).toBe(4);
  });

  test('full history: average of 4 weeks, overspend and improvement by absolute change', () => {
    const history = week(7500, { Food: 4000, Taxi: 2000, Cafe: 1500 });
    const summary = summarizeWeeks(week(8500, { Food: 6000, Taxi: 2000, Cafe: 500 }), [history, history, history, history]);
    expect(summary).toMatchObject({ weeks: 4, enoughHistory: true, average: 7500, diff: 1000, percent: 13 });
    expect(summary.top.map(c => [c.name, c.percent])).toEqual([['Food', 50], ['Taxi', 0], ['Cafe', -67]]);
    expect(summary.overspend).toMatchObject({ name: 'Food', diff: 2000 });
    expect(summary.improvement).toMatchObject({ name: 'Cafe', diff: -1000 });
  });

  test('partial history: averages only over weeks since the first expense', () => {
    const summary = summarizeWeeks(week(300, { Food: 200, Taxi: 50 }), [
      week(200, { Food: 100, Cafe: 100 }),
      week(100, { Food: 100 }),
      week(0),
      week(0)
    ]);
    expect(summary).toMatchObject({ weeks: 2, enoughHistory: true, average: 150, diff: 150, percent: 100 });
    expect(summary.overspend).toMatchObject({ name: 'Food', average: 100, diff: 100 });
    // Категория, на которую на этой неделе ничего не потрачено, — тоже улучшение
    expect(summary.improvement).toMatchObject({ name: 'Cafe', total: 0, average: 50, diff: -50 });
    expect(summary.top.map(c => c.name)).toEqual(['Food', 'Taxi']);
  });

  test('less than 2 weeks of history: no comparison, no call-outs', () => {
    const summary = summarizeWeeks(week(500, { Food: 500 }), [week(100, { Food: 100 }), week(0), week(0), week(0)]);
    expect(summary).toMatchObject({ weeks: 1, enoughHistory: false, percent: null, overspend: null, improvement: null });
    expect(summary.top).toHaveLength(1);
  });

  test('small changes are not called out; a new category is', () => {
    const history = week(1000, { Food: 1000 });
    const summary = summarizeWeeks(week(1100, { Food: 1050, Gifts: 50 }), [history, history]);
    expect(summary.overspend).toMatchObject({ name: 'Gifts', diff: 50, percent: null });
    expect(summary.improvement).toBeNull();
  });

  test('empty data', () => {
    const summary = summarizeWeeks(week(0), [week(0), week(0), week(0), week(0)]);
    expect(summary).toMatchObject({ total: 0, weeks: 0, enoughHistory: false, average: 0, percent: null, top: [], overspend: null, improvement: null });
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe('weekly insight: period pace', () => {
  const period = { start: '2026-10-05', end: '2026-11-05', last: '2026-11-04' };

  test('projects the period total at the current daily pace', () => {
    expect(projectPace({ spent: 1000, period, today: '2026-10-14' })).toEqual({ elapsedDays: 10, totalDays: 31, projected: 3100 });
    expect(projectPace({ spent: 3100, period, today: '2026-11-04' })).toEqual({ elapsedDays: 31, totalDays: 31, projected: 3100 });
    const february = { start: '2027-02-01', end: '2027-03-01', last: '2027-02-28' };
    expect(projectPace({ spent: 700, period: february, today: '2027-02-07' })).toEqual({ elapsedDays: 7, totalDays: 28, projected: 2800 });
  });

  test('no projection in the first two days of the period; zero spending projects zero', () => {
    expect(projectPace({ spent: 5000, period, today: '2026-10-05' })).toEqual({ elapsedDays: 1, totalDays: 31, projected: null });
    expect(projectPace({ spent: 5000, period, today: '2026-10-06' }).projected).toBeNull();
    expect(projectPace({ spent: 0, period, today: '2026-10-20' }).projected).toBe(0);
  });
});

describe('WeeklyInsightService.buildInsight / processDue', () => {
  // Понедельник 26.10.2026, 10:00 в Москве
  const mondayTen = new Date('2026-10-26T07:00:00Z');

  function build({ candidates = [], data = {}, budgets = [], income = 0, timezoneOf = () => 'Europe/Moscow' } = {}) {
    const sentKeys = new Set();
    const userNotificationRepository = {
      getWeeklyInsightCandidates: jest.fn(async () => candidates),
      markSent: jest.fn(async (userId, kind, refKey) => {
        const key = `${userId}|${kind}|${refKey}`;
        if (sentKeys.has(key)) return false;
        sentKeys.add(key);
        return true;
      })
    };
    const rowsFor = (userId, period) => (data[userId] || {})[`${period.start}|${period.end}`] || [];
    const expenseService = {
      getPeriodContext: jest.fn(async (userId) => {
        if (userId === 666) throw new Error('boom');
        return { timezone: timezoneOf(userId), currency: 'RUB', startDay: 5 };
      }),
      getTotals: jest.fn(async (userId, timezone, period) => {
        const rows = rowsFor(userId, period);
        return { count: rows.length, byCurrency: rows.map(r => ({ currency: r.currency || 'RUB', total: r.total })) };
      }),
      getCategoryTotals: jest.fn(async (userId, timezone, period) => rowsFor(userId, period)
        .map((r, index) => ({ category_id: index + 1, name: r.name, icon: r.icon || '🍔', currency: r.currency || 'RUB', total: r.total })))
    };
    const incomeService = {
      getTotals: jest.fn(async () => ({ count: income ? 1 : 0, byCurrency: income ? [{ currency: 'RUB', total: income }] : [] }))
    };
    // 1 USD = 100 RUB
    const currencyUtils = { convert: async (amount, from, to) => (from === to ? amount : from === 'USD' ? amount * 100 : amount / 100) };
    const formatter = new Formatter(currencyUtils);
    const localizationService = new LocalizationService();
    const reportService = new ReportService({ expenseService, localizationService, formatter, currencyUtils });
    const budgetService = { getStatus: jest.fn(async () => budgets) };
    const notificationService = { sendMessage: jest.fn(async () => ({})) };
    const service = new WeeklyInsightService({
      expenseService, incomeService, reportService, budgetService, userNotificationRepository, notificationService, localizationService, formatter
    });
    return { service, notificationService, userNotificationRepository };
  }

  const usual = [{ name: 'Еда', total: 4000 }, { name: 'Транспорт', total: 2000 }, { name: 'Кафе', total: 1500 }];
  const fiveWeeks = {
    '2026-10-19|2026-10-26': [{ name: 'Еда', total: 5000 }, { name: 'Еда', total: 10, currency: 'USD' }, { name: 'Транспорт', total: 2000 }, { name: 'Кафе_*бар', total: 500 }],
    '2026-10-12|2026-10-19': usual,
    '2026-10-05|2026-10-12': usual,
    '2026-09-28|2026-10-05': usual,
    '2026-09-21|2026-09-28': usual,
    // текущий период 05.10–04.11 и прошлый 05.09–04.10
    '2026-10-05|2026-11-05': [{ name: 'Еда', total: 22000 }],
    '2026-09-05|2026-10-05': [{ name: 'Еда', total: 30000 }]
  };

  const balanced = (text) => {
    const unescaped = text.replace(/\\[_*`[]/g, '');
    expect((unescaped.match(/\*/g) || []).length % 2).toBe(0);
    expect((unescaped.match(/_/g) || []).length % 2).toBe(0);
  };

  test('renders all sections in the user language with converted amounts', async () => {
    const { service } = build({ data: { 1: fiveWeeks }, budgets: [{ category_name: null, limit: 30000 }], income: 50000 });
    const { text, weekKey } = await service.buildInsight(1, 'ru', mondayTen);
    expect(weekKey).toBe('2026-10-26');
    balanced(text);
    expect(text).toContain('Неделя 19.10 – 25.10.2026');
    expect(text).toContain('8\u00a0500');                 // 5000 + 10 USD + 2000 + 500
    expect(text).toContain('На 13% больше обычного');
    expect(text).toContain('Еда — 6\u00a0000');
    expect(text).toContain('Кафе\\_\\*бар');               // имя категории экранировано
    expect(text).toContain('Выросло сильнее всего: 🍔 Еда (+2\u00a0000');
    expect(text).toContain('Меньше обычного: 🍔 Кафе (−1\u00a0500');
    expect(text).toContain('за 22 из 31 дн.');
    expect(text).toContain('≈31\u00a0000');                // 22000 / 22 * 31
    expect(text).toContain('↑ +3%');                       // к 30000 прошлого периода
    expect(text).toContain('превысишь на ≈1\u00a0000');
    expect(text).toContain('28\u00a0000');                 // доход − расходы
    expect(text.split('\n').filter(Boolean).length).toBeLessThanOrEqual(16);
  });

  test('short history and no data', async () => {
    const { service } = build({
      data: {
        1: { '2026-10-19|2026-10-26': [{ name: 'Еда', total: 700 }] },
        2: {}
      }
    });
    const { text } = await service.buildInsight(1, 'en', mondayTen);
    balanced(text);
    expect(text).toContain('Not enough history yet');
    expect(text).not.toContain('Grew the most');
    expect(await service.buildInsight(2, 'en', mondayTen)).toBeNull();
  });

  test('cron sends once per local week at Monday 10:00 and isolates errors', async () => {
    const { service, notificationService, userNotificationRepository } = build({
      candidates: [
        { id: 666, language: 'ru', timezone: 'Europe/Moscow' },   // ошибка не мешает остальным
        { id: 1, language: 'ru', timezone: 'Europe/Moscow' },
        { id: 2, language: 'en', timezone: 'Europe/Moscow' },     // нет трат за 5 недель
        { id: 3, language: 'en', timezone: 'America/New_York' }  // у него ещё 03:00
      ],
      data: { 1: fiveWeeks, 3: fiveWeeks },
      timezoneOf: (id) => (id === 3 ? 'America/New_York' : 'Europe/Moscow')
    });
    expect(await service.processDue(mondayTen)).toBe(1);
    expect(await service.processDue(mondayTen)).toBe(0);
    expect(await service.processDue(new Date('2026-10-26T08:00:00Z'))).toBe(0); // 11:00 в Москве
    expect(await service.processDue(new Date('2026-10-27T07:00:00Z'))).toBe(0); // вторник
    expect(notificationService.sendMessage).toHaveBeenCalledTimes(1);
    expect(userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'weekly_insight', '2026-10-26');
    expect(userNotificationRepository.markSent).not.toHaveBeenCalledWith(2, expect.anything(), expect.anything());

    const [userId, text, extra] = notificationService.sendMessage.mock.calls[0];
    expect(userId).toBe(1);
    balanced(text);
    expect(extra.parse_mode).toBe('Markdown');
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual(['ov|0', 'weekly_insight_off']);

    // Нью-Йорк: 10:00 по местному — 14:00 UTC
    expect(await service.processDue(new Date('2026-10-26T14:00:00Z'))).toBe(1);
    expect(userNotificationRepository.markSent).toHaveBeenCalledWith(3, 'weekly_insight', '2026-10-26');
    // Следующий понедельник — новая неделя
    expect(await service.processDue(new Date('2026-11-02T07:00:00Z'))).toBe(1);
  });
});
