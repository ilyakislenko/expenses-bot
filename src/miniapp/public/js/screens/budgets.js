// Бюджеты (премиум; бот: «🎯 Бюджеты» — bg_menu, bg|, bg_cat, bg_add|, bg_del|): лимиты текущего периода — общий и по
// категориям, шкала с отметкой «сколько периода прошло», остаток или перерасход; в семье — общие семейные бюджеты.
import { route, navigate, back, changed } from '../core/router.js';
import { h, icon, page, section, row, avatar, async, act, empty, toast, pick, amountInput, confirmDelete } from '../core/ui.js';
import { t, moneyRound, me, periodLabel, percent } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';
import { budgetRow, budgetBar, budgetName, periodElapsed, exact } from './plans-ui.js';

function titleOf(family) {
  return family ? t('plan_budgets_family_title') : t('plan_budgets_title');
}

function saved(result) {
  changed('budgets');
  if (result && result.achievement) changed('achievements');
  toast(result && result.achievement ? result.achievement : t('plan_budget_saved'));
}

// ========================================
// СПИСОК
// ========================================

function renderList(data, setTitle) {
  setTitle(titleOf(data.family), periodLabel(data.period));
  mainButton.push({ text: t('plan_budget_new'), onClick: () => navigate('/budgets/new') });
  const out = [];
  if (data.items.length) {
    const elapsed = periodElapsed(data.period, me().today);
    const footer = [data.family ? t('plan_budgets_family_hint') : null, t('plan_budget_tick_note')].filter(Boolean).join(' ');
    out.push(section({ footer }, data.items.map(b => budgetRow(b, { elapsed, onClick: () => navigate(`/budgets/${b.id}`) }))));
  } else {
    out.push(empty({ icon: 'target', title: t('plan_budgets_empty_title'), text: t('plan_budgets_empty_text') }));
    if (data.family) out.push(h('div', { class: 'section-footer plan-note' }, t('plan_budgets_family_hint')));
  }
  return h('div', null, out);
}

// ========================================
// НОВЫЙ БЮДЖЕТ
// ========================================

function renderNew(data, query) {
  const state = {
    target: query.target === 'total' ? 'total' : query.target ? Number(query.target) : null,
    amount: null,
    currency: me().currency
  };
  if (state.target !== 'total' && !data.categories.some(c => c.id === state.target)) state.target = null;
  const totalBudget = data.items.find(b => b.total);
  const existing = () => {
    if (state.target === 'total') return totalBudget || null;
    const category = data.categories.find(c => c.id === state.target);
    return category && category.budgetId ? data.items.find(b => b.id === category.budgetId) : null;
  };
  const button = mainButton.push({ text: t('core_save'), enabled: false, onClick: save });
  const note = h('div', { class: 'section-footer' });
  const refresh = () => {
    const current = existing();
    note.textContent = current ? t('plan_budget_replace', { amount: exact(current.amount, current.currency) }) : '';
    button.update({ enabled: state.target !== null && !!state.amount });
  };

  const tiles = [{ value: 'total', label: t('plan_budget_total_short'), avatar: icon('target') },
    ...data.categories.map(c => ({ value: c.id, label: c.label, avatar: c.icon }))];
  const grid = h('div', { class: 'grid' }, tiles.map(tile => h('button', {
    class: `tile${tile.value === state.target ? ' on' : ''}`, dataset: { value: String(tile.value) },
    onclick: (e) => {
      haptic.tap();
      state.target = tile.value;
      grid.querySelectorAll('.tile').forEach(el => el.classList.toggle('on', el === e.currentTarget));
      refresh();
      if (!state.amount) amount.input.focus();
    }
  }, h('span', { class: 'avatar' }, tile.avatar), h('span', null, tile.label))));

  const amount = amountInput({
    currency: state.currency, autofocus: false,
    onInput: (value) => { state.amount = value; refresh(); },
    onCurrency: async () => {
      const code = await pick({ title: t('plan_currency'), value: state.currency, options: me().currencies.map(c => ({ value: c, label: c })) });
      if (code) { state.currency = code; amount.setCurrency(code); }
    }
  });

  async function save() {
    if (state.target === null || !state.amount) return;
    button.busy(true);
    const result = await act(() => api.post('/budgets', { target: state.target, amount: state.amount, currency: state.currency }));
    button.busy(false);
    if (!result) return;
    saved(result);
    navigate('/budgets', { replace: true });
  }

  amount.classList.add('plan-amount');
  refresh();
  return h('div', null,
    data.family ? h('div', { class: 'section-footer plan-note plan-top-note' }, t('plan_budgets_family_hint')) : null,
    h('div', { class: 'section' }, h('div', { class: 'section-title' }, h('span', null, t('plan_budget_target'))),
      h('div', { class: 'section-body' }, grid)),
    h('div', { class: 'section' }, h('div', { class: 'section-title' }, h('span', null, t('plan_budget_limit'))),
      h('div', { class: 'section-body' }, amount), note));
}

// ========================================
// КАРТОЧКА БЮДЖЕТА
// ========================================

function renderCard(data, setTitle, ctx) {
  const b = data.budget;
  setTitle(budgetName(b), data.family ? `${t('plan_budgets_family_title')} · ${periodLabel(data.period)}` : periodLabel(data.period));
  const over = b.left < 0;
  const out = [h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, over ? t('plan_budget_over_label') : t('plan_budget_left_label')),
    h('div', { class: `hero-value${over ? ' tone-bad' : ''}` }, moneyRound(Math.abs(b.left), data.currency)),
    budgetBar(b.ratio, periodElapsed(data.period, me().today)),
    h('div', { class: 'hero-note' }, t('plan_budget_of_percent', { spent: moneyRound(b.spent, data.currency), limit: moneyRound(b.limit, data.currency), percent: percent(b.ratio) })))];

  // Новый лимит — на месте; категория больше недоступна — только удалить (как в боте)
  if (data.target !== null) {
    const state = { amount: b.amount, currency: b.currency };
    // Кнопка «Сохранить» — только когда лимит или валюта изменились
    let button = null;
    const amount = amountInput({
      value: b.amount, currency: b.currency, autofocus: false,
      onInput: (value) => { state.amount = value; refresh(); },
      onCurrency: async () => {
        const code = await pick({ title: t('plan_currency'), value: state.currency, options: me().currencies.map(c => ({ value: c, label: c })) });
        if (code) { state.currency = code; amount.setCurrency(code); refresh(); }
      }
    });
    const refresh = () => {
      const dirty = !!state.amount && (state.amount !== b.amount || state.currency !== b.currency);
      if (dirty && !button) button = mainButton.push({ text: t('core_save'), onClick: save });
      if (!dirty && button) { button.remove(); button = null; }
    };
    async function save() {
      button.busy(true);
      const result = await act(() => api.put(`/budgets/${b.id}`, { amount: state.amount, currency: state.currency }));
      button.busy(false);
      if (!result) return;
      saved(result);
      ctx.refresh();
    }
    amount.classList.add('plan-amount');
    out.push(section({ title: t('plan_budget_limit') }, amount));
  } else {
    out.push(h('div', { class: 'section-footer plan-note' }, t('plan_budget_category_gone')));
  }

  out.push(section({}, row({
    title: t('plan_budget_expenses'), avatar: avatar('chart'),
    href: data.target === 'total' || data.target === null ? '/overview' : `/overview/category/${data.target}`
  })));
  out.push(section({}, row({ title: t('plan_budget_delete'), tone: 'danger', onClick: async () => {
    if (!(await confirmDelete(t('plan_budget_delete_confirm')))) return;
    const result = await act(() => api.del(`/budgets/${b.id}`));
    if (!result) return;
    changed('budgets');
    const restore = result.deleted;
    toast(t('plan_budget_deleted'), restore ? { action: { text: t('core_undo'), onClick: async () => {
      if (await act(() => api.post('/budgets', restore))) changed('budgets');
    } } } : {});
    back();
  } })));
  return h('div', null, out);
}

// Заголовок экрана, который знает имя только после загрузки
function lazyPage(load, render, initialTitle = '') {
  const title = h('h1', { class: 'page-title' }, initialTitle);
  const subtitle = h('div', { class: 'page-subtitle' });
  const setTitle = (text, sub = '') => { title.textContent = text; subtitle.textContent = sub; };
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, title, subtitle)), async(load, (data) => render(data, setTitle), { lines: 5 }));
}

export function register() {
  route('/budgets', (ctx) => {
    for (const topic of ['expenses', 'budgets', 'family', 'premium']) ctx.onChange(topic, ctx.refresh);
    return lazyPage(() => api.get('/budgets'), renderList, t('plan_budgets_title'));
  }, { tab: 'plans' });

  route('/budgets/new', (ctx) => page({ title: t('plan_budget_new') },
    async(() => api.get('/budgets'), (data) => renderNew(data, ctx.query), { lines: 5 })), { tab: 'plans', tabs: false });

  route('/budgets/:id', (ctx) => {
    for (const topic of ['expenses', 'family', 'premium']) ctx.onChange(topic, ctx.refresh);
    return lazyPage(() => api.get(`/budgets/${encodeURIComponent(ctx.params.id)}`), (data, setTitle) => renderCard(data, setTitle, ctx));
  }, { tab: 'plans' });
}
