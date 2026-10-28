const moneyInputErrorText = require('./moneyInputErrors');
const respond = require('../utils/respond');
const { localToday } = require('../utils/period');
const { packDate, unpackDate, checkRecordDate, parseRecordDate, localDateOf, datePickerKeyboard, DATE_ERROR_KEYS } = require('../utils/recordDate');

const MAX_INCOME_AMOUNT = 9999999999; // incomes.amount DECIMAL(12,2)
const MAX_LISTED_INCOMES = 30;
const LIST_DESCRIPTION_LENGTH = 40;

class IncomeHandlers {
  constructor({ incomeService, expenseService, userService, premiumService, localizationService, formatter, stateService, validator, achievementService = null }) {
    this.incomeService = incomeService;
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
    this.achievementService = achievementService;
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
    if (!income) {
      const backRow = [{ text: this.t(lang, 'button_back'), callback_data: 'income_menu' }];
      return respond(ctx, this.t(lang, 'income_not_found'), { reply_markup: { inline_keyboard: [backRow] } });
    }
    const card = await this.buildCard(userId, lang, income);
    await respond(ctx, card.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: card.keyboard } });
  }

  // Карточка дохода: изменить (бесплатно, как у трат), дата и удалить
  async buildCard(userId, lang, income) {
    const timezone = await this.userService.getUserTimezone(userId);
    const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
    const text = `💵 *${amount}* — ${this.incomeLabel(income, lang)}\n📅 ${this.formatter.formatDate(income.created_at_utc, timezone)}`;
    const actions = [
      { text: this.t(lang, 'button_edit_record'), callback_data: `ie|${income.id}` },
      { text: this.t(lang, 'button_record_date'), callback_data: `it|${income.id}` }
    ];
    return {
      text,
      keyboard: [
        actions,
        [{ text: this.t(lang, 'button_delete_record'), callback_data: `income_delete|${income.id}` }],
        [{ text: this.t(lang, 'button_back'), callback_data: 'income_menu' }]
      ]
    };
  }

  // ---------- Дата дохода: меняется день, время суток остаётся (как у трат, utils/recordDate) ----------

  async ownIncome(ctx, lang, incomeId) {
    const income = await this.incomeService.getIncome(ctx.from.id, incomeId);
    if (income) return income;
    await ctx.answerCbQuery(this.t(lang, 'income_not_found'), { show_alert: true }).catch(() => {});
    return null;
  }

  // callback: it|<id> — выбор дня
  async showDatePicker(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const incomeId = parseInt(ctx.match[1], 10);
    const income = await this.ownIncome(ctx, lang, incomeId);
    if (!income) return;
    await ctx.answerCbQuery().catch(() => {});
    const timezone = await this.userService.getUserTimezone(userId);
    const keyboard = datePickerKeyboard((key) => this.t(lang, key), {
      today: localToday(timezone), current: localDateOf(income.created_at_utc, timezone),
      pick: (date) => `itd|${incomeId}|${packDate(date)}`, other: `ito|${incomeId}`, back: `in|${incomeId}`
    });
    await respond(ctx, this.t(lang, 'date_picker_title', { current: this.formatter.formatDate(income.created_at_utc, timezone) }), {
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }
    });
  }

  // callback: itd|<id>|<YYYYMMDD>
  async setDate(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const timezone = await this.userService.getUserTimezone(userId);
    const date = unpackDate(ctx.match[2]);
    const error = date ? checkRecordDate(date, localToday(timezone)) : 'format';
    if (error) {
      await ctx.answerCbQuery(this.t(lang, DATE_ERROR_KEYS[error]), { show_alert: true }).catch(() => {});
      return;
    }
    const updated = await this.incomeService.setIncomeDate(userId, parseInt(ctx.match[1], 10), date, timezone);
    if (!updated) {
      await ctx.answerCbQuery(this.t(lang, 'income_not_found'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery(this.t(lang, 'date_changed', { date: this.formatter.formatLocalDate(date) })).catch(() => {});
    const card = await this.buildCard(userId, lang, updated);
    await respond(ctx, card.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: card.keyboard } });
  }

  // callback: ito|<id> — другая дата текстом (состояние dt_in:i:<id>:<сообщение с подсказкой>)
  async startDateInput(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const incomeId = parseInt(ctx.match[1], 10);
    if (!(await this.ownIncome(ctx, lang, incomeId))) return;
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, `dt_in:i:${incomeId}:${ctx.callbackQuery.message.message_id}`);
    await respond(ctx, this.t(lang, 'date_enter_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: `it|${incomeId}` }]] }
    });
  }

  async handleDateInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const [, , idPart, messagePart] = state.split(':');
    const timezone = await this.userService.getUserTimezone(userId);
    const parsed = parseRecordDate(text, localToday(timezone));
    if (parsed.error) return ctx.reply(this.t(lang, DATE_ERROR_KEYS[parsed.error]), { parse_mode: 'Markdown' });
    const updated = await this.incomeService.setIncomeDate(userId, Number(idPart), parsed.date, timezone);
    this.stateService.deleteUserState(userId);
    if (!updated) return ctx.reply(this.t(lang, 'income_not_found'));
    await ctx.telegram.editMessageReplyMarkup(ctx.chat.id, Number(messagePart), undefined, { inline_keyboard: [] }).catch(() => {});
    const card = await this.buildCard(userId, lang, updated);
    await ctx.reply(`${this.t(lang, 'date_changed', { date: this.formatter.formatLocalDate(parsed.date) })}\n\n${card.text}`, {
      parse_mode: 'Markdown', reply_markup: { inline_keyboard: card.keyboard }
    });
  }

  // callback: ie|<id> — изменить сумму, валюту и/или описание; ввод следующим сообщением
  async startEdit(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const income = await this.incomeService.getIncome(userId, parseInt(ctx.match[1], 10));
    // Нет такой записи (удалена или чужая): экран «Доход не найден» с кнопкой назад, как у карточки
    if (!income) return this.showCard(ctx);
    this.stateService.setUserState(userId, `editing_income:${income.id}`);
    await ctx.answerCbQuery().catch(() => {});
    const current = `${this.formatter.formatAmount(Number(income.amount), income.currency)} — ${this.incomeLabel(income, lang)}`;
    await ctx.reply(this.t(lang, 'income_edit_prompt', { current }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: `in|${income.id}` }]] }
    });
  }

  // Ввод при editing_income:<id>. "60000" — только сумма, "60000 USD аванс" — сумма, валюта и описание,
  // текст без числа в начале — только описание. Незаданное остаётся как было.
  async handleEditInput(ctx, text, lang, incomeId) {
    const userId = ctx.from.id;
    const income = await this.incomeService.getIncome(userId, incomeId);
    if (!income) {
      this.stateService.deleteUserState(userId);
      return ctx.reply(this.t(lang, 'income_not_found'));
    }

    const limits = await this.premiumService.getUserLimits(userId);
    let changes;
    if (/^\s*\+?\s*\d/.test(text)) {
      const parsed = this.validator.parseMoneyInput(text.replace(/^\s*\+\s*/, ''), {
        maxAmount: MAX_INCOME_AMOUNT,
        maxDescriptionLength: limits.MAX_DESCRIPTION_LENGTH,
        requireDescription: false
      });
      if (!parsed.isValid) {
        const errorText = await moneyInputErrorText(this, userId, lang, parsed.error, 'income', MAX_INCOME_AMOUNT);
        return ctx.reply(errorText, { parse_mode: 'Markdown' });
      }
      changes = {
        amount: parsed.amount,
        currency: parsed.currency || income.currency,
        description: parsed.description ?? income.description
      };
    } else {
      const parsed = this.validator.parseEditExpense(text, limits.MAX_DESCRIPTION_LENGTH);
      if (!parsed.isValid) {
        const error = parsed.error === 'too_long' ? 'too_long' : 'format';
        const errorText = await moneyInputErrorText(this, userId, lang, error, 'income', MAX_INCOME_AMOUNT);
        return ctx.reply(errorText, { parse_mode: 'Markdown' });
      }
      changes = { amount: income.amount, currency: income.currency, description: parsed.description };
    }

    const updated = await this.incomeService.updateIncome(userId, income.id, changes);
    this.stateService.deleteUserState(userId);
    if (!updated) return ctx.reply(this.t(lang, 'income_not_found'));
    const card = await this.buildCard(userId, lang, updated);
    await ctx.reply(`${this.t(lang, 'income_updated')}\n\n${card.text}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: card.keyboard }
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

    // Опечатку в только что записанном доходе можно сразу исправить
    const actions = [
      { text: this.t(lang, 'button_undo'), callback_data: `income_undo|${income.id}` },
      { text: this.t(lang, 'button_edit_record'), callback_data: `ie|${income.id}` }
    ];
    const amount = this.formatter.formatAmount(Number(income.amount), income.currency);
    const note = this.achievementService ? await this.achievementService.track(userId, 'income_added', { lang }) : '';
    const addedText = this.t(lang, 'income_added', { amount, description: this.incomeLabel(income, lang) });
    await ctx.reply(note ? `${addedText}\n\n${note}` : addedText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [actions, [{ text: this.t(lang, 'button_income'), callback_data: 'income_menu' }]]
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

  // callback: income_undo|<id> — отмена только что записанного дохода; повторное нажатие сообщение не меняет
  async undoIncome(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const deleted = await this.incomeService.deleteIncome(userId, parseInt(ctx.match[1], 10));
    if (!deleted) return ctx.answerCbQuery(this.t(lang, 'income_not_found')).catch(() => {});
    const text = this.t(lang, 'income_deleted');
    await ctx.answerCbQuery(text);
    await respond(ctx, text, { reply_markup: { inline_keyboard: [] } });
  }
}

IncomeHandlers.MAX_INCOME_AMOUNT = MAX_INCOME_AMOUNT;

module.exports = IncomeHandlers;
