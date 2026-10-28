const respond = require('../utils/respond');
const logger = require('../utils/logger');
const FunnelService = require('../services/FunnelService');
const ReferralService = require('../services/ReferralService');
const { getTimezoneDisplayName } = require('../utils/timezoneCalculator');
const { summaryHour } = require('../services/DailySummaryService');
const { localToday, lastDaysPeriod } = require('../utils/period');
const { PREMIUM_TARIFFS, tariffDiscount, USER_LIMITS } = require('../utils/constants');

class CommandHandlers {
  constructor({ expenseService, userService, premiumService, familyService, localizationService, formatter, stateService, keyboardGenerators, paymentService, incomeService, funnelService, receiptService, referralService = null, voiceService = null, roastService = null }) {
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
    this.referralService = referralService;
    this.voiceService = voiceService;
    this.roastService = roastService; // строка «😈 Злой режим» в настройках
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
      // Источник из ссылки t.me/<bot>?start=<код> и первый шаг воронки. Приглашения друзей (ref_<код>) —
      // один источник «ref», а не отдельный у каждого пригласившего
      const startCode = FunnelService.parseStartSource(ctx.message && ctx.message.text);
      const referralCode = ReferralService.parseStartCode(startCode);
      await this.funnelService.registerSource(user.id, referralCode ? 'ref' : startCode);
      await this.funnelService.track(user.id, 'registered');
      if (referralCode) await this.attributeReferral(user, referralCode);

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
      // Пришёл по приглашению друга — напоминаем, как получить бонус
      if (this.referralService && await this.referralService.getPendingInviter(user.id).catch(() => null)) {
        message += `\n\n${this.localizationService.getText(userLanguage, 'referral_welcome_note', {
          expenses: this.referralService.config.ACTIVATION_EXPENSES,
          days: this.referralService.rewardDays
        })}`;
      }
    }
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: await this.mainKeyboardMarkup(user.id, userLanguage)
    });
  }

  // Новый пользователь по ссылке друга: привязка и сообщение пригласившему. Ошибка не мешает онбордингу
  async attributeReferral(user, code) {
    if (!this.referralService) return;
    try {
      const result = await this.referralService.attribute(user.id, code, { isNew: true });
      if (result.status === 'attributed') await this.referralService.notifyJoined(result.inviterId, user);
    } catch (error) {
      logger.error('Failed to attribute referral', { userId: user.id, error: error.message });
    }
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
    // Подсказки про фото чека и голосовые — только если распознавание настроено; вопросы боту работают всегда (частые — без нейросети)
    const hints = [t('help_message')];
    if (this.receiptService && this.receiptService.configured) hints.push(t('help_receipt'));
    if (this.voiceService && this.voiceService.configured) hints.push(t('help_voice'));
    hints.push(t('help_assistant'));
    hints.push(t('help_roast'));
    const text = hints.join('\n\n');
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
    if (this.roastService) {
      const roast = await this.roastService.getSettings(userId);
      lines.push(t('settings_roast_line', { level: t(`roast_level_${roast.level}`) }));
    }

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
        // Тизер вместо тупика: что даёт семья и кнопка перейти к премиуму (иногда — и «пригласи друга»)
        const t = (key) => this.localizationService.getText(userLanguage, key);
        let text = t('family_teaser');
        let keyboard = [
          [{ text: t('button_premium'), callback_data: 'premium_subscription' }],
          [{ text: t('button_back'), callback_data: 'back_to_menu' }]
        ];
        if (this.referralService) ({ text, keyboard } = await this.referralService.withUpsell(userId, userLanguage, text, keyboard));
        await respond(ctx, text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
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
      
      const pitch = await this.premiumPitch(userId, userLanguage, userTimezone, limitsInfo, subscription);
      message += `\n\n${pitch.blocks.join('\n\n')}\n\n${menuTitle}`;
    
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
      ...(pitch.referral ? [[{ text: this.localizationService.getText(userLanguage, 'button_invite'), callback_data: 'ref' }]] : []),
      [{ text: backButton, callback_data: 'back_to_menu' }]
    ];
    
    await respond(ctx, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  }

  // Блоки ценности экрана подписки (HTML): личная строка по записям за 30 дней, выгоды по результату, пробный
  // период, самый выгодный тариф в пересчёте на месяц и бонус за друга. Не загрузились данные — блок пропускается.
  async premiumPitch(userId, lang, timezone, limitsInfo, subscription) {
    const t = (key, params) => this.localizationService.getText(lang, key, params);
    const [source, recentCount, referralStats] = await Promise.all([
      this.referralService ? this.referralService.getPremiumSource(userId).catch(() => null) : null,
      this.recentExpenseCount(userId, timezone).catch(() => 0),
      this.referralService ? this.referralService.getStats(userId).catch(() => null) : null
    ]);
    const onTrial = !!limitsInfo.isPremium && source === 'trial';
    const paidOrGranted = !!limitsInfo.isPremium && !onTrial;
    const blocks = [];

    if (!paidOrGranted && recentCount > 0) {
      blocks.push(t(onTrial ? 'premium_hook_trial' : 'premium_hook_regular', { count: recentCount }));
    }
    const { regular: free, premium } = USER_LIMITS;
    const receipts = this.receiptService && this.receiptService.configured
      ? t('premium_benefit_receipts', { premium: premium.MAX_RECEIPTS_PER_MONTH, free: free.MAX_RECEIPTS_PER_MONTH })
      : '';
    // Голос — только если распознавание настроено (как чеки)
    const voice = this.voiceService && this.voiceService.configured
      ? t('premium_benefit_voice', { premium: premium.MAX_VOICE_PER_DAY, free: free.MAX_VOICE_PER_DAY })
      : '';
    blocks.push(t('premium_benefits', {
      receipts,
      voice,
      inflationPremium: premium.PLANNING_INFLATION_ITEMS,
      inflationFree: free.PLANNING_INFLATION_ITEMS,
      subsPremium: premium.PLANNING_SUBSCRIPTIONS,
      subsFree: free.PLANNING_SUBSCRIPTIONS,
      askPremium: premium.MAX_ASSISTANT_QUESTIONS_PER_DAY,
      askFree: free.MAX_ASSISTANT_QUESTIONS_PER_DAY,
      freezePremium: premium.STREAK_FREEZES_PER_WEEK,
      freezeFree: free.STREAK_FREEZES_PER_WEEK,
      challengesFree: free.MAX_ACTIVE_CHALLENGES
    }));
    blocks.push(t('premium_coming_soon'));
    if (onTrial) blocks.push(t('premium_trial_note'));
    if (!subscription) blocks.push(await this.bestValueLine(userId, lang));
    const referral = !paidOrGranted && !!referralStats && !referralStats.capped;
    if (referral) blocks.push(t('premium_referral_line', { days: this.referralService.rewardDays }));
    return { blocks, referral };
  }

  // Записей за последние 30 дней (включая сегодня) — для личной строки
  async recentExpenseCount(userId, timezone) {
    const totals = await this.expenseService.getTotals(userId, timezone, lastDaysPeriod(localToday(timezone), 30));
    return totals.count;
  }

  // Годовой тариф в пересчёте на месяц: звёзды и цена в основной валюте (как на экране тарифов), скидка — tariffDiscount
  async bestValueLine(userId, lang) {
    const year = PREMIUM_TARIFFS.MONTH_12;
    const monthUsd = year.usd / year.months;
    let price = this.formatter.formatAmount(monthUsd, 'USD');
    try {
      const currency = await this.userService.getUserCurrency(userId);
      price = this.formatter.formatAmount(await this.formatter.currencyUtils.convert(monthUsd, 'USD', currency), currency);
    } catch (error) {
      // нет курса — цена в USD
    }
    return this.localizationService.getText(lang, 'premium_best_value', {
      stars: Math.round(year.stars / year.months),
      price,
      percent: tariffDiscount(year).percent
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
