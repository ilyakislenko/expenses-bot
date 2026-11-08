// Вкладка «Планы» (бот: «🧭 Планирование»): хаб, «Можно потратить сегодня», платежи на 30 дней, «Моя инфляция».
// Подписки и пробные периоды — plans-subs.js, бюджеты — budgets.js.
import { route, navigate, changed } from '../core/router.js';
import { h, icon, page, section, row, avatar, async, sheet, act, empty, toggle, stats, toast } from '../core/ui.js';
import { t, moneyRound, dayLabel, shortDate, periodLabel, addDays } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton } from '../core/tg.js';
import { planIcon, signedPercent, kindAvatar, PACE_TONE, flow, budgetRow, periodElapsed, exact } from './plans-ui.js';
import { registerSubscriptions } from './plans-subs.js';

const REFRESH_TOPICS = ['expenses', 'income', 'recurring', 'budgets', 'savings', 'family', 'premium'];

function onTopics(ctx, topics, fn) {
  for (const topic of topics) ctx.onChange(topic, fn);
}

// «Можно сегодня» крупно: лимит, потрачено и остаток, шкала дня с цветом темпа. Без данных — что сделать
function allowanceHero(a, { onClick = null, label = t('plan_allow_title') } = {}) {
  let body;
  if (a.mode === 'none') {
    body = [
      h('div', { class: 'hero-label' }, label),
      h('div', { class: 'plan-hero-empty' }, t('plan_allow_none_short'))
    ];
  } else if (a.deficit > 0) {
    body = [
      h('div', { class: 'hero-label' }, label),
      h('div', { class: 'hero-value tone-bad' }, moneyRound(0, a.currency)),
      h('div', { class: 'hero-note tone-bad' }, t('plan_allow_deficit', { amount: moneyRound(a.deficit, a.currency) })),
      a.spentToday > 0 ? h('div', { class: 'hero-note' }, t('plan_allow_spent_today', { amount: moneyRound(a.spentToday, a.currency) })) : null
    ];
  } else {
    const ratio = a.daily > 0 ? a.spentToday / a.daily : 1;
    const fill = h('span');
    fill.style.width = `${Math.min(100, ratio * 100)}%`;
    body = [
      h('div', { class: 'hero-label' }, label),
      h('div', { class: 'hero-value' }, moneyRound(a.daily, a.currency)),
      h('div', { class: `progress ${PACE_TONE[a.pace]} plan-day-bar` }, fill),
      h('div', { class: 'plan-hero-line' },
        h('span', null, t('plan_allow_spent', { amount: moneyRound(a.spentToday, a.currency) })),
        a.leftToday >= 0
          ? h('span', null, t('plan_allow_left', { amount: moneyRound(a.leftToday, a.currency) }))
          : h('span', { class: 'tone-bad' }, t('plan_allow_over_today', { amount: moneyRound(-a.leftToday, a.currency) })))
    ];
  }
  if (!onClick) return h('div', { class: 'hero plan-hero' }, body);
  return h('button', { class: 'hero plan-hero tappable', onclick: onClick }, body, icon('chevron-right', { cls: 'row-chevron plan-hero-chevron' }));
}

function calendarRow(item, { withDate = false } = {}) {
  const income = item.kind === 'income';
  const label = item.label || t('plan_cal_income_default');
  // Вид платежа виден по значку; подписью — только то, что отличает строку (у регулярной — ничего)
  const kindText = item.kind === 'recurring' ? null : t(`plan_kind_${item.kind}`);
  const subtitle = [withDate ? dayLabel(item.date) : kindText, item.paid ? t('plan_cal_paid') : null].filter(Boolean).join(' · ') || null;
  const href = item.kind === 'recurring' ? `/recurring/${item.ref}`
    : item.kind === 'subscription' ? `/plans/subscription/${item.ref}`
      : item.kind === 'debt' ? `/savings/pot/${item.ref}` : '/income';
  return row({
    title: label,
    subtitle,
    avatar: kindAvatar(item.kind),
    value: `${income ? '+' : ''}${exact(item.amount, item.currency)}`,
    valueTone: income ? 'good' : item.paid ? 'hint' : null,
    href
  });
}

// ========================================
// ХАБ
// ========================================

function renderHub(data) {
  const a = data.allowance;
  const hub = [];
  hub.push(allowanceHero(a, { onClick: () => navigate('/plans/allowance') }));

  // Ближайшие платежи — самое частое после «можно сегодня»
  if (data.next.length) {
    hub.push(section({ title: t('plan_hub_next'), link: { text: t('plan_all'), onClick: () => navigate('/plans/calendar') } },
      data.next.map(item => calendarRow(item, { withDate: true }))));
  } else {
    hub.push(section({}, row({ title: t('plan_cal_title'), subtitle: t('plan_hub_next_none'), avatar: avatar('calendar'), href: '/plans/calendar' })));
  }

  // Бюджеты: шкалы (премиум); без премиума — одна строка к экрану премиума
  const budgets = data.budgets;
  if (budgets && budgets.items.length) {
    const elapsed = periodElapsed(a.period, data.today);
    hub.push(section({
      title: budgets.family ? t('plan_budgets_family_title') : t('plan_budgets_title'),
      link: { text: t('plan_all'), onClick: () => navigate('/budgets') }
    }, budgets.items.map(b => budgetRow(b, { elapsed, onClick: () => navigate(`/budgets/${b.id}`) }))));
  }

  const rows = [];
  rows.push(row({
    title: t('plan_subs_title'),
    subtitle: data.subscriptions.count ? t('plan_hub_subs_count', { count: data.subscriptions.count }) : t('plan_hub_subs_none'),
    value: data.subscriptions.count ? `≈ ${moneyRound(data.subscriptions.monthly, data.currency)}` : null,
    valueNote: data.subscriptions.count ? t('plan_per_month') : null,
    avatar: avatar('repeat', { color: 'var(--c5)' }),
    href: '/plans/subscriptions'
  }));
  for (const trial of data.trials) {
    rows.push(row({
      title: trial.name,
      subtitle: t('plan_trial_until', { date: shortDate(trial.endDate) }),
      avatar: avatar('clock', { color: 'var(--c4)' }),
      href: `/plans/trial/${trial.id}`
    }));
  }
  if (!budgets || !budgets.items.length) {
    rows.push(row({
      title: t('plan_budgets_title'),
      subtitle: budgets ? t('plan_hub_budgets_none') : t('plan_hub_budgets_locked'),
      avatar: avatar('target', { color: 'var(--c3)' }),
      trailing: budgets ? null : icon('star', { cls: 'row-chevron' }),
      href: budgets ? '/budgets/new' : '/budgets'
    }));
  }
  const inf = data.inflation;
  rows.push(row({
    title: t('plan_inf_title'),
    subtitle: inf.state === 'ok' ? t('plan_inf_since', { date: shortDate(inf.since) }) : t(`plan_hub_inf_${inf.state}`),
    value: inf.state === 'ok' ? signedPercent(inf.change) : null,
    valueTone: inf.state === 'ok' ? (inf.change > 0.005 ? 'bad' : inf.change < -0.005 ? 'good' : null) : null,
    avatar: avatar('percent', { color: 'var(--c2)' }),
    trailing: inf.state === 'locked' ? icon('star', { cls: 'row-chevron' }) : null,
    href: '/plans/inflation'
  }));
  rows.push(row({ title: t('plan_recurring'), subtitle: t('plan_recurring_hint'), avatar: avatar('calendar', { color: 'var(--c1)' }), href: '/recurring' }));
  hub.push(section({}, rows));
  return h('div', null, hub);
}

// ========================================
// МОЖНО ПОТРАТИТЬ СЕГОДНЯ
// ========================================

function billsSheet(items, currency) {
  sheet({
    title: t('plan_allow_bills_title'),
    content: h('div', { class: 'section-body' }, items.map(item => row({
      title: item.label,
      subtitle: `${dayLabel(item.date)} · ${t(`plan_kind_${item.kind}`)}`,
      avatar: kindAvatar(item.kind),
      value: exact(item.amount, item.currency)
    })))
  });
}

function incomeNote(income, currency) {
  const parts = [];
  if (income.recorded > 0) parts.push(t('plan_allow_income_recorded', { amount: moneyRound(income.recorded, currency) }));
  if (income.upcoming > 0) {
    const list = income.expected.slice(0, 3).map(e => `${e.label || t('plan_cal_income_default')} ~${shortDate(e.date)}`).join(', ');
    parts.push(t('plan_allow_income_expected', { amount: moneyRound(income.upcoming, currency), list }));
  }
  if (income.usesAverage) parts.push(t('plan_allow_income_average', { count: income.averagePeriods }));
  return parts.join(' · ') || null;
}

function renderAllowance(a) {
  const out = [];
  if (a.mode === 'none') {
    mainButton.push({ text: t('plan_add_income'), onClick: () => navigate('/income/new') });
    out.push(empty({ icon: 'target', title: t('plan_allow_none_title'), text: t('plan_allow_none_text') }));
    out.push(h('button', { class: 'btn plain', onclick: () => navigate('/budgets/new') }, t('plan_set_budget')));
    return h('div', null, out);
  }
  const c = a.currency;
  out.push(allowanceHero(a, { label: t('core_today') }));
  if (a.family) {
    out.push(section({}, row({ title: t('plan_allow_family'), subtitle: t('plan_allow_family_note'), avatar: avatar('family'), tone: 'plan-wrap' })));
  }

  // Лесенка: от дохода или общего бюджета (если ограничивает он) — к свободным деньгам
  const fromBudget = a.mode === 'budget' || a.limitedBy === 'budget';
  const steps = [];
  if (fromBudget) {
    steps.push({ kind: 'start', label: t('plan_allow_budget'), amount: a.budget,
      note: a.limitedBy === 'budget' ? t('plan_allow_budget_limit', { income: moneyRound(a.income.total, c) }) : null });
  } else {
    steps.push({ kind: 'start', label: t('plan_allow_income'), amount: a.income.total, note: incomeNote(a.income, c) });
    if (a.savings > 0) steps.push({ kind: 'minus', label: t('plan_allow_savings'), amount: a.savings });
  }
  steps.push({ kind: 'minus', label: t('plan_allow_spent_before'), amount: a.spent, onClick: () => navigate('/overview') });
  const lastDay = a.period.last;
  const bills = fromBudget ? a.budgetBills : a.bills.total;
  const billItems = fromBudget ? a.bills.items.filter(item => item.date <= lastDay) : a.bills.items;
  if (bills > 0) {
    steps.push({
      kind: 'minus',
      label: !fromBudget && a.bills.until ? t('plan_allow_bills_until', { date: shortDate(a.bills.until) }) : t('plan_allow_bills'),
      note: t('plan_allow_bills_count', { count: billItems.length }),
      amount: bills,
      onClick: () => billsSheet(billItems, c)
    });
  }
  const debts = fromBudget ? a.budgetDebts : a.debts.total;
  if (debts > 0) {
    steps.push({ kind: 'minus', label: t('plan_allow_debts'), amount: debts, note: a.debts.prorated ? t('plan_allow_debts_note') : null,
      onClick: () => navigate('/plans/calendar') });
  }
  steps.push({ kind: 'result', label: t('plan_allow_free'), amount: a.free });

  const tail = [];
  if (a.free > 0) {
    tail.push(row({ title: t('plan_allow_per_day', { days: a.days }), value: moneyRound(a.rawDaily, c) }));
    if (a.capped) tail.push(row({ title: t('plan_allow_capped'), subtitle: t('plan_allow_capped_note'), value: moneyRound(a.daily, c), tone: 'plan-wrap' }));
  }
  out.push(h('div', { class: 'section' },
    h('div', { class: 'section-title' }, h('span', null, t('plan_allow_how'))),
    h('div', { class: 'section-body' }, flow(steps, c), tail),
    h('div', { class: 'section-footer' }, t('plan_allow_note'))));

  // Дохода нет — считаю от бюджета; записанный доход добавит в расчёт взнос в накопления
  if (a.mode === 'budget' && !a.family) {
    out.push(section({ footer: t('plan_allow_budget_hint') },
      row({ title: t('plan_add_income'), avatar: avatar('plus'), tone: 'accent', href: '/income/new' })));
  }
  return h('div', null, out);
}

// ========================================
// ПЛАТЕЖИ
// ========================================

function dueDaySheet(debt, onSaved) {
  const save = async (day, close) => {
    const result = await act(() => api.put(`/plans/debts/${debt.id}/due-day`, { day }));
    if (!result) return;
    close();
    toast(day ? t('plan_due_saved', { name: debt.name, day }) : t('plan_due_cleared', { name: debt.name }));
    changed('savings');
    onSaved();
  };
  sheet({
    title: t('plan_due_title', { name: debt.name }),
    content: (close) => h('div', null,
      h('div', { class: 'plan-days' }, Array.from({ length: 31 }, (_, i) => i + 1).map(day =>
        h('button', { class: `plan-day${debt.dueDay === day ? ' on' : ''}`, onclick: () => save(day, close) }, String(day)))),
      h('div', { class: 'section-footer plan-days-note' }, t('plan_due_note')),
      debt.dueDay ? h('button', { class: 'btn danger', onclick: () => save(0, close) }, t('plan_due_clear')) : null)
  });
}

function renderCalendar(cal, ctx) {
  const out = [];
  const hasItems = cal.items.length > 0;
  if (!hasItems && !cal.debts.length) {
    out.push(empty({ icon: 'calendar', title: t('plan_cal_empty_title'), text: t('plan_cal_empty_text'),
      action: { text: t('plan_recurring'), onClick: () => navigate('/recurring') } }));
    return h('div', null, out);
  }
  if (hasItems) {
    out.push(stats([
      { label: t('plan_cal_out'), value: `≈ ${moneyRound(cal.outTotal, cal.currency)}` },
      cal.inTotal > 0 ? { label: t('plan_cal_in'), value: `≈ ${moneyRound(cal.inTotal, cal.currency)}`, tone: 'good' } : null
    ]));
  }
  let date = null;
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const title = date === cal.today ? `${t('core_today')}, ${shortDate(date)}`
      : date === addDays(cal.today, 1) ? `${t('core_tomorrow')}, ${shortDate(date)}` : dayLabel(date);
    out.push(section({ title }, group));
    group = [];
  };
  for (const item of cal.items) {
    if (item.date !== date) { flush(); date = item.date; }
    group.push(calendarRow(item));
  }
  flush();

  // Долги с платежом: число платежа (без числа — в «Можно сегодня» доля по дням)
  if (cal.debts.length) {
    out.push(section({ title: t('plan_cal_debts'), footer: cal.debts.some(d => !d.dueDay) ? t('plan_cal_debts_note') : null },
      cal.debts.map(debt => row({
        title: debt.name,
        subtitle: t('plan_cal_debt_payment', { amount: exact(debt.payment, debt.currency) }),
        avatar: kindAvatar('debt'),
        value: debt.dueDay ? t('plan_due_day', { day: debt.dueDay }) : t('plan_due_set'),
        valueTone: debt.dueDay ? null : 'warn',
        onClick: () => dueDaySheet(debt, ctx.refresh)
      }))));
  }

  const reminder = toggle(cal.remindersOn, async (on) => {
    const result = await act(() => api.put('/plans/reminders', { bills: on }));
    if (!result) { reminder.checked = !on; return; }
    toast(t(on ? 'plan_bills_on' : 'plan_bills_off'));
  });
  out.push(section({}, row({ title: t('plan_bills_toggle'), subtitle: t('plan_bills_toggle_note'), avatar: avatar('bell'), trailing: reminder, tone: 'plan-wrap' })));
  return h('div', null, out);
}

// ========================================
// МОЯ ИНФЛЯЦИЯ
// ========================================

function inflationRow(item, currency) {
  return row({
    title: item.name,
    subtitle: `${exact(item.oldPrice, currency)} → ${exact(item.newPrice, currency)}`,
    value: signedPercent(item.change),
    valueTone: item.change > 0 ? 'bad' : 'good'
  });
}

function renderInflation(inf) {
  if (!inf.purchases) return empty({ icon: 'receipt', title: t('plan_inf_empty_title'), text: t('plan_inf_empty_text') });
  if (!inf.count) return empty({ icon: 'receipt', title: t('plan_inf_wait_title'), text: t('plan_inf_no_repeats', { count: inf.purchases }) });
  const out = [];
  if (!inf.isPremium) {
    out.push(section({ title: t('plan_inf_teaser') }, inflationRow(inf.teaser, inf.currency)));
    out.push(section({}, row({ title: t('plan_inf_locked', { count: inf.count }), avatar: avatar('star'), tone: 'accent', href: '/premium' })));
    out.push(h('div', { class: 'section-footer plan-note' }, t('plan_inf_note')));
    return h('div', null, out);
  }
  const b = inf.basket;
  out.push(h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, t('plan_inf_basket', { count: b.count })),
    h('div', { class: `hero-value${b.change > 0.005 ? ' tone-bad' : b.change < -0.005 ? ' tone-good' : ''}` }, signedPercent(b.change)),
    h('div', { class: 'hero-note' }, t('plan_inf_since', { date: shortDate(b.since) }))));
  out.push(section({ title: t('plan_inf_risers') }, inf.risers.map(item => inflationRow(item, inf.currency))));
  out.push(section({ title: t('plan_inf_fallers') }, inf.fallers.map(item => inflationRow(item, inf.currency))));
  if (!inf.risers.length && !inf.fallers.length) out.push(section({}, row({ title: t('plan_inf_stable'), avatar: avatar('check') })));
  out.push(h('div', { class: 'section-footer plan-note' }, t('plan_inf_note')));
  return h('div', null, out);
}

export function register() {
  route('/plans', (ctx) => {
    onTopics(ctx, REFRESH_TOPICS, ctx.refresh);
    return page({ title: t('core_tab_plans') }, async(() => api.get('/plans'), renderHub, { lines: 6 }));
  }, { tab: 'plans', root: true });

  route('/plans/allowance', (ctx) => {
    onTopics(ctx, REFRESH_TOPICS, ctx.refresh);
    return page({ title: t('plan_allow_page') }, async(() => api.get('/plans/allowance'), (a) => {
      const node = renderAllowance(a);
      if (a.mode !== 'none') {
        const subtitle = h('div', { class: 'page-subtitle plan-under-title' }, t('plan_allow_period', { range: periodLabel(a.period), days: a.daysLeft }));
        return h('div', null, subtitle, node);
      }
      return node;
    }, { lines: 8 }));
  }, { tab: 'plans' });

  route('/plans/calendar', (ctx) => {
    onTopics(ctx, ['recurring', 'income', 'savings', 'expenses'], ctx.refresh);
    return page({ title: t('plan_cal_title'), subtitle: t('plan_cal_subtitle') }, async(() => api.get('/plans/calendar'), (cal) => renderCalendar(cal, ctx), { lines: 8 }));
  }, { tab: 'plans' });

  route('/plans/inflation', (ctx) => {
    onTopics(ctx, ['expenses', 'premium'], ctx.refresh);
    return page({ title: t('plan_inf_title') }, async(() => api.get('/plans/inflation'), renderInflation, { lines: 6 }));
  }, { tab: 'plans' });

  registerSubscriptions();
}

