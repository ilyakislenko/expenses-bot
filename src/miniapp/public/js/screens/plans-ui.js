// Общие куски вкладки «Планы» и бюджетов: стили раздела, свои иконки, «Как считаю» лесенкой, строка бюджета со шкалой.
import { h, icon } from '../core/ui.js';
import { t, money, moneyRound, me, daysBetween } from '../core/i18n.js';
import { haptic } from '../core/tg.js';

// Иконки, которых нет в общем наборе: колокольчик перечёркнут, запрет
const EXTRA = {
  'bell-off': 'M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-1.7M10.3 21a1.9 1.9 0 0 0 3.4 0M2 2l20 20',
  ban: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM4.9 4.9l14.2 14.2',
  link: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM12 18h.01'
};
// Аватар строки с иконкой раздела
export function iconAvatar(name) {
  return h('div', { class: 'avatar' }, planIcon(name));
}

export function planIcon(name, { size = 24, cls = '' } = {}) {
  if (!EXTRA[name]) return icon(name, { size, cls });
  const el = icon('info', { size, cls });
  el.querySelector('path').setAttribute('d', EXTRA[name]);
  return el;
}

// «+4,1%» / «−2,3%» — одна цифра после запятой, как в боте
export function signedPercent(ratio) {
  const value = Math.round((Number(ratio) || 0) * 1000) / 10;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const text = new Intl.NumberFormat(me().locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(value));
  return `${sign}${text}%`;
}

export function cadenceText(cadence) {
  return t(`plan_cadence_${cadence}`);
}

// Значок строки календаря по виду платежа
const KIND = {
  recurring: { icon: 'repeat', color: 'var(--c1)' },
  debt: { icon: 'wallet', color: 'var(--c2)' },
  subscription: { icon: 'sparkles', color: 'var(--c5)' },
  income: { icon: 'income', color: 'var(--good)' }
};
export function kindAvatar(kind) {
  const k = KIND[kind] || KIND.recurring;
  const el = h('div', { class: 'avatar' }, icon(k.icon));
  el.style.background = `color-mix(in srgb, ${k.color} 16%, transparent)`;
  el.style.color = k.color;
  return el;
}

// Темп дня: зелёный — до 70% лимита, жёлтый — до 100%, красный — больше
export const PACE_TONE = { good: 'good', warn: 'warn', over: 'bad' };

// Лесенка «Как считаю»: от дохода (или бюджета) вниз по слагаемым до «свободно». steps: [{ label, note, amount,
// kind: 'start' | 'minus' | 'result', onClick }]. Полоса шага — его доля на общей шкале
export function flow(steps, currency) {
  let current = 0;
  const points = [0];
  const spans = steps.map(step => {
    if (step.kind === 'start') { current = step.amount; points.push(current); return [0, current]; }
    if (step.kind === 'minus') { const from = current; current -= step.amount; points.push(current); return [current, from]; }
    points.push(step.amount);
    return [Math.min(0, step.amount), Math.max(0, step.amount)];
  });
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const scale = hi - lo || 1;
  return h('div', { class: 'plan-flow' }, steps.map((step, i) => {
    const [a, b] = spans[i];
    const bar = h('span', { class: `plan-flow-bar ${step.kind}${step.kind === 'result' && step.amount < 0 ? ' negative' : ''}` });
    bar.style.left = `${((a - lo) / scale) * 100}%`;
    bar.style.width = `${Math.max(0.6, ((b - a) / scale) * 100)}%`;
    const sign = step.kind === 'minus' ? '−' : step.kind === 'result' ? '=' : '';
    const content = [
      h('div', { class: 'plan-flow-head' },
        h('span', { class: 'plan-flow-label' }, step.label),
        h('span', { class: `plan-flow-amount${step.kind === 'result' ? ' strong' : ''}` }, `${sign}${sign ? '\u2009' : ''}${moneyRound(Math.abs(step.amount), currency)}`)),
      step.note ? h('div', { class: 'plan-flow-note' }, step.note) : null,
      h('div', { class: 'plan-flow-track' }, bar)
    ];
    return step.onClick
      ? h('button', { class: 'plan-flow-row tappable', onclick: () => { haptic.tap(); step.onClick(); } }, content, icon('chevron-right', { cls: 'row-chevron plan-flow-chevron' }))
      : h('div', { class: 'plan-flow-row' }, content);
  }));
}

// Доля прошедшего периода (для отметки «сейчас» на шкале бюджета)
export function periodElapsed(period, today) {
  const length = daysBetween(period.start, period.last) + 1;
  return Math.min(1, Math.max(0, (daysBetween(period.start, today) + 0.5) / length));
}

// Шкала бюджета: заполнение — потрачено / лимит, тонкая отметка — сколько периода прошло
export function budgetBar(ratio, elapsed = null) {
  const tone = ratio > 1 ? 'bad' : ratio >= 0.8 ? 'warn' : 'good';
  const fill = h('span');
  fill.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  const bar = h('div', { class: `progress ${tone} plan-budget-bar` }, fill);
  if (elapsed !== null) {
    const tick = h('i', { class: 'plan-budget-tick' });
    tick.style.left = `${elapsed * 100}%`;
    bar.appendChild(tick);
  }
  return bar;
}

export function budgetName(budget) {
  return budget.total ? t('plan_budget_total') : budget.category.label;
}

// Строка бюджета: значок, название, «потрачено из лимита», остаток / перерасход справа, шкала
export function budgetRow(budget, { elapsed = null, onClick = null } = {}) {
  const over = budget.left < 0;
  const content = [
    h('div', { class: 'avatar' }, budget.total ? icon('target') : budget.category.icon),
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, budgetName(budget)),
      budgetBar(budget.ratio, elapsed),
      h('div', { class: 'plan-budget-foot' },
        h('span', null, t('plan_budget_of', { spent: moneyRound(budget.spent), limit: moneyRound(budget.limit) })),
        h('span', { class: over ? 'tone-bad' : null }, over ? t('plan_budget_over', { amount: moneyRound(-budget.left) }) : t('plan_budget_left', { amount: moneyRound(budget.left) }))))
  ];
  if (!onClick) return h('div', { class: 'row with-avatar plan-budget-row' }, content);
  return h('button', { class: 'row with-avatar plan-budget-row', onclick: () => { haptic.tap(); onClick(); } }, content, icon('chevron-right', { cls: 'row-chevron' }));
}

// Сумма в своей валюте (подписки, долги, пробные периоды бывают не в основной)
export function exact(amount, currency) {
  return money(amount, currency || me().currency);
}
