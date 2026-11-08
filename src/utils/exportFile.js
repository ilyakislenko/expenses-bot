const { lastDaysPeriod, addDays } = require('./period');

// Экспорт CSV — общий для бота (ExportHandlers, кнопки xp|…) и Mini App (api/export.js, файл приходит в чат с ботом):
// период по виду, файл, имя и подпись. Даты — локальные даты пользователя, период — полуинтервал [start, end),
// period = null — за всё время, categoryIds = null — все категории.
const PERIOD_KINDS = ['day', 'week', 'cur', 'prev', 'all'];

// Вид периода (day — сегодня, week — последние 7 дней, cur/prev — текущий/прошлый пользовательский период, all) →
// { timezone, period }
async function resolvePeriod({ expenseService, userService }, userId, kind) {
  if (kind === 'day' || kind === 'week') {
    const context = await expenseService.getPeriodContext(userId, 'day', 0);
    return { timezone: context.timezone, period: kind === 'day' ? context.period : lastDaysPeriod(context.today, 7) };
  }
  if (kind === 'cur' || kind === 'prev') {
    const context = await expenseService.getPeriodContext(userId, 'month', kind === 'cur' ? 0 : -1);
    return { timezone: context.timezone, period: context.period };
  }
  return { timezone: await userService.getUserTimezone(userId), period: null };
}

// Свой диапазон дат 'YYYY-MM-DD' (включительно) → период
function rangePeriod(start, last) {
  return { start, end: addDays(last, 1), last };
}

// «Категории: все» / «Категории: Еда, Такси» (categories — с переведёнными названиями)
function categoriesLine(t, categories, categoryIds) {
  if (!categoryIds) return t('export_categories_all');
  const names = categories.filter(c => categoryIds.includes(c.id)).map(c => c.name);
  return t('export_categories_selected', { categories: names.join(', ') });
}

// Файл экспорта → { buffer, filename, caption, count } или null, если трат за период нет
async function buildExport({ expenseService, userService, formatter, localizationService }, userId, { timezone, period, categoryIds = null, lang }) {
  const t = (key, params) => localizationService.getText(lang, key, params);
  const [expenses, currency] = await Promise.all([
    expenseService.getExpensesForExport(userId, timezone, period, categoryIds),
    userService.getUserCurrency(userId)
  ]);
  if (!expenses.length) return null;

  const csv = await formatter.formatCSV(expenses, currency, timezone, localizationService, lang);
  const oneDay = period && period.start === period.last;
  const filename = !period ? 'expenses_all.csv'
    : oneDay ? `expenses_${period.start}.csv` : `expenses_${period.start}_${period.last}.csv`;
  const periodLine = !period ? t('export_period_all')
    : `📅 ${oneDay ? formatter.formatLocalDate(period.start) : formatter.formatPeriodRange(period)}`;
  const captionLines = [t('export_success'), periodLine];
  if (categoryIds) captionLines.push(categoriesLine(t, await expenseService.getCategories(userId, localizationService, lang), categoryIds));
  captionLines.push(t('records_count', { count: expenses.length }));
  return { buffer: Buffer.from(csv, 'utf-8'), filename, caption: captionLines.join('\n'), count: expenses.length };
}

module.exports = { PERIOD_KINDS, resolvePeriod, rangePeriod, categoriesLine, buildExport };
