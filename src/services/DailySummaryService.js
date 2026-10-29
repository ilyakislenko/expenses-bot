const logger = require('../utils/logger');

const DEFAULT_HOUR = 21; // daily_summary_hour IS NULL — сводка в 21:00 по местному времени
const NIGHT_UNTIL_HOUR = 4; // сводка в 00:00–03:00 — за прошедший (вчерашний) день: сегодня ещё ничего не было
const TOP_CATEGORIES = 3;

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

// Час сводки пользователя (NULL — по умолчанию)
function summaryHour(value) {
  return Number.isInteger(value) ? value : DEFAULT_HOUR;
}

// За какой день сводка в этот час: 0 — сегодня, -1 — вчера (ночные часы)
function summaryDayOffset(hour) {
  return hour < NIGHT_UNTIL_HOUR ? -1 : 0;
}

class DailySummaryService {
  constructor({ expenseService, incomeService, reportService, userNotificationRepository, notificationService, localizationService, formatter, achievementService = null, dailyPlanService = null }) {
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.reportService = reportService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.achievementService = achievementService;
    this.dailyPlanService = dailyPlanService; // «☀️ План на день»: вечером — сравнение с утренним планом
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Текст сводки за день (dayOffset: 0 — сегодня, -1 — вчера); null — трат за день нет.
  // day — локальная дата сводки (ключ «уже отправлено»)
  async buildSummary(userId, lang, { dayOffset = 0 } = {}) {
    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'day', dayOffset);
    const day = period.start;
    const totals = await this.expenseService.getTotals(userId, timezone, period);
    if (!totals.count) return null;

    const [categories, incomeTotals] = await Promise.all([
      this.reportService.categoryBreakdown(userId, timezone, period, currency),
      this.incomeService.getTotals(userId, timezone, period)
    ]);
    const money = (value) => this.formatter.formatAmount(value, currency);
    const spent = await this.formatter.sumInCurrency(totals.byCurrency, currency);

    const lines = [
      `🗓 *${this.t(lang, 'daily_summary_title')} · ${this.formatter.formatLocalDate(day)}*`,
      '',
      this.t(lang, 'overview_spent', { amount: money(spent), count: totals.count })
    ];
    if (incomeTotals.count) {
      lines.push(this.t(lang, 'income_total', { amount: money(await this.formatter.sumInCurrency(incomeTotals.byCurrency, currency)) }));
    }
    // План этого дня из утреннего «☀️ План на день» (если был): уложился ли
    const planLine = this.dailyPlanService ? await this.dailyPlanService.eveningLine(userId, lang, day) : '';
    if (planLine) lines.push(planLine);
    lines.push('', `*${this.t(lang, 'report_top_categories')}*`);
    for (const category of categories.slice(0, TOP_CATEGORIES)) {
      lines.push(`${this.reportService.categoryLabel(category, lang)} — ${money(category.total)}`);
    }
    // Серия дней с записями (и сработавшая заморозка) — одной строкой в конце
    const streakLine = this.achievementService ? await this.achievementService.summaryLine(userId, lang) : '';
    if (streakLine) lines.push('', streakLine);
    return { text: lines.join('\n'), day, dayOffset };
  }

  // Cron (каждый час): сводка в выбранный локальный час, по разу за день сводки, только если были траты.
  // В 00:00–03:00 — за вчерашний день (его дата — в заголовке и в ключе отправки)
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getDailySummaryCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const hour = summaryHour(candidate.daily_summary_hour);
        if (localHour(candidate.timezone, now) !== hour) continue;
        const lang = candidate.language || 'en';
        const summary = await this.buildSummary(candidate.id, lang, { dayOffset: summaryDayOffset(hour) });
        if (!summary) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'daily_summary', summary.day))) continue;

        const button = summary.dayOffset < 0
          ? { text: this.t(lang, 'button_prev_day'), callback_data: `dy|${summary.dayOffset}|0` }
          : { text: this.t(lang, 'button_today'), callback_data: 'dy|0|0' };
        await this.notificationService.sendMessage(candidate.id, summary.text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[button]] }
        });
        sent++;
      } catch (error) {
        logger.warn('Daily summary not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }
}

DailySummaryService.DEFAULT_HOUR = DEFAULT_HOUR;
DailySummaryService.summaryHour = summaryHour;
DailySummaryService.summaryDayOffset = summaryDayOffset;

module.exports = DailySummaryService;
