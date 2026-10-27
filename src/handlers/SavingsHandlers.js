const respond = require('../utils/respond');
const { simulate } = require('../utils/savingsForecast');
const { amortize, projectDebt } = require('../utils/debtForecast');
const { MAX_DEBTS } = require('../services/SavingsService');

const MAX_SAVINGS_AMOUNT = 9999999999; // savings_pots.balance DECIMAL(14,2) с запасом на пополнения
const MAX_GOAL_NAME_LENGTH = 60;
const RATE_LIMITS = { i: 300, y: 300, g: 100 }; // проценты годовых: инфляция, доходность, рост взноса
const RATE_COLUMNS = { i: 'inflation_rate', y: 'yield_rate', g: 'contribution_growth' };
const FORECAST_HORIZONS = [6, 12, 36, 60, 120];
const ZERO = /^\s*0+(?:[.,]0+)?\s*$/;
const DEBT_NUMBER = /^\d+(?:[.,]\d{1,2})?$/;
const DEBT_AMOUNT = /^(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d{1,2})?$/;

// Раздел «🏦 Накопления»: общая копилка, счета, цели (своя копилка или от всех накоплений), долги, прогноз.
// Ввод текстом — состояние sv_in:<операция>:<параметры>, см. handleInput.
class SavingsHandlers {
  constructor({ savingsService, userService, premiumService, localizationService, formatter, stateService, validator }) {
    this.savingsService = savingsService;
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

  money(amount, currency) {
    return this.formatter.formatAmount(Math.round(amount), currency);
  }

  // Суммы в копилках — с копейками, как ввёл пользователь
  exact(amount, currency) {
    return this.formatter.formatAmount(amount, currency);
  }

  duration(months, lang) {
    if (months < 12) return this.t(lang, 'savings_months', { n: months });
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest ? this.t(lang, 'savings_years_months', { y: years, m: rest }) : this.t(lang, 'savings_years', { y: years });
  }

  // 'MM.YYYY' через months месяцев от today
  monthLabel(today, months) {
    const [y, m] = today.split('-').map(Number);
    const index = y * 12 + (m - 1) + months;
    return `${String((index % 12) + 1).padStart(2, '0')}.${Math.floor(index / 12)}`;
  }

  // Общая копилка без своего названия — «Общие накопления»
  potButtonName(pot, lang) {
    return pot.kind === 'general' && !pot.name ? this.t(lang, 'savings_general') : pot.name;
  }

  potName(pot, lang) {
    return this.formatter.escapeMarkdown(this.potButtonName(pot, lang));
  }

  potIcon(pot) {
    return { general: '💰', account: '💼', goal: '🎯', debt: '💳' }[pot.kind];
  }

  // «3 000 $ (≈ 285 000 ₽) · 16%»: сумма счёта, в основной валюте, если другая, и своя ставка
  accountSummary(pot, currency) {
    let text = this.exact(pot.balance, pot.currency);
    if (pot.currency !== currency && pot.balance > 0) text += ` (≈ ${this.money(pot.balanceMain, currency)})`;
    if (pot.yield_rate !== null) text += ` · ${this.percent(pot.yield_rate)}%`;
    return text;
  }

  async answer(ctx, text) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(text).catch(() => {});
  }

  // Строка «сколько откладываешь в месяц»
  monthlyLine(state, lang) {
    const { settings, auto, monthly, currency } = state;
    if (settings.manualMonthly !== null) {
      return this.t(lang, 'savings_monthly_manual', { amount: this.money(monthly, currency) });
    }
    if (!auto) return this.t(lang, 'savings_monthly_unknown');
    if (auto.amount <= 0) {
      return this.t(lang, 'savings_monthly_negative', { amount: this.money(-auto.amount, currency), n: auto.periods });
    }
    return this.t(lang, 'savings_monthly_auto', { amount: this.money(auto.amount, currency), n: auto.periods });
  }

  // callback: sv, команда /savings. notice — строка сверху (результат действия)
  async showMenu(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { currency, accounts, goals, debts } = state;
    const empty = state.total === 0 && !goals.length && !debts.length && accounts.length === 1;

    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.t(lang, 'savings_title'), '');
    if (empty) {
      lines.push(this.t(lang, 'savings_intro'));
    } else {
      lines.push(this.t(lang, 'savings_total', { amount: this.money(state.total, currency) }));
      for (const account of accounts) {
        // Пустая общая копилка при своих счетах — лишняя строка (кнопка остаётся)
        if (account.kind === 'general' && account.balance === 0 && accounts.length > 1) continue;
        lines.push(`${this.potIcon(account)} ${this.potName(account, lang)}: ${this.accountSummary(account, currency)}`);
      }
      for (const debt of debts) {
        lines.push(`💳 ${this.potName(debt, lang)}: ${this.accountSummary(debt, currency)}`);
      }
      for (const goal of goals) {
        const status = await this.savingsService.goalStatus(goal, state);
        const mode = goal.goal_mode === 'total' ? ` ${this.t(lang, 'savings_mode_total_short')}` : '';
        lines.push(`🎯 ${this.potName(goal, lang)}${mode}: ${this.money(status.current, currency)} / ${this.money(status.target, currency)}`);
        const tail = status.achieved
          ? this.t(lang, 'savings_goal_achieved_short')
          : (status.etaNominal !== null ? `≈ ${this.duration(status.etaNominal, lang)}` : '');
        lines.push(`   ${this.formatter.progressBar(status.ratio)} ${Math.min(100, Math.floor(status.ratio * 100))}%${tail ? ` · ${tail}` : ''}`);
      }
      if (debts.length) {
        lines.push('', this.t(lang, 'savings_net_worth', {
          amount: this.money(state.netWorth, currency),
          assets: this.money(state.total, currency),
          debts: this.money(state.debtTotal, currency)
        }));
      }
      lines.push('', this.monthlyLine(state, lang));
      if (state.monthly !== null) {
        const { points } = simulate({ parts: state.parts, monthly: state.monthly, ...this.rates(state), months: 12 });
        const year = points[12];
        let line = this.t(lang, 'savings_in_year', { amount: this.money(year.nominal, currency) });
        if (state.settings.inflationRate > 0) line += ` · ${this.t(lang, 'savings_in_today_money', { amount: this.money(year.real, currency) })}`;
        lines.push(line);
      }
    }

    const keyboard = [];
    if (empty) {
      keyboard.push([{ text: this.t(lang, 'savings_button_set_current'), callback_data: `svs|${accounts[0].id}` }]);
    } else {
      const pots = [...accounts, ...goals, ...debts];
      for (let i = 0; i < pots.length; i += 2) {
        keyboard.push(pots.slice(i, i + 2).map(pot => ({
          text: `${this.potIcon(pot)} ${this.potButtonName(pot, lang)}`,
          callback_data: pot.kind === 'debt' ? `svb|${pot.id}` : `svp|${pot.id}`
        })));
      }
    }
    keyboard.push([
      { text: this.t(lang, 'savings_button_new_account'), callback_data: 'sva' },
      { text: this.t(lang, 'savings_button_new_debt'), callback_data: 'svbn' }
    ]);
    keyboard.push([
      { text: this.t(lang, 'savings_button_new_goal'), callback_data: 'svgn' },
      { text: this.t(lang, 'savings_button_forecast'), callback_data: 'svf' }
    ]);
    keyboard.push([{ text: this.t(lang, 'savings_button_settings'), callback_data: 'svo' }]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]);

    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  rates(state) {
    const { yieldRate, inflationRate, contributionGrowth } = state.settings;
    return { yieldRate, inflationRate, contributionGrowth };
  }

  backToSavings(lang) {
    return [{ text: this.t(lang, 'savings_button_back'), callback_data: 'sv' }];
  }

  // callback: svp|<id>. notice — строка сверху
  async showPot(ctx, potId = null, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const id = potId || parseInt(ctx.match[1], 10);
    const state = await this.savingsService.getState(userId);
    const pot = state.pots.find(p => p.id === id);
    if (!pot) {
      return respond(ctx, this.t(lang, 'savings_not_found'), { reply_markup: { inline_keyboard: [this.backToSavings(lang)] } });
    }
    if (pot.kind === 'debt') return this.debtCard(ctx, lang, pot, state, notice);

    const lines = [];
    if (notice) lines.push(notice, '');
    const own = pot.kind !== 'goal' || pot.goal_mode === 'own';
    if (pot.kind === 'goal') {
      await this.goalLines(lines, pot, state, lang);
    } else {
      lines.push(`${this.potIcon(pot)} *${this.potName(pot, lang)}*`);
      let balance = this.t(lang, 'savings_balance', { amount: this.exact(pot.balance, pot.currency) });
      if (pot.currency !== state.currency && pot.balance > 0) balance += ` (≈ ${this.money(pot.balanceMain, state.currency)})`;
      lines.push(balance);
      lines.push(pot.yield_rate !== null
        ? this.t(lang, 'savings_account_yield', { value: this.percent(pot.yield_rate) })
        : this.t(lang, 'savings_account_yield_default', { value: this.percent(state.settings.yieldRate) }));
    }

    if (own) await this.operationLines(lines, userId, pot, lang);

    const keyboard = [];
    if (own) {
      keyboard.push([
        { text: this.t(lang, 'savings_button_deposit'), callback_data: `svd|${pot.id}` },
        { text: this.t(lang, 'savings_button_withdraw'), callback_data: `svw|${pot.id}` }
      ]);
      const row = [{ text: this.t(lang, 'savings_button_set'), callback_data: `svs|${pot.id}` }];
      const ownPots = state.pots.filter(p => p.kind !== 'debt' && (p.kind !== 'goal' || p.goal_mode === 'own'));
      if (ownPots.length > 1 && pot.balance > 0) row.push({ text: this.t(lang, 'savings_button_transfer'), callback_data: `svt|${pot.id}` });
      keyboard.push(row);
    }
    if (pot.kind === 'goal') {
      keyboard.push([
        { text: this.t(lang, 'savings_button_goal_target'), callback_data: `svga|${pot.id}` },
        { text: this.t(lang, 'savings_button_goal_date'), callback_data: `svgd|${pot.id}` }
      ]);
      keyboard.push([
        { text: this.t(lang, pot.goal_mode === 'own' ? 'savings_button_mode_own' : 'savings_button_mode_total'), callback_data: `svgm|${pot.id}` },
        { text: this.t(lang, 'savings_button_goal_delete'), callback_data: `svgx|${pot.id}` }
      ]);
    } else {
      keyboard.push([
        { text: this.t(lang, 'savings_button_account_yield'), callback_data: `svpy|${pot.id}` },
        { text: this.t(lang, 'savings_button_account_name'), callback_data: `svpn|${pot.id}` }
      ]);
      if (pot.kind === 'account') keyboard.push([{ text: this.t(lang, 'savings_button_account_delete'), callback_data: `svpx|${pot.id}` }]);
    }
    keyboard.push(this.backToSavings(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // Последние изменения копилки или долга (у долга «+» — долг вырос, «−» — погашено)
  async operationLines(lines, userId, pot, lang) {
    const operations = await this.savingsService.getRecentOperations(userId, pot.id);
    if (!operations.length) return;
    lines.push('', this.t(lang, 'savings_recent_operations'));
    const timezone = await this.userService.getUserTimezone(userId);
    for (const op of operations) {
      const amount = Number(op.amount);
      const sign = amount >= 0 ? '+' : '−';
      lines.push(`${sign}${this.exact(Math.abs(amount), pot.currency)} · ${this.formatter.formatShortDateTime(op.created_at, timezone)}`);
    }
  }

  // callback: svb|<id> — карточка долга. notice — строка сверху
  async showDebt(ctx, debtId = null, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const id = debtId || parseInt(ctx.match[1], 10);
    const state = await this.savingsService.getState(userId);
    const debt = state.debts.find(p => p.id === id);
    if (!debt) {
      return respond(ctx, this.t(lang, 'savings_not_found'), { reply_markup: { inline_keyboard: [this.backToSavings(lang)] } });
    }
    return this.debtCard(ctx, lang, debt, state, notice);
  }

  async debtCard(ctx, lang, debt, state, notice) {
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(`💳 *${this.potName(debt, lang)}*`);
    let owed = this.t(lang, 'savings_debt_owed', { amount: this.exact(debt.balance, debt.currency) });
    if (debt.currency !== state.currency && debt.balance > 0) owed += ` (≈ ${this.money(debt.balanceMain, state.currency)})`;
    lines.push(owed);
    lines.push(debt.yield_rate
      ? this.t(lang, 'savings_debt_rate', { value: this.percent(debt.yield_rate) })
      : this.t(lang, 'savings_debt_no_rate'));
    lines.push(debt.monthly_payment
      ? this.t(lang, 'savings_debt_payment', { amount: this.exact(debt.monthly_payment, debt.currency) })
      : this.t(lang, 'savings_debt_payment_not_set'));
    lines.push('', ...this.payoffLines(debt, state.today, lang));
    await this.operationLines(lines, ctx.from.id, debt, lang);

    const id = debt.id;
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'savings_button_debt_pay'), callback_data: `svbp|${id}` },
            { text: this.t(lang, 'savings_button_debt_increase'), callback_data: `svbi|${id}` }
          ],
          [
            { text: this.t(lang, 'savings_button_set'), callback_data: `svbs|${id}` },
            { text: this.t(lang, 'savings_button_debt_payment'), callback_data: `svbm|${id}` }
          ],
          [
            { text: this.t(lang, 'savings_button_debt_rate'), callback_data: `svbr|${id}` },
            { text: this.t(lang, 'savings_button_account_name'), callback_data: `svbe|${id}` }
          ],
          [{ text: this.t(lang, 'savings_button_debt_delete'), callback_data: `svbx|${id}` }],
          this.backToSavings(lang)
        ]
      }
    });
  }

  // Когда закроется долг при плановом платеже и сколько уйдёт на проценты
  payoffLines(debt, today, lang) {
    const plan = amortize({ balance: debt.balance, rate: debt.yield_rate, payment: debt.monthly_payment });
    const currency = debt.currency;
    if (plan.paidOff && plan.months === 0) return [this.t(lang, 'savings_debt_paid_off')];
    if (plan.paidOff) {
      const lines = [this.t(lang, 'savings_debt_payoff', { duration: this.duration(plan.months, lang), date: this.monthLabel(today, plan.months) })];
      if (plan.totalInterest >= 0.5) lines.push(this.t(lang, 'savings_debt_total_interest', { amount: this.money(plan.totalInterest, currency) }));
      return lines;
    }
    if (plan.reason === 'too_long') return [this.t(lang, 'savings_debt_too_long')];
    // Платёж должен быть больше процентов за месяц — округляем вверх, чтобы «больше X» точно хватало
    const interest = this.formatter.formatAmount(Math.ceil(plan.interest), currency);
    if (plan.reason === 'below_interest') return [this.t(lang, 'savings_debt_below_interest', { amount: interest })];
    return [plan.interest > 0
      ? this.t(lang, 'savings_debt_no_payment_interest', { amount: interest })
      : this.t(lang, 'savings_debt_no_payment')];
  }

  async goalLines(lines, goal, state, lang) {
    const { currency, today } = state;
    const status = await this.savingsService.goalStatus(goal, state);
    lines.push(`🎯 *${this.potName(goal, lang)}*`);
    lines.push(this.t(lang, goal.goal_mode === 'own' ? 'savings_mode_own_line' : 'savings_mode_total_line'));
    lines.push(this.t(lang, 'savings_goal_progress', { current: this.money(status.current, currency), target: this.money(status.target, currency) }));
    const percent = Math.min(100, Math.floor(status.ratio * 100));
    lines.push(`${this.formatter.progressBar(status.ratio)} ${percent}%${status.achieved ? '' : ` · ${this.t(lang, 'savings_goal_left', { amount: this.money(status.left, currency) })}`}`);
    if (goal.target_date) {
      let left = this.t(lang, 'savings_deadline_passed');
      if (status.monthsLeft > 0) left = this.t(lang, 'savings_deadline_left', { duration: this.duration(status.monthsLeft, lang) });
      else if (goal.target_date >= today) left = this.t(lang, 'savings_deadline_soon');
      lines.push(this.t(lang, 'savings_goal_deadline', { date: this.formatter.formatLocalDate(goal.target_date), left }));
    }
    if (status.achieved) {
      lines.push('', this.t(lang, 'savings_goal_achieved'));
      return;
    }

    lines.push('');
    if (state.monthly === null) {
      lines.push(this.t(lang, 'savings_monthly_unknown'));
    } else if (status.etaNominal === null) {
      lines.push(this.t(lang, 'savings_goal_unreachable', { amount: this.money(state.monthly, currency) }));
    } else {
      lines.push(this.t(lang, 'savings_goal_eta', {
        amount: this.money(state.monthly, currency),
        duration: this.duration(status.etaNominal, lang),
        date: this.monthLabel(today, status.etaNominal)
      }));
      if (status.etaReal !== null && status.etaReal !== status.etaNominal) {
        lines.push(this.t(lang, 'savings_goal_eta_real', { duration: this.duration(status.etaReal, lang) }));
      } else if (state.settings.inflationRate > 0 && status.etaReal === null) {
        lines.push(this.t(lang, 'savings_goal_eta_real_never'));
      }
      if (goal.goal_mode === 'own') lines.push(this.t(lang, 'savings_goal_own_assumption'));
    }
    if (status.requiredNominal !== null) {
      let line = this.t(lang, 'savings_goal_required', { amount: this.money(status.requiredNominal, currency) });
      if (status.requiredReal !== null) line += ` ${this.t(lang, 'savings_goal_required_real', { amount: this.money(status.requiredReal, currency) })}`;
      lines.push(line);
    }
  }

  // Подсказка ввода с кнопкой отмены (возврат на cancelCallback); extraRows — дополнительные кнопки,
  // cancelText — своя надпись вместо «Отмена» (например, «Пропустить»)
  async prompt(ctx, lang, text, state, cancelCallback, extraRows = [], cancelText = null) {
    this.stateService.setUserState(ctx.from.id, state);
    await this.answer(ctx);
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [...extraRows, [{ text: cancelText || this.t(lang, 'button_cancel'), callback_data: cancelCallback }]] }
    });
  }

  // callback: svd|<id>, svw|<id>, svs|<id> — пополнить, снять, точная сумма
  async startBalanceInput(ctx, op) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const pot = await this.savingsService.getPot(userId, parseInt(ctx.match[1], 10));
    if (!pot || pot.kind === 'debt' || (pot.kind === 'goal' && pot.goal_mode !== 'own')) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const key = { dep: 'savings_prompt_deposit', wd: 'savings_prompt_withdraw', set: 'savings_prompt_set' }[op];
    const text = this.t(lang, key, { name: this.potName(pot, lang), amount: this.exact(Number(pot.balance), pot.currency) });
    await this.prompt(ctx, lang, text, `sv_in:${op}:${pot.id}`, pot.kind === 'general' && Number(pot.balance) === 0 ? 'sv' : `svp|${pot.id}`);
  }

  // callback: svt|<id> — куда перевести
  async chooseTransferTarget(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const fromId = parseInt(ctx.match[1], 10);
    const state = await this.savingsService.getState(userId);
    const from = state.pots.find(p => p.id === fromId);
    if (!from || from.kind === 'debt') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const targets = state.pots.filter(p => p.id !== fromId && p.kind !== 'debt' && (p.kind !== 'goal' || p.goal_mode === 'own'));
    const keyboard = targets.map(p => [{ text: `${this.potIcon(p)} ${this.potButtonName(p, lang)}`, callback_data: `svtt|${fromId}|${p.id}` }]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: `svp|${fromId}` }]);
    await respond(ctx, this.t(lang, 'savings_transfer_choose', { name: this.potName(from, lang), amount: this.exact(from.balance, from.currency) }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // callback: svtt|<from>|<to>
  async startTransfer(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const [fromId, toId] = [parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10)];
    const [from, to] = await Promise.all([this.savingsService.getPot(userId, fromId), this.savingsService.getPot(userId, toId)]);
    if (!from || !to || [from, to].some(p => p.kind === 'debt')) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const text = this.t(lang, 'savings_prompt_transfer', {
      from: this.potName(from, lang), to: this.potName(to, lang), amount: this.exact(Number(from.balance), from.currency)
    });
    await this.prompt(ctx, lang, text, `sv_in:tr:${fromId}:${toId}`, `svp|${fromId}`);
  }

  // callback: sva — новый счёт («Наличные USD», «Вклад 16%»)
  async startNewAccount(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const currency = await this.userService.getUserCurrency(userId);
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_account', { currency }), 'sv_in:acc', 'sv');
  }

  // callback: svbn — новый долг («Ипотека 3 500 000 12%», «Долг Пете 15000»), до 10 бесплатно
  async startNewDebt(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const state = await this.savingsService.getState(userId);
    if (state.debts.length >= MAX_DEBTS) return this.showMenu(ctx, this.t(lang, 'savings_debt_limit', { limit: MAX_DEBTS }));
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_debt', { currency: state.currency }), 'sv_in:debt', 'sv');
  }

  // Долг по callback ctx.match[1]; иначе — экран «не найдено»
  async debtFromCallback(ctx, lang) {
    const pot = await this.savingsService.getPot(ctx.from.id, parseInt(ctx.match[1], 10));
    if (pot && pot.kind === 'debt') return pot;
    await this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    return null;
  }

  // callback: svbp|svbi|svbs|svbm|svbr|svbe <id> — погасить, увеличить, точная сумма, платёж в месяц, ставка, название
  async startDebtInput(ctx, op) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const debt = await this.debtFromCallback(ctx, lang);
    if (!debt) return;
    const name = this.potName(debt, lang);
    const amount = this.exact(Number(debt.balance), debt.currency);
    const [key, params] = {
      bpay: ['savings_prompt_debt_pay', { name, amount }],
      binc: ['savings_prompt_debt_increase', { name, amount }],
      bset: ['savings_prompt_debt_set', { name, amount }],
      bpm: ['savings_prompt_debt_payment', { name, currency: debt.currency }],
      brate: ['savings_prompt_debt_rate', { name, max: RATE_LIMITS.y }],
      bname: ['savings_prompt_account_name', { name }]
    }[op];
    const extra = op === 'bpm' && debt.monthly_payment !== null
      ? [[{ text: this.t(lang, 'savings_button_debt_no_payment'), callback_data: `svbmn|${debt.id}` }]]
      : [];
    await this.prompt(ctx, lang, this.t(lang, key, params), `sv_in:${op}:${debt.id}`, `svb|${debt.id}`, extra);
  }

  // callback: svbmn|<id> — убрать платёж в месяц
  async clearDebtPayment(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const debt = await this.savingsService.updateDebt(ctx.from.id, parseInt(ctx.match[1], 10), { monthly_payment: null });
    if (!debt) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    await this.showDebt(ctx, debt.id, this.t(lang, 'savings_setting_saved'));
  }

  // callback: svbx|<id> — подтверждение удаления долга (деньги никуда не переходят)
  async confirmDeleteDebt(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await this.answer(ctx);
    const debt = await this.debtFromCallback(ctx, lang);
    if (!debt) return;
    await respond(ctx, this.t(lang, 'savings_debt_delete_confirm', { name: this.potName(debt, lang) }), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: this.t(lang, 'savings_button_goal_delete_yes'), callback_data: `svbxc|${debt.id}` },
          { text: this.t(lang, 'button_back'), callback_data: `svb|${debt.id}` }
        ]]
      }
    });
  }

  // callback: svbxc|<id>
  async deleteDebt(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const debt = await this.savingsService.deleteDebt(ctx.from.id, parseInt(ctx.match[1], 10));
    if (!debt) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    await this.showMenu(ctx, this.t(lang, 'savings_debt_deleted', { name: this.formatter.escapeMarkdown(debt.name) }));
  }

  // Счёт или общая копилка по callback ctx.match[1]; иначе — экран «не найдено»
  async accountFromCallback(ctx, lang) {
    const pot = await this.savingsService.getPot(ctx.from.id, parseInt(ctx.match[1], 10));
    if (pot && (pot.kind === 'general' || pot.kind === 'account')) return pot;
    await this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    return null;
  }

  // callback: svpy|<id> — своя ставка счёта
  async startAccountYield(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    const extra = pot.yield_rate !== null ? [[{ text: this.t(lang, 'savings_button_account_yield_default'), callback_data: `svpyd|${pot.id}` }]] : [];
    const text = this.t(lang, 'savings_prompt_account_yield', { name: this.potName(pot, lang), max: RATE_LIMITS.y });
    await this.prompt(ctx, lang, text, `sv_in:pyield:${pot.id}`, `svp|${pot.id}`, extra);
  }

  // callback: svpyd|<id> — ставка как в параметрах прогноза
  async clearAccountYield(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    this.stateService.deleteUserState(ctx.from.id);
    await this.savingsService.updateAccount(ctx.from.id, pot.id, { yield_rate: null });
    await this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved'));
  }

  // callback: svpn|<id> — название счёта
  async startAccountName(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_account_name', { name: this.potName(pot, lang) }), `sv_in:name:${pot.id}`, `svp|${pot.id}`);
  }

  // callback: svpx|<id> — подтверждение удаления счёта (общую копилку удалить нельзя)
  async confirmDeleteAccount(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await this.answer(ctx);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    if (pot.kind !== 'account') return this.showPot(ctx, pot.id);
    let text = this.t(lang, 'savings_account_delete_confirm', { name: this.potName(pot, lang) });
    if (Number(pot.balance) > 0) text += `\n${this.t(lang, 'savings_goal_delete_moves', { amount: this.exact(Number(pot.balance), pot.currency) })}`;
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: this.t(lang, 'savings_button_goal_delete_yes'), callback_data: `svpxc|${pot.id}` },
          { text: this.t(lang, 'button_back'), callback_data: `svp|${pot.id}` }
        ]]
      }
    });
  }

  // callback: svpxc|<id>
  async deleteAccount(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.savingsService.deleteAccount(userId, parseInt(ctx.match[1], 10));
    if (!result) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    let notice = this.t(lang, 'savings_account_deleted', { name: this.formatter.escapeMarkdown(result.pot.name) });
    if (result.moved > 0) notice += `\n${this.t(lang, 'savings_moved_to_general', { amount: this.exact(result.moved, result.pot.currency) })}`;
    await this.showMenu(ctx, notice);
  }

  // callback: svgn — новая цель (1 бесплатно, больше — премиум)
  async startNewGoal(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const [limits, state] = await Promise.all([this.premiumService.getUserLimits(userId), this.savingsService.getState(userId)]);
    if (state.goals.length >= limits.MAX_SAVINGS_GOALS) return this.showGoalLimit(ctx, lang, limits.MAX_SAVINGS_GOALS);
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_goal', { currency: state.currency }), 'sv_in:goal', 'sv');
  }

  async showGoalLimit(ctx, lang, limit) {
    await this.answer(ctx);
    const isPremium = await this.premiumService.isPremiumUser(ctx.from.id);
    const keyboard = isPremium ? [] : [[{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]];
    keyboard.push(this.backToSavings(lang));
    await respond(ctx, this.t(lang, isPremium ? 'savings_goal_limit_premium' : 'savings_goal_limit_regular', { limit }), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // callback: svga|<id> — сумма (и название) цели
  async startGoalTarget(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const goal = await this.savingsService.getPot(userId, parseInt(ctx.match[1], 10));
    if (!goal || goal.kind !== 'goal') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const text = this.t(lang, 'savings_prompt_goal_target', {
      name: this.potName(goal, lang), amount: this.exact(Number(goal.target_amount), goal.currency)
    });
    await this.prompt(ctx, lang, text, `sv_in:target:${goal.id}`, `svp|${goal.id}`);
  }

  // callback: svgd|<id> — срок цели
  async startGoalDate(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const goal = await this.savingsService.getPot(userId, parseInt(ctx.match[1], 10));
    if (!goal || goal.kind !== 'goal') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const extra = goal.target_date ? [[{ text: this.t(lang, 'savings_button_no_deadline'), callback_data: `svgdn|${goal.id}` }]] : [];
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_goal_date', { name: this.potName(goal, lang) }), `sv_in:date:${goal.id}`, `svp|${goal.id}`, extra);
  }

  // callback: svgdn|<id> — убрать срок
  async clearGoalDate(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const goalId = parseInt(ctx.match[1], 10);
    const result = await this.savingsService.updateGoal(userId, goalId, { target_date: null });
    if (!result) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    await this.showPot(ctx, goalId, this.t(lang, 'savings_deadline_removed'));
  }

  // callback: svgm|<id> — своя копилка ↔ от всех накоплений
  async toggleGoalMode(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const goalId = parseInt(ctx.match[1], 10);
    const goal = await this.savingsService.getPot(userId, goalId);
    if (!goal || goal.kind !== 'goal') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const mode = goal.goal_mode === 'own' ? 'total' : 'own';
    const result = await this.savingsService.setGoalMode(userId, goalId, mode);
    if (!result) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    let notice = this.t(lang, mode === 'own' ? 'savings_mode_set_own' : 'savings_mode_set_total');
    if (result.moved > 0) notice += `\n${this.t(lang, 'savings_moved_to_general', { amount: this.exact(result.moved, goal.currency) })}`;
    await this.showPot(ctx, goalId, this.withAchievements(notice, result.achieved, lang));
  }

  // callback: svgx|<id> — подтверждение удаления
  async confirmDeleteGoal(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const goal = await this.savingsService.getPot(userId, parseInt(ctx.match[1], 10));
    if (!goal || goal.kind !== 'goal') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    let text = this.t(lang, 'savings_goal_delete_confirm', { name: this.potName(goal, lang) });
    if (Number(goal.balance) > 0) text += `\n${this.t(lang, 'savings_goal_delete_moves', { amount: this.exact(Number(goal.balance), goal.currency) })}`;
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: this.t(lang, 'savings_button_goal_delete_yes'), callback_data: `svgxc|${goal.id}` },
          { text: this.t(lang, 'button_back'), callback_data: `svp|${goal.id}` }
        ]]
      }
    });
  }

  // callback: svgxc|<id>
  async deleteGoal(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const result = await this.savingsService.deleteGoal(userId, parseInt(ctx.match[1], 10));
    if (!result) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    let notice = this.t(lang, 'savings_goal_deleted', { name: this.formatter.escapeMarkdown(result.pot.name) });
    if (result.moved > 0) notice += `\n${this.t(lang, 'savings_moved_to_general', { amount: this.exact(result.moved, result.pot.currency) })}`;
    await this.showMenu(ctx, notice);
  }

  // callback: svf — прогноз по горизонтам
  async showForecast(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { currency, settings } = state;
    const lines = [this.t(lang, 'savings_forecast_title'), ''];
    lines.push(this.t(lang, 'savings_now', { amount: this.money(state.total, currency) }));
    lines.push(this.monthlyLine(state, lang));
    const ratesLine = this.ratesLine(state, lang);
    if (ratesLine) lines.push(ratesLine);
    if (state.debts.length) {
      lines.push(this.t(lang, 'savings_forecast_debts_now', { amount: this.money(state.debtTotal, currency), net: this.money(state.netWorth, currency) }));
    }

    const horizon = Math.max(...FORECAST_HORIZONS);
    const debtPoints = state.debts.length ? this.projectDebts(state.debts, horizon) : null;
    let points = null;
    let depletedAt = null;
    if (state.monthly === null) {
      lines.push('', this.t(lang, 'savings_forecast_need_monthly'));
    } else {
      ({ points, depletedAt } = simulate({ parts: state.parts, monthly: state.monthly, ...this.rates(state), months: horizon }));
    }
    if (points || debtPoints) {
      const showGrowth = settings.yieldRate > 0 || settings.contributionGrowth > 0 || state.accounts.some(a => a.yield_rate > 0);
      for (const months of FORECAST_HORIZONS) {
        lines.push('', `*${this.t(lang, `savings_horizon_${months}`)}*`);
        if (points) {
          const point = points[months];
          lines.push(`• ${this.t(lang, 'savings_forecast_simple', { amount: this.money(point.simple, currency) })}`);
          if (showGrowth) lines.push(`• ${this.t(lang, 'savings_forecast_nominal', { amount: this.money(point.nominal, currency) })}`);
          if (settings.inflationRate > 0) lines.push(`• ${this.t(lang, 'savings_forecast_real', { amount: this.money(point.real, currency) })}`);
        }
        if (debtPoints) {
          lines.push(`• ${this.t(lang, 'savings_forecast_debts', { amount: this.money(debtPoints[months], currency) })}`);
          if (points) lines.push(`• ${this.t(lang, 'savings_forecast_net_worth', { amount: this.money(points[months].nominal - debtPoints[months], currency) })}`);
        }
      }
      if (depletedAt !== null) lines.push('', this.t(lang, 'savings_forecast_depleted', { duration: this.duration(depletedAt, lang) }));
      if (points) lines.push('', this.t(lang, 'savings_forecast_legend'));
      if (debtPoints) lines.push('', this.t(lang, 'savings_forecast_debts_note'));
    }

    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'savings_button_settings'), callback_data: 'svo' }], this.backToSavings(lang)] }
    });
  }

  // Сколько останется должен по месяцам 0..months (основная валюта по текущему курсу): каждый долг — по своей
  // ставке и плановому платежу
  projectDebts(debts, months) {
    const total = new Array(months + 1).fill(0);
    for (const debt of debts) {
      if (debt.balance <= 0) continue;
      const fx = debt.balanceMain / debt.balance; // курс валюты долга к основной
      const points = projectDebt({ balance: debt.balance, rate: debt.yield_rate, payment: debt.monthly_payment, months });
      points.forEach((owed, k) => { total[k] += owed * fx; });
    }
    return total;
  }

  percent(value) {
    return String(value).replace('.', ',');
  }

  // Ставки из параметров одной строкой. Ничего не задано — подсказка, но не если у счетов есть свои ставки
  ratesLine(state, lang) {
    const { settings } = state;
    const parts = [];
    if (settings.yieldRate > 0) parts.push(this.t(lang, 'savings_rate_yield_short', { value: this.percent(settings.yieldRate) }));
    if (settings.inflationRate > 0) parts.push(this.t(lang, 'savings_rate_inflation_short', { value: this.percent(settings.inflationRate) }));
    if (settings.contributionGrowth > 0) parts.push(this.t(lang, 'savings_rate_growth_short', { value: this.percent(settings.contributionGrowth) }));
    if (parts.length) return `⚙️ ${parts.join(' · ')}`;
    return state.accounts.some(a => a.yield_rate !== null) ? null : this.t(lang, 'savings_rates_not_set');
  }

  // callback: svo — параметры прогноза
  async showSettings(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { settings } = state;
    const rate = (value, key) => (value > 0 ? this.t(lang, key, { value: this.percent(value) }) : this.t(lang, 'savings_rate_not_set'));
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.t(lang, 'savings_settings_title'), '');
    lines.push(this.monthlyLine(state, lang));
    lines.push(`${this.t(lang, 'savings_setting_yield')}: ${rate(settings.yieldRate, 'savings_rate_yearly')}`);
    lines.push(`${this.t(lang, 'savings_setting_inflation')}: ${rate(settings.inflationRate, 'savings_rate_yearly')}`);
    lines.push(`${this.t(lang, 'savings_setting_growth')}: ${rate(settings.contributionGrowth, 'savings_rate_yearly')}`);
    lines.push('', this.t(lang, 'savings_settings_hint'));

    const monthlyRow = [{ text: this.t(lang, 'savings_button_monthly'), callback_data: 'svo|m' }];
    if (settings.manualMonthly !== null) monthlyRow.push({ text: this.t(lang, 'savings_button_monthly_auto'), callback_data: 'svo|ma' });
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          monthlyRow,
          [
            { text: this.t(lang, 'savings_setting_yield'), callback_data: 'svo|y' },
            { text: this.t(lang, 'savings_setting_inflation'), callback_data: 'svo|i' }
          ],
          [{ text: this.t(lang, 'savings_setting_growth'), callback_data: 'svo|g' }],
          this.backToSavings(lang)
        ]
      }
    });
  }

  // callback: svo|m, svo|ma, svo|i, svo|y, svo|g
  async settingsAction(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const action = ctx.match[1];
    if (action === 'ma') {
      await this.savingsService.updateSettings(userId, { monthly_contribution: null });
      return this.showSettings(ctx, this.t(lang, 'savings_monthly_auto_set'));
    }
    if (action === 'm') {
      const currency = await this.userService.getUserCurrency(userId);
      return this.prompt(ctx, lang, this.t(lang, 'savings_prompt_monthly', { currency }), 'sv_in:m', 'svo',
        [[{ text: this.t(lang, 'savings_button_monthly_auto'), callback_data: 'svo|ma' }]]);
    }
    const key = { i: 'savings_prompt_inflation', y: 'savings_prompt_yield', g: 'savings_prompt_growth' }[action];
    await this.prompt(ctx, lang, this.t(lang, key, { max: RATE_LIMITS[action] }), `sv_in:rate:${action}`, 'svo');
  }

  withAchievements(notice, achieved, lang) {
    const lines = notice ? [notice] : [];
    for (const goal of achieved || []) {
      lines.push(this.t(lang, 'savings_goal_achieved_notice', { name: this.formatter.escapeMarkdown(goal.name) }));
    }
    return lines.join('\n') || null;
  }

  // Сумма из ввода в валюте currency: "15000", "15 000", "100 USD". allowZero — для точной суммы и взноса.
  // null — ввод не понят
  async parseAmount(text, currency, allowZero) {
    if (allowZero && ZERO.test(text)) return 0;
    const parsed = this.validator.parseMoneyInput(text, { maxAmount: MAX_SAVINGS_AMOUNT, maxDescriptionLength: 60, requireDescription: false });
    if (!parsed.isValid || parsed.description) return null;
    if (!parsed.currency || parsed.currency === currency) return parsed.amount;
    const converted = await this.savingsService.toCurrency(parsed.amount, parsed.currency, currency);
    return Math.round(converted * 100) / 100;
  }

  // 'MM.YYYY' → последний день месяца, 'DD.MM.YYYY' → эта дата; только будущее. null — не понято
  parseDate(text, today) {
    const input = text.trim();
    let y, m, d;
    let match = input.match(/^(\d{1,2})[./](\d{4})$/);
    if (match) {
      m = Number(match[1]); y = Number(match[2]);
      d = new Date(Date.UTC(y, m, 0)).getUTCDate();
    } else {
      match = input.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
      if (!match) return null;
      d = Number(match[1]); m = Number(match[2]); y = Number(match[3]);
    }
    if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate() || y > 2100) return null;
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return date > today ? date : null;
  }

  // Ввод при состоянии sv_in:<op>:<параметры>
  async handleInput(ctx, text, lang, userState) {
    const userId = ctx.from.id;
    const [, op, a, b] = userState.split(':');
    const retry = (key, params) => ctx.reply(this.t(lang, key, params), { parse_mode: 'Markdown' });

    if (op === 'dep' || op === 'wd' || op === 'set') {
      const pot = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!pot) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      const amount = await this.parseAmount(text, pot.currency, op === 'set');
      if (amount === null) return retry('savings_error_amount');
      const kind = { dep: 'deposit', wd: 'withdraw', set: 'set' }[op];
      const result = await this.savingsService.changeBalance(userId, pot.id, kind, amount);
      if (result.error === 'insufficient') return retry('savings_error_insufficient', { amount: this.exact(Number(pot.balance), pot.currency) });
      if (result.error) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      const noticeKey = { dep: 'savings_deposited', wd: 'savings_withdrawn', set: 'savings_balance_set' }[op];
      const notice = this.t(lang, noticeKey, { amount: this.exact(op === 'set' ? Number(result.pot.balance) : amount, pot.currency) });
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.withAchievements(notice, result.achieved, lang)));
    }

    if (op === 'tr') {
      const from = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!from) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      const amount = await this.parseAmount(text, from.currency, false);
      if (amount === null) return retry('savings_error_amount');
      const result = await this.savingsService.transfer(userId, from.id, parseInt(b, 10), amount);
      if (result.error === 'insufficient') return retry('savings_error_insufficient', { amount: this.exact(Number(from.balance), from.currency) });
      if (result.error) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      const notice = this.t(lang, 'savings_transferred', {
        amount: this.exact(result.amountTo, result.to.currency),
        name: this.potName(result.to, lang)
      });
      return this.finish(ctx, lang, () => this.showPot(ctx, result.to.id, this.withAchievements(notice, result.achieved, lang)));
    }

    if (op === 'goal' || op === 'target') {
      const currency = op === 'goal'
        ? await this.userService.getUserCurrency(userId)
        : (await this.savingsService.getPot(userId, parseInt(a, 10)))?.currency;
      if (!currency) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      const parsed = this.validator.parseMoneyInput(text, {
        maxAmount: MAX_SAVINGS_AMOUNT, maxDescriptionLength: MAX_GOAL_NAME_LENGTH, requireDescription: op === 'goal'
      });
      if (!parsed.isValid) return retry(op === 'goal' ? 'savings_error_goal' : 'savings_error_amount');
      const target = parsed.currency && parsed.currency !== currency
        ? Math.round((await this.savingsService.toCurrency(parsed.amount, parsed.currency, currency)) * 100) / 100
        : parsed.amount;
      if (op === 'goal') {
        const result = await this.savingsService.createGoal(userId, { name: parsed.description, targetAmount: target, currency });
        if (result.error === 'limit') return this.finish(ctx, lang, () => this.showGoalLimit(ctx, lang, result.limit));
        return this.finish(ctx, lang, () => this.showPot(ctx, result.goal.id, this.t(lang, 'savings_goal_created')));
      }
      const fields = { target_amount: target };
      if (parsed.description) fields.name = parsed.description;
      const result = await this.savingsService.updateGoal(userId, parseInt(a, 10), fields);
      if (!result) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      return this.finish(ctx, lang, () => this.showPot(ctx, result.goal.id, this.withAchievements(this.t(lang, 'savings_goal_updated'), result.achieved, lang)));
    }

    if (op === 'date') {
      const { today } = await this.savingsService.getState(userId);
      const date = this.parseDate(text, today);
      if (!date) return retry('savings_error_date');
      const result = await this.savingsService.updateGoal(userId, parseInt(a, 10), { target_date: date });
      if (!result) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      return this.finish(ctx, lang, () => this.showPot(ctx, result.goal.id, this.t(lang, 'savings_deadline_set', { date: this.formatter.formatLocalDate(date) })));
    }

    if (op === 'm') {
      const currency = await this.userService.getUserCurrency(userId);
      const amount = await this.parseAmount(text, currency, true);
      if (amount === null) return retry('savings_error_amount');
      await this.savingsService.updateSettings(userId, { monthly_contribution: amount });
      return this.finish(ctx, lang, () => this.showSettings(ctx, this.t(lang, 'savings_monthly_set', { amount: this.money(amount, currency) })));
    }

    if (op === 'rate' && RATE_COLUMNS[a]) {
      const value = this.parseRate(text, RATE_LIMITS[a]);
      if (value === null) return retry('savings_error_rate', { max: RATE_LIMITS[a] });
      await this.savingsService.updateSettings(userId, { [RATE_COLUMNS[a]]: value === 0 ? null : value });
      return this.finish(ctx, lang, () => this.showSettings(ctx, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'acc') {
      const currency = await this.userService.getUserCurrency(userId);
      const parsed = this.parseAccountInput(text, currency);
      if (!parsed) return retry('savings_error_account');
      const result = await this.savingsService.createAccount(userId, parsed);
      if (result.error === 'limit') {
        return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_account_limit', { limit: result.limit })));
      }
      // Сразу спрашиваем, сколько на счёте: без суммы счёт бесполезен
      const name = this.potName(result.pot, lang);
      const prompt = `${this.t(lang, 'savings_account_created', { name })}\n\n${this.t(lang, 'savings_prompt_set', { name, amount: this.exact(0, result.pot.currency) })}`;
      return this.prompt(ctx, lang, prompt, `sv_in:set:${result.pot.id}`, `svp|${result.pot.id}`);
    }

    if (op === 'pyield') {
      const value = this.parseRate(text, RATE_LIMITS.y);
      if (value === null) return retry('savings_error_rate', { max: RATE_LIMITS.y });
      // 0 — осознанно «без процентов» (наличные), в отличие от «как в параметрах» (NULL)
      const pot = await this.savingsService.updateAccount(userId, parseInt(a, 10), { yield_rate: value });
      if (!pot) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'name') {
      const name = this.parseName(text);
      if (!name) return retry('savings_error_name', { max: MAX_GOAL_NAME_LENGTH });
      const pot = await this.savingsService.updateAccount(userId, parseInt(a, 10), { name });
      if (!pot) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'debt') {
      const currency = await this.userService.getUserCurrency(userId);
      const parsed = this.parseDebtInput(text, currency);
      if (!parsed) return retry('savings_error_debt');
      const result = await this.savingsService.createDebt(userId, parsed);
      if (result.error === 'limit') {
        return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_debt_limit', { limit: result.limit })));
      }
      // Сразу спрашиваем платёж в месяц — по нему считается срок погашения; можно пропустить
      const name = this.potName(result.debt, lang);
      const prompt = `${this.t(lang, 'savings_debt_created', { name })}\n\n${this.t(lang, 'savings_prompt_debt_payment', { name, currency: result.debt.currency })}`;
      return this.prompt(ctx, lang, prompt, `sv_in:bpm:${result.debt.id}`, `svb|${result.debt.id}`, [], this.t(lang, 'savings_button_skip'));
    }

    if (['bpay', 'binc', 'bset', 'bpm', 'brate', 'bname'].includes(op)) {
      const debt = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!debt || debt.kind !== 'debt') return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
      return this.handleDebtInput(ctx, text, lang, op, debt, retry);
    }

    this.stateService.deleteUserState(userId);
  }

  // Ввод для долга: погасить / увеличить / точная сумма / платёж в месяц / ставка / название
  async handleDebtInput(ctx, text, lang, op, debt, retry) {
    const userId = ctx.from.id;
    const notFound = () => this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
    const saved = (updated) => (updated
      ? this.finish(ctx, lang, () => this.showDebt(ctx, updated.id, this.t(lang, 'savings_setting_saved')))
      : notFound());

    if (op === 'bpay' || op === 'binc' || op === 'bset') {
      const amount = await this.parseAmount(text, debt.currency, op === 'bset');
      if (amount === null) return retry('savings_error_amount');
      const kind = { bpay: 'pay', binc: 'increase', bset: 'set' }[op];
      const result = await this.savingsService.changeDebt(userId, debt.id, kind, amount);
      if (result.error === 'insufficient') return retry('savings_debt_error_overpay', { amount: this.exact(Number(debt.balance), debt.currency) });
      if (result.error) return notFound();
      const key = { pay: 'savings_debt_paid', increase: 'savings_debt_increased', set: 'savings_debt_set' }[kind];
      const notice = this.t(lang, key, { amount: this.exact(kind === 'set' ? Number(result.pot.balance) : amount, debt.currency) });
      return this.finish(ctx, lang, () => this.showDebt(ctx, debt.id, notice));
    }

    if (op === 'bpm') {
      const amount = await this.parseAmount(text, debt.currency, true);
      if (amount === null) return retry('savings_error_amount');
      return saved(await this.savingsService.updateDebt(userId, debt.id, { monthly_payment: amount === 0 ? null : amount }));
    }

    if (op === 'brate') {
      const value = this.parseRate(text, RATE_LIMITS.y);
      if (value === null) return retry('savings_error_rate', { max: RATE_LIMITS.y });
      return saved(await this.savingsService.updateDebt(userId, debt.id, { yield_rate: value === 0 ? null : value }));
    }

    const name = this.parseName(text);
    if (!name) return retry('savings_error_name', { max: MAX_GOAL_NAME_LENGTH });
    return saved(await this.savingsService.updateDebt(userId, debt.id, { name }));
  }

  // «8», «7,5», «16%» → число в [0, max]; null — не понято
  parseRate(text, max) {
    const match = text.trim().match(/^(\d{1,3}(?:[.,]\d{1,2})?)\s*%?$/);
    const value = match ? Number(match[1].replace(',', '.')) : NaN;
    return value >= 0 && value <= max ? value : null;
  }

  // Название счёта или цели: 1..60 символов, без недопустимого содержимого
  parseName(text) {
    const name = text.trim();
    if (!name || name.length > MAX_GOAL_NAME_LENGTH) return null;
    if (!this.validator.validateDescription(name, MAX_GOAL_NAME_LENGTH).isValid) return null;
    return this.validator.sanitizeText(name, MAX_GOAL_NAME_LENGTH);
  }

  // «Наличные USD», «Вклад 16%», «$ под подушкой», «Крипта USDT»: валюта (код или символ) и ставка «N%» —
  // в любом месте, остальное — название. Без валюты — основная, без ставки — как в параметрах.
  parseAccountInput(text, defaultCurrency) {
    let currency = null;
    let yieldRate = null;
    const words = [];
    for (const token of text.trim().split(/\s+/)) {
      const rate = /^\d{1,3}(?:[.,]\d{1,2})?%$/.test(token) ? this.parseRate(token, RATE_LIMITS.y) : null;
      const tokenCurrency = currency ? null : this.validator.resolveCurrencyToken(token === 'USDT' || token === 'usdt' ? 'USD' : token);
      if (rate !== null && yieldRate === null) yieldRate = rate;
      else if (tokenCurrency) currency = tokenCurrency;
      else words.push(token);
    }
    const name = this.parseName(words.join(' '));
    if (!name) return null;
    return { name, currency: currency || defaultCurrency, yieldRate };
  }

  // «Ипотека 3 500 000 12%», «Кредитка 45000 29,9%», «Долг Пете 15000», «Рассрочка USD 1200»: сумма (тысячи можно
  // через пробел), валюта (код или символ) и ставка «N%» — в любом месте, остальное — название.
  // Без валюты — основная, без ставки (или 0%) — без процентов. null — не понято
  parseDebtInput(text, defaultCurrency) {
    // «$1200», «45000₽» — символ валюты вплотную к сумме
    const tokens = text.trim().split(/\s+/).flatMap((token) => {
      const match = token.match(/^([$€₽₸₾₺₹฿])(\d[\d.,]*)$/u) || token.match(/^(\d[\d.,]*)([$€₽₸₾₺₹฿])$/u);
      return match ? [match[1], match[2]] : [token];
    });
    let currency = null;
    let rate = null;
    const rest = [];
    for (const token of tokens) {
      const tokenRate = /^\d{1,3}(?:[.,]\d{1,2})?%$/.test(token) ? this.parseRate(token, RATE_LIMITS.y) : null;
      const tokenCurrency = currency ? null : this.validator.resolveCurrencyToken(token);
      if (tokenRate !== null && rate === null) rate = tokenRate;
      else if (tokenCurrency) currency = tokenCurrency;
      else rest.push(token);
    }
    // Сумма — последнее число вместе с группами тысяч перед ним («3 500 000»)
    let end = rest.length - 1;
    while (end >= 0 && !DEBT_NUMBER.test(rest[end])) end--;
    if (end < 0) return null;
    let start = end;
    while (start > 0 && DEBT_AMOUNT.test(rest.slice(start - 1, end + 1).join(' '))) start--;
    // «Ипотека 3 500 000 12» (забыт %): число сразу после группы тысяч — непонятно, где сумма
    if (start > 0 && /^\d{3}$/.test(rest[start - 1])) return null;
    const amount = parseFloat(rest.slice(start, end + 1).join('').replace(',', '.'));
    if (!(amount > 0) || amount > MAX_SAVINGS_AMOUNT) return null;
    const name = this.parseName([...rest.slice(0, start), ...rest.slice(end + 1)].join(' '));
    if (!name) return null;
    return { name, amount, currency: currency || defaultCurrency, rate: rate || null };
  }

  // Ввод принят (или потерял смысл): снимаем состояние и показываем экран
  async finish(ctx, lang, show) {
    this.stateService.deleteUserState(ctx.from.id);
    return show();
  }
}

SavingsHandlers.MAX_SAVINGS_AMOUNT = MAX_SAVINGS_AMOUNT;

module.exports = SavingsHandlers;
