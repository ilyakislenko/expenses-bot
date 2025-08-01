class StateService {
  constructor() {
    this.userEditState = new Map();
    this.pendingExpenses = new Map();
  }

  // User Edit State methods
  setUserEditState(userId, expenseId) {
    this.userEditState.set(userId, expenseId);
  }

  getUserEditState(userId) {
    return this.userEditState.get(userId);
  }

  hasUserEditState(userId) {
    return this.userEditState.has(userId);
  }

  deleteUserEditState(userId) {
    return this.userEditState.delete(userId);
  }

  // Pending Expenses methods
  setPendingExpense(userId, expenseData) {
    this.pendingExpenses.set(userId, expenseData);
  }

  getPendingExpense(userId) {
    return this.pendingExpenses.get(userId);
  }

  hasPendingExpense(userId) {
    return this.pendingExpenses.has(userId);
  }

  deletePendingExpense(userId) {
    return this.pendingExpenses.delete(userId);
  }



  // Utility methods
  clearUserState(userId) {
    this.deleteUserEditState(userId);
    this.deletePendingExpense(userId);
  }

  // For testing purposes
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
  }
}

module.exports = StateService; 