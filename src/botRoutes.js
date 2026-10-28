module.exports = function registerBotRoutes(bot, handlers) {
  const { errorHandler, commandHandlers, messageHandlers, callbackHandlers, adminHandlers, incomeHandlers, recurringExpenseHandlers, expenseHandlers, budgetHandlers, exportHandlers, importHandlers, receiptHandlers, multiEntryHandlers, savingsHandlers, planningHandlers, achievementHandlers, assistantHandlers, stateService } = handlers;
  const ReceiptHandlers = require('./handlers/ReceiptHandlers');
  const { BACK_VIEW_PATTERN } = require('./handlers/ExpenseHandlers');

  // Импортируем middleware для автоматической очистки состояний
  const stateCleanupMiddleware = require('./middleware/stateCleanupMiddleware');

  // Регистрируем глобальный middleware для автоматической очистки состояний
  bot.use(stateCleanupMiddleware(handlers));

  // username/first_name из ctx.from — в БД при каждом изменении (поиск приглашаемых по username)
  const profileRefreshMiddleware = require('./middleware/profileRefreshMiddleware');
  bot.use(profileRefreshMiddleware(handlers.userService.userRepository));

  // Команды
  // приветствие и главная клавиатура; незаконченный опрос «🧭 Настроим бота под тебя» — продолжить с текущего вопроса
  bot.command('start', errorHandler((ctx) => handlers.onboardingHandlers.start(ctx)));
  bot.command('setup', errorHandler((ctx) => handlers.onboardingHandlers.setup(ctx))); // опрос «🧭 Настроим бота под тебя» заново
  bot.command('help', errorHandler((ctx) => commandHandlers.help(ctx))); // короткая справка
  bot.command('stats', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // обзор текущего периода
  bot.command('total', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // обзор текущего периода
  bot.command('categories', errorHandler((ctx) => expenseHandlers.showOverview(ctx, 0))); // категории — в обзоре
  bot.command('history', errorHandler((ctx) => expenseHandlers.showDay(ctx, 0, 0))); // записи за сегодня
  bot.command('export', errorHandler((ctx) => exportHandlers.open(ctx))); // экспорт CSV: период и фильтр
  bot.command('import', errorHandler((ctx) => importHandlers.showIntro(ctx))); // импорт банковской выписки
  bot.command('undo', errorHandler((ctx) => commandHandlers.undo(ctx))); // удалить последнюю запись (с подтверждением)
  bot.action(/^undo_ok\|([xi])\|(\d+)$/, errorHandler((ctx) => commandHandlers.confirmUndo(ctx)));
  bot.action('undo_no', errorHandler((ctx) => commandHandlers.cancelUndo(ctx)));
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
  bot.command('savings', errorHandler((ctx) => savingsHandlers.showMenu(ctx))); // накопления, цели, прогноз
  bot.command('achievements', errorHandler((ctx) => achievementHandlers.show(ctx))); // уровень, серия, достижения, челленджи
  bot.command('invite', errorHandler((ctx) => handlers.referralHandlers.showInvite(ctx))); // пригласить друга
  bot.command('ask', errorHandler((ctx) => assistantHandlers.handleCommand(ctx))); // вопрос боту о своих тратах
  bot.command('roast', errorHandler((ctx) => handlers.roastHandlers.showMonth(ctx))); // «😈 Разнос месяца»
  bot.command('cancel', errorHandler(async (ctx) => {
    const userId = ctx.from.id;
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    // Отменяем любой ожидаемый ввод: правку записи, черновик траты, доход, бюджет, регулярную трату и т.д.
    const hadInput = stateService.hasUserEditState(userId) || stateService.hasPendingExpense(userId)
      || stateService.hasPendingRecurring(userId) || stateService.hasUserState(userId);
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
  bot.action(/^ie\|(\d+)$/, errorHandler((ctx) => incomeHandlers.startEdit(ctx)));
  bot.action(/^it\|(\d+)$/, errorHandler((ctx) => incomeHandlers.showDatePicker(ctx))); // дата дохода
  bot.action(/^itd\|(\d+)\|(\d{8})$/, errorHandler((ctx) => incomeHandlers.setDate(ctx)));
  bot.action(/^ito\|(\d+)$/, errorHandler((ctx) => incomeHandlers.startDateInput(ctx)));

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
  bot.action(new RegExp(`^xt\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleDatePicker(ctx))); // дата записи
  bot.action(new RegExp(`^xtd\\|(\\d+)\\|(\\d{8})\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleSetDate(ctx)));
  bot.action(new RegExp(`^xto\\|(\\d+)\\|${back}$`), errorHandler((ctx) => expenseHandlers.handleOtherDate(ctx)));
  bot.action('noop', (ctx) => ctx.answerCbQuery().catch(() => {})); // номер страницы и пустые ячейки пагинации
  bot.action(/^rp\|(-?\d+)$/, errorHandler((ctx) => expenseHandlers.showReport(ctx, parseInt(ctx.match[1], 10)))); // итоги периода

  // Бюджеты (премиум): список, карточка, новый/изменённый лимит, удаление
  bot.action('bg_menu', errorHandler((ctx) => budgetHandlers.showMenu(ctx)));
  bot.action(/^bg\|(\d+)$/, errorHandler((ctx) => budgetHandlers.showCard(ctx)));
  bot.action('bg_cat', errorHandler((ctx) => budgetHandlers.chooseCategory(ctx)));
  bot.action(/^bg_add\|(total|\d+)$/, errorHandler((ctx) => budgetHandlers.startSetAmount(ctx)));
  bot.action(/^bg_del\|(\d+)$/, errorHandler((ctx) => budgetHandlers.delete(ctx)));

  // Накопления: счета, цели, долги, мастер «Обновить остатки», прогноз, настройки
  bot.action('sv', errorHandler((ctx) => savingsHandlers.showMenu(ctx)));
  bot.action(/^svp\|(\d+)$/, errorHandler((ctx) => savingsHandlers.showPot(ctx)));
  bot.action(/^svpc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.showAccountSettings(ctx)));
  bot.action(/^svgc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.showGoalSettings(ctx)));
  bot.action(/^svbc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.showDebtSettings(ctx)));
  bot.action('svn', errorHandler((ctx) => savingsHandlers.showAddMenu(ctx)));
  bot.action('svu', errorHandler((ctx) => savingsHandlers.startUpdate(ctx)));
  bot.action(/^svuk\|(\d+)$/, errorHandler((ctx) => savingsHandlers.keepUpdate(ctx)));
  bot.action('svux', errorHandler((ctx) => savingsHandlers.stopUpdate(ctx)));
  bot.action(/^svac\|(\d+)\|([A-Z]{3})$/, errorHandler((ctx) => savingsHandlers.setAccountCurrency(ctx)));
  bot.action(/^svaco\|(\d+)$/, errorHandler((ctx) => savingsHandlers.chooseOtherCurrency(ctx)));
  bot.action(/^svm\|(s|f|o|g\d+)$/, errorHandler((ctx) => savingsHandlers.startMonthlyInput(ctx)));
  bot.action(/^svd\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startBalanceInput(ctx, 'dep')));
  bot.action(/^svw\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startBalanceInput(ctx, 'wd')));
  bot.action(/^svs\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startBalanceInput(ctx, 'set')));
  bot.action(/^svt\|(\d+)$/, errorHandler((ctx) => savingsHandlers.chooseTransferTarget(ctx)));
  bot.action(/^svtt\|(\d+)\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startTransfer(ctx)));
  bot.action('svgn', errorHandler((ctx) => savingsHandlers.startNewGoal(ctx)));
  bot.action(/^svga\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startGoalTarget(ctx)));
  bot.action(/^svgd\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startGoalDate(ctx)));
  bot.action(/^svgdn\|(\d+)$/, errorHandler((ctx) => savingsHandlers.clearGoalDate(ctx)));
  bot.action(/^svgm\|(\d+)$/, errorHandler((ctx) => savingsHandlers.toggleGoalMode(ctx)));
  bot.action(/^svgx\|(\d+)$/, errorHandler((ctx) => savingsHandlers.confirmDeleteGoal(ctx)));
  bot.action(/^svgxc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.deleteGoal(ctx)));
  bot.action('sva', errorHandler((ctx) => savingsHandlers.startNewAccount(ctx)));
  bot.action(/^svpy\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startAccountYield(ctx)));
  bot.action(/^svpyd\|(\d+)$/, errorHandler((ctx) => savingsHandlers.clearAccountYield(ctx)));
  bot.action(/^svpn\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startAccountName(ctx)));
  bot.action(/^svpx\|(\d+)$/, errorHandler((ctx) => savingsHandlers.confirmDeleteAccount(ctx)));
  bot.action(/^svpxc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.deleteAccount(ctx)));
  bot.action('svbn', errorHandler((ctx) => savingsHandlers.startNewDebt(ctx)));
  bot.action(/^svb\|(\d+)$/, errorHandler((ctx) => savingsHandlers.showDebt(ctx)));
  bot.action(/^svbp\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'bpay')));
  bot.action(/^svbi\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'binc')));
  bot.action(/^svbs\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'bset')));
  bot.action(/^svbm\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'bpm')));
  bot.action(/^svbmn\|(\d+)$/, errorHandler((ctx) => savingsHandlers.clearDebtPayment(ctx)));
  bot.action(/^svbr\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'brate')));
  bot.action(/^svbe\|(\d+)$/, errorHandler((ctx) => savingsHandlers.startDebtInput(ctx, 'bname')));
  bot.action(/^svbx\|(\d+)$/, errorHandler((ctx) => savingsHandlers.confirmDeleteDebt(ctx)));
  bot.action(/^svbxc\|(\d+)$/, errorHandler((ctx) => savingsHandlers.deleteDebt(ctx)));
  bot.action('svf', errorHandler((ctx) => savingsHandlers.showForecast(ctx)));
  bot.action('svo', errorHandler((ctx) => savingsHandlers.showSettings(ctx)));
  bot.action(/^svo\|(m|ma|i|y|g)$/, errorHandler((ctx) => savingsHandlers.settingsAction(ctx)));
  // Устаревшие или неизвестные кнопки раздела (старые сообщения) — главный экран накоплений
  bot.action(/^sv/, errorHandler((ctx) => savingsHandlers.showMenu(ctx)));

  // Планирование: хаб, можно потратить сегодня, платежи на 30 дней, найденные подписки, личная инфляция
  bot.action('pl', errorHandler((ctx) => planningHandlers.showHub(ctx)));
  bot.action('pla', errorHandler((ctx) => planningHandlers.showAllowance(ctx)));
  bot.action('plc', errorHandler((ctx) => planningHandlers.showCalendar(ctx)));
  bot.action(/^plct\|([cs])$/, errorHandler((ctx) => planningHandlers.toggleBillReminders(ctx, (c) => callbackHandlers.handleConfigureReminderHours(c))));
  bot.action(/^plcd\|(\d+)$/, errorHandler((ctx) => planningHandlers.startDueDay(ctx)));
  bot.action('pls', errorHandler((ctx) => planningHandlers.showSubscriptions(ctx)));
  bot.action(/^plsy\|([0-9a-f]{10})$/, errorHandler((ctx) => planningHandlers.confirmSubscription(ctx)));
  bot.action(/^plsn\|([0-9a-f]{10})$/, errorHandler((ctx) => planningHandlers.dismissSubscription(ctx)));
  bot.action('plsr', errorHandler((ctx) => planningHandlers.restoreSubscriptions(ctx)));
  bot.action('pli', errorHandler((ctx) => planningHandlers.showInflation(ctx)));
  // Устаревшие или неизвестные кнопки раздела — хаб
  bot.action(/^pl/, errorHandler((ctx) => planningHandlers.showHub(ctx)));
  // Достижения: экран, каталог, «день без трат», челленджи, «Итоги месяца»
  bot.action('ach', errorHandler((ctx) => achievementHandlers.show(ctx)));
  bot.action('achl', errorHandler((ctx) => achievementHandlers.showAll(ctx)));
  bot.action('achn', errorHandler((ctx) => achievementHandlers.markNoSpend(ctx)));
  bot.action('achc', errorHandler((ctx) => achievementHandlers.showChallenges(ctx)));
  bot.action(/^achcs\|(ns|nc|bm)$/, errorHandler((ctx) => achievementHandlers.startChallenge(ctx)));
  bot.action(/^achcc\|(\d+)$/, errorHandler((ctx) => achievementHandlers.startCategoryChallenge(ctx)));
  bot.action(/^achcx\|(\d+)$/, errorHandler((ctx) => achievementHandlers.askCancel(ctx)));
  bot.action(/^achcxc\|(\d+)$/, errorHandler((ctx) => achievementHandlers.cancel(ctx)));
  bot.action(/^achw\|(-?\d+)$/, errorHandler((ctx) => achievementHandlers.showWrapped(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^achwt\|(-?\d+)$/, errorHandler((ctx) => achievementHandlers.toggleWrapped(ctx)));
  bot.action('achwo', errorHandler((ctx) => achievementHandlers.turnOffWrapped(ctx)));
  // Устаревшие или неизвестные кнопки раздела — экран достижений
  bot.action(/^ach/, errorHandler((ctx) => achievementHandlers.show(ctx)));
  // «🤖 Спроси бота»: примеры (кнопка = вопрос), свой вопрос текстом (ai_in:q)
  bot.action('ai', errorHandler((ctx) => assistantHandlers.showExamples(ctx)));
  bot.action(/^ai\|([1-6])$/, errorHandler((ctx) => assistantHandlers.askExample(ctx)));
  bot.action('aiq', errorHandler((ctx) => assistantHandlers.startInput(ctx)));
  bot.action('aitx', errorHandler((ctx) => messageHandlers.askPendingQuestion(ctx))); // «Не понял» → этот текст вопросом
  // «😈 Злой режим»: настройка (rst), уровень (rstl), обращение (rstg → rstgs), 18+ (rsty), «Разнос месяца» (rsm);
  // источник `o` — вопрос о злом режиме в опросе «🧭 Настроим бота под тебя»
  bot.action('rst', errorHandler((ctx) => handlers.roastHandlers.showSettings(ctx)));
  bot.action(/^rstl\|(off|spicy|savage)\|(s|m|o)$/, errorHandler((ctx) => handlers.roastHandlers.chooseLevel(ctx)));
  bot.action(/^rstg\|(s|m|o)$/, errorHandler((ctx) => handlers.roastHandlers.showGender(ctx, { origin: ctx.match[1] })));
  bot.action(/^rstgs\|(m|f|x)\|(off|spicy|savage|-)\|(s|m|o)$/, errorHandler((ctx) => handlers.roastHandlers.setGender(ctx)));
  bot.action(/^rsty\|(s|m|o)$/, errorHandler((ctx) => handlers.roastHandlers.confirmAdult(ctx)));
  bot.action('rsm', errorHandler((ctx) => handlers.roastHandlers.showMonth(ctx)));

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
  // Импорт банковской выписки: файл .csv/.pdf/.txt в любой момент → превью → запись партией.
  // Картинка файлом (jpg/png/webp/heic) — фото чека
  bot.on('document', errorHandler((ctx) => (ReceiptHandlers.isImageDocument(ctx.message.document)
    ? receiptHandlers.handleImageDocument(ctx)
    : importHandlers.handleDocument(ctx))));
  bot.action('import', errorHandler((ctx) => importHandlers.showIntro(ctx)));
  bot.action(/^imx\|([01])$/, errorHandler((ctx) => importHandlers.setTransfers(ctx, ctx.match[1] === '1')));
  bot.action('imgo', errorHandler((ctx) => importHandlers.confirm(ctx)));
  bot.action('imno', errorHandler((ctx) => importHandlers.cancel(ctx)));
  bot.action(/^imu\|(\d+)$/, errorHandler((ctx) => importHandlers.undo(ctx, parseInt(ctx.match[1], 10))));
  // Фото чека: каждая позиция — трата, список чека → карточки (back r.<id>.<page>), «Всё верно», отмена чека
  bot.on('photo', errorHandler((ctx) => receiptHandlers.handlePhoto(ctx)));
  bot.action(/^rv\|(\d+)\|(\d+)$/, errorHandler((ctx) => receiptHandlers.showReceipt(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10))));
  bot.action(/^rvok\|(\d+)$/, errorHandler((ctx) => receiptHandlers.confirm(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rvx\|(\d+)$/, errorHandler((ctx) => receiptHandlers.askUndo(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rvxc\|(\d+)$/, errorHandler((ctx) => receiptHandlers.undo(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rvd\|([01])$/, errorHandler((ctx) => receiptHandlers.resolveDraft(ctx, ctx.match[1] === '1'))); // черновик: записать / отмена
  bot.action('rvr', errorHandler((ctx) => receiptHandlers.rotateAndRetry(ctx))); // повернуть кадр на 90° и распознать снова
  // Правка черновика до записи: страница (rdp), строка (rdl) → ✏️ (rde), 🏷 (rdc → rds), 🗑 (rdx); ➕ строка (rda), 📅 дата (rdt → rdt|день, rdto)
  bot.action(/^rdp\|(\d+)$/, errorHandler((ctx) => receiptHandlers.showDraft(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rdl\|(\d+)$/, errorHandler((ctx) => receiptHandlers.showDraftLine(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rde\|(\d+)$/, errorHandler((ctx) => receiptHandlers.startDraftLineEdit(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rdc\|(\d+)$/, errorHandler((ctx) => receiptHandlers.chooseDraftLineCategory(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rds\|(\d+)\|(\d+)$/, errorHandler((ctx) => receiptHandlers.setDraftLineCategory(ctx, parseInt(ctx.match[1], 10), parseInt(ctx.match[2], 10))));
  bot.action(/^rdx\|(\d+)$/, errorHandler((ctx) => receiptHandlers.removeDraftLine(ctx, parseInt(ctx.match[1], 10))));
  bot.action('rda', errorHandler((ctx) => receiptHandlers.startDraftLineAdd(ctx)));
  bot.action('rdt', errorHandler((ctx) => receiptHandlers.showDraftDatePicker(ctx)));
  bot.action(/^rdt\|(\d{8})$/, errorHandler((ctx) => receiptHandlers.setDraftDateFromButton(ctx, ctx.match[1])));
  bot.action('rdto', errorHandler((ctx) => receiptHandlers.startDraftDateInput(ctx)));
  // Дата записанного чека: все его траты переезжают на выбранный день
  bot.action(/^rt\|(\d+)$/, errorHandler((ctx) => receiptHandlers.showReceiptDatePicker(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^rtd\|(\d+)\|(\d{8})$/, errorHandler((ctx) => receiptHandlers.setReceiptDate(ctx, parseInt(ctx.match[1], 10), ctx.match[2])));
  bot.action(/^rto\|(\d+)$/, errorHandler((ctx) => receiptHandlers.startReceiptDateInput(ctx, parseInt(ctx.match[1], 10))));
  // Несколько записей одним сообщением и голосовые: сводка (vcb|<id>) → карточки (back v.<id>), «Отменить всё» (vcx|<id>)
  bot.on('voice', errorHandler((ctx) => multiEntryHandlers.handleVoice(ctx)));
  bot.action(/^vcb\|(\d+)$/, errorHandler((ctx) => multiEntryHandlers.showBatch(ctx, parseInt(ctx.match[1], 10))));
  bot.action(/^vcx\|(\d+)$/, errorHandler((ctx) => multiEntryHandlers.undo(ctx, parseInt(ctx.match[1], 10))));
  bot.action('limits', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.premiumSubscription(ctx);
  }));
  // Пригласить друга: экран со ссылкой и статистикой, текст для пересылки отдельным сообщением
  bot.action('ref', errorHandler((ctx) => handlers.referralHandlers.showInvite(ctx)));
  bot.action('ref_text', errorHandler((ctx) => handlers.referralHandlers.sendForwardText(ctx)));

  // Настройки
  bot.action('settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
  bot.action('back_to_settings', errorHandler((ctx) => commandHandlers.settings(ctx)));
  bot.action('settings_currencies', errorHandler((ctx) => commandHandlers.settingsCurrencies(ctx)));
  // set_currency|<код>[|ob]: `|ob` — вопрос о валюте в опросе «🧭 Настроим бота под тебя»
  bot.action(/^set_currency\|([A-Z]{3})(\|ob)?$/, errorHandler(async (ctx) => {
    const userId = ctx.from.id;
    const currency = ctx.match[1];
    const validation = handlers.enhancedValidator.validateCurrency(currency);
    if (!validation.isValid) return ctx.answerCbQuery();
    if (ctx.match[2]) return handlers.onboardingHandlers.answerCurrency(ctx, currency);
    await handlers.userService.setUserCurrency(userId, currency);
    const userLanguage = await handlers.userService.getUserLanguage(userId);
    await ctx.answerCbQuery(handlers.localizationService.getText(userLanguage, 'currency_set', { currency }));
    await commandHandlers.settingsCurrencies(ctx);
  })); // установка основной валюты
  bot.action('change_currency', errorHandler((ctx) => commandHandlers.currency(ctx)));
  // «Назад» в опросе: с первого вопроса — к выбору языка, с часового пояса — к валюте
  bot.action('ob_language', errorHandler((ctx) => commandHandlers.onboardingLanguage(ctx)));
  bot.action('ob_currency', errorHandler((ctx) => handlers.onboardingHandlers.openCurrency(ctx)));
  // Опрос «🧭 Настроим бота под тебя»: onb|<шаг>[|<действие>[|<значение>]], вход из Настроек — onb_setup
  bot.action(/^onb\|[a-z](\|[a-z]{1,2}(\|[a-z0-9]{1,10})?)?$/, errorHandler((ctx) => handlers.onboardingHandlers.handle(ctx)));
  bot.action('onb_setup', errorHandler((ctx) => handlers.onboardingHandlers.setup(ctx)));
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
  bot.action('toggle_weekly_insight', errorHandler((ctx) => callbackHandlers.handleToggleWeeklyInsight(ctx)));
  bot.action('weekly_insight_now', errorHandler((ctx) => callbackHandlers.handleWeeklyInsightNow(ctx)));
  bot.action('weekly_insight_off', errorHandler((ctx) => callbackHandlers.handleWeeklyInsightOff(ctx)));
  bot.action('bug_report', errorHandler((ctx) => callbackHandlers.handleBugReport(ctx)));
  // time|<час>|<минуты>[|h][|ob] и set_language|<код>[|ob]: `|ob` — шаг онбординга, `|h` — минуты со сдвигом на полчаса
  bot.action(/^time\|(\d{1,2})\|(\d{1,2})(\|h)?(\|ob)?$/, errorHandler((ctx) => callbackHandlers.handleTimezoneSelection(ctx)));
  // tzh|<0|1>[|ob] — кнопки времени с минутами, сдвинутыми на полчаса (пояса UTC+5:30 и т.п.), и обратно
  bot.action(/^tzh\|([01])(\|ob)?$/, errorHandler((ctx) => (ctx.match[2]
    ? handlers.onboardingHandlers.showTimezone(ctx, ctx.match[1] === '1')
    : commandHandlers.timezone(ctx, { half: ctx.match[1] === '1' }))));
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
  bot.action('family_mode_toggle', errorHandler(async (ctx) => {
    await ctx.answerCbQuery();
    await commandHandlers.toggleFamilyMode(ctx);
  }));
  bot.action('family_delete', errorHandler((ctx) => callbackHandlers.handleFamilyDelete(ctx)));
  bot.action('family_delete_confirm', errorHandler((ctx) => callbackHandlers.handleFamilyDeleteConfirm(ctx)));
  bot.action('family_leave', errorHandler((ctx) => callbackHandlers.handleFamilyLeave(ctx))); // подтверждение выхода
  bot.action('family_leave_confirm', errorHandler((ctx) => callbackHandlers.handleFamilyLeaveConfirm(ctx)));
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
    subscription_active: 'payment_subscription_already_active',
    donation_outdated: 'donation_outdated'
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
      if (result.status === 'duplicate') return; // повторная доставка того же платежа
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
