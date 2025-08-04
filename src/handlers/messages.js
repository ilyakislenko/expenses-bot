const { errorMessages,SETTINGS_KEYBOARD } = require('../utils/constants');

class MessageHandlers {
  constructor({ expenseService, userService, premiumService, familyService, localizationService, formatter, commandHandlers, stateService, validator }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.familyService = familyService;
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
      const familyText = this.localizationService.getText(userLanguage, 'button_family');
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
      if (text === familyText) {
        await this.commandHandlers.family(ctx);
        return;
      }
      
      // Обработка семейных состояний
      if (this.stateService.hasUserState(userId)) {
        const userState = this.stateService.getUserState(userId);
        
        if (userState === 'creating_family') {
          return await this.handleCreateFamily(ctx, text, userLanguage);
        }
        
        if (userState === 'joining_family') {
          return await this.handleJoinFamily(ctx, text, userLanguage);
        }
        
        if (userState === 'adding_family_expense') {
          return await this.handleAddFamilyExpense(ctx, text, userLanguage);
        }
        
        if (userState === 'inviting_member') {
          return await this.handleInviteMember(ctx, text, userLanguage);
        }
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

  // ========================================
  // FAMILY STATE HANDLERS
  // ========================================

  async handleCreateFamily(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const familyName = text.trim();
      
      if (familyName.length < 3) {
        const errorText = this.localizationService.getText(userLanguage, 'family_name_too_short');
        return await ctx.reply(errorText);
      }
      
      if (familyName.length > 50) {
        const errorText = this.localizationService.getText(userLanguage, 'family_name_too_long');
        return await ctx.reply(errorText);
      }
      
      const family = await this.familyService.createFamily(userId, familyName);
      this.stateService.deleteUserState(userId);
      
      const message = this.localizationService.getText(userLanguage, 'family_created', { name: family.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error creating family:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async handleJoinFamily(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const invitationCode = text.trim().toUpperCase();
      
      const result = await this.familyService.acceptInvitation(userId, invitationCode);
      this.stateService.deleteUserState(userId);
      
      const message = this.localizationService.getText(userLanguage, 'invitation_accepted', { name: result.family.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error joining family:', error);
      let errorText;
      
      if (error.message.includes('not found')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_found');
      } else if (error.message.includes('expired')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_expired');
      } else {
        errorText = this.localizationService.getText(userLanguage, 'error');
      }
      
      await ctx.reply(errorText);
    }
  }

  async handleInviteMember(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const username = text.trim().replace('@', ''); // Убираем @ если пользователь его ввел
      
      if (username.length < 3) {
        const errorText = this.localizationService.getText(userLanguage, 'user_not_found');
        return await ctx.reply(errorText);
      }
      
      const result = await this.familyService.createInvitation(userId, username);
      this.stateService.deleteUserState(userId);
      
      const invitationSentText = this.localizationService.getText(userLanguage, 'invitation_sent', { username: result.invitee.username });
      const invitationCodeText = this.localizationService.getText(userLanguage, 'invitation_code', { code: result.invitation.invite_code });
      const message = `${invitationSentText}\n\n${invitationCodeText}`;
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error inviting member:', error);
      let errorText;
      
      if (error.message.includes('not found')) {
        errorText = this.localizationService.getText(userLanguage, 'user_not_found');
      } else if (error.message.includes('already a member of your family')) {
        errorText = this.localizationService.getText(userLanguage, 'user_already_in_your_family');
      } else if (error.message.includes('already a member of another family')) {
        errorText = this.localizationService.getText(userLanguage, 'user_already_in_other_family');
      } else if (error.message.includes('does not have premium status')) {
        errorText = this.localizationService.getText(userLanguage, 'user_not_premium');
      } else if (error.message.includes('already has a pending invitation')) {
        errorText = this.localizationService.getText(userLanguage, 'user_already_has_invitation');
      } else if (error.message.includes('only owner can invite')) {
        errorText = this.localizationService.getText(userLanguage, 'only_owner_can_invite');
      } else {
        errorText = this.localizationService.getText(userLanguage, 'error');
      }
      
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.reply(errorText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_menu' }]
          ]
        }
      });
    }
  }

  async handleAddFamilyExpense(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      
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
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        return await ctx.reply(notFamilyMemberText);
      }
      
      // Проверяем лимит количества записей
      const expenseCountValidation = await this.premiumService.validateExpenseCount(userId);
      if (!expenseCountValidation.isValid) {
        const limitReachedText = this.localizationService.getText(userLanguage, 'error_limit_reached');
        return await ctx.reply(limitReachedText, { parse_mode: 'Markdown' });
      }
      
      // Очищаем состояние
      this.stateService.deleteUserState(userId);
      
      // Получаем категории и показываем меню выбора
      const categories = await this.expenseService.getCategories(userId);
      
      if (categories.length === 0) {
        const expense = await this.expenseService.addExpense(
          userId, 
          parsed.amount, 
          parsed.description,
          'Другое',
          userFamily.id
        );
        const amount = this.formatter.formatAmount(expense.amount);
        const description = expense.description || this.localizationService.getText(userLanguage, 'not_found');
        const expenseAddedText = this.localizationService.getText(userLanguage, 'expense_added', { amount, description });
        await ctx.reply(expenseAddedText);
        return;
      }
      
      // Сохраняем информацию о трате с familyId
      this.stateService.setPendingExpense(userId, { 
        amount: parsed.amount, 
        description: parsed.description,
        familyId: userFamily.id 
      });
      
      // Показываем меню выбора категории
      const keyboard = [];
      const row = [];
      categories.forEach((category, index) => {
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
      console.error('Error handling family expense:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }
}

module.exports = MessageHandlers;