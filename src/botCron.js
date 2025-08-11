module.exports = function setupBotCron(cron, currencyUtils, donationRepository, userService, expenseService, notificationService, supportedCurrencies = ['RUB', 'USD', 'EUR', 'KZT', 'CNY', 'THB']) {
  // Проверяем, нужно ли обновлять курсы при запуске
  (async () => {
    try {
      if (await currencyUtils.needUpdateRates()) {
        await currencyUtils.updateRates(supportedCurrencies);
        console.log('Курсы валют успешно обновлены!');
      }
    } catch (err) {
      console.error('Ошибка при обновлении курсов валют:', err);
    }
  })();

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

  // Ежедневные напоминалки в 18:00 локального времени каждого пользователя
  cron.schedule('0 * * * *', async () => {
    // Запускаем каждый час: в 18:00 локального для каждого пользователя сработает проверка
    try {
      // Получаем список пользователей, у кого включены напоминалки
      const { rows } = await userService.userRepository.query('SELECT id, timezone, last_reminder_local_date, language FROM users WHERE reminder_enabled = true');
      const nowUtc = new Date();
      for (const user of rows) {
        const tz = user.timezone || 'UTC';
        // Вычисляем локальное время
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = formatter.formatToParts(nowUtc).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
        const localHour = parseInt(parts.hour, 10);
        const localDateStr = `${parts.year}-${parts.month}-${parts.day}`;

        // Отправляем только около 18:00 (с 18:00 по 18:59, раз в день)
        if (localHour !== 18) continue;
        if (user.last_reminder_local_date && user.last_reminder_local_date.toISOString().slice(0,10) === localDateStr) continue;

        // Проверяем, были ли сегодня траты у пользователя в его таймзоне
        const hasExpenses = await expenseService.hasAnyExpenseToday(user.id, tz);
        if (hasExpenses) {
          await userService.updateLastReminderLocalDate(user.id, localDateStr);
          continue;
        }

        // Выбираем случайный текст напоминалки
        const lang = user.language || 'ru';
        const variants = notificationService.localizationService.getText(lang, 'reminder_sample_variants');
        const title = notificationService.localizationService.getText(lang, 'reminder_message_title');
        const message = Array.isArray(variants) && variants.length ? variants[Math.floor(Math.random() * variants.length)] : 'Пора записать расходы!';
        try {
          await notificationService.bot.telegram.sendMessage(user.id, `🔔 *${title}*\n\n${message}`, { parse_mode: 'Markdown' });
          await userService.updateLastReminderLocalDate(user.id, localDateStr);
        } catch (e) {
          console.error('Failed to send reminder', { userId: user.id, e });
        }
      }
    } catch (err) {
      console.error('Ошибка при отправке напоминалок:', err);
    }
  });
}; 