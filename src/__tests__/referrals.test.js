const ReferralService = require('../services/ReferralService');
const { generateCode, inviterBonusDays, maxInviterDays, CODE_ALPHABET } = require('../services/ReferralService');
const UserService = require('../services/UserService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const CommandHandlers = require('../handlers/commands');
const { REFERRAL, PREMIUM_TARIFFS, TRIAL_PERIOD } = require('../utils/constants');

const DAY = 24 * 60 * 60 * 1000;
const INVITER = 777665001;
const FRIEND = 777665002;

// Хранилище в памяти с той же семантикой, что ReferralRepository: уникальные коды, один пригласивший,
// награда — ровно один раз (проверка и отметка без await между ними, как строка под FOR UPDATE)
function makeReferralRepository() {
  const codes = new Map(); // userId → code
  const referrals = new Map(); // inviteeId → { inviterId, rewarded, inviteeDays, inviterDays }
  const expenses = new Map(); // userId → qualifying count
  const upsells = new Map(); // userId → [Date]
  const sharePrompts = []; // { userId, moment, at }
  let now = Date.now();
  return {
    codes, referrals, expenses, upsells, sharePrompts,
    setNow: (ms) => { now = ms; },
    getCode: async (userId) => codes.get(userId) || null,
    insertCode: async (userId, code) => {
      if (codes.has(userId) || [...codes.values()].includes(code)) return null;
      codes.set(userId, code);
      return code;
    },
    findUserIdByCode: async (code) => {
      for (const [userId, value] of codes) if (value === code) return userId;
      return null;
    },
    createReferral: async (inviteeId, inviterId) => {
      if (referrals.has(inviteeId)) return false;
      referrals.set(inviteeId, { inviterId, rewarded: false, inviteeDays: 0, inviterDays: 0 });
      return true;
    },
    getPendingInviter: async (inviteeId) => {
      const row = referrals.get(inviteeId);
      return row && !row.rewarded ? row.inviterId : null;
    },
    // В моке каждая трата — в свой день: { count, days }
    countQualifyingExpenses: async (userId) => ({ count: expenses.get(userId) || 0, days: expenses.get(userId) || 0 }),
    claimReward: async (inviteeId, inviteeDays, decide) => {
      const row = referrals.get(inviteeId);
      if (!row || row.rewarded) return null;
      const own = [...referrals.values()].filter(r => r.inviterId === row.inviterId);
      const inviterDays = decide({ rewarded: own.filter(r => r.inviterDays > 0).length, days: own.reduce((s, r) => s + r.inviterDays, 0) });
      Object.assign(row, { rewarded: true, inviteeDays, inviterDays });
      return { inviterId: row.inviterId, inviteeDays, inviterDays };
    },
    getInviterStats: async (inviterId) => {
      const own = [...referrals.values()].filter(r => r.inviterId === inviterId);
      return {
        invited: own.length,
        activated: own.filter(r => r.rewarded).length,
        rewarded: own.filter(r => r.inviterDays > 0).length,
        days: own.reduce((s, r) => s + r.inviterDays, 0)
      };
    },
    claimUpsellSlot: async (userId, intervalDays) => {
      const shown = upsells.get(userId) || [];
      if (shown.some(at => now - at < intervalDays * DAY)) return false;
      upsells.set(userId, [...shown, now]);
      return true;
    },
    // Как ReferralRepository.claimSharePrompt: момент — один раз, любая подсказка — не чаще раза в intervalDays
    claimSharePrompt: async (userId, moment, intervalDays) => {
      const own = sharePrompts.filter(p => p.userId === userId);
      if (own.some(p => p.moment === moment || now - p.at < intervalDays * DAY)) return false;
      sharePrompts.push({ userId, moment, at: now });
      return true;
    },
    getPremiumSource: async () => null
  };
}

// UserService на настоящей логике activatePremium: строки пользователей в памяти
function makeUserService(users) {
  const userRepository = {
    getUserById: async (id) => (users.has(id) ? { ...users.get(id) } : undefined),
    getUserLanguage: async (id) => (users.get(id) && users.get(id).language) || 'ru',
    getUserTimezone: async () => 'Europe/Moscow',
    query: async (sql, params) => {
      if (/premium_activated_at = COALESCE/.test(sql)) {
        const [expiresAt, id, now] = params;
        const row = users.get(id);
        Object.assign(row, { premium: true, premium_expires_at: expiresAt, premium_activated_at: row.premium_activated_at || now });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const premiumTransactionRepository = { createTransaction: jest.fn(async () => ({ id: 1 })) };
  const userService = new UserService(userRepository, {}, premiumTransactionRepository);
  userService.getUserLanguage = async (id) => userRepository.getUserLanguage(id);
  userService.getUserTimezone = async () => 'Europe/Moscow';
  return { userService, premiumTransactionRepository };
}

function makeService({ users = new Map(), repository = makeReferralRepository(), config } = {}) {
  const { userService, premiumTransactionRepository } = makeUserService(users);
  const notificationService = { sendMessage: jest.fn(async () => {}), botUsername: () => 'ExpensesAssistant_bot' };
  const service = new ReferralService({
    referralRepository: repository,
    userService,
    notificationService,
    localizationService: new LocalizationService(),
    formatter: new Formatter({ convert: async (amount) => amount }),
    ...(config ? { config } : {})
  });
  return { service, repository, users, userService, notificationService, premiumTransactionRepository };
}

const freeUser = (id, extra = {}) => [id, { id, first_name: `User${id}`, language: 'ru', premium: false, premium_expires_at: null, premium_activated_at: new Date(Date.now() - 60 * DAY), ...extra }];

describe('referral codes', () => {
  test('generated code: 7 chars from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(7);
      expect([...code].every(ch => CODE_ALPHABET.includes(ch))).toBe(true);
      expect(code).toMatch(/^[a-z0-9]+$/);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01ilo]/);
  });

  test('codes are practically unique', () => {
    const codes = new Set(Array.from({ length: 5000 }, () => generateCode()));
    expect(codes.size).toBe(5000);
  });

  test('getOrCreateCode: lazily creates once, then returns the same code', async () => {
    const { service, repository } = makeService();
    const code = await service.getOrCreateCode(INVITER);
    expect(await service.getOrCreateCode(INVITER)).toBe(code);
    expect(repository.codes.size).toBe(1);
  });

  test('getOrCreateCode: a code taken by someone else is regenerated', async () => {
    const { service, repository } = makeService();
    const taken = generateCode();
    repository.codes.set(1, taken);
    const insert = jest.spyOn(repository, 'insertCode');
    const spy = jest.spyOn(require('crypto'), 'randomInt');
    // первая попытка повторяет чужой код, вторая — случайная
    const takenIndexes = [...taken].map(ch => CODE_ALPHABET.indexOf(ch));
    takenIndexes.forEach(index => spy.mockImplementationOnce(() => index));
    const code = await service.getOrCreateCode(INVITER);
    spy.mockRestore();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(code).not.toBe(taken);
    expect(repository.codes.get(INVITER)).toBe(code);
  });

  test('getOrCreateCode: a parallel call that created the code wins', async () => {
    const repository = makeReferralRepository();
    repository.insertCode = async () => { repository.codes.set(INVITER, 'parallel'); return null; };
    const { service } = makeService({ repository });
    expect(await service.getOrCreateCode(INVITER)).toBe('parallel');
  });

  test('getOrCreateCode: gives up after repeated collisions', async () => {
    const repository = makeReferralRepository();
    repository.insertCode = jest.fn(async () => null);
    const { service } = makeService({ repository });
    await expect(service.getOrCreateCode(INVITER)).rejects.toThrow('Failed to generate referral code');
    expect(repository.insertCode).toHaveBeenCalledTimes(5);
  });

  test('start payload: only ref_<code> is an invite, ad codes are not', () => {
    expect(ReferralService.parseStartCode('ref_k3m9x2p')).toBe('k3m9x2p');
    expect(ReferralService.parseStartCode('REF_K3M9X2P')).toBe('k3m9x2p');
    expect(ReferralService.parseStartCode('ads_tg1')).toBeNull();
    expect(ReferralService.parseStartCode('ref_')).toBeNull();
    expect(ReferralService.parseStartCode('ref_ab')).toBeNull();
    expect(ReferralService.parseStartCode('ref_abc-def')).toBeNull();
    expect(ReferralService.parseStartCode(null)).toBeNull();
  });

  test('start payload: share_<kind>_<code> from a shared card is an invite too; share_<kind> alone is not', () => {
    expect(ReferralService.parseStartCode('share_wrapped_k3m9x2p')).toBe('k3m9x2p');
    expect(ReferralService.parseStartCode('share_quiz_K3M9X2P')).toBe('k3m9x2p');
    expect(ReferralService.parseStartCode('share_quiz')).toBeNull();
    expect(ReferralService.parseShareKind('share_roast_k3m9x2p')).toBe('roast');
    expect(ReferralService.parseShareKind('share_quiz')).toBe('quiz');
    expect(ReferralService.parseShareKind('ref_k3m9x2p')).toBeNull();
  });

  test('funnel source: invites are "ref", shared cards are share_<kind> (without the code), ad codes as is', () => {
    expect(ReferralService.funnelSource('ref_k3m9x2p')).toBe('ref');
    expect(ReferralService.funnelSource('share_wrapped_k3m9x2p')).toBe('share_wrapped');
    expect(ReferralService.funnelSource('share_quiz')).toBe('share_quiz');
    expect(ReferralService.funnelSource('ads_tg1')).toBe('ads_tg1');
    expect(ReferralService.funnelSource(null)).toBeNull();
  });

  test('invite and share links', () => {
    const link = ReferralService.inviteLink('ExpensesAssistant_bot', 'k3m9x2p');
    expect(link).toBe('https://t.me/ExpensesAssistant_bot?start=ref_k3m9x2p');
    const share = new URL(ReferralService.shareUrl(link, 'Попробуй & смотри'));
    expect(share.origin + share.pathname).toBe('https://t.me/share/url');
    expect(share.searchParams.get('url')).toBe(link);
    expect(share.searchParams.get('text')).toBe('Попробуй & смотри');
  });

  test('share links carry the user\'s code and the share kind; without a code — share_<kind>', async () => {
    expect(ReferralService.shareLink('ExpensesAssistant_bot', 'quiz', 'k3m9x2p')).toBe('https://t.me/ExpensesAssistant_bot?start=share_quiz_k3m9x2p');
    expect(ReferralService.shareLink('ExpensesAssistant_bot', 'roast')).toBe('https://t.me/ExpensesAssistant_bot?start=share_roast');
    expect(ReferralService.shareLink(null, 'wrapped', 'k3m9x2p')).toBeNull();
    expect(() => ReferralService.shareLink('ExpensesAssistant_bot', 'other')).toThrow('Unknown share kind');

    const { service } = makeService();
    const link = await service.shareLinkFor(INVITER, 'wrapped', 'ExpensesAssistant_bot');
    const code = await service.getOrCreateCode(INVITER);
    expect(link).toBe(`https://t.me/ExpensesAssistant_bot?start=share_wrapped_${code}`);
    // Ссылка проходит проверку start-параметра Telegram и ведёт к тому же пригласившему
    const payload = new URL(link).searchParams.get('start');
    expect(payload).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(ReferralService.parseStartCode(payload)).toBe(code);
  });
});

describe('referral attribution', () => {
  async function setup() {
    const ctx = makeService({ users: new Map([freeUser(INVITER)]) });
    const code = await ctx.service.getOrCreateCode(INVITER);
    return { ...ctx, code };
  }

  test('a genuinely new user is attributed to the inviter', async () => {
    const { service, repository, code } = await setup();
    expect(await service.attribute(FRIEND, code, { isNew: true })).toEqual({ status: 'attributed', inviterId: INVITER });
    expect(await repository.getPendingInviter(FRIEND)).toBe(INVITER);
  });

  test('an existing user is ignored', async () => {
    const { service, repository, code } = await setup();
    expect(await service.attribute(FRIEND, code, { isNew: false })).toEqual({ status: 'ignored', reason: 'not_new' });
    expect(repository.referrals.size).toBe(0);
  });

  test('self-referral is ignored', async () => {
    const { service, repository, code } = await setup();
    expect(await service.attribute(INVITER, code, { isNew: true })).toEqual({ status: 'ignored', reason: 'self' });
    expect(repository.referrals.size).toBe(0);
  });

  test('unknown code and a second inviter are ignored', async () => {
    const { service, repository, code } = await setup();
    expect(await service.attribute(FRIEND, 'zzzzzzz', { isNew: true })).toEqual({ status: 'ignored', reason: 'unknown_code' });
    await service.attribute(FRIEND, code, { isNew: true });
    const otherCode = await service.getOrCreateCode(777665003);
    expect(await service.attribute(FRIEND, otherCode, { isNew: true })).toEqual({ status: 'ignored', reason: 'already' });
    expect(repository.referrals.get(FRIEND).inviterId).toBe(INVITER);
  });

  describe('/start', () => {
    function startHandlers(registered) {
      const referralService = {
        attribute: jest.fn(async () => ({ status: 'attributed', inviterId: INVITER })),
        notifyJoined: jest.fn(async () => {}),
        getPendingInviter: jest.fn(async () => null)
      };
      const funnelService = { registerSource: jest.fn(async () => {}), track: jest.fn(async () => {}) };
      const handlers = new CommandHandlers({
        userService: { registerUser: jest.fn(async () => registered), getUserLanguage: async () => 'ru', getOnboarding: async () => ({ answers: { status: 'completed' }, completedAt: new Date() }) },
        localizationService: new LocalizationService(),
        funnelService,
        referralService,
        keyboardGenerators: { generateMainMenuKeyboard: () => [] },
        premiumService: { isPremiumUser: async () => false },
        familyService: {}
      });
      handlers.onboardingLanguage = jest.fn(async () => {});
      const ctx = { from: { id: FRIEND, first_name: 'Аня' }, message: { text: '/start ref_k3m9x2p' }, reply: jest.fn(async () => ({})) };
      return { handlers, referralService, funnelService, ctx, userService: handlers.userService };
    }

    test('new user via ref link: attributed, inviter notified, funnel source is "ref"', async () => {
      const { handlers, referralService, userService, ctx } = startHandlers({ isNew: true, justCreated: true });
      await handlers.start(ctx);
      expect(referralService.attribute).toHaveBeenCalledWith(FRIEND, 'k3m9x2p', { isNew: true });
      expect(referralService.notifyJoined).toHaveBeenCalledWith(INVITER, ctx.from);
      // Источник пишет регистрация (UserService.registerUser) — только новому
      expect(userService.registerUser).toHaveBeenCalledWith(FRIEND, undefined, 'Аня', expect.objectContaining({ source: 'ref' }));
    });

    test('returning user via ref link: nothing is attributed', async () => {
      const { handlers, referralService, ctx } = startHandlers({ isNew: false, justCreated: false });
      await handlers.start(ctx);
      expect(referralService.attribute).not.toHaveBeenCalled();
      expect(referralService.notifyJoined).not.toHaveBeenCalled();
    });

    test('ad codes keep working as the source', async () => {
      const { handlers, referralService, userService, ctx } = startHandlers({ isNew: true, justCreated: true });
      ctx.message.text = '/start ads_tg1';
      await handlers.start(ctx);
      expect(userService.registerUser).toHaveBeenCalledWith(FRIEND, undefined, 'Аня', expect.objectContaining({ source: 'ads_tg1' }));
      expect(referralService.attribute).not.toHaveBeenCalled();
    });

    test('new user via a shared card: attributed to the sharer, funnel source is share_<kind>', async () => {
      const { handlers, referralService, userService, ctx } = startHandlers({ isNew: true, justCreated: true });
      ctx.message.text = '/start share_wrapped_k3m9x2p';
      await handlers.start(ctx);
      expect(referralService.attribute).toHaveBeenCalledWith(FRIEND, 'k3m9x2p', { isNew: true });
      expect(userService.registerUser).toHaveBeenCalledWith(FRIEND, undefined, 'Аня', expect.objectContaining({ source: 'share_wrapped' }));
    });

    test('returning user via a shared quiz card goes straight to the quiz', async () => {
      const { handlers, referralService, ctx } = startHandlers({ isNew: false, justCreated: false });
      handlers.quizHandlers = { show: jest.fn(async () => {}) };
      ctx.message.text = '/start share_quiz_k3m9x2p';
      await handlers.start(ctx);
      expect(handlers.quizHandlers.show).toHaveBeenCalledWith(ctx);
      expect(referralService.attribute).not.toHaveBeenCalled();
    });
  });
});

describe('referral reward', () => {
  async function invited({ inviter = {}, friend = {}, config } = {}) {
    const users = new Map([freeUser(INVITER, inviter), freeUser(FRIEND, friend)]);
    const ctx = makeService({ users, config });
    const code = await ctx.service.getOrCreateCode(INVITER);
    await ctx.service.attribute(FRIEND, code, { isNew: true });
    return ctx;
  }

  test('fires exactly on the 3rd qualifying expense, once', async () => {
    const { service, repository, premiumTransactionRepository, notificationService, users } = await invited();
    for (const count of [1, 2]) {
      repository.expenses.set(FRIEND, count);
      expect(await service.onExpenseRecorded(FRIEND)).toBeNull();
    }
    expect(premiumTransactionRepository.createTransaction).not.toHaveBeenCalled();

    repository.expenses.set(FRIEND, 3);
    const reward = await service.onExpenseRecorded(FRIEND);
    expect(reward).toEqual(expect.objectContaining({ inviterId: INVITER, inviteeDays: REFERRAL.REWARD_DAYS, inviterDays: REFERRAL.REWARD_DAYS }));
    expect(REFERRAL.REWARD_DAYS).toBe(7);
    expect(users.get(FRIEND).premium).toBe(true);
    expect(users.get(INVITER).premium).toBe(true);

    repository.expenses.set(FRIEND, 4);
    expect(await service.onExpenseRecorded(FRIEND)).toBeNull();
    expect(premiumTransactionRepository.createTransaction).toHaveBeenCalledTimes(2);
    expect(notificationService.sendMessage.mock.calls.map(([to]) => to).sort()).toEqual([INVITER, FRIEND].sort());
  });

  test('parallel 3rd expenses reward once', async () => {
    const { service, repository, premiumTransactionRepository } = await invited();
    repository.expenses.set(FRIEND, 3);
    const results = await Promise.all([service.onExpenseRecorded(FRIEND), service.onExpenseRecorded(FRIEND)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(premiumTransactionRepository.createTransaction).toHaveBeenCalledTimes(2);
  });

  test('a user who was not invited never triggers a reward', async () => {
    const { service, repository, premiumTransactionRepository } = makeService({ users: new Map([freeUser(FRIEND)]) });
    repository.expenses.set(FRIEND, 10);
    expect(await service.onExpenseRecorded(FRIEND)).toBeNull();
    expect(premiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
  });

  test('both sides get 7 days of premium as a free referral transaction, not a payment', async () => {
    const { service, repository, premiumTransactionRepository, users } = await invited();
    repository.expenses.set(FRIEND, 3);
    const before = Date.now();
    await service.onExpenseRecorded(FRIEND);
    const calls = premiumTransactionRepository.createTransaction.mock.calls.map(([tx]) => tx);
    expect(calls.map(tx => JSON.parse(tx.invoice_payload).role).sort()).toEqual(['invitee', 'inviter']);
    for (const tx of calls) {
      expect(tx).toEqual(expect.objectContaining({ stars_amount: 0, telegram_payment_id: null, tariff_duration: REFERRAL.REWARD_DAYS, status: 'completed' }));
      expect(JSON.parse(tx.invoice_payload).type).toBe('referral');
      expect(['activation', 'extension']).toContain(tx.transaction_type);
    }
    for (const id of [INVITER, FRIEND]) {
      expect(users.get(id).premium_expires_at.getTime()).toBeGreaterThanOrEqual(before + REFERRAL.REWARD_DAYS * DAY);
      expect(users.get(id).premium_expires_at.getTime()).toBeLessThanOrEqual(Date.now() + REFERRAL.REWARD_DAYS * DAY);
    }
  });

  test('notifications: Markdown-safe friend name, no leftover placeholders', async () => {
    const { service, repository, notificationService } = await invited({ friend: { first_name: 'Ann_*bold*' } });
    repository.expenses.set(FRIEND, 3);
    await service.onExpenseRecorded(FRIEND);
    for (const [, text, extra] of notificationService.sendMessage.mock.calls) {
      expect(text).not.toMatch(/\{\w+\}/);
      expect(extra.parse_mode).toBe('Markdown');
      expect(extra.reply_markup.inline_keyboard[0][0].callback_data).toBe('ref');
    }
    const inviterText = notificationService.sendMessage.mock.calls.find(([to]) => to === INVITER)[1];
    expect(inviterText).toContain('Ann\\_\\*bold\\*');
  });

  describe('premium extension math', () => {
    test('active paid premium: 7 days are added to the current expiry', async () => {
      const expiry = new Date(Date.now() + 10 * DAY);
      const { service, repository, users } = await invited({ inviter: { premium: true, premium_expires_at: expiry } });
      repository.expenses.set(FRIEND, 3);
      await service.onExpenseRecorded(FRIEND);
      expect(users.get(INVITER).premium_expires_at.getTime()).toBe(expiry.getTime() + REFERRAL.REWARD_DAYS * DAY);
    });

    test('expired premium: 7 days from now', async () => {
      const { service, repository, users } = await invited({ inviter: { premium: true, premium_expires_at: new Date(Date.now() - 3 * DAY) } });
      repository.expenses.set(FRIEND, 3);
      const before = Date.now();
      await service.onExpenseRecorded(FRIEND);
      const after = Date.now();
      const expires = users.get(INVITER).premium_expires_at.getTime();
      expect(expires).toBeGreaterThanOrEqual(before + REFERRAL.REWARD_DAYS * DAY);
      expect(expires).toBeLessThanOrEqual(after + REFERRAL.REWARD_DAYS * DAY);
    });

    test('trial (the invited friend): 7 days are added to the trial, activation date kept', async () => {
      const activated = new Date(Date.now() - DAY);
      const trialEnd = new Date(activated.getTime() + TRIAL_PERIOD.DAYS * DAY);
      const { service, repository, users } = await invited({ friend: { premium: true, premium_expires_at: trialEnd, premium_activated_at: activated } });
      repository.expenses.set(FRIEND, 3);
      await service.onExpenseRecorded(FRIEND);
      expect(users.get(FRIEND).premium_expires_at.getTime()).toBe(trialEnd.getTime() + REFERRAL.REWARD_DAYS * DAY);
    });
  });

  describe('inviter caps', () => {
    test('bonus days: per invite, by rewarded count and by total days', () => {
      expect(inviterBonusDays({ rewarded: 0, days: 0 })).toBe(REFERRAL.REWARD_DAYS);
      expect(inviterBonusDays({ rewarded: 9, days: 69 })).toBe(1);
      expect(inviterBonusDays({ rewarded: 9, days: 63 })).toBe(7);
      expect(inviterBonusDays({ rewarded: 10, days: 0 })).toBe(0);
      expect(inviterBonusDays({ rewarded: 10, days: 70 })).toBe(0);
      const loose = { ...REFERRAL, MAX_REWARDED_INVITES: 100 };
      expect(inviterBonusDays({ rewarded: 12, days: 67 }, loose)).toBe(3); // до 70 дней осталось 3
      expect(inviterBonusDays({ rewarded: 13, days: 70 }, loose)).toBe(0);
      expect(maxInviterDays()).toBe(REFERRAL.MAX_BONUS_DAYS);
      expect(maxInviterDays(loose)).toBe(REFERRAL.MAX_BONUS_DAYS);
    });

    test('capped inviter: friend still gets the days, inviter gets a thank-you without days', async () => {
      const ctx = await invited();
      for (let i = 0; i < REFERRAL.MAX_REWARDED_INVITES; i++) {
        ctx.repository.referrals.set(900 + i, { inviterId: INVITER, rewarded: true, inviteeDays: REFERRAL.REWARD_DAYS, inviterDays: REFERRAL.REWARD_DAYS });
      }
      ctx.repository.expenses.set(FRIEND, 3);
      const reward = await ctx.service.onExpenseRecorded(FRIEND);
      expect(reward).toEqual(expect.objectContaining({ inviteeDays: REFERRAL.REWARD_DAYS, inviterDays: 0 }));
      expect(ctx.users.get(INVITER).premium).toBe(false);
      expect(ctx.users.get(FRIEND).premium).toBe(true);
      const inviterText = ctx.notificationService.sendMessage.mock.calls.find(([to]) => to === INVITER)[1];
      expect(inviterText).toContain(String(REFERRAL.MAX_BONUS_DAYS));
      expect((await ctx.service.getStats(INVITER)).capped).toBe(true);
    });
  });
});

describe('limit upsell', () => {
  const base = () => [[{ text: '⭐️ Премиум', callback_data: 'premium_subscription' }], [{ text: '⬅️ Назад', callback_data: 'sv' }]];

  test('appends the line and the invite button after the premium button, then waits 7 days', async () => {
    const { service, repository } = makeService();
    const first = await service.withUpsell(FRIEND, 'ru', 'Лимит', base());
    expect(first.text).toBe('Лимит\n\n🎁 Или пригласи друга — вам обоим +7 дней премиума.');
    expect(first.keyboard.map(row => row[0].callback_data)).toEqual(['premium_subscription', 'ref', 'sv']);

    const again = await service.withUpsell(FRIEND, 'ru', 'Лимит', base());
    expect(again).toEqual({ text: 'Лимит', keyboard: base() });

    repository.setNow(Date.now() + 7 * DAY + 1000);
    expect((await service.withUpsell(FRIEND, 'ru', 'Лимит', base())).keyboard).toHaveLength(3);
  });

  test('not shown to an inviter who already collected every bonus', async () => {
    const { service, repository } = makeService();
    for (let i = 0; i < REFERRAL.MAX_REWARDED_INVITES; i++) {
      repository.referrals.set(900 + i, { inviterId: FRIEND, rewarded: true, inviteeDays: REFERRAL.REWARD_DAYS, inviterDays: REFERRAL.REWARD_DAYS });
    }
    expect(await service.withUpsell(FRIEND, 'en', 'Limit', base())).toEqual({ text: 'Limit', keyboard: base() });
  });

  test('a failing check never breaks the limit message', async () => {
    const repository = makeReferralRepository();
    repository.getInviterStats = async () => { throw new Error('db down'); };
    const { service } = makeService({ repository });
    expect(await service.withUpsell(FRIEND, 'ru', 'Лимит', base())).toEqual({ text: 'Лимит', keyboard: base() });
  });
});

describe('share prompt («📤 Покажи другу»)', () => {
  const sent = (notificationService) => notificationService.sendMessage.mock.calls;

  test('a short line and a button that opens the invite share with the user\'s referral link', async () => {
    const { service, notificationService } = makeService({ users: new Map([freeUser(INVITER)]) });
    expect(await service.offerShare(INVITER, 'streak')).toBe(true);
    const code = await service.getOrCreateCode(INVITER);
    const [[to, text, extra]] = sent(notificationService);
    expect(to).toBe(INVITER);
    expect(text).toContain('Покажи бота другу');
    expect(text).toContain('вам обоим +7 дней премиума');
    expect(text).not.toMatch(/\{\w+\}/);
    const button = extra.reply_markup.inline_keyboard[0][0];
    expect(button.text).toBe('📤 Покажи другу');
    const share = new URL(button.url);
    expect(share.origin + share.pathname).toBe('https://t.me/share/url');
    expect(share.searchParams.get('url')).toBe(`https://t.me/ExpensesAssistant_bot?start=ref_${code}`);
    expect(share.searchParams.get('text')).toContain('+7');
  });

  test('each moment once per user, and not more than once a week across all moments', async () => {
    const { service, repository, notificationService } = makeService({ users: new Map([freeUser(INVITER)]) });
    const start = Date.now();
    expect(await service.offerShare(INVITER, 'wrapped')).toBe(true);
    expect(await service.offerShare(INVITER, 'wrapped')).toBe(false); // тот же момент
    expect(await service.offerShare(INVITER, 'quiz')).toBe(false); // другой момент, но неделя не прошла

    repository.setNow(start + 6 * DAY);
    expect(await service.offerShare(INVITER, 'goal')).toBe(false);
    repository.setNow(start + 7 * DAY + 1000);
    expect(await service.offerShare(INVITER, 'wrapped')).toBe(false); // этот момент уже был — никогда снова
    expect(await service.offerShare(INVITER, 'quiz')).toBe(true);
    expect(await service.offerShare(INVITER, 'goal')).toBe(false); // снова неделя

    repository.setNow(start + 15 * DAY);
    expect(await service.offerShare(INVITER, 'goal')).toBe(true);
    repository.setNow(start + 60 * DAY);
    expect(await service.offerShare(INVITER, 'streak')).toBe(true);
    expect(await service.offerShare(INVITER, 'quiz')).toBe(false);
    expect(sent(notificationService)).toHaveLength(4);
    // Другой пользователь — своя история
    expect(await service.offerShare(FRIEND, 'wrapped')).toBe(true);
  });

  test('capped inviter: the line promises the bonus to the friend only', async () => {
    const { service, repository, notificationService } = makeService({ users: new Map([freeUser(INVITER)]) });
    for (let i = 0; i < REFERRAL.MAX_REWARDED_INVITES; i++) {
      repository.referrals.set(900 + i, { inviterId: INVITER, rewarded: true, inviteeDays: REFERRAL.REWARD_DAYS, inviterDays: REFERRAL.REWARD_DAYS });
    }
    await service.offerShare(INVITER, 'goal');
    const text = sent(notificationService)[0][1];
    expect(text).toContain('Друг по твоей ссылке получит +7 дней премиума');
    expect(text).not.toContain('вам обоим');
  });

  test('no bot username, failing DB or blocked bot — nothing breaks; unknown moment is a programming error', async () => {
    const quiet = makeService();
    quiet.notificationService.botUsername = () => null;
    expect(await quiet.service.offerShare(INVITER, 'quiz')).toBe(false);

    const repository = makeReferralRepository();
    repository.claimSharePrompt = async () => { throw new Error('db down'); };
    expect(await makeService({ repository }).service.offerShare(INVITER, 'quiz')).toBe(false);

    const blocked = makeService();
    blocked.notificationService.sendMessage.mockRejectedValue(new Error('Forbidden: bot was blocked by the user'));
    expect(await blocked.service.offerShare(INVITER, 'quiz')).toBe(false);

    await expect(makeService().service.offerShare(INVITER, 'birthday')).rejects.toThrow('Unknown share moment');
  });

  test('offerShareLater sends after the delay (after the reply to the action)', async () => {
    jest.useFakeTimers();
    try {
      const { service, notificationService } = makeService({ config: { ...REFERRAL, SHARE_PROMPT_DELAY_MS: 50 } });
      service.offerShareLater(INVITER, 'goal');
      expect(sent(notificationService)).toHaveLength(0);
      await jest.advanceTimersByTimeAsync(50);
      expect(sent(notificationService)).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('every language has the share prompt and 7-day invite texts', () => {
  const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'hi', 'ka', 'kz', 'uz', 'jp', 'zh'];
  const KEYS = ['share_prompt_streak', 'share_prompt_wrapped', 'share_prompt_quiz', 'share_prompt_goal', 'share_prompt_bonus_both', 'share_prompt_bonus_friend', 'share_prompt_button'];

  test.each(LANGS)('%s', (lang) => {
    const locale = require(`../locales/${lang}`);
    for (const key of KEYS) expect([lang, key, typeof locale[key]]).toEqual([lang, key, 'string']);
    for (const key of ['share_prompt_bonus_both', 'share_prompt_bonus_friend']) expect(locale[key]).toContain('{days}');
    expect(locale.command_invite).toContain('+7');
    expect(locale.command_invite).not.toMatch(/\+30/);
  });
});

describe('premium screen pitch', () => {
  function pitchHandlers({ source = null, count = 0, capped = false, receipts = true } = {}) {
    return new CommandHandlers({
      localizationService: new LocalizationService(),
      formatter: new Formatter({ convert: async (amount) => amount * 100 }),
      userService: { getUserCurrency: async () => 'RUB' },
      expenseService: { getTotals: async () => ({ count, byCurrency: [] }) },
      receiptService: { configured: receipts },
      referralService: {
        getPremiumSource: async () => source,
        getStats: async () => ({ capped }),
        rewardDays: REFERRAL.REWARD_DAYS
      }
    });
  }

  test('free user: personal hook from the last 30 days, grouped benefits, yearly price per month, invite line', async () => {
    const { blocks, referral } = await pitchHandlers({ count: 87 }).premiumPitch(1, 'ru', 'UTC', { isPremium: false }, null);
    const text = blocks.join('\n\n');
    expect(text).toContain('Записей за 30 дней: <b>87</b>');
    expect(text).toContain('Видишь, куда уходят деньги');
    expect(text).toContain('Фото чеков: до 300 в месяц (без премиума — 10)');
    const year = PREMIUM_TARIFFS.MONTH_12;
    expect(text).toContain(`≈ ${Math.round(year.stars / 12)} ⭐`);
    expect(text).toContain('экономия 44%');
    expect(referral).toBe(true);
    expect(text).not.toMatch(/\{\w+\}/);
  });

  test('trial user: trial hook and note; paid user: no hook, no invite line', async () => {
    const trial = (await pitchHandlers({ source: 'trial', count: 5 }).premiumPitch(1, 'en', 'UTC', { isPremium: true }, null)).blocks.join('\n');
    expect(trial).toContain('After the trial');
    expect(trial).toContain('premium trial now');

    const paid = await pitchHandlers({ source: 'paid', count: 5 }).premiumPitch(1, 'en', 'UTC', { isPremium: true }, { subscription_expires_at: new Date() });
    const paidText = paid.blocks.join('\n');
    expect(paidText).not.toContain('Entries in the last 30 days');
    expect(paidText).not.toContain('Best value');
    expect(paid.referral).toBe(false);
  });

  test('no entries — no hook; receipts not configured — no receipt line', async () => {
    const text = (await pitchHandlers({ count: 0, receipts: false }).premiumPitch(1, 'ru', 'UTC', { isPremium: false }, null)).blocks.join('\n');
    expect(text).not.toContain('Записей за 30 дней');
    expect(text).not.toContain('Фото чеков');
  });

  test('every language renders without leftover placeholders and with balanced HTML bold', async () => {
    for (const lang of ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'ka', 'kz', 'uz', 'hi', 'jp', 'zh']) {
      const text = (await pitchHandlers({ source: 'trial', count: 3 }).premiumPitch(1, lang, 'UTC', { isPremium: true }, null)).blocks.join('\n\n');
      expect(text).not.toMatch(/\{\w+\}/);
      expect((text.match(/<b>/g) || []).length).toBe((text.match(/<\/b>/g) || []).length);
    }
  });
});
