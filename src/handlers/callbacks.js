const Formatter = require('../utils/formatter');

// Временное хранилище для данных о расходах пользователей
const pendingExpenses = new Map();

class CallbackHandlers {
  constructor({ expenseService, formatter }) {
    this.expenseService = expenseService;
    this.formatter = formatter;
  }

  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, categoryName] = callbackData.split('|');
      const pending = pendingExpenses.get(userId);
      if (!pending) {
        return await ctx.answerCbQuery('❌ Ошибка: данные не найдены');
      }
      const { amount, description } = pending;
      // Получаем название категории из кнопки
      const button = ctx.callbackQuery.message.reply_markup.inline_keyboard
        .flat()
        .find(btn => btn.callback_data === callbackData);
      if (!button) {
        return await ctx.answerCbQuery('❌ Ошибка: кнопка не найдена');
      }
      // Добавляем расход через сервис
      const expense = await this.expenseService.addExpense(
        userId,
        parseFloat(amount),
        description,
        categoryName
      );
      const formattedAmount = this.formatter.formatAmount(expense.amount, expense.currency);
      const formattedDescription = expense.description || 'Без описания';
      await ctx.answerCbQuery(`✅ Добавлено в категорию "${categoryName}"`);
      await ctx.editMessageText(
        `✅ *Расход добавлен!*\n\n` +
        `💰 Сумма: *${formattedAmount}*\n` +
        `📝 Описание: ${formattedDescription}\n` +
        `🏷️ Категория: ${categoryName}`,
        { parse_mode: 'Markdown', reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
          ]
        } }
      );
    } catch (error) {
      console.error('Error handling category selection:', error);
      await ctx.answerCbQuery('❌ Произошла ошибка при сохранении');
    } finally {
      pendingExpenses.delete(userId);
    }
  }

  async handleCancel(ctx) {
    try {
      await ctx.answerCbQuery('❌ Отменено');
      await ctx.editMessageText('❌ Добавление расхода отменено');
    } catch (error) {
      console.error('Error handling cancel:', error);
    }
  }
}

module.exports = CallbackHandlers;
module.exports.pendingExpenses = pendingExpenses; 