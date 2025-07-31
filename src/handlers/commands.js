const { MAIN_MENU_KEYBOARD, CURRENCY_KEYBOARD, SETTINGS_KEYBOARD } = require('../utils/constants');

class CommandHandlers {
  constructor({ expenseService, userService, premiumService, formatter }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
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
/menu - открыть интерактивное меню(Рекомендуется)
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
/menu - открыть интерактивное меню(Рекомендуется)
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
      const userTimezone = await this.userService.getUserTimezone(userId);
      let message = await this.formatter.formatStats(total, [], userCurrency, 'день') + '\n' + this.formatter.formatExpenseList(expenses, userTimezone);
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
      const { expenses, userCurrency, userTimezone } = await this.expenseService.exportExpenses(userId);
      if (expenses.length === 0) {
        return await ctx.reply('Пока нет данных для экспорта 📝');
      }
      const csv = await this.formatter.formatCSV(expenses, userCurrency, userTimezone);
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
        const amount = this.formatter.formatAmount(deleted.amount, deleted.currency);
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

  async timezone(ctx) {
    const { generateTimeKeyboard } = require('../utils/constants');
    const currentUtcTime = new Date();
    const utcTimeString = currentUtcTime.toUTCString();
    
    const message = `🕐 *Настройка часового пояса*\n\nСколько у вас сейчас времени?\n\n*Текущее время по UTC:* ${utcTimeString}\n\nВыберите ваше текущее время:`;
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: generateTimeKeyboard()
      }
    });
  }

  async limits(ctx) {
    try {
      const userId = ctx.from.id;
      const usageStats = await this.premiumService.getUsageStats(userId);
      
      const status = usageStats.isPremium ? '💎 Премиум' : '👤 Обычный';
      let message = `📊 *Информация о лимитах*\n\n` +
        `*Статус:* ${status}\n` +
        `*Записей:* ${usageStats.currentCount}/${usageStats.maxCount} (${usageStats.usagePercentage}%)\n` +
        `*Осталось:* ${usageStats.remaining} записей\n` +
        `*Макс. длина описания:* ${usageStats.maxDescriptionLength} символов\n\n`;
      
      if (usageStats.isNearLimit && !usageStats.isAtLimit) {
        message += `⚠️ *Внимание:* Вы близки к лимиту записей!\n`;
      }
      
      if (usageStats.isAtLimit) {
        message += `❌ *Достигнут лимит записей!*\n`;
      }
      
      if (!usageStats.isPremium) {
        message += `\n💎 *Преимущества премиума:*\n` +
          `• 160 символов в описании (вместо 80)\n` +
          `• 300 записей (вместо 100)\n` +
          `• Кастомные категории\n` +
          `• Расширенная статистика`;
      }
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in limits command:', error);
      await ctx.reply('Произошла ошибка при получении информации о лимитах 😞');
    }
  }

  async mainMenu(ctx) {
    const message = `🏠 *Главное меню*\n\nВыберите действие:`;
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Меню', callback_data: 'menu' }],
          [{ text: '💰 Траты за месяц', callback_data: 'stats' }, { text: '💰 Траты за день', callback_data: 'history' }],
          [{ text: '💰 Траты по категориям', callback_data: 'categories' }],
          [{ text: '⚙️ Настройки', callback_data: 'settings' }],
          [{ text: '🗑️ Удалить последнюю запись', callback_data: 'undo' }],
          [{ text: '📊 Лимиты', callback_data: 'limits' }],
          [{ text: '❓ Справка', callback_data: 'help' }]
        ]
      }
    });
  }
}

module.exports = CommandHandlers;
