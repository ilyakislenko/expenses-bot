const {
  bot,
  db,
  currencyUtils,
  cron,
  userEditState,
  ExpenseService,
  UserService,
  errorHandler,
  commandHandlers,
  messageHandlers,
  callbackHandlers
} = require('./botConfig');

const applyBotMiddleware = require('./botMiddleware');
const registerBotRoutes = require('./botRoutes');
const setupBotCron = require('./botCron');
const launchBot = require('./botLauncher');

// 1. Middleware
applyBotMiddleware(bot, errorHandler);

// 2. Cron задачи (обновление курсов валют)
setupBotCron(cron, currencyUtils);

// 3. Роутинг команд, сообщений, callback-ов
registerBotRoutes(bot, {
  errorHandler,
  commandHandlers,
  messageHandlers,
  callbackHandlers,
  userEditState,
  ExpenseService,
  UserService,
  currencyUtils,
  db
});

// 4. Запуск бота
launchBot(bot); 