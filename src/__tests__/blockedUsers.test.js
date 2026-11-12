const { TelegramError } = require('telegraf');
const { sendReminders } = require('../botCron');
const UserService = require('../services/UserService');
const NotificationService = require('../services/NotificationService');
const AdminService = require('../services/AdminService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const reachabilityMiddleware = require('../middleware/reachabilityMiddleware');
const { isUnreachableError } = require('../utils/telegramErrors');

// Пользователь заблокировал бота: Telegram отвечает 403 на каждое сообщение. Первая же такая ошибка помечает его
// (users.blocked_at), рассылки его больше не выбирают; любой апдейт из лички снимает пометку.
const tgError = (code, description) => new TelegramError({ error_code: code, description });
const blockedError = () => tgError(403, 'Forbidden: bot was blocked by the user');

// users в памяти: выборка напоминалок понимает условие blocked_at IS NULL, как Postgres
function makeWorld(ids = [1, 2]) {
  const users = new Map(ids.map(id => [id, {
    id, timezone: 'UTC', language: 'ru', reminder_enabled: true, reminder_hours: [10, 14, 18],
    reminder_sent_today_hours: null, last_reminder_local_date: null, blocked_at: null
  }]));
  const userRepository = {
    query: jest.fn(async (sql) => ({
      rows: [...users.values()]
        .filter(u => u.reminder_enabled && !(/blocked_at IS NULL/.test(sql) && u.blocked_at))
        .map(u => ({ ...u }))
    })),
    setBlocked: jest.fn(async (id) => {
      const user = users.get(Number(id));
      if (!user || user.blocked_at) return false;
      user.blocked_at = new Date();
      return true;
    }),
    clearBlocked: jest.fn(async (id) => {
      const user = users.get(Number(id));
      if (!user || !user.blocked_at) return false;
      user.blocked_at = null;
      return true;
    }),
    getAllUsersForBroadcast: jest.fn(async () => [...users.values()].map(u => ({ id: u.id, blocked: !!u.blocked_at }))),
    getUserLanguage: jest.fn(async (id) => users.get(Number(id)).language),
    updateLastReminderLocalDate: jest.fn(async (id, date) => { users.get(id).last_reminder_local_date = date; }),
    setReminderSentTodayHours: jest.fn(async (id, hours) => { users.get(id).reminder_sent_today_hours = hours; })
  };
  const userService = new UserService(userRepository, {}, {});
  const localizationService = new LocalizationService();
  const notificationService = new NotificationService(localizationService, userService, new Formatter({}));
  // Telegram: кто заблокировал бота — 403
  const blockedInTelegram = new Set();
  const telegram = {
    sendMessage: jest.fn(async (chatId) => {
      if (blockedInTelegram.has(chatId)) throw blockedError();
      return { message_id: 1 };
    })
  };
  notificationService.setBot({ telegram });
  const deps = { userService, notificationService, expenseService: { hasAnyExpenseToday: async () => false } };
  const remindAt = (hour) => sendReminders(deps, new Date(`2026-10-26T${String(hour).padStart(2, '0')}:00:00Z`));
  const sentTo = () => telegram.sendMessage.mock.calls.map(([id]) => id);
  return { users, userRepository, userService, notificationService, localizationService, telegram, blockedInTelegram, remindAt, sentTo };
}

const privateUpdate = (id, extra = {}) => ({ from: { id, is_bot: false }, chat: { id, type: 'private' }, ...extra });
const membership = (id, status) => privateUpdate(id, { myChatMember: { new_chat_member: { status } } });

describe('users who blocked the bot', () => {
  test('a 403 on a reminder flags the user; the next run skips them; a message clears the flag and reminders resume', async () => {
    const world = makeWorld();
    world.blockedInTelegram.add(1);

    expect(await world.remindAt(10)).toBe(1);
    expect(world.sentTo()).toEqual([1, 2]);
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);
    expect(world.users.get(2).blocked_at).toBeNull();

    // Следующий запуск: заблокировавшему даже не пытаемся писать
    world.telegram.sendMessage.mockClear();
    expect(await world.remindAt(14)).toBe(1);
    expect(world.sentTo()).toEqual([2]);

    // Разблокировал и написал боту — пометка снята, напоминалки снова идут
    world.blockedInTelegram.delete(1);
    const next = jest.fn();
    await reachabilityMiddleware(world.userService)(privateUpdate(1, { message: { text: 'кофе 200' } }), next);
    expect(next).toHaveBeenCalled();
    expect(world.users.get(1).blocked_at).toBeNull();

    world.telegram.sendMessage.mockClear();
    expect(await world.remindAt(18)).toBe(2);
    expect(world.sentTo()).toEqual([1, 2]);
  });

  test.each([
    ['429 Too Many Requests', () => tgError(429, 'Too Many Requests: retry after 5')],
    ['500 Internal Server Error', () => tgError(500, 'Internal Server Error')],
    ['502 Bad Gateway', () => tgError(502, 'Bad Gateway')],
    ['network error', () => Object.assign(new Error('request to https://api.telegram.org failed, reason: connect ETIMEDOUT'), { code: 'ETIMEDOUT' })],
    ['400 chat not found', () => tgError(400, 'Bad Request: chat not found')],
    ['other 403 (not about the user)', () => tgError(403, 'Forbidden: bot is not a member of the channel chat')]
  ])('%s does not flag the user and the next run tries again', async (name, error) => {
    const world = makeWorld([1]);
    world.telegram.sendMessage.mockRejectedValueOnce(error());

    expect(await world.remindAt(10)).toBe(0);
    expect(world.users.get(1).blocked_at).toBeNull();
    expect(world.userRepository.setBlocked).not.toHaveBeenCalled();

    expect(await world.remindAt(14)).toBe(1);
    expect(world.sentTo()).toEqual([1, 1]);
  });

  test('deleted account (403 user is deactivated) is flagged too', async () => {
    const world = makeWorld([1]);
    world.telegram.sendMessage.mockRejectedValueOnce(tgError(403, 'Forbidden: user is deactivated'));
    await world.remindAt(10);
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);
  });

  test('the error still reaches the caller: services log it as before', async () => {
    const world = makeWorld([1]);
    world.blockedInTelegram.add(1);
    await expect(world.notificationService.sendMessage(1, 'hi')).rejects.toThrow('bot was blocked by the user');
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);
  });

  test('error recognition: Telegraf error, plain message, and non-403', () => {
    expect(isUnreachableError(blockedError())).toBe(true);
    expect(isUnreachableError(new Error('403: Forbidden: bot was blocked by the user'))).toBe(true);
    expect(isUnreachableError(tgError(403, "Forbidden: bot can't initiate conversation with a user"))).toBe(true);
    expect(isUnreachableError(tgError(429, 'Too Many Requests: retry after 5'))).toBe(false);
    expect(isUnreachableError(new Error('bot was blocked by the user'))).toBe(false); // без кода 403 — не ответ Telegram
    expect(isUnreachableError(null)).toBe(false);
  });

  test('blocking and unblocking in Telegram (my_chat_member) set and clear the flag right away', async () => {
    const world = makeWorld([1]);
    const mw = reachabilityMiddleware(world.userService);
    const next = jest.fn();

    await mw(membership(1, 'kicked'), next);
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);
    expect(await world.remindAt(10)).toBe(0);
    expect(world.telegram.sendMessage).not.toHaveBeenCalled();

    await mw(membership(1, 'member'), next);
    expect(world.users.get(1).blocked_at).toBeNull();
    expect(await world.remindAt(14)).toBe(1);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('a message in a group does not clear the flag: the bot still cannot write to the user privately', async () => {
    const world = makeWorld([1]);
    world.users.get(1).blocked_at = new Date();
    await reachabilityMiddleware(world.userService)({ from: { id: 1, is_bot: false }, chat: { id: -100, type: 'supergroup' } }, jest.fn());
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);
  });

  test('updates do not hit the database every time: once per user, and again only after a new flag', async () => {
    const world = makeWorld([1]);
    const mw = reachabilityMiddleware(world.userService);
    for (let i = 0; i < 5; i++) await mw(privateUpdate(1), jest.fn());
    expect(world.userRepository.clearBlocked).toHaveBeenCalledTimes(1);

    world.blockedInTelegram.add(1);
    await world.remindAt(10);
    expect(world.users.get(1).blocked_at).toBeInstanceOf(Date);

    world.blockedInTelegram.delete(1);
    await mw(privateUpdate(1), jest.fn());
    await mw(privateUpdate(1), jest.fn());
    expect(world.userRepository.clearBlocked).toHaveBeenCalledTimes(2);
    expect(world.users.get(1).blocked_at).toBeNull();
  });

  test('a database error does not block the update and is retried next time', async () => {
    const world = makeWorld([1]);
    world.users.get(1).blocked_at = new Date();
    world.userRepository.clearBlocked.mockRejectedValueOnce(new Error('db down'));
    const mw = reachabilityMiddleware(world.userService);
    const next = jest.fn();
    await mw(privateUpdate(1), next);
    expect(next).toHaveBeenCalled();
    await mw(privateUpdate(1), next);
    expect(world.users.get(1).blocked_at).toBeNull();
  });

  test('broadcast: flagged users are not messaged and count as failed; a new 403 fails and flags', async () => {
    const world = makeWorld([1, 2, 3]);
    world.users.get(1).blocked_at = new Date();
    world.blockedInTelegram.add(2);
    const admin = new AdminService(world.userService, {}, {}, {}, {}, world.notificationService, world.localizationService);
    const directBot = { telegram: { sendMessage: jest.fn(async () => ({})) } };
    admin.setBot(directBot);

    expect(await admin.sendBroadcastMessage('Новая версия', 99)).toEqual({ total: 3, sent: 1, failed: 2 });
    expect(world.sentTo()).toEqual([2, 3]);
    expect(directBot.telegram.sendMessage).not.toHaveBeenCalled(); // 403 не повторяем другими способами
    expect(world.users.get(2).blocked_at).toBeInstanceOf(Date);
  });
});
