module.exports = function applyBotMiddleware(bot, errorHandler) {
  // Middleware для логирования
  bot.use((ctx, next) => {
    const user = ctx.from;
    const text = ctx.message?.text || ctx.callbackQuery?.data || 'non-text';
    console.log(`[${new Date().toISOString()}] User ${user.id} (@${user.username}): ${text}`);
    return next();
  });
  // Здесь можно добавить другие middleware, например, обработку ошибок
  // bot.use(errorHandler); // Обычно errorHandler применяется к обработчикам, а не глобально
}; 