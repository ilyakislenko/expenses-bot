const PaymentService = require('../services/PaymentService');
const { PREMIUM_TARIFFS } = require('../utils/constants');

const DAY = 24 * 60 * 60 * 1000;

describe('PaymentService.validatePreCheckout', () => {
  const service = new PaymentService();
  const premium = (tariff, stars) => ({
    currency: 'XTR',
    total_amount: stars,
    invoice_payload: JSON.stringify({ type: 'premium_subscription', tariff, stars, user_id: 1 })
  });

  const PAYER = 1;

  test('accepts the current price of every tariff', () => {
    for (const tariff of Object.values(PREMIUM_TARIFFS)) {
      expect(service.validatePreCheckout(premium(tariff.duration, tariff.stars), PAYER)).toEqual({ ok: true });
    }
  });

  test('rejects an old invoice after a price change, an unknown tariff and other currencies', () => {
    const month = PREMIUM_TARIFFS.MONTH_1;
    expect(service.validatePreCheckout(premium(month.duration, month.stars - 1), PAYER)).toEqual({ ok: false, reason: 'price_changed' });
    expect(service.validatePreCheckout(premium(7, 10), PAYER)).toEqual({ ok: false, reason: 'unknown_tariff' });
    expect(service.validatePreCheckout({ ...premium(month.duration, month.stars), currency: 'USD' }, PAYER).ok).toBe(false);
    expect(service.validatePreCheckout({ currency: 'XTR', total_amount: 5, invoice_payload: 'not json' }, PAYER).ok).toBe(false);
  });

  test('donations: any positive amount with a donation id', () => {
    const donation = (id, amount) => ({ currency: 'XTR', total_amount: amount, invoice_payload: JSON.stringify({ type: 'donation', donation_id: id, user_id: PAYER }) });
    expect(service.validatePreCheckout(donation(5, 50), PAYER).ok).toBe(true);
    expect(service.validatePreCheckout(donation(null, 50), PAYER).ok).toBe(false);
  });
});

describe('PaymentService.revokeRefundedPayment', () => {
  function build({ transaction, premiumExpiresAt }) {
    const transactions = { [transaction.telegram_payment_id]: { ...transaction } };
    const users = { 1: { id: 1, premium: true, premium_expires_at: premiumExpiresAt } };
    const callApi = jest.fn().mockResolvedValue(true);
    const service = new PaymentService(
      null, null, null,
      {
        getTransactionByTelegramPaymentId: async (id) => transactions[id] || null,
        updateTransactionStatus: async (id, status) => { Object.values(transactions).find(t => t.id === id).status = status; }
      },
      {
        getUserById: async (id) => users[id],
        updateUser: async (id, updates) => { Object.assign(users[id], updates); }
      }
    );
    service.setBot({ telegram: { callApi } });
    return { service, users, transactions, callApi };
  }

  test('subtracts the refunded days and keeps premium bought by other payments', async () => {
    const expires = new Date(Date.now() + 40 * DAY);
    const { service, users } = build({
      transaction: { id: 7, user_id: '1', telegram_payment_id: 'ch_1', tariff_duration: 30, status: 'completed', is_recurring: false },
      premiumExpiresAt: expires
    });
    const result = await service.revokeRefundedPayment('ch_1');
    expect(result.status).toBe('refunded');
    expect(users[1].premium).toBe(true);
    expect(Math.round((users[1].premium_expires_at - Date.now()) / DAY)).toBe(10);
  });

  test('turns premium off when the refunded payment covered the rest of it', async () => {
    const { service, users } = build({
      transaction: { id: 7, user_id: '1', telegram_payment_id: 'ch_1', tariff_duration: 30, status: 'completed', is_recurring: false },
      premiumExpiresAt: new Date(Date.now() + 20 * DAY)
    });
    await service.revokeRefundedPayment('ch_1');
    expect(users[1].premium).toBe(false);
    expect(users[1].premium_expires_at.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('a subscription payment also cancels the Stars subscription; one-time payments do not', async () => {
    const recurring = build({
      transaction: { id: 7, user_id: '1', telegram_payment_id: 'ch_sub', tariff_duration: 30, status: 'completed', is_recurring: true },
      premiumExpiresAt: new Date(Date.now() + 25 * DAY)
    });
    await recurring.service.revokeRefundedPayment('ch_sub');
    expect(recurring.callApi).toHaveBeenCalledWith('editUserStarSubscription', { user_id: 1, telegram_payment_charge_id: 'ch_sub', is_canceled: true });

    const oneTime = build({
      transaction: { id: 8, user_id: '1', telegram_payment_id: 'ch_once', tariff_duration: 90, status: 'completed', is_recurring: false },
      premiumExpiresAt: new Date(Date.now() + 80 * DAY)
    });
    await oneTime.service.revokeRefundedPayment('ch_once');
    expect(oneTime.callApi).not.toHaveBeenCalled();
  });

  test('a second refund notice for the same payment changes nothing (admin refund + refunded_payment)', async () => {
    const { service, users } = build({
      transaction: { id: 7, user_id: '1', telegram_payment_id: 'ch_1', tariff_duration: 30, status: 'completed', is_recurring: false },
      premiumExpiresAt: new Date(Date.now() + 70 * DAY)
    });
    await service.revokeRefundedPayment('ch_1');
    const after = users[1].premium_expires_at.getTime();
    expect(await service.revokeRefundedPayment('ch_1')).toEqual({ status: 'already_refunded' });
    expect(users[1].premium_expires_at.getTime()).toBe(after);
  });

  test('unknown payment is ignored', async () => {
    const { service } = build({
      transaction: { id: 7, user_id: '1', telegram_payment_id: 'ch_1', tariff_duration: 30, status: 'completed', is_recurring: false },
      premiumExpiresAt: new Date()
    });
    expect(await service.revokeRefundedPayment('nope')).toEqual({ status: 'unknown' });
  });
});
