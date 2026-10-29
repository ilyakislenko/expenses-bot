const logger = require('../utils/logger');

// Несколько записей одним сообщением или голосом: записываются сразу одной партией. Категория траты — запомненная
// по описанию (как у одиночного ввода), иначе категория по умолчанию; валюта без кода — основная (траты) или
// валюта дохода (доходы).
class EntryBatchService {
  constructor({ entryBatchRepository, expenseService, incomeService, userService, funnelService, referralService = null }) {
    this.entryBatchRepository = entryBatchRepository;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.userService = userService;
    this.funnelService = funnelService;
    this.referralService = referralService;
  }

  // entries — из utils/multiEntry (описание уже в пределах лимита). Возвращает { batchId, defaulted } —
  // defaulted: сколько трат попало в категорию по умолчанию (не запомнена).
  // Уведомления банка (source 'bank'): у записи localAt — местное время из уведомления, categoryHint — системная категория
  // известного магазина (если категория не запомнена; тоже «угадана»); onCreated — см. EntryBatchRepository.create
  async record(userId, entries, { source, familyId = null, timezone = 'UTC', onCreated = null }) {
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
      const hinted = !remembered && entry.categoryHint ? categories.find(category => category.name === entry.categoryHint) : null;
      if (!remembered && !hinted) defaulted++;
      expenses.push({
        amount: entry.amount,
        currency: entry.currency || currency,
        description: entry.description,
        categoryId: (remembered || hinted || fallback).id,
        guessed: !remembered,
        localAt: entry.localAt || null
      });
    }
    const incomes = incomeEntries.map(entry => ({
      amount: entry.amount,
      currency: entry.currency || incomeCurrency,
      description: entry.description,
      localAt: entry.localAt || null
    }));

    const batchId = await this.entryBatchRepository.create(userId, { source, familyId, expenses, incomes, timezone }, onCreated);
    logger.info('Entry batch recorded', { userId, batchId, source, expenses: expenses.length, incomes: incomes.length, defaulted });
    if (expenses.length) {
      await this.funnelService.track(userId, 'first_expense');
      // Приглашённый: засчитывается вся партия (без await — как у одиночной траты и чека, никогда не бросает)
      if (this.referralService) this.referralService.onExpenseRecorded(userId);
    }
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
