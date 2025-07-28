const ExpenseRepository = require('../repositories/ExpenseRepository');
const UserRepository = require('../repositories/UserRepository');

class ExpenseService {
  static async getMonthlyStats(userId) {
    const userCurrency = await UserRepository.getUserCurrency(userId);
    const total = await ExpenseRepository.getTotalExpenses(userId, 'month');
    const categoryStats = await ExpenseRepository.getExpensesByCategory(userId, 'month');
    return { total, categoryStats, userCurrency };
  }

  static async getDailyStats(userId) {
    const userCurrency = await UserRepository.getUserCurrency(userId);
    const expenses = await ExpenseRepository.getDailyExpenses(userId);
    const total = await ExpenseRepository.getTotalExpenses(userId, 'day');
    return { total, expenses, userCurrency };
  }

  static async addExpense(userId, amount, description, categoryName) {
    return ExpenseRepository.addExpense(userId, amount, description, categoryName);
  }

  static async deleteLastExpense(userId) {
    return ExpenseRepository.deleteLastExpense(userId);
  }

  static async exportExpenses(userId) {
    const expenses = await ExpenseRepository.exportExpenses(userId);
    const userCurrency = await UserRepository.getUserCurrency(userId);
    return { expenses, userCurrency };
  }

  static async getCategories(userId) {
    return ExpenseRepository.getCategories(userId);
  }

  static async getMonthlyExpenses(userId) {
    return ExpenseRepository.getUserExpenses(userId, 1000, 'month');
  }

  static async getExpensesByCategoryId(userId, categoryId, period = 'month') {
    return ExpenseRepository.getExpensesByCategoryId(userId, categoryId, period);
  }

  static async getDailyExpenses(userId) {
    return ExpenseRepository.getDailyExpenses(userId);
  }

  static async getExpenseById(userId, expenseId) {
    return ExpenseRepository.getExpenseById(userId, expenseId);
  }

  static async updateExpenseById(userId, expenseId, data) {
    return ExpenseRepository.updateExpenseById(userId, expenseId, data);
  }

  static async deleteExpenseById(userId, expenseId) {
    return ExpenseRepository.deleteExpenseById(userId, expenseId);
  }
}

module.exports = ExpenseService; 