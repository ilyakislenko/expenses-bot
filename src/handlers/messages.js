const { errorMessages,SETTINGS_KEYBOARD } = require('../utils/constants');

class MessageHandlers {
  constructor({ expenseService, userService, premiumService, familyService, categoryService, localizationService, formatter, commandHandlers, stateService, validator, paymentService, donationRepository, bugReportRepository }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.familyService = familyService;
    this.categoryService = categoryService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.commandHandlers = commandHandlers;
    this.stateService = stateService;
    this.validator = validator;
    this.paymentService = paymentService;
    this.donationRepository = donationRepository;
    this.bugReportRepository = bugReportRepository;
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
      
      // Обработка премиум подписки
      const premiumSubscriptionText = this.localizationService.getText(userLanguage, 'premium_subscription_title');
      if (text === premiumSubscriptionText) {
        await this.commandHandlers.premiumSubscription(ctx);
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

        if (userState === 'setting_period_start') {
          return await this.handleSetPeriodStart(ctx, text, userLanguage);
        }

        if (userState === 'entering_donation') {
          return await this.handleDonationInput(ctx, text, userLanguage);
        }

        if (userState === 'bug_report') {
          return await this.handleBugReportInput(ctx, text, userLanguage);
        }

        if (userState === 'adding_custom_category') {
          return await this.handleAddCustomCategory(ctx, text, userLanguage);
        }

        if (userState.startsWith && userState.startsWith('renaming_custom_category:')) {
          const categoryId = userState.split(':')[1];
          return await this.handleRenameCustomCategory(ctx, text, userLanguage, categoryId);
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
          // Кодируем id, чтобы корректно обрабатывать любые названия (включая emoji)
          callback_data: `category|${category.id}`
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

  async handleDonationInput(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const raw = (text || '').trim();
      // Поддерживаем два формата: "<число>" ИЛИ "<число> <письмо>" ИЛИ "<число>\n<письмо>"
      const match = raw.match(/^\s*(\d{1,4})\s*(?:[\n\r]+(.+)|\s+(.+))?$/s);
      const stars = match ? parseInt(match[1], 10) : NaN;
      let message = '';
      if (match) {
        message = (match[2] || match[3] || '').trim();
      }
      if (!Number.isInteger(stars) || stars < 1 || stars > 2500 || message.length > 500) {
        const invalid = this.localizationService.getText(userLanguage, 'donate_invalid');
        return await ctx.reply(invalid);
      }
      // отменяем все предыдущие pending донаты пользователя
      await this.donationRepository.cancelUserPendingDonations(userId);
      
      // создаём новый pending донат
      const donation = await this.donationRepository.createPendingDonation(userId, stars, message || null);
      this.stateService.deleteUserState(userId);

      const ok = this.localizationService.getText(userLanguage, 'donate_created', { stars });
      await ctx.reply(ok);

      // создаём ссылку оплаты через инжектированный PaymentService
      if (this.paymentService && this.paymentService.createDonationInvoiceLink) {
        const link = await this.paymentService.createDonationInvoiceLink(userId, stars, userLanguage, donation.id);
        await ctx.reply(link);
      }
    } catch (error) {
      console.error('Error handling donation input:', error);
      const err = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(err);
    }
  }

  async handleSetPeriodStart(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const raw = (text || '').trim();
      const num = Number(raw);
      if (!Number.isInteger(num) || num < 1 || num > 31) {
        const invalid = this.localizationService.getText(userLanguage, 'period_start_invalid');
        return await ctx.reply(invalid);
      }
      await this.userService.setUserPeriodStartDay(userId, num);
      this.stateService.deleteUserState(userId);
      const ok = this.localizationService.getText(userLanguage, 'period_start_set', { day: num });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.reply(ok, {
        reply_markup: {
          inline_keyboard: [[{ text: backText, callback_data: 'back_to_settings' }]]
        }
      });
    } catch (error) {
      console.error('Error setting period start day:', error);
      const errText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errText);
    }
  }

  async handleAddCustomCategory(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const raw = (text || '').trim();
      // Пытаемся извлечь эмодзи для иконки (первый найденный символ-пиктограмма)
      let icon = '📦';
      let name = raw;
      try {
        const emojiMatch = raw.match(/\p{Extended_Pictographic}/u);
        if (emojiMatch && emojiMatch[0]) {
          icon = emojiMatch[0];
          name = raw.replace(emojiMatch[0], '').trim();
        }
      } catch (_) {
        // В средах без поддержки Unicode property escapes просто игнорируем
      }

      if (name.length < 1 || name.length > 30) {
        const enterName = this.localizationService.getText(userLanguage, 'custom_categories_enter_name');
        return await ctx.reply(enterName);
      }

      // Требуется премиум: сервис проверит и бросит ошибку при отсутствии
      const created = await this.categoryService.createUserCategory(userId, name, icon);

      this.stateService.deleteUserState(userId);
      const okText = this.localizationService.getText(userLanguage, 'custom_categories_created', { name: created.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.reply(okText, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories' }]] } });
    } catch (error) {
      let msgKey = 'error';
      if (error.code === 'ALREADY_EXISTS') msgKey = 'custom_categories_exists';
      if (error.code === 'LIMIT_REACHED') msgKey = 'custom_categories_limit_reached';
      if (error.code === 'PREMIUM_REQUIRED') msgKey = 'custom_categories_premium_required';
      const userId = ctx.from.id;
      const userLanguage2 = await this.userService.getUserLanguage(userId);
      const message = this.localizationService.getText(userLanguage2, msgKey, { max: error.max });
      await ctx.reply(message);
    }
  }

  async handleRenameCustomCategory(ctx, text, userLanguage, categoryId) {
    try {
      const userId = ctx.from.id;
      const raw = (text || '').trim();
      let icon = '📦';
      let name = raw;
      try {
        const emojiMatch = raw.match(/\p{Extended_Pictographic}/u);
        if (emojiMatch && emojiMatch[0]) {
          icon = emojiMatch[0];
          name = raw.replace(emojiMatch[0], '').trim();
        }
      } catch (_) {}

      if (name.length < 1 || name.length > 30) {
        const enterName = this.localizationService.getText(userLanguage, 'custom_categories_enter_name');
        return await ctx.reply(enterName);
      }

      await this.categoryService.updateUserCategory(userId, Number(categoryId), name, icon);
      this.stateService.deleteUserState(userId);
      const okText = this.localizationService.getText(userLanguage, 'custom_categories_created', { name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.reply(okText, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
    } catch (error) {
      let msgKey = 'error';
      if (error.code === 'ALREADY_EXISTS') msgKey = 'custom_categories_exists';
      if (error.code === 'PREMIUM_REQUIRED') msgKey = 'custom_categories_premium_required';
      const userId = ctx.from.id;
      const userLanguage2 = await this.userService.getUserLanguage(userId);
      const message = this.localizationService.getText(userLanguage2, msgKey);
      await ctx.reply(message);
    }
  }

  async handleBugReportInput(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      
      // Дополнительная защита: проверяем количество баг-репортов за последние 10 минут
      const recentReports = await this.bugReportRepository.getBugReportsByUserId(userId, 5, 0);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentCount = recentReports.filter(r => new Date(r.created_at) > tenMinutesAgo).length;
      
      if (recentCount >= 3) {
        const errorText = `⚠️ Слишком много баг-репортов!\n\nМожно отправлять только 3 репорта за 10 минут`;
        return await ctx.reply(errorText);
      }
      
      const reportText = (text || '').trim();
      
      // Валидация длины
      if (!reportText) {
        const errorText = this.localizationService.getText(userLanguage, 'bug_report_empty');
        return await ctx.reply(errorText);
      }
      
      if (reportText.length > 1000) {
        const excess = reportText.length - 1000;
        const errorText = this.localizationService.getText(userLanguage, 'bug_report_too_long', { excess });
        return await ctx.reply(errorText);
      }

      // Проверка на подозрительные паттерны
      const suspiciousPatterns = [
        /\b(union|select|insert|update|delete|drop|truncate|exec|script)\s+/gi,
        /[<>'"=;(){}\[\]]/g,  // HTML/JS символы
        /(http|https|ftp):\/\/[^\s]+/gi,  // Ссылки
        /(@everyone|@here|@channel)/gi,   // Спам-упоминания
        /(.)\1{20,}/g  // Повторяющиеся символы (больше 20 подряд)
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(reportText)) {
          const errorText = `⚠️ Сообщение содержит недопустимые символы или подозрительный контент`;
          return await ctx.reply(errorText);
        }
      }
      
      // Создаем баг-репорт
      await this.bugReportRepository.createBugReport(userId, reportText);
      this.stateService.deleteUserState(userId);
      
      const successText = this.localizationService.getText(userLanguage, 'bug_report_success');
      await ctx.reply(successText);
      
    } catch (error) {
      console.error('Error handling bug report input:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }
}

module.exports = MessageHandlers;