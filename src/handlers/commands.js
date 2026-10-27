const respond = require('../utils/respond');
const FunnelService = require('../services/FunnelService');
const { getTimezoneDisplayName } = require('../utils/timezoneCalculator');
const { summaryHour } = require('../services/DailySummaryService');

class CommandHandlers {
  constructor({ expenseService, userService, premiumService, familyService, localizationService, formatter, stateService, keyboardGenerators, paymentService, incomeService, funnelService, receiptService }) {
    this.expenseService = expenseService;
    this.userService = userService;
    this.premiumService = premiumService;
    this.familyService = familyService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.keyboardGenerators = keyboardGenerators;
    this.paymentService = paymentService;
    this.incomeService = incomeService;
    this.funnelService = funnelService;
    this.receiptService = receiptService;
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

  // afterOnboarding — первый показ после выбора языка/валюты/часового пояса: полное приветствие.
  // Вернувшемуся пользователю — коротко, без простыни текста.
  // Шаг онбординга живёт в callback_data кнопок (`|ob`), а не в памяти, поэтому переживает рестарт процесса.
  async start(ctx, { afterOnboarding = false } = {}) {
    const user = ctx.from;
    // Новый пользователь — только тот, чей вызов создал строку (без гонки двух /start подряд)
    const registered = await this.userService.registerUser(user.id, user.username, user.first_name);

    // Новый пользователь: одноразовый onboarding (язык → валюта → часовой пояс)
    if (registered && registered.isNew) {
      // Источник из ссылки t.me/<bot>?start=<код> и первый шаг воронки
      await this.funnelService.registerSource(user.id, FunnelService.parseStartSource(ctx.message && ctx.message.text));
      await this.funnelService.track(user.id, 'registered');

      // Стартовый язык экрана — язык Telegram (ja → jp, pt-br → pt…), если бот его поддерживает, иначе en
      const initialLanguage = this.localizationService.resolveTelegramLanguage(user && user.language_code) || 'en';
      await this.onboardingLanguage(ctx, initialLanguage);
      return;
    }
    // Дубль первого /start из той же пачки: экран выбора языка уже показан
    if (registered && registered.justCreated && !afterOnboarding) return;

    const userLanguage = await this.userService.getUserLanguage(user.id);
    let message = this.localizationService.getText(userLanguage, 'start_returning');
    if (afterOnboarding) {
      await this.funnelService.track(user.id, 'onboarding_completed');
      message = `${this.localizationService.getText(userLanguage, 'start_message')}\n\n${this.localizationService.getText(userLanguage, 'start_reminders_note')}`;
    }
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: await this.mainKeyboardMarkup(user.id, userLanguage)
    });
  }

  // Reply-клавиатура главного меню. Премиум с семьёй получает кнопку-исключение:
  // «Семейная трата», а при режиме «все траты в семью» — «Личная трата»
  async mainKeyboardMarkup(userId, userLanguage) {
    let quickExpense = null;
    try {
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (isPremium && await this.familyService.getUserFamily(userId)) {
        const user = await this.userService.getUserById(userId);
        quickExpense = user && user.family_mode ? 'personal' : 'family';
      }
    } catch (error) {
      // В случае ошибки показываем базовое меню
    }
    return {
      keyboard: this.keyboardGenerators.generateMainMenuKeyboard(userLanguage, quickExpense),
      resize_keyboard: true,
      one_time_keyboard: false
    };
  }

  // Отправить актуальную reply-клавиатуру (например, если у пользователя осталась старая)
  async sendMainKeyboard(ctx, userLanguage) {
    await ctx.reply(this.localizationService.getText(userLanguage, 'keyboard_refreshed'), {
      reply_markup: await this.mainKeyboardMarkup(ctx.from.id, userLanguage)
    });
  }

  async help(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key) => this.localizationService.getText(userLanguage, key);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    // Подсказка про фото чека — только если распознавание настроено
    const text = this.receiptService && this.receiptService.configured ? `${t('help_message')}\n\n${t('help_receipt')}` : t('help_message');
    await respond(ctx, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: t('button_bug_report'), callback_data: 'bug_report' }],
          [{ text: t('button_back'), callback_data: 'back_to_menu' }]
        ]
      }
    });
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


  // Шаг онбординга «язык»; повторный показ — по «Назад» с шага валюты
  async onboardingLanguage(ctx, language) {
    const userLanguage = language || await this.userService.getUserLanguage(ctx.from.id);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.localizationService.getText(userLanguage, 'language_select'), {
      reply_markup: { inline_keyboard: this.localizationService.getLanguageKeyboardLocalized(userLanguage, { onboarding: true }) }
    });
  }

  // onboarding: кнопки с признаком шага (`|ob`), «Назад» — к выбору языка
  async currency(ctx, { onboarding = false } = {}) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const message = this.localizationService.getText(userLanguage, 'currency_select');
    const { generateCurrencyKeyboard } = require('../utils/constants');
    const currencyKeyboard = onboarding
      ? generateCurrencyKeyboard(this.localizationService, userLanguage, 'set_currency', 'ob_language', '|ob')
      : generateCurrencyKeyboard(this.localizationService, userLanguage, 'set_currency', 'settings_currencies');
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, message, { reply_markup: { inline_keyboard: currencyKeyboard } });
  }

  async settings(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);

    const [currency, incomeCurrency, timezone, periodStartDay, reminders] = await Promise.all([
      this.userService.getUserCurrency(userId),
      this.incomeService.getIncomeCurrency(userId),
      this.userService.getUserTimezone(userId),
      this.userService.getUserPeriodStartDay(userId),
      this.userService.getReminderSettings(userId)
    ]);
    const language = this.localizationService.getLanguageInfo(userLanguage);
    const reminderHours = (Array.isArray(reminders.reminder_hours) ? [...reminders.reminder_hours] : [10, 14, 18])
      .sort((a, b) => a - b).map(h => `${String(h).padStart(2, '0')}:00`).join(', ');

    const lines = [
      `⚙️ *${t('settings_header')}*`,
      '',
      t('settings_currency_line', { currency, incomeCurrency }),
      t('settings_timezone_line', { timezone: this.formatter.escapeMarkdown(getTimezoneDisplayName(timezone)) }),
      t('settings_language_line', { language: `${language.flag} ${language.name}` }),
      t('settings_period_line', { day: periodStartDay }),
      reminders.reminder_enabled
        ? t('settings_reminders_on_line', { hours: reminderHours || '—' })
        : t('settings_reminders_off_line'),
      reminders.daily_summary_enabled
        ? t('settings_daily_summary_on_line', { time: `${String(summaryHour(reminders.daily_summary_hour)).padStart(2, '0')}:00` })
        : t('settings_daily_summary_off_line'),
      t(reminders.weekly_insight_enabled ? 'settings_weekly_insight_on_line' : 'settings_weekly_insight_off_line')
    ];

    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: this.keyboardGenerators.generateSettingsKeyboard(userLanguage) }
    });
  }

  // Экран валют: основная (траты и итоги) и валюта дохода по умолчанию
  async settingsCurrencies(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);
    const [currency, incomeCurrency] = await Promise.all([
      this.userService.getUserCurrency(userId),
      this.incomeService.getIncomeCurrency(userId)
    ]);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, t('settings_currencies_text', { currency, incomeCurrency }), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: t('button_change_currency'), callback_data: 'change_currency' }, { text: t('button_income_currency'), callback_data: 'change_income_currency' }],
          [{ text: t('button_back'), callback_data: 'back_to_settings' }]
        ]
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
    
    await respond(ctx, prompt, {
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
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, languageSelectText, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  // onboarding: кнопки с признаком шага (`|ob`), «Назад» — к выбору валюты
  async timezone(ctx, { onboarding = false } = {}) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const { generateTimeKeyboard } = require('../utils/constants');
    const message = this.localizationService.getText(userLanguage, 'timezone_setup', { utcTime: new Date().toUTCString() });
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: generateTimeKeyboard(this.localizationService, userLanguage, { onboarding })
      }
    });
  }

  async limits(ctx) {
    return this.premiumSubscription(ctx);
  }

  async family(ctx) {
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      
      // Проверяем премиум статус пользователя
      const isPremium = await this.premiumService.isPremiumUser(userId);
      if (!isPremium) {
        // Тизер вместо тупика: что даёт семья и кнопка перейти к премиуму
        const t = (key) => this.localizationService.getText(userLanguage, key);
        await respond(ctx, t('family_teaser'), {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: t('button_premium'), callback_data: 'premium_subscription' }],
              [{ text: t('button_back'), callback_data: 'back_to_menu' }]
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
        // Имена пользовательские: экранируем, иначе "_" в username ломает Markdown и сообщение не отправится
        const familyName = this.formatter.escapeMarkdown(userFamily.name);
        const ownerName = this.formatter.escapeMarkdown(userFamily.owner_username || userFamily.owner_first_name || 'Unknown');
        
        const familyLabelText = this.localizationService.getText(userLanguage, 'family_label');
        const ownerLabelText = this.localizationService.getText(userLanguage, 'family_owner_label');
        message = `${familyInfoText}\n\n${familyLabelText} ${familyName}\n${ownerLabelText} ${ownerName}`;
        
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
            [{ text: membersText, callback_data: 'family_members' }, { text: inviteText, callback_data: 'family_invite' }],
            [{ text: activeInvitationsText, callback_data: 'family_active_invitations' }, { text: statsText, callback_data: 'family_stats' }],
            [{ text: dailyStatsText, callback_data: 'family_daily_history' }, { text: exportText, callback_data: 'family_export' }],
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
            [{ text: statsText, callback_data: 'family_stats' }, { text: dailyStatsText, callback_data: 'family_daily_history' }],
            [{ text: exportText, callback_data: 'family_export' }, { text: addExpenseText, callback_data: 'family_add_expense' }],
            [{ text: leaveText, callback_data: 'family_leave' }]
          ];
        }

        // Режим «все траты в семью»: строка состояния и переключатель первой кнопкой
        const familyMode = !!(await this.userService.getUserById(userId))?.family_mode;
        message += `\n\n${this.localizationService.getText(userLanguage, familyMode ? 'family_mode_line_on' : 'family_mode_line_off')}`;
        keyboard.unshift([{
          text: this.localizationService.getText(userLanguage, familyMode ? 'family_mode_button_on' : 'family_mode_button_off'),
          callback_data: 'family_mode_toggle'
        }]);
      } else {
        // Пользователь не в семье
        const familyInfoText = this.localizationService.getText(userLanguage, 'family_info');
        const createText = this.localizationService.getText(userLanguage, 'create_family');
        const joinText = this.localizationService.getText(userLanguage, 'join_family');
        
        message = familyInfoText;
        
        keyboard = [
          [{ text: createText, callback_data: 'family_create' }, { text: joinText, callback_data: 'family_join' }]
        ];
      }
      
      // Добавляем кнопку "Назад"
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      keyboard.push([{ text: backText, callback_data: 'back_to_menu' }]);
      
      await respond(ctx, message, {
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

  // Переключатель «все траты в семью»: обновляем меню семьи и присылаем reply-клавиатуру
  // с новой кнопкой-исключением (её текст меняется только новым сообщением)
  async toggleFamilyMode(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);
    if (!(await this.premiumService.isPremiumUser(userId)) || !(await this.familyService.getUserFamily(userId))) {
      return this.family(ctx);
    }
    const user = await this.userService.getUserById(userId);
    const enabled = !(user && user.family_mode);
    await this.userService.setFamilyMode(userId, enabled);
    await this.family(ctx);
    const notice = enabled
      ? t('family_mode_enabled', { personalButton: t('button_personal_expense'), removeButton: t('button_remove_from_family') })
      : t('family_mode_disabled', { familyButton: t('family_add_expense'), addButton: t('button_mark_as_family') });
    await ctx.reply(notice, { reply_markup: await this.mainKeyboardMarkup(userId, userLanguage) });
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
      await respond(ctx, familyStatsMessage, {
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
    await this.funnelService.track(userId, 'paywall_viewed');
    const status = limitsInfo.isPremium ? 
      this.localizationService.getText(userLanguage, 'status_premium') : 
      this.localizationService.getText(userLanguage, 'status_regular');
    
    const maxDescriptionLength = this.localizationService.getText(userLanguage, 'max_description_length', {
      length: limitsInfo.maxDescriptionLength
    });

    // Формируем сообщение о статусе
    const subscriptionTitle = this.localizationService.getText(userLanguage, 'premium_subscription_title');
    const statusHeader = this.localizationService.getText(userLanguage, 'premium_status_header');
    const privileges = this.localizationService.getText(userLanguage, 'premium_privileges', { status });
    const menuTitle = this.localizationService.getText(userLanguage, 'premium_menu_title');
    const benefits = this.localizationService.getText(userLanguage, 'premium_benefits');

    let message = `${subscriptionTitle}\n\n${statusHeader}\n- ${privileges}\n- ${maxDescriptionLength}`;
      
      // Добавляем информацию о дате истечения премиума
      if (limitsInfo.isPremium && limitsInfo.premiumExpiresAt) {
        const expiryInfo = this.localizationService.getText(userLanguage, 'premium_expires', {
          date: this.formatter.formatDate(limitsInfo.premiumExpiresAt, userTimezone),
          days: limitsInfo.daysRemaining
        });
        message += `\n\n${expiryInfo}`;
      }

      // Подписка с автопродлением: когда следующее списание и как отменить
      const subscription = await this.userService.getActiveRecurringSubscription(userId);
      if (subscription) {
        message += `\n\n${this.localizationService.getText(userLanguage, 'subscription_active_info', {
          date: this.formatter.formatDate(subscription.subscription_expires_at, userTimezone)
        })}`;
      }
      
      message += `\n\n${benefits}\n\n${menuTitle}`;
    
    // Создаем inline клавиатуру для премиум меню
    const tariffButton = this.localizationService.getText(userLanguage, 'premium_tariff_button');
    const whyPaidButton = this.localizationService.getText(userLanguage, 'premium_why_paid_button');
    const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
    
    const donateButton = this.localizationService.getText(userLanguage, 'premium_donate_button');
    const purchasesButton = this.localizationService.getText(userLanguage, 'premium_purchases_button');
    const inlineKeyboard = [
      [
        { text: tariffButton, callback_data: 'premium_tariffs' },
        { text: donateButton, callback_data: 'premium_donate' }
      ],
      [{ text: purchasesButton, callback_data: 'premium_purchases' }],
      [{ text: whyPaidButton, callback_data: 'premium_why_paid' }],
      [{ text: backButton, callback_data: 'back_to_menu' }]
    ];
    
    await respond(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  }

  // «☰ Ещё»: редкие разделы (семья, подписка, экспорт, настройки, справка, админка)
  async mainMenu(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const isAdmin = await this.userService.isUserAdmin(userId);
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, this.localizationService.getText(userLanguage, 'more_menu_title'), {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: this.keyboardGenerators.generateMoreMenu(userLanguage, isAdmin) }
    });
  }
}

module.exports = CommandHandlers;
