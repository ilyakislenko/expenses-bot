const MAX_PENDING_EXPENSES = 20;

class StateService {
  constructor() {
    this.userEditState = new Map();
    this.pendingExpenses = new Map(); // userId → Map(messageId карточки выбора категории → черновик траты)
    this.userStates = new Map(); // Для семейных состояний
    this.pendingRecurring = new Map(); // Черновик регулярной траты до выбора категории
    this.exportState = new Map(); // Фильтр экспорта: { categoryIds } (null — все категории)
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

  // Pending Expenses: черновик привязан к сообщению с выбором категории, кнопки другого сообщения его не видят.
  // Значение null — черновик уже записан (метка нужна, чтобы повторное нажатие не просило прислать трату заново).
  setPendingExpense(userId, messageId, expenseData) {
    let drafts = this.pendingExpenses.get(userId);
    if (!drafts) {
      drafts = new Map();
      this.pendingExpenses.set(userId, drafts);
    }
    drafts.set(messageId, expenseData);
    // Брошенные карточки не копим: храним только последние MAX_PENDING_EXPENSES черновиков
    if (drafts.size > MAX_PENDING_EXPENSES) {
      drafts.delete(drafts.keys().next().value);
    }
  }

  // Достаёт черновик и сразу помечает его записанным (синхронно, поэтому из двух одновременных нажатий
  // черновик получит только первое). Возвращает черновик, null — уже взят, undefined — черновика нет.
  takePendingExpense(userId, messageId) {
    const drafts = this.pendingExpenses.get(userId);
    const draft = drafts?.get(messageId);
    if (draft) drafts.set(messageId, null);
    return draft;
  }

  hasPendingExpense(userId) {
    const drafts = this.pendingExpenses.get(userId);
    return !!drafts && [...drafts.values()].some(draft => draft !== null);
  }

  deletePendingExpense(userId, messageId) {
    const drafts = this.pendingExpenses.get(userId);
    if (!drafts) return false;
    const deleted = drafts.delete(messageId);
    if (!drafts.size) this.pendingExpenses.delete(userId);
    return deleted;
  }

  deleteAllPendingExpenses(userId) {
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

  // Export state methods
  setExportState(userId, data) {
    this.exportState.set(userId, data);
  }

  getExportState(userId) {
    return this.exportState.get(userId);
  }

  deleteExportState(userId) {
    return this.exportState.delete(userId);
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
    this.deleteAllPendingExpenses(userId);
    this.deletePendingRecurring(userId);
    this.deleteExportState(userId);
    this.deleteUserState(userId);
  }

  // For testing purposes
  clearAll() {
    this.userEditState.clear();
    this.pendingExpenses.clear();
    this.pendingRecurring.clear();
    this.exportState.clear();
    this.userStates.clear();
  }
}

module.exports = StateService; 