const db = require('../database');
const Formatter = require('../utils/formatter');

class CommandHandlers {
  static async start(ctx) {
    const user = ctx.from;
    await db.createUser(user.id, user.username, user.first_name);

    const message = `Привет, ${user.first_name}! 👋

Я помогу тебе вести учёт расходов.

*Как добавить расход:*
Просто напиши сумму и описание через пробел:
-  \`200 продукты в магазине\`
-  \`1500 обед в ресторане\`
-  \`50 проезд\`

После ввода появится меню с кнопками категорий - выбери подходящую! 🏷️

*Команды:*
/start - перезапустить бота
/history - последние записи за день
/stats - подробная статистика
/export - скачать данные (CSV)
/undo - отменить последнюю запись
/categories - список категорий
/currency - установить базовую валюту
/settings - открыть настройки
/help - показать справку

Начни вводить свои расходы! 💰`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '📋 Меню' }],
          [{ text: '💰 Траты за месяц' }, { text: '💰 Траты за день' }],
          [{ text: '🗑️ Удалить последнюю запись' }],
          [{ text: '⚙️ Настройки' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }

  static async help(ctx) {
    const message = `📋 *Справка по командам*

*Добавление расходов:*
Напиши сумму и описание:
\`200 продукты\` - появится меню с кнопками категорий

*Команды:*
/start - перезапустить бота
/history - последние записи за день
/stats - подробная статистика
/total - расходы за месяц
/export - скачать данные (CSV)
/undo - отменить последнюю запись
/categories - список категорий
/currency - установить базовую валюту
/settings - открыть настройки
/help - эта справка

*Советы:*
-  Можно использовать запятую: \`150,50 кофе\`
-  После ввода выбери категорию из кнопок
-  Описание помогает помнить на что тратил
-  Используй /stats чтобы анализировать траты

Удачного учёта! 💰`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  static async total(ctx) {
    try {
      const userId = ctx.from.id;
      const userCurrency = await db.getUserCurrency(userId);
      const total = await db.getTotalExpenses(userId, 'month');
      let message;
      if (Array.isArray(total.byCurrency) && total.byCurrency.length > 1) {
        // Используем formatStats для вывода по всем валютам
        message = await Formatter.formatStats(total, [], userCurrency, 'месяц');
      } else {
        message = `💰 *Расходы за текущий месяц*\n\n` +
          `Потрачено: *${Formatter.formatAmount(total.total, total.currency || 'RUB')}*\n` +
          `Записей: ${total.count}`;
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in total command:', error);
      await ctx.reply('Произошла ошибка при получении данных 😞');
    }
  }

  static async dailyHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const userCurrency = await db.getUserCurrency(userId);
      const expenses = await db.getDailyExpenses(userId);
      const total = await db.getTotalExpenses(userId, 'day');
      let message;
      message = await Formatter.formatStats(total, [], userCurrency, 'день') + '\n' + Formatter.formatExpenseList(expenses);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in history command:', error);
      await ctx.reply('Произошла ошибка при получении истории 😞');
    }
  }

  static async stats(ctx) {
    try {
      const userId = ctx.from.id;
      const userCurrency = await db.getUserCurrency(userId);
      const total = await db.getTotalExpenses(userId, 'month');
      const categoryStats = await db.getExpensesByCategory(userId, 'month');
      
      const message = await Formatter.formatStats(total, categoryStats, userCurrency);
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in stats command:', error);
      await ctx.reply('Произошла ошибка при получении статистики 😞');
    }
  }

  static async exportData(ctx) {
    try {
      const userId = ctx.from.id;
      const expenses = await db.exportExpenses(userId);
      if (expenses.length === 0) {
        return await ctx.reply('Пока нет данных для экспорта 📝');
      }
      const userCurrency = await db.getUserCurrency(userId);
      const csv = await Formatter.formatCSV(expenses, userCurrency);
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      await ctx.replyWithDocument({
        source: Buffer.from(csv, 'utf-8'),
        filename
      }, {
        caption: `📊 Экспорт расходов\nВсего записей: ${expenses.length}`
      });
    } catch (error) {
      console.error('Error in export command:', error);
      await ctx.reply('Произошла ошибка при экспорте данных 😞');
    }
  }

  static async undo(ctx) {
    try {
      const userId = ctx.from.id;
      const deleted = await db.deleteLastExpense(userId);
      
      if (deleted) {
        const amount = Formatter.formatAmount(deleted.amount);
        const description = deleted.description || 'Без описания';
        await ctx.reply(`✅ Удалена запись: ${amount} - ${description}`);
      } else {
        await ctx.reply('Нет записей для удаления 🤷‍♂️');
      }
    } catch (error) {
      console.error('Error in undo command:', error);
      await ctx.reply('Произошла ошибка при удалении записи 😞');
    }
  }

  static async categories(ctx) {
    try {
      const userId = ctx.from.id;
      const categories = await db.getCategories(userId);

      if (!categories.length) {
        return await ctx.reply('Категории не найдены.');
      }

      // Формируем inline-клавиатуру
      const keyboard = categories.map(cat => [
        { text: `${cat.icon} ${cat.name}`, callback_data: `show_category|${cat.id}` }
      ]);
      keyboard.push([{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]);

      await ctx.reply('Выберите категорию:', {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error in categories command:', error);
      await ctx.reply('Произошла ошибка при получении категорий 😞');
    }
  }

  static async currency(ctx) {
    const message = 'Выберите валюту, которая будет использоваться по умолчанию:';
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '₽ RUB', callback_data: 'set_currency|RUB' },
            { text: '$ USD', callback_data: 'set_currency|USD' },
            { text: '€ EUR', callback_data: 'set_currency|EUR' },
            { text: '₸ KZT', callback_data: 'set_currency|KZT' },
            { text: '¥ CNY', callback_data: 'set_currency|CNY' },
            { text: '฿ THB', callback_data: 'set_currency|THB' }
          ],
          [
            { text: '⬅️ Назад', callback_data: 'back_to_settings' }
          ]
        ]
      }
    });
  }

  static async settings(ctx) {
    await ctx.reply('Настройки:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Сменить валюту', callback_data: 'change_currency' }],
          [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
        ]
      }
    });
  }
}

module.exports = CommandHandlers;
