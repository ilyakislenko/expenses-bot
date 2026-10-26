const UserService = require('../services/UserService');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Trial Period for New Users', () => {
  let userService;
  let mockUserRepository;
  let mockPremiumTransactionRepository;

  const newUser = {
    id: 123456,
    username: 'testuser',
    first_name: 'Test User',
    premium: false,
    premium_expires_at: null,
    premium_activated_at: null,
    has_trial: true
  };

  beforeEach(() => {
    mockUserRepository = {
      createUser: jest.fn(),
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
      getUserById: jest.fn(),
      markTrialConsumed: jest.fn().mockResolvedValue(undefined)
    };
    mockPremiumTransactionRepository = {
      createTransaction: jest.fn().mockResolvedValue({ id: 1 })
    };
    userService = new UserService(mockUserRepository, {}, mockPremiumTransactionRepository);
  });

  describe('UserService.registerUser', () => {
    it('gives a new user 14 days of premium and consumes the trial', async () => {
      mockUserRepository.createUser.mockResolvedValue(newUser);
      mockUserRepository.getUserById.mockResolvedValue(newUser);

      const before = Date.now();
      const result = await userService.registerUser(123456, 'testuser', 'Test User');
      const after = Date.now();

      expect(result).toEqual(newUser);
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(123456, 'testuser', 'Test User');

      expect(mockPremiumTransactionRepository.createTransaction).toHaveBeenCalledTimes(1);
      const trial = mockPremiumTransactionRepository.createTransaction.mock.calls[0][0];
      expect(trial).toEqual(expect.objectContaining({
        user_id: 123456,
        transaction_type: 'trial',
        tariff_duration: 14,
        stars_amount: 0,
        usd_amount: 0,
        rub_amount: 0,
        telegram_payment_id: null,
        previous_expiry_date: null,
        status: 'completed'
      }));
      expect(JSON.parse(trial.invoice_payload).type).toBe('trial');
      expect(trial.new_expiry_date.getTime()).toBeGreaterThanOrEqual(before + 14 * DAY_MS);
      expect(trial.new_expiry_date.getTime()).toBeLessThanOrEqual(after + 14 * DAY_MS);

      // Премиум сохранён пользователю с той же датой окончания
      expect(mockUserRepository.query).toHaveBeenCalledWith(expect.any(String), [trial.new_expiry_date, 123456]);
      expect(mockUserRepository.markTrialConsumed).toHaveBeenCalledWith(123456);
    });

    it('does not give a trial to a user whose trial was already consumed', async () => {
      mockUserRepository.createUser.mockResolvedValue({ ...newUser, has_trial: false });

      await userService.registerUser(123456, 'testuser', 'Test User');

      expect(mockUserRepository.query).not.toHaveBeenCalled();
      expect(mockPremiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
      expect(mockUserRepository.markTrialConsumed).not.toHaveBeenCalled();
    });

    it('does not give a trial to a user who already had premium', async () => {
      mockUserRepository.createUser.mockResolvedValue({
        ...newUser,
        premium_activated_at: new Date('2024-01-01')
      });

      await userService.registerUser(123456, 'testuser', 'Test User');

      expect(mockPremiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
      expect(mockUserRepository.markTrialConsumed).not.toHaveBeenCalled();
    });

    it('propagates errors during user registration', async () => {
      mockUserRepository.createUser.mockRejectedValue(new Error('Database error'));

      await expect(userService.registerUser(123456, 'testuser', 'Test User'))
        .rejects.toThrow('Database error');
    });
  });
});
