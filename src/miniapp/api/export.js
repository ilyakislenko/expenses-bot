const { PERIOD_KINDS, resolvePeriod, rangePeriod, buildExport } = require('../../utils/exportFile');
const { lastDaysPeriod } = require('../../utils/period');

// «Экспорт CSV» (как ExportHandlers в боте): тот же файл (utils/exportFile.js) приходит документом в чат с ботом —
// в WebView скачивание файлов ненадёжно, а в чате его легко открыть и переслать. Тот же лимит, что у кнопок xp|… в боте
// (rateLimiter 'export': 5 файлов за 5 минут, общий счётчик с ботом).
//   GET  /api/export → { today, periods: { day, week, cur, prev: { start, last } }, categories: [{ id, name, icon }] }
//   POST /api/export { kind: day|week|cur|prev|all|range, start?, end? (range, YYYY-MM-DD), categoryIds?: [id] | null }
//        → { sent: true, count, filename }
module.exports = (router, { get, http }) => {
  const deps = () => ({
    expenseService: get('expenseService'),
    userService: get('userService'),
    formatter: get('formatter'),
    localizationService: get('localizationService')
  });
  const categoriesOf = async (ctx) => (await get('expenseService').getCategories(ctx.userId, get('localizationService'), ctx.lang))
    .map(c => ({ id: Number(c.id), name: c.name, icon: c.icon || '📦' }));
  const span = (period) => ({ start: period.start, last: period.last });

  router.get('/export', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const expenseService = get('expenseService');
    const [day, current, previous, categories] = await Promise.all([
      expenseService.getPeriodContext(ctx.userId, 'day', 0),
      expenseService.getPeriodContext(ctx.userId, 'month', 0),
      expenseService.getPeriodContext(ctx.userId, 'month', -1),
      categoriesOf(ctx)
    ]);
    res.json({
      today: day.today,
      periods: { day: span(day.period), week: span(lastDaysPeriod(day.today, 7)), cur: span(current.period), prev: span(previous.period) },
      categories
    });
  }));

  router.post('/export', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const kind = String(body.kind || '');
    if (kind !== 'range' && !PERIOD_KINDS.includes(kind)) throw http.badRequest('export_kind');

    let timezone;
    let period;
    if (kind === 'range') {
      const start = http.ymd(body.start);
      const last = http.ymd(body.end || body.start);
      if (start > last) throw http.badRequest('export_dates_order');
      timezone = ctx.timezone;
      period = rangePeriod(start, last);
    }

    // Фильтр по категориям — как «Готово» в боте: хотя бы одна, только свои доступные, выбраны все — без фильтра
    let categoryIds = null;
    if (Array.isArray(body.categoryIds)) {
      const available = (await categoriesOf(ctx)).map(c => c.id);
      const chosen = [...new Set(body.categoryIds.map(Number))].filter(id => available.includes(id));
      if (!chosen.length) throw http.badRequest('export_no_categories');
      categoryIds = chosen.length === available.length ? null : chosen;
    } else if (body.categoryIds !== undefined && body.categoryIds !== null) {
      throw http.badRequest('export_no_categories');
    }

    const limit = get('rateLimiter').checkLimit(ctx.userId, 'export');
    if (!limit.allowed) throw new http.HttpError(429, 'export_rate', { retryAfter: limit.resetTime || null });

    if (kind !== 'range') ({ timezone, period } = await resolvePeriod(deps(), ctx.userId, kind));
    const file = await buildExport(deps(), ctx.userId, { timezone, period, categoryIds, lang: ctx.lang });
    if (!file) throw http.badRequest('export_empty');

    try {
      await get('bot').telegram.sendDocument(ctx.userId, { source: file.buffer, filename: file.filename }, { caption: file.caption });
    } catch (error) {
      throw new http.HttpError(502, 'export_send_failed');
    }
    res.json({ sent: true, count: file.count, filename: file.filename });
  }));
};
