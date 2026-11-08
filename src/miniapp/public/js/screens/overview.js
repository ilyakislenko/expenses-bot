// Обзор: период пользователя с листанием, «Мои / Семья», сколько потрачено и главное (запас или перерасход к плану,
// прогноз, «Можно сегодня»), график «План и факт по дням» с касанием, категории с кольцом, кто сколько, доход и
// остаток, впереди регулярные. Записи категории — /overview/category/:id; итоги и динамика — overview-report.js.
import { route, navigate } from '../core/router.js';
import { api } from '../core/api.js';
import { h, page, section, row, avatar, expenseRow, segmented, stepper, progress, stats, empty, async } from '../core/ui.js';
import { lineChart, barChart, donut, legend, COLORS } from '../core/charts.js';
import { t, me, money, moneyRound, signedMoney, compact, percent, shortDate, dayLabel } from '../core/i18n.js';
import { periodName, periodShort, link, watch } from './overview-util.js';
import { register as registerReport } from './overview-report.js';

const DONUT_SLICES = 7; // цветов в палитре; остальные категории — одним серым куском

function hero(label, value, ...notes) {
  return h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, label),
    h('div', { class: 'hero-value' }, value),
    notes.filter(Boolean).map(note => h('div', { class: 'hero-note' }, note)));
}

function scopeSwitch(data, go) {
  if (!data.canSwitch) return null;
  return segmented([{ value: 'mine', label: t('core_mine') }, { value: 'family', label: t('core_family') }], data.scope, (scope) => go({ scope }));
}

function periodStepper(data, go) {
  return stepper(periodName(data.period), { onPrev: () => go({ offset: data.offset - 1 }), onNext: () => go({ offset: data.offset + 1 }), canNext: data.offset < 0 });
}

// Главное: запас или перерасход к плану на сегодня и прогноз на конец периода
function keyStats(data) {
  const { plan } = data;
  const items = [];
  if (plan.planToDate) {
    const over = plan.planToDate.diff > 0;
    items.push({
      label: t(over ? 'ov_over_plan' : 'ov_reserve'),
      value: moneyRound(Math.abs(plan.planToDate.diff)),
      tone: over ? 'bad' : 'good',
      hint: t('ov_plan_to', { date: shortDate(plan.planToDate.date), amount: moneyRound(plan.planToDate.plan) })
    });
  }
  if (plan.forecast) {
    const left = plan.limit ? plan.limit - plan.forecast.end : null;
    items.push({
      label: t('ov_forecast', { date: shortDate(data.period.last) }),
      value: moneyRound(plan.forecast.end),
      tone: left !== null && left < 0 ? 'bad' : null,
      hint: left === null ? t('ov_forecast_pace') : t(left >= 0 ? 'ov_forecast_left' : 'ov_forecast_over', { amount: moneyRound(Math.abs(left)) })
    });
  }
  return items.length ? stats(items) : null;
}

function allowanceRow(allowance) {
  if (!allowance) return null;
  if (allowance.deficit > 0) {
    return section({}, row({ avatar: avatar('wallet', { color: 'var(--danger)' }), title: t('ov_allowance_over'), value: moneyRound(allowance.deficit), valueTone: 'bad', href: '/plans/allowance' }));
  }
  const tone = allowance.pace === 'over' ? 'bad' : allowance.pace === 'warn' ? 'warn' : 'good';
  return section({}, row({
    avatar: avatar('wallet'),
    title: t('ov_allowance'),
    subtitle: t('ov_allowance_spent', { amount: moneyRound(allowance.spentToday) }),
    value: moneyRound(allowance.daily),
    valueTone: tone,
    href: '/plans/allowance'
  }));
}

// «План и факт по дням»: факт с заливкой, план ступеньками регулярных платежей, прогноз пунктиром с сегодняшнего дня
function planChart(data) {
  const { plan } = data;
  if (!data.count && !plan.planLine) return null;
  const series = [];
  const items = [];
  if (plan.planLine) {
    series.push({ label: t('ov_series_plan'), values: plan.planLine, steps: plan.planJumps, color: 'var(--c5)', width: 2 });
    items.push({ label: t('ov_series_plan'), color: 'var(--c5)' });
  }
  series.push({ label: t('ov_series_actual'), values: plan.actual, area: true, color: 'var(--c1)' });
  items.push({ label: t('ov_series_actual'), color: 'var(--c1)' });
  if (plan.forecast) {
    series.push({ label: t('ov_series_forecast'), values: plan.forecast.values, start: plan.forecast.start, steps: plan.forecast.jumps, color: 'var(--c1)', dash: '3 5', width: 2 });
    items.push({ label: t('ov_series_forecast'), color: 'var(--c1)', dash: true });
  }
  const chart = lineChart({
    labels: plan.days.map(day => shortDate(day)),
    series,
    marker: data.offset === 0 ? plan.lastIndex : null,
    format: (value) => moneyRound(value)
  });
  const footer = plan.planLine && plan.bills > 0 ? t('ov_bills_note', { amount: moneyRound(plan.bills) }) : null;
  return section({ title: t('ov_chart_title'), footer }, h('div', { style: { padding: '12px 12px 10px' } }, chart, legend(items)));
}

function categoryLink(data, id) {
  return link(`/overview/category/${id}`, { offset: data.offset, scope: data.scope });
}

// Категории: кольцо (тап по сектору — категория) и строки с долей и лимитом бюджета (⚠️ от 80%, 🚨 сверх)
function categoriesBlock(data) {
  if (!data.categories.length) return null;
  const withDonut = data.donut && data.categories.length > 1;
  const color = (i) => (withDonut && i < DONUT_SLICES ? COLORS[i] : null);
  let ring = null;
  if (withDonut) {
    const items = data.categories.slice(0, DONUT_SLICES).map((c, i) => ({ value: c.total, color: COLORS[i] }));
    const rest = data.categories.slice(DONUT_SLICES).reduce((sum, c) => sum + c.total, 0);
    if (rest > 0) items.push({ value: rest, color: 'color-mix(in srgb, var(--hint) 45%, transparent)' });
    ring = h('div', { style: { padding: '16px 0 8px' } }, donut({
      items,
      size: 190,
      center: { title: t('ov_spent'), value: compact(data.spent) },
      onSelect: (i) => { if (i < DONUT_SLICES && data.categories[i]) navigate(categoryLink(data, data.categories[i].id)); }
    }));
  }
  const rows = data.categories.map((c, i) => {
    const share = percent(c.share);
    let subtitle = share;
    if (c.budget) {
      const tone = c.budget.level === 'over' ? 'tone-bad' : c.budget.level === 'warn' ? 'tone-warn' : '';
      subtitle = [share, ' · ', h('span', { class: tone }, t('ov_limit', { amount: moneyRound(c.budget.limit) }), c.budget.level === 'over' ? ' 🚨' : c.budget.level === 'warn' ? ' ⚠️' : '')];
    }
    return row({ avatar: avatar(c.icon, { color: color(i) }), title: c.label, subtitle, value: moneyRound(c.total), href: categoryLink(data, c.id) });
  });
  return section({ title: t('ov_categories') }, ring, rows);
}

function membersBlock(data) {
  if (!data.members.length) return null;
  return section({ title: t('ov_members') }, data.members.map((m, i) => row({
    avatar: avatar('user', { color: COLORS[i % COLORS.length] }),
    title: m.name,
    subtitle: percent(m.share),
    value: moneyRound(m.total)
  })));
}

function incomeBlock(data) {
  if (data.income) {
    return section({},
      row({ avatar: avatar('income', { color: 'var(--good)' }), title: t('ov_income'), value: moneyRound(data.income.total), href: link('/income', { offset: data.offset }) }),
      row({ avatar: avatar('wallet'), title: t('ov_balance'), value: signedMoney(data.income.balance), valueTone: data.income.balance < 0 ? 'bad' : 'good' }));
  }
  if (data.incomeHint) {
    return section({}, row({ avatar: avatar('income', { color: 'var(--good)' }), title: t('ov_income_hint'), subtitle: t('ov_income_hint_text'), tone: 'accent', href: '/income/new' }));
  }
  return null;
}

function upcomingBlock(data) {
  if (!data.upcoming.length) return null;
  return section({ title: t('ov_upcoming') }, data.upcoming.map(item => row({
    avatar: avatar(item.icon || 'repeat'),
    title: item.description,
    subtitle: [dayLabel(item.date), item.author ? ` · ${item.author.name}` : ''].join(''),
    value: money(item.amount, item.currency),
    href: item.mine ? `/recurring/${item.id}` : null
  })));
}

// Итоги, динамика и бюджеты — на своём экране (как в боте); бюджеты — на экране контура пользователя
function toolsBlock(data) {
  const homeView = data.scope === me().homeScope;
  return section({},
    data.scope === 'mine' && data.count ? row({ avatar: avatar('receipt'), title: t(data.offset === 0 ? 'ov_report_current' : 'ov_report'), href: link('/report', { offset: data.offset }) }) : null,
    data.scope === 'mine' ? row({ avatar: avatar('chart'), title: t('ov_trends'), href: link('/trends', { offset: data.offset }) }) : null,
    homeView && data.offset === 0 ? row({ avatar: avatar('target'), title: t('ov_budgets'), href: '/budgets' }) : null);
}

function renderOverview(data, go) {
  const head = [scopeSwitch(data, go), periodStepper(data, go)];
  const current = data.offset === 0;
  if (!data.count && !data.plan.planLine) {
    return [head,
      empty({ icon: 'chart', title: t(current ? 'ov_empty_title' : 'ov_no_records'), text: current ? t('ov_empty_text') : null, action: current ? { text: t('ov_add'), onClick: () => navigate('/add') } : null }),
      allowanceRow(data.allowance), incomeBlock(data), upcomingBlock(data), toolsBlock(data)];
  }
  const budgetNote = data.budget ? h('div', null,
    h('div', { style: { margin: '8px 0 6px' } }, progress(data.budget.ratio)),
    t('ov_budget_of', { amount: moneyRound(data.budget.limit), percent: percent(data.budget.ratio) })) : null;
  return [head,
    hero(t('ov_spent'), moneyRound(data.spent), t('ov_records', { n: data.count }), budgetNote),
    keyStats(data),
    allowanceRow(data.allowance),
    planChart(data),
    categoriesBlock(data),
    membersBlock(data),
    incomeBlock(data),
    upcomingBlock(data),
    toolsBlock(data)];
}

function overviewScreen(ctx) {
  watch(ctx);
  const offset = Number(ctx.query.offset) || 0;
  const scope = ctx.query.scope || null;
  const go = (next) => navigate(link('/overview', { offset, scope, ...next }), { replace: true });
  return page({ title: t('ov_title') },
    async(() => api.get(link('/overview', { offset, scope })), (data) => h('div', null, renderOverview(data, go)), { lines: 6 }));
}

// Записи категории за период: сумма, динамика по периодам (премиум), записи (в семье — с автором)
function renderCategory(data, go) {
  const family = data.scope === 'family';
  const trend = data.trend && data.trend.periods.some(p => p.value > 0) ? data.trend : null;
  return [
    periodStepper(data, go),
    data.count ? hero(t('ov_spent'), moneyRound(data.spent), t('ov_records', { n: data.count })) : null,
    trend ? section({ title: t('ov_category_trend') }, h('div', { style: { padding: '12px 12px 10px' } },
      barChart({
        labels: trend.periods.map(periodShort),
        values: trend.periods.map(p => p.value),
        highlight: trend.periods.findIndex(p => p.offset === data.offset),
        average: trend.average,
        format: (value) => moneyRound(value),
        onSelect: (i) => go({ offset: trend.periods[i].offset })
      }),
      trend.average ? legend([{ label: t('ov_average', { amount: moneyRound(trend.average) }), color: 'var(--c2)', dash: true }]) : null)) : null,
    data.count
      ? section({}, data.expenses.map(e => expenseRow(e, { withDate: true, withAuthor: family })))
      : empty({ icon: 'search', title: t('ov_no_records') })
  ];
}

function categoryScreen(ctx) {
  watch(ctx);
  const offset = Number(ctx.query.offset) || 0;
  const scope = ctx.query.scope || null;
  const path = `/overview/category/${encodeURIComponent(ctx.params.id)}`;
  const go = (next) => navigate(link(path, { offset, scope, ...next }), { replace: true });
  const title = h('span', null, '');
  const view = page({ title: ' ' },
    async(() => api.get(link(path, { offset, scope })), (data) => {
      title.textContent = `${data.category.icon} ${data.category.label}`;
      return h('div', null, renderCategory(data, go));
    }, { lines: 6 }));
  const heading = view.querySelector('.page-title');
  if (heading) heading.replaceChildren(title);
  return view;
}

export function register() {
  route('/overview', overviewScreen, { tab: 'overview', root: true });
  route('/overview/category/:id', categoryScreen, { tab: 'overview' });
  registerReport();
}
