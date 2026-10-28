const moneyInputErrorText = require('./moneyInputErrors');
const respond = require('../utils/respond');

const MAX_RECURRING_AMOUNT = 99999999; // expenses.amount DECIMAL(10,2)
const LIST_DESCRIPTION_LENGTH = 40; // строки списка: 20 позиций с полными описаниями не влезут в сообщение

class RecurringExpenseHandlers {
  constructor({ recurringExpenseService, expenseService, userService, premiumService, localizationService, formatter, stateService, validator, budgetService }) {
    this.recurringExpenseService = recurringExpenseService;
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
    this.budgetService = budgetService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async render(ctx, text, inlineKeyboard) {
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: inlineKeyboard } });
  }

  async showMenu(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const [items, userCurrency] = await Promise.all([
      this.recurringExpenseService.list(userId),
      this.userService.getUserCurrency(userId)
    ]);

    let text = `${this.t(lang, 'recurring_menu_title')}\n\n${this.t(lang, 'recurring_menu_info')}\n\n`;
    const keyboard = [];

    if (!items.length) {
      text += this.t(lang, 'recurring_menu_empty');
    } else {
      text += items.map((item, i) => `${i + 1}. ` + this.t(lang, 'recurring_item', {
        icon: item.category_icon || '🔁',
        description: this.formatter.escapeMarkdown(this.formatter.shorten(item.description, LIST_DESCRIPTION_LENGTH)),
        amount: this.formatter.formatAmount(Number(item.amount), item.currency),
        day: item.day_of_month,
        next: this.formatter.formatLocalDate(item.nextChargeDate)
      })).join('\n\n');
      const monthly = await this.formatter.sumInCurrency(
        items.map(item => ({ currency: item.currency, total: item.amount })),
        userCurrency
      );
      text += '\n\n' + this.t(lang, 'recurring_monthly_total', { amount: this.formatter.formatAmount(monthly, userCurrency) });
      for (let i = 0; i < items.length; i += 5) {
        keyboard.push(items.slice(i, i + 5).map((item, j) => ({ text: String(i + j + 1), callback_data: `rc|${item.id}` })));
      }
    }

    keyboard.push([{ text: this.t(lang, 'button_add_recurring'), callback_data: 'recurring_add' }]);
    await this.render(ctx, text, keyboard);
  }

  // callback: rc|<id>
  async showCard(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    const item = await this.recurringExpenseService.get(userId, parseInt(ctx.match[1], 10));
    const backRow = [{ text: this.t(lang, 'button_back'), callback_data: 'recurring_menu' }];
    if (!item) {
      return this.render(ctx, this.t(lang, 'recurring_not_found'), [backRow]);
    }
    const text = this.t(lang, 'recurring_item', {
      icon: item.category_icon || '🔁',
      description: this.formatter.escapeMarkdown(item.description),
      amount: this.formatter.formatAmount(Number(item.amount), item.currency),
      day: item.day_of_month,
      next: this.formatter.formatLocalDate(item.nextChargeDate)
    });
    await this.render(ctx, text, [[{ text: this.t(lang, 'button_delete_record'), callback_data: `recurring_delete|${item.id}` }], backRow]);
  }

  async startAdd(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const items = await this.recurringExpenseService.list(userId);
    const max = this.recurringExpenseService.getMaxPerUser();
    if (items.length >= max) {
      await ctx.answerCbQuery(this.t(lang, 'recurring_limit', { max }), { show_alert: true });
      return;
    }
    this.stateService.deletePendingRecurring(userId);
    this.stateService.setUserState(userId, 'adding_recurring');
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'recurring_enter_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'recurring_menu' }]] }
    });
  }

  // Шаг 1: "50000 аренда" / "500 USD аренда"
  async handleAmountInput(ctx, text, lang) {
    const userId = ctx.from.id;
    const limits = await this.premiumService.getUserLimits(userId);
    const parsed = this.validator.parseMoneyInput(text, {
      maxAmount: MAX_RECURRING_AMOUNT,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      requireDescription: true
    });
    if (!parsed.isValid) {
      const errorText = await moneyInputErrorText(this, userId, lang, parsed.error, 'recurring', MAX_RECURRING_AMOUNT);
      return ctx.reply(errorText, { parse_mode: 'Markdown' });
    }

    this.stateService.setPendingRecurring(userId, {
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description
    });
    this.stateService.setUserState(userId, 'adding_recurring_day');
    await ctx.reply(this.t(lang, 'recurring_day_prompt'), {
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'recurring_menu' }]] }
    });
  }

  // Шаг 2: число месяца → выбор категории
  async handleDayInput(ctx, text, lang) {
    const userId = ctx.from.id;
    const day = Number((text || '').trim());
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return ctx.reply(this.t(lang, 'recurring_day_invalid'));
    }
    const pending = this.stateService.getPendingRecurring(userId);
    this.stateService.deleteUserState(userId);
    if (!pending || pending.takenCard) {
      return ctx.reply(this.t(lang, 'callback_data_not_found'));
    }

    const categories = await this.expenseService.getCategories(userId);
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(category => ({
        text: `${category.icon} ${this.formatter.translateCategoryName(category.name, this.localizationService, lang)}`,
        callback_data: `recurring_category|${category.id}`
      })));
    }
    keyboard.push([{ text: this.t(lang, 'button_cancel'), callback_data: 'recurring_menu' }]);
    const card = await ctx.reply(this.t(lang, 'recurring_select_category'), { reply_markup: { inline_keyboard: keyboard } });
    // Черновик привязан к этой карточке: кнопки старой карточки его не записывают
    this.stateService.setPendingRecurring(userId, { ...pending, dayOfMonth: day, cardMessageId: card.message_id });
  }

  // Шаг 3: категория → сохранение. Черновик берётся один раз (двойное нажатие не создаёт две регулярные траты)
  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const categoryId = parseInt(ctx.match[1], 10);
    const categories = await this.expenseService.getCategories(userId);
    if (!categories.some(category => category.id === categoryId)) {
      return ctx.answerCbQuery(this.t(lang, 'callback_data_not_found'));
    }
    const pending = this.stateService.takePendingRecurring(userId, ctx.callbackQuery.message?.message_id);
    if (pending === null) return ctx.answerCbQuery().catch(() => {}); // повторное нажатие: уже сохраняется
    if (!pending) {
      // Карточка старая (начата другая регулярная, отменена или черновик устарел)
      await ctx.answerCbQuery(this.t(lang, 'recurring_draft_outdated'), { show_alert: true }).catch(() => {});
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
      return;
    }

    let created;
    try {
      created = await this.recurringExpenseService.create(userId, { ...pending, categoryId });
    } catch (error) {
      if (error.code === 'recurring_limit') {
        return ctx.answerCbQuery(this.t(lang, 'recurring_limit', { max: this.recurringExpenseService.getMaxPerUser() }), { show_alert: true });
      }
      this.stateService.setPendingRecurring(userId, pending);
      throw error;
    }

    let text = this.t(lang, created.chargedNow ? 'recurring_added_charged_now' : 'recurring_added', {
      description: this.formatter.escapeMarkdown(pending.description),
      amount: this.formatter.formatAmount(pending.amount, created.currency),
      day: pending.dayOfMonth,
      next: this.formatter.formatLocalDate(created.nextChargeDate)
    });
    const keyboard = [[{ text: this.t(lang, 'button_recurring'), callback_data: 'recurring_menu' }]];
    // Трата записана сразу (число списания — сегодня): предупреждения бюджета, как после обычной траты
    if (created.budgetWarnings.length) {
      text += `\n\n${created.budgetWarnings.map(w => this.budgetService.warningText(lang, w)).join('\n')}`;
      keyboard.push([{ text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' }]);
    }
    await ctx.answerCbQuery().catch(() => {});
    await this.render(ctx, text, keyboard);
  }

  async delete(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const recurringId = parseInt(ctx.match[1], 10);
    const deleted = await this.recurringExpenseService.delete(userId, recurringId);
    await ctx.answerCbQuery(this.t(lang, deleted ? 'recurring_deleted' : 'recurring_not_found'), { show_alert: !!deleted });
    await this.showMenu(ctx);
  }
}

module.exports = RecurringExpenseHandlers;
