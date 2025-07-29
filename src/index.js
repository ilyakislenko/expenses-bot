const Container = require('./container');
const applyBotMiddleware = require('./botMiddleware');
const registerBotRoutes = require('./botRoutes');
const setupBotCron = require('./botCron');
const launchBot = require('./botLauncher');

// Создаем контейнер зависимостей
const container = new Container();

// Получаем все необходимые зависимости
const bot = container.get('bot');
const handlers = container.getHandlers();

// 1. Middleware
applyBotMiddleware(bot, handlers.errorHandler);

// 2. Cron задачи (обновление курсов валют)
setupBotCron(container.get('cron'), handlers.currencyUtils);

// 3. Роутинг команд, сообщений, callback-ов
registerBotRoutes(bot, handlers);

// 4. Запуск бота
launchBot(bot); 