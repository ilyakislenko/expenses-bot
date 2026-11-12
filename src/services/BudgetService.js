const logger = require('../utils/logger');

// Предупреждения: при 80% и при превышении бюджета, по разу за период на бюджет
function thresholdLevel(ratio) {
  if (ratio >= 1) return 100;
  if (ratio >= 0.8) return 80;
  return null;
}

class BudgetService {
  constructor(budgetRepository, expenseService, userNotificationRepository, premiumService, currencyUtils, localizationService, formatter, familyRepository = null, userRepository = null) {
    this.budgetRepository = budgetRepository;
    this.expenseService = expenseService;
    this.userNotificationRepository = userNotificationRepository;
    this.premiumService = premiumService;
    this.currencyUtils = currencyUtils;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.familyRepository = familyRepository;
    this.userRepository = userRepository;
  }

  // Чьи деньги считает пользователь: «все траты в семью» у премиума-участника семьи — семья ({ familyId }: общий
  // семейный бюджет, семейные траты всех участников, «Можно сегодня» по семье), иначе свои (userId)
  async scopeFor(userId) {
    if (!this.familyRepository || !this.userRepository) return userId;
    const user = await this.userRepository.getUserById(userId);
    if (!user || !user.family_mode || !(await this.premiumService.isPremiumUser(userId))) return userId;
    const family = await this.familyRepository.getUserFamily(userId);
    return family ? { familyId: family.id } : userId;
  }

  // owner: { familyId } — бюджеты этой семьи; id пользователя — бюджеты его контура (scopeFor)
  async resolve(owner) {
    return owner && typeof owner === 'object' ? owner : this.scopeFor(owner);
  }

  async list(owner) {
    return this.budgetRepository.getByOwner(await this.resolve(owner));
  }

  // categoryName = null — общий бюджет на период; заводится в контуре пользователя (в семье — общий семейный)
  async setBudget(userId, categoryName, amount, currency) {
    const owner = await this.scopeFor(userId);
    const result = await this.budgetRepository.upsert(owner, userId, categoryName, amount, currency);
    logger.info('Budget set', { userId, familyId: owner.familyId || null, categoryName, amount, currency });
    return result;
  }

  async deleteBudget(userId, budgetId) {
    return this.budgetRepository.deleteById(await this.scopeFor(userId), budgetId);
  }

  // Включили «все траты в семью»: личные бюджеты становятся семейными (если у семьи такого ещё нет)
  async moveToFamily(userId, familyId) {
    const moved = await this.budgetRepository.moveToFamily(userId, familyId);
    if (moved) logger.info('Budgets moved to family', { userId, familyId, moved });
    return moved;
  }

  // Бюджеты с тратами за период в основной валюте пользователя: { ...budget, spent, limit, ratio }.
  // Семейные бюджеты сравниваются с семейными тратами всех участников, личные — со своими
  async getStatus(owner, { timezone, currency, period }) {
    const scope = await this.resolve(owner);
    const budgets = await this.budgetRepository.getByOwner(scope);
    if (!budgets.length) return [];
    const [totals, categoryRows] = await Promise.all([
      this.expenseService.getTotals(scope, timezone, period),
      this.expenseService.getCategoryTotals(scope, timezone, period)
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

  // После новой траты в категории: новые предупреждения по её бюджету и общему бюджету (только премиум).
  // Без премиума (пробный или тариф закончился) бюджеты хранятся: при превышении — одно сообщение за период, что
  // предупреждения работают с премиумом (locked: true), вместо тишины
  async checkAfterExpense(userId, categoryName) {
    try {
      if (!(await this.premiumService.isPremiumUser(userId))) return await this.lockedNotice(userId, categoryName);
      const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
      const statuses = (await this.getStatus(userId, context))
        .filter(s => s.category_name === null || s.category_name === categoryName);

      const warnings = [];
      for (const status of statuses) {
        const level = thresholdLevel(status.ratio);
        if (!level) continue;
        // Сумма в ключе: после изменения лимита предупреждения по новому лимиту приходят заново
        const refKey = `${status.id}:${context.period.start}:${Number(status.amount)}`;
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

  // Без премиума: первый превышенный бюджет (траты или весь месяц) — один раз за период (budget_locked).
  // Бюджетов нет (почти все без премиума) — без расчёта периода и трат
  async lockedNotice(userId, categoryName) {
    if (!(await this.budgetRepository.getByOwner(userId)).length) return [];
    const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const exceeded = (await this.getStatus(userId, context))
      .find(s => (s.category_name === null || s.category_name === categoryName) && thresholdLevel(s.ratio) === 100);
    if (!exceeded) return [];
    if (!(await this.userNotificationRepository.markSent(userId, 'budget_locked', context.period.start))) return [];
    return [{ ...exceeded, level: 100, locked: true, currency: context.currency }];
  }

  budgetName(budget, lang) {
    if (budget.category_name === null) return this.localizationService.getText(lang, 'budget_total_name');
    const name = this.formatter.translateCategoryName(budget.category_name, this.localizationService, lang);
    return `${budget.icon || '📦'} ${this.formatter.escapeMarkdown(name)}`;
  }

  warningText(lang, warning) {
    const key = warning.locked ? 'budget_locked_notice' : (warning.level === 100 ? 'budget_warning_100' : 'budget_warning_80');
    return this.localizationService.getText(lang, key, {
      name: this.budgetName(warning, lang),
      spent: this.formatter.formatAmount(warning.spent, warning.currency),
      limit: this.formatter.formatAmount(warning.limit, warning.currency),
      percent: Math.round(warning.ratio * 100)
    });
  }
}

BudgetService.thresholdLevel = thresholdLevel;

module.exports = BudgetService;
