// Помощники раздела «Ещё» (more, settings, family, premium, admin): оплата счётом Stars, копирование, подписи тарифов.
import { h, act, toast } from '../core/ui.js';
import { t, me, longDate, moneyRound, number } from '../core/i18n.js';
import { openInvoice, haptic, mainButton } from '../core/tg.js';
import { reloadMe } from '../core/session.js';
import { changed } from '../core/router.js';

// Экран раздела: подписи строк — пояснения в 1–2 строки, а не обрезанная строка (класс prof-wrap на корне экрана)
export function wrapped(render) {
  return (ctx) => {
    const node = render(ctx);
    node.classList.add('prof-wrap');
    return node;
  };
}

// Главная кнопка экрана, которую прячет шторка без своей кнопки: hide() при открытии, show() при закрытии
// (после ухода с экрана или перерисовки show() ничего не делает — у нового экрана своя кнопка)
export function screenButton(ctx, config) {
  let handle = null;
  let alive = true;
  ctx.onLeave(() => { alive = false; });
  const show = () => { if (alive && !handle) handle = mainButton.push(config); };
  const hide = () => { if (handle) { handle.remove(); handle = null; } };
  show();
  return { show, hide };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Бот начисляет премиум по successful_payment обычно через секунду: ждём новый срок в /api/me (до 6 с), затем
// сообщаем экранам
async function awaitPremium() {
  const before = me().premium.expiresAt;
  for (let i = 0; i < 6; i++) {
    await sleep(1000);
    const fresh = await reloadMe().catch(() => null);
    if (fresh && fresh.premium.expiresAt !== before) break;
  }
  changed('premium');
  changed('family');
}

// Счёт Telegram Stars: request() → { url } (тот же payload, что у бота; оплату засчитывает бот по successful_payment).
// premium: false — пожертвование, срок не меняется. → true, если оплачено (шторку можно закрывать сразу)
export async function payInvoice(request, { premium = true } = {}) {
  const data = await act(request);
  if (!data || !data.url) return false;
  const status = await openInvoice(data.url);
  if (status === 'paid') {
    haptic.success();
    toast(t(premium ? 'prof_paid' : 'prof_donate_thanks'));
    if (premium) awaitPremium();
    return true;
  }
  if (status === 'failed') { haptic.error(); toast(t('prof_pay_failed')); }
  if (status === 'pending') toast(t('prof_pay_pending'));
  return false;
}

// Скопировать текст (в старых WebView нет clipboard API — через выделение)
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const area = h('textarea', { style: { position: 'fixed', opacity: '0' } });
    area.value = text;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) { /* нечем копировать */ }
    area.remove();
  }
  haptic.success();
  toast(t('prof_copied'));
}

export const tariffLabel = (duration) => t(`prof_tariff_${duration}`);
export const stars = (n) => `${number(n, 1)} ⭐`;
// Цена тарифа в основной валюте — без копеек, как ориентир (оплата — звёздами)
export const priceText = (amount, currency) => moneyRound(amount, currency);
export const dateText = (iso) => (iso ? longDate(isoToLocalYmd(iso)) : '—');

// ISO-момент → дата 'YYYY-MM-DD' в поясе пользователя
export function isoToLocalYmd(iso) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: me().timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
  const get = (type) => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Короткая дата и время в поясе пользователя: «3 нояб., 14:20»
export function dateTimeText(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(me().locale, { timeZone: me().timezone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export const hourLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

// Текст бота с Markdown (*жирный*, _курсив_) — абзацами, без разметки
export function botText(text) {
  return h('div', { class: 'prof-text' }, String(text || '').split('\n').map(line => {
    if (!line.trim()) return h('div', { class: 'prof-gap' });
    const bold = /^\*[^*]+\*$/.test(line.trim());
    const clean = line.replace(/\\([_*`[\]])/g, '$1').replace(/[*_]/g, '');
    return h('div', bold ? { class: 'prof-strong' } : null, clean);
  }));
}
