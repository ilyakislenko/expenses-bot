const logger = require('../utils/logger');

// Предупреждения: при 80% и при превышении бюджета, по разу за период на бюджет
function thresholdLevel(ratio) {
  if (ratio >= 1) return 100;
  if (ratio >= 0.8) return 80;
  return null;
}

class BudgetService {
  constructor(budgetRepository, expenseService, userNotificationRepository, premiumService, currencyUtils, localizationService, formatter) {
    this.budgetRepository = budgetRepository;
    this.expenseService = expenseService;
    this.userNotificationRepository = userNotificationRepository;
    this.premiumService = premiumService;
    this.currencyUtils = currencyUtils;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  async list(userId) {
    return this.budgetRepository.getByUser(userId);
  }

  // categoryName = null — общий бюджет на период
  async setBudget(userId, categoryName, amount, currency) {
    const result = await this.budgetRepository.upsert(userId, categoryName, amount, currency);
    logger.info('Budget set', { userId, categoryName, amount, currency });
    return result;
  }

  async deleteBudget(userId, budgetId) {
    return this.budgetRepository.deleteById(userId, budgetId);
  }

  // Бюджеты с тратами за период в основной валюте пользователя: { ...budget, spent, limit, ratio }
  async getStatus(userId, { timezone, currency, period }) {
    const budgets = await this.budgetRepository.getByUser(userId);
    if (!budgets.length) return [];
    const [totals, categoryRows] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.expenseService.getCategoryTotals(userId, timezone, period)
    ]);
    const spentByName = new Map();
    for (const row of categoryRows) {
      const converted = await this.currencyUtils.convert(Number(row.total), row.currency, currency);
      spentByName.set(row.name, (spentByName.get(row.name) || 0) + converted);
    }
    let totalSpent = 0;
    for (const { currency: c, total } of totals.byCurrency) {
      totalSpent += await this.currencyUtils.convert(Number(total), c, currency);
    }

    const statuses = [];
    for (const budget of budgets) {
      const limit = await this.currencyUtils.convert(Number(budget.amount), budget.currency, currency);
      const spent = budget.category_name === null ? totalSpent : (spentByName.get(budget.category_name) || 0);
      statuses.push({ ...budget, spent, limit, ratio: limit > 0 ? spent / limit : 0 });
    }
    return statuses;
  }

  // После новой траты в категории: новые предупреждения по её бюджету и общему бюджету (только премиум)
  async checkAfterExpense(userId, categoryName) {
    try {
      if (!(await this.premiumService.isPremiumUser(userId))) return [];
      const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
      const statuses = (await this.getStatus(userId, context))
        .filter(s => s.category_name === null || s.category_name === categoryName);

      const warnings = [];
      for (const status of statuses) {
        const level = thresholdLevel(status.ratio);
        if (!level) continue;
        const refKey = `${status.id}:${context.period.start}`;
        if (level === 100) {
          const isNew = await this.userNotificationRepository.markSent(userId, 'budget_100', refKey);
          await this.userNotificationRepository.markSent(userId, 'budget_80', refKey); // 80% после превышения уже не нужно
          if (isNew) warnings.push({ ...status, level, currency: context.currency });
        } else if (await this.userNotificationRepository.markSent(userId, 'budget_80', refKey)) {
          warnings.push({ ...status, level, currency: context.currency });
        }
      }
      return warnings;
    } catch (error) {
      // Предупреждение — не критичная часть записи траты
      logger.error('Budget check failed', { userId, categoryName, error: error.message });
      return [];
    }
  }

  budgetName(budget, lang) {
    if (budget.category_name === null) return this.localizationService.getText(lang, 'budget_total_name');
    const name = this.formatter.translateCategoryName(budget.category_name, this.localizationService, lang);
    return `${budget.icon || '📦'} ${this.formatter.escapeMarkdown(name)}`;
  }

  warningText(lang, warning) {
    return this.localizationService.getText(lang, warning.level === 100 ? 'budget_warning_100' : 'budget_warning_80', {
      name: this.budgetName(warning, lang),
      spent: this.formatter.formatAmount(warning.spent, warning.currency),
      limit: this.formatter.formatAmount(warning.limit, warning.currency),
      percent: Math.round(warning.ratio * 100)
    });
  }
}

BudgetService.thresholdLevel = thresholdLevel;

module.exports = BudgetService;
