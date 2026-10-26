const respond = require('../utils/respond');

const MAX_BUDGET_AMOUNT = 9999999999; // category_budgets.amount DECIMAL(12,2)

// Бюджеты на пользовательский период — функция премиума.
// Цель бюджета в callback/состоянии: "total" — общий бюджет, иначе id категории.
class BudgetHandlers {
  constructor({ budgetService, expenseService, premiumService, userService, localizationService, formatter, stateService, validator }) {
    this.budgetService = budgetService;
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Без премиума — описание и кнопка премиума вместо экрана
  async ensurePremium(ctx, lang) {
    if (await this.premiumService.isPremiumUser(ctx.from.id)) return true;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'budgets_teaser'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }],
          [{ text: this.t(lang, 'button_back_to_overview'), callback_data: 'ov|0' }]
        ]
      }
    });
    return false;
  }

  statusLines(status, lang) {
    const { currency } = status;
    const spent = this.formatter.formatAmount(status.spent, currency);
    const limit = this.formatter.formatAmount(status.limit, currency);
    const percent = Math.round(status.ratio * 100);
    const rest = status.limit - status.spent;
    const tail = rest >= 0
      ? this.t(lang, 'budget_left', { amount: this.formatter.formatAmount(rest, currency) })
      : `${this.t(lang, 'budget_over', { amount: this.formatter.formatAmount(-rest, currency) })} 🚨`;
    return [
      `${this.budgetService.budgetName(status, lang)}: ${spent} / ${limit}`,
      `   ${this.formatter.progressBar(status.ratio)} ${percent}% · ${tail}`
    ].join('\n');
  }

  async showMenu(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.ensurePremium(ctx, lang))) return;
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const statuses = (await this.budgetService.getStatus(userId, context)).map(s => ({ ...s, currency: context.currency }));

    let text = notice ? `${notice}\n\n` : '';
    text += `🎯 *${this.t(lang, 'budgets_title')}* · ${this.formatter.formatPeriodRange(context.period)}\n\n`;
    const keyboard = [];
    if (!statuses.length) {
      text += this.t(lang, 'budgets_empty');
    } else {
      text += statuses.map((s, i) => `${i + 1}. ${this.statusLines(s, lang)}`).join('\n\n');
      for (let i = 0; i < statuses.length; i += 5) {
        keyboard.push(statuses.slice(i, i + 5).map((s, j) => ({ text: String(i + j + 1), callback_data: `bg|${s.id}` })));
      }
    }
    keyboard.push([
      { text: this.t(lang, 'button_budget_total'), callback_data: 'bg_add|total' },
      { text: this.t(lang, 'button_budget_category'), callback_data: 'bg_cat' }
    ]);
    keyboard.push([{ text: this.t(lang, 'button_back_to_overview'), callback_data: 'ov|0' }]);
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: bg|<id>
  async showCard(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.ensurePremium(ctx, lang))) return;
    await ctx.answerCbQuery().catch(() => {});
    const budgetId = parseInt(ctx.match[1], 10);
    const context = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const status = (await this.budgetService.getStatus(userId, context)).find(s => s.id === budgetId);
    const backRow = [{ text: this.t(lang, 'button_back'), callback_data: 'bg_menu' }];
    if (!status) {
      return respond(ctx, this.t(lang, 'budget_not_found'), { reply_markup: { inline_keyboard: [backRow] } });
    }

    const target = await this.targetForBudget(userId, status);
    const actions = [];
    if (target) actions.push({ text: this.t(lang, 'button_budget_change'), callback_data: `bg_add|${target}` });
    actions.push({ text: this.t(lang, 'button_delete_record'), callback_data: `bg_del|${status.id}` });
    await respond(ctx, this.statusLines({ ...status, currency: context.currency }, lang), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [actions, backRow] }
    });
  }

  // Цель для изменения суммы: "total" или id доступной категории с таким именем
  async targetForBudget(userId, budget) {
    if (budget.category_name === null) return 'total';
    const categories = await this.expenseService.getCategories(userId);
    const category = categories.find(c => c.name === budget.category_name);
    return category ? String(category.id) : null;
  }

  // callback: bg_cat — выбор категории для бюджета
  async chooseCategory(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.ensurePremium(ctx, lang))) return;
    await ctx.answerCbQuery().catch(() => {});
    const categories = await this.expenseService.getCategories(userId);
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(category => ({
        text: `${category.icon} ${this.formatter.translateCategoryName(category.name, this.localizationService, lang)}`,
        callback_data: `bg_add|${category.id}`
      })));
    }
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'bg_menu' }]);
    await respond(ctx, this.t(lang, 'select_category'), { reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: bg_add|<total|categoryId> — ждём сумму следующим сообщением
  async startSetAmount(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.ensurePremium(ctx, lang))) return;
    await ctx.answerCbQuery().catch(() => {});
    const target = ctx.match[1];
    const name = await this.targetName(userId, target, lang);
    if (!name) return this.showMenu(ctx);

    this.stateService.setUserState(userId, `setting_budget:${target}`);
    const currency = await this.userService.getUserCurrency(userId);
    await respond(ctx, this.t(lang, 'budget_enter_prompt', { name, currency }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'bg_menu' }]] }
    });
  }

  async targetName(userId, target, lang) {
    if (target === 'total') return this.t(lang, 'budget_total_name');
    const categories = await this.expenseService.getCategories(userId);
    const category = categories.find(c => c.id === parseInt(target, 10));
    if (!category) return null;
    return `${category.icon} ${this.formatter.escapeMarkdown(this.formatter.translateCategoryName(category.name, this.localizationService, lang))}`;
  }

  // Ввод суммы: "10000" или "150 USD"
  async handleAmountInput(ctx, text, lang, target) {
    const userId = ctx.from.id;
    const parsed = this.validator.parseMoneyInput(text, { maxAmount: MAX_BUDGET_AMOUNT, maxDescriptionLength: 80, requireDescription: false });
    if (!parsed.isValid || parsed.description) {
      return ctx.reply(this.t(lang, 'budget_amount_invalid'), { parse_mode: 'Markdown' });
    }

    let categoryName = null;
    if (target !== 'total') {
      const categories = await this.expenseService.getCategories(userId);
      const category = categories.find(c => c.id === parseInt(target, 10));
      if (!category) {
        this.stateService.deleteUserState(userId);
        return ctx.reply(this.t(lang, 'callback_data_not_found'));
      }
      categoryName = category.name;
    }

    const currency = parsed.currency || await this.userService.getUserCurrency(userId);
    await this.budgetService.setBudget(userId, categoryName, parsed.amount, currency);
    this.stateService.deleteUserState(userId);
    await this.showMenu(ctx, this.t(lang, 'budget_saved'));
  }

  // callback: bg_del|<id>
  async delete(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!(await this.ensurePremium(ctx, lang))) return;
    const deleted = await this.budgetService.deleteBudget(userId, parseInt(ctx.match[1], 10));
    await ctx.answerCbQuery(this.t(lang, deleted ? 'budget_deleted' : 'budget_not_found'));
    await this.showMenu(ctx);
  }
}

module.exports = BudgetHandlers;
