const db = require('../database');
const Validator = require('../utils/validator');
const Formatter = require('../utils/formatter');
const pendingExpenses = require('./callbacks').pendingExpenses;
const { errorMessages } = require('../utils/constants');

class MessageHandlers {
  static async handleExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      // Обработка нажатия на reply-кнопку '📋 Меню'
      if (text === '📋 Меню') {
        const CommandHandlers = require('./commands');
        await CommandHandlers.help(ctx);
        return;
      }

      const parsed = Validator.parseExpense(text);
      
      if (!parsed.isValid) {
        const errorMsg = errorMessages[parsed.error] || errorMessages.format;
        return await ctx.reply(errorMsg, { parse_mode: 'Markdown' });
      }

      // Получаем категории пользователя
      const categories = await db.getCategories(userId);
      
      if (categories.length === 0) {
        // Если категорий нет, сохраняем как раньше
        const expense = await db.addExpense(
          userId, 
          parsed.amount, 
          parsed.description
        );

        const amount = Formatter.formatAmount(expense.amount);
        const description = expense.description || 'Без описания';
        
        await ctx.reply(`✅ Записал: ${amount} - ${description}`);
        return;
      }

      // Сохраняем сумму и описание во временное хранилище
      pendingExpenses.set(userId, { amount: parsed.amount, description: parsed.description });

      // Создаем кнопки категорий
      const keyboard = [];
      const row = [];
      
      categories.forEach((category, index) => {
        const button = {
          text: `${category.icon} ${category.name}`,
          callback_data: `category|${category.name}`
        };
        
        row.push(button);
        
        // Размещаем по 2 кнопки в ряду
        if (row.length === 2 || index === categories.length - 1) {
          keyboard.push([...row]);
          row.length = 0;
        }
      });

      // Добавляем кнопку отмены
      keyboard.push([{
        text: '❌ Отменить',
        callback_data: 'cancel'
      }]);

      // Получаем валюту пользователя
      const userCurrency = await db.getUserCurrency(userId);
      const amount = Formatter.formatAmount(parsed.amount, userCurrency);
      const description = parsed.description || 'Без описания';
      
      await ctx.reply(
        `💰 *Выберите категорию для расхода:*\n\n` +
        `Сумма: *${amount}*\n` +
        `Описание: ${description}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        }
      );
    } catch (error) {
      console.error('Error handling expense:', error);
      await ctx.reply('Произошла ошибка при сохранении расхода 😞');
    }
  }
}

module.exports = MessageHandlers;