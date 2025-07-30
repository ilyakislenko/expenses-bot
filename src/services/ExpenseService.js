class ExpenseService {
  constructor(expenseRepository, userRepository, categoryRepository) {
    this.expenseRepository = expenseRepository;
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
  }

  async getMonthlyStats(userId) {
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const total = await this.expenseRepository.getTotalExpenses(userId, 'month');
    const categoryStats = await this.expenseRepository.getExpensesByCategory(userId, 'month');
    return { total, categoryStats, userCurrency };
  }

  async getDailyStats(userId) {
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    const expenses = await this.expenseRepository.getDailyExpenses(userId);
    const total = await this.expenseRepository.getTotalExpenses(userId, 'day');
    return { total, expenses, userCurrency };
  }

  async addExpense(userId, amount, description, categoryName) {
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    
    // Ищем категорию в системных и пользовательских
    const category = await this.categoryRepository.getOrCreateCategory(userId, categoryName);
    if (!category) {
      // Если категория не найдена, используем "Другое"
      const defaultCategory = await this.categoryRepository.getCategoryByName(0, 'Другое');
      return this.expenseRepository.addExpense(
        userId, 
        amount, 
        description, 
        defaultCategory.id, 
        userCurrency
      );
    }
    
    return this.expenseRepository.addExpense(
      userId, 
      amount, 
      description, 
      category.id, 
      userCurrency
    );
  }

  async deleteLastExpense(userId) {
    return this.expenseRepository.deleteLastExpense(userId);
  }

  async exportExpenses(userId) {
    const expenses = await this.expenseRepository.exportExpenses(userId);
    const userCurrency = await this.userRepository.getUserCurrency(userId);
    return { expenses, userCurrency };
  }

  async getCategories(userId) {
    return this.categoryRepository.getCategories(userId);
  }

  async getMonthlyExpenses(userId) {
    return this.expenseRepository.getUserExpenses(userId, 1000);
  }

  async getExpensesByCategoryId(userId, categoryId, period = 'month') {
    return this.expenseRepository.getExpensesByCategoryId(userId, categoryId, period);
  }

  async getDailyExpenses(userId) {
    return this.expenseRepository.getDailyExpenses(userId);
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