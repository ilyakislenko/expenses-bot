/**
 * Часовой пояс по времени, которое пользователь выбрал как «сейчас у меня».
 *
 * Кнопки выбора — целые часы с текущими минутами UTC (generateTimeKeyboard), поэтому смещение —
 * целое число часов. Пояса городов с летним временем не подходят: их смещение меняется дважды в год
 * (Лондон зимой UTC+0, летом UTC+1), поэтому берём фиксированные Etc/GMT. В их названии знак обратный:
 * Etc/GMT-5 — это UTC+5.
 */

const MINUTES_PER_DAY = 24 * 60;

/**
 * @param {number} userHour - выбранный час (0-23)
 * @param {number} userMinute - минуты на кнопке (текущие минуты UTC на момент показа клавиатуры)
 * @param {Date} [referenceTime] - момент нажатия
 * @param {{ language?: string }} [options] - язык пользователя, чтобы отличить Индию (UTC+5:30) от UTC+5
 * @returns {string} IANA timezone
 */
function calculateTimezoneFromUserTime(userHour, userMinute, referenceTime = new Date(), { language } = {}) {
  let diff = (userHour * 60 + userMinute) - (referenceTime.getUTCHours() * 60 + referenceTime.getUTCMinutes());
  // Допустимые смещения: от UTC-12 до UTC+14
  if (diff > 14 * 60) diff -= MINUTES_PER_DAY;
  if (diff < -12 * 60) diff += MINUTES_PER_DAY;
  // Округление съедает задержку между показом клавиатуры и нажатием (до 30 минут)
  const offset = Math.round(diff / 60);

  if (offset === 0) return 'UTC';
  if (offset === 3) return 'Europe/Moscow'; // без летнего времени; привычнее, чем Etc/GMT-3
  if (offset === 5 && language === 'hi') return 'Asia/Kolkata'; // UTC+5:30: на кнопках только целые часы
  return `Etc/GMT${offset > 0 ? '-' : '+'}${Math.abs(offset)}`;
}

// Смещение пояса от UTC в минутах в момент date
function getOffsetMinutes(timezone, date = new Date()) {
  // Местное время считаем с точностью до минуты, поэтому и сам момент берём без секунд
  const moment = new Date(Math.floor(date.getTime() / 60000) * 60000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(moment).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return (asUtc - moment.getTime()) / 60000;
}

/**
 * Понятное название пояса с текущим смещением: «UTC+5», «Europe/Moscow (UTC+3)», «Asia/Kolkata (UTC+5:30)»
 * @param {string} timezone - IANA timezone
 * @param {Date} [date]
 */
function getTimezoneDisplayName(timezone, date = new Date()) {
  let offset;
  try {
    offset = getOffsetMinutes(timezone || 'UTC', date);
  } catch (error) {
    return timezone; // неизвестный пояс показываем как есть
  }
  const abs = Math.abs(offset);
  const minutes = abs % 60;
  const utc = `UTC${offset < 0 ? '-' : '+'}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`;
  return !timezone || timezone === 'UTC' || timezone.startsWith('Etc/') ? utc : `${timezone} (${utc})`;
}

module.exports = {
  calculateTimezoneFromUserTime,
  getTimezoneDisplayName
};
