// Регулярные траты (бот: recurring_menu, rc|, recurring_add → recurring_category, recurring_delete|, rpa|, rpx|, rcf|,
// plwr|): список с датой следующей записи и итогом в месяц, создание, правка (только в приложении), «Уже оплатил» и
// его отмена, «Семейный / Личный», предупреждение о списании для подписок, удаление с «Вернуть».
const { USER_LIMITS } = require('../../utils/constants');
const { categoryLabel } = require('../serialize');
const logger = require('../../utils/logger');
const shared = require('./incomeShared');

const undo = shared.undoStore();
const monthOf = (date) => `${date.slice(0, 7)}-01`;

module.exports = (router, { get, http }) => {
  const descriptionMax = (ctx) => (ctx.isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_DESCRIPTION_LENGTH;
  const id = (req) => http.int(req.params.id, { min: 1, max: 2147483647, code: 'recurring_not_found' });

  // Семья, в которую можно писать списания: премиум-участник семьи (как RecurringExpenseHandlers.familyFor); иначе null
  async function familyFor(ctx) {
    if (!ctx.isPremium) return null;
    return get('familyService').getUserFamily(ctx.userId);
  }

  function category(row, ctx) {
    if (!row.category_name) return null;
    return { id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id), name: row.category_name, label: categoryLabel(row.category_name, ctx, get), icon: row.category_icon || '📦' };
  }

  // Регулярная: { id, amount, currency, description, dayOfMonth, nextChargeDate, lastChargedMonth, recordedThisMonth,
  // category, isFamily, subscription }
  function view(row, ctx, { subscription = false } = {}) {
    const lastChargedMonth = row.last_charged_month || null;
    return {
      id: Number(row.id),
      amount: Number(row.amount),
      currency: row.currency,
      description: row.description,
      dayOfMonth: Number(row.day_of_month),
      nextChargeDate: row.nextChargeDate,
      lastChargedMonth,
      // Трата за этот месяц уже записана (или оплачена заранее): следующая — в следующем месяце
      recordedThisMonth: !!lastChargedMonth && lastChargedMonth >= monthOf(ctx.today),
      category: category(row, ctx),
      isFamily: !!row.is_family,
      subscription
    };
  }

  // Предупреждение о списании (как строка и кнопка plwr| в карточке бота): on — предупреждаю об этой; state — 'off'
  // (не подписка), 'on', 'disabled' (предупреждения выключены в «Подписках»), 'locked' (без премиума — только о самых
  // дорогих), 'muted', 'cancelling'; days — за сколько дней
  async function alertView(userId, recurringId) {
    const status = await get('subscriptionAlertService').recurringStatus(userId, recurringId);
    const state = !status.subscription ? 'off' : status.cancelling ? 'cancelling' : status.muted ? 'muted'
      : status.locked ? 'locked' : status.enabled ? 'on' : 'disabled';
    return {
      on: !!status.subscription && !status.muted && !status.cancelling,
      state,
      days: status.days,
      lockedCount: USER_LIMITS.regular.PLANNING_SUBSCRIPTIONS
    };
  }

  // Для формы: валюта по умолчанию (основная), категории, можно ли семейный и что по умолчанию («все траты в семью»)
  async function options(ctx) {
    const [categories, family, user] = await Promise.all([
      get('expenseService').getCategories(ctx.userId),
      familyFor(ctx),
      get('userService').getUserById(ctx.userId)
    ]);
    return {
      currency: ctx.currency,
      categories: categories.map(c => ({ id: Number(c.id), name: c.name, label: categoryLabel(c.name, ctx, get), icon: c.icon || '📦' })),
      family: !!family,
      familyDefault: !!family && !!(user && user.family_mode),
      descriptionMax: descriptionMax(ctx),
      max: get('recurringExpenseService').getMaxPerUser(),
      today: ctx.today
    };
  }

  // Ввод формы: как шаги бота (сумма и описание обязательно, число 1–31, категория — из доступных пользователю)
  async function input(body, ctx) {
    const categoryId = http.int(body.categoryId, { min: 1, max: 2147483647, code: 'recurring_category' });
    const categories = await get('expenseService').getCategories(ctx.userId);
    if (!categories.some(c => Number(c.id) === categoryId)) throw http.badRequest('recurring_category');
    return {
      amount: http.money(body.amount, { code: 'recurring_amount' }),
      currency: shared.currency(body.currency, { def: ctx.currency, code: 'recurring_currency' }),
      description: shared.description(body.description, {
        max: descriptionMax(ctx), validator: get('enhancedValidator'), code: 'recurring_description', emptyCode: 'recurring_description_empty'
      }),
      dayOfMonth: http.int(body.dayOfMonth, { min: 1, max: 31, code: 'recurring_day' }),
      categoryId
    };
  }

  const warningTexts = (warnings, ctx) => warnings.map(w => shared.plain(get('budgetService').warningText(ctx.lang, w)));

  // Список (по дате следующей записи), итог в месяц в основной валюте, лимит. Подписки — регулярные, о которых
  // предупреждаю (PlanningService.getSubscriptions, как «🔁 Подписки»)
  router.get('/recurring', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const service = get('recurringExpenseService');
    const [items, family] = await Promise.all([service.list(req.userId), familyFor(ctx)]);
    let subscriptionIds = new Set();
    if (items.length) {
      try {
        const subs = await get('planningService').getSubscriptions(req.userId);
        subscriptionIds = new Set(subs.all.filter(s => s.kind === 'recurring').map(s => Number(s.recurringId)));
      } catch (error) {
        logger.warn('Mini app: subscriptions for recurring list failed', { userId: req.userId, error: error.message });
      }
    }
    const monthly = await get('formatter').sumInCurrency(items.map(item => ({ currency: item.currency, total: item.amount })), ctx.currency);
    res.json({
      currency: ctx.currency,
      monthly,
      count: items.length,
      max: service.getMaxPerUser(),
      family: !!family,
      items: items
        .map(item => view(item, ctx, { subscription: subscriptionIds.has(Number(item.id)) }))
        .sort((a, b) => (a.nextChargeDate < b.nextChargeDate ? -1 : a.nextChargeDate > b.nextChargeDate ? 1 : a.id - b.id))
    });
  }));

  router.get('/recurring/defaults', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    res.json({ options: await options(ctx), count: (await get('recurringExpenseService').list(req.userId)).length });
  }));

  router.get('/recurring/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const recurringId = id(req);
    const item = await get('recurringExpenseService').get(req.userId, recurringId);
    if (!item) throw http.notFound('recurring_not_found');
    const [opts, alert] = await Promise.all([options(ctx), alertView(req.userId, recurringId)]);
    res.json({ item: view(item, ctx, { subscription: alert.state !== 'off' }), alert, options: opts });
  }));

  // Создать (бот: recurring_add → число → категория). Семейная — только у премиума-участника семьи; без isFamily —
  // по режиму «все траты в семью». Число сегодня — трата записывается сразу (chargedNow, предупреждения бюджета)
  router.post('/recurring', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const data = await input(req.body, ctx);
    const family = await familyFor(ctx);
    let isFamily = false;
    if (family) {
      if (typeof req.body.isFamily === 'boolean') isFamily = req.body.isFamily;
      else isFamily = !!(await get('userService').getUserById(req.userId))?.family_mode;
    }
    let created;
    try {
      created = await get('recurringExpenseService').create(req.userId, { ...data, isFamily });
    } catch (error) {
      if (error.code === 'recurring_limit') throw http.badRequest('recurring_limit');
      throw error;
    }
    res.status(201).json({
      id: created.id, chargedNow: created.chargedNow, nextChargeDate: created.nextChargeDate, warnings: warningTexts(created.budgetWarnings, ctx)
    });
  }));

  // Изменить сумму, валюту, описание, число, категорию (правило «записано в этом месяце» — RecurringExpenseService.update)
  router.put('/recurring/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const recurringId = id(req);
    const data = await input(req.body, ctx);
    const result = await get('recurringExpenseService').update(req.userId, recurringId, data);
    if (!result) throw http.notFound('recurring_not_found');
    res.json({ item: view(result.item, ctx), chargedNow: result.chargedNow, warnings: warningTexts(result.budgetWarnings, ctx) });
  }));

  // «Семейный / Личный» (бот: rcf|): дальше списания в семью или лично, записанное за этот месяц — туда же
  router.put('/recurring/:id/family', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const recurringId = id(req);
    if (typeof req.body.family !== 'boolean') throw http.badRequest('bad_family');
    if (!ctx.isPremium) throw http.premiumRequired('family');
    if (!(await familyFor(ctx))) throw http.forbidden('recurring_no_family');
    const changed = await get('recurringExpenseService').setFamily(req.userId, recurringId, req.body.family);
    if (!changed) throw http.notFound('recurring_not_found');
    res.json({ isFamily: req.body.family });
  }));

  // «Уже оплатил (списание DD.MM)» (бот: rpa|): month — месяц списания с экрана ('YYYY-MM-01'): экран устарел и этот
  // месяц уже записан — 409, следующий молча не оплачивается
  router.post('/recurring/:id/pay', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const recurringId = id(req);
    const month = req.body.month === undefined || req.body.month === null ? null : String(req.body.month);
    if (month !== null && !/^\d{4}-\d{2}-01$/.test(month)) throw http.badRequest('bad_month');
    const result = await get('recurringExpenseService').payAhead(req.userId, recurringId, month);
    if (result.status === 'missing') throw http.notFound('recurring_not_found');
    if (result.status !== 'ok') throw new http.HttpError(409, 'recurring_paid_already');
    res.json({
      expenseId: Number(result.expense.id), month: result.month, paidDate: result.paidDate, nextChargeDate: result.nextChargeDate,
      amount: Number(result.expense.amount), currency: result.expense.currency, warnings: warningTexts(result.warnings, ctx)
    });
  }));

  // Отмена «Уже оплатил» (бот: rpx|): трата удаляется, месяц снова ждёт своего числа
  router.post('/recurring/:id/pay/undo', http.wrap(async (req, res) => {
    const recurringId = id(req);
    const month = String(req.body.month || '');
    if (!/^\d{4}-\d{2}-01$/.test(month)) throw http.badRequest('bad_month');
    const expenseId = http.int(req.body.expenseId, { min: 1, max: 2147483647, code: 'recurring_paid_undo_gone' });
    const undone = await get('recurringExpenseService').undoPayAhead(req.userId, recurringId, month, expenseId);
    if (!undone) throw new http.HttpError(409, 'recurring_paid_undo_gone');
    const item = await get('recurringExpenseService').get(req.userId, recurringId);
    res.json({ item: item ? view(item, await req.ctx()) : null });
  }));

  // «🔔 Предупреждать о списании» / «🔕 Не предупреждать» (бот: plwr|) — SubscriptionAlertService.toggleRecurring
  router.post('/recurring/:id/alert', http.wrap(async (req, res) => {
    const recurringId = id(req);
    const enabled = await get('subscriptionAlertService').toggleRecurring(req.userId, recurringId);
    if (enabled === null) throw http.notFound('recurring_not_found');
    res.json({ alert: await alertView(req.userId, recurringId) });
  }));

  // Удалить (уже записанные траты остаются); несколько минут можно вернуть (POST /recurring/:id/restore)
  router.delete('/recurring/:id', http.wrap(async (req, res) => {
    const recurringId = id(req);
    const deleted = await get('recurringExpenseService').delete(req.userId, recurringId);
    if (!deleted) throw http.notFound('recurring_not_found');
    undo.put(req.userId, recurringId, deleted);
    res.json({ deleted: true });
  }));

  router.post('/recurring/:id/restore', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const row = undo.take(req.userId, id(req));
    let item = null;
    try {
      item = row ? await get('recurringExpenseService').restore(req.userId, row) : null;
    } catch (error) {
      if (error.code === 'recurring_limit') throw http.badRequest('recurring_limit');
      throw error;
    }
    if (!item) throw http.badRequest('recurring_restore_gone');
    res.json({ item: view(item, ctx) });
  }));
};
