const logger = require('../utils/logger');
const { addDays, parseYmd, customPeriod } = require('../utils/period');

const SEND_WEEKDAY = 1; // понедельник
const SEND_HOUR = 10; // 10:00 по местному времени
const HISTORY_WEEKS = 4; // сравнение со средним за 4 недели до прошлой
const MIN_HISTORY_WEEKS = 2; // меньше — «истории пока мало»
const SAME_PERCENT = 5; // |изменение| < 5% — «как обычно»
const NOTABLE_SHARE = 0.1; // рост/снижение категории — от 10% её среднего (новая категория — всегда рост)
const MIN_PACE_DAYS = 3; // прогноз на период — с третьего дня, раньше темп ничего не значит
const TOP_CATEGORIES = 3;

function daysBetween(from, to) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

// День недели локальной даты: 1 — понедельник … 7 — воскресенье
function isoWeekday(dateStr) {
  const { y, m, d } = parseYmd(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

// Локальные дата, час и день недели момента now в поясе пользователя (летнее время учитывает Intl)
function localMoment(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, hour: Number(parts.hour) % 24, weekday: isoWeekday(date) };
}

// Понедельник недели, в которую входит локальная дата
function weekStart(dateStr) {
  return addDays(dateStr, 1 - isoWeekday(dateStr));
}

// Прошлая полная неделя (пн–вс) и 4 недели до неё, от новых к старым; периоды [start, end) в локальных датах
function insightWeeks(today) {
  const thisMonday = weekStart(today);
  const weeks = [];
  for (let i = 1; i <= 1 + HISTORY_WEEKS; i++) {
    const start = addDays(thisMonday, -7 * i);
    weeks.push({ start, end: addDays(start, 7), last: addDays(start, 6) });
  }
  return { week: weeks[0], previous: weeks.slice(1), thisMonday };
}

// Изменение в процентах (null — сравнивать не с чем)
function percentChange(current, base) {
  if (!base) return null;
  return Math.round((current - base) / base * 100);
}

// Сколько из прошлых недель (от новых к старым) входит в историю: до самой старой недели с тратами.
// Нули между неделями с тратами считаются — это реальные недели без трат; пустые недели до начала учёта — нет.
function historyWeekCount(previousTotals) {
  let count = 0;
  previousTotals.forEach((total, index) => {
    if (total > 0) count = index + 1;
  });
  return count;
}

// week: { total, regular, categories: [{ name, icon, id, total, regular }] }; previous — такие же недели, от новых к старым.
// Возвращает сравнение недели со средним за историю и сравнение категорий (средние — по тем же неделям).
// Авто-записи регулярных трат (regular: аренда раз в месяц и т.п.) в сравнении не участвуют — иначе неделя с арендой
// раздувает «обычную неделю», а остальные выглядят экономными; в total недели они остаются.
function summarizeWeeks(week, previous) {
  const weeks = historyWeekCount(previous.map(w => w.total));
  const history = previous.slice(0, weeks);
  const enoughHistory = weeks >= MIN_HISTORY_WEEKS;
  const comparable = (w) => w.total - (w.regular || 0);
  const average = weeks ? history.reduce((sum, w) => sum + comparable(w), 0) / weeks : 0;
  const current = comparable(week);

  const byName = new Map();
  const entry = (category) => {
    if (!byName.has(category.name)) {
      byName.set(category.name, { name: category.name, icon: category.icon, id: category.id, total: 0, historySum: 0 });
    }
    return byName.get(category.name);
  };
  for (const category of week.categories) entry(category).total += comparable(category);
  for (const w of history) {
    for (const category of w.categories) entry(category).historySum += comparable(category);
  }
  const categories = [...byName.values()].map(({ historySum, ...category }) => {
    const categoryAverage = weeks ? historySum / weeks : 0;
    return { ...category, average: categoryAverage, diff: category.total - categoryAverage, percent: percentChange(category.total, categoryAverage) };
  });

  const top = categories.filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, TOP_CATEGORIES);
  let overspend = null;
  let improvement = null;
  if (enoughHistory) {
    for (const category of categories) {
      const notable = Math.abs(category.diff) >= NOTABLE_SHARE * category.average && category.diff !== 0;
      if (!notable) continue;
      if (category.diff > 0 && (!overspend || category.diff > overspend.diff)) overspend = category;
      if (category.diff < 0 && (!improvement || category.diff < improvement.diff)) improvement = category;
    }
  }

  return {
    total: week.total,
    regular: week.regular || 0,
    weeks,
    enoughHistory,
    average,
    diff: current - average,
    percent: enoughHistory ? percentChange(current, average) : null,
    top,
    overspend,
    improvement
  };
}

// Темп текущего периода: прошедшие дни (включая сегодня), длина периода и прогноз на конец периода
function projectPace({ spent, period, today }) {
  const totalDays = daysBetween(period.start, period.end);
  const elapsedDays = Math.max(1, Math.min(totalDays, daysBetween(period.start, today) + 1));
  const projected = elapsedDays >= MIN_PACE_DAYS ? spent / elapsedDays * totalDays : null;
  return { elapsedDays, totalDays, projected };
}

class WeeklyInsightService {
  constructor({ expenseService, incomeService, reportService, budgetService, userNotificationRepository, notificationService, localizationService, formatter, planningService = null, roastService = null, subscriptionAlertService = null }) {
    this.expenseService = expenseService;
    this.incomeService = incomeService;
    this.reportService = reportService;
    this.budgetService = budgetService;
    this.userNotificationRepository = userNotificationRepository;
    this.notificationService = notificationService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.planningService = planningService; // новые найденные подписки — строкой в конце сводки, один раз
    this.roastService = roastService; // «😈 Злой режим» включён — одна строка о неделе
    this.subscriptionAlertService = subscriptionAlertService; // списания подписок на этой неделе — одной строкой
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Кнопки под каждой сводкой недели; subscriptions — в сводке есть строка о списаниях недели или найденных подписках
  keyboard(lang, { subscriptions = false } = {}) {
    const rows = [[{ text: this.t(lang, 'button_weekly_insight_overview'), callback_data: 'ov|0' }]];
    if (subscriptions) rows.push([{ text: this.t(lang, 'pl_button_subs'), callback_data: 'pls' }]);
    rows.push([{ text: this.t(lang, 'button_weekly_insight_disable'), callback_data: 'weekly_insight_off' }]);
    return { inline_keyboard: rows };
  }

  // Траты недели в основной валюте — так же, как в обзоре (getTotals + categoryBreakdown); regular — из них
  // авто-записи регулярных трат (для сравнения недель не учитываются)
  async loadWeek(userId, timezone, currency, period) {
    const [totals, categories] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.reportService.categoryBreakdown(userId, timezone, period, currency)
    ]);
    const regular = categories.reduce((sum, category) => sum + (category.regular || 0), 0);
    return { total: await this.formatter.sumInCurrency(totals.byCurrency, currency), regular, count: totals.count, categories };
  }

  // Текст сводки недели; null — за последние 5 недель нет трат
  async buildInsight(userId, lang, now = new Date()) {
    const { timezone, currency, startDay } = await this.expenseService.getPeriodContext(userId, 'month', 0);
    const today = localMoment(now, timezone).date;
    const { week, previous, thisMonday } = insightWeeks(today);
    const loaded = await Promise.all([week, ...previous].map(period => this.loadWeek(userId, timezone, currency, period)));
    if (!loaded.some(w => w.count > 0)) return null;

    const summary = summarizeWeeks(loaded[0], loaded.slice(1));
    const money = (value) => this.formatter.formatAmount(Math.round(value), currency);
    const label = (category) => this.reportService.categoryLabel(category, lang);
    const lines = [`📈 *${this.t(lang, 'weekly_insight_title', { range: this.formatter.formatPeriodRange(week) })}*`, ''];

    lines.push(this.t(lang, 'weekly_insight_spent', { amount: money(summary.total) }));
    if (summary.regular > 0) lines.push(this.t(lang, 'weekly_insight_regular', { amount: money(summary.regular) }));
    if (!summary.enoughHistory) {
      lines.push(this.t(lang, 'weekly_insight_no_history'));
    } else if (Math.abs(summary.percent) < SAME_PERCENT) {
      lines.push(this.t(lang, 'weekly_insight_same', { amount: money(summary.average), weeks: summary.weeks }));
    } else {
      const key = summary.diff > 0 ? 'weekly_insight_more' : 'weekly_insight_less';
      lines.push(this.t(lang, key, { percent: Math.abs(summary.percent), amount: money(Math.abs(summary.diff)), weeks: summary.weeks }));
    }

    if (summary.top.length) {
      lines.push('', `*${this.t(lang, 'report_top_categories')}*`);
      for (const category of summary.top) {
        const change = summary.enoughHistory ? ` · ${this.reportService.changeText(lang, category.percent)}` : '';
        lines.push(`${label(category)} — ${money(category.total)}${change}`);
      }
    }
    if (summary.overspend || summary.improvement) lines.push('');
    if (summary.overspend) {
      lines.push(this.t(lang, 'weekly_insight_overspend', { category: label(summary.overspend), amount: money(summary.overspend.diff) }));
    }
    if (summary.improvement) {
      lines.push(this.t(lang, 'weekly_insight_improvement', { category: label(summary.improvement), amount: money(-summary.improvement.diff) }));
    }

    lines.push(...await this.periodLines(userId, lang, { timezone, currency, startDay, today, money }));
    const roast = this.roastService ? await this.roastService.weeklyLine(userId, lang, summary, currency) : '';
    if (roast) lines.push('', roast);
    // «🗓 На этой неделе спишутся: …» — подписки и окончания пробных периодов на 7 дней вперёд
    const upcoming = this.subscriptionAlertService ? await this.subscriptionAlertService.weekLine(userId, lang, today) : '';
    if (upcoming) lines.push('', upcoming);
    const nudge = this.planningService ? await this.planningService.subscriptionNudge(userId, lang) : '';
    if (nudge) lines.push('', nudge);
    return { text: lines.join('\n'), weekKey: thisMonday, subscriptions: !!(nudge || upcoming) };
  }

  // Текущий период: потрачено, прогноз при текущем темпе, прошлый период, общий бюджет, доход − расходы
  async periodLines(userId, lang, { timezone, currency, startDay, today, money }) {
    const period = customPeriod(today, startDay, 0);
    const previousPeriod = customPeriod(today, startDay, -1);
    const [totals, prevTotals, incomeTotals, budgets] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.expenseService.getTotals(userId, timezone, previousPeriod),
      this.incomeService.getTotals(userId, timezone, period),
      this.budgetService.getStatus(userId, { timezone, currency, period })
    ]);
    const spent = await this.formatter.sumInCurrency(totals.byCurrency, currency);
    const lines = ['', `*${this.t(lang, 'weekly_insight_period', { range: this.formatter.formatPeriodRange(period) })}*`];
    if (!totals.count && !incomeTotals.count) {
      lines.push(this.t(lang, 'no_expenses_period'));
      return lines;
    }

    const pace = projectPace({ spent, period, today });
    lines.push(this.t(lang, 'weekly_insight_period_spent', { amount: money(spent), days: pace.elapsedDays, total: pace.totalDays }));
    if (totals.count && pace.projected !== null) {
      const prevSpent = await this.formatter.sumInCurrency(prevTotals.byCurrency, currency);
      lines.push(prevTotals.count
        ? this.t(lang, 'weekly_insight_projection_vs', {
          amount: money(pace.projected),
          previous: money(prevSpent),
          change: this.reportService.changeText(lang, percentChange(Math.round(pace.projected), Math.round(prevSpent)))
        })
        : this.t(lang, 'weekly_insight_projection', { amount: money(pace.projected) }));
      const totalBudget = budgets.find(budget => budget.category_name === null);
      if (totalBudget && totalBudget.limit > 0) {
        lines.push(pace.projected <= totalBudget.limit
          ? this.t(lang, 'weekly_insight_budget_ok', { limit: money(totalBudget.limit), amount: money(totalBudget.limit - pace.projected) })
          : this.t(lang, 'weekly_insight_budget_over', { limit: money(totalBudget.limit), amount: money(pace.projected - totalBudget.limit) }));
      }
    }
    if (incomeTotals.count) {
      const income = await this.formatter.sumInCurrency(incomeTotals.byCurrency, currency);
      lines.push(this.t(lang, 'balance_label', { amount: money(income - spent) }));
    }
    return lines;
  }

  // Cron (каждый час): по понедельникам в 10:00 по местному времени, по разу за локальную неделю,
  // только включившим сводку и только если за последние 5 недель были траты
  async processDue(now = new Date()) {
    const candidates = await this.userNotificationRepository.getWeeklyInsightCandidates();
    let sent = 0;
    for (const candidate of candidates) {
      try {
        const local = localMoment(now, candidate.timezone);
        if (local.weekday !== SEND_WEEKDAY || local.hour !== SEND_HOUR) continue;
        const lang = candidate.language || 'en';
        const insight = await this.buildInsight(candidate.id, lang, now);
        if (!insight) continue;
        if (!(await this.userNotificationRepository.markSent(candidate.id, 'weekly_insight', insight.weekKey))) continue;

        await this.notificationService.sendMessage(candidate.id, insight.text, { parse_mode: 'Markdown', reply_markup: this.keyboard(lang, insight) });
        sent++;
      } catch (error) {
        logger.warn('Weekly insight not delivered', { userId: candidate.id, error: error.message });
      }
    }
    return sent;
  }
}

Object.assign(WeeklyInsightService, {
  SEND_WEEKDAY,
  SEND_HOUR,
  localMoment,
  weekStart,
  insightWeeks,
  historyWeekCount,
  summarizeWeeks,
  projectPace,
  percentChange
});

module.exports = WeeklyInsightService;
