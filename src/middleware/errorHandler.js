const logger = require('../utils/logger');

// Фабрика обёртки обработчиков: ошибка логируется, пользователь получает error_generic на своём языке,
// у нажатой кнопки гасится индикатор загрузки.
module.exports = function createErrorHandler({ userService, localizationService }) {
  async function replyWithError(ctx) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {});
    }
    if (!ctx.chat) return;

    let language = 'en';
    if (ctx.from?.id) {
      try {
        language = await userService.getUserLanguage(ctx.from.id);
      } catch (error) {
        logger.warn('Failed to get user language for error message', { userId: ctx.from.id, error: error.message });
      }
    }
    await ctx.reply(localizationService.getText(language, 'error_generic')).catch((error) => {
      logger.warn('Failed to send error message', { userId: ctx.from?.id, error: error.message });
    });
  }

  const errorHandler = (handler) => async (ctx, next) => {
    try {
      await handler(ctx, next);
    } catch (err) {
      logger.error('Bot handler error', {
        error: err.message,
        stack: err.stack,
        userId: ctx.from?.id,
        updateType: ctx.updateType,
        callbackData: ctx.callbackQuery?.data
      });
      await replyWithError(ctx);
    }
  };
  errorHandler.replyWithError = replyWithError;
  return errorHandler;
};
