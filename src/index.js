require('dotenv').config();
const { Telegraf } = require('telegraf');
const db = require('./database');
const createCurrencyUtils = require('./utils/currency');
const currencyUtils = createCurrencyUtils(db);
const cron = require('node-cron');
const userEditState = require('./utils/userEditState');
const ExpenseService = require('./services/ExpenseService');
const UserService = require('./services/UserService');
const errorHandler = require('./middleware/errorHandler');

const commandHandlers = require('../commandHandlersInstance');
const messageHandlers = require('../messageHandlersInstance');
const callbackHandlers = require('../callbackHandlersInstance');

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
bot.command('start', errorHandler((ctx) => commandHandlers.start(ctx)));
bot.command('help', errorHandler((ctx) => commandHandlers.help(ctx)));
bot.command('total', errorHandler((ctx) => commandHandlers.total(ctx)));
bot.command('history', errorHandler((ctx) => commandHandlers.dailyHistory(ctx)));
bot.command('stats', errorHandler((ctx) => commandHandlers.stats(ctx)));
bot.command('export', errorHandler((ctx) => commandHandlers.exportData(ctx)));
bot.command('undo', errorHandler((ctx) => commandHandlers.undo(ctx)));
bot.command('categories', errorHandler((ctx) => commandHandlers.categories(ctx)));
bot.command('currency', errorHandler((ctx) => commandHandlers.currency(ctx)));
bot.command('settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
bot.command('menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx)));
bot.command('cancel', async (ctx) => {
  if (userEditState.has(ctx.from.id)) {
    userEditState.delete(ctx.from.id);
    await ctx.reply('Редактирование отменено.');
  } else {
    await ctx.reply('Нет активного редактирования.');
  }
});

// Обработчик текстовых сообщений (расходы)
bot.on('text', errorHandler((ctx) => messageHandlers.handleExpense(ctx)));

// Обработчики callback-запросов
bot.action(/^category\|/, (ctx) => callbackHandlers.handleCategorySelection(ctx));
bot.action('cancel', (ctx) => callbackHandlers.handleCancel(ctx));
bot.action('menu', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.mainMenu(ctx);
}));
bot.action('stats', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.stats(ctx);
}));
bot.action('history', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.dailyHistory(ctx);
}));
bot.action('categories', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.categories(ctx);
}));
bot.action('settings', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.settings(ctx);
}));
bot.action('undo', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.undo(ctx);
}));
bot.action('help', errorHandler(async (ctx) => {
  await ctx.answerCbQuery();
  await commandHandlers.help(ctx);
}));
bot.action(/^set_currency\|/, async (ctx) => {
  const userId = ctx.from.id;
  const currency = ctx.callbackQuery.data.split('|')[1];
  await UserService.setUserCurrency(userId, currency);
  await ctx.answerCbQuery(`Валюта установлена: ${currency}`);
  await ctx.editMessageText(`Валюта успешно изменена на ${currency}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
      ]
    }
  });
});
bot.action('change_currency', async (ctx) => {
  await commandHandlers.currency(ctx); // Показываем выбор валюты
});
bot.action('back_to_settings', async (ctx) => {
  await commandHandlers.settings(ctx);
});
bot.action('back_to_menu', errorHandler(async (ctx) => {
  await commandHandlers.mainMenu(ctx);
}));
bot.action(/^show_category\|(\d+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  const userId = ctx.from.id;
  const userCurrency = await UserService.getUserCurrency(userId);
  const expenses = await require('./database').getExpensesByCategoryId(userId, categoryId, 'month');
  if (!expenses.length) {
    return ctx.reply('Нет трат по этой категории за последний месяц.');
  }
  const formatter = require('../commandHandlersInstance').formatter;
  const convertedAmounts = await Promise.all(
    expenses.map(e => currencyUtils.convert(Number(e.amount), e.currency || 'RUB', userCurrency))
  );
  const total = {
    total: convertedAmounts.reduce((sum, v) => sum + v, 0),
    count: expenses.length,
    currency: userCurrency
  };
  let message = await formatter.formatStats(total, [], userCurrency, 'месяц') + '\n' + formatter.formatExpenseList(expenses);
  await ctx.reply(message, { parse_mode: 'Markdown',reply_markup: {
    inline_keyboard: [
      [
        { text: 'Редактировать', callback_data: `edit_category|${categoryId}` },
        { text: '⬅️ Назад', callback_data: 'back_to_categories' }
      ]
    ]
  } });
});
bot.action(/^delete_expense\|(\d+)$/, async (ctx) => {
  const expenseId = ctx.match[1];
  const userId = ctx.from.id;
  const deleted = await ExpenseService.deleteExpenseById(userId, expenseId);
  if (deleted) {
    await ctx.answerCbQuery('Запись удалена!');
    await ctx.editMessageText('Запись удалена!');
  } else {
    await ctx.answerCbQuery('Ошибка удаления или запись не найдена');
  }
});
bot.action(/^edit_expense\|(\d+)$/, async (ctx) => {
  const expenseId = ctx.match[1];
  userEditState.set(ctx.from.id, expenseId);
  await ctx.reply(
    'Введите новую сумму и/или описание для этой траты (например: 500 кофе).\n\nИли нажмите кнопку ниже для отмены.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '❌ Отмена', callback_data: 'cancel_edit' }]
        ]
      }
    }
  );
});

bot.action('cancel_edit', async (ctx) => {
  if (userEditState.has(ctx.from.id)) {
    userEditState.delete(ctx.from.id);
    await ctx.editMessageText('Редактирование отменено.');
  } else {
    await ctx.answerCbQuery('Нет активного редактирования.');
  }
});

bot.action('edit_history', async (ctx) => {
  const userId = ctx.from.id;
  const expenses = await ExpenseService.getDailyExpenses(userId);
  if (!expenses.length) {
    return ctx.reply('Нет трат за этот период.');
  }
  const formatter = require('../commandHandlersInstance').formatter;
  for (const expense of expenses) {
    const { text, reply_markup } = formatter.formatExpenseWithActions(expense);
    await ctx.reply(text, { reply_markup, parse_mode: 'Markdown' });
  }
  // Кнопка назад
  await ctx.reply('Выход из режима редактирования:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬅️ Назад', callback_data: 'back_to_history' }]
      ]
    }
  });
});
bot.action(/^edit_category\|(\d+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  const userId = ctx.from.id;
  const expenses = await ExpenseService.getExpensesByCategoryId(userId, categoryId, 'month');
  if (!expenses.length) {
    return ctx.reply('почему-то карточек нет...произошла ошибка');
  }
  const formatter = require('../commandHandlersInstance').formatter;
  for (const expense of expenses) {
    const { text, reply_markup } = formatter.formatExpenseWithActions(expense);
    await ctx.reply(text, { reply_markup, parse_mode: 'Markdown' });
  }

});
bot.action('back_to_history', async (ctx) => {
  await commandHandlers.dailyHistory(ctx);
});
bot.action('back_to_categories', async (ctx) => {
  await commandHandlers.categories(ctx);
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
