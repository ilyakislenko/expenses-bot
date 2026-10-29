const DailyPlanService = require('../services/DailyPlanService');
const CoinService = require('../services/CoinService');
const DailySummaryService = require('../services/DailySummaryService');
const PlanningService = require('../services/PlanningService');
const UserService = require('../services/UserService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { planHour, isDue, yesterdayResult, composeMorning } = require('../utils/dailyPlan');
const { COINS, DAILY_PLAN } = require('../utils/constants');
const { sendReminders } = require('../botCron');

const localization = new LocalizationService();
const formatter = new Formatter({ convert: async (amount) => amount });
// Intl ставит неразрывные пробелы в «1 240 ₽» — в проверках текста обычные
formatter.formatAmount = (amount, currency) => Formatter.prototype.formatAmount.call(formatter, amount, currency).replace(/[\u00a0\u202f]/g, ' ');
const tick = () => new Promise((resolve) => setImmediate(resolve));

// ---------- общие подделки ----------

// Журнал монет в памяти с теми же правилами, что CoinRepository: ключ один раз, обмен — под «блокировкой строки»
function fakeCoinRepository() {
  const ledger = [];
  const balances = new Map();
  let lock = Promise.resolve();
  const sumDays = (userId, month) => ledger
    .filter(r => r.user_id === userId && r.month === month && ['redeem', 'refund'].includes(r.reason))
    .reduce((sum, r) => sum + r.days, 0);
  return {
    ledger,
    balances,
    async credit(userId, reason, items, { days = null, month = null } = {}) {
      await tick();
      let added = 0;
      for (const item of items) {
        if (ledger.some(r => r.user_id === userId && r.ref_key === item.key)) continue;
        ledger.push({ id: ledger.length + 1, user_id: userId, amount: item.amount, reason, ref_key: item.key, days, month, created_at: new Date() });
        added += item.amount;
      }
      if (!added) return { added: 0, balance: null };
      balances.set(userId, (balances.get(userId) || 0) + added);
      return { added, balance: balances.get(userId) };
    },
    async getBalance(userId) {
      return { balance: balances.get(userId) || 0, earned: 0 };
    },
    async getHistory(userId, limit) {
      return ledger.filter(r => r.user_id === userId).slice(-limit).reverse();
    },
    async redeemedDays(userId, month) {
      return sumDays(userId, month);
    },
    redeem(userId, { price, days, month, refKey, cap }) {
      const run = async () => {
        await tick();
        const balance = balances.get(userId) || 0;
        const dup = ledger.find(r => r.user_id === userId && r.ref_key === refKey);
        if (dup) return { status: 'duplicate', ledgerId: dup.id, balance };
        const used = sumDays(userId, month);
        if (used + days > cap) return { status: 'cap', balance, used };
        if (balance < price) return { status: 'insufficient', balance, used };
        await tick();
        const row = { id: ledger.length + 1, user_id: userId, amount: -price, reason: 'redeem', ref_key: refKey, days, month, created_at: new Date() };
        ledger.push(row);
        balances.set(userId, balance - price);
        return { status: 'ok', ledgerId: row.id, balance: balance - price, used: used + days };
      };
      const result = lock.then(run);
      lock = result.catch(() => {});
      return result;
    }
  };
}

function coinEnv({ timezone = 'Europe/Moscow', grant } = {}) {
  const coinRepository = fakeCoinRepository();
  const userService = {
    getUserTimezone: jest.fn(async () => timezone),
    grantRewardDays: jest.fn(grant || (async (userId, days) => ({ newExpiryDate: new Date(Date.UTC(2026, 10, 1 + days)) })))
  };
  const coinService = new CoinService({ coinRepository, userService, now: () => new Date('2026-10-29T09:00:00Z') });
  return { coinService, coinRepository, userService };
}

// ---------- utils/dailyPlan ----------

describe('daily plan rules', () => {
  test('plan hour: only morning hours, default 08:00, never at night', () => {
    expect(planHour(null)).toBe(8);
    expect(planHour(undefined)).toBe(8);
    expect(planHour(7)).toBe(7);
    expect(planHour('11')).toBe(11);
    expect(planHour(3)).toBe(DAILY_PLAN.DEFAULT_HOUR); // ночь — подменённое значение
    expect(planHour(23)).toBe(8);
    expect(planHour(0)).toBe(8);
    expect(isDue(8, null)).toBe(true);
    expect(isDue(3, 3)).toBe(false);
    expect(isDue(10, 10)).toBe(true);
  });

  test('yesterday result: kept, over, nothing to compare', () => {
    expect(yesterdayResult({ daily: 2100, deficit: 0 }, 1980)).toEqual({ daily: 2100, spent: 1980, kept: true, over: 0 });
    expect(yesterdayResult({ daily: 2100, deficit: 0 }, 2400)).toEqual({ daily: 2100, spent: 2400, kept: false, over: 300 });
    expect(yesterdayResult({ daily: 2100, deficit: 0 }, 2100).kept).toBe(true);
    expect(yesterdayResult(null, 100)).toBeNull();
    expect(yesterdayResult({ daily: 0, deficit: 500 }, 100)).toBeNull(); // период уже был сверх плана
  });

  const t = (lang) => (key, params) => localization.getText(lang, key, params);

  test('full morning text (ru) — every part in its line', () => {
    const text = composeMorning(t('ru'), {
      date: '29.10',
      yesterday: { spent: '1 980 ₽', daily: '2 100 ₽', kept: true, over: '0 ₽', coins: 2 },
      allowance: { daily: '1 240 ₽', deficit: null },
      payday: { kind: 'payday', days: 6 },
      streak: 12,
      todayBills: ['🔁 Аренда — 35 000 ₽'],
      tomorrowBills: ['💳 Кредит — 5 000 ₽'],
      roast: '😈 Лимит 1 240 ₽.'
    });
    expect(text).toContain('☀️ *План на день · 29.10*');
    expect(text).toContain('Вчера: 1 980 ₽ из 2 100 ₽ — в плане ✅ · +2 🪙');
    expect(text).toContain('💸 Сегодня можно ≈ *1 240 ₽*');
    expect(text).toContain('💵 До зарплаты: 6 дн.');
    expect(text).toContain('🔥 Серия: 12 дн.');
    expect(text).toContain('*Сегодня спишется*\n🔁 Аренда — 35 000 ₽');
    expect(text).toContain('*Завтра спишется*\n💳 Кредит — 5 000 ₽');
    expect(text.endsWith('😈 Лимит 1 240 ₽.')).toBe(true);
    expect(text).not.toMatch(/[{}]|undefined|null/);
  });

  test('missing parts leave no empty headers or placeholders', () => {
    const text = composeMorning(t('en'), {
      date: '29.10', yesterday: null, allowance: { daily: '$40', deficit: null }, payday: { kind: 'period', days: 3 },
      streak: 1, todayBills: [], tomorrowBills: [], roast: ''
    });
    expect(text.split('\n')).toEqual(['☀️ *Daily plan · 29.10*', '', '💸 Safe to spend today ≈ *$40*', '📆 Period ends in 3 d']);
    // Сверх плана, сегодня зарплата, вчера сверх плана
    const over = composeMorning(t('ru'), {
      date: '01.11', yesterday: { spent: '2 400 ₽', daily: '2 100 ₽', kept: false, over: '300 ₽' },
      allowance: { daily: '0 ₽', deficit: '5 000 ₽' }, payday: { kind: 'payday', days: 0 }
    });
    expect(over).toContain('Вчера: 2 400 ₽ из 2 100 ₽ — сверх плана на 300 ₽ 🔴');
    expect(over).toContain('План на период уже превышен на 5 000 ₽');
    expect(over).not.toContain('Сегодня можно');
    expect(over).toContain('💵 Сегодня день зарплаты');
    expect(over).not.toMatch(/Серия|спишется|😈/);
    // Последний день периода без известной зарплаты — строки «до конца периода» нет
    expect(composeMorning(t('ru'), { date: '01.11', allowance: { daily: '1 ₽' }, payday: { kind: 'period', days: 0 } })).not.toContain('📆');
  });
});

// ---------- DailyPlanService ----------

function planEnv({ candidates, allowance = {}, spent = {}, items = [], activeDays = [], roast = '' } = {}) {
  const plans = new Map(); // `${userId}|${day}` → план (как daily_plans)
  const settings = new Map();
  const dailyPlanRepository = {
    plans,
    getCandidates: jest.fn(async () => candidates),
    getPlan: jest.fn(async (userId, day) => plans.get(`${userId}|${day}`) || null),
    claim: jest.fn(async (userId, day, plan) => {
      await tick();
      const key = `${userId}|${day}`;
      if (plans.has(key)) return false;
      plans.set(key, { ...plan });
      return true;
    }),
    getSettings: jest.fn(async (userId) => settings.get(userId) || { enabled: false, hour: null }),
    setEnabled: jest.fn(async (userId, enabled) => settings.set(userId, { ...(settings.get(userId) || { hour: null }), enabled })),
    setHour: jest.fn(async (userId, hour) => settings.set(userId, { enabled: true, hour }))
  };
  const planningService = {
    getAllowance: jest.fn(async (userId) => ({
      mode: 'income', daily: 1240, deficit: 0, currency: 'RUB', today: '2026-10-29', daysLeft: 8, nextIncome: '2026-11-04',
      ...(allowance[userId] || allowance.default || {})
    })),
    getCalendar: jest.fn(async () => ({ items })),
    spentOnDay: jest.fn(async (userId, day) => (spent[`${userId}|${day}`] ?? 0)),
    itemLine: (lang, item) => `${item.kind === 'subscription' ? '📺' : '🔁'} ${item.label} — ${formatter.formatAmount(item.amount, 'RUB')}`
  };
  const achievementService = {
    snapshot: jest.fn(async () => ({ streak: { current: 12 }, activeDays: new Set(activeDays) }))
  };
  const roastService = { morningLine: jest.fn(async () => roast) };
  const { coinService, coinRepository } = coinEnv();
  const userNotificationRepository = {
    sent: new Set(),
    markSent: jest.fn(async function (userId, kind, key) {
      const k = `${userId}|${kind}|${key}`;
      if (this.sent.has(k)) return false;
      this.sent.add(k);
      return true;
    })
  };
  const notificationService = { sendMessage: jest.fn(async () => ({})) };
  const userService = { getUserCurrency: jest.fn(async () => 'RUB') };
  const make = () => new DailyPlanService({
    dailyPlanRepository, planningService, achievementService, roastService, coinService, userService,
    userNotificationRepository, notificationService, localizationService: localization, formatter
  });
  return { service: make(), make, dailyPlanRepository, planningService, notificationService, coinRepository, roastService, userNotificationRepository };
}

const user = (id, timezone, extra = {}) => ({ id, language: 'ru', timezone, daily_plan_hour: null, bill_reminders_enabled: false, sub_warn_enabled: true, ...extra });

describe('DailyPlanService.processDue', () => {
  // 05:00 UTC: Москва 08:00, Нью-Йорк 01:00, Токио 14:00, Калькутта 10:30, UTC+3 с «ночным» часом 3 → 08:00
  const now = new Date('2026-10-29T05:00:00Z');

  test('sends at the user\'s local morning hour in different time zones, never at night', async () => {
    const env = planEnv({
      candidates: [
        user(1, 'Europe/Moscow'),
        user(2, 'America/New_York'),
        user(3, 'Asia/Tokyo'),
        user(4, 'Asia/Kolkata', { daily_plan_hour: 10 }),
        user(5, 'Etc/GMT-3', { daily_plan_hour: 3 })
      ]
    });
    expect(await env.service.processDue(now)).toBe(3);
    expect(env.notificationService.sendMessage.mock.calls.map(c => c[0]).sort()).toEqual([1, 4, 5]);
    // 00:00 UTC — в UTC+3 это 03:00: «ночной» час не срабатывает
    const night = planEnv({ candidates: [user(5, 'Etc/GMT-3', { daily_plan_hour: 3 })] });
    expect(await night.service.processDue(new Date('2026-10-29T00:00:00Z'))).toBe(0);
    // Нью-Йорк получает свой план в 08:00 по своему времени (12:00 UTC в EDT)
    const ny = planEnv({ candidates: [user(2, 'America/New_York')] });
    expect(await ny.service.processDue(new Date('2026-10-29T12:00:00Z'))).toBe(1);
  });

  test('once per local day: repeat, overlapping runs and a restart send nothing more', async () => {
    const env = planEnv({ candidates: [user(1, 'Europe/Moscow')] });
    const results = await Promise.all([env.service.processDue(now), env.service.processDue(now), env.service.processDue(now)]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await env.service.processDue(new Date('2026-10-29T05:40:00Z'))).toBe(0);
    // Перезапуск — новый сервис, те же данные в БД
    expect(await env.make().processDue(now)).toBe(0);
    expect(env.notificationService.sendMessage).toHaveBeenCalledTimes(1);
    expect(env.dailyPlanRepository.plans.get('1|2026-10-29')).toEqual({ daily: 1240, deficit: 0, currency: 'RUB' });
    // Следующий день — снова
    expect(await env.service.processDue(new Date('2026-10-30T05:00:00Z'))).toBe(1);
  });

  test('message: yesterday vs plan, allowance, payday, streak, bills, roast, buttons; coins for a kept day', async () => {
    const env = planEnv({
      candidates: [user(1, 'Europe/Moscow', { bill_reminders_enabled: true })],
      spent: { '1|2026-10-28': 1980 },
      activeDays: ['2026-10-28'],
      roast: '😈 Лимит 1 240 ₽.',
      items: [
        { date: '2026-10-29', kind: 'recurring', label: 'Аренда', amount: 35000 },
        { date: '2026-10-29', kind: 'income', label: 'Зарплата', amount: 90000 },
        { date: '2026-10-30', kind: 'recurring', label: 'Кредит', amount: 5000 },
        { date: '2026-10-30', kind: 'subscription', label: 'Netflix', amount: 799 }
      ]
    });
    env.dailyPlanRepository.plans.set('1|2026-10-28', { daily: 2100, deficit: 0, currency: 'RUB' });
    expect(await env.service.processDue(now)).toBe(1);
    const [, text, extra] = env.notificationService.sendMessage.mock.calls[0];
    expect(text).toContain('Вчера: 1 980 ₽ из 2 100 ₽ — в плане ✅ · +2 🪙');
    expect(text).toContain('💸 Сегодня можно ≈ *1 240 ₽*');
    expect(text).toContain('💵 До зарплаты: 6 дн.');
    expect(text).toContain('🔥 Серия: 12 дн.');
    expect(text).toContain('🔁 Аренда — 35 000 ₽');
    expect(text).not.toContain('Зарплата'); // доходы в «спишется» не попадают
    expect(text).toContain('🔁 Кредит — 5 000 ₽'); // завтра — включены «Платежи утром»
    expect(text).not.toContain('Netflix'); // о подписке завтра придёт отдельное предупреждение с кнопками
    expect(text).toContain('😈 Лимит 1 240 ₽.');
    expect(env.roastService.morningLine).toHaveBeenCalledWith(1, 'ru', { good: true, daily: '1 240 ₽', over: null });
    expect(extra.parse_mode).toBe('Markdown');
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['ov|0', 'dpo']);
    expect(env.coinRepository.ledger.map(r => [r.reason, r.ref_key, r.amount])).toEqual([['plan', 'plan:2026-10-28', COINS.PLAN_KEPT]]);
  });

  test('a day without records gets no «yesterday» line and no coins; over plan — roast gets the overage', async () => {
    const env = planEnv({ candidates: [user(1, 'Europe/Moscow'), user(2, 'Europe/Moscow')], spent: { '2|2026-10-28': 2400 } });
    env.dailyPlanRepository.plans.set('1|2026-10-28', { daily: 2100, deficit: 0, currency: 'RUB' });
    env.dailyPlanRepository.plans.set('2|2026-10-28', { daily: 2100, deficit: 0, currency: 'RUB' });
    expect(await env.service.processDue(now)).toBe(2);
    expect(env.coinRepository.ledger).toEqual([]);
    const texts = Object.fromEntries(env.notificationService.sendMessage.mock.calls.map(c => [c[0], c[1]]));
    expect(texts[1]).not.toContain('Вчера');
    expect(texts[1]).not.toContain('🪙');
    expect(env.roastService.morningLine).not.toHaveBeenCalledWith(1, expect.anything(), expect.anything()); // нет вердикта — нет подколки
    expect(texts[2]).toContain('сверх плана на 300 ₽ 🔴');
    expect(env.roastService.morningLine).toHaveBeenCalledWith(2, 'ru', { good: false, daily: '1 240 ₽', over: '300 ₽' });
  });

  test('no income and no budget: nothing but a one-time hint', async () => {
    const env = planEnv({ candidates: [user(1, 'Europe/Moscow')], allowance: { default: { mode: 'none' } } });
    expect(await env.service.processDue(now)).toBe(0);
    expect(await env.service.processDue(new Date('2026-10-30T05:00:00Z'))).toBe(0);
    expect(env.notificationService.sendMessage).toHaveBeenCalledTimes(1);
    const [, text, extra] = env.notificationService.sendMessage.mock.calls[0];
    expect(text).toContain('План на день');
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['income_add', 'dpo']);
    expect(env.dailyPlanRepository.plans.size).toBe(0);
  });

  test('a failing user does not stop the others', async () => {
    const env = planEnv({ candidates: [user(1, 'Europe/Moscow'), user(2, 'Europe/Moscow')] });
    env.planningService.getAllowance.mockImplementationOnce(async () => { throw new Error('db'); });
    expect(await env.service.processDue(now)).toBe(1);
  });

  test('settings: only morning hours; choosing an hour turns the plan on', async () => {
    const env = planEnv({ candidates: [] });
    expect(await env.service.setHour(1, 3)).toBe(false);
    expect(await env.service.getSettings(1)).toEqual({ enabled: false, hour: 8 });
    expect(await env.service.setHour(1, 7)).toBe(true);
    expect(await env.service.getSettings(1)).toEqual({ enabled: true, hour: 7 });
    expect(await env.service.toggle(1)).toBe(false);
  });

  test('evening line compares the day with the morning plan', async () => {
    const env = planEnv({ candidates: [], spent: { '1|2026-10-29': 980, '2|2026-10-29': 1500 } });
    env.dailyPlanRepository.plans.set('1|2026-10-29', { daily: 1240, deficit: 0, currency: 'RUB' });
    env.dailyPlanRepository.plans.set('2|2026-10-29', { daily: 1240, deficit: 0, currency: 'RUB' });
    expect(await env.service.eveningLine(1, 'ru', '2026-10-29')).toBe('💸 План дня: 1 240 ₽ · потрачено 980 ₽ — в плане ✅ (осталось 260 ₽)');
    expect(await env.service.eveningLine(2, 'en', '2026-10-29')).toContain('260 ₽ over plan 🔴');
    expect(await env.service.eveningLine(3, 'ru', '2026-10-29')).toBe(''); // плана не было
  });
});

describe('evening summary and reminders know about the morning plan', () => {
  test('daily summary adds the plan line', async () => {
    const dailyPlanService = { eveningLine: jest.fn(async () => '💸 План дня: 1 240 ₽ · потрачено 980 ₽ — в плане ✅ (осталось 260 ₽)') };
    const service = new DailySummaryService({
      expenseService: {
        getPeriodContext: async () => ({ timezone: 'Europe/Moscow', currency: 'RUB', period: { start: '2026-10-29', end: '2026-10-30' } }),
        getTotals: async () => ({ count: 2, byCurrency: [{ currency: 'RUB', total: 980 }] })
      },
      incomeService: { getTotals: async () => ({ count: 0, byCurrency: [] }) },
      reportService: { categoryBreakdown: async () => [], categoryLabel: (c) => c.name },
      userNotificationRepository: {}, notificationService: {}, localizationService: localization, formatter, dailyPlanService
    });
    const summary = await service.buildSummary(1, 'ru');
    expect(summary.text).toContain('в плане ✅ (осталось 260 ₽)');
    expect(dailyPlanService.eveningLine).toHaveBeenCalledWith(1, 'ru', '2026-10-29');
  });

  test('morning reminder is skipped when today\'s plan already came; evening one is not', async () => {
    const rows = [{ id: 1, timezone: 'Europe/Moscow', language: 'ru', reminder_hours: [9, 21], reminder_sent_today_hours: null, last_reminder_local_date: null }];
    const deps = () => ({
      userService: {
        userRepository: { query: async () => ({ rows }) },
        updateLastReminderLocalDate: jest.fn(async () => {}),
        setReminderSentTodayHours: jest.fn(async () => {})
      },
      expenseService: { hasAnyExpenseToday: async () => false },
      notificationService: { localizationService: localization, bot: { telegram: { sendMessage: jest.fn(async () => ({})) } } },
      dailyPlanService: { sentOn: jest.fn(async () => true) }
    });
    const morning = deps();
    expect(await sendReminders(morning, new Date('2026-10-29T06:00:00Z'))).toBe(0); // 09:00 Москва
    expect(morning.dailyPlanService.sentOn).toHaveBeenCalledWith(1, '2026-10-29');
    const evening = deps();
    expect(await sendReminders(evening, new Date('2026-10-29T18:00:00Z'))).toBe(1); // 21:00
    const noPlan = deps();
    noPlan.dailyPlanService.sentOn.mockResolvedValue(false);
    expect(await sendReminders(noPlan, new Date('2026-10-29T06:00:00Z'))).toBe(1);
  });

  test('bill reminder is not sent separately when the daily plan carries the bills', async () => {
    const planning = Object.create(PlanningService.prototype);
    Object.assign(planning, {
      planningRepository: {
        getBillReminderCandidates: async () => [
          { id: 1, language: 'ru', timezone: 'Europe/Moscow', daily_plan_enabled: true },
          { id: 2, language: 'ru', timezone: 'Europe/Moscow', daily_plan_enabled: true },
          { id: 3, language: 'ru', timezone: 'Europe/Moscow', daily_plan_enabled: false }
        ]
      },
      userNotificationRepository: { markSent: async () => true },
      notificationService: { sendMessage: jest.fn(async () => ({})) },
      localizationService: localization
    });
    planning.getAllowance = jest.fn(async (id) => ({ mode: id === 2 ? 'none' : 'income' }));
    planning.buildBillReminder = jest.fn(async () => ({ text: 'bills', today: '2026-10-29' }));
    expect(await planning.processBillReminders(new Date('2026-10-29T06:05:00Z'))).toBe(2);
    expect(planning.notificationService.sendMessage.mock.calls.map(c => c[0])).toEqual([2, 3]);
  });
});

// ---------- CoinService ----------

describe('CoinService', () => {
  test('award is idempotent by key and rejects bad input', async () => {
    const { coinService, coinRepository } = coinEnv();
    expect(await coinService.award(1, 'quiz', 10, { idempotencyKey: 'quiz:2026-W44:1' })).toEqual({ awarded: true, balance: 10 });
    expect(await coinService.award(1, 'quiz', 10, { idempotencyKey: 'quiz:2026-W44:1' })).toEqual({ awarded: false, balance: null });
    const parallel = await Promise.all([1, 2, 3].map(() => coinService.award(1, 'quiz', 5, { idempotencyKey: 'same' })));
    expect(parallel.filter(r => r.awarded)).toHaveLength(1);
    expect(await coinService.award(1, 'quiz', 0, { idempotencyKey: 'x' })).toEqual({ awarded: false, balance: null });
    expect(await coinService.award(1, 'quiz', 2.5, { idempotencyKey: 'y' })).toEqual({ awarded: false, balance: null });
    expect(await coinService.award(1, 'quiz', 5, {})).toEqual({ awarded: false, balance: null });
    expect(await coinService.getBalance(1)).toBe(15);
    expect(coinRepository.ledger).toHaveLength(2);
  });

  test('award never throws', async () => {
    const { coinService, coinRepository } = coinEnv();
    coinRepository.credit = async () => { throw new Error('db down'); };
    expect(await coinService.award(1, 'quiz', 5, { idempotencyKey: 'k' })).toEqual({ awarded: false, balance: null });
  });

  test('activity: a coin per active day, a bonus every 7 days of streak, badges = XP / 5', async () => {
    const { coinService, coinRepository } = coinEnv();
    const snap = (today, current, todayActive = true) => ({ today, streak: { current, todayActive } });
    expect(await coinService.onActivity(1, snap('2026-10-28', 6))).toBe(0);
    expect(await coinService.onActivity(1, snap('2026-10-28', 6))).toBe(0); // вторая трата за день — без монет
    expect(await coinService.onActivity(1, snap('2026-10-29', 7))).toBe(COINS.STREAK_WEEK);
    expect(await coinService.onActivity(1, snap('2026-10-29', 7))).toBe(0);
    expect(await coinService.onActivity(1, snap('2026-10-30', 8, false))).toBe(0); // сегодня ещё нет записей
    expect(await coinService.onActivity(1, snap('2026-10-30', 8), ['streak_7', 'first_expense'])).toBe(8 + 2);
    expect(await coinService.syncBadges(1, ['streak_7', 'first_expense', 'records_1000'])).toBe(40); // только новый значок
    expect(CoinService.badgeCoins('streak_365')).toBe(200);
    expect(CoinService.badgeCoins('nope')).toBe(0);
    expect(coinRepository.ledger.map(r => r.ref_key)).toEqual([
      'day:2026-10-28', 'day:2026-10-29', 'streak:2026-10-29', 'day:2026-10-30', 'ach:streak_7', 'ach:first_expense', 'ach:records_1000'
    ]);
    expect(await coinService.getBalance(1)).toBe(3 + 5 + 10 + 40);
  });

  test('redeem 7 days: coins spent once, premium through the reward helper, month cap enforced', async () => {
    const { coinService, coinRepository, userService } = coinEnv();
    await coinService.award(1, 'quiz', 500, { idempotencyKey: 'seed' });
    const result = await coinService.redeem(1, 7, { idempotencyKey: '1:100' });
    expect(result).toMatchObject({ status: 'ok', balance: 320, days: 7, price: 180, left: 0 });
    expect(userService.grantRewardDays).toHaveBeenCalledWith(1, 7, 'coins', expect.objectContaining({ price: 180 }));
    // Двойное нажатие той же кнопки
    expect((await coinService.redeem(1, 7, { idempotencyKey: '1:100' })).status).toBe('duplicate');
    // Лимит месяца: ещё 1 день уже нельзя, хотя монеты есть
    expect(await coinService.redeem(1, 1, { idempotencyKey: '1:101' })).toMatchObject({ status: 'cap', left: 0 });
    expect(userService.grantRewardDays).toHaveBeenCalledTimes(1);
    expect(await coinService.getBalance(1)).toBe(320);
    // Неизвестный товар
    expect((await coinService.redeem(1, 3, { idempotencyKey: '1:102' })).status).toBe('unknown');
    const overview = await coinService.getOverview(1);
    expect(overview).toMatchObject({ balance: 320, used: 7, left: 0, cap: COINS.MONTHLY_DAYS_CAP });
    expect(coinRepository.ledger.filter(r => r.reason === 'redeem')).toHaveLength(1);
  });

  test('concurrent redeems never overspend coins or the monthly cap', async () => {
    const { coinService, userService } = coinEnv();
    await coinService.award(1, 'quiz', 1000, { idempotencyKey: 'seed' });
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => coinService.redeem(1, 1, { idempotencyKey: `1:${i}` })));
    expect(results.filter(r => r.status === 'ok')).toHaveLength(COINS.MONTHLY_DAYS_CAP);
    expect(results.filter(r => r.status === 'cap')).toHaveLength(10 - COINS.MONTHLY_DAYS_CAP);
    expect(await coinService.getBalance(1)).toBe(1000 - 30 * COINS.MONTHLY_DAYS_CAP);
    expect(userService.grantRewardDays).toHaveBeenCalledTimes(COINS.MONTHLY_DAYS_CAP);

    const poor = coinEnv();
    await poor.coinService.award(2, 'quiz', 50, { idempotencyKey: 'seed' });
    const two = await Promise.all([poor.coinService.redeem(2, 1, { idempotencyKey: 'a' }), poor.coinService.redeem(2, 1, { idempotencyKey: 'b' })]);
    expect(two.map(r => r.status).sort()).toEqual(['insufficient', 'ok']);
    expect(two.find(r => r.status === 'insufficient').need).toBe(10);
    expect(await poor.coinService.getBalance(2)).toBe(20);
  });

  test('cap is per local month', async () => {
    const env = coinEnv();
    await env.coinService.award(1, 'quiz', 1000, { idempotencyKey: 'seed' });
    expect((await env.coinService.redeem(1, 7, { idempotencyKey: 'oct' })).status).toBe('ok');
    env.coinService.now = () => new Date('2026-11-01T09:00:00Z');
    expect((await env.coinService.redeem(1, 7, { idempotencyKey: 'nov' })).status).toBe('ok');
    expect(CoinService.localMonth('Pacific/Kiritimati', new Date('2026-10-31T12:00:00Z'))).toBe('2026-11'); // UTC+14
    expect(CoinService.localMonth('America/New_York', new Date('2026-11-01T02:00:00Z'))).toBe('2026-10');
  });

  test('failed premium grant refunds the coins and the monthly days', async () => {
    const env = coinEnv({ grant: async () => { throw new Error('db down'); } });
    await env.coinService.award(1, 'quiz', 200, { idempotencyKey: 'seed' });
    expect((await env.coinService.redeem(1, 7, { idempotencyKey: 'x' })).status).toBe('failed');
    expect(await env.coinService.getBalance(1)).toBe(200);
    expect((await env.coinService.getOverview(1)).left).toBe(COINS.MONTHLY_DAYS_CAP);
  });
});

describe('reward premium days', () => {
  test('grantRewardDays extends premium with a separate «reward» transaction (no revenue)', async () => {
    const expires = new Date(Date.now() + 5 * 86400000);
    const userRepository = { getUserById: jest.fn(async () => ({ id: 1, premium: true, premium_expires_at: expires })), query: jest.fn(async () => ({ rows: [] })) };
    const premiumTransactionRepository = { createTransaction: jest.fn(async () => ({})) };
    const userService = new UserService(userRepository, {}, premiumTransactionRepository);
    const result = await userService.grantRewardDays(1, 7, 'coins', { ledger_id: 5 });
    expect(result.newExpiryDate.getTime()).toBe(expires.getTime() + 7 * 86400000);
    const tx = premiumTransactionRepository.createTransaction.mock.calls[0][0];
    expect(tx).toMatchObject({ transaction_type: 'reward', tariff_duration: 7, stars_amount: 0, telegram_payment_id: null });
    expect(JSON.parse(tx.invoice_payload)).toMatchObject({ type: 'coins', ledger_id: 5 });
    // Обычная выдача без типа — как раньше
    await userService.activatePremium(1, 30, { stars: 0 });
    expect(premiumTransactionRepository.createTransaction.mock.calls[1][0].transaction_type).toBe('extension');
  });
});
