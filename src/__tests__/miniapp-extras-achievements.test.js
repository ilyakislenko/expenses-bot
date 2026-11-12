// Mini App «Достижения»: только свои данные, лимит челленджей (402), чужой челлендж — 404, обмен монет (не хватает,
// лимит месяца, повтор ключа не списывает дважды), проверка ввода; CoinService.quote — подтверждение обмена (и бот).
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const AchievementService = require('../services/AchievementService');
const CoinService = require('../services/CoinService');
const Formatter = require('../utils/formatter');
const { USER_LIMITS, COINS } = require('../utils/constants');
const { customPeriod, localToday } = require('../utils/period');
const RateLimiter = require('../utils/rateLimiter');

const TOKEN = '123456:TEST-token';
const OWNER = 907470387;
const OTHER = 1066875127;
const auth = (id) => `tma ${signInitData({
  auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' })
}, TOKEN)}`;

// Репозиторий достижений в памяти, по пользователям
function achievementRepository() {
  const users = new Map();
  const challenges = [];
  const user = (id) => {
    if (!users.has(id)) users.set(id, { state: null, unlocked: [], marks: [], expenseDays: [], freezes: [] });
    return users.get(id);
  };
  return {
    challenges,
    user,
    getStats: async () => ({ expenses: 3, incomes: 0, records: 3, categories: 1, receipts: 0, imports: 0, challengesWon: 0 }),
    getDays: async (id) => ({ expenseDays: [...user(id).expenseDays], incomeDays: [], markDays: [...user(id).marks] }),
    getFreezes: async (id) => [...user(id).freezes],
    addFreezes: async (id, days) => { user(id).freezes.push(...days); return days; },
    getNoSpendWindows: async () => [],
    getUnlocked: async (id) => user(id).unlocked.map(code => ({ code, unlocked_at: new Date('2026-11-01T10:00:00Z'), retroactive: false })),
    getUnlockedBetween: async () => [],
    getState: async (id) => user(id).state,
    createState: async (id, level) => { if (user(id).state) return null; user(id).state = { level_seen: level, wrapped_enabled: true }; return user(id).state; },
    unlock: async (id, codes) => { const added = codes.filter(c => !user(id).unlocked.includes(c)); user(id).unlocked.push(...added); return added; },
    raiseLevel: async () => false,
    markStreakSeen: async () => false,
    setWrappedEnabled: jest.fn(async (id, enabled) => { user(id).state = { ...(user(id).state || { level_seen: 1 }), wrapped_enabled: enabled }; }),
    markNoSpend: async (id, day) => { if (user(id).marks.includes(day)) return false; user(id).marks.push(day); return true; },
    getActiveChallenges: async (id) => challenges.filter(c => c.user_id === id && c.status === 'active'),
    getChallenge: async (id, challengeId) => challenges.find(c => c.user_id === id && c.id === challengeId) || null,
    getFinishedChallenges: async (id) => challenges.filter(c => c.user_id === id && ['won', 'lost'].includes(c.status)),
    createChallenge: async (id, { kind, categoryName = null, start, end, target = null }) => {
      const row = { id: challenges.length + 1, user_id: id, kind, category_name: categoryName, start_date: start, end_date: end, target, status: 'active', created_at: new Date() };
      challenges.push(row);
      return { ...row };
    },
    finishChallenge: async (challengeId, status) => {
      const row = challenges.find(c => c.id === challengeId && c.status === 'active');
      if (!row) return null;
      row.status = status;
      return { ...row };
    },
    getCategorySpendDays: async () => []
  };
}

// Журнал монет в памяти — те же правила, что CoinRepository (ключ один раз, лимит месяца, баланс)
function coinRepository() {
  const ledger = [];
  const balances = new Map();
  const used = (id, month) => ledger.filter(r => r.user_id === id && r.month === month && ['redeem', 'refund'].includes(r.reason)).reduce((s, r) => s + r.days, 0);
  return {
    ledger,
    balances,
    async credit(id, reason, items, { days = null, month = null } = {}) {
      let added = 0;
      for (const item of items) {
        if (ledger.some(r => r.user_id === id && r.ref_key === item.key)) continue;
        ledger.push({ id: ledger.length + 1, user_id: id, amount: item.amount, reason, ref_key: item.key, days, month, created_at: new Date() });
        added += item.amount;
      }
      if (added) balances.set(id, (balances.get(id) || 0) + added);
      return { added, balance: added ? balances.get(id) : null };
    },
    async getBalance(id) { return { balance: balances.get(id) || 0, earned: 0 }; },
    async getHistory(id, limit) { return ledger.filter(r => r.user_id === id).slice(-limit).reverse(); },
    async redeemedDays(id, month) { return used(id, month); },
    async redeem(id, { price, days, month, refKey, cap }) {
      const balance = balances.get(id) || 0;
      const dup = ledger.find(r => r.user_id === id && r.ref_key === refKey);
      if (dup) return { status: 'duplicate', ledgerId: dup.id, balance };
      const before = used(id, month);
      if (before + days > cap) return { status: 'cap', balance, used: before };
      if (balance < price) return { status: 'insufficient', balance, used: before };
      const row = { id: ledger.length + 1, user_id: id, amount: -price, reason: 'redeem', ref_key: refKey, days, month, created_at: new Date() };
      ledger.push(row);
      balances.set(id, balance - price);
      return { status: 'ok', ledgerId: row.id, balance: balance - price, used: before + days };
    }
  };
}

function server({ premium = [] } = {}) {
  const localizationService = new LocalizationService();
  const formatter = new Formatter({ convert: async (amount) => amount });
  const premiumIds = new Set(premium);
  const repo = achievementRepository();
  const coins = coinRepository();
  const userService = {
    getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'UTC', getUserPeriodStartDay: async () => 1,
    getUserById: async (id) => ({ id, premium: premiumIds.has(id), premium_expires_at: premiumIds.has(id) ? new Date(Date.now() + 10 * 86400000) : null }),
    grantRewardDays: jest.fn(async (id, days) => ({ newExpiryDate: new Date(Date.now() + days * 86400000) }))
  };
  const premiumService = {
    isPremiumUser: async (id) => premiumIds.has(id),
    getUserLimits: async (id) => (premiumIds.has(id) ? USER_LIMITS.premium : USER_LIMITS.regular)
  };
  const expenseService = {
    getPeriodContext: async (id, kind, offset) => {
      const today = localToday('UTC');
      return { timezone: 'UTC', currency: 'RUB', startDay: 1, today, period: customPeriod(today, 1, offset) };
    },
    getExpenses: async () => [],
    getCategories: async () => [{ id: 5, name: 'Кафе', icon: '☕' }],
    getCategoryById: async (id, categoryId) => (categoryId === 5 ? { id: 5, name: 'Кафе', icon: '☕' } : null)
  };
  const coinService = new CoinService({ coinRepository: coins, userService, achievementRepository: repo });
  const notificationService = { sendPhoto: jest.fn(async () => {}), botUsername: () => 'ExpensesAssistant_bot', sendMessage: jest.fn() };
  const achievementService = new AchievementService({
    achievementRepository: repo, userService, premiumService, expenseService,
    reportService: { categoryBreakdown: async () => [] },
    budgetService: { list: async () => [] },
    savingsService: null, currencyUtils: { convert: async (amount) => amount }, formatter, localizationService,
    notificationService, userNotificationRepository: {}, chartService: { available: true, wrappedCard: jest.fn(async () => Buffer.from('png')) },
    coinService
  });
  const services = { localizationService, formatter, userService, premiumService, expenseService, coinService, achievementService, rateLimiter: new RateLimiter() };
  const get = (name) => services[name];
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get }).app, repo, coins, userService, notificationService, services };
}

describe('mini app achievements', () => {
  test('only with a signature; the screen: level, streak, freezes, coins, closest badges, no-spend button', async () => {
    const { app } = server();
    await request(app).get('/api/achievements').expect(401);
    const res = await request(app).get('/api/achievements').set('Authorization', auth(OWNER)).expect(200);
    expect(res.body).toMatchObject({
      level: { level: 1, max: 10, name: 'Новичок' },
      freezes: { total: USER_LIMITS.regular.STREAK_FREEZES_PER_WEEK },
      total: 33,
      canMarkNoSpend: true,
      active: []
    });
    // Первый заход: значки за историю (first_expense) открываются как в боте — заметкой о новом значке, монеты за значок
    expect(res.body.notes).toEqual([expect.objectContaining({ kind: 'badge', emoji: '🐣', xp: 10 })]);
    expect(res.body.coins).toBe(CoinService.badgeCoins('first_expense'));
    expect(res.body.next).toHaveLength(3);
    expect(res.body.next[0]).toEqual(expect.objectContaining({ title: expect.any(String), current: expect.any(Number), target: expect.any(Number) }));
    expect(JSON.stringify(res.body)).not.toMatch(/\*/);
  });

  test('catalog by rarity; no-spend today — once', async () => {
    const { app } = server();
    const catalog = await request(app).get('/api/achievements/catalog').set('Authorization', auth(OWNER)).expect(200);
    expect(catalog.body.tiers.map(t => t.tier)).toEqual(['bronze', 'silver', 'gold', 'legendary']);
    expect(catalog.body.tiers[0].items[0]).toMatchObject({ code: 'first_expense', emoji: '🐣', desc: expect.any(String) });

    const marked = await request(app).post('/api/achievements/no-spend').set('Authorization', auth(OWNER)).expect(200);
    expect(marked.body.message).toMatch(/без трат/);
    await request(app).post('/api/achievements/no-spend').set('Authorization', auth(OWNER)).expect(409, { error: 'achievements_marked' });
    const after = await request(app).get('/api/achievements').set('Authorization', auth(OWNER)).expect(200);
    expect(after.body.canMarkNoSpend).toBe(false);
  });

  test('challenges: free — one at a time (402), the same twice — 409, no total budget — 409, someone else\'s — 404', async () => {
    const { app, repo } = server({ premium: [OTHER] });
    const started = await request(app).post('/api/achievements/challenges').set('Authorization', auth(OWNER)).send({ kind: 'no_spend' }).expect(201);
    expect(started.body.challenge).toMatchObject({ kind: 'no_spend', name: 'Неделя без трат' });
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OWNER)).send({ kind: 'no_spend' })
      .expect(409, { error: 'achievements_duplicate' });
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OWNER)).send({ kind: 'no_category', categoryId: 5 })
      .expect(402);
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OWNER)).send({ kind: 'nope' }).expect(400);

    // Премиум — без ограничений; категория — только своя или системная
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OTHER)).send({ kind: 'no_spend' }).expect(201);
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OTHER)).send({ kind: 'no_category', categoryId: 99 }).expect(404);
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OTHER)).send({ kind: 'no_category' }).expect(400);
    const cafe = await request(app).post('/api/achievements/challenges').set('Authorization', auth(OTHER)).send({ kind: 'no_category', categoryId: 5 }).expect(201);
    expect(cafe.body.challenge.name).toMatch(/^Неделя без «.+»$/);
    await request(app).post('/api/achievements/challenges').set('Authorization', auth(OTHER)).send({ kind: 'budget_month' })
      .expect(409, { error: 'achievements_no_budget' });

    const list = await request(app).get('/api/achievements/challenges').set('Authorization', auth(OWNER)).expect(200);
    expect(list.body).toMatchObject({ limit: 1, available: ['no_category', 'budget_month'] });
    expect(list.body.active).toEqual([expect.objectContaining({ kind: 'no_spend', progress: 0, target: 2, daysLeft: 7 })]);
    const premium = await request(app).get('/api/achievements/challenges').set('Authorization', auth(OTHER)).expect(200);
    expect(premium.body.limit).toBeNull();

    const own = started.body.challenge.id;
    await request(app).delete(`/api/achievements/challenges/${own}`).set('Authorization', auth(OTHER)).expect(404);
    await request(app).delete('/api/achievements/challenges/abc').set('Authorization', auth(OWNER)).expect(404);
    expect(repo.challenges.find(c => c.id === own).status).toBe('active');
    await request(app).delete(`/api/achievements/challenges/${own}`).set('Authorization', auth(OWNER)).expect(200);
    expect(repo.challenges.find(c => c.id === own).status).toBe('canceled');
    await request(app).delete(`/api/achievements/challenges/${own}`).set('Authorization', auth(OWNER)).expect(409, { error: 'achievements_finished' });
  });

  test('coins: shop with reasons, redeem once per key, not enough, the month cap, bad input', async () => {
    const { app, coins, userService } = server();
    await coins.credit(OWNER, 'quiz', [{ amount: 200, key: 'seed' }]);
    const screen = await request(app).get('/api/achievements/coins').set('Authorization', auth(OWNER)).expect(200);
    expect(screen.body).toMatchObject({ balance: 200, left: COINS.MONTHLY_DAYS_CAP, cap: COINS.MONTHLY_DAYS_CAP });
    expect(screen.body.shop).toEqual([
      expect.objectContaining({ days: 1, price: 30, blocked: null }),
      expect.objectContaining({ days: 7, price: 180, blocked: null })
    ]);
    expect(screen.body.history[0]).toMatchObject({ amount: 200, label: 'Квиз' });

    const pay = (days, key, id = OWNER) => request(app).post('/api/achievements/coins/redeem').set('Authorization', auth(id)).send({ days, key });
    await pay(3, 'key-0000001').expect(400, { error: 'achievements_bad_days' });
    await pay(7, 'short').expect(400, { error: 'achievements_bad_key' });
    await pay(7, 'bad key with spaces').expect(400, { error: 'achievements_bad_key' });

    const done = await pay(7, 'key-0000001').expect(200);
    expect(done.body).toMatchObject({ status: 'ok', days: 7, balance: 20, left: 0 });
    expect(done.body.until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Двойное нажатие — тот же ключ: второй раз не списывает
    expect((await pay(7, 'key-0000001').expect(200)).body).toEqual({ status: 'duplicate', balance: 20 });
    expect(userService.grantRewardDays).toHaveBeenCalledTimes(1);
    expect(coins.ledger.filter(r => r.reason === 'redeem')).toHaveLength(1);

    await pay(1, 'key-0000002').expect(409, { error: 'achievements_coins_cap' });
    await pay(1, 'key-0000003', OTHER).expect(409, { error: 'achievements_coins_short' });
    const after = await request(app).get('/api/achievements/coins').set('Authorization', auth(OWNER)).expect(200);
    expect(after.body.shop.map(i => i.blocked)).toEqual(['cap', 'cap']);
  });

  test('month in review: offset checks, empty period, the sending toggle, share needs spending', async () => {
    const { app, repo, notificationService } = server();
    await request(app).get('/api/achievements/wrapped?offset=1').set('Authorization', auth(OWNER)).expect(400, { error: 'achievements_bad_offset' });
    await request(app).get('/api/achievements/wrapped?offset=x').set('Authorization', auth(OWNER)).expect(400);
    const empty = await request(app).get('/api/achievements/wrapped').set('Authorization', auth(OWNER)).expect(200);
    expect(empty.body).toMatchObject({ offset: -1, enabled: true, canShare: false, data: null });
    expect(empty.body.period).toEqual({ start: expect.any(String), last: expect.any(String) });

    await request(app).put('/api/achievements/wrapped/settings').set('Authorization', auth(OWNER)).send({ enabled: 'no' }).expect(400);
    await request(app).put('/api/achievements/wrapped/settings').set('Authorization', auth(OWNER)).send({ enabled: false }).expect(200, { enabled: false });
    expect(repo.setWrappedEnabled).toHaveBeenCalledWith(OWNER, false);
    expect((await request(app).get('/api/achievements/wrapped?offset=0').set('Authorization', auth(OWNER))).body.enabled).toBe(false);

    await request(app).post('/api/achievements/wrapped/share').set('Authorization', auth(OWNER)).send({ offset: -1 })
      .expect(409, { error: 'achievements_wrapped_empty' });
    await request(app).post('/api/achievements/wrapped/share').set('Authorization', auth(OWNER)).send({}).expect(400);
    expect(notificationService.sendPhoto).not.toHaveBeenCalled();
  });

  test('sharing the card: 3 times per 10 minutes, the counter is shared with the bot button (achwi)', async () => {
    const { app, services } = server();
    services.achievementService.shareWrapped = jest.fn(async () => 'sent');
    services.rateLimiter.checkLimit(OWNER, 'share'); // «📤 Поделиться» в боте
    for (let i = 0; i < 2; i++) await request(app).post('/api/achievements/wrapped/share').set('Authorization', auth(OWNER)).send({ offset: -1 }).expect(200);
    const over = await request(app).post('/api/achievements/wrapped/share').set('Authorization', auth(OWNER)).send({ offset: -1 }).expect(429);
    expect(over.body).toMatchObject({ error: 'achievements_share_rate', retryAfter: expect.any(Number) });
    expect(services.achievementService.shareWrapped).toHaveBeenCalledTimes(2);
  });
});

describe('AchievementService.shareWrapped', () => {
  test('the card goes to the chat with the bot link (like achwi); no spending — nothing is sent', async () => {
    const notificationService = { sendPhoto: jest.fn(async () => {}), botUsername: () => 'ExpensesAssistant_bot' };
    const chartService = { available: true, wrappedCard: jest.fn(async () => Buffer.from('png')) };
    const service = new AchievementService({ notificationService, chartService, localizationService: new LocalizationService() });
    service.buildWrapped = jest.fn(async () => ({ text: 'x', period: {}, card: { total: 1 } }));
    expect(await service.shareWrapped(7, 'ru', 3)).toBe('sent');
    expect(service.buildWrapped).toHaveBeenCalledWith(7, 'ru', 0);
    const [userId, png, extra] = notificationService.sendPhoto.mock.calls[0];
    expect([userId, png.toString()]).toEqual([7, 'png']);
    expect(extra.caption).toContain('https://t.me/ExpensesAssistant_bot?start=wrapped');
    expect(extra.reply_markup.inline_keyboard[0][0].url).toBe('https://t.me/ExpensesAssistant_bot?start=wrapped');

    service.buildWrapped = jest.fn(async () => null);
    expect(await service.shareWrapped(7, 'ru', -1)).toBe('empty');
    chartService.available = false;
    service.buildWrapped = jest.fn(async () => ({ card: {} }));
    expect(await service.shareWrapped(7, 'ru', -1)).toBe('unavailable');
    expect(notificationService.sendPhoto).toHaveBeenCalledTimes(1);
  });
});

describe('CoinService.quote', () => {
  const now = new Date('2026-11-08T09:00:00Z');
  const make = (user) => new CoinService({ coinRepository: {}, userService: { getUserById: async () => user }, now: () => now });
  const overview = (balance, left) => ({ balance, left, cap: COINS.MONTHLY_DAYS_CAP });

  test('premium is added to the active term, expired — from now; what blocks the exchange', async () => {
    const active = make({ premium: true, premium_expires_at: new Date('2026-12-01T00:00:00Z') });
    expect(await active.quote(1, 7, overview(500, 7))).toEqual({
      days: 7, price: 180, blocked: null, need: 0, balance: 500, left: 7, cap: COINS.MONTHLY_DAYS_CAP, expiresAt: new Date('2026-12-08T00:00:00Z')
    });
    const expired = make({ premium: true, premium_expires_at: new Date('2026-10-01T00:00:00Z') });
    expect((await expired.quote(1, 1, overview(30, 7))).expiresAt).toEqual(new Date('2026-11-09T09:00:00Z'));
    expect(await make(null).quote(1, 7, overview(100, 7))).toMatchObject({ blocked: 'insufficient', need: 80 });
    expect(await make(null).quote(1, 7, overview(1000, 3))).toMatchObject({ blocked: 'cap', left: 3 });
    expect(await make(null).quote(1, 3, overview(1000, 7))).toBeNull();
  });
});
