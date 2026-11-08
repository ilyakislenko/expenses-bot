const { summarizeTags, currencyConverter, normalizeTag } = require('../../utils/tags');
const { customPeriod } = require('../../utils/period');
const { expense, localDate, categoryLabel } = require('../serialize');

// «🏷 Теги» (как TagHandlers в боте): свои траты с «#тегом» в описании (ExpenseRepository.getTaggedExpenses — до 5000
// последних), суммы по тегам в основной валюте по курсу. ?offset= — пользовательский период (0 — текущий, -1 — прошлый…),
// без него — за всё время, как в боте.
//   GET /api/tags?offset=       → { currency, period: { start, last } | null, any, tags: [{ tag, total, count }] }
//   GET /api/tags/:tag?offset=  → { tag, total, count, first, last, categories: [{ name, label, icon, total }], expenses }
module.exports = (router, { get, http }) => {
  async function collect(req) {
    const ctx = await req.ctx();
    const offset = http.int(req.query.offset, { min: -120, max: 0, def: null });
    const period = offset === null ? null : customPeriod(ctx.today, ctx.startDay, offset);
    const all = await get('expenseRepository').getTaggedExpenses(ctx.userId);
    const rows = period
      ? all.filter((row) => { const day = localDate(row.created_at_utc, ctx.timezone); return day >= period.start && day <= period.last; })
      : all;
    const tags = await summarizeTags(rows, currencyConverter(get('currencyUtils'), ctx.currency));
    return { ctx, period: period ? { start: period.start, last: period.last } : null, any: all.length > 0, tags };
  }

  const round = (value) => Math.round(value * 100) / 100;

  router.get('/tags', http.wrap(async (req, res) => {
    const { ctx, period, any, tags } = await collect(req);
    res.json({
      currency: ctx.currency,
      period,
      any,
      tags: [...tags].map(([tag, entry]) => ({ tag, total: round(entry.total), count: entry.count }))
    });
  }));

  router.get('/tags/:tag', http.wrap(async (req, res) => {
    const tag = normalizeTag(http.str(req.params.tag, { max: 100, code: 'tags_not_found' }));
    const { ctx, period, tags } = await collect(req);
    const entry = tags.get(tag);
    if (!entry) throw http.notFound('tags_not_found');
    const byCategory = new Map();
    for (const row of entry.rows) {
      const key = row.category_name || '';
      const item = byCategory.get(key) || {
        name: row.category_name || null,
        label: row.category_name ? categoryLabel(row.category_name, ctx, get) : ctx.t('tags_no_category'),
        icon: row.category_icon || '📦',
        total: 0
      };
      item.total += row.value;
      byCategory.set(key, item);
    }
    res.json({
      tag,
      currency: ctx.currency,
      period,
      total: round(entry.total),
      count: entry.count,
      first: localDate(entry.rows[entry.rows.length - 1].created_at_utc, ctx.timezone),
      last: localDate(entry.rows[0].created_at_utc, ctx.timezone),
      categories: [...byCategory.values()].sort((a, b) => b.total - a.total).map(c => ({ ...c, total: round(c.total) })),
      // запрос — только свои траты (user_id = пользователь), поэтому автор — он сам
      expenses: entry.rows.map(row => expense({ user_id: ctx.userId, ...row }, ctx, get))
    });
  }));
};
