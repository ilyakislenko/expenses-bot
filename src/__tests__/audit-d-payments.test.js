// Регрессии аудита PAY (слайс D): платежи, премиум, тарифы, уведомления об окончании
const PaymentService = require('../services/PaymentService');
const UserService = require('../services/UserService');
const PremiumLifecycleService = require('../services/PremiumLifecycleService');
const CallbackHandlers = require('../handlers/callbacks');
const Formatter = require('../utils/formatter');
const { PREMIUM_TARIFFS, tariffDiscount } = require('../utils/constants');

const DAY = 24 * 60 * 60 * 1000;
const tick = () => new Promise(resolve => setImmediate(resolve));

const invoice = (payload, totalAmount) => ({ currency: 'XTR', total_amount: totalAmount, invoice_payload: JSON.stringify(payload) });
const premiumInvoice = (tariff, userId) => invoice({ type: 'premium_subscription', tariff: tariff.duration, stars: tariff.stars, user_id: userId }, tariff.stars);

describe('pre_checkout_query (PAY-2, PAY-6)', () => {
  function serviceWith(activeSubscription) {
    return new PaymentService(null, null, null, {
      getActiveRecurringSubscription: jest.fn().mockResolvedValue(activeSubscription)
    });
  }

  test('a second monthly subscription is rejected while one is active; one-time tariffs still pass', async () => {
    const service = serviceWith({ subscription_expires_at: new Date(Date.now() + 10 * DAY), telegram_payment_id: 'ch_sub' });
    expect(await service.checkPreCheckout(premiumInvoice(PREMIUM_TARIFFS.MONTH_1, 5), 5)).toEqual({ ok: false, reason: 'subscription_active' });
    expect(await service.checkPreCheckout(premiumInvoice(PREMIUM_TARIFFS.MONTH_3, 5), 5)).toEqual({ ok: true });
  });

  test('the first monthly subscription passes', async () => {
    const service = serviceWith(null);
    expect(await service.checkPreCheckout(premiumInvoice(PREMIUM_TARIFFS.MONTH_1, 5), 5)).toEqual({ ok: true });
  });

  test('a forwarded payment link paid by someone else is rejected (premium and donation)', async () => {
    const service = serviceWith(null);
    expect(await service.checkPreCheckout(premiumInvoice(PREMIUM_TARIFFS.MONTH_12, 5), 6)).toEqual({ ok: false, reason: 'foreign_payer' });
    const donation = invoice({ type: 'donation', stars: 50, user_id: 5, donation_id: 9 }, 50);
    expect(await service.checkPreCheckout(donation, 6)).toEqual({ ok: false, reason: 'foreign_payer' });
    expect(await service.checkPreCheckout(donation, 5)).toEqual({ ok: true });
  });
});

describe('tariff discounts (PAY-3)', () => {
  test('percent and crossed-out price come from the monthly price × months', () => {
    expect(tariffDiscount(PREMIUM_TARIFFS.MONTH_1)).toEqual(expect.objectContaining({ fullStars: 149, percent: 0 }));
    expect(tariffDiscount(PREMIUM_TARIFFS.MONTH_3)).toEqual(expect.objectContaining({ fullStars: 447, percent: 22 }));
    expect(tariffDiscount(PREMIUM_TARIFFS.MONTH_6)).toEqual(expect.objectContaining({ fullStars: 894, percent: 33 }));
    expect(tariffDiscount(PREMIUM_TARIFFS.MONTH_12)).toEqual(expect.objectContaining({ fullStars: 1788, percent: 44 }));
    expect(tariffDiscount(PREMIUM_TARIFFS.MONTH_3).fullUsd).toBeCloseTo(3 * PREMIUM_TARIFFS.MONTH_1.usd, 10);
  });

  test('tariff screen: honest discounts, monthly line only for multi-month tariffs, callback answered first', async () => {
    const RUB_PER_USD = 80.54;
    const formatter = new Formatter({ convert: async (amount) => amount * RUB_PER_USD });
    const texts = { discount_save: 'экономия {percent}%', per_month: 'в мес.', tariff_item_30: '1 мес', tariff_item_90: '3 мес', tariff_item_180: '6 мес', tariff_item_365: '12 мес' };
    const localizationService = {
      getText: (lang, key, params = {}) => (texts[key] || key).replace(/\{(\w+)\}/g, (m, name) => params[name])
    };
    const calls = [];
    const handlers = new CallbackHandlers({
      localizationService,
      formatter,
      userService: {
        getUserLanguage: async () => 'ru',
        getActiveRecurringSubscription: async () => null,
        getUserById: async () => ({ id: 1, currency: 'RUB', timezone: 'UTC' })
      },
      funnelService: { track: async () => {} },
      paymentService: { createInvoiceLink: async (userId, tariff) => { calls.push('link'); return `https://t.me/$inv${tariff.duration}`; } }
    });
    let text;
    const ctx = {
      from: { id: 1 },
      callbackQuery: { data: 'premium_tariffs', message: { message_id: 1 } },
      answerCbQuery: jest.fn(async () => { calls.push('answer'); return true; }),
      editMessageText: jest.fn(async (t) => { text = t; return true; })
    };

    await handlers.handlePremiumTariffs(ctx);

    expect(calls[0]).toBe('answer');
    const month = formatter.formatAmount(PREMIUM_TARIFFS.MONTH_1.usd * RUB_PER_USD, 'RUB');
    const threeMonthsFull = formatter.formatAmount(3 * PREMIUM_TARIFFS.MONTH_1.usd * RUB_PER_USD, 'RUB');
    expect(text).toContain(`- 1 мес — 149 ⭐ / ${month}`);
    expect(text).toContain(`<s>447</s> 349 ⭐ / <s>${threeMonthsFull}</s>`);
    expect(text).toContain('(экономия 22%)');
    expect(text).toContain('(экономия 33%)');
    expect(text).toContain('(экономия 44%)');
    expect(text).not.toMatch(/экономия (25|36|48)%/);
    expect(text).toContain('≈ 116,3 ⭐ в мес.'); // 349 / 3 in Russian number format
    expect(text).not.toContain('≈ 149 ⭐'); // no per-month line for the monthly tariff
  });
});

describe('registration race (PAY-5 / PLT-6)', () => {
  // users table with real-DB-like interleaving: every statement yields to the event loop
  function makeUserRepository() {
    const users = new Map();
    return {
      users,
      createUser: async (id, username, firstName) => {
        await tick();
        if (users.has(id)) return { ...users.get(id), is_new: false };
        users.set(id, { id, username, first_name: firstName, premium: false, premium_expires_at: null, premium_activated_at: null, has_trial: true });
        return { ...users.get(id), is_new: true };
      },
      getUserById: async (id) => { await tick(); return users.has(id) ? { ...users.get(id) } : undefined; },
      query: async (sql, params) => {
        await tick();
        if (/SET has_trial = FALSE/.test(sql)) {
          const row = users.get(params[0]);
          if (!row.has_trial || row.premium_activated_at) return { rowCount: 0, rows: [] };
          row.has_trial = false;
          return { rowCount: 1, rows: [{ id: row.id }] };
        }
        if (/premium_activated_at = COALESCE/.test(sql)) {
          const row = users.get(params[1]);
          Object.assign(row, { premium: true, premium_expires_at: params[0], premium_activated_at: row.premium_activated_at || params[2] });
          return { rowCount: 1, rows: [] };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      }
    };
  }

  test('two concurrent registrations: one trial transaction, one "new user", no errors', async () => {
    const userRepository = makeUserRepository();
    const premiumTransactionRepository = { createTransaction: jest.fn().mockResolvedValue({ id: 1 }) };
    const userService = new UserService(userRepository, {}, premiumTransactionRepository);

    const results = await Promise.all([
      userService.registerUser(7774400001, 'u', 'U'),
      userService.registerUser(7774400001, 'u', 'U'),
      userService.registerUser(7774400001, 'u', 'U')
    ]);

    expect(premiumTransactionRepository.createTransaction).toHaveBeenCalledTimes(1);
    expect(premiumTransactionRepository.createTransaction.mock.calls[0][0].transaction_type).toBe('trial');
    expect(results.filter(r => r.isNew)).toHaveLength(1);
    const stored = userRepository.users.get(7774400001);
    expect(Math.round((stored.premium_expires_at - Date.now()) / DAY)).toBe(14);
  });
});

describe('donation refund (PAY-7)', () => {
  function build() {
    const donations = { ch_don: { id: 3, user_id: '5', stars: 50, status: 'completed', telegram_payment_id: 'ch_don' } };
    const donationRepository = {
      getDonationByTelegramPaymentId: async (id) => donations[id] || null,
      markDonationRefunded: jest.fn(async (id) => { Object.values(donations).find(d => d.id === id).status = 'refunded'; })
    };
    const premiumTransactionRepository = { getTransactionByTelegramPaymentId: async () => null };
    const userRepository = { getUserById: jest.fn(), updateUser: jest.fn() };
    const service = new PaymentService(donationRepository, null, null, premiumTransactionRepository, userRepository);
    return { service, donations, donationRepository, userRepository };
  }

  test('a refunded donation is marked refunded once and premium is untouched', async () => {
    const { service, donations, donationRepository, userRepository } = build();
    expect(await service.revokeRefundedPayment('ch_don')).toEqual({ status: 'refunded', type: 'donation', userId: 5, premiumUntil: null });
    expect(donations.ch_don.status).toBe('refunded');
    expect(await service.revokeRefundedPayment('ch_don')).toEqual({ status: 'already_refunded' });
    expect(donationRepository.markDonationRefunded).toHaveBeenCalledTimes(1);
    expect(userRepository.updateUser).not.toHaveBeenCalled();
  });

  test('the admin refund search finds donations', async () => {
    const { service } = build();
    expect(await service.findPaymentByChargeId('ch_don')).toEqual({ kind: 'donation', id: 3, userId: 5, stars: 50, status: 'completed', chargeId: 'ch_don' });
    expect(await service.findPaymentByChargeId('nope')).toBeNull();
  });
});

describe('admin revoke cancels the Stars subscription (Q3)', () => {
  test('the latest active recurring payment is canceled and no longer counts as a subscription', async () => {
    let active = { subscription_expires_at: new Date(Date.now() + 20 * DAY), telegram_payment_id: 'ch_renewal_2' };
    const repo = {
      getActiveRecurringSubscription: async () => active,
      endActiveRecurringSubscriptions: jest.fn(async () => { active = null; return 1; })
    };
    const callApi = jest.fn().mockResolvedValue(true);
    const service = new PaymentService(null, null, null, repo, null);
    service.setBot({ telegram: { callApi } });

    expect(await service.cancelActiveSubscription(5)).toBe(true);
    expect(callApi).toHaveBeenCalledWith('editUserStarSubscription', { user_id: 5, telegram_payment_charge_id: 'ch_renewal_2', is_canceled: true });
    expect(await service.cancelActiveSubscription(5)).toBe(false);
    expect(callApi).toHaveBeenCalledTimes(1);
  });
});

describe('premium lifecycle notifications (PAY-9)', () => {
  const now = new Date('2026-10-27T12:00:00Z');
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);

  async function run(candidate) {
    const sent = [];
    const service = new PremiumLifecycleService(
      { getPremiumLifecycleCandidates: async () => [candidate], markSent: async () => true },
      { sendMessage: async (id, text) => { sent.push(text); } },
      { getText: (lang, key) => key },
      { formatDate: () => 'date' }
    );
    await service.processDue(now);
    return sent;
  }

  const base = { id: 1, language: 'ru', timezone: 'Europe/Moscow', has_active_subscription: false, last_refund_at: null };

  test('admin-granted premium is not called a trial', async () => {
    expect(await run({ ...base, premium_expires_at: hoursAgo(2), premium_source: 'granted' })).toEqual(['premium_expired_granted']);
    expect(await run({ ...base, premium_expires_at: hoursAgo(2), premium_source: 'trial' })).toEqual(['premium_expired_trial']);
    expect(await run({ ...base, premium_expires_at: hoursAgo(2), premium_source: 'paid' })).toEqual(['premium_expired_paid']);
  });

  test('no "expired" and no win-back after a refund revoked the premium', async () => {
    const refundedAt = hoursAgo(2);
    expect(await run({ ...base, premium_expires_at: refundedAt, premium_source: 'paid', last_refund_at: refundedAt })).toEqual([]);
    const weekAgo = hoursAgo(7 * 24 + 2);
    expect(await run({ ...base, premium_expires_at: weekAgo, premium_source: 'paid', last_refund_at: weekAgo })).toEqual([]);
  });

  test('an old refund does not silence a later, naturally ending premium', async () => {
    expect(await run({ ...base, premium_expires_at: hoursAgo(7 * 24 + 2), premium_source: 'paid', last_refund_at: new Date(now.getTime() - 60 * DAY) }))
      .toEqual(['premium_winback']);
  });
});
