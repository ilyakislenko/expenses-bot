// Предупреждения о списании подписок и окончании пробных периодов: чистые правила «когда напомнить» без БД.
// Даты — локальные строки 'YYYY-MM-DD' (utils/period), час — локальный час пользователя.
const { daysBetween, normalizeMerchant, shortHash } = require('./planning');

const WARN_DAYS_OPTIONS = [1, 2, 3, 7]; // «за сколько дней» на выбор
const DEFAULT_WARN_DAYS = 2;
// Напоминаем днём: с 10:00 до 20:59 по местному времени (как уведомления о премиуме и итоги периода). Первый запуск
// cron в этом окне отправляет; пропущенный час (бот был выключен) догоняется следующим
const WARN_FROM_HOUR = 10;
const WARN_UNTIL_HOUR = 21;
const STILL_CHARGING_DAYS = 45; // «всё ещё списывается» ищем столько дней после отметки «Отменю»

function isWarnHour(hour) {
  return hour >= WARN_FROM_HOUR && hour < WARN_UNTIL_HOUR;
}

function normalizeWarnDays(days) {
  const value = Number(days);
  return WARN_DAYS_OPTIONS.includes(value) ? value : DEFAULT_WARN_DAYS;
}

// Ключ подписки в кнопках и отметках «уже напомнил»: 10 hex от ключа продавца — тот же у найденной подписки и у
// регулярной траты, в которую она превратилась
function subRef(merchantKey) {
  return shortHash(`sub|${merchantKey}`);
}

// Подписка: за сколько дней до списания напомнить сегодня — 1…warnDays (пропущенный день догоняется, пока списание
// впереди), иначе null. Сегодняшнее и просроченное списание — уже не предупреждение
function subscriptionWarnDays(nextDate, today, warnDays) {
  if (!nextDate) return null;
  const days = daysBetween(today, nextDate);
  return days >= 1 && days <= warnDays ? days : null;
}

// Пробный период: 1 — за день до окончания, 0 — в день окончания; null — не сегодня. Только у активного
// (не «✅ Нужна», не «🚫 Отменю», не «🔕») и не в день, когда его добавили (пользователь только что о нём думал)
function trialStage(trial, today) {
  if (!trial.end_date || trial.state !== 'active') return null;
  if (trial.created_on && trial.created_on >= today) return null;
  const days = daysBetween(today, trial.end_date);
  return days === 0 || days === 1 ? days : null;
}

// Отметка «предупредил об этом списании» (user_notifications ref_key ≤ 64): подписка — ключ и дата списания,
// пробный период — id, дата окончания и этап
function warnKey(ref, date, stage = null) {
  return stage === null ? `${ref}|${date}` : `${ref}|${date}|${stage}`;
}

// «Отменю», а оплата всё равно пришла: первая трата с тем же продавцом позже отметки (since — локальная дата
// отметки, для пробного — день перед окончанием, чтобы списание в день окончания тоже нашлось).
// rows: [{ date, description, amount, currency, recurring_expense_id }] по возрастанию даты
function chargeAfter(rows, merchantKey, since) {
  return rows.find(row => row.date > since && normalizeMerchant(row.description) === merchantKey) || null;
}

module.exports = {
  WARN_DAYS_OPTIONS,
  DEFAULT_WARN_DAYS,
  WARN_FROM_HOUR,
  WARN_UNTIL_HOUR,
  STILL_CHARGING_DAYS,
  isWarnHour,
  normalizeWarnDays,
  subRef,
  subscriptionWarnDays,
  trialStage,
  warnKey,
  chargeAfter
};
