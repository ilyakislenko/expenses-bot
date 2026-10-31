const respond = require('../utils/respond');
const { KIND_CODES, KIND_BY_CODE, KINDS, claimYears } = require('../utils/taxRefund');
const TaxRefundService = require('../services/TaxRefundService');

// «💡 Верни 13%» (☰ Ещё, только русский язык и рубли): итог года (tax, tax|<год>), «📄 Как вернуть» (taxh|<год>),
// список трат с правкой — премиум: страница (taxl|<год>|<стр>), убрать/вернуть (taxt|<год>|<стр>|<id>), «➕ Добавить»
// (taxa|<год> → слово из описания текстом, состояние tax_in:<год> → taxp|<год>|<id> → вид taxk|<год>|<id>|<код>).
// Кнопки из старых сообщений и чужой язык или валюта — «кнопка устарела».
class TaxRefundHandlers {
  constructor({ taxRefundService, premiumService, userService, localizationService, formatter, stateService, referralService = null }) {
    this.taxRefundService = taxRefundService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.referralService = referralService;
  }

  t(key, params) {
    return this.localizationService.getText('ru', key, params);
  }

  money(amount) {
    return this.taxRefundService.money(amount);
  }

  // Контекст раздела или null (раздел недоступен / год вне окна — ответ уже дан)
  async open(ctx, rawYear = null) {
    const context = await this.taxRefundService.context(ctx.from.id);
    const year = rawYear === null || rawYear === undefined ? context.currentYear : Number(rawYear);
    if (!context.available || !this.taxRefundService.isValidYear(year, context.currentYear)) {
      const text = this.localizationService.getText(context.lang, 'button_outdated');
      if (ctx.callbackQuery) await ctx.answerCbQuery(text, { show_alert: true }).catch(() => {});
      else await ctx.reply(text);
      return null;
    }
    return { ...context, year };
  }

  async answer(ctx, text) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(text).catch(() => {});
  }

  // tax, tax|<год>: итог года, кнопки «Как вернуть», «Траты списком», годы, «Назад» в «☰ Ещё»
  async show(ctx) {
    const context = await this.open(ctx, ctx.match ? ctx.match[1] : null);
    if (!context) return;
    await this.answer(ctx);
    const { year, currentYear } = context;
    const [summary, isPremium] = await Promise.all([
      this.taxRefundService.summary(ctx.from.id, year, context),
      this.premiumService.isPremiumUser(ctx.from.id)
    ]);
    const lines = [this.t('tax_title', { year }), '', ...this.taxRefundService.summaryLines(summary)];
    const keyboard = [
      [
        { text: this.t('tax_button_how'), callback_data: `taxh|${year}` },
        { text: this.t(isPremium ? 'tax_button_list' : 'tax_button_list_locked'), callback_data: `taxl|${year}|0` }
      ],
      claimYears(currentYear).map(y => ({ text: y === year ? `• ${y} •` : String(y), callback_data: `tax|${y}` })),
      [{ text: this.t('button_back'), callback_data: 'menu' }]
    ];
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // taxh|<год>
  async showHow(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    await this.answer(ctx);
    await respond(ctx, this.taxRefundService.howText(context.year), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t('tax_button_back'), callback_data: `tax|${context.year}` }]] }
    });
  }

  // Без премиума — что даёт премиум в этом разделе и кнопка премиума
  async ensurePremium(ctx, year) {
    if (await this.premiumService.isPremiumUser(ctx.from.id)) return true;
    await this.answer(ctx);
    let text = this.t('tax_list_teaser');
    let keyboard = [
      [{ text: this.t('button_premium'), callback_data: 'premium_subscription' }],
      [{ text: this.t('tax_button_back'), callback_data: `tax|${year}` }]
    ];
    if (this.referralService) ({ text, keyboard } = await this.referralService.withUpsell(ctx.from.id, 'ru', text, keyboard));
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    return false;
  }

  itemLabel(item) {
    const [, m, d] = item.local_date.split('-');
    const kind = item.kind || item.auto;
    const description = this.formatter.shorten(String(item.description || '').trim() || '—', 28);
    return `${item.kind ? '✅' : '❌'} ${TaxRefundService.KIND_ICONS[kind]} ${d}.${m} · ${this.money(item.amount)} · ${description}`;
  }

  // taxl|<год>|<стр>
  async showList(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    if (!(await this.ensurePremium(ctx, context.year))) return;
    return this.renderList(ctx, context, Number(ctx.match[2]) || 0);
  }

  // Страница списка: строка — кнопка «убрать / вернуть»; notice — всплывающее сообщение к нажатию
  async renderList(ctx, context, page, notice = null) {
    const { year } = context;
    await this.answer(ctx, notice);
    const data = await this.taxRefundService.listPage(ctx.from.id, year, page, context);
    const lines = [this.t('tax_list_title', { year }), ''];
    if (!data.items.length) {
      lines.push(this.t('tax_list_empty', { year }));
    } else {
      lines.push(this.t('tax_list_hint'), '', this.t('tax_list_counted', {
        count: data.counted,
        amount: this.money(data.countedTotal),
        excluded: data.excluded
      }));
    }
    const keyboard = data.items.map(item => [{ text: this.itemLabel(item), callback_data: `taxt|${year}|${data.page}|${item.id}` }]);
    if (data.pages > 1) {
      const nav = [];
      if (data.page > 0) nav.push({ text: '‹', callback_data: `taxl|${year}|${data.page - 1}` });
      nav.push({ text: `${data.page + 1}/${data.pages}`, callback_data: `taxl|${year}|${data.page}` });
      if (data.page < data.pages - 1) nav.push({ text: '›', callback_data: `taxl|${year}|${data.page + 1}` });
      keyboard.push(nav);
    }
    keyboard.push([{ text: this.t('tax_button_add'), callback_data: `taxa|${year}` }]);
    keyboard.push([{ text: this.t('tax_button_back'), callback_data: `tax|${year}` }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // taxt|<год>|<стр>|<id>: убрать из расчёта / вернуть, затем та же страница
  async toggle(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    if (!(await this.ensurePremium(ctx, context.year))) return;
    await this.taxRefundService.toggle(ctx.from.id, context.year, Number(ctx.match[3]), context);
    return this.renderList(ctx, context, Number(ctx.match[2]) || 0);
  }

  // taxa|<год>: слово из описания следующим сообщением
  async startAdd(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    if (!(await this.ensurePremium(ctx, context.year))) return;
    await this.answer(ctx);
    this.stateService.setUserState(ctx.from.id, `tax_in:${context.year}`);
    await respond(ctx, this.t('tax_add_prompt', { year: context.year }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t('button_cancel'), callback_data: `taxl|${context.year}|0` }]] }
    });
  }

  // Ввод tax_in:<год>: найденные траты кнопками; ничего — ждём другое слово
  async handleInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const context = await this.open(ctx, state.split(':')[1]);
    if (!context) {
      this.stateService.deleteUserState(userId);
      return;
    }
    const { year } = context;
    const cancel = [{ text: this.t('button_cancel'), callback_data: `taxl|${year}|0` }];
    const found = await this.taxRefundService.search(userId, year, text, context);
    const query = this.formatter.escapeMarkdown(this.formatter.shorten(String(text || '').trim(), 40));
    if (!found || !found.length) {
      return ctx.reply(this.t(found ? 'tax_add_none' : 'tax_add_short', { year, query }), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [cancel] }
      });
    }
    this.stateService.deleteUserState(userId);
    const keyboard = found.map(item => {
      const [, m, d] = item.local_date.split('-');
      const description = this.formatter.shorten(String(item.description || '').trim() || '—', 32);
      return [{ text: `${d}.${m} · ${this.money(item.amount)} · ${description}`, callback_data: `taxp|${year}|${item.id}` }];
    });
    keyboard.push(cancel);
    return ctx.reply(this.t('tax_add_pick', { year, query }), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // taxp|<год>|<id>: какой это вычет
  async pickExpense(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    if (!(await this.ensurePremium(ctx, context.year))) return;
    const { year } = context;
    const expense = await this.taxRefundService.expense(ctx.from.id, year, Number(ctx.match[2]), context.timezone);
    if (!expense) return this.renderList(ctx, context, 0, this.t('tax_outdated'));
    await this.answer(ctx);
    const description = this.formatter.escapeMarkdown(this.formatter.shorten(String(expense.description || '').trim() || '—', 40));
    const buttons = KINDS.map(kind => ({
      text: this.taxRefundService.kindLabel(kind),
      callback_data: `taxk|${year}|${expense.id}|${KIND_CODES[kind]}`
    }));
    await respond(ctx, this.t('tax_add_kind', { description, amount: this.money(expense.amount) }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [buttons.slice(0, 2), buttons.slice(2), [{ text: this.t('button_cancel'), callback_data: `taxl|${year}|0` }]] }
    });
  }

  // taxk|<год>|<id>|<код вида>: в расчёт, затем список
  async addToKind(ctx) {
    const context = await this.open(ctx, ctx.match[1]);
    if (!context) return;
    if (!(await this.ensurePremium(ctx, context.year))) return;
    const added = await this.taxRefundService.addToKind(ctx.from.id, context.year, Number(ctx.match[2]), KIND_BY_CODE[ctx.match[3]], context);
    if (!added) return this.renderList(ctx, context, 0, this.t('tax_outdated'));
    return this.renderList(ctx, context, 0, this.t('tax_added'));
  }
}

module.exports = TaxRefundHandlers;
