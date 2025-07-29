module.exports = function launchBot(bot, PORT = process.env.PORT || 3000) {
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    // Webhook режим для продакшена (только если есть WEBHOOK_URL)
    bot.launch({
      webhook: {
        domain: process.env.WEBHOOK_URL,
        port: PORT
      }
    });
  } else {
    // Polling режим (для разработки или production без webhook)
    bot.launch();
  }
  console.log('Bot started successfully! 🚀');

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}; 