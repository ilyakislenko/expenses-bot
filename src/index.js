const Container = require('./container');
const applyBotMiddleware = require('./botMiddleware');
const registerBotRoutes = require('./botRoutes');
const setupBotCron = require('./botCron');
const launchBot = require('./botLauncher');
const BaseRepository = require('./repositories/BaseRepository');
const logger = require('./utils/logger');

const SHUTDOWN_TIMEOUT_MS = 15000;

async function startApplication() {
  let bot = null;
  let monitoringServer = null;
  let running = null;
  let shuttingDown = false;

  // Graceful shutdown: дообрабатываем текущую пачку обновлений и синхронизируем offset (bot.stop),
  // затем закрываем мониторинг и пул БД. Обработчики ставим до запуска бота.
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully...`);
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, exiting');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    try {
      if (running) {
        bot.stop(signal);
        await running.catch(() => {});
      }
      if (monitoringServer) await monitoringServer.stop();
      await BaseRepository.closePool();
    } catch (error) {
      logger.error('Error during shutdown:', { error: error.message, stack: error.stack });
    }
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  try {
    logger.startup('Starting expenses bot application...');

    // Создаем контейнер зависимостей
    const container = new Container();

    // Получаем все необходимые зависимости
    bot = container.get('bot');
    const handlers = container.getHandlers();
    monitoringServer = container.get('monitoringServer');

    // 1. Запускаем сервер мониторинга
    await monitoringServer.start();
    logger.startup('Monitoring server started successfully');

    // 2. Middleware
    applyBotMiddleware(bot, handlers.errorHandler, handlers.callbackDeduplicator, handlers.securityMiddleware);
    logger.startup('Bot middleware applied');

    // 3. Cron задачи (обновление курсов валют, донаты, напоминалки)
    setupBotCron(
      container.get('cron'),
      handlers.currencyUtils,
      handlers.donationRepository,
      handlers.userService,
      handlers.expenseService,
      handlers.notificationService,
      handlers.recurringExpenseService,
      handlers.premiumLifecycleService,
      handlers.reportService,
      handlers.dailySummaryService,
      handlers.weeklyInsightService,
      handlers.planningService
    );
    logger.startup('Cron jobs configured');

    // 4. Роутинг команд, сообщений, callback-ов
    registerBotRoutes(bot, handlers);
    logger.startup('Bot routes registered');

    // Описание и меню команд в Telegram задаются отдельно: node scripts/set-bot-profile.js (тексты в src/locales)

    // 5. Запуск бота: ждём только подключения, polling работает в фоне до bot.stop()
    ({ running } = await launchBot(bot));
    logger.startup('Bot launched successfully');
    running.catch((error) => {
      if (shuttingDown) return;
      logger.error('Bot stopped with error:', { error: error.message, stack: error.stack });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start application:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startApplication();
