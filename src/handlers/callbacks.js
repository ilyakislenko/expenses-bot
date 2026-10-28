const respond = require('../utils/respond');
const { summaryHour } = require('../services/DailySummaryService');

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

class CallbackHandlers {
  constructor({ expenseService, premiumService, paymentService, familyService, categoryService, localizationService, formatter, stateService, userService, commandHandlers, keyboardGenerators, donationRepository, funnelService, weeklyInsightService, planningService = null, achievementService = null, onboardingHandlers = null }) {
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
    this.donationRepository = donationRepository;
    this.funnelService = funnelService;
    this.weeklyInsightService = weeklyInsightService;
    this.planningService = planningService;
    this.achievementService = achievementService;
    this.onboardingHandlers = onboardingHandlers; // опрос «🧭 Настроим бота под тебя»: шаги языка и часового пояса
  }

  async handleToggleReminders(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const settings = await this.userService.getReminderSettings(userId);
    const newValue = !settings.reminder_enabled;
    await this.userService.setReminderEnabled(userId, newValue);
    await ctx.answerCbQuery(this.localizationService.getText(userLanguage, newValue ? 'reminders_enabled' : 'reminders_disabled'));
    await this.handleConfigureReminderHours(ctx);
  }

  // Экран «🔔 Напоминания»: включение и часы на одном экране
  async handleConfigureReminderHours(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key, params) => this.localizationService.getText(userLanguage, key, params);
    const settings = await this.userService.getReminderSettings(userId);
    const current = Array.isArray(settings.reminder_hours)
      ? [...settings.reminder_hours].sort((a,b)=>a-b)
      : [10,14,18];
    const backText = t('button_back');
    const saveText = t('button_save');
    const clearText = t('button_clear');

    const keyboard = [[{
      text: t(settings.reminder_enabled ? 'button_reminders_on' : 'button_reminders_off'),
      callback_data: 'toggle_reminders'
    }]];
    // Сетка часов 0..23, выбранные отмечены галочкой
    for (let row = 0; row < 6; row++) {
      const rowButtons = [];
      for (let col = 0; col < 4; col++) {
        const hour = row * 4 + col;
        if (hour <= 23) {
          const selected = current.includes(hour);
          const label = `${selected ? '✅' : '☐'} ${hour.toString().padStart(2, '0')}:00`;
          rowButtons.push({ text: label, callback_data: `toggle_reminder_hour|${hour}` });
        }
      }
      if (rowButtons.length) keyboard.push(rowButtons);
    }
    keyboard.push([
      { text: saveText, callback_data: 'save_reminder_hours' },
      { text: clearText, callback_data: 'clear_reminder_hours' }
    ]);
    // Ежедневная сводка: вкл/выкл и её час (выбор часа — на отдельном экране)
    keyboard.push([
      { text: t(settings.daily_summary_enabled ? 'button_daily_summary_on' : 'button_daily_summary_off'), callback_data: 'toggle_daily_summary' },
      { text: `🕒 ${hourLabel(summaryHour(settings.daily_summary_hour))}`, callback_data: 'daily_summary_hour' }
    ]);
    // Сводка недели: вкл/выкл и «показать сейчас» (работает и при выключенной)
    keyboard.push([
      { text: t(settings.weekly_insight_enabled ? 'button_weekly_insight_on' : 'button_weekly_insight_off'), callback_data: 'toggle_weekly_insight' },
      { text: t('button_weekly_insight_now'), callback_data: 'weekly_insight_now' }
    ]);
    // Платежи (Планирование): утреннее напоминание о том, что спишется сегодня и завтра
    const billsOn = this.planningService ? await this.planningService.isBillRemindersEnabled(userId) : false;
    if (this.planningService) {
      keyboard.push([{ text: t(billsOn ? 'pl_button_bills_on' : 'pl_button_bills_off'), callback_data: 'plct|s' }]);
    }
    keyboard.push([{ text: backText, callback_data: 'back_to_settings' }]);

    const list = current.map(h => `${h.toString().padStart(2,'0')}:00`).join(', ');
    const summaryLine = settings.daily_summary_enabled
      ? t('settings_daily_summary_on_line', { time: hourLabel(summaryHour(settings.daily_summary_hour)) })
      : t('settings_daily_summary_off_line');
    const weeklyLine = t(settings.weekly_insight_enabled ? 'settings_weekly_insight_on_line' : 'settings_weekly_insight_off_line');
    let newText = `🔔 *${t('reminders_title')}*\n\n${t('reminders_info')}\n\n${t('reminder_hours_info')} ${list || '-'}\n\n${t('daily_summary_info')}\n${summaryLine}\n\n${t('weekly_insight_info')}\n${weeklyLine}`;
    if (this.planningService) newText += `\n\n${t('pl_bills_info')}\n${t(billsOn ? 'pl_settings_bills_on_line' : 'pl_settings_bills_off_line')}`;
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, newText, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
  }

  async handleToggleDailySummary(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const settings = await this.userService.getReminderSettings(userId);
    const newValue = !settings.daily_summary_enabled;
    await this.userService.setDailySummaryEnabled(userId, newValue);
    await ctx.answerCbQuery(this.localizationService.getText(userLanguage, newValue ? 'daily_summary_enabled' : 'daily_summary_disabled'));
    await this.handleConfigureReminderHours(ctx);
  }

  async handleToggleWeeklyInsight(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const settings = await this.userService.getReminderSettings(userId);
    const newValue = !settings.weekly_insight_enabled;
    await this.userService.setWeeklyInsightEnabled(userId, newValue);
    await ctx.answerCbQuery(this.localizationService.getText(userLanguage, newValue ? 'weekly_insight_enabled' : 'weekly_insight_disabled'));
    await this.handleConfigureReminderHours(ctx);
  }

  // «Показать сейчас»: сводка недели отдельным сообщением, экран напоминаний остаётся
  async handleWeeklyInsightNow(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const insight = await this.weeklyInsightService.buildInsight(userId, userLanguage);
    if (!insight) {
      return ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'weekly_insight_no_data'), { show_alert: true });
    }
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply(insight.text, { parse_mode: 'Markdown', reply_markup: this.weeklyInsightService.keyboard(userLanguage, insight) });
  }

  // «Выключить сводку недели» под сводкой: сводка остаётся, у неё пропадает кнопка выключения
  async handleWeeklyInsightOff(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    await this.userService.setWeeklyInsightEnabled(userId, false);
    await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'weekly_insight_turned_off'), { show_alert: true });
    await ctx.editMessageReplyMarkup({
      inline_keyboard: this.weeklyInsightService.keyboard(userLanguage).inline_keyboard.slice(0, 1)
    }).catch(() => {});
  }

  // Выбор часа ежедневной сводки: сетка 0..23, текущий час отмечен
  async handleDailySummaryHour(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const t = (key) => this.localizationService.getText(userLanguage, key);
    const settings = await this.userService.getReminderSettings(userId);
    const current = summaryHour(settings.daily_summary_hour);
    const keyboard = [];
    for (let row = 0; row < 6; row++) {
      keyboard.push([0, 1, 2, 3].map(col => {
        const hour = row * 4 + col;
        return { text: `${hour === current ? '✅' : '☐'} ${hourLabel(hour)}`, callback_data: `set_daily_summary_hour|${hour}` };
      }));
    }
    keyboard.push([{ text: t('button_back'), callback_data: 'configure_reminder_hours' }]);
    await ctx.answerCbQuery().catch(() => {});
    await respond(ctx, `🗓 *${t('daily_summary_title')}*\n\n${t('daily_summary_hour_info')}`, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
  }

  // Выбранный час сохраняется и включает сводку
  async handleSetDailySummaryHour(ctx) {
    const userId = ctx.from.id;
    const hour = parseInt(ctx.callbackQuery.data.split('|')[1], 10);
    if (!(hour >= 0 && hour <= 23)) return ctx.answerCbQuery().catch(() => {}); // подменённая кнопка
    const userLanguage = await this.userService.getUserLanguage(userId);
    await this.userService.setDailySummaryHour(userId, hour);
    await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'daily_summary_hour_set'));
    await this.handleConfigureReminderHours(ctx);
  }

  async handleToggleReminderHour(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const settings = await this.userService.getReminderSettings(userId);
    const hours = Array.isArray(settings.reminder_hours)
      ? [...settings.reminder_hours]
      : [10, 14, 18];
    const hour = parseInt(ctx.callbackQuery.data.split('|')[1], 10);
    if (!(hour >= 0 && hour <= 23)) return ctx.answerCbQuery().catch(() => {}); // подменённая кнопка
    const idx = hours.indexOf(hour);
    if (idx >= 0) {
      hours.splice(idx, 1);
    } else {
      if (hours.length >= 3) {
        const limitText = this.localizationService.getText(userLanguage, 'reminder_hours_limit');
        await ctx.answerCbQuery(limitText, { show_alert: true });
        return;
      }
      hours.push(hour);
    }
    await this.userService.setReminderHours(userId, hours);
    // Обновим интерфейс
    await this.handleConfigureReminderHours(ctx);
  }

  async handleSaveReminderHours(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const confirm = this.localizationService.getText(userLanguage, 'reminder_hours_saved');
    await ctx.answerCbQuery(confirm, { show_alert: false });
    await this.commandHandlers.settings(ctx);
  }

  async handlePremiumPurchases(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    try {
      // Пагинация: извлекаем страницу из callback_data вида 'premium_purchases|<page>'
      let page = 1;
      if (ctx.callbackQuery && typeof ctx.callbackQuery.data === 'string') {
        const match = ctx.callbackQuery.data.match(/^premium_purchases\|(\d+)$/);
        if (match) {
          page = Math.max(1, parseInt(match[1], 10) || 1);
        }
      }

      const pageSize = 10;
      const offset = (page - 1) * pageSize;
      // Берём на один больше, чтобы понять, есть ли следующая страница
      const fetchLimit = pageSize + 1;
      const transactionsAll = await this.userService.getUserTransactions(userId, fetchLimit, offset);
      const donationsAll = this.donationRepository ? await this.donationRepository.getUserDonations(userId, fetchLimit, offset) : [];
      const transactions = (transactionsAll || []).slice(0, pageSize);
      const donations = (donationsAll || []).slice(0, pageSize);
      const hasMore = (transactionsAll && transactionsAll.length > pageSize) || (donationsAll && donationsAll.length > pageSize);
      const timezone = await this.userService.getUserTimezone(userId);
      const formatDate = (value) => this.formatter.formatDate(value, timezone);

      const header = this.localizationService.getText(userLanguage, 'purchases_header');
      let text = `${header}\n\n`;
      if (!transactions.length && !donations.length) {
        text += this.localizationService.getText(userLanguage, 'no_purchases');
      }
      if (transactions && transactions.length) {
        const premiumTitle = this.localizationService.getText(userLanguage, 'purchases_premium_title');
        text += `⭐ ${premiumTitle}:\n`;
        const shorten = (s) => {
          if (!s) return '-';
          const str = String(s);
          return str.length > 36 ? `${str.slice(0, 14)}…${str.slice(-12)}` : str;
        };
        for (const t of transactions) {
          const date = formatDate(t.created_at);
          const stars = t.stars_amount || 0;
          const status = t.status || 'completed';
          const hash = shorten(t.telegram_payment_id || '-');
          text += `• ${date} — ${stars}⭐ — ${status} — ${hash}\n`;
        }
        text += `\n`;
      }
      if (donations && donations.length) {
        const donateTitle = this.localizationService.getText(userLanguage, 'purchases_donations_title');
        text += `💎 ${donateTitle}:\n`;
        for (const d of donations) {
          const date = formatDate(d.created_at);
          const stars = d.stars || 0;
          const status = d.status || 'completed';
          const hash = (d.telegram_payment_id ? (d.telegram_payment_id.length > 36 ? `${d.telegram_payment_id.slice(0,14)}…${d.telegram_payment_id.slice(-12)}` : d.telegram_payment_id) : '-');
          text += `• ${date} — ${stars}⭐ — ${status} — ${hash}\n`;
        }
      }

      const backText = this.localizationService.getText(userLanguage, 'premium_back_button');
      const prevText = this.localizationService.getText(userLanguage, 'purchases_prev_button');
      const nextText = this.localizationService.getText(userLanguage, 'purchases_next_button');
      const keyboard = [];
      const navRow = [];
      if (page > 1) {
        navRow.push({ text: prevText, callback_data: `premium_purchases|${page - 1}` });
      }
      if (hasMore) {
        navRow.push({ text: nextText, callback_data: `premium_purchases|${page + 1}` });
      }
      if (navRow.length) keyboard.push(navRow);
      keyboard.push([{ text: backText, callback_data: 'premium_subscription' }]);

      const body = text.trim();
      if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
      await respond(ctx, body, { reply_markup: { inline_keyboard: keyboard } });
    } catch (e) {
      console.error('Error showing purchases:', e);
      if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});
      const errText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errText);
    }
  }

  async handleClearReminderHours(ctx) {
    const userId = ctx.from.id;
    const settings = await this.userService.getReminderSettings(userId);
    // Уже дефолтные часы — объясняем, а не молчим
    if (!('reminder_hours' in settings) || settings.reminder_hours === null) {
      const userLanguage = await this.userService.getUserLanguage(userId);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'reminder_hours_default_already', { hours: '10:00, 14:00, 18:00' }), { show_alert: true }).catch(() => {});
      return;
    }
    // Сбрасываем к дефолтной логике (NULL в БД => показываются 10,14,18)
    await this.userService.setReminderHours(userId, null);
    await this.handleConfigureReminderHours(ctx);
  }

  async handleBugReport(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    
    // Устанавливаем состояние "ожидание баг-репорта"
    this.stateService.setUserState(userId, 'bug_report');
    
    const prompt = this.localizationService.getText(userLanguage, 'bug_report_prompt');
    const backText = this.localizationService.getText(userLanguage, 'button_back');
    
    await ctx.answerCbQuery();
    await respond(ctx, prompt, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: backText, callback_data: 'help' }]
        ]
      }
    });
  }

  async handleCancel(ctx) {
    let userLanguage = 'en'; // fallback язык
    try {
      const userId = ctx.from.id;
      userLanguage = await this.userService.getUserLanguage(userId);
      // Черновик этой карточки больше не нужен — старые кнопки категорий его не запишут
      this.stateService.deletePendingExpense(userId, ctx.callbackQuery.message?.message_id);
      const canceledText = this.localizationService.getText(userLanguage, 'callback_canceled');
      const expenseCanceledText = this.localizationService.getText(userLanguage, 'callback_expense_canceled');
      
      await ctx.answerCbQuery(canceledText);
      await ctx.editMessageText(expenseCanceledText);
    } catch (error) {
      console.error('Error handling cancel:', error);
    }
  }

  // time|<час>|<минуты>[|h][|ob]: время пользователя на момент показа клавиатуры; `|h` — кнопка с минутами, сдвинутыми
  // на полчаса (пояса UTC+5:30 и т.п.), `|ob` — вопрос опроса нового пользователя
  async handleTimezoneSelection(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const [, hourText, minuteText, ...flags] = ctx.callbackQuery.data.split('|');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const onboarding = flags.includes('ob');
    const half = flags.includes('h');
    try {
      const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');
      // Минуты на кнопках — момент показа клавиатуры, поэтому и опорное время — дата сообщения, а не нажатия
      const message = ctx.callbackQuery.message;
      const shownAt = message && (message.edit_date || message.date);
      const referenceTime = shownAt ? new Date(shownAt * 1000) : new Date();
      // Бросает RangeError на нечисловых и выходящих за 0–23 / 0–59 значениях: подменённая кнопка ничего не сохраняет
      const timezone = calculateTimezoneFromUserTime(hour, minute, referenceTime, { language: userLanguage, half });
      await this.userService.setUserTimezone(userId, timezone);

      const displayName = getTimezoneDisplayName(timezone);
      const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated', {
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        timezone: displayName
      });
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'timezone_set', { timezone: displayName }));
      if (onboarding) {
        // Дальше — следующий вопрос опроса в том же сообщении
        await this.onboardingHandlers.afterTimezone(ctx, timezone);
      } else {
        await respond(ctx, timezoneUpdatedText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.localizationService.getText(userLanguage, 'button_back'), callback_data: 'back_to_settings' }]] }
        });
      }
    } catch (error) {
      console.error('Error handling timezone selection:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'timezone_error')).catch(() => {});
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

  // set_language|<код>[|ob]: `|ob` — язык нового пользователя, после него опрос «🧭 Настроим бота под тебя»
  async handleLanguageSelection(ctx) {
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    // Автоматическая регистрация пользователя, если он еще не зарегистрирован
    await this.userService.registerUser(userId, ctx.from.username, ctx.from.first_name);

    try {
      const [, languageCode, onboardingFlag] = ctx.callbackQuery.data.split('|');

      // Проверяем, поддерживается ли язык
      if (!this.localizationService.isLanguageSupported(languageCode)) {
        const languageNotSupportedText = this.localizationService.getText(userLanguage, 'language_not_supported');
        await ctx.answerCbQuery(languageNotSupportedText);
        return;
      }

      await this.userService.setUserLanguage(userId, languageCode);
      const languageSetMessage = this.localizationService.getText(languageCode, 'language_set');
      await ctx.answerCbQuery(languageSetMessage);

      // Язык нового пользователя — дальше первый вопрос опроса
      if (onboardingFlag === 'ob') {
        await this.onboardingHandlers.beginNew(ctx, languageCode);
        return;
      }

      // Обычное изменение языка в настройках
      await respond(ctx, languageSetMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: this.localizationService.getText(languageCode, 'button_back'), callback_data: 'back_to_settings' }]
          ]
        }
      });

      // Обновляем reply-клавиатуру на новом языке
      await ctx.telegram.sendMessage(ctx.chat.id,
        this.localizationService.getText(languageCode, 'keyboard_updated'),
        { reply_markup: await this.commandHandlers.mainKeyboardMarkup(userId, languageCode) }
      );
    } catch (error) {
      console.error('Error handling language selection:', error);
      const languageChangeErrorText = this.localizationService.getText(userLanguage, 'language_change_error');
      await ctx.answerCbQuery(languageChangeErrorText).catch(() => {});
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
      await respond(ctx, enterFamilyNameText, {
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
      await respond(ctx, enterInviteCodeText, {
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
          const inviteeName = invitation.invitee_username ? `@${invitation.invitee_username}` : (invitation.invitee_first_name || 'Unknown');
          const hoursLeft = Math.max(1, Math.ceil((new Date(invitation.expires_at_utc) - new Date()) / (1000 * 60 * 60)));
          
          message += `${index + 1}. ${inviteeName} (${invitation.invite_code})\n`;
          message += `   ${this.localizationService.getText(userLanguage, 'family_invitation_hours_left', { hours: hoursLeft })}\n\n`;
          
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
      await respond(ctx, message, {
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
      await respond(ctx, enterUsernameText, {
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
        // Дата вступления — в языке и часовом поясе пользователя
        const intlLocale = { jp: 'ja', kz: 'kk' }[userLanguage] || userLanguage;
        const timezone = await this.userService.getUserTimezone(userId);
        const dateFormat = new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone });
        members.forEach(member => {
          const role = member.role === 'owner' ? 
            this.localizationService.getText(userLanguage, 'family_owner_role') : 
            this.localizationService.getText(userLanguage, 'family_member_role');
          const name = member.username ? `@${member.username}` : (member.first_name || 'Unknown');
          const date = dateFormat.format(new Date(member.joined_at_utc));
          
          message += `• ${this.formatter.escapeMarkdown(name)} (${role}) - ${date}\n`;
          
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
        message += this.localizationService.getText(userLanguage, 'family_no_members');
      }
      
      // Добавляем кнопку "Назад"
      keyboard.push([{ text: backText, callback_data: 'family_menu' }]);
      
      await ctx.answerCbQuery();
      // Заголовок family_members_title — жирный Markdown; имена экранированы
      await respond(ctx, message, {
        parse_mode: 'Markdown',
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
      
      // Только участник семьи владельца и не сам владелец: по чужому id профиль не показываем
      const member = await this.familyService.getRemovableMember(userId, memberId);
      const memberName = member.username || member.first_name || 'Unknown';
      
      // Показываем подтверждение
      const confirmText = this.localizationService.getText(userLanguage, 'confirm_remove_member', { name: this.formatter.escapeMarkdown(memberName) });
      const confirmButtonText = this.localizationService.getText(userLanguage, 'confirm');
      const cancelText = this.localizationService.getText(userLanguage, 'family_cancel');
      
      await ctx.answerCbQuery();
      await respond(ctx, confirmText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: confirmButtonText, callback_data: `confirm_remove_member|${member.id}` },
              { text: cancelText, callback_data: 'family_members' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling remove member:', error);
      await ctx.answerCbQuery(await this.removeMemberErrorText(ctx, error)).catch(() => {});
    }
  }

  // Себя исключить нельзя (кнопки нет — только подделанный callback), чужого — «не найден»
  async removeMemberErrorText(ctx, error) {
    const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
    let key = 'error';
    if (error.message.includes('Cannot remove yourself')) {
      key = 'not_authorized';
    } else if (error.message.includes('not a member of this family')) {
      key = 'user_not_found';
    }
    return this.localizationService.getText(userLanguage, key);
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
      
      // Имя берём до исключения: проверка членства — та же, что и на экране подтверждения
      const member = await this.familyService.getRemovableMember(userId, memberId);
      const memberName = member.username || member.first_name || 'Unknown';
      
      // Исключаем участника; его траты в этой семье становятся личными
      await this.familyService.removeMemberFromFamily(userId, member.id);
      
      // Показываем сообщение об успехе
      const successText = this.localizationService.getText(userLanguage, 'member_removed', { name: this.formatter.escapeMarkdown(memberName) });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery();
      await respond(ctx, successText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'family_members' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error handling confirm remove member:', error);
      await ctx.answerCbQuery(await this.removeMemberErrorText(ctx, error)).catch(() => {});
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
      
      const familyDeletedText = this.localizationService.getText(userLanguage, 'family_deleted', { name: this.formatter.escapeMarkdown(deletedFamily.name) });
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
      
      const familyLeftText = this.localizationService.getText(userLanguage, 'family_left', { name: this.formatter.escapeMarkdown(leftFamily.name) });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery();
      await respond(ctx, familyLeftText, {
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
      
      const invitationAcceptedText = this.localizationService.getText(userLanguage, 'invitation_accepted', { 
        familyName: result.family?.name || 'Unknown Family'
      });
      
      await ctx.answerCbQuery(invitationAcceptedText);
      // Строка достижений — в Markdown, поэтому название семьи (пользовательский текст) экранируется
      const note = this.achievementService ? await this.achievementService.track(userId, 'family_joined', { lang: userLanguage }) : '';
      const text = note
        ? `${this.localizationService.getText(userLanguage, 'invitation_accepted', { familyName: this.formatter.escapeMarkdown(result.family?.name || 'Unknown Family') })}\n\n${note}`
        : invitationAcceptedText;
      await ctx.editMessageText(text, {
        ...(note ? { parse_mode: 'Markdown' } : {}),
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
        errorText = this.localizationService.getText(userLanguage, 'family_already_member');
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
    // Ссылки на оплату создаются 3–4 запросами к Telegram — индикатор загрузки закрываем сразу
    await ctx.answerCbQuery().catch(() => {});
    try {
      const userId = ctx.from.id;
      const userLanguage = await this.userService.getUserLanguage(userId);
      await this.funnelService.track(userId, 'tariffs_viewed');
      const subscription = await this.userService.getActiveRecurringSubscription(userId);
      
      const { PREMIUM_TARIFFS, tariffDiscount, generatePremiumPaymentButtons } = require('../utils/constants');
      
      const tariffsTitle = this.localizationService.getText(userLanguage, 'premium_tariffs_title');
      const paymentInfo = this.localizationService.getText(userLanguage, 'premium_payment_info');
      const renewalInfo = this.localizationService.getText(userLanguage, 'premium_renewal_info');
      const starsInfo = this.localizationService.getText(userLanguage, 'premium_stars_info');
      const perMonth = this.localizationService.getText(userLanguage, 'per_month');

      const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
      
      // Формируем строки тарифов: звезды + цена в базовой валюте пользователя.
      // Зачёркнутая цена и скидка — относительно помесячной оплаты (месячный тариф × число месяцев).
      const user = await this.userService.getUserById(userId);
      const userCurrency = user.currency || 'RUB';
      const month = PREMIUM_TARIFFS.MONTH_1;
      let rate = 1;
      let priceCurrency = 'USD';
      try {
        rate = (await this.formatter.currencyUtils.convert(month.usd, 'USD', userCurrency)) / month.usd;
        priceCurrency = userCurrency;
      } catch (e) {
        // если нет курсов, показываем USD как запасной вариант
      }
      const formatPrice = (usd) => this.formatter.formatAmount(usd * rate, priceCurrency);
      const intlLocale = { jp: 'ja', kz: 'kk' }[userLanguage] || userLanguage;
      const formatStars = (value) => {
        try {
          return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 1 }).format(value);
        } catch (e) {
          return String(Math.round(value * 10) / 10);
        }
      };

      const linesArr = [];
      const tariffsArr = [PREMIUM_TARIFFS.MONTH_1, PREMIUM_TARIFFS.MONTH_3, PREMIUM_TARIFFS.MONTH_6, PREMIUM_TARIFFS.MONTH_12];
      for (const t of tariffsArr) {
        const durationKey = t.duration === 30 ? 'tariff_item_30' : t.duration === 90 ? 'tariff_item_90' : t.duration === 180 ? 'tariff_item_180' : 'tariff_item_365';
        const durationLabel = this.localizationService.getText(userLanguage, durationKey);
        const discount = tariffDiscount(t);
        let line = `- ${durationLabel} — `;
        if (discount.percent > 0) {
          const discountText = this.localizationService.getText(userLanguage, 'discount_save', { percent: discount.percent });
          line += `<s>${discount.fullStars}</s> ${t.stars} ⭐ / <s>${formatPrice(discount.fullUsd)}</s> ${formatPrice(t.usd)} (${discountText})`;
        } else {
          line += `${t.stars} ⭐ / ${formatPrice(t.usd)}`;
        }
        // Эффективная цена в месяц — только для многомесячных тарифов (у месячного она совпадает с ценой)
        if (t.months > 1) {
          line += `\n  <i>≈ ${formatStars(t.stars / t.months)} ⭐ ${perMonth} • ${formatPrice(t.usd / t.months)} ${perMonth}</i>`;
        }
        linesArr.push(line);
      }
      const lines = linesArr.join('\n\n');

      let message = `${tariffsTitle}\n\n${lines}\n\n${paymentInfo}\n\n${renewalInfo}\n\n${starsInfo}`;
      if (subscription) {
        message += `\n\n${this.localizationService.getText(userLanguage, 'subscription_active_info', {
          date: this.formatter.formatDate(subscription.subscription_expires_at, user.timezone || 'UTC')
        })}`;
      }
      
      // Генерируем кнопки оплаты
      const paymentButtons = generatePremiumPaymentButtons(PREMIUM_TARIFFS, this.localizationService, userLanguage);
      
      // Создаем кнопки с прямыми ссылками на оплату.
      // Месячный тариф — подписка с автопродлением (🔁); при уже действующей подписке второй раз её не предлагаем.
      const buttonsWithLinks = [];
      for (const row of paymentButtons) {
        const newRow = [];
        for (const button of row) {
          const tariff = PREMIUM_TARIFFS[button.tariffKey.toUpperCase()];
          const isSubscription = tariff.duration === 30;
          if (isSubscription && subscription) continue;
          const paymentLink = await this.paymentService.createInvoiceLink(userId, tariff, userLanguage);
          newRow.push({
            text: isSubscription ? `🔁 ${button.text}` : button.text,
            url: paymentLink
          });
        }
        if (newRow.length) buttonsWithLinks.push(newRow);
      }
      
      const inlineKeyboard = [
        ...buttonsWithLinks,
        [{ text: backButton, callback_data: 'premium_subscription' }]
      ];
      
      await respond(ctx, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });
    } catch (error) {
      console.error('Error handling premium tariffs:', error);
      const userLanguage = await this.userService.getUserLanguage(ctx.from.id);
      await ctx.reply(this.localizationService.getText(userLanguage, 'error')).catch(() => {});
    }
  }

  async handlePremiumWhyPaid(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);

    const whyPaidTitle = this.localizationService.getText(userLanguage, 'premium_why_paid_title');
    const whyPaidText = this.localizationService.getText(userLanguage, 'premium_why_paid_text');
    const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');

    await respond(ctx, `${whyPaidTitle}\n\n${whyPaidText}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: backButton, callback_data: 'premium_subscription' }]]
      }
    });
  }

  async handlePremiumDonate(ctx) {
    await ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const userLanguage = await this.userService.getUserLanguage(userId);
    const title = this.localizationService.getText(userLanguage, 'donate_prompt_title');
    const text = this.localizationService.getText(userLanguage, 'donate_prompt_text');
    const backText = this.localizationService.getText(userLanguage, 'premium_back_button');

    // Ставим состояние ожидания доната
    this.stateService.setUserState(userId, 'entering_donation');

    await respond(ctx, `${title}\n\n${text}`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'premium_subscription' }]] }
    });
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
      const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
      const addText = this.localizationService.getText(userLanguage, 'custom_categories_add');
      const manageText = this.localizationService.getText(userLanguage, 'custom_categories_manage');
      const backText = this.localizationService.getText(userLanguage, 'button_back');

      const keyboard = [
        [{ text: addText, callback_data: 'custom_categories_add' }],
        [{ text: manageText, callback_data: 'custom_categories_manage' }],
        [{ text: backText, callback_data: 'back_to_settings' }]
      ];

      await ctx.answerCbQuery();
      await respond(ctx, `${title}\n\n${info}\n\n${example}`, {
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
      const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
      const backText = this.localizationService.getText(userLanguage, 'button_back');

      await ctx.answerCbQuery();
      await respond(ctx, `${enterName}\n\n${example}`, {
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
      await respond(ctx, message, { reply_markup: { inline_keyboard: keyboard } });
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
      if (!deleted) {
        return ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'callback_data_not_found'));
      }
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      const deletedText = this.localizationService.getText(userLanguage, 'custom_categories_deleted');
      await ctx.answerCbQuery(deletedText);
      await respond(ctx, deletedText, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
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
      const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.answerCbQuery();
      await respond(ctx, `${enterName}\n\n${example}`, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
    } catch (error) {
      console.error('Error opening rename custom category:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }




}

module.exports = CallbackHandlers; 