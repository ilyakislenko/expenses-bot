// Общее для экранов обзора: название периода, ссылки с offset/scope, изменение к прошлому периоду.
import { h } from '../core/ui.js';
import { t, me, today, monthLabel, monthShort, periodLabel } from '../core/i18n.js';
import { qs } from '../core/api.js';

const capitalize = (text) => (text ? text.charAt(0).toLocaleUpperCase(me().locale) + text.slice(1) : text);

// «Ноябрь» (другой год — «Ноябрь 2025 г.»); период не с 1-го числа — «25 окт. – 24 нояб.»
export function periodName(period) {
  if (me().startDay !== 1) return periodLabel(period);
  return capitalize(monthLabel(period.start, { year: period.start.slice(0, 4) !== today().slice(0, 4) }));
}

// Подпись столбика периода: «нояб.» / «25.10»
export function periodShort(period) {
  if (me().startDay !== 1) return `${period.start.slice(8, 10)}.${period.start.slice(5, 7)}`;
  return monthShort(period.start).replace(/\.$/, '');
}

// Путь с параметрами: offset 0 и пустой scope не пишем
export function link(path, { offset = 0, scope = null, ...rest } = {}) {
  return `${path}${qs({ offset: offset || null, scope, ...rest })}`;
}

// Изменение к прошлому периоду: «↑ 12%» (тратишь больше — красным), «↓ 8%» (зелёным), «новое», «без изменений»
export function changeNote(change) {
  if (change === null || change === undefined) return h('span', { class: 'tone-hint' }, t('ov_change_new'));
  if (change === 0) return h('span', { class: 'tone-hint' }, t('ov_change_same'));
  return h('span', { class: change > 0 ? 'tone-bad' : 'tone-good' }, `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}%`);
}

// Подписки экрана: траты, бюджеты, доходы и регулярные меняют все цифры обзора
export function watch(ctx) {
  for (const topic of ['expenses', 'budgets', 'income', 'recurring']) ctx.onChange(topic, ctx.refresh);
}
