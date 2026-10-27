const respond = require('../utils/respond');
const { simulate } = require('../utils/savingsForecast');
const { amortize, projectDebt } = require('../utils/debtForecast');
const { compactAmount, commaDecimal, currencySymbol, potIcon, updateQueue, UpdateWizards } = require('../utils/savingsView');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');
const { MAX_DEBTS } = require('../services/SavingsService');

const MAX_SAVINGS_AMOUNT = 9999999999; // savings_pots.balance DECIMAL(14,2) с запасом на пополнения
const MAX_GOAL_NAME_LENGTH = 60;
const BUTTON_NAME_LENGTH = 16; // название на кнопке главного экрана — рядом ещё сумма
const RATE_LIMITS = { i: 300, y: 300, g: 100 }; // проценты годовых: инфляция, доходность, рост взноса
const RATE_COLUMNS = { i: 'inflation_rate', y: 'yield_rate', g: 'contribution_growth' };
const FORECAST_HORIZONS = [6, 12, 36, 60, 120];
const ZERO = /^\s*0+(?:[.,]0+)?\s*$/;
const DEBT_NUMBER = /^\d+(?:[.,]\d{1,2})?$/;
const DEBT_AMOUNT = /^(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d{1,2})?$/;
const QUICK_CURRENCIES = ['USD', 'EUR', 'RUB'];

// Раздел «🏦 Накопления»: счета (общая копилка и свои), цели, долги, мастер «Обновить остатки», прогноз, настройки.
// Ввод текстом — состояние sv_in:<операция>:<параметры>, см. handleInput.
// Откуда вводили взнос в месяц (svm|<origin>): s — главный экран, f — прогноз, o — настройки, g<id> — цель.
class SavingsHandlers {
  constructor({ savingsService, userService, premiumService, localizationService, formatter, stateService, validator }) {
    this.savingsService = savingsService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.validator = validator;
    this.wizards = new UpdateWizards();
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

  // «1,53 млн ₽», «241 тыс ₽» — для кнопок и прогноза; в карточках — точные суммы
  compact(amount, currency, lang) {
    return compactAmount(amount, currency, {
      thousand: this.t(lang, 'savings_compact_thousand'),
      million: this.t(lang, 'savings_compact_million'),
      comma: commaDecimal(lang)
    });
  }

  percent(value) {
    return String(value).replace('.', ',');
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

  shortDate(date, timezone) {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', timeZone: timezone || 'UTC' }).format(new Date(date));
  }

  // Общая копилка без своего названия — «Общие накопления»
  potButtonName(pot, lang) {
    return pot.kind === 'general' && !pot.name ? this.t(lang, 'savings_general') : pot.name;
  }

  potName(pot, lang) {
    return this.formatter.escapeMarkdown(this.potButtonName(pot, lang));
  }

  async answer(ctx, text) {
    if (ctx.callbackQuery) await ctx.answerCbQuery(text).catch(() => {});
  }

  rates(state) {
    const { yieldRate, inflationRate, contributionGrowth } = state.settings;
    return { yieldRate, inflationRate, contributionGrowth };
  }

  backToSavings(lang) {
    return [{ text: this.t(lang, 'savings_button_back'), callback_data: 'sv' }];
  }

  monthlyButton(lang, origin) {
    return [{ text: this.t(lang, 'savings_button_set_monthly'), callback_data: `svm|${origin}` }];
  }

  // Одна короткая строка «сколько откладываешь в месяц»
  monthlyLine(state, lang) {
    const { settings, auto, monthly, currency } = state;
    if (settings.manualMonthly !== null) return this.t(lang, 'savings_monthly_manual', { amount: this.money(monthly, currency) });
    if (!auto) return this.t(lang, 'savings_monthly_unknown');
    if (auto.amount <= 0) return this.t(lang, 'savings_monthly_negative', { amount: this.money(-auto.amount, currency) });
    return this.t(lang, 'savings_monthly_auto', { amount: this.money(auto.amount, currency), n: auto.periods });
  }

  // Счета на экране: пустая общая копилка при своих счетах не показывается
  visibleAccounts(accounts) {
    return accounts.filter(a => !(a.kind === 'general' && a.balance === 0 && accounts.length > 1));
  }

  // «3 000 $ ≈ 285 000 ₽ · 16%»
  accountSummary(pot, currency) {
    let text = this.exact(pot.balance, pot.currency);
    if (pot.currency !== currency && pot.balance > 0) text += ` ≈ ${this.money(pot.balanceMain, currency)}`;
    if (pot.yield_rate > 0) text += ` · ${this.percent(pot.yield_rate)}%`;
    return text;
  }

  debtPlan(debt) {
    return amortize({ balance: debt.balance, rate: debt.yield_rate, payment: debt.monthly_payment });
  }

  // callback: sv, команда /savings. notice — строка сверху (результат действия)
  async showMenu(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { currency, accounts, goals, debts } = state;
    const lines = [];
    if (notice) lines.push(notice, '');

    if (state.total === 0 && !goals.length && !debts.length && accounts.length === 1) {
      lines.push(this.t(lang, 'savings_title'), '', this.t(lang, 'savings_intro'));
      return respond(ctx, lines.join('\n'), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: this.t(lang, 'savings_button_set_current'), callback_data: `svs|${accounts[0].id}` }],
            [{ text: this.t(lang, 'savings_button_add_account'), callback_data: 'sva' }],
            [{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]
          ]
        }
      });
    }

    lines.push(this.t(lang, 'savings_header', { amount: this.money(state.total, currency) }));
    if (debts.length) {
      lines.push(this.t(lang, 'savings_header_debts', { debts: this.money(state.debtTotal, currency), net: this.money(state.netWorth, currency) }));
    }
    const shown = this.visibleAccounts(accounts);
    if (shown.length) {
      lines.push('', `*${this.t(lang, 'savings_section_accounts')}*`);
      for (const pot of shown) lines.push(`${potIcon(pot)} ${this.potName(pot, lang)} — ${this.accountSummary(pot, currency)}`);
    }
    const statuses = new Map();
    for (const goal of goals) statuses.set(goal.id, await this.savingsService.goalStatus(goal, state));
    if (goals.length) {
      lines.push('', `*${this.t(lang, 'savings_section_goals')}*`);
      for (const goal of goals) {
        const status = statuses.get(goal.id);
        const percent = Math.min(100, Math.floor(status.ratio * 100));
        let line = `🎯 ${this.potName(goal, lang)} ${this.formatter.progressBar(status.ratio, 8)} ${percent}%`;
        if (status.achieved) line += ' ✅';
        else if (status.etaNominal !== null) line += ` · ≈ ${this.duration(status.etaNominal, lang)}`;
        lines.push(line);
      }
    }
    if (debts.length) {
      lines.push('', `*${this.t(lang, 'savings_section_debts')}*`);
      for (const debt of debts) {
        let line = `💳 ${this.potName(debt, lang)} — ${this.exact(debt.balance, debt.currency)}`;
        if (debt.yield_rate) line += ` · ${this.percent(debt.yield_rate)}%`;
        const plan = this.debtPlan(debt);
        if (plan.paidOff && plan.months === 0) line += ' ✅';
        else if (plan.paidOff) line += ` · ${this.t(lang, 'savings_debt_until', { date: this.monthLabel(state.today, plan.months) })}`;
        lines.push(line);
      }
    }

    lines.push('');
    if (state.monthly === null) {
      lines.push(this.t(lang, 'savings_monthly_unknown'));
    } else {
      const { points } = simulate({ parts: state.parts, monthly: state.monthly, ...this.rates(state), months: 12 });
      const amount = this.compact(points[12].nominal, currency, lang);
      lines.push(state.monthly >= 0
        ? this.t(lang, 'savings_main_year', { amount, monthly: this.money(state.monthly, currency) })
        : this.t(lang, 'savings_main_year_negative', { amount, monthly: this.money(-state.monthly, currency) }));
    }

    const keyboard = [];
    if (updateQueue(state).length) keyboard.push([{ text: this.t(lang, 'savings_button_update'), callback_data: 'svu' }]);
    const pots = [...shown, ...goals, ...debts];
    for (let i = 0; i < pots.length; i += 2) {
      keyboard.push(pots.slice(i, i + 2).map(pot => ({
        text: this.potButton(pot, statuses.get(pot.id), lang),
        callback_data: pot.kind === 'debt' ? `svb|${pot.id}` : `svp|${pot.id}`
      })));
    }
    if (state.monthly === null) keyboard.push(this.monthlyButton(lang, 's'));
    keyboard.push([
      { text: this.t(lang, 'savings_button_add'), callback_data: 'svn' },
      { text: this.t(lang, 'savings_button_forecast'), callback_data: 'svf' },
      { text: this.t(lang, 'savings_button_settings'), callback_data: 'svo' }
    ]);
    keyboard.push([{ text: this.t(lang, 'button_back'), callback_data: 'back_to_menu' }]);
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // «💵 Наличные · 3 000 $», «🎯 Машина · 63%», «💳 Кредит · 300 тыс ₽»
  potButton(pot, status, lang) {
    // В кнопке общей копилки без своего названия — короткое «Общие»: длинное не влезает в два столбца
    const label = pot.kind === 'general' && !pot.name ? this.t(lang, 'savings_general_short') : this.potButtonName(pot, lang);
    const name = this.formatter.shorten(label, BUTTON_NAME_LENGTH);
    let value;
    if (pot.kind === 'goal') value = status.achieved ? '✅' : `${Math.min(100, Math.floor(status.ratio * 100))}%`;
    else if (pot.kind === 'debt' && pot.balance === 0) value = '✅';
    else value = this.compact(pot.balance, pot.currency, lang);
    return `${potIcon(pot)} ${name} · ${value}`;
  }

  // callback: svn — что добавить
  async showAddMenu(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await this.answer(ctx);
    await respond(ctx, this.t(lang, 'savings_add_title'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'savings_button_add_kind_account'), callback_data: 'sva' },
            { text: this.t(lang, 'savings_button_add_kind_goal'), callback_data: 'svgn' },
            { text: this.t(lang, 'savings_button_add_kind_debt'), callback_data: 'svbn' }
          ],
          this.backToSavings(lang)
        ]
      }
    });
  }

  // callback: svp|<id> — карточка счёта или цели (долг — карточка долга). notice — строка сверху
  async showPot(ctx, potId = null, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const id = potId || parseInt(ctx.match[1], 10);
    const state = await this.savingsService.getState(userId);
    const pot = state.pots.find(p => p.id === id);
    if (!pot) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    if (pot.kind === 'debt') return this.debtCard(ctx, lang, pot, state, notice);
    if (pot.kind === 'goal') return this.goalCard(ctx, lang, pot, state, notice);
    return this.accountCard(ctx, lang, pot, state, notice);
  }

  // «Без процентов» | «16% годовых» | «Ставка как в настройках (8%)»
  rateLine(pot, state, lang) {
    if (pot.yield_rate === null && state.settings.yieldRate > 0) {
      return this.t(lang, 'savings_rate_default', { value: this.percent(state.settings.yieldRate) });
    }
    if (!pot.yield_rate) return this.t(lang, 'savings_rate_none');
    return this.t(lang, 'savings_rate_own', { value: this.percent(pot.yield_rate) });
  }

  // «💵 *Наличные* — 3 000 $ (≈ 285 000 ₽)»; icon — значок вместо значка счёта (⚙️ на экранах настроек)
  cardTitle(pot, state, lang, icon = potIcon(pot)) {
    let title = `${icon} *${this.potName(pot, lang)}* — ${this.exact(pot.balance, pot.currency)}`;
    if (pot.currency !== state.currency && pot.balance > 0) title += ` (≈ ${this.money(pot.balanceMain, state.currency)})`;
    return title;
  }

  // Последние 3 изменения (у долга «+» — долг вырос, «−» — погашено)
  operationLines(lines, operations, pot, timezone, lang) {
    if (!operations.length) return;
    lines.push('', this.t(lang, 'savings_recent_operations'));
    for (const op of operations) {
      const amount = Number(op.amount);
      const sign = amount >= 0 ? '+' : '−';
      lines.push(`${sign}${this.exact(Math.abs(amount), pot.currency)} · ${this.formatter.formatShortDateTime(op.created_at, timezone)}`);
    }
  }

  ownPots(state) {
    return state.pots.filter(p => p.kind !== 'debt' && (p.kind !== 'goal' || p.goal_mode === 'own'));
  }

  async accountCard(ctx, lang, pot, state, notice) {
    const userId = ctx.from.id;
    const [operations, timezone] = await Promise.all([
      this.savingsService.getRecentOperations(userId, pot.id),
      this.userService.getUserTimezone(userId)
    ]);
    const updated = this.shortDate(operations[0] ? operations[0].created_at : pot.created_at, timezone);
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.cardTitle(pot, state, lang));
    lines.push(`${this.rateLine(pot, state, lang)} · ${this.t(lang, 'savings_updated', { date: updated })}`);
    this.operationLines(lines, operations, pot, timezone, lang);

    const moveRow = [
      { text: this.t(lang, 'savings_button_deposit'), callback_data: `svd|${pot.id}` },
      { text: this.t(lang, 'savings_button_withdraw'), callback_data: `svw|${pot.id}` }
    ];
    if (this.ownPots(state).length > 1 && pot.balance > 0) moveRow.push({ text: this.t(lang, 'savings_button_transfer'), callback_data: `svt|${pot.id}` });
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, 'savings_button_new_amount'), callback_data: `svs|${pot.id}` }],
          moveRow,
          [{ text: this.t(lang, 'savings_button_configure'), callback_data: `svpc|${pot.id}` }],
          this.backToSavings(lang)
        ]
      }
    });
  }

  // callback: svpc|<id> — редкие настройки счёта: название, ставка, удаление
  async showAccountSettings(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const pot = state.accounts.find(p => p.id === parseInt(ctx.match[1], 10));
    if (!pot) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const row = [
      { text: this.t(lang, 'savings_button_account_name'), callback_data: `svpn|${pot.id}` },
      { text: this.t(lang, 'savings_button_rate'), callback_data: `svpy|${pot.id}` }
    ];
    if (pot.kind === 'account') row.push({ text: this.t(lang, 'savings_button_delete'), callback_data: `svpx|${pot.id}` });
    await respond(ctx, `${this.cardTitle(pot, state, lang, '⚙️')}\n${this.rateLine(pot, state, lang)}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [row, [{ text: this.t(lang, 'savings_button_back_to_account'), callback_data: `svp|${pot.id}` }]] }
    });
  }

  async goalCard(ctx, lang, goal, state, notice) {
    const { currency, today } = state;
    const status = await this.savingsService.goalStatus(goal, state);
    const own = goal.goal_mode === 'own';
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(`🎯 *${this.potName(goal, lang)}*`);
    lines.push(this.t(lang, 'savings_goal_progress', { current: this.money(status.current, currency), target: this.money(status.target, currency) }));
    const percent = Math.min(100, Math.floor(status.ratio * 100));
    lines.push(`${this.formatter.progressBar(status.ratio)} ${percent}%${status.achieved ? '' : ` · ${this.t(lang, 'savings_goal_left', { amount: this.money(status.left, currency) })}`}`);
    lines.push(this.t(lang, own ? 'savings_mode_own_line' : 'savings_mode_total_line'));
    if (goal.target_date) {
      let left = this.t(lang, 'savings_deadline_passed');
      if (status.monthsLeft > 0) left = this.t(lang, 'savings_deadline_left', { duration: this.duration(status.monthsLeft, lang) });
      else if (goal.target_date >= today) left = this.t(lang, 'savings_deadline_soon');
      lines.push(this.t(lang, 'savings_goal_deadline', { date: this.formatter.formatLocalDate(goal.target_date), left }));
    }

    lines.push('');
    if (status.achieved) {
      lines.push(this.t(lang, 'savings_goal_achieved'));
    } else {
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
        if (own) lines.push(this.t(lang, 'savings_goal_own_assumption'));
      }
      if (status.requiredNominal !== null) {
        let line = this.t(lang, 'savings_goal_required', { amount: this.money(status.requiredNominal, currency) });
        if (status.requiredReal !== null) line += ` ${this.t(lang, 'savings_goal_required_real', { amount: this.money(status.requiredReal, currency) })}`;
        lines.push(line);
      }
    }

    const keyboard = [[
      { text: this.t(lang, 'savings_button_goal_target'), callback_data: `svga|${goal.id}` },
      { text: this.t(lang, 'savings_button_goal_date'), callback_data: `svgd|${goal.id}` }
    ]];
    if (own) {
      keyboard.push([
        { text: this.t(lang, 'savings_button_new_amount'), callback_data: `svs|${goal.id}` },
        { text: this.t(lang, 'savings_button_deposit'), callback_data: `svd|${goal.id}` },
        { text: this.t(lang, 'savings_button_withdraw'), callback_data: `svw|${goal.id}` }
      ]);
    }
    if (!status.achieved && state.monthly === null) keyboard.push(this.monthlyButton(lang, `g${goal.id}`));
    keyboard.push([{ text: this.t(lang, 'savings_button_configure'), callback_data: `svgc|${goal.id}` }]);
    keyboard.push(this.backToSavings(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: svgc|<id> — режим цели и удаление
  async showGoalSettings(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await this.answer(ctx);
    const goal = await this.savingsService.getPot(ctx.from.id, parseInt(ctx.match[1], 10));
    if (!goal || goal.kind !== 'goal') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const text = `⚙️ *${this.potName(goal, lang)}*\n${this.t(lang, goal.goal_mode === 'own' ? 'savings_mode_own_line' : 'savings_mode_total_line')}\n\n${this.t(lang, 'savings_mode_hint')}`;
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(lang, goal.goal_mode === 'own' ? 'savings_button_mode_own' : 'savings_button_mode_total'), callback_data: `svgm|${goal.id}` }],
          [{ text: this.t(lang, 'savings_button_goal_delete'), callback_data: `svgx|${goal.id}` }],
          [{ text: this.t(lang, 'savings_button_back_to_goal'), callback_data: `svp|${goal.id}` }]
        ]
      }
    });
  }

  // callback: svb|<id> — карточка долга. notice — строка сверху
  async showDebt(ctx, debtId = null, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const id = debtId || parseInt(ctx.match[1], 10);
    const state = await this.savingsService.getState(userId);
    const debt = state.debts.find(p => p.id === id);
    if (!debt) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    return this.debtCard(ctx, lang, debt, state, notice);
  }

  debtTermsLines(debt, lang) {
    return [
      debt.yield_rate ? this.t(lang, 'savings_debt_rate', { value: this.percent(debt.yield_rate) }) : this.t(lang, 'savings_debt_no_rate'),
      debt.monthly_payment
        ? this.t(lang, 'savings_debt_payment', { amount: this.exact(debt.monthly_payment, debt.currency) })
        : this.t(lang, 'savings_debt_payment_not_set')
    ];
  }

  async debtCard(ctx, lang, debt, state, notice) {
    const userId = ctx.from.id;
    const [operations, timezone] = await Promise.all([
      this.savingsService.getRecentOperations(userId, debt.id),
      this.userService.getUserTimezone(userId)
    ]);
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.cardTitle(debt, state, lang), ...this.debtTermsLines(debt, lang));
    lines.push('', ...this.payoffLines(debt, state.today, lang));
    this.operationLines(lines, operations, debt, timezone, lang);
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'savings_button_new_amount'), callback_data: `svbs|${debt.id}` },
            { text: this.t(lang, 'savings_button_debt_pay'), callback_data: `svbp|${debt.id}` }
          ],
          [{ text: this.t(lang, 'savings_button_configure'), callback_data: `svbc|${debt.id}` }],
          this.backToSavings(lang)
        ]
      }
    });
  }

  // callback: svbc|<id> — платёж, ставка, увеличить, название, удалить
  async showDebtSettings(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const debt = state.debts.find(p => p.id === parseInt(ctx.match[1], 10));
    if (!debt) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const id = debt.id;
    await respond(ctx, [this.cardTitle(debt, state, lang, '⚙️'), ...this.debtTermsLines(debt, lang)].join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(lang, 'savings_button_debt_payment'), callback_data: `svbm|${id}` },
            { text: this.t(lang, 'savings_button_rate'), callback_data: `svbr|${id}` }
          ],
          [
            { text: this.t(lang, 'savings_button_debt_increase'), callback_data: `svbi|${id}` },
            { text: this.t(lang, 'savings_button_account_name'), callback_data: `svbe|${id}` }
          ],
          [{ text: this.t(lang, 'savings_button_debt_delete'), callback_data: `svbx|${id}` }],
          [{ text: this.t(lang, 'savings_button_back_to_debt'), callback_data: `svb|${id}` }]
        ]
      }
    });
  }

  // Когда закроется долг при плановом платеже и сколько уйдёт на проценты
  payoffLines(debt, today, lang) {
    const plan = this.debtPlan(debt);
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

  // callback: svd|<id>, svw|<id>, svs|<id> — пополнить, снять, новая сумма (счёт или цель со своей копилкой)
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
    const from = this.ownPots(state).find(p => p.id === fromId);
    if (!from) return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    const targets = this.ownPots(state).filter(p => p.id !== fromId);
    const keyboard = targets.map(p => [{ text: `${potIcon(p)} ${this.potButtonName(p, lang)}`, callback_data: `svtt|${fromId}|${p.id}` }]);
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

  // callback: svu — мастер «Обновить остатки»: по очереди каждый счёт, цель со своей копилкой и долг
  async startUpdate(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const ids = updateQueue(state);
    if (!ids.length) return this.showMenu(ctx);
    const wizard = this.wizards.start(userId, ids, { total: state.total, netWorth: state.netWorth, debts: state.debts.length > 0 });
    return this.updateStep(ctx, lang, wizard);
  }

  // Шаг мастера: текущая копилка (удалённые по пути пропускаем); очередь кончилась — итог
  async updateStep(ctx, lang, wizard) {
    const userId = ctx.from.id;
    while (wizard.index < wizard.ids.length) {
      const pot = await this.savingsService.getPot(userId, wizard.ids[wizard.index]);
      if (pot && (pot.kind !== 'goal' || pot.goal_mode === 'own')) {
        this.stateService.setUserState(userId, `sv_in:upd:${pot.id}`);
        const key = pot.kind === 'debt' ? 'savings_update_step_debt' : 'savings_update_step';
        const text = this.t(lang, key, {
          icon: potIcon(pot),
          name: this.potName(pot, lang),
          i: wizard.index + 1,
          n: wizard.ids.length,
          amount: this.exact(Number(pot.balance), pot.currency)
        });
        return respond(ctx, text, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: this.t(lang, 'savings_button_no_change'), callback_data: `svuk|${pot.id}` },
              { text: this.t(lang, 'savings_button_stop'), callback_data: 'svux' }
            ]]
          }
        });
      }
      wizard.index += 1;
    }
    return this.finishUpdate(ctx, lang);
  }

  // callback: svuk|<id> — «Без изменений»; кнопка старого шага — на главный экран
  async keepUpdate(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    if (!this.wizards.advance(userId, parseInt(ctx.match[1], 10))) return this.staleUpdate(ctx, lang);
    await this.answer(ctx);
    return this.updateStep(ctx, lang, this.wizards.get(userId));
  }

  // callback: svux — «Хватит»
  async stopUpdate(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    if (!this.wizards.get(ctx.from.id)) return this.staleUpdate(ctx, lang);
    await this.answer(ctx);
    return this.finishUpdate(ctx, lang);
  }

  async staleUpdate(ctx, lang) {
    await this.answer(ctx, this.t(lang, 'savings_update_stale'));
    return this.showMenu(ctx);
  }

  // Итог мастера сверху главного экрана: накопления (и капитал, если есть долги) до → после, поздравления
  async finishUpdate(ctx, lang) {
    const userId = ctx.from.id;
    const wizard = this.wizards.finish(userId);
    this.stateService.deleteUserState(userId);
    if (!wizard) return this.showMenu(ctx);
    const state = await this.savingsService.getState(userId);
    const { currency } = state;
    const delta = (value) => `${value >= 0 ? '+' : '-'}${this.money(Math.abs(value), currency)}`;
    const lines = [this.t(lang, 'savings_update_done', {
      before: this.money(wizard.before.total, currency),
      after: this.money(state.total, currency),
      delta: delta(state.total - wizard.before.total)
    })];
    if (wizard.before.debts || state.debts.length) {
      lines.push(this.t(lang, 'savings_update_done_capital', {
        before: this.money(wizard.before.netWorth, currency),
        after: this.money(state.netWorth, currency)
      }));
    }
    const achieved = wizard.achieved.filter((goal, index, all) => all.findIndex(g => g.id === goal.id) === index);
    return this.showMenu(ctx, this.withAchievements(lines.join('\n'), achieved, lang));
  }

  // callback: sva — новый счёт: сначала название (можно сразу с валютой и ставкой — «Вклад USD 4%»)
  async startNewAccount(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_account'), 'sv_in:acc', 'svn');
  }

  // «$ USD», «₽ RUB»; у валют без своего знака — просто код
  currencyLabel(code) {
    const symbol = currencySymbol(code);
    return symbol === code ? code : `${symbol} ${code}`;
  }

  // Кнопки валюты нового счёта: основная, USD, EUR (RUB, если основная — одна из них), «Другая»
  currencyKeyboard(potId, mainCurrency, lang) {
    const codes = [mainCurrency, ...QUICK_CURRENCIES.filter(c => c !== mainCurrency)].slice(0, 3);
    return [
      codes.map(code => ({ text: this.currencyLabel(code), callback_data: `svac|${potId}|${code}` })),
      [{ text: this.t(lang, 'savings_button_other_currency'), callback_data: `svaco|${potId}` }]
    ];
  }

  // Новый счёт создан в основной валюте — спрашиваем валюту (ввод текстом тоже понимаем: `USD`, `3000 USD`)
  async askAccountCurrency(ctx, lang, pot, mainCurrency) {
    const text = `${this.t(lang, 'savings_account_created', { name: this.potName(pot, lang) })}\n\n${this.t(lang, 'savings_prompt_account_currency')}`;
    await this.prompt(ctx, lang, text, `sv_in:accur:${pot.id}`, `svp|${pot.id}`, this.currencyKeyboard(pot.id, mainCurrency, lang), this.t(lang, 'savings_button_skip'));
  }

  // callback: svaco|<id> — все поддерживаемые валюты
  async chooseOtherCurrency(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const pot = await this.savingsService.getPot(userId, parseInt(ctx.match[1], 10));
    if (!pot || pot.kind !== 'account') return this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    this.stateService.setUserState(userId, `sv_in:accur:${pot.id}`);
    const buttons = SUPPORTED_CURRENCIES.map(code => ({ text: this.currencyLabel(code), callback_data: `svac|${pot.id}|${code}` }));
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 3) keyboard.push(buttons.slice(i, i + 3));
    keyboard.push([{ text: this.t(lang, 'savings_button_skip'), callback_data: `svp|${pot.id}` }]);
    await respond(ctx, this.t(lang, 'savings_prompt_account_currency'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
  }

  // callback: svac|<id>|<валюта> — валюта выбрана, спрашиваем сумму
  async setAccountCurrency(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const currency = ctx.match[2];
    if (!SUPPORTED_CURRENCIES.includes(currency)) return this.showMenu(ctx);
    const pot = await this.savingsService.setAccountCurrency(userId, parseInt(ctx.match[1], 10), currency);
    if (!pot) return this.showPot(ctx, parseInt(ctx.match[1], 10));
    return this.askAccountAmount(ctx, lang, pot);
  }

  async askAccountAmount(ctx, lang, pot) {
    const text = this.t(lang, 'savings_prompt_set', { name: this.potName(pot, lang), amount: this.exact(Number(pot.balance), pot.currency) });
    await this.prompt(ctx, lang, text, `sv_in:set:${pot.id}`, `svp|${pot.id}`);
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
    await this.prompt(ctx, lang, text, `sv_in:pyield:${pot.id}`, `svpc|${pot.id}`, extra);
  }

  // callback: svpyd|<id> — ставка как в настройках прогноза
  async clearAccountYield(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    await this.savingsService.updateAccount(ctx.from.id, pot.id, { yield_rate: null });
    await this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved'));
  }

  // callback: svpn|<id> — название счёта
  async startAccountName(ctx) {
    const lang = await this.userService.getUserLanguage(ctx.from.id);
    const pot = await this.accountFromCallback(ctx, lang);
    if (!pot) return;
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_account_name', { name: this.potName(pot, lang) }), `sv_in:name:${pot.id}`, `svpc|${pot.id}`);
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
          { text: this.t(lang, 'button_back'), callback_data: `svpc|${pot.id}` }
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

  // callback: svgn — новая цель (1 бесплатно, больше — премиум); по умолчанию — от всех накоплений
  async startNewGoal(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const [limits, state] = await Promise.all([this.premiumService.getUserLimits(userId), this.savingsService.getState(userId)]);
    if (state.goals.length >= limits.MAX_SAVINGS_GOALS) return this.showGoalLimit(ctx, lang, limits.MAX_SAVINGS_GOALS);
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_goal', { currency: state.currency }), 'sv_in:goal', 'svn');
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
          { text: this.t(lang, 'button_back'), callback_data: `svgc|${goal.id}` }
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

  // callback: svbn — новый долг: название (или сразу одной строкой «Ипотека 3 500 000 12%»), до 10 бесплатно
  async startNewDebt(ctx) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const state = await this.savingsService.getState(userId);
    if (state.debts.length >= MAX_DEBTS) return this.showMenu(ctx, this.t(lang, 'savings_debt_limit', { limit: MAX_DEBTS }));
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_debt_name'), 'sv_in:debt', 'svn');
  }

  // Долг по callback ctx.match[1]; иначе — экран «не найдено»
  async debtFromCallback(ctx, lang) {
    const pot = await this.savingsService.getPot(ctx.from.id, parseInt(ctx.match[1], 10));
    if (pot && pot.kind === 'debt') return pot;
    await this.showMenu(ctx, this.t(lang, 'savings_not_found'));
    return null;
  }

  // callback: svbp|svbi|svbs|svbm|svbr|svbe <id> — погасить, увеличить, новая сумма, платёж в месяц, ставка, название
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
    const back = ['bpay', 'bset'].includes(op) ? `svb|${debt.id}` : `svbc|${debt.id}`;
    await this.prompt(ctx, lang, this.t(lang, key, params), `sv_in:${op}:${debt.id}`, back, extra);
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
          { text: this.t(lang, 'button_back'), callback_data: `svbc|${debt.id}` }
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

  // callback: svf — прогноз: по строке на срок, при долгах — долги и капитал
  async showForecast(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { currency, settings } = state;
    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.t(lang, 'savings_forecast_title'), '');
    let now = this.t(lang, 'savings_now', { amount: this.money(state.total, currency) });
    if (state.debts.length) {
      now += ` · ${this.t(lang, 'savings_debts_capital', { debts: this.money(state.debtTotal, currency), net: this.money(state.netWorth, currency) })}`;
    }
    lines.push(now, this.monthlyLine(state, lang));
    const ratesLine = this.ratesLine(state, lang);
    if (ratesLine) lines.push(ratesLine);

    const horizon = Math.max(...FORECAST_HORIZONS);
    const debtPoints = state.debts.length ? this.projectDebts(state.debts, horizon) : null;
    let points = null;
    let depletedAt = null;
    if (state.monthly !== null) {
      ({ points, depletedAt } = simulate({ parts: state.parts, monthly: state.monthly, ...this.rates(state), months: horizon }));
    }
    if (points || debtPoints) {
      lines.push('');
      for (const months of FORECAST_HORIZONS) {
        const title = `*${this.t(lang, `savings_horizon_${months}`)}*`;
        if (!points) {
          lines.push(`${title} — ${this.t(lang, 'savings_forecast_debts_only', { debts: this.compact(debtPoints[months], currency, lang) })}`);
          continue;
        }
        let line = `${title} ≈ ${this.compact(points[months].nominal, currency, lang)}`;
        if (settings.inflationRate > 0) line += ` · ${this.t(lang, 'savings_forecast_today', { amount: this.compact(points[months].real, currency, lang) })}`;
        lines.push(line);
        if (debtPoints) {
          lines.push(`   ${this.t(lang, 'savings_debts_capital', {
            debts: this.compact(debtPoints[months], currency, lang),
            net: this.compact(points[months].nominal - debtPoints[months], currency, lang)
          })}`);
        }
      }
      if (depletedAt !== null) lines.push('', this.t(lang, 'savings_forecast_depleted', { duration: this.duration(depletedAt, lang) }));
      const notes = [];
      if (points && (settings.inflationRate > 0 || settings.yieldRate > 0 || settings.contributionGrowth > 0 || state.accounts.some(a => a.yield_rate > 0))) {
        notes.push(this.t(lang, 'savings_forecast_legend'));
      }
      if (debtPoints) notes.push(this.t(lang, 'savings_forecast_debts_note'));
      if (notes.length) lines.push('', ...notes);
    }

    const keyboard = [];
    if (state.monthly === null) keyboard.push(this.monthlyButton(lang, 'f'));
    keyboard.push([{ text: this.t(lang, 'savings_button_settings'), callback_data: 'svo' }], this.backToSavings(lang));
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
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

  // Ставки из настроек одной строкой. Ничего не задано — подсказка, но не если у счетов есть свои ставки
  ratesLine(state, lang) {
    const { settings } = state;
    const parts = [];
    if (settings.yieldRate > 0) parts.push(this.t(lang, 'savings_rate_yield_short', { value: this.percent(settings.yieldRate) }));
    if (settings.inflationRate > 0) parts.push(this.t(lang, 'savings_rate_inflation_short', { value: this.percent(settings.inflationRate) }));
    if (settings.contributionGrowth > 0) parts.push(this.t(lang, 'savings_rate_growth_short', { value: this.percent(settings.contributionGrowth) }));
    if (parts.length) return `⚙️ ${parts.join(' · ')}`;
    return state.accounts.some(a => a.yield_rate !== null) ? null : this.t(lang, 'savings_rates_not_set');
  }

  // callback: svo — настройки прогноза: значения прямо на кнопках
  async showSettings(ctx, notice = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    await this.answer(ctx);
    const state = await this.savingsService.getState(userId);
    const { settings, currency } = state;
    const value = (rate) => (rate > 0 ? `${this.percent(rate)}%` : '—');
    let monthly;
    if (settings.manualMonthly !== null) monthly = this.t(lang, 'savings_button_monthly_value', { amount: this.money(settings.manualMonthly, currency) });
    else if (state.auto) monthly = this.t(lang, 'savings_button_monthly_auto_value', { amount: this.money(state.auto.amount, currency) });
    else monthly = this.t(lang, 'savings_button_monthly_unknown');

    const lines = [];
    if (notice) lines.push(notice, '');
    lines.push(this.t(lang, 'savings_settings_title'), '', this.t(lang, 'savings_settings_hint'));
    const keyboard = [[{ text: monthly, callback_data: 'svo|m' }]];
    if (settings.manualMonthly !== null) keyboard.push([{ text: this.t(lang, 'savings_button_monthly_auto'), callback_data: 'svo|ma' }]);
    keyboard.push(
      [{ text: this.t(lang, 'savings_button_yield_value', { value: value(settings.yieldRate) }), callback_data: 'svo|y' }],
      [{ text: this.t(lang, 'savings_button_inflation_value', { value: value(settings.inflationRate) }), callback_data: 'svo|i' }],
      [{ text: this.t(lang, 'savings_button_growth_value', { value: value(settings.contributionGrowth) }), callback_data: 'svo|g' }],
      this.backToSavings(lang)
    );
    await respond(ctx, lines.join('\n'), { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
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
    if (action === 'm') return this.startMonthlyInput(ctx, 'o');
    const key = { i: 'savings_prompt_inflation', y: 'savings_prompt_yield', g: 'savings_prompt_growth' }[action];
    await this.prompt(ctx, lang, this.t(lang, key, { max: RATE_LIMITS[action] }), `sv_in:rate:${action}`, 'svo');
  }

  // callback: svm|<origin> — «Указать, сколько откладываю» с главного экрана, прогноза, цели или настроек
  async startMonthlyInput(ctx, origin = null) {
    const userId = ctx.from.id;
    const lang = await this.userService.getUserLanguage(userId);
    const from = origin || ctx.match[1];
    const currency = await this.userService.getUserCurrency(userId);
    const settings = from === 'o' ? (await this.savingsService.getState(userId)).settings : null;
    const extra = settings && settings.manualMonthly !== null
      ? [[{ text: this.t(lang, 'savings_button_monthly_auto'), callback_data: 'svo|ma' }]]
      : [];
    await this.prompt(ctx, lang, this.t(lang, 'savings_prompt_monthly', { currency }), `sv_in:m:${from}`, this.originCallback(from), extra);
  }

  originCallback(origin) {
    if (origin === 's') return 'sv';
    if (origin === 'f') return 'svf';
    const goal = /^g(\d+)$/.exec(origin || '');
    return goal ? `svp|${goal[1]}` : 'svo';
  }

  showOrigin(ctx, origin, notice) {
    if (origin === 's') return this.showMenu(ctx, notice);
    if (origin === 'f') return this.showForecast(ctx, notice);
    const goal = /^g(\d+)$/.exec(origin || '');
    if (goal) return this.showPot(ctx, parseInt(goal[1], 10), notice);
    return this.showSettings(ctx, notice);
  }

  withAchievements(notice, achieved, lang) {
    const lines = notice ? [notice] : [];
    for (const goal of achieved || []) {
      lines.push(this.t(lang, 'savings_goal_achieved_notice', { name: this.formatter.escapeMarkdown(goal.name) }));
    }
    return lines.join('\n') || null;
  }

  // Сумма из ввода в валюте currency: "15000", "15 000", "100 USD". allowZero — для новой суммы и взноса.
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
    const notFound = () => this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));

    if (op === 'upd') return this.handleUpdateInput(ctx, text, lang, parseInt(a, 10), retry);

    if (op === 'dep' || op === 'wd' || op === 'set') {
      const pot = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!pot) return notFound();
      const amount = await this.parseAmount(text, pot.currency, op === 'set');
      if (amount === null) return retry('savings_error_amount');
      const kind = { dep: 'deposit', wd: 'withdraw', set: 'set' }[op];
      const result = await this.savingsService.changeBalance(userId, pot.id, kind, amount);
      if (result.error === 'insufficient') return retry('savings_error_insufficient', { amount: this.exact(Number(pot.balance), pot.currency) });
      if (result.error) return notFound();
      const noticeKey = { dep: 'savings_deposited', wd: 'savings_withdrawn', set: 'savings_balance_set' }[op];
      const notice = this.t(lang, noticeKey, { amount: this.exact(op === 'set' ? Number(result.pot.balance) : amount, pot.currency) });
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.withAchievements(notice, result.achieved, lang)));
    }

    if (op === 'tr') {
      const from = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!from) return notFound();
      const amount = await this.parseAmount(text, from.currency, false);
      if (amount === null) return retry('savings_error_amount');
      const result = await this.savingsService.transfer(userId, from.id, parseInt(b, 10), amount);
      if (result.error === 'insufficient') return retry('savings_error_insufficient', { amount: this.exact(Number(from.balance), from.currency) });
      if (result.error) return notFound();
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
      if (!currency) return notFound();
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
      if (!result) return notFound();
      return this.finish(ctx, lang, () => this.showPot(ctx, result.goal.id, this.withAchievements(this.t(lang, 'savings_goal_updated'), result.achieved, lang)));
    }

    if (op === 'date') {
      const { today } = await this.savingsService.getState(userId);
      const date = this.parseDate(text, today);
      if (!date) return retry('savings_error_date');
      const result = await this.savingsService.updateGoal(userId, parseInt(a, 10), { target_date: date });
      if (!result) return notFound();
      return this.finish(ctx, lang, () => this.showPot(ctx, result.goal.id, this.t(lang, 'savings_deadline_set', { date: this.formatter.formatLocalDate(date) })));
    }

    if (op === 'm') {
      const currency = await this.userService.getUserCurrency(userId);
      const amount = await this.parseAmount(text, currency, true);
      if (amount === null) return retry('savings_error_amount');
      await this.savingsService.updateSettings(userId, { monthly_contribution: amount });
      return this.finish(ctx, lang, () => this.showOrigin(ctx, a || 'o', this.t(lang, 'savings_monthly_set', { amount: this.money(amount, currency) })));
    }

    if (op === 'rate' && RATE_COLUMNS[a]) {
      const value = this.parseRate(text, RATE_LIMITS[a]);
      if (value === null) return retry('savings_error_rate', { max: RATE_LIMITS[a] });
      await this.savingsService.updateSettings(userId, { [RATE_COLUMNS[a]]: value === 0 ? null : value });
      return this.finish(ctx, lang, () => this.showSettings(ctx, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'acc') {
      const currency = await this.userService.getUserCurrency(userId);
      const parsed = this.parseAccountInput(text);
      if (!parsed) return retry('savings_error_account');
      const result = await this.savingsService.createAccount(userId, { ...parsed, currency: parsed.currency || currency });
      if (result.error === 'limit') {
        return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_account_limit', { limit: result.limit })));
      }
      // Валюта или ставка уже в строке — сразу сумма; иначе — кнопки валюты
      if (parsed.currency || parsed.yieldRate !== null) {
        const name = this.potName(result.pot, lang);
        const prompt = `${this.t(lang, 'savings_account_created', { name })}\n\n${this.t(lang, 'savings_prompt_set', { name, amount: this.exact(0, result.pot.currency) })}`;
        return this.prompt(ctx, lang, prompt, `sv_in:set:${result.pot.id}`, `svp|${result.pot.id}`);
      }
      return this.askAccountCurrency(ctx, lang, result.pot, currency);
    }

    if (op === 'accur') return this.handleAccountCurrencyInput(ctx, text, lang, parseInt(a, 10), retry);

    if (op === 'pyield') {
      const value = this.parseRate(text, RATE_LIMITS.y);
      if (value === null) return retry('savings_error_rate', { max: RATE_LIMITS.y });
      // 0 — осознанно «без процентов» (наличные), в отличие от «как в настройках» (NULL)
      const pot = await this.savingsService.updateAccount(userId, parseInt(a, 10), { yield_rate: value });
      if (!pot) return notFound();
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'name') {
      const name = this.parseName(text);
      if (!name) return retry('savings_error_name', { max: MAX_GOAL_NAME_LENGTH });
      const pot = await this.savingsService.updateAccount(userId, parseInt(a, 10), { name });
      if (!pot) return notFound();
      return this.finish(ctx, lang, () => this.showPot(ctx, pot.id, this.t(lang, 'savings_setting_saved')));
    }

    if (op === 'debt') {
      const currency = await this.userService.getUserCurrency(userId);
      const parsed = this.parseDebtInput(text, currency);
      if (parsed) return this.createDebt(ctx, lang, parsed);
      // Только название — спрашиваем сумму; название храним в состоянии (base64url: двоеточия не мешают)
      const name = this.parseName(text);
      if (!name) return retry('savings_error_name', { max: MAX_GOAL_NAME_LENGTH });
      const prompt = this.t(lang, 'savings_prompt_debt_amount', { name: this.formatter.escapeMarkdown(name), currency });
      return this.prompt(ctx, lang, prompt, `sv_in:debtamt:${Buffer.from(name).toString('base64url')}`, 'svn');
    }

    if (op === 'debtamt') {
      const name = Buffer.from(a || '', 'base64url').toString('utf8');
      if (!this.parseName(name)) return notFound();
      const currency = await this.userService.getUserCurrency(userId);
      const parsed = this.parseDebtAmount(text, currency);
      if (!parsed) return retry('savings_error_debt_amount');
      return this.createDebt(ctx, lang, { name, ...parsed });
    }

    if (['bpay', 'binc', 'bset', 'bpm', 'brate', 'bname'].includes(op)) {
      const debt = await this.savingsService.getPot(userId, parseInt(a, 10));
      if (!debt || debt.kind !== 'debt') return notFound();
      return this.handleDebtInput(ctx, text, lang, op, debt, retry);
    }

    this.stateService.deleteUserState(userId);
  }

  // Шаг мастера: введённая сумма — новый остаток (0 можно, другая валюта пересчитывается), дальше — следующий
  async handleUpdateInput(ctx, text, lang, potId, retry) {
    const userId = ctx.from.id;
    if (this.wizards.current(userId) !== potId) {
      this.stateService.deleteUserState(userId);
      return this.showMenu(ctx, this.t(lang, 'savings_update_stale'));
    }
    const pot = await this.savingsService.getPot(userId, potId);
    if (!pot) {
      this.wizards.advance(userId, potId);
      return this.updateStep(ctx, lang, this.wizards.get(userId));
    }
    const amount = await this.parseAmount(text, pot.currency, true);
    if (amount === null) return retry('savings_error_amount');
    const result = pot.kind === 'debt'
      ? await this.savingsService.changeDebt(userId, pot.id, 'set', amount)
      : await this.savingsService.changeBalance(userId, pot.id, 'set', amount);
    const wizard = this.wizards.get(userId);
    if (!result.error && result.achieved) wizard.achieved.push(...result.achieved);
    this.wizards.advance(userId, potId);
    return this.updateStep(ctx, lang, wizard);
  }

  // Валюта нового счёта текстом: «USD» — валюта, «3000 USD» / «3000» — сразу сумма
  async handleAccountCurrencyInput(ctx, text, lang, potId, retry) {
    const userId = ctx.from.id;
    const pot = await this.savingsService.getPot(userId, potId);
    if (!pot || pot.kind !== 'account') return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
    const code = this.validator.resolveCurrencyToken(text.trim());
    if (code) {
      const updated = await this.savingsService.setAccountCurrency(userId, potId, code);
      if (!updated) return this.finish(ctx, lang, () => this.showPot(ctx, potId));
      return this.askAccountAmount(ctx, lang, updated);
    }
    const parsed = this.validator.parseMoneyInput(text, { maxAmount: MAX_SAVINGS_AMOUNT, maxDescriptionLength: 60, requireDescription: false });
    if (!parsed.isValid || parsed.description) return retry('savings_error_currency');
    let current = pot;
    if (parsed.currency && parsed.currency !== pot.currency) current = (await this.savingsService.setAccountCurrency(userId, potId, parsed.currency)) || pot;
    const amount = parsed.currency && parsed.currency !== current.currency
      ? Math.round((await this.savingsService.toCurrency(parsed.amount, parsed.currency, current.currency)) * 100) / 100
      : parsed.amount;
    const result = await this.savingsService.changeBalance(userId, potId, 'set', amount);
    if (result.error) return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_not_found')));
    const notice = this.t(lang, 'savings_balance_set', { amount: this.exact(Number(result.pot.balance), current.currency) });
    return this.finish(ctx, lang, () => this.showPot(ctx, potId, this.withAchievements(notice, result.achieved, lang)));
  }

  // Долг создан — сразу спрашиваем платёж в месяц (по нему считается срок погашения), можно пропустить
  async createDebt(ctx, lang, parsed) {
    const result = await this.savingsService.createDebt(ctx.from.id, parsed);
    if (result.error === 'limit') {
      return this.finish(ctx, lang, () => this.showMenu(ctx, this.t(lang, 'savings_debt_limit', { limit: result.limit })));
    }
    const name = this.potName(result.debt, lang);
    const prompt = `${this.t(lang, 'savings_debt_created', { name })}\n\n${this.t(lang, 'savings_prompt_debt_payment', { name, currency: result.debt.currency })}`;
    return this.prompt(ctx, lang, prompt, `sv_in:bpm:${result.debt.id}`, `svb|${result.debt.id}`, [], this.t(lang, 'savings_button_skip'));
  }

  // Ввод для долга: погасить / увеличить / новая сумма / платёж в месяц / ставка / название
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

  // Название счёта, цели или долга: 1..60 символов, без недопустимого содержимого
  parseName(text) {
    const name = text.trim();
    if (!name || name.length > MAX_GOAL_NAME_LENGTH) return null;
    if (!this.validator.validateDescription(name, MAX_GOAL_NAME_LENGTH).isValid) return null;
    return this.validator.sanitizeText(name, MAX_GOAL_NAME_LENGTH);
  }

  // «Наличные», «Вклад 16%», «$ под подушкой», «Крипта USDT»: валюта (код или символ) и ставка «N%» —
  // в любом месте, остальное — название. currency / yieldRate null — не указаны
  parseAccountInput(text) {
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
    return { name, currency, yieldRate };
  }

  // Сумма долга (тысячи можно через пробел), валюта (код или символ) и ставка «N%» в любом порядке; остальное — слова.
  // null — суммы нет, она неоднозначна или вне пределов
  parseDebtParts(text, defaultCurrency) {
    // «$1200», «45000₽» — символ валюты вплотную к сумме
    const tokens = text.trim().split(/\s+/).filter(Boolean).flatMap((token) => {
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
    return { words: [...rest.slice(0, start), ...rest.slice(end + 1)], amount, currency: currency || defaultCurrency, rate: rate || null };
  }

  // «Ипотека 3 500 000 12%», «Кредитка 45000 29,9%», «Долг Пете 15000», «Рассрочка USD 1200» — всё одной строкой.
  // Без валюты — основная, без ставки (или 0%) — без процентов. null — не понято
  parseDebtInput(text, defaultCurrency) {
    const parts = this.parseDebtParts(text, defaultCurrency);
    if (!parts) return null;
    const name = this.parseName(parts.words.join(' '));
    if (!name) return null;
    return { name, amount: parts.amount, currency: parts.currency, rate: parts.rate };
  }

  // Вторая строка мастера долга: только сумма, валюта и ставка («300000», «1200 USD», «300 000 18%»)
  parseDebtAmount(text, defaultCurrency) {
    const parts = this.parseDebtParts(text, defaultCurrency);
    if (!parts || parts.words.length) return null;
    return { amount: parts.amount, currency: parts.currency, rate: parts.rate };
  }

  // Ввод принят (или потерял смысл): снимаем состояние и показываем экран
  async finish(ctx, lang, show) {
    this.stateService.deleteUserState(ctx.from.id);
    return show();
  }
}

SavingsHandlers.MAX_SAVINGS_AMOUNT = MAX_SAVINGS_AMOUNT;

module.exports = SavingsHandlers;
