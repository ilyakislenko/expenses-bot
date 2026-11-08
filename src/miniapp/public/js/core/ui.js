// Компоненты интерфейса. Правила (см. BOT_PAGES.md «Mini App»): один основной бутон на экран — нативный MainButton
// (tg.js); строка списка — тап по всей строке, справа максимум значение/шеврон/переключатель; сгруппированные
// списки section; никаких карточек в карточках; пояснения — только когда нужны.
import { t, money, time, dayLabel } from './i18n.js';
import { haptic, mainButton, confirm } from './tg.js';
import { navigate } from './router.js';
import { ApiError } from './api.js';

// h('div', { class: 'x', onclick, style: {…}, dataset: {…} }, ...дети). Дети: узлы, строки, числа, массивы; null/false — пропуск
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'selected') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// Иконки — штрихом 24×24 (в духе Lucide), цвет — currentColor
const ICONS = {
  plus: 'M12 5v14M5 12h14',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  today: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM12 14h.01',
  chart: 'M3 3v18h18M7 15l4-4 3 3 6-6',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  piggy: 'M19 9c1 .8 2 2.2 2 4a3 3 0 0 1-2 2.8V19h-3v-2h-6v2H7v-3.2A6.5 6.5 0 0 1 11 5h3c2 0 3.7.9 5 4ZM15 10h.01M3 10c0 1.5 1 2.5 2 3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M16 14h.01',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  income: 'M12 19V5M5 12l7-7 7 7',
  expense: 'M12 5v14M19 12l-7 7-7-7',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z',
  receipt: 'M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2ZM8 8h8M8 12h8M8 16h5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  family: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  percent: 'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2'
};
export function icon(name, { size = 24, stroke = 2, cls = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', stroke);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (cls) svg.setAttribute('class', cls);
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name] || ICONS.info);
  svg.appendChild(path);
  return svg;
}

// Экран: крупный заголовок, подзаголовок, справа одно действие (текст/иконка)
export function page({ title, subtitle = null, action = null }, ...content) {
  return h('div', { class: 'page' },
    title ? h('div', { class: 'page-head' },
      h('div', null, h('h1', { class: 'page-title' }, title), subtitle ? h('div', { class: 'page-subtitle' }, subtitle) : null),
      action ? h('button', { class: 'head-action', onclick: () => { haptic.tap(); action.onClick(); }, 'aria-label': action.label || '' },
        action.icon ? icon(action.icon) : null, action.text || null) : null) : null,
    content);
}

// Сгруппированный список: заголовок (+ ссылка справа), строки, подпись снизу. Пустой — не рисуется
export function section(options, ...rows) {
  const { title = null, link = null, footer = null } = options || {};
  const body = rows.flat().filter(Boolean);
  if (!body.length) return null;
  return h('div', { class: 'section' },
    title ? h('div', { class: 'section-title' }, h('span', null, title),
      link ? h('button', { onclick: () => { haptic.tap(); link.onClick(); } }, link.text) : null) : null,
    h('div', { class: 'section-body' }, body),
    footer ? h('div', { class: 'section-footer' }, footer) : null);
}

// Аватар строки: эмодзи категории или иконка
export function avatar(content, { color = null, small = false } = {}) {
  const el = h('div', { class: `avatar${small ? ' small' : ''}` }, typeof content === 'string' && !ICONS[content] ? content : icon(content || 'info'));
  if (color) { el.style.background = `color-mix(in srgb, ${color} 18%, transparent)`; el.style.color = color; }
  return el;
}

// Строка списка. onClick → вся строка тапается (кнопка), справа value (+ valueNote) и шеврон, либо trailing (переключатель)
export function row({ title, subtitle = null, value = null, valueNote = null, valueTone = null, avatar: av = null, onClick = null, href = null, trailing = null, chevron = !!(onClick || href), tone = null }) {
  const click = href ? () => navigate(href) : onClick;
  const content = [
    av,
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), subtitle ? h('div', { class: 'row-subtitle' }, subtitle) : null),
    value !== null && value !== undefined ? h('div', { class: `row-value${valueTone ? ` tone-${valueTone}` : ''}` }, value, valueNote ? h('small', null, valueNote) : null) : null,
    trailing,
    click && chevron && !trailing ? icon('chevron-right', { cls: 'row-chevron' }) : null
  ];
  const cls = `row${av ? ' with-avatar' : ''}${tone ? ` ${tone}` : ''}`;
  if (!click) return h('div', { class: cls }, content);
  return h('button', { class: cls, onclick: () => { haptic.tap(); click(); } }, content);
}

// Запись траты (контракт сериализации — src/miniapp/serialize.js): эмодзи категории, описание или категория,
// время (или дата) · автор в семье, сумма. Тап — карточка записи #/record/:id
export function expenseRow(e, { withDate = false, withAuthor = false, onClick = null } = {}) {
  const parts = [withDate ? `${dayLabel(e.date)}, ${time(e.createdAt)}` : time(e.createdAt)];
  if (withAuthor && e.author) parts.push(e.author.name);
  return row({
    avatar: avatar(e.category ? e.category.icon : '📦'),
    title: e.description || (e.category ? e.category.label : '—'),
    subtitle: [e.recurring ? icon('repeat') : null, parts.join(' · ')],
    value: money(e.amount, e.currency),
    onClick: onClick || (() => navigate(`/record/${e.id}`)),
    chevron: false
  });
}

// Переключатель-сегменты: [{ value, label }]
export function segmented(options, value, onChange) {
  const el = h('div', { class: 'segmented', role: 'tablist' });
  for (const option of options) {
    el.appendChild(h('button', {
      class: option.value === value ? 'on' : '', role: 'tab',
      onclick: () => { if (option.value !== value) { haptic.tap(); onChange(option.value); } }
    }, option.label));
  }
  return el;
}

// «‹ ноябрь ›»: шаг назад / вперёд (вперёд — только если canNext)
export function stepper(label, { onPrev, onNext, canNext = true, canPrev = true }) {
  return h('div', { class: 'stepper' },
    h('button', { class: 'icon-btn', disabled: !canPrev, onclick: () => { haptic.tap(); onPrev(); }, 'aria-label': '‹' }, icon('chevron-left')),
    h('div', { class: 'stepper-label' }, label),
    h('button', { class: 'icon-btn', disabled: !canNext, onclick: () => { haptic.tap(); onNext(); }, 'aria-label': '›' }, icon('chevron-right')));
}

// Переключатель в строке
export function toggle(checked, onChange) {
  return h('input', { type: 'checkbox', class: 'toggle', checked, onchange: (e) => { haptic.tap(); onChange(e.target.checked); } });
}

export function progress(ratio, { tone = null } = {}) {
  const auto = tone || (ratio > 1 ? 'bad' : ratio >= 0.8 ? 'warn' : 'good');
  return h('div', { class: `progress ${auto}` }, h('span', { style: { width: `${Math.min(100, Math.max(0, ratio * 100))}%` } }));
}

// Плитки-показатели: [{ label, value, hint, tone }]
export function stats(items) {
  return h('div', { class: 'stats' }, items.filter(Boolean).map(s => h('div', { class: 'stat' },
    h('div', { class: 'stat-label' }, s.label),
    h('div', { class: `stat-value${s.tone ? ` tone-${s.tone}` : ''}` }, s.value),
    s.hint ? h('div', { class: 'stat-hint' }, s.hint) : null)));
}

// Поле ввода в списке: { label, value, placeholder, type, inputmode, onInput, stacked, multiline, maxlength }
export function field({ label, value = '', placeholder = '', type = 'text', inputmode = null, onInput = null, stacked = false, multiline = false, maxlength = null, autofocus = false }) {
  const input = h(multiline ? 'textarea' : 'input', {
    type: multiline ? null : type, value, placeholder, inputmode, maxlength, autofocus,
    oninput: (e) => onInput && onInput(e.target.value)
  });
  const el = h('div', { class: `field${stacked || multiline ? ' stacked' : ''}` }, label ? h('label', null, label) : null, input);
  el.input = input;
  return el;
}

// Крупный ввод суммы с кнопкой валюты; onInput(число|null), onCurrency() — выбор валюты
export function amountInput({ value = '', currency, onInput, onCurrency = null, autofocus = true }) {
  const input = h('input', {
    inputmode: 'decimal', placeholder: '0', value: value === null ? '' : String(value), autocomplete: 'off',
    oninput: (e) => {
      const cleaned = e.target.value.replace(/[^\d.,]/g, '').replace(/(\d+[.,]?\d{0,2}).*/, '$1');
      if (cleaned !== e.target.value) e.target.value = cleaned;
      const n = Number(cleaned.replace(',', '.'));
      onInput(cleaned && n > 0 ? n : null);
    }
  });
  const currencyButton = h('button', { class: 'amount-currency', onclick: () => { haptic.tap(); onCurrency && onCurrency(); } }, currency);
  const el = h('div', { class: 'amount-input' }, input, currencyButton);
  el.input = input;
  el.setCurrency = (code) => { currencyButton.textContent = code; };
  if (autofocus) setTimeout(() => input.focus(), 250);
  return el;
}

// Шторка снизу. content — узел или функция(close) → узел. mainButton: { text, onClick } — своя главная кнопка на
// время шторки. → { close, body }
export function sheet({ title = null, content, mainButton: mb = null, onClose = null }) {
  const backdrop = h('div', { class: 'backdrop' });
  const body = h('div', { class: 'sheet-body' });
  const el = h('div', { class: 'sheet', role: 'dialog' }, h('div', { class: 'sheet-handle' }),
    title ? h('div', { class: 'sheet-head' }, h('div', { class: 'sheet-title' }, title),
      h('button', { class: 'icon-btn', onclick: () => close(), 'aria-label': t('core_close') }, icon('close'))) : null,
    body);
  let button = null;
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (button) button.remove();
    el.classList.add('closing');
    backdrop.remove();
    setTimeout(() => el.remove(), 180);
    window.removeEventListener('hashchange', close);
    if (onClose) onClose();
  }
  backdrop.addEventListener('click', close);
  window.addEventListener('hashchange', close);
  body.appendChild(typeof content === 'function' ? content(close) : content);
  document.body.append(backdrop, el);
  if (mb) button = mainButton.push(mb);
  return { close, body, button };
}

// Выбор из списка в шторке → выбранное значение или null. options: [{ value, label, subtitle, avatar }]
export function pick({ title, options, value = null }) {
  return new Promise((resolve) => {
    let chosen = null;
    sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => h('div', { class: 'section-body' }, options.map(o => row({
        title: o.label, subtitle: o.subtitle || null, avatar: o.avatar || null,
        trailing: o.value === value ? icon('check', { cls: 'row-chevron' }) : null,
        onClick: () => { chosen = o.value; close(); }
      })))
    });
  });
}

// Уведомление снизу на 3 с; action: { text, onClick } (например «Вернуть»)
let toastEl = null;
export function toast(text, { action = null, duration = 3200 } = {}) {
  if (toastEl) toastEl.remove();
  const el = h('div', { class: 'toast', role: 'status' }, h('span', null, text),
    action ? h('button', { onclick: () => { el.remove(); action.onClick(); } }, action.text) : null);
  document.body.appendChild(el);
  toastEl = el;
  setTimeout(() => { if (toastEl === el) { el.remove(); toastEl = null; } }, duration);
}

// Пустое состояние: иконка, заголовок, текст, одно действие
export function empty({ icon: name = 'sparkles', title = null, text = null, action = null }) {
  return h('div', { class: 'empty' },
    h('div', { class: 'empty-icon' }, icon(name)),
    title ? h('div', { class: 'empty-title' }, title) : null,
    text ? h('div', null, text) : null,
    action ? h('button', { class: 'btn', onclick: () => { haptic.tap(); action.onClick(); } }, action.text) : null);
}

export function skeleton(lines = 3) {
  return h('div', { class: 'skeleton' }, Array.from({ length: lines }, () => h('i', { style: { width: `${55 + Math.round(Math.random() * 35)}%` } })));
}

// Текст ошибки API для человека
export function errorText(error) {
  if (error instanceof ApiError) {
    if (error.code === 'network') return t('core_error_network');
    if (error.code === 'rate') return t('core_error_rate');
    if (error.code === 'auth') return t('core_open_from_bot');
    const specific = t(`error_${error.code}`);
    if (specific !== `error_${error.code}`) return specific;
  }
  return t('core_error');
}

// Экран «нужен премиум» (ответ API 402)
export function premiumGate() {
  return empty({ icon: 'star', title: t('core_premium_title'), text: t('core_premium_text'), action: { text: t('core_premium_button'), onClick: () => navigate('/premium') } });
}

// Загрузка данных в узел: скелет → render(data) или ошибка с «Повторить» (402 — экран премиума)
export function async(load, render, { lines = 4 } = {}) {
  const box = h('div', null, skeleton(lines));
  const run = () => {
    box.replaceChildren(skeleton(lines));
    // Ошибка и загрузки, и отрисовки — экран ошибки с «Повторить», а не вечный скелет
    Promise.resolve().then(load).then(render).then(
      (node) => box.replaceChildren(node),
      (error) => {
        console.error(error);
        if (error instanceof ApiError && error.status === 402) return box.replaceChildren(premiumGate());
        box.replaceChildren(h('div', { class: 'error-box' }, h('div', null, errorText(error)),
          h('button', { class: 'btn secondary', onclick: run }, t('core_retry'))));
      });
  };
  run();
  return box;
}

// Действие с сервером: вибро, ошибка — тостом (402 — переход к премиуму). → результат или undefined
export async function act(fn, { success = null } = {}) {
  try {
    const result = await fn();
    haptic.success();
    if (success) toast(success);
    return result;
  } catch (error) {
    haptic.error();
    if (error instanceof ApiError && error.status === 402) { navigate('/premium'); return undefined; }
    toast(errorText(error));
    return undefined;
  }
}

// Подтверждение удаления нативным диалогом
export async function confirmDelete(text = t('core_confirm_delete')) {
  haptic.warn();
  return confirm(text);
}
