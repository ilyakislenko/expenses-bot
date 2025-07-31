/**
 * Утилиты для работы с часовыми поясами
 */

// Список популярных часовых поясов
const POPULAR_TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)', code: 'moscow' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)', code: 'london' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)', code: 'ny' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8)', code: 'la' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)', code: 'tokyo' },
  { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)', code: 'shanghai' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)', code: 'sydney' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)', code: 'berlin' },
  { value: 'Europe/Paris', label: 'Париж (UTC+1)', code: 'paris' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)', code: 'dubai' },
  { value: 'Asia/Kolkata', label: 'Мумбаи (UTC+5:30)', code: 'mumbai' },
  { value: 'UTC', label: 'UTC (UTC+0)', code: 'utc' }
];

// Маппинг сокращенных кодов на полные названия timezone
const TIMEZONE_MAPPING = {
  'moscow': 'Europe/Moscow',
  'london': 'Europe/London',
  'ny': 'America/New_York',
  'la': 'America/Los_Angeles',
  'tokyo': 'Asia/Tokyo',
  'shanghai': 'Asia/Shanghai',
  'sydney': 'Australia/Sydney',
  'berlin': 'Europe/Berlin',
  'paris': 'Europe/Paris',
  'dubai': 'Asia/Dubai',
  'mumbai': 'Asia/Kolkata',
  'utc': 'UTC'
};

/**
 * Получить список популярных часовых поясов
 * @returns {Array} Массив объектов с value и label
 */
function getPopularTimezones() {
  return POPULAR_TIMEZONES;
}

/**
 * Валидация часового пояса
 * @param {string} timezone - Часовой пояс для проверки
 * @returns {boolean} true если валидный, false если нет
 */
function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  
  // Проверяем, что timezone есть в списке популярных
  const isValid = POPULAR_TIMEZONES.some(tz => tz.value === timezone);
  
  // Дополнительно можно проверить через Intl.DateTimeFormat
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Получить текущее время в указанном часовом поясе
 * @param {string} timezone - Часовой пояс
 * @returns {Date} Дата в указанном часовом поясе
 */
function getCurrentTimeInTimezone(timezone) {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  } catch (error) {
    // Если timezone невалидный, возвращаем UTC
    return new Date();
  }
}

/**
 * Конвертировать дату в указанный часовой пояс
 * @param {Date} date - Дата для конвертации
 * @param {string} timezone - Целевой часовой пояс
 * @returns {Date} Дата в указанном часовом поясе
 */
function convertDateToTimezone(date, timezone) {
  try {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  } catch (error) {
    return date;
  }
}

/**
 * Получить смещение часового пояса в часах от UTC
 * @param {string} timezone - Часовой пояс
 * @returns {number} Смещение в часах
 */
function getTimezoneOffset(timezone) {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (target.getTime() - utc.getTime()) / (1000 * 60 * 60);
  } catch (error) {
    return 0;
  }
}

/**
 * Получить полное название timezone по коду
 * @param {string} code - Сокращенный код timezone
 * @returns {string} Полное название timezone
 */
function getTimezoneByCode(code) {
  return TIMEZONE_MAPPING[code] || 'UTC';
}

/**
 * Получить код timezone по полному названию
 * @param {string} timezone - Полное название timezone
 * @returns {string} Сокращенный код
 */
function getTimezoneCode(timezone) {
  const found = POPULAR_TIMEZONES.find(tz => tz.value === timezone);
  return found ? found.code : 'utc';
}

module.exports = {
  getPopularTimezones,
  isValidTimezone,
  getCurrentTimeInTimezone,
  convertDateToTimezone,
  getTimezoneOffset,
  getTimezoneByCode,
  getTimezoneCode,
  TIMEZONE_MAPPING
}; 