const logger = require('../utils/logger');
const { monthsToTarget, requiredMonthly } = require('../utils/savingsForecast');
const { localToday } = require('../utils/period');

const AUTO_PERIODS = 3; // взнос «авто» — среднее (доходы − траты) за столько последних полных периодов
const MAX_ACCOUNTS = 10; // дополнительных счетов (наличные, вклад, крипта…) — бесплатно
const MAX_DEBTS = 10; // долгов (кредит, ипотека, рассрочка, долг другу) — бесплатно

// Полные месяцы от today до даты 'YYYY-MM-DD' — столько ежемесячных взносов успеет поступить (прошедшая дата — 0)
function monthsUntil(today, date) {
  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = date.split('-').map(Number);
  const months = (dy - ty) * 12 + (dm - tm) - (dd < td ? 1 : 0);
  return Math.max(0, months);
}

// 'YYYY-MM-DD' из DATE-колонки pg (приходит Date в локальной TZ процесса) или строки
function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

class SavingsService {
  constructor({ savingsRepository, expenseService, incomeService, userService, premiumService, currencyUtils }) {
    this.savingsRepository = savingsRepository;
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.currencyUtils = currencyUtils;
  }

  async toCurrency(amount, from, to) {
    if (!amount || from === to) return amount;
    return this.currencyUtils.convert(amount, from, to);
  }

  async sumIn(byCurrency, currency) {
    const parts = await Promise.all(byCurrency.map(row => this.toCurrency(Number(row.total), row.currency, currency)));
    return parts.reduce((sum, value) => sum + value, 0);
  }

  // Числа вместо строк DECIMAL; незаданные ставки — 0, взнос null — «авто»
  normalizeSettings(row) {
    const num = (value) => (value === null || value === undefined ? null : Number(value));
    return {
      manualMonthly: num(row?.monthly_contribution),
      inflationRate: num(row?.inflation_rate) || 0,
      yieldRate: num(row?.yield_rate) || 0,
      contributionGrowth: num(row?.contribution_growth) || 0,
      ratesSet: row ? [row.inflation_rate, row.yield_rate, row.contribution_growth].some(v => v !== null) : false
    };
  }

  // Среднее (доходы − траты) за последние полные периоды, где записан хоть один доход: без доходов разница
  // была бы просто «минус траты». null — таких периодов нет.
  async autoMonthly(userId, currency) {
    const samples = [];
    for (let offset = -1; offset >= -AUTO_PERIODS; offset--) {
      const { timezone, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
      const [incomes, expenses] = await Promise.all([
        this.incomeService.getTotals(userId, timezone, period),
        this.expenseService.getTotals(userId, timezone, period)
      ]);
      if (!incomes.count) continue;
      samples.push({
        income: await this.sumIn(incomes.byCurrency, currency),
        expenses: await this.sumIn(expenses.byCurrency, currency)
      });
    }
    if (!samples.length) return null;
    const income = samples.reduce((sum, s) => sum + s.income, 0) / samples.length;
    const expenses = samples.reduce((sum, s) => sum + s.expenses, 0) / samples.length;
    return { amount: income - expenses, income, expenses, periods: samples.length };
  }

  // Всё для экранов раздела: копилки с суммами в основной валюте, итог, параметры, взнос в месяц.
  // Долги — не накопления: в total, parts и цели «от всех накоплений» не входят, только в debtTotal и netWorth.
  async getState(userId) {
    const currency = await this.userService.getUserCurrency(userId);
    await this.savingsRepository.ensureGeneralPot(userId, currency);
    const [rows, settingsRow, timezone] = await Promise.all([
      this.savingsRepository.getPots(userId),
      this.savingsRepository.getSettings(userId),
      this.userService.getUserTimezone(userId)
    ]);
    const pots = await Promise.all(rows.map(async (pot) => ({
      ...pot,
      balance: Number(pot.balance),
      target_amount: pot.target_amount === null ? null : Number(pot.target_amount),
      target_date: dateOnly(pot.target_date),
      yield_rate: pot.yield_rate === null || pot.yield_rate === undefined ? null : Number(pot.yield_rate),
      monthly_payment: pot.monthly_payment === null || pot.monthly_payment === undefined ? null : Number(pot.monthly_payment),
      balanceMain: await this.toCurrency(Number(pot.balance), pot.currency, currency)
    })));
    const assets = pots.filter(p => p.kind !== 'debt');
    const debts = pots.filter(p => p.kind === 'debt');
    const total = assets.reduce((sum, p) => sum + p.balanceMain, 0);
    const debtTotal = debts.reduce((sum, p) => sum + p.balanceMain, 0);
    const settings = this.normalizeSettings(settingsRow);
    const auto = settings.manualMonthly === null ? await this.autoMonthly(userId, currency) : null;
    const monthly = settings.manualMonthly !== null ? settings.manualMonthly : (auto ? auto.amount : null);
    return {
      currency,
      today: localToday(timezone),
      pots,
      general: pots.find(p => p.kind === 'general'),
      accounts: pots.filter(p => p.kind === 'general' || p.kind === 'account'),
      goals: pots.filter(p => p.kind === 'goal'),
      debts,
      total,
      debtTotal,
      netWorth: total - debtTotal,
      // Части для прогноза: счета со своей ставкой (null — ставка из параметров), деньги целей — по ставке параметров
      parts: assets.filter(p => p.balanceMain > 0).map(p => ({ balance: p.balanceMain, yieldRate: p.kind === 'goal' ? null : p.yield_rate })),
      settings,
      auto,
      monthly
    };
  }

  // Прогресс и сроки цели в основной валюте. eta* — месяцы при текущем взносе (null — не дойдёт за 50 лет
  // или взнос неизвестен); required* — взнос в месяц, чтобы успеть к сроку
  async goalStatus(goal, state) {
    const { settings, monthly, currency } = state;
    const current = goal.goal_mode === 'total' ? state.total : goal.balanceMain;
    const target = await this.toCurrency(goal.target_amount, goal.currency, currency);
    const rates = { yieldRate: settings.yieldRate, inflationRate: settings.inflationRate, contributionGrowth: settings.contributionGrowth };
    // «От всех накоплений» — растут все счета по своим ставкам; своя копилка — по ставке параметров
    const parts = goal.goal_mode === 'total' ? state.parts : [{ balance: current, yieldRate: null }];
    const status = {
      current,
      target,
      ratio: target > 0 ? current / target : 0,
      left: Math.max(0, target - current),
      achieved: current >= target,
      etaNominal: null,
      etaReal: null,
      monthsLeft: goal.target_date ? monthsUntil(state.today, goal.target_date) : null,
      requiredNominal: null,
      requiredReal: null
    };
    if (status.achieved) return status;
    if (monthly !== null) {
      status.etaNominal = monthsToTarget({ parts, monthly, ...rates, target });
      if (settings.inflationRate > 0) status.etaReal = monthsToTarget({ parts, monthly, ...rates, target, inToday: true });
    }
    if (status.monthsLeft > 0) {
      status.requiredNominal = requiredMonthly({ parts, target, months: status.monthsLeft, ...rates });
      if (settings.inflationRate > 0) {
        status.requiredReal = requiredMonthly({ parts, target, months: status.monthsLeft, ...rates, inToday: true });
      }
    }
    return status;
  }

  // Поздравляем один раз: achieved_at ставится при достижении и сбрасывается, если сумма снова ниже цели.
  // Возвращает только что достигнутые цели. createdGoalId — только что созданная цель: если она уже выполнена
  // (накоплений и так больше), это не достижение — achieved_at = created_at, без поздравления; «🏆 Мечта сбылась»
  // считает только цели с achieved_at позже создания (AchievementRepository.getStats)
  async checkAchievements(userId, { createdGoalId = null } = {}) {
    const state = await this.getState(userId);
    const achieved = [];
    for (const goal of state.goals) {
      const status = await this.goalStatus(goal, state);
      if (status.achieved && !goal.achieved_at) {
        if (goal.id === createdGoalId) {
          await this.savingsRepository.updateGoal(userId, goal.id, { achieved_at: goal.created_at || new Date() });
          continue;
        }
        await this.savingsRepository.updateGoal(userId, goal.id, { achieved_at: new Date() });
        achieved.push(goal);
      } else if (!status.achieved && goal.achieved_at) {
        await this.savingsRepository.updateGoal(userId, goal.id, { achieved_at: null });
      }
    }
    return achieved;
  }

  // kind: 'deposit' | 'withdraw' | 'set'. { pot, achieved } или { error }
  async changeBalance(userId, potId, kind, amount) {
    const change = kind === 'set' ? (balance) => amount - balance : (kind === 'withdraw' ? -amount : amount);
    const result = await this.savingsRepository.changeBalance(userId, potId, change, kind);
    if (result.error) return result;
    logger.info('Savings balance changed', { userId, potId, kind, delta: result.delta });
    return { pot: result.pot, achieved: await this.checkAchievements(userId) };
  }

  // amount — в валюте копилки-источника
  async transfer(userId, fromId, toId, amount) {
    const [from, to] = await Promise.all([
      this.savingsRepository.getPot(userId, fromId),
      this.savingsRepository.getPot(userId, toId)
    ]);
    if (!from || !to) return { error: 'not_found' };
    const amountTo = Math.round((await this.toCurrency(amount, from.currency, to.currency)) * 100) / 100;
    const result = await this.savingsRepository.transfer(userId, fromId, toId, amount, amountTo);
    if (result.error) return result;
    logger.info('Savings transfer', { userId, fromId, toId, amount });
    return { ...result, amountTo, achieved: await this.checkAchievements(userId) };
  }

  // { goal } или { error: 'limit', limit }
  async createGoal(userId, { name, targetAmount, currency }) {
    const [limits, count] = await Promise.all([
      this.premiumService.getUserLimits(userId),
      this.savingsRepository.countGoals(userId)
    ]);
    if (count >= limits.MAX_SAVINGS_GOALS) return { error: 'limit', limit: limits.MAX_SAVINGS_GOALS };
    const goal = await this.savingsRepository.createGoal(userId, { name, targetAmount, currency });
    logger.info('Savings goal created', { userId, goalId: goal.id });
    await this.checkAchievements(userId, { createdGoalId: goal.id });
    return { goal };
  }

  // fields: name, target_amount, target_date
  async updateGoal(userId, goalId, fields) {
    const goal = await this.savingsRepository.updateGoal(userId, goalId, fields);
    if (!goal) return null;
    return { goal, achieved: await this.checkAchievements(userId) };
  }

  generalConverter(userId) {
    return async (amount, currency) => {
      const general = await this.savingsRepository.ensureGeneralPot(userId, await this.userService.getUserCurrency(userId));
      return Math.round((await this.toCurrency(amount, currency, general.currency)) * 100) / 100;
    };
  }

  // Смена режима: в 'total' деньги цели переходят в общую копилку. { goal, moved, achieved } или null
  async setGoalMode(userId, goalId, mode) {
    const result = await this.savingsRepository.setGoalMode(userId, goalId, mode, this.generalConverter(userId));
    if (!result) return null;
    return { ...result, achieved: await this.checkAchievements(userId) };
  }

  // Удаление цели: её деньги переходят в общую копилку. { pot, moved } или null
  async deleteGoal(userId, goalId) {
    const result = await this.savingsRepository.deletePot(userId, goalId, 'goal', this.generalConverter(userId));
    if (result) logger.info('Savings goal deleted', { userId, goalId, moved: result.moved });
    return result;
  }

  // { pot } или { error: 'limit', limit }. yieldRate null — ставка из параметров прогноза
  async createAccount(userId, { name, currency, yieldRate }) {
    if (await this.savingsRepository.countAccounts(userId) >= MAX_ACCOUNTS) return { error: 'limit', limit: MAX_ACCOUNTS };
    const pot = await this.savingsRepository.createAccount(userId, { name, currency, yieldRate });
    logger.info('Savings account created', { userId, potId: pot.id, currency });
    return { pot };
  }

  // fields: name, yield_rate (null — ставка из параметров)
  async updateAccount(userId, potId, fields) {
    return this.savingsRepository.updateAccount(userId, potId, fields);
  }

  // Валюта только что созданного (пустого) счёта. Счёт или null
  async setAccountCurrency(userId, potId, currency) {
    return this.savingsRepository.setAccountCurrency(userId, potId, currency);
  }

  // Удаление счёта: деньги переходят в общую копилку (общую удалить нельзя). { pot, moved } или null
  async deleteAccount(userId, potId) {
    const result = await this.savingsRepository.deletePot(userId, potId, 'account', this.generalConverter(userId));
    if (result) logger.info('Savings account deleted', { userId, potId, moved: result.moved });
    return result;
  }

  // { debt } или { error: 'limit', limit }. rate null — без процентов
  async createDebt(userId, { name, amount, currency, rate }) {
    if (await this.savingsRepository.countDebts(userId) >= MAX_DEBTS) return { error: 'limit', limit: MAX_DEBTS };
    const debt = await this.savingsRepository.createDebt(userId, { name, amount, currency, rate });
    logger.info('Savings debt created', { userId, potId: debt.id, currency });
    return { debt };
  }

  // kind: 'pay' (погасить часть) | 'increase' | 'set'. Деньги накоплений и траты не трогает. { pot } или { error }
  async changeDebt(userId, potId, kind, amount) {
    const change = kind === 'set' ? (balance) => amount - balance : (kind === 'pay' ? -amount : amount);
    const operation = { pay: 'withdraw', increase: 'deposit', set: 'set' }[kind];
    const result = await this.savingsRepository.changeBalance(userId, potId, change, operation, true);
    if (result.error) return result;
    logger.info('Savings debt changed', { userId, potId, kind, delta: result.delta });
    return { pot: result.pot };
  }

  // fields: name, yield_rate, monthly_payment. Долг или null
  async updateDebt(userId, potId, fields) {
    return this.savingsRepository.updateDebt(userId, potId, fields);
  }

  // Удалённый долг или null
  async deleteDebt(userId, potId) {
    const debt = await this.savingsRepository.deleteDebt(userId, potId);
    if (debt) logger.info('Savings debt deleted', { userId, potId });
    return debt || null;
  }

  async getPot(userId, potId) {
    return this.savingsRepository.getPot(userId, potId);
  }

  async getRecentOperations(userId, potId, limit = 3) {
    return this.savingsRepository.getRecentOperations(userId, potId, limit);
  }

  async updateSettings(userId, fields) {
    return this.savingsRepository.updateSettings(userId, fields);
  }
}

SavingsService.monthsUntil = monthsUntil;
SavingsService.MAX_DEBTS = MAX_DEBTS;

module.exports = SavingsService;
