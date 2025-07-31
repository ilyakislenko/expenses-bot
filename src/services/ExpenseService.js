const logger = require('../utils/logger');
const { expensesTotal, expensesAmountTotal, newUsersTotal } = require('../utils/metrics');

class ExpenseService {
  constructor(expenseRepository, userRepository, categoryRepository) {
    this.expenseRepository = expenseRepository;
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
  }

  async getMonthlyStats(userId) {
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    const total = await this.expenseRepository.getTotalExpenses(userId, 'month', userTimezone);
    const categoryStats = await this.expenseRepository.getExpensesByCategory(userId, 'month', userTimezone);
    return { total, categoryStats, userCurrency };
  }

  async getDailyStats(userId) {
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    const expenses = await this.expenseRepository.getDailyExpenses(userId, userTimezone);
    const total = await this.expenseRepository.getTotalExpenses(userId, 'day', userTimezone);
    return { total, expenses, userCurrency };
  }

  async addExpense(userId, amount, description, categoryName) {
    try {
      const userCurrency = await this.userRepository.getUserCurrency(userId);
      const userTimezone = await this.userRepository.getUserTimezone(userId);
      
      // Ищем категорию в системных и пользовательских
      const category = await this.categoryRepository.getOrCreateCategory(userId, categoryName);
      if (!category) {
        // Если категория не найдена, используем "Другое"
        const defaultCategory = await this.categoryRepository.getCategoryByName(0, 'Другое');
        const expense = await this.expenseRepository.addExpense(
          userId, 
          amount, 
          description, 
          defaultCategory.id, 
          userCurrency,
          userTimezone
        );
        
        // Обновляем метрики
        expensesTotal.inc({ currency: userCurrency });
        expensesAmountTotal.inc({ currency: userCurrency }, amount);
        
        logger.info('Expense added with default category', {
          userId,
          amount,
          currency: userCurrency,
          category: 'Другое',
          expenseId: expense.id
        });
        
        return expense;
      }
      
      const expense = await this.expenseRepository.addExpense(
        userId, 
        amount, 
        description, 
        category.id, 
        userCurrency,
        userTimezone
      );
      
      // Обновляем метрики
      expensesTotal.inc({ currency: userCurrency });
      expensesAmountTotal.inc({ currency: userCurrency }, amount);
      
      logger.info('Expense added successfully', {
        userId,
        amount,
        currency: userCurrency,
        category: category.name,
        expenseId: expense.id
      });
      
      return expense;
    } catch (error) {
      logger.error('Failed to add expense', {
        userId,
        amount,
        description,
        categoryName,
        error: error.message
      });
      throw error;
    }
  }

  async deleteLastExpense(userId) {
    return this.expenseRepository.deleteLastExpense(userId);
  }

  async exportExpenses(userId) {
    const expenses = await this.expenseRepository.exportExpenses(userId);
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    return { expenses, userCurrency, userTimezone };
  }

  async getCategories(userId) {
    return this.categoryRepository.getCategories(userId);
  }

  async getMonthlyExpenses(userId) {
    return this.expenseRepository.getUserExpenses(userId, 1000);
  }

  async getExpensesByCategoryId(userId, categoryId, period = 'month') {
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    return this.expenseRepository.getExpensesByCategoryId(userId, categoryId, period, userTimezone);
  }

  async getDailyExpenses(userId) {
    const userTimezone = await this.userRepository.getUserTimezone(userId);
    return this.expenseRepository.getDailyExpenses(userId, userTimezone);
  }

  async getExpenseById(userId, expenseId) {
    return this.expenseRepository.getExpenseById(userId, expenseId);
  }

  async updateExpenseById(userId, expenseId, data) {
    return this.expenseRepository.updateExpenseById(userId, expenseId, data);
  }

  async deleteExpenseById(userId, expenseId) {
    return this.expenseRepository.deleteExpenseById(userId, expenseId);
  }
}

module.exports = ExpenseService; 