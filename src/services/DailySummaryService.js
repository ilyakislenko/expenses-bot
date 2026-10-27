const logger = require('../utils/logger');

const DEFAULT_HOUR = 21; // daily_summary_hour IS NULL — сводка в 21:00 по местному времени
const TOP_CATEGORIES = 3;

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

// Час сводки пользователя (NULL — по умолчанию)
function summaryHour(value) {
  return Number.isInteger(value) ? value : DEFAULT_HOUR;
}

class DailySummaryService {
  constructor({ expenseService, incomeService, reportService, userNotificationRepository, notificationService, localizationService, formatter, achievementService = null }) {
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.reportService = reportService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.achievementService = achievementService;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Текст сводки за сегодня; null — трат за день нет
  async buildSummary(userId, lang) {
    const { timezone, currency, today, period } = await this.expenseService.getPeriodContext(userId, 'day', 0);
    const totals = await this.expenseService.getTotals(userId, timezone, period);
    if (!totals.count) return null;

    const [categories, incomeTotals] = await Promise.all([
      this.reportService.categoryBreakdown(userId, timezone, period, currency),
      this.incomeService.getTotals(userId, timezone, period)
    ]);
    const money = (value) => this.formatter.formatAmount(value, currency);
    const spent = await this.formatter.sumInCurrency(totals.byCurrency, currency);

    const lines = [
      `🗓 *${this.t(lang, 'daily_summary_title')} · ${this.formatter.formatLocalDate(today)}*`,
      '',
      this.t(lang, 'overview_spent', { amount: money(spent), count: totals.count })
    ];
    if (incomeTotals.count) {
      lines.push(this.t(lang, 'income_total', { amount: money(await this.formatter.sumInCurrency(incomeTotals.byCurrency, currency)) }));
    }
    lines.push('', `*${this.t(lang, 'report_top_categories')}*`);
    for (const category of categories.slice(0, TOP_CATEGORIES)) {
      lines.push(`${this.reportService.categoryLabel(category, lang)} — ${money(category.total)}`);
    }
    // Серия дней с записями (и сработавшая заморозка) — одной строкой в конце
    const streakLine = this.achievementService ? await this.achievementService.summaryLine(userId, lang) : '';
    if (streakLine) lines.push('', streakLine);
    return { text: lines.join('\n'), today };
  }

  // Cron (каждый час): сводка в выбранный локальный час, по разу за локальный день, только если были траты
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getDailySummaryCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        if (localHour(candidate.timezone, now) !== summaryHour(candidate.daily_summary_hour)) continue;
        const lang = candidate.language || 'en';
        const summary = await this.buildSummary(candidate.id, lang);
        if (!summary) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'daily_summary', summary.today))) continue;

        await this.notificationService.sendMessage(candidate.id, summary.text, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'button_today'), callback_data: 'dy|0|0' }]] }
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

module.exports = DailySummaryService;
