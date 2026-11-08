// Доходы (бот: income_menu, in|, ie|, it|, income_delete|, income_undo|, income_currency): доходы периода с итогом
// в основной валюте и остатком, запись, правка суммы/валюты/описания/дня, удаление с «Вернуть», валюта дохода.
const { customPeriod } = require('../../utils/period');
const { checkRecordDate } = require('../../utils/recordDate');
const { USER_LIMITS } = require('../../utils/constants');
const { MAX_INCOME_AMOUNT } = require('../../handlers/IncomeHandlers');
const { localDate } = require('../serialize');
const shared = require('./incomeShared');

const MAX_PAST_PERIODS = 120;
const undo = shared.undoStore();

// Доход: { id, amount, currency, description, createdAt (ISO UTC), date (локальная), source: 'bank' | 'import' | null }
function view(row, ctx) {
  return {
    id: Number(row.id),
    amount: Number(row.amount),
    currency: row.currency,
    description: row.description || null,
    createdAt: new Date(row.created_at_utc).toISOString(),
    date: localDate(row.created_at_utc, ctx.timezone),
    // «🏦 из уведомления банка» (партия bank) или из выписки (import_id)
    source: row.batch_source === 'bank' ? 'bank' : row.import_id ? 'import' : null
  };
}

module.exports = (router, { get, http }) => {
  const descriptionMax = (ctx) => (ctx.isPremium ? USER_LIMITS.premium : USER_LIMITS.regular).MAX_DESCRIPTION_LENGTH;

  // Ввод формы: сумма (как в боте, до MAX_INCOME_AMOUNT), валюта (пусто — валюта дохода), описание (необязательно),
  // день (не в будущем и не старше года — как «📅 Дата» в боте)
  function input(body, ctx) {
    const date = body.date === undefined || body.date === null || body.date === '' ? null : http.ymd(body.date, { code: 'income_date' });
    if (date) {
      const error = checkRecordDate(date, ctx.today);
      if (error) throw http.badRequest(`income_date_${error}`);
    }
    return {
      amount: http.money(body.amount, { max: MAX_INCOME_AMOUNT, code: 'income_amount' }),
      currency: shared.currency(body.currency, { def: null, code: 'income_currency' }),
      description: shared.description(body.description, { max: descriptionMax(ctx), validator: get('enhancedValidator'), code: 'income_description' }),
      date
    };
  }

  const id = (req) => http.int(req.params.id, { min: 1, max: 2147483647, code: 'income_not_found' });

  // Доходы периода (offset 0 — текущий пользовательский месяц, -1 — прошлый…): список (новые сверху), итог в основной
  // валюте и по валютам, траты периода и остаток — как в меню доходов бота
  router.get('/income', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const offset = http.int(req.query.offset, { min: -MAX_PAST_PERIODS, max: 0, def: 0, code: 'bad_offset' });
    const period = customPeriod(ctx.today, ctx.startDay, offset);
    const incomeService = get('incomeService');
    const [rows, incomeTotals, expenseTotals, incomeCurrency] = await Promise.all([
      incomeService.getIncomes(req.userId, ctx.timezone, period),
      incomeService.getTotals(req.userId, ctx.timezone, period),
      get('expenseService').getTotals(req.userId, ctx.timezone, period),
      incomeService.getIncomeCurrency(req.userId)
    ]);
    const formatter = get('formatter');
    const total = await formatter.sumInCurrency(incomeTotals.byCurrency, ctx.currency);
    const spent = await formatter.sumInCurrency(expenseTotals.byCurrency || [], ctx.currency);
    res.json({
      period: { start: period.start, last: period.last, offset },
      currency: ctx.currency,
      incomeCurrency,
      count: incomeTotals.count,
      total,
      byCurrency: incomeTotals.byCurrency,
      spent,
      balance: total - spent,
      items: rows.slice().reverse().map(row => view(row, ctx))
    });
  }));

  // Для новой записи: валюта дохода по умолчанию, предел описания, сегодня
  router.get('/income/defaults', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    res.json({ currency: await get('incomeService').getIncomeCurrency(req.userId), descriptionMax: descriptionMax(ctx), today: ctx.today });
  }));

  router.get('/income/currency', http.wrap(async (req, res) => {
    res.json({ currency: await get('incomeService').getIncomeCurrency(req.userId) });
  }));

  // Валюта дохода по умолчанию (бот: set_income_currency); траты остаются в основной валюте
  router.put('/income/currency', http.wrap(async (req, res) => {
    const code = shared.currency(req.body.currency, { code: 'income_currency' });
    await get('incomeService').setIncomeCurrency(req.userId, code);
    res.json({ currency: code });
  }));

  router.get('/income/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const income = await get('incomeService').getIncome(req.userId, id(req));
    if (!income) throw http.notFound('income_not_found');
    res.json({ income: view(income, ctx), descriptionMax: descriptionMax(ctx), today: ctx.today });
  }));

  // Записать доход (бот: ввод дохода). Без валюты — валюта дохода; date — другой день. note — строка достижений
  router.post('/income', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const data = input(req.body, ctx);
    const income = await get('incomeService').addIncome(req.userId, data.amount, data.currency, data.description,
      data.date && data.date !== ctx.today ? { date: data.date, timezone: ctx.timezone } : {});
    const note = await get('achievementService').track(req.userId, 'income_added', { lang: ctx.lang });
    res.status(201).json({ income: view(income, ctx), note: note ? shared.plain(note) : null });
  }));

  // Изменить доход целиком (сумма, валюта, описание; date — другой день, время суток остаётся)
  router.put('/income/:id', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const incomeId = id(req);
    const incomeService = get('incomeService');
    const current = await incomeService.getIncome(req.userId, incomeId);
    if (!current) throw http.notFound('income_not_found');
    const data = input(req.body, ctx);
    let income = await incomeService.updateIncome(req.userId, incomeId, {
      amount: data.amount, currency: data.currency || current.currency, description: data.description
    });
    if (!income) throw http.notFound('income_not_found');
    if (data.date && data.date !== localDate(current.created_at_utc, ctx.timezone)) {
      income = await incomeService.setIncomeDate(req.userId, incomeId, data.date, ctx.timezone) || income;
    }
    res.json({ income: view({ ...income, batch_source: current.batch_source }, ctx) });
  }));

  // Удалить; несколько минут можно вернуть ту же запись (POST /income/:id/restore)
  router.delete('/income/:id', http.wrap(async (req, res) => {
    const incomeId = id(req);
    const deleted = await get('incomeService').deleteIncome(req.userId, incomeId);
    if (!deleted) throw http.notFound('income_not_found');
    undo.put(req.userId, incomeId, deleted);
    res.json({ deleted: true });
  }));

  router.post('/income/:id/restore', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const row = undo.take(req.userId, id(req));
    const income = row ? await get('incomeService').restoreIncome(req.userId, row) : null;
    if (!income) throw http.badRequest('income_restore_gone');
    res.json({ income: view(income, ctx) });
  }));
};
