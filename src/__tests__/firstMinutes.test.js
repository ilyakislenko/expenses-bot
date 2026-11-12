// Первые минуты нового пользователя: язык и пояс при регистрации, шаг воронки trial_started, Mini App до /start,
// напоминания только тем, кто уже что-то записал, и одно напоминание «запиши первую трату» через сутки днём.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { sendReminders, sendFirstExpenseNudges } = require('../botCron');
const UserService = require('../services/UserService');
const FunnelService = require('../services/FunnelService');
const LocalizationService = require('../services/LocalizationService');
const MiniAppServer = require('../miniapp/MiniAppServer');
const { signInitData } = require('../miniapp/initData');

const localizationService = new LocalizationService();
const t = (lang, key, params) => localizationService.getText(lang, key, params);
const HOUR = 3600 * 1000;

// Шаги воронки в памяти: первое наступление, как user_funnel_events с PK (user_id, event)
function makeFunnel() {
  const events = new Map();
  const sources = new Map();
  const repository = {
    track: jest.fn(async (userId, event) => {
      const key = `${userId}:${event}`;
      if (!events.has(key)) events.set(key, new Date());
    }),
    hasEvent: jest.fn(async (userId, event) => events.has(`${userId}:${event}`)),
    setSourceIfEmpty: jest.fn(async (userId, source) => { if (!sources.has(userId)) sources.set(userId, source); })
  };
  const has = (userId, event) => events.has(`${userId}:${event}`);
  return { service: new FunnelService(repository), repository, events, sources, has };
}

// Таблица users в памяти за UserRepository: то, что делают регистрация, триал и чтение настроек
function makeUserRepository() {
  const users = new Map();
  return {
    users,
    createUser: jest.fn(async (id, username, firstName, { language = 'en', timezone = 'UTC' } = {}) => {
      const row = users.get(id);
      if (row) {
        Object.assign(row, { username, first_name: firstName });
        return { ...row, is_new: false, just_created: false };
      }
      const created = {
        id, username, first_name: firstName, language, timezone, currency: 'USD', period_start_day: 1,
        premium: false, premium_expires_at: null, premium_activated_at: null, has_trial: true, is_admin: false, family_mode: false
      };
      users.set(id, created);
      return { ...created, is_new: true, just_created: true };
    }),
    getUserById: jest.fn(async (id) => (users.has(id) ? { ...users.get(id) } : undefined)),
    getUserLanguage: jest.fn(async (id) => (users.get(id) || {}).language || 'en'),
    getUserCurrency: jest.fn(async (id) => (users.get(id) || {}).currency || 'USD'),
    getUserTimezone: jest.fn(async (id) => (users.get(id) || {}).timezone || 'UTC'),
    getUserPeriodStartDay: jest.fn(async (id) => (users.get(id) || {}).period_start_day || 1),
    isUserAdmin: jest.fn(async (id) => !!(users.get(id) || {}).is_admin),
    query: jest.fn(async (sql, params) => {
      const row = users.get(params[0]) || users.get(params[1]);
      if (/SET has_trial = FALSE/.test(sql)) {
        if (row.has_trial && !row.premium_activated_at) {
          row.has_trial = false;
          return { rowCount: 1, rows: [{ id: row.id }] };
        }
        return { rowCount: 0, rows: [] };
      }
      if (/premium_activated_at = COALESCE/.test(sql)) {
        const [expiresAt, , now] = params;
        Object.assign(row, { premium: true, premium_expires_at: expiresAt, premium_activated_at: row.premium_activated_at || now });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    })
  };
}

function makeUserService() {
  const userRepository = makeUserRepository();
  const funnel = makeFunnel();
  const premiumTransactionRepository = { createTransaction: jest.fn(async () => ({ id: 1 })) };
  const userService = new UserService(userRepository, {}, premiumTransactionRepository, funnel.service);
  return { userService, userRepository, funnel, premiumTransactionRepository };
}

describe('registration: language and timezone from Telegram, trial_started', () => {
  test.each([
    ['ru', 'ru', 'Europe/Moscow'],
    ['uk', 'ru', 'Europe/Moscow'],
    ['be', 'ru', 'Europe/Moscow'],
    ['kk', 'kz', 'Asia/Almaty'],
    ['uz', 'uz', 'Asia/Tashkent'],
    ['ka', 'ka', 'Asia/Tbilisi'],
    ['tr', 'tr', 'Europe/Istanbul'],
    ['ja', 'jp', 'Asia/Tokyo'],
    ['pt-br', 'pt', 'Europe/Lisbon'],
    ['en', 'en', 'UTC'],
    ['xx', 'en', 'UTC'],
    [undefined, 'en', 'UTC']
  ])('Telegram %p → language %s, timezone %s saved on the new row', async (code, language, timezone) => {
    const { userService, userRepository } = makeUserService();
    const registered = await userService.registerUser(5, 'u', 'U', { language: localizationService.resolveTelegramLanguage(code) });
    expect(registered).toMatchObject({ isNew: true, language, timezone });
    expect(userRepository.users.get(5)).toMatchObject({ language, timezone });
  });

  test('new user: source, «registered» and «trial_started»; a second call changes nothing', async () => {
    const { userService, userRepository, funnel } = makeUserService();
    const first = await userService.registerUser(7, 'u', 'U', { language: 'kz', source: 'split' });
    expect(first).toMatchObject({ isNew: true, trialGranted: true });
    expect(userRepository.users.get(7).premium_expires_at.getTime()).toBeGreaterThan(Date.now() + 13 * 24 * HOUR);
    expect(funnel.has(7, 'registered')).toBe(true);
    expect(funnel.has(7, 'trial_started')).toBe(true);
    expect(funnel.sources.get(7)).toBe('split');

    // Пользователь уже есть (сменил язык в настройках): повторная регистрация язык и пояс не трогает
    userRepository.users.get(7).language = 'de';
    funnel.repository.track.mockClear();
    const again = await userService.registerUser(7, 'u', 'U', { language: 'ru', source: 'ads' });
    expect(again).toMatchObject({ isNew: false, trialGranted: false, language: 'de', timezone: 'Asia/Almaty' });
    expect(funnel.repository.track).not.toHaveBeenCalled();
    expect(funnel.sources.get(7)).toBe('split');
  });

  test('funnel knows the new steps', async () => {
    const { service, has } = makeFunnel();
    await service.track(1, 'trial_started');
    await service.track(1, 'nudge_sent');
    expect(has(1, 'trial_started') && has(1, 'nudge_sent')).toBe(true);
  });
});

describe('Mini App opened before /start', () => {
  const TOKEN = '123456:TEST-token';
  const ID = 4242;
  const auth = (languageCode) => `tma ${signInitData({
    auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE',
    user: JSON.stringify({ id: ID, first_name: 'Айгерим', username: 'aig', language_code: languageCode })
  }, TOKEN)}`;

  function server() {
    const { userService, userRepository, funnel } = makeUserService();
    const services = {
      userService,
      localizationService,
      premiumService: { isPremiumUser: async (id) => (await userService.getPremiumStatus(id)).isPremium },
      familyService: { getUserFamily: async () => null },
      budgetService: { scopeFor: async (id) => id },
      familyRepository: {}
    };
    const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
    return { app, userService, userRepository, funnel };
  }

  test('/api/me registers the user like /start: trial, language and timezone from initData, source «miniapp»', async () => {
    const { app, userRepository, funnel } = server();
    const res = await request(app).get('/api/me').set('Authorization', auth('kk'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lang: 'kz', timezone: 'Asia/Almaty', user: { id: ID, firstName: 'Айгерим', username: 'aig' } });
    expect(res.body.premium.active).toBe(true);
    expect(res.body.premium.daysRemaining).toBe(14);
    expect(userRepository.users.get(ID)).toMatchObject({ language: 'kz', timezone: 'Asia/Almaty', has_trial: false });
    expect(funnel.sources.get(ID)).toBe('miniapp');
    expect(funnel.has(ID, 'registered') && funnel.has(ID, 'trial_started')).toBe(true);

    // Повторное открытие — уже существующий пользователь, ничего не создаётся
    userRepository.createUser.mockClear();
    const again = await request(app).get('/api/me').set('Authorization', auth('en'));
    expect(again.status).toBe(200);
    expect(again.body.lang).toBe('kz');
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });
});

// users, траты и шаги воронки в памяти: выборки понимают условия, которые важны здесь, как Postgres
function makeWorld(now) {
  const users = new Map();
  const expenses = new Map();
  const funnel = makeFunnel();
  const add = (id, { timezone = 'Europe/Moscow', language = 'ru', registeredHoursAgo = 30, spent = 0, blocked = false, reminders = undefined } = {}) => {
    users.set(id, {
      id, timezone, language, reminder_enabled: true, reminder_hours: null, reminder_sent_today_hours: null,
      last_reminder_local_date: null, blocked_at: blocked ? new Date() : null,
      created_at: new Date(now.current.getTime() - registeredHoursAgo * HOUR),
      onboarding_answers: reminders ? { answers: { reminders } } : null
    });
    expenses.set(id, spent);
  };
  const userRepository = {
    query: jest.fn(async (sql, params = []) => {
      const all = [...users.values()].filter(u => !u.blocked_at || !/blocked_at IS NULL/.test(sql));
      if (/nudge_sent/.test(sql)) {
        const [after, until] = params;
        const ageHours = (u) => (now.current - u.created_at) / HOUR;
        return {
          rows: all.filter(u => ageHours(u) >= after && ageHours(u) < until && expenses.get(u.id) === 0
            && !(u.onboarding_answers && u.onboarding_answers.answers.reminders === 'no') && !funnel.has(u.id, 'nudge_sent'))
            .map(u => ({ id: u.id, timezone: u.timezone, language: u.language }))
        };
      }
      const withExpenses = /EXISTS \(SELECT 1 FROM expenses e WHERE e\.user_id = users\.id\)/.test(sql);
      return { rows: all.filter(u => u.reminder_enabled && (!withExpenses || expenses.get(u.id) > 0)).map(u => ({ ...u })) };
    })
  };
  const sent = [];
  const notificationService = {
    localizationService,
    sendMessage: jest.fn(async (id, text) => { sent.push({ id, text }); })
  };
  const userService = {
    userRepository,
    updateLastReminderLocalDate: jest.fn(async (id, date) => { users.get(id).last_reminder_local_date = date; }),
    setReminderSentTodayHours: jest.fn(async (id, hours) => { users.get(id).reminder_sent_today_hours = hours; })
  };
  const deps = { userService, notificationService, funnelService: funnel.service, expenseService: { hasAnyExpenseToday: async () => false } };
  return { users, expenses, funnel, add, sent, deps };
}

describe('users without expenses: no daily reminders, one nudge a day later in the daytime', () => {
  test('zero expenses — no daily reminder at the reminder hour; with expenses — the reminder comes', async () => {
    const now = { current: new Date('2026-11-13T18:00:00Z') }; // 21:00 в Москве — час напоминания по умолчанию
    const world = makeWorld(now);
    world.add(1, { spent: 0 });
    world.add(2, { spent: 3 });
    await sendReminders(world.deps, now.current);
    expect(world.sent.map(s => s.id)).toEqual([2]);
  });

  test('exactly one nudge after 24 h, only between 10:00 and 20:59 local time; text with an example', async () => {
    const now = { current: new Date('2026-11-13T05:00:00Z') };
    const world = makeWorld(now);
    const registeredAt = new Date('2026-11-12T08:00:00Z'); // 11:00 в Москве
    world.add(1, { registeredHoursAgo: (now.current - registeredAt) / HOUR });
    const run = async (iso) => { now.current = new Date(iso); return sendFirstExpenseNudges(world.deps, now.current); };

    expect(await run('2026-11-13T05:00:00Z')).toBe(0); // 21 ч после регистрации
    expect(await run('2026-11-13T07:30:00Z')).toBe(0); // 23,5 ч
    expect(await run('2026-11-13T08:30:00Z')).toBe(1); // 24,5 ч, 11:30 в Москве
    expect(world.sent).toEqual([{ id: 1, text: t('ru', 'nudge_first_expense') }]);
    expect(t('ru', 'nudge_first_expense')).toContain('`250 кофе`');
    expect(world.funnel.has(1, 'nudge_sent')).toBe(true);
    expect(await run('2026-11-13T09:30:00Z')).toBe(0);
    expect(await run('2026-11-14T08:30:00Z')).toBe(0);
    expect(world.sent).toHaveLength(1);
  });

  test('a day later it is night there — the nudge waits for 10:00 local time', async () => {
    const now = { current: new Date('2026-11-13T13:30:00Z') }; // 22:30 в Токио
    const world = makeWorld(now);
    world.add(1, { timezone: 'Asia/Tokyo', language: 'jp', registeredHoursAgo: 24.5 });
    expect(await sendFirstExpenseNudges(world.deps, now.current)).toBe(0);
    now.current = new Date('2026-11-14T00:30:00Z'); // 09:30 в Токио
    expect(await sendFirstExpenseNudges(world.deps, now.current)).toBe(0);
    now.current = new Date('2026-11-14T01:30:00Z'); // 10:30 в Токио
    expect(await sendFirstExpenseNudges(world.deps, now.current)).toBe(1);
    expect(world.sent[0]).toEqual({ id: 1, text: t('jp', 'nudge_first_expense') });
  });

  test('no nudge: already recorded, blocked the bot, said «no reminders», registered long ago; a failed send is retried', async () => {
    const now = { current: new Date('2026-11-13T09:00:00Z') }; // 12:00 в Москве
    const world = makeWorld(now);
    world.add(1, { spent: 1 });
    world.add(2, { blocked: true });
    world.add(3, { reminders: 'no' });
    world.add(4, { registeredHoursAgo: 24 * 5 });
    world.add(5, {});
    world.deps.notificationService.sendMessage.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    expect(await sendFirstExpenseNudges(world.deps, now.current)).toBe(0);
    expect(world.funnel.has(5, 'nudge_sent')).toBe(false);
    now.current = new Date('2026-11-13T10:00:00Z');
    expect(await sendFirstExpenseNudges(world.deps, now.current)).toBe(1);
    expect(world.sent.map(s => s.id)).toEqual([5]);
  });
});
