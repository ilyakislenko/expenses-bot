const respond = require('../utils/respond');
const { parseEntries } = require('../utils/multiEntry');
const { addDays } = require('../utils/period');
const { packDate, unpackDate, parseFutureDate } = require('../utils/recordDate');
const { WARN_DAYS_OPTIONS } = require('../utils/subscriptionAlerts');

const TRIAL_NAME_MAX = 60;
const TRIAL_MAX_DAYS = 366; // окончание пробного — не дальше года
const TRIAL_QUICK_DAYS = [1, 3, 7, 14, 30]; // кнопки даты окончания: через столько дней

// Подписки в «🧭 Планирование → 🔁 Подписки»: карточка подписки (plsc), предупреждения о списании и ответы на них
// (plwk / plwx / plwm / plwu / plwh), настройка (plwo, plwt, plwd), пробные периоды (pltn, pltd, plt, pltx; ввод —
// состояния sub_in:trn и sub_in:trd:<id>), «🔔» в карточке регулярной траты (plwr). Кнопки устаревших сообщений
// безвредны: нет подписки или пробного периода — alert «неактуально» и кнопки убираются.
class SubscriptionHandlers {
  constructor({ subscriptionAlertService, planningService, planningHandlers, recurringExpenseHandlers, userService, localizationService, formatter, stateService, referralService = null }) {
    this.subscriptionAlertService = subscriptionAlertService;
    this.planningService = planningService;
    this.planningHandlers = planningHandlers;
    this.recurringExpenseHandlers = recurringExpenseHandlers;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.referralService = referralService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  label(text, max = 32) {
    return this.formatter.escapeMarkdown(this.formatter.shorten(String(text || '').trim(), max));
  }

  money(amount, currency) {
    return this.formatter.formatAmount(Math.round(Number(amount) * 100) / 100, currency);
  }

  shortDate(date) {
    return this.planningService.shortDate(date);
  }

  async lang(ctx) {
    return this.userService.getUserLanguage(ctx.from.id);
  }

  // Старая кнопка: подписки или пробного периода уже нет — alert и без кнопок (из текста — ответом)
  async outdated(ctx, lang) {
    if (!ctx.callbackQuery) return ctx.reply(this.t(lang, 'sub_outdated'));
    await ctx.answerCbQuery(this.t(lang, 'sub_outdated'), { show_alert: true }).catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  }

  async answer(ctx) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
  }

  backToSubs(lang) {
    return [{ text: this.t(lang, 'sub_button_back_subs'), callback_data: 'pls' }];
  }

  // ========================================
  // КАРТОЧКА ПОДПИСКИ
  // ========================================

  // plsc|<id>: название, цена, следующее списание, предупреждение и кнопки
  async showCard(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const [subs, settings] = await Promise.all([
      this.planningService.getSubscriptions(userId),
      this.subscriptionAlertService.getSettings(userId)
    ]);
    const sub = subs.shown.find(s => s.id === ctx.match[1]);
    if (!sub) {
      await ctx.answerCbQuery(this.t(lang, 'pl_sub_outdated')).catch(() => {});
      return this.planningHandlers.showSubscriptions(ctx);
    }
    await ctx.answerCbQuery().catch(() => {});
    const lines = [
      `🔁 *${this.label(sub.label, 40)}*`,
      this.t(lang, 'sub_card_price', { amount: this.money(sub.amount, sub.currency), cadence: this.t(lang, `pl_cadence_${sub.cadence}`) }),
      sub.nextDate >= subs.today
        ? this.t(lang, 'sub_card_next', { date: this.formatter.formatLocalDate(sub.nextDate) })
        : this.t(lang, 'sub_card_overdue', { date: this.formatter.formatLocalDate(sub.nextDate) })
    ];
    if (sub.kind === 'recurring') lines.push(this.t(lang, 'sub_card_recurring', { day: sub.day }));
    lines.push('');
    const state = sub.alert ? sub.alert.state : null;
    const isSub = sub.confirmed || sub.known;
    if (state === 'cancelling') lines.push(this.t(lang, 'sub_card_cancelling'));
    else if (state === 'muted') lines.push(this.t(lang, 'sub_card_muted'));
    else if (!isSub) lines.push(this.t(lang, 'sub_card_unconfirmed'));
    else if (!settings.enabled) lines.push(this.t(lang, 'sub_card_warn_off'));
    else lines.push(this.t(lang, 'sub_card_warn_on', { days: this.subscriptionAlertService.daysPhrase(lang, settings.days) }));

    const keyboard = [];
    if (sub.kind === 'detected' && !sub.confirmed) keyboard.push([{ text: this.t(lang, 'sub_button_confirm'), callback_data: `plsy|${sub.id}` }]);
    if (state || !isSub) keyboard.push([{ text: this.t(lang, 'sub_button_unmute'), callback_data: `plwu|${sub.ref}|${sub.id}` }]);
    else keyboard.push([{ text: this.t(lang, 'sub_button_mute'), callback_data: `plwm|${sub.ref}|${sub.id}` }]);
    keyboard.push([{ text: this.t(lang, 'sub_button_how'), callback_data: `plwh|${sub.ref}|${sub.id}` }]);
    keyboard.push([{ text: this.t(lang, 'sub_button_dismiss'), callback_data: `plsn|${sub.id}` }]);
    keyboard.push(this.backToSubs(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // После действия из карточки (callback c id карточки) — снова карточка
  async backToCard(ctx, cardId) {
    ctx.match = [ctx.match[0], cardId];
    return this.showCard(ctx);
  }

  // ========================================
  // ОТВЕТЫ НА ПРЕДУПРЕЖДЕНИЕ
  // ========================================

  // plwk|<ref>[|<дата>]: «✅ Нужна» / «✅ Оставляю» / «↩️ Передумал»
  async keep(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const target = await this.subscriptionAlertService.keep(userId, ctx.match[1]);
    if (!target) return this.outdated(ctx, lang);
    await ctx.answerCbQuery().catch(() => {});
    const key = target.kind === 'trial' ? 'sub_kept_trial' : 'sub_kept';
    await respond(ctx, this.t(lang, key, { name: this.label(target.name, 40) }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'pl_button_subs'), callback_data: 'pls' }]] }
    });
  }

  // plwx|<ref>[|<дата>]: «🚫 Отменю» — отметка и «Как отменить»
  async cancel(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const target = await this.subscriptionAlertService.cancel(userId, ctx.match[1]);
    if (!target) return this.outdated(ctx, lang);
    await ctx.answerCbQuery().catch(() => {});
    return this.renderGuide(ctx, lang, target, {
      notice: this.t(lang, 'sub_cancel_marked', { name: this.label(target.name, 40) }),
      undo: true
    });
  }

  // plwm|<ref>[|<id карточки>]: «🔕 Не напоминать про эту»
  async mute(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const target = await this.subscriptionAlertService.mute(userId, ctx.match[1]);
    if (!target) return this.outdated(ctx, lang);
    if (ctx.match[2]) {
      await ctx.answerCbQuery(this.t(lang, 'sub_muted_short')).catch(() => {});
      return this.backToCard(ctx, ctx.match[2]);
    }
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.t(lang, 'sub_muted', { name: this.label(target.name, 40) }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'pl_button_subs'), callback_data: 'pls' }]] }
    });
  }

  // plwu|<ref>|<id карточки>: «🔔 Напоминать о списании» из карточки
  async unmute(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const target = await this.subscriptionAlertService.unmute(userId, ctx.match[1]);
    if (!target) return this.outdated(ctx, lang);
    await ctx.answerCbQuery(this.t(lang, 'sub_unmuted_short')).catch(() => {});
    return this.backToCard(ctx, ctx.match[2]);
  }

  // plwh|<ref>[|<id карточки>]: «❓ Как отменить» без отметки
  async showGuide(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const target = await this.subscriptionAlertService.resolve(userId, ctx.match[1]);
    if (!target) return this.outdated(ctx, lang);
    await ctx.answerCbQuery().catch(() => {});
    const back = ctx.match[2]
      ? [{ text: this.t(lang, 'button_back'), callback_data: `plsc|${ctx.match[2]}` }]
      : target.kind === 'trial' ? [{ text: this.t(lang, 'button_back'), callback_data: `plt|${target.trial.id}` }] : null;
    return this.renderGuide(ctx, lang, target, { back });
  }

  async renderGuide(ctx, lang, target, { notice = '', undo = false, back = null } = {}) {
    const recurringId = target.sub && target.sub.kind === 'recurring' ? target.sub.recurringId : null;
    const guide = this.subscriptionAlertService.cancelGuide(lang, { name: target.name, key: target.key || '', recurringId });
    const keyboard = [...guide.urlRows];
    if (recurringId) keyboard.push([{ text: this.t(lang, 'sub_button_delete_recurring'), callback_data: `recurring_delete|${recurringId}` }]);
    if (undo) keyboard.push([{ text: this.t(lang, 'sub_button_undo_cancel'), callback_data: `plwk|${target.ref}` }]);
    keyboard.push(back || this.backToSubs(lang));
    const text = notice ? `${notice}\n\n${guide.text}` : guide.text;
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard }, disable_web_page_preview: true });
  }

  // ========================================
  // НАСТРОЙКА
  // ========================================

  // plwo: «🔔 Предупреждать о списании» — вкл/выкл и за сколько дней
  async showSettings(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const [settings, { isPremium, limits }] = await Promise.all([
      this.subscriptionAlertService.getSettings(userId),
      this.planningService.limits(userId)
    ]);
    const lines = [`🔔 *${this.t(lang, 'sub_settings_title')}*`, ''];
    lines.push(this.t(lang, 'sub_settings_info', { days: this.subscriptionAlertService.daysPhrase(lang, settings.days) }));
    if (!isPremium) lines.push('', this.t(lang, 'sub_settings_tariff', { count: limits.PLANNING_SUBSCRIPTIONS }));
    lines.push('', settings.enabled
      ? this.t(lang, 'sub_settings_on_line', { days: this.subscriptionAlertService.daysPhrase(lang, settings.days) })
      : this.t(lang, 'sub_settings_off_line'));
    const keyboard = [
      [this.toggleButton(lang, settings, 'o')],
      WARN_DAYS_OPTIONS.map(days => ({
        text: `${settings.enabled && settings.days === days ? '• ' : ''}${this.t(lang, `sub_days_${days}`)}`,
        callback_data: `plwd|${days}`
      })),
      this.backToSubs(lang)
    ];
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  toggleButton(lang, settings, origin) {
    return {
      text: settings.enabled
        ? this.t(lang, 'sub_button_warn_on', { days: this.subscriptionAlertService.daysPhrase(lang, settings.days) })
        : this.t(lang, 'sub_button_warn_off'),
      callback_data: `plwt|${origin}`
    };
  }

  // plwt|o (экран настройки) / plwt|s (экран «🔔 Напоминания»)
  async toggleWarn(ctx, showReminderSettings) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const enabled = await this.subscriptionAlertService.toggleWarn(userId);
    const { days } = await this.subscriptionAlertService.getSettings(userId);
    await ctx.answerCbQuery(enabled
      ? this.t(lang, 'sub_warn_enabled', { days: this.subscriptionAlertService.daysPhrase(lang, days) })
      : this.t(lang, 'sub_warn_disabled')).catch(() => {});
    if (ctx.match[1] === 's') return showReminderSettings(ctx);
    return this.showSettings(ctx);
  }

  // plwd|<дни>
  async setDays(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const days = await this.subscriptionAlertService.setWarnDays(userId, Number(ctx.match[1]));
    if (days) await ctx.answerCbQuery(this.t(lang, 'sub_warn_enabled', { days: this.subscriptionAlertService.daysPhrase(lang, days) })).catch(() => {});
    return this.showSettings(ctx);
  }

  // ========================================
  // ПРОБНЫЕ ПЕРИОДЫ
  // ========================================

  async limitScreen(ctx, lang) {
    let text = this.t(lang, 'sub_trial_limit');
    let keyboard = [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
    if (this.referralService) ({ text, keyboard } = await this.referralService.withUpsell(ctx.from.id, lang, text, keyboard));
    keyboard.push(this.backToSubs(lang));
    await respond(ctx, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // pltn: «➕ Пробный период» — название и цена следующим сообщением
  async startTrial(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    await ctx.answerCbQuery().catch(() => {});
    const limit = await this.subscriptionAlertService.canAddTrial(userId, await this.subscriptionAlertService.today(userId));
    if (!limit.ok) return this.limitScreen(ctx, lang);
    this.stateService.setUserState(userId, 'sub_in:trn');
    await respond(ctx, this.t(lang, 'sub_trial_prompt'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'pls' }]] }
    });
  }

  // Ввод: sub_in:trn — «Okko 399», «Netflix 9.99 USD», «Okko»; sub_in:trd:<id> — дата окончания текстом
  async handleInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const [, kind, arg] = state.split(':');
    if (kind === 'trn') return this.handleTrialName(ctx, text, lang);
    if (kind === 'trd') return this.handleTrialDate(ctx, text, lang, Number(arg));
    this.stateService.deleteUserState(userId);
    return this.planningHandlers.showSubscriptions(ctx);
  }

  async handleTrialName(ctx, text, lang) {
    const userId = ctx.from.id;
    const value = String(text || '').trim();
    let name = value;
    let amount = null;
    let currency = null;
    // «Netflix 799», «Spotify 11.99 USD» — название и цена (разбор как у записи); «Tele2», «Okko» — только название
    const entries = /\d/.test(value) ? parseEntries(value) : null;
    if (entries) {
      if (entries.length !== 1 || entries[0].kind !== 'expense' || !entries[0].description) {
        return ctx.reply(this.t(lang, 'sub_trial_name_invalid'), { parse_mode: 'Markdown' });
      }
      ({ description: name, amount, currency } = entries[0]);
    }
    name = name.replace(/\s+/g, ' ').trim().slice(0, TRIAL_NAME_MAX);
    if (!/\p{L}/u.test(name) || !(amount === null || (amount > 0 && amount < 1e8))) {
      return ctx.reply(this.t(lang, 'sub_trial_name_invalid'), { parse_mode: 'Markdown' });
    }
    if (amount !== null && !currency) currency = await this.userService.getUserCurrency(userId);
    const result = await this.subscriptionAlertService.startTrial(userId, { name, amount, currency });
    if (result.error) {
      this.stateService.deleteUserState(userId);
      return this.limitScreen(ctx, lang);
    }
    this.stateService.setUserState(userId, `sub_in:trd:${result.id}`);
    return this.askTrialDate(ctx, lang, result.id, name);
  }

  async askTrialDate(ctx, lang, trialId, name, error = '') {
    const today = await this.subscriptionAlertService.today(ctx.from.id);
    const buttons = TRIAL_QUICK_DAYS.map(days => {
      const date = addDays(today, days);
      const text = days === 1 ? `${this.t(lang, 'sub_when_1')} · ${this.shortDate(date)}` : `${this.shortDate(date)} (+${days})`;
      return { text, callback_data: `pltd|${trialId}|${packDate(date)}` };
    });
    const lines = [];
    if (error) lines.push(error, '');
    lines.push(this.t(lang, 'sub_trial_date_prompt', { name: this.label(name, 40) }));
    await ctx.reply(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [buttons.slice(0, 2), buttons.slice(2), [{ text: this.t(lang, 'button_cancel'), callback_data: 'pls' }]] }
    });
  }

  async handleTrialDate(ctx, text, lang, trialId) {
    const userId = ctx.from.id;
    const today = await this.subscriptionAlertService.today(userId);
    const parsed = parseFutureDate(text, today, TRIAL_MAX_DAYS);
    if (parsed.error) return ctx.reply(this.t(lang, 'sub_trial_date_invalid'), { parse_mode: 'Markdown' });
    this.stateService.deleteUserState(userId);
    return this.saveTrial(ctx, lang, trialId, parsed.date);
  }

  // pltd|<id>|<YYYYMMDD>: дата окончания кнопкой. Черновик берётся один раз: повторное нажатие — «неактуально»
  async pickTrialDate(ctx) {
    const lang = await this.lang(ctx);
    const date = unpackDate(ctx.match[2]);
    if (!date) return this.outdated(ctx, lang);
    this.stateService.deleteUserState(ctx.from.id);
    return this.saveTrial(ctx, lang, Number(ctx.match[1]), date);
  }

  async saveTrial(ctx, lang, trialId, endDate) {
    const userId = ctx.from.id;
    const result = await this.subscriptionAlertService.finishTrial(userId, trialId, endDate);
    if (result.error === 'limit') {
      await this.answer(ctx);
      return this.limitScreen(ctx, lang);
    }
    if (result.error) return this.outdated(ctx, lang);
    await this.answer(ctx);
    const { trial, today } = result;
    const name = this.label(trial.name, 40);
    let notice = this.t(lang, 'sub_trial_saved', { name, date: this.formatter.formatLocalDate(trial.end_date) });
    if (trial.end_date <= addDays(today, 1)) notice += `\n${this.t(lang, trial.end_date === today ? 'sub_trial_today_note' : 'sub_trial_tomorrow_note')}`;
    return this.renderTrial(ctx, lang, trial, today, notice);
  }

  // plt|<id>: карточка пробного периода
  async showTrial(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const trial = await this.subscriptionAlertService.getTrial(userId, Number(ctx.match[1]));
    if (!trial) {
      await ctx.answerCbQuery(this.t(lang, 'sub_trial_outdated')).catch(() => {});
      return this.planningHandlers.showSubscriptions(ctx);
    }
    await ctx.answerCbQuery().catch(() => {});
    return this.renderTrial(ctx, lang, trial, await this.subscriptionAlertService.today(userId));
  }

  async renderTrial(ctx, lang, trial, today, notice = '') {
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(`🧪 *${this.label(trial.name, 40)}*`);
    lines.push(this.t(lang, trial.end_date >= today ? 'sub_trial_until' : 'sub_trial_ended', { date: this.formatter.formatLocalDate(trial.end_date) }));
    lines.push(trial.amount
      ? this.t(lang, 'sub_trial_then', { amount: this.money(trial.amount, trial.currency) })
      : this.t(lang, 'sub_trial_no_price'));
    lines.push('', this.t(lang, `sub_trial_state_${trial.state}`));
    const keyboard = [
      [{ text: this.t(lang, 'sub_button_how'), callback_data: `plwh|t${trial.id}` }],
      [{ text: this.t(lang, 'sub_button_trial_delete'), callback_data: `pltx|${trial.id}` }],
      this.backToSubs(lang)
    ];
    // После ввода даты текстом respond пришлёт карточку новым сообщением, из кнопки — заменит подсказку
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // pltx|<id>: удалить пробный период
  async deleteTrial(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const deleted = await this.subscriptionAlertService.deleteTrial(userId, Number(ctx.match[1]));
    await ctx.answerCbQuery(this.t(lang, deleted ? 'sub_trial_deleted' : 'sub_trial_outdated')).catch(() => {});
    return this.planningHandlers.showSubscriptions(ctx);
  }

  // ========================================
  // РЕГУЛЯРНАЯ ТРАТА
  // ========================================

  // plwr|<id>: «🔔 Предупреждать о списании» / «🔕 Не предупреждать» в карточке регулярной траты
  async toggleRecurring(ctx) {
    const userId = ctx.from.id;
    const lang = await this.lang(ctx);
    const enabled = await this.subscriptionAlertService.toggleRecurring(userId, Number(ctx.match[1]));
    if (enabled === null) {
      await ctx.answerCbQuery(this.t(lang, 'recurring_not_found')).catch(() => {});
      return this.recurringExpenseHandlers.showMenu(ctx);
    }
    await ctx.answerCbQuery(this.t(lang, enabled ? 'sub_unmuted_short' : 'sub_muted_short')).catch(() => {});
    return this.recurringExpenseHandlers.showCard(ctx);
  }
}

module.exports = SubscriptionHandlers;
