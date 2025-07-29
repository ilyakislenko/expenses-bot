const UserRepository = require('../repositories/UserRepository');
const ExpenseRepository = require('../repositories/ExpenseRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const CurrencyRepository = require('../repositories/CurrencyRepository');

describe('Repositories', () => {
  let userRepository, expenseRepository, categoryRepository, currencyRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    expenseRepository = new ExpenseRepository();
    categoryRepository = new CategoryRepository();
    currencyRepository = new CurrencyRepository();
  });

  describe('UserRepository', () => {
    it('should create user repository instance', () => {
      expect(userRepository).toBeInstanceOf(UserRepository);
    });

    it('should have query method', () => {
      expect(typeof userRepository.query).toBe('function');
    });
  });

  describe('ExpenseRepository', () => {
    it('should create expense repository instance', () => {
      expect(expenseRepository).toBeInstanceOf(ExpenseRepository);
    });

    it('should have query method', () => {
      expect(typeof expenseRepository.query).toBe('function');
    });
  });

  describe('CategoryRepository', () => {
    it('should create category repository instance', () => {
      expect(categoryRepository).toBeInstanceOf(CategoryRepository);
    });

    it('should have query method', () => {
      expect(typeof categoryRepository.query).toBe('function');
    });
  });

  describe('CurrencyRepository', () => {
    it('should create currency repository instance', () => {
      expect(currencyRepository).toBeInstanceOf(CurrencyRepository);
    });

    it('should have query method', () => {
      expect(typeof currencyRepository.query).toBe('function');
    });
  });
}); 