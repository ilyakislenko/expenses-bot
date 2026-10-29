const logger = require('../utils/logger');
const {
  securityRateLimitExceeded,
  securityValidationErrors,
  securityUnauthorizedAccess
} = require('../utils/metrics');

// Платёжные обновления нельзя терять: Telegram не присылает их повторно, а звёзды уже списаны
// (или возвращены). Они не подчиняются лимитам и не проверяются как пользовательский ввод.
function isPaymentUpdate(ctx) {
  return ctx.updateType === 'pre_checkout_query'
    || Boolean(ctx.message?.successful_payment)
    || Boolean(ctx.message?.refunded_payment);
}

class SecurityMiddleware {
  constructor(rateLimiter, enhancedValidator, localizationService, userService) {
    this.rateLimiter = rateLimiter;
    this.enhancedValidator = enhancedValidator;
    this.localizationService = localizationService;
    this.userService = userService;
  }

  // Основной middleware для безопасности
  middleware() {
    return async (ctx, next) => {
      // Закрытие своего опроса квиза (апдейт poll) приходит от Telegram без пользователя — не ввод и не под лимиты
      if (isPaymentUpdate(ctx) || ctx.updateType === 'poll') {
        return next();
      }

      try {
        const userId = ctx.from?.id;
        const updateType = ctx.updateType;

        if (!userId) {
          logger.warn('Request without user ID', { updateType });
          securityUnauthorizedAccess.inc({ access_type: 'no_user_id' });
          return await this.sendErrorResponse(ctx);
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
      } catch (error) {
        logger.error('Security middleware error', {
          error: error.message,
          userId: ctx.from?.id,
          updateType: ctx.updateType
        });

        return await this.sendErrorResponse(ctx);
      }

      // 4. Продолжаем обработку (ошибки обработчиков — не ошибки проверки безопасности)
      return next();
    };
  }

  // Язык пользователя; язык по умолчанию, если пользователь неизвестен или БД недоступна
  async userLanguage(ctx) {
    if (!ctx.from?.id) return 'en';
    try {
      return await this.userService.getUserLanguage(ctx.from.id);
    } catch (error) {
      logger.warn('Failed to get user language for security message', { userId: ctx.from.id, error: error.message });
      return 'en';
    }
  }

  async t(ctx, key, params) {
    return this.localizationService.getText(await this.userLanguage(ctx), key, params);
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

    // Специальная проверка для экспорта: лимит на формирование файла (кнопки периода xp|…)
    if (ctx.callbackQuery?.data?.startsWith('xp|')) {
      limitType = 'export';
    }

    // Файлы выписок (скачивание и разбор PDF/CSV) — отдельный лимит
    if (ctx.message?.document) {
      limitType = 'import';
    }
    // Фото чеков (скачивание и запрос к нейросети) — отдельный лимит; картинки файлом считаются как документы.
    // «🔄 Повернуть» (rvr) — тоже новый запрос к нейросети
    if (ctx.message?.photo || ctx.callbackQuery?.data === 'rvr') {
      limitType = 'receipt';
    }
    // Голосовые (скачивание и распознавание речи) — отдельный лимит
    if (ctx.message?.voice) {
      limitType = 'voice';
    }

    // Специальная проверка для баг-репортов
    if (ctx.callbackQuery?.data === 'bug_report') {
      limitType = 'bug_report';
    }

    return this.rateLimiter.checkLimit(userId, limitType);
  }

  // Обработка превышения rate limit: через сколько можно и лимит за окно (секунды до минуты, дальше — минуты)
  async handleRateLimitExceeded(ctx, rateLimitResult) {
    const { resetTime, limit, notify, windowMs = 60000 } = rateLimitResult;

    securityRateLimitExceeded.inc({ limit_type: ctx.updateType });

    // Уже предупредили в этом окне: молча отбрасываем (на кнопку — пустой ответ, чтобы не крутились часики)
    if (notify === false) {
      if (ctx.updateType === 'callback_query') await ctx.answerCbQuery().catch(() => {});
      return;
    }

    logger.warn('Rate limit exceeded', {
      userId: ctx.from?.id,
      limitType: ctx.updateType,
      resetTime,
      limit
    });

    try {
      // Язык — один запрос на сообщение: текст собирается из нескольких фраз
      const language = await this.userLanguage(ctx);
      const text = (key, params) => this.localizationService.getText(language, key, params);
      const duration = (seconds) => (seconds < 60
        ? text('rate_wait_seconds', { n: Math.max(1, Math.ceil(seconds)) })
        : text('rate_wait_minutes', { n: Math.ceil(seconds / 60) }));
      const message = text('security_rate_limit', {
        resetTime: duration(Number(resetTime) || 0),
        limit,
        window: duration(windowMs / 1000)
      });
      if (ctx.updateType === 'callback_query') {
        // Всплывающее окно не поддерживает разметку
        await ctx.answerCbQuery(message.replace(/\*/g, ''), { show_alert: true });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error('Failed to send rate limit message', { error: error.message });
    }
  }

  // Валидация входных данных. Профиль Telegram (имя, username) не проверяем: его проверяет Telegram,
  // а в текстах бота он экранируется при выводе.
  async validateInput(ctx, updateType) {
    try {
      switch (updateType) {
        case 'message':
          return this.validateMessage(ctx);
        case 'callback_query':
          return this.validateCallback(ctx);
        case 'inline_query':
          return this.validateInlineQuery(ctx);
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

  // Валидация сообщений: проверяем только команды. Траты и прочий ввод проверяются в обработчиках
  // с учётом состояния пользователя (редактирование vs создание).
  validateMessage(ctx) {
    const text = ctx.message?.text;
    if (text?.startsWith('/')) {
      const commandValidation = this.enhancedValidator.validateCommand(text);
      if (!commandValidation.isValid) {
        logger.warn('Invalid command', {
          userId: ctx.from?.id,
          command: text,
          error: commandValidation.error
        });
        return { isValid: false, error: 'invalid_command', details: commandValidation.error };
      }
    }
    return { isValid: true };
  }

  // Валидация callback запросов
  validateCallback(ctx) {
    const data = ctx.callbackQuery?.data;
    if (data) {
      const callbackValidation = this.enhancedValidator.validateCallbackData(data);
      if (!callbackValidation.isValid) {
        logger.warn('Invalid callback data', {
          userId: ctx.from?.id,
          data,
          error: callbackValidation.error
        });
        return { isValid: false, error: 'invalid_callback_data', details: callbackValidation.error };
      }
    }
    return { isValid: true };
  }

  // Валидация inline запросов
  validateInlineQuery(ctx) {
    const query = ctx.inlineQuery?.query;
    if (query && query.length > 100) {
      return { isValid: false, error: 'inline_query_too_long' };
    }
    return { isValid: true };
  }

  // Обработка ошибок валидации
  async handleValidationError(ctx, validationResult) {
    logger.warn('Validation error', {
      userId: ctx.from?.id,
      error: validationResult.error,
      details: validationResult.details
    });

    securityValidationErrors.inc({ error_type: validationResult.error });

    try {
      const message = await this.t(ctx, 'security_validation_error');
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery(message, { show_alert: true });
      } else {
        await ctx.reply(message);
      }
    } catch (error) {
      logger.error('Failed to send validation error message', { error: error.message });
    }
  }

  // Отправка общего сообщения об ошибке
  async sendErrorResponse(ctx) {
    try {
      const message = await this.t(ctx, 'security_error');
      if (ctx.updateType === 'callback_query') {
        await ctx.answerCbQuery(message.split('\n')[0].replace(/\*/g, ''), { show_alert: true });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error('Failed to send security error message', { error: error.message });
    }
  }

  // Получение статистики безопасности
  getSecurityStats() {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      validatorLimits: this.enhancedValidator.getLimits()
    };
  }
}

SecurityMiddleware.isPaymentUpdate = isPaymentUpdate;

module.exports = SecurityMiddleware;
