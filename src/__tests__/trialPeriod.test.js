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

    it('should not give trial premium to existing users who already had premium', async () => {
      const userId = 123456;
      const username = 'testuser';
      const firstName = 'Test User';

      // Мокаем создание пользователя (существующий пользователь)
      mockUserRepository.createUser.mockResolvedValue({
        id: userId,
        username,
        first_name: firstName,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: new Date('2025-01-01') // Уже был премиум
      });

      const result = await userService.registerUser(userId, username, firstName);

      // Проверяем, что пользователь создан
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userId, username, firstName);

      // Проверяем, что премиум НЕ активирован (activatePremium не вызывается)
      expect(mockUserRepository.query).not.toHaveBeenCalled();
      expect(mockPremiumTransactionRepository.createTransaction).not.toHaveBeenCalled();

      expect(result).toEqual({
        id: userId,
        username,
        first_name: firstName,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: new Date('2025-01-01')
      });
    });

    it('should use correct trial period duration from constants', () => {
      expect(TRIAL_PERIOD.DAYS).toBe(14);
      expect(TRIAL_PERIOD.TYPE).toBe('trial');
    });
  });

  describe('UserService.activatePremium', () => {
    it('should block trial premium activation for users who already had premium', async () => {
      const userId = 123456;
      
      // Мокаем пользователя, у которого уже был премиум
      mockUserRepository.getUserById.mockResolvedValue({
        id: userId,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: new Date('2025-01-01') // Уже был премиум
      });

      const trialTransactionData = {
        stars: 0,
        usd: 0,
        rub: 0,
        telegram_payment_id: null,
        invoice_payload: JSON.stringify({
          user_id: userId,
          tariff: TRIAL_PERIOD.DAYS,
          stars: 0,
          type: TRIAL_PERIOD.TYPE
        })
      };

      // Ожидаем, что вызов activatePremium с триальными данными выбросит ошибку
      await expect(userService.activatePremium(userId, TRIAL_PERIOD.DAYS, trialTransactionData))
        .rejects.toThrow('Trial premium is not available for users who already had premium');

      // Проверяем, что обновление в БД не происходило
      expect(mockUserRepository.query).not.toHaveBeenCalled();
      expect(mockPremiumTransactionRepository.createTransaction).not.toHaveBeenCalled();
    });

    it('should allow regular premium activation for users who already had premium', async () => {
      const userId = 123456;
      
      // Мокаем пользователя, у которого уже был премиум
      mockUserRepository.getUserById.mockResolvedValue({
        id: userId,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: new Date('2025-01-01') // Уже был премиум
      });

      // Мокаем обновление в БД
      mockUserRepository.query.mockResolvedValue({ rowCount: 1 });

      // Мокаем создание транзакции
      mockPremiumTransactionRepository.createTransaction.mockResolvedValue({ id: 1 });

      const regularTransactionData = {
        stars: 87,
        usd: 1.99,
        rub: 156,
        telegram_payment_id: 'test_payment_id',
        invoice_payload: JSON.stringify({
          user_id: userId,
          tariff: 30,
          stars: 87,
          type: 'purchase'
        })
      };

      // Ожидаем, что обычная активация премиума работает
      const result = await userService.activatePremium(userId, 30, regularTransactionData);

      // Проверяем, что обновление в БД произошло
      expect(mockUserRepository.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE users\s+SET premium = true/),
        [expect.any(Date), userId]
      );

      // Проверяем, что транзакция создана
      expect(mockPremiumTransactionRepository.createTransaction).toHaveBeenCalledWith({
        user_id: userId,
        transaction_type: 'activation',
        tariff_duration: 30,
        stars_amount: 87,
        usd_amount: 1.99,
        rub_amount: 156,
        telegram_payment_id: 'test_payment_id',
        invoice_payload: expect.stringContaining('"type":"purchase"'),
        previous_expiry_date: null,
        new_expiry_date: expect.any(Date),
        status: 'completed'
      });

      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
    });
  });
}); 