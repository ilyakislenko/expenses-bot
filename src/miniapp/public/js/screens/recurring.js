// Регулярные траты: /recurring — список с датой следующей записи и итогом в месяц; /recurring/new, /recurring/:id —
// форма (сумма, валюта, название, число, категория, семейный), «Уже оплатил» и отмена, предупреждение о списании,
// удаление с «Вернуть». Бот: recurring_menu, rc|, recurring_add, recurring_category|, recurring_delete|, rpa|, rpx|,
// rcf|, plwr|.
import { h, page, section, row, avatar, icon, empty, amountInput, field, toggle, toast, async as load, act } from '../core/ui.js';
import { t, money, moneyRound, dayLabel, shortDate } from '../core/i18n.js';
import { route, navigate, back, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { mainButton } from '../core/tg.js';
import { slot, alive, amountText, chooseCurrency, chooseDay, chooseCategory } from './income-common.js';

// ---------- Дата следующей записи (как RecurringExpenseService.nextChargeDate) ----------

const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const parts = (date) => date.split('-').map(Number);
const clampDay = (y, m, day) => Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate());
function addMonth(y, m) { return m === 12 ? [y + 1, 1] : [y, m + 1]; }

function nextChargeDate(day, lastChargedMonth, todayDate) {
  const [y, m, d] = parts(todayDate);
  const thisMonth = ymd(y, m, 1);
  if (!lastChargedMonth || lastChargedMonth < thisMonth) {
    const due = clampDay(y, m, day);
    return due >= d ? ymd(y, m, due) : todayDate;
  }
  const [by, bm] = parts(lastChargedMonth > thisMonth ? lastChargedMonth : thisMonth);
  const [ny, nm] = addMonth(by, bm);
  return ymd(ny, nm, clampDay(ny, nm, day));
}

// Что будет после сохранения: { now — трата за этот месяц запишется сразу, next — следующая запись }. Новая — как
// при создании в боте (число прошло — с следующего месяца, сегодня — сразу); правка — RecurringExpenseService.update
function preview(day, item, todayDate) {
  const [y, m, d] = parts(todayDate);
  const thisMonth = ymd(y, m, 1);
  const due = clampDay(y, m, day);
  if (!item) {
    if (due === d) return { now: true, next: nextChargeDate(day, thisMonth, todayDate) };
    return { now: false, next: nextChargeDate(day, due < d ? thisMonth : null, todayDate) };
  }
  if (!item.recordedThisMonth && due <= d) return { now: true, next: nextChargeDate(day, thisMonth, todayDate) };
  return { now: false, next: nextChargeDate(day, item.lastChargedMonth, todayDate) };
}

// ---------- Список ----------

function itemRow(item, family) {
  return row({
    avatar: avatar(item.category ? item.category.icon : 'repeat'),
    title: item.description,
    subtitle: [
      family && item.isFamily ? icon('users') : null,
      item.subscription ? icon('bell') : null,
      dayLabel(item.nextChargeDate)
    ],
    value: money(item.amount, item.currency),
    onClick: () => navigate(`/recurring/${item.id}`),
    chevron: false
  });
}

function listScreen(ctx) {
  ctx.onChange('recurring', ctx.refresh);
  let data = null;
  mainButton.push({
    text: t('inc_rec_add'),
    onClick: () => (data && data.count >= data.max ? toast(t('inc_rec_limit', { max: data.max })) : navigate('/recurring/new'))
  });
  return page({ title: t('inc_rec_title') }, load(() => api.get('/recurring'), (loaded) => {
    data = loaded;
    if (!data.items.length) return empty({ icon: 'repeat', title: t('inc_rec_empty'), text: t('inc_rec_empty_text') });
    return h('div', null,
      h('div', { class: 'hero' },
        h('div', { class: 'hero-label' }, t('inc_rec_monthly')),
        h('div', { class: 'hero-value' }, moneyRound(data.monthly, data.currency))),
      section({}, data.items.map(item => itemRow(item, data.family))));
  }));
}

// ---------- Форма ----------

function alertText(alert) {
  const days = t(`inc_days_${alert.days}`);
  switch (alert.state) {
    case 'on': return t('inc_rec_alert_on', { days });
    case 'disabled': return t('inc_rec_alert_disabled');
    case 'locked': return t('inc_rec_alert_locked', { count: alert.lockedCount });
    case 'muted': return t('inc_rec_alert_muted');
    case 'cancelling': return t('inc_rec_alert_cancelling');
    default: return t('inc_rec_alert_off', { days });
  }
}

// Пояснение под строкой с переключателем — целиком, в несколько строк (обычно подзаголовок строки обрезается)
function wrapSubtitle(el) {
  const subtitle = el.querySelector('.row-subtitle');
  if (subtitle) subtitle.style.whiteSpace = 'normal';
  return el;
}

function form({ item = null, alert = null, options, isOpen }) {
  const todayDate = options.today;
  const state = {
    amount: item ? item.amount : null,
    currency: item ? item.currency : options.currency,
    description: item ? item.description : '',
    dayOfMonth: item ? item.dayOfMonth : Number(todayDate.slice(8)),
    categoryId: item && item.category ? item.category.id : null,
    isFamily: item ? item.isFamily : options.familyDefault,
    alert,
    paid: null // { expenseId, month, amount, currency, nextChargeDate } после «Уже оплатил»
  };
  // Категория регулярной могла быть удалена — тогда в форме её нет, выбрать заново
  if (state.categoryId !== null && !options.categories.some(c => c.id === state.categoryId)) state.categoryId = null;
  let button = null;
  const valid = () => !!state.amount && !!state.description.trim() && state.categoryId !== null;
  const refreshButton = () => button && button.update({ enabled: valid() });

  const amount = amountInput({
    value: amountText(state.amount),
    currency: state.currency,
    autofocus: !item,
    onInput: (value) => { state.amount = value; refreshButton(); },
    onCurrency: async () => {
      const code = await chooseCurrency(t('inc_currency'), state.currency);
      if (code) { state.currency = code; amount.setCurrency(code); }
    }
  });

  const nameField = field({
    label: t('inc_rec_name'), placeholder: t('inc_rec_name_hint'), value: state.description, maxlength: options.descriptionMax,
    onInput: (value) => { state.description = value; refreshButton(); }
  });

  // Семейный / личный: у новой — до сохранения, у записанной — сразу (как кнопка rcf| в боте)
  const familyRow = slot(() => (options.family ? wrapSubtitle(row({
    title: t('inc_rec_family'),
    subtitle: t(state.isFamily ? 'inc_rec_family_on' : 'inc_rec_family_off'),
    trailing: toggle(state.isFamily, async (value) => {
      if (!item) { state.isFamily = value; return familyRow.update(); }
      const result = await act(() => api.put(`/recurring/${item.id}/family`, { family: value }));
      if (result) { state.isFamily = result.isFamily; changed('recurring'); changed('expenses'); }
      familyRow.update();
    })
  })) : null));

  // Название, число, категория, семейный; снизу — когда будет запись (меняется вместе с числом)
  const schedule = slot(() => {
    const category = options.categories.find(c => c.id === state.categoryId);
    const next = preview(state.dayOfMonth, item, todayDate);
    const footer = next.now ? t('inc_rec_now', { date: dayLabel(next.next) })
      : t(item ? 'inc_rec_next' : 'inc_rec_first', { date: dayLabel(next.next) });
    return section({ footer },
      nameField,
      row({
        title: t('inc_rec_day'),
        value: t('inc_rec_day_value', { day: state.dayOfMonth }),
        onClick: async () => {
          const day = await chooseDay(t('inc_rec_day'), state.dayOfMonth);
          if (day) { state.dayOfMonth = day; schedule.update(); }
        }
      }),
      row({
        title: t('inc_rec_category'),
        value: category ? `${category.icon} ${category.label}` : t('inc_rec_choose'),
        valueTone: category ? null : 'hint',
        onClick: async () => {
          const id = await chooseCategory(t('inc_rec_category'), options.categories, state.categoryId);
          if (id !== null) { state.categoryId = id; schedule.update(); refreshButton(); }
        }
      }),
      familyRow.el);
  });

  // «Уже оплатил (списание DD.MM)» → «Отменить оплату», предупреждение о списании
  const actions = slot(() => {
    if (!item) return h('div');
    const payRow = state.paid
      ? row({
        title: t('inc_rec_pay_undo'),
        subtitle: t('inc_rec_paid_line', { amount: money(state.paid.amount, state.paid.currency), date: dayLabel(state.paid.nextChargeDate) }),
        tone: 'accent',
        chevron: false,
        onClick: async () => {
          const result = await act(() => api.post(`/recurring/${item.id}/pay/undo`, { month: state.paid.month, expenseId: state.paid.expenseId }), { success: t('inc_rec_pay_undone') });
          if (!result) return;
          if (result.item) Object.assign(item, { nextChargeDate: result.item.nextChargeDate, lastChargedMonth: result.item.lastChargedMonth, recordedThisMonth: result.item.recordedThisMonth });
          state.paid = null;
          changed('expenses'); changed('recurring');
          actions.update();
          schedule.update();
        }
      })
      : row({
        title: t('inc_rec_pay'),
        subtitle: t('inc_rec_pay_line', { date: shortDate(item.nextChargeDate) }),
        tone: 'accent',
        chevron: false,
        onClick: async () => {
          const result = await act(() => api.post(`/recurring/${item.id}/pay`, { month: `${item.nextChargeDate.slice(0, 7)}-01` }));
          if (!result) return;
          state.paid = result;
          item.nextChargeDate = result.nextChargeDate;
          item.lastChargedMonth = result.month;
          item.recordedThisMonth = true;
          toast(result.warnings[0] || t('inc_rec_paid'));
          changed('expenses'); changed('recurring');
          actions.update();
          schedule.update();
        }
      });
    const alertRow = state.alert ? wrapSubtitle(row({
      title: t('inc_rec_alert'),
      subtitle: alertText(state.alert),
      trailing: toggle(state.alert.on, async () => {
        const result = await act(() => api.post(`/recurring/${item.id}/alert`));
        if (result) { state.alert = result.alert; changed('recurring'); }
        actions.update();
      })
    })) : null;
    return section({}, payRow, alertRow);
  });

  async function save() {
    if (!valid() || !button) return;
    button.busy(true);
    const body = {
      amount: state.amount, currency: state.currency, description: state.description, dayOfMonth: state.dayOfMonth, categoryId: state.categoryId
    };
    if (!item && options.family) body.isFamily = state.isFamily;
    const result = await act(() => (item ? api.put(`/recurring/${item.id}`, body) : api.post('/recurring', body)));
    button.busy(false);
    if (!result) return;
    changed('recurring');
    if (result.chargedNow) changed('expenses');
    back();
    const done = item ? t('core_saved') : t('inc_rec_created');
    toast(result.warnings[0] || (result.chargedNow ? t('inc_rec_charged_now') : done));
  }

  // Удаление без вопроса: тост с «Вернуть» восстанавливает ту же регулярную (с отметкой записанного месяца)
  async function remove() {
    if (!(await act(() => api.del(`/recurring/${item.id}`)))) return;
    changed('recurring');
    back();
    toast(t('inc_rec_deleted'), {
      action: { text: t('core_undo'), onClick: async () => { if (await act(() => api.post(`/recurring/${item.id}/restore`))) changed('recurring'); } }
    });
  }

  if (isOpen()) button = mainButton.push({ text: t('core_save'), onClick: save, enabled: valid() });
  return h('div', null,
    amount,
    schedule.el,
    actions.el,
    item ? section({}, row({ title: t('inc_rec_delete'), tone: 'danger', onClick: remove, chevron: false })) : null);
}

export function register() {
  route('/recurring', listScreen, { tab: 'plans' });
  route('/recurring/new', (ctx) => {
    const isOpen = alive(ctx);
    return page({ title: t('inc_rec_new_title') }, load(() => api.get('/recurring/defaults'), (data) => {
      if (data.count >= data.options.max) return empty({ icon: 'repeat', title: t('inc_rec_limit', { max: data.options.max }) });
      return form({ options: data.options, isOpen });
    }));
  }, { tab: 'plans', tabs: false });
  route('/recurring/:id', (ctx) => {
    const isOpen = alive(ctx);
    return page({ title: t('inc_rec_edit_title') }, load(() => api.get(`/recurring/${encodeURIComponent(ctx.params.id)}`),
      (data) => form({ item: data.item, alert: data.alert, options: data.options, isOpen })));
  }, { tab: 'plans', tabs: false });
}
