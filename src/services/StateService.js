class StateService {
  constructor() {
    this.userEditState = new Map();
    this.pendingExpenses = new Map();
    this.userStates = new Map(); // Для семейных состояний
    this.pendingRecurring = new Map(); // Черновик регулярной траты до выбора категории
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

  // Pending recurring expense methods
  setPendingRecurring(userId, data) {
    this.pendingRecurring.set(userId, data);
  }

  getPendingRecurring(userId) {
    return this.pendingRecurring.get(userId);
  }

  deletePendingRecurring(userId) {
    return this.pendingRecurring.delete(userId);
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
    this.deletePendingRecurring(userId);
    this.deleteUserState(userId);
  }

  // For testing purposes
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
    this.pendingRecurring.clear();
    this.userStates.clear();
  }
}

module.exports = StateService; 