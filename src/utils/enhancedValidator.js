const logger = require('./logger');
const currencyConfig = require('../config/currencies');

// Сумма в начале ввода: «1500», «1500,5», «1 500», «1 000,50» — пробел (в т.ч. неразрывный) отделяет тысячи.
// Группа 1 — целая часть, 2 — дробная, 3 — остаток строки.
const MONEY_PREFIX = /^(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)([.,]\d{1,2})?(?=$|\s|[$€₽₸₾₺₹฿])\s*(.*)$/su;
// Правка записи: сумма отделена от описания пробелом, знаков после запятой сколько угодно
const EDIT_PREFIX = /^(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)([.,]\d+)?(?=$|\s)\s*(.*)$/su;

function toAmount(integerPart, fraction) {
  return parseFloat(integerPart.replace(/[ \u00a0\u202f]/g, '') + (fraction || '').replace(',', '.'));
}

class EnhancedValidator {
  constructor() {
    // Конфигурация лимитов
    this.limits = {
      // Предел колонки expenses.amount DECIMAL(10,2)
      maxAmount: 99999999,
      minAmount: 0.01,
      maxDescriptionLength: 100,
      minDescriptionLength: 1,
      maxCategoryNameLength: 30
    };

    // Паттерны для валидации
    this.patterns = {
      // Разрешаем любые символы, кроме явно запрещенных
      description: /^[^\x00-\x1F\x7F<>]+$/,
      // Разрешаем любые символы, кроме явно запрещенных
      categoryName: /^[^\x00-\x1F\x7F<>]+$/,
      currency: /^[A-Z]{3}$/,
      // Разрешаем пробелы в callback_data, так как кнопки могут содержать названия с пробелами
      callbackData: /^[^\x00-\x1F\x7F<>]+$/,
      command: /^\/[a-zA-Z0-9_]+$/
    };

    // Запрещенные паттерны (разметка/скрипты) — только для callback data
    this.forbidden = {
      patterns: [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /vbscript:/i
      ]
    };
  }

  // Валидация команды. Аргумент допускается только у /start — это код из ссылки t.me/<bot>?start=<код>
  // (Telegram разрешает в нём A-Z, a-z, 0-9, "_" и "-", до 64 символов).
  validateCommand(command) {
    if (!command || typeof command !== 'string') {
      return { isValid: false, error: 'invalid_command' };
    }

    const [name, ...args] = command.trim().split(/\s+/);
    if (!this.patterns.command.test(name)) {
      return { isValid: false, error: 'invalid_command_format' };
    }
    if (args.length && !(name.toLowerCase() === '/start' && args.length === 1 && /^[A-Za-z0-9_-]{1,64}$/.test(args[0]))) {
      return { isValid: false, error: 'invalid_command_format' };
    }

    // Проверка на запрещенные команды
    const forbiddenCommands = ['/eval', '/exec', '/system', '/admin'];
    if (forbiddenCommands.includes(name.toLowerCase())) {
      logger.warn('Forbidden command attempted', { command });
      return { isValid: false, error: 'forbidden_command' };
    }

    return { isValid: true, command: name.toLowerCase() };
  }

  // Валидация callback данных
  validateCallbackData(data) {
    if (!data || typeof data !== 'string') {
      return { isValid: false, error: 'invalid_callback_data' };
    }

    if (data.length > 64) {
      return { isValid: false, error: 'callback_data_too_long' };
    }

    if (!this.patterns.callbackData.test(data)) {
      return { isValid: false, error: 'invalid_callback_format' };
    }

    // Проверка на запрещенные паттерны (только разметка/скрипты: стоп-слова
    // не применяем — callback data генерирует бот, а случайные коды
    // приглашений вида `accept_invitation|XBOT12YZ` содержат «bot»/«root» и т.п.)
    if (this.forbidden.patterns.some((pattern) => pattern.test(data))) {
      logger.warn('Forbidden pattern in callback data', { data });
      return { isValid: false, error: 'forbidden_callback_content' };
    }

    return { isValid: true, data: this.sanitizeText(data) };
  }

  // Валидация валюты
  validateCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
      return { isValid: false, error: 'invalid_currency' };
    }

    if (!this.patterns.currency.test(currency)) {
      return { isValid: false, error: 'invalid_currency_format' };
    }

    const allowed = new Set([currencyConfig.BASE_CURRENCY, ...currencyConfig.SUPPORTED_CURRENCIES]);
    if (!allowed.has(currency)) {
      return { isValid: false, error: 'unsupported_currency' };
    }

    return { isValid: true, currency };
  }

  // Приватные методы валидации

  validateDescription(description, maxLen = this.limits.maxDescriptionLength) {
    if (!description || typeof description !== 'string') {
      return { isValid: false, error: 'invalid_description' };
    }

    if (description.length < this.limits.minDescriptionLength) {
      return { isValid: false, error: 'description_too_short', message: 'Описание слишком короткое' };
    }

    if (description.length > maxLen) {
      return { isValid: false, error: 'description_too_long', message: 'Описание слишком длинное' };
    }

    if (!this.patterns.description.test(description)) {
      return { isValid: false, error: 'invalid_description_format', message: 'Недопустимые символы в описании' };
    }

    return { isValid: true };
  }

  // Парсинг для редактирования расходов (более гибкий)
  parseEditExpense(text, maxDescriptionLength = 60) {
    const input = text.trim();
    let amount;
    let description = input;

    // "1 000" — только сумма, "1 000 обед" — сумма и описание, иначе весь текст — описание
    const match = input.match(EDIT_PREFIX);
    if (match) {
      amount = toAmount(match[1], match[2]);
      description = match[3].trim();
    }

    if (amount === undefined && !description) {
      return { isValid: false, error: 'empty', message: 'Введите новую сумму, описание или оба значения' };
    }

    if (amount !== undefined && (isNaN(amount) || amount <= 0 || amount > this.limits.maxAmount)) {
      return { isValid: false, error: 'amount', message: 'Некорректная сумма' };
    }

    if (description && description.length > maxDescriptionLength) {
      return { isValid: false, error: 'too_long', message: `Описание слишком длинное (максимум ${maxDescriptionLength} символов)` };
    }

    // Валидация описания если оно есть
    if (description) {
      const descriptionValidation = this.validateDescription(description, maxDescriptionLength);
      if (!descriptionValidation.isValid) {
        return descriptionValidation;
      }
    }

    return {
      isValid: true,
      amount,
      description: description ? this.sanitizeText(description, maxDescriptionLength) : undefined
    };
  }

  // Парсинг "сумма [валюта] [описание]" для доходов и регулярных трат.
  // Валюта — код из SUPPORTED_CURRENCIES (регистр не важен) или символ ($, €, ₽ …), сразу после суммы.
  // Возвращает currency = null, если валюта не указана.
  parseMoneyInput(text, { maxAmount, maxDescriptionLength, requireDescription }) {
    const input = (text || '').trim();

    const match = input.match(MONEY_PREFIX);
    if (!match) {
      return { isValid: false, error: 'format' };
    }

    const amount = toAmount(match[1], match[2]);
    if (isNaN(amount) || amount < this.limits.minAmount || amount > maxAmount) {
      return { isValid: false, error: 'amount' };
    }

    let rest = match[3].trim();
    let currency = null;
    const [firstToken, ...otherTokens] = rest.split(/\s+/);
    const tokenCurrency = this.resolveCurrencyToken(firstToken);
    if (tokenCurrency) {
      currency = tokenCurrency;
      rest = otherTokens.join(' ');
    }

    if (!rest) {
      if (requireDescription) {
        return { isValid: false, error: 'no_description' };
      }
      return { isValid: true, amount, currency, description: null };
    }

    if (rest.length > maxDescriptionLength) {
      return { isValid: false, error: 'too_long' };
    }

    const descriptionValidation = this.validateDescription(rest, maxDescriptionLength);
    if (!descriptionValidation.isValid) {
      return descriptionValidation;
    }

    return { isValid: true, amount, currency, description: this.sanitizeText(rest, maxDescriptionLength) };
  }

  resolveCurrencyToken(token) {
    if (!token) return null;
    const symbols = { '$': 'USD', '€': 'EUR', '₽': 'RUB', '₸': 'KZT', '₾': 'GEL', '₺': 'TRY', '₹': 'INR', '฿': 'THB' };
    if (symbols[token]) return symbols[token];
    const code = token.toUpperCase();
    return currencyConfig.SUPPORTED_CURRENCIES.includes(code) ? code : null;
  }

  // Санитизация текста
  sanitizeText(text, maxLen = this.limits.maxDescriptionLength) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/[<>]/g, '') // Удаляем потенциально опасные символы
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .substring(0, maxLen);
  }

  // Получение информации о лимитах
  getLimits() {
    return { ...this.limits };
  }

  // Обновление лимитов (для административных целей)
  updateLimits(newLimits) {
    Object.assign(this.limits, newLimits);
    logger.info('Validator limits updated', { newLimits });
  }
}

module.exports = EnhancedValidator; 