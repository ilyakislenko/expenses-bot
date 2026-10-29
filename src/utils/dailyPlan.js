// «☀️ План на день»: правила времени и сборка текста — чистые функции (данные собирает DailyPlanService).
const { DAILY_PLAN } = require('./constants');

// Час плана пользователя: только утренние часы из DAILY_PLAN.HOURS, иначе (NULL, подменённое значение) — по умолчанию
function planHour(value) {
  const hour = value === null || value === undefined || value === '' ? NaN : Number(value);
  return DAILY_PLAN.HOURS.includes(hour) ? hour : DAILY_PLAN.DEFAULT_HOUR;
}

// Пора ли слать: локальный час равен часу плана (cron — раз в час, в HH:00)
function isDue(localHour, value) {
  return localHour === planHour(value);
}

// Вчера по плану: потрачено (ручные траты, без авто-записей регулярных) не больше «можно сегодня» вчерашнего плана.
// null — сравнивать не с чем (плана не было, лимит был 0 — период уже был сверх плана)
function yesterdayResult(plan, spent) {
  if (!plan || !(Number(plan.daily) > 0) || Number(plan.deficit) > 0) return null;
  const daily = Number(plan.daily);
  const value = Math.max(0, Number(spent) || 0);
  return { daily, spent: value, kept: value <= daily, over: Math.max(0, value - daily) };
}

// Текст плана. parts — уже отформатированные значения (суммы строками), любая часть может отсутствовать:
// { date, yesterday: { spent, daily, kept, over, coins }, allowance: { daily, deficit }, payday: { kind, days },
//   streak, todayBills: [строки], tomorrowBills: [строки], roast }
function composeMorning(t, parts) {
  const lines = [`☀️ *${t('dp_title', { date: parts.date })}*`, ''];
  const y = parts.yesterday;
  if (y) {
    lines.push(y.kept
      ? t('dp_yesterday_kept', { spent: y.spent, daily: y.daily }) + (y.coins ? ` · ${t('dp_coins_plus', { amount: y.coins })}` : '')
      : t('dp_yesterday_over', { spent: y.spent, daily: y.daily, over: y.over }));
  }
  const a = parts.allowance;
  if (a) lines.push(a.deficit ? t('pl_line_over', { amount: a.deficit }) : t('dp_today', { amount: a.daily }));
  const p = parts.payday;
  if (p && Number.isInteger(p.days) && p.days >= 0) {
    if (p.kind === 'payday') lines.push(p.days === 0 ? t('dp_payday_today') : t('dp_payday', { days: p.days }));
    else if (p.days > 0) lines.push(t('dp_period_left', { days: p.days }));
  }
  if (parts.streak >= 2) lines.push(t('ach_streak_line', { days: parts.streak }));
  if (parts.todayBills && parts.todayBills.length) lines.push('', `*${t('dp_bills_today')}*`, ...parts.todayBills);
  if (parts.tomorrowBills && parts.tomorrowBills.length) lines.push('', `*${t('dp_bills_tomorrow')}*`, ...parts.tomorrowBills);
  if (parts.roast) lines.push('', parts.roast);
  return lines.join('\n');
}

module.exports = { planHour, isDue, yesterdayResult, composeMorning };
