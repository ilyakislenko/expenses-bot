/**
 * Калькулятор timezone на основе выбранного пользователем времени
 */

/**
 * Рассчитывает timezone на основе выбранного пользователем времени
 * @param {number} userHour - час, выбранный пользователем (0-23)
 * @param {number} userMinute - минуты, выбранные пользователем (0-59)
 * @param {Date} [referenceTime] - опорное время для расчета (по умолчанию текущее)
 * @returns {string} IANA timezone string
 */
function calculateTimezoneFromUserTime(userHour, userMinute, referenceTime = new Date()) {
  const utcHour = referenceTime.getUTCHours();
  const utcMinute = referenceTime.getUTCMinutes();
  
  // Рассчитываем разницу в часах
  let hourDiff = userHour - utcHour;
  
  // Обрабатываем переход через полночь
  if (hourDiff > 12) {
    hourDiff -= 24;
  } else if (hourDiff < -12) {
    hourDiff += 24;
  }
  
  // Рассчитываем разницу в минутах
  let minuteDiff = userMinute - utcMinute;
  if (minuteDiff > 30) {
    hourDiff += 1;
    minuteDiff -= 60;
  } else if (minuteDiff < -30) {
    hourDiff -= 1;
    minuteDiff += 60;
  }
  
  // Формируем timezone string
  const offset = hourDiff + minuteDiff / 60;
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);
  
  // Округляем до ближайшего часа для упрощения
  const roundedOffset = Math.round(offset);
  
  // Простая карта для основных offset'ов (только целые часы)
  const offsetMap = {
    '-12': 'Pacific/Kwajalein',
    '-11': 'Pacific/Midway',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Caracas',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'UTC',
    '1': 'Europe/London',
    '2': 'Europe/Berlin',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Kolkata',
    '6': 'Asia/Almaty',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Guadalcanal',
    '12': 'Pacific/Auckland'
  };
  
  const offsetKey = roundedOffset.toString();
  return offsetMap[offsetKey] || 'UTC';
}

/**
 * Получает понятное название timezone
 * @param {string} timezone - IANA timezone string
 * @returns {string} Понятное название
 */
function getTimezoneDisplayName(timezone) {
  // Карта для отображения простых UTC offset'ов
  const displayMap = {
    'UTC': 'UTC+0',
    'Europe/London': 'UTC+0',
    'Europe/Berlin': 'UTC+1',
    'Europe/Moscow': 'UTC+3',
    'Asia/Dubai': 'UTC+4',
    'Asia/Kolkata': 'UTC+5:30',
    'Asia/Almaty': 'UTC+6',
    'Asia/Bangkok': 'UTC+7',
    'Asia/Shanghai': 'UTC+8',
    'Asia/Tokyo': 'UTC+9',
    'Australia/Sydney': 'UTC+10',
    'Pacific/Guadalcanal': 'UTC+11',
    'Pacific/Auckland': 'UTC+12',
    'America/New_York': 'UTC-5',
    'America/Chicago': 'UTC-6',
    'America/Denver': 'UTC-7',
    'America/Los_Angeles': 'UTC-8',
    'America/Anchorage': 'UTC-9',
    'Pacific/Honolulu': 'UTC-10',
    'Pacific/Midway': 'UTC-11',
    'Pacific/Kwajalein': 'UTC-12',
    'Atlantic/Azores': 'UTC-1',
    'Atlantic/South_Georgia': 'UTC-2',
    'America/Caracas': 'UTC-4',
    'America/Sao_Paulo': 'UTC-3'
  };
  
  return displayMap[timezone] || timezone;
}

/**
 * Проверяет, является ли timezone валидным
 * @param {string} timezone - timezone string для проверки
 * @returns {boolean} true если валидный
 */
function isValidTimezone(timezone) {
  try {
    // Пытаемся создать дату с этим timezone
    const testDate = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    formatter.format(testDate);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  calculateTimezoneFromUserTime,
  getTimezoneDisplayName,
  isValidTimezone
}; 