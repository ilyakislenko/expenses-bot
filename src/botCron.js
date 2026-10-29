const currencyConfig = require('./config/currencies');
const logger = require('./utils/logger');

const { DEFAULT_REMINDER_HOURS } = require('./utils/constants');
// Напоминалка до этого локального часа — «утренняя»: её заменяет «☀️ План на день», если он уже пришёл сегодня
const MORNING_UNTIL_HOUR = 12;

// Локальные дата (YYYY-MM-DD) и час. hourCycle h23: в полночь час 0, а не 24
function localDateHour(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', hour: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
    .reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

// Напоминалки: в выбранные локальные часы (до 3 раз в день), только если за сегодняшний локальный день ещё нет трат.
// Серия от 3 дней под угрозой и сработавшая заморозка — строкой в той же напоминалке (achievementService, если есть).
// Утром (до 12:00), если сегодня уже пришёл «☀️ План на день», напоминалка не нужна — план и есть утреннее сообщение.
// Ошибка у одного пользователя (невалидный пояс, заблокированный бот) не прерывает рассылку остальным.
async function sendReminders({ userService, expenseService, notificationService, achievementService = null, dailyPlanService = null }, now = new Date()) {
  const { rows } = await userService.userRepository.query(`
    SELECT id, timezone, language, reminder_hours, reminder_sent_today_hours,
           to_char(last_reminder_local_date, 'YYYY-MM-DD') AS last_reminder_local_date
    FROM users WHERE reminder_enabled = true`);
  const { localizationService } = notificationService;
  let sent = 0;
  for (const user of rows) {
    try {
      const tz = user.timezone || 'UTC';
      // NULL — часы по умолчанию, [] — все напоминания выключены
      const targetHours = Array.isArray(user.reminder_hours) ? user.reminder_hours : DEFAULT_REMINDER_HOURS;
      const { date, hour } = localDateHour(tz, now);
      if (!targetHours.includes(hour)) continue;

      // Часы, по которым уже напоминали, относятся только к дню last_reminder_local_date
      const sentHours = user.last_reminder_local_date === date && Array.isArray(user.reminder_sent_today_hours)
        ? user.reminder_sent_today_hours
        : [];
      if (sentHours.includes(hour)) continue;
      if (await expenseService.hasAnyExpenseToday(user.id, tz)) continue;
      if (dailyPlanService && hour < MORNING_UNTIL_HOUR && await dailyPlanService.sentOn(user.id, date)) continue;

      const lang = user.language || 'en';
      const variants = localizationService.getText(lang, 'reminder_sample_variants');
      const title = localizationService.getText(lang, 'reminder_message_title');
      const message = Array.isArray(variants) && variants.length ? variants[Math.floor(Math.random() * variants.length)] : '';
      const streakLine = achievementService ? await achievementService.reminderLine(user.id, lang) : '';
      const text = `🔔 *${title}*\n\n${message}${streakLine ? `\n\n${streakLine}` : ''}`;
      await notificationService.bot.telegram.sendMessage(user.id, text, { parse_mode: 'Markdown' });
      await userService.updateLastReminderLocalDate(user.id, date);
      await userService.setReminderSentTodayHours(user.id, [...sentHours, hour].sort((a, b) => a - b));
      sent++;
    } catch (error) {
      logger.warn('Reminder not delivered', { userId: user.id, error: error.message });
    }
  }
  return sent;
}

function setupBotCron(cron, currencyUtils, donationRepository, userService, expenseService, notificationService, recurringExpenseService, premiumLifecycleService, reportService, dailySummaryService, weeklyInsightService, planningService, achievementService, subscriptionAlertService, dailyPlanService = null, supportedCurrencies = currencyConfig.SUPPORTED_CURRENCIES) {
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

  // Регулярные (ежемесячные) траты: каждые 15 минут записываем те, у которых наступило число списания
  // в локальном дне пользователя. Повторная запись за месяц исключена (last_charged_month).
  const processRecurringExpenses = async () => {
    try {
      const charged = await recurringExpenseService.processDue();
      if (charged > 0) {
        console.log(`Регулярные траты: записано ${charged}`);
      }
    } catch (err) {
      console.error('Ошибка при обработке регулярных трат:', err);
    }
  };
  processRecurringExpenses();
  cron.schedule('*/15 * * * *', processRecurringExpenses);

  // Флаг premium у истёкших: проверки премиума смотрят на срок, но флаг читают админка и приглашения в семью
  cron.schedule('*/10 * * * *', async () => {
    try {
      await userService.disableAllExpiredPremium();
    } catch (err) {
      console.error('Ошибка при снятии истёкшего премиума:', err);
    }
  });

  // Окончание премиума: за 2 дня, в день окончания и через неделю (днём по местному времени, по разу на срок)
  cron.schedule('25 * * * *', async () => {
    try {
      const sent = await premiumLifecycleService.processDue();
      if (sent > 0) {
        console.log(`Уведомления об окончании премиума: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке уведомлений о премиуме:', err);
    }
  });

  // Итоги прошлого периода: в первые 3 дня нового периода, днём по местному времени, по разу на период
  cron.schedule('35 * * * *', async () => {
    try {
      const sent = await reportService.processDue();
      if (sent > 0) {
        console.log(`Итоги периода: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке итогов периода:', err);
    }
  });

  // Ежедневная сводка: в выбранный пользователем локальный час (ровно в HH:00), по разу за день, если были траты.
  // С напоминаниями в :00 не пересекается: те приходят только в дни без трат.
  cron.schedule('0 * * * *', async () => {
    try {
      const sent = await dailySummaryService.processDue();
      if (sent > 0) {
        console.log(`Ежедневная сводка: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке ежедневной сводки:', err);
    }
  });

  // Сводка недели: по понедельникам в 10:00 по местному времени (проверка — каждый час), по разу за неделю
  cron.schedule('0 * * * *', async () => {
    try {
      const sent = await weeklyInsightService.processDue();
      if (sent > 0) {
        console.log(`Сводка недели: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке сводки недели:', err);
    }
  });

  // Платежи сегодня и завтра (Планирование): в 9:00 по местному времени включившим напоминания, по разу за день.
  // В :05 — не в одну минуту с рассылками в :00. Сегодняшние регулярные к 9:00 уже списаны — в тексте «✅ списано»
  cron.schedule('5 * * * *', async () => {
    try {
      const sent = await planningService.processBillReminders();
      if (sent > 0) {
        console.log(`Напоминания о платежах: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке напоминаний о платежах:', err);
    }
  });

  // Подписки: предупреждение за N дней до списания и пробные периоды (за день и в день окончания) — днём по местному
  // времени, один разбор в локальный день, по разу на списание. В :15 — не в одну минуту с рассылками в :00 и :05
  cron.schedule('15 * * * *', async () => {
    try {
      const sent = await subscriptionAlertService.processDue();
      if (sent > 0) {
        console.log(`Предупреждения о списании подписок: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке предупреждений о списании подписок:', err);
    }
  });

  // Челленджи (итоги — днём по местному времени) и «Итоги месяца» (первый день периода с 10:00), по разу
  cron.schedule('5 * * * *', async () => {
    try {
      const { challenges, wrapped } = await achievementService.processDue();
      if (challenges + wrapped > 0) {
        console.log(`Достижения: итоги челленджей ${challenges}, итоги месяца ${wrapped}`);
      }
    } catch (err) {
      console.error('Ошибка при обработке челленджей и итогов месяца:', err);
    }
  });

  // «☀️ План на день» (в выбранный утренний час), затем напоминалки до 3 раз в локальные часы пользователя: по очереди,
  // чтобы утренняя напоминалка в тот же час уже видела отправленный план
  cron.schedule('0 * * * *', async () => {
    if (dailyPlanService) {
      try {
        const plans = await dailyPlanService.processDue();
        if (plans > 0) {
          console.log(`План на день: отправлено ${plans}`);
        }
      } catch (err) {
        console.error('Ошибка при отправке плана на день:', err);
      }
    }
    try {
      const sent = await sendReminders({ userService, expenseService, notificationService, achievementService, dailyPlanService });
      if (sent > 0) {
        console.log(`Напоминалки: отправлено ${sent}`);
      }
    } catch (err) {
      console.error('Ошибка при отправке напоминалок:', err);
    }
  });
}

module.exports = setupBotCron;
module.exports.sendReminders = sendReminders;
module.exports.localDateHour = localDateHour;