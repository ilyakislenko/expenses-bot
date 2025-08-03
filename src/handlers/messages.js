const { errorMessages,SETTINGS_KEYBOARD } = require('../utils/constants');

class MessageHandlers {
  constructor({ expenseService, userService, premiumService, localizationService, formatter, commandHandlers, stateService, validator }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.commandHandlers = commandHandlers;
    this.stateService = stateService;
    this.validator = validator;
  }

  async handleExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      // Получаем язык пользователя для локализации
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Обработка нажатия на reply-кнопки (локализованные)
      const menuText = this.localizationService.getText(userLanguage, 'button_menu');
      const expensesDayText = this.localizationService.getText(userLanguage, 'button_expenses_day');
      const expensesMonthText = this.localizationService.getText(userLanguage, 'button_expenses_month');
      const expensesCategoriesText = this.localizationService.getText(userLanguage, 'button_expenses_categories');
      const deleteLastText = this.localizationService.getText(userLanguage, 'button_delete_last');
      const settingsText = this.localizationService.getText(userLanguage, 'button_settings');
      const helpText = this.localizationService.getText(userLanguage, 'button_help');
      if (text === menuText) {
        await this.commandHandlers.mainMenu(ctx);
        return;
      }
      if (text === expensesDayText) {
        await this.commandHandlers.dailyHistory(ctx);
        return;
      }
      if (text === expensesMonthText) {
        await this.commandHandlers.stats(ctx);
        return;
      }
      if (text === expensesCategoriesText) {
        await this.commandHandlers.categories(ctx);
        return;
      }
      if (text === deleteLastText) {
        await this.commandHandlers.undo(ctx);
        return;
      }
      if (text === settingsText) {
        await this.commandHandlers.settings(ctx);
        return;
      }
      if (text === helpText) {
        await this.commandHandlers.help(ctx);
        return;
      }
      
      if (this.stateService.hasUserEditState(ctx.from.id)) {
        if (ctx.message.text.trim() === '/cancel') {
          this.stateService.deleteUserEditState(ctx.from.id);
          const editCanceledText = this.localizationService.getText(userLanguage, 'edit_canceled');
          return ctx.reply(editCanceledText);
        }
        const expenseId = this.stateService.getUserEditState(ctx.from.id);
        const parsed = this.validator.parseEditExpense(ctx.message.text);
        if (!parsed.isValid) {
          if (parsed.error === 'empty') {
            const editEmptyText = this.localizationService.getText(userLanguage, 'edit_empty');
            return ctx.reply(editEmptyText);
          }
          if (parsed.error === 'amount') {
            const editAmountErrorText = this.localizationService.getText(userLanguage, 'edit_amount_error');
            return ctx.reply(editAmountErrorText);
          }
          if (parsed.error === 'too_long') {
            const editTooLongText = this.localizationService.getText(userLanguage, 'edit_too_long', { max: limits.MAX_DESCRIPTION_LENGTH });
            return ctx.reply(editTooLongText);
          }
          const editFormatErrorText = this.localizationService.getText(userLanguage, 'edit_format_error');
          return ctx.reply(editFormatErrorText);
        }
        const oldExpense = await this.expenseService.getExpenseById(ctx.from.id, expenseId);
        if (!oldExpense) {
          this.stateService.deleteUserEditState(ctx.from.id);
          const expenseNotFoundText = this.localizationService.getText(userLanguage, 'expense_not_found');
          return ctx.reply(expenseNotFoundText);
        }
        const newAmount = parsed.amount !== undefined ? parsed.amount : oldExpense.amount;
        const newDescription = parsed.description !== undefined ? parsed.description : oldExpense.description;
        const updated = await this.expenseService.updateExpenseById(ctx.from.id, expenseId, { amount: newAmount, description: newDescription });
        this.stateService.deleteUserEditState(ctx.from.id);

        if (updated) {
          const expenseUpdatedText = this.localizationService.getText(userLanguage, 'expense_updated', { 
            amount: this.formatter.formatAmount(newAmount, oldExpense.currency), 
            description: newDescription || this.localizationService.getText(userLanguage, 'not_found') 
          });
          return ctx.reply(expenseUpdatedText);
        } else {
          const expenseUpdateErrorText = this.localizationService.getText(userLanguage, 'expense_update_error');
          return ctx.reply(expenseUpdateErrorText);
        }
      }
      // Получаем лимиты пользователя для валидации
      const limits = await this.premiumService.getUserLimits(userId);
      const parsed = this.validator.parseExpense(text, limits.MAX_DESCRIPTION_LENGTH);
      
      if (!parsed.isValid) {
        let errorMsg;
        if (parsed.error === 'too_long') {
          const isPremium = await this.premiumService.isPremiumUser(userId);
          errorMsg = isPremium ? 
            this.localizationService.getText(userLanguage, 'error_too_long_premium') : 
            this.localizationService.getText(userLanguage, 'error_too_long_regular');
        } else {
          errorMsg = this.localizationService.getText(userLanguage, `error_${parsed.error}`) || 
            this.localizationService.getText(userLanguage, 'error_format');
        }
        return await ctx.reply(errorMsg, { parse_mode: 'Markdown' });
      }
      // Проверяем лимит количества записей
      const expenseCountValidation = await this.premiumService.validateExpenseCount(userId);
      if (!expenseCountValidation.isValid) {
        const limitReachedText = this.localizationService.getText(userLanguage, 'error_limit_reached');
        return await ctx.reply(limitReachedText, { parse_mode: 'Markdown' });
      }

      const categories = await this.expenseService.getCategories(userId);
      if (categories.length === 0) {
        const expense = await this.expenseService.addExpense(
          userId, 
          parsed.amount, 
          parsed.description
        );
        const amount = this.formatter.formatAmount(expense.amount);
        const description = expense.description || this.localizationService.getText(userLanguage, 'not_found');
        const expenseAddedText = this.localizationService.getText(userLanguage, 'expense_added', { amount, description });
        await ctx.reply(expenseAddedText);
        return;
      }
      this.stateService.setPendingExpense(userId, { amount: parsed.amount, description: parsed.description });
      const keyboard = [];
      const row = [];
      categories.forEach((category, index) => {
        // Локализуем название категории
        const localizedCategoryName = this.formatter.translateCategoryName(category.name, this.localizationService, userLanguage);
        const button = {
          text: `${category.icon} ${localizedCategoryName}`,
          callback_data: `category|${category.name}`
        };
        row.push(button);
        if (row.length === 2 || index === categories.length - 1) {
          keyboard.push([...row]);
          row.length = 0;
        }
      });
      const cancelText = this.localizationService.getText(userLanguage, 'button_cancel');
      keyboard.push([{
        text: cancelText,
        callback_data: 'cancel'
      }]);
      const userCurrency = await this.userService.getUserCurrency(userId);

      const amount = this.formatter.formatAmount(parsed.amount, userCurrency);
      const description = parsed.description || this.localizationService.getText(userLanguage, 'not_found');
      const selectCategoryText = this.localizationService.getText(userLanguage, 'select_category');
      const amountLabelText = this.localizationService.getText(userLanguage, 'amount_label');
      const descriptionLabelText = this.localizationService.getText(userLanguage, 'description_label');

      await ctx.reply(
        `💰 *${selectCategoryText}*\n\n` +
        `${amountLabelText}: *${amount}*\n` +
        `${descriptionLabelText}: ${description}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        }
      );
    } catch (error) {
      console.error('Error handling expense:', error);
      const errorText = this.localizationService.getText(userLanguage, 'expense_save_error');
      await ctx.reply(errorText);
    }
  }
}

module.exports = MessageHandlers;