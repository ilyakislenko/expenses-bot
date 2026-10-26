const respond = require('../utils/respond');
const logger = require('../utils/logger');
const { lastDaysPeriod, parseDateRange } = require('../utils/period');

// Экспорт CSV: выбор периода (локальные даты пользователя) и фильтр по категориям.
// Фильтр хранится в StateService (exportState.categoryIds, null — все категории)
// и сбрасывается при новом открытии экспорта (/export, «☰ Ещё» → Экспорт).
class ExportHandlers {
  constructor({ expenseService, userService, localizationService, formatter, stateService }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  selectedCategoryIds(userId) {
    const state = this.stateService.getExportState(userId);
    return state ? state.categoryIds : null;
  }

  // Категории, доступные пользователю, с переведёнными названиями
  async categories(userId, lang) {
    return this.expenseService.getCategories(userId, this.localizationService, lang);
  }

  categoriesLine(lang, categories, categoryIds) {
    if (!categoryIds) return this.t(lang, 'export_categories_all');
    const names = categories.filter(c => categoryIds.includes(c.id)).map(c => c.name);
    return this.t(lang, 'export_categories_selected', { categories: names.join(', ') });
  }

  // Открытие экспорта заново: фильтр по категориям сбрасывается
  async open(ctx) {
    this.stateService.deleteExportState(ctx.from.id);
    await this.showMenu(ctx);
  }

  // Меню выбора периода (текст без Markdown: в нём названия пользовательских категорий)
  async showMenu(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const [current, previous, categories] = await Promise.all([
      this.expenseService.getPeriodContext(userId, 'month', 0),
      this.expenseService.getPeriodContext(userId, 'month', -1),
      this.categories(userId, lang)
    ]);
    const text = `${this.t(lang, 'export_title')}\n\n${this.categoriesLine(lang, categories, this.selectedCategoryIds(userId))}`;
    await respond(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'export_period_day'), callback_data: 'xp|day' }, { text: this.t(lang, 'export_period_week'), callback_data: 'xp|week' }],
          [{ text: `${this.t(lang, 'export_period_current')} · ${this.formatter.formatPeriodRange(current.period)}`, callback_data: 'xp|cur' }],
          [{ text: `${this.t(lang, 'export_period_previous')} · ${this.formatter.formatPeriodRange(previous.period)}`, callback_data: 'xp|prev' }],
          [{ text: this.t(lang, 'export_period_all'), callback_data: 'xp|all' }, { text: this.t(lang, 'export_period_range'), callback_data: 'xp_range' }],
          [{ text: this.t(lang, 'export_filter_categories'), callback_data: 'xp_cats' }],
          [{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]
        ]
      }
    });
  }

  // xp|day|week|cur|prev|all
  async exportPeriod(ctx, kind) {
    const userId = ctx.from.id;
    let period = null;
    let timezone;
    if (kind === 'day' || kind === 'week') {
      const context = await this.expenseService.getPeriodContext(userId, 'day', 0);
      timezone = context.timezone;
      period = kind === 'day' ? context.period : lastDaysPeriod(context.today, 7);
    } else if (kind === 'cur' || kind === 'prev') {
      const context = await this.expenseService.getPeriodContext(userId, 'month', kind === 'cur' ? 0 : -1);
      timezone = context.timezone;
      period = context.period;
    } else {
      timezone = await this.userService.getUserTimezone(userId);
    }
    await this.sendExport(ctx, timezone, period);
  }

  async showRangeInput(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    this.stateService.setUserState(userId, 'export_date_range');
    await respond(ctx, this.t(lang, 'export_enter_dates'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_back'), callback_data: 'xp_menu' }]] }
    });
  }

  // Текст в состоянии export_date_range. При ошибке состояние сохраняется — можно ввести ещё раз.
  async handleRangeInput(ctx, text, lang) {
    const userId = ctx.from.id;
    const parsed = parseDateRange(text);
    if (parsed.error) {
      await ctx.reply(this.t(lang, parsed.error === 'order' ? 'export_dates_order' : 'export_dates_invalid'), { parse_mode: 'Markdown' });
      return;
    }
    this.stateService.deleteUserState(userId);
    const timezone = await this.userService.getUserTimezone(userId);
    await this.sendExport(ctx, timezone, parsed);
  }

  async showCategories(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    const categories = await this.categories(userId, lang);
    const selected = this.selectedCategoryIds(userId) || categories.map(c => c.id);
    this.stateService.setExportState(userId, { categoryIds: selected });
    await this.renderCategories(ctx, lang, categories, selected);
  }

  // xp_cat|<id>
  async toggleCategory(ctx, categoryId) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    const categories = await this.categories(userId, lang);
    const allIds = categories.map(c => c.id);
    let selected = this.selectedCategoryIds(userId) || allIds;
    if (allIds.includes(categoryId)) {
      selected = selected.includes(categoryId) ? selected.filter(id => id !== categoryId) : [...selected, categoryId];
    }
    this.stateService.setExportState(userId, { categoryIds: selected });
    await this.renderCategories(ctx, lang, categories, selected);
  }

  // xp_cats_all|1 — выбрать все, xp_cats_all|0 — снять все
  async setAllCategories(ctx, selectAll) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await ctx.answerCbQuery().catch(() => {});
    const categories = await this.categories(userId, lang);
    const selected = selectAll ? categories.map(c => c.id) : [];
    this.stateService.setExportState(userId, { categoryIds: selected });
    await this.renderCategories(ctx, lang, categories, selected);
  }

  // Готово: нужна хотя бы одна категория; выбраны все — фильтр снимается
  async categoriesDone(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const categories = await this.categories(userId, lang);
    const selected = this.selectedCategoryIds(userId) || categories.map(c => c.id);
    if (!selected.length) {
      await ctx.answerCbQuery(this.t(lang, 'export_no_categories'), { show_alert: true });
      return;
    }
    const allSelected = categories.every(c => selected.includes(c.id));
    this.stateService.setExportState(userId, { categoryIds: allSelected ? null : selected });
    await this.showMenu(ctx);
  }

  async renderCategories(ctx, lang, categories, selected) {
    const keyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.push(categories.slice(i, i + 2).map(c => ({
        text: `${selected.includes(c.id) ? '☑️' : '◻️'} ${c.icon || ''} ${c.name}`.replace(/\s+/g, ' '),
        callback_data: `xp_cat|${c.id}`
      })));
    }
    const allSelected = categories.every(c => selected.includes(c.id));
    keyboard.push([allSelected
      ? { text: this.t(lang, 'export_deselect_all'), callback_data: 'xp_cats_all|0' }
      : { text: this.t(lang, 'export_select_all'), callback_data: 'xp_cats_all|1' }]);
    keyboard.push([{ text: this.t(lang, 'export_done'), callback_data: 'xp_cats_done' }]);
    await respond(ctx, this.t(lang, 'export_select_categories'), { reply_markup: { inline_keyboard: keyboard } });
  }

  // period = null — за всё время
  async sendExport(ctx, timezone, period) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    try {
      const categoryIds = this.selectedCategoryIds(userId);
      const [expenses, currency] = await Promise.all([
        this.expenseService.getExpensesForExport(userId, timezone, period, categoryIds),
        this.userService.getUserCurrency(userId)
      ]);

      if (!expenses.length) {
        const text = this.t(lang, 'no_expenses_period');
        if (ctx.callbackQuery) await ctx.answerCbQuery(text, { show_alert: true }).catch(() => {});
        else await ctx.reply(text);
        return;
      }
      if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

      const csv = await this.formatter.formatCSV(expenses, currency, timezone, this.localizationService, lang);
      const oneDay = period && period.start === period.last;
      const filename = !period ? 'expenses_all.csv'
        : oneDay ? `expenses_${period.start}.csv` : `expenses_${period.start}_${period.last}.csv`;
      const periodLine = !period ? this.t(lang, 'export_period_all')
        : `📅 ${oneDay ? this.formatter.formatLocalDate(period.start) : this.formatter.formatPeriodRange(period)}`;
      const captionLines = [this.t(lang, 'export_success'), periodLine];
      if (categoryIds) captionLines.push(this.categoriesLine(lang, await this.categories(userId, lang), categoryIds));
      captionLines.push(this.t(lang, 'records_count', { count: expenses.length }));

      await ctx.replyWithDocument({ source: Buffer.from(csv, 'utf-8'), filename }, { caption: captionLines.join('\n') });
    } catch (error) {
      logger.error('Export failed', { userId, error: error.message });
      await ctx.reply(this.t(lang, 'export_error'));
    }
  }
}

module.exports = ExportHandlers;
