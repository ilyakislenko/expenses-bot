const { LEGACY_MENU_BUTTON_KEYS } = require('../utils/constants');
const AssistantHandlers = require('./AssistantHandlers');

class MessageHandlers {
constructor({ expenseService, userService, premiumService, familyService, categoryService, localizationService, formatter, commandHandlers, stateService, validator, paymentService, donationRepository, bugReportRepository, adminHandlers, incomeHandlers, recurringExpenseHandlers, expenseHandlers, budgetHandlers, exportHandlers, savingsHandlers, planningHandlers, assistantHandlers, multiEntryHandlers, onboardingHandlers = null, receiptHandlers = null, subscriptionHandlers = null, bankNotificationHandlers = null, taxRefundHandlers = null }) {
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
    this.adminHandlers = adminHandlers;
    this.incomeHandlers = incomeHandlers;
    this.recurringExpenseHandlers = recurringExpenseHandlers;
    this.expenseHandlers = expenseHandlers;
    this.budgetHandlers = budgetHandlers;
    this.exportHandlers = exportHandlers;
    this.savingsHandlers = savingsHandlers;
    this.planningHandlers = planningHandlers;
    this.assistantHandlers = assistantHandlers;
    this.multiEntryHandlers = multiEntryHandlers;
    this.onboardingHandlers = onboardingHandlers;
    this.receiptHandlers = receiptHandlers; // ввод строки/даты черновика чека и даты записанного чека
    this.subscriptionHandlers = subscriptionHandlers; // пробный период: название и цена, дата окончания
    this.bankNotificationHandlers = bankNotificationHandlers; // пересланные и вставленные уведомления банка
    this.taxRefundHandlers = taxRefundHandlers; // «💡 Верни 13%»: слово для поиска траты, которую добавить в расчёт
  }

  async handleExpense(ctx) {
    try {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      // Получаем язык пользователя для локализации
      const userLanguage = await this.userService.getUserLanguage(userId);
      

      
      // Кнопки главной reply-клавиатуры
      const t = (key) => this.localizationService.getText(userLanguage, key);
      const mainButtons = {
        [t('button_overview')]: () => this.expenseHandlers.showOverview(ctx, 0),
        [t('button_today')]: () => this.expenseHandlers.showDay(ctx, 0, 0),
        [t('button_income')]: () => this.incomeHandlers.showMenu(ctx),
        [t('button_recurring')]: () => this.recurringExpenseHandlers.showMenu(ctx),
        [t('button_more')]: () => this.commandHandlers.mainMenu(ctx),
        [t('family_add_expense')]: () => this.startFamilyExpense(ctx, userLanguage),
        [t('button_personal_expense')]: () => this.startPersonalExpense(ctx, userLanguage)
      };
      if (Object.prototype.hasOwnProperty.call(mainButtons, text)) {
        // Нижняя кнопка — уход из незавершённого ввода: иначе следующее сообщение («250 кофе») ушло бы
        // в брошенный ввод дохода или правку записи. Черновики на карточках категорий не трогаем.
        this.stateService.clearInputs(userId);
        await mainButtons[text]();
        return;
      }

      // Кнопка старой клавиатуры: присылаем новую и открываем ближайший раздел
      const legacyKey = LEGACY_MENU_BUTTON_KEYS.find(key => t(key) === text);
      if (legacyKey) {
        this.stateService.clearInputs(userId);
        await this.commandHandlers.sendMainKeyboard(ctx, userLanguage);
        await this.openLegacySection(ctx, legacyKey, userLanguage);
        return;
      }

      // Бот ждал ответ на подсказку, но срок вышел (в том числе пока бот был выключен). Ответ («25.10», «50000 зарплата»)
      // не превращаем молча в новую трату и не теряем: текст с числами — кнопка «✅ Записать …» (обычная запись),
      // вопрос — как обычно, остальное — «ввод устарел». Уведомление банка ответом на подсказку не бывает — ниже своя ветка
      const bankNotification = Boolean(this.bankNotificationHandlers && this.bankNotificationHandlers.accepts(ctx));
      const inputExpired = this.stateService.takeExpiredInput(userId);
      if (inputExpired && !bankNotification && !this.stateService.hasUserState(userId) && !this.stateService.hasUserEditState(userId)
        && !(this.assistantHandlers && AssistantHandlers.isQuestion(text))) {
        if (/\d/.test(text)) return await this.offerRecordAfterExpired(ctx, text, userLanguage);
        return ctx.reply(t('input_expired'));
      }

      // Обработка семейных состояний
      if (this.stateService.hasUserState(userId)) {
        const userState = this.stateService.getUserState(userId);
        
        if (userState === 'creating_family') {
          return await this.handleCreateFamily(ctx, text, userLanguage);
        }

        // Семья для семейного тарифа (pfam_create): можно и без своего премиума, после — снова экран тарифа
        if (userState === 'creating_family_plan') {
          return await this.handleCreateFamily(ctx, text, userLanguage, { forPlan: true });
        }
        
        if (userState === 'joining_family') {
          return await this.handleJoinFamily(ctx, text, userLanguage);
        }
        
        if (userState === 'adding_family_expense') {
          return await this.handleAddFamilyExpense(ctx, text, userLanguage);
        }

        if (userState === 'adding_personal_expense') {
          const input = await this.multiEntryHandlers.singleEntryText(userId, text);
          const accepted = await this.expenseHandlers.handleExpenseInput(ctx, input, userLanguage, null);
          if (accepted) this.stateService.deleteUserState(userId);
          return;
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

        if (userState === 'admin_search') {
          return await this.handleAdminSearchInput(ctx, text, userLanguage);
        }
        // Поиск транзакции для возврата в админке
        if (typeof userState === 'string' && userState.startsWith('admin_refund_search:')) {
          return await this.adminHandlers.handleRefundSearchInput(ctx, text);
        }

        if (userState === 'admin_broadcast') {
          return await this.handleAdminBroadcastInput(ctx, text, userLanguage);
        }

        if (userState === 'adding_custom_category') {
          return await this.handleAddCustomCategory(ctx, text, userLanguage);
        }

        if (userState.startsWith && userState.startsWith('renaming_custom_category:')) {
          const categoryId = userState.split(':')[1];
          return await this.handleRenameCustomCategory(ctx, text, userLanguage, categoryId);
        }

        if (userState === 'adding_income') {
          return await this.incomeHandlers.handleIncomeInput(ctx, text, userLanguage);
        }

        if (typeof userState === 'string' && userState.startsWith('editing_income:')) {
          return await this.incomeHandlers.handleEditInput(ctx, text, userLanguage, parseInt(userState.split(':')[1], 10));
        }

        // Строка, новая строка или дата черновика чека до записи
        if (typeof userState === 'string' && userState.startsWith('rd_in:') && this.receiptHandlers) {
          return await this.receiptHandlers.handleDraftInput(ctx, text, userLanguage, userState);
        }

        // «✏️ Другая дата» записи (x), дохода (i) или чека (r)
        if (typeof userState === 'string' && userState.startsWith('dt_in:')) {
          const kind = userState.split(':')[1];
          if (kind === 'x') return await this.expenseHandlers.handleDateInput(ctx, text, userLanguage, userState);
          if (kind === 'i') return await this.incomeHandlers.handleDateInput(ctx, text, userLanguage, userState);
          if (kind === 'r' && this.receiptHandlers) return await this.receiptHandlers.handleReceiptDateInput(ctx, text, userLanguage, userState);
        }

        if (typeof userState === 'string' && userState.startsWith('sv_in:')) {
          return await this.savingsHandlers.handleInput(ctx, text, userLanguage, userState);
        }

        if (typeof userState === 'string' && userState.startsWith('pl_in:')) {
          return await this.planningHandlers.handleInput(ctx, text, userLanguage, userState);
        }

        if (typeof userState === 'string' && userState.startsWith('sub_in:') && this.subscriptionHandlers) {
          return await this.subscriptionHandlers.handleInput(ctx, text, userLanguage, userState);
        }

        if (typeof userState === 'string' && userState.startsWith('tax_in:') && this.taxRefundHandlers) {
          return await this.taxRefundHandlers.handleInput(ctx, text, userLanguage, userState);
        }

        if (typeof userState === 'string' && userState.startsWith('ai_in:')) {
          return await this.assistantHandlers.handleInput(ctx, text, userLanguage);
        }

        if (userState === 'adding_recurring') {
          return await this.recurringExpenseHandlers.handleAmountInput(ctx, text, userLanguage);
        }

        if (userState === 'adding_recurring_day') {
          return await this.recurringExpenseHandlers.handleDayInput(ctx, text, userLanguage);
        }

        if (typeof userState === 'string' && userState.startsWith('setting_budget:')) {
          return await this.budgetHandlers.handleAmountInput(ctx, text, userLanguage, userState.split(':')[1]);
        }

        if (userState === 'export_date_range') {
          return await this.exportHandlers.handleRangeInput(ctx, text, userLanguage);
        }

        // Сумма бюджета в опросе «🧭 Настроим бота под тебя»; не сумма (например, «250 кофе») — обычная запись ниже,
        // вопрос о бюджете ждёт дальше
        if (userState === 'onb_budget' && this.onboardingHandlers
          && await this.onboardingHandlers.handleBudgetInput(ctx, text, userLanguage)) {
          return;
        }
      }
      
      // «✏️ Изменить» запись: новая сумма, валюта и/или описание
      if (this.stateService.hasUserEditState(userId)) {
        return await this.expenseHandlers.handleEditInput(ctx, text, userLanguage, this.stateService.getUserEditState(userId));
      }

      // ===== Уведомление банка =====
      // Пересланное или вставленное SMS/пуш/письмо банка («Покупка 1 250 ₽, PYATEROCHKA, карта *1234…») — после
      // ожидаемого ввода и правки записи (они важнее), до вопросов и обычной записи. Обычный ввод («250 кофе», «кофе 250р,
      // такси 400р», «оплата 500р интернет», вопросы) сюда не попадает: нужны сумма с валютой и признаки банка
      // (utils/bankNotification.detect)
      if (bankNotification) {
        return await this.bankNotificationHandlers.handleMessage(ctx, userLanguage);
      }

      // Вопрос боту: «? сколько я потратил на такси», «сколько я потратил вчера», «14 сентября сколько потратил?»,
      // текст без суммы со «?» в конце. Записи со «?» в конце («такси 400?», «кофе 250, такси 400?») — записи
      if (this.assistantHandlers && AssistantHandlers.isQuestion(text)) {
        return await this.assistantHandlers.ask(ctx, text, userLanguage);
      }

      await this.routeEntry(ctx, text, userLanguage);
    } catch (error) {
      console.error('Error handling expense:', error);
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      const errorText = this.localizationService.getText(userLanguage, 'expense_save_error');
      await ctx.reply(errorText);
    }
  }

  // Обычная запись без ожидаемого ввода: несколько записей одним сообщением («кофе 250, такси 400», по строке на
  // запись, «+50000 зарплата, обед 600») и одна с суммой в конце («кофе 250»), доход «+50000 зарплата», текст без
  // суммы — «Не понял» с «🤖 Спросить бота», иначе трата «250 кофе»
  async routeEntry(ctx, text, userLanguage) {
    if (await this.multiEntryHandlers.handleText(ctx, text, userLanguage)) return;
    if (/^\s*\+\s*\d/.test(text)) {
      return this.incomeHandlers.handleIncomeInput(ctx, text, userLanguage);
    }
    if (this.assistantHandlers && !/\d/.test(text) && /\p{L}{2,}/u.test(text)) {
      return this.offerQuestion(ctx, text, userLanguage);
    }
    return this.expenseHandlers.handleExpenseInput(ctx, text, userLanguage);
  }

  // Текст после истёкшего ввода: «ввод устарел» и кнопка «✅ Записать «…»» — одно нажатие, и это обычная запись (ixr)
  async offerRecordAfterExpired(ctx, text, userLanguage) {
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);
    const label = this.formatter.shorten(text.replace(/\s+/g, ' ').trim(), 32);
    const sent = await ctx.reply(t('input_expired_record', { text: label }), {
      reply_markup: { inline_keyboard: [[{ text: t('button_record_text', { text: label }), callback_data: 'ixr' }]] }
    });
    if (sent?.message_id) this.stateService.setPendingText('record', ctx.from.id, sent.message_id, text);
  }

  // callback: ixr — «✅ Записать «…»» после «ввод устарел»: текст того сообщения — обычной записью (один раз)
  async recordPendingText(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const text = this.stateService.takePendingText('record', userId, ctx.callbackQuery.message?.message_id);
    if (!text) {
      return ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'record_button_outdated'), { show_alert: true });
    }
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await this.routeEntry(ctx, text, userLanguage);
  }

  // Текст без суммы: «Не понял» с подсказкой про вопрос и кнопкой, которая задаёт этот текст боту (aitx)
  async offerQuestion(ctx, text, userLanguage) {
    const t = (key) => this.localizationService.getText(userLanguage, key);
    const sent = await ctx.reply(`${t('error_format')}\n\n${t('ask_bot_hint')}`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: t('button_ask_bot_this'), callback_data: 'aitx' }]] }
    });
    if (sent?.message_id) this.stateService.setPendingText('question', ctx.from.id, sent.message_id, text);
  }

  // callback: aitx — «🤖 Спросить бота» под «Не понял»: текст того сообщения — вопросом
  async askPendingQuestion(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const question = this.stateService.takePendingText('question', userId, ctx.callbackQuery.message?.message_id);
    if (!question) {
      return ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'ask_bot_outdated'), { show_alert: true });
    }
    await ctx.answerCbQuery().catch(() => {});
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await this.assistantHandlers.ask(ctx, question, userLanguage);
  }

  // Кнопка «Семейная трата»: ждём ввод траты следующим сообщением
  async startFamilyExpense(ctx, userLanguage) {
    const userId = ctx.from.id;
    const isPremium = await this.premiumService.isPremiumUser(userId);
    if (!isPremium) {
      return ctx.reply(this.localizationService.getText(userLanguage, 'premium_required'));
    }
    const userFamily = await this.familyService.getUserFamily(userId);
    if (!userFamily) {
      return ctx.reply(this.localizationService.getText(userLanguage, 'not_family_member'));
    }
    this.stateService.setUserState(userId, 'adding_family_expense');
    await ctx.reply(this.localizationService.getText(userLanguage, 'enter_expense_amount'), {
      reply_markup: {
        inline_keyboard: [[{ text: this.localizationService.getText(userLanguage, 'family_cancel'), callback_data: 'family_cancel' }]]
      }
    });
  }

  // Кнопка «Личная трата» (при режиме «все траты в семью»): следующая трата — личная
  async startPersonalExpense(ctx, userLanguage) {
    this.stateService.setUserState(ctx.from.id, 'adding_personal_expense');
    await ctx.reply(this.localizationService.getText(userLanguage, 'enter_personal_expense'), {
      reply_markup: {
        inline_keyboard: [[{ text: this.localizationService.getText(userLanguage, 'family_cancel'), callback_data: 'family_cancel' }]]
      }
    });
  }

  // Раздел, ближайший к кнопке старой клавиатуры
  async openLegacySection(ctx, legacyKey, userLanguage) {
    switch (legacyKey) {
      case 'button_expenses_month':
      case 'button_expenses_categories':
        return this.expenseHandlers.showOverview(ctx, 0);
      case 'button_expenses_day':
      case 'button_delete_last':
        return this.expenseHandlers.showDay(ctx, 0, 0);
      case 'button_settings':
        return this.commandHandlers.settings(ctx);
      case 'button_help':
        return this.commandHandlers.help(ctx);
      case 'button_family':
        return this.commandHandlers.family(ctx);
      case 'premium_subscription_title':
        return this.commandHandlers.premiumSubscription(ctx);
      case 'button_admin': {
        const isAdmin = await this.userService.isUserAdmin(ctx.from.id);
        if (isAdmin) return this.adminHandlers.showAdminPanel(ctx);
        return ctx.reply(this.localizationService.getText(userLanguage, 'admin_access_denied'));
      }
      default:
        return this.commandHandlers.mainMenu(ctx);
    }
  }

  // ========================================
  // FAMILY STATE HANDLERS
  // ========================================

  async handleCreateFamily(ctx, text, userLanguage, { forPlan = false } = {}) {
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
      
      const message = this.localizationService.getText(userLanguage, forPlan ? 'family_created_for_plan' : 'family_created', { name: family.name });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      const button = forPlan
        ? { text: this.localizationService.getText(userLanguage, 'button_family_tariffs'), callback_data: 'pfam' }
        : { text: backText, callback_data: 'back_to_menu' };
      
      await ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [button]
          ]
        }
      });
    } catch (error) {
      console.error('Error creating family:', error);
      // Уже владелец или участник семьи (в том числе гонка с принятием приглашения)
      const key = /already (owns|a member)/.test(error.message) ? 'family_already_member' : 'error';
      const errorText = this.localizationService.getText(userLanguage, key);
      await ctx.reply(errorText);
    }
  }

  async handleJoinFamily(ctx, text, userLanguage) {
    try {
      const userId = ctx.from.id;
      const invitationCode = text.trim().toUpperCase();
      
      const result = await this.familyService.acceptInvitation(userId, invitationCode);
      this.stateService.deleteUserState(userId);
      
      let message = this.localizationService.getText(userLanguage, 'invitation_accepted', { familyName: result.family.name });
      if (result.familyPremium) {
        const timezone = await this.userService.getUserTimezone(userId);
        message += `\n\n${this.localizationService.getText(userLanguage, 'family_premium_joined', {
          payer: result.familyPremium.payerName,
          date: this.formatter.formatDate(result.familyPremium.expiresAt, timezone)
        })}`;
      }
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
      
      if (error.message.includes('not found') || error.message.includes('Invalid invitation code')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_found');
      } else if (error.message.includes('not pending')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_not_pending');
      } else if (error.message.includes('expired')) {
        errorText = this.localizationService.getText(userLanguage, 'invitation_expired');
      } else if (error.message.includes('already a member')) {
        errorText = this.localizationService.getText(userLanguage, 'family_already_member');
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
      
      const invitationSentText = this.localizationService.getText(userLanguage, 'invitation_sent', { username: this.formatter.escapeMarkdown(result.invitee.username) });
      const invitationCodeText = this.localizationService.getText(userLanguage, 'invitation_code', { code: result.invitation.invite_code });
      const message = `${invitationSentText}\n\n${invitationCodeText}`;
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
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
      } else if (error.message.includes('Only family owner can invite')) {
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
      const userFamily = await this.familyService.getUserFamily(userId);
      if (!userFamily) {
        this.stateService.deleteUserState(userId);
        return await ctx.reply(this.localizationService.getText(userLanguage, 'not_family_member'));
      }
      // Состояние снимаем только если ввод принят — при ошибке формата можно сразу попробовать ещё раз
      const input = await this.multiEntryHandlers.singleEntryText(userId, text);
      const accepted = await this.expenseHandlers.handleExpenseInput(ctx, input, userLanguage, userFamily.id);
      if (accepted) this.stateService.deleteUserState(userId);
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
        const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
        return await ctx.reply(`${enterName}\n\n${example}`);
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
        const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
        return await ctx.reply(`${enterName}\n\n${example}`);
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
        const errorText = this.localizationService.getText(userLanguage, 'bug_report_rate_limit');
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

      // Проверка на подозрительные паттерны (более мягкая, не блокируем обычные скобки и кавычки)
      const suspiciousPatterns = [
        /<\s*script\b[^>]*>/i,        // <script ...>
        /<\s*\/\s*script\s*>/i,     // </script>
        /on\w+\s*=/i,                 // inline-обработчики событий в HTML
        /(javascript:|vbscript:)/i,    // опасные протоколы
        /(@everyone|@here|@channel)/gi,     // Спам-упоминания
        /(.)\1{20,}/g                  // Повтор более 20 одинаковых символов подряд
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(reportText)) {
          const errorText = this.localizationService.getText(userLanguage, 'bug_report_suspicious');
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

  // Обработка ввода поискового запроса в админке
  async handleAdminSearchInput(ctx, text, userLanguage) {
    const userId = ctx.from.id;
    
    try {
      // Проверяем права админа
      const isAdmin = await this.userService.isUserAdmin(userId);
      if (!isAdmin) {
        const accessDeniedText = this.localizationService.getText(userLanguage, 'admin_access_denied');
        await ctx.reply(accessDeniedText);
        return;
      }

      // Очищаем состояние
      this.stateService.deleteUserState(userId);
      
      // Выполняем поиск через AdminHandlers
      await this.adminHandlers.handleSearch(ctx, text);
      
    } catch (error) {
      console.error('Error handling admin search input:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }

  // Обработка ввода текста массового уведомления
  async handleAdminBroadcastInput(ctx, text, userLanguage) {
    const userId = ctx.from.id;
    
    try {
      // Проверяем права админа
      const isAdmin = await this.userService.isUserAdmin(userId);
      if (!isAdmin) {
        const accessDeniedText = this.localizationService.getText(userLanguage, 'admin_access_denied');
        await ctx.reply(accessDeniedText);
        return;
      }

      // Очищаем состояние
      this.stateService.deleteUserState(userId);
      
      // Обрабатываем сообщение через AdminHandlers
      await this.adminHandlers.handleBroadcast(ctx, text);
      
    } catch (error) {
      console.error('Error handling admin broadcast input:', error);
      const errorText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errorText);
    }
  }
}

module.exports = MessageHandlers;