// Форма траты (#/add?date=): сумма и валюта, категории сеткой (частые первыми, по описанию — запомненная, как в боте),
// описание с тегами, дата, «в семью» (по умолчанию — режим «все траты в семью»). Другие способы: фото чека, голос,
// несколько записей одной строкой. «Доход» вверху — форма дохода.
import { route, navigate, changed } from '../core/router.js';
import { h, section, row, avatar, segmented, toggle, amountInput, async, pick, act, toast } from '../core/ui.js';
import { t, me, money, dayLabel, addDays, today } from '../core/i18n.js';
import { api, qs } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';
import { resultToast, pickDay, chooseReceiptPhoto, quickEntrySheet, recordVoice } from './expenses-ui.js';

const VISIBLE_TILES = 7; // восьмая плитка — «Ещё»

function form(ctx, data) {
  const now = today();
  const state = {
    amount: null,
    currency: me().currency,
    categoryId: null,
    manualCategory: false,
    description: '',
    date: ctx.query.date && ctx.query.date <= now && ctx.query.date >= addDays(now, -365) ? ctx.query.date : now,
    family: data.familyDefault,
    voice: false,
    expanded: false
  };
  let suggestTimer = null;
  let suggestSeq = 0;

  const button = mainButton.push({ text: t('ex_save'), enabled: false, onClick: save });
  function refreshButton() {
    const ready = state.amount !== null && state.categoryId !== null;
    button.update({ text: state.amount !== null && state.categoryId === null ? t('ex_choose_category') : t('ex_save'), enabled: ready });
  }

  const amount = amountInput({
    currency: state.currency,
    onInput: (value) => { state.amount = value; refreshButton(); },
    onCurrency: async () => {
      const codes = [me().currency, ...me().currencies.filter(c => c !== me().currency)];
      const chosen = await pick({ title: t('ex_currency'), value: state.currency, options: codes.map(c => ({ value: c, label: c })) });
      if (chosen) { state.currency = chosen; amount.setCurrency(chosen); }
    }
  });

  const grid = h('div', { class: 'grid' });
  function paintGrid() {
    // До восьми категорий — все сразу; больше — частые семь и «Ещё»
    const collapsible = data.categories.length > VISIBLE_TILES + 1;
    const selectedIndex = data.categories.findIndex(c => c.id === state.categoryId);
    if (selectedIndex >= VISIBLE_TILES) state.expanded = true;
    const open = !collapsible || state.expanded;
    const shown = open ? data.categories : data.categories.slice(0, VISIBLE_TILES);
    const tiles = shown.map(c => h('button', {
      class: `tile${c.id === state.categoryId ? ' on' : ''}`,
      onclick: () => { haptic.tap(); state.categoryId = c.id; state.manualCategory = true; paintGrid(); refreshButton(); }
    }, avatar(c.icon), h('span', null, c.label)));
    if (collapsible) {
      tiles.push(h('button', { class: 'tile', onclick: () => { haptic.tap(); state.expanded = !state.expanded; paintGrid(); } },
        avatar(state.expanded ? 'chevron-down' : 'more'), h('span', null, state.expanded ? t('ex_less') : t('ex_more'))));
    }
    if (open && me().premium.active) {
      tiles.push(h('button', { class: 'tile', onclick: () => { haptic.tap(); navigate('/categories'); } }, avatar('settings'), h('span', null, t('ex_own_categories'))));
    }
    grid.replaceChildren(...tiles);
  }

  // Категория по описанию — та, куда в прошлый раз записывалась трата с таким описанием (если её не выбрали руками)
  function suggest() {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(async () => {
      if (state.manualCategory) return;
      const mine = ++suggestSeq;
      const text = state.description.trim();
      if (!text) return;
      try {
        const { categoryId } = await api.get(`/expenses/suggest${qs({ description: text })}`);
        if (mine !== suggestSeq || state.manualCategory || !categoryId) return;
        state.categoryId = categoryId;
        paintGrid();
        refreshButton();
      } catch (error) { /* подсказка не обязательна */ }
    }, 400);
  }

  const description = h('input', {
    type: 'text', placeholder: t('ex_description_placeholder'), maxlength: data.maxDescription, enterkeyhint: 'done',
    oninput: (e) => { state.description = e.target.value; suggest(); },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); }
  });
  const descriptionField = h('div', { class: 'field' }, h('label', null, t('ex_description')), description);

  const dateRowNode = () => row({
    title: t('ex_date'), value: dayLabel(state.date),
    onClick: async () => { const d = await pickDay({ current: state.date }); if (d) { state.date = d; paintDate(); } }
  });
  let dateRow = dateRowNode();
  function paintDate() {
    const next = dateRowNode();
    dateRow.replaceWith(next);
    dateRow = next;
  }

  // Одна трата из строки или голоса — в форму: категорию выбирают здесь, как в боте
  function fill(entry) {
    state.amount = entry.amount;
    state.currency = entry.currency;
    state.description = entry.description || '';
    state.voice = !!entry.voice;
    state.categoryId = entry.guessed ? null : entry.category.id;
    state.manualCategory = !entry.guessed;
    amount.input.value = String(entry.amount);
    amount.setCurrency(entry.currency);
    description.value = state.description;
    paintGrid();
    refreshButton();
  }

  async function save() {
    if (state.amount === null || state.categoryId === null) return;
    button.busy(true);
    const result = await act(() => api.post('/expenses', {
      amount: state.amount, currency: state.currency, description: state.description.trim() || null,
      categoryId: state.categoryId, date: state.date, family: data.canFamily ? state.family : undefined, voice: state.voice || undefined
    }));
    button.busy(false);
    if (!result) return;
    changed('expenses');
    const e = result.expense;
    navigate(`/today${qs({ date: e.date === now ? null : e.date })}`, { replace: true });
    resultToast(t('ex_added', { amount: money(e.amount, e.currency) }), result.notes, {
      text: t('ex_cancel_record'),
      onClick: async () => { if (await act(() => api.del(`/expenses/${e.id}`))) { changed('expenses'); toast(t('ex_record_cancelled')); } }
    });
  }

  paintGrid();
  const ways = [
    data.receipts ? row({ avatar: avatar('camera'), title: t('ex_way_receipt'), onClick: () => chooseReceiptPhoto() }) : null,
    data.voice ? row({ avatar: avatar('mic'), title: t('ex_way_voice'), onClick: () => recordVoice({ onFill: fill }) }) : null,
    row({ avatar: avatar('edit'), title: t('ex_way_quick'), onClick: () => quickEntrySheet({ onFill: fill }) })
  ];
  return h('div', null,
    amount,
    section({}, grid),
    section({}, descriptionField, dateRow,
      data.canFamily ? row({ title: t('ex_family_toggle'), trailing: toggle(state.family, (v) => { state.family = v; }) }) : null),
    section({}, ways));
}

function render(ctx) {
  return h('div', { class: 'page ex-add' },
    h('div', { class: 'ex-kind' }, segmented([{ value: 'expense', label: t('ex_kind_expense') }, { value: 'income', label: t('ex_kind_income') }], 'expense',
      (v) => { if (v === 'income') navigate('/income/new', { replace: true }); })),
    async(() => api.get('/expenses/form'), (data) => form(ctx, data)));
}

export function register() {
  route('/add', render, { tab: 'today', tabs: false });
}

