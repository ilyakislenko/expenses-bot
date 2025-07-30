const { metricsMiddleware, telegramDuplicateCallbacks } = require('./utils/metrics');
const logger = require('./utils/logger');

module.exports = function applyBotMiddleware(bot, errorHandler, callbackDeduplicator, securityMiddleware) {
  // Middleware для метрик
  bot.use(metricsMiddleware());

  // Security middleware (rate limiting + validation)
  if (securityMiddleware) {
    bot.use(securityMiddleware.middleware());
    logger.startup('Security middleware applied');
  }

  // Middleware для дедупликации callback_query
  bot.use((ctx, next) => {
    if (ctx.updateType === 'callback_query' && ctx.callbackQuery?.id) {
      const callbackId = ctx.callbackQuery.id;
      
      if (callbackDeduplicator.isProcessed(callbackId)) {
        logger.warn('Duplicate callback_query detected, skipping', {
          callbackId,
          userId: ctx.from?.id,
          data: ctx.callbackQuery.data
        });
        
        // Обновляем метрики
        telegramDuplicateCallbacks.inc();
        
        // Отвечаем на callback, чтобы Telegram не отправлял его повторно
        ctx.answerCbQuery().catch(() => {
          // Игнорируем ошибки ответа на callback
        });
        
        return; // Прерываем обработку
      }
      
      // Отмечаем callback как обработанный
      callbackDeduplicator.markProcessed(callbackId);
    }
    
    return next();
  });

  // Middleware для логирования запросов
  bot.use((ctx, next) => {
    const start = Date.now();
    const user = ctx.from;
    const updateType = ctx.updateType;
    const text = ctx.message?.text || ctx.callbackQuery?.data || 'non-text';
    
    logger.telegram('Telegram request received', {
      userId: user?.id,
      username: user?.username,
      updateType,
      text: text.substring(0, 100),
      chatId: ctx.chat?.id,
      callbackId: ctx.callbackQuery?.id
    });

    return next().then(() => {
      const duration = Date.now() - start;
      logger.telegram('Telegram request completed', {
        userId: user?.id,
        updateType,
        duration: `${duration}ms`,
        callbackId: ctx.callbackQuery?.id
      });
    }).catch((error) => {
      const duration = Date.now() - start;
      logger.error('Telegram request failed', {
        userId: user?.id,
        updateType,
        duration: `${duration}ms`,
        error: error.message,
        callbackId: ctx.callbackQuery?.id
      });
      throw error;
    });
  });

  // Middleware для обработки ошибок
  bot.catch((err, ctx) => {
    logger.error('Unhandled bot error:', {
      error: err.message,
      stack: err.stack,
      userId: ctx.from?.id,
      updateType: ctx.updateType,
      chatId: ctx.chat?.id
    });
    
    // Отправляем сообщение пользователю об ошибке
    ctx.reply('Произошла ошибка. Попробуйте позже или обратитесь к администратору.').catch(() => {
      // Игнорируем ошибки отправки сообщения об ошибке
    });
  });
}; 