const logger = require('../utils/logger');
const { 
  securityRateLimitExceeded, 
  securityValidationErrors, 
  securityForbiddenPatterns, 
  securityUnauthorizedAccess 
} = require('../utils/metrics');

class SecurityMiddleware {
  constructor(rateLimiter, enhancedValidator) {
    this.rateLimiter = rateLimiter;
    this.enhancedValidator = enhancedValidator;
  }

  // Основной middleware для безопасности
  middleware() {
    return async (ctx, next) => {
      try {
        const userId = ctx.from?.id;
        const updateType = ctx.updateType;

        if (!userId) {
          logger.warn('Request without user ID', { updateType });
          securityUnauthorizedAccess.inc({ access_type: 'no_user_id', user_id: 'unknown' });
          return await this.sendErrorResponse(ctx, 'Unauthorized access');
        }

        // 1. Rate limiting
        const rateLimitResult = await this.checkRateLimit(ctx, userId, updateType);
        if (!rateLimitResult.allowed) {
          return await this.handleRateLimitExceeded(ctx, rateLimitResult);
        }

        // 2. Валидация входных данных
        const validationResult = await this.validateInput(ctx, updateType);
        if (!validationResult.isValid) {
          return await this.handleValidationError(ctx, validationResult);
        }

        // 3. Добавляем информацию о лимитах в контекст
        ctx.rateLimitInfo = rateLimitResult;
        ctx.validationInfo = validationResult;

        // 4. Продолжаем обработку
        return await next();

      } catch (error) {
        logger.error('Security middleware error', {
          error: error.message,
          userId: ctx.from?.id,
          updateType: ctx.updateType
        });
        
        return await this.sendErrorResponse(ctx, 'Security check failed');
      }
    };
  }

  // Проверка rate limit
  async checkRateLimit(ctx, userId, updateType) {
    let limitType = 'global';

    // Определяем тип лимита на основе типа обновления
    switch (updateType) {
      case 'message':
        if (ctx.message?.text?.startsWith('/')) {
          limitType = 'command';
        } else {
          limitType = 'message';
        }
        break;
      case 'callback_query':
        limitType = 'callback';
        break;
      case 'inline_query':
        limitType = 'inline';
        break;
      default:
        limitType = 'global';
    }

    // Специальная проверка для экспорта
    if (ctx.message?.text === '/export') {
      limitType = 'export';
    }

    return this.rateLimiter.checkLimit(userId, limitType);
  }

  // Обработка превышения rate limit
  async handleRateLimitExceeded(ctx, rateLimitResult) {
    const resetTime = rateLimitResult.resetTime;
    const limit = rateLimitResult.limit;
    
    const message = `⚠️ *Слишком много запросов*\n\n` +
      `Попробуйте через ${resetTime} секунд\n` +
      `Лимит: ${limit} запросов в минуту`;

    logger.warn('Rate limit exceeded', {
      userId: ctx.from?.id,
      limitType: ctx.updateType,
      resetTime,
      limit
    });

    // Обновляем метрики
    securityRateLimitExceeded.inc({ 
      user_id: ctx.from?.id?.toString() || 'unknown', 
      limit_type: ctx.updateType 
    });

    try {
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery(message, { show_alert: true });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error('Failed to send rate limit message', { error: error.message });
    }

    return;
  }

  // Валидация входных данных
  async validateInput(ctx, updateType) {
    try {
      switch (updateType) {
        case 'message':
          return await this.validateMessage(ctx);
        case 'callback_query':
          return await this.validateCallback(ctx);
        case 'inline_query':
          return await this.validateInlineQuery(ctx);
        default:
          return { isValid: true };
      }
    } catch (error) {
      logger.error('Input validation error', {
        error: error.message,
        updateType,
        userId: ctx.from?.id
      });
      return { isValid: false, error: 'validation_error' };
    }
  }

  // Валидация сообщений
  async validateMessage(ctx) {
    const text = ctx.message?.text;
    const user = ctx.from;

    // Валидация пользователя
    const userValidation = this.enhancedValidator.validateUserData(user);
    if (!userValidation.isValid) {
      logger.warn('Invalid user data', {
        userId: user?.id,
        errors: userValidation.errors
      });
      return { isValid: false, error: 'invalid_user_data', details: userValidation.errors };
    }

    // Если это команда
    if (text?.startsWith('/')) {
      const commandValidation = this.enhancedValidator.validateCommand(text);
      if (!commandValidation.isValid) {
        logger.warn('Invalid command', {
          userId: user?.id,
          command: text,
          error: commandValidation.error
        });
        return { isValid: false, error: 'invalid_command', details: commandValidation.error };
      }
    }
    // Если это сообщение с расходами (не команда) - валидация происходит в messageHandlers
    // с учетом контекста (редактирование vs создание нового расхода)
    else if (text && !text.startsWith('/')) {
      // Пропускаем валидацию сообщений с расходами, так как она происходит в messageHandlers
      // с учетом состояния пользователя (редактирование vs создание)
    }

    return { isValid: true, sanitizedUser: userValidation.sanitizedData };
  }

  // Валидация callback запросов
  async validateCallback(ctx) {
    const data = ctx.callbackQuery?.data;
    const user = ctx.from;

    // Валидация пользователя
    const userValidation = this.enhancedValidator.validateUserData(user);
    if (!userValidation.isValid) {
      return { isValid: false, error: 'invalid_user_data', details: userValidation.errors };
    }

    // Валидация callback данных
    if (data) {
      const callbackValidation = this.enhancedValidator.validateCallbackData(data);
      if (!callbackValidation.isValid) {
        logger.warn('Invalid callback data', {
          userId: user?.id,
          data,
          error: callbackValidation.error
        });
        return { isValid: false, error: 'invalid_callback_data', details: callbackValidation.error };
      }
    }

    return { isValid: true, sanitizedUser: userValidation.sanitizedData };
  }

  // Валидация inline запросов
  async validateInlineQuery(ctx) {
    const query = ctx.inlineQuery?.query;
    const user = ctx.from;

    // Валидация пользователя
    const userValidation = this.enhancedValidator.validateUserData(user);
    if (!userValidation.isValid) {
      return { isValid: false, error: 'invalid_user_data', details: userValidation.errors };
    }

    // Валидация inline запроса
    if (query && query.length > 100) {
      return { isValid: false, error: 'inline_query_too_long' };
    }

    return { isValid: true, sanitizedUser: userValidation.sanitizedData };
  }

  // Обработка ошибок валидации
  async handleValidationError(ctx, validationResult) {
    let message = '⚠️ *Ошибка валидации*\n\n';

    switch (validationResult.error) {
      case 'invalid_user_data':
        message += 'Некорректные данные пользователя';
        break;
      case 'invalid_command':
        message += 'Недопустимая команда';
        break;
      case 'invalid_expense_message':
        if (validationResult.details.message) {
          message += validationResult.details.message;
        } else {
          message += 'Некорректный формат сообщения';
        }
        break;
      case 'invalid_callback_data':
        message += 'Некорректные данные callback';
        break;
      case 'inline_query_too_long':
        message += 'Запрос слишком длинный';
        break;
      default:
        message += 'Ошибка проверки данных';
    }

    logger.warn('Validation error', {
      userId: ctx.from?.id,
      error: validationResult.error,
      details: validationResult.details
    });

    // Обновляем метрики валидации
    securityValidationErrors.inc({ 
      error_type: validationResult.error, 
      user_id: ctx.from?.id?.toString() || 'unknown' 
    });

    try {
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery(message, { show_alert: true });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error('Failed to send validation error message', { error: error.message });
    }

    return;
  }

  // Отправка общего сообщения об ошибке
  async sendErrorResponse(ctx, errorMessage) {
    try {
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery('❌ Ошибка безопасности', { show_alert: true });
      } else {
        await ctx.reply('❌ *Ошибка безопасности*\n\nПопробуйте позже или обратитесь к администратору.', {
          parse_mode: 'Markdown'
        });
      }
    } catch (error) {
      logger.error('Failed to send security error message', { error: error.message });
    }
  }

  // Middleware для административных команд
  adminOnly() {
    return async (ctx, next) => {
      const userId = ctx.from?.id;
      const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];

      if (!adminIds.includes(userId)) {
        logger.warn('Unauthorized admin access attempt', { userId });
        securityUnauthorizedAccess.inc({ access_type: 'admin_access', user_id: userId?.toString() || 'unknown' });
        await ctx.reply('❌ У вас нет прав для выполнения этой команды');
        return;
      }

      return await next();
    };
  }

  // Middleware для проверки блокировки пользователя
  checkUserBlock() {
    return async (ctx, next) => {
      const userId = ctx.from?.id;
      
      // Здесь можно добавить проверку блокировки пользователя
      // Например, через базу данных или Redis
      
      return await next();
    };
  }

  // Получение статистики безопасности
  getSecurityStats() {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      validatorLimits: this.enhancedValidator.getLimits()
    };
  }
}

module.exports = SecurityMiddleware; 