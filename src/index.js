const Container = require('./container');
const applyBotMiddleware = require('./botMiddleware');
const registerBotRoutes = require('./botRoutes');
const setupBotCron = require('./botCron');
const launchBot = require('./botLauncher');
const logger = require('./utils/logger');

async function startApplication() {
  try {
    logger.startup('Starting expenses bot application...');

    // Создаем контейнер зависимостей
    const container = new Container();

    // Получаем все необходимые зависимости
    const bot = container.get('bot');
    const handlers = container.getHandlers();
    const monitoringServer = container.get('monitoringServer');

    // 1. Запускаем сервер мониторинга
    await monitoringServer.start();
    logger.startup('Monitoring server started successfully');

    // 2. Middleware
    applyBotMiddleware(bot, handlers.errorHandler, handlers.callbackDeduplicator, handlers.securityMiddleware);
    logger.startup('Bot middleware applied');

    // 3. Cron задачи (обновление курсов валют)
    setupBotCron(container.get('cron'), handlers.currencyUtils);
    logger.startup('Cron jobs configured');

    // 4. Роутинг команд, сообщений, callback-ов
    registerBotRoutes(bot, handlers);
    logger.startup('Bot routes registered');

    // 5. Запуск бота
    await launchBot(bot);
    logger.startup('Bot launched successfully');

    // Обработка graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      await monitoringServer.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      await monitoringServer.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startApplication(); 