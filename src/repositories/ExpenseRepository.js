const db = require('../database');

class ExpenseRepository {
  static async addExpense(userId, amount, description, categoryName = 'Другое') {
    return db.addExpense(userId, amount, description, categoryName);
  }

  static async getUserExpenses(userId, limit = 10) {
    return db.getUserExpenses(userId, limit);
  }

  static async getDailyExpenses(userId) {
    return db.getDailyExpenses(userId);
  }

  static async getTotalExpenses(userId, period = 'month') {
    return db.getTotalExpenses(userId, period);
  }

  static async getExpensesByCategory(userId, period = 'month') {
    return db.getExpensesByCategory(userId, period);
  }

  static async deleteLastExpense(userId) {
    return db.deleteLastExpense(userId);
  }

  static async exportExpenses(userId) {
    return db.exportExpenses(userId);
  }

  static async getCategories(userId) {
    return db.getCategories(userId);
  }

  static async getExpensesByCategoryId(userId, categoryId, period = 'month') {
    return db.getExpensesByCategoryId(userId, categoryId, period);
  }

  static async deleteExpenseById(userId, expenseId) {
    return db.deleteExpenseById(userId, expenseId);
  }

  static async updateExpenseById(userId, expenseId, data) {
    return db.updateExpenseById(userId, expenseId, data);
  }

  static async getExpenseById(userId, expenseId) {
    return db.getExpenseById(userId, expenseId);
  }
}

module.exports = ExpenseRepository; 