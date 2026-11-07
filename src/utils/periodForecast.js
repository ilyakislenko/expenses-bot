const { addDays } = require('./period');

// Траты периода по дням и прогноз на его конец при нынешнем темпе — общий расчёт для картинки обзора
// (ChartService.planFact) и сценариев накоплений (SavingsScenarioService).
// rows — траты периода ({ amount, currency, created_at_utc, recurring_expense_id }); recurring — регулярные траты с
// nextChargeDate (будущие списания — ступеньки); convert(amount, currency) → основная валюта. current — период идёт
// (сегодня внутри него), иначе прошлый: факт до конца, без прогноза.
// Прогноз (со 2-го дня и не в последний): обычные траты прошедших дней (без сегодня и без авто-записей регулярных) в
// среднем за день — до конца периода, сегодня не меньше этого среднего; будущие регулярные — ступеньками.
// → { days, lastIndex, chargedByDay, futureByDay, actual, running, forecast: { start, values, jumps, end } | null }
async function periodSeries({ rows, recurring = [], period, today, timezone, convert, current }) {
  const days = [];
  for (let day = period.start; day < period.end; day = addDays(day, 1)) days.push(day);
  const lastIndex = current ? Math.max(0, days.indexOf(today)) : days.length - 1;
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
  const spentByDay = new Map();
  const chargedByDay = new Map(); // день → списанные регулярные (не входят в темп прогноза)
  const futureByDay = new Map(); // день → регулярные, которые ещё спишутся
  const add = (map, day, value) => map.set(day, (map.get(day) || 0) + value);
  for (const row of rows) {
    const day = localDay.format(new Date(row.created_at_utc));
    const value = await convert(row.amount, row.currency);
    add(spentByDay, day, value);
    if (row.recurring_expense_id) add(chargedByDay, day, value);
  }
  if (current) {
    for (const item of recurring) {
      if (item.nextChargeDate >= today && item.nextChargeDate < period.end) add(futureByDay, item.nextChargeDate, await convert(item.amount, item.currency));
    }
  }

  const actual = [];
  let running = 0;
  for (let i = 0; i <= lastIndex; i++) {
    running += spentByDay.get(days[i]) || 0;
    actual.push(running);
  }

  let forecast = null;
  if (current && lastIndex >= 1 && lastIndex < days.length - 1) {
    let chargedBefore = 0;
    for (let i = 0; i < lastIndex; i++) chargedBefore += chargedByDay.get(days[i]) || 0;
    const pace = Math.max(0, actual[lastIndex - 1] - chargedBefore) / lastIndex;
    let projected = Math.max(running, actual[lastIndex - 1] + pace + (chargedByDay.get(today) || 0)) + (futureByDay.get(today) || 0);
    const values = [running];
    const jumps = [0];
    for (let i = lastIndex + 1; i < days.length; i++) {
      const jump = futureByDay.get(days[i]) || 0;
      projected += pace + jump;
      values.push(projected);
      jumps.push(jump);
    }
    forecast = { start: lastIndex, values, jumps, end: projected };
  }
  return { days, lastIndex, chargedByDay, futureByDay, actual, running, forecast };
}

module.exports = { periodSeries };
