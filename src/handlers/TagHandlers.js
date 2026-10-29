const respond = require('../utils/respond');
const { extractTags } = require('../utils/tags');

const MAX_TAGS = 20; // на экране — столько самых крупных тегов
const MAX_RECENT = 5;

// «🏷 Теги» (/tags, tags, ☰ Ещё): траты, помеченные «#тегом» в описании (utils/tags.js), — суммы по тегам в основной
// валюте; tg|<тег> — один тег: итог, даты, категории и последние записи
class TagHandlers {
  constructor({ expenseRepository, userService, localizationService, formatter, currencyUtils }) {
    this.expenseRepository = expenseRepository;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  localDay(date, timezone) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
  }

  shortDate(date, timezone) {
    const [y, m, d] = this.localDay(date, timezone).split('-');
    return `${d}.${m}.${y}`;
  }

  // { lang, timezone, currency, tags: Map<тег, { total, count, rows }> } — суммы в основной валюте, теги по убыванию суммы
  async collect(userId) {
    const [lang, timezone, currency, rows] = await Promise.all([
      this.userService.getUserLanguage(userId),
      this.userService.getUserTimezone(userId),
      this.userService.getUserCurrency(userId),
      this.expenseRepository.getTaggedExpenses(userId)
    ]);
    const rates = new Map();
    const convert = async (amount, from) => {
      if (!from || from === currency) return amount;
      if (!rates.has(from)) rates.set(from, await this.currencyUtils.convert(1, from, currency));
      return amount * rates.get(from);
    };
    const tags = new Map();
    for (const row of rows) {
      const value = await convert(Number(row.amount), row.currency);
      for (const tag of extractTags(row.description)) {
        const entry = tags.get(tag) || { total: 0, count: 0, rows: [] };
        entry.total += value;
        entry.count += 1;
        entry.rows.push({ ...row, value });
        tags.set(tag, entry);
      }
    }
    const sorted = new Map([...tags].sort((a, b) => b[1].total - a[1].total));
    return { lang, timezone, currency, tags: sorted };
  }

  async show(ctx) {
    const { lang, currency, tags } = await this.collect(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const lines = [`*${this.t(lang, 'tags_title')}*`, '', this.t(lang, 'tags_intro')];
    const keyboard = [];
    if (!tags.size) lines.push('', this.t(lang, 'tags_empty'));
    else {
      lines.push('');
      const shown = [...tags].slice(0, MAX_TAGS);
      for (const [tag, entry] of shown) {
        lines.push(this.t(lang, 'tags_line', { tag: this.formatter.escapeMarkdown(tag), amount: this.formatter.formatAmount(entry.total, currency), count: entry.count }));
      }
      for (let i = 0; i < shown.length; i += 2) {
        keyboard.push(shown.slice(i, i + 2).map(([tag]) => ({ text: `#${tag}`, callback_data: `tg|${tag}` })));
      }
    }
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'menu' }]);
    return respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  async showTag(ctx) {
    const tag = ctx.match[1];
    const { lang, timezone, currency, tags } = await this.collect(ctx.from.id);
    const entry = tags.get(tag);
    if (ctx.callbackQuery) await ctx.answerCbQuery(entry ? undefined : this.t(lang, 'tags_not_found')).catch(() => {});
    if (!entry) return this.show(ctx);
    const money = (value) => this.formatter.formatAmount(value, currency);
    const first = entry.rows[entry.rows.length - 1].created_at_utc;
    const last = entry.rows[0].created_at_utc;
    const range = this.localDay(first, timezone) === this.localDay(last, timezone)
      ? this.shortDate(first, timezone) : `${this.shortDate(first, timezone)} – ${this.shortDate(last, timezone)}`;
    const lines = [`*#${this.formatter.escapeMarkdown(tag)}*`, this.t(lang, 'tags_tag_total', { amount: money(entry.total), count: entry.count, range })];
    const byCategory = new Map();
    for (const row of entry.rows) {
      const name = row.category_name ? this.formatter.translateCategoryName(row.category_name, this.localizationService, lang) : this.t(lang, 'tags_no_category');
      const key = `${row.category_icon || '📦'} ${name}`;
      byCategory.set(key, (byCategory.get(key) || 0) + row.value);
    }
    lines.push('', `*${this.t(lang, 'tags_by_category')}*`);
    for (const [label, total] of [...byCategory].sort((a, b) => b[1] - a[1])) lines.push(`${this.formatter.escapeMarkdown(label)} — ${money(total)}`);
    lines.push('', `*${this.t(lang, 'tags_recent')}*`);
    for (const row of entry.rows.slice(0, MAX_RECENT)) {
      lines.push(`• ${this.shortDate(row.created_at_utc, timezone).slice(0, 5)} — ${this.formatter.formatAmount(Number(row.amount), row.currency)} — ${this.formatter.escapeMarkdown(row.description)}`);
    }
    return respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'tags_button_all'), callback_data: 'tags' }]] } });
  }
}

module.exports = TagHandlers;
