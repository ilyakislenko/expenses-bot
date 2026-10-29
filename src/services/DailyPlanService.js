const logger = require('../utils/logger');
const { COINS, DAILY_PLAN } = require('../utils/constants');
const { addDays } = require('../utils/period');
const { daysBetween } = require('../utils/planning');
const { planHour, isDue, yesterdayResult, composeMorning } = require('../utils/dailyPlan');

function localDateHour(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', hour: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function shortDate(date) {
  const [, m, d] = date.split('-');
  return `${d}.${m}`;
}

// «☀️ План на день»: утром — вчера против плана, «можно сегодня» (PlanningService), до зарплаты, платежи сегодня
// (и завтра — у включивших «Платежи утром»: отдельное напоминание о платежах им тогда не приходит), серия и строка
// злого режима. Только тем, у кого есть доход или общий бюджет; остальным — один раз подсказка, как включить.
// Отправленный план хранится (daily_plans): ключ «уже отправлено», сравнение в сводке дня и на следующее утро.
class DailyPlanService {
  constructor({
    dailyPlanRepository, planningService, achievementService = null, roastService = null, coinService = null,
    userService, userNotificationRepository, notificationService, localizationService, formatter
  }) {
    this.dailyPlanRepository = dailyPlanRepository;
    this.planningService = planningService;
    this.achievementService = achievementService;
    this.roastService = roastService;
    this.coinService = coinService;
    this.userService = userService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // ========================================
  // НАСТРОЙКА
  // ========================================

  async getSettings(userId) {
    const settings = await this.dailyPlanRepository.getSettings(userId);
    return { enabled: settings.enabled, hour: planHour(settings.hour) };
  }

  async setEnabled(userId, enabled) {
    await this.dailyPlanRepository.setEnabled(userId, !!enabled);
  }

  async toggle(userId) {
    const { enabled } = await this.getSettings(userId);
    await this.setEnabled(userId, !enabled);
    return !enabled;
  }

  // Только утренние часы (подменённая кнопка — false)
  async setHour(userId, hour) {
    if (!DAILY_PLAN.HOURS.includes(hour)) return false;
    await this.dailyPlanRepository.setHour(userId, hour);
    return true;
  }

  // Есть ли из чего считать план (доход или общий бюджет)
  async hasData(userId) {
    try {
      return (await this.planningService.getAllowance(userId)).mode !== 'none';
    } catch (error) {
      logger.warn('Daily plan data check failed', { userId, error: error.message });
      return false;
    }
  }

  // ========================================
  // ТЕКСТ ПЛАНА
  // ========================================

  money(value, currency) {
    return this.formatter.formatAmount(Math.round(value), currency);
  }

  // Платежи на день из календаря: без доходов; subsByWarning — подписки не показываем (о них придёт предупреждение
  // о списании с кнопками)
  billLines(lang, items, date, { skipSubscriptions = false } = {}) {
    return items
      .filter(item => item.date === date && item.kind !== 'income' && !(skipSubscriptions && item.kind === 'subscription'))
      .map(item => this.planningService.itemLine(lang, item));
  }

  // План на сегодня. null — считать не из чего (нет дохода и бюджета).
  // options: award — начислить монеты за вчерашний день в плане (только рассылка), bills — платежи завтра,
  // subWarn — у пользователя включены предупреждения о списании подписок
  async build(userId, lang, { award = false, bills = false, subWarn = true } = {}) {
    const allowance = await this.planningService.getAllowance(userId);
    if (allowance.mode === 'none') return null;
    const { currency, today } = allowance;
    const yesterday = addDays(today, -1);
    const money = (value) => this.money(value, currency);

    const [previous, snap, calendar] = await Promise.all([
      this.dailyPlanRepository.getPlan(userId, yesterday),
      this.achievementService ? this.achievementService.snapshot(userId, { commitFreezes: false }).catch(() => null) : null,
      this.planningService.getCalendar(userId, { days: 2 }).catch((error) => {
        logger.warn('Daily plan calendar failed', { userId, error: error.message });
        return null;
      })
    ]);

    // Вчера: сравниваем с планом, только если валюта та же (основную валюту могли сменить). День без единой записи
    // («0 из 2 100» скорее значит «не записал», чем «не тратил») — без строки
    let y = null;
    if (previous && previous.currency === currency) {
      const spent = await this.planningService.spentOnDay(userId, yesterday);
      const silent = spent === 0 && snap && !snap.activeDays.has(yesterday);
      if (!silent) y = yesterdayResult(previous, spent);
    }
    let coins = 0;
    // Монеты — только за день, в котором были записи: пустой день «в плане» без записей — не заслуга
    if (y && y.kept && award && this.coinService && snap && snap.activeDays.has(yesterday)) {
      const result = await this.coinService.award(userId, 'plan', COINS.PLAN_KEPT, { idempotencyKey: `plan:${yesterday}` });
      if (result.awarded) coins = COINS.PLAN_KEPT;
    }

    const payday = allowance.nextIncome
      ? { kind: 'payday', days: daysBetween(today, allowance.nextIncome) }
      : { kind: 'period', days: allowance.daysLeft };

    // Строка злого режима — только когда есть вердикт по вчерашнему дню (варианты говорят о вчера)
    const roast = this.roastService && y
      ? await this.roastService.morningLine(userId, lang, {
        good: y.kept, daily: allowance.deficit > 0 ? null : money(allowance.daily), over: y.kept ? null : money(y.over)
      })
      : '';

    const items = calendar ? calendar.items : [];
    const text = composeMorning((key, params) => this.t(lang, key, params), {
      date: shortDate(today),
      yesterday: y && { spent: money(y.spent), daily: money(y.daily), kept: y.kept, over: money(y.over), coins },
      allowance: { daily: money(allowance.daily), deficit: allowance.deficit > 0 ? money(allowance.deficit) : null },
      payday,
      streak: snap ? snap.streak.current : 0,
      todayBills: this.billLines(lang, items, today),
      tomorrowBills: bills ? this.billLines(lang, items, addDays(today, 1), { skipSubscriptions: subWarn }) : [],
      roast
    });
    return {
      text,
      today,
      plan: { daily: allowance.deficit > 0 ? 0 : allowance.daily, deficit: allowance.deficit || 0, currency }
    };
  }

  keyboard(lang) {
    return {
      inline_keyboard: [[
        { text: this.t(lang, 'dp_button_overview'), callback_data: 'ov|0' },
        { text: '⚙️', callback_data: 'dpo' }
      ]]
    };
  }

  // ========================================
  // РАССЫЛКА
  // ========================================

  // Cron (каждый час в :00, до напоминалок): в час плана по местному времени, по разу за локальный день
  // (daily_plans ставится до отправки — перезапуск и наложение запусков второго плана не дают).
  // Без дохода и бюджета — один раз подсказка (user_notifications 'daily_plan_hint')
  async processDue(now = new Date()) {
    const candidates = await this.dailyPlanRepository.getCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const local = localDateHour(candidate.timezone, now);
        if (!isDue(local.hour, candidate.daily_plan_hour)) continue;
        if (await this.dailyPlanRepository.getPlan(candidate.id, local.date)) continue;
        const lang = candidate.language || 'en';
        const plan = await this.build(candidate.id, lang, {
          award: true, bills: candidate.bill_reminders_enabled === true, subWarn: candidate.sub_warn_enabled !== false
        });
        if (!plan) {
          if (await this.userNotificationRepository.markSent(candidate.id, 'daily_plan_hint', 'once')) {
            await this.notificationService.sendMessage(candidate.id, this.t(lang, 'dp_hint'), {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[
                { text: this.t(lang, 'button_add_income'), callback_data: 'income_add' },
                { text: '⚙️', callback_data: 'dpo' }
              ]] }
            });
          }
          continue;
        }
        if (!(await this.dailyPlanRepository.claim(candidate.id, local.date, plan.plan))) continue;
        await this.notificationService.sendMessage(candidate.id, plan.text, { parse_mode: 'Markdown', reply_markup: this.keyboard(lang) });
        sent++;
      } catch (error) {
        logger.warn('Daily plan not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }

  // План на этот локальный день уже отправлен (утренняя напоминалка тогда не нужна)
  async sentOn(userId, date) {
    try {
      return !!(await this.dailyPlanRepository.getPlan(userId, date));
    } catch (error) {
      return false;
    }
  }

  // ========================================
  // ВЕЧЕРОМ: СВОДКА ДНЯ
  // ========================================

  // Строка к сводке дня: план этого дня против ручных трат за день. '' — плана в этот день не было
  async eveningLine(userId, lang, day) {
    try {
      const plan = await this.dailyPlanRepository.getPlan(userId, day);
      if (!plan) return '';
      const currency = await this.userService.getUserCurrency(userId);
      if (plan.currency !== currency) return '';
      const result = yesterdayResult(plan, await this.planningService.spentOnDay(userId, day));
      if (!result) return '';
      const money = (value) => this.money(value, currency);
      return result.kept
        ? this.t(lang, 'dp_evening_kept', { spent: money(result.spent), daily: money(result.daily), left: money(result.daily - result.spent) })
        : this.t(lang, 'dp_evening_over', { spent: money(result.spent), daily: money(result.daily), over: money(result.over) });
    } catch (error) {
      logger.warn('Daily plan evening line failed', { userId, error: error.message });
      return '';
    }
  }
}

DailyPlanService.localDateHour = localDateHour;

module.exports = DailyPlanService;
