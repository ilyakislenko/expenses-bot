module.exports = function registerBotRoutes(bot, handlers) {
  const { errorHandler, commandHandlers, messageHandlers, callbackHandlers, adminHandlers, incomeHandlers, recurringExpenseHandlers, expenseHandlers, budgetHandlers, exportHandlers, stateService } = handlers;
  const { BACK_VIEW_PATTERN } = require('./handlers/ExpenseHandlers');

  // Импортируем middleware для автоматической очистки состояний
  const stateCleanupMiddleware = require('./middleware/stateCleanupMiddleware');

  // Регистрируем глобальный middleware для автоматической очистки состояний
  bot.use(stateCleanupMiddleware(handlers));

  // username/first_name из ctx.from — в БД при каждом изменении (поиск приглашаемых по username)
  const profileRefreshMiddleware = require('./middleware/profileRefreshMiddleware');
  bot.use(profileRefreshMiddleware(handlers.userService.userRepository));

  // Команды
  bot.command('start', errorHandler((ctx) => commandHandlers.start(ctx))); // приветствие и главная клавиатура
  bot.command('help', errorHandler((ctx) => commandHandlers.help(ctx))); // короткая справка
  bot.command('stats', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // обзор текущего периода
  bot.command('total', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // обзор текущего периода
  bot.command('categories', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // категории — в обзоре
  bot.command('history', errorHandler((ctx) => expenseHandlers.showDay(ctx, 0, 0))); // записи за сегодня
  bot.command('export', errorHandler((ctx) => exportHandlers.open(ctx))); // экспорт CSV: период и фильтр
  bot.command('undo', errorHandler((ctx) => commandHandlers.undo(ctx))); // отмена последней записи
  bot.command('currency', errorHandler((ctx) => commandHandlers.currency(ctx))); // основная валюта
  bot.command('timezone', errorHandler((ctx) => commandHandlers.timezone(ctx))); // часовой пояс
  bot.command('settings', errorHandler((ctx) => commandHandlers.settings(ctx))); // настройки
  bot.command('limits', errorHandler((ctx) => commandHandlers.premiumSubscription(ctx))); // лимиты и премиум
  // Требования Telegram Payments: обязательные команды поддержки и политики
  bot.command('paysupport', errorHandler((ctx) => commandHandlers.paysupport(ctx)));
  bot.command('terms', errorHandler((ctx) => commandHandlers.terms(ctx)));
  bot.command('privacy', errorHandler((ctx) => commandHandlers.privacy(ctx)));
  bot.command('refund', errorHandler((ctx) => commandHandlers.refund(ctx)));
  bot.command('family', errorHandler((ctx) => commandHandlers.family(ctx))); // семейный бюджет
  bot.command('menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx))); // «☰ Ещё»
  bot.command('income', errorHandler((ctx) => incomeHandlers.showMenu(ctx))); // доходы за период
  bot.command('recurring', errorHandler((ctx) => recurringExpenseHandlers.showMenu(ctx))); // ежемесячные регулярные траты
  bot.command('cancel', errorHandler(async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    // Отменяем любой ожидаемый ввод: правку записи, черновик траты, доход, бюджет, регулярную трату и т.д.
    const hadInput = stateService.hasUserEditState(userId) || stateService.hasPendingExpense(userId)
      || !!stateService.getPendingRecurring(userId) || stateService.hasUserState(userId);
    stateService.clearUserState(userId);
    await ctx.reply(handlers.localizationService.getText(userLanguage, hadInput ? 'input_canceled' : 'no_active_state'));
  }));

  // Custom categories (premium)
  bot.action('custom_categories', errorHandler((ctx) => callbackHandlers.handleCustomCategoriesMenu(ctx)));
  bot.action('custom_categories_add', errorHandler((ctx) => callbackHandlers.handleCustomCategoriesAdd(ctx)));
  bot.action('custom_categories_manage', errorHandler((ctx) => callbackHandlers.handleCustomCategoriesManage(ctx)));
  bot.action(/^custom_categories_delete\|(\d+)$/, errorHandler((ctx) => callbackHandlers.handleCustomCategoriesDelete(ctx)));
  bot.action(/^custom_categories_rename\|(\d+)$/, errorHandler((ctx) => callbackHandlers.handleCustomCategoriesRename(ctx)));

  // Доходы
  bot.action('income_menu', errorHandler((ctx) => incomeHandlers.showMenu(ctx)));
  bot.action('income_add', errorHandler((ctx) => incomeHandlers.startAdd(ctx)));
  bot.action('income_currency', errorHandler((ctx) => incomeHandlers.showCurrencyPicker(ctx, 'income')));
  bot.action('change_income_currency', errorHandler((ctx) => incomeHandlers.showCurrencyPicker(ctx, 'settings')));
  bot.action(/^set_income_currency\|[A-Z]{3}\|(income|settings)$/, errorHandler((ctx) => incomeHandlers.setCurrency(ctx, (c) => commandHandlers.settingsCurrencies(c))));
  bot.action(/^in\|(\d+)$/, errorHandler((ctx) => incomeHandlers.showCard(ctx)));
  bot.action(/^income_delete\|(\d+)$/, errorHandler((ctx) => incomeHandlers.deleteIncome(ctx)));
  bot.action(/^income_undo\|(\d+)$/, errorHandler((ctx) => incomeHandlers.undoIncome(ctx)));

  // Регулярные (ежемесячные) траты
  bot.action('recurring_menu', errorHandler((ctx) => recurringExpenseHandlers.showMenu(ctx)));
  bot.action('recurring_add', errorHandler((ctx) => recurringExpenseHandlers.startAdd(ctx)));
  bot.action(/^rc\|(\d+)$/, errorHandler((ctx) => recurringExpenseHandlers.showCard(ctx)));
  bot.action(/^recurring_category\|(\d+)$/, errorHandler((ctx) => recurringExpenseHandlers.handleCategorySelection(ctx)));
  bot.action(/^recurring_delete\|(\d+)$/, errorHandler((ctx) => recurringExpenseHandlers.delete(ctx)));

  const back = `(${BACK_VIEW_PATTERN})`;
  bot.action(/^ov\|(-?\d+)$/, errorHandler((ctx) => expenseHandlers.showOverview(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^oc\|(\d+)\|(-?\d+)\|(\d+)$/, errorHandler((ctx) => expenseHandlers.showCategoryList(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10), parseInt(ctx.match[3], 10))));
  bot.action(/^dy\|(-?\d+)\|(\d+)$/, errorHandler((ctx) => expenseHandlers.showDay(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10))));
  bot.action(/^fd\|(\d+)$/, errorHandler((ctx) => expenseHandlers.showFamilyDay(ctx, parseInt(ctx.match[1], 10))));
  bot.action(new RegExp(`^ex\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleOpenCard(ctx)));
  bot.action(new RegExp(`^xd\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleDelete(ctx)));
  bot.action(new RegExp(`^xc\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleChooseCategory(ctx)));
  bot.action(new RegExp(`^xs\\|(\\d+)\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleSetCategory(ctx)));
  bot.action(/^xe\|(\d+)$/, errorHandler((ctx) => expenseHandlers.handleEdit(ctx)));
  bot.action(new RegExp(`^xf\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleFamilyToggle(ctx, true)));
  bot.action(new RegExp(`^xu\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleFamilyToggle(ctx, false)));
  bot.action('noop', (ctx) => ctx.answerCbQuery().catch(() => {})); // номер страницы и пустые ячейки пагинации
  bot.action(/^rp\|(-?\d+)$/, errorHandler((ctx) => expenseHandlers.showReport(ctx, parseInt(ctx.match[1], 10)))); // итоги периода

  // Бюджеты (премиум): список, карточка, новый/изменённый лимит, удаление
  bot.action('bg_menu', errorHandler((ctx) => budgetHandlers.showMenu(ctx)));
  bot.action(/^bg\|(\d+)$/, errorHandler((ctx) => budgetHandlers.showCard(ctx)));
  bot.action('bg_cat', errorHandler((ctx) => budgetHandlers.chooseCategory(ctx)));
  bot.action(/^bg_add\|(total|\d+)$/, errorHandler((ctx) => budgetHandlers.startSetAmount(ctx)));
  bot.action(/^bg_del\|(\d+)$/, errorHandler((ctx) => budgetHandlers.delete(ctx)));

  // Текстовые сообщения
  bot.on('text', errorHandler((ctx) => messageHandlers.handleExpense(ctx))); // ввод трат, доходов и кнопки клавиатуры

  // Черновик траты
  bot.action(/^category\|(\d+)$/, errorHandler((ctx) => expenseHandlers.handleCategorySelection(ctx))); // выбор категории
  bot.action('cancel', (ctx) => callbackHandlers.handleCancel(ctx)); // отмена черновика

  // «☰ Ещё» и его разделы
  bot.action('menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx)));
  bot.action('back_to_menu', errorHandler((ctx) => commandHandlers.mainMenu(ctx)));
  bot.action('back', errorHandler((ctx) => callbackHandlers.handleBack(ctx)));
  bot.action('help', errorHandler((ctx) => commandHandlers.help(ctx)));
  bot.action('family', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.family(ctx);
  }));
  // Экспорт CSV
  bot.action('export', errorHandler((ctx) => exportHandlers.open(ctx)));
  bot.action('xp_menu', errorHandler((ctx) => exportHandlers.showMenu(ctx)));
  bot.action(/^xp\|(day|week|cur|prev|all)$/, errorHandler((ctx) => exportHandlers.exportPeriod(ctx, ctx.match[1])));
  bot.action('xp_range', errorHandler((ctx) => exportHandlers.showRangeInput(ctx)));
  bot.action('xp_cats', errorHandler((ctx) => exportHandlers.showCategories(ctx)));
  bot.action(/^xp_cat\|(\d+)$/, errorHandler((ctx) => exportHandlers.toggleCategory(ctx, Number(ctx.match[1]))));
  bot.action(/^xp_cats_all\|([01])$/, errorHandler((ctx) => exportHandlers.setAllCategories(ctx, ctx.match[1] === '1')));
  bot.action('xp_cats_done', errorHandler((ctx) => exportHandlers.categoriesDone(ctx)));
  bot.action('limits', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.premiumSubscription(ctx);
  }));

  // Настройки
  bot.action('settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
  bot.action('back_to_settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
  bot.action('settings_currencies', errorHandler((ctx) => commandHandlers.settingsCurrencies(ctx)));
  // set_currency|<код>[|ob]: `|ob` — шаг онбординга, после него выбор часового пояса
  bot.action(/^set_currency\|([A-Z]{3})(\|ob)?$/, errorHandler(async (ctx) => {
    const userId = ctx.from.id;
    const currency = ctx.match[1];
    const onboarding = !!ctx.match[2];
    const validation = handlers.enhancedValidator.validateCurrency(currency);
    if (!validation.isValid) return ctx.answerCbQuery();
    await handlers.userService.setUserCurrency(userId, currency);
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    await ctx.answerCbQuery(handlers.localizationService.getText(userLanguage, 'currency_set', { currency }));
    if (onboarding) {
      await commandHandlers.timezone(ctx, { onboarding: true });
      return;
    }
    await commandHandlers.settingsCurrencies(ctx);
  })); // установка основной валюты
  bot.action('change_currency', errorHandler((ctx) => commandHandlers.currency(ctx)));
  // «Назад» на шагах онбординга — к предыдущему шагу, а не в Настройки
  bot.action('ob_language', errorHandler((ctx) => commandHandlers.onboardingLanguage(ctx)));
  bot.action('ob_currency', errorHandler((ctx) => commandHandlers.currency(ctx, { onboarding: true })));
  bot.action('change_timezone', errorHandler((ctx) => commandHandlers.timezone(ctx)));
  bot.action('change_language', errorHandler((ctx) => commandHandlers.language(ctx)));
  bot.action('change_period_start', errorHandler((ctx) => callbackHandlers.handleChangePeriodStart(ctx)));
  bot.action('toggle_reminders', errorHandler((ctx) => callbackHandlers.handleToggleReminders(ctx)));
  bot.action('configure_reminder_hours', errorHandler((ctx) => callbackHandlers.handleConfigureReminderHours(ctx)));
  bot.action(/^toggle_reminder_hour\|(\d{1,2})$/, errorHandler((ctx) => callbackHandlers.handleToggleReminderHour(ctx)));
  bot.action('save_reminder_hours', errorHandler((ctx) => callbackHandlers.handleSaveReminderHours(ctx)));
  bot.action('clear_reminder_hours', errorHandler((ctx) => callbackHandlers.handleClearReminderHours(ctx)));
  bot.action('toggle_daily_summary', errorHandler((ctx) => callbackHandlers.handleToggleDailySummary(ctx)));
  bot.action('daily_summary_hour', errorHandler((ctx) => callbackHandlers.handleDailySummaryHour(ctx)));
  bot.action(/^set_daily_summary_hour\|(\d{1,2})$/, errorHandler((ctx) => callbackHandlers.handleSetDailySummaryHour(ctx)));
  bot.action('bug_report', errorHandler((ctx) => callbackHandlers.handleBugReport(ctx)));
  // time|<час>|<минуты>[|ob] и set_language|<код>[|ob]: `|ob` — шаг онбординга
  bot.action(/^time\|(\d{1,2})\|(\d{1,2})(\|ob)?$/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx)));
  bot.action(/^set_language\|([a-z]{2})(\|ob)?$/, errorHandler((ctx) => callbackHandlers.handleLanguageSelection(ctx)));

  // Отмена ввода новой суммы/описания
  bot.action('cancel_edit', errorHandler(async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    if (stateService.hasUserEditState(userId)) {
      stateService.deleteUserEditState(userId);
      await ctx.answerCbQuery();
      await ctx.editMessageText(handlers.localizationService.getText(userLanguage, 'edit_canceled'));
    } else {
      await ctx.answerCbQuery(handlers.localizationService.getText(userLanguage, 'edit_no_active'));
    }
  }));

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
  bot.action('family_daily_history', errorHandler((ctx) => expenseHandlers.showFamilyDay(ctx, 0)));
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
  bot.action('premium_donate', errorHandler((ctx) => callbackHandlers.handlePremiumDonate(ctx)));
  bot.action(/^premium_purchases(?:\|(\d+))?$/, errorHandler((ctx) => callbackHandlers.handlePremiumPurchases(ctx)));
  bot.action('premium_subscription', errorHandler((ctx) => callbackHandlers.handlePremiumSubscription(ctx)));

  // Перед оплатой: сумма должна совпадать с текущим тарифом (старые ссылки на оплату не истекают),
  // платит тот, для кого создана ссылка, и вторая месячная подписка не оформляется
  const preCheckoutRejectionKeys = {
    foreign_payer: 'payment_foreign_payer',
    subscription_active: 'payment_subscription_already_active'
  };
  bot.on('pre_checkout_query', errorHandler(async (ctx) => {
    const check = await handlers.paymentService.checkPreCheckout(ctx.preCheckoutQuery, ctx.from.id);
    if (check.ok) {
      await ctx.answerPreCheckoutQuery(true);
      return;
    }
    handlers.logger.warn('Pre-checkout rejected', { userId: ctx.from.id, reason: check.reason, payload: ctx.preCheckoutQuery.invoice_payload });
    const userLanguage = await handlers.userService.getUserLanguage(ctx.from.id);
    const textKey = preCheckoutRejectionKeys[check.reason] || 'payment_outdated';
    await ctx.answerPreCheckoutQuery(false, handlers.localizationService.getText(userLanguage, textKey));
  }));

  // Возврат звёзд (из админки или со стороны Telegram): снимаем премиум по этому платежу и отменяем подписку.
  // Пользователю Telegram сам показывает сообщение о возврате.
  bot.on('message', errorHandler(async (ctx, next) => {
    const refund = ctx.message.refunded_payment;
    if (!refund) return next();
    await handlers.paymentService.revokeRefundedPayment(refund.telegram_payment_charge_id);
  }));

  bot.on('successful_payment', errorHandler(async (ctx) => {
    const paymentService = handlers.paymentService;
    const result = await paymentService.handleSuccessfulPayment(
      ctx.message.successful_payment,
      handlers.userService
    );

    const userLanguage = await handlers.userService.getUserLanguage(ctx.from.id);

    if (result.type === 'donation') {
      // Для донатов показываем сообщение о благодарности
      const donationSuccessText = handlers.localizationService.getText(userLanguage, 'donation_success');
      await ctx.reply(donationSuccessText, { parse_mode: 'Markdown' });
    } else if (result.type === 'premium_subscription') {
      if (result.status === 'duplicate') return; // повторная доставка того же платежа
      if (result.isRenewal) {
        // Автопродление подписки Stars
        const timezone = await handlers.userService.getUserTimezone(ctx.from.id);
        const renewedText = handlers.localizationService.getText(userLanguage, 'subscription_renewed', {
          date: handlers.formatter.formatDate(result.newExpiryDate, timezone)
        });
        await ctx.reply(renewedText);
        return;
      }
      // Для премиум подписок показываем сообщение об активации
      const successText = handlers.localizationService.getText(userLanguage, 'payment_success');
      await ctx.reply(successText, { parse_mode: 'Markdown' });
    } else {
      // Для неизвестных типов платежей показываем общее сообщение
      const generalSuccessText = handlers.localizationService.getText(userLanguage, 'general_payment_success');
      await ctx.reply(generalSuccessText, { parse_mode: 'Markdown' });
    }
  }));

  // ========================================
  // ADMIN PANEL CALLBACK HANDLERS
  // ========================================

  // Главная панель админа
  bot.action('panel_main', errorHandler((ctx) => adminHandlers.showAdminPanel(ctx)));

  // Статистика
  bot.action('panel_stats', errorHandler((ctx) => adminHandlers.showStats(ctx)));

  // Воронка по источникам (30 / 90 / 0 — за всё время)
  bot.action(/^panel_funnel_(\d+)$/, errorHandler((ctx) => adminHandlers.showFunnel(ctx, parseInt(ctx.match[1], 10))));

  // Управление пользователями
  bot.action('panel_users', errorHandler((ctx) => adminHandlers.showUsers(ctx, 1)));
  bot.action(/panel_users_page_(\d+)/, errorHandler((ctx) => {
    const page = parseInt(ctx.match[1], 10);
    return adminHandlers.showUsers(ctx, page);
  }));

  // Баг-репорты
  bot.action('panel_bug_reports', errorHandler((ctx) => adminHandlers.showBugReports(ctx)));
  bot.action('panel_all_bug_reports', errorHandler((ctx) => adminHandlers.showBugReportList(ctx)));
  bot.action('panel_new_bug_reports', errorHandler((ctx) => adminHandlers.showBugReportList(ctx, 'new')));

  // Донаты
  bot.action('panel_donations', errorHandler((ctx) => adminHandlers.showDonations(ctx)));

  // Премиум
  bot.action('panel_premium', errorHandler((ctx) => adminHandlers.showPremiumStats(ctx)));

  // Администраторы
  bot.action('panel_managers', errorHandler((ctx) => adminHandlers.showAdmins(ctx)));

  // Поиск
  bot.action('panel_search', errorHandler((ctx) => adminHandlers.initiateSearch(ctx)));

  // Действия с пользователями
  bot.action(/panel_user_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.showUserDetails(ctx, targetUserId);
  }));
  bot.action(/panel_refund_search_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.initiateRefundSearch(ctx, targetUserId);
  }));
  bot.action('panel_refund_exec', errorHandler((ctx) => {
    return adminHandlers.executeRefund(ctx);
  }));

  bot.action(/panel_promote_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.promoteUser(ctx, targetUserId);
  }));

  bot.action(/panel_demote_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.demoteUser(ctx, targetUserId);
  }));

  // Управление премиумом
  bot.action(/panel_grant_premium_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.showGrantPremiumOptions(ctx, targetUserId);
  }));

  bot.action(/panel_grant_premium_days_(\d+)_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    const days = parseInt(ctx.match[2], 10);
    return adminHandlers.grantPremium(ctx, targetUserId, days);
  }));

  bot.action(/panel_revoke_premium_(\d+)/, errorHandler((ctx) => {
    const targetUserId = parseInt(ctx.match[1], 10);
    return adminHandlers.revokePremium(ctx, targetUserId);
  }));

  // Массовые уведомления
  bot.action('panel_broadcast', errorHandler((ctx) => adminHandlers.initiateBroadcast(ctx)));

  bot.action('panel_broadcast_confirm', errorHandler((ctx) => adminHandlers.confirmBroadcast(ctx)));

  // Общие действия
  bot.action('back_to_main', errorHandler((ctx) => commandHandlers.start(ctx)));

  // Кнопки из старых сообщений, для которых больше нет обработчика
  bot.on('callback_query', errorHandler(async (ctx) => {
    const userLanguage = await handlers.userService.getUserLanguage(ctx.from.id);
    await ctx.answerCbQuery(handlers.localizationService.getText(userLanguage, 'button_outdated'), { show_alert: true });
  }));
};
