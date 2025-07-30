const logger = require('./logger');

class EnhancedValidator {
  constructor() {
    // Конфигурация лимитов
    this.limits = {
      maxAmount: 999999,
      minAmount: 0.01,
      maxDescriptionLength: 100,
      minDescriptionLength: 1,
      maxCategoryNameLength: 50,
      maxUsernameLength: 32,
      maxFirstNameLength: 64,
      maxLastNameLength: 64
    };

    // Паттерны для валидации
    this.patterns = {
      amount: /^[0-9]+([.,][0-9]{1,2})?$/,
      description: /^[а-яёa-z0-9\s\-_.,!?()]+$/i,
      categoryName: /^[а-яёa-z0-9\s\-_]+$/i,
      username: /^[a-zA-Z0-9_]{5,32}$/,
      firstName: /^[а-яёa-z\s\-']+$/i,
      lastName: /^[а-яёa-z\s\-']+$/i,
      currency: /^[A-Z]{3}$/,
      callbackData: /^[a-zA-Z0-9а-яё_\-:|]+$/i,
      command: /^\/[a-zA-Z0-9_]+$/
    };

    // Запрещенные слова и паттерны
    this.forbidden = {
      words: ['spam', 'bot', 'admin', 'root', 'system'],
      patterns: [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /vbscript:/i
      ]
    };
  }

  // Основная валидация сообщения с расходами
  validateExpenseMessage(text) {
    try {
      // Базовая проверка
      if (!text || typeof text !== 'string') {
        return { isValid: false, error: 'invalid_input', message: 'Некорректный ввод' };
      }

      // Проверка длины
      if (text.length > 200) {
        return { isValid: false, error: 'too_long', message: 'Сообщение слишком длинное' };
      }

      // Проверка на запрещенные паттерны
      if (this.containsForbiddenPatterns(text)) {
        logger.warn('Forbidden pattern detected in expense message', { text: text.substring(0, 50) });
        return { isValid: false, error: 'forbidden_content', message: 'Недопустимое содержимое' };
      }

      // Парсинг суммы и описания
      const parsed = this.parseExpenseText(text);
      if (!parsed.isValid) {
        return parsed;
      }

      // Дополнительная валидация суммы
      const amountValidation = this.validateAmount(parsed.amount);
      if (!amountValidation.isValid) {
        return amountValidation;
      }

      // Дополнительная валидация описания
      const descriptionValidation = this.validateDescription(parsed.description);
      if (!descriptionValidation.isValid) {
        return descriptionValidation;
      }

      return {
        isValid: true,
        amount: parsed.amount,
        description: parsed.description,
        sanitizedDescription: this.sanitizeText(parsed.description)
      };

    } catch (error) {
      logger.error('Error in validateExpenseMessage', { error: error.message, text });
      return { isValid: false, error: 'validation_error', message: 'Ошибка валидации' };
    }
  }

  // Валидация команды
  validateCommand(command) {
    if (!command || typeof command !== 'string') {
      return { isValid: false, error: 'invalid_command' };
    }

    if (!this.patterns.command.test(command)) {
      return { isValid: false, error: 'invalid_command_format' };
    }

    // Проверка на запрещенные команды
    const forbiddenCommands = ['/eval', '/exec', '/system', '/admin'];
    if (forbiddenCommands.includes(command.toLowerCase())) {
      logger.warn('Forbidden command attempted', { command });
      return { isValid: false, error: 'forbidden_command' };
    }

    return { isValid: true, command: command.toLowerCase() };
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

    // Проверка на запрещенные паттерны
    if (this.containsForbiddenPatterns(data)) {
      logger.warn('Forbidden pattern in callback data', { data });
      return { isValid: false, error: 'forbidden_callback_content' };
    }

    return { isValid: true, data: this.sanitizeText(data) };
  }

  // Валидация данных пользователя
  validateUserData(userData) {
    const errors = [];

    if (userData.id) {
      const idValidation = this.validateUserId(userData.id);
      if (!idValidation.isValid) {
        errors.push(idValidation.error);
      }
    }

    if (userData.username) {
      const usernameValidation = this.validateUsername(userData.username);
      if (!usernameValidation.isValid) {
        errors.push(usernameValidation.error);
      }
    }

    if (userData.first_name) {
      const firstNameValidation = this.validateFirstName(userData.first_name);
      if (!firstNameValidation.isValid) {
        errors.push(firstNameValidation.error);
      }
    }

    if (userData.last_name) {
      const lastNameValidation = this.validateLastName(userData.last_name);
      if (!lastNameValidation.isValid) {
        errors.push(lastNameValidation.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        id: userData.id,
        username: userData.username ? this.sanitizeText(userData.username) : null,
        first_name: userData.first_name ? this.sanitizeText(userData.first_name) : null,
        last_name: userData.last_name ? this.sanitizeText(userData.last_name) : null
      }
    };
  }

  // Валидация валюты
  validateCurrency(currency) {
    if (!currency || typeof currency !== 'string') {
      return { isValid: false, error: 'invalid_currency' };
    }

    if (!this.patterns.currency.test(currency)) {
      return { isValid: false, error: 'invalid_currency_format' };
    }

    const allowedCurrencies = ['RUB', 'USD', 'EUR', 'GBP', 'CNY', 'JPY'];
    if (!allowedCurrencies.includes(currency)) {
      return { isValid: false, error: 'unsupported_currency' };
    }

    return { isValid: true, currency };
  }

  // Приватные методы валидации

  validateAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: 'invalid_amount_type' };
    }

    if (amount < this.limits.minAmount) {
      return { isValid: false, error: 'amount_too_small', message: 'Сумма слишком мала' };
    }

    if (amount > this.limits.maxAmount) {
      return { isValid: false, error: 'amount_too_large', message: 'Сумма слишком велика' };
    }

    return { isValid: true };
  }

  validateDescription(description) {
    if (!description || typeof description !== 'string') {
      return { isValid: false, error: 'invalid_description' };
    }

    if (description.length < this.limits.minDescriptionLength) {
      return { isValid: false, error: 'description_too_short', message: 'Описание слишком короткое' };
    }

    if (description.length > this.limits.maxDescriptionLength) {
      return { isValid: false, error: 'description_too_long', message: 'Описание слишком длинное' };
    }

    if (!this.patterns.description.test(description)) {
      return { isValid: false, error: 'invalid_description_format', message: 'Недопустимые символы в описании' };
    }

    return { isValid: true };
  }

  validateUserId(id) {
    if (!id || typeof id !== 'number' || id <= 0 || !Number.isInteger(id)) {
      return { isValid: false, error: 'invalid_user_id' };
    }

    if (id > 999999999999) { // Telegram ID ограничение
      return { isValid: false, error: 'user_id_too_large' };
    }

    return { isValid: true };
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'invalid_username' };
    }

    if (username.length > this.limits.maxUsernameLength) {
      return { isValid: false, error: 'username_too_long' };
    }

    if (!this.patterns.username.test(username)) {
      return { isValid: false, error: 'invalid_username_format' };
    }

    return { isValid: true };
  }

  validateFirstName(firstName) {
    if (!firstName || typeof firstName !== 'string') {
      return { isValid: false, error: 'invalid_first_name' };
    }

    if (firstName.length > this.limits.maxFirstNameLength) {
      return { isValid: false, error: 'first_name_too_long' };
    }

    if (!this.patterns.firstName.test(firstName)) {
      return { isValid: false, error: 'invalid_first_name_format' };
    }

    return { isValid: true };
  }

  validateLastName(lastName) {
    if (!lastName || typeof lastName !== 'string') {
      return { isValid: false, error: 'invalid_last_name' };
    }

    if (lastName.length > this.limits.maxLastNameLength) {
      return { isValid: false, error: 'last_name_too_long' };
    }

    if (!this.patterns.lastName.test(lastName)) {
      return { isValid: false, error: 'invalid_last_name_format' };
    }

    return { isValid: true };
  }

  // Парсинг текста с расходами (для обычных сообщений)
  parseExpenseText(text) {
    const trimmedText = text.trim();
    
    // Паттерн: число + описание
    const match = trimmedText.match(/^(\d+[.,]?\d*)\s+(.+)$/);
    if (!match) {
      return { isValid: false, error: 'invalid_format', message: 'Формат: сумма описание' };
    }

    const amountStr = match[1].replace(',', '.');
    const description = match[2].trim();

    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      return { isValid: false, error: 'invalid_amount', message: 'Некорректная сумма' };
    }

    return {
      isValid: true,
      amount,
      description
    };
  }

  // Совместимость со старым интерфейсом (для обычных сообщений)
  parseExpense(text, maxDescriptionLength = 60) {
    const trimmedText = text.trim();
    
    // Проверка на запрещенные паттерны
    if (this.containsForbiddenPatterns(trimmedText)) {
      logger.warn('Forbidden pattern detected in expense message', { text: trimmedText.substring(0, 50) });
      return { isValid: false, error: 'forbidden_content' };
    }

    // Паттерн: число + описание
    const match = trimmedText.match(/^(\d+[.,]?\d*)\s+(.+)$/);
    if (!match) {
      return { isValid: false, error: 'format' };
    }

    const amountStr = match[1].replace(',', '.');
    const description = match[2].trim();

    if (!description || description.length === 0) {
      return { isValid: false, error: 'no_description' };
    }

    if (description.length > maxDescriptionLength) {
      return { isValid: false, error: 'too_long' };
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > this.limits.maxAmount) {
      return { isValid: false, error: 'amount' };
    }

    // Валидация описания
    const descriptionValidation = this.validateDescription(description);
    if (!descriptionValidation.isValid) {
      return descriptionValidation;
    }

    return {
      isValid: true,
      amount,
      description: this.sanitizeText(description)
    };
  }

  // Парсинг для редактирования расходов (более гибкий)
  parseEditExpense(text, maxDescriptionLength = 60) {
    const input = text.trim();
    let amount = null;
    let description = null;

    // Проверка на запрещенные паттерны
    if (this.containsForbiddenPatterns(input)) {
      logger.warn('Forbidden pattern detected in edit expense', { text: input.substring(0, 50) });
      return { isValid: false, error: 'forbidden_content', message: 'Недопустимое содержимое' };
    }

    // Если только число (положительное)
    const amountMatch = input.match(/^([0-9]+([.,][0-9]+)?)$/);
    if (amountMatch) {
      amount = amountMatch[1].replace(',', '.');
    } else if (/^[0-9]+([.,][0-9]+)?\s+/.test(input)) {
      // число + текст
      const [amt, ...descArr] = input.split(' ');
      amount = amt.replace(',', '.');
      description = descArr.join(' ').trim();
    } else {
      // только текст
      description = input;
    }

    if (!amount && !description) {
      return { isValid: false, error: 'empty', message: 'Введите новую сумму, описание или оба значения' };
    }

    if (amount && (isNaN(Number(amount)) || Number(amount) <= 0 || Number(amount) > this.limits.maxAmount)) {
      return { isValid: false, error: 'amount', message: 'Некорректная сумма' };
    }

    if (description && description.length > maxDescriptionLength) {
      return { isValid: false, error: 'too_long', message: `Описание слишком длинное (максимум ${maxDescriptionLength} символов)` };
    }

    // Валидация описания если оно есть
    if (description) {
      const descriptionValidation = this.validateDescription(description);
      if (!descriptionValidation.isValid) {
        return descriptionValidation;
      }
    }

    return {
      isValid: true,
      amount: amount ? Number(amount) : undefined,
      description: description ? this.sanitizeText(description) : undefined
    };
  }

  // Проверка на запрещенные паттерны
  containsForbiddenPatterns(text) {
    const lowerText = text.toLowerCase();
    
    // Проверка запрещенных слов
    for (const word of this.forbidden.words) {
      if (lowerText.includes(word)) {
        return true;
      }
    }

    // Проверка запрещенных паттернов
    for (const pattern of this.forbidden.patterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  // Санитизация текста
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/[<>]/g, '') // Удаляем потенциально опасные символы
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .substring(0, this.limits.maxDescriptionLength);
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