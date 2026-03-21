class StateService {
  constructor() {
    this.userEditState = new Map();
    this.pendingExpenses = new Map();
    this.userStates = new Map(); // Для семейных состояний
    this.exportState = new Map(); // Состояние экспорта (выбранные категории)
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

  // Export State methods (выбранные категории для экспорта)
  setExportState(userId, data) {
    this.exportState.set(userId, data);
  }

  getExportState(userId) {
    return this.exportState.get(userId);
  }

  hasExportState(userId) {
    return this.exportState.has(userId);
  }

  deleteExportState(userId) {
    return this.exportState.delete(userId);
  }

  // Utility methods
  clearUserState(userId) {
    this.deleteUserEditState(userId);
    this.deletePendingExpense(userId);
    this.deleteUserState(userId);
    this.deleteExportState(userId);
  }

  // For testing purposes
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
    this.userStates.clear();
    this.exportState.clear();
  }
}

module.exports = StateService; 