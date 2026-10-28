// Подписки: дата следующего списания по периодичности (концы месяцев, високосные годы), время предупреждения в поясе
// пользователя, однократность (перезапуск и наложение cron), пробные периоды, «Как отменить» и ссылки.
// Без БД: репозитории — моки, время задаётся явно.
const {
  typicalDay, nextByCadence, detectSubscriptions, subscriptionDates
} = require('../utils/planning');
const {
  isWarnHour, subscriptionWarnDays, trialStage, warnKey, chargeAfter, subRef, normalizeWarnDays
} = require('../utils/subscriptionAlerts');
const { parseFutureDate, parseRecordDate } = require('../utils/recordDate');
const { SERVICES, findCancelService } = require('../config/subscriptionCancel');
const SubscriptionAlertService = require('../services/SubscriptionAlertService');
const PlanningService = require('../services/PlanningService');
const SubscriptionHandlers = require('../handlers/SubscriptionHandlers');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { USER_LIMITS } = require('../utils/constants');

const localization = new LocalizationService();
const formatter = new Formatter({ convert: async (amount) => amount });
const sp = (text) => String(text).replace(/[\u00a0\u202f]/g, ' ');
const row = (date, description, amount, extra = {}) => ({ date, description, amount, currency: 'RUB', category_id: 3, category_name: 'Подписки', recurring_expense_id: null, ...extra });

describe('next charge date by cadence', () => {
  test('typical day: the most frequent day, month ends count as «last day»', () => {
    expect(typicalDay(['2026-07-15', '2026-08-15', '2026-09-16', '2026-10-15'])).toBe(15);
    expect(typicalDay(['2026-01-31', '2026-02-28', '2026-03-31'])).toBe(31);
    expect(typicalDay(['2026-01-30', '2026-02-28', '2026-03-30'])).toBe(30);
    expect(typicalDay(['2026-09-05', '2026-10-06'])).toBe(6); // ничья — более позднее списание
  });

  test('monthly: 31st goes to the last day of short months and back to 31; leap February', () => {
    expect(nextByCadence('2026-01-31', 'monthly', 31)).toBe('2026-02-28');
    expect(nextByCadence('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    expect(nextByCadence('2028-01-31', 'monthly', 31)).toBe('2028-02-29');
    expect(nextByCadence('2026-04-30', 'monthly', 30)).toBe('2026-05-30');
    expect(nextByCadence('2026-12-15', 'monthly', 15)).toBe('2027-01-15');
  });

  test('yearly: 29 February → 28 February → 29 February in the next leap year; weekly is +7 days', () => {
    expect(nextByCadence('2024-02-29', 'yearly', 29)).toBe('2025-02-28');
    expect(nextByCadence('2027-02-28', 'yearly', 29)).toBe('2028-02-29');
    expect(nextByCadence('2026-03-10', 'yearly')).toBe('2027-03-10');
    expect(nextByCadence('2026-12-29', 'weekly')).toBe('2027-01-05');
  });

  test('detected monthly subscription keeps the typical day after a short month', () => {
    const [sub] = detectSubscriptions([
      row('2026-11-30', 'Netflix', 799), row('2026-12-31', 'NETFLIX.COM', 799), row('2027-01-31', 'Netflix', 799), row('2027-02-28', 'Netflix', 799)
    ], { today: '2027-03-05' });
    expect(sub).toMatchObject({ cadence: 'monthly', day: 31, lastDate: '2027-02-28', nextDate: '2027-03-31' });
    // В календаре дальше — тоже по 31-м (в апреле — 30-е)
    expect(subscriptionDates(sub, '2027-03-05', '2027-05-01')).toEqual(['2027-03-31', '2027-04-30']);
  });

  test('detected yearly subscription bought on 29 February', () => {
    const [sub] = detectSubscriptions([row('2024-02-29', 'iCloud 2TB', 9990), row('2025-02-28', 'iCloud 2TB', 9990)], { today: '2025-03-10' });
    expect(sub).toMatchObject({ cadence: 'yearly', nextDate: '2026-02-28' });
    expect(nextByCadence('2027-02-28', 'yearly', sub.day)).toBe('2028-02-29');
  });

  test('yearly subscription is still found a year after the last charge — in time for the next one', () => {
    const [sub] = detectSubscriptions([row('2024-10-31', 'Amazon Prime', 139), row('2025-10-31', 'Amazon Prime', 139)], { today: '2026-10-29' });
    expect(sub).toMatchObject({ cadence: 'yearly', nextDate: '2026-10-31', known: true });
    expect(subscriptionWarnDays(sub.nextDate, '2026-10-29', 2)).toBe(2);
    // Год прошёл, оплаты нет больше 380 дней — уже не подписка
    expect(detectSubscriptions([row('2024-10-31', 'Amazon Prime', 139), row('2025-10-31', 'Amazon Prime', 139)], { today: '2026-11-20' })).toEqual([]);
  });

  test('weekly series: next date one week after the last charge', () => {
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'];
    const [sub] = detectSubscriptions(weeks.map(d => row(d, 'Boosty автор', 300)), { today: '2026-10-08' });
    expect(sub).toMatchObject({ cadence: 'weekly', day: null, nextDate: '2026-10-12' });
  });
});

describe('when to warn', () => {
  test('daytime window 10:00–20:59 local', () => {
    expect([9, 10, 15, 20, 21, 23, 0].map(isWarnHour)).toEqual([false, true, true, true, false, false, false]);
  });

  test('N days before; a missed day is caught up while the charge is ahead; never on the day or after', () => {
    expect(subscriptionWarnDays('2026-10-31', '2026-10-29', 2)).toBe(2);
    expect(subscriptionWarnDays('2026-10-31', '2026-10-28', 2)).toBeNull();
    expect(subscriptionWarnDays('2026-10-31', '2026-10-30', 2)).toBe(1); // пропущенный день
    expect(subscriptionWarnDays('2026-10-31', '2026-10-31', 2)).toBeNull();
    expect(subscriptionWarnDays('2026-10-31', '2026-11-01', 2)).toBeNull();
    expect(subscriptionWarnDays('2026-11-07', '2026-10-31', 7)).toBe(7);
    expect(subscriptionWarnDays('2027-01-01', '2026-12-31', 1)).toBe(1); // через Новый год
  });

  test('warn days: only 1, 2, 3, 7; anything else is the default 2', () => {
    expect([1, 2, 3, 7, 5, null, '3'].map(normalizeWarnDays)).toEqual([1, 2, 3, 7, 2, 2, 3]);
  });

  test('trial: the day before and on the day, only while active and not on the day it was added', () => {
    const trial = { end_date: '2026-11-03', state: 'active', created_on: '2026-10-20' };
    expect(trialStage(trial, '2026-11-01')).toBeNull();
    expect(trialStage(trial, '2026-11-02')).toBe(1);
    expect(trialStage(trial, '2026-11-03')).toBe(0);
    expect(trialStage(trial, '2026-11-04')).toBeNull();
    expect(trialStage({ ...trial, state: 'kept' }, '2026-11-03')).toBeNull();
    expect(trialStage({ ...trial, state: 'muted' }, '2026-11-02')).toBeNull();
    expect(trialStage({ ...trial, created_on: '2026-11-02' }, '2026-11-02')).toBeNull();
    expect(trialStage({ ...trial, end_date: null }, '2026-11-02')).toBeNull();
  });

  test('keys: one per charge (and per trial stage), fit user_notifications.ref_key', () => {
    const ref = subRef('netflix');
    expect(ref).toMatch(/^[0-9a-f]{10}$/);
    expect(subRef('netflix')).toBe(ref);
    expect(warnKey(ref, '2026-10-31')).toBe(`${ref}|2026-10-31`);
    expect(warnKey('t12', '2026-11-03', 0)).toBe('t12|2026-11-03|0');
    expect(warnKey(ref, '2026-10-31').length).toBeLessThanOrEqual(64);
  });

  test('still charging after «I’ll cancel»: same merchant strictly after the mark', () => {
    const rows = [row('2026-10-29', 'Netflix', 799), row('2026-10-31', 'Spotify', 169), row('2026-11-01', 'NETFLIX.COM', 799)];
    expect(chargeAfter(rows, 'netflix', '2026-10-29')).toMatchObject({ date: '2026-11-01' });
    expect(chargeAfter(rows, 'netflix', '2026-11-01')).toBeNull();
  });
});

describe('trial end date input', () => {
  test('future dates: without a year — the nearest one, not in the past, within a year', () => {
    expect(parseFutureDate('31.10', '2026-10-29')).toEqual({ date: '2026-10-31' });
    expect(parseFutureDate('29.10', '2026-10-29')).toEqual({ date: '2026-10-29' });
    expect(parseFutureDate('10.01', '2026-12-20')).toEqual({ date: '2027-01-10' });
    expect(parseFutureDate('28.10', '2026-10-29')).toEqual({ date: '2027-10-28' });
    expect(parseFutureDate('28.10.2026', '2026-10-29')).toEqual({ error: 'past' });
    expect(parseFutureDate('01.01.2029', '2026-10-29', 366)).toEqual({ error: 'too_far' });
    expect(parseFutureDate('29.02.27', '2026-10-29')).toEqual({ error: 'format' });
    expect(parseFutureDate('29/02/28', '2027-10-29', 366)).toEqual({ date: '2028-02-29' });
    expect(parseFutureDate('завтра', '2026-10-29')).toEqual({ error: 'format' });
  });

  test('record dates still parse as before', () => {
    expect(parseRecordDate('25.10', '2026-10-29')).toEqual({ date: '2026-10-25' });
    expect(parseRecordDate('25.12', '2026-01-10')).toEqual({ date: '2025-12-25' });
    expect(parseRecordDate('30.10', '2026-10-29')).toEqual({ error: 'future' });
  });
});

describe('how to cancel: curated links', () => {
  test('merchant descriptions match the right service', () => {
    const id = (...texts) => (findCancelService(...texts) || {}).id || null;
    expect(id('NETFLIX.COM 1')).toBe('netflix');
    expect(id('Apple.com/bill')).toBe('apple');
    expect(id('iCloud 2TB')).toBe('apple');
    expect(id('YouTube Premium')).toBe('youtube');
    expect(id('Google One 100GB')).toBe('google_one');
    expect(id('GOOGLE PLAY Duolingo')).toBe('google_play');
    expect(id('XBOX Game Pass')).toBe('microsoft');
    expect(id('Microsoft 365')).toBe('microsoft');
    expect(id('OpenAI ChatGPT Plus')).toBe('openai');
    expect(id('PlayStation Plus')).toBe('playstation');
    expect(id('Disney+')).toBe('disney');
    expect(id('Amazon Prime')).toBe('amazon_prime');
    expect(id('Spotify P0123')).toBe('spotify');
    expect(id('Telegram Premium')).toBe('telegram_premium');
    expect(id('Кинопоиск')).toBeNull();
    expect(id('Фитнес-клуб')).toBeNull();
    expect(id('Pineapple')).toBeNull(); // «apple» — только с начала слова
    expect(id('', 'netflix')).toBe('netflix'); // по ключу продавца
  });

  test('every entry has an official https link and a unique id', () => {
    const ids = new Set();
    for (const service of SERVICES) {
      expect(ids.has(service.id)).toBe(false);
      ids.add(service.id);
      expect(service.manage || service.help).toBeTruthy();
      for (const url of [service.manage, service.help].filter(Boolean)) expect(url).toMatch(/^https:\/\/[a-z0-9.-]+\.(com|org)\//);
      expect(service.keywords.length).toBeGreaterThan(0);
    }
  });
});

// ========================================
// СЕРВИС
// ========================================

function createService({ subs = [], trials = [], alerts = new Map(), rows = [], candidates, isPremium = false } = {}) {
  const sent = new Set(); // user_notifications
  const deps = {
    planningService: {
      getSubscriptions: jest.fn(async () => ({ shown: subs.slice(0, 3), all: subs, today: '2026-10-29' })),
      limits: jest.fn(async () => ({ isPremium, limits: isPremium ? USER_LIMITS.premium : USER_LIMITS.regular })),
      recurringExpenseService: { get: jest.fn() }
    },
    planningRepository: {
      getWarnCandidates: jest.fn(async () => candidates || [{ id: 7780200001, language: 'ru', timezone: 'Asia/Tokyo', sub_warn_enabled: true, sub_warn_days: 2 }]),
      getTrials: jest.fn(async () => trials),
      getTrial: jest.fn(async (userId, id) => trials.find(t => t.id === id) || null),
      getAlerts: jest.fn(async () => alerts),
      getExpenseRowsSince: jest.fn(async () => rows),
      setTrialState: jest.fn(async () => true),
      setAlert: jest.fn(),
      clearAlert: jest.fn(),
      setMark: jest.fn(),
      countActiveTrials: jest.fn(async () => trials.length),
      getWarnSettings: jest.fn(async () => ({ enabled: true, days: 2 }))
    },
    expenseService: { getPeriodContext: jest.fn(async () => ({ today: '2026-10-29', timezone: 'Asia/Tokyo' })) },
    userNotificationRepository: {
      markSent: jest.fn(async (userId, kind, key) => {
        const id = `${userId}|${kind}|${key}`;
        if (sent.has(id)) return false;
        sent.add(id);
        return true;
      }),
      isSent: jest.fn(async (userId, kind, key) => sent.has(`${userId}|${kind}|${key}`))
    },
    notificationService: { sendMessage: jest.fn(async () => ({})) },
    localizationService: localization,
    formatter
  };
  return { service: new SubscriptionAlertService(deps), deps, sent };
}

const netflix = { kind: 'detected', ref: subRef('netflix'), id: 'aaaaaaaaaa', key: 'netflix', label: 'Netflix', amount: 799, currency: 'RUB', cadence: 'monthly', nextDate: '2026-10-31', confirmed: false, known: true, alert: null };

describe('SubscriptionAlertService.processDue', () => {
  test('the warning text and buttons', () => {
    const { service } = createService();
    const message = service.warningMessage('ru', { ref: netflix.ref, name: 'Netflix', date: '2026-10-31', days: 2, amount: 799, currency: 'RUB' });
    expect(sp(message.text)).toBe('🔔 Через 2 дня, 31.10, спишется «Netflix» ≈ 799 ₽. Нужна?');
    expect(message.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual([
      `plwk|${netflix.ref}|20261031`, `plwx|${netflix.ref}|20261031`, `plwm|${netflix.ref}`
    ]);
    expect(message.reply_markup.inline_keyboard.flat().map(b => b.text)).toEqual(['✅ Нужна', '🚫 Отменю', '🔕 Не напоминать про эту']);
    const en = service.warningMessage('en', { ref: 't5', name: 'Disney+', date: '2026-11-03', days: 1, amount: null, currency: null, trial: true });
    expect(en.text).toBe('🧪 Tomorrow, 03.11, the “Disney+” free trial ends — then it becomes paid. Still need it?');
  });

  test('fires at the first daytime run in the user time zone, once per charge, and the day is scanned once', async () => {
    const { service, deps } = createService({ subs: [netflix] });
    // Токио UTC+9: 00:30 UTC = 09:30 — рано; 01:15 UTC = 10:15 — пора
    expect(await service.processDue(new Date('2026-10-29T00:30:00Z'))).toBe(0);
    expect(deps.planningService.getSubscriptions).not.toHaveBeenCalled();
    expect(await service.processDue(new Date('2026-10-29T01:15:00Z'))).toBe(1);
    expect(deps.planningService.getSubscriptions).toHaveBeenCalledWith(7780200001, { today: '2026-10-29' });
    const [userId, text, extra] = deps.notificationService.sendMessage.mock.calls[0];
    expect(userId).toBe(7780200001);
    expect(sp(text)).toContain('Через 2 дня, 31.10, спишется «Netflix» ≈ 799 ₽');
    expect(extra.parse_mode).toBe('Markdown');
    // Следующий час того же дня — день уже разобран; ночью — окно закрыто
    expect(await service.processDue(new Date('2026-10-29T02:15:00Z'))).toBe(0);
    expect(await service.processDue(new Date('2026-10-29T13:15:00Z'))).toBe(0);
    // Завтра (за 1 день) — то же списание, повторно не пишем
    deps.planningService.getSubscriptions.mockResolvedValue({ shown: [netflix], all: [netflix], today: '2026-10-30' });
    expect(await service.processDue(new Date('2026-10-30T01:15:00Z'))).toBe(0);
    expect(deps.notificationService.sendMessage).toHaveBeenCalledTimes(1);
  });

  test('restart (new service, same DB marks) and overlapping runs send exactly one message', async () => {
    const first = createService({ subs: [netflix] });
    // Два одновременных запуска (наложение cron)
    const [a, b] = await Promise.all([
      first.service.processDue(new Date('2026-10-29T05:15:00Z')),
      first.service.processDue(new Date('2026-10-29T05:15:00Z'))
    ]);
    expect(a + b).toBe(1);
    // «Перезапуск»: новый экземпляр сервиса с теми же отметками; день не отмечен разобранным (сбой до отметки)
    const second = createService({ subs: [netflix] });
    for (const key of first.sent) if (!key.includes('|sub_scan|')) second.sent.add(key);
    expect(await second.service.processDue(new Date('2026-10-29T06:15:00Z'))).toBe(0);
    expect(second.deps.notificationService.sendMessage).not.toHaveBeenCalled();
  });

  test('only confirmed or known, visible by tariff, without mute/cancel, and only when enabled', async () => {
    const sub = (key, extra) => ({ ...netflix, key, ref: subRef(key), label: key, ...extra });
    const subs = [
      sub('habit', { known: false }), // найдена, но не отмечена и не известна
      sub('muted', { alert: { state: 'muted', since: '2026-10-01' } }),
      sub('ok', { confirmed: true, known: false }),
      sub('premium only') // четвёртая — без премиума не видна
    ];
    const { service, deps } = createService({ subs });
    expect(await service.processDue(new Date('2026-10-29T03:15:00Z'))).toBe(1);
    expect(deps.notificationService.sendMessage.mock.calls[0][1]).toContain('«ok»');

    const off = createService({ subs: [netflix], candidates: [{ id: 1, language: 'en', timezone: 'UTC', sub_warn_enabled: false, sub_warn_days: 2 }] });
    expect(await off.service.processDue(new Date('2026-10-29T12:00:00Z'))).toBe(0);
    expect(off.deps.planningService.getSubscriptions).not.toHaveBeenCalled();
  });

  test('warn days 7 and 1 from the user setting', async () => {
    const far = { ...netflix, nextDate: '2026-11-05' };
    const week = createService({ subs: [far], candidates: [{ id: 1, language: 'ru', timezone: 'UTC', sub_warn_enabled: true, sub_warn_days: 7 }] });
    expect(await week.service.processDue(new Date('2026-10-29T10:00:00Z'))).toBe(1);
    expect(week.deps.notificationService.sendMessage.mock.calls[0][1]).toContain('Через неделю, 05.11');
    const day = createService({ subs: [far], candidates: [{ id: 1, language: 'ru', timezone: 'UTC', sub_warn_enabled: true, sub_warn_days: 1 }] });
    expect(await day.service.processDue(new Date('2026-10-29T10:00:00Z'))).toBe(0);
  });

  test('trials: the day before and on the day, whatever the setting; once each', async () => {
    const trial = { id: 5, name: 'Disney+', end_date: '2026-10-30', amount: 9.99, currency: 'USD', state: 'active', created_on: '2026-10-01' };
    const { service, deps } = createService({ trials: [trial], candidates: [{ id: 1, language: 'ru', timezone: 'UTC', sub_warn_enabled: false, sub_warn_days: 2 }] });
    expect(await service.processDue(new Date('2026-10-29T10:00:00Z'))).toBe(1);
    expect(sp(deps.notificationService.sendMessage.mock.calls[0][1])).toBe('🧪 Завтра, 30.10, заканчивается пробный период «Disney+» — дальше спишется ≈ 9,99 $. Нужна?');
    expect(deps.notificationService.sendMessage.mock.calls[0][2].reply_markup.inline_keyboard[0][0].callback_data).toBe('plwk|t5|20261030');
    expect(await service.processDue(new Date('2026-10-30T10:00:00Z'))).toBe(1);
    expect(deps.notificationService.sendMessage.mock.calls[1][1]).toContain('Сегодня, 30.10');
    expect(await service.processDue(new Date('2026-10-30T15:00:00Z'))).toBe(0);
    // «✅ Нужна» на первом — в день окончания не пишем
    const kept = createService({ trials: [{ ...trial, state: 'kept' }], candidates: [{ id: 1, language: 'ru', timezone: 'UTC', sub_warn_enabled: true, sub_warn_days: 2 }] });
    expect(await kept.service.processDue(new Date('2026-10-30T10:00:00Z'))).toBe(0);
  });

  test('«I’ll cancel», then a charge appears — one gentle note; auto-recorded recurring gets a delete button', async () => {
    const user = [{ id: 1, language: 'ru', timezone: 'UTC', sub_warn_enabled: true, sub_warn_days: 2 }];
    const alerts = new Map([['netflix', { state: 'cancelling', since: '2026-10-29' }]]);
    const { service, deps } = createService({ alerts, rows: [row('2026-10-31', 'NETFLIX.COM', 799)], candidates: user });
    expect(await service.processDue(new Date('2026-11-01T10:00:00Z'))).toBe(1);
    expect(deps.planningRepository.getExpenseRowsSince).toHaveBeenCalledWith(1, 'UTC', '2026-10-30');
    const [, text, extra] = deps.notificationService.sendMessage.mock.calls[0];
    expect(sp(text)).toBe('🤔 «NETFLIX.COM» снова списалась: 799 ₽, 31.10. Ты собирался её отменить — проверь, что подписка правда отключена.');
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual([`plwh|${subRef('netflix')}`, `plwk|${subRef('netflix')}`, `plwm|${subRef('netflix')}`]);
    expect(await service.processDue(new Date('2026-11-02T10:00:00Z'))).toBe(0); // заметка одна

    const recurring = createService({ alerts, rows: [row('2026-11-15', 'Netflix', 799, { recurring_expense_id: 42 })], candidates: user });
    expect(await recurring.service.processDue(new Date('2026-11-16T10:00:00Z'))).toBe(1);
    const note = recurring.deps.notificationService.sendMessage.mock.calls[0];
    expect(note[1]).toContain('как регулярную трату');
    expect(note[2].reply_markup.inline_keyboard[0][0].callback_data).toBe('recurring_delete|42');

    // Ничего похожего после отметки и отметка старше 45 дней — молчим
    const quiet = createService({ alerts, rows: [row('2026-10-29', 'Netflix', 799), row('2026-10-31', 'Spotify', 169)], candidates: user });
    expect(await quiet.service.processDue(new Date('2026-11-01T10:00:00Z'))).toBe(0);
    const old = createService({ alerts, rows: [row('2026-12-31', 'Netflix', 799)], candidates: user });
    expect(await old.service.processDue(new Date('2027-01-01T10:00:00Z'))).toBe(0);
  });

  test('cancelled trial: a charge on the end date or later — one note', async () => {
    const trial = { id: 9, name: 'Disney+', end_date: '2026-11-03', amount: 9.99, currency: 'USD', state: 'cancelling', created_on: '2026-10-20' };
    const { service, deps } = createService({ trials: [trial], rows: [row('2026-11-03', 'Disney Plus', 9.99, { currency: 'USD' })], candidates: [{ id: 1, language: 'en', timezone: 'UTC', sub_warn_enabled: true, sub_warn_days: 2 }] });
    expect(await service.processDue(new Date('2026-11-04T10:00:00Z'))).toBe(0); // «disney plus» ≠ «disney»: другой продавец
    deps.planningRepository.getExpenseRowsSince.mockResolvedValue([row('2026-11-03', 'Disney+', 9.99, { currency: 'USD' })]);
    deps.userNotificationRepository.isSent.mockResolvedValue(false);
    expect(await service.processDue(new Date('2026-11-05T10:00:00Z'))).toBe(1);
    expect(deps.notificationService.sendMessage.mock.calls[0][1]).toContain('“Disney+” charged again');
    expect(await service.processDue(new Date('2026-11-06T10:00:00Z'))).toBe(0);
  });
});

describe('SubscriptionAlertService: answers, guide, week line', () => {
  test('stale refs resolve to null; keep / cancel / mute change only their target', async () => {
    const trial = { id: 5, name: 'Okko', end_date: '2026-11-03', state: 'active', created_on: '2026-10-20' };
    const { service, deps } = createService({ subs: [netflix], trials: [trial] });
    expect(await service.keep(1, 'ffffffffff')).toBeNull();
    expect(await service.keep(1, 't999')).toBeNull();
    expect(await service.cancel(1, netflix.ref)).toMatchObject({ kind: 'sub', key: 'netflix' });
    expect(deps.planningRepository.setAlert).toHaveBeenLastCalledWith(1, 'netflix', 'cancelling', '2026-10-29');
    expect(await service.mute(1, 't5')).toMatchObject({ kind: 'trial' });
    expect(deps.planningRepository.setTrialState).toHaveBeenLastCalledWith(1, 5, 'muted');
    // «↩️ Передумал» после «Отменю» снимает отметку
    deps.planningService.getSubscriptions.mockResolvedValue({ shown: [], all: [{ ...netflix, alert: { state: 'cancelling', since: '2026-10-29' } }] });
    await service.keep(1, netflix.ref);
    expect(deps.planningRepository.clearAlert).toHaveBeenCalledWith(1, 'netflix');
    // Подписка пропала из списка, отметка осталась — кнопка всё ещё работает
    deps.planningService.getSubscriptions.mockResolvedValue({ shown: [], all: [] });
    deps.planningRepository.getAlerts.mockResolvedValue(new Map([['netflix', { state: 'muted', since: '2026-10-01' }]]));
    expect(await service.unmute(1, netflix.ref)).toMatchObject({ key: 'netflix', sub: null });
  });

  test('cancel guide: known service — its page and both stores; Apple — App Store only; unknown — generic advice', () => {
    const { service } = createService();
    const urls = (guide) => guide.urlRows.flat().map(b => b.url);
    const nf = service.cancelGuide('ru', { name: 'Netflix' });
    expect(urls(nf)).toEqual(['https://www.netflix.com/cancelplan', 'https://help.netflix.com/en/node/407', 'https://apps.apple.com/account/subscriptions', 'https://play.google.com/store/account/subscriptions']);
    expect(nf.text).toContain('На сайте Netflix');
    expect(nf.text).not.toContain('раздел «Подписка»');
    const apple = service.cancelGuide('en', { name: 'APPLE.COM/BILL' });
    expect(urls(apple)).toEqual(['https://apps.apple.com/account/subscriptions']);
    expect(apple.text).toContain('Settings → your name → Subscriptions');
    expect(apple.text).not.toContain('Google Play):');
    const unknown = service.cancelGuide('ru', { name: 'Фитнес-клуб', recurringId: 7 });
    expect(urls(unknown)).toEqual(['https://apps.apple.com/account/subscriptions', 'https://play.google.com/store/account/subscriptions']);
    expect(unknown.text).toContain('раздел «Подписка»');
    expect(unknown.text).toContain('регулярную трату');
  });

  test('week line: expected subscriptions and trial ends within 7 days, sorted, not the cancelled ones', async () => {
    const subs = [
      { ...netflix, nextDate: '2026-11-02' },
      { ...netflix, key: 'spotify', label: 'Spotify', amount: 169, nextDate: '2026-10-30' },
      { ...netflix, key: 'far', label: 'Far', nextDate: '2026-11-20' },
      { ...netflix, key: 'gone', label: 'Gone', alert: { state: 'cancelling', since: '2026-10-20' } }
    ];
    const trials = [{ id: 1, name: 'Okko', end_date: '2026-11-01', amount: null, currency: null, state: 'active' }];
    const { service } = createService({ subs, trials, isPremium: true });
    service.planningService.getSubscriptions.mockResolvedValue({ shown: subs, all: subs });
    expect(sp(await service.weekLine(1, 'ru', '2026-10-29'))).toBe('🗓 На этой неделе спишутся: Spotify 30.10 ≈ 169 ₽, Okko 01.11, Netflix 02.11 ≈ 799 ₽');
    service.planningService.getSubscriptions.mockResolvedValue({ shown: [], all: [] });
    service.planningRepository.getTrials.mockResolvedValue([]);
    expect(await service.weekLine(1, 'ru', '2026-10-29')).toBe('');
  });

  test('free: one active trial; premium: unlimited', async () => {
    const { service } = createService({ trials: [{ id: 1 }] });
    expect(await service.canAddTrial(1, '2026-10-29')).toMatchObject({ ok: false, max: 1 });
    expect(await service.startTrial(1, { name: 'X' })).toEqual({ error: 'limit' });
    const premium = createService({ trials: [{ id: 1 }, { id: 2 }], isPremium: true });
    expect(await premium.service.canAddTrial(1, '2026-10-29')).toMatchObject({ ok: true });
  });
});

// ========================================
// СПИСОК ПОДПИСОК: НАЙДЕННЫЕ + РЕГУЛЯРНЫЕ-ПОДПИСКИ
// ========================================

describe('PlanningService.getSubscriptions with recurring subscriptions', () => {
  function planning({ rows = [], recurring = [], marks = new Map(), alerts = new Map(), isPremium = false } = {}) {
    return new PlanningService({
      planningRepository: {
        getExpenseRowsSince: jest.fn(async () => rows),
        getMarks: jest.fn(async () => marks),
        getAlerts: jest.fn(async () => alerts)
      },
      expenseService: { getPeriodContext: jest.fn(async () => ({ timezone: 'UTC', currency: 'RUB', today: '2026-10-29' })) },
      recurringExpenseService: { list: jest.fn(async () => recurring) },
      premiumService: { isPremiumUser: jest.fn(async () => isPremium) },
      localizationService: localization,
      formatter,
      currencyUtils: { convert: jest.fn(async () => 1) }
    });
  }
  const months = ['2026-07-20', '2026-08-20', '2026-09-20', '2026-10-20'];

  test('confirmed or known recurring expenses are subscriptions (rent is not); free sees the 3 most expensive', async () => {
    const service = planning({
      rows: [...months.map(d => row(d, 'Spotify', 169)), ...months.map(d => row(d, 'Кинопоиск', 299)), ...months.map(d => row(d, 'Репетитор', 2000, { category_name: 'Образование' }))],
      recurring: [
        { id: 1, description: 'Netflix', amount: '799.00', currency: 'RUB', day_of_month: 31, last_charged_month: '2026-09-01' },
        { id: 2, description: 'Аренда', amount: '50000.00', currency: 'RUB', day_of_month: 3, last_charged_month: '2026-10-01' },
        { id: 3, description: 'Онлайн-кинотеатр', amount: '399.00', currency: 'RUB', day_of_month: 5, last_charged_month: '2026-10-01' }
      ],
      marks: new Map([['онлайн кинотеатр', 'confirmed']])
    });
    const subs = await service.getSubscriptions(7780200001);
    expect(subs.all.map(s => `${s.kind}:${s.label}`)).toEqual(['detected:Репетитор', 'recurring:Netflix', 'recurring:Онлайн-кинотеатр', 'detected:Кинопоиск', 'detected:Spotify']);
    expect(subs.shown.map(s => s.label)).toEqual(['Репетитор', 'Netflix', 'Онлайн-кинотеатр']);
    expect(subs.visible.map(s => s.label)).toEqual(['Репетитор']); // календарь — только найденные (регулярные там и так есть)
    expect(subs.hiddenCount).toBe(2);
    const nf = subs.all.find(s => s.label === 'Netflix');
    expect(nf).toMatchObject({ nextDate: '2026-10-31', known: true, confirmed: false, ref: subRef('netflix'), cadence: 'monthly' });
    expect(subs.all.find(s => s.label === 'Онлайн-кинотеатр')).toMatchObject({ confirmed: true, nextDate: '2026-11-05' });
  });

  test('fake «today» for the cron; alerts attached; dismissed recurring hidden and counted', async () => {
    const service = planning({
      recurring: [{ id: 1, description: 'Netflix', amount: '799.00', currency: 'RUB', day_of_month: 31, last_charged_month: '2026-10-01' }],
      alerts: new Map([['netflix', { state: 'muted', since: '2026-10-01' }]])
    });
    const subs = await service.getSubscriptions(1, { today: '2027-02-10' });
    expect(subs.today).toBe('2027-02-10');
    expect(subs.all[0]).toMatchObject({ nextDate: '2027-02-28', alert: { state: 'muted' } }); // 31-е в феврале — 28-е
    const dismissed = planning({
      recurring: [{ id: 1, description: 'Netflix', amount: '799.00', currency: 'RUB', day_of_month: 31, last_charged_month: null }],
      marks: new Map([['netflix', 'dismissed']])
    });
    expect(await dismissed.getSubscriptions(1)).toMatchObject({ all: [], dismissed: 1 });
  });
});

// ========================================
// КНОПКИ: СТАРЫЕ И ПОСЛЕ ПЕРЕЗАПУСКА
// ========================================

describe('SubscriptionHandlers buttons', () => {
  function ctxFor(data, match) {
    return {
      from: { id: 1 },
      callbackQuery: { data, message: { message_id: 10 } },
      match,
      answerCbQuery: jest.fn(async () => {}),
      editMessageText: jest.fn(async () => {}),
      editMessageReplyMarkup: jest.fn(async () => {}),
      reply: jest.fn(async () => {})
    };
  }
  function handlers(service) {
    return new SubscriptionHandlers({
      subscriptionAlertService: service,
      planningService: { shortDate: (d) => d.slice(8, 10) + '.' + d.slice(5, 7) },
      planningHandlers: { showSubscriptions: jest.fn() },
      recurringExpenseHandlers: {},
      userService: { getUserLanguage: jest.fn(async () => 'ru') },
      localizationService: localization,
      formatter,
      stateService: { setUserState: jest.fn(), deleteUserState: jest.fn() }
    });
  }

  test('a stale button answers «outdated» and removes the keyboard; nothing is changed', async () => {
    const { service, deps } = createService({ subs: [] });
    const ctx = ctxFor('plwx|ffffffffff|20261031', ['plwx|ffffffffff|20261031', 'ffffffffff']);
    await handlers(service).cancel(ctx);
    expect(ctx.answerCbQuery).toHaveBeenCalledWith('Это напоминание уже неактуально', { show_alert: true });
    expect(ctx.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [] });
    expect(deps.planningRepository.setAlert).not.toHaveBeenCalled();
  });

  test('«🚫 Отменю» marks and shows how to cancel with official links and «changed my mind»', async () => {
    const { service, deps } = createService({ subs: [netflix] });
    const ctx = ctxFor(`plwx|${netflix.ref}|20261031`, [`plwx|${netflix.ref}|20261031`, netflix.ref]);
    await handlers(service).cancel(ctx);
    expect(deps.planningRepository.setAlert).toHaveBeenCalledWith(1, 'netflix', 'cancelling', '2026-10-29');
    const [text, extra] = ctx.editMessageText.mock.calls[0];
    expect(text).toContain('🚫 Отметил: отменяешь «Netflix»');
    expect(text).toContain('Как отменить «Netflix»');
    const buttons = extra.reply_markup.inline_keyboard.flat();
    expect(buttons.filter(b => b.url).map(b => b.url)).toContain('https://www.netflix.com/cancelplan');
    expect(buttons.map(b => b.callback_data).filter(Boolean)).toEqual([`plwk|${netflix.ref}`, 'pls']);
  });

  test('«✅ Нужна» on a trial reminder keeps it; a date typed for the trial goes through parseFutureDate', async () => {
    const trial = { id: 5, name: 'Okko', end_date: '2026-11-03', state: 'active', created_on: '2026-10-20' };
    const { service, deps } = createService({ trials: [trial] });
    const ctx = ctxFor('plwk|t5|20261102', ['plwk|t5|20261102', 't5']);
    await handlers(service).keep(ctx);
    expect(deps.planningRepository.setTrialState).toHaveBeenCalledWith(1, 5, 'kept');
    expect(ctx.editMessageText.mock.calls[0][0]).toContain('про этот пробный период больше не напоминаю');

    const text = { from: { id: 1 }, reply: jest.fn(async () => {}) };
    await handlers(service).handleInput(text, 'вчера', 'ru', 'sub_in:trd:5');
    expect(text.reply.mock.calls[0][0]).toContain('Не понял дату');
  });

  test('trial name and price: «Netflix 9.99 USD», «Tele2» (digits in the name, no price), «399» is not a name', async () => {
    const { service } = createService({ isPremium: true });
    service.startTrial = jest.fn(async () => ({ id: 77 }));
    const h = handlers(service);
    h.userService.getUserCurrency = jest.fn(async () => 'RUB');
    const text = () => ({ from: { id: 1 }, reply: jest.fn(async () => {}) });
    let ctx = text();
    await h.handleInput(ctx, 'Netflix 9.99 USD', 'en', 'sub_in:trn');
    expect(service.startTrial).toHaveBeenLastCalledWith(1, { name: 'Netflix', amount: 9.99, currency: 'USD' });
    expect(h.stateService.setUserState).toHaveBeenLastCalledWith(1, 'sub_in:trd:77');
    expect(ctx.reply.mock.calls[0][1].reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual([
      'pltd|77|20261030', 'pltd|77|20261101', 'pltd|77|20261105', 'pltd|77|20261112', 'pltd|77|20261128', 'pls'
    ]);
    await h.handleInput(text(), 'Tele2', 'ru', 'sub_in:trn');
    expect(service.startTrial).toHaveBeenLastCalledWith(1, { name: 'Tele2', amount: null, currency: null });
    await h.handleInput(text(), 'Кинопоиск 299', 'ru', 'sub_in:trn');
    expect(service.startTrial).toHaveBeenLastCalledWith(1, { name: 'Кинопоиск', amount: 299, currency: 'RUB' });
    ctx = text();
    await h.handleInput(ctx, '399', 'ru', 'sub_in:trn');
    expect(ctx.reply.mock.calls[0][0]).toContain('Напиши название сервиса');
    expect(service.startTrial).toHaveBeenCalledTimes(3);
  });
});
