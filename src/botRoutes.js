module.exports = function registerBotRoutes(bot, handlers) {
  const { errorHandler, commandHandlers, messageHandlers, callbackHandlers, userEditState, ExpenseService, UserService, currencyUtils } = handlers;

  // Команды
  bot.command('start', errorHandler((ctx) => commandHandlers.start(ctx))); // главное меню бота
  bot.command('help', errorHandler((ctx) => commandHandlers.help(ctx))); // справка и команды
  bot.command('total', errorHandler((ctx) => commandHandlers.total(ctx))); // общая статистика расходов
  bot.command('history', errorHandler((ctx) => commandHandlers.dailyHistory(ctx))); // история расходов за день
  bot.command('stats', errorHandler((ctx) => commandHandlers.stats(ctx))); // детальная статистика по категориям
  bot.command('export', errorHandler((ctx) => commandHandlers.exportData(ctx))); // экспорт данных в CSV
  bot.command('undo', errorHandler((ctx) => commandHandlers.undo(ctx))); // отмена последней записи
  bot.command('categories', errorHandler((ctx) => commandHandlers.categories(ctx))); // управление категориями
  bot.command('currency', errorHandler((ctx) => commandHandlers.currency(ctx))); // настройка валюты пользователя
  bot.command('timezone', errorHandler((ctx) => commandHandlers.timezone(ctx))); // настройка часового пояса
  bot.command('settings', errorHandler((ctx) => commandHandlers.settings(ctx))); // настройки пользователя
  bot.command('limits', errorHandler((ctx) => commandHandlers.limits(ctx))); // лимиты и премиум функции
  bot.command('family', errorHandler((ctx) => commandHandlers.family(ctx))); // управление семейными группами
  bot.command('menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx))); // главное меню
  bot.command('cancel', async (ctx) => {
    if (userEditState.has(ctx.from.id)) {
      userEditState.delete(ctx.from.id);
      await ctx.reply('Редактирование отменено.');
    } else {
      await ctx.reply('Нет активного редактирования.');
    }
  });

  // Текстовые сообщения
  bot.on('text', errorHandler((ctx) => messageHandlers.handleExpense(ctx))); // обработка ввода расходов

  // Callback actions
  bot.action(/^category\|/, (ctx) => callbackHandlers.handleCategorySelection(ctx)); // выбор категории для расхода
  bot.action('cancel', (ctx) => callbackHandlers.handleCancel(ctx)); // отмена операции
  bot.action('menu', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.mainMenu(ctx);
  })); // главное меню
  bot.action('stats', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.stats(ctx);
  })); // детальная статистика по категориям
  bot.action('history', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.dailyHistory(ctx);
  })); // история расходов за день
  bot.action('categories', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.categories(ctx);
  })); // управление категориями
  bot.action('settings', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.settings(ctx);
  })); // настройки пользователя
  bot.action('undo', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.undo(ctx);
  })); // отмена последней записи
  bot.action('help', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.help(ctx);
  })); // справка и команды
  bot.action('limits', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.limits(ctx);
  })); // лимиты и премиум функции
  bot.action('family', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.family(ctx);
  })); // управление семейными группами
  bot.action(/^set_currency\|/, async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    const currency = ctx.callbackQuery.data.split('|')[1];
    await handlers.userService.setUserCurrency(userId, currency);
    
    const currencySetText = handlers.localizationService.getText(userLanguage, 'currency_set', { currency });
    const currencyUpdatedText = handlers.localizationService.getText(userLanguage, 'currency_updated', { currency });
    const backText = handlers.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.answerCbQuery(currencySetText);
    await ctx.editMessageText(currencyUpdatedText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'back_to_settings' }]
        ]
      }
    });
  }); // установка валюты пользователя
  bot.action('change_currency', async (ctx) => {
    await commandHandlers.currency(ctx);
  }); // выбор валюты
  bot.action('change_timezone', async (ctx) => {
    await commandHandlers.timezone(ctx);
  }); // выбор часового пояса
  bot.action('change_language', async (ctx) => {
    await commandHandlers.language(ctx);
  }); // выбор языка интерфейса
  bot.action(/^tz\|/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx))); // установка часового пояса
  bot.action(/^time\|/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx))); // установка часового пояса (альтернативный формат)
  bot.action(/^set_language\|/, errorHandler((ctx) => callbackHandlers.handleLanguageSelection(ctx))); // установка языка интерфейса
  // Захардкоженные переходы "назад" для каждой страницы
  bot.action('back_to_menu', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.mainMenu(ctx);
  })); // возврат в главное меню
  
  bot.action('back_to_settings', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.settings(ctx);
  })); // возврат в настройки
  
  bot.action('back_to_categories', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.categories(ctx);
  })); // возврат к списку категорий
  
  bot.action('back_to_history', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.dailyHistory(ctx);
  })); // возврат к истории расходов
  
  bot.action('back_to_stats', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.stats(ctx);
  })); // возврат к статистике
  
  // Универсальный обработчик для остальных случаев
  bot.action('back', errorHandler(async (ctx) => {
    await callbackHandlers.handleBack(ctx);
  })); // универсальный возврат назад
  bot.action(/^show_category\|(\d+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    const userId = ctx.from.id;
    

    
    const userCurrency = await handlers.userService.getUserCurrency(userId);
    const userTimezone = await handlers.userService.getUserTimezone(userId);
    const expenses = await handlers.expenseService.getExpensesByCategoryId(userId, categoryId, 'month');
    if (!expenses.length) {
      const userLanguage = await handlers.userService.getUserLanguage(userId);
      const noExpensesText = handlers.localizationService.getText(userLanguage, 'no_expenses_category');
      return ctx.reply(noExpensesText);
    }
    const formatter = handlers.formatter;
    const convertedAmounts = await Promise.all(
      expenses.map(e => currencyUtils.convert(Number(e.amount), e.currency || 'RUB', userCurrency))
    );
    const total = {
      total: convertedAmounts.reduce((sum, v) => sum + v, 0),
      count: expenses.length,
      currency: userCurrency
    };
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    let message = await formatter.formatStats(total, [], userCurrency, 'месяц', handlers.localizationService, userLanguage) + '\n' + formatter.formatExpenseList(expenses, userTimezone, handlers.localizationService, userLanguage);
    const editText = handlers.localizationService.getText(userLanguage, 'button_edit');
    const backText = handlers.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.reply(message, { parse_mode: 'Markdown',reply_markup: {
      inline_keyboard: [
        [
          { text: editText, callback_data: `edit_category|${categoryId}` },
          { text: backText, callback_data: 'back_to_categories' }
        ]
      ]
    } });
  }); // список расходов по конкретной категории
  bot.action(/^delete_expense\|(\d+)$/, async (ctx) => {
    const expenseId = ctx.match[1];
    const userId = ctx.from.id;
    const deleted = await handlers.expenseService.deleteExpenseById(userId, expenseId);
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    if (deleted) {
      const deletedText = handlers.localizationService.getText(userLanguage, 'callback_deleted');
      await ctx.answerCbQuery(deletedText);
      await ctx.editMessageText(deletedText);
    } else {
      const deleteErrorText = handlers.localizationService.getText(userLanguage, 'callback_delete_error');
      await ctx.answerCbQuery(deleteErrorText);
    }
  }); // удаление записи расхода
  bot.action(/^edit_expense\|(\d+)$/, async (ctx) => {
    const expenseId = ctx.match[1];
    const userId = ctx.from.id;
    

    
    handlers.stateService.setUserEditState(userId, expenseId);
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    const editInstructionsText = handlers.localizationService.getText(userLanguage, 'edit_instructions');
    const cancelText = handlers.localizationService.getText(userLanguage, 'button_cancel');
    
    await ctx.reply(editInstructionsText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: cancelText, callback_data: 'cancel_edit' }]
        ]
      }
    });
  }); // режим редактирования записи расхода
  bot.action('cancel_edit', async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    
    if (handlers.stateService.hasUserEditState(ctx.from.id)) {
      handlers.stateService.deleteUserEditState(ctx.from.id);
      const editCanceledText = handlers.localizationService.getText(userLanguage, 'edit_canceled');
      await ctx.editMessageText(editCanceledText);
    } else {
      const editNoActiveText = handlers.localizationService.getText(userLanguage, 'edit_no_active');
      await ctx.answerCbQuery(editNoActiveText);
    }
  }); // отмена редактирования записи
  bot.action('edit_history', async (ctx) => {
    const userId = ctx.from.id;
    

    
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    const userTimezone = await handlers.userService.getUserTimezone(userId);
    const expenses = await handlers.expenseService.getDailyExpenses(userId);
    if (!expenses.length) {
      const noExpensesPeriodText = handlers.localizationService.getText(userLanguage, 'no_expenses_period');
      return ctx.reply(noExpensesPeriodText);
    }
    const formatter = handlers.formatter;
    for (const expense of expenses) {
      const { text, reply_markup } = formatter.formatExpenseWithActions(expense, userTimezone, handlers.localizationService, userLanguage);
      await ctx.reply(text, { reply_markup, parse_mode: 'Markdown' });
    }
    const exitEditModeText = handlers.localizationService.getText(userLanguage, 'callback_edit_mode');
    const backText = handlers.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.reply(exitEditModeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'back_to_history' }]
        ]
      }
    });
  }); // режим редактирования истории расходов за день
  bot.action('edit_family_history', async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    
    // Проверяем премиум статус
    const isPremium = await handlers.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      const premiumRequiredText = handlers.localizationService.getText(userLanguage, 'premium_required');
      return ctx.answerCbQuery(premiumRequiredText);
    }
    
    // Получаем информацию о семье пользователя
    const userFamily = await handlers.familyService.getUserFamily(userId);
    if (!userFamily) {
      const notFamilyMemberText = handlers.localizationService.getText(userLanguage, 'not_family_member');
      return ctx.answerCbQuery(notFamilyMemberText);
    }
    
    const userTimezone = await handlers.userService.getUserTimezone(userId);
    const { expenses } = await handlers.familyService.getFamilyDailyStats(userFamily.id, userTimezone);
    
    if (!expenses.length) {
      const noExpensesPeriodText = handlers.localizationService.getText(userLanguage, 'no_expenses_period');
      return ctx.answerCbQuery(noExpensesPeriodText);
    }
    
    const formatter = handlers.formatter;
    for (const expense of expenses) {
      // Показываем кнопки редактирования только для трат текущего пользователя
      const { text, reply_markup } = formatter.formatExpenseWithActions(
        expense, 
        userTimezone, 
        handlers.localizationService, 
        userLanguage,
        Number(expense.user_id) === userId // Приводим к числу для корректного сравнения
      );
      await ctx.reply(text, { reply_markup, parse_mode: 'Markdown' });
    }
    
    const exitEditModeText = handlers.localizationService.getText(userLanguage, 'callback_edit_mode');
    const backText = handlers.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.reply(exitEditModeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'family_menu' }]
        ]
      }
    });
  }); // режим редактирования семейных трат за день
  bot.action(/^edit_category\|(\d+)$/, async (ctx) => {
    const categoryId = ctx.match[1];
    const userId = ctx.from.id;
    

    
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    const userTimezone = await handlers.userService.getUserTimezone(userId);
    const expenses = await handlers.expenseService.getExpensesByCategoryId(userId, categoryId, 'month');
    if (!expenses.length) {
      const noCardsText = handlers.localizationService.getText(userLanguage, 'callback_no_cards');
      return ctx.reply(noCardsText);
    }
    const formatter = handlers.formatter;
    for (const expense of expenses) {
      const { text, reply_markup } = formatter.formatExpenseWithActions(expense, userTimezone, handlers.localizationService, userLanguage);
      await ctx.reply(text, { reply_markup, parse_mode: 'Markdown' });
    }
    const exitEditModeText = handlers.localizationService.getText(userLanguage, 'callback_edit_mode');
    const backText = handlers.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.reply(exitEditModeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: `show_category|${categoryId}` }]
        ]
      }
    });
  }); // режим редактирования расходов по категории

  // ========================================
  // FAMILY CALLBACK HANDLERS
  // ========================================
  
  bot.action('family_create', errorHandler((ctx) => callbackHandlers.handleFamilyCreate(ctx)));
  bot.action('family_join', errorHandler((ctx) => callbackHandlers.handleFamilyJoin(ctx)));
  bot.action('family_invite', errorHandler((ctx) => callbackHandlers.handleFamilyInvite(ctx)));
  bot.action('family_active_invitations', errorHandler((ctx) => callbackHandlers.handleFamilyActiveInvitations(ctx)));
  bot.action('family_members', errorHandler((ctx) => callbackHandlers.handleFamilyMembers(ctx)));
  bot.action('family_stats', errorHandler((ctx) => callbackHandlers.handleFamilyStats(ctx)));
  bot.action(/^remove_member\|(\d+)$/, errorHandler((ctx) => callbackHandlers.handleRemoveMember(ctx)));
  bot.action(/^confirm_remove_member\|(\d+)$/, errorHandler((ctx) => callbackHandlers.handleConfirmRemoveMember(ctx)));
  bot.action('family_daily_history', errorHandler((ctx) => callbackHandlers.handleFamilyDailyHistory(ctx)));
  bot.action('family_export', errorHandler((ctx) => callbackHandlers.handleFamilyExport(ctx)));
  bot.action('family_add_expense', errorHandler((ctx) => callbackHandlers.handleFamilyAddExpense(ctx)));
  bot.action('family_delete', errorHandler((ctx) => callbackHandlers.handleFamilyDelete(ctx)));
  bot.action('family_delete_confirm', errorHandler((ctx) => callbackHandlers.handleFamilyDeleteConfirm(ctx)));
  bot.action('family_leave', errorHandler((ctx) => callbackHandlers.handleFamilyLeave(ctx)));
  bot.action('family_cancel', errorHandler((ctx) => callbackHandlers.handleFamilyCancel(ctx)));
  bot.action('family_menu', errorHandler((ctx) => callbackHandlers.handleFamilyMenu(ctx)));
  
  // Обработчики для приглашений (с параметрами)
  bot.action(/^accept_invitation\|(.+)$/, errorHandler((ctx) => callbackHandlers.handleAcceptInvitation(ctx)));
  bot.action(/^reject_invitation\|(.+)$/, errorHandler((ctx) => callbackHandlers.handleRejectInvitation(ctx)));
  bot.action(/^cancel_invitation\|(.+)$/, errorHandler((ctx) => callbackHandlers.handleCancelInvitation(ctx)));

  // ========================================
  // PREMIUM CALLBACK HANDLERS
  // ========================================
  
  bot.action('premium_tariffs', errorHandler((ctx) => callbackHandlers.handlePremiumTariffs(ctx)));
  bot.action('premium_why_paid', errorHandler((ctx) => callbackHandlers.handlePremiumWhyPaid(ctx)));
  bot.action('premium_subscription', errorHandler((ctx) => callbackHandlers.handlePremiumSubscription(ctx)));

  // Глобальный обработчик ошибок
  bot.catch((error, ctx) => {
    console.error('Bot error:', error);
    ctx.reply('An unexpected error occurred. Please try again later.');
  }); // обработка глобальных ошибок бота
}; 