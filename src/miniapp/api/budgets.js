const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { categoryLabel } = require('../serialize');

// Бюджеты Mini App (премиум) — как «🎯 Бюджеты» бота (BudgetHandlers): лимиты текущего периода, общий и по категориям,
// в основной валюте; контур — BudgetService.scopeFor (при «все траты в семью» — общие семейные бюджеты).
const MAX_BUDGET_AMOUNT = 9999999999; // category_budgets.amount DECIMAL(12,2)

const r2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Статус бюджета (BudgetService.getStatus): amount/currency — лимит как задан, limit/spent/left — в основной валюте
function budgetJson(status, ctx, get) {
  const total = status.category_name === null;
  return {
    id: Number(status.id),
    total,
    category: total ? null : { name: status.category_name, label: categoryLabel(status.category_name, ctx, get), icon: status.icon || '📦' },
    amount: Number(status.amount),
    currency: status.currency,
    limit: r2(status.limit),
    spent: r2(status.spent),
    left: r2(status.limit - status.spent),
    ratio: Math.round(Number(status.ratio || 0) * 10000) / 10000
  };
}

function register(router, { get, http }) {
  const budgets = () => get('budgetService');

  async function premiumCtx(req) {
    const ctx = await req.ctx();
    if (!ctx.isPremium) throw http.premiumRequired('budgets');
    return ctx;
  }

  async function load(userId, ctx) {
    const period = await get('expenseService').getPeriodContext(userId, 'month', 0);
    const [statuses, scope, categories] = await Promise.all([
      budgets().getStatus(userId, period),
      budgets().scopeFor(userId),
      get('expenseService').getCategories(userId)
    ]);
    return { period, statuses, family: typeof scope === 'object', categories };
  }

  // Цель для изменения: 'total' или id доступной категории с таким именем (как targetForBudget бота); null — категории нет
  function targetOf(status, categories) {
    if (status.category_name === null) return 'total';
    const category = categories.find(c => c.name === status.category_name);
    return category ? Number(category.id) : null;
  }

  function amountOf(body) {
    return http.money(body.amount, { max: MAX_BUDGET_AMOUNT });
  }

  function currencyOf(body, ctx) {
    const currency = body.currency ? String(body.currency).toUpperCase() : ctx.currency;
    if (!SUPPORTED_CURRENCIES.includes(currency)) throw http.badRequest('bad_currency');
    return currency;
  }

  async function trackSet(userId, ctx) {
    const achievements = get('achievementService');
    const note = achievements ? await achievements.track(userId, 'budget_set', { lang: ctx.lang }) : '';
    return note ? note.replace(/[*_`]/g, '') : null;
  }

  router.get('/budgets', http.wrap(async (req, res) => {
    const ctx = await premiumCtx(req);
    const { period, statuses, family, categories } = await load(req.userId, ctx);
    const byName = new Map(statuses.filter(s => s.category_name !== null).map(s => [s.category_name, Number(s.id)]));
    res.json({
      period: { start: period.period.start, last: period.period.last },
      currency: period.currency,
      family,
      items: statuses.map(s => budgetJson(s, ctx, get)),
      // Для формы: категории и уже заданные бюджеты (новый лимит на ту же категорию перезапишет старый, как в боте)
      categories: categories.map(c => ({
        id: Number(c.id), name: c.name, label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦', budgetId: byName.get(c.name) || null
      }))
    });
  }));

  router.get('/budgets/:id', http.wrap(async (req, res) => {
    const ctx = await premiumCtx(req);
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    const { period, statuses, family, categories } = await load(req.userId, ctx);
    const status = statuses.find(s => Number(s.id) === id);
    if (!status) throw http.notFound('budget_not_found');
    res.json({
      period: { start: period.period.start, last: period.period.last },
      currency: period.currency,
      family,
      budget: budgetJson(status, ctx, get),
      target: targetOf(status, categories)
    });
  }));

  // Новый бюджет или новый лимит: target — 'total' или id категории; бюджет на ту же цель перезаписывается
  router.post('/budgets', http.wrap(async (req, res) => {
    const ctx = await premiumCtx(req);
    const body = req.body || {};
    const amount = amountOf(body);
    const currency = currencyOf(body, ctx);
    let categoryName = null;
    if (body.target !== 'total') {
      const categoryId = http.int(body.target, { min: 1, code: 'budget_category_gone' });
      const category = (await get('expenseService').getCategories(req.userId)).find(c => Number(c.id) === categoryId);
      if (!category) throw http.badRequest('budget_category_gone');
      categoryName = category.name;
    }
    const saved = await budgets().setBudget(req.userId, categoryName, amount, currency);
    res.status(201).json({ id: Number(saved.id), achievement: await trackSet(req.userId, ctx) });
  }));

  router.put('/budgets/:id', http.wrap(async (req, res) => {
    const ctx = await premiumCtx(req);
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    const body = req.body || {};
    const amount = amountOf(body);
    const currency = currencyOf(body, ctx);
    const { statuses, categories } = await load(req.userId, ctx);
    const status = statuses.find(s => Number(s.id) === id);
    if (!status) throw http.notFound('budget_not_found');
    if (targetOf(status, categories) === null) throw http.badRequest('budget_category_gone');
    const saved = await budgets().setBudget(req.userId, status.category_name, amount, currency);
    res.json({ id: Number(saved.id), achievement: await trackSet(req.userId, ctx) });
  }));

  // Удаление; в ответе — цель, лимит и валюта, чтобы «Вернуть» завёл бюджет заново
  router.delete('/budgets/:id', http.wrap(async (req, res) => {
    const ctx = await premiumCtx(req);
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    const { statuses, categories } = await load(req.userId, ctx);
    const status = statuses.find(s => Number(s.id) === id);
    if (!status || !(await budgets().deleteBudget(req.userId, id))) throw http.notFound('budget_not_found');
    const target = targetOf(status, categories);
    res.json({ deleted: target === null ? null : { target, amount: Number(status.amount), currency: status.currency } });
  }));
}

module.exports = register;
module.exports.budgetJson = budgetJson;
