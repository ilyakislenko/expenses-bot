// «Копилка»: общие помощники экранов — названия, сроки, ставки, шторки ввода суммы и значения, итог действия.
import { h, sheet, row, icon, toast, amountInput } from '../core/ui.js';
import { t, me, number, monthLabel, monthShort } from '../core/i18n.js';
import { haptic } from '../core/tg.js';

// Общая копилка без своего названия — «Общие накопления»
export function potName(pot) {
  return pot.kind === 'general' && !pot.name ? t('sav_general') : pot.name;
}

// 7 → «7 мес.», 26 → «2 г. 2 мес.»
export function duration(months) {
  if (months < 12) return t('sav_months', { n: months });
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? t('sav_years_months', { y: years, m: rest }) : t('sav_years', { y: years });
}

// Первое число месяца через months месяцев от today ('YYYY-MM-DD')
export function monthAfter(today, months) {
  const [y, m] = today.split('-').map(Number);
  const index = y * 12 + (m - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`;
}

// «март 2028»
export function monthYear(today, months) {
  return monthLabel(monthAfter(today, months), { year: true });
}

// Подписи оси по месяцам 0..months: до года — «нояб.», дальше — «нояб. 27»
export function monthAxis(today, months) {
  return Array.from({ length: months + 1 }, (_, k) => {
    const date = monthAfter(today, k);
    return months > 12 ? `${monthShort(date)} ${date.slice(2, 4)}` : monthShort(date);
  });
}

export function rate(value) {
  return `${number(value, 2)}%`;
}

// Число из поля ввода: «7,5», «15 000» → число; пусто или не число → null
export function parseNumber(text) {
  const cleaned = String(text ?? '').replace(/\s/g, '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Итог действия тостом: текст, достигнутые цели, строка достижений
export function report(text, result = {}) {
  const lines = [text, ...(result.achieved || []).map(goal => t('sav_goal_reached', { name: goal.name })), ...String(result.note || '').split('\n')].filter(Boolean);
  if (lines.length) toast(lines.join(' · '), { duration: 3200 + 1200 * (lines.length - 1) });
}

// Шторка ввода суммы. currencies — валюту можно сменить (список прямо в шторке, без второй шторки; сервер
// пересчитает в валюту копилки). allowZero — для новой суммы и взноса. secondary: { text, onClick } — вторая
// кнопка (например «Без платежа»). submit(amount, currency) → результат (undefined — ошибка, шторка остаётся)
export function amountSheet({ title, hint = null, currency, currencies = false, value = '', allowZero = false, button, secondary = null, submit }) {
  let code = currency;
  let input;
  const list = h('div', { class: 'section-body hidden sav-currencies' });
  const buildList = () => list.replaceChildren(...me().currencies.map(c => row({
    title: c, chevron: false, trailing: c === code ? icon('check', { cls: 'row-chevron' }) : null,
    onClick: () => { code = c; input.setCurrency(c); list.classList.add('hidden'); input.input.focus(); }
  })));
  input = amountInput({
    value: value === null || value === undefined ? '' : String(value),
    currency,
    onInput: () => {},
    onCurrency: currencies ? () => { buildList(); list.classList.toggle('hidden'); } : null
  });
  if (!currencies) input.querySelector('.amount-currency').disabled = true;
  const handle = sheet({
    title,
    content: (close) => h('div', null,
      input,
      hint ? h('div', { class: 'sav-sheet-hint' }, hint) : null,
      list,
      secondary ? h('button', { class: 'btn plain', onclick: async () => { haptic.tap(); const ok = await secondary.onClick(); if (ok !== undefined) close(); } }, secondary.text) : null),
    mainButton: {
      text: button,
      onClick: async () => {
        const amount = parseNumber(input.input.value);
        if (amount === null || amount < 0 || (amount === 0 && !allowZero)) { haptic.error(); input.input.focus(); return; }
        handle.button.busy(true);
        const result = await submit(amount, code);
        if (handle.button) handle.button.busy(false);
        if (result !== undefined) handle.close();
      }
    }
  });
  return handle;
}

// Шторка одного значения (название, ставка, число месяца, дата). parse(text) → значение или undefined (ошибка);
// submit(value) → результат (undefined — ошибка)
export function valueSheet({ title, label = null, value = '', placeholder = '', type = 'text', inputmode = null, hint = null, button, secondary = null, parse = (v) => v.trim() || undefined, submit, min = null }) {
  const input = h('input', { type, value: value ?? '', placeholder, inputmode, min, class: 'sav-sheet-input', 'aria-label': label || title });
  const handle = sheet({
    title,
    content: (close) => h('div', null,
      h('div', { class: 'section-body' }, h('div', { class: 'field stacked' }, label ? h('label', null, label) : null, input)),
      hint ? h('div', { class: 'sav-sheet-hint' }, hint) : null,
      secondary ? h('button', { class: 'btn plain', onclick: async () => { haptic.tap(); const ok = await secondary.onClick(); if (ok !== undefined) close(); } }, secondary.text) : null),
    mainButton: {
      text: button,
      onClick: async () => {
        const parsed = parse(input.value);
        if (parsed === undefined) { haptic.error(); input.focus(); return; }
        handle.button.busy(true);
        const result = await submit(parsed);
        if (handle.button) handle.button.busy(false);
        if (result !== undefined) handle.close();
      }
    }
  });
  setTimeout(() => input.focus(), 250);
  return handle;
}

// Ставка, % годовых, 0…max (до двух знаков)
export function parseRate(max) {
  return (text) => {
    const n = parseNumber(String(text).replace('%', ''));
    return n !== null && n >= 0 && n <= max && Math.abs(Math.round(n * 100) - n * 100) < 1e-6 ? n : undefined;
  };
}
