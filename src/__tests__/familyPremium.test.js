jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const PremiumService = require('../services/PremiumService');
const PaymentService = require('../services/PaymentService');
const FamilyPremiumService = require('../services/FamilyPremiumService');
const FamilyService = require('../services/FamilyService');
const PremiumLifecycleService = require('../services/PremiumLifecycleService');
const {
  USER_LIMITS, PREMIUM_TARIFFS, FAMILY_TARIFFS, FAMILY_PREMIUM, findTariff, familyTariffSaving, familyTariffDiscount
} = require('../utils/constants');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-29T12:00:00Z');
const BUYER = 101;
const MEMBER = 102;
const MEMBER2 = 103;
const EX_MEMBER = 104;
const OUTSIDER = 105;
const FAMILY_ID = 7;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

// In-memory world behind repositories: users (personal premium, family plan of the payer), one family, transactions,
// user_notifications. Seat order = join order (owner first), like FamilyPremiumRepository.getCoveringPlan
function makeWorld() {
  const users = new Map();
  const addUser = (id, extra = {}) => users.set(id, { id, first_name: `U${id}`, language: 'ru', timezone: 'UTC', premium: false, premium_expires_at: null, family_premium_expires_at: null, ...extra });
  [BUYER, MEMBER, MEMBER2, EX_MEMBER, OUTSIDER].forEach(id => addUser(id));
  users.get(BUYER).first_name = 'Аня';
  const family = { id: FAMILY_ID, name: 'Дом', owner_id: BUYER, owner_first_name: 'Аня' };
  let joined = [BUYER, MEMBER, MEMBER2];
  let pending = 0;
  const transactions = [];
  const sentNotifications = new Set();

  const personalActive = (id) => {
    const u = users.get(id);
    return !!(u && u.premium && u.premium_expires_at && u.premium_expires_at > new Date());
  };

  const userService = {
    isPremiumActive: jest.fn(async (id) => personalActive(id)),
    getUserById: jest.fn(async (id) => users.get(id)),
    // как UserService.activatePremium: к действующему сроку, истёкший — от сейчас; транзакция записывается
    activatePremium: jest.fn(async (id, days, transactionData) => {
      const u = users.get(id);
      const now = new Date();
      const active = personalActive(id);
      const base = active ? u.premium_expires_at : now;
      u.premium = true;
      u.premium_expires_at = new Date(base.getTime() + days * DAY);
      if (transactionData) {
        transactions.push({ id: transactions.length + 1, user_id: String(id), tariff_duration: days, status: 'completed', ...transactionData });
      }
      return { isNewActivation: !active, newExpiryDate: u.premium_expires_at, daysAdded: days };
    }),
    transactionExists: jest.fn(async (chargeId) => transactions.some(t => t.telegram_payment_id === chargeId))
  };

  const familyPremiumRepository = {
    getCoveringPlan: jest.fn(async (userId, maxMembers) => {
      const position = joined.indexOf(userId);
      const payer = users.get(family.owner_id);
      if (position < 0 || !payer.family_premium_expires_at || position >= maxMembers) return null;
      return { family_id: family.id, family_name: family.name, payer_id: payer.id, payer_first_name: payer.first_name, payer_username: null, expires_at: payer.family_premium_expires_at };
    }),
    getPlanExpiry: jest.fn(async (payerId) => users.get(payerId).family_premium_expires_at),
    extendPlan: jest.fn(async (payerId, days, now) => {
      const u = users.get(payerId);
      const previous = u.family_premium_expires_at;
      const base = previous && previous > now ? previous : now;
      u.family_premium_expires_at = new Date(base.getTime() + days * DAY);
      return { previous, expires: u.family_premium_expires_at };
    }),
    shortenPlan: jest.fn(async (payerId, days, now) => {
      const u = users.get(payerId);
      const previous = u.family_premium_expires_at;
      if (!previous || previous <= now) return null;
      const shortened = new Date(previous.getTime() - days * DAY);
      u.family_premium_expires_at = shortened > now ? shortened : now;
      return { previous, expires: u.family_premium_expires_at };
    }),
    getCoveredMembers: jest.fn(async (payerId, maxMembers) => joined
      .slice(0, maxMembers)
      .filter(id => id !== payerId && family.owner_id === payerId)
      .map(id => ({ ...users.get(id) }))),
    countSeats: jest.fn(async () => ({ members: joined.length, pending })),
    getPlansEndingBetween: jest.fn(async (from, to) => [...users.values()]
      .filter(u => u.family_premium_expires_at && u.family_premium_expires_at >= from && u.family_premium_expires_at < to)
      .map(u => ({ ...u, has_active_subscription: false })))
  };

  const familyRepository = {
    getUserFamily: jest.fn(async (userId) => (joined.includes(userId) ? { ...family } : undefined)),
    getFamilyByOwnerId: jest.fn(async (ownerId) => (ownerId === family.owner_id ? { ...family } : undefined))
  };

  const notificationService = { sendMessage: jest.fn(async () => {}) };
  const userNotificationRepository = {
    markSent: jest.fn(async (userId, kind, refKey) => {
      const key = `${userId}|${kind}|${refKey}`;
      if (sentNotifications.has(key)) return false;
      sentNotifications.add(key);
      return true;
    })
  };
  const localizationService = { getText: (lang, key, params) => `${key}${params ? ' ' + JSON.stringify(params) : ''}` };
  const formatter = { formatDate: (d) => new Date(d).toISOString().slice(0, 10), escapeMarkdown: (s) => s };

  const premiumService = new PremiumService({ getUserById: async (id) => users.get(id) }, userService, familyPremiumRepository);
  const familyPremiumService = new FamilyPremiumService({
    familyPremiumRepository, familyRepository, userService, premiumService, userNotificationRepository,
    notificationService, localizationService, formatter
  });
  const premiumTransactionRepository = {
    getTransactionByTelegramPaymentId: jest.fn(async (chargeId) => transactions.find(t => t.telegram_payment_id === chargeId) || null),
    updateTransactionStatus: jest.fn(async (id, status) => { transactions.find(t => t.id === id).status = status; }),
    getActiveRecurringSubscription: jest.fn(async () => null)
  };
  const userRepository = {
    getUserById: jest.fn(async (id) => users.get(id)),
    updateUser: jest.fn(async (id, updates) => Object.assign(users.get(id), updates))
  };
  const paymentService = new PaymentService(null, localizationService, { track: jest.fn(async () => {}) }, premiumTransactionRepository, userRepository, familyPremiumService);
  paymentService.setBot({ telegram: { callApi: jest.fn(async () => true) } });

  return {
    users, family, transactions, notificationService, userNotificationRepository, userService, familyPremiumRepository,
    premiumService, familyPremiumService, paymentService, premiumTransactionRepository,
    leave: (id) => { joined = joined.filter(x => x !== id); premiumService.invalidateFamilyPremium(); },
    join: (id) => { joined = [...joined, id]; premiumService.invalidateFamilyPremium(); },
    setPending: (n) => { pending = n; },
    joined: () => joined
  };
}

const familyPayment = (overrides = {}) => {
  const tariff = FAMILY_TARIFFS.MONTH_1;
  return {
    currency: 'XTR',
    total_amount: tariff.stars,
    invoice_payload: JSON.stringify({ type: 'family_premium', tariff: tariff.duration, stars: tariff.stars, user_id: BUYER, family_id: FAMILY_ID }),
    telegram_payment_charge_id: 'ch_family_1',
    ...overrides
  };
};

describe('family tariffs', () => {
  test('every family tariff costs 1.6–1.7× the personal tariff of the same length', () => {
    for (const tariff of Object.values(FAMILY_TARIFFS)) {
      const ratio = tariff.stars / findTariff(tariff.duration).stars;
      expect(ratio).toBeGreaterThanOrEqual(1.6);
      expect(ratio).toBeLessThanOrEqual(1.7);
    }
    expect(Object.values(FAMILY_TARIFFS).map(t => t.duration)).toEqual(Object.values(PREMIUM_TARIFFS).map(t => t.duration));
  });

  test('saving is honest: one person pays more, two already save, a full family saves most', () => {
    const month = FAMILY_TARIFFS.MONTH_1;
    expect(familyTariffSaving(month, 1).percent).toBeLessThan(0);
    expect(familyTariffSaving(month, 2)).toMatchObject({ personalStars: 2 * PREMIUM_TARIFFS.MONTH_1.stars, percent: 16 });
    const full = familyTariffSaving(month, FAMILY_PREMIUM.MAX_MEMBERS);
    expect(full.perPerson).toBe(Math.round(month.stars / FAMILY_PREMIUM.MAX_MEMBERS));
    expect(full.percent).toBeGreaterThan(60);
    expect(familyTariffDiscount(FAMILY_TARIFFS.MONTH_1).percent).toBe(0);
    expect(familyTariffDiscount(FAMILY_TARIFFS.MONTH_12).percent).toBeGreaterThan(0);
  });
});

describe('entitlement matrix (PremiumService.isPremiumUser)', () => {
  async function paidFamily() {
    const world = makeWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    return world;
  }

  test('nobody has premium before the purchase', async () => {
    const world = makeWorld();
    for (const id of [BUYER, MEMBER, MEMBER2, OUTSIDER]) expect(await world.premiumService.isPremiumUser(id)).toBe(false);
  });

  test('buyer and members get premium; outsider does not; members get premium limits', async () => {
    const world = await paidFamily();
    expect(await world.premiumService.isPremiumUser(BUYER)).toBe(true);
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(true);
    expect(await world.premiumService.isPremiumUser(MEMBER2)).toBe(true);
    expect(await world.premiumService.isPremiumUser(OUTSIDER)).toBe(false);
    expect(await world.premiumService.getUserLimits(MEMBER)).toBe(USER_LIMITS.premium);
    expect(await world.premiumService.getUserLimits(OUTSIDER)).toBe(USER_LIMITS.regular);
  });

  test('member premium comes from the family; the source names the payer', async () => {
    const world = await paidFamily();
    const info = await world.premiumService.getPremiumInfo(MEMBER);
    expect(info).toMatchObject({ isPremium: true, personalActive: false });
    expect(info.family).toMatchObject({ payerId: BUYER, payerName: 'Аня', familyName: 'Дом' });
    expect(info.family.expiresAt.getTime()).toBe(NOW.getTime() + 30 * DAY);
    const limits = await world.premiumService.getLimitsInfo(MEMBER);
    expect(limits).toMatchObject({ isPremium: true, personalActive: false });
    expect(limits.premiumExpiresAt.getTime()).toBe(NOW.getTime() + 30 * DAY);
    // у плательщика премиум свой (продлён покупкой), «от семьи» не показывается
    const buyer = await world.premiumService.getPremiumInfo(BUYER);
    expect(buyer).toMatchObject({ isPremium: true, personalActive: true, family: null });
  });

  test('ex-member loses inherited premium immediately on leaving (cache invalidated)', async () => {
    const world = await paidFamily();
    expect(await world.premiumService.isPremiumUser(MEMBER2)).toBe(true);
    world.leave(MEMBER2);
    expect(await world.premiumService.isPremiumUser(MEMBER2)).toBe(false);
    // остальные сохраняют
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(true);
  });

  test('without invalidation the cached plan is reused; invalidation re-reads', async () => {
    const world = await paidFamily();
    await world.premiumService.isPremiumUser(MEMBER);
    const calls = world.familyPremiumRepository.getCoveringPlan.mock.calls.length;
    await world.premiumService.isPremiumUser(MEMBER);
    expect(world.familyPremiumRepository.getCoveringPlan.mock.calls.length).toBe(calls);
    world.premiumService.invalidateFamilyPremium(MEMBER);
    await world.premiumService.isPremiumUser(MEMBER);
    expect(world.familyPremiumRepository.getCoveringPlan.mock.calls.length).toBe(calls + 1);
  });

  test('personal + family overlap: member keeps own premium after the family plan ends', async () => {
    const world = await paidFamily();
    Object.assign(world.users.get(MEMBER), { premium: true, premium_expires_at: new Date(NOW.getTime() + 60 * DAY) });
    const info = await world.premiumService.getPremiumInfo(MEMBER);
    expect(info).toMatchObject({ isPremium: true, personalActive: true });
    expect(info.family).not.toBeNull();
    jest.setSystemTime(new Date(NOW.getTime() + 31 * DAY));
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(true);
    expect(await world.premiumService.isPremiumUser(MEMBER2)).toBe(false);
  });

  test('expiry: family premium ends exactly at the paid date even while cached', async () => {
    const world = await paidFamily();
    jest.setSystemTime(new Date(NOW.getTime() + 30 * DAY - 1000));
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(true);
    jest.setSystemTime(new Date(NOW.getTime() + 30 * DAY + 1000));
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(false);
  });

  test('seat cap: only the first MAX_MEMBERS (with the owner) by join order are covered', async () => {
    const world = await paidFamily();
    for (let id = 200; world.joined().length < FAMILY_PREMIUM.MAX_MEMBERS + 1; id++) {
      world.users.set(id, { id, premium: false });
      world.join(id);
    }
    const [last] = world.joined().slice(-1);
    const [lastCovered] = world.joined().slice(FAMILY_PREMIUM.MAX_MEMBERS - 1, FAMILY_PREMIUM.MAX_MEMBERS);
    expect(await world.premiumService.isPremiumUser(lastCovered)).toBe(true);
    expect(await world.premiumService.isPremiumUser(last)).toBe(false);
  });

  test('refund revokes family premium for all members; the buyer loses the bought days', async () => {
    const world = await paidFamily();
    const result = await world.paymentService.revokeRefundedPayment('ch_family_1');
    expect(result).toMatchObject({ status: 'refunded', type: 'family_premium', userId: BUYER, premiumUntil: null, familyPremiumUntil: null });
    for (const id of [BUYER, MEMBER, MEMBER2]) expect(await world.premiumService.isPremiumUser(id)).toBe(false);
    // участникам — одно уведомление об окончании
    const ended = world.notificationService.sendMessage.mock.calls.filter(([, text]) => text.startsWith('family_premium_ended'));
    expect(ended.map(([id]) => id).sort()).toEqual([MEMBER, MEMBER2]);
    // повторное уведомление о возврате ничего не меняет
    expect(await world.paymentService.revokeRefundedPayment('ch_family_1')).toEqual({ status: 'already_refunded' });
  });

  test('refund of one of two purchases keeps the rest of the family term', async () => {
    const world = await paidFamily();
    await world.paymentService.handleSuccessfulPayment(familyPayment({ telegram_payment_charge_id: 'ch_family_2' }), world.userService);
    await world.paymentService.revokeRefundedPayment('ch_family_1');
    expect(world.users.get(BUYER).family_premium_expires_at.getTime()).toBe(NOW.getTime() + 30 * DAY);
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(true);
  });
});

describe('successful_payment: idempotency and day rules', () => {
  test('the same charge id is applied once', async () => {
    const world = makeWorld();
    const first = await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    const second = await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    expect(first).toMatchObject({ type: 'family_premium', familyStarted: true, coveredMembers: 2 });
    expect(second).toEqual({ type: 'family_premium', status: 'duplicate' });
    expect(world.transactions).toHaveLength(1);
    expect(world.users.get(BUYER).family_premium_expires_at.getTime()).toBe(NOW.getTime() + 30 * DAY);
    expect(world.users.get(BUYER).premium_expires_at.getTime()).toBe(NOW.getTime() + 30 * DAY);
  });

  test('members get one start notice; an extension does not notify again', async () => {
    const world = makeWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    await world.paymentService.handleSuccessfulPayment(familyPayment({ telegram_payment_charge_id: 'ch_family_2' }), world.userService);
    const started = world.notificationService.sendMessage.mock.calls.filter(([, text]) => text.startsWith('family_premium_started'));
    expect(started.map(([id]) => id).sort()).toEqual([MEMBER, MEMBER2]);
    expect(world.users.get(BUYER).family_premium_expires_at.getTime()).toBe(NOW.getTime() + 60 * DAY);
  });

  test('buyer with personal premium keeps the remaining days: both terms are extended', async () => {
    const world = makeWorld();
    Object.assign(world.users.get(BUYER), { premium: true, premium_expires_at: new Date(NOW.getTime() + 20 * DAY) });
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    expect(world.users.get(BUYER).premium_expires_at.getTime()).toBe(NOW.getTime() + 50 * DAY);
    expect(world.users.get(BUYER).family_premium_expires_at.getTime()).toBe(NOW.getTime() + 30 * DAY);
  });

  test('the family transaction keeps the family payload (separate revenue in stats) and the family price', async () => {
    const world = makeWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    const [tx] = world.transactions;
    expect(JSON.parse(tx.invoice_payload).type).toBe('family_premium');
    expect(tx).toMatchObject({ stars: FAMILY_TARIFFS.MONTH_1.stars, usd: FAMILY_TARIFFS.MONTH_1.usd });
  });

  test('a recurring renewal is reported as a renewal', async () => {
    const world = makeWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment({ is_recurring: true, is_first_recurring: true }), world.userService);
    const renewal = await world.paymentService.handleSuccessfulPayment(familyPayment({ telegram_payment_charge_id: 'ch_r2', is_recurring: true }), world.userService);
    expect(renewal).toMatchObject({ type: 'family_premium', isRenewal: true });
  });
});

describe('pre-checkout: payload validation', () => {
  test('validatePreCheckout: current family price only, known tariff, family id, the payer from the link', () => {
    const service = new PaymentService();
    for (const tariff of Object.values(FAMILY_TARIFFS)) {
      const query = { currency: 'XTR', total_amount: tariff.stars, invoice_payload: JSON.stringify({ type: 'family_premium', tariff: tariff.duration, stars: tariff.stars, user_id: BUYER, family_id: FAMILY_ID }) };
      expect(service.validatePreCheckout(query, BUYER)).toEqual({ ok: true });
    }
    const month = FAMILY_TARIFFS.MONTH_1;
    const payload = (extra) => JSON.stringify({ type: 'family_premium', tariff: 30, stars: month.stars, user_id: BUYER, family_id: FAMILY_ID, ...extra });
    // личная цена по семейной ссылке — устаревший счёт
    expect(service.validatePreCheckout({ currency: 'XTR', total_amount: PREMIUM_TARIFFS.MONTH_1.stars, invoice_payload: payload() }, BUYER)).toEqual({ ok: false, reason: 'price_changed' });
    expect(service.validatePreCheckout({ currency: 'XTR', total_amount: 10, invoice_payload: payload({ tariff: 7 }) }, BUYER)).toEqual({ ok: false, reason: 'unknown_tariff' });
    expect(service.validatePreCheckout({ currency: 'XTR', total_amount: month.stars, invoice_payload: payload({ family_id: null }) }, BUYER)).toEqual({ ok: false, reason: 'family_not_owner' });
    expect(service.validatePreCheckout({ currency: 'XTR', total_amount: month.stars, invoice_payload: payload() }, MEMBER)).toEqual({ ok: false, reason: 'foreign_payer' });
  });

  test('checkPreCheckout: the payer must own the family from the link and it must fit the plan', async () => {
    const world = makeWorld();
    expect(await world.paymentService.checkPreCheckout(familyPayment(), BUYER)).toEqual({ ok: true });

    // ссылку переслали участнику — он не платит (foreign payer); участник со своей ссылкой — не владелец
    const memberLink = familyPayment({ invoice_payload: JSON.stringify({ type: 'family_premium', tariff: 30, stars: FAMILY_TARIFFS.MONTH_1.stars, user_id: MEMBER, family_id: FAMILY_ID }) });
    expect(await world.paymentService.checkPreCheckout(memberLink, MEMBER)).toEqual({ ok: false, reason: 'family_not_owner' });

    // старая ссылка на другую (удалённую) семью
    const otherFamily = familyPayment({ invoice_payload: JSON.stringify({ type: 'family_premium', tariff: 30, stars: FAMILY_TARIFFS.MONTH_1.stars, user_id: BUYER, family_id: 999 }) });
    expect(await world.paymentService.checkPreCheckout(otherFamily, BUYER)).toEqual({ ok: false, reason: 'family_not_owner' });

    for (let id = 300; world.joined().length <= FAMILY_PREMIUM.MAX_MEMBERS; id++) world.join(id);
    expect(await world.paymentService.checkPreCheckout(familyPayment(), BUYER)).toEqual({ ok: false, reason: 'family_too_big' });
  });

  test('checkPreCheckout: no second monthly subscription (personal or family)', async () => {
    const world = makeWorld();
    world.premiumTransactionRepository.getActiveRecurringSubscription.mockResolvedValue({ telegram_payment_id: 'x' });
    expect(await world.paymentService.checkPreCheckout(familyPayment(), BUYER)).toEqual({ ok: false, reason: 'subscription_active' });
    const year = FAMILY_TARIFFS.MONTH_12;
    const yearly = familyPayment({ total_amount: year.stars, invoice_payload: JSON.stringify({ type: 'family_premium', tariff: 365, stars: year.stars, user_id: BUYER, family_id: FAMILY_ID }) });
    expect(await world.paymentService.checkPreCheckout(yearly, BUYER)).toEqual({ ok: true });
  });
});

describe('notifications', () => {
  test('cron: members without own premium get one end notice; buyer is not double-warned when terms coincide', async () => {
    const world = makeWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    Object.assign(world.users.get(MEMBER2), { premium: true, premium_expires_at: new Date(NOW.getTime() + 90 * DAY) });
    world.notificationService.sendMessage.mockClear();

    // за день до конца: свой срок плательщика совпадает с семейным — семейного предупреждения нет
    const dayBefore = new Date(NOW.getTime() + 29 * DAY);
    expect(await world.familyPremiumService.processDue(dayBefore)).toBe(0);

    // через 2 часа после конца — уведомление участнику без своего премиума, один раз
    const after = new Date(NOW.getTime() + 30 * DAY + 2 * 60 * 60 * 1000);
    jest.setSystemTime(after);
    expect(await world.familyPremiumService.processDue(after)).toBe(1);
    expect(await world.familyPremiumService.processDue(after)).toBe(0);
    expect(world.notificationService.sendMessage.mock.calls.map(([id]) => id)).toEqual([MEMBER]);
  });

  test('cron: the buyer is warned when the family term ends before his own premium', async () => {
    const world = makeWorld();
    Object.assign(world.users.get(BUYER), { premium: true, premium_expires_at: new Date(NOW.getTime() + 100 * DAY) });
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    world.notificationService.sendMessage.mockClear();
    const dayBefore = new Date(NOW.getTime() + 29 * DAY);
    expect(await world.familyPremiumService.processDue(dayBefore)).toBe(1);
    const [[id, text]] = world.notificationService.sendMessage.mock.calls;
    expect(id).toBe(BUYER);
    expect(text).toContain('family_premium_expiring_owner');
    expect(text).toContain('"count":2');
  });

  test('lifecycle: personal notices are skipped while a family plan covers the member; buyer gets the family wording', () => {
    const personalEnd = NOW;
    expect(PremiumLifecycleService.coveredByFamily({ premium_expires_at: personalEnd }, { expiresAt: new Date(NOW.getTime() + DAY) })).toBe(true);
    expect(PremiumLifecycleService.coveredByFamily({ premium_expires_at: personalEnd }, { expiresAt: new Date(NOW.getTime() - DAY) })).toBe(false);
    expect(PremiumLifecycleService.coveredByFamily({ premium_expires_at: personalEnd }, null)).toBe(false);
    const stage = { kind: 'premium_expiring', text: { paid: 'premium_expiring_paid' } };
    expect(PremiumLifecycleService.textKeyFor(stage, { premium_source: 'paid', premium_expires_at: NOW, family_premium_expires_at: new Date(NOW.getTime() + 60000) })).toBe('premium_expiring_family');
    expect(PremiumLifecycleService.textKeyFor(stage, { premium_source: 'paid', premium_expires_at: NOW, family_premium_expires_at: null })).toBe('premium_expiring_paid');
  });
});

describe('family membership with a family plan', () => {
  function familyServiceWorld({ inviteePremium = false } = {}) {
    const world = makeWorld();
    const familyRepository = {
      getUserFamily: jest.fn(async (userId) => (world.joined().includes(userId) ? { ...world.family } : undefined)),
      getFamilyById: jest.fn(async () => ({ ...world.family })),
      addMemberToFamily: jest.fn(async (familyId, userId) => world.join(userId)),
      removeMemberFromFamily: jest.fn(async (familyId, userId) => {
        if (!world.joined().includes(userId)) return undefined;
        world.leave(userId);
        return { family_id: familyId, user_id: userId };
      }),
      isUserInFamily: jest.fn(async (userId) => world.joined().includes(userId))
    };
    const invitations = new Map();
    const familyInvitationRepository = {
      expireOldInvitations: jest.fn(async () => {}),
      hasPendingInvitation: jest.fn(async () => false),
      createInvitation: jest.fn(async (familyId, inviterId, inviteeId) => {
        const invitation = { id: 1, family_id: familyId, invitee_id: inviteeId, invite_code: 'ABC', status: 'pending', expires_at_utc: new Date(Date.now() + DAY) };
        invitations.set('ABC', invitation);
        return invitation;
      }),
      getInvitationByCode: jest.fn(async (code) => invitations.get(code)),
      updateInvitationStatusByCode: jest.fn(async (code, status) => { invitations.get(code).status = status; })
    };
    const userRepository = {
      findUsersByUsername: jest.fn(async () => [{ id: OUTSIDER, username: 'out' }]),
      getUserById: jest.fn(async (id) => world.users.get(id))
    };
    const premiumService = {
      isPremiumUser: jest.fn(async (id) => (id === OUTSIDER ? inviteePremium : world.premiumService.isPremiumUser(id))),
      getFamilyPremium: (id) => world.premiumService.getFamilyPremium(id)
    };
    const notificationService = { sendFamilyInvitation: jest.fn(async () => {}), sendFamilyMemberRemoved: jest.fn(async () => {}) };
    const service = new FamilyService(familyRepository, familyInvitationRepository, userRepository, {}, notificationService, premiumService, world.familyPremiumService);
    return { world, service, notificationService };
  }

  test('without own premium a person can be invited only while the plan is active and a seat is free', async () => {
    const { world, service } = familyServiceWorld();
    await expect(service.createInvitation(BUYER, 'out')).rejects.toThrow('User does not have premium status');
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    world.setPending(FAMILY_PREMIUM.MAX_MEMBERS - world.joined().length);
    await expect(service.createInvitation(BUYER, 'out')).rejects.toThrow('User does not have premium status');
    world.setPending(0);
    await expect(service.createInvitation(BUYER, 'out')).resolves.toMatchObject({ invitee: { id: OUTSIDER } });
  });

  test('accepting gives inherited premium at once; leaving and removal take it away and say so', async () => {
    const { world, service, notificationService } = familyServiceWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    await service.createInvitation(BUYER, 'out');
    const accepted = await service.acceptInvitation(OUTSIDER, 'ABC');
    expect(accepted.familyPremium).toMatchObject({ payerId: BUYER, payerName: 'Аня' });
    expect(await world.premiumService.isPremiumUser(OUTSIDER)).toBe(true);

    const left = await service.leaveFamily(OUTSIDER);
    expect(left.lostFamilyPremium).toBe(true);
    expect(await world.premiumService.isPremiumUser(OUTSIDER)).toBe(false);

    await service.removeMemberFromFamily(BUYER, MEMBER);
    expect(notificationService.sendFamilyMemberRemoved).toHaveBeenCalledWith(MEMBER, 'Дом', { lostFamilyPremium: true });
    expect(await world.premiumService.isPremiumUser(MEMBER)).toBe(false);
  });

  test('a member with own premium keeps it after leaving and is not told he lost premium', async () => {
    const { world, service } = familyServiceWorld();
    await world.paymentService.handleSuccessfulPayment(familyPayment(), world.userService);
    Object.assign(world.users.get(MEMBER2), { premium: true, premium_expires_at: new Date(NOW.getTime() + 5 * DAY) });
    const left = await service.leaveFamily(MEMBER2);
    expect(left.lostFamilyPremium).toBe(false);
    expect(await world.premiumService.isPremiumUser(MEMBER2)).toBe(true);
  });
});
