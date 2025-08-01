const { getTimezoneByCode } = require('../utils/timezone');

class CallbackHandlers {
  constructor({ expenseService, premiumService, localizationService, formatter, stateService, userService, commandHandlers }) {
    this.expenseService = expenseService;
    this.premiumService = premiumService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.userService = userService;
    this.commandHandlers = commandHandlers;
  }

  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    let userLanguage = 'en'; // fallback язык
    
    // Автоматическая регистрация пользователя, если он еще не зарегистрирован
    await this.userService.registerUser(userId, ctx.from.username, ctx.from.first_name);
    
    // Получаем язык пользователя для локализации
    userLanguage = await this.userService.getUserLanguage(userId);
    
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, categoryName] = callbackData.split('|');
      const pending = this.stateService.getPendingExpense(userId);
      if (!pending) {
        const dataNotFoundText = this.localizationService.getText(userLanguage, 'callback_data_not_found');
        return await ctx.answerCbQuery(dataNotFoundText);
      }
      const { amount, description } = pending;
      
      // Проверяем лимит количества записей
      const expenseCountValidation = await this.premiumService.validateExpenseCount(userId);
      if (!expenseCountValidation.isValid) {
        const limitReachedText = this.localizationService.getText(userLanguage, 'callback_limit_reached');
        const errorLimitReachedText = this.localizationService.getText(userLanguage, 'error_limit_reached');
        await ctx.answerCbQuery(limitReachedText);
        await ctx.editMessageText(errorLimitReachedText, { parse_mode: 'Markdown' });
        return;
      }
      
      // Получаем название категории из кнопки
      const button = ctx.callbackQuery.message.reply_markup.inline_keyboard
        .flat()
        .find(btn => btn.callback_data === callbackData);
      if (!button) {
        const buttonNotFoundText = this.localizationService.getText(userLanguage, 'callback_button_not_found');
        return await ctx.answerCbQuery(buttonNotFoundText);
      }
      // Добавляем расход через сервис
      const expense = await this.expenseService.addExpense(
        userId,
        parseFloat(amount),
        description,
        categoryName
      );
      const formattedAmount = this.formatter.formatAmount(expense.amount, expense.currency);
      const formattedDescription = expense.description || this.localizationService.getText(userLanguage, 'not_found');
      
      // Локализуем название категории
      const localizedCategoryName = this.formatter.translateCategoryName(categoryName, this.localizationService, userLanguage);
      const expenseAddedText = this.localizationService.getText(userLanguage, 'callback_expense_added', { category: localizedCategoryName });
      const backText = this.localizationService.getText(userLanguage, 'button_back');
      
      await ctx.answerCbQuery(expenseAddedText);
      const expenseAddedTitleText = this.localizationService.getText(userLanguage, 'expense_added_title');
      const amountLabelText = this.localizationService.getText(userLanguage, 'amount_label');
      const descriptionLabelText = this.localizationService.getText(userLanguage, 'description_label');
      const categoryLabelText = this.localizationService.getText(userLanguage, 'category_label');
      
      await ctx.editMessageText(
        `✅ *${expenseAddedTitleText}*\n\n` +
        `💰 ${amountLabelText}: *${formattedAmount}*\n` +
        `📝 ${descriptionLabelText}: ${formattedDescription}\n` +
        `🏷️ ${categoryLabelText}: ${localizedCategoryName}`,
        { parse_mode: 'Markdown', reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_menu' }]
          ]
        } }
      );
    } catch (error) {
      console.error('Error handling category selection:', error);
      const expenseSavedErrorText = this.localizationService.getText(userLanguage, 'callback_expense_saved');
      await ctx.answerCbQuery(expenseSavedErrorText);
    } finally {
      this.stateService.deletePendingExpense(userId);
    }
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
      const callbackData = ctx.callbackQuery.data;
      const parts = callbackData.split('|');
      const [, timezoneCode] = parts;
      
      // Проверяем, это новый формат времени или старый формат городов
      if (callbackData.startsWith('time|')) {
        // Новый формат: time|hour|minute
        const [, hour, minute] = callbackData.split('|');
        const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');
        
        // Используем время выбора как опорное время
        const selectionTime = new Date();
        const timezone = calculateTimezoneFromUserTime(parseInt(hour), parseInt(minute), selectionTime);
        const displayName = getTimezoneDisplayName(timezone);
        
        // Устанавливаем timezone пользователя
        await this.userService.setUserTimezone(userId, timezone);
        
        const timezoneSetText = this.localizationService.getText(userLanguage, 'timezone_set', { timezone: displayName });
        const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated', { 
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          timezone: displayName 
        });
        
        await ctx.answerCbQuery(timezoneSetText);
        await ctx.editMessageText(timezoneUpdatedText,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_settings' }]
            ]
          } }
        );
      } else {
        // Старый формат: tz|city
        const { getTimezoneByCode } = require('../utils/timezone');
        
        // Получаем полное название timezone по коду
        const timezone = getTimezoneByCode(timezoneCode);
        if (!timezone) {
          throw new Error(`Unknown timezone code: ${timezoneCode}`);
        }
        
        // Устанавливаем timezone пользователя
        await this.userService.setUserTimezone(userId, timezone);
        
        // Получаем информацию о timezone для отображения
        const timezoneLabels = {
          'Europe/Moscow': '🇷🇺 Москва (UTC+3)',
          'Europe/London': '🇬🇧 Лондон (UTC+0)',
          'America/New_York': '🇺🇸 Нью-Йорк (UTC-5)',
          'America/Los_Angeles': '🇺🇸 Лос-Анджелес (UTC-8)',
          'Asia/Tokyo': '🇯🇵 Токио (UTC+9)',
          'Asia/Shanghai': '🇨🇳 Шанхай (UTC+8)',
          'Australia/Sydney': '🇦🇺 Сидней (UTC+10)',
          'Europe/Berlin': '🇩🇪 Берлин (UTC+1)',
          'Europe/Paris': '🇫🇷 Париж (UTC+1)',
          'Asia/Dubai': '🇦🇪 Дубай (UTC+4)',
          'Asia/Kolkata': '🇮🇳 Мумбаи (UTC+5:30)',
          'UTC': '🌐 UTC (UTC+0)'
        };
        
        const timezoneLabel = timezoneLabels[timezone] || timezone;
        
        const timezoneSetText = this.localizationService.getText(userLanguage, 'timezone_set', { timezone: timezoneLabel });
        const timezoneUpdatedText = this.localizationService.getText(userLanguage, 'timezone_updated_simple', { timezone: timezoneLabel });
        
        await ctx.answerCbQuery(timezoneSetText);
        await ctx.editMessageText(timezoneUpdatedText,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: backText, callback_data: 'back_to_settings' }]
            ]
          } }
        );
      }
    } catch (error) {
      console.error('Error handling timezone selection:', error);
      const timezoneErrorText = this.localizationService.getText(userLanguage, 'timezone_error');
      await ctx.answerCbQuery(timezoneErrorText);
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
      
      // Получаем сообщение на новом языке
      const languageSetMessage = this.localizationService.getText(languageCode, 'language_set');
      
      await ctx.answerCbQuery(languageSetMessage);
      await ctx.editMessageText(languageSetMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: backText, callback_data: 'back_to_settings' }]
          ]
        }
      });
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


}

module.exports = CallbackHandlers; 