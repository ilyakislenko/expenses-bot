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
/total - общая сумма за месяц
/history - последние записи за день
/stats - статистика по категориям
/export - выгрузка данных в CSV
/undo - удалить последнюю запись
/categories - список категорий
/help - показать справку

Начни вводить свои расходы! 💰`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  static async help(ctx) {
    const message = `📋 *Справка по командам*

*Добавление расходов:*
Напиши сумму и описание:
\`200 продукты\` - появится меню с кнопками категорий

*Команды:*
/start - перезапустить бота
/total - сумма за текущий месяц
/history - последние записи за день
/stats - подробная статистика
/export - скачать данные (CSV)
/undo - отменить последнюю запись
/categories - список категорий
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
      const total = await db.getTotalExpenses(userId, 'month');
      
      const message = `💰 *Расходы за текущий месяц*\n\n` +
        `Потрачено: *${Formatter.formatAmount(total.total)}*\n` +
        `Записей: ${total.count}`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in total command:', error);
      await ctx.reply('Произошла ошибка при получении данных 😞');
    }
  }

  static async dailyHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const expenses = await db.getDailyExpenses(userId);
      
      const message = `📋 *Траты за день*\n\n${Formatter.
        formatExpenseList(expenses)}\n\n*Покупок за день: ${expenses.length}* \n\n*Общая сумма: ${Formatter.
            formatAmount(expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0))}* `;
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in history command:', error);
      await ctx.reply('Произошла ошибка при получении истории 😞');
    }
  }

  static async stats(ctx) {
    try {
      const userId = ctx.from.id;
      const total = await db.getTotalExpenses(userId, 'month');
      const categoryStats = await db.getExpensesByCategory(userId, 'month');
      
      const message = Formatter.formatStats(total, categoryStats);
      
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

      const csv = Formatter.formatCSV(expenses);
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
      const message = Formatter.formatCategories(categories);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in categories command:', error);
      await ctx.reply('Произошла ошибка при получении категорий 😞');
    }
  }
}

module.exports = CommandHandlers;
