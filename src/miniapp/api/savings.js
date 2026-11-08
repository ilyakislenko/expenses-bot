const { simulate } = require('../../utils/savingsForecast');
const { amortize, projectDebt, projectDebts } = require('../../utils/debtForecast');
const { potIcon, updateQueue, visibleAccounts, ownPots, cleanPotName, MAX_SAVINGS_AMOUNT, RATE_LIMITS } = require('../../utils/savingsView');
const { SUPPORTED_CURRENCIES } = require('../../config/currencies');
const SavingsService = require('../../services/SavingsService');

const FORECAST_MONTHS = 120; // прогноз — до 10 лет (сроки как в боте: полгода … 10 лет)
const HISTORY_LIMIT = 20; // история изменений в карточке (в боте — последние 3)
const DEBT_CHART_MONTHS = 60; // долг без срока погашения — как он меняется за 5 лет
const GOAL_CHART_MAX = 120;

// «Копилка» Mini App: накопления, счета, цели, долги, мастер «Обновить остатки», прогноз, сценарии, настройки прогноза.
// Те же сервисы и правила, что у раздела бота (SavingsHandlers): лимиты (счета и долги — до 10, цели — по премиуму),
// перевод суммы из другой валюты в валюту копилки, удаление счёта/цели — деньги в общую копилку, достижения.
module.exports = (router, { get, http }) => {
  const num = (value) => (value === null || value === undefined ? null : Number(value));

  // Дата 'YYYY-MM-DD' момента в поясе пользователя
  const localDate = (value, timezone) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(value)).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  // DATE-колонка pg приходит Date в поясе процесса (getState уже отдаёт строку)
  const dateOnly = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  };

  // Строка достижений бота — без разметки Markdown
  const plain = (text) => String(text || '').replace(/\\([_*`[\]()])/g, '$1').replace(/[*_`]/g, '').trim() || null;

  async function track(userId, event, lang) {
    const service = get('achievementService');
    return service ? plain(await service.track(userId, event, { lang })) : null;
  }

  function potView(pot) {
    const view = {
      id: Number(pot.id),
      kind: pot.kind,
      name: pot.name || null, // общая копилка без названия — «Общие накопления» (клиент)
      icon: potIcon(pot),
      balance: Number(pot.balance),
      currency: pot.currency,
      balanceMain: pot.balanceMain === undefined ? null : pot.balanceMain,
      yieldRate: num(pot.yield_rate)
    };
    if (pot.kind === 'goal') {
      Object.assign(view, { mode: pot.goal_mode, target: num(pot.target_amount), targetDate: dateOnly(pot.target_date) });
    }
    if (pot.kind === 'debt') Object.assign(view, { monthlyPayment: num(pot.monthly_payment), dueDay: pot.due_day ? Number(pot.due_day) : null });
    return view;
  }

  const debtPlan = (debt) => amortize({ balance: debt.balance, rate: debt.yield_rate, payment: debt.monthly_payment });

  // { amount, source: 'manual' | 'auto' | null, periods } — сколько откладываешь в месяц (как monthlyLine в боте)
  const monthlyView = (state) => ({
    amount: state.monthly,
    source: state.settings.manualMonthly !== null ? 'manual' : (state.auto ? 'auto' : null),
    periods: state.auto ? state.auto.periods : null
  });

  const rates = (state) => ({
    yieldRate: state.settings.yieldRate,
    inflationRate: state.settings.inflationRate,
    contributionGrowth: state.settings.contributionGrowth
  });

  const achievedView = (list) => (list || [])
    .filter((goal, index, all) => all.findIndex(g => g.id === goal.id) === index)
    .map(goal => ({ id: Number(goal.id), name: goal.name }));

  // Сумма из тела: > 0 (allowZero — и 0) не больше предела; currency — в какой валюте введена (пересчёт в валюту копилки)
  async function amountIn(body, potCurrency, { allowZero = false } = {}) {
    const raw = body.amount;
    const value = allowZero && (raw === 0 || raw === '0') ? 0 : http.money(raw, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' });
    const from = body.currency;
    if (!value || !from || from === potCurrency) return value;
    if (!SUPPORTED_CURRENCIES.includes(from)) throw http.badRequest('savings_currency');
    const converted = await get('savingsService').toCurrency(value, from, potCurrency);
    return Math.round(converted * 100) / 100;
  }

  // Ставка, % годовых: число от 0 до max, до двух знаков. null — если allowNull и пришло null
  function rate(value, max, { allowNull = false } = {}) {
    if (value === null && allowNull) return null;
    const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
    if (value === '' || !Number.isFinite(n) || n < 0 || n > max || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) throw http.badRequest('savings_rate');
    return n;
  }

  function name(value) {
    const cleaned = cleanPotName(value, get('enhancedValidator'));
    if (!cleaned) throw http.badRequest('savings_name');
    return cleaned;
  }

  function currency(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    if (!SUPPORTED_CURRENCIES.includes(value)) throw http.badRequest('savings_currency');
    return value;
  }

  // Срок цели — только будущее (как в боте)
  function futureDate(value, today) {
    const date = http.ymd(value, { code: 'savings_date' });
    if (date <= today) throw http.badRequest('savings_date');
    return date;
  }

  function dueDay(value) {
    if (value === null || value === undefined || value === '') return null;
    return http.int(value, { min: 1, max: 31, code: 'savings_due_day' });
  }

  // Не число в пути — такой копилки нет
  const potId = (req) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw http.notFound();
    return id;
  };

  // Рост к цели при текущем взносе (своя копилка — как будто весь взнос идёт в неё, как goalStatus)
  function goalChart(goal, status, state) {
    if (status.achieved || state.monthly === null) return null;
    const months = Math.min(GOAL_CHART_MAX, Math.max(6, status.etaNominal || 0, status.monthsLeft || 0));
    const parts = goal.goal_mode === 'total' ? state.parts : [{ balance: status.current, yieldRate: null }];
    const { points } = simulate({ parts, monthly: state.monthly, ...rates(state), months });
    return { values: points.map(p => p.nominal), target: status.target };
  }

  // Остаток долга по месяцам: до погашения по плановому платежу, иначе — 5 лет (растёт на проценты или стоит)
  function debtChart(debt, plan) {
    if (debt.balance <= 0) return null;
    if (!plan.paidOff && !(debt.yield_rate > 0)) return null;
    const months = plan.paidOff ? Math.max(1, plan.months) : DEBT_CHART_MONTHS;
    return { values: projectDebt({ balance: debt.balance, rate: debt.yield_rate, payment: debt.monthly_payment, months }) };
  }

  async function loadPot(userId, id) {
    const pot = await get('savingsService').getPot(userId, id);
    if (!pot) throw http.notFound();
    return pot;
  }

  // Главный экран: итог, капитал, «через год ≈», счета, цели с прогрессом, долги со сроком погашения
  router.get('/savings', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const service = get('savingsService');
    const [state, limits] = await Promise.all([service.getState(req.userId), get('premiumService').getUserLimits(req.userId)]);
    const goals = [];
    for (const goal of state.goals) {
      const status = await service.goalStatus(goal, state);
      goals.push({ ...potView(goal), status });
    }
    const shared = goals.filter(goal => goal.mode === 'total');
    const need = shared.reduce((sum, goal) => sum + goal.status.target, 0);
    const yearAhead = state.monthly === null ? null
      : simulate({ parts: state.parts, monthly: state.monthly, ...rates(state), months: 12 }).points[12].nominal;
    res.json({
      currency: state.currency,
      today: state.today,
      total: state.total,
      debtTotal: state.debtTotal,
      netWorth: state.netWorth,
      monthly: monthlyView(state),
      yearAhead,
      empty: state.total === 0 && !state.goals.length && !state.debts.length && state.accounts.length === 1,
      generalId: Number(state.general.id),
      canUpdate: updateQueue(state).length > 0,
      accounts: visibleAccounts(state.accounts).map(potView),
      goals,
      sharedGoals: shared.length > 1 ? { count: shared.length, need, short: Math.max(0, need - state.total) } : null,
      debts: state.debts.map(debt => ({ ...potView(debt), plan: debtPlan(debt) })),
      limits: {
        premium: !!ctx.isPremium,
        accounts: { count: state.accounts.filter(p => p.kind === 'account').length, max: SavingsService.MAX_ACCOUNTS },
        goals: { count: state.goals.length, max: limits.MAX_SAVINGS_GOALS },
        debts: { count: state.debts.length, max: SavingsService.MAX_DEBTS }
      }
    });
  }));

  // Карточка счёта, цели или долга: сумма, ставка, история, сроки, график, куда перевести
  router.get('/savings/pots/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const id = potId(req);
    const service = get('savingsService');
    const state = await service.getState(req.userId);
    const pot = state.pots.find(p => Number(p.id) === id);
    if (!pot) throw http.notFound();
    const operations = await service.getRecentOperations(req.userId, id, HISTORY_LIMIT);
    const result = {
      pot: potView(pot),
      currency: state.currency,
      today: state.today,
      monthly: monthlyView(state),
      settings: rates(state),
      updated: localDate(operations[0] ? operations[0].created_at : (pot.created_at || new Date()), ctx.timezone),
      operations: operations.map(op => ({
        id: Number(op.id), amount: Number(op.amount), kind: op.kind,
        createdAt: new Date(op.created_at).toISOString(), date: localDate(op.created_at, ctx.timezone)
      }))
    };
    if (pot.kind === 'general' || pot.kind === 'account') {
      result.transferTargets = pot.balance > 0 ? ownPots(state.pots).filter(p => Number(p.id) !== id).map(potView) : [];
    }
    if (pot.kind === 'goal') {
      const status = await service.goalStatus(pot, state);
      Object.assign(result, { status, chart: goalChart(pot, status, state) });
    }
    if (pot.kind === 'debt') {
      const plan = debtPlan(pot);
      Object.assign(result, { plan, chart: debtChart(pot, plan) });
    }
    res.json(result);
  }));

  // Новый счёт: название, валюта, ставка (null — как в настройках, 0 — без процентов), сколько сейчас
  router.post('/savings/accounts', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const service = get('savingsService');
    const fields = {
      name: name(body.name),
      currency: currency(body.currency, ctx.currency),
      yieldRate: body.yieldRate === undefined ? null : rate(body.yieldRate, RATE_LIMITS.y, { allowNull: true })
    };
    const balance = body.balance === undefined || body.balance === null || body.balance === 0 ? 0
      : http.money(body.balance, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' });
    const created = await service.createAccount(req.userId, fields);
    if (created.error === 'limit') throw http.forbidden('savings_limit', { limit: created.limit });
    let achieved = [];
    let note = null;
    if (balance > 0) {
      const result = await service.changeBalance(req.userId, created.pot.id, 'set', balance);
      achieved = result.achieved || [];
      note = await track(req.userId, achieved.length ? 'goal_reached' : 'savings_updated', ctx.lang);
    }
    res.json({ id: Number(created.pot.id), achieved: achievedView(achieved), note });
  }));

  // Новая цель: сумма (в основной валюте; другая — пересчёт), название, режим, срок. 1 бесплатно, больше — премиум
  router.post('/savings/goals', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const service = get('savingsService');
    const goalName = name(body.name);
    const target = await amountIn({ amount: body.target, currency: body.currency }, ctx.currency);
    const mode = body.mode === 'own' ? 'own' : 'total';
    const date = body.targetDate ? futureDate(body.targetDate, ctx.today) : null;
    const created = await service.createGoal(req.userId, { name: goalName, targetAmount: target, currency: ctx.currency });
    if (created.error === 'limit') {
      if (!ctx.isPremium) throw http.premiumRequired('savings_goals');
      throw http.forbidden('savings_goal_limit', { limit: created.limit });
    }
    const id = created.goal.id;
    let achieved = [];
    if (mode === 'own') achieved = (await service.setGoalMode(req.userId, id, 'own'))?.achieved || [];
    if (date) achieved = (await service.updateGoal(req.userId, id, { target_date: date }))?.achieved || achieved;
    const note = await track(req.userId, 'goal_created', ctx.lang);
    res.json({ id: Number(id), achieved: achievedView(achieved), note });
  }));

  // Новый долг: название, сколько осталось, валюта, ставка (0 — без процентов), платёж в месяц, число платежа
  router.post('/savings/debts', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const service = get('savingsService');
    const fields = {
      name: name(body.name),
      amount: http.money(body.amount, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' }),
      currency: currency(body.currency, ctx.currency),
      rate: body.rate === undefined || body.rate === null ? null : (rate(body.rate, RATE_LIMITS.y) || null)
    };
    const payment = body.monthlyPayment === undefined || body.monthlyPayment === null || body.monthlyPayment === 0 ? null
      : http.money(body.monthlyPayment, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' });
    const day = dueDay(body.dueDay);
    const created = await service.createDebt(req.userId, fields);
    if (created.error === 'limit') throw http.forbidden('savings_limit', { limit: created.limit });
    const extra = {};
    if (payment) extra.monthly_payment = payment;
    if (day) extra.due_day = day;
    if (Object.keys(extra).length) await service.updateDebt(req.userId, created.debt.id, extra);
    res.json({ id: Number(created.debt.id) });
  }));

  // Пополнить / снять / новая сумма — счёт, общая копилка или цель со своей копилкой. wizard — шаг мастера
  // «Обновить остатки» (достижения — один раз в конце, как в боте)
  router.post('/savings/pots/:id/balance', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const op = ['deposit', 'withdraw', 'set'].includes(body.op) ? body.op : null;
    if (!op) throw http.badRequest('bad_op');
    const pot = await loadPot(req.userId, potId(req));
    if (pot.kind === 'debt' || (pot.kind === 'goal' && pot.goal_mode !== 'own')) throw http.notFound();
    const amount = await amountIn(body, pot.currency, { allowZero: op === 'set' });
    const result = await get('savingsService').changeBalance(req.userId, Number(pot.id), op, amount);
    if (result.error === 'insufficient') throw http.badRequest('savings_insufficient', { balance: Number(pot.balance) });
    if (result.error) throw http.notFound();
    const note = body.wizard ? null : await track(req.userId, result.achieved?.length ? 'goal_reached' : 'savings_updated', ctx.lang);
    res.json({ pot: potView(result.pot), amount, achieved: achievedView(result.achieved), note });
  }));

  // Перевод между своими копилками (сумма — в валюте источника)
  router.post('/savings/pots/:id/transfer', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const from = await loadPot(req.userId, potId(req));
    const toId = http.int(body.to, { min: 1, code: 'not_found' });
    const amount = await amountIn(body, from.currency);
    const result = await get('savingsService').transfer(req.userId, Number(from.id), toId, amount);
    if (result.error === 'insufficient') throw http.badRequest('savings_insufficient', { balance: Number(from.balance) });
    if (result.error) throw http.notFound();
    const note = await track(req.userId, result.achieved?.length ? 'goal_reached' : 'savings_updated', ctx.lang);
    res.json({ to: potView(result.to), amountTo: result.amountTo, achieved: achievedView(result.achieved), note });
  }));

  // Долг: погасить / увеличить / новая сумма. Трата не создаётся, накопления не меняются
  router.post('/savings/pots/:id/debt', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const op = ['pay', 'increase', 'set'].includes(body.op) ? body.op : null;
    if (!op) throw http.badRequest('bad_op');
    const debt = await loadPot(req.userId, potId(req));
    if (debt.kind !== 'debt') throw http.notFound();
    const amount = await amountIn(body, debt.currency, { allowZero: op === 'set' });
    const result = await get('savingsService').changeDebt(req.userId, Number(debt.id), op, amount);
    if (result.error === 'insufficient') throw http.badRequest('savings_overpay', { balance: Number(debt.balance) });
    if (result.error) throw http.notFound();
    const note = body.wizard ? null : await track(req.userId, Number(result.pot.balance) === 0 ? 'debt_paid_off' : 'savings_updated', ctx.lang);
    res.json({ pot: potView(result.pot), amount, note });
  }));

  // Настройки копилки. Счёт/общая: name, yieldRate (null — как в настройках, 0 — без процентов), currency (пустой
  // счёт). Цель: name, target, targetDate (null — без срока), mode. Долг: name, yieldRate (0 — без процентов),
  // monthlyPayment (0/null — без платежа), dueDay (null — не задано)
  router.patch('/savings/pots/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
    const service = get('savingsService');
    const pot = await loadPot(req.userId, potId(req));
    const id = Number(pot.id);
    let updated = pot;
    let achieved = [];
    let moved = 0;

    if (pot.kind === 'general' || pot.kind === 'account') {
      const fields = {};
      if (has('name')) fields.name = name(body.name);
      if (has('yieldRate')) fields.yield_rate = rate(body.yieldRate, RATE_LIMITS.y, { allowNull: true });
      if (has('currency')) {
        if (pot.kind !== 'account') throw http.badRequest('savings_currency');
        updated = await service.setAccountCurrency(req.userId, id, currency(body.currency));
        if (!updated) throw http.badRequest('savings_currency_locked');
      }
      if (Object.keys(fields).length) updated = await service.updateAccount(req.userId, id, fields);
    } else if (pot.kind === 'goal') {
      const fields = {};
      if (has('name')) fields.name = name(body.name);
      if (has('target')) fields.target_amount = await amountIn({ amount: body.target, currency: body.currency }, pot.currency);
      if (has('targetDate')) fields.target_date = body.targetDate === null ? null : futureDate(body.targetDate, ctx.today);
      const mode = has('mode') ? (body.mode === 'own' ? 'own' : 'total') : null;
      if (Object.keys(fields).length) {
        const result = await service.updateGoal(req.userId, id, fields);
        if (!result) throw http.notFound();
        updated = result.goal;
        achieved = result.achieved;
      }
      if (mode && mode !== pot.goal_mode) {
        const result = await service.setGoalMode(req.userId, id, mode);
        if (!result) throw http.notFound();
        updated = result.goal;
        achieved = result.achieved;
        moved = result.moved;
      }
    } else {
      const fields = {};
      if (has('name')) fields.name = name(body.name);
      if (has('yieldRate')) fields.yield_rate = body.yieldRate === null ? null : (rate(body.yieldRate, RATE_LIMITS.y) || null);
      if (has('monthlyPayment')) {
        fields.monthly_payment = body.monthlyPayment === null || body.monthlyPayment === 0 ? null
          : http.money(body.monthlyPayment, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' });
      }
      if (has('dueDay')) fields.due_day = dueDay(body.dueDay);
      if (Object.keys(fields).length) updated = await service.updateDebt(req.userId, id, fields);
    }
    if (!updated) throw http.notFound();
    const note = achieved?.length ? await track(req.userId, 'goal_reached', ctx.lang) : null;
    res.json({ pot: potView(updated), moved, achieved: achievedView(achieved), note });
  }));

  // Удаление: счёт и цель — деньги переходят в общую копилку, долг — просто исчезает; общую удалить нельзя
  router.delete('/savings/pots/:id', http.wrap(async (req, res) => {
    const service = get('savingsService');
    const pot = await loadPot(req.userId, potId(req));
    const id = Number(pot.id);
    if (pot.kind === 'general') throw http.badRequest('savings_general');
    let result;
    if (pot.kind === 'account') result = await service.deleteAccount(req.userId, id);
    else if (pot.kind === 'goal') result = await service.deleteGoal(req.userId, id);
    else result = (await service.deleteDebt(req.userId, id)) ? { moved: 0 } : null;
    if (!result) throw http.notFound();
    res.json({ moved: result.moved || 0, currency: pot.currency });
  }));

  // Мастер «Обновить остатки»: очередь как в боте (общая — если в ней что-то есть или других счетов нет, счета, цели
  // со своей копилкой, долги) и итог «до»
  router.get('/savings/update', http.wrap(async (req, res) => {
    const state = await get('savingsService').getState(req.userId);
    const ids = updateQueue(state);
    res.json({
      currency: state.currency,
      before: { total: state.total, netWorth: state.netWorth, debts: state.debts.length > 0 },
      steps: ids.map(id => potView(state.pots.find(p => p.id === id)))
    });
  }));

  // Мастер закончен: итог «после» и достижения (как finishUpdate в боте)
  router.post('/savings/update/finish', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const state = await get('savingsService').getState(req.userId);
    const note = await track(req.userId, 'savings_updated', ctx.lang);
    res.json({ total: state.total, netWorth: state.netWorth, debts: state.debts.length > 0, note });
  }));

  // Прогноз на 10 лет помесячно (номинал, «в сегодняшних деньгах»), долги по плановым платежам, взнос и ставки
  router.get('/savings/forecast', http.wrap(async (req, res) => {
    const state = await get('savingsService').getState(req.userId);
    let savings = null;
    if (state.monthly !== null) {
      const { points, depletedAt } = simulate({ parts: state.parts, monthly: state.monthly, ...rates(state), months: FORECAST_MONTHS });
      savings = { nominal: points.map(p => p.nominal), real: points.map(p => p.real), depletedAt };
    }
    res.json({
      currency: state.currency,
      today: state.today,
      total: state.total,
      debtTotal: state.debtTotal,
      netWorth: state.netWorth,
      monthly: monthlyView(state),
      settings: rates(state),
      ownRates: state.accounts.some(a => a.yield_rate !== null),
      savings,
      debts: state.debts.length ? projectDebts(state.debts, FORECAST_MONTHS) : null
    });
  }));

  // Настройки прогноза: взнос (ручной / авто) и ставки
  router.get('/savings/settings', http.wrap(async (req, res) => {
    const state = await get('savingsService').getState(req.userId);
    res.json({
      currency: state.currency,
      monthly: monthlyView(state),
      manualMonthly: state.settings.manualMonthly,
      auto: state.auto,
      settings: rates(state),
      limits: { yieldRate: RATE_LIMITS.y, inflationRate: RATE_LIMITS.i, contributionGrowth: RATE_LIMITS.g }
    });
  }));

  // monthly: число (0 можно) — вручную, null — считать автоматически; ставки: 0 — не учитывать
  router.patch('/savings/settings', http.wrap(async (req, res) => {
    const body = req.body || {};
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
    const fields = {};
    if (has('monthly')) {
      fields.monthly_contribution = body.monthly === null ? null
        : (body.monthly === 0 || body.monthly === '0' ? 0 : http.money(body.monthly, { max: MAX_SAVINGS_AMOUNT, code: 'savings_amount' }));
    }
    const columns = { yieldRate: ['yield_rate', RATE_LIMITS.y], inflationRate: ['inflation_rate', RATE_LIMITS.i], contributionGrowth: ['contribution_growth', RATE_LIMITS.g] };
    for (const [key, [column, max]] of Object.entries(columns)) {
      if (has(key)) fields[column] = body[key] === null ? null : (rate(body[key], max) || null);
    }
    if (!Object.keys(fields).length) throw http.badRequest('bad_request');
    await get('savingsService').updateSettings(req.userId, fields);
    res.json({ ok: true });
  }));

  // Сценарии (как «📊 Сценарии на год» в боте, тот же семейный контур): доход, траты трёх сценариев, накопления по
  // частям со ставками — кривые и свой сценарий считает браузер тем же savingsForecast
  router.get('/savings/scenarios', http.wrap(async (req, res) => {
    res.json(await get('savingsScenarioService').build(req.userId));
  }));
};
