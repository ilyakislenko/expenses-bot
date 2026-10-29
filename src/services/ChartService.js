const { customPeriod } = require('../utils/period');
const { compactAmount, commaDecimal } = require('../utils/savingsView');
const charts = require('../utils/charts');

const TREND_PERIODS = 6;
const IMAGE_WIDTH = { donut: 1200, trend: 1200, card: 1080 };
// Категория по умолчанию «Другое» — при группировке уходит в общий кусок «другое»
const DEFAULT_OTHER_NAMES = ['Другое', 'Other'];
// Коды языков бота → локали Intl для названий месяцев
const INTL_LOCALES = { jp: 'ja', kz: 'kk' };

// Графики картинками: данные — те же, что у текстовых экранов (суммы в основной валюте по курсу),
// раскладка — utils/charts.js, растеризация — ChartRenderer. Если картинку не нарисовать (нет рендера или
// шрифта для языка интерфейса) — png: null, обработчик отвечает текстом.
class ChartService {
  constructor({ expenseService, reportService, localizationService, formatter, chartRenderer }) {
    this.expenseService = expenseService;
    this.reportService = reportService;
    this.localizationService = localizationService;
    this.formatter = formatter;
    this.renderer = chartRenderer;
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

  // 📈 Столбики за 6 периодов, последний — выбранный (offset). categoryId — только эта категория (по имени, как
  // группирует обзор). → { png, caption, text } (text — текстом, если png: null) или null — категории нет
  async trend(userId, lang, offset, { categoryId = null, botUsername } = {}) {
    const { timezone, currency, today, startDay } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    let category = null;
    if (categoryId) {
      category = await this.expenseService.getCategoryById(userId, categoryId);
      if (!category) return null;
    }
    const periods = [];
    for (let k = offset - TREND_PERIODS + 1; k <= offset; k++) periods.push(customPeriod(today, startDay, k));
    const values = await Promise.all(periods.map(async (period) => {
      if (category) {
        const rows = await this.reportService.categoryBreakdown(userId, timezone, period, currency);
        const row = rows.find(c => c.name === category.name);
        return row ? row.total : 0;
      }
      const totals = await this.expenseService.getTotals(userId, timezone, period);
      return totals.count ? this.formatter.sumInCurrency(totals.byCurrency, currency) : 0;
    }));
    const labels = this.periodLabels(periods, lang, startDay);
    const bars = periods.map((period, index) => ({
      label: labels[index],
      value: values[index],
      amount: this.compact(values[index], currency, lang),
      current: index === periods.length - 1
    }));
    // Текущий период ещё идёт — в среднюю не входит
    const average = charts.trendAverage(bars, { excludeLast: offset === 0 });
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

  // 🎉 Карточка «Итоги месяца» из AchievementService.buildWrapped().card → PNG или null.
  // Без описаний трат и названий целей: только числа, главная категория и категория самой крупной покупки.
  async wrappedCard(card, lang, { botUsername } = {}) {
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
    const svg = charts.wrappedCardSvg({
      title: labels.title, subtitle: range, total: money(card.total), totalLabel: labels.spent,
      brand: this.brand(botUsername), footer: labels.footer, tiles, rows
    }, this.renderer.createText());
    return this.render(svg, IMAGE_WIDTH.card);
  }

  // 🎲 Карточка результата квиза недели → PNG или null (нет рендера или шрифта для языка).
  // card: { weekRange, score, correct, total, answers, percent, streak, perfect }. Сумм и описаний трат нет
  async quizCard(card, lang, { botUsername } = {}) {
    const link = botUsername ? `t.me/${botUsername}?start=quiz` : '';
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
