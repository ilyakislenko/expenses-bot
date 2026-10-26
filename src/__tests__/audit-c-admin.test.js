jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const AdminHandlers = require('../handlers/AdminHandlers');
const AdminService = require('../services/AdminService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

// Legacy Markdown: непарный "_" / "*" вне экранирования — Telegram отвечает "can't parse entities"
const unescapedMarkdown = (text) => /(^|[^\\])[_*`]/.test(text.replace(/\*[^*\n]*\*/g, ''));

function makeCtx({ callback = false } = {}) {
  const ctx = {
    from: { id: 1 },
    reply: jest.fn().mockResolvedValue({}),
    editMessageText: jest.fn().mockResolvedValue({}),
    answerCbQuery: jest.fn().mockResolvedValue(true)
  };
  if (callback) ctx.callbackQuery = { data: 'x', message: { message_id: 5 } };
  return ctx;
}

describe('Admin handlers (TG-5, SEC-11, TG-8, TG-10)', () => {
  let adminService;
  let userService;
  let stateService;
  let handlers;
  let localizationService;

  beforeEach(() => {
    localizationService = new LocalizationService();
    adminService = {
      isUserAdmin: jest.fn().mockResolvedValue(true),
      searchUsers: jest.fn(),
      listBugReports: jest.fn(),
      getUserDetails: jest.fn(),
      getUserStats: jest.fn()
    };
    userService = {
      getUserLanguage: jest.fn().mockResolvedValue('ru'),
      getUserTimezone: jest.fn().mockResolvedValue('Asia/Tomsk')
    };
    stateService = { setUserState: jest.fn(), getUserState: jest.fn(), deleteUserState: jest.fn() };
    handlers = new AdminHandlers(adminService, userService, localizationService, new Formatter({}), stateService, {}, {});
  });

  test('broadcast preview with "_" is sent as plain text and keeps the confirm button', async () => {
    const ctx = makeCtx();
    const text = 'Добавили команду /daily_summary — попробуйте! ' + '*'.repeat(3) + 'x'.repeat(300);
    await handlers.handleBroadcast(ctx, text);

    const [preview, extra] = ctx.reply.mock.calls[0];
    expect(extra.parse_mode).toBeUndefined();
    expect(preview).toContain('/daily_summary');
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toContain('panel_broadcast_confirm');
    expect(stateService.setUserState).toHaveBeenCalledWith(1, { type: 'admin_broadcast_confirm', data: { message: text } });
  });

  test('search results escape the query in Markdown', async () => {
    adminService.searchUsers.mockResolvedValue([{ id: 5, username: 'ivan_petrov', first_name: 'Ivan' }]);
    const ctx = makeCtx();
    await handlers.handleSearch(ctx, '@ivan_petrov_');

    const [text, extra] = ctx.reply.mock.calls[0];
    expect(extra.parse_mode).toBe('Markdown');
    expect(text).toContain('ivan\\_petrov\\_');
    expect(unescapedMarkdown(text)).toBe(false);
  });

  test('"all" and "new" bug report buttons list reports as plain text and answer the button', async () => {
    adminService.listBugReports.mockResolvedValue([
      { id: 7, user_id: 42, username: 'some_user', status: 'new', created_at: new Date('2026-10-27T03:00:00Z'), report_text: 'Кнопка *не* работает_' + 'я'.repeat(400) }
    ]);
    for (const status of [null, 'new']) {
      const ctx = makeCtx({ callback: true });
      await handlers.showBugReportList(ctx, status);

      expect(adminService.listBugReports).toHaveBeenLastCalledWith(status, 10);
      expect(ctx.answerCbQuery).toHaveBeenCalled();
      const [text, extra] = ctx.reply.mock.calls[0];
      expect(extra.parse_mode).toBeUndefined();
      expect(text).toContain('#7');
      expect(text).toContain('Кнопка *не* работает_');
      expect(text).toContain('27.10.2026, 10:00'); // Asia/Tomsk, формат ru
      expect(text.length).toBeLessThan(4096);
    }
  });

  test('panel screens answer the button press', async () => {
    adminService.getPremiumStats = jest.fn().mockRejectedValue(new Error('db')); // экран всё равно отвечает на нажатие
    const ctx = makeCtx({ callback: true });
    await handlers.showPremiumStats(ctx);
    expect(ctx.answerCbQuery).toHaveBeenCalled();
  });

  test('user details show the registration date in the admin timezone, ru format', async () => {
    adminService.getUserDetails.mockResolvedValue({
      user: { id: 5, first_name: 'Ivan', username: 'ivan', language: 'ru', currency: 'RUB', timezone: 'Europe/Moscow', premium: false, is_admin: false },
      registeredAt: new Date('2026-09-16T20:30:00Z'),
      expenseStats: { totalExpenses: 0, totalAmount: 0 },
      recentBugReports: [],
      recentTransactions: []
    });
    const ctx = makeCtx({ callback: true });
    await handlers.showUserDetails(ctx, 5);

    const [text] = ctx.reply.mock.calls[0];
    expect(text).toContain('17.09.2026, 03:30');
    expect(text).not.toContain('9/16/2026');
  });
});

describe('AdminService.sendBroadcastMessage (TG-5)', () => {
  test('a text with "_" is delivered as plain text', async () => {
    const sendMessage = jest.fn().mockResolvedValue({});
    const service = new AdminService(
      {
        getAllUsersForBroadcast: jest.fn().mockResolvedValue([{ id: 10 }, { id: 11 }]),
        getUserLanguage: jest.fn().mockResolvedValue('ru')
      },
      {}, {}, {}, {},
      { sendMessage },
      new LocalizationService()
    );

    const result = await service.sendBroadcastMessage('Новая команда /daily_summary', 1);

    expect(result).toEqual({ total: 2, sent: 2, failed: 0 });
    for (const [, text, extra] of sendMessage.mock.calls) {
      expect(text).toContain('/daily_summary');
      expect(extra).toBeUndefined();
    }
  });
});
