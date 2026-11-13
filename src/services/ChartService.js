const { customPeriod } = require('../utils/period');
const { periodSeries } = require('../utils/periodForecast');
const { compactAmount, commaDecimal } = require('../utils/savingsView');
const charts = require('../utils/charts');

const TREND_PERIODS = 6;
const IMAGE_WIDTH = { donut: 1200, trend: 1200, card: 1080 };
// Категория по умолчанию «Другое» — при группировке уходит в общий кусок «другое»
const DEFAULT_OTHER_NAMES = ['Другое', 'Other'];
// Коды языков бота → локали Intl для названий месяцев
const INTL_LOCALES = { jp: 'ja', kz: 'kk' };
// Ссылка на картинке — без https:// (короче, а Telegram и камеры телефона её всё равно узнают)
const cardLink = (link) => (link ? String(link).replace(/^https?:\/\//, '') : '');

// Графики картинками: данные — те же, что у текстовых экранов (суммы в основной валюте по курсу),
// раскладка — utils/charts.js, растеризация — ChartRenderer. Если картинку не нарисовать (нет рендера или
// шрифта для языка интерфейса) — png: null, обработчик отвечает текстом.
class ChartService {
  constructor({ expenseService, reportService, localizationService, formatter, chartRenderer, budgetService = null, recurringExpenseService = null }) {
    this.expenseService = expenseService;
    this.reportService = reportService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.renderer = chartRenderer;
    this.budgetService = budgetService; // общий бюджет — план на картинке обзора
    this.recurringExpenseService = recurringExpenseService; // будущие регулярные платежи — ступеньки плана
  }

  get available() {
    return !!this.renderer && this.renderer.available;
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  // Тексты интерфейса (из локали) рисуются целиком — иначе картинки на этом языке нет
  async canRender(texts) {
    if (!this.available || !(await this.renderer.ready())) return false;
    return texts.every(text => this.renderer.textSupported(charts.cleanLabel(text)));
  }

  async render(svg, width) {
    return this.renderer.render(svg, width);
  }

  // Подпись из пользовательских данных: без emoji, символы без шрифта выкинуты
  userLabel(text) {
    return this.renderer.sanitize(charts.cleanLabel(text));
  }

  categoryName(name, lang) {
    return this.formatter.translateCategoryName(name, this.localizationService, lang);
  }

  money(value, currency) {
    return this.formatter.formatAmount(value, currency);
  }

  compact(value, currency, lang) {
    return compactAmount(value, currency, {
      thousand: this.t(lang, 'savings_compact_thousand'),
      million: this.t(lang, 'savings_compact_million'),
      comma: commaDecimal(lang)
    });
  }

  brand(botUsername) {
    return botUsername ? `@${botUsername}` : '';
  }

  // Подпись столбика: месяц («окт.»), при периодах не с 1-го — дата начала «25.09»; через границу года — с годом
  periodLabels(periods, lang, startDay) {
    if (startDay !== 1) return periods.map(p => `${p.start.slice(8, 10)}.${p.start.slice(5, 7)}`);
    const locale = INTL_LOCALES[lang] || lang;
    const crossYear = periods[0].start.slice(0, 4) !== periods[periods.length - 1].start.slice(0, 4);
    let format;
    try {
      format = new Intl.DateTimeFormat(locale, crossYear ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { month: 'short', timeZone: 'UTC' });
    } catch (error) {
      format = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' });
    }
    return periods.map(p => format.format(new Date(`${p.start}T12:00:00Z`)));
  }

  // 🍩 Кольцо по категориям за период → { png, caption, period }; png: null — нарисовать нельзя
  async donut(userId, lang, offset, { botUsername } = {}) {
    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const range = this.formatter.formatPeriodRange(period);
    const title = this.t(lang, 'chart_donut_title');
    const caption = `🍩 *${title}*\n${range}`;
    const [totals, categories] = await Promise.all([
      this.expenseService.getTotals(userId, timezone, period),
      this.reportService.categoryBreakdown(userId, timezone, period, currency)
    ]);
    const spent = totals.count ? await this.formatter.sumInCurrency(totals.byCurrency, currency) : 0;
    const otherLabel = (count) => this.t(lang, 'chart_other', { count });
    const ui = [title, range, this.t(lang, 'chart_spent'), this.t(lang, 'chart_empty'), otherLabel(2), this.money(spent, currency)];
    if (!(await this.canRender(ui))) return { png: null, caption, period };

    const grouped = charts.groupCategories(categories.map(c => ({
      label: this.userLabel(this.categoryName(c.name, lang)),
      total: c.total,
      isOther: DEFAULT_OTHER_NAMES.includes(c.name)
    })));
    const percents = charts.percentages(grouped.map(g => g.total));
    const items = grouped.map((g, index) => ({
      label: g.other ? otherLabel(g.count) : g.label,
      amount: this.money(g.total, currency),
      percent: charts.percentLabel(percents[index], g.total),
      value: g.total,
      other: g.other
    }));
    const svg = charts.donutSvg({
      title, subtitle: range, total: this.money(spent, currency), totalLabel: this.t(lang, 'chart_spent'),
      emptyText: this.t(lang, 'chart_empty'), brand: this.brand(botUsername), items
    }, this.renderer.createText());
    return { png: await this.render(svg, IMAGE_WIDTH.donut), caption, period };
  }

  // Траты по периодам без рисования: count периодов, последний — offset; categoryId — только эта категория (по имени,
  // как группирует обзор); familyId — семейные траты всех участников (категория — системная или участника семьи).
  // Текущий незаконченный период в среднюю не входит. → { currency, startDay, category, periods: [{ start, end, last,
  // offset, value }], average } или null — категории нет
  async trendData(userId, offset, { categoryId = null, count = TREND_PERIODS, familyId = null } = {}) {
    const { timezone, currency, today, startDay } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const owner = familyId ? { familyId } : userId;
    let category = null;
    if (categoryId) {
      category = familyId
        ? await this.expenseService.getFamilyCategoryById(familyId, categoryId)
        : await this.expenseService.getCategoryById(userId, categoryId);
      if (!category) return null;
    }
    const periods = [];
    for (let k = offset - count + 1; k <= offset; k++) periods.push({ ...customPeriod(today, startDay, k), offset: k });
    const values = await Promise.all(periods.map(async (period) => {
      if (category) {
        const rows = await this.reportService.categoryBreakdown(owner, timezone, period, currency);
        const row = rows.find(c => c.name === category.name);
        return row ? row.total : 0;
      }
      const totals = await this.expenseService.getTotals(owner, timezone, period);
      return totals.count ? this.formatter.sumInCurrency(totals.byCurrency, currency) : 0;
    }));
    periods.forEach((period, index) => { period.value = values[index]; });
    const average = charts.trendAverage(periods, { excludeLast: offset === 0 });
    return { currency, startDay, category, periods, average };
  }

  // 📈 Столбики за 6 периодов, последний — выбранный (offset). categoryId — только эта категория (по имени, как
  // группирует обзор). → { png, caption, text } (text — текстом, если png: null) или null — категории нет
  async trend(userId, lang, offset, { categoryId = null, botUsername } = {}) {
    const data = await this.trendData(userId, offset, { categoryId });
    if (!data) return null;
    const { currency, startDay, category, periods, average } = data;
    const labels = this.periodLabels(periods, lang, startDay);
    const bars = periods.map((period, index) => ({
      label: labels[index],
      value: period.value,
      amount: this.compact(period.value, currency, lang),
      current: index === periods.length - 1
    }));
    const categoryLabel = category ? this.categoryName(category.name, lang) : null;
    const trendTitle = this.t(lang, 'chart_trend_title');
    const range = this.formatter.formatPeriodRange({ start: periods[0].start, last: periods[periods.length - 1].last });
    const averageLabel = average ? this.t(lang, 'chart_average', { amount: this.compact(average, currency, lang) }) : '';

    // Подпись и текстовый вариант: заголовок, категория (Markdown), диапазон периодов
    const header = [`📈 *${trendTitle}*`];
    if (category) header.push(`${category.icon || '📦'} ${this.formatter.escapeMarkdown(categoryLabel)}`);
    header.push(range);
    const caption = header.join('\n');
    const textLines = [...header, ''];
    for (const bar of bars) {
      const line = `${bar.label} — ${this.money(Math.round(bar.value), currency)}`;
      textLines.push(bar.current ? `▶️ *${line}*` : `▫️ ${line}`);
    }
    if (averageLabel) textLines.push('', `〰️ ${averageLabel}`);
    const text = textLines.join('\n');

    const ui = [category ? this.t(lang, 'chart_trend_category_title', { category: '' }) : trendTitle, range, averageLabel, this.t(lang, 'chart_empty'), ...labels, ...bars.map(b => b.amount)];
    if (!(await this.canRender(ui))) return { png: null, caption, text };
    const svg = charts.trendSvg({
      title: category ? this.t(lang, 'chart_trend_category_title', { category: this.userLabel(categoryLabel) }) : trendTitle,
      subtitle: range, emptyText: this.t(lang, 'chart_empty'), brand: this.brand(botUsername), averageLabel, bars, average
    }, this.renderer.createText());
    return { png: await this.render(svg, IMAGE_WIDTH.trend), caption, text };
  }

  // 📉 План и факт по дням данными (картинка обзора бота — planFact, интерактивный график Mini App): траты нарастающим
  // итогом против плана. План — общий бюджет: регулярные платежи периода — ступенькой в свой день (списанные — в день
  // записи, будущие — в nextChargeDate), остаток бюджета поровну на дни. Так скачок факта в день аренды не выглядит
  // перерасходом. Прогноз (текущий период, со 2-го дня): обычные траты прошедших дней (без сегодня и без регулярных) в
  // среднем за день — до конца периода, будущие регулярные — ступеньками.
  // familyId — семейные траты всех участников против семейного бюджета, будущие семейные регулярные
  // (RecurringExpenseService.listFamily) — ступеньками. Своего плана нет, если бюджет пользователя семейный
  // (BudgetService.scopeFor): потолок общий, а траты на нём — только свои.
  // → { currency, period, today, current, days, lastIndex, actual, running, limit, bills, planLine, planJumps (null без
  //     общего бюджета), forecast: { start, values, jumps, end } | null, planToDate: { date, plan, diff } | null }
  // planToDate — только по прожитым дням: в текущем периоде на конец вчера (сегодняшняя доля ещё не прожита, в запас не
  // идёт) плюс регулярные, уже списанные сегодня; траты — все, с сегодняшними. Первый день периода — null
  async planFactData(userId, offset, { familyId = null } = {}) {
    const { timezone, currency, today, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const current = offset === 0;
    const upcoming = () => (familyId ? this.recurringExpenseService.listFamily(familyId) : this.recurringExpenseService.list(userId));
    const budgets = async () => {
      if (!this.budgetService) return [];
      if (familyId) return this.budgetService.getStatus({ familyId }, { timezone, currency, period });
      const scope = await this.budgetService.scopeFor(userId);
      return typeof scope === 'object' ? [] : this.budgetService.getStatus(userId, { timezone, currency, period });
    };
    const [rows, statuses, recurring] = await Promise.all([
      this.expenseService.getExpenses(familyId ? { familyId } : userId, timezone, period),
      budgets(),
      this.recurringExpenseService && current ? upcoming() : []
    ]);
    const total = statuses.find(b => b.category_name === null);
    const limit = total ? total.limit : null;
    const convert = (amount, from) => this.formatter.sumInCurrency([{ currency: from, total: Number(amount) }], currency);
    const { days, lastIndex, chargedByDay, futureByDay, actual, running, forecast } = await periodSeries({
      rows, recurring, period, today, timezone, convert, current
    });
    const billsOn = (day) => (chargedByDay.get(day) || 0) + (futureByDay.get(day) || 0);
    let planLine = null;
    let planJumps = null;
    let bills = 0;
    if (limit) {
      for (const day of days) bills += billsOn(day);
      const perDay = Math.max(0, limit - bills) / days.length;
      planLine = [];
      planJumps = [];
      let plan = 0;
      for (const day of days) {
        const jump = billsOn(day);
        plan += perDay + jump;
        planLine.push(plan);
        planJumps.push(jump);
      }
    }
    const closedIndex = current ? lastIndex - 1 : lastIndex;
    let planToDate = null;
    if (planLine && closedIndex >= 0) {
      const plan = planLine[closedIndex] + (current ? chargedByDay.get(today) || 0 : 0);
      planToDate = { date: days[closedIndex], plan, diff: running - plan };
    }
    return { currency, period, today, current, days, lastIndex, actual, running, limit, bills, planLine, planJumps, forecast, planToDate };
  }

  // 📉 Картинка «План и факт по дням» (planFactData) → { png, summary } — summary: строки «план к сегодня · запас /
  // сверх», «прогноз на конец» и «регулярные в плане» для текста обзора (null — нечего сказать); png: null — не нарисовать
  async planFact(userId, lang, offset, { botUsername, familyId = null } = {}) {
    const { currency, period, days, actual, running, limit, bills, planLine, planJumps, forecast, planToDate } = await this.planFactData(userId, offset, { familyId });
    const shortDay = (day) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
    const lines = [];
    const over = !!planToDate && planToDate.diff > 0;
    if (planToDate) {
      lines.push(this.t(lang, over ? 'chart_planfact_over' : 'chart_planfact_under', {
        date: shortDay(planToDate.date),
        plan: this.money(Math.round(planToDate.plan), currency),
        amount: this.money(Math.round(Math.abs(planToDate.diff)), currency)
      }));
    }
    if (forecast) {
      const params = { date: shortDay(days[days.length - 1]), amount: this.money(Math.round(forecast.end), currency) };
      if (!limit) lines.push(this.t(lang, 'chart_planfact_forecast', params));
      else {
        const left = limit - forecast.end;
        lines.push(this.t(lang, left >= 0 ? 'chart_planfact_forecast_left' : 'chart_planfact_forecast_over', { ...params, left: this.money(Math.round(Math.abs(left)), currency) }));
      }
    }
    if (planLine && bills > 0) lines.push(this.t(lang, 'chart_planfact_bills', { amount: this.money(Math.round(bills), currency) }));
    const summary = lines.length ? lines.join('\n') : null;

    const range = this.formatter.formatPeriodRange(period);
    const title = this.t(lang, 'chart_planfact_title');
    const actualLabel = this.t(lang, 'chart_planfact_actual');
    const limitLabel = this.t(lang, 'chart_planfact_limit');
    const forecastLabel = this.t(lang, 'chart_planfact_forecast_label');
    const dayLabels = days.map(shortDay);
    const actualAmount = this.compact(running, currency, lang);
    const limitAmount = limit ? this.compact(limit, currency, lang) : '';
    const forecastAmount = forecast ? this.compact(forecast.end, currency, lang) : '';
    const ui = [title, range, actualLabel, limitLabel, forecastLabel, this.t(lang, 'chart_empty'), actualAmount, limitAmount, forecastAmount, ...dayLabels];
    if (!(await this.canRender(ui))) return { png: null, summary };
    const svg = charts.planFactSvg({
      title, subtitle: range, brand: this.brand(botUsername), emptyText: this.t(lang, 'chart_empty'),
      dayLabels, actual, planLine, planJumps, forecast, over, actualLabel, limitLabel, forecastLabel, actualAmount, limitAmount, forecastAmount
    }, this.renderer.createText());
    return { png: await this.render(svg, IMAGE_WIDTH.trend), summary };
  }

  // 📊 Сценарии накоплений на год (SavingsScenarioService.build) картинкой → PNG или null (нечего рисовать / нет шрифта).
  // Кривые: как в среднем — оранжевая, по плану — фиолетовая пунктиром, как в этом месяце — синяя
  async savingsScenarios(result, lang, { botUsername } = {}) {
    if (!result.scenarios.length) return null;
    const { currency } = result;
    const style = {
      average: { color: charts.THEME.average, dash: null },
      plan: { color: charts.PALETTE[4], dash: '14 10' },
      current: { color: charts.THEME.current, dash: null }
    };
    const periods = [];
    for (let k = 0; k < result.scenarios[0].points.length; k++) periods.push(customPeriod(result.today, result.startDay, k));
    const monthLabels = this.horizonLabels(periods, lang, result.startDay);
    const lines = result.scenarios.map(s => ({
      label: this.t(lang, `savings_scen_leg_${s.key}`), values: s.points, amount: this.compact(s.points[s.points.length - 1], currency, lang), ...style[s.key]
    }));
    const title = this.t(lang, 'savings_scen_chart_title');
    const subtitle = `${monthLabels[0]} – ${monthLabels[monthLabels.length - 1]}`;
    const nowLabel = this.t(lang, 'savings_scen_leg_now');
    const nowAmount = this.compact(result.total, currency, lang);
    if (!(await this.canRender([title, subtitle, nowLabel, nowAmount, ...monthLabels, ...lines.flatMap(l => [l.label, l.amount])]))) return null;
    const svg = charts.savingsScenariosSvg({ title, subtitle, brand: this.brand(botUsername), monthLabels, nowLabel, nowAmount, lines }, this.renderer.createText());
    return this.render(svg, IMAGE_WIDTH.trend);
  }

  // Подписи месяцев на горизонте: «нояб.», год — только у первого, последнего и января («нояб. 26», «янв. 27»);
  // при периодах не с 1-го — дата начала «25.09»
  horizonLabels(periods, lang, startDay) {
    if (startDay !== 1) return this.periodLabels(periods, lang, startDay);
    const locale = INTL_LOCALES[lang] || lang;
    const make = (options) => {
      try {
        return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
      } catch (error) {
        return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' });
      }
    };
    const month = make({ month: 'short' });
    const year = make({ year: '2-digit' });
    return periods.map((p, i) => {
      const date = new Date(`${p.start}T12:00:00Z`);
      const withYear = i === 0 || i === periods.length - 1 || p.start.slice(5, 7) === '01';
      return withYear ? `${month.format(date)} ${year.format(date).replace(/\D/g, '')}` : month.format(date);
    });
  }

  // 🎉 Карточка «Итоги месяца» из AchievementService.buildWrapped().card → PNG или null.
  // Без описаний трат и названий целей: только числа, главная категория и категория самой крупной покупки.
  // link — ссылка поделившегося (share_wrapped_<код>), пишется внизу картинки: её видят те, кому переслали
  async wrappedCard(card, lang, { botUsername, link = null } = {}) {
    if (!card) return null;
    const { currency } = card;
    const money = (value) => this.money(value, currency);
    const shortDate = (day) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
    const range = this.formatter.formatPeriodRange(card.period);
    const labels = {
      title: this.t(lang, 'chart_card_title'),
      spent: this.t(lang, 'chart_card_spent'),
      records: this.t(lang, 'chart_card_records'),
      days: this.t(lang, 'chart_card_days'),
      streak: this.t(lang, 'chart_card_streak'),
      top: this.t(lang, 'chart_card_top'),
      largest: this.t(lang, 'chart_card_largest'),
      biggestDay: this.t(lang, 'chart_card_biggest_day'),
      footer: this.t(lang, 'chart_card_footer')
    };
    const comparison = card.comparison
      ? charts.cleanLabel(this.t(lang, 'ach_wrapped_comparison', { count: card.comparison.count, item: this.t(lang, `ach_wrapped_item_${card.comparison.key}`) }))
      : null;
    if (!(await this.canRender([...Object.values(labels), range, money(card.total), comparison || '']))) return null;

    const tiles = [
      { value: String(card.count), label: labels.records },
      { value: String(card.days), label: labels.days }
    ];
    if (card.streak >= 2) tiles.push({ value: String(card.streak), label: labels.streak });
    const rows = [];
    if (card.top) {
      rows.push({
        label: labels.top,
        value: this.userLabel(this.categoryName(card.top.name, lang)),
        detail: `${money(card.top.total)} · ${card.top.percent}%`,
        note: comparison,
        percent: card.top.percent
      });
    }
    if (card.largest) {
      const where = card.largest.categoryName ? `${this.userLabel(this.categoryName(card.largest.categoryName, lang))} · ` : '';
      rows.push({ label: labels.largest, value: this.money(card.largest.amount, card.largest.currency), detail: `${where}${shortDate(card.largest.day)}` });
    }
    if (card.biggestDay) {
      rows.push({ label: labels.biggestDay, value: money(card.biggestDay.total), detail: shortDate(card.biggestDay.day) });
    }
    const linkLabel = cardLink(link);
    const svg = charts.wrappedCardSvg({
      title: labels.title, subtitle: range, total: money(card.total), totalLabel: labels.spent,
      brand: this.brand(botUsername), footer: labels.footer, link: linkLabel, tiles, rows
    }, this.renderer.createText());
    return this.render(svg, IMAGE_WIDTH.card);
  }

  // 🎲 Карточка результата квиза недели → PNG или null (нет рендера или шрифта для языка).
  // card: { weekRange, score, correct, total, answers, percent, streak, perfect }. Сумм и описаний трат нет.
  // shareLink — ссылка поделившегося (share_quiz_<код>); без неё — ссылка на квиз без кода
  async quizCard(card, lang, { botUsername, link: shareLink = null } = {}) {
    const link = cardLink(shareLink) || (botUsername ? `t.me/${botUsername}?start=share_quiz` : '');
    const labels = {
      title: this.t(lang, 'quiz_card_title'),
      subtitle: this.t(lang, 'quiz_card_week', { range: card.weekRange }),
      points: this.t(lang, 'quiz_card_points'),
      correct: this.t(lang, 'quiz_card_correct'),
      better: this.t(lang, 'quiz_card_better'),
      streak: this.t(lang, 'quiz_card_streak'),
      footer: this.t(lang, 'quiz_card_footer'),
      badge: card.perfect ? this.t(lang, 'quiz_card_perfect') : ''
    };
    if (!(await this.canRender([...Object.values(labels), link]))) return null;
    const tiles = [{ value: `${card.correct}/${card.total}`, label: labels.correct }];
    if (card.percent !== null && card.percent !== undefined) tiles.push({ value: `${card.percent}%`, label: labels.better });
    if (card.streak >= 2) tiles.push({ value: String(card.streak), label: labels.streak });
    const svg = charts.quizCardSvg({
      title: labels.title,
      subtitle: labels.subtitle,
      score: String(card.score),
      scoreLabel: labels.points,
      badge: labels.badge,
      answers: card.answers,
      tiles,
      footer: labels.footer,
      link,
      brand: this.brand(botUsername)
    }, this.renderer.createText());
    return this.render(svg, IMAGE_WIDTH.card);
  }
}

ChartService.TREND_PERIODS = TREND_PERIODS;

module.exports = ChartService;
