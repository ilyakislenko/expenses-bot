const logger = require('../utils/logger');
const { expensesTotal, expensesAmountTotal } = require('../utils/metrics');
const { localToday, customPeriod, dayPeriod } = require('../utils/period');

class ExpenseService {
  constructor(expenseRepository, userRepository, categoryRepository, premiumService, funnelService) {
    this.expenseRepository = expenseRepository;
    this.userRepository = userRepository;
    this.categoryRepository = categoryRepository;
    this.premiumService = premiumService;
    this.funnelService = funnelService;
  }

  async hasAnyExpenseToday(userId, userTimezone) {
    // Выбираем есть ли записи за локальный день
    return this.expenseRepository.hasAnyExpenseToday(userId, userTimezone);
  }

  async hasAnyExpenseBetweenLocal(userId, userTimezone, startHour, endHour) {
    return this.expenseRepository.hasAnyExpenseBetweenLocal(userId, userTimezone, startHour, endHour);
  }

  // Контекст периода пользователя: kind 'month' — пользовательский месяц (period_start_day), 'day' — сутки.
  // offset: 0 — текущий, -1 — предыдущий и т.д.
  async getPeriodContext(userId, kind = 'month', offset = 0) {
    const [timezone, currency, startDay] = await Promise.all([
      this.userRepository.getUserTimezone(userId),
      this.userRepository.getUserCurrency(userId),
      this.userRepository.getUserPeriodStartDay(userId)
    ]);
    const today = localToday(timezone);
    const period = kind === 'day' ? dayPeriod(today, offset) : customPeriod(today, startDay, offset);
    return { timezone, currency, startDay, today, period };
  }

  // { byCurrency: [{ currency, total }], count }
  async getTotals(userId, timezone, period) {
    return this.expenseRepository.getTotalsBetween(userId, timezone, period.start, period.end);
  }

  async getCategoryTotals(userId, timezone, period) {
    return this.expenseRepository.getCategoryTotalsBetween(userId, timezone, period.start, period.end);
  }

  async getExpenses(userId, timezone, period, categoryName = null) {
    return this.expenseRepository.getExpensesBetween(userId, timezone, period.start, period.end, categoryName);
  }

  async getCategoryById(categoryId) {
    return this.categoryRepository.getCategoryById(categoryId);
  }

  // Категория, в которую пользователь последний раз записывал трату с таким же описанием,
  // если она всё ещё ему доступна (например, кастомная категория после окончания премиума — нет)
  async getRememberedCategory(userId, description, availableCategories) {
    if (!description) return null;
    const categoryId = await this.expenseRepository.getLastCategoryIdForDescription(userId, description);
    return availableCategories.find(category => category.id === categoryId) || null;
  }

  async getDefaultCategory() {
    const other = await this.categoryRepository.getCategoryByName(0, 'Другое');
    if (other) return other;
    const categories = await this.categoryRepository.getCategories(0);
    if (!categories.length) throw new Error('No categories available');
    return categories[0];
  }

  // currency = null → основная валюта пользователя
  async addExpense(userId, { amount, currency = null, description = null, categoryId, familyId = null }) {
    try {
      const expenseCurrency = currency || await this.userRepository.getUserCurrency(userId);
      const expense = await this.expenseRepository.addExpense(userId, amount, description, categoryId, expenseCurrency, null, familyId);

      expensesTotal.inc({ currency: expenseCurrency });
      expensesAmountTotal.inc({ currency: expenseCurrency }, amount);
      logger.info('Expense added successfully', { userId, amount, currency: expenseCurrency, categoryId, expenseId: expense.id, familyId });
      await this.funnelService.track(userId, 'first_expense');
      return expense;
    } catch (error) {
      logger.error('Failed to add expense', { userId, amount, description, categoryId, familyId, error: error.message });
      throw error;
    }
  }

  async updateExpenseCategory(userId, expenseId, categoryId) {
    return this.expenseRepository.updateExpenseCategory(userId, expenseId, categoryId);
  }

  async deleteLastExpense(userId) {
    return this.expenseRepository.deleteLastExpense(userId);
  }

  // Траты для экспорта: period = null — за всё время, categoryIds = null — все категории
  async getExpensesForExport(userId, timezone, period, categoryIds = null) {
    const expenses = period
      ? await this.getExpenses(userId, timezone, period)
      : await this.expenseRepository.getAllExpenses(userId);
    if (!categoryIds) return expenses;
    const selected = new Set(categoryIds);
    return expenses.filter(expense => selected.has(expense.category_id));
  }

  async getCategories(userId, localizationService = null, userLanguage = 'ru') {
    // Показываем пользовательские категории только для премиум
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const categories = await this.categoryRepository.getCategoriesWithPremium(userId, isPremium);
    
    // Если есть локализация, переводим названия категорий
    if (localizationService) {
      return categories.map(cat => ({
        ...cat,
        name: this.translateCategoryName(cat.name, localizationService, userLanguage)
      }));
    }
    
    return categories;
  }

  translateCategoryName(categoryName, localizationService, userLanguage) {
    const categoryMap = {
      'Еда': 'category_food',
      'Транспорт': 'category_transport',
      'Развлечения': 'category_entertainment',
      'Покупки': 'category_shopping',
      'Здоровье': 'category_health',
      'Другое': 'category_other'
    };
    
    const translationKey = categoryMap[categoryName];
    if (translationKey) {
      return localizationService.getText(userLanguage, translationKey);
    }
    
    return categoryName; // Возвращаем оригинальное название, если перевод не найден
  }

  async getExpenseById(userId, expenseId) {
    return this.expenseRepository.getExpenseById(userId, expenseId);
  }

  async updateExpenseById(userId, expenseId, data) {
    return this.expenseRepository.updateExpenseById(userId, expenseId, data);
  }

  async deleteExpenseById(userId, expenseId) {
    return this.expenseRepository.deleteExpenseById(userId, expenseId);
  }

  async convertToFamilyExpense(userId, expenseId, familyId) {
    try {
      // Получаем запись для проверки
      const expense = await this.expenseRepository.getExpenseById(userId, expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      // Проверяем, что запись еще не семейная
      if (expense.family_id) {
        throw new Error('Expense is already family expense');
      }

      // Обновляем запись, добавляя family_id
      const updatedExpense = await this.expenseRepository.updateExpenseFamilyId(userId, expenseId, familyId);
      
      logger.info('Expense converted to family expense', {
        userId,
        expenseId,
        familyId,
        amount: expense.amount,
        category: expense.category_id
      });

      return updatedExpense;
    } catch (error) {
      logger.error('Failed to convert expense to family expense', {
        userId,
        expenseId,
        familyId,
        error: error.message
      });
      throw error;
    }
  }

  async removeFromFamilyExpense(userId, expenseId) {
    try {
      // Получаем запись для проверки
      const expense = await this.expenseRepository.getExpenseById(userId, expenseId);
      if (!expense) {
        throw new Error('Expense not found');
      }

      // Проверяем, что запись семейная
      if (!expense.family_id) {
        throw new Error('Expense is not family expense');
      }

      // Проверяем, что пользователь является автором траты
      if (Number(expense.user_id) !== userId) {
        throw new Error('User is not the owner of this expense');
      }

      // Убираем family_id, делая трату личной
      const updatedExpense = await this.expenseRepository.removeExpenseFamilyId(userId, expenseId);
      
      logger.info('Expense removed from family budget', {
        userId,
        expenseId,
        familyId: expense.family_id,
        amount: expense.amount,
        category: expense.category_id
      });

      return updatedExpense;
    } catch (error) {
      logger.error('Failed to remove expense from family budget', {
        userId,
        expenseId,
        error: error.message
      });
      throw error;
    }
  }

  async getFamilyMonthlyStats(familyId, userTimezone = 'UTC') {
    const total = await this.expenseRepository.getFamilyTotalExpenses(familyId, 'month', userTimezone);
    const byCategory = await this.expenseRepository.getFamilyExpensesByCategory(familyId, 'month', userTimezone);
    return { total, byCategory };
  }

  async getFamilyDailyStats(familyId, userTimezone = 'UTC') {
    const expenses = await this.expenseRepository.getFamilyDailyExpenses(familyId, userTimezone);
    const total = await this.expenseRepository.getFamilyTotalExpenses(familyId, 'day', userTimezone);
    return { total, expenses };
  }

  async getFamilyExpenses(familyId, limit = 50) {
    return this.expenseRepository.getFamilyExpenses(familyId, limit);
  }

  async getUserAndFamilyExpenses(userId, limit = 10) {
    return this.expenseRepository.getUserAndFamilyExpenses(userId, limit);
  }
}

module.exports = ExpenseService; 