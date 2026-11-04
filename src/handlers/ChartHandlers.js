const respond = require('../utils/respond');
const respondPhoto = require('../utils/respondPhoto');
const logger = require('../utils/logger');

// Графики картинками: кольцо по категориям (chp|<offset>), столбики за 6 периодов (cht|<offset>,
// chc|<categoryId>|<offset>) и карточка «Итоги месяца» для пересылки (achwi|<offset>).
// Бесплатно: кольцо текущего периода и карточка итогов; прошлые периоды и динамика — премиум.
class ChartHandlers {
  constructor({ chartService, achievementService, premiumService, userService, localizationService, referralService = null }) {
    this.chartService = chartService;
    this.achievementService = achievementService;
    this.premiumService = premiumService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.referralService = referralService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  botUsername(ctx) {
    return (ctx.botInfo && ctx.botInfo.username) || null;
  }

  // Без премиума — описание и кнопка премиума (иногда — и «пригласи друга»)
  async teaser(ctx, lang) {
    await ctx.answerCbQuery().catch(() => {});
    let text = this.t(lang, 'chart_premium_teaser');
    let keyboard = [
      [{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }],
      [{ text: this.t(lang, 'button_chart'), callback_data: 'chp|0' }],
      [{ text: this.t(lang, 'button_back_to_overview'), callback_data: 'ov|0' }]
    ];
    if (this.referralService) ({ text, keyboard } = await this.referralService.withUpsell(ctx.from.id, lang, text, keyboard));
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  unavailable(ctx, lang) {
    return ctx.answerCbQuery(this.t(lang, 'chart_unavailable'), { show_alert: true }).catch(() => {});
  }

  navRow(lang, offset, callback) {
    const row = [{ text: this.t(lang, 'button_prev_period'), callback_data: callback(offset - 1) }];
    if (offset < 0) row.push({ text: this.t(lang, 'button_next_period'), callback_data: callback(offset + 1) });
    return row;
  }

  // chp|<offset> — кольцо по категориям; прошлые периоды — премиум
  async showDonut(ctx, offset = 0) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const safeOffset = Math.min(0, offset);
    if (safeOffset < 0 && !(await this.premiumService.isPremiumUser(userId))) return this.teaser(ctx, lang);
    const chart = await this.render(() => this.chartService.donut(userId, lang, safeOffset, { botUsername: this.botUsername(ctx) }));
    if (!chart || !chart.png) return this.unavailable(ctx, lang);
    await ctx.answerCbQuery().catch(() => {});
    await respondPhoto(ctx, chart.png, {
      caption: chart.caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          this.navRow(lang, safeOffset, o => `chp|${o}`),
          [{ text: this.t(lang, 'button_chart_trend'), callback_data: `cht|${safeOffset}` }],
          [{ text: this.t(lang, 'button_back_to_overview'), callback_data: `ov|${safeOffset}` }]
        ]
      }
    });
  }

  // cht|<offset> — столбики за 6 периодов; chc|<categoryId>|<offset> — то же по одной категории. Премиум
  async showTrend(ctx, offset = 0, categoryId = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const safeOffset = Math.min(0, offset);
    if (!(await this.premiumService.isPremiumUser(userId))) return this.teaser(ctx, lang);
    const chart = await this.render(() => this.chartService.trend(userId, lang, safeOffset, { categoryId, botUsername: this.botUsername(ctx) }));
    if (chart === null) {
      // Категории больше нет (удалена или чужая кнопка)
      await ctx.answerCbQuery(this.t(lang, 'button_outdated'), { show_alert: true }).catch(() => {});
      return;
    }
    if (!chart) return this.unavailable(ctx, lang);
    const keyboard = [
      this.navRow(lang, safeOffset, o => (categoryId ? `chc|${categoryId}|${o}` : `cht|${o}`)),
      categoryId
        ? [{ text: this.t(lang, 'button_back'), callback_data: `oc|${categoryId}|${safeOffset}|0` }]
        : [{ text: this.t(lang, 'button_chart_categories'), callback_data: `chp|${safeOffset}` }],
      [{ text: this.t(lang, 'button_back_to_overview'), callback_data: `ov|${safeOffset}` }]
    ];
    if (!chart.png) {
      // Картинку не нарисовать — те же цифры текстом
      await ctx.answerCbQuery().catch(() => {});
      await respond(ctx, chart.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    await respondPhoto(ctx, chart.png, { caption: chart.caption, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // achwi|<offset> — карточка «Итоги месяца» отдельным сообщением: её пересылают друзьям. Бесплатно.
  // В подписи — только ссылка на бота; на картинке нет описаний трат и названий целей
  async shareWrapped(ctx, offset = -1) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const safeOffset = Math.min(0, offset);
    const wrapped = await this.achievementService.buildWrapped(userId, lang, safeOffset);
    if (!wrapped) {
      await ctx.answerCbQuery(this.t(lang, 'chart_empty'), { show_alert: true }).catch(() => {});
      return;
    }
    const png = await this.render(() => this.chartService.wrappedCard(wrapped.card, lang, { botUsername: this.botUsername(ctx) }));
    if (!png) return this.unavailable(ctx, lang);
    await ctx.answerCbQuery(this.t(lang, 'chart_card_hint')).catch(() => {});
    const username = this.botUsername(ctx);
    const link = username ? `https://t.me/${username}?start=wrapped` : null;
    await ctx.replyWithPhoto({ source: png, filename: 'wrapped.png' }, {
      caption: link ? this.t(lang, 'chart_card_caption', { link }) : undefined,
      reply_markup: link ? { inline_keyboard: [[{ text: this.t(lang, 'button_chart_try'), url: link }]] } : undefined
    });
  }

  // Ошибка рисования не роняет экран: false — ответим «картинку не нарисовать»
  async render(build) {
    if (!this.chartService.available) return false;
    try {
      return await build();
    } catch (error) {
      logger.warn('Chart not rendered', { error: error.message });
      return false;
    }
  }
}

module.exports = ChartHandlers;
