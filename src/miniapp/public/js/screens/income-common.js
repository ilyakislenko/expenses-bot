// Общее для экранов доходов и регулярных трат: выбор валюты, дня, числа месяца, категории (шторки), перерисовка
// части экрана. Не экран — в main.js его нет.
import { h, row, section, sheet, pick, avatar, icon } from '../core/ui.js';
import { t, me, dayLabel, addDays } from '../core/i18n.js';
import { haptic } from '../core/tg.js';

// Часть экрана, которую можно перерисовать: slot(() => узел) → { el, update() }
export function slot(build) {
  let el = build();
  return {
    get el() { return el; },
    update() { const next = build(); el.replaceWith(next); el = next; }
  };
}

// Экран ещё открыт (данные пришли после ухода — свою главную кнопку не ставим)
export function alive(ctx) {
  let open = true;
  ctx.onLeave(() => { open = false; });
  return () => open;
}

// Сумма для поля ввода: дробь — запятой там, где так пишут (units.comma из /api/me); пусто — ''
export function amountText(amount) {
  if (amount === null || amount === undefined) return '';
  return me().units.comma ? String(amount).replace('.', ',') : String(amount);
}

// Валюта из списка бота → код или null
export function chooseCurrency(title, value) {
  return pick({ title, value, options: me().currencies.map(code => ({ value: code, label: code })) });
}

// День записи: сегодня, вчера, позавчера или любой другой не в будущем и не старше года (как «📅 Дата» в боте)
export function chooseDate(title, value, todayDate) {
  return new Promise((resolve) => {
    let chosen = null;
    const quick = [0, -1, -2].map(shift => addDays(todayDate, shift));
    sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => {
        const choose = (date) => { chosen = date; close(); };
        const input = h('input', {
          type: 'date', min: addDays(todayDate, -365), max: todayDate, value: quick.includes(value) ? '' : value,
          style: { textAlign: 'right' },
          onchange: (e) => { if (e.target.value && e.target.value <= todayDate && e.target.value >= addDays(todayDate, -365)) choose(e.target.value); }
        });
        return section({},
          quick.map(date => row({
            title: dayLabel(date),
            trailing: date === value ? icon('check', { cls: 'row-chevron' }) : null,
            chevron: false,
            onClick: () => choose(date)
          })),
          h('label', { class: 'field' }, h('span', { style: { flex: 1 } }, t('inc_date_other')), input));
      }
    });
  });
}

// Число месяца 1–31 сеткой
export function chooseDay(title, value) {
  return new Promise((resolve) => {
    let chosen = null;
    sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => h('div', null,
        h('div', { class: 'section-body' },
          h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(7, 1fr)' } },
            Array.from({ length: 31 }, (_, i) => i + 1).map(day => h('button', {
              class: `tile${day === value ? ' on' : ''}`, style: { fontSize: '17px', padding: '10px 0' },
              onclick: () => { haptic.tap(); chosen = day; close(); }
            }, String(day))))),
        h('div', { class: 'section-footer' }, t('inc_rec_day_hint')))
    });
  });
}

// Категория плитками (как выбор категории у траты)
export function chooseCategory(title, categories, value) {
  return new Promise((resolve) => {
    let chosen = null;
    sheet({
      title,
      onClose: () => resolve(chosen),
      content: (close) => h('div', { class: 'section-body' },
        h('div', { class: 'grid' }, categories.map(c => h('button', {
          class: `tile${c.id === value ? ' on' : ''}`,
          onclick: () => { haptic.tap(); chosen = c.id; close(); }
        }, avatar(c.icon), h('span', null, c.label)))))
    });
  });
}
