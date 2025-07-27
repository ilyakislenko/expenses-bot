const db = require('../database');
const Validator = require('../utils/validator');
const Formatter = require('../utils/formatter');

class MessageHandlers {
  static async handleExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      const parsed = Validator.parseExpense(text);
      
      if (!parsed.isValid) {
        return await ctx.reply(
          '❌ Не понял формат. Напиши сумму и описание:\n' +
          'Например: `200 продукты` или `1500 обед в кафе`',
          { parse_mode: 'Markdown' }
        );
      }

      const expense = await db.addExpense(
        userId, 
        parsed.amount, 
        parsed.description
      );

      const amount = Formatter.formatAmount(expense.amount);
      const description = expense.description || 'Без описания';
      
      await ctx.reply(`✅ Записал: ${amount} - ${description}`);
      
    } catch (error) {
      console.error('Error handling expense:', error);
      await ctx.reply('Произошла ошибка при сохранении расхода 😞');
    }
  }
}

module.exports = MessageHandlers;
