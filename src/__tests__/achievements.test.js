const { computeStreak, bestStreak, completeMonths, weekStart } = require('../utils/streak');
const {
  ACHIEVEMENTS, earnedCodes, totalXp, levelForXp, nextGoals, pickHighlight, LEVELS, DAY_XP
} = require('../utils/achievements');
const { evaluateChallenge, countNoSpendDays } = require('../utils/challenges');
const { countKeywords, pickComparison, biggestDay } = require('../utils/wrapped');
const AchievementService = require('../services/AchievementService');
const DailySummaryService = require('../services/DailySummaryService');
const Formatter = require('../utils/formatter');
const { sendReminders } = require('../botCron');
const { USER_LIMITS } = require('../utils/constants');

const days = (...list) => new Set(list);

describe('streak math', () => {
  test('weekStart is the Monday of the week', () => {
    expect(weekStart('2026-10-28')).toBe('2026-10-26'); // среда
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // понедельник
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // воскресенье
    expect(weekStart('2027-01-01')).toBe('2026-12-28'); // через год
  });

  test('consecutive days; today without a record does not break the streak yet', () => {
    const active = days('2026-10-25', '2026-10-26', '2026-10-27');
    const withToday = computeStreak({ activeDays: new Set([...active, '2026-10-28']), today: '2026-10-28' });
    expect(withToday).toMatchObject({ current: 4, todayActive: true, atRisk: false, newFreezes: [] });
    const pending = computeStreak({ activeDays: active, today: '2026-10-28' });
    expect(pending).toMatchObject({ current: 3, todayActive: false, atRisk: true });
  });

  test('at risk only from 3 days', () => {
    expect(computeStreak({ activeDays: days('2026-10-26', '2026-10-27'), today: '2026-10-28' }).atRisk).toBe(false);
  });

  test('no records — zero streak', () => {
    expect(computeStreak({ activeDays: new Set(), today: '2026-10-28' })).toMatchObject({ current: 0, newFreezes: [], frozen: [] });
  });

  test('a single missed day is covered by a freeze (1 per week); the frozen day does not add to the count', () => {
    const result = computeStreak({ activeDays: days('2026-10-24', '2026-10-25', '2026-10-27', '2026-10-28'), today: '2026-10-28', allowance: 1 });
    expect(result.current).toBe(4);
    expect(result.newFreezes).toEqual(['2026-10-26']);
    expect(result.freezesLeft).toBe(0); // заморозка недели 26.10 потрачена
  });

  test('missing yesterday is frozen the next day even before today\'s record', () => {
    const result = computeStreak({ activeDays: days('2026-10-25', '2026-10-26'), today: '2026-10-28', allowance: 1 });
    expect(result).toMatchObject({ current: 2, newFreezes: ['2026-10-27'], todayActive: false });
  });

  test('two missed days in one week break the streak with 1 freeze but not with 2 (premium)', () => {
    const active = days('2026-10-26', '2026-10-28', '2026-10-30');
    const free = computeStreak({ activeDays: active, today: '2026-10-30', allowance: 1 });
    expect(free.current).toBe(2);
    expect(free.newFreezes).toEqual(['2026-10-29']);
    const premium = computeStreak({ activeDays: active, today: '2026-10-30', allowance: 2 });
    expect(premium.current).toBe(3);
    expect(premium.newFreezes).toEqual(['2026-10-27', '2026-10-29']);
  });

  test('two consecutive missed days break the streak with 1 freeze a week', () => {
    const result = computeStreak({ activeDays: days('2026-10-25', '2026-10-26', '2026-10-29'), today: '2026-10-29', allowance: 1 });
    expect(result.current).toBe(1);
    expect(result.newFreezes).toEqual([]);
    expect(result.freezesLeft).toBe(1); // откат: заморозка не потрачена впустую
  });

  test('gaps in different weeks each get their own freeze', () => {
    // вс 25.10 пропущен (неделя 19.10), вт 27.10 пропущен (неделя 26.10)
    const active = days('2026-10-23', '2026-10-24', '2026-10-26', '2026-10-28');
    const result = computeStreak({ activeDays: active, today: '2026-10-28', allowance: 1 });
    expect(result.current).toBe(4);
    expect(result.newFreezes).toEqual(['2026-10-25', '2026-10-27']);
  });

  test('stored freezes keep old gaps bridged; new freezes only within the last 7 days', () => {
    const active = new Set(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
      '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']);
    const today = '2026-10-12';
    expect(computeStreak({ activeDays: active, today }).current).toBe(9); // 03.10 старше недели — без сохранённой заморозки серия с 04.10
    const stored = computeStreak({ activeDays: active, freezes: ['2026-10-03'], today });
    expect(stored.current).toBe(11);
    expect(stored.newFreezes).toEqual([]);
    expect(stored.frozen).toEqual(['2026-10-03']);
  });

  test('stored freezes count against the weekly allowance', () => {
    const result = computeStreak({
      activeDays: days('2026-10-26', '2026-10-28', '2026-10-30'), freezes: ['2026-10-27'], today: '2026-10-30', allowance: 1
    });
    expect(result.current).toBe(1); // 29.10 уже не закрыть: заморозка недели ушла на 27.10
    expect(result.newFreezes).toEqual([]);
  });

  test('no freeze is spent on a gap before the first ever record', () => {
    const result = computeStreak({ activeDays: days('2026-10-28'), today: '2026-10-28' });
    expect(result).toMatchObject({ current: 1, newFreezes: [], freezesLeft: 1 });
  });

  test('best streak over the whole history, freezes bridge but do not count', () => {
    const active = days('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11', '2026-09-13', '2026-09-14');
    expect(bestStreak(active)).toBe(3);
    expect(bestStreak(active, ['2026-09-12'])).toBe(4);
    expect(bestStreak(new Set())).toBe(0);
  });

  test('complete months need 25 recorded days', () => {
    const october = Array.from({ length: 25 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const september = Array.from({ length: 24 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    expect(completeMonths(new Set([...october, ...september]))).toBe(1);
  });
});

describe('achievement rules, XP and levels', () => {
  const zero = {
    expenses: 0, incomes: 0, records: 0, categories: 0, receipts: 0, imports: 0, earlyBird: false, nightOwl: false,
    budgets: 0, goals: 0, goalsReached: 0, debtsPaid: 0, savingsOps: 0, family: false, challengesWon: 0,
    currentStreak: 0, bestStreak: 0, completeMonths: 0, monthDays: 0, noSpendDays: 0
  };

  test('catalogue: ~30 unique codes, every tier present, XP positive', () => {
    const codes = ACHIEVEMENTS.map(a => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThanOrEqual(25);
    for (const tier of ['bronze', 'silver', 'gold', 'legendary']) expect(ACHIEVEMENTS.some(a => a.tier === tier)).toBe(true);
    expect(ACHIEVEMENTS.every(a => a.xp > 0 && (a.event || (a.metric && a.target > 0)))).toBe(true);
  });

  test('thresholds are inclusive', () => {
    expect(earnedCodes({ ...zero, records: 9, expenses: 9 })).toEqual(['first_expense']);
    expect(earnedCodes({ ...zero, records: 10, expenses: 10 })).toEqual(['first_expense', 'records_10']);
    const streak = earnedCodes({ ...zero, bestStreak: 7 });
    expect(streak).toEqual(expect.arrayContaining(['streak_3', 'streak_7']));
    expect(streak).not.toContain('streak_30');
    expect(earnedCodes({ ...zero, earlyBird: true, nightOwl: false })).toEqual(['early_bird']);
  });

  test('event-only achievements need the event', () => {
    expect(earnedCodes(zero, 'expense_added')).toEqual([]);
    expect(earnedCodes(zero, 'voice_used')).toEqual(['first_voice']);
    expect(earnedCodes(zero, 'under_budget_period')).toEqual(['under_budget']);
  });

  test('XP = badges + days with records + won challenges', () => {
    expect(totalXp(['first_expense', 'streak_7'], 3, 1)).toBe(10 + 40 + 3 * DAY_XP + 30);
    expect(totalXp(['unknown_code'], 0)).toBe(0);
  });

  test('levels: boundaries, max level, progress ratio', () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, min: 0, next: LEVELS[1] });
    expect(levelForXp(LEVELS[1] - 1).level).toBe(1);
    expect(levelForXp(LEVELS[1]).level).toBe(2);
    expect(levelForXp(100)).toMatchObject({ level: 2, ratio: 0.5 });
    expect(levelForXp(1e6)).toMatchObject({ level: 10, next: null, ratio: 1 });
  });

  test('next goals: nearest threshold per metric, best progress first', () => {
    const stats = { ...zero, records: 73, expenses: 70, incomes: 3, currentStreak: 5, bestStreak: 5, categories: 4 };
    const unlocked = earnedCodes(stats);
    const goals = nextGoals(stats, unlocked, 3);
    expect(goals.map(g => g.achievement.code)).toEqual(['categories_5', 'records_100', 'streak_7']);
    expect(goals.find(g => g.achievement.code === 'records_100')).toMatchObject({ current: 73, target: 100 });
    // records_1000 не показывается, пока не открыт records_100
    expect(nextGoals(stats, unlocked, 50).some(g => g.achievement.code === 'records_1000')).toBe(false);
  });

  test('streak goals show the current streak, not the best one', () => {
    const stats = { ...zero, currentStreak: 1, bestStreak: 12 };
    const goal = nextGoals(stats, earnedCodes(stats), 50).find(g => g.achievement.code === 'streak_30');
    expect(goal).toMatchObject({ current: 1, target: 30 });
  });

  test('highlight: rarest first', () => {
    expect(pickHighlight(['first_expense', 'streak_30', 'records_100']).code).toBe('streak_30');
    expect(pickHighlight([])).toBeNull();
  });
});

describe('challenge evaluation', () => {
  const week = { start_date: '2026-10-26', end_date: '2026-11-02' };

  test('no-spend week: won once enough past clean days, today counts only when marked', () => {
    const challenge = { ...week, kind: 'no_spend', target: 2 };
    const expenseDays = days('2026-10-26', '2026-10-28');
    // 27.10 без трат; сегодня 29.10 отмечен — прогресс 2, но победа только по завершённым дням
    const marked = evaluateChallenge(challenge, { today: '2026-10-29', expenseDays, markDays: days('2026-10-29') });
    expect(marked).toMatchObject({ status: 'active', progress: 2, target: 2, daysLeft: 4 });
    const next = evaluateChallenge(challenge, { today: '2026-10-30', expenseDays, markDays: days('2026-10-29') });
    expect(next.status).toBe('won');
  });

  test('no-spend week: lost early when the target is out of reach, lost at the end', () => {
    const challenge = { ...week, kind: 'no_spend', target: 2 };
    const fiveSpent = days('2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30');
    // 31.10: впереди 31.10 и 01.11 — ещё можно успеть два дня без трат
    expect(evaluateChallenge(challenge, { today: '2026-10-31', expenseDays: fiveSpent })).toMatchObject({ status: 'active', daysLeft: 2 });
    // 01.11: 31.10 тоже с тратами, остался один день — цель недостижима, провал не ждёт конца недели
    const sixSpent = new Set([...fiveSpent, '2026-10-31']);
    expect(evaluateChallenge(challenge, { today: '2026-11-01', expenseDays: sixSpent })).toMatchObject({ status: 'lost', daysLeft: 1 });
    // Один день без трат из двух — провал после окончания недели; два — победа
    expect(evaluateChallenge(challenge, { today: '2026-11-02', expenseDays: sixSpent }).status).toBe('lost');
    expect(evaluateChallenge(challenge, { today: '2026-11-02', expenseDays: fiveSpent }).status).toBe('won');
  });

  test('week without a category: broken by a spend in the window, won after the last day', () => {
    const challenge = { ...week, kind: 'no_category', category_name: 'Кафе' };
    expect(evaluateChallenge(challenge, { today: '2026-10-29', categoryDays: new Set() })).toMatchObject({ status: 'active', progress: 3, target: 7 });
    expect(evaluateChallenge(challenge, { today: '2026-10-29', categoryDays: days('2026-10-29') }).status).toBe('lost');
    expect(evaluateChallenge(challenge, { today: '2026-11-02', categoryDays: days('2026-11-02') }).status).toBe('won'); // после окна не считается
  });

  test('month on budget: over the limit — lost, period over — won, no budget — canceled', () => {
    const challenge = { kind: 'budget_month', start_date: '2026-10-01', end_date: '2026-11-01' };
    expect(evaluateChallenge(challenge, { today: '2026-10-20', budget: { spent: 900, limit: 1000 } })).toMatchObject({ status: 'active', daysLeft: 12 });
    expect(evaluateChallenge(challenge, { today: '2026-10-20', budget: { spent: 1000.01, limit: 1000 } }).status).toBe('lost');
    expect(evaluateChallenge(challenge, { today: '2026-11-01', budget: { spent: 1000, limit: 1000 } }).status).toBe('won');
    expect(evaluateChallenge(challenge, { today: '2026-10-20', budget: null }).status).toBe('canceled');
  });

  test('no-spend days: marks without expenses plus past clean days of no-spend weeks, no double counting', () => {
    const count = countNoSpendDays({
      markDays: ['2026-10-10', '2026-10-27', '2026-10-28'],
      windows: [{ start_date: '2026-10-26', end_date: '2026-11-02' }],
      expenseDays: days('2026-10-10', '2026-10-26'),
      today: '2026-10-28'
    });
    // 10.10 — были траты; 27.10 (и отмечен, и в окне — один раз); 28.10 отмечен сегодня
    expect(count).toBe(2);
  });
});

describe('month in review helpers', () => {
  test('keyword counts: coffee, taxi, delivery; «кафе» is not coffee', () => {
    const counts = countKeywords([
      { description: 'Кофе' }, { description: 'раф на миндальном' }, { description: 'Starbucks latte' }, { description: 'кафе у дома' },
      { description: 'Яндекс Такси' }, { description: 'Uber' }, { description: 'Uber Eats' }, { description: 'Самокат' },
      { description: null }, { description: 'графин' }
    ]);
    expect(counts).toEqual([
      { key: 'coffee', count: 3 },
      { key: 'taxi', count: 2 },
      { key: 'delivery', count: 2 }
    ]);
  });

  test('comparison: the priciest item with at least 3 pieces', () => {
    const prices = { phone: 80000, sneakers: 9000, pizza: 1200, coffee: 300 };
    expect(pickComparison(15000, prices)).toEqual({ key: 'pizza', count: 13 });
    expect(pickComparison(300000, prices)).toEqual({ key: 'phone', count: 4 });
    expect(pickComparison(500, prices)).toEqual({ key: 'coffee', count: 1 });
    expect(pickComparison(100, prices)).toBeNull();
  });

  test('biggest day', () => {
    expect(biggestDay([{ day: '2026-10-01', total: 5 }, { day: '2026-10-02', total: 9 }])).toEqual({ day: '2026-10-02', total: 9 });
    expect(biggestDay([])).toBeNull();
  });
});

// ---------- AchievementService с репозиторием в памяти ----------

function fakeRepo({ stats = {}, expenseDays = [], incomeDays = [], markDays = [], unlocked = [], state = null, challenges = [] } = {}) {
  const repo = {
    stats: {
      expenses: 0, incomes: 0, records: 0, categories: 0, receipts: 0, imports: 0, earlyBird: false, nightOwl: false,
      budgets: 0, goals: 0, goalsReached: 0, debtsPaid: 0, savingsOps: 0, family: false, challengesWon: 0, ...stats
    },
    days: { expenseDays, incomeDays, markDays },
    freezes: [],
    unlocked: unlocked.map(code => ({ code, unlocked_at: new Date(), retroactive: false })),
    state,
    challenges,
    getStats: jest.fn(async () => ({ ...repo.stats })),
    getDays: jest.fn(async () => ({ expenseDays: [...repo.days.expenseDays], incomeDays: [...repo.days.incomeDays], markDays: [...repo.days.markDays] })),
    getFreezes: jest.fn(async () => [...repo.freezes]),
    getNoSpendWindows: jest.fn(async () => []),
    getUnlocked: jest.fn(async () => repo.unlocked.map(row => ({ ...row }))),
    addFreezes: jest.fn(async (userId, list) => {
      const added = list.filter(day => !repo.freezes.includes(day));
      repo.freezes.push(...added);
      return added;
    }),
    getState: jest.fn(async () => (repo.state ? { ...repo.state } : null)),
    createState: jest.fn(async (userId, level, today) => {
      if (repo.state) return null;
      repo.state = { user_id: userId, level_seen: level, streak_seen_date: today, wrapped_enabled: true };
      return { ...repo.state };
    }),
    unlock: jest.fn(async (userId, codes, retroactive) => {
      const added = codes.filter(code => !repo.unlocked.some(row => row.code === code));
      repo.unlocked.push(...added.map(code => ({ code, unlocked_at: new Date(), retroactive })));
      return added;
    }),
    raiseLevel: jest.fn(async (userId, level) => {
      if (repo.state.level_seen >= level) return false;
      repo.state.level_seen = level;
      return true;
    }),
    markStreakSeen: jest.fn(async (userId, today) => {
      if (repo.state.streak_seen_date && repo.state.streak_seen_date >= today) return false;
      repo.state.streak_seen_date = today;
      return true;
    }),
    getActiveChallenges: jest.fn(async () => repo.challenges.filter(c => c.status === 'active')),
    finishChallenge: jest.fn(async (id, status) => {
      const challenge = repo.challenges.find(c => c.id === id && c.status === 'active');
      if (!challenge) return null;
      challenge.status = status;
      return { ...challenge };
    }),
    getCategorySpendDays: jest.fn(async () => []),
    getUsersWithActiveChallenges: jest.fn(async () => []),
    getWrappedCandidates: jest.fn(async () => [])
  };
  return repo;
}

const textOf = (lang, key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

function buildService(repo, { timezone = 'UTC', premium = false } = {}) {
  return new AchievementService({
    achievementRepository: repo,
    userService: {
      getUserTimezone: jest.fn(async () => timezone),
      getUserLanguage: jest.fn(async () => 'ru'),
      getUserCurrency: jest.fn(async () => 'RUB')
    },
    premiumService: { getUserLimits: jest.fn(async () => (premium ? USER_LIMITS.premium : USER_LIMITS.regular)) },
    expenseService: {},
    reportService: {},
    budgetService: {},
    savingsService: null,
    currencyUtils: { convert: async (amount) => amount },
    formatter: new Formatter({ convert: async (amount) => amount }),
    localizationService: { getText: textOf },
    notificationService: { sendMessage: jest.fn(async () => ({})) },
    userNotificationRepository: { markSent: jest.fn(async () => true) }
  });
}

describe('AchievementService.track', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    jest.setSystemTime(new Date('2026-10-28T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  test('brand new user: the first expense is celebrated normally', async () => {
    const repo = fakeRepo({ stats: { expenses: 1, records: 1, categories: 1 }, expenseDays: ['2026-10-28'] });
    const note = await buildService(repo).track(1, 'expense_added', { lang: 'ru' });
    expect(note).toContain('ach_unlocked');
    expect(note).toContain('ach_first_expense_title');
    expect(repo.unlock).toHaveBeenCalledWith(1, ['first_expense'], false);
    expect(note).not.toContain('ach_retro_surprise');
  });

  test('existing user: history is granted silently with one surprise line, no repeat later', async () => {
    const history = Array.from({ length: 10 }, (_, i) => `2026-10-${String(19 + i).padStart(2, '0')}`);
    const repo = fakeRepo({
      stats: { expenses: 140, incomes: 5, records: 145, categories: 6, receipts: 2 },
      expenseDays: history
    });
    const service = buildService(repo);
    const note = await service.track(1, 'expense_added', { lang: 'ru' });
    expect(note.split('\n')).toHaveLength(1);
    expect(note).toContain('ach_retro_surprise');
    const granted = repo.unlock.mock.calls[0];
    expect(granted[2]).toBe(true); // retroactive
    expect(granted[1]).toEqual(expect.arrayContaining(['first_expense', 'records_100', 'streak_7', 'categories_5', 'first_receipt']));
    // Уровень запомнен молча — повторный вызов ничего не празднует
    expect(await service.track(1, 'expense_added', { lang: 'ru' })).toBe('');
  });

  test('level-up and unlock are announced once; streak line once a day from 2 days', async () => {
    const repo = fakeRepo({
      stats: { expenses: 9, records: 9, categories: 1 },
      expenseDays: ['2026-10-27', '2026-10-28'],
      unlocked: ['first_expense'],
      state: { user_id: 1, level_seen: 1, streak_seen_date: '2026-10-27', wrapped_enabled: true }
    });
    const service = buildService(repo);
    expect(await service.track(1, 'expense_added', { lang: 'ru' })).toBe('ach_streak_today:{"days":2}');
    expect(await service.track(1, 'expense_added', { lang: 'ru' })).toBe('');

    repo.stats = { ...repo.stats, expenses: 10, records: 10 };
    // XP: first_expense 10 + records_10 15 + 2 дня × 5 = 35 (уровень 1); с уже открытым streak_3 (+15) — ровно 50, уровень 2
    repo.unlocked.push({ code: 'streak_3', unlocked_at: new Date(), retroactive: false });
    const note = await service.track(1, 'expense_added', { lang: 'ru' });
    expect(note.split('\n')).toEqual([
      expect.stringContaining('ach_records_10_title'),
      expect.stringContaining('ach_level_up')
    ]);
    expect(repo.state.level_seen).toBe(2);
    expect(await service.track(1, 'expense_added', { lang: 'ru' })).toBe('');
  });

  test('a freeze used for a missed day is saved once and reported', async () => {
    const repo = fakeRepo({
      stats: { expenses: 3, records: 3 },
      expenseDays: ['2026-10-25', '2026-10-26', '2026-10-28'],
      unlocked: ['first_expense'],
      state: { user_id: 1, level_seen: 1, streak_seen_date: '2026-10-28', wrapped_enabled: true }
    });
    const service = buildService(repo);
    const note = await service.track(1, 'expense_added', { lang: 'ru' });
    expect(note).toContain('ach_freeze_used:{"dates":"27.10","days":3}');
    expect(repo.freezes).toEqual(['2026-10-27']);
    expect(note).toContain('ach_streak_3_title'); // серия 3 с заморозкой открывает «Искру»
    expect(await service.track(1, 'expense_added', { lang: 'ru' })).toBe('');
  });

  test('an expense in the category of an active «week without» challenge breaks it right away', async () => {
    const challenge = { id: 7, kind: 'no_category', category_name: 'Кафе', start_date: '2026-10-26', end_date: '2026-11-02', status: 'active' };
    const repo = fakeRepo({
      stats: { expenses: 3, records: 3 }, expenseDays: ['2026-10-28'], unlocked: ['first_expense'],
      state: { user_id: 1, level_seen: 1, streak_seen_date: '2026-10-28', wrapped_enabled: true }, challenges: [challenge]
    });
    const service = buildService(repo);
    expect(await service.track(1, 'expense_added', { lang: 'ru', categoryName: 'Транспорт' })).toBe('');
    const note = await service.track(1, 'expense_added', { lang: 'ru', categoryName: 'Кафе' });
    expect(note).toContain('ach_ch_broken');
    expect(challenge.status).toBe('lost');
  });

  test('never throws: a database error gives an empty note', async () => {
    const repo = fakeRepo();
    repo.getStats.mockRejectedValue(new Error('connection refused'));
    await expect(buildService(repo).track(1, 'expense_added', { lang: 'ru' })).resolves.toBe('');
  });

  test('timezones: the local day decides whether today is already recorded', async () => {
    jest.setSystemTime(new Date('2026-10-28T22:30:00Z')); // Токио — уже 29.10, Нью-Йорк — ещё 28.10
    const records = ['2026-10-26', '2026-10-27', '2026-10-28'];
    const tokyo = await buildService(fakeRepo({ expenseDays: records }), { timezone: 'Asia/Tokyo' }).snapshot(1);
    expect(tokyo.today).toBe('2026-10-29');
    expect(tokyo.streak).toMatchObject({ current: 3, todayActive: false, atRisk: true });
    const newYork = await buildService(fakeRepo({ expenseDays: records }), { timezone: 'America/New_York' }).snapshot(1);
    expect(newYork.today).toBe('2026-10-28');
    expect(newYork.streak).toMatchObject({ current: 3, todayActive: true, atRisk: false });
  });

  test('premium gets 2 freezes a week', async () => {
    const repo = fakeRepo({ expenseDays: ['2026-10-26', '2026-10-28'] });
    const snap = await buildService(repo, { premium: true }).snapshot(1, { commitFreezes: false });
    expect(snap.freezesPerWeek).toBe(2);
    expect(snap.streak.freezesLeft).toBe(1);
    expect(repo.addFreezes).not.toHaveBeenCalled();
  });

  test('reminder line: at-risk streak with / without a freeze left', async () => {
    const repo = fakeRepo({ expenseDays: ['2026-10-25', '2026-10-26', '2026-10-27'] });
    expect(await buildService(repo).reminderLine(1, 'ru')).toBe('ach_streak_risk_freeze:{"days":3}');
    const used = fakeRepo({ expenseDays: ['2026-10-25', '2026-10-27'] }); // 26.10 закрыт заморозкой этой недели
    expect(await buildService(used).reminderLine(1, 'ru')).toBe('ach_freeze_used:{"dates":"26.10","days":2}');
    const noFreeze = fakeRepo({ expenseDays: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-27'] });
    noFreeze.freezes = ['2026-10-26'];
    expect(await buildService(noFreeze).reminderLine(1, 'ru')).toBe('ach_streak_risk:{"days":4}');
  });
});

describe('AchievementService.processWrapped', () => {
  function wrappedService(now) {
    const repo = fakeRepo();
    repo.getWrappedCandidates.mockResolvedValue([{ id: 5, language: 'ru', timezone: 'Europe/Moscow', period_start_day: 1 }]);
    const service = buildService(repo, { timezone: 'Europe/Moscow' });
    service.buildWrapped = jest.fn(async () => ({ text: '🎉 *wrapped*', period: { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' } }));
    service.wasUnderBudget = jest.fn(async () => false);
    return { service, now };
  }

  test('sent on the first local day of the period from 10:00, once', async () => {
    const { service } = wrappedService();
    expect(await service.processWrapped(new Date('2026-11-01T06:30:00Z'))).toBe(0); // 09:30 МСК
    expect(await service.processWrapped(new Date('2026-11-01T07:05:00Z'))).toBe(1); // 10:05 МСК
    expect(service.buildWrapped).toHaveBeenCalledWith(5, 'ru', -1);
    service.userNotificationRepository.markSent.mockResolvedValue(false);
    expect(await service.processWrapped(new Date('2026-11-01T08:05:00Z'))).toBe(0);
    const [, , extra] = service.notificationService.sendMessage.mock.calls[0];
    expect(extra.reply_markup.inline_keyboard.map(row => row[0].callback_data)).toEqual(['ach', 'achwo']);
  });

  test('not sent on other days of the period', async () => {
    const { service } = wrappedService();
    expect(await service.processWrapped(new Date('2026-11-02T08:00:00Z'))).toBe(0);
    expect(service.buildWrapped).not.toHaveBeenCalled();
  });
});

describe('streak lines in the existing flows', () => {
  test('reminder gets the at-risk line appended', async () => {
    const userService = {
      userRepository: { query: jest.fn(async () => ({ rows: [{ id: 1, timezone: 'UTC', language: 'ru', reminder_hours: [10] }] })) },
      updateLastReminderLocalDate: jest.fn(async () => {}),
      setReminderSentTodayHours: jest.fn(async () => {})
    };
    const notificationService = {
      localizationService: { getText: (lang, key) => (key === 'reminder_sample_variants' ? ['Запиши траты'] : 'Напоминалка') },
      bot: { telegram: { sendMessage: jest.fn().mockResolvedValue({}) } }
    };
    const achievementService = { reminderLine: jest.fn(async () => '🔥 risk') };
    await sendReminders({ userService, expenseService: { hasAnyExpenseToday: async () => false }, notificationService, achievementService }, new Date('2026-10-26T10:00:00Z'));
    expect(notificationService.bot.telegram.sendMessage.mock.calls[0][1]).toBe('🔔 *Напоминалка*\n\nЗапиши траты\n\n🔥 risk');
  });

  test('daily summary ends with the streak line', async () => {
    const service = new DailySummaryService({
      expenseService: {
        getPeriodContext: async () => ({ timezone: 'UTC', currency: 'RUB', today: '2026-10-26', period: { start: '2026-10-26', end: '2026-10-27' } }),
        getTotals: async () => ({ count: 1, byCurrency: [{ currency: 'RUB', total: 100 }] })
      },
      incomeService: { getTotals: async () => ({ count: 0, byCurrency: [] }) },
      reportService: { categoryBreakdown: async () => [], categoryLabel: () => '' },
      userNotificationRepository: {},
      notificationService: {},
      localizationService: { getText: textOf },
      formatter: new Formatter({ convert: async (amount) => amount }),
      achievementService: { summaryLine: async () => '🔥 Серия: 5 дн.' }
    });
    const summary = await service.buildSummary(1, 'ru');
    expect(summary.text.endsWith('\n\n🔥 Серия: 5 дн.')).toBe(true);
  });
});
