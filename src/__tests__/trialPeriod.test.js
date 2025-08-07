const UserService = require('../services/UserService');
const { TRIAL_PERIOD } = require('../utils/constants');

describe('Trial Period for New Users', () => {
  let userService;
  let mockUserRepository;
  let mockCategoryRepository;
  let mockPremiumTransactionRepository;

  beforeEach(() => {
    mockUserRepository = {
      createUser: jest.fn(),
      query: jest.fn(),
      getUserById: jest.fn()
    };

    mockCategoryRepository = {
      createUserCategory: jest.fn(),
      getUserCategories: jest.fn(),
      getCategoriesWithPremium: jest.fn(),
      deleteUserCategory: jest.fn(),
      updateUserCategory: jest.fn()
    };

    mockPremiumTransactionRepository = {
      createTransaction: jest.fn()
    };

    userService = new UserService(
      mockUserRepository,
      mockCategoryRepository,
      mockPremiumTransactionRepository
    );
  });

  describe('UserService.registerUser', () => {
    it('should give trial premium to new users', async () => {
      const userId = 123456;
      const username = 'testuser';
      const firstName = 'Test User';

      // Мокаем создание пользователя
      mockUserRepository.createUser.mockResolvedValue({
        id: userId,
        username,
        first_name: firstName,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: null
      });

      // Мокаем getUserById для activatePremium
      mockUserRepository.getUserById.mockResolvedValue({
        id: userId,
        username,
        first_name: firstName,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: null
      });

      // Мокаем активацию премиума
      mockUserRepository.query.mockResolvedValue({ rowCount: 1 });

      // Мокаем создание транзакции
      mockPremiumTransactionRepository.createTransaction.mockResolvedValue({ id: 1 });

      const result = await userService.registerUser(userId, username, firstName);

      // Проверяем, что пользователь создан
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userId, username, firstName);

      // Проверяем, что премиум активирован
      expect(mockUserRepository.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET premium = true/),
        [expect.any(Date), userId]
      );

      // Проверяем, что транзакция создана с правильными данными
      expect(mockPremiumTransactionRepository.createTransaction).toHaveBeenCalledWith({
        user_id: userId,
        transaction_type: 'trial',
        tariff_duration: TRIAL_PERIOD.DAYS,
        stars_amount: 0,
        usd_amount: 0,
        rub_amount: 0,
        telegram_payment_id: null,
        invoice_payload: expect.stringContaining('"type":"trial"'),
        previous_expiry_date: null,
        new_expiry_date: expect.any(Date),
        status: 'completed'
      });

      expect(result).toEqual({
        id: userId,
        username,
        first_name: firstName,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: null
      });
    });

    it('should handle errors during user registration', async () => {
      const userId = 123456;
      const username = 'testuser';
      const firstName = 'Test User';

      const error = new Error('Database error');
      mockUserRepository.createUser.mockRejectedValue(error);

      await expect(userService.registerUser(userId, username, firstName))
        .rejects.toThrow('Database error');
    });

    it('should use correct trial period duration from constants', () => {
      expect(TRIAL_PERIOD.DAYS).toBe(14);
      expect(TRIAL_PERIOD.TYPE).toBe('trial');
    });
  });
}); 