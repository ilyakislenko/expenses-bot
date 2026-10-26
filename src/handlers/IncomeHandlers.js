const moneyInputErrorText = require('./moneyInputErrors');
const respond = require('../utils/respond');

const MAX_INCOME_AMOUNT = 9999999999; // incomes.amount DECIMAL(12,2)
const MAX_LISTED_INCOMES = 30;
const LIST_DESCRIPTION_LENGTH = 40;

class IncomeHandlers {
  constructor({ incomeService, expenseService, userService, premiumService, localizationService, formatter, stateService, validator }) {
    this.incomeService = incomeService;
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // maxLength — для строк списка: 30 записей с длинными описаниями не влезут в сообщение
  incomeLabel(income, lang, maxLength = Infinity) {
    const label = income.description || this.t(lang, 'income_default_description');
    return this.formatter.escapeMarkdown(this.formatter.shorten(label, maxLength));
  }

  async showMenu(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const [incomes, incomeTotals, expenseTotals, incomeCurrency] = await Promise.all([
      this.incomeService.getIncomes(userId, timezone, period),
      this.incomeService.getTotals(userId, timezone, period),
      this.expenseService.getTotals(userId, timezone, period),
      this.incomeService.getIncomeCurrency(userId)
    ]);

    let text = `${this.t(lang, 'income_menu_title')} · ${this.formatter.formatPeriodRange(period)}\n\n`;
    const keyboard = [];

    if (!incomes.length) {
      text += this.t(lang, 'income_menu_empty');
    } else {
      const listed = incomes.slice(-MAX_LISTED_INCOMES);
      text += listed.map((income, i) => {
        const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
        return `${i + 1}. ${amount} — ${this.incomeLabel(income, lang, LIST_DESCRIPTION_LENGTH)} · ${this.formatter.formatShortDateTime(income.created_at_utc, timezone)}`;
      }).join('\n');
      text += '\n\n' + await this.formatter.formatIncomeSummary(incomeTotals, expenseTotals, currency, this.localizationService, lang);
      for (let i = 0; i < listed.length; i += 5) {
        keyboard.push(listed.slice(i, i + 5).map((income, j) => ({ text: String(i + j + 1), callback_data: `in|${income.id}` })));
      }
    }

    text += `\n\n${this.t(lang, 'income_currency_label', { currency: incomeCurrency })}`;
    text += `\n${this.t(lang, 'income_hint')}`;
    keyboard.push([
      { text: this.t(lang, 'button_add_income'), callback_data: 'income_add' },
      { text: this.t(lang, 'button_income_currency'), callback_data: 'income_currency' }
    ]);

    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: in|<id>
  async showCard(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    const income = await this.incomeService.getIncome(userId, parseInt(ctx.match[1], 10));
    const backRow = [{ text: this.t(lang, 'button_back'), callback_data: 'income_menu' }];
    if (!income) {
      return respond(ctx, this.t(lang, 'income_not_found'), { reply_markup: { inline_keyboard: [backRow] } });
    }
    const timezone = await this.userService.getUserTimezone(userId);
    const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
    const text = `💵 *${amount}* — ${this.incomeLabel(income, lang)}\n📅 ${this.formatter.formatDate(income.created_at_utc, timezone)}`;
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_delete_record'), callback_data: `income_delete|${income.id}` }], backRow] }
    });
  }

  async startAdd(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const currency = await this.incomeService.getIncomeCurrency(userId);
    this.stateService.setUserState(userId, 'adding_income');
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'income_enter_prompt', { currency }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'income_menu' }]] }
    });
  }

  // text: "50000 зарплата", "+1000 USD фриланс", "+300$"
  async handleIncomeInput(ctx, text, lang) {
    const userId = ctx.from.id;
    const limits = await this.premiumService.getUserLimits(userId);
    const parsed = this.validator.parseMoneyInput(text.replace(/^\s*\+\s*/, ''), {
      maxAmount: MAX_INCOME_AMOUNT,
      maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
      requireDescription: false
    });

    if (!parsed.isValid) {
      const errorText = await moneyInputErrorText(this, userId, lang, parsed.error, 'income', MAX_INCOME_AMOUNT);
      return ctx.reply(errorText, { parse_mode: 'Markdown' });
    }

    const income = await this.incomeService.addIncome(userId, parsed.amount, parsed.currency, parsed.description);
    this.stateService.deleteUserState(userId);

    const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
    await ctx.reply(this.t(lang, 'income_added', { amount, description: this.incomeLabel(income, lang) }), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: this.t(lang, 'button_undo'), callback_data: `income_undo|${income.id}` },
          { text: this.t(lang, 'button_income'), callback_data: 'income_menu' }
        ]]
      }
    });
  }

  // origin: 'income' — из меню доходов, 'settings' — из настроек валют
  async showCurrencyPicker(ctx, origin) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const { generateCurrencyKeyboard } = require('../utils/constants');
    const backCallback = origin === 'settings' ? 'settings_currencies' : 'income_menu';
    const keyboard = generateCurrencyKeyboard(this.localizationService, lang, 'set_income_currency', backCallback, `|${origin}`);
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'income_currency_select'), { reply_markup: { inline_keyboard: keyboard } });
  }

  async setCurrency(ctx, showSettingsCurrencies) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const [, currency, origin] = ctx.callbackQuery.data.split('|');
    const validation = this.validator.validateCurrency(currency);
    if (!validation.isValid) {
      return ctx.answerCbQuery(this.t(lang, 'error'));
    }
    await this.incomeService.setIncomeCurrency(userId, currency);
    await ctx.answerCbQuery(this.t(lang, 'income_currency_set', { currency }));
    if (origin === 'settings') return showSettingsCurrencies(ctx);
    await this.showMenu(ctx);
  }

  // callback: income_delete|<id> — из карточки, возвращаемся к списку
  async deleteIncome(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const deleted = await this.incomeService.deleteIncome(userId, parseInt(ctx.match[1], 10));
    await ctx.answerCbQuery(this.t(lang, deleted ? 'income_deleted' : 'income_not_found'));
    await this.showMenu(ctx);
  }

  // callback: income_undo|<id> — отмена только что записанного дохода
  async undoIncome(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const deleted = await this.incomeService.deleteIncome(userId, parseInt(ctx.match[1], 10));
    const text = this.t(lang, deleted ? 'income_deleted' : 'income_not_found');
    await ctx.answerCbQuery(text);
    await respond(ctx, text, { reply_markup: { inline_keyboard: [] } });
  }
}

module.exports = IncomeHandlers;
