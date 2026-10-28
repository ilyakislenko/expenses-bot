const SecurityMiddleware = require('../middleware/securityMiddleware');
const RateLimiter = require('../utils/rateLimiter');
const EnhancedValidator = require('../utils/enhancedValidator');
const LocalizationService = require('../services/LocalizationService');
const PremiumLifecycleService = require('../services/PremiumLifecycleService');
const createErrorHandler = require('../middleware/errorHandler');
const { sendReminders, localDateHour } = require('../botCron');

const fakeLocalization = { getText: (lang, key) => `${lang}:${key}` };

describe('SecurityMiddleware: payment updates and Telegram profiles', () => {
  const userId = 7771100001;
  let rateLimiter;
  let middleware;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    const userService = { getUserLanguage: jest.fn().mockResolvedValue('ru') };
    middleware = new SecurityMiddleware(rateLimiter, new EnhancedValidator(), fakeLocalization, userService).middleware();
  });

  // Ровно столько запросов, сколько разрешено: первый отказ (с сообщением о лимите) остаётся проверке
  const exhaust = (type) => {
    for (let i = 0; i < rateLimiter.limits[type].requests; i++) rateLimiter.checkLimit(userId, type);
  };
  const from = { id: userId, first_name: 'Маша <3', last_name: '>_<', username: 'abcd' };
  const messageCtx = (message) => ({ updateType: 'message', from, chat: { id: userId }, message, reply: jest.fn() });

  test.each([
    ['successful_payment', { successful_payment: { currency: 'XTR', total_amount: 100, invoice_payload: 'p' } }],
    ['refunded_payment', { refunded_payment: { currency: 'XTR', total_amount: 100, invoice_payload: 'p' } }]
  ])('%s passes while the message limit is exceeded and the name contains < >', async (_, message) => {
    exhaust('message');
    const ctx = messageCtx({ message_id: 1, ...message });
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test('pre_checkout_query passes while the global limit is exceeded', async () => {
    exhaust('global');
    const ctx = { updateType: 'pre_checkout_query', from, preCheckoutQuery: { id: 'q' }, reply: jest.fn() };
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('ordinary message from a user with < > in the name and a 4-letter username is not rejected', async () => {
    const ctx = messageCtx({ message_id: 1, text: '500 кофе' });
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test('ordinary message is still rate limited, with a localized text', async () => {
    exhaust('message');
    const ctx = messageCtx({ message_id: 1, text: '500 кофе' });
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith('ru:security_rate_limit', expect.any(Object));
  });

  test('invalid callback data gets a localized validation alert, not hard-coded Russian', async () => {
    const ctx = { updateType: 'callback_query', from, callbackQuery: { id: 'c', data: 'x<y' }, answerCbQuery: jest.fn() };
    const next = jest.fn();
    await middleware(ctx, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('ru:security_validation_error', { show_alert: true });
  });
});

describe('Reminder cron', () => {
  const makeDeps = (rows, recordedToday = new Set()) => {
    const userService = {
      userRepository: { query: jest.fn().mockResolvedValue({ rows }) },
      updateLastReminderLocalDate: jest.fn().mockResolvedValue(),
      setReminderSentTodayHours: jest.fn().mockResolvedValue()
    };
    const expenseService = { hasAnyExpenseToday: jest.fn(async (id) => recordedToday.has(id)) };
    const notificationService = {
      localizationService: { getText: (lang, key) => (key === 'reminder_sample_variants' ? ['Запиши траты'] : 'Напоминалка') },
      bot: { telegram: { sendMessage: jest.fn().mockResolvedValue({}) } }
    };
    return { userService, expenseService, notificationService };
  };
  // Явные часы: по умолчанию (NULL) теперь одно напоминание в 21:00, а тесты — про механику рассылки
  const user = (id, extra = {}) => ({
    id, timezone: 'UTC', language: 'ru', reminder_hours: [10, 14, 18], reminder_sent_today_hours: null, last_reminder_local_date: null, ...extra
  });
  const sentTo = (deps) => deps.notificationService.bot.telegram.sendMessage.mock.calls.map(([id]) => id);
  const at10 = new Date('2026-10-26T10:00:00Z');

  test('a user with an invalid timezone does not stop reminders for the others', async () => {
    const deps = makeDeps([user(1, { timezone: 'Etc/GMT+NaN' }), user(2), user(3)]);
    expect(await sendReminders(deps, at10)).toBe(2);
    expect(sentTo(deps)).toEqual([2, 3]);
  });

  test('a failed delivery does not stop reminders for the others', async () => {
    const deps = makeDeps([user(1), user(2)]);
    deps.notificationService.bot.telegram.sendMessage.mockRejectedValueOnce(new Error('403: bot was blocked by the user'));
    expect(await sendReminders(deps, at10)).toBe(1);
    expect(sentTo(deps)).toEqual([1, 2]);
  });

  test('no reminder when the user already recorded an expense today', async () => {
    const deps = makeDeps([user(1, { reminder_hours: [10, 15] }), user(2, { reminder_hours: [10, 15] })], new Set([1]));
    const at15 = new Date('2026-10-26T15:00:00Z');
    expect(await sendReminders(deps, at15)).toBe(1);
    expect(sentTo(deps)).toEqual([2]);
    expect(deps.expenseService.hasAnyExpenseToday).toHaveBeenCalledWith(1, 'UTC');
  });

  test('midnight reminder (hour 0) is sent', async () => {
    const midnight = new Date('2026-10-26T00:00:00Z');
    expect(localDateHour('UTC', midnight)).toEqual({ date: '2026-10-26', hour: 0 });
    expect(localDateHour('Asia/Tokyo', new Date('2026-10-25T15:00:00Z'))).toEqual({ date: '2026-10-26', hour: 0 });

    const deps = makeDeps([user(1, { reminder_hours: [0, 12] })]);
    expect(await sendReminders(deps, midnight)).toBe(1);
    expect(deps.userService.updateLastReminderLocalDate).toHaveBeenCalledWith(1, '2026-10-26');
    expect(deps.userService.setReminderSentTodayHours).toHaveBeenCalledWith(1, [0]);
  });

  test('an hour already reminded today is not repeated; yesterday\'s hours do not count', async () => {
    const deps = makeDeps([
      user(1, { last_reminder_local_date: '2026-10-26', reminder_sent_today_hours: [10] }),
      user(2, { last_reminder_local_date: '2026-10-25', reminder_sent_today_hours: [10, 14] })
    ]);
    expect(await sendReminders(deps, at10)).toBe(1);
    expect(sentTo(deps)).toEqual([2]);
    expect(deps.userService.setReminderSentTodayHours).toHaveBeenCalledWith(2, [10]);
  });

  test('empty reminder_hours disables reminders', async () => {
    const deps = makeDeps([user(1, { reminder_hours: [] })]);
    expect(await sendReminders(deps, at10)).toBe(0);
  });
});

describe('PremiumLifecycleService: per-user isolation', () => {
  test('an invalid timezone of one user does not stop notifications for the others', async () => {
    const now = new Date('2026-10-26T12:00:00Z');
    const expires = new Date(now.getTime() + 3600 * 1000);
    const candidate = (id, timezone) => ({ id, timezone, language: 'en', premium_expires_at: expires, has_active_subscription: false, is_trial_only: false });
    const userNotificationRepository = {
      getPremiumLifecycleCandidates: jest.fn().mockResolvedValue([candidate(1, 'Etc/GMT+NaN'), candidate(2, 'UTC')]),
      markSent: jest.fn().mockResolvedValue(true)
    };
    const notificationService = { sendMessage: jest.fn().mockResolvedValue({}) };
    const service = new PremiumLifecycleService(userNotificationRepository, notificationService, fakeLocalization, { formatDate: () => '27.10.2026' });
    expect(await service.processDue(now)).toBe(1);
    expect(notificationService.sendMessage).toHaveBeenCalledWith(2, expect.any(String), expect.any(Object));
  });
});

describe('LocalizationService.getText', () => {
  test('inserts parameter values literally ($&, $\', $` are not expanded)', () => {
    const l10n = new LocalizationService();
    const text = l10n.getText('en', 'security_rate_limit', { resetTime: 'a $& b', limit: "$' $`" });
    expect(text).toContain('a $& b');
    expect(text).toContain("$' $`");
    expect(text).not.toContain('{limit}');
  });
});

describe('errorHandler', () => {
  const services = () => ({
    userService: { getUserLanguage: jest.fn().mockResolvedValue('ru') },
    localizationService: new LocalizationService()
  });

  test('answers the callback query and replies with the localized generic error', async () => {
    const s = services();
    const errorHandler = createErrorHandler(s);
    const ctx = {
      from: { id: 7771100002 },
      chat: { id: 7771100002 },
      updateType: 'callback_query',
      callbackQuery: { id: 'c', data: 'boom' },
      answerCbQuery: jest.fn().mockResolvedValue(true),
      reply: jest.fn().mockResolvedValue({})
    };
    await errorHandler(async () => { throw new Error('boom'); })(ctx);
    expect(ctx.answerCbQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(s.localizationService.getText('ru', 'error_generic'));
  });

  test('a failing answerCbQuery/reply does not throw out of the handler', async () => {
    const errorHandler = createErrorHandler(services());
    const ctx = {
      from: { id: 7771100003 },
      chat: { id: 7771100003 },
      callbackQuery: { id: 'c', data: 'boom' },
      answerCbQuery: jest.fn().mockRejectedValue(new Error('query is too old')),
      reply: jest.fn().mockRejectedValue(new Error('403'))
    };
    await expect(errorHandler(async () => { throw new Error('boom'); })(ctx)).resolves.toBeUndefined();
  });
});
