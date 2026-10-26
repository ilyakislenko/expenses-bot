const respond = require('../utils/respond');

const PAGE_SIZE = 10;
const INCOME_HINT_DAYS = 14; // подсказку про доходы видят только новые пользователи

// Экран, на который возвращается карточка записи. Кодируется в callback_data через точку:
//   d.<offset>.<page>              — записи за день
//   c.<categoryId>.<offset>.<page> — записи категории за период
//   f.<page>                       — семейные записи за сегодня
//   n                              — свежее подтверждение "Расход добавлен" (без кнопки "Назад")
const BACK_VIEW_PATTERN = 'n|d\\.-?\\d+\\.\\d+|c\\.\\d+\\.-?\\d+\\.\\d+|f\\.\\d+';

function backCallback(back) {
  const [kind, ...args] = back.split('.');
  if (kind === 'd') return `dy|${args[0]}|${args[1]}`;
  if (kind === 'c') return `oc|${args[0]}|${args[1]}|${args[2]}`;
  if (kind === 'f') return `fd|${args[0]}`;
  return null;
}

function groupByCurrency(expenses) {
  const totals = new Map();
  for (const expense of expenses) {
    totals.set(expense.currency, (totals.get(expense.currency) || 0) + Number(expense.amount));
  }
  return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
}

class ExpenseHandlers {
  constructor({ expenseService, incomeService, recurringExpenseService, familyService, premiumService, userService, localizationService, formatter, stateService, validator, budgetService, reportService }) {
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.recurringExpenseService = recurringExpenseService;
    this.familyService = familyService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
    this.budgetService = budgetService;
    this.reportService = reportService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  categoryName(name, lang) {
    return this.formatter.escapeMarkdown(this.formatter.translateCategoryName(name, this.localizationService, lang));
  }

  // ========================================
  // ВВОД ТРАТЫ
  // ========================================

  // "250 кофе", "20 USD такси", "300" — familyId задан для семейной траты.
  // Возвращает true, если ввод принят (трата записана или показан выбор категории).
  async handleExpenseInput(ctx, text, lang, familyId = null) {
    const userId = ctx.from.id;
    const limits = await this.premiumService.getUserLimits(userId);
    const parsed = this.validator.parseMoneyInput(text, {
      maxAmount: this.validator.limits.maxAmount,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      requireDescription: false
    });
    if (!parsed.isValid) {
      await ctx.reply(await this.inputErrorText(userId, lang, parsed.error), { parse_mode: 'Markdown' });
      return false;
    }

    const draft = { amount: parsed.amount, currency: parsed.currency, description: parsed.description, familyId };
    const categories = await this.expenseService.getCategories(userId);
    const remembered = await this.expenseService.getRememberedCategory(userId, parsed.description, categories);
    if (remembered || !categories.length) {
      const category = remembered || await this.expenseService.getDefaultCategory();
      const expense = await this.expenseService.addExpense(userId, { ...draft, categoryId: category.id });
      await this.showCard(ctx, expense.id, 'n', { added: true, remembered: !!remembered });
      await this.sendBudgetWarnings(ctx, userId, lang, category.name);
      return true;
    }

    this.stateService.setPendingExpense(userId, draft);
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(category => ({
        text: `${category.icon} ${this.formatter.translateCategoryName(category.name, this.localizationService, lang)}`,
        callback_data: `category|${category.id}`
      })));
    }
    keyboard.push([{ text: this.t(lang, 'button_cancel'), callback_data: 'cancel' }]);

    const currency = parsed.currency || await this.userService.getUserCurrency(userId);
    let message = `💰 *${this.t(lang, 'select_category')}*\n\n${this.t(lang, 'amount_label')}: *${this.formatter.formatAmount(parsed.amount, currency)}*`;
    if (parsed.description) {
      message += `\n${this.t(lang, 'description_label')}: ${this.formatter.escapeMarkdown(parsed.description)}`;
      message += `\n\n${this.t(lang, 'category_will_be_remembered')}`;
    }
    await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    return true;
  }

  async inputErrorText(userId, lang, error) {
    if (error === 'too_long') {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      return this.t(lang, isPremium ? 'error_too_long_premium' : 'error_too_long_regular');
    }
    if (error === 'amount') return this.t(lang, 'error_amount');
    if (error === 'forbidden_content') return this.t(lang, 'error_forbidden_content');
    return this.t(lang, 'error_format');
  }

  // callback: category|<id> — выбор категории для черновика траты
  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const pending = this.stateService.getPendingExpense(userId);
    if (!pending) {
      return ctx.answerCbQuery(this.t(lang, 'callback_data_not_found'));
    }
    const categoryId = parseInt(ctx.match[1], 10);
    const categories = await this.expenseService.getCategories(userId);
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return ctx.answerCbQuery(this.t(lang, 'callback_data_not_found'));
    }
    const expense = await this.expenseService.addExpense(userId, { ...pending, categoryId });
    this.stateService.deletePendingExpense(userId);
    await ctx.answerCbQuery(this.t(lang, 'callback_expense_added', {
      category: this.formatter.translateCategoryName(category.name, this.localizationService, lang)
    }));
    await this.showCard(ctx, expense.id, 'n', { added: true });
    await this.sendBudgetWarnings(ctx, userId, lang, category.name);
  }

  // Предупреждения бюджета (80% и превышение) отдельным сообщением, чтобы не потерялись при правке карточки
  async sendBudgetWarnings(ctx, userId, lang, categoryName) {
    const warnings = await this.budgetService.checkAfterExpense(userId, categoryName);
    if (!warnings.length) return;
    await ctx.reply(warnings.map(w => this.budgetService.warningText(lang, w)).join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' }]] }
    });
  }

  // ========================================
  // КАРТОЧКА ЗАПИСИ
  // ========================================

  async showCard(ctx, expenseId, back, { added = false, remembered = false } = {}) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const expense = await this.expenseService.getExpenseById(userId, expenseId);
    const backCb = backCallback(back);
    if (!expense) {
      const keyboard = backCb ? [[{ text: this.t(lang, 'button_back'), callback_data: backCb }]] : [];
      return respond(ctx, this.t(lang, 'expense_not_found'), { reply_markup: { inline_keyboard: keyboard } });
    }

    const [timezone, isPremium] = await Promise.all([
      this.userService.getUserTimezone(userId),
      this.premiumService.isPremiumUser(userId)
    ]);
    const family = isPremium ? await this.familyService.getUserFamily(userId) : null;
    const isOwner = Number(expense.user_id) === userId;

    const amount = this.formatter.formatAmount(Number(expense.amount), expense.currency);
    let text = added ? `✅ *${this.t(lang, 'expense_added_title')}*\n\n` : '';
    text += `${expense.category_icon || '📦'} *${amount}* — ${this.formatter.expenseLabel(expense, this.localizationService, lang)}`;
    text += `\n🏷 ${this.categoryName(expense.category_name || '—', lang)} · 📅 ${this.formatter.formatDate(expense.created_at_utc, timezone)}`;
    if (expense.family_id) {
      text += `\n👨‍👩‍👧‍👦 ${this.t(lang, 'expense_family_label')}`;
      if (!isOwner) text += ` · 👤 ${this.formatter.escapeMarkdown(expense.user_username || expense.user_first_name || '')}`;
    }
    if (expense.recurring_expense_id) text += `\n🔁 ${this.t(lang, 'expense_recurring_label')}`;
    if (remembered) text += `\n\n${this.t(lang, 'expense_category_remembered')}`;

    const keyboard = [];
    if (isOwner) {
      keyboard.push([
        { text: this.t(lang, added ? 'button_undo' : 'button_delete_record'), callback_data: `xd|${expense.id}|${back}` },
        { text: this.t(lang, 'button_change_category'), callback_data: `xc|${expense.id}|${back}` }
      ]);
      const extraRow = [];
      if (isPremium) extraRow.push({ text: this.t(lang, 'button_edit_record'), callback_data: `xe|${expense.id}` });
      if (isPremium && family && !expense.family_id) {
        extraRow.push({ text: this.t(lang, 'button_mark_as_family'), callback_data: `xf|${expense.id}|${back}` });
      }
      if (isPremium && expense.family_id) {
        extraRow.push({ text: this.t(lang, 'button_remove_from_family'), callback_data: `xu|${expense.id}|${back}` });
      }
      if (extraRow.length) keyboard.push(extraRow);
    }
    if (backCb) keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: backCb }]);

    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: ex|<id>|<back>
  async handleOpenCard(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    await this.showCard(ctx, parseInt(ctx.match[1], 10), ctx.match[2]);
  }

  // callback: xd|<id>|<back> — удалить (или "отменить" свежую запись)
  async handleDelete(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const back = ctx.match[2];
    const expenseId = parseInt(ctx.match[1], 10);
    const expense = await this.expenseService.getExpenseById(userId, expenseId);
    const deleted = expense && await this.expenseService.deleteExpenseById(userId, expenseId);
    if (!deleted) {
      return ctx.answerCbQuery(this.t(lang, 'callback_delete_error'));
    }
    const deletedText = this.t(lang, 'expense_deleted', {
      amount: this.formatter.formatAmount(Number(deleted.amount), deleted.currency),
      description: deleted.description || this.formatter.translateCategoryName(expense.category_name || '—', this.localizationService, lang)
    });
    await ctx.answerCbQuery(this.t(lang, 'callback_deleted'));
    if (back === 'n') {
      return respond(ctx, deletedText, { reply_markup: { inline_keyboard: [] } });
    }
    await this.showBackView(ctx, back);
  }

  // callback: xc|<id>|<back> — выбор новой категории
  async handleChooseCategory(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const expenseId = parseInt(ctx.match[1], 10);
    const back = ctx.match[2];
    const categories = await this.expenseService.getCategories(userId);
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(category => ({
        text: `${category.icon} ${this.formatter.translateCategoryName(category.name, this.localizationService, lang)}`,
        callback_data: `xs|${expenseId}|${category.id}|${back}`
      })));
    }
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: `ex|${expenseId}|${back}` }]);
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'select_category'), { reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: xs|<id>|<categoryId>|<back>
  async handleSetCategory(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const expenseId = parseInt(ctx.match[1], 10);
    const categoryId = parseInt(ctx.match[2], 10);
    const back = ctx.match[3];
    const categories = await this.expenseService.getCategories(userId);
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return ctx.answerCbQuery(this.t(lang, 'callback_data_not_found'));
    }
    const updated = await this.expenseService.updateExpenseCategory(userId, expenseId, categoryId);
    if (!updated) {
      return ctx.answerCbQuery(this.t(lang, 'expense_not_found'));
    }
    await ctx.answerCbQuery(this.t(lang, 'expense_category_changed', {
      category: this.formatter.translateCategoryName(category.name, this.localizationService, lang)
    }));
    await this.showCard(ctx, expenseId, back, { added: back === 'n' });
    await this.sendBudgetWarnings(ctx, userId, lang, category.name);
  }

  // callback: xe|<id> — изменить сумму/описание (премиум), ввод следующим сообщением
  async handleEdit(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      return ctx.answerCbQuery(this.t(lang, 'premium_required'), { show_alert: true });
    }
    this.stateService.setUserEditState(userId, ctx.match[1]);
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply(this.t(lang, 'edit_instructions'), {
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'cancel_edit' }]] }
    });
  }

  // callback: xf|<id>|<back> — в семейный бюджет, xu|<id>|<back> — из семейного бюджета
  async handleFamilyToggle(ctx, toFamily) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const expenseId = parseInt(ctx.match[1], 10);
    const back = ctx.match[2];
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      return ctx.answerCbQuery(this.t(lang, 'premium_required'), { show_alert: true });
    }
    const expense = await this.expenseService.getExpenseById(userId, expenseId);
    if (!expense || Number(expense.user_id) !== userId) {
      return ctx.answerCbQuery(this.t(lang, 'expense_not_found'));
    }
    if (toFamily) {
      const family = await this.familyService.getUserFamily(userId);
      if (!family) return ctx.answerCbQuery(this.t(lang, 'not_family_member'));
      if (expense.family_id) return ctx.answerCbQuery(this.t(lang, 'expense_already_family'));
      await this.expenseService.convertToFamilyExpense(userId, expenseId, family.id);
      await ctx.answerCbQuery(this.t(lang, 'expense_converted_to_family'));
    } else {
      if (!expense.family_id) return ctx.answerCbQuery(this.t(lang, 'expense_not_found'));
      await this.expenseService.removeFromFamilyExpense(userId, expenseId);
      await ctx.answerCbQuery(this.t(lang, 'expense_removed_from_family'));
    }
    await this.showCard(ctx, expenseId, back, { added: back === 'n' });
  }

  async showBackView(ctx, back) {
    const [kind, ...args] = back.split('.').map((v, i) => (i === 0 ? v : parseInt(v, 10)));
    if (kind === 'd') return this.showDay(ctx, args[0], args[1]);
    if (kind === 'c') return this.showCategoryList(ctx, args[0], args[1], args[2]);
    if (kind === 'f') return this.showFamilyDay(ctx, args[0]);
  }

  // ========================================
  // СПИСКИ ЗАПИСЕЙ
  // ========================================

  // Нумерованный список одной страницы + кнопки-номера, открывающие карточку
  renderList(expenses, { page, timezone, lang, withDate, withAuthor, backFor, pageCallback }) {
    const pages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
    const current = Math.min(Math.max(page, 0), pages - 1);
    const slice = expenses.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

    const lines = slice.map((expense, i) => {
      const num = current * PAGE_SIZE + i + 1;
      const amount = this.formatter.formatAmount(Number(expense.amount), expense.currency);
      const when = withDate
        ? this.formatter.formatShortDateTime(expense.created_at_utc, timezone)
        : this.formatter.formatTime(expense.created_at_utc, timezone);
      const author = withAuthor ? ` · 👤 ${this.formatter.escapeMarkdown(expense.username || expense.first_name || '')}` : '';
      const recurring = expense.recurring_expense_id ? ' 🔁' : '';
      return `${num}. ${expense.category_icon || '📦'} ${amount} — ${this.formatter.expenseLabel(expense, this.localizationService, lang)} · ${when}${recurring}${author}`;
    });

    const keyboard = [];
    for (let i = 0; i < slice.length; i += 5) {
      keyboard.push(slice.slice(i, i + 5).map((expense, j) => ({
        text: String(current * PAGE_SIZE + i + j + 1),
        callback_data: `ex|${expense.id}|${backFor(current)}`
      })));
    }
    if (pages > 1) {
      keyboard.push([
        current > 0 ? { text: '‹', callback_data: pageCallback(current - 1) } : { text: ' ', callback_data: 'noop' },
        { text: `${current + 1}/${pages}`, callback_data: 'noop' },
        current < pages - 1 ? { text: '›', callback_data: pageCallback(current + 1) } : { text: ' ', callback_data: 'noop' }
      ]);
    }
    return { lines, keyboard };
  }

  async showDay(ctx, offset = 0, page = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'day', offset);
    const expenses = await this.expenseService.getExpenses(userId, timezone, period);

    const date = this.formatter.formatLocalDate(period.start);
    const titleKey = offset === 0 ? 'day_title_today' : offset === -1 ? 'day_title_yesterday' : 'day_title';
    let text = `📅 *${this.t(lang, titleKey, { date })}*\n\n`;
    const { lines, keyboard } = this.renderList(expenses, {
      page, timezone, lang, withDate: false, withAuthor: false,
      backFor: p => `d.${offset}.${p}`,
      pageCallback: p => `dy|${offset}|${p}`
    });

    if (!expenses.length) {
      text += this.t(lang, 'no_expenses_period');
      if (offset === 0) text += `\n\n${this.t(lang, 'day_entry_hint')}`;
    } else {
      const spent = await this.formatter.sumInCurrency(groupByCurrency(expenses), currency);
      text += `${this.t(lang, 'overview_spent', { amount: this.formatter.formatAmount(spent, currency), count: expenses.length })}\n\n`;
      text += lines.join('\n');
      text += `\n\n${this.t(lang, 'list_tap_number')}`;
    }

    const nav = [{ text: this.t(lang, 'button_prev_day'), callback_data: `dy|${offset - 1}|0` }];
    if (offset < 0) nav.push({ text: this.t(lang, 'button_next_day'), callback_data: `dy|${offset + 1}|0` });
    keyboard.push(nav);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  async showOverview(ctx, offset = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const { timezone, currency, today, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const [totals, categories, incomeTotals, isPremium] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.reportService.categoryBreakdown(userId, timezone, period, currency),
      this.incomeService.getTotals(userId, timezone, period),
      this.premiumService.isPremiumUser(userId)
    ]);
    // Бюджеты показываем для текущего периода
    const budgets = offset === 0 && isPremium ? await this.budgetService.getStatus(userId, { timezone, currency, period }) : [];
    const budgetFor = (name) => budgets.find(b => b.category_name === name);

    let text = `📊 *${this.t(lang, 'overview_title', { range: this.formatter.formatPeriodRange(period) })}*\n\n`;
    if (totals.count) {
      const spent = await this.formatter.sumInCurrency(totals.byCurrency, currency);
      text += this.t(lang, 'overview_spent', { amount: this.formatter.formatAmount(spent, currency), count: totals.count });
    } else {
      text += this.t(lang, 'no_expenses_period');
    }
    const totalBudget = budgetFor(null);
    if (totalBudget) {
      text += `\n🎯 ${this.formatter.progressBar(totalBudget.ratio)} ${Math.round(totalBudget.ratio * 100)}% · ${this.t(lang, 'overview_budget_of', { amount: this.formatter.formatAmount(totalBudget.limit, currency) })}`;
    }
    const incomeSummary = await this.formatter.formatIncomeSummary(incomeTotals, totals, currency, this.localizationService, lang);
    if (incomeSummary) text += `\n${incomeSummary}`;

    // Категории: суммы в основной валюте, по убыванию; у категорий с бюджетом — лимит (процент от лимита — в «🎯 Бюджеты»)
    const categorySum = categories.reduce((sum, c) => sum + c.total, 0);
    if (categories.length) {
      text += `\n\n*${this.t(lang, 'by_categories')}*\n`;
      text += categories.map(c => {
        const percentage = categorySum > 0 ? (c.total / categorySum * 100).toFixed(0) : 0;
        const budget = budgetFor(c.name);
        const budgetMark = budget
          ? ` · 🎯 ${this.t(lang, 'overview_budget_limit', { amount: this.formatter.formatAmount(budget.limit, currency) })}${budget.ratio > 1 ? ' 🚨' : budget.ratio >= 0.8 ? ' ⚠️' : ''}`
          : '';
        return `${c.icon} ${this.categoryName(c.name, lang)}: ${this.formatter.formatAmount(c.total, currency)} (${percentage}%)${budgetMark}`;
      }).join('\n');
    }

    if (offset === 0) {
      const upcoming = (await this.recurringExpenseService.list(userId))
        .filter(item => item.nextChargeDate >= today && item.nextChargeDate < period.end);
      if (upcoming.length) {
        text += `\n\n*${this.t(lang, 'overview_upcoming')}*\n`;
        text += upcoming.map(item => {
          const [, m, d] = item.nextChargeDate.split('-');
          return `🔁 ${this.formatter.escapeMarkdown(item.description)} — ${this.formatter.formatAmount(Number(item.amount), item.currency)} · ${d}.${m}`;
        }).join('\n');
      }
      if (!incomeTotals.count) {
        const user = await this.userService.getUserById(userId);
        const ageDays = user?.created_at ? (Date.now() - new Date(user.created_at).getTime()) / 86400000 : Infinity;
        if (ageDays < INCOME_HINT_DAYS) text += `\n\n${this.t(lang, 'overview_income_hint')}`;
      }
    }

    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(c => ({
        text: `${c.icon} ${this.formatter.translateCategoryName(c.name, this.localizationService, lang)}`,
        callback_data: `oc|${c.id}|${offset}|0`
      })));
    }
    const nav = [{ text: this.t(lang, 'button_prev_period'), callback_data: `ov|${offset - 1}` }];
    if (offset < 0) nav.push({ text: this.t(lang, 'button_next_period'), callback_data: `ov|${offset + 1}` });
    keyboard.push(nav);
    keyboard.push([
      { text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' },
      { text: this.t(lang, 'button_report'), callback_data: `rp|${offset}` }
    ]);

    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: rp|<offset> — итоги периода (полные с премиумом, краткие без)
  async showReport(ctx, offset = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const isPremium = await this.premiumService.isPremiumUser(userId);
    const { text } = await this.reportService.buildReport(userId, offset, lang, { full: isPremium });
    const keyboard = [];
    if (!isPremium) keyboard.push([{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]);
    keyboard.push([{ text: this.t(lang, 'button_back_to_overview'), callback_data: `ov|${offset}` }]);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  async showCategoryList(ctx, categoryId, offset = 0, page = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const category = await this.expenseService.getCategoryById(categoryId);
    if (!category) return this.showOverview(ctx, offset);

    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const expenses = await this.expenseService.getExpenses(userId, timezone, period, category.name);

    let text = `${category.icon} *${this.categoryName(category.name, lang)}* · ${this.formatter.formatPeriodRange(period)}\n\n`;
    const { lines, keyboard } = this.renderList(expenses, {
      page, timezone, lang, withDate: true, withAuthor: false,
      backFor: p => `c.${categoryId}.${offset}.${p}`,
      pageCallback: p => `oc|${categoryId}|${offset}|${p}`
    });
    if (!expenses.length) {
      text += this.t(lang, 'no_expenses_period');
    } else {
      const spent = await this.formatter.sumInCurrency(groupByCurrency(expenses), currency);
      text += `${this.t(lang, 'overview_spent', { amount: this.formatter.formatAmount(spent, currency), count: expenses.length })}\n\n`;
      text += lines.join('\n');
      text += `\n\n${this.t(lang, 'list_tap_number')}`;
    }
    keyboard.push([{ text: this.t(lang, 'button_back_to_overview'), callback_data: `ov|${offset}` }]);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  async showFamilyDay(ctx, page = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const backRow = [{ text: this.t(lang, 'button_back'), callback_data: 'family_menu' }];

    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      return respond(ctx, this.t(lang, 'premium_required'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [backRow] } });
    }
    const family = await this.familyService.getUserFamily(userId);
    if (!family) {
      return respond(ctx, this.t(lang, 'not_family_member'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [backRow] } });
    }

    const [timezone, currency] = await Promise.all([
      this.userService.getUserTimezone(userId),
      this.userService.getUserCurrency(userId)
    ]);
    const { expenses } = await this.familyService.getFamilyDailyStats(family.id, timezone);

    let text = `👨‍👩‍👧‍👦 *${this.t(lang, 'family_today_title')}*\n\n`;
    const { lines, keyboard } = this.renderList(expenses, {
      page, timezone, lang, withDate: false, withAuthor: true,
      backFor: p => `f.${p}`,
      pageCallback: p => `fd|${p}`
    });
    if (!expenses.length) {
      text += this.t(lang, 'no_expenses_period');
    } else {
      const spent = await this.formatter.sumInCurrency(groupByCurrency(expenses), currency);
      text += `${this.t(lang, 'overview_spent', { amount: this.formatter.formatAmount(spent, currency), count: expenses.length })}\n\n`;
      text += lines.join('\n');
      text += `\n\n${this.t(lang, 'list_tap_number')}`;
    }
    keyboard.push(backRow);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }
}

ExpenseHandlers.BACK_VIEW_PATTERN = BACK_VIEW_PATTERN;

module.exports = ExpenseHandlers;
