const db = require('../database');
const Formatter = require('../utils/formatter');
const { MAIN_MENU_KEYBOARD, CURRENCY_KEYBOARD, SETTINGS_KEYBOARD } = require('../utils/constants');
const ExpenseService = require('../services/ExpenseService');
const UserService = require('../services/UserService');

class CommandHandlers {
  constructor({ expenseService, userService, formatter }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.formatter = formatter;
  }

  async start(ctx) {
    const user = ctx.from;
    await this.userService.registerUser(user.id, user.username, user.first_name);

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
        keyboard: MAIN_MENU_KEYBOARD,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }

  async help(ctx) {
    const message = `📋 *Справка по командам*

*Добавление расходов:*
Напиши сумму и описание:
\`200 продукты\` - появится меню с кнопками категорий

*Команды:*
/start - перезапустить бота
/history - последние записи за день
/stats - подробная статистика
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

  async total(ctx) {
    try {
      const userId = ctx.from.id;
      const { total, userCurrency } = await this.expenseService.getMonthlyStats(userId);
      let message;
      if (Array.isArray(total.byCurrency) && total.byCurrency.length > 1) {
        // Используем formatStats для вывода по всем валютам
        message = await this.formatter.formatStats(total, [], userCurrency, 'месяц');
      } else {
        message = `💰 *Расходы за текущий месяц*\n\n` +
          `Потрачено: *${this.formatter.formatAmount(total.total, total.currency || 'RUB')}*\n` +
          `Записей: ${total.count}`;
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in total command:', error);
      await ctx.reply('Произошла ошибка при получении данных 😞');
    }
  }

  async dailyHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const { total, expenses, userCurrency } = await this.expenseService.getDailyStats(userId);
      let message = await this.formatter.formatStats(total, [], userCurrency, 'день') + '\n' + this.formatter.formatExpenseList(expenses);
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: {
        inline_keyboard: [
          [{ text: 'Редактировать', callback_data: 'edit_history' }, { text: '⬅️ Назад', callback_data: 'back_to_menu' }]
        ]
      } });
    } catch (error) {
      console.error('Error in history command:', error);
      await ctx.reply('Произошла ошибка при получении истории 😞');
    }
  }

  async stats(ctx) {
    try {
      const userId = ctx.from.id;
      const { total, categoryStats, userCurrency } = await this.expenseService.getMonthlyStats(userId);
      
      const message = await this.formatter.formatStats(total, categoryStats, userCurrency);
      
      await ctx.reply(message, { parse_mode: 'Markdown' , reply_markup: {
        inline_keyboard: [
          [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
        ]
      } });
    } catch (error) {
      console.error('Error in stats command:', error);
      await ctx.reply('Произошла ошибка при получении статистики 😞');
    }
  }

  async exportData(ctx) {
    try {
      const userId = ctx.from.id;
      const { expenses, userCurrency } = await this.expenseService.exportExpenses(userId);
      if (expenses.length === 0) {
        return await ctx.reply('Пока нет данных для экспорта 📝');
      }
      const csv = await this.formatter.formatCSV(expenses, userCurrency);
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

  async undo(ctx) {
    try {
      const userId = ctx.from.id;
      const deleted = await this.expenseService.deleteLastExpense(userId);
      
      if (deleted) {
        const amount = this.formatter.formatAmount(deleted.amount);
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

  async categories(ctx) {
    try {
      const userId = ctx.from.id;
      const categories = await this.expenseService.getCategories(userId);

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

  async currency(ctx) {
    const message = 'Выберите валюту, которая будет использоваться по умолчанию:';
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: CURRENCY_KEYBOARD
      }
    });
  }

  async settings(ctx) {
    await ctx.reply('Настройки:', {
      reply_markup: {
        inline_keyboard: SETTINGS_KEYBOARD
      }
    });
  }
}

module.exports = CommandHandlers;
