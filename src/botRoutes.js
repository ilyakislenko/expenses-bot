module.exports = function registerBotRoutes(bot, handlers) {
  const { errorHandler, commandHandlers, messageHandlers, callbackHandlers, userEditState, ExpenseService, UserService, currencyUtils } = handlers;

  // Команды
  bot.command('start', errorHandler((ctx) => commandHandlers.start(ctx)));
  bot.command('help', errorHandler((ctx) => commandHandlers.help(ctx)));
  bot.command('total', errorHandler((ctx) => commandHandlers.total(ctx)));
  bot.command('history', errorHandler((ctx) => commandHandlers.dailyHistory(ctx)));
  bot.command('stats', errorHandler((ctx) => commandHandlers.stats(ctx)));
  bot.command('export', errorHandler((ctx) => commandHandlers.exportData(ctx)));
  bot.command('undo', errorHandler((ctx) => commandHandlers.undo(ctx)));
  bot.command('categories', errorHandler((ctx) => commandHandlers.categories(ctx)));
  bot.command('currency', errorHandler((ctx) => commandHandlers.currency(ctx)));
  bot.command('timezone', errorHandler((ctx) => commandHandlers.timezone(ctx)));
  bot.command('settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
  bot.command('limits', errorHandler((ctx) => commandHandlers.limits(ctx)));
  bot.command('menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx)));
  bot.command('cancel', async (ctx) => {
    if (userEditState.has(ctx.from.id)) {
      userEditState.delete(ctx.from.id);
      await ctx.reply('Редактирование отменено.');
    } else {
      await ctx.reply('Нет активного редактирования.');
    }
  });

  // Текстовые сообщения
  bot.on('text', errorHandler((ctx) => messageHandlers.handleExpense(ctx)));

  // Callback actions
  bot.action(/^category\|/, (ctx) => callbackHandlers.handleCategorySelection(ctx));
  bot.action('cancel', (ctx) => callbackHandlers.handleCancel(ctx));
  bot.action('menu', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.mainMenu(ctx);
  }));
  bot.action('stats', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.stats(ctx);
  }));
  bot.action('history', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.dailyHistory(ctx);
  }));
  bot.action('categories', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.categories(ctx);
  }));
  bot.action('settings', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.settings(ctx);
  }));
  bot.action('undo', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.undo(ctx);
  }));
  bot.action('help', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.help(ctx);
  }));
  bot.action('limits', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.limits(ctx);
  }));
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
  });
  bot.action('change_currency', async (ctx) => {
    await commandHandlers.currency(ctx);
  });
  bot.action('change_timezone', async (ctx) => {
    await commandHandlers.timezone(ctx);
  });
  bot.action('change_language', async (ctx) => {
    await commandHandlers.language(ctx);
  });
  bot.action(/^tz\|/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx)));
  bot.action(/^time\|/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx)));
  bot.action(/^set_language\|/, errorHandler((ctx) => callbackHandlers.handleLanguageSelection(ctx)));
  // Захардкоженные переходы "назад" для каждой страницы
  bot.action('back_to_menu', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.mainMenu(ctx);
  }));
  
  bot.action('back_to_settings', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.settings(ctx);
  }));
  
  bot.action('back_to_categories', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.categories(ctx);
  }));
  
  bot.action('back_to_history', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.dailyHistory(ctx);
  }));
  
  bot.action('back_to_stats', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.stats(ctx);
  }));
  
  // Универсальный обработчик для остальных случаев
  bot.action('back', errorHandler(async (ctx) => {
    await callbackHandlers.handleBack(ctx);
  }));
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
  });
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
  });
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
  });
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
  });
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
  });
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
  });

  // Глобальный обработчик ошибок
  bot.catch((error, ctx) => {
    console.error('Bot error:', error);
    ctx.reply('An unexpected error occurred. Please try again later.');
  });
}; 