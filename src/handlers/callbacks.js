const { getTimezoneByCode } = require('../utils/timezone');

class CallbackHandlers {
  constructor({ expenseService, formatter, stateService, userService }) {
    this.expenseService = expenseService;
    this.formatter = formatter;
    this.stateService = stateService;
    this.userService = userService;
  }

  async handleCategorySelection(ctx) {
    const userId = ctx.from.id;
    try {
      const callbackData = ctx.callbackQuery.data;
      const [, categoryName] = callbackData.split('|');
      const pending = this.stateService.getPendingExpense(userId);
      if (!pending) {
        return await ctx.answerCbQuery('❌ Ошибка: данные не найдены');
      }
      const { amount, description } = pending;
      // Получаем название категории из кнопки
      const button = ctx.callbackQuery.message.reply_markup.inline_keyboard
        .flat()
        .find(btn => btn.callback_data === callbackData);
      if (!button) {
        return await ctx.answerCbQuery('❌ Ошибка: кнопка не найдена');
      }
      // Добавляем расход через сервис
      const expense = await this.expenseService.addExpense(
        userId,
        parseFloat(amount),
        description,
        categoryName
      );
      const formattedAmount = this.formatter.formatAmount(expense.amount, expense.currency);
      const formattedDescription = expense.description || 'Без описания';
      await ctx.answerCbQuery(`✅ Добавлено в категорию "${categoryName}"`);
      await ctx.editMessageText(
        `✅ *Расход добавлен!*\n\n` +
        `💰 Сумма: *${formattedAmount}*\n` +
        `📝 Описание: ${formattedDescription}\n` +
        `🏷️ Категория: ${categoryName}`,
        { parse_mode: 'Markdown', reply_markup: {
          inline_keyboard: [
            [{ text: '⬅️ Назад', callback_data: 'back_to_menu' }]
          ]
        } }
      );
    } catch (error) {
      console.error('Error handling category selection:', error);
      await ctx.answerCbQuery('❌ Произошла ошибка при сохранении');
    } finally {
      this.stateService.deletePendingExpense(userId);
    }
  }

  async handleCancel(ctx) {
    try {
      await ctx.answerCbQuery('❌ Отменено');
      await ctx.editMessageText('❌ Добавление расхода отменено');
    } catch (error) {
      console.error('Error handling cancel:', error);
    }
  }

  async handleTimezoneSelection(ctx) {
    const userId = ctx.from.id;
    console.log('=== TIMEZONE SELECTION START ===');
    console.log('Callback data:', ctx.callbackQuery.data);
    try {
      const callbackData = ctx.callbackQuery.data;
      console.log('Full callback data:', callbackData);
      const parts = callbackData.split('|');
      console.log('Split parts:', parts);
      const [, timezoneCode] = parts;
      console.log('Timezone code:', timezoneCode);
      
      // Проверяем, это новый формат времени или старый формат городов
      if (callbackData.startsWith('time|')) {
        console.log('=== NEW TIME FORMAT DETECTED ===');
        // Новый формат: time|hour|minute
        const [, hour, minute] = callbackData.split('|');
        console.log('Parsed hour:', hour, 'minute:', minute);
        const { calculateTimezoneFromUserTime, getTimezoneDisplayName } = require('../utils/timezoneCalculator');
        
        console.log(`Timezone calculation: user selected ${hour}:${minute}`);
        // Используем время выбора как опорное время
        const selectionTime = new Date();
        const timezone = calculateTimezoneFromUserTime(parseInt(hour), parseInt(minute), selectionTime);
        const displayName = getTimezoneDisplayName(timezone);
        console.log(`Calculated timezone: ${timezone}, display: ${displayName}`);
        console.log(`Reference time: ${selectionTime.toUTCString()}`);
        
        // Устанавливаем timezone пользователя
        await this.userService.setUserTimezone(userId, timezone);
        
        await ctx.answerCbQuery(`✅ Часовой пояс установлен: ${displayName}`);
        await ctx.editMessageText(
          `✅ *Часовой пояс обновлен!*\n\n` +
          `🕐 Выбранное время: *${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}*\n` +
          `🌍 Рассчитанный часовой пояс: *${displayName}*\n\n` +
          `Теперь все ваши расходы будут корректно отображаться в вашем местном времени.`,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад в настройки', callback_data: 'back_to_settings' }]
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
        
        await ctx.answerCbQuery(`✅ Часовой пояс установлен: ${timezoneLabel}`);
        await ctx.editMessageText(
          `✅ *Часовой пояс обновлен!*\n\n` +
          `🌍 Новый часовой пояс: *${timezoneLabel}*\n\n` +
          `Теперь все ваши расходы будут корректно отображаться в вашем местном времени.`,
          { parse_mode: 'Markdown', reply_markup: {
            inline_keyboard: [
              [{ text: '⬅️ Назад в настройки', callback_data: 'back_to_settings' }]
            ]
          } }
        );
      }
    } catch (error) {
      console.error('Error handling timezone selection:', error);
      await ctx.answerCbQuery('❌ Произошла ошибка при установке часового пояса');
    }
  }
}

module.exports = CallbackHandlers; 