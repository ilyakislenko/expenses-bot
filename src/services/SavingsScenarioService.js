const { customPeriod } = require('../utils/period');
const { periodSeries } = require('../utils/periodForecast');
const { isPlannedIncome } = require('../utils/planning');
const { simulate } = require('../utils/savingsForecast');

const HORIZON_MONTHS = 12;
const AVERAGE_PERIODS = 3; // «как в среднем» и доход — за столько прошлых полных периодов (где были записи)
// Сценарий по умолчанию — с него открываются сценарии в мини-приложении, им же считается взнос «авто» в накоплениях
// (contribution): «в этом месяце»; в первый день периода темпа нет — «в среднем»; без прошлых трат — «по плану»
const BASE_ORDER = ['current', 'average', 'plan'];

// «📊 Сценарии на год» в накоплениях: сколько будет через 12 месяцев, если каждый месяц откладывать «доход − траты»
// при трёх вариантах трат — как в среднем за прошлые периоды, по плану (общий бюджет), как идёт текущий период
// (прогноз на его конец, utils/periodForecast). В семейном контуре (BudgetService.scopeFor) — домохозяйство: доходы,
// все траты (личные, семейные, импорт выписок) и накопления всех участников семьи; иначе — свои.
// Доход — средний за прошлые периоды (доходы из выписки — только зарплата, isPlannedIncome): доход текущего периода
// обычно ещё не пришёл. Рост — utils/savingsForecast по ставкам из «⚙️ Настройки прогноза» пользователя.
class SavingsScenarioService {
  constructor({ savingsService, expenseService, budgetService, recurringExpenseService, planningRepository, familyRepository, currencyUtils }) {
    this.savingsService = savingsService;
    this.expenseService = expenseService;
    this.budgetService = budgetService;
    this.recurringExpenseService = recurringExpenseService;
    this.planningRepository = planningRepository;
    this.familyRepository = familyRepository;
    this.currencyUtils = currencyUtils;
  }

  async toCurrency(amount, from, to) {
    const value = Number(amount) || 0;
    if (!value || !from || from === to) return value;
    return this.currencyUtils.convert(value, from, to);
  }

  async sumIn(byCurrency, currency) {
    let sum = 0;
    for (const row of byCurrency) sum += await this.toCurrency(row.total, row.currency, currency);
    return sum;
  }

  // Кто входит в расчёт: участники семьи при семейном контуре, иначе только пользователь
  async members(userId) {
    const scope = await this.budgetService.scopeFor(userId);
    if (typeof scope !== 'object') return { family: false, ids: [userId] };
    const rows = await this.familyRepository.getFamilyMembers(scope.familyId);
    const ids = rows.map(row => Number(row.id));
    return { family: true, ids: ids.includes(userId) ? ids : [userId, ...ids] };
  }

  // Средний доход в месяц за прошлые периоды, где он был: { amount, periods } | null
  async monthlyIncome(ids, { timezone, currency, today, startDay }) {
    const periods = [];
    for (let k = -1; k >= -AVERAGE_PERIODS; k--) periods.push(customPeriod(today, startDay, k));
    const since = periods[periods.length - 1].start;
    const totals = periods.map(() => 0);
    for (const id of ids) {
      const rows = (await this.planningRepository.getIncomeRowsSince(id, timezone, since)).filter(isPlannedIncome);
      for (const row of rows) {
        const index = periods.findIndex(p => row.date >= p.start && row.date < p.end);
        if (index >= 0) totals[index] += await this.toCurrency(row.amount, row.currency, currency);
      }
    }
    const samples = totals.filter(value => value > 0);
    if (!samples.length) return null;
    return { amount: samples.reduce((sum, value) => sum + value, 0) / samples.length, periods: samples.length };
  }

  // Средние траты в месяц за прошлые периоды, где они были: { amount, periods } | null
  async averageSpending(owner, { timezone, currency, today, startDay }) {
    const samples = [];
    for (let k = -1; k >= -AVERAGE_PERIODS; k--) {
      const totals = await this.expenseService.getTotals(owner, timezone, customPeriod(today, startDay, k));
      if (totals.count) samples.push(await this.sumIn(totals.byCurrency, currency));
    }
    if (!samples.length) return null;
    return { amount: samples.reduce((sum, value) => sum + value, 0) / samples.length, periods: samples.length };
  }

  // Траты текущего периода к его концу при нынешнем темпе; null — в первый день периода темпа ещё нет
  async currentSpending(owner, ids, { timezone, currency, today, period }) {
    const [rows, recurringLists] = await Promise.all([
      this.expenseService.getExpenses(owner, timezone, period),
      Promise.all(ids.map(id => this.recurringExpenseService.list(id)))
    ]);
    const series = await periodSeries({
      rows, recurring: recurringLists.flat(), period, today, timezone, current: true,
      convert: (amount, from) => this.toCurrency(amount, from, currency)
    });
    if (series.forecast) return series.forecast.end;
    return series.lastIndex === series.days.length - 1 ? series.running : null;
  }

  // Накопления участников: части для прогноза в основной валюте пользователя, итог, его параметры прогноза.
  // Их взносы не нужны: сценарии считают свой «доход − траты» (contribution: false)
  async savings(userId, ids, currency) {
    const states = await Promise.all(ids.map(id => this.savingsService.getState(id, { contribution: false })));
    const parts = [];
    let total = 0;
    for (const state of states) {
      const fx = state.currency === currency ? 1 : await this.toCurrency(1, state.currency, currency);
      for (const part of state.parts) parts.push({ balance: part.balance * fx, yieldRate: part.yieldRate });
      total += state.total * fx;
    }
    const own = states[ids.indexOf(userId)] || states[0];
    const { yieldRate, inflationRate, contributionGrowth } = own.settings;
    return { parts, total, rates: { yieldRate, inflationRate, contributionGrowth } };
  }

  // Доход и варианты трат для участников ids в текущем периоде ctx: { income, variants, base } (base — ключ варианта
  // по умолчанию, null — вариантов нет)
  async basis(userId, ids, family, ctx) {
    const { currency, timezone, period } = ctx;
    const owner = family ? { userIds: ids } : userId;
    const [income, average, statuses, current] = await Promise.all([
      this.monthlyIncome(ids, ctx),
      this.averageSpending(owner, ctx),
      this.budgetService.getStatus(userId, { timezone, currency, period }),
      this.currentSpending(owner, ids, ctx)
    ]);
    const total = statuses.find(b => b.category_name === null);
    const variants = [
      average && { key: 'average', spending: average.amount, periods: average.periods },
      total && { key: 'plan', spending: total.limit },
      current !== null && { key: 'current', spending: current }
    ].filter(Boolean);
    const base = BASE_ORDER.find(key => variants.some(v => v.key === key)) || null;
    return { income, variants, base };
  }

  // Взнос «авто» в накоплениях (SavingsService.getState): доход − траты сценария по умолчанию — то же «Откладываешь …
  // в месяц», что в сценариях. { amount, income, spending, key, periods } (periods — месяцев в среднем доходе) | null —
  // дохода за прошлые периоды нет или трат не из чего взять
  async contribution(userId) {
    const ctx = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const { family, ids } = await this.members(userId);
    const { income, variants, base } = await this.basis(userId, ids, family, ctx);
    if (!income || !base) return null;
    const { spending } = variants.find(v => v.key === base);
    return { amount: income.amount - spending, income: income.amount, spending, key: base, periods: income.periods };
  }

  // { family, currency, today, startDay, total, parts, income, rates, base, scenarios: [{ key, spending, periods?, monthly,
  // points }] }. income: null — доходов нет, сценарии не посчитать (scenarios пустой, base null)
  async build(userId) {
    const ctx = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const { family, ids } = await this.members(userId);
    const [{ income, variants, base }, savings] = await Promise.all([
      this.basis(userId, ids, family, ctx),
      this.savings(userId, ids, ctx.currency)
    ]);
    const scenarios = income ? variants.map(variant => {
      const monthly = income.amount - variant.spending;
      const { points } = simulate({ parts: savings.parts, monthly, ...savings.rates, months: HORIZON_MONTHS });
      return { ...variant, monthly, points: points.map(p => p.nominal) };
    }) : [];
    // parts — накопления по частям со ставками: мини-приложение само пересчитывает кривые (utils/savingsForecast)
    return {
      family, currency: ctx.currency, today: ctx.today, startDay: ctx.startDay, total: savings.total, parts: savings.parts,
      income, rates: savings.rates, base: income ? base : null, scenarios
    };
  }
}

SavingsScenarioService.HORIZON_MONTHS = HORIZON_MONTHS;

module.exports = SavingsScenarioService;
