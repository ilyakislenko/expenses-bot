/**
 * Часовой пояс по времени, которое пользователь выбрал как «сейчас у меня».
 *
 * Кнопки выбора — целые часы с текущими минутами UTC или (переключатель «другие минуты») со сдвигом на 30 минут
 * (generateTimeKeyboard). Целое смещение — фиксированный Etc/GMT: пояса городов с летним временем не подходят, их
 * смещение меняется дважды в год (Лондон зимой UTC+0, летом UTC+1). В названии Etc/GMT знак обратный: Etc/GMT-5 — UTC+5.
 * Смещения с половиной часа — пояса стран, где оно действует (Etc/GMT таких нет). Непал (+5:45) на кнопках не выбрать —
 * ближайшее +5:30.
 */

const MINUTES_PER_DAY = 24 * 60;

// Смещение с половиной часа в минутах → пояс страны с таким смещением
const HALF_HOUR_ZONES = {
  [-570]: 'Pacific/Marquesas', // −9:30
  [-210]: 'America/St_Johns', // −3:30 (Ньюфаундленд)
  210: 'Asia/Tehran', // +3:30
  270: 'Asia/Kabul', // +4:30
  330: 'Asia/Kolkata', // +5:30 (Индия, Шри-Ланка)
  390: 'Asia/Yangon', // +6:30
  570: 'Australia/Darwin', // +9:30
  630: 'Australia/Lord_Howe' // +10:30
};

// Пояс, который понимают Intl и PostgreSQL (`AT TIME ZONE`): невалидная строка в users.timezone ломает cron у всех
function isValidTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * @param {number} userHour - выбранный час (0-23)
 * @param {number} userMinute - минуты на кнопке (минуты UTC на момент показа клавиатуры, у half — они же + 30)
 * @param {Date} [referenceTime] - момент показа клавиатуры (дата сообщения с кнопками)
 * @param {{ language?: string, half?: boolean }} [options] - язык пользователя (у hi целые +5 и +6 — это Индия,
 *   UTC+5:30); half — кнопка с клавиатуры со сдвигом на полчаса: смещение — целые часы плюс 30 минут
 * @returns {string} IANA timezone
 * @throws {RangeError} если час/минуты не целые числа в диапазоне 0–23 / 0–59 или referenceTime не дата
 */
function calculateTimezoneFromUserTime(userHour, userMinute, referenceTime = new Date(), { language, half = false } = {}) {
  if (!Number.isInteger(userHour) || userHour < 0 || userHour > 23
    || !Number.isInteger(userMinute) || userMinute < 0 || userMinute > 59) {
    throw new RangeError(`Invalid user time: ${userHour}:${userMinute}`);
  }
  if (!(referenceTime instanceof Date) || Number.isNaN(referenceTime.getTime())) {
    throw new RangeError('Invalid reference time');
  }
  let diff = (userHour * 60 + userMinute) - (referenceTime.getUTCHours() * 60 + referenceTime.getUTCMinutes());
  // Допустимые смещения: от UTC-12 до UTC+14
  if (diff > 14 * 60) diff -= MINUTES_PER_DAY;
  if (diff < -12 * 60) diff += MINUTES_PER_DAY;
  // Округление съедает секунды и минуты между показом клавиатуры и её датой
  if (half) {
    const minutes = Math.round((diff - 30) / 60) * 60 + 30;
    if (HALF_HOUR_ZONES[minutes]) return HALF_HOUR_ZONES[minutes];
    // Такого смещения с половиной часа нигде нет — ближайший целый час
  }
  return wholeHourZone(Math.round(diff / 60), language);
}

function wholeHourZone(offset, language) {
  if (offset === 0) return 'UTC';
  if (offset === 3) return 'Europe/Moscow'; // без летнего времени; привычнее, чем Etc/GMT-3
  // UTC+5:30: на кнопках с целыми минутами пользователь из Индии выберет час до или после своего времени
  if ((offset === 5 || offset === 6) && language === 'hi') return 'Asia/Kolkata';
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
  getTimezoneDisplayName,
  isValidTimezone
};
