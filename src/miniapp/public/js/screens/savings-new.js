// /savings/new?kind=account|goal|debt — что добавить: счёт (название, валюта, сколько сейчас, ставка), цель (сумма,
// название, срок, своя копилка), долг (сумма, валюта, название, ставка, платёж, число платежа). Лимиты — как в боте.
import { h, page, section, row, field, amountInput, segmented, toggle, empty, async, act, pick } from '../core/ui.js';
import { route, navigate, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { t, me, addDays } from '../core/i18n.js';
import { mainButton, haptic } from '../core/tg.js';
import { parseNumber, parseRate, report } from './savings-common.js';

const KINDS = ['account', 'goal', 'debt'];

export function registerNew() {
  route('/savings/new', (ctx) => {
    const kind = KINDS.includes(ctx.query.kind) ? ctx.query.kind : 'account';
    return async(() => api.get('/savings'), (data) => render(kind, data));
  }, { tab: 'savings', tabs: false });
}

function render(kind, data) {
  const switcher = segmented(KINDS.map(k => ({ value: k, label: t(`sav_kind_${k}`) })), kind,
    (value) => navigate(`/savings/new?kind=${value}`, { replace: true }));
  const limit = data.limits[kind === 'account' ? 'accounts' : kind === 'goal' ? 'goals' : 'debts'];
  let body;
  if (limit.count >= limit.max) {
    body = kind === 'goal' && !data.limits.premium ? premiumLimit(limit.max)
      : empty({ icon: 'info', title: t('sav_limit_title'), text: t(`sav_limit_${kind}`, { limit: limit.max }) });
  } else if (kind === 'account') body = accountForm(data);
  else if (kind === 'goal') body = goalForm(data);
  else body = debtForm(data);
  return page({ title: t('sav_add_title') }, switcher, body);
}

// Бесплатно — одна цель: предложение премиума (как showGoalLimit в боте)
function premiumLimit(max) {
  return empty({ icon: 'star', title: t('sav_goal_limit_title'), text: t('sav_goal_limit_free', { limit: max }), action: { text: t('core_premium_button'), onClick: () => navigate('/premium') } });
}

function submitButton(text, collect, send) {
  const button = mainButton.push({
    text,
    onClick: async () => {
      const body = collect();
      if (!body) { haptic.error(); return; }
      button.busy(true);
      const result = await act(() => send(body));
      button.busy(false);
      if (!result) return;
      changed('savings');
      report(t('sav_added'), result);
      navigate(`/savings/pot/${result.id}`, { replace: true });
    }
  });
}

function currencyRow(get, set) {
  const el = row({
    title: t('sav_currency'), value: get(),
    onClick: async () => {
      const code = await pick({ title: t('sav_currency'), value: get(), options: me().currencies.map(c => ({ value: c, label: c })) });
      if (code) { set(code); el.querySelector('.row-value').textContent = code; }
    }
  });
  return el;
}

function accountForm(data) {
  const form = { name: '', currency: data.currency, balance: '', rate: '' };
  const nameField = field({ label: t('sav_name'), placeholder: t('sav_account_placeholder'), onInput: (v) => { form.name = v; }, autofocus: true, maxlength: 60 });
  submitButton(t('sav_add_button'), () => {
    const balance = form.balance.trim() ? parseNumber(form.balance) : 0;
    const yieldRate = form.rate.trim() ? parseRate(300)(form.rate) : null;
    if (!form.name.trim() || balance === null || balance < 0 || yieldRate === undefined) return null;
    return { name: form.name.trim(), currency: form.currency, balance, yieldRate };
  }, (body) => api.post('/savings/accounts', body));
  return h('div', null,
    section({ footer: t('sav_kind_account_hint') },
      nameField,
      currencyRow(() => form.currency, (c) => { form.currency = c; }),
      field({ label: t('sav_balance_now'), placeholder: '0', inputmode: 'decimal', onInput: (v) => { form.balance = v; } })),
    section({ footer: t('sav_rate_new_hint') },
      field({ label: t('sav_rate_percent'), placeholder: t('sav_rate_as_settings'), inputmode: 'decimal', onInput: (v) => { form.rate = v; } })));
}

function goalForm(data) {
  const form = { target: null, name: '', date: '', own: false };
  submitButton(t('sav_add_button'), () => {
    if (!form.target || !form.name.trim()) return null;
    if (form.date && form.date <= data.today) return null;
    return { target: form.target, name: form.name.trim(), targetDate: form.date || null, mode: form.own ? 'own' : 'total' };
  }, (body) => api.post('/savings/goals', body));
  const dateField = field({ label: t('sav_deadline'), type: 'date', onInput: (v) => { form.date = v; } });
  dateField.input.min = addDays(data.today, 1);
  return h('div', null,
    amountInput({ currency: data.currency, onInput: (n) => { form.target = n; } }),
    h('div', { class: 'sav-sheet-hint' }, t('sav_goal_target')),
    section({ footer: t('sav_kind_goal_hint') },
      field({ label: t('sav_name'), placeholder: t('sav_goal_placeholder'), onInput: (v) => { form.name = v; }, maxlength: 60 }),
      dateField),
    section({ footer: t('sav_mode_hint') },
      row({ title: t('sav_own_pot'), trailing: toggle(false, (checked) => { form.own = checked; }) })));
}

function debtForm(data) {
  const form = { amount: null, currency: data.currency, name: '', rate: '', payment: '', day: '' };
  let input;
  input = amountInput({
    currency: data.currency, onInput: (n) => { form.amount = n; },
    onCurrency: async () => {
      const code = await pick({ title: t('sav_currency'), value: form.currency, options: me().currencies.map(c => ({ value: c, label: c })) });
      if (code) { form.currency = code; input.setCurrency(code); }
    }
  });
  submitButton(t('sav_add_button'), () => {
    const rate = form.rate.trim() ? parseRate(300)(form.rate) : 0;
    const payment = form.payment.trim() ? parseNumber(form.payment) : 0;
    const day = form.day.trim() ? parseNumber(form.day) : null;
    if (!form.amount || !form.name.trim() || rate === undefined || payment === null || payment < 0) return null;
    if (day !== null && !(Number.isInteger(day) && day >= 1 && day <= 31)) return null;
    return { amount: form.amount, currency: form.currency, name: form.name.trim(), rate: rate || null, monthlyPayment: payment || null, dueDay: day };
  }, (body) => api.post('/savings/debts', body));
  return h('div', null,
    input,
    h('div', { class: 'sav-sheet-hint' }, t('sav_debt_amount_label')),
    section({ footer: t('sav_kind_debt_hint') },
      field({ label: t('sav_name'), placeholder: t('sav_debt_placeholder'), onInput: (v) => { form.name = v; }, maxlength: 60 }),
      field({ label: t('sav_rate_percent'), placeholder: '0', inputmode: 'decimal', onInput: (v) => { form.rate = v; } }),
      field({ label: t('sav_debt_payment'), placeholder: t('sav_not_set'), inputmode: 'decimal', onInput: (v) => { form.payment = v; } }),
      field({ label: t('sav_debt_due_day'), placeholder: '1–31', inputmode: 'numeric', onInput: (v) => { form.day = v; } })));
}
