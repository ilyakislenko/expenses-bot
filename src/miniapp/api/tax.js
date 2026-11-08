const serialize = require('../serialize');
const { KINDS, isTaxRefundAvailable, claimYears } = require('../../utils/taxRefund');

// «💡 Верни 13%» (только русский язык и рубли): итог года, «Как вернуть», список трат с правкой вида (премиум) и поиск
// траты, которой нет в расчёте (премиум). Расчёты и правки — TaxRefundService, как в боте.
module.exports = (router, { get, http }) => {
  // Контекст раздела: недоступен — 403 tax_unavailable; год — текущий и три прошлых, иначе 400 tax_year
  async function open(req, { premium = false, year: raw = req.query.year } = {}) {
    const ctx = await req.ctx();
    if (!isTaxRefundAvailable(ctx.lang, ctx.currency)) throw http.forbidden('tax_unavailable');
    const currentYear = Number(ctx.today.slice(0, 4));
    const year = http.int(raw, { def: currentYear, code: 'tax_year' });
    const service = get('taxRefundService');
    if (!service.isValidYear(year, currentYear)) throw http.badRequest('tax_year');
    if (premium && !ctx.isPremium) throw http.premiumRequired('tax_list');
    return { ctx, service, year, currentYear, options: { timezone: ctx.timezone, currentYear } };
  }

  const item = (row, ctx) => ({ expense: serialize.expense(row, ctx, get), kind: row.kind, auto: row.auto, mark: row.mark || null });

  router.get('/tax', http.wrap(async (req, res) => {
    const { ctx, service, year, currentYear, options } = await open(req);
    const summary = await service.summary(ctx.userId, year, options);
    res.json({
      ...summary,
      interest: summary.interest ? { ...summary.interest, payYear: year + 1 } : null,
      years: claimYears(currentYear),
      isPremium: ctx.isPremium
    });
  }));

  router.get('/tax/how', http.wrap(async (req, res) => {
    const { service, year } = await open(req);
    res.json({ year, blocks: service.howSections(year) });
  }));

  router.get('/tax/expenses', http.wrap(async (req, res) => {
    const { ctx, service, year, options } = await open(req, { premium: true });
    const list = await service.list(ctx.userId, year, options);
    res.json({ ...list, year, items: list.items.map(row => item(row, ctx)) });
  }));

  // kind: вид вычета, 'none' — не учитывать, null — снять правку (остаётся угадывание)
  router.put('/tax/expenses/:id', http.wrap(async (req, res) => {
    const body = req.body || {};
    const { ctx, service, year, options } = await open(req, { premium: true, year: body.year });
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw http.notFound('tax_expense_gone');
    if (!('kind' in body)) throw http.badRequest('tax_kind');
    const kind = body.kind === null ? null : String(body.kind);
    if (kind !== null && kind !== 'none' && !KINDS.includes(kind)) throw http.badRequest('tax_kind');
    if (!(await service.setKind(ctx.userId, year, id, kind, options))) throw http.notFound('tax_expense_gone');
    const row = await service.expense(ctx.userId, year, id, ctx.timezone);
    res.json(item(row, ctx));
  }));

  // Траты года по слову из описания, которых нет в расчёте (до 8, новые сначала)
  router.get('/tax/search', http.wrap(async (req, res) => {
    const { ctx, service, year, options } = await open(req, { premium: true });
    const found = await service.search(ctx.userId, year, http.str(req.query.q, { max: 100, def: '' }), options);
    if (!found) throw http.badRequest('tax_query_short');
    res.json({ year, items: found.map(row => item(row, ctx)) });
  }));
};
