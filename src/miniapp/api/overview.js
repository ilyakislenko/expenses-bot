const { expense: serializeExpense, categoryLabel } = require('../serialize');

// Обзор периода, записи категории, итоги периода и динамика — те же расчёты, что у бота:
// обзор — ExpenseHandlers.showOverview (ov| / fov|), график «План и факт» — ChartService.planFactData,
// категория — showCategoryList (oc| / foc|), итоги — ReportService.reportData (rp|), динамика — ChartService.trendData
// (cht| / chc|). Деньги — в основной валюте по курсу.

const MAX_BACK = 240; // на сколько периодов можно листать назад
const TREND_MAX = 12; // динамика: до 12 периодов, если были траты
const TREND_MIN = 6; // и не меньше 6, как в боте
const INCOME_HINT_DAYS = 14; // подсказка про доход — только новым пользователям (как в боте)

const round = (value) => (value === null || value === undefined ? value : Math.round(value * 100) / 100);
const roundAll = (values) => (values ? values.map(round) : values);

function groupByCurrency(rows) {
  const totals = new Map();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) || 0) + Number(row.amount));
  return [...totals.entries()].map(([currency, total]) => ({ currency, total }));
}

const periodOut = (period) => ({ start: period.start, end: period.end, last: period.last });

module.exports = (router, { get, http }) => {
  const offsetOf = (value) => http.int(value, { min: -MAX_BACK, max: 0, def: 0, code: 'bad_offset' });

  // Чьи деньги: scope=mine|family, без него — контур пользователя (у «все траты в семью» — семья). Семья видна
  // премиуму-участнику семьи (ExpenseHandlers.viewerFamily)
  async function viewer(req) {
    const ctx = await req.ctx();
    const scope = req.query.scope;
    if (scope !== undefined && scope !== '' && scope !== 'mine' && scope !== 'family') throw http.badRequest('bad_scope');
    const family = ctx.isPremium ? await get('familyService').getUserFamily(ctx.userId) : null;
    const homeFamily = !!family && typeof (await get('budgetService').scopeFor(ctx.userId)) === 'object';
    const familyView = scope === 'family' ? true : scope === 'mine' ? false : homeFamily;
    if (familyView && !family) throw ctx.isPremium ? http.forbidden('no_family') : http.premiumRequired('family');
    return { ctx, family, homeFamily, familyView, owner: familyView ? { familyId: family.id } : ctx.userId };
  }

  // Семейные траты периода по участникам в основной валюте, по убыванию
  async function memberBreakdown(familyId, timezone, period, currency) {
    const rows = await get('expenseService').getMemberTotals(familyId, timezone, period);
    const byMember = new Map();
    for (const row of rows) {
      const id = Number(row.user_id);
      const entry = byMember.get(id) || { id, name: row.first_name || row.username || '', byCurrency: [] };
      entry.byCurrency.push({ currency: row.currency, total: Number(row.total) });
      byMember.set(id, entry);
    }
    const formatter = get('formatter');
    const members = [];
    for (const entry of byMember.values()) members.push({ id: entry.id, name: entry.name, total: await formatter.sumInCurrency(entry.byCurrency, currency) });
    return members.sort((a, b) => b.total - a.total);
  }

  async function allowanceOf(userId) {
    try {
      const allowance = await get('planningService').getAllowance(userId);
      if (!allowance || allowance.mode === 'none') return null;
      return { mode: allowance.mode, daily: round(allowance.daily), spentToday: round(allowance.spentToday), leftToday: round(allowance.leftToday), deficit: round(allowance.deficit), pace: allowance.pace };
    } catch (error) {
      return null; // как в боте: ошибка расчёта не ломает экран — строки просто нет
    }
  }

  async function incomeHint(userId) {
    const user = await get('userService').getUserById(userId);
    const ageDays = user && user.created_at ? (Date.now() - new Date(user.created_at).getTime()) / 86400000 : Infinity;
    return ageDays < INCOME_HINT_DAYS;
  }

  const trendOut = (data) => ({
    periods: data.periods.map(p => ({ start: p.start, last: p.last, offset: p.offset, value: round(p.value) })),
    average: round(data.average)
  });

  // GET /api/overview?offset=&scope= — обзор периода
  router.get('/overview', http.wrap(async (req, res) => {
    const offset = offsetOf(req.query.offset);
    const { ctx, family, homeFamily, familyView, owner } = await viewer(req);
    const expenseService = get('expenseService');
    const recurringService = get('recurringExpenseService');
    const { timezone, currency, today, period, startDay } = await expenseService.getPeriodContext(ctx.userId, 'month', offset);
    // Бюджеты текущего периода: семейный обзор — семейные, свой — личные (у семейного контура своих нет: потолок общий)
    const showBudgets = offset === 0 && ctx.isPremium && (familyView || !homeFamily);
    // «Можно сегодня» — на экране контура пользователя (у семейного — по семье)
    const homeView = familyView === homeFamily;
    const [totals, categories, incomeTotals, members, budgets, plan, recurring, allowance] = await Promise.all([
      expenseService.getTotals(owner, timezone, period),
      get('reportService').categoryBreakdown(owner, timezone, period, currency),
      familyView ? null : get('incomeService').getTotals(ctx.userId, timezone, period),
      familyView ? memberBreakdown(family.id, timezone, period, currency) : [],
      showBudgets ? get('budgetService').getStatus(owner, { timezone, currency, period }) : [],
      get('chartService').planFactData(ctx.userId, offset, { familyId: familyView ? family.id : null }),
      offset === 0 ? (familyView ? recurringService.listFamily(family.id) : recurringService.list(ctx.userId)) : [],
      offset === 0 && homeView ? allowanceOf(ctx.userId) : null
    ]);
    const formatter = get('formatter');
    const spent = totals.count ? await formatter.sumInCurrency(totals.byCurrency, currency) : 0;
    const budgetFor = (name) => budgets.find(b => b.category_name === name);
    const level = (ratio) => (ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : null);

    const categorySum = categories.reduce((sum, c) => sum + c.total, 0);
    const memberSum = members.reduce((sum, m) => sum + m.total, 0);
    const total = budgetFor(null);

    let income = null;
    let hint = false;
    if (!familyView) {
      if (incomeTotals.count) {
        const incomeSum = await formatter.sumInCurrency(incomeTotals.byCurrency, currency);
        income = {
          total: round(incomeSum),
          balance: round(incomeSum - spent),
          parts: incomeTotals.byCurrency.some(c => c.currency !== currency) ? incomeTotals.byCurrency.map(c => ({ currency: c.currency, total: round(Number(c.total)) })) : null
        };
      } else if (offset === 0) {
        hint = await incomeHint(ctx.userId);
      }
    }

    res.json({
      offset,
      scope: familyView ? 'family' : 'mine',
      canSwitch: !!family,
      startDay,
      today,
      currency,
      period: periodOut(period),
      spent: round(spent),
      count: totals.count,
      budget: total ? { id: total.id, limit: round(total.limit), spent: round(total.spent), ratio: total.ratio } : null,
      plan: {
        days: plan.days,
        lastIndex: plan.lastIndex,
        actual: roundAll(plan.actual),
        planLine: roundAll(plan.planLine),
        planJumps: roundAll(plan.planJumps),
        forecast: plan.forecast ? { start: plan.forecast.start, values: roundAll(plan.forecast.values), jumps: roundAll(plan.forecast.jumps), end: round(plan.forecast.end) } : null,
        limit: round(plan.limit),
        bills: round(plan.bills),
        planToDate: plan.planToDate ? { date: plan.planToDate.date, plan: round(plan.planToDate.plan), diff: round(plan.planToDate.diff) } : null
      },
      allowance,
      income,
      incomeHint: hint,
      members: members.map(m => ({ id: m.id, name: m.name, mine: m.id === ctx.userId, total: round(m.total), share: memberSum > 0 ? m.total / memberSum : 0 })),
      categories: categories.map(c => {
        const budget = budgetFor(c.name);
        return {
          id: Number(c.id),
          name: c.name,
          label: categoryLabel(c.name, ctx, get),
          icon: c.icon || '📦',
          total: round(c.total),
          share: categorySum > 0 ? c.total / categorySum : 0,
          budget: budget ? { limit: round(budget.limit), ratio: budget.ratio, level: level(budget.ratio) } : null
        };
      }),
      // Кольцо прошлых периодов и динамика — премиум (как «🖼 График» / «📈 Динамика» в боте)
      donut: offset === 0 || ctx.isPremium,
      upcoming: recurring
        .filter(item => item.nextChargeDate && item.nextChargeDate >= today && item.nextChargeDate < period.end)
        .sort((a, b) => (a.nextChargeDate < b.nextChargeDate ? -1 : a.nextChargeDate > b.nextChargeDate ? 1 : 0))
        .map(item => {
          const authorId = item.user_id === undefined ? ctx.userId : Number(item.user_id);
          return {
            id: Number(item.id),
            description: item.description,
            amount: Number(item.amount),
            currency: item.currency,
            date: item.nextChargeDate,
            icon: item.category_icon || null,
            mine: authorId === ctx.userId,
            author: authorId === ctx.userId ? null : { id: authorId, name: item.first_name || item.username || '' }
          };
        })
    });
  }));

  // GET /api/overview/category/:id?offset=&scope= — записи категории за период (свои или семейные) и её динамика
  router.get('/overview/category/:id', http.wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw http.notFound();
    const offset = offsetOf(req.query.offset);
    const { ctx, family, familyView, owner } = await viewer(req);
    const expenseService = get('expenseService');
    const category = familyView ? await expenseService.getFamilyCategoryById(family.id, id) : await expenseService.getCategoryById(ctx.userId, id);
    if (!category) throw http.notFound();
    const { timezone, currency, period } = await expenseService.getPeriodContext(ctx.userId, 'month', offset);
    const [rows, trend] = await Promise.all([
      expenseService.getExpenses(owner, timezone, period, category.name),
      // Динамика — премиум, как «📈 Динамика» категории в боте
      ctx.isPremium ? get('chartService').trendData(ctx.userId, offset, { categoryId: id, familyId: familyView ? family.id : null }) : null
    ]);
    const spent = rows.length ? await get('formatter').sumInCurrency(groupByCurrency(rows), currency) : 0;
    res.json({
      offset,
      scope: familyView ? 'family' : 'mine',
      period: periodOut(period),
      category: { id: Number(category.id), name: category.name, label: categoryLabel(category.name, ctx, get), icon: category.icon || '📦' },
      spent: round(spent),
      count: rows.length,
      expenses: rows.map(row => serializeExpense(row, ctx, get)).reverse(),
      trend: trend ? trendOut(trend) : null
    });
  }));

  // GET /api/report?offset= — итоги периода (свои): полные с премиумом, краткие (топ-3) без
  router.get('/report', http.wrap(async (req, res) => {
    const offset = offsetOf(req.query.offset);
    const ctx = await req.ctx();
    const data = await get('reportService').reportData(ctx.userId, offset, { full: ctx.isPremium });
    const out = { offset, current: offset === 0, full: data.full, period: periodOut(data.period), hasData: data.hasData, count: data.count };
    if (!data.hasData) return res.json(out);
    const category = (c) => ({ id: Number(c.id), name: c.name, label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦', total: round(c.total) });
    Object.assign(out, {
      spent: round(data.spent),
      previous: data.previous ? { spent: round(data.previous.spent), change: data.previous.change, days: data.previous.days } : null,
      income: data.income ? { total: round(data.income.total), balance: round(data.income.balance) } : null,
      categories: data.categories.map(c => ({ ...category(c), share: data.spent > 0 ? c.total / data.spent : 0, ...(data.compared ? { change: c.change } : {}) }))
    });
    if (data.full) {
      Object.assign(out, {
        compared: data.compared,
        gone: data.gone.map(category),
        budgets: data.budgets.map(b => ({
          id: Number(b.id),
          category: b.category_name === null ? null : { name: b.category_name, label: categoryLabel(b.category_name, ctx, get), icon: b.icon || '📦' },
          spent: round(b.spent),
          limit: round(b.limit),
          ratio: b.ratio
        })),
        perDay: round(data.perDay),
        largest: data.largest ? { value: round(data.largest.value), expense: serializeExpense(data.largest.expense, ctx, get) } : null
      });
    }
    res.json(out);
  }));

  // GET /api/trends?category= — траты по периодам (свои): до 12 периодов, если были траты, не меньше 6; средняя —
  // с первого периода с тратами, текущий незаконченный в неё не входит. Премиум (как «📈 Динамика» в боте)
  router.get('/trends', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    if (!ctx.isPremium) throw http.premiumRequired('trends');
    const categoryId = req.query.category === undefined || req.query.category === '' ? null : Number(req.query.category);
    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId < 1)) throw http.notFound();
    const data = await get('chartService').trendData(ctx.userId, 0, { categoryId, count: TREND_MAX });
    if (!data) throw http.notFound();
    const first = data.periods.findIndex(p => p.value > 0);
    const from = Math.min(first < 0 ? TREND_MAX : first, TREND_MAX - TREND_MIN);
    const shown = { ...data, periods: data.periods.slice(from) };
    // Категории для переключателя — по тратам за весь показанный срок, одним запросом
    const span = { start: shown.periods[0].start, end: shown.periods[shown.periods.length - 1].end };
    const { timezone, currency } = await get('expenseService').getPeriodContext(ctx.userId, 'month', 0);
    const categories = await get('reportService').categoryBreakdown(ctx.userId, timezone, span, currency);
    res.json({
      startDay: ctx.startDay,
      category: data.category ? { id: Number(data.category.id), name: data.category.name, label: categoryLabel(data.category.name, ctx, get), icon: data.category.icon || '📦' } : null,
      ...trendOut(shown),
      categories: categories.map(c => ({ id: Number(c.id), name: c.name, label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦', total: round(c.total) }))
    });
  }));
};
