const logger = require('../utils/logger');
const { expensesTotal, expensesAmountTotal } = require('../utils/metrics');
const { ymd, parseYmd, addMonths, clampDay, localToday } = require('../utils/period');

const MAX_RECURRING_PER_USER = 20;

// Даты — строки 'YYYY-MM-DD' в локальном дне пользователя. lastChargedMonth может быть и будущим месяцем (оплачено
// заранее, payAhead) — тогда следующая запись в месяце после него
function nextChargeDate(dayOfMonth, lastChargedMonth, today) {
  const t = parseYmd(today);
  const thisMonth = ymd(t.y, t.m, 1);
  const chargedThisMonth = !!lastChargedMonth && lastChargedMonth >= thisMonth;
  if (!chargedThisMonth) {
    const due = clampDay(t.y, t.m, dayOfMonth);
    // Просроченная (например, бот был недоступен) спишется при ближайшем запуске — то есть сегодня
    return due >= t.d ? ymd(t.y, t.m, due) : today;
  }
  const base = parseYmd(lastChargedMonth > thisMonth ? lastChargedMonth : thisMonth);
  const next = addMonths(base.y, base.m, 1);
  return ymd(next.y, next.m, clampDay(next.y, next.m, dayOfMonth));
}

const monthOf = (date) => `${date.slice(0, 7)}-01`;
function previousMonth(month) {
  const { y, m } = parseYmd(month);
  const prev = addMonths(y, m, -1);
  return ymd(prev.y, prev.m, 1);
}

class RecurringExpenseService {
  constructor(recurringExpenseRepository, userRepository, notificationService, localizationService, formatter, budgetService) {
    this.recurringExpenseRepository = recurringExpenseRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.budgetService = budgetService;
  }

  getMaxPerUser() {
    return MAX_RECURRING_PER_USER;
  }

  // Создаёт регулярную трату. Если число списания в этом месяце уже прошло — первое списание в следующем месяце;
  // если оно сегодня — трата записывается сразу. paidThisMonth — за этот месяц уже заплачено (найденная подписка,
  // списание которой уже есть в тратах): первое списание — в следующем месяце.
  async create(userId, { amount, currency, description, dayOfMonth, categoryId, paidThisMonth = false }) {
    const count = await this.recurringExpenseRepository.countByUser(userId);
    if (count >= MAX_RECURRING_PER_USER) {
      const error = new Error('recurring_limit');
      error.code = 'recurring_limit';
      throw error;
    }

    const timezone = await this.userRepository.getUserTimezone(userId);
    const resolvedCurrency = currency || await this.userRepository.getUserCurrency(userId);
    const today = localToday(timezone);
    const t = parseYmd(today);
    const thisMonth = ymd(t.y, t.m, 1);
    const lastChargedMonth = paidThisMonth || clampDay(t.y, t.m, dayOfMonth) < t.d ? thisMonth : null;

    const { id } = await this.recurringExpenseRepository.create(userId, {
      amount, currency: resolvedCurrency, categoryId, description, dayOfMonth, lastChargedMonth
    });
    logger.info('Recurring expense created', { userId, recurringId: id, amount, currency: resolvedCurrency, dayOfMonth });

    const due = (await this.recurringExpenseRepository.getDueForUser(userId)).filter(r => r.id === id);
    let chargedNow = false;
    const budgetWarnings = [];
    for (const recurring of due) {
      const charged = await this.processRecurring(recurring, { notify: false });
      if (charged) {
        chargedNow = true;
        budgetWarnings.push(...charged.warnings);
      }
    }

    return {
      id,
      currency: resolvedCurrency,
      chargedNow,
      budgetWarnings,
      nextChargeDate: nextChargeDate(dayOfMonth, chargedNow ? thisMonth : lastChargedMonth, today)
    };
  }

  async list(userId) {
    const timezone = await this.userRepository.getUserTimezone(userId);
    const today = localToday(timezone);
    const rows = await this.recurringExpenseRepository.getByUser(userId);
    return rows.map(row => ({
      ...row,
      nextChargeDate: nextChargeDate(row.day_of_month, row.last_charged_month, today)
    }));
  }

  async get(userId, recurringId) {
    const row = await this.recurringExpenseRepository.getById(userId, recurringId);
    if (!row) return null;
    const timezone = await this.userRepository.getUserTimezone(userId);
    return { ...row, nextChargeDate: nextChargeDate(row.day_of_month, row.last_charged_month, localToday(timezone)) };
  }

  async delete(userId, recurringId) {
    return this.recurringExpenseRepository.deleteById(userId, recurringId);
  }

  // «✅ Уже оплатил»: ближайшее списание оплачено заранее — трата записывается сейчас, месяц этого списания отмечается
  // оплаченным (cron его пропустит), следующая запись — через месяц. Повторное нажатие той же кнопки ничего не
  // записывает (условие на месяц в chargeForMonth). { status: 'ok', expense, month, paidDate, nextChargeDate, warnings }
  // | { status: 'duplicate' } | { status: 'missing' }
  async payAhead(userId, recurringId, expectedMonth = null) {
    const row = await this.recurringExpenseRepository.getById(userId, recurringId);
    if (!row) return { status: 'missing' };
    const timezone = await this.userRepository.getUserTimezone(userId);
    const today = localToday(timezone);
    const paidDate = nextChargeDate(row.day_of_month, row.last_charged_month, today);
    const month = monthOf(paidDate);
    // Кнопка со старой карточки (тот месяц уже оплачен или записан) — не оплачиваем молча следующий
    if (expectedMonth && expectedMonth !== month) return { status: 'duplicate' };
    const expense = await this.recurringExpenseRepository.chargeForMonth({ ...row, user_id: userId }, month);
    if (!expense) return { status: 'duplicate' };
    expensesTotal.inc({ currency: row.currency });
    expensesAmountTotal.inc({ currency: row.currency }, Number(row.amount));
    logger.info('Recurring expense paid ahead', { userId, recurringId, expenseId: expense.id, month });
    const warnings = await this.budgetService.checkAfterExpense(userId, row.category_name || 'Другое');
    return { status: 'ok', expense, month, paidDate, nextChargeDate: nextChargeDate(row.day_of_month, month, today), warnings };
  }

  // Отмена «Уже оплатил»: трата удаляется, месяц снова ждёт списания. false — уже отменено или запись удалена
  async undoPayAhead(userId, recurringId, month, expenseId) {
    const undone = await this.recurringExpenseRepository.undoCharge(userId, recurringId, month, previousMonth(month), expenseId);
    if (undone) logger.info('Recurring pay-ahead undone', { userId, recurringId, month, expenseId });
    return undone;
  }

  // Cron: записывает все регулярные траты, у которых наступило число списания
  async processDue() {
    const due = await this.recurringExpenseRepository.getDue();
    let charged = 0;
    for (const recurring of due) {
      try {
        if (await this.processRecurring(recurring, { notify: true })) charged++;
      } catch (error) {
        logger.error('Failed to process recurring expense', { recurringId: recurring.id, userId: recurring.user_id, error: error.message });
      }
    }
    return charged;
  }

  // Записывает трату за месяц и проверяет бюджет. null — за этот месяц уже записана.
  // notify — сообщить пользователю (cron); при создании предупреждения показывает обработчик.
  async processRecurring(recurring, { notify }) {
    const lang = recurring.language || 'en';
    const amountText = this.formatter.formatAmount(Number(recurring.amount), recurring.currency);
    const descriptionText = this.formatter.escapeMarkdown(recurring.description);

    const expense = await this.recurringExpenseRepository.chargeForMonth(recurring, recurring.charge_month);
    if (!expense) return null;

    expensesTotal.inc({ currency: recurring.currency });
    expensesAmountTotal.inc({ currency: recurring.currency }, Number(recurring.amount));
    logger.info('Recurring expense charged', { recurringId: recurring.id, userId: recurring.user_id, expenseId: expense.id, month: recurring.charge_month });

    // Удалённая категория заменяется на системную «Другое» (см. chargeForMonth)
    const warnings = await this.budgetService.checkAfterExpense(recurring.user_id, recurring.category_name || 'Другое');
    if (notify) {
      let text = this.localizationService.getText(lang, 'recurring_charged_notification', {
        icon: recurring.category_icon || '🔁', description: descriptionText, amount: amountText
      });
      if (warnings.length) text += `\n\n${warnings.map(w => this.budgetService.warningText(lang, w)).join('\n')}`;
      await this.notify(recurring.user_id, text);
    }
    return { expense, warnings };
  }

  async notify(userId, text) {
    try {
      await this.notificationService.sendMessage(userId, text, { parse_mode: 'Markdown' });
    } catch (error) {
      // Пользователь мог заблокировать бота — трата всё равно записана
    }
  }
}

RecurringExpenseService.nextChargeDate = nextChargeDate;

module.exports = RecurringExpenseService;
