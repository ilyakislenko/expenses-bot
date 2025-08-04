class StateService {
  constructor() {
    this.userEditState = new Map();
    this.pendingExpenses = new Map();
    this.userStates = new Map(); // Для семейных состояний
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

  // User States methods (для семейных состояний)
  setUserState(userId, state) {
    this.userStates.set(userId, state);
  }

  getUserState(userId) {
    return this.userStates.get(userId);
  }

  hasUserState(userId) {
    return this.userStates.has(userId);
  }

  deleteUserState(userId) {
    return this.userStates.delete(userId);
  }

  // Utility methods
  clearUserState(userId) {
    this.deleteUserEditState(userId);
    this.deletePendingExpense(userId);
    this.deleteUserState(userId);
  }

  // For testing purposes
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
    this.userStates.clear();
  }
}

module.exports = StateService; 