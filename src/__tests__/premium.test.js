const Container = require('../container');

// Mock repositories
jest.mock('../repositories/UserRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getUserPremium: jest.fn().mockResolvedValue(true), // Premium user
    setUserPremium: jest.fn().mockResolvedValue(undefined),
    getUserCurrency: jest.fn().mockResolvedValue('RUB'),
    setUserCurrency: jest.fn().mockResolvedValue(undefined),
    createUser: jest.fn().mockResolvedValue({ id: 1, username: 'testuser', first_name: 'Test' })
  }));
});

jest.mock('../repositories/CategoryRepository', () => {
  return jest.fn().mockImplementation(() => ({
    getCategories: jest.fn().mockResolvedValue([
      { id: 1, name: 'Еда', icon: '🍕', user_id: 0 },
      { id: 2, name: 'Транспорт', icon: '🚗', user_id: 0 },
      { id: 3, name: 'Моя категория', icon: '⭐', user_id: 1 }
    ]),
    getUserCategories: jest.fn().mockResolvedValue([
      { id: 3, name: 'Моя категория', icon: '⭐', user_id: 1 }
    ]),
    createUserCategory: jest.fn().mockResolvedValue({ id: 4, name: 'Новая', icon: '🆕', user_id: 1 }),
    deleteUserCategory: jest.fn().mockResolvedValue({ id: 3, name: 'Удаленная', user_id: 1 }),
    updateUserCategory: jest.fn().mockResolvedValue({ id: 3, name: 'Обновленная', icon: '🔄', user_id: 1 }),
    getOrCreateCategory: jest.fn().mockResolvedValue({ id: 1, name: 'Еда', user_id: 0 })
  }));
});

describe('Premium Features', () => {
  let userService, categoryRepository;

  beforeEach(() => {
    const container = new Container();
    userService = container.get('userService');
    categoryRepository = container.get('categoryRepository');
  });

  describe('UserService Premium Methods', () => {
    it('should create user category for premium user', async () => {
      const result = await userService.createUserCategory(1, 'Новая категория', '🆕');
      expect(result).toBeDefined();
      expect(result.name).toBe('Новая');
      expect(result.icon).toBe('🆕');
    });

    it('should get user categories for premium user', async () => {
      const categories = await userService.getUserCategories(1);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should delete user category for premium user', async () => {
      const result = await userService.deleteUserCategory(1, 3);
      expect(result).toBeDefined();
      expect(result.name).toBe('Удаленная');
    });

    it('should update user category for premium user', async () => {
      const result = await userService.updateUserCategory(1, 3, { name: 'Обновленная', icon: '🔄' });
      expect(result).toBeDefined();
      expect(result.name).toBe('Обновленная');
      expect(result.icon).toBe('🔄');
    });
  });

  describe('CategoryRepository Hybrid System', () => {
    it('should get both system and user categories', async () => {
      const categories = await categoryRepository.getCategories(1);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      // Проверяем, что есть и системные, и пользовательские категории
      const systemCategories = categories.filter(cat => cat.user_id === 0);
      const userCategories = categories.filter(cat => cat.user_id === 1);
      
      expect(systemCategories.length).toBeGreaterThan(0);
      expect(userCategories.length).toBeGreaterThan(0);
    });

    it('should get only user categories', async () => {
      const categories = await categoryRepository.getUserCategories(1);
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.every(cat => cat.user_id === 1)).toBe(true);
    });
  });
}); 