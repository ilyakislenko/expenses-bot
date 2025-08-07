const Container = require('../container');

// Mock repositories
jest.mock('../repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getUserById: jest.fn().mockResolvedValue({ 
      id: 123456, 
      premium: false,
      premium_expires_at: null,
      premium_activated_at: null
    }),
    query: jest.fn().mockResolvedValue({ rows: [] })
  }));
});

jest.mock('../repositories/ExpenseRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getExpenseCount: jest.fn().mockResolvedValue(45)
  }));
});

describe('Premium Subscription Activation', () => {
  let userService;
  let paymentService;
  let mockUserRepository;

  beforeEach(() => {
    const container = new Container();
    userService = container.get('userService');
    paymentService = container.get('paymentService');
    mockUserRepository = container.get('userRepository');
  });

  describe('UserService.activatePremium', () => {
    it('should activate premium subscription for new user', async () => {
      const userId = 123456;
      const daysToAdd = 30;
      
      // Mock user without premium
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: false,
        premium_expires_at: null,
        premium_activated_at: null
      });
      
      const result = await userService.activatePremium(userId, daysToAdd);
      
      expect(mockUserRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [expect.any(Date), userId]
      );
      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
    });

    it('should extend existing premium subscription', async () => {
      const userId = 123456;
      const daysToAdd = 30;
      const existingExpiry = new Date();
      existingExpiry.setDate(existingExpiry.getDate() + 10); // 10 дней осталось
      
      // Mock user with active premium
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: existingExpiry,
        premium_activated_at: new Date('2024-01-01')
      });
      
      const result = await userService.activatePremium(userId, daysToAdd);
      
      expect(mockUserRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [expect.any(Date), userId]
      );
      expect(result.isNewActivation).toBe(false);
      expect(result.daysAdded).toBe(30);
    });

    it('should reactivate expired premium subscription', async () => {
      const userId = 123456;
      const daysToAdd = 30;
      const expiredDate = new Date('2020-01-01');
      
      // Mock user with expired premium
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: expiredDate,
        premium_activated_at: new Date('2020-01-01')
      });
      
      const result = await userService.activatePremium(userId, daysToAdd);
      
      expect(mockUserRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [expect.any(Date), userId]
      );
      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
    });
  });

  describe('UserService.isPremiumActive', () => {
    it('should return false for non-premium user', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: false,
        premium_expires_at: null
      });

      const result = await userService.isPremiumActive(123456);
      expect(result).toBe(false);
    });

    it('should return false for expired premium', async () => {
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: new Date('2020-01-01')
      });

      const result = await userService.isPremiumActive(123456);
      expect(result).toBe(false);
    });

    it('should return true for active premium', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 дней в будущем
      
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: futureDate
      });

      const result = await userService.isPremiumActive(123456);
      expect(result).toBe(true);
    });
  });

  describe('UserService.getPremiumStatus', () => {
    it('should return correct premium status for active subscription', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: futureDate,
        premium_activated_at: new Date('2024-01-01')
      });

      const status = await userService.getPremiumStatus(123456);
      
      expect(status.isPremium).toBe(true);
      expect(status.expiresAt).toEqual(futureDate);
      expect(status.daysRemaining).toBeGreaterThan(0);
      expect(status.activatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should return correct premium status for expired subscription', async () => {
      const pastDate = new Date('2020-01-01');
      
      mockUserRepository.getUserById.mockResolvedValue({
        id: 123456,
        premium: true,
        premium_expires_at: pastDate,
        premium_activated_at: new Date('2019-01-01')
      });

      const status = await userService.getPremiumStatus(123456);
      
      expect(status.isPremium).toBe(false);
      expect(status.daysRemaining).toBe(0);
    });
  });

  describe('PaymentService.handleSuccessfulPayment', () => {
    it('should extend existing premium subscription', async () => {
      const payment = {
        invoice_payload: JSON.stringify({
          user_id: 123456,
          tariff: 30,
          stars: 149
        }),
        total_amount: 14900
      };

      const mockUserService = {
        activatePremium: jest.fn().mockResolvedValue({
          isNewActivation: false,
          newExpiryDate: new Date('2025-01-30T23:59:59Z'),
          daysAdded: 30
        })
      };

      const result = await paymentService.handleSuccessfulPayment(payment, mockUserService);

      expect(mockUserService.activatePremium).toHaveBeenCalledWith(123456, 30);
      expect(result.isNewActivation).toBe(false);
      expect(result.daysAdded).toBe(30);
    });

    it('should activate new premium subscription', async () => {
      const payment = {
        invoice_payload: JSON.stringify({
          user_id: 123456,
          tariff: 30,
          stars: 149
        }),
        total_amount: 14900
      };

      const mockUserService = {
        activatePremium: jest.fn().mockResolvedValue({
          isNewActivation: true,
          newExpiryDate: new Date('2024-12-31T23:59:59Z'),
          daysAdded: 30
        })
      };

      const result = await paymentService.handleSuccessfulPayment(payment, mockUserService);

      expect(mockUserService.activatePremium).toHaveBeenCalledWith(123456, 30);
      expect(result.isNewActivation).toBe(true);
      expect(result.daysAdded).toBe(30);
    });
  });
}); 