const logger = require('./utils/logger');

// Запускает бота и ждёт только подключения к Telegram (getMe).
// Возвращает { running }: в polling-режиме этот promise завершается лишь после bot.stop()
// (текущая пачка обновлений дообрабатывается, offset синхронизируется), с ошибкой — если polling упал.
module.exports = async function launchBot(bot, PORT = process.env.PORT || 3000) {
  let config = {};
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

    config = {
      webhook: {
        domain: webhookUrl,
        port: Number(PORT),
        hookPath,
        secretToken
      }
    };
  } else {
    // Polling режим
    logger.startup('Starting bot in polling mode');
  }

  // allowedUpdates не задаём: Telegraf шлёт getUpdates с allowed_updates = [] — все типы, кроме chat_member и реакций,
  // в том числе poll_answer и poll (ответы и закрытие опросов квиза недели). Свой список сломал бы квиз без них
  let onLaunch;
  const launched = new Promise((resolve) => { onLaunch = resolve; });
  const running = bot.launch(config, onLaunch);
  try {
    await Promise.race([launched, running]);
  } catch (error) {
    logger.error('Failed to launch bot:', { error: error.message, stack: error.stack });
    throw error;
  }

  logger.startup('Bot started successfully! 🚀');
  return { running };
};
