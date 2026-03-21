const currencyConfig = require('./config/currencies');

module.exports = function setupBotCron(cron, currencyUtils, donationRepository, userService, expenseService, notificationService, supportedCurrencies = currencyConfig.SUPPORTED_CURRENCIES) {
  setTimeout(async () => {
    try {
      if (await currencyUtils.needUpdateRates()) {
        await currencyUtils.updateRates(supportedCurrencies);
        console.log('Курсы валют успешно обновлены!');
      }
    } catch (err) {
      console.error('Ошибка при обновлении курсов валют:', err);
    }
  }, 5000);

  // Запускаем автообновление курсов каждый день в 10:00 утра
  cron.schedule('0 10 * * *', () => {
    currencyUtils.updateRates(supportedCurrencies)
      .then(() => console.log('Курсы валют обновлены по расписанию (cron)!'))
      .catch(err => console.error('Ошибка при автообновлении курсов валют (cron):', err));
  });

  // Очистка старых pending donations каждый день в 2:00 ночи
  cron.schedule('0 2 * * *', async () => {
    try {
      const cleanedCount = await donationRepository.cleanupOldPendingDonations(24);
      if (cleanedCount > 0) {
        console.log(`Очистка pending donations: помечено как expired ${cleanedCount} записей`);
      }
    } catch (err) {
      console.error('Ошибка при очистке pending donations:', err);
    }
  });

  // Ежедневные напоминалки до 3 раз в локальные часы пользователя
  cron.schedule('0 * * * *', async () => {
    // Запускаем каждый час: на выбранных локальных часах сработает проверка
    try {
      // Получаем список пользователей, у кого включены напоминалки
      const { rows } = await userService.userRepository.query('SELECT id, timezone, last_reminder_local_date, language, reminder_hours, reminder_sent_today_hours FROM users WHERE reminder_enabled = true');
      const nowUtc = new Date();
      for (const user of rows) {
        const tz = user.timezone || 'UTC';
        // Вычисляем локальное время
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = formatter.formatToParts(nowUtc).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
        const localHour = parseInt(parts.hour, 10);

        const localDateStr = `${parts.year}-${parts.month}-${parts.day}`;

        // Часы по умолчанию, если пользователь не задал свои (NULL)
        // Пустой массив [] трактуем как отключенные все напоминания
        if (user.reminder_hours !== null && Array.isArray(user.reminder_hours) && user.reminder_hours.length === 0) {
          continue; // все отключены
        }
        const targetHours = Array.isArray(user.reminder_hours) ? user.reminder_hours : [10, 14, 18];
        if (!targetHours.includes(localHour)) continue;

        // Маркер локального дня и часов, по которым уже отправляли
        const lastReminderDateStr = user.last_reminder_local_date
          ? (typeof user.last_reminder_local_date === 'string'
              ? user.last_reminder_local_date
              : user.last_reminder_local_date.toISOString().slice(0, 10))
          : null;
        let sentHours = Array.isArray(user.reminder_sent_today_hours) ? user.reminder_sent_today_hours : [];
        if (lastReminderDateStr !== localDateStr && sentHours.length) {
          sentHours = [];
          await userService.setReminderSentTodayHours(user.id, sentHours);
        }
        if (sentHours.includes(localHour)) continue;

        // Проверяем, были ли траты в нужном интервале до текущего локального часа
        // Если это первый час из списка — проверяем с начала дня, иначе с предыдущего выбранного часа
        const sortedHours = [...targetHours].sort((a,b)=>a-b);
        const index = sortedHours.indexOf(localHour);
        const startHour = index <= 0 ? 0 : sortedHours[index - 1];
        const endHour = localHour;
        const hasExpenses = await expenseService.hasAnyExpenseBetweenLocal(user.id, tz, startHour, endHour);
        if (hasExpenses) {
          await userService.updateLastReminderLocalDate(user.id, localDateStr);
          continue;
        }

        // Выбираем случайный текст напоминалки
        const lang = user.language || 'en';
        const variants = notificationService.localizationService.getText(lang, 'reminder_sample_variants');
        const title = notificationService.localizationService.getText(lang, 'reminder_message_title');
        const message = Array.isArray(variants) && variants.length ? variants[Math.floor(Math.random() * variants.length)] : 'Пора записать расходы!';
        try {
          await notificationService.bot.telegram.sendMessage(user.id, `🔔 *${title}*\n\n${message}`, { parse_mode: 'Markdown' });
          await userService.updateLastReminderLocalDate(user.id, localDateStr);
          sentHours = Array.from(new Set([...(sentHours || []), localHour])).sort((a,b)=>a-b);
          await userService.setReminderSentTodayHours(user.id, sentHours);
        } catch (e) {
          console.error('Failed to send reminder', { userId: user.id, e });
        }
      }
    } catch (err) {
      console.error('Ошибка при отправке напоминалок:', err);
    }
  });

  // Ежедневная сводка по расходам за день (по настроенному часу)
  cron.schedule('0 * * * *', async () => {
    try {
      const { rows } = await userService.userRepository.query('SELECT id, timezone, language, daily_summary_hour, last_daily_summary_local_date FROM users WHERE daily_summary_enabled = true');
      const nowUtc = new Date();
      const Formatter = require('./utils/formatter');
      const fmt = new Formatter(currencyUtils);
      for (const user of rows) {
        const tz = user.timezone || 'UTC';
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = formatter.formatToParts(nowUtc).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
        const localHour = parseInt(parts.hour, 10);
        const localDateStr = `${parts.year}-${parts.month}-${parts.day}`;

        const targetHour = Number.isInteger(user.daily_summary_hour) ? user.daily_summary_hour : 21; // дефолт 21:00
        if (localHour !== targetHour) continue;

        const lastSummaryDateStr = user.last_daily_summary_local_date
          ? (typeof user.last_daily_summary_local_date === 'string'
              ? user.last_daily_summary_local_date
              : user.last_daily_summary_local_date.toISOString().slice(0, 10))
          : null;
        if (lastSummaryDateStr === localDateStr) continue; // уже отправляли сегодня

        const lang = user.language || 'en';
        const { total } = await expenseService.getDailyTotalsForSummary(user.id);
        const title = notificationService.localizationService.getText(lang, 'daily_summary_title') || 'Сводка за день';
        let text = `📊 *${title}*\n`;
        if (Array.isArray(total.byCurrency) && total.byCurrency.length > 1) {
          for (const row of total.byCurrency) {
            text += `${fmt.formatAmount(row.total, row.currency)}\n`;
          }
        } else if (Array.isArray(total.byCurrency) && total.byCurrency.length === 1) {
          const row = total.byCurrency[0];
          const header = notificationService.localizationService.getText(lang, 'daily_total_spent') || 'Потрачено за день';
          text += `${header}: ${fmt.formatAmount(row.total, row.currency)}\n`;
        }
        text += `${notificationService.localizationService.getText(lang, 'records_count', { count: total.count || 0 })}`;

        try {
          await notificationService.bot.telegram.sendMessage(user.id, text, { parse_mode: 'Markdown' });
          await userService.updateLastDailySummaryLocalDate(user.id, localDateStr);
        } catch (e) {
          console.error('Failed to send daily summary', { userId: user.id, e });
        }
      }
    } catch (err) {
      console.error('Ошибка при отправке ежедневной сводки:', err);
    }
  });
}; 