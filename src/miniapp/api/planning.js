const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const { WARN_DAYS_OPTIONS } = require('../../utils/subscriptionAlerts');
const { budgetJson } = require('./budgets');

// «Планы» Mini App — то же, что «🧭 Планирование» бота (PlanningHandlers, SubscriptionHandlers): хаб, «Можно
// потратить сегодня», платежи на 30 дней, подписки (карточка, отметки, предупреждения о списании, «Как отменить»),
// пробные периоды, «Моя инфляция». Расчёты — PlanningService / SubscriptionAlertService, лимиты тарифа — те же.
const TRIAL_NAME_MAX = 60;
const TRIAL_MAX_DAYS = 366;
const TRIAL_MAX_AMOUNT = 99999999.99;
const HUB_NEXT = 3; // ближайших платежей на хабе
const SUB_ACTIONS = ['confirm', 'dismiss', 'mute', 'unmute', 'cancel', 'keep'];
const TRIAL_ACTIONS = ['keep', 'cancel', 'mute', 'unmute'];

const r2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const orNull = (value) => (value === null || value === undefined ? null : r2(value));
const finite = (value) => (Number.isFinite(value) ? value : null);

// «Можно потратить сегодня»: лимит дня и каждое слагаемое «Как считаю» (как pla в боте)
function allowanceJson(a) {
  const base = {
    mode: a.mode, currency: a.currency, today: a.today, period: { start: a.period.start, last: a.period.last },
    daysLeft: a.daysLeft, family: !!a.family
  };
  if (a.mode === 'none') return base;
  const o = a.outlook;
  return {
    ...base,
    days: a.days,
    daily: r2(a.daily),
    rawDaily: r2(a.rawDaily),
    capped: !!a.capped,
    spentToday: r2(a.spentToday),
    leftToday: r2(a.leftToday),
    pace: a.pace,
    deficit: r2(a.deficit),
    free: r2(a.free),
    income: a.mode === 'income' ? {
      total: r2(o.income),
      recorded: r2(o.recorded),
      upcoming: r2(o.upcoming),
      expected: o.upcomingList.map(({ date, stream }) => ({ date, label: stream.label || null, amount: r2(stream.amount) })),
      average: orNull(o.average),
      averagePeriods: o.averagePeriods,
      // Ожидаемый доход взят как средний за прошлые периоды (записанного и ожидаемого меньше)
      usesAverage: o.average !== null && o.income === o.average && o.average > o.recorded + o.upcoming
    } : null,
    budget: orNull(a.budget),
    budgetFree: orNull(a.budgetFree),
    limitedBy: a.limitedBy || null,
    spent: r2(a.spentBefore),
    bills: {
      total: r2(a.bills),
      // Резерв до следующего дохода после конца периода (иначе — до конца периода)
      until: a.reserveUntil > a.period.end ? a.reserveUntil : null,
      items: a.billsList.map(item => ({
        date: item.date,
        kind: item.kind === 'detected' ? 'subscription' : 'recurring',
        label: String(item.label || item.description || '').trim(),
        amount: r2(item.amount),
        currency: item.currency
      }))
    },
    // Платежи только до конца периода — для расчёта от общего бюджета (бюджет — на период)
    budgetBills: r2(a.budgetBills),
    budgetDebts: r2(a.budgetDebts),
    debts: { total: r2(a.debtsTotal), prorated: !!a.debtsProrated },
    savings: r2(a.savings)
  };
}

// Строка календаря: ref — регулярная трата / долг (id) / подписка (id карточки) / выплата (ключ)
function calendarItem(item) {
  return {
    date: item.date || null,
    kind: item.kind,
    label: item.label ? String(item.label).trim() : null,
    amount: r2(item.amount),
    currency: item.currency,
    paid: !!item.paid,
    ref: item.kind === 'recurring' || item.kind === 'debt' ? Number(item.ref) : item.ref
  };
}

function subscriptionJson(sub, settings) {
  const state = sub.alert ? sub.alert.state : null;
  const isSub = !!(sub.confirmed || sub.known);
  return {
    id: sub.id,
    kind: sub.kind,
    label: sub.label,
    amount: r2(sub.amount),
    currency: sub.currency,
    cadence: sub.cadence,
    monthly: r2(sub.monthlyMain),
    nextDate: sub.nextDate,
    day: sub.day || null,
    confirmed: !!sub.confirmed,
    known: !!sub.known,
    isSub,
    state, // 'muted' | 'cancelling' | null
    warns: settings.enabled && !state && isSub,
    recurringId: sub.kind === 'recurring' ? Number(sub.recurringId) : null
  };
}

function trialJson(trial, today) {
  return {
    id: Number(trial.id),
    name: trial.name,
    endDate: trial.end_date,
    amount: trial.amount === null || trial.amount === undefined ? null : r2(trial.amount),
    currency: trial.currency || null,
    state: trial.state,
    ended: trial.end_date < today
  };
}

function inflationItem(item) {
  return { name: item.name, oldPrice: item.oldPrice, newPrice: item.newPrice, change: item.change, firstDate: item.firstDate, lastDate: item.lastDate };
}

module.exports = (router, { get, http }) => {
  const planning = () => get('planningService');
  const alerts = () => get('subscriptionAlertService');

  async function settingsOf(userId) {
    const settings = await alerts().getSettings(userId);
    return { enabled: settings.enabled, days: settings.days, options: WARN_DAYS_OPTIONS };
  }

  // Подписка из видимых по тарифу (как карточка plsc) или 404
  async function findSub(userId, id) {
    const subs = await planning().getSubscriptions(userId);
    const sub = subs.shown.find(s => s.id === id);
    if (!sub) throw http.notFound('subscription_outdated');
    return { subs, sub };
  }

  async function findTrial(userId, rawId) {
    const id = http.int(rawId, { min: 1, code: 'not_found' });
    const trial = await alerts().getTrial(userId, id);
    if (!trial) throw http.notFound('trial_not_found');
    return trial;
  }

  function guideFor(target) {
    return alerts().cancelGuideInfo(target);
  }

  // ========================================
  // ХАБ
  // ========================================

  router.get('/plans', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const userId = req.userId;
    const subs = await planning().getSubscriptions(userId);
    const [allowance, calendar, inflation, trials, budgets] = await Promise.all([
      planning().getAllowance(userId, { subs }),
      planning().getCalendar(userId, { subs }),
      planning().getInflation(userId),
      alerts().getTrials(userId, subs.today),
      ctx.isPremium ? budgetsBlock(userId, ctx) : null
    ]);
    let inflationState = 'ok';
    if (!inflation.purchases) inflationState = 'empty';
    else if (!inflation.isPremium) inflationState = 'locked';
    else if (!inflation.basket) inflationState = 'wait';
    res.json({
      today: subs.today,
      currency: subs.currency,
      allowance: allowanceJson(allowance),
      next: calendar.items.filter(item => item.kind !== 'income' && !item.paid).slice(0, HUB_NEXT).map(calendarItem),
      payments: calendar.items.filter(item => item.kind !== 'income' && !item.paid).length,
      subscriptions: { count: subs.all.length, monthly: r2(subs.totalMonthly) },
      trials: trials.map(trial => trialJson(trial, subs.today)),
      inflation: {
        state: inflationState,
        change: inflationState === 'ok' ? inflation.basket.change : null,
        since: inflationState === 'ok' ? inflation.basket.since : null
      },
      // null — без премиума (бюджеты — премиум, строка ведёт на экран премиума)
      budgets
    });
  }));

  async function budgetsBlock(userId, ctx) {
    const budgetService = get('budgetService');
    const period = await get('expenseService').getPeriodContext(userId, 'month', 0);
    const [statuses, scope] = await Promise.all([budgetService.getStatus(userId, period), budgetService.scopeFor(userId)]);
    return { family: typeof scope === 'object', items: statuses.map(s => budgetJson(s, ctx, get)) };
  }

  // ========================================
  // МОЖНО ПОТРАТИТЬ СЕГОДНЯ
  // ========================================

  router.get('/plans/allowance', http.wrap(async (req, res) => {
    res.json(allowanceJson(await planning().getAllowance(req.userId)));
  }));

  // ========================================
  // ПЛАТЕЖИ
  // ========================================

  router.get('/plans/calendar', http.wrap(async (req, res) => {
    const cal = await planning().getCalendar(req.userId);
    res.json({
      today: cal.today,
      until: cal.until,
      currency: cal.currency,
      outTotal: r2(cal.outTotal),
      inTotal: r2(cal.inTotal),
      remindersOn: !!cal.remindersOn,
      items: cal.items.map(calendarItem),
      undated: cal.undated.map(calendarItem),
      // Долги с платежом: число платежа (plcd) — сначала без даты
      debts: cal.debts
        .filter(debt => debt.monthly_payment > 0 && debt.balance > 0)
        .sort((a, b) => (a.due_day ? 1 : 0) - (b.due_day ? 1 : 0))
        .map(debt => ({ id: Number(debt.id), name: debt.name, dueDay: debt.due_day || null, payment: r2(debt.monthly_payment), currency: debt.currency }))
    });
  }));

  // Число платежа по долгу: 1–31 (в коротких месяцах — последний день), 0 — убрать
  router.put('/plans/debts/:id/due-day', http.wrap(async (req, res) => {
    const potId = http.int(req.params.id, { min: 1, code: 'not_found' });
    const day = http.int((req.body || {}).day, { min: 0, max: 31, code: 'due_day' });
    const debt = await planning().setDueDay(req.userId, potId, day === 0 ? null : day);
    if (!debt) throw http.notFound('debt_not_found');
    res.json({ id: Number(debt.id), name: debt.name, dueDay: debt.due_day || null });
  }));

  // Утреннее напоминание о платежах и предупреждения о списании (экран напоминаний «Профиля» тоже зовёт)
  router.get('/plans/reminders', http.wrap(async (req, res) => {
    const [bills, subWarn] = await Promise.all([planning().isBillRemindersEnabled(req.userId), settingsOf(req.userId)]);
    res.json({ bills: !!bills, subWarn });
  }));

  router.put('/plans/reminders', http.wrap(async (req, res) => {
    const body = req.body || {};
    if (body.bills !== undefined) {
      if (typeof body.bills !== 'boolean') throw http.badRequest('bad_bool');
      await planning().setBillRemindersEnabled(req.userId, body.bills);
    }
    if (body.subWarnDays !== undefined) {
      // Выбор дней включает предупреждения (как plwd в боте)
      if (!(await alerts().setWarnDays(req.userId, Number(body.subWarnDays)))) throw http.badRequest('bad_warn_days');
    } else if (body.subWarn !== undefined) {
      if (typeof body.subWarn !== 'boolean') throw http.badRequest('bad_bool');
      await alerts().setWarnEnabled(req.userId, body.subWarn);
    }
    const [bills, subWarn] = await Promise.all([planning().isBillRemindersEnabled(req.userId), settingsOf(req.userId)]);
    res.json({ bills: !!bills, subWarn });
  }));

  // ========================================
  // ПОДПИСКИ
  // ========================================

  router.get('/plans/subscriptions', http.wrap(async (req, res) => {
    const userId = req.userId;
    const subs = await planning().getSubscriptions(userId);
    const [settings, trials, trialLimit, { limits }] = await Promise.all([
      settingsOf(userId),
      alerts().getTrials(userId, subs.today),
      alerts().canAddTrial(userId, subs.today),
      planning().limits(userId)
    ]);
    res.json({
      today: subs.today,
      currency: subs.currency,
      isPremium: !!subs.isPremium,
      count: subs.all.length,
      monthly: r2(subs.totalMonthly),
      yearly: r2(subs.totalMonthly * 12),
      items: subs.shown.map(sub => subscriptionJson(sub, settings)),
      hidden: { count: subs.hiddenCount, monthly: r2(subs.hiddenMonthly) },
      dismissed: subs.dismissed,
      limit: finite(limits.PLANNING_SUBSCRIPTIONS),
      settings,
      trials: trials.map(trial => trialJson(trial, subs.today)),
      trialLimit: { ok: trialLimit.ok, max: finite(trialLimit.max) }
    });
  }));

  // «↩️ Вернуть скрытые» — число возвращённых
  router.post('/plans/subscriptions/restore', http.wrap(async (req, res) => {
    res.json({ restored: await planning().restoreDismissed(req.userId) });
  }));

  router.get('/plans/subscriptions/:id', http.wrap(async (req, res) => {
    const { subs, sub } = await findSub(req.userId, req.params.id);
    const settings = await settingsOf(req.userId);
    res.json({
      today: subs.today,
      isPremium: !!subs.isPremium,
      sub: subscriptionJson(sub, settings),
      settings,
      guide: guideFor({ name: sub.label, key: sub.key, recurringId: sub.kind === 'recurring' ? sub.recurringId : null })
    });
  }));

  // Действия карточки: confirm («✅ Это подписка», plsy), dismiss («🙈 Не подписка», plsn), mute (plwm),
  // unmute (plwu), cancel («🚫 Отменю», plwx), keep («↩️ Передумал — оставлю», plwk)
  router.post('/plans/subscriptions/:id/:action', http.wrap(async (req, res) => {
    const { action, id } = req.params;
    if (!SUB_ACTIONS.includes(action)) throw http.notFound();
    const userId = req.userId;
    if (action === 'confirm') {
      const result = await planning().confirmSubscription(userId, id);
      if (result.error === 'recurring_limit') {
        throw http.badRequest('subscription_recurring_limit', { max: planning().recurringExpenseService.getMaxPerUser() });
      }
      if (result.error) throw http.notFound('subscription_outdated');
      return res.json({ converted: !!result.converted, day: result.day || null, recurringId: result.recurring ? Number(result.recurring.id) : null });
    }
    if (action === 'dismiss') {
      const result = await planning().dismissSubscription(userId, id);
      if (result.error) throw http.notFound('subscription_outdated');
      return res.json({ ok: true });
    }
    const { sub } = await findSub(userId, id);
    const target = await alerts()[action](userId, sub.ref);
    if (!target) throw http.notFound('subscription_outdated');
    res.json({ ok: true });
  }));

  // ========================================
  // ПРОБНЫЕ ПЕРИОДЫ
  // ========================================

  router.get('/plans/trials', http.wrap(async (req, res) => {
    const today = await alerts().today(req.userId);
    const [trials, limit] = await Promise.all([alerts().getTrials(req.userId, today), alerts().canAddTrial(req.userId, today)]);
    res.json({ today, items: trials.map(trial => trialJson(trial, today)), limit: { ok: limit.ok, max: finite(limit.max) } });
  }));

  // Новый пробный период: сервис, цена после пробного (может не быть), дата окончания — от сегодня до года вперёд.
  // Без премиума — один действующий за раз (402, как «🔒» в боте)
  router.post('/plans/trials', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const name = http.str(body.name, { max: TRIAL_NAME_MAX, code: 'trial_name' }).replace(/\s+/g, ' ');
    if (!/\p{L}/u.test(name)) throw http.badRequest('trial_name');
    const hasAmount = body.amount !== undefined && body.amount !== null && body.amount !== '';
    const amount = hasAmount ? http.money(body.amount, { max: TRIAL_MAX_AMOUNT }) : null;
    let currency = null;
    if (amount !== null) {
      currency = body.currency ? String(body.currency).toUpperCase() : ctx.currency;
      if (!SUPPORTED_CURRENCIES.includes(currency)) throw http.badRequest('bad_currency');
    }
    const endDate = http.ymd(body.endDate, { code: 'trial_date' });
    const result = await alerts().addTrial(req.userId, { name, amount, currency, endDate, maxDays: TRIAL_MAX_DAYS });
    if (result.error === 'limit') throw http.premiumRequired('trials');
    if (result.error === 'bad_date') throw http.badRequest('trial_date');
    if (result.error) throw http.notFound('trial_not_found');
    res.status(201).json(trialJson(result.trial, result.today));
  }));

  router.get('/plans/trials/:id', http.wrap(async (req, res) => {
    const trial = await findTrial(req.userId, req.params.id);
    const today = await alerts().today(req.userId);
    res.json({ today, trial: trialJson(trial, today), guide: guideFor({ name: trial.name }) });
  }));

  router.delete('/plans/trials/:id', http.wrap(async (req, res) => {
    const id = http.int(req.params.id, { min: 1, code: 'not_found' });
    if (!(await alerts().deleteTrial(req.userId, id))) throw http.notFound('trial_not_found');
    res.json({ ok: true });
  }));

  // keep («✅ Нужна»), cancel («🚫 Отменю»), mute («🔕»), unmute («🔔 Напоминать»)
  router.post('/plans/trials/:id/:action', http.wrap(async (req, res) => {
    if (!TRIAL_ACTIONS.includes(req.params.action)) throw http.notFound();
    const trial = await findTrial(req.userId, req.params.id);
    const target = await alerts()[req.params.action](req.userId, `t${trial.id}`);
    if (!target) throw http.notFound('trial_not_found');
    const fresh = await alerts().getTrial(req.userId, trial.id);
    res.json(trialJson(fresh || trial, await alerts().today(req.userId)));
  }));

  // ========================================
  // МОЯ ИНФЛЯЦИЯ
  // ========================================

  // Премиум — процент корзины и списки (до PLANNING_INFLATION_ITEMS в каждом); без — одна позиция-пример и число
  router.get('/plans/inflation', http.wrap(async (req, res) => {
    const inf = await planning().getInflation(req.userId);
    const base = { purchases: inf.purchases, count: inf.items.length, currency: inf.currency, isPremium: !!inf.isPremium };
    if (!inf.isPremium) {
      const teaser = inf.risers[0] || inf.fallers[0] || inf.items[0];
      return res.json({ ...base, basket: null, risers: [], fallers: [], teaser: teaser ? inflationItem(teaser) : null });
    }
    res.json({
      ...base,
      basket: inf.basket ? { change: inf.basket.change, count: inf.basket.count, since: inf.basket.since } : null,
      risers: inf.risers.slice(0, inf.itemsLimit).map(inflationItem),
      fallers: inf.fallers.slice(0, inf.itemsLimit).map(inflationItem),
      teaser: null
    });
  }));
};

