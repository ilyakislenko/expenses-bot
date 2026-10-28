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
  let now = Date.now();
  return {
    codes, referrals, expenses, upsells,
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
  const notificationService = { sendMessage: jest.fn(async () => {}) };
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

  test('invite and share links', () => {
    const link = ReferralService.inviteLink('ExpensesAssistant_bot', 'k3m9x2p');
    expect(link).toBe('https://t.me/ExpensesAssistant_bot?start=ref_k3m9x2p');
    const share = new URL(ReferralService.shareUrl(link, 'Попробуй & смотри'));
    expect(share.origin + share.pathname).toBe('https://t.me/share/url');
    expect(share.searchParams.get('url')).toBe(link);
    expect(share.searchParams.get('text')).toBe('Попробуй & смотри');
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
        userService: { registerUser: jest.fn(async () => registered), getUserLanguage: async () => 'ru' },
        localizationService: new LocalizationService(),
        funnelService,
        referralService,
        keyboardGenerators: { generateMainMenuKeyboard: () => [] },
        premiumService: { isPremiumUser: async () => false },
        familyService: {}
      });
      handlers.onboardingLanguage = jest.fn(async () => {});
      const ctx = { from: { id: FRIEND, first_name: 'Аня' }, message: { text: '/start ref_k3m9x2p' }, reply: jest.fn(async () => ({})) };
      return { handlers, referralService, funnelService, ctx };
    }

    test('new user via ref link: attributed, inviter notified, funnel source is "ref"', async () => {
      const { handlers, referralService, funnelService, ctx } = startHandlers({ isNew: true, justCreated: true });
      await handlers.start(ctx);
      expect(referralService.attribute).toHaveBeenCalledWith(FRIEND, 'k3m9x2p', { isNew: true });
      expect(referralService.notifyJoined).toHaveBeenCalledWith(INVITER, ctx.from);
      expect(funnelService.registerSource).toHaveBeenCalledWith(FRIEND, 'ref');
    });

    test('returning user via ref link: nothing is attributed', async () => {
      const { handlers, referralService, ctx } = startHandlers({ isNew: false, justCreated: false });
      await handlers.start(ctx);
      expect(referralService.attribute).not.toHaveBeenCalled();
      expect(referralService.notifyJoined).not.toHaveBeenCalled();
    });

    test('ad codes keep working as the source', async () => {
      const { handlers, referralService, funnelService, ctx } = startHandlers({ isNew: true, justCreated: true });
      ctx.message.text = '/start ads_tg1';
      await handlers.start(ctx);
      expect(funnelService.registerSource).toHaveBeenCalledWith(FRIEND, 'ads_tg1');
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

  test('premium grant is a free referral transaction, not a payment', async () => {
    const { service, repository, premiumTransactionRepository } = await invited();
    repository.expenses.set(FRIEND, 3);
    await service.onExpenseRecorded(FRIEND);
    for (const [tx] of premiumTransactionRepository.createTransaction.mock.calls) {
      expect(tx).toEqual(expect.objectContaining({ stars_amount: 0, telegram_payment_id: null, tariff_duration: 7, status: 'completed' }));
      expect(JSON.parse(tx.invoice_payload).type).toBe('referral');
      expect(['activation', 'extension']).toContain(tx.transaction_type);
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
      expect(users.get(INVITER).premium_expires_at.getTime()).toBe(expiry.getTime() + 7 * DAY);
    });

    test('expired premium: 7 days from now', async () => {
      const { service, repository, users } = await invited({ inviter: { premium: true, premium_expires_at: new Date(Date.now() - 3 * DAY) } });
      repository.expenses.set(FRIEND, 3);
      const before = Date.now();
      await service.onExpenseRecorded(FRIEND);
      const after = Date.now();
      const expires = users.get(INVITER).premium_expires_at.getTime();
      expect(expires).toBeGreaterThanOrEqual(before + 7 * DAY);
      expect(expires).toBeLessThanOrEqual(after + 7 * DAY);
    });

    test('trial (the invited friend): 7 days are added to the trial, activation date kept', async () => {
      const activated = new Date(Date.now() - DAY);
      const trialEnd = new Date(activated.getTime() + TRIAL_PERIOD.DAYS * DAY);
      const { service, repository, users } = await invited({ friend: { premium: true, premium_expires_at: trialEnd, premium_activated_at: activated } });
      repository.expenses.set(FRIEND, 3);
      await service.onExpenseRecorded(FRIEND);
      expect(users.get(FRIEND).premium_expires_at.getTime()).toBe(trialEnd.getTime() + 7 * DAY);
      expect(users.get(FRIEND).premium_activated_at).toBe(activated);
    });
  });

  describe('inviter caps', () => {
    test('bonus days: per invite, by rewarded count and by total days', () => {
      expect(inviterBonusDays({ rewarded: 0, days: 0 })).toBe(7);
      expect(inviterBonusDays({ rewarded: 9, days: 63 })).toBe(7);
      expect(inviterBonusDays({ rewarded: 10, days: 70 })).toBe(0);
      const loose = { ...REFERRAL, MAX_REWARDED_INVITES: 100 };
      expect(inviterBonusDays({ rewarded: 12, days: 84 }, loose)).toBe(6); // до 90 дней осталось 6
      expect(inviterBonusDays({ rewarded: 13, days: 90 }, loose)).toBe(0);
      expect(maxInviterDays()).toBe(70);
      expect(maxInviterDays(loose)).toBe(90);
    });

    test('capped inviter: friend still gets the days, inviter gets a thank-you without days', async () => {
      const ctx = await invited();
      for (let i = 0; i < REFERRAL.MAX_REWARDED_INVITES; i++) {
        ctx.repository.referrals.set(900 + i, { inviterId: INVITER, rewarded: true, inviteeDays: 7, inviterDays: 7 });
      }
      ctx.repository.expenses.set(FRIEND, 3);
      const reward = await ctx.service.onExpenseRecorded(FRIEND);
      expect(reward).toEqual(expect.objectContaining({ inviteeDays: 7, inviterDays: 0 }));
      expect(ctx.users.get(INVITER).premium).toBe(false);
      expect(ctx.users.get(FRIEND).premium).toBe(true);
      const inviterText = ctx.notificationService.sendMessage.mock.calls.find(([to]) => to === INVITER)[1];
      expect(inviterText).toContain('70');
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
      repository.referrals.set(900 + i, { inviterId: FRIEND, rewarded: true, inviteeDays: 7, inviterDays: 7 });
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
        rewardDays: 7
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
