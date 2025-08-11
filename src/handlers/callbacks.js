
class CallbackHandlers {
  constructor({ expenseService, premiumService, paymentService, familyService, categoryService, localizationService, formatter, stateService, userService, commandHandlers, keyboardGenerators }) {
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.paymentService = paymentService;
    this.familyService = familyService;
    this.categoryService = categoryService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.userService = userService;
    this.commandHandlers = commandHandlers;
    this.keyboardGenerators = keyboardGenerators;
  }

  async handleToggleReminders(ctx) {
    const userId = ctx.from.id;
    let userLanguage = await this.userService.getUserLanguage(userId);
    const settings = await this.userService.getReminderSettings(userId);
    const newValue = !settings.reminder_enabled;
    await this.userService.setReminderEnabled(userId, newValue);
    
    const text = this.localizationService.getText(userLanguage, newValue ? 'reminders_enabled' : 'reminders_disabled');
    
    // Отправляем сообщение в чат
    await ctx.reply(text);
    
    // Обновляем клавиатуру с новым состоянием
    const keyboard = this.keyboardGenerators.generateSettingsKeyboard(userLanguage, newValue);
    await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
    
    // Простое подтверждение в callback
    await ctx.answerCbQuery();
  }

  async handleBugReport(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    // Устанавливаем состояние "ожидание баг-репорта"
    this.stateService.setUserState(userId, 'bug_report');
    
    const prompt = this.localizationService.getText(userLanguage, 'bug_report_prompt');
    const backText = this.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.reply(prompt, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'back_to_settings' }]
        ]
      }
    });
    
    await ctx.answerCbQuery();
  }

  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    let userLanguage = 'en'; // fallback язык
    
    // Автоматическая регистрация пользователя, если он еще не зарегистрирован
    await this.userService.registerUser(userId, ctx.from.username, ctx.from.first_name);
    
    // Получаем язык пользователя для локализации
    userLanguage = await this.userService.getUserLanguage(userId);
    
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, categoryPart] = callbackData.split('|');
      const pending = this.stateService.getPendingExpense(userId);
      if (!pending) {
        const dataNotFoundText = this.localizationService.getText(userLanguage, 'callback_data_not_found');
        return await ctx.answerCbQuery(dataNotFoundText);
      }
      const { amount, description, familyId } = pending;
      
      // Проверяем лимит количества записей
      const expenseCountValidation = await this.premiumService.validateExpenseCount(userId);
      if (!expenseCountValidation.isValid) {
        const limitReachedText = this.localizationService.getText(userLanguage, 'callback_limit_reached');
        const errorLimitReachedText = this.localizationService.getText(userLanguage, 'error_limit_reached');
        await ctx.answerCbQuery(limitReachedText);
        await ctx.editMessageText(errorLimitReachedText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем название категории из кнопки
      const button = ctx.callbackQuery.message.reply_markup.inline_keyboard
        .flat()
        .find(btn => btn.callback_data === callbackData);
      if (!button) {
        const buttonNotFoundText = this.localizationService.getText(userLanguage, 'callback_button_not_found');
        return await ctx.answerCbQuery(buttonNotFoundText);
      }
      // Определяем категорию: по id (предпочтительно) или по имени (совместимость)
      let resolvedCategoryName = null;
      if (/^\d+$/.test(categoryPart)) {
        const category = await this.categoryService.getCategoryById(Number(categoryPart));
        if (!category) {
          const notFound = this.localizationService.getText(userLanguage, 'callback_data_not_found');
          await ctx.answerCbQuery(notFound);
          return;
        }
        resolvedCategoryName = category.name;
      } else {
        resolvedCategoryName = categoryPart;
      }

      // Добавляем расход через сервис (по имени категории)
      const expense = await this.expenseService.addExpense(
        userId,
        parseFloat(amount),
        description,
        resolvedCategoryName,
        familyId
      );
      const formattedAmount = this.formatter.formatAmount(expense.amount, expense.currency);
      const formattedDescription = expense.description || this.localizationService.getText(userLanguage, 'not_found');
      
      // Локализуем название категории
      const localizedCategoryName = this.formatter.translateCategoryName(resolvedCategoryName, this.localizationService, userLanguage);
      const expenseAddedText = this.localizationService.getText(userLanguage, 'callback_expense_added', { category: localizedCategoryName });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery(expenseAddedText);
      const expenseAddedTitleText = this.localizationService.getText(userLanguage, 'expense_added_title');
      const amountLabelText = this.localizationService.getText(userLanguage, 'amount_label');
      const descriptionLabelText = this.localizationService.getText(userLanguage, 'description_label');
      const categoryLabelText = this.localizationService.getText(userLanguage, 'category_label');
      
      // Клавиатура: для семейных трат добавляем кнопку "Добавить ещё"
      let keyboard = [];
      if (familyId) {
        const addAnotherText = this.localizationService.getText(userLanguage, 'family_add_expense');
        keyboard = [[
          { text: addAnotherText, callback_data: 'family_add_expense' },
          { text: backText, callback_data: 'family_menu' }
        ]];
      } else {
        keyboard = [[{ text: backText, callback_data: 'back_to_menu' }]];
      }
      
      await ctx.editMessageText(
        `✅ *${expenseAddedTitleText}*\n\n` +
        `💰 ${amountLabelText}: *${formattedAmount}*\n` +
        `📝 ${descriptionLabelText}: ${formattedDescription}\n` +
        `🏷️ ${categoryLabelText}: ${localizedCategoryName}`,
        { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error('Error handling category selection:', error);
      const expenseSavedErrorText = this.localizationService.getText(userLanguage, 'callback_expense_saved');
      await ctx.answerCbQuery(expenseSavedErrorText);
    } finally {
      this.stateService.deletePendingExpense(userId);
    }
  }

  async handleCancel(ctx) {
    let userLanguage = 'en'; // fallback язык
    try {
      const userId = ctx.from.id;
      userLanguage = await this.userService.getUserLanguage(userId);
      
      const canceledText = this.localizationService.getText(userLanguage, 'callback_canceled');
      const expenseCanceledText = this.localizationService.getText(userLanguage, 'callback_expense_canceled');
      
      await ctx.answerCbQuery(canceledText);
      await ctx.editMessageText(expenseCanceledText);
    } catch (error) {
      console.error('Error handling cancel:', error);
    }
  }

  async handleTimezoneSelection(ctx) {
    const userId = ctx.from.id;
    let userLanguage = 'en'; // fallback язык
    userLanguage = await this.userService.getUserLanguage(userId);
    const backText = this.localizationService.getText(userLanguage, 'button_back');
    try {
      const callbackData = ctx.callbackQuery.data;
      const parts = callbackData.split('|');
      const [, timezoneCode] = parts;
      
      // Проверяем, это новый формат времени или старый формат городов
      if (callbackData.startsWith('time|')) {
        // Новый формат: time|hour|minute
        const [, hour, minute] = callbackData.split('|');
        const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');
        
        // Используем время выбора как опорное время
        const selectionTime = new Date();
        const timezone = calculateTimezoneFromUserTime(parseInt(hour), parseInt(minute), selectionTime);
        const displayName = getTimezoneDisplayName(timezone);
        
        // Устанавливаем timezone пользователя
        await this.userService.setUserTimezone(userId, timezone);
        
        const timezoneSetText = this.localizationService.getText(userLanguage, 'timezone_set', { timezone: displayName });
        const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated', { 
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          timezone: displayName 
        });
        
        await ctx.answerCbQuery(timezoneSetText);
        await ctx.editMessageText(timezoneUpdatedText,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_settings' }]
            ]
          } }
        );
      } else {
        // Старый формат: tz|city
        const { getTimezoneByCode } = require('../utils/timezone');
        
        // Получаем полное название timezone по коду
        const timezone = getTimezoneByCode(timezoneCode);
        if (!timezone) {
          throw new Error(`Unknown timezone code: ${timezoneCode}`);
        }
        
        // Устанавливаем timezone пользователя
        await this.userService.setUserTimezone(userId, timezone);
        
        // Получаем информацию о timezone для отображения
        const timezoneLabels = {
          'Europe/Moscow': '🇷🇺 Москва (UTC+3)',
          'Europe/London': '🇬🇧 Лондон (UTC+0)',
          'America/New_York': '🇺🇸 Нью-Йорк (UTC-5)',
          'America/Los_Angeles': '🇺🇸 Лос-Анджелес (UTC-8)',
          'Asia/Tokyo': '🇯🇵 Токио (UTC+9)',
          'Asia/Shanghai': '🇨🇳 Шанхай (UTC+8)',
          'Australia/Sydney': '🇦🇺 Сидней (UTC+10)',
          'Europe/Berlin': '🇩🇪 Берлин (UTC+1)',
          'Europe/Paris': '🇫🇷 Париж (UTC+1)',
          'Asia/Dubai': '🇦🇪 Дубай (UTC+4)',
          'Asia/Kolkata': '🇮🇳 Мумбаи (UTC+5:30)',
          'UTC': '🌐 UTC (UTC+0)'
        };
        
        const timezoneLabel = timezoneLabels[timezone] || timezone;
        
        const timezoneSetText = this.localizationService.getText(userLanguage, 'timezone_set', { timezone: timezoneLabel });
        const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated_simple', { timezone: timezoneLabel });
        
        await ctx.answerCbQuery(timezoneSetText);
        await ctx.editMessageText(timezoneUpdatedText,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_settings' }]
            ]
          } }
        );
      }
    } catch (error) {
      console.error('Error handling timezone selection:', error);
      const timezoneErrorText = this.localizationService.getText(userLanguage, 'timezone_error');
      await ctx.answerCbQuery(timezoneErrorText);
    }
  }

  async handleChangePeriodStart(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.periodStart(ctx);
    } catch (error) {
      console.error('Error handling change period start:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleLanguageSelection(ctx) {
    const userId = ctx.from.id;
    let userLanguage = 'en'; // fallback язык
    userLanguage = await this.userService.getUserLanguage(userId);
    const backText = this.localizationService.getText(userLanguage, 'button_back');
    
    // Автоматическая регистрация пользователя, если он еще не зарегистрирован
    await this.userService.registerUser(userId, ctx.from.username, ctx.from.first_name);
    
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, languageCode] = callbackData.split('|');
      
      // Проверяем, поддерживается ли язык
      if (!this.localizationService.isLanguageSupported(languageCode)) {
        const languageNotSupportedText = this.localizationService.getText(userLanguage, 'language_not_supported');
        await ctx.answerCbQuery(languageNotSupportedText);
        return;
      }
      
      // Устанавливаем язык пользователя
      await this.userService.setUserLanguage(userId, languageCode);
      
      // Получаем сообщение на новом языке
      const languageSetMessage = this.localizationService.getText(languageCode, 'language_set');
      
      await ctx.answerCbQuery(languageSetMessage);
      await ctx.editMessageText(languageSetMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_settings' }]
          ]
        }
      });
      
      // Проверяем статус админа для корректного отображения клавиатуры
      const isAdmin = await this.userService.isUserAdmin(userId);
      
      // Обновляем reply-клавиатуру на новом языке
      const newMainMenuKeyboard = this.keyboardGenerators.generateMainMenuKeyboard(languageCode, isAdmin);
      
      await ctx.telegram.sendMessage(ctx.chat.id, 
        this.localizationService.getText(languageCode, 'keyboard_updated'), 
        {
          reply_markup: {
            keyboard: newMainMenuKeyboard,
            resize_keyboard: true,
            one_time_keyboard: false
          }
        }
      );
    } catch (error) {
      console.error('Error handling language selection:', error);
      const languageChangeErrorText = this.localizationService.getText(userLanguage, 'language_change_error');
      await ctx.answerCbQuery(languageChangeErrorText);
    }
  }

  async handleBack(ctx) {
    const userId = ctx.from.id;
    let userLanguage = 'en';
    
    try {
      userLanguage = await this.userService.getUserLanguage(userId);
      
      // Просто возвращаемся в главное меню
      await ctx.answerCbQuery();
      await this.commandHandlers.mainMenu(ctx);
    } catch (error) {
      console.error('Error handling back navigation:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
      
      // В случае ошибки возвращаемся в главное меню
      await this.commandHandlers.mainMenu(ctx);
    }
  }

  // ========================================
  // FAMILY CALLBACK HANDLERS
  // ========================================

  async handleFamilyCreate(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Устанавливаем состояние создания семьи
      this.stateService.setUserState(userId, 'creating_family');
      
      const enterFamilyNameText = this.localizationService.getText(userLanguage, 'enter_family_name');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(enterFamilyNameText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: cancelText, callback_data: 'family_cancel' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family create:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyJoin(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Устанавливаем состояние присоединения к семье
      this.stateService.setUserState(userId, 'joining_family');
      
      const enterInviteCodeText = this.localizationService.getText(userLanguage, 'enter_invite_code');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(enterInviteCodeText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: cancelText, callback_data: 'family_cancel' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family join:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyActiveInvitations(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      // Получаем активные приглашения
      const invitations = await this.familyService.getActiveInvitations(userFamily.id);
      
      let message;
      let keyboard = [];
      
      if (invitations.length === 0) {
        const noActiveInvitationsText = this.localizationService.getText(userLanguage, 'no_active_invitations');
        message = noActiveInvitationsText;
      } else {
        const activeInvitationsText = this.localizationService.getText(userLanguage, 'active_invitations_list');
        message = `${activeInvitationsText}\n\n`;
        
        invitations.forEach((invitation, index) => {
          const inviteeName = invitation.invitee_username || invitation.invitee_first_name || 'Unknown';
          const expiresAt = new Date(invitation.expires_at_utc);
          const timeLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60)); // часы
          
          message += `${index + 1}. @${inviteeName} (${invitation.invite_code})\n`;
          message += `   ⏰ ${timeLeft} ч. осталось\n\n`;
          
          // Добавляем кнопку для отмены приглашения
          const cancelText = this.localizationService.getText(userLanguage, 'cancel_invitation');
          keyboard.push([{ 
            text: `${cancelText} ${inviteeName}`, 
            callback_data: `cancel_invitation|${invitation.invite_code}` 
          }]);
        });
      }
      
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      keyboard.push([{ text: backText, callback_data: 'family_menu' }]);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error handling family active invitations:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyInvite(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      // Устанавливаем состояние приглашения участника
      this.stateService.setUserState(userId, 'inviting_member');
      
      const enterUsernameText = this.localizationService.getText(userLanguage, 'enter_invite_username');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(enterUsernameText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: cancelText, callback_data: 'family_cancel' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family invite:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyMembers(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      // Получаем список участников
      const members = await this.familyService.getFamilyMembersForOwner(userId);
      
      const membersTitleText = this.localizationService.getText(userLanguage, 'family_members_title');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      let message = `${membersTitleText}\n\n`;
      let keyboard = [];
      
      if (members && members.length > 0) {
        members.forEach(member => {
          const role = member.role === 'owner' ? 
            this.localizationService.getText(userLanguage, 'family_owner_role') : 
            this.localizationService.getText(userLanguage, 'family_member_role');
          const name = member.username ? `@${member.username}` : member.first_name;
          const date = new Date(member.joined_at_utc).toLocaleDateString('ru-RU');
          
          message += `• ${name} (${role}) - присоединился ${date}\n`;
          
          // Добавляем кнопку исключения только для участников (не для владельца)
          if (member.role !== 'owner') {
            const removeText = this.localizationService.getText(userLanguage, 'remove_member');
            keyboard.push([{ 
              text: `${removeText} ${name}`, 
              callback_data: `remove_member|${member.id}` 
            }]);
          }
        });
      } else {
        message += 'Нет участников';
      }
      
      // Добавляем кнопку "Назад"
      keyboard.push([{ text: backText, callback_data: 'family_menu' }]);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error handling family members:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyStats(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.familyStats(ctx);
    } catch (error) {
      console.error('Error handling family stats:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyDailyHistory(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.familyDailyHistory(ctx);
    } catch (error) {
      console.error('Error handling family daily history:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyExport(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.familyExport(ctx);
    } catch (error) {
      console.error('Error handling family export:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleRemoveMember(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const memberId = ctx.callbackQuery.data.split('|')[1];
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      // Получаем информацию об удаляемом участнике
      const memberInfo = await this.userService.getUserById(memberId);
      const memberName = memberInfo.username || memberInfo.first_name || 'Unknown';
      
      // Показываем подтверждение
      const confirmText = this.localizationService.getText(userLanguage, 'confirm_remove_member', { name: memberName });
      const confirmButtonText = this.localizationService.getText(userLanguage, 'confirm');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: confirmButtonText, callback_data: `confirm_remove_member|${memberId}` },
              { text: cancelText, callback_data: 'family_members' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling remove member:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleConfirmRemoveMember(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const memberId = ctx.callbackQuery.data.split('|')[1];
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      // Исключаем участника
      const result = await this.familyService.removeMemberFromFamily(userId, memberId);
      
      // Получаем информацию об удаленном участнике для сообщения
      const memberInfo = await this.userService.getUserById(memberId);
      const memberName = memberInfo.username || memberInfo.first_name || 'Unknown';
      
      // Показываем сообщение об успехе
      const successText = this.localizationService.getText(userLanguage, 'member_removed', { name: memberName });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(successText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_members' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling confirm remove member:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyAddExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Устанавливаем состояние добавления семейной траты
      this.stateService.setUserState(userId, 'adding_family_expense');
      
      const enterExpenseText = this.localizationService.getText(userLanguage, 'enter_expense_amount');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(enterExpenseText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: cancelText, callback_data: 'family_cancel' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family add expense:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyDelete(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.answerCbQuery(premiumRequiredText);
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.answerCbQuery(notFamilyMemberText);
        return;
      }
      
      // Проверяем, является ли пользователь владельцем
      if (userFamily.owner_id !== userId) {
        const notFamilyOwnerText = this.localizationService.getText(userLanguage, 'not_family_owner');
        await ctx.answerCbQuery(notFamilyOwnerText);
        return;
      }
      
      const confirmText = this.localizationService.getText(userLanguage, 'confirm_delete_family');
      const confirmText2 = this.localizationService.getText(userLanguage, 'confirm');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: confirmText2, callback_data: 'family_delete_confirm' },
              { text: cancelText, callback_data: 'family_cancel' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family delete:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyDeleteConfirm(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Удаляем семью
      const deletedFamily = await this.familyService.deleteFamily(userId);
      
      const familyDeletedText = this.localizationService.getText(userLanguage, 'family_deleted', { name: deletedFamily.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(familyDeletedText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family delete confirm:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyLeave(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Покидаем семью
      const leftFamily = await this.familyService.leaveFamily(userId);
      
      const familyLeftText = this.localizationService.getText(userLanguage, 'family_left', { name: leftFamily.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(familyLeftText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling family leave:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleAcceptInvitation(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Получаем код приглашения из callback_data
      const inviteCode = ctx.callbackQuery.data.split('|')[1];
      
      // Принимаем приглашение
      const result = await this.familyService.acceptInvitation(userId, inviteCode);
      
      console.log('Accept invitation result:', {
        family: result.family,
        familyName: result.family?.name,
        invitation: result.invitation
      });
      
      const invitationAcceptedText = this.localizationService.getText(userLanguage, 'invitation_accepted', { 
        familyName: result.family?.name || 'Unknown Family'
      });
      
      await ctx.answerCbQuery(invitationAcceptedText);
      await ctx.editMessageText(invitationAcceptedText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: this.localizationService.getText(userLanguage, 'button_back'), callback_data: 'family_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      let errorText;
      
      if (error.message.includes('not found')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_found');
      } else if (error.message.includes('not pending')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_pending');
      } else if (error.message.includes('expired')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_expired');
      } else if (error.message.includes('already a member')) {
        errorText = this.localizationService.getText(userLanguage, 'user_already_in_family');
      } else {
        errorText = this.localizationService.getText(userLanguage, 'error');
      }
      
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleRejectInvitation(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Получаем код приглашения из callback_data
      const inviteCode = ctx.callbackQuery.data.split('|')[1];
      
      // Отклоняем приглашение
      const result = await this.familyService.rejectInvitation(userId, inviteCode);
      
      const invitationRejectedText = this.localizationService.getText(userLanguage, 'invitation_rejected');
      
      await ctx.answerCbQuery(invitationRejectedText);
      await ctx.editMessageText(invitationRejectedText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: this.localizationService.getText(userLanguage, 'button_back'), callback_data: 'family_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      let errorText;
      
      if (error.message.includes('not found')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_found');
      } else if (error.message.includes('not pending')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_pending');
      } else if (error.message.includes('expired')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_expired');
      } else {
        errorText = this.localizationService.getText(userLanguage, 'error');
      }
      
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleCancelInvitation(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Получаем код приглашения из callback_data
      const inviteCode = ctx.callbackQuery.data.split('|')[1];
      
      // Отменяем приглашение
      const invitation = await this.familyService.cancelInvitation(userId, inviteCode);
      
      const invitationCancelledText = this.localizationService.getText(userLanguage, 'invitation_cancelled');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery(invitationCancelledText);
      await ctx.editMessageText(invitationCancelledText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_active_invitations' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      let errorText;
      
      if (error.message.includes('not found')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_found');
      } else if (error.message.includes('not authorized')) {
        errorText = this.localizationService.getText(userLanguage, 'not_authorized');
      } else {
        errorText = this.localizationService.getText(userLanguage, 'error');
      }
      
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyCancel(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Очищаем состояние пользователя
      this.stateService.deleteUserState(userId);
      
      // Возвращаемся в семейное меню
      await ctx.answerCbQuery();
      await this.commandHandlers.family(ctx);
    } catch (error) {
      console.error('Error handling family cancel:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handleFamilyMenu(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.family(ctx);
    } catch (error) {
      console.error('Error handling family menu:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handlePremiumTariffs(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      const { PREMIUM_TARIFFS, formatPremiumTariff, formatPremiumTariffEn, generatePremiumPaymentButtons } = require('../utils/constants');
      
      const tariffsTitle = this.localizationService.getText(userLanguage, 'premium_tariffs_title');
      const paymentInfo = this.localizationService.getText(userLanguage, 'premium_payment_info');
      const renewalInfo = this.localizationService.getText(userLanguage, 'premium_renewal_info');
      const starsInfo = this.localizationService.getText(userLanguage, 'premium_stars_info');

      const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
      
      // Форматируем тарифы используя константы
      const formatTariff = userLanguage === 'en' ? formatPremiumTariffEn : formatPremiumTariff;
      const month1 = formatTariff(PREMIUM_TARIFFS.MONTH_1, this.localizationService, userLanguage);
      const month3 = formatTariff(PREMIUM_TARIFFS.MONTH_3, this.localizationService, userLanguage);
      const month6 = formatTariff(PREMIUM_TARIFFS.MONTH_6, this.localizationService, userLanguage);
      const month12 = formatTariff(PREMIUM_TARIFFS.MONTH_12, this.localizationService, userLanguage);
      
      const message = `${tariffsTitle}\n\n${month1}\n\n${month3}\n\n${month6}\n\n${month12}\n\n${paymentInfo}\n\n${renewalInfo}\n\n${starsInfo}`;
      
      // Генерируем кнопки оплаты
      const paymentButtons = generatePremiumPaymentButtons(PREMIUM_TARIFFS, this.localizationService, userLanguage);
      
      // Создаем кнопки с прямыми ссылками на оплату
      const buttonsWithLinks = [];
      for (const row of paymentButtons) {
        const newRow = [];
        for (const button of row) {
          const tariff = PREMIUM_TARIFFS[button.tariffKey.toUpperCase()];
          const paymentLink = await this.paymentService.createInvoiceLink(userId, tariff, userLanguage);
          newRow.push({
            text: button.text,
            url: paymentLink
          });
        }
        buttonsWithLinks.push(newRow);
      }
      
      const inlineKeyboard = [
        ...buttonsWithLinks,
        [{ text: backButton, callback_data: 'premium_subscription' }]
      ];
      
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
    } catch (error) {
      console.error('Error handling premium tariffs:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handlePremiumWhyPaid(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      const whyPaidTitle = this.localizationService.getText(userLanguage, 'premium_why_paid_title');
      const whyPaidText = this.localizationService.getText(userLanguage, 'premium_why_paid_text');
      const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
      
      const message = `${whyPaidTitle}\n\n${whyPaidText}`;
      
      const inlineKeyboard = [
        [{ text: backButton, callback_data: 'premium_subscription' }]
      ];
      
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
    } catch (error) {
      console.error('Error handling premium why paid:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handlePremiumDonate(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const title = this.localizationService.getText(userLanguage, 'donate_prompt_title');
      const text = this.localizationService.getText(userLanguage, 'donate_prompt_text');
      const backText = this.localizationService.getText(userLanguage, 'premium_back_button');
      
      // Ставим состояние ожидания доната
      this.stateService.setUserState(userId, 'entering_donation');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(`${title}\n\n${text}`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'premium_subscription' }]] }
      });
    } catch (error) {
      console.error('Error handling premium donate:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  async handlePremiumSubscription(ctx) {
    try {
      await ctx.answerCbQuery();
      await this.commandHandlers.premiumSubscription(ctx);
    } catch (error) {
      console.error('Error handling premium subscription:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.answerCbQuery(errorText);
    }
  }

  // ========================================
  // CUSTOM CATEGORIES (PREMIUM)
  // ========================================

  async handleCustomCategoriesMenu(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const text = this.localizationService.getText(userLanguage, 'custom_categories_premium_required');
        await ctx.answerCbQuery(text, { show_alert: true });
        return;
      }

      const title = this.localizationService.getText(userLanguage, 'custom_categories_title');
      const info = this.localizationService.getText(userLanguage, 'custom_categories_info');
      const addText = this.localizationService.getText(userLanguage, 'custom_categories_add');
      const manageText = this.localizationService.getText(userLanguage, 'custom_categories_manage');
      const backText = this.localizationService.getText(userLanguage, 'button_back');

      const keyboard = [
        [{ text: addText, callback_data: 'custom_categories_add' }],
        [{ text: manageText, callback_data: 'custom_categories_manage' }],
        [{ text: backText, callback_data: 'back_to_settings' }]
      ];

      await ctx.answerCbQuery();
      await ctx.editMessageText(`${title}\n\n${info}`, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error opening custom categories menu:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }

  async handleCustomCategoriesAdd(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const text = this.localizationService.getText(userLanguage, 'custom_categories_premium_required');
        await ctx.answerCbQuery(text, { show_alert: true });
        return;
      }

      // Ставим состояние ожидания имени категории
      this.stateService.setUserState(userId, 'adding_custom_category');
      const enterName = this.localizationService.getText(userLanguage, 'custom_categories_enter_name');
      const backText = this.localizationService.getText(userLanguage, 'button_back');

      await ctx.answerCbQuery();
      await ctx.editMessageText(enterName, {
        reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories' }]] }
      });
    } catch (error) {
      console.error('Error opening add custom category:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }

  async handleCustomCategoriesManage(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const text = this.localizationService.getText(userLanguage, 'custom_categories_premium_required');
        await ctx.answerCbQuery(text, { show_alert: true });
        return;
      }

      const list = await this.categoryService.getUserCategories(userId);
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      const deleteText = this.localizationService.getText(userLanguage, 'custom_categories_delete');
      const editText = this.localizationService.getText(userLanguage, 'button_edit');
      let message;
      const keyboard = [];
      if (!list.length) {
        message = this.localizationService.getText(userLanguage, 'custom_categories_list_empty');
      } else {
        const title = this.localizationService.getText(userLanguage, 'custom_categories_list_title');
        message = `${title}\n\n` + list.map(c => `${c.icon || '📦'} ${c.name}`).join('\n');
        list.forEach(c => {
          keyboard.push([
            { text: `${editText} ${c.name}`, callback_data: `custom_categories_rename|${c.id}` },
            { text: `${deleteText} ${c.name}`, callback_data: `custom_categories_delete|${c.id}` }
          ]);
        });
      }
      keyboard.push([{ text: backText, callback_data: 'custom_categories' }]);

      await ctx.answerCbQuery();
      await ctx.editMessageText(message, { reply_markup: { inline_keyboard: keyboard } });
    } catch (error) {
      console.error('Error opening manage custom categories:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }

  async handleCustomCategoriesDelete(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      const [, idStr] = ctx.callbackQuery.data.split('|');
      const deleted = await this.categoryService.deleteUserCategory(userId, parseInt(idStr, 10));
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      const deletedText = this.localizationService.getText(userLanguage, 'custom_categories_deleted');
      await ctx.answerCbQuery(deletedText);
      await ctx.editMessageText(deletedText, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
    } catch (error) {
      console.error('Error deleting custom category:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }

  async handleCustomCategoriesRename(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const text = this.localizationService.getText(userLanguage, 'custom_categories_premium_required');
        await ctx.answerCbQuery(text, { show_alert: true });
        return;
      }

      const [, idStr] = ctx.callbackQuery.data.split('|');
      // Ставим состояние ожидания нового имени категории
      this.stateService.setUserState(userId, `renaming_custom_category:${idStr}`);
      const enterName = this.localizationService.getText(userLanguage, 'custom_categories_enter_name');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.answerCbQuery();
      await ctx.editMessageText(enterName, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
    } catch (error) {
      console.error('Error opening rename custom category:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }




}

module.exports = CallbackHandlers; 