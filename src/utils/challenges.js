// Челленджи: чистая оценка по датам (локальные 'YYYY-MM-DD', end_date — не включая).
//   no_spend     — неделя: минимум target дней без трат (прошедшие дни без трат; сегодня — если отмечен «без трат»)
//   no_category  — неделя без трат в категории (по имени, как бюджеты); трата в категории — провал сразу
//   budget_month — пользовательский период: общий бюджет не превышен до конца периода
const { addDays } = require('./period');

const CHALLENGE_DAYS = 7;
const NO_SPEND_TARGET = 2;

function daysBetween(start, end) {
  const days = [];
  for (let day = start; day < end; day = addDays(day, 1)) days.push(day);
  return days;
}

function minDate(a, b) {
  return a < b ? a : b;
}

// → { status: 'active'|'won'|'lost'|'canceled', progress, target, daysLeft }
// ctx: { today, expenseDays:Set, markDays:Set, categoryDays:Set, budget:{ spent, limit }|null }
function evaluateChallenge(challenge, ctx) {
  const { today } = ctx;
  const start = challenge.start_date;
  const end = challenge.end_date;
  const daysLeft = Math.max(0, daysBetween(minDate(today, end), end).length);
  const passed = daysBetween(start, minDate(end, today)); // завершившиеся дни окна

  if (challenge.kind === 'no_spend') {
    const target = challenge.target || NO_SPEND_TARGET;
    const expenseDays = ctx.expenseDays || new Set();
    const clean = passed.filter(day => !expenseDays.has(day)).length;
    const todayInWindow = today >= start && today < end;
    const todayClean = todayInWindow && !expenseDays.has(today) && (ctx.markDays || new Set()).has(today);
    const progress = clean + (todayClean ? 1 : 0);
    let status = 'active';
    if (clean >= target) status = 'won';
    else if (clean + daysLeft < target) status = 'lost';
    return { status, progress: Math.min(progress, target), target, daysLeft };
  }

  if (challenge.kind === 'no_category') {
    const target = daysBetween(start, end).length;
    const categoryDays = ctx.categoryDays || new Set();
    const broken = daysBetween(start, minDate(end, addDays(today, 1))).some(day => categoryDays.has(day));
    let status = 'active';
    if (broken) status = 'lost';
    else if (today >= end) status = 'won';
    return { status, progress: passed.length, target, daysLeft };
  }

  if (challenge.kind === 'budget_month') {
    const budget = ctx.budget;
    if (!budget || !(budget.limit > 0)) return { status: 'canceled', progress: 0, target: 0, daysLeft };
    let status = 'active';
    if (budget.spent > budget.limit) status = 'lost';
    else if (today >= end) status = 'won';
    return { status, progress: budget.spent, target: budget.limit, daysLeft };
  }

  return { status: 'canceled', progress: 0, target: 0, daysLeft };
}

// Дни без трат для достижений: отмеченные (сегодняшний — пока без трат) и прошедшие дни недель челленджа
// «неделя без трат», в которые трат не было. windows: [{ start_date, end_date }]
function countNoSpendDays({ markDays = [], windows = [], expenseDays = new Set(), today }) {
  const days = new Set();
  for (const day of markDays) if (day <= today && !expenseDays.has(day)) days.add(day);
  for (const window of windows) {
    for (const day of daysBetween(window.start_date, minDate(window.end_date, today))) {
      if (!expenseDays.has(day)) days.add(day);
    }
  }
  return days.size;
}

module.exports = {
  CHALLENGE_DAYS,
  NO_SPEND_TARGET,
  daysBetween,
  evaluateChallenge,
  countNoSpendDays
};
