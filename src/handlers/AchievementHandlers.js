const respond = require('../utils/respond');
const { ACHIEVEMENTS, TIERS, TIER_ICONS, nextGoals } = require('../utils/achievements');
const { addDays } = require('../utils/period');

const CHALLENGE_ICONS = { no_spend: '🧘', no_category: '🚫', budget_month: '💰' };
const START_KINDS = { ns: 'no_spend', nc: 'no_category', bm: 'budget_month' };
const BUTTON_NAME_LENGTH = 24;

// Экран «🏆 Достижения» (ach…): уровень и XP, серия, значки, ближайшие цели, челленджи, «Итоги месяца»
class AchievementHandlers {
  constructor({ achievementService, expenseService, userService, localizationService, formatter, chartService = null, coinService = null }) {
    this.achievementService = achievementService;
    this.expenseService = expenseService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.chartService = chartService; // «📤 Поделиться» — карточка итогов картинкой (ChartHandlers.shareWrapped)
    this.coinService = coinService; // «🪙 Монеты»: баланс строкой и кнопка экрана монет
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  async lang(ctx) {
    return this.userService.getUserLanguage(ctx.from.id);
  }

  backRow(lang, callback = 'ach') {
    return [{ text: this.t(lang, callback === 'ach' ? 'ach_button_back_to_ach' : 'button_back'), callback_data: callback }];
  }

  // Строка прогресса активного челленджа
  challengeLine(lang, challenge, result) {
    const name = this.achievementService.challengeName(lang, challenge);
    let progress;
    if (challenge.kind === 'budget_month') {
      const currency = result.budget?.currency;
      progress = this.t(lang, 'ach_ch_progress_budget', {
        spent: this.formatter.formatAmount(result.progress, currency),
        limit: this.formatter.formatAmount(result.target, currency),
        left: result.daysLeft
      });
    } else {
      progress = this.t(lang, `ach_ch_progress_${challenge.kind}`, { progress: result.progress, target: result.target, left: result.daysLeft });
    }
    return `${CHALLENGE_ICONS[challenge.kind]} ${name} — ${progress}`;
  }

  // ach, /achievements; notice — строка сверху (результат действия)
  async show(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const overview = await this.achievementService.getOverview(userId, lang);
    const { snap, level, xp } = overview;

    const lines = [`🏆 *${this.t(lang, 'ach_title')}*`];
    const notes = [notice, ...overview.notes].filter(Boolean);
    if (notes.length) lines.push('', ...notes);

    lines.push('', `${level.icon} *${this.t(lang, 'ach_level_line', { level: level.level, name: this.achievementService.levelName(lang, level.level) })}*`);
    lines.push(level.next === null
      ? this.t(lang, 'ach_xp_max', { xp })
      : `${this.formatter.progressBar(level.ratio)} ${this.t(lang, 'ach_xp_line', { xp, next: level.next })}`);
    lines.push(this.t(lang, 'ach_screen_streak', { days: snap.streak.current, best: snap.stats.bestStreak }));
    lines.push(this.t(lang, 'ach_screen_freezes', { left: snap.streak.freezesLeft, total: snap.freezesPerWeek }));
    if (overview.coins !== null && overview.coins !== undefined) lines.push(this.t(lang, 'ach_screen_coins', { balance: overview.coins }));
    if (snap.streak.atRisk) lines.push(this.t(lang, 'ach_screen_risk'));

    const unlocked = snap.unlocked;
    lines.push('', `*${this.t(lang, 'ach_unlocked_count', { count: unlocked.size, total: ACHIEVEMENTS.length })}*`);
    if (unlocked.size) {
      for (const tier of TIERS) {
        const emojis = ACHIEVEMENTS.filter(a => a.tier === tier && unlocked.has(a.code)).map(a => a.emoji);
        if (emojis.length) lines.push(`${TIER_ICONS[tier]} ${emojis.join(' ')}`);
      }
    } else {
      lines.push(this.t(lang, 'ach_none_yet'));
    }

    const goals = nextGoals(snap.stats, unlocked, 3);
    if (goals.length) {
      lines.push('', `*${this.t(lang, 'ach_next_title')}*`);
      for (const goal of goals) {
        lines.push(`${goal.achievement.emoji} ${this.achievementService.title(lang, goal.achievement.code)} — ${goal.current}/${goal.target}`);
      }
    }

    if (overview.active.length) {
      lines.push('', `*${this.t(lang, 'ach_challenges_title')}*`);
      for (const { challenge, result } of overview.active) lines.push(this.challengeLine(lang, challenge, result));
    }

    const keyboard = [
      [
        { text: this.t(lang, 'ach_button_all'), callback_data: 'achl' },
        { text: this.t(lang, 'ach_button_challenges'), callback_data: 'achc' }
      ]
    ];
    if (!snap.expenseDays.has(snap.today) && !snap.markDays.has(snap.today)) {
      keyboard.push([{ text: this.t(lang, 'ach_button_no_spend'), callback_data: 'achn' }]);
    }
    const wrappedButton = { text: this.t(lang, 'ach_button_wrapped'), callback_data: 'achw|-1' };
    keyboard.push(this.coinService ? [wrappedButton, { text: this.t(lang, 'coins_button_open'), callback_data: 'coins' }] : [wrappedButton]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'menu' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // achl — весь каталог по редкости: открытые ✅, закрытые ▫️ с прогрессом
  async showAll(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const snap = await this.achievementService.snapshot(userId, { commitFreezes: false });
    const progress = new Map(nextGoals(snap.stats, snap.unlocked, ACHIEVEMENTS.length).map(g => [g.achievement.code, g]));
    const lines = [`📜 *${this.t(lang, 'ach_all_title')}* · ${snap.unlocked.size}/${ACHIEVEMENTS.length}`];
    for (const tier of TIERS) {
      lines.push('', `${TIER_ICONS[tier]} *${this.t(lang, `ach_tier_${tier}`)}*`);
      for (const a of ACHIEVEMENTS.filter(item => item.tier === tier)) {
        const title = this.achievementService.title(lang, a.code);
        const desc = this.t(lang, `ach_${a.code}_desc`);
        if (snap.unlocked.has(a.code)) {
          lines.push(`✅ ${a.emoji} *${title}* — ${desc}`);
        } else {
          const goal = progress.get(a.code);
          const suffix = goal && goal.current > 0 ? ` · ${goal.current}/${goal.target}` : '';
          lines.push(`▫️ ${a.emoji} ${title} — ${desc}${suffix}`);
        }
      }
    }
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [this.backRow(lang)] } });
  }

  // achn — «🧘 Сегодня без трат»
  async markNoSpend(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const result = await this.achievementService.markNoSpend(userId, lang);
    if (result.error) {
      await ctx.answerCbQuery(this.t(lang, result.error === 'spent' ? 'ach_no_spend_spent' : 'ach_no_spend_already'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    const notice = [this.t(lang, 'ach_no_spend_marked'), result.note].filter(Boolean).join('\n');
    await this.show(this.plain(ctx), notice);
  }

  // Повторный показ экрана после действия: answerCbQuery уже вызван
  plain(ctx) {
    return {
      from: ctx.from,
      callbackQuery: ctx.callbackQuery,
      editMessageText: (...args) => ctx.editMessageText(...args),
      reply: (...args) => ctx.reply(...args),
      answerCbQuery: () => Promise.resolve()
    };
  }

  // ---------- Челленджи ----------

  // achc — активные, недавние, кнопки старта и «сдаться»
  async showChallenges(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    const overview = await this.achievementService.getOverview(userId, lang);
    const finished = await this.achievementService.getFinishedChallenges(userId);
    const lines = [`⚔️ *${this.t(lang, 'ach_challenges_title')}*`];
    const notes = [notice, ...overview.notes].filter(Boolean);
    if (notes.length) lines.push('', ...notes);
    lines.push('', this.t(lang, 'ach_ch_intro'));

    if (overview.active.length) {
      lines.push('', `*${this.t(lang, 'ach_ch_active_title')}*`);
      for (const { challenge, result } of overview.active) lines.push(this.challengeLine(lang, challenge, result));
    } else {
      lines.push('', this.t(lang, 'ach_ch_no_spend_desc'), this.t(lang, 'ach_ch_no_category_desc'), this.t(lang, 'ach_ch_budget_month_desc'));
    }
    if (finished.length) {
      lines.push('', `*${this.t(lang, 'ach_ch_recent_title')}*`);
      for (const challenge of finished) {
        const status = this.t(lang, challenge.status === 'won' ? 'ach_ch_status_won' : 'ach_ch_status_lost');
        lines.push(`${CHALLENGE_ICONS[challenge.kind]} ${this.achievementService.challengeName(lang, challenge)} — ${status}`);
      }
    }
    // Подсказка про лимит — только без премиума (у премиума челленджи без ограничений)
    if (Number.isFinite(overview.snap.limits.MAX_ACTIVE_CHALLENGES)) lines.push('', this.t(lang, 'ach_ch_limit_hint'));

    const activeKinds = new Set(overview.active.map(item => item.challenge.kind));
    const keyboard = [];
    const starts = [];
    if (!activeKinds.has('no_spend')) starts.push({ text: this.t(lang, 'ach_button_ch_no_spend'), callback_data: 'achcs|ns' });
    starts.push({ text: this.t(lang, 'ach_button_ch_no_category'), callback_data: 'achcs|nc' });
    if (!activeKinds.has('budget_month')) starts.push({ text: this.t(lang, 'ach_button_ch_budget'), callback_data: 'achcs|bm' });
    for (let i = 0; i < starts.length; i += 2) keyboard.push(starts.slice(i, i + 2));
    for (const { challenge } of overview.active) {
      const plainName = this.achievementService.challengeName(lang, challenge).replace(/\\/g, '');
      keyboard.push([{
        text: this.t(lang, 'ach_button_give_up', { name: this.formatter.shorten(plainName, BUTTON_NAME_LENGTH) }),
        callback_data: `achcx|${challenge.id}`
      }]);
    }
    keyboard.push(this.backRow(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // achcs|ns|nc|bm — старт; для «недели без категории» — выбор категории
  async startChallenge(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const kind = START_KINDS[ctx.match[1]];
    if (kind === 'no_category') {
      await ctx.answerCbQuery().catch(() => {});
      const categories = await this.achievementService.challengeCategories(userId);
      const keyboard = [];
      for (let i = 0; i < categories.length; i += 2) {
        keyboard.push(categories.slice(i, i + 2).map(c => ({
          text: `${c.icon} ${this.formatter.translateCategoryName(c.name, this.localizationService, lang)}`,
          callback_data: `achcc|${c.id}`
        })));
      }
      keyboard.push(this.backRow(lang, 'achc'));
      return respond(ctx, this.t(lang, 'ach_ch_pick_category'), { reply_markup: { inline_keyboard: keyboard } });
    }
    return this.createChallenge(ctx, lang, kind);
  }

  // achcc|<categoryId> — неделя без трат в категории
  async startCategoryChallenge(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const category = await this.expenseService.getCategoryById(userId, parseInt(ctx.match[1], 10));
    if (!category) {
      await ctx.answerCbQuery(this.t(lang, 'callback_data_not_found')).catch(() => {});
      return;
    }
    return this.createChallenge(ctx, lang, 'no_category', category.name);
  }

  async createChallenge(ctx, lang, kind, categoryName = null) {
    const userId = ctx.from.id;
    const result = await this.achievementService.startChallenge(userId, kind, { categoryName });
    if (result.error === 'duplicate') {
      await ctx.answerCbQuery(this.t(lang, 'ach_ch_duplicate'), { show_alert: true }).catch(() => {});
      return;
    }
    await ctx.answerCbQuery().catch(() => {});
    if (result.error === 'limit') {
      return respond(ctx, this.t(lang, 'ach_ch_limit'), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }], this.backRow(lang, 'achc')] }
      });
    }
    if (result.error === 'no_budget') {
      return respond(ctx, this.t(lang, 'ach_ch_need_budget'), {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' }], this.backRow(lang, 'achc')] }
      });
    }
    const { challenge } = result;
    const lastDay = this.formatter.formatLocalDate(addDays(challenge.end_date, -1));
    const notice = this.t(lang, 'ach_ch_started', { name: this.achievementService.challengeName(lang, challenge), date: lastDay });
    await this.showChallenges(this.plain(ctx), notice);
  }

  // achcx|<id> — подтверждение «сдаться»
  async askCancel(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const id = parseInt(ctx.match[1], 10);
    const challenge = await this.achievementService.getChallenge(userId, id);
    if (!challenge || challenge.status !== 'active') return this.showChallenges(ctx);
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'ach_ch_give_up_confirm', { name: this.achievementService.challengeName(lang, challenge) }), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'ach_button_give_up_confirm'), callback_data: `achcxc|${id}` }],
          this.backRow(lang, 'achc')
        ]
      }
    });
  }

  // achcxc|<id>
  async cancel(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const canceled = await this.achievementService.cancelChallenge(userId, parseInt(ctx.match[1], 10));
    await ctx.answerCbQuery(canceled ? this.t(lang, 'ach_ch_given_up') : undefined).catch(() => {});
    await this.showChallenges(this.plain(ctx));
  }

  // ---------- «Итоги месяца» ----------

  // achw|<offset> — -1 прошлый период, 0 — текущий на сегодня
  async showWrapped(ctx, offset = -1) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const safeOffset = Math.min(0, offset);
    const [wrapped, enabled] = await Promise.all([
      this.achievementService.buildWrapped(userId, lang, safeOffset),
      this.achievementService.isWrappedEnabled(userId)
    ]);
    let text = wrapped ? wrapped.text : null;
    if (!text) {
      const { period } = await this.expenseService.getPeriodContext(userId, 'month', safeOffset);
      text = `🎉 *${this.t(lang, 'ach_wrapped_title', { range: this.formatter.formatPeriodRange(period) })}*\n\n${this.t(lang, 'ach_wrapped_empty')}`;
    }
    const nav = [{ text: this.t(lang, 'button_prev_period'), callback_data: `achw|${safeOffset - 1}` }];
    if (safeOffset < 0) nav.push({ text: this.t(lang, 'button_next_period'), callback_data: `achw|${safeOffset + 1}` });
    const keyboard = [nav];
    if (wrapped && this.chartService && this.chartService.available) {
      keyboard.push([{ text: this.t(lang, 'button_wrapped_share'), callback_data: `achwi|${safeOffset}` }]);
    }
    keyboard.push(
      [{ text: this.t(lang, enabled ? 'ach_button_wrapped_off' : 'ach_button_wrapped_on'), callback_data: `achwt|${safeOffset}` }],
      this.backRow(lang)
    );
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // achwt|<offset> — включить/выключить присылку итогов, остаться на экране итогов
  async toggleWrapped(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const enabled = !(await this.achievementService.isWrappedEnabled(userId));
    await this.achievementService.setWrappedEnabled(userId, enabled);
    await ctx.answerCbQuery(this.t(lang, enabled ? 'ach_wrapped_on_done' : 'ach_wrapped_off_done'), { show_alert: !enabled }).catch(() => {});
    await this.showWrapped(this.plain(ctx), parseInt(ctx.match[1], 10));
  }

  // achwo — «🔕 Не присылать» под присланными итогами: выключить, у сообщения остаётся только «🏆 Достижения»
  async turnOffWrapped(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    await this.achievementService.setWrappedEnabled(userId, false);
    await ctx.answerCbQuery(this.t(lang, 'ach_wrapped_off_done'), { show_alert: true }).catch(() => {});
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [[{ text: this.t(lang, 'button_achievements'), callback_data: 'ach' }]]
    }).catch(() => {});
  }
}

module.exports = AchievementHandlers;
