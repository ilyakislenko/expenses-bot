const logger = require('../utils/logger');
const { addDays, parseYmd } = require('../utils/period');

const TOP_FREE = 3;
const REPORT_DAYS_AFTER_START = 3; // отчёт за прошлый период шлём в первые 3 дня нового
const SEND_FROM_HOUR = 10;
const SEND_TO_HOUR = 20;

function daysBetween(from, to) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

function localHour(timezone, now) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', hour: '2-digit', hour12: false }).format(now)) % 24;
}

// Локальная дата 'YYYY-MM-DD' момента времени
function localYmd(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
}

// Изменение к прошлому периоду в процентах (null — сравнивать не с чем)
function changePercent(current, previous) {
  if (!previous) return null;
  return Math.round((current - previous) / previous * 100);
}

class ReportService {
  constructor({ expenseService, incomeService, budgetService, premiumService, userNotificationRepository, notificationService, localizationService, formatter, currencyUtils }) {
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.budgetService = budgetService;
    this.premiumService = premiumService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.currencyUtils = currencyUtils;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Категории за период в основной валюте, по убыванию: [{ id, name, icon, total }]
  async categoryBreakdown(userId, timezone, period, currency) {
    const rows = await this.expenseService.getCategoryTotals(userId, timezone, period);
    const byName = new Map();
    for (const row of rows) {
      const converted = await this.currencyUtils.convert(Number(row.total), row.currency, currency);
      const entry = byName.get(row.name) || { id: row.category_id, name: row.name, icon: row.icon, total: 0 };
      entry.total += converted;
      entry.id = Math.min(entry.id, row.category_id);
      byName.set(row.name, entry);
    }
    return [...byName.values()].sort((a, b) => b.total - a.total);
  }

  categoryLabel(category, lang) {
    const name = this.formatter.escapeMarkdown(this.formatter.translateCategoryName(category.name, this.localizationService, lang));
    return `${category.icon || '📦'} ${name}`;
  }

  changeText(lang, percent) {
    if (percent === null) return this.t(lang, 'report_change_new');
    if (percent === 0) return this.t(lang, 'report_change_same');
    return percent > 0 ? `↑ +${percent}%` : `↓ −${-percent}%`;
  }

  // Отчёт за период (offset: 0 — текущий, -1 — прошлый). full — полная версия для премиума.
  // Возвращает { text, hasData }
  async buildReport(userId, offset, lang, { full }) {
    const { timezone, currency, today, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const previous = (await this.expenseService.getPeriodContext(userId, 'month', offset - 1)).period;
    const [totals, prevTotals, incomeTotals, categories, prevCategories] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.expenseService.getTotals(userId, timezone, previous),
      this.incomeService.getTotals(userId, timezone, period),
      this.categoryBreakdown(userId, timezone, period, currency),
      this.categoryBreakdown(userId, timezone, previous, currency)
    ]);
    const spent = await this.formatter.sumInCurrency(totals.byCurrency, currency);
    const prevSpent = await this.formatter.sumInCurrency(prevTotals.byCurrency, currency);
    const money = (value) => this.formatter.formatAmount(value, currency);

    // Незавершённый период — «итоги на сегодня»
    const titleKey = offset === 0 ? 'report_title_current' : 'report_title';
    const lines = [`📄 *${this.t(lang, titleKey, { range: this.formatter.formatPeriodRange(period) })}*`, ''];
    if (!totals.count) {
      lines.push(this.t(lang, 'no_expenses_period'));
      return { text: lines.join('\n'), hasData: false };
    }

    lines.push(this.t(lang, 'overview_spent', { amount: money(spent), count: totals.count }));
    if (prevTotals.count) {
      lines.push(this.t(lang, 'report_vs_previous', { change: this.changeText(lang, changePercent(spent, prevSpent)), amount: money(prevSpent) }));
    }
    const incomeSummary = await this.formatter.formatIncomeSummary(incomeTotals, totals, currency, this.localizationService, lang);
    if (incomeSummary) lines.push(incomeSummary);

    if (!full) {
      lines.push('', `*${this.t(lang, 'report_top_categories')}*`);
      for (const category of categories.slice(0, TOP_FREE)) {
        lines.push(`${this.categoryLabel(category, lang)} — ${money(category.total)} (${Math.round(category.total / spent * 100)}%)`);
      }
      lines.push('', this.t(lang, 'report_locked'));
      return { text: lines.join('\n'), hasData: true };
    }

    // Категории с шкалой; сравнение — только если в прошлом периоде были траты (иначе всё было бы «новое»)
    const hasPrevious = prevTotals.count > 0;
    const prevByName = new Map(prevCategories.map(c => [c.name, c.total]));
    const maxTotal = categories.length ? categories[0].total : 0;
    lines.push('', `*${this.t(lang, hasPrevious ? 'report_categories_vs_previous' : 'by_categories')}*`);
    for (const category of categories) {
      const change = hasPrevious ? ` · ${this.changeText(lang, changePercent(category.total, prevByName.get(category.name)))}` : '';
      lines.push(`${this.categoryLabel(category, lang)} — ${money(category.total)}${change}`);
      lines.push(`   ${this.formatter.progressBar(maxTotal ? category.total / maxTotal : 0)}`);
    }
    const gone = prevCategories.filter(c => !categories.some(x => x.name === c.name));
    if (gone.length) {
      lines.push(this.t(lang, 'report_categories_gone', { list: gone.map(c => this.categoryLabel(c, lang)).join(', ') }));
    }

    // Бюджеты (текущие лимиты), заведённые не позже последнего дня периода
    const budgets = (await this.budgetService.getStatus(userId, { timezone, currency, period }))
      .filter(budget => localYmd(budget.created_at, timezone) <= period.last);
    if (budgets.length) {
      lines.push('', `*${this.t(lang, 'budgets_title')}:*`);
      for (const budget of budgets) {
        const mark = budget.ratio > 1 ? '🚨' : '✅';
        lines.push(`${mark} ${this.budgetService.budgetName(budget, lang)}: ${money(budget.spent)} / ${money(budget.limit)} (${Math.round(budget.ratio * 100)}%)`);
      }
    }

    // Средняя трата в день и крупнейшая трата
    const periodDays = daysBetween(period.start, period.end);
    const elapsedDays = offset === 0 ? Math.min(periodDays, daysBetween(period.start, addDays(today, 1))) : periodDays;
    const expenses = await this.expenseService.getExpenses(userId, timezone, period);
    let largest = null;
    for (const expense of expenses) {
      const value = await this.currencyUtils.convert(Number(expense.amount), expense.currency, currency);
      if (!largest || value > largest.value) largest = { value, expense };
    }
    lines.push('', `*${this.t(lang, 'report_more_numbers')}*`);
    lines.push(this.t(lang, 'report_per_day', { amount: money(spent / Math.max(1, elapsedDays)) }));
    if (largest) {
      lines.push(this.t(lang, 'report_largest', {
        amount: this.formatter.formatAmount(Number(largest.expense.amount), largest.expense.currency),
        description: this.formatter.expenseLabel(largest.expense, this.localizationService, lang),
        date: this.formatter.formatShortDateTime(largest.expense.created_at_utc, timezone).split(',')[0]
      }));
    }
    return { text: lines.join('\n'), hasData: true };
  }

  // Cron: в первые дни нового периода присылаем итоги прошлого (по разу, днём по местному времени)
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getReportCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const hour = localHour(candidate.timezone, now);
        if (hour < SEND_FROM_HOUR || hour > SEND_TO_HOUR) continue;
        const { today, period } = await this.expenseService.getPeriodContext(candidate.id, 'month', 0);
        if (today >= addDays(period.start, REPORT_DAYS_AFTER_START)) continue;

        const previous = (await this.expenseService.getPeriodContext(candidate.id, 'month', -1)).period;
        const lang = candidate.language || 'en';
        const isPremium = await this.premiumService.isPremiumUser(candidate.id);
        const report = await this.buildReport(candidate.id, -1, lang, { full: isPremium });
        if (!report.hasData) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'period_report', previous.start))) continue;

        const keyboard = [[{ text: this.t(lang, 'button_overview'), callback_data: 'ov|-1' }]];
        if (!isPremium) keyboard.unshift([{ text: this.t(lang, 'button_premium'), callback_data: 'premium_subscription' }]);
        await this.notificationService.sendMessage(candidate.id, report.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
        sent++;
      } catch (error) {
        logger.warn('Period report not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }
}

ReportService.changePercent = changePercent;

module.exports = ReportService;
