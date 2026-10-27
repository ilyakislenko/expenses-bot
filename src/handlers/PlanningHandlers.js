const respond = require('../utils/respond');
const { PACE_EMOJI } = require('../utils/planning');

const CALENDAR_MAX_LINES = 45; // строк платежей в календаре (сообщение < 4096 символов)
const DUE_BUTTONS = 4; // кнопок «📅 Дата: долг»

// «☰ Ещё» → «🧭 Планирование»: хаб (pl), можно потратить сегодня (pla), платежи на 30 дней (plc),
// найденные подписки (pls), личная инфляция (pli). Ввод числа платежа по долгу — состояние pl_in:due:<id>.
class PlanningHandlers {
  constructor({ planningService, userService, localizationService, formatter, stateService }) {
    this.planningService = planningService;
    this.userService = userService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  money(value, currency) {
    return this.formatter.formatAmount(Math.round(value), currency);
  }

  exact(value, currency) {
    return this.formatter.formatAmount(Math.round(value * 100) / 100, currency);
  }

  label(text, max = 32) {
    return this.formatter.escapeMarkdown(this.formatter.shorten(String(text || '').trim(), max));
  }

  async answer(ctx, text, extra) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(text, extra).catch(() => {});
  }

  backRow(lang, callback = 'pl') {
    return [{ text: this.t(lang, 'button_back'), callback_data: callback }];
  }

  // ========================================
  // ХАБ
  // ========================================

  async showHub(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const subs = await this.planningService.getSubscriptions(userId);
    const [line, calendar, inflation] = await Promise.all([
      this.planningService.allowanceLine(userId, lang, { hintForNew: false }),
      this.planningService.getCalendar(userId, { subs }),
      this.planningService.getInflation(userId)
    ]);

    const lines = [`🧭 *${this.t(lang, 'pl_title')}*`, '', this.t(lang, 'pl_hub_intro'), ''];
    lines.push(line || this.t(lang, 'pl_hub_allowance_none'));
    const next = calendar.items.find(item => item.kind !== 'income' && !item.paid);
    lines.push(next
      ? this.t(lang, 'pl_hub_next', { item: this.planningService.itemLine(lang, next), date: this.planningService.shortDate(next.date) })
      : this.t(lang, 'pl_hub_next_none'));
    lines.push(subs.all.length
      ? this.t(lang, 'pl_hub_subs', { count: subs.all.length, amount: this.money(subs.totalMonthly, subs.currency) })
      : this.t(lang, 'pl_hub_subs_none'));
    if (!inflation.purchases) lines.push(this.t(lang, 'pl_hub_inflation_empty'));
    else if (!inflation.isPremium) lines.push(this.t(lang, 'pl_hub_inflation_locked'));
    else if (inflation.basket) {
      lines.push(this.t(lang, 'pl_hub_inflation', {
        percent: this.planningService.formatPercent(lang, inflation.basket.change),
        date: this.planningService.shortDate(inflation.basket.since)
      }));
    } else lines.push(this.t(lang, 'pl_hub_inflation_wait'));

    const keyboard = [
      [{ text: this.t(lang, 'pl_button_allowance'), callback_data: 'pla' }, { text: this.t(lang, 'pl_button_calendar'), callback_data: 'plc' }],
      [{ text: this.t(lang, 'pl_button_subs'), callback_data: 'pls' }, { text: this.t(lang, 'pl_button_inflation'), callback_data: 'pli' }],
      this.backRow(lang, 'menu')
    ];
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // ========================================
  // МОЖНО ПОТРАТИТЬ СЕГОДНЯ
  // ========================================

  async showAllowance(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const a = await this.planningService.getAllowance(userId);
    const money = (value) => this.money(value, a.currency);
    const lines = [`💸 *${this.t(lang, 'pl_allow_title')}*`, ''];
    const keyboard = [];

    if (a.mode === 'none') {
      lines.push(this.t(lang, 'pl_allow_none'));
      keyboard.push([
        { text: this.t(lang, 'button_add_income'), callback_data: 'income_add' },
        { text: this.t(lang, 'button_budgets'), callback_data: 'bg_menu' }
      ]);
      keyboard.push(this.backRow(lang));
      return respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    }

    if (a.deficit > 0) {
      lines.push(this.t(lang, 'pl_allow_deficit', { amount: money(a.deficit) }));
      if (a.spentToday > 0) lines.push(this.t(lang, 'pl_allow_spent_today', { amount: money(a.spentToday) }));
    } else {
      lines.push(this.t(lang, 'pl_allow_today', { amount: money(a.daily), spent: money(a.spentToday), pace: PACE_EMOJI[a.pace] }));
      lines.push(a.leftToday >= 0
        ? this.t(lang, 'pl_allow_left', { amount: money(a.leftToday) })
        : this.t(lang, 'pl_allow_over_today', { amount: money(-a.leftToday) }));
    }

    lines.push('', `*${this.t(lang, 'pl_allow_how')}*`);
    lines.push(this.t(lang, 'pl_allow_period', { range: this.formatter.formatPeriodRange(a.period), days: a.daysLeft }));
    if (a.mode === 'income') {
      const o = a.outlook;
      lines.push(this.t(lang, 'pl_allow_income', { amount: money(o.income) }));
      if (o.recorded > 0) lines.push(`   ${this.t(lang, 'pl_allow_income_recorded', { amount: money(o.recorded) })}`);
      if (o.upcoming > 0) {
        const list = o.upcomingList.slice(0, 3).map(({ date, stream }) =>
          `${stream.label ? this.label(stream.label, 24) : this.t(lang, 'pl_cal_income_default')} ~${this.planningService.shortDate(date)}`).join(', ');
        lines.push(`   ${this.t(lang, 'pl_allow_income_expected', { amount: money(o.upcoming), list })}`);
      }
      if (o.average !== null && o.income === o.average && o.average > o.recorded + o.upcoming) {
        lines.push(`   ${this.t(lang, 'pl_allow_income_average', { amount: money(o.average), count: o.averagePeriods })}`);
      }
    } else {
      lines.push(this.t(lang, 'pl_allow_budget', { amount: money(a.budget) }));
    }
    lines.push(this.t(lang, 'pl_allow_spent', { amount: money(a.spentBefore) }));
    if (a.bills > 0) lines.push(this.t(lang, 'pl_allow_bills', { amount: money(a.bills), count: a.billsList.length }));
    if (a.debtsTotal > 0) {
      lines.push(this.t(lang, 'pl_allow_debts', { amount: money(a.debtsTotal) }));
      if (a.debtsProrated) lines.push(`   ${this.t(lang, 'pl_allow_debts_note')}`);
    }
    if (a.savings > 0) lines.push(this.t(lang, 'pl_allow_savings', { amount: money(a.savings) }));
    lines.push(a.free > 0
      ? this.t(lang, 'pl_allow_free', { amount: money(a.free), days: a.daysLeft, daily: money(a.daily) })
      : this.t(lang, 'pl_allow_free_none', { amount: money(a.free) }));
    lines.push('', `_${this.t(lang, 'pl_allow_note')}_`);
    if (a.mode === 'budget') lines.push('', this.t(lang, 'pl_allow_budget_hint'));

    keyboard.push([{ text: this.t(lang, 'pl_button_calendar'), callback_data: 'plc' }, { text: this.t(lang, 'button_today'), callback_data: 'dy|0|0' }]);
    keyboard.push(this.backRow(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // ========================================
  // ПЛАТЕЖИ
  // ========================================

  async showCalendar(ctx, notice = '') {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const cal = await this.planningService.getCalendar(userId);
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(`📅 *${this.t(lang, 'pl_cal_title')}*`);

    if (!cal.items.length && !cal.undated.length) {
      lines.push('', this.t(lang, 'pl_cal_empty'));
    } else {
      lines.push(cal.inTotal > 0
        ? this.t(lang, 'pl_cal_totals', { out: this.money(cal.outTotal, cal.currency), in: this.money(cal.inTotal, cal.currency) })
        : this.t(lang, 'pl_cal_totals_out', { out: this.money(cal.outTotal, cal.currency) }));
      const tomorrow = this.addDay(cal.today);
      let currentDate = null;
      let shown = 0;
      for (const item of cal.items) {
        if (shown >= CALENDAR_MAX_LINES) {
          lines.push('…');
          break;
        }
        if (item.date !== currentDate) {
          currentDate = item.date;
          const dateText = this.planningService.shortDate(item.date);
          const title = item.date === cal.today ? `${this.t(lang, 'pl_cal_today')}, ${dateText}`
            : item.date === tomorrow ? `${this.t(lang, 'pl_cal_tomorrow')}, ${dateText}` : dateText;
          lines.push('', `*${title}*`);
        }
        lines.push(this.planningService.itemLine(lang, item));
        shown++;
      }
      if (cal.undated.length) {
        lines.push('', `*${this.t(lang, 'pl_cal_undated')}*`);
        for (const debt of cal.undated) {
          lines.push(this.t(lang, 'pl_cal_undated_item', { name: this.label(debt.label), amount: this.exact(debt.amount, debt.currency) }));
        }
      }
      lines.push('', `_${this.t(lang, 'pl_cal_legend')}_`);
    }

    const keyboard = [[{
      text: this.t(lang, cal.remindersOn ? 'pl_button_bills_on' : 'pl_button_bills_off'),
      callback_data: 'plct|c'
    }]];
    // Число платежа по долгу: сначала долги без даты
    const debtsWithPayment = cal.debts
      .filter(debt => debt.monthly_payment > 0 && debt.balance > 0)
      .sort((a, b) => (a.due_day ? 1 : 0) - (b.due_day ? 1 : 0))
      .slice(0, DUE_BUTTONS);
    for (const debt of debtsWithPayment) {
      keyboard.push([{ text: this.t(lang, 'pl_button_due', { name: this.formatter.shorten(debt.name, 24) }), callback_data: `plcd|${debt.id}` }]);
    }
    if (!cal.items.length && !cal.undated.length) {
      keyboard.push([{ text: this.t(lang, 'button_recurring'), callback_data: 'recurring_menu' }]);
    }
    keyboard.push(this.backRow(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  addDay(date) {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  }

  // plct|c (из календаря) / plct|s (из настроек напоминаний): утренние напоминания о платежах вкл/выкл
  async toggleBillReminders(ctx, showSettings) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const enabled = await this.planningService.toggleBillReminders(userId);
    await ctx.answerCbQuery(this.t(lang, enabled ? 'pl_bills_enabled' : 'pl_bills_disabled')).catch(() => {});
    if (ctx.match[1] === 's') return showSettings(ctx);
    return this.showCalendar(ctx);
  }

  // plcd|<id>: число платежа по долгу следующим сообщением
  async startDueDay(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const debt = await this.planningService.getDebt(userId, parseInt(ctx.match[1], 10));
    if (!debt) {
      await ctx.answerCbQuery(this.t(lang, 'pl_debt_not_found'), { show_alert: true }).catch(() => {});
      return this.showCalendar(ctx);
    }
    await this.answer(ctx);
    this.stateService.setUserState(userId, `pl_in:due:${debt.id}`);
    const current = debt.due_day ? `\n${this.t(lang, 'pl_due_current', { day: debt.due_day })}` : '';
    await respond(ctx, `${this.t(lang, 'pl_due_prompt', { name: this.label(debt.name) })}${current}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_cancel'), callback_data: 'plc' }]] }
    });
  }

  // Текстовый ввод в состоянии pl_in:*
  async handleInput(ctx, text, lang, state) {
    const userId = ctx.from.id;
    const [, kind, arg] = state.split(':');
    if (kind !== 'due') {
      this.stateService.deleteUserState(userId);
      return this.showHub(ctx);
    }
    const value = String(text).trim();
    if (!/^\d{1,2}$/.test(value) || Number(value) > 31) {
      return ctx.reply(this.t(lang, 'pl_due_invalid'));
    }
    const day = Number(value);
    const debt = await this.planningService.setDueDay(userId, parseInt(arg, 10), day === 0 ? null : day);
    this.stateService.deleteUserState(userId);
    if (!debt) return this.showCalendar(ctx, this.t(lang, 'pl_debt_not_found'));
    const notice = day === 0
      ? this.t(lang, 'pl_due_cleared', { name: this.label(debt.name) })
      : this.t(lang, 'pl_due_saved', { name: this.label(debt.name), day });
    return this.showCalendar(ctx, notice);
  }

  // ========================================
  // ПОДПИСКИ
  // ========================================

  cadenceText(lang, cadence) {
    return this.t(lang, `pl_cadence_${cadence}`);
  }

  async showSubscriptions(ctx, notice = '') {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const subs = await this.planningService.getSubscriptions(userId);
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(`🔁 *${this.t(lang, 'pl_subs_title')}*`, '');
    const keyboard = [];

    if (!subs.all.length) {
      lines.push(this.t(lang, 'pl_subs_empty'));
    } else {
      lines.push(this.t(lang, 'pl_subs_intro'));
      lines.push(this.t(lang, 'pl_subs_total', {
        month: this.money(subs.totalMonthly, subs.currency),
        year: this.money(subs.totalMonthly * 12, subs.currency),
        count: subs.all.length
      }), '');
      subs.visible.forEach((sub, index) => {
        const n = index + 1;
        lines.push(this.t(lang, 'pl_subs_item', {
          n: `${n}.${sub.confirmed ? ' ✅' : ''}`,
          label: this.label(sub.label, 30),
          amount: this.exact(sub.amount, sub.currency),
          cadence: this.cadenceText(lang, sub.cadence),
          date: this.planningService.shortDate(sub.nextDate)
        }));
        const short = this.formatter.shorten(sub.label, 22);
        keyboard.push(sub.confirmed
          ? [{ text: `🙈 ${n}. ${short}`, callback_data: `plsn|${sub.id}` }]
          : [{ text: `✅ ${n}. ${short}`, callback_data: `plsy|${sub.id}` }, { text: `🙈 ${n}`, callback_data: `plsn|${sub.id}` }]);
      });
      if (subs.hiddenCount) {
        lines.push('', this.t(lang, 'pl_subs_more_locked', { count: subs.hiddenCount, amount: this.money(subs.hiddenMonthly, subs.currency) }));
        keyboard.push([{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]);
      }
      lines.push('', `_${this.t(lang, 'pl_subs_hint')}_`);
    }
    if (subs.dismissed) {
      keyboard.push([{ text: this.t(lang, 'pl_button_subs_restore', { count: subs.dismissed }), callback_data: 'plsr' }]);
    }
    keyboard.push(this.backRow(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // plsy|<id>: «✅ Это подписка»
  async confirmSubscription(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.planningService.confirmSubscription(userId, ctx.match[1]);
    if (result.error === 'recurring_limit') {
      await ctx.answerCbQuery(this.t(lang, 'recurring_limit', { max: this.planningService.recurringExpenseService.getMaxPerUser() }), { show_alert: true }).catch(() => {});
      return;
    }
    if (result.error) {
      await ctx.answerCbQuery(this.t(lang, 'pl_sub_outdated')).catch(() => {});
      return this.showSubscriptions(ctx);
    }
    await ctx.answerCbQuery().catch(() => {});
    const name = this.label(result.sub.label, 30);
    const notice = result.converted
      ? this.t(lang, 'pl_sub_converted', { label: name, day: result.day })
      : this.t(lang, 'pl_sub_confirmed', { label: name });
    return this.showSubscriptions(ctx, notice);
  }

  // plsn|<id>: «🙈 Не подписка»
  async dismissSubscription(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.planningService.dismissSubscription(userId, ctx.match[1]);
    await ctx.answerCbQuery(this.t(lang, result.error ? 'pl_sub_outdated' : 'pl_sub_dismissed')).catch(() => {});
    return this.showSubscriptions(ctx);
  }

  // plsr: вернуть скрытые
  async restoreSubscriptions(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.planningService.restoreDismissed(userId);
    await ctx.answerCbQuery(this.t(lang, 'pl_subs_restored')).catch(() => {});
    return this.showSubscriptions(ctx);
  }

  // ========================================
  // МОЯ ИНФЛЯЦИЯ
  // ========================================

  itemChangeLine(lang, item, currency) {
    return this.t(lang, 'pl_inf_item', {
      name: this.label(item.name, 30),
      old: this.exact(item.oldPrice, currency),
      new: this.exact(item.newPrice, currency),
      percent: this.planningService.formatPercent(lang, item.change)
    });
  }

  async showInflation(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const inf = await this.planningService.getInflation(userId);
    const lines = [`📈 *${this.t(lang, 'pl_inf_title')}*`, ''];
    const keyboard = [];

    if (!inf.purchases) {
      lines.push(this.t(lang, 'pl_inf_empty'));
    } else if (!inf.items.length) {
      lines.push(this.t(lang, 'pl_inf_no_repeats', { count: inf.purchases }));
    } else if (!inf.isPremium) {
      const teaser = inf.risers[0] || inf.fallers[0] || inf.items[0];
      lines.push(this.t(lang, 'pl_inf_teaser'));
      lines.push(this.itemChangeLine(lang, teaser, inf.currency));
      lines.push('', this.t(lang, 'pl_inf_locked', { count: inf.items.length }));
      keyboard.push([{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]);
    } else {
      lines.push(this.t(lang, 'pl_inf_basket', {
        percent: this.planningService.formatPercent(lang, inf.basket.change),
        count: inf.basket.count,
        date: this.planningService.shortDate(inf.basket.since)
      }));
      if (inf.risers.length) {
        lines.push('', `*${this.t(lang, 'pl_inf_risers')}*`);
        lines.push(...inf.risers.slice(0, inf.itemsLimit).map(item => this.itemChangeLine(lang, item, inf.currency)));
      }
      if (inf.fallers.length) {
        lines.push('', `*${this.t(lang, 'pl_inf_fallers')}*`);
        lines.push(...inf.fallers.slice(0, inf.itemsLimit).map(item => this.itemChangeLine(lang, item, inf.currency)));
      }
      if (!inf.risers.length && !inf.fallers.length) lines.push('', this.t(lang, 'pl_inf_stable'));
    }
    if (inf.purchases) lines.push('', `_${this.t(lang, 'pl_inf_note')}_`);
    keyboard.push(this.backRow(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }
}

module.exports = PlanningHandlers;
