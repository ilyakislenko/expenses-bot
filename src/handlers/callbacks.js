const respond = require('../utils/respond');
const { summaryHour } = require('../services/DailySummaryService');

const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

class CallbackHandlers {
  constructor({ expenseService, premiumService, paymentService, familyService, categoryService, localizationService, formatter, stateService, userService, commandHandlers, keyboardGenerators, donationRepository, funnelService }) {
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
    keyboard.push([{ text: backText, callback_data: 'back_to_settings' }]);

    const list = current.map(h => `${h.toString().padStart(2,'0')}:00`).join(', ');
    const summaryLine = settings.daily_summary_enabled
      ? t('settings_daily_summary_on_line', { time: hourLabel(summaryHour(settings.daily_summary_hour)) })
      : t('settings_daily_summary_off_line');
    const newText = `🔔 *${t('reminders_title')}*\n\n${t('reminders_info')}\n\n${t('reminder_hours_info')} ${list || '-'}\n\n${t('daily_summary_info')}\n${summaryLine}`;
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
    const userLanguage = await this.userService.getUserLanguage(userId);
    await this.userService.setDailySummaryHour(userId, parseInt(ctx.callbackQuery.data.split('|')[1], 10));
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
      if (ctx.updateType === 'callback_query') {
        await ctx.editMessageText(body, { reply_markup: { inline_keyboard: keyboard } });
        await ctx.answerCbQuery();
      } else {
        await ctx.reply(body, { reply_markup: { inline_keyboard: keyboard } });
      }
    } catch (e) {
      const errText = this.localizationService.getText(userLanguage, 'error');
      await ctx.reply(errText);
    }
  }
  async handleClearReminderHours(ctx) {
    const userId = ctx.from.id;
    const settings = await this.userService.getReminderSettings(userId);
    // Если уже null (дефолты) — просто ответим
    if (!('reminder_hours' in settings) || settings.reminder_hours === null) {
      await ctx.answerCbQuery();
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
      // time|<часы>|<минуты> — текущее время пользователя, по нему вычисляем часовой пояс
      const [, hour, minute] = ctx.callbackQuery.data.split('|');
      const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');
      const timezone = calculateTimezoneFromUserTime(parseInt(hour, 10), parseInt(minute, 10), new Date(), { language: userLanguage });
      const displayName = getTimezoneDisplayName(timezone);

      await this.userService.setUserTimezone(userId, timezone);

      const timezoneSetText = this.localizationService.getText(userLanguage, 'timezone_set', { timezone: displayName });
      const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated', {
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        timezone: displayName
      });

      await ctx.answerCbQuery(timezoneSetText);
      const currentState = this.stateService.getUserState(userId);
      if (currentState === 'onboarding_timezone') {
        // Завершаем онбординг и показываем главное меню
        this.stateService.clearUserState(userId);
        await this.commandHandlers.start(ctx, { afterOnboarding: true });
      } else {
        await ctx.editMessageText(timezoneUpdatedText, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'back_to_settings' }]] }
        });
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
      
      // Если это шаг onboarding языка — сразу просим выбрать валюту
      const currentState = this.stateService.getUserState(userId);
      if (currentState === 'onboarding_language') {
        this.stateService.setUserState(userId, 'onboarding_currency');
        const currencyPrompt = this.localizationService.getText(languageCode, 'currency_select');
        const currencyKeyboard = require('../utils/constants').generateCurrencyKeyboard(this.localizationService, languageCode);
        await ctx.answerCbQuery(this.localizationService.getText(languageCode, 'language_set'));
        await ctx.editMessageText(currencyPrompt, {
          reply_markup: { inline_keyboard: currencyKeyboard }
        });
        return;
      } else {
        // Обычное изменение языка в настройках
        const languageSetMessage = this.localizationService.getText(languageCode, 'language_set');
        await ctx.answerCbQuery(languageSetMessage);
        await ctx.editMessageText(languageSetMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_settings' }]
            ]
          }
        });
        
        // Обновляем reply-клавиатуру на новом языке
        await ctx.telegram.sendMessage(ctx.chat.id,
          this.localizationService.getText(languageCode, 'keyboard_updated'),
          { reply_markup: await this.commandHandlers.mainKeyboardMarkup(userId, languageCode) }
        );
      }
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
          
          message += `• ${name} (${role}) - ${date}\n`;
          
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
      const confirmText = this.localizationService.getText(userLanguage, 'confirm_remove_member', { name: this.formatter.escapeMarkdown(memberName) });
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
      const successText = this.localizationService.getText(userLanguage, 'member_removed', { name: this.formatter.escapeMarkdown(memberName) });
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
      await this.funnelService.track(userId, 'tariffs_viewed');
      const subscription = await this.userService.getActiveRecurringSubscription(userId);
      
      const { PREMIUM_TARIFFS, generatePremiumPaymentButtons } = require('../utils/constants');
      
      const tariffsTitle = this.localizationService.getText(userLanguage, 'premium_tariffs_title');
      const paymentInfo = this.localizationService.getText(userLanguage, 'premium_payment_info');
      const renewalInfo = this.localizationService.getText(userLanguage, 'premium_renewal_info');
      const starsInfo = this.localizationService.getText(userLanguage, 'premium_stars_info');

      const backButton = this.localizationService.getText(userLanguage, 'premium_back_button');
      
      // Формируем строки тарифов: звезды + цена в базовой валюте пользователя
      const user = await this.userService.getUserById(userId);
      const userCurrency = user.currency || 'RUB';
      const linesArr = [];
      const tariffsArr = [PREMIUM_TARIFFS.MONTH_1, PREMIUM_TARIFFS.MONTH_3, PREMIUM_TARIFFS.MONTH_6, PREMIUM_TARIFFS.MONTH_12];
      for (const t of tariffsArr) {
        const durationKey = t.duration === 30 ? 'tariff_item_30' : t.duration === 90 ? 'tariff_item_90' : t.duration === 180 ? 'tariff_item_180' : 'tariff_item_365';
        const durationLabel = this.localizationService.getText(userLanguage, durationKey);
        let priceFormatted = '';
        try {
          const priceInCurrency = await this.formatter.currencyUtils.convert(Number(t.usd), 'USD', userCurrency);
          priceFormatted = this.formatter.formatAmount(priceInCurrency, userCurrency);
        } catch (e) {
          // если нет курсов, показываем USD как запасной вариант
          priceFormatted = this.formatter.formatAmount(Number(t.usd), 'USD');
        }
        let line = `- ${durationLabel} — `;
        // Stars part with original if exists
        if (t.originalStars) {
          line += `<s>${t.originalStars}</s> ${t.stars} ⭐`;
        } else {
          line += `${t.stars} ⭐`;
        }
        // Currency part with possible discount/original
        if (typeof t.discount === 'number' && t.discount > 0) {
          let originalFormatted = '';
          try {
            const originalUsd = Number(t.usd) / (1 - t.discount / 100);
            const originalInCurrency = await this.formatter.currencyUtils.convert(originalUsd, 'USD', userCurrency);
            originalFormatted = this.formatter.formatAmount(originalInCurrency, userCurrency);
          } catch (e) {
            const originalUsd = Number(t.usd) / (1 - t.discount / 100);
            originalFormatted = this.formatter.formatAmount(originalUsd, 'USD');
          }
          const discountText = this.localizationService.getText(userLanguage, 'discount_save', { percent: t.discount });
          line += ` / <s>${originalFormatted}</s> ${priceFormatted} (${discountText})`;
        } else {
          line += ` / ${priceFormatted}`;
        }
        linesArr.push(line);
        // Добавляем строку с эффективной ценой в месяц (звезды и валюта)
        try {
          const months = t.duration === 365 ? 12 : (t.duration === 180 ? 6 : (t.duration === 90 ? 3 : 1));
          const priceInCurrency = await this.formatter.currencyUtils.convert(Number(t.usd), 'USD', userCurrency);
          const monthlyCurrency = priceInCurrency / months;
          const monthlyCurrencyFormatted = this.formatter.formatAmount(monthlyCurrency, userCurrency);
          const monthlyStarsRaw = Number(t.stars) / months;
          const monthlyStars = Number.isInteger(monthlyStarsRaw) ? `${monthlyStarsRaw}` : monthlyStarsRaw.toFixed(1);
          const perMonth = this.localizationService.getText(userLanguage, 'per_month');
          linesArr.push(`  <i>≈ ${monthlyStars} ⭐ ${perMonth} • ${monthlyCurrencyFormatted} ${perMonth}</i>\n`);
        } catch (_) {
          // ignore
        }
      }
      const lines = linesArr.join('\n').slice(0, -1);

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
      await ctx.editMessageText(`${title}\n\n${info}\n\n${example}`, {
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
      await ctx.editMessageText(`${enterName}\n\n${example}`, {
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
      const example = this.localizationService.getText(userLanguage, 'custom_categories_example');
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      await ctx.answerCbQuery();
      await ctx.editMessageText(`${enterName}\n\n${example}`, { reply_markup: { inline_keyboard: [[{ text: backText, callback_data: 'custom_categories_manage' }]] } });
    } catch (error) {
      console.error('Error opening rename custom category:', error);
      await ctx.answerCbQuery(this.localizationService.getText(userLanguage, 'error'));
    }
  }




}

module.exports = CallbackHandlers; 