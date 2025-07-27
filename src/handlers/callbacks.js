const db = require('../database');
const Formatter = require('../utils/formatter');

// Временное хранилище для данных о расходах пользователей
const pendingExpenses = new Map();

class CallbackHandlers {
  static async handleCategorySelection(ctx) {
    try {
      const userId = ctx.from.id;
      const callbackData = ctx.callbackQuery.data;
      
      // Парсим данные из callback
      const [, amount, description, categoryName] = callbackData.split('|');
      
      if (!amount || !description) {
        return await ctx.answerCbQuery('❌ Ошибка: данные не найдены');
      }

      // Получаем название категории из кнопки
      const button = ctx.callbackQuery.message.reply_markup.inline_keyboard
        .flat()
        .find(btn => btn.callback_data === callbackData);

      if (!button) {
        return await ctx.answerCbQuery('❌ Ошибка: кнопка не найдена');
      }

      // Извлекаем название категории из текста кнопки (убираем иконку)
      console.log(categoryName, {ctx: button});
      // Добавляем расход в базу данных
      const expense = await db.addExpense(
        userId,
        parseFloat(amount),
        description,
        categoryName
      );

      const formattedAmount = Formatter.formatAmount(expense.amount, expense.currency);
      const formattedDescription = expense.description || 'Без описания';
      
      // Отвечаем на callback
      await ctx.answerCbQuery(`✅ Добавлено в категорию "${categoryName}"`);
      
      // Редактируем сообщение с кнопками
      await ctx.editMessageText(
        `✅ *Расход добавлен!*\n\n` +
        `💰 Сумма: *${formattedAmount}*\n` +
        `📝 Описание: ${formattedDescription}\n` +
        `🏷️ Категория: ${categoryName}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Error handling category selection:', error);
      await ctx.answerCbQuery('❌ Произошла ошибка при сохранении');
    }
  }

  static async handleCancel(ctx) {
    try {
      await ctx.answerCbQuery('❌ Отменено');
      await ctx.editMessageText('❌ Добавление расхода отменено');
    } catch (error) {
      console.error('Error handling cancel:', error);
    }
  }
}

module.exports = CallbackHandlers; 