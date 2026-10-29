const respond = require('../utils/respond');
const { COINS } = require('../utils/constants');
const CoinService = require('../services/CoinService');

const DAY_MS = 24 * 60 * 60 * 1000;

// «🪙 Монеты» (coins, /coins, кнопка на экране достижений): баланс, как заработать, обмен на дни премиума
// (cnb|<дни> — подтверждение, cnc|<дни> — обмен; ключ идемпотентности — сообщение с подтверждением), история
class CoinHandlers {
  constructor({ coinService, userService, localizationService, formatter }) {
    this.coinService = coinService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  historyLine(lang, row, timezone) {
    const reason = CoinService.REASONS.includes(row.reason) ? row.reason : 'other';
    const amount = Number(row.amount);
    const sign = amount > 0 ? `+${amount}` : `−${Math.abs(amount)}`;
    const label = this.t(lang, `coins_reason_${reason}`, { days: Math.abs(Number(row.days) || 0) });
    return `${sign} 🪙 · ${label} · ${this.shortDate(row.created_at, timezone)}`;
  }

  localDay(date, timezone) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
  }

  shortDate(date, timezone) {
    const [, m, d] = this.localDay(date, timezone).split('-');
    return `${d}.${m}`;
  }

  async show(ctx, notice = null) {
    const userId = ctx.from.id;
    const [lang, timezone, overview] = await Promise.all([
      this.userService.getUserLanguage(userId),
      this.userService.getUserTimezone(userId),
      this.coinService.getOverview(userId)
    ]);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const lines = [`🪙 *${this.t(lang, 'coins_title', { balance: overview.balance })}*`];
    if (notice) lines.push('', notice);
    lines.push('', this.t(lang, 'coins_intro'), '', `*${this.t(lang, 'coins_earn_title')}*`, this.t(lang, 'coins_earn_rules', {
      day: COINS.DAY, streak: COINS.STREAK_WEEK, plan: COINS.PLAN_KEPT, challenge: COINS.CHALLENGE_WON, xp: COINS.XP_PER_COIN
    }));
    lines.push('', `*${this.t(lang, 'coins_shop_title')}*`, this.t(lang, 'coins_shop_cap', { left: overview.left, cap: overview.cap }));
    lines.push('', `*${this.t(lang, 'coins_history_title')}*`);
    if (overview.history.length) lines.push(...overview.history.map(row => this.historyLine(lang, row, timezone)));
    else lines.push(this.t(lang, 'coins_history_empty'));

    const keyboard = overview.shop.map(item => [{
      text: this.t(lang, 'coins_button_buy', { days: item.days, price: item.price }),
      callback_data: `cnb|${item.days}`
    }]);
    keyboard.push([{ text: this.t(lang, 'button_achievements'), callback_data: 'ach' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // Сколько нужно и можно ли сейчас: alert-текст или null
  blocker(lang, overview, item) {
    if (overview.left < item.days) return this.t(lang, 'coins_cap', { cap: overview.cap, left: overview.left });
    if (overview.balance < item.price) return this.t(lang, 'coins_not_enough', { need: item.price - overview.balance, price: item.price });
    return null;
  }

  // cnb|<дни>: подтверждение (до какого числа продлится премиум)
  async confirm(ctx) {
    const userId = ctx.from.id;
    const item = COINS.SHOP.find(i => i.days === parseInt(ctx.match[1], 10));
    const lang = await this.userService.getUserLanguage(userId);
    if (!item) return this.show(ctx);
    const overview = await this.coinService.getOverview(userId);
    const blocked = this.blocker(lang, overview, item);
    if (blocked) return ctx.answerCbQuery(blocked, { show_alert: true }).catch(() => {});
    const [user, timezone] = await Promise.all([this.userService.getUserById(userId), this.userService.getUserTimezone(userId)]);
    const now = Date.now();
    const current = user && user.premium && user.premium_expires_at && new Date(user.premium_expires_at).getTime() > now
      ? new Date(user.premium_expires_at).getTime() : now;
    const date = this.formatter.escapeMarkdown(this.formatter.formatDate(new Date(current + item.days * DAY_MS), timezone));
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'coins_confirm', { price: item.price, days: item.days, date, balance: overview.balance }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: this.t(lang, 'coins_button_confirm', { price: item.price, days: item.days }), callback_data: `cnc|${item.days}` }],
        [{ text: this.t(lang, 'button_back'), callback_data: 'coins' }]
      ] }
    });
  }

  // cnc|<дни>: обмен. Ключ — это сообщение с подтверждением: двойное нажатие списывает один раз
  async redeem(ctx) {
    const userId = ctx.from.id;
    const days = parseInt(ctx.match[1], 10);
    const lang = await this.userService.getUserLanguage(userId);
    const message = ctx.callbackQuery && ctx.callbackQuery.message;
    const key = message ? `${message.chat.id}:${message.message_id}` : `${ctx.callbackQuery.id}`;
    const result = await this.coinService.redeem(userId, days, { idempotencyKey: key });
    if (result.status === 'ok') {
      const timezone = await this.userService.getUserTimezone(userId);
      const date = this.formatter.escapeMarkdown(this.formatter.formatDate(result.expiresAt, timezone));
      await ctx.answerCbQuery(this.t(lang, 'coins_redeemed_alert', { days: result.days })).catch(() => {});
      return respond(ctx, this.t(lang, 'coins_redeemed', { days: result.days, date, balance: result.balance }), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'coins_button_open'), callback_data: 'coins' }]] }
      });
    }
    const alerts = {
      duplicate: () => this.t(lang, 'coins_already'),
      cap: () => this.t(lang, 'coins_cap', { cap: COINS.MONTHLY_DAYS_CAP, left: result.left }),
      insufficient: () => this.t(lang, 'coins_not_enough', { need: result.need, price: result.need + result.balance }),
      failed: () => this.t(lang, 'coins_failed'),
      unknown: () => this.t(lang, 'callback_data_not_found')
    };
    await ctx.answerCbQuery((alerts[result.status] || alerts.unknown)(), { show_alert: true }).catch(() => {});
    if (result.status === 'duplicate') return this.show(ctx);
  }
}

module.exports = CoinHandlers;
