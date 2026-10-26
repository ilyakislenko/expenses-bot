const DailySummaryService = require('../services/DailySummaryService');
const Formatter = require('../utils/formatter');

describe('DailySummaryService.processDue', () => {
  // 18:45 UTC = 21:45 в Москве, 18:45 в UTC
  const now = new Date('2026-10-26T18:45:00Z');

  function build({ candidates, count = 2, income = 0 }) {
    const sentKeys = new Set();
    const userNotificationRepository = {
      getDailySummaryCandidates: jest.fn(async () => candidates),
      markSent: jest.fn(async (userId, kind, refKey) => {
        const key = `${userId}|${kind}|${refKey}`;
        if (sentKeys.has(key)) return false;
        sentKeys.add(key);
        return true;
      })
    };
    const expenseService = {
      getPeriodContext: jest.fn(async () => ({
        timezone: 'Europe/Moscow', currency: 'RUB', today: '2026-10-26',
        period: { start: '2026-10-26', end: '2026-10-27', last: '2026-10-26' }
      })),
      getTotals: jest.fn(async () => ({ count, byCurrency: count ? [{ currency: 'RUB', total: 1500 }] : [] }))
    };
    const incomeService = {
      getTotals: jest.fn(async () => ({ count: income ? 1 : 0, byCurrency: income ? [{ currency: 'RUB', total: income }] : [] }))
    };
    const formatter = new Formatter({ convert: async (amount) => amount });
    const reportService = {
      categoryBreakdown: jest.fn(async () => [
        { name: 'Еда', icon: '🍔', total: 900 },
        { name: 'Транспорт', icon: '🚕', total: 300 },
        { name: 'Кафе', icon: '☕', total: 200 },
        { name: 'Другое', icon: '📦', total: 100 }
      ]),
      categoryLabel: (category) => `${category.icon} ${category.name}`
    };
    const notificationService = { sendMessage: jest.fn(async () => ({})) };
    const localizationService = { getText: (lang, key, params) => (params ? `${key}:${JSON.stringify(params)}` : key) };
    const service = new DailySummaryService({
      expenseService, incomeService, reportService, userNotificationRepository, notificationService, localizationService, formatter
    });
    return { service, notificationService, userNotificationRepository };
  }

  test('sends at the chosen local hour once per local day', async () => {
    const { service, notificationService, userNotificationRepository } = build({
      candidates: [{ id: 1, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: 21 }]
    });
    expect(await service.processDue(now)).toBe(1);
    expect(await service.processDue(now)).toBe(0);
    expect(notificationService.sendMessage).toHaveBeenCalledTimes(1);
    expect(userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'daily_summary', '2026-10-26');

    const [userId, text, extra] = notificationService.sendMessage.mock.calls[0];
    expect(userId).toBe(1);
    expect(text).toContain('Транспорт');
    expect(text).toContain('Кафе');
    expect(text).not.toContain('Другое'); // только топ-3
    expect(text).not.toContain('income_total');
    expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe('dy|0|0');
  });

  test('skips other local hours; NULL hour means 21:00', async () => {
    const { service, notificationService } = build({
      candidates: [
        { id: 1, language: 'en', timezone: 'UTC', daily_summary_hour: 21 },          // 18:45 локально
        { id: 2, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: 20 }, // 21:45, но выбран 20
        { id: 3, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: null } // 21:45 = по умолчанию
      ]
    });
    expect(await service.processDue(now)).toBe(1);
    expect(notificationService.sendMessage.mock.calls[0][0]).toBe(3);
  });

  test('no expenses today — nothing is sent and the day is not marked', async () => {
    const { service, notificationService, userNotificationRepository } = build({
      candidates: [{ id: 1, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: 21 }],
      count: 0
    });
    expect(await service.processDue(now)).toBe(0);
    expect(notificationService.sendMessage).not.toHaveBeenCalled();
    expect(userNotificationRepository.markSent).not.toHaveBeenCalled();
  });

  test('includes today income and keeps going after a failed user', async () => {
    const { service, notificationService } = build({
      candidates: [
        { id: 1, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: 21 },
        { id: 2, language: 'en', timezone: 'Europe/Moscow', daily_summary_hour: 21 }
      ],
      income: 5000
    });
    notificationService.sendMessage.mockRejectedValueOnce(new Error('blocked'));
    expect(await service.processDue(now)).toBe(1);
    expect(notificationService.sendMessage.mock.calls[1][1]).toContain('income_total');
  });
});
