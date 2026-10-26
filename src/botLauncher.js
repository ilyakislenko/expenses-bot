const logger = require('./utils/logger');

module.exports = async function launchBot(bot, PORT = process.env.PORT || 3000) {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      // Webhook режим для продакшена
      const webhookUrl = process.env.WEBHOOK_URL;
      // secretToken защищает от поддельных запросов — Telegram шлёт его в заголовке X-Telegram-Bot-Api-Secret-Token
      const secretToken = process.env.WEBHOOK_SECRET || undefined;
      // hookPath — путь, по которому Telegram будет слать update'ы (по умолчанию /telegraf/<bot-token>)
      const hookPath = process.env.WEBHOOK_PATH || `/webhook/${bot.secretPathComponent()}`;

      logger.startup('Starting bot in webhook mode', {
        webhookUrl,
        hookPath,
        port: PORT,
        hasSecret: !!secretToken
      });

      await bot.launch({
        webhook: {
          domain: webhookUrl,
          port: Number(PORT),
          hookPath,
          secretToken
        }
      });
    } else {
      // Polling режим для разработки
      logger.startup('Starting bot in polling mode');
      await bot.launch();
    }

    logger.startup('Bot started successfully! 🚀');
  } catch (error) {
    logger.error('Failed to launch bot:', { error: error.message, stack: error.stack });
    throw error;
  }
};
