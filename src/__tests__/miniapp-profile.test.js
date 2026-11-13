// Mini App, раздел «Ещё»: настройки, семья, премиум и оплата Stars, приглашения, справка, админка — поведение API
// (доступ только своему, проверки ввода, премиум 402, правила бота) и общие с ботом методы сервисов.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const AdminService = require('../services/AdminService');
const PaymentService = require('../services/PaymentService');
const FamilyService = require('../services/FamilyService');
const { strings } = require('../miniapp/i18n');
const profileStrings = require('../miniapp/i18n/profile');
const RateLimiter = require('../utils/rateLimiter');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' }) }, TOKEN)}`;
// Платёж в виде AdminService.listPayments / getPayment
const payment = {
  kind: 'premium', id: 100, userId: 2, username: 'yulia', firstName: 'Юля', stars: 149, status: 'paid', chargeId: 'stxpci2oh12-abc',
  at: new Date('2026-11-12T17:43:57Z'), days: 30, recurring: true, family: false
};

function makeServices({ premium = true, family = null, admin = false, subscription = null } = {}) {
  const sent = [];
  const services = {
    localizationService: new LocalizationService(),
    userService: {
      getUserLanguage: jest.fn(async () => 'ru'), getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1,
      getUserById: jest.fn(async (id) => ({ id, first_name: 'Ilya', family_mode: false, premium_expires_at: null })),
      isUserAdmin: jest.fn(async () => admin),
      getReminderSettings: jest.fn(async () => ({ reminder_enabled: true, reminder_hours: null, daily_summary_enabled: false, daily_summary_hour: null, weekly_insight_enabled: true })),
      setReminderEnabled: jest.fn(async () => {}), setReminderHours: jest.fn(async () => {}), setDailySummaryHour: jest.fn(async () => {}),
      setDailySummaryEnabled: jest.fn(async () => {}), setWeeklyInsightEnabled: jest.fn(async () => {}),
      setUserLanguage: jest.fn(async () => {}), setUserCurrency: jest.fn(async () => {}), setUserTimezone: jest.fn(async () => {}), setUserPeriodStartDay: jest.fn(async () => {}),
      setFamilyMode: jest.fn(async () => {}),
      getActiveRecurringSubscription: jest.fn(async () => subscription),
      getUserTransactions: jest.fn(async () => [])
    },
    premiumService: { isPremiumUser: jest.fn(async () => premium) },
    enhancedValidator: { validateCurrency: (c) => ({ isValid: ['RUB', 'USD', 'EUR'].includes(c) }) },
    dailyPlanService: { getSettings: async () => ({ enabled: true, hour: 8 }), setEnabled: jest.fn(async () => {}), setHour: jest.fn(async (id, h) => [6, 7, 8, 9, 10, 11].includes(h)) },
    quizService: { getInvitesEnabled: async () => true, setInvitesEnabled: jest.fn(async () => {}) },
    roastService: {
      settings: { level: 'off', gender: null, adultConfirmed: false },
      async getSettings() { return { ...this.settings }; },
      savageAllowed: jest.fn(async () => true),
      setLevel: jest.fn(async function (id, level) { services.roastService.settings.level = level; }),
      setGender: jest.fn(async function (id, gender) { services.roastService.settings.gender = gender; }),
      confirmAdult: jest.fn(async () => { services.roastService.settings.adultConfirmed = true; }),
      sampleLine: () => '😈 Бургер за 500 \\_ ₽'
    },
    commandHandlers: { mainKeyboardMarkup: jest.fn(async () => ({ keyboard: [] })) },
    notificationService: { sendMessage: jest.fn(async (...args) => { sent.push(args); }) },
    familyService: {
      getUserFamily: jest.fn(async () => family),
      getPendingInvitations: jest.fn(async () => [{ invite_code: 'ABCD1234', family_name: 'Ивановы', inviter_first_name: 'Аня', expires_at_utc: new Date() }]),
      getActiveInvitations: jest.fn(async () => []),
      createFamily: jest.fn(async (id, name) => ({ id: 7, name })),
      createInvitation: jest.fn(async () => { throw new Error('Invitation unavailable'); }),
      acceptInvitation: jest.fn(async () => ({ family: { id: 7, name: 'Ивановы' }, familyPremium: null })),
      getRemovableMember: jest.fn(async (owner, id) => { if (Number(id) !== 2) throw new Error('User is not a member of this family'); return { id: 2 }; }),
      removeMemberFromFamily: jest.fn(async () => ({})),
      leaveFamily: jest.fn(async () => ({ name: 'Ивановы', lostFamilyPremium: true }))
    },
    familyRepository: { getFamilyMembers: async () => [{ id: ME, first_name: 'Ilya', role: 'owner', joined_at_utc: new Date() }, { id: 2, username: 'yulia', role: 'member', joined_at_utc: new Date() }] },
    familyPremiumService: {
      inheritedPlan: async () => null, dependsOnFamily: async () => false,
      getOwnerStatus: jest.fn(async () => ({ family, isOwner: !!family && Number(family.owner_id) === ME, members: 2, pending: 0, planExpiresAt: null, planActive: false }))
    },
    budgetService: { moveToFamily: jest.fn(async () => 1) },
    achievementService: { track: jest.fn(async () => '') },
    paymentService: {
      createInvoiceLink: jest.fn(async () => 'https://t.me/$invoice'),
      createDonation: jest.fn(async (id, stars) => (stars <= 2500 ? { id: 5 } : null)),
      createDonationInvoiceLink: jest.fn(async () => 'https://t.me/$donation'),
      cancelActiveSubscription: jest.fn(async () => true),
      refundStarsPayment: jest.fn(async () => true),
      revokeRefundedPayment: jest.fn(async () => ({ status: 'refunded', premiumUntil: new Date('2027-09-12T14:06:34Z') }))
    },
    bot: { botInfo: { username: 'ExpensesAssistant_bot' } },
    formatter: { currencyUtils: { convert: async (amount) => amount * 90 } },
    adminService: {
      submitBugReport: jest.fn(async (id, text) => (text.length > 1000 ? { ok: false, error: 'too_long', excess: text.length - 1000 } : { ok: true })),
      getUserDetails: jest.fn(async (id) => (id === 2 ? { user: { id: 2, first_name: 'Юля', premium: false, is_admin: false, timezone: 'UTC' }, premiumStatus: { isPremium: false }, expenseStats: { totalExpenses: 3 }, recentTransactions: [], recentBugReports: [] } : null)),
      grantPremium: jest.fn(async () => ({})), revokePremium: jest.fn(async () => {}),
      listPayments: jest.fn(async ({ page = 1 }) => ({ items: [payment], total: 1, page, totalPages: 1 })),
      getPayment: jest.fn(async (kind, id) => (kind === 'premium' && id === 100 ? payment : (kind === 'premium' && id === 101 ? { ...payment, id: 101, status: 'refunded' } : null))),
      sendBroadcastMessage: jest.fn(async () => ({ total: 2, sent: 2, failed: 0 }))
    },
    referralService: {
      getOrCreateCode: async () => 'k3m9x2p', getStats: async () => ({ invited: 2, activated: 1, days: 30, maxDays: 300, capped: false }),
      rewardDays: 30, config: { ACTIVATION_EXPENSES: 3, ACTIVATION_DAYS: 2 }
    },
    funnelService: { track: jest.fn(async () => {}) },
    rateLimiter: new RateLimiter()
  };
  return { services, sent };
}

function server(options) {
  const { services, sent } = makeServices(options);
  const get = (name) => services[name];
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get }).app, services, sent };
}

describe('mini app profile strings', () => {
  test('every language has the same keys, placeholders match Russian, the slice is served', () => {
    const ru = profileStrings.ru;
    const placeholders = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join();
    for (const [lang, table] of Object.entries(profileStrings)) {
      expect(Object.keys(table).sort()).toEqual(Object.keys(ru).sort());
      for (const key of Object.keys(ru)) expect([lang, key, placeholders(table[key])]).toEqual([lang, key, placeholders(ru[key])]);
    }
    expect(strings('ru', new LocalizationService())).toMatchObject({ prof_settings_title: 'Настройки', error_invite_unavailable: expect.any(String), error_invite_limit: expect.any(String) });
  });
});

describe('settings API', () => {
  test('settings show the bot values; reminders keep at most three hours, null resets to default', async () => {
    const { app, services } = server();
    const res = await request(app).get('/api/settings').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ language: 'ru', currency: 'RUB', startDay: 1, reminders: { enabled: true, hours: [21], custom: false, max: 3 }, dailySummary: { enabled: false, hour: expect.any(Number) }, dailyPlan: { enabled: true, hour: 8 }, quizInvites: true, roast: { level: 'off' } });
    expect(res.body.roast.levels.map(l => l.value)).toEqual(['off', 'spicy', 'savage']);

    await request(app).put('/api/settings/reminders').set('Authorization', auth()).send({ hours: [9, 12, 18, 21] }).expect(400, { error: 'reminder_hours_limit' });
    await request(app).put('/api/settings/reminders').set('Authorization', auth()).send({ hours: [25] }).expect(400);
    await request(app).put('/api/settings/reminders').set('Authorization', auth()).send({ hours: [18, 9, 9] }).expect(200);
    expect(services.userService.setReminderHours).toHaveBeenLastCalledWith(ME, [9, 18]);
    await request(app).put('/api/settings/reminders').set('Authorization', auth()).send({ hours: null, enabled: false }).expect(200);
    expect(services.userService.setReminderHours).toHaveBeenLastCalledWith(ME, null);
    expect(services.userService.setReminderEnabled).toHaveBeenCalledWith(ME, false);

    await request(app).put('/api/settings/daily-summary').set('Authorization', auth()).send({ hour: 22 }).expect(200);
    expect(services.userService.setDailySummaryHour).toHaveBeenCalledWith(ME, 22);
    await request(app).put('/api/settings/daily-plan').set('Authorization', auth()).send({ hour: 15 }).expect(400, { error: 'bad_hour' });
  });

  test('language, currency and period start are validated; a new language refreshes the chat keyboard', async () => {
    const { app, services, sent } = server();
    await request(app).put('/api/settings/language').set('Authorization', auth()).send({ language: 'xx' }).expect(400);
    await request(app).put('/api/settings/language').set('Authorization', auth()).send({ language: 'en' }).expect(200);
    expect(services.userService.setUserLanguage).toHaveBeenCalledWith(ME, 'en');
    expect(services.commandHandlers.mainKeyboardMarkup).toHaveBeenCalledWith(ME, 'en');
    expect(sent[0][0]).toBe(ME);

    await request(app).put('/api/settings/currency').set('Authorization', auth()).send({ currency: 'XYZ' }).expect(400, { error: 'bad_currency' });
    await request(app).put('/api/settings/currency').set('Authorization', auth()).send({ currency: 'USD' }).expect(200);
    await request(app).put('/api/settings/period-start').set('Authorization', auth()).send({ day: 32 }).expect(400);
    await request(app).put('/api/settings/period-start').set('Authorization', auth()).send({ day: 25 }).expect(200, { startDay: 25 });
  });

  test('time zone — as the bot: the user picks their current time, a fixed zone is saved', async () => {
    const { app, services } = server();
    const now = new Date();
    const local = new Date(now.getTime() + 7 * 3600000);
    const res = await request(app).put('/api/settings/timezone').set('Authorization', auth())
      .send({ hour: local.getUTCHours(), minute: local.getUTCMinutes() }).expect(200);
    expect(res.body.timezone).toBe('Etc/GMT-7');
    expect(services.userService.setUserTimezone).toHaveBeenCalledWith(ME, 'Etc/GMT-7');
    await request(app).put('/api/settings/timezone').set('Authorization', auth()).send({ hour: 24, minute: 0 }).expect(400);
  });

  test('roast mode: gender first, uncensored needs a one-time 18+ confirmation, a sample comes without Markdown', async () => {
    const { app, services } = server();
    await request(app).put('/api/settings/roast').set('Authorization', auth()).send({ level: 'spicy' }).expect(400, { error: 'roast_gender_required' });
    const spicy = await request(app).put('/api/settings/roast').set('Authorization', auth()).send({ level: 'spicy', gender: 'f' }).expect(200);
    expect(spicy.body).toMatchObject({ level: 'spicy', gender: 'f', sample: '😈 Бургер за 500 _ ₽' });
    await request(app).put('/api/settings/roast').set('Authorization', auth()).send({ level: 'savage' }).expect(400, { error: 'roast_adult_required' });
    await request(app).put('/api/settings/roast').set('Authorization', auth()).send({ level: 'savage', adult: true }).expect(200);
    expect(services.roastService.confirmAdult).toHaveBeenCalled();
    services.roastService.savageAllowed.mockResolvedValueOnce(false);
    services.roastService.settings.level = 'spicy';
    await request(app).put('/api/settings/roast').set('Authorization', auth()).send({ level: 'savage' }).expect(402);
  });

  test('bug report goes through the same checks as the bot', async () => {
    const { app, services } = server();
    await request(app).post('/api/bug-reports').set('Authorization', auth()).send({ text: 'x'.repeat(1001) }).expect(400, { error: 'bug_report_too_long', excess: 1 });
    await request(app).post('/api/bug-reports').set('Authorization', auth()).send({ text: 'Не открывается обзор' }).expect(201);
    expect(services.adminService.submitBugReport).toHaveBeenLastCalledWith(ME, 'Не открывается обзор');
  });
});

describe('family API', () => {
  const ownFamily = { id: 7, name: 'Ивановы', owner_id: ME, owner_first_name: 'Ilya' };

  test('without a family — invitations addressed to me; creating needs premium unless it is for the family plan', async () => {
    const { app, services } = server({ premium: false });
    const res = await request(app).get('/api/family').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ premium: false, family: null, pending: [{ code: 'ABCD1234', familyName: 'Ивановы', inviterName: 'Аня' }] });
    await request(app).post('/api/family').set('Authorization', auth()).send({ name: 'Мы' }).expect(400, { error: 'family_name_too_short' });
    await request(app).post('/api/family').set('Authorization', auth()).send({ name: 'Ивановы' }).expect(402);
    await request(app).post('/api/family').set('Authorization', auth()).send({ name: 'Ивановы', plan: true }).expect(201);
    expect(services.familyService.createFamily).toHaveBeenCalledWith(ME, 'Ивановы');

    await request(app).post('/api/family/invitations/abcd1234/accept').set('Authorization', auth()).expect(200);
    expect(services.familyService.acceptInvitation).toHaveBeenCalledWith(ME, 'ABCD1234');
    expect(services.achievementService.track).toHaveBeenCalledWith(ME, 'family_joined', { lang: 'ru' });
  });

  test('owner: invitation errors map to codes, only own members can be removed, family mode moves budgets', async () => {
    const { app, services, sent } = server({ family: ownFamily });
    const res = await request(app).get('/api/family').set('Authorization', auth()).expect(200);
    expect(res.body.family).toMatchObject({ isOwner: true, mode: false, members: [{ id: ME, role: 'owner' }, { id: 2, name: 'yulia' }] });

    await request(app).post('/api/family/invitations').set('Authorization', auth()).send({ username: '@yulia' }).expect(409, { error: 'invite_unavailable' });
    expect(services.familyService.createInvitation).toHaveBeenCalledWith(ME, 'yulia');

    await request(app).delete('/api/family/members/99').set('Authorization', auth()).expect(404);
    expect(services.familyService.removeMemberFromFamily).not.toHaveBeenCalled();
    await request(app).delete('/api/family/members/2').set('Authorization', auth()).expect(200);
    expect(services.familyService.removeMemberFromFamily).toHaveBeenCalledWith(ME, 2);

    await request(app).put('/api/family/mode').set('Authorization', auth()).send({ enabled: true }).expect(200, { mode: true });
    expect(services.userService.setFamilyMode).toHaveBeenCalledWith(ME, true);
    expect(services.budgetService.moveToFamily).toHaveBeenCalledWith(ME, 7);
    expect(sent).toHaveLength(1);
  });

  test('family export: all family expenses as a CSV document in the bot chat; nothing to export — 404', async () => {
    const { app, services } = server({ family: { id: 7, name: 'Мы & Ко', owner_id: 5 } });
    services.familyService.getAllFamilyExpenses = jest.fn(async () => []);
    await request(app).post('/api/family/export').set('Authorization', auth()).expect(404, { error: 'no_family_expenses' });
    services.familyService.getAllFamilyExpenses = jest.fn(async () => [{ id: 1 }, { id: 2 }]);
    services.formatter.formatCSV = jest.fn(async () => 'a;b\n');
    services.bot.telegram = { sendDocument: jest.fn(async () => ({})) };
    await request(app).post('/api/family/export').set('Authorization', auth()).expect(200, { sent: true, count: 2 });
    expect(services.familyService.getAllFamilyExpenses).toHaveBeenCalledWith(7);
    const [chat, file] = services.bot.telegram.sendDocument.mock.calls[0];
    expect(chat).toBe(ME);
    expect(file.filename).toMatch(/^family_expenses_Мы_Ко_\d{4}-\d{2}-\d{2}\.csv$/);

    const free = server({ premium: false, family: { id: 7, name: 'Мы', owner_id: 5 } });
    await request(free.app).post('/api/family/export').set('Authorization', auth()).expect(402);
  });

  test('a member cannot manage the family; without premium management is 402', async () => {
    const memberFamily = { id: 7, name: 'Ивановы', owner_id: 5 };
    const { app } = server({ family: memberFamily });
    await request(app).delete('/api/family/members/2').set('Authorization', auth()).expect(403, { error: 'not_family_owner' });
    await request(app).delete('/api/family').set('Authorization', auth()).expect(403);
    const left = await request(app).post('/api/family/leave').set('Authorization', auth()).expect(200);
    expect(left.body).toEqual({ name: 'Ивановы', lostFamilyPremium: true });

    const free = server({ premium: false, family: ownFamily });
    await request(free.app).put('/api/family/mode').set('Authorization', auth()).send({ enabled: true }).expect(402);
    await request(free.app).post('/api/family/invitations').set('Authorization', auth()).send({ username: 'yulia' }).expect(402);
  });

  test('family plan invoice — only the owner; the monthly one is not offered while a Stars subscription is active', async () => {
    const owner = server({ family: ownFamily, subscription: { subscription_expires_at: new Date() } });
    const plan = await request(owner.app).get('/api/family/plan').set('Authorization', auth()).expect(200);
    expect(plan.body).toMatchObject({ state: 'pay', max: 5, saving: { people: 2, family: 249 } });
    expect(plan.body.tariffs.find(t => t.duration === 30).available).toBe(false);
    await request(owner.app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 30 }).expect(400, { error: 'subscription_active' });
    await request(owner.app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 45 }).expect(400, { error: 'bad_tariff' });
    const res = await request(owner.app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 90 }).expect(200);
    expect(res.body.url).toBe('https://t.me/$invoice');
    expect(owner.services.paymentService.createInvoiceLink).toHaveBeenCalledWith(ME, expect.objectContaining({ duration: 90, stars: 579 }), 'ru', { familyId: 7 });

    const member = server({ family: { id: 7, name: 'Ивановы', owner_id: 5 } });
    await request(member.app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 90 }).expect(403);
  });
});

describe('premium API', () => {
  test('personal invoice uses the bot tariffs; monthly is refused while subscribed; donation is validated', async () => {
    const { app, services } = server();
    const tariffs = await request(app).get('/api/premium/tariffs').set('Authorization', auth()).expect(200);
    expect(tariffs.body.tariffs.map(t => [t.duration, t.stars])).toEqual([[30, 149], [90, 349], [180, 599], [365, 999]]);
    expect(tariffs.body.tariffs[3]).toMatchObject({ percent: 44, fullStars: 1788, price: 1799.1 });
    expect(services.funnelService.track).toHaveBeenCalledWith(ME, 'tariffs_viewed');

    await request(app).post('/api/premium/invoice').set('Authorization', auth()).send({ duration: 365 }).expect(200, { url: 'https://t.me/$invoice' });
    expect(services.paymentService.createInvoiceLink).toHaveBeenCalledWith(ME, expect.objectContaining({ duration: 365, stars: 999 }), 'ru');

    const subscribed = server({ subscription: { subscription_expires_at: new Date() } });
    await request(subscribed.app).post('/api/premium/invoice').set('Authorization', auth()).send({ duration: 30 }).expect(400, { error: 'subscription_active' });

    await request(app).post('/api/premium/donate').set('Authorization', auth()).send({ stars: 0 }).expect(400, { error: 'donate_invalid' });
    await request(app).post('/api/premium/donate').set('Authorization', auth()).send({ stars: 50, message: 'спасибо' }).expect(200, { url: 'https://t.me/$donation' });
    expect(services.paymentService.createDonation).toHaveBeenCalledWith(ME, 50, 'спасибо');
  });

  test('invite: personal link and share url to the bot', async () => {
    const { app } = server();
    const res = await request(app).get('/api/invite').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({ link: 'https://t.me/ExpensesAssistant_bot?start=ref_k3m9x2p', days: 30, stats: { invited: 2, activated: 1 } });
    expect(res.body.shareUrl).toMatch(/^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Ft\.me%2FExpensesAssistant_bot%3Fstart%3Dref_k3m9x2p&text=/);
  });
});

describe('per-endpoint limits (shared rateLimiter)', () => {
  const ownFamily = { id: 7, name: 'Ивановы', owner_id: ME, owner_first_name: 'Ilya' };

  test('invitations: one generic error for not found / not premium / another family, 429 over the daily limit', async () => {
    const { app, services } = server({ family: ownFamily });
    await request(app).post('/api/family/invitations').set('Authorization', auth()).send({ username: 'yu' }).expect(409, { error: 'invite_unavailable' });
    expect(services.familyService.createInvitation).not.toHaveBeenCalled();
    services.familyService.createInvitation.mockRejectedValueOnce(new Error('Invitation limit reached'));
    await request(app).post('/api/family/invitations').set('Authorization', auth()).send({ username: 'yulia' }).expect(429, { error: 'invite_limit' });
    services.familyService.createInvitation.mockRejectedValueOnce(new Error('User already has a pending invitation'));
    await request(app).post('/api/family/invitations').set('Authorization', auth()).send({ username: 'yulia' }).expect(409, { error: 'user_already_has_invitation' });
  });

  test('language and family mode (both message the chat) share 10 changes a minute', async () => {
    const { app, services, sent } = server({ family: ownFamily });
    for (let i = 0; i < 9; i++) await request(app).put('/api/settings/language').set('Authorization', auth()).send({ language: i % 2 ? 'ru' : 'en' }).expect(200);
    await request(app).put('/api/family/mode').set('Authorization', auth()).send({ enabled: true }).expect(200);
    const over = await request(app).put('/api/settings/language').set('Authorization', auth()).send({ language: 'de' }).expect(429);
    expect(over.body).toMatchObject({ error: 'rate', retryAfter: expect.any(Number) });
    await request(app).put('/api/family/mode').set('Authorization', auth()).send({ enabled: false }).expect(429);
    expect(sent).toHaveLength(10);
    expect(services.userService.setUserLanguage).not.toHaveBeenCalledWith(ME, 'de');
    // Другой пользователь — свой счётчик
    await request(app).put('/api/settings/language').set('Authorization', auth(5)).send({ language: 'de' }).expect(200);
  });

  test('family export shares the bot export limit (5 files in 5 minutes)', async () => {
    const { app, services } = server({ family: { id: 7, name: 'Мы', owner_id: 5 } });
    services.familyService.getAllFamilyExpenses = jest.fn(async () => [{ id: 1 }]);
    services.formatter.formatCSV = jest.fn(async () => 'a;b\n');
    services.bot.telegram = { sendDocument: jest.fn(async () => ({})) };
    for (let i = 0; i < 4; i++) services.rateLimiter.checkLimit(ME, 'export'); // кнопки xp|… в боте
    await request(app).post('/api/family/export').set('Authorization', auth()).expect(200);
    await request(app).post('/api/family/export').set('Authorization', auth()).expect(429, { error: 'export_rate', retryAfter: 300 });
    expect(services.bot.telegram.sendDocument).toHaveBeenCalledTimes(1);
  });

  test('invoices and donations: 10 a minute together, then 429 without asking Telegram', async () => {
    const { app, services } = server({ family: ownFamily });
    for (let i = 0; i < 4; i++) await request(app).post('/api/premium/invoice').set('Authorization', auth()).send({ duration: 365 }).expect(200);
    for (let i = 0; i < 3; i++) await request(app).post('/api/premium/donate').set('Authorization', auth()).send({ stars: 50 }).expect(200);
    for (let i = 0; i < 3; i++) await request(app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 90 }).expect(200);
    await request(app).post('/api/premium/invoice').set('Authorization', auth()).send({ duration: 365 }).expect(429);
    await request(app).post('/api/premium/donate').set('Authorization', auth()).send({ stars: 50 }).expect(429);
    await request(app).post('/api/family/plan/invoice').set('Authorization', auth()).send({ duration: 90 }).expect(429);
    expect(services.paymentService.createInvoiceLink).toHaveBeenCalledTimes(7);
    expect(services.paymentService.createDonation).toHaveBeenCalledTimes(3);
  });
});

describe('admin API', () => {
  test('only admins; unknown user is 404; grant days from the list; revoke also cancels the Stars subscription', async () => {
    const user = server();
    await request(user.app).get('/api/admin/users/2').set('Authorization', auth()).expect(403);
    expect(user.services.adminService.getUserDetails).not.toHaveBeenCalled();

    const { app, services } = server({ admin: true });
    await request(app).get('/api/admin/users/3').set('Authorization', auth()).expect(404);
    await request(app).post('/api/admin/users/2/premium').set('Authorization', auth()).send({ days: 5 }).expect(400, { error: 'bad_days' });
    await request(app).post('/api/admin/users/2/premium').set('Authorization', auth()).send({ days: 30 }).expect(200);
    expect(services.adminService.grantPremium).toHaveBeenCalledWith(2, 30, ME);
    await request(app).delete('/api/admin/users/2/premium').set('Authorization', auth()).expect(200);
    expect(services.adminService.revokePremium).toHaveBeenCalledWith(2, ME);
    expect(services.paymentService.cancelActiveSubscription).toHaveBeenCalledWith(2);
    await request(app).delete(`/api/admin/users/${ME}/admin`).set('Authorization', auth()).expect(400, { error: 'admin_cannot_demote_self' });
  });

  test('payments: search needs 4+ characters, card by kind and id, refund once — stars back to the payer, premium recalculated', async () => {
    const { app, services } = server({ admin: true });
    await request(app).get('/api/admin/payments?q=stx').set('Authorization', auth()).expect(400, { error: 'payment_query_short' });
    const list = await request(app).get('/api/admin/payments?q=oh12&user=2').set('Authorization', auth()).expect(200);
    expect(services.adminService.listPayments).toHaveBeenCalledWith(expect.objectContaining({ userId: 2, fragment: 'oh12' }));
    expect(list.body.items[0]).toMatchObject({ kind: 'premium', id: 100, stars: 149, hash: payment.chargeId, recurring: true, user: { id: 2, username: 'yulia' } });

    await request(app).get('/api/admin/payments/donation/100').set('Authorization', auth()).expect(404, { error: 'payment_not_found' });
    await request(app).post('/api/admin/payments/premium/101/refund').set('Authorization', auth()).expect(400, { error: 'payment_already_refunded' });
    expect(services.paymentService.refundStarsPayment).not.toHaveBeenCalled();

    const res = await request(app).post('/api/admin/payments/premium/100/refund').set('Authorization', auth()).expect(200);
    expect(services.paymentService.refundStarsPayment).toHaveBeenCalledWith(2, payment.chargeId);
    expect(services.paymentService.revokeRefundedPayment).toHaveBeenCalledWith(payment.chargeId);
    expect(res.body).toMatchObject({ status: 'refunded', premiumUntil: '2027-09-12T14:06:34.000Z' });
  });

  test('broadcast: length limit, runs in the background, result goes to the admin chat', async () => {
    const { app, services, sent } = server({ admin: true });
    await request(app).post('/api/admin/broadcast').set('Authorization', auth()).send({ text: 'x'.repeat(3601) }).expect(400);
    await request(app).post('/api/admin/broadcast').set('Authorization', auth()).send({ text: 'Новая версия' }).expect(202);
    await new Promise(resolve => setImmediate(resolve));
    expect(services.adminService.sendBroadcastMessage).toHaveBeenCalledWith('Новая версия', ME);
    expect(sent[0][0]).toBe(ME);
  });
});

describe('shared services', () => {
  test('AdminService.submitBugReport — rate limit, length, suspicious patterns (repeatable, no stale regex state)', async () => {
    const created = [];
    const repo = { getBugReportsByUserId: jest.fn(async () => []), createBugReport: jest.fn(async (id, text) => created.push(text)) };
    const service = new AdminService({}, {}, repo, {}, {}, null, null);
    expect(await service.submitBugReport(1, '   ')).toEqual({ ok: false, error: 'empty' });
    expect(await service.submitBugReport(1, 'y'.repeat(1005))).toEqual({ ok: false, error: 'too_long', excess: 5 });
    expect(await service.submitBugReport(1, 'hey @everyone')).toEqual({ ok: false, error: 'suspicious' });
    expect(await service.submitBugReport(1, 'hey @everyone')).toEqual({ ok: false, error: 'suspicious' });
    expect(await service.submitBugReport(1, 'Кнопка (обзор) не работает')).toEqual({ ok: true });
    expect(created).toEqual(['Кнопка (обзор) не работает']);
    const now = new Date();
    repo.getBugReportsByUserId.mockResolvedValueOnce([{ created_at: now }, { created_at: now }, { created_at: now }]);
    expect(await service.submitBugReport(1, 'ещё', now)).toEqual({ ok: false, error: 'rate_limit' });
  });

  test('PaymentService.createDonation cancels pending donations and checks limits', async () => {
    const donations = { cancelUserPendingDonations: jest.fn(async () => {}), createPendingDonation: jest.fn(async (id, stars, message) => ({ id: 9, stars, message })) };
    const service = new PaymentService(donations, null, null, null, null);
    expect(await service.createDonation(1, 2501, '')).toBeNull();
    expect(await service.createDonation(1, 10, 'x'.repeat(501))).toBeNull();
    expect(donations.cancelUserPendingDonations).not.toHaveBeenCalled();
    expect(await service.createDonation(1, 10, '  спасибо ')).toEqual({ id: 9, stars: 10, message: 'спасибо' });
    expect(donations.cancelUserPendingDonations).toHaveBeenCalledWith(1);
  });

  test('FamilyService.getPendingInvitations expires old invitations first', async () => {
    const order = [];
    const invitations = {
      expireOldInvitations: jest.fn(async () => order.push('expire')),
      getPendingInvitationsByInvitee: jest.fn(async () => { order.push('list'); return [{ invite_code: 'A' }]; })
    };
    const service = new FamilyService({}, invitations, {}, {}, null, {});
    expect(await service.getPendingInvitations(3)).toEqual([{ invite_code: 'A' }]);
    expect(order).toEqual(['expire', 'list']);
    expect(invitations.getPendingInvitationsByInvitee).toHaveBeenCalledWith(3);
  });
});
