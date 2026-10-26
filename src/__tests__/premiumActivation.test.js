const UserService = require('../services/UserService');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Premium Subscription Activation', () => {
  let userService;
  let mockUserRepository;
  let mockPremiumTransactionRepository;

  beforeEach(() => {
    mockUserRepository = {
      getUserById: jest.fn(),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    };
    mockPremiumTransactionRepository = {
      createTransaction: jest.fn().mockResolvedValue({ id: 1 })
    };
    userService = new UserService(mockUserRepository, {}, mockPremiumTransactionRepository);
  });

  describe('UserService.activatePremium', () => {
    it('starts a new subscription from now for a user without premium', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: null
      });

      const before = Date.now();
      const result = await userService.activatePremium(123456, 30);
      const after = Date.now();

      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
      expect(result.newExpiryDate.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY_MS);
      expect(result.newExpiryDate.getTime()).toBeLessThanOrEqual(after + 30 * DAY_MS);
      expect(mockUserRepository.query).toHaveBeenCalledWith(expect.any(String), [result.newExpiryDate, 123456, expect.any(Date)]);
    });

    it('adds the paid days on top of an active subscription', async () => {
      const existingExpiry = new Date(Date.now() + 10 * DAY_MS);
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: existingExpiry,
        premium_activated_at: new Date('2024-01-01')
      });

      const result = await userService.activatePremium(123456, 30);

      expect(result.isNewActivation).toBe(false);
      expect(result.daysAdded).toBe(30);
      expect(result.newExpiryDate.getTime()).toBe(existingExpiry.getTime() + 30 * DAY_MS);
    });

    it('restarts an expired subscription from now instead of the old expiry', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: new Date('2020-01-01'),
        premium_activated_at: new Date('2020-01-01')
      });

      const before = Date.now();
      const result = await userService.activatePremium(123456, 30);

      expect(result.isNewActivation).toBe(true);
      expect(result.newExpiryDate.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY_MS);
    });

    it('records the payment with previous and new expiry dates', async () => {
      const existingExpiry = new Date(Date.now() + 5 * DAY_MS);
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: existingExpiry,
        premium_activated_at: new Date('2024-01-01')
      });

      const result = await userService.activatePremium(123456, 90, {
        stars: 349,
        usd: 6.99,
        rub: 589,
        telegram_payment_id: 'charge_1',
        invoice_payload: JSON.stringify({ type: 'premium_subscription', tariff: 90, stars: 349, user_id: 123456 })
      });

      expect(mockPremiumTransactionRepository.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 123456,
        transaction_type: 'extension',
        tariff_duration: 90,
        stars_amount: 349,
        telegram_payment_id: 'charge_1',
        previous_expiry_date: existingExpiry,
        new_expiry_date: result.newExpiryDate,
        status: 'completed',
        is_recurring: false
      }));
    });

    it('refuses a trial for a user who already had premium and changes nothing', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: false,
        premium_expires_at: new Date('2020-01-01'),
        premium_activated_at: new Date('2019-12-01')
      });

      await expect(userService.activatePremium(123456, 14, {
        stars: 0,
        invoice_payload: JSON.stringify({ type: 'trial', user_id: 123456, tariff: 14, stars: 0 })
      })).rejects.toThrow('Trial premium is not available');

      expect(mockUserRepository.query).not.toHaveBeenCalled();
      expect(mockPremiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });
  });

  describe('UserService.isPremiumActive', () => {
    it('returns false for a non-premium user', async () => {
      mockUserRepository.getUserById.mockResolvedValue({ id: 123456, premium: false, premium_expires_at: null });

      await expect(userService.isPremiumActive(123456)).resolves.toBe(false);
    });

    it('returns false for an unknown user', async () => {
      mockUserRepository.getUserById.mockResolvedValue(null);

      await expect(userService.isPremiumActive(123456)).resolves.toBe(false);
    });

    it('returns false for expired premium and switches it off', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: new Date('2020-01-01')
      });
      const disable = jest.spyOn(userService, 'disableExpiredPremium');

      await expect(userService.isPremiumActive(123456)).resolves.toBe(false);
      expect(disable).toHaveBeenCalledWith(123456);
    });

    it('returns true for active premium', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: new Date(Date.now() + 30 * DAY_MS)
      });
      const disable = jest.spyOn(userService, 'disableExpiredPremium');

      await expect(userService.isPremiumActive(123456)).resolves.toBe(true);
      expect(disable).not.toHaveBeenCalled();
    });
  });

  describe('UserService.getPremiumStatus', () => {
    it('reports an active subscription with the days remaining', async () => {
      const futureDate = new Date(Date.now() + 30 * DAY_MS);
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: futureDate,
        premium_activated_at: new Date('2024-01-01')
      });

      const status = await userService.getPremiumStatus(123456);

      expect(status.isPremium).toBe(true);
      expect(status.expiresAt).toEqual(futureDate);
      expect(status.daysRemaining).toBe(30);
      expect(status.activatedAt).toEqual(new Date('2024-01-01'));
    });

    it('reports an expired subscription as inactive and switches it off', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: new Date('2020-01-01'),
        premium_activated_at: new Date('2019-01-01')
      });
      const disable = jest.spyOn(userService, 'disableExpiredPremium');

      const status = await userService.getPremiumStatus(123456);

      expect(status.isPremium).toBe(false);
      expect(status.daysRemaining).toBe(0);
      expect(disable).toHaveBeenCalledWith(123456);
    });
  });

  describe('UserService.disableAllExpiredPremium', () => {
    it('returns how many subscriptions were switched off', async () => {
      mockUserRepository.query.mockResolvedValue({ rowCount: 5 });

      await expect(userService.disableAllExpiredPremium()).resolves.toBe(5);
    });
  });
});
