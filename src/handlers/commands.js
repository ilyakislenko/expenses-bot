const { MAIN_MENU_KEYBOARD, CURRENCY_KEYBOARD, SETTINGS_KEYBOARD } = require('../utils/constants');

class CommandHandlers {
  constructor({ expenseService, userService, premiumService, familyService, localizationService, formatter, stateService, keyboardGenerators, paymentService }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.familyService = familyService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.keyboardGenerators = keyboardGenerators;
    this.paymentService = paymentService;
  }

  async paysupport(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const { PAY_SUPPORT } = require('../config/bot');
    const text = this.localizationService.getText(userLanguage, 'paysupport_message', {
      businessName: PAY_SUPPORT.businessName,
      supportUsername: PAY_SUPPORT.supportUsername,
      supportEmail: PAY_SUPPORT.supportEmail,
      termsUrl: PAY_SUPPORT.termsUrl,
      privacyUrl: PAY_SUPPORT.privacyUrl,
      refundPolicyUrl: PAY_SUPPORT.refundPolicyUrl
    });
    // Не используем Markdown/HTML, чтобы избежать проблем с подчёркиваниями в юзернеймах/ссылках
    await ctx.reply(text, { disable_web_page_preview: true });
  }

  async terms(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const { PAY_SUPPORT } = require('../config/bot');
    const text = this.localizationService.getText(userLanguage, 'terms_message', {
      termsUrl: PAY_SUPPORT.termsUrl
    });
    await ctx.reply(text, { disable_web_page_preview: true });
  }

  async privacy(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const { PAY_SUPPORT } = require('../config/bot');
    const text = this.localizationService.getText(userLanguage, 'privacy_message', {
      privacyUrl: PAY_SUPPORT.privacyUrl
    });
    await ctx.reply(text, { disable_web_page_preview: true });
  }

  async refund(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const { PAY_SUPPORT } = require('../config/bot');
    const text = this.localizationService.getText(userLanguage, 'refund_message', {
      refundPolicyUrl: PAY_SUPPORT.refundPolicyUrl,
      supportUsername: PAY_SUPPORT.supportUsername,
      supportEmail: PAY_SUPPORT.supportEmail
    });
    await ctx.reply(text, { disable_web_page_preview: true });
  }

  async start(ctx) {
    const user = ctx.from;
    // Проверяем, существовал ли пользователь ранее (до регистрации)
    const existedUser = await this.userService.getUserById(user.id);
    await this.userService.registerUser(user.id, user.username, user.first_name);

    // Если пользователь новый — запускаем одноразовый onboarding (язык → валюта)
    if (!existedUser) {
      // Выбираем стартовый язык для показа клавиатуры (если язык Telegram поддерживается — используем его, иначе en)
      const tgLang = (user && user.language_code) ? user.language_code : null;
      const initialLanguage = (tgLang && this.localizationService.isLanguageSupported(tgLang)) ? tgLang : 'en';
      this.stateService.setUserState(user.id, 'onboarding_language');

      const languageSelectText = this.localizationService.getText(initialLanguage, 'language_select');
      const keyboard = this.localizationService.getLanguageKeyboardLocalized(initialLanguage);
      await ctx.reply(languageSelectText, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      return;
    }

    // Получаем язык пользователя
    const userLanguage = await this.userService.getUserLanguage(user.id);
    
    // Проверяем, является ли пользователь админом
    const isAdmin = await this.userService.isUserAdmin(user.id);
    
    // Получаем локализованное приветствие
    const welcomeMessage = this.localizationService.getText(userLanguage, 'welcome', { name: user.first_name });
    const startMessage = this.localizationService.getText(userLanguage, 'start_message');

    const message = `${welcomeMessage}\n\n${startMessage}`;

    // Проверяем, есть ли у пользователя семья и премиум для показа кнопки "добавить семейную трату"
    let hasFamily = false;
    let isPremium = false;
    try {
      isPremium = await this.premiumService.isPremiumUser(user.id);
      if (isPremium) {
        hasFamily = await this.familyService.getUserFamily(user.id);
        hasFamily = !!hasFamily; // преобразуем в boolean
      }
    } catch (error) {
      // В случае ошибки просто показываем базовое меню
    }

    const mainMenuKeyboard = this.keyboardGenerators.generateMainMenuKeyboard(userLanguage, isAdmin, hasFamily, isPremium);
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: mainMenuKeyboard,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }

  async help(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    const message = this.localizationService.getText(userLanguage, 'help_message');

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  async total(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const { total, userCurrency } = await this.expenseService.getMonthlyStats(userId);
      let message;
      if (Array.isArray(total.byCurrency) && total.byCurrency.length > 1) {
        // Используем formatStats для вывода по всем валютам
        message = await this.formatter.formatStats(total, [], userCurrency, 'месяц', this.localizationService, userLanguage);
      } else {
        const monthlyStatsText = this.localizationService.getText(userLanguage, 'monthly_stats');
        const totalSpentText = this.localizationService.getText(userLanguage, 'total_spent', { amount: this.formatter.formatAmount(total.total, total.currency || 'RUB') });
        const recordsCountText = this.localizationService.getText(userLanguage, 'records_count', { count: total.count });
        
        message = `${monthlyStatsText}\n\n${totalSpentText}\n${recordsCountText}`;
      }
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in total command:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async dailyHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      
      
      const { total, expenses, userCurrency } = await this.expenseService.getDailyStats(userId);
      const userTimezone = await this.userService.getUserTimezone(userId);
      let message = await this.formatter.formatStats(total, [], userCurrency, 'день', this.localizationService, userLanguage) + '\n' + this.formatter.formatExpenseList(expenses, userTimezone, this.localizationService, userLanguage);
      
      const editText = this.localizationService.getText(userLanguage, 'button_edit');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      const isPremium = await this.premiumService.isPremiumUser(userId);
      const keyboardRow = isPremium
        ? [{ text: editText, callback_data: 'edit_history' }, { text: backText, callback_data: 'back_to_menu' }]
        : [{ text: backText, callback_data: 'back_to_menu' }];
      
      await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: {
        inline_keyboard: [
          keyboardRow
        ]
      } });
    } catch (error) {
      console.error('Error in history command:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async stats(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      
      
      const { total, categoryStats, userCurrency } = await this.expenseService.getMonthlyStats(userId);
      
      const message = await this.formatter.formatStats(total, categoryStats, userCurrency, 'месяц', this.localizationService, userLanguage);
      
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      const isPremium = await this.premiumService.isPremiumUser(userId);
      
      await ctx.reply(message, { parse_mode: 'Markdown' , reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'back_to_menu' }]
        ]
      } });
    } catch (error) {
      console.error('Error in stats command:', error);
      const errorText = this.localizationService.getText(userLanguage || 'en', 'error');
      await ctx.reply(errorText);
    }
  }

  async exportData(ctx) {
    let userLanguage = 'en'; // fallback язык
    try {
      const userId = ctx.from.id;
      userLanguage = await this.userService.getUserLanguage(userId);
      const { expenses, userCurrency, userTimezone } = await this.expenseService.exportExpenses(userId);
      if (expenses.length === 0) {
        const noDataText = this.localizationService.getText(userLanguage, 'no_expenses_period');
        return await ctx.reply(noDataText);
      }
      const csv = await this.formatter.formatCSV(expenses, userCurrency, userTimezone, this.localizationService, userLanguage);
      const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      
      const exportSuccessText = this.localizationService.getText(userLanguage, 'export_success');
      const recordsCountText = this.localizationService.getText(userLanguage, 'records_count', { count: expenses.length });
      const caption = `${exportSuccessText}\n${recordsCountText}`;
      
      await ctx.replyWithDocument({
        source: Buffer.from(csv, 'utf-8'),
        filename
      }, {
        caption: caption
      });
    } catch (error) {
      console.error('Error in export command:', error);
      const exportErrorText = this.localizationService.getText(userLanguage, 'export_error');
      await ctx.reply(exportErrorText);
    }
  }

  async undo(ctx) {
    let userLanguage = 'en'; // fallback язык
    try {
      const userId = ctx.from.id;
      userLanguage = await this.userService.getUserLanguage(userId);
      const deleted = await this.expenseService.deleteLastExpense(userId);
      
      if (deleted) {
        const amount = this.formatter.formatAmount(deleted.amount, deleted.currency);
        const description = deleted.description || this.localizationService.getText(userLanguage, 'not_found');
        const expenseDeletedText = this.localizationService.getText(userLanguage, 'expense_deleted', { amount, description });
        await ctx.reply(expenseDeletedText);
      } else {
        const noExpensesText = this.localizationService.getText(userLanguage, 'no_expenses');
        await ctx.reply(noExpensesText);
      }
    } catch (error) {
      console.error('Error in undo command:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async categories(ctx) {
    let userLanguage = 'en'; // fallback язык
    try {
      const userId = ctx.from.id;
      userLanguage = await this.userService.getUserLanguage(userId);
      
      
      
      const categories = await this.expenseService.getCategories(userId, this.localizationService, userLanguage);

      if (!categories.length) {
        const noCategoriesText = this.localizationService.getText(userLanguage, 'no_categories');
        return await ctx.reply(noCategoriesText);
      }

      // Формируем inline-клавиатуру
      const keyboard = categories.map(cat => [
        { text: `${cat.icon} ${cat.name}`, callback_data: `show_category|${cat.id}` }
      ]);
      
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      keyboard.push([{ text: backText, callback_data: 'back_to_menu' }]);

      const selectCategoryText = this.localizationService.getText(userLanguage, 'select_category');
      await ctx.reply(selectCategoryText, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error in categories command:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async currency(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    

    
    const message = this.localizationService.getText(userLanguage, 'currency_select');
    const currencyKeyboard = require('../utils/constants').generateCurrencyKeyboard(this.localizationService, userLanguage);
    await ctx.reply(message, {
      reply_markup: {
        inline_keyboard: currencyKeyboard
      }
    });
  }

  async settings(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    // Получаем состояние напоминалок
    const reminderSettings = await this.userService.getReminderSettings(userId);
    
    const settingsTitle = this.localizationService.getText(userLanguage, 'settings_title');
    const settingsKeyboard = require('../utils/constants').generateSettingsKeyboard(this.localizationService, userLanguage, reminderSettings.reminder_enabled);
    
    await ctx.reply(settingsTitle, {
      reply_markup: {
        inline_keyboard: settingsKeyboard
      }
    });
  }

  async periodStart(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const prompt = this.localizationService.getText(userLanguage, 'period_start_prompt');
    const backText = this.localizationService.getText(userLanguage, 'button_back');
    
    // ставим состояние ожидания ввода числа
    this.stateService.setUserState(userId, 'setting_period_start');
    
    await ctx.reply(prompt, {
      reply_markup: {
        inline_keyboard: [[{ text: backText, callback_data: 'back_to_settings' }]]
      }
    });
  }

  async language(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    

    
    const languageSelectText = this.localizationService.getText(userLanguage, 'language_select');
    const keyboard = this.localizationService.getLanguageKeyboardLocalized(userLanguage);
    
    await ctx.reply(languageSelectText, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  async timezone(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    

    
    const { generateTimeKeyboard } = require('../utils/constants');
    const currentUtcTime = new Date();
    const utcTimeString = currentUtcTime.toUTCString();
    
    const message = this.localizationService.getText(userLanguage, 'timezone_setup', { utcTime: utcTimeString });
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: generateTimeKeyboard(this.localizationService, userLanguage)
      }
    });
  }

  async limits(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      
      
      const usageStats = await this.premiumService.getUsageStats(userId);
      
      const status = usageStats.isPremium ? 
        this.localizationService.getText(userLanguage, 'status_premium') : 
        this.localizationService.getText(userLanguage, 'status_regular');
      
      const limitsTitle = this.localizationService.getText(userLanguage, 'limits_title');
      const statusLabel = this.localizationService.getText(userLanguage, 'status_label', { status });
      const recordsUsage = this.localizationService.getText(userLanguage, 'records_usage', { 
        current: usageStats.currentCount, 
        max: usageStats.maxCount, 
        percentage: usageStats.usagePercentage 
      });
      const recordsRemaining = this.localizationService.getText(userLanguage, 'records_remaining', { remaining: usageStats.remaining });
      const maxDescriptionLength = this.localizationService.getText(userLanguage, 'max_description_length', { length: usageStats.maxDescriptionLength });
      
      let message = `${limitsTitle}\n\n${statusLabel}\n${recordsUsage}\n${recordsRemaining}\n${maxDescriptionLength}\n\n`;
      
      if (usageStats.isNearLimit && !usageStats.isAtLimit) {
        message += this.localizationService.getText(userLanguage, 'near_limit_warning') + '\n';
      }
      
      if (usageStats.isAtLimit) {
        message += this.localizationService.getText(userLanguage, 'limit_reached') + '\n';
      }
      
      if (!usageStats.isPremium) {
        message += '\n' + this.localizationService.getText(userLanguage, 'premium_benefits');
      }
      
      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in limits command:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async family(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус пользователя
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        const upgradeText = this.localizationService.getText(userLanguage, 'upgrade_to_premium');
        const message = `${premiumRequiredText}\n\n${upgradeText}`;
        
        const backText = this.localizationService.getText(userLanguage, 'button_back');
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_menu' }]
            ]
          }
        });
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      
      // Формируем сообщение в зависимости от статуса пользователя
      let message;
      let keyboard = [];
      
      if (userFamily) {
        // Пользователь уже в семье
        const isOwner = userFamily.owner_id === userId;
        const familyInfoText = this.localizationService.getText(userLanguage, 'family_info');
        const familyName = userFamily.name;
        const ownerName = userFamily.owner_username || userFamily.owner_first_name || 'Unknown';
        
        message = `${familyInfoText}\n\n🏠 *Семья:* ${familyName}\n👑 *Владелец:* ${ownerName}`;
        
        if (isOwner) {
          // Владелец семьи
          const membersText = this.localizationService.getText(userLanguage, 'family_members');
          const inviteText = this.localizationService.getText(userLanguage, 'invite_member');
          const activeInvitationsText = this.localizationService.getText(userLanguage, 'active_invitations');
          const statsText = this.localizationService.getText(userLanguage, 'family_stats');
          const dailyStatsText = this.localizationService.getText(userLanguage, 'family_daily_stats');
          const exportText = this.localizationService.getText(userLanguage, 'family_export');
          const addExpenseText = this.localizationService.getText(userLanguage, 'family_add_expense');
          const deleteText = this.localizationService.getText(userLanguage, 'delete_family');
          
          keyboard = [
            [{ text: membersText, callback_data: 'family_members' }],
            [{ text: inviteText, callback_data: 'family_invite' }],
            [{ text: activeInvitationsText, callback_data: 'family_active_invitations' }],
            [{ text: statsText, callback_data: 'family_stats' }],
            [{ text: dailyStatsText, callback_data: 'family_daily_history' }],
            [{ text: exportText, callback_data: 'family_export' }],
            [{ text: addExpenseText, callback_data: 'family_add_expense' }],
            [{ text: deleteText, callback_data: 'family_delete' }]
          ];
        } else {
          // Обычный член семьи
          const statsText = this.localizationService.getText(userLanguage, 'family_stats');
          const dailyStatsText = this.localizationService.getText(userLanguage, 'family_daily_stats');
          const exportText = this.localizationService.getText(userLanguage, 'family_export');
          const leaveText = this.localizationService.getText(userLanguage, 'leave_family');
          const addExpenseText = this.localizationService.getText(userLanguage, 'family_add_expense');
          
          keyboard = [
            [{ text: statsText, callback_data: 'family_stats' }],
            [{ text: dailyStatsText, callback_data: 'family_daily_history' }],
            [{ text: exportText, callback_data: 'family_export' }],
            [{ text: addExpenseText, callback_data: 'family_add_expense' }],
            [{ text: leaveText, callback_data: 'family_leave' }]
          ];
        }
      } else {
        // Пользователь не в семье
        const familyInfoText = this.localizationService.getText(userLanguage, 'family_info');
        const createText = this.localizationService.getText(userLanguage, 'create_family');
        const joinText = this.localizationService.getText(userLanguage, 'join_family');
        
        message = `${familyInfoText}\n\nВыберите действие:`;
        
        keyboard = [
          [{ text: createText, callback_data: 'family_create' }],
          [{ text: joinText, callback_data: 'family_join' }]
        ];
      }
      
      // Добавляем кнопку "Назад"
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      keyboard.push([{ text: backText, callback_data: 'back_to_menu' }]);
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      console.error('Error in family command:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async familyStats(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const userCurrency = await this.userService.getUserCurrency(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.reply(premiumRequiredText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.reply(notFamilyMemberText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем статистику семьи
      const userTimezone = await this.userService.getUserTimezone(userId);
      const stats = await this.familyService.getFamilyStats(userFamily.id, 'month', userTimezone);
      
      // Формируем сообщение

      
      // Используем formatter для правильного отображения валют
      const message = await this.formatter.formatStats(stats.total, stats.byCategory, userCurrency, 'месяц', this.localizationService, userLanguage);
      
      // Добавляем заголовок для семейной статистики
      const familyStatsMessage = `${message}`;
      
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.reply(familyStatsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in familyStats command:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async familyDailyHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const userCurrency = await this.userService.getUserCurrency(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.reply(premiumRequiredText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.reply(notFamilyMemberText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем дневную статистику семьи
      const userTimezone = await this.userService.getUserTimezone(userId);
      const { total, expenses } = await this.familyService.getFamilyDailyStats(userFamily.id, userTimezone);
      
      // Формируем сообщение

      const statsMessage = await this.formatter.formatStats(total, [], userCurrency, 'день', this.localizationService, userLanguage);
      const expensesList = this.formatter.formatExpenseList(expenses, userTimezone, this.localizationService, userLanguage);
      
      const message = `${statsMessage}\n${expensesList}`;
      
      const editText = this.localizationService.getText(userLanguage, 'button_edit');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.reply(message, { 
        parse_mode: 'Markdown', 
        reply_markup: {
          inline_keyboard: [
            [{ text: editText, callback_data: 'edit_family_history' }, { text: backText, callback_data: 'family_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error in familyDailyHistory command:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async familyExport(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const userCurrency = await this.userService.getUserCurrency(userId);
      
      // Проверяем премиум статус
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        const premiumRequiredText = this.localizationService.getText(userLanguage, 'premium_required');
        await ctx.reply(premiumRequiredText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем информацию о семье пользователя
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        const notFamilyMemberText = this.localizationService.getText(userLanguage, 'not_family_member');
        await ctx.reply(notFamilyMemberText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем все траты семьи
      const userTimezone = await this.userService.getUserTimezone(userId);
      const expenses = await this.familyService.getAllFamilyExpenses(userFamily.id);
      
      if (expenses.length === 0) {
        const noDataText = this.localizationService.getText(userLanguage, 'no_expenses_period');
        return await ctx.reply(noDataText);
      }
      
      // Формируем CSV
      const csv = await this.formatter.formatCSV(expenses, userCurrency, userTimezone, this.localizationService, userLanguage);
      const filename = `family_expenses_${userFamily.name}_${new Date().toISOString().split('T')[0]}.csv`;
      
      const exportSuccessText = this.localizationService.getText(userLanguage, 'export_success');
      const recordsCountText = this.localizationService.getText(userLanguage, 'records_count', { count: expenses.length });
      const caption = `${exportSuccessText}\n${recordsCountText}`;
      
      await ctx.replyWithDocument({
        source: Buffer.from(csv, 'utf-8'),
        filename
      }, {
        caption: caption
      });
    } catch (error) {
      console.error('Error in familyExport command:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  async premiumSubscription(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const userTimezone = await this.userService.getUserTimezone(userId);
    
    // Получаем информацию о статусе пользователя
    const limitsInfo = await this.premiumService.getLimitsInfo(userId);
    const status = limitsInfo.isPremium ? 
      this.localizationService.getText(userLanguage, 'status_premium') : 
      this.localizationService.getText(userLanguage, 'status_regular');
    
    // Формируем детальную информацию о лимитах
    const recordsUsage = this.localizationService.getText(userLanguage, 'records_usage', { 
      current: limitsInfo.currentCount, 
      max: limitsInfo.maxCount, 
      percentage: limitsInfo.percentage 
    });
    const recordsRemaining = this.localizationService.getText(userLanguage, 'records_remaining', { 
      remaining: limitsInfo.remaining 
    });
    const maxDescriptionLength = this.localizationService.getText(userLanguage, 'max_description_length', { 
      length: limitsInfo.maxDescriptionLength 
    });
    
    // Формируем сообщение о статусе
    const subscriptionTitle = this.localizationService.getText(userLanguage, 'premium_subscription_title');
    const statusHeader = this.localizationService.getText(userLanguage, 'premium_status_header');
    const privileges = this.localizationService.getText(userLanguage, 'premium_privileges', { status });
    const menuTitle = this.localizationService.getText(userLanguage, 'premium_menu_title');
    const benefits = this.localizationService.getText(userLanguage, 'premium_benefits');
    
          let message = `${subscriptionTitle}\n\n${statusHeader}\n- ${privileges}\n- ${recordsUsage}\n- ${recordsRemaining}\n- ${maxDescriptionLength}`;
      
      // Добавляем информацию о дате истечения премиума
      if (limitsInfo.isPremium && limitsInfo.premiumExpiresAt) {
        const expiryInfo = this.localizationService.getText(userLanguage, 'premium_expires', {
          date: this.formatter.formatDate(limitsInfo.premiumExpiresAt, userTimezone),
          days: limitsInfo.daysRemaining
        });
        message += `\n\n${expiryInfo}`;
      }
      
      message += `\n\n${benefits}\n\n${menuTitle}`;
    
    // Создаем inline клавиатуру для премиум меню
    const tariffButton = this.localizationService.getText(userLanguage, 'premium_tariff_button');
    const whyPaidButton = this.localizationService.getText(userLanguage, 'premium_why_paid_button');
    const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
    
    const donateButton = this.localizationService.getText(userLanguage, 'premium_donate_button');
    const purchasesButton = this.localizationService.getText(userLanguage, 'premium_purchases_button') || '🧾 Purchase history';
    const inlineKeyboard = [
      [
        { text: tariffButton, callback_data: 'premium_tariffs' },
        { text: donateButton, callback_data: 'premium_donate' }
      ],
      [{ text: purchasesButton, callback_data: 'premium_purchases' }],
      [{ text: whyPaidButton, callback_data: 'premium_why_paid' }],
      [{ text: backButton, callback_data: 'back_to_menu' }]
    ];
    
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  }



  async mainMenu(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    // Проверяем, является ли пользователь админом
    const isAdmin = await this.userService.isUserAdmin(userId);
    
    const message = this.localizationService.getText(userLanguage, 'main_menu_title');
    
    const inlineMainMenu = this.keyboardGenerators.generateInlineMainMenu(userLanguage, isAdmin);
    
    // Условная кнопка: "Добавить семейную трату"
    // Показываем только если пользователь премиум и состоит в семье
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      const userFamily = await this.familyService.getUserFamily(userId);
      if (isPremium && userFamily) {
        const addExpenseText = this.localizationService.getText(userLanguage, 'family_add_expense');
        const addExpenseButtonRow = [{ text: addExpenseText, callback_data: 'family_add_expense' }];
        // Вставляем рядом с пунктом семейного меню, если он есть; иначе добавляем в конец
        const familyRowIndex = inlineMainMenu.findIndex(row => Array.isArray(row) && row.some(btn => btn && btn.callback_data === 'family'));
        if (familyRowIndex >= 0) {
          inlineMainMenu.splice(familyRowIndex + 1, 0, addExpenseButtonRow);
        } else {
          inlineMainMenu.push(addExpenseButtonRow);
        }
      }
    } catch (e) {
      // В случае ошибки условий просто показываем базовое меню
    }
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineMainMenu
      }
    });
  }
}

module.exports = CommandHandlers;
