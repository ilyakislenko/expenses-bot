// Итоги периода (/report) и динамика трат по периодам (/trends) — свои траты, как «📄 Итоги» и «📈 Динамика» бота.
import { route, navigate } from '../core/router.js';
import { api } from '../core/api.js';
import { h, icon, page, section, row, avatar, expenseRow, stepper, progress, stats, empty, async, pick } from '../core/ui.js';
import { barChart, legend } from '../core/charts.js';
import { t, moneyRound, signedMoney, percent } from '../core/i18n.js';
import { periodName, periodShort, link, changeNote, watch } from './overview-util.js';

// Показатели в одну строку: три плитки — три равные колонки, без пустой ячейки
function tileRow(tiles) {
  const el = stats(tiles);
  el.style.gridTemplateColumns = `repeat(${tiles.length}, 1fr)`;
  return el;
}

// Строка категории со шкалой (доля от самой большой) и изменением к прошлому периоду
function categoryRow(c, { offset, max, compared }) {
  return row({
    avatar: avatar(c.icon),
    title: c.label,
    subtitle: h('div', { style: { flex: '1', padding: '5px 0 2px' } }, progress(max > 0 ? c.total / max : 0, { tone: 'plain' })),
    value: moneyRound(c.total),
    valueNote: compared ? changeNote(c.change) : percent(c.share),
    href: link(`/overview/category/${c.id}`, { offset, scope: 'mine' })
  });
}

function renderReport(data, go) {
  const head = stepper(periodName(data.period), { onPrev: () => go(data.offset - 1), onNext: () => go(data.offset + 1), canNext: data.offset < 0 });
  if (!data.hasData) return [head, empty({ icon: 'receipt', title: t('ov_no_records') })];

  const prev = data.previous;
  const comparison = prev ? h('div', null, changeNote(prev.change), ' ',
    t(prev.days ? 'ov_vs_prev_days' : 'ov_vs_prev', { days: prev.days, amount: moneyRound(prev.spent) })) : null;
  const tiles = [];
  if (data.full) tiles.push({ label: t('ov_per_day'), value: moneyRound(data.perDay) });
  if (data.income) {
    tiles.push({ label: t('ov_income'), value: moneyRound(data.income.total) });
    tiles.push({ label: t('ov_balance'), value: signedMoney(data.income.balance), tone: data.income.balance < 0 ? 'bad' : 'good' });
  }
  const parts = [head,
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('ov_spent')),
      h('div', { class: 'hero-value' }, moneyRound(data.spent)),
      h('div', { class: 'hero-note' }, t('ov_records', { n: data.count })),
      comparison ? h('div', { class: 'hero-note' }, comparison) : null),
    tiles.length ? tileRow(tiles) : null];

  const max = data.categories.length ? data.categories[0].total : 0;
  if (!data.full) {
    parts.push(section({ title: t('ov_top') }, data.categories.map(c => categoryRow(c, { offset: data.offset, max, compared: false }))));
    parts.push(section({ footer: t('ov_full_locked_text') }, row({ avatar: avatar('star'), title: t('ov_full_locked'), tone: 'accent', href: '/premium' })));
    return parts;
  }

  const days = prev ? prev.days : null;
  const title = !data.compared ? t('ov_categories') : days ? t('ov_cats_vs_days', { days }) : t('ov_cats_vs');
  const gone = data.gone.length ? t('ov_gone', { list: data.gone.map(c => `${c.icon} ${c.label}`).join(', ') }) : null;
  parts.push(section({ title, footer: gone }, data.categories.map(c => categoryRow(c, { offset: data.offset, max, compared: data.compared }))));

  if (data.budgets.length) {
    parts.push(section({ title: t('ov_budgets') }, data.budgets.map(b => row({
      avatar: b.category ? avatar(b.category.icon) : avatar('target'),
      title: b.category ? b.category.label : t('ov_budget_total'),
      subtitle: h('div', { style: { flex: '1', padding: '5px 0 2px' } }, progress(b.ratio)),
      value: moneyRound(b.spent),
      valueTone: b.ratio > 1 ? 'bad' : null,
      valueNote: t('ov_budget_of_short', { amount: moneyRound(b.limit) }),
      href: `/budgets/${b.id}`
    }))));
  }
  if (data.largest) parts.push(section({ title: t('ov_largest') }, expenseRow(data.largest.expense, { withDate: true })));
  return parts;
}

function reportScreen(ctx) {
  watch(ctx);
  const offset = Number(ctx.query.offset) || 0;
  const go = (next) => navigate(link('/report', { offset: next }), { replace: true });
  return page({ title: t(offset === 0 ? 'ov_report_current' : 'ov_report') },
    async(() => api.get(link('/report', { offset })), (data) => h('div', null, renderReport(data, go)), { lines: 6 }));
}

// Динамика: столбики за 6–12 периодов, средняя пунктиром, тап по столбику — тот период в обзоре (или в категории)
function renderTrends(data, { selected, categoryId }) {
  const choose = async () => {
    const value = await pick({
      title: t('ov_pick'),
      value: categoryId || 0,
      options: [{ value: 0, label: t('ov_all_spending'), avatar: avatar('chart') },
        ...data.categories.map(c => ({ value: c.id, label: c.label, avatar: avatar(c.icon) }))]
    });
    if (value === null || value === (categoryId || 0)) return;
    navigate(link('/trends', { category: value || null, offset: selected || null }), { replace: true });
  };
  const target = (p) => (data.category
    ? link(`/overview/category/${data.category.id}`, { offset: p.offset, scope: 'mine' })
    : link('/overview', { offset: p.offset, scope: 'mine' }));
  const selector = section({}, row({
    avatar: data.category ? avatar(data.category.icon) : avatar('chart'),
    title: data.category ? data.category.label : t('ov_all_spending'),
    onClick: choose,
    trailing: icon('chevron-down', { cls: 'row-chevron' })
  }));
  const periods = data.periods;
  if (!periods.some(p => p.value > 0)) return [selector, empty({ icon: 'chart', title: t('ov_no_records') })];
  const highlight = periods.findIndex(p => p.offset === selected);
  const chart = barChart({
    labels: periods.map(periodShort),
    values: periods.map(p => p.value),
    highlight: highlight >= 0 ? highlight : periods.length - 1,
    average: data.average,
    format: (value) => moneyRound(value),
    onSelect: (i) => navigate(target(periods[i]))
  });
  return [selector,
    section({}, h('div', { style: { padding: '14px 12px 10px' } }, chart,
      data.average ? legend([{ label: t('ov_average', { amount: moneyRound(data.average) }), color: 'var(--c2)', dash: true }]) : null)),
    section({}, [...periods].reverse().map(p => row({
      title: periodName(p),
      value: moneyRound(p.value),
      valueTone: p.value > 0 ? null : 'hint',
      href: target(p)
    })))];
}

function trendsScreen(ctx) {
  watch(ctx);
  const categoryId = Number(ctx.query.category) || null;
  const selected = Number(ctx.query.offset) || 0;
  return page({ title: t('ov_trends') },
    async(() => api.get(link('/trends', { category: categoryId })), (data) => h('div', null, renderTrends(data, { selected, categoryId })), { lines: 6 }));
}

export function register() {
  route('/report', reportScreen, { tab: 'overview' });
  route('/trends', trendsScreen, { tab: 'overview' });
}
