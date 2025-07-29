const { errorMessages } = require('../utils/constants');

class MessageHandlers {
  constructor({ expenseService, userService, formatter, commandHandlers, stateService, validator }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.formatter = formatter;
    this.commandHandlers = commandHandlers;
    this.stateService = stateService;
    this.validator = validator;
  }

  async handleExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      // Обработка нажатия на reply-кнопку '📋 Меню'
      if (text === '📋 Меню') {
        await this.commandHandlers.help(ctx);
        return;
      }
      if (text === '💰 Траты за день') {
        await this.commandHandlers.dailyHistory(ctx);
        return;
      }
      if (text === '💰 Траты за месяц') {
        await this.commandHandlers.stats(ctx);
        return;
      }
      if (text === '💰 Траты по категориям') {
        await this.commandHandlers.categories(ctx);
        return;
      }
      if (text === '🗑️ Удалить последнюю запись') {
        await this.commandHandlers.undo(ctx);
        return;
      }
      if (ctx.message.text === '⚙️ Настройки') {
        return ctx.reply('Настройки:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Сменить валюту', callback_data: 'change_currency' }],
              [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
            ]
          }
        });
      }
      if (this.stateService.hasUserEditState(ctx.from.id)) {
        if (ctx.message.text.trim() === '/cancel') {
          this.stateService.deleteUserEditState(ctx.from.id);
          return ctx.reply('Редактирование отменено.');
        }
        const expenseId = this.stateService.getUserEditState(ctx.from.id);
        const parsed = this.validator.parseEditExpense(ctx.message.text);
        if (!parsed.isValid) {
          if (parsed.error === 'empty') {
            return ctx.reply('Введите новую сумму, описание или оба значения.');
          }
          if (parsed.error === 'amount') {
            return ctx.reply('Некорректная сумма.');
          }
          if (parsed.error === 'too_long') {
            return ctx.reply('Описание слишком длинное (максимум 60 символов).');
          }
          return ctx.reply('Ошибка формата.');
        }
        const oldExpense = await this.expenseService.getExpenseById(ctx.from.id, expenseId);
        if (!oldExpense) {
          userEditState.delete(ctx.from.id);
          return ctx.reply('Ошибка: запись не найдена.');
        }
        const newAmount = parsed.amount !== undefined ? parsed.amount : oldExpense.amount;
        const newDescription = parsed.description !== undefined ? parsed.description : oldExpense.description;
        const updated = await this.expenseService.updateExpenseById(ctx.from.id, expenseId, { amount: newAmount, description: newDescription });
        this.stateService.deleteUserEditState(ctx.from.id);
        if (updated) {
          return ctx.reply('Запись успешно обновлена!');
        } else {
          return ctx.reply('Ошибка: запись не найдена или не обновлена.');
        }
      }
      const parsed = this.validator.parseExpense(text);
      if (!parsed.isValid) {
        const errorMsg = errorMessages[parsed.error] || errorMessages.format;
        return await ctx.reply(errorMsg, { parse_mode: 'Markdown' });
      }
      const categories = await this.expenseService.getCategories(userId);
      if (categories.length === 0) {
        const expense = await this.expenseService.addExpense(
          userId, 
          parsed.amount, 
          parsed.description
        );
        const amount = this.formatter.formatAmount(expense.amount);
        const description = expense.description || 'Без описания';
        await ctx.reply(`✅ Записал: ${amount} - ${description}`);
        return;
      }
      this.stateService.setPendingExpense(userId, { amount: parsed.amount, description: parsed.description });
      const keyboard = [];
      const row = [];
      categories.forEach((category, index) => {
        const button = {
          text: `${category.icon} ${category.name}`,
          callback_data: `category|${category.name}`
        };
        row.push(button);
        if (row.length === 2 || index === categories.length - 1) {
          keyboard.push([...row]);
          row.length = 0;
        }
      });
      keyboard.push([{
        text: '❌ Отменить',
        callback_data: 'cancel'
      }]);
      const userCurrency = await this.userService.getUserCurrency(userId);
      const amount = this.formatter.formatAmount(parsed.amount, userCurrency);
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