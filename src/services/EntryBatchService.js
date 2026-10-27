const logger = require('../utils/logger');

// Несколько записей одним сообщением или голосом: записываются сразу одной партией. Категория траты — запомненная
// по описанию (как у одиночного ввода), иначе категория по умолчанию; валюта без кода — основная (траты) или
// валюта дохода (доходы).
class EntryBatchService {
  constructor({ entryBatchRepository, expenseService, incomeService, userService, funnelService }) {
    this.entryBatchRepository = entryBatchRepository;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.userService = userService;
    this.funnelService = funnelService;
  }

  // entries — из utils/multiEntry (описание уже в пределах лимита). Возвращает { batchId, defaulted } —
  // defaulted: сколько трат попало в категорию по умолчанию (не запомнена)
  async record(userId, entries, { source, familyId = null }) {
    const expenseEntries = entries.filter(entry => entry.kind === 'expense');
    const incomeEntries = entries.filter(entry => entry.kind === 'income');
    const [categories, fallback, currency, incomeCurrency] = await Promise.all([
      expenseEntries.length ? this.expenseService.getCategories(userId) : [],
      expenseEntries.length ? this.expenseService.getDefaultCategory() : null,
      expenseEntries.length ? this.userService.getUserCurrency(userId) : null,
      incomeEntries.length ? this.incomeService.getIncomeCurrency(userId) : null
    ]);

    let defaulted = 0;
    const expenses = [];
    for (const entry of expenseEntries) {
      const remembered = await this.expenseService.getRememberedCategory(userId, entry.description, categories);
      if (!remembered) defaulted++;
      expenses.push({
        amount: entry.amount,
        currency: entry.currency || currency,
        description: entry.description,
        categoryId: (remembered || fallback).id,
        guessed: !remembered
      });
    }
    const incomes = incomeEntries.map(entry => ({
      amount: entry.amount,
      currency: entry.currency || incomeCurrency,
      description: entry.description
    }));

    const batchId = await this.entryBatchRepository.create(userId, { source, familyId, expenses, incomes });
    logger.info('Entry batch recorded', { userId, batchId, source, expenses: expenses.length, incomes: incomes.length, defaulted });
    if (expenses.length) await this.funnelService.track(userId, 'first_expense');
    return { batchId, defaulted };
  }

  async getBatch(userId, batchId) {
    return this.entryBatchRepository.getById(userId, batchId);
  }

  async getItems(userId, batchId) {
    const [expenses, incomes] = await Promise.all([
      this.entryBatchRepository.getExpenses(userId, batchId),
      this.entryBatchRepository.getIncomes(userId, batchId)
    ]);
    return { expenses, incomes };
  }

  async undo(userId, batchId) {
    const result = await this.entryBatchRepository.undo(userId, batchId);
    if (result) logger.info('Entry batch undone', { userId, batchId, ...result });
    return result;
  }
}

module.exports = EntryBatchService;
