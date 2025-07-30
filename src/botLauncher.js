const logger = require('./utils/logger');

module.exports = async function launchBot(bot, PORT = process.env.PORT || 3000) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      // Webhook режим для продакшена (только если есть WEBHOOK_URL)
      logger.startup('Starting bot in webhook mode', {
        webhookUrl: process.env.WEBHOOK_URL,
        port: PORT
      });
      
      await bot.launch({
        webhook: {
          domain: process.env.WEBHOOK_URL,
          port: PORT
        }
      });
    } else {
      // Polling режим (для разработки или production без webhook)
      logger.startup('Starting bot in polling mode');
      await bot.launch();
    }
    
    logger.startup('Bot started successfully! 🚀');
  } catch (error) {
    logger.error('Failed to launch bot:', { error: error.message, stack: error.stack });
    throw error;
  }
}; 