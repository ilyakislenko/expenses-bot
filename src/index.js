require('dotenv').config();
const { Telegraf } = require('telegraf');
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');

// Валидация переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware для логирования
bot.use((ctx, next) => {
  const user = ctx.from;
  const text = ctx.message?.text || ctx.callbackQuery?.data || 'non-text';
  console.log(`[${new Date().toISOString()}] User ${user.id} (@${user.username}): ${text}`);
  return next();
});

// Обработчики команд
bot.start(CommandHandlers.start);
bot.help(CommandHandlers.help);
bot.command('total', CommandHandlers.total);
bot.command('history', CommandHandlers.dailyHistory);
bot.command('stats', CommandHandlers.stats);
bot.command('export', CommandHandlers.exportData);
bot.command('undo', CommandHandlers.undo);
bot.command('categories', CommandHandlers.categories);

// Обработчик текстовых сообщений (расходы)
bot.on('text', MessageHandlers.handleExpense);

// Обработчики callback-запросов
bot.action(/^category\|/, CallbackHandlers.handleCategorySelection);
bot.action('cancel', CallbackHandlers.handleCancel);

// Обработка ошибок
bot.catch((error, ctx) => {
  console.error('Bot error:', error);
  ctx.reply('Произошла неожиданная ошибка. Попробуйте позже.');
});

// Запуск бота
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  // Webhook режим для продакшена
  bot.launch({
    webhook: {
      domain: process.env.WEBHOOK_URL,
      port: PORT
    }
  });
} else {
  // Polling режим для разработки
  bot.launch();
}

console.log('Bot started successfully! 🚀');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
