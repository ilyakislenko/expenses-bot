require('dotenv').config();
const { Telegraf } = require('telegraf');
const CommandHandlers = require('./handlers/commands');
const MessageHandlers = require('./handlers/messages');
const CallbackHandlers = require('./handlers/callbacks');
const currencyUtils = require('./utils/currency');
const cron = require('node-cron');

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
bot.command('currency', CommandHandlers.currency);
bot.command('settings', CommandHandlers.settings);

// Обработчик текстовых сообщений (расходы)
bot.on('text', MessageHandlers.handleExpense);

// Обработчики callback-запросов
bot.action(/^category\|/, CallbackHandlers.handleCategorySelection);
bot.action('cancel', CallbackHandlers.handleCancel);
bot.action('menu', async (ctx) => {
  await CommandHandlers.help(ctx);
});
bot.action(/^set_currency\|/, async (ctx) => {
  const userId = ctx.from.id;
  const currency = ctx.callbackQuery.data.split('|')[1];
  const db = require('./database');
  await db.setUserCurrency(userId, currency);
  await ctx.answerCbQuery(`Валюта установлена: ${currency}`);
  await ctx.editMessageText(`Валюта успешно изменена на ${currency}`);
});
bot.action('change_currency', async (ctx) => {
  await CommandHandlers.currency(ctx); // Показываем выбор валюты
});
bot.action('back_to_settings', async (ctx) => {
  await CommandHandlers.settings(ctx);
});
bot.action('back_to_menu', async (ctx) => {
  await CommandHandlers.help(ctx);
});

// Обработка ошибок
bot.catch((error, ctx) => {
  console.error('Bot error:', error);
  ctx.reply('Произошла неожиданная ошибка. Попробуйте позже.');
});

const PORT = process.env.PORT || 3000;
const SUPPORTED_CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'CNY', 'THB'];

(async () => {
  try {
    // Проверяем, нужно ли обновлять курсы
    if (await currencyUtils.needUpdateRates()) {
      await currencyUtils.updateRates(SUPPORTED_CURRENCIES);
      console.log('Курсы валют успешно обновлены!');
    }
  } catch (err) {
    console.error('Ошибка при обновлении курсов валют:', err);
  }

  // Запускаем автообновление курсов каждый день в 10:00 утра
  cron.schedule('0 10 * * *', () => {
    currencyUtils.updateRates(SUPPORTED_CURRENCIES)
      .then(() => console.log('Курсы валют обновлены по расписанию (cron)!'))
      .catch(err => console.error('Ошибка при автообновлении курсов валют (cron):', err));
  });

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
})();
