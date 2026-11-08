// Доходы: /income (?offset=) — доходы периода, итог, траты и остаток; /income/new, /income/:id — форма дохода.
// Бот: income_menu, in|, ie|, it|, income_delete|, income_undo|, income_currency.
import { h, page, section, row, avatar, stats, stepper, empty, amountInput, field, segmented, toast, async as load, act } from '../core/ui.js';
import { t, money, moneyRound, compact, dayLabel, periodLabel, today } from '../core/i18n.js';
import { route, navigate, back, changed } from '../core/router.js';
import { api, qs } from '../core/api.js';
import { mainButton } from '../core/tg.js';
import { slot, alive, amountText, chooseCurrency, chooseDate } from './income-common.js';

const SOURCE_KEYS = { bank: 'inc_source_bank', import: 'inc_source_import' };

function incomeRow(income) {
  return row({
    avatar: avatar('income', { color: 'var(--good)' }),
    title: income.description || t('inc_income'),
    subtitle: [dayLabel(income.date), income.source ? t(SOURCE_KEYS[income.source]) : null].filter(Boolean).join(' · '),
    value: money(income.amount, income.currency),
    onClick: () => navigate(`/income/${income.id}`),
    chevron: false
  });
}

// Сумма в плитке: от миллиона — «1,53 млн ₽», иначе не влезает в треть экрана
function tileMoney(amount, currency, { signed = false } = {}) {
  const abs = Math.abs(amount);
  const sign = signed && amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}${abs >= 1e6 ? compact(abs) : moneyRound(abs, currency)}`;
}

function list(data, offset, ctx) {
  const tiles = stats([
    { label: t('inc_income'), value: tileMoney(data.total, data.currency) },
    { label: t('inc_spent'), value: tileMoney(data.spent, data.currency) },
    // Остаток — только когда доходы есть (как в боте)
    data.count ? { label: t('inc_balance'), value: tileMoney(data.balance, data.currency, { signed: true }), tone: data.balance >= 0 ? 'good' : 'bad' } : null
  ]);
  // Три суммы в одну строку и на узком экране (360 px): плитки чуть плотнее обычных
  tiles.style.gridTemplateColumns = `repeat(${data.count ? 3 : 2}, minmax(0, 1fr))`;
  for (const tile of tiles.children) {
    tile.style.padding = '12px 10px';
    tile.querySelector('.stat-value').style.fontSize = '17px';
  }
  const foreign = data.byCurrency.some(c => c.currency !== data.currency);
  const changeCurrency = async () => {
    const code = await chooseCurrency(t('inc_currency_row'), data.incomeCurrency);
    if (!code || code === data.incomeCurrency) return;
    if (await act(() => api.put('/income/currency', { currency: code }), { success: t('inc_currency_set', { currency: code }) })) ctx.refresh();
  };
  return h('div', null,
    stepper(periodLabel(data.period), {
      onPrev: () => navigate(`/income${qs({ offset: offset - 1 })}`, { replace: true }),
      onNext: () => navigate(`/income${qs({ offset: offset + 1 || null })}`, { replace: true }),
      canNext: offset < 0
    }),
    data.count || data.spent ? tiles : null,
    data.items.length
      ? section({ footer: foreign ? data.byCurrency.map(c => money(c.total, c.currency)).join(' + ') : null }, data.items.map(incomeRow))
      : empty({ icon: 'income', title: t('inc_empty') }),
    section({}, row({ title: t('inc_currency_row'), value: data.incomeCurrency, onClick: changeCurrency })));
}

function listScreen(ctx) {
  const offset = Math.max(-120, Math.min(0, Math.trunc(Number(ctx.query.offset) || 0)));
  ctx.onChange('income', ctx.refresh);
  ctx.onChange('expenses', ctx.refresh);
  mainButton.push({ text: t('inc_add'), onClick: () => navigate('/income/new') });
  return page({ title: t('inc_title') }, load(() => api.get(`/income${qs({ offset: offset || null })}`), (data) => list(data, offset, ctx)));
}

// Форма: сумма и валюта, описание, день; у записанного — отметка выписки и удаление с «Вернуть»
function form({ income = null, defaults, isOpen }) {
  const todayDate = defaults.today || today();
  const state = {
    amount: income ? income.amount : null,
    currency: income ? income.currency : defaults.currency,
    description: income ? income.description || '' : '',
    date: income ? income.date : todayDate
  };
  let button = null;
  const refreshButton = () => button && button.update({ enabled: !!state.amount });

  const amount = amountInput({
    value: amountText(state.amount),
    currency: state.currency,
    autofocus: !income,
    onInput: (value) => { state.amount = value; refreshButton(); },
    onCurrency: async () => {
      const code = await chooseCurrency(t('inc_currency'), state.currency);
      if (code) { state.currency = code; amount.setCurrency(code); }
    }
  });
  const dateRow = slot(() => row({
    title: t('inc_date'),
    value: dayLabel(state.date),
    onClick: async () => {
      const date = await chooseDate(t('inc_date'), state.date, todayDate);
      if (date) { state.date = date; dateRow.update(); }
    }
  }));

  async function save() {
    if (!state.amount || !button) return;
    button.busy(true);
    const body = { amount: state.amount, currency: state.currency, description: state.description, date: state.date };
    const result = await act(() => (income ? api.put(`/income/${income.id}`, body) : api.post('/income', body)));
    button.busy(false);
    if (!result) return;
    changed('income');
    back();
    if (income) return toast(t('core_saved'));
    const id = result.income.id;
    toast(result.note ? `${t('inc_added')}. ${result.note.split('\n')[0]}` : t('inc_added'), {
      action: { text: t('core_undo'), onClick: async () => { if (await act(() => api.del(`/income/${id}`))) changed('income'); } }
    });
  }

  // Удаление без вопроса: тост с «Вернуть» восстанавливает ту же запись
  async function remove() {
    if (!(await act(() => api.del(`/income/${income.id}`)))) return;
    changed('income');
    back();
    toast(t('core_deleted'), {
      action: { text: t('core_undo'), onClick: async () => { if (await act(() => api.post(`/income/${income.id}/restore`))) changed('income'); } }
    });
  }

  if (isOpen()) button = mainButton.push({ text: t('core_save'), onClick: save, enabled: !!state.amount });
  return h('div', null,
    income ? null : segmented([
      { value: 'expense', label: t('inc_kind_expense') },
      { value: 'income', label: t('inc_kind_income') }
    ], 'income', () => navigate('/add', { replace: true })),
    amount,
    section({ footer: income && income.source ? t(SOURCE_KEYS[income.source]) : null },
      field({
        label: t('inc_description'), placeholder: t('inc_description_hint'), value: state.description, maxlength: defaults.descriptionMax,
        onInput: (value) => { state.description = value; }
      }),
      dateRow.el),
    income ? section({}, row({ title: t('inc_delete'), tone: 'danger', onClick: remove, chevron: false })) : null);
}

export function register() {
  route('/income', listScreen, { tab: 'overview' });
  route('/income/new', (ctx) => {
    const isOpen = alive(ctx);
    return page({ title: t('inc_new_title') }, load(() => api.get('/income/defaults'), (defaults) => form({ defaults, isOpen })));
  }, { tab: 'overview', tabs: false });
  route('/income/:id', (ctx) => {
    const isOpen = alive(ctx);
    return page({ title: t('inc_edit_title') },
      load(() => api.get(`/income/${encodeURIComponent(ctx.params.id)}`), (data) => form({ income: data.income, defaults: data, isOpen })));
  }, { tab: 'overview', tabs: false });
}
