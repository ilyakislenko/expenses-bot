// Карточка записи (#/record/:id): сумма, категория, описание, дата и время — правка на месте (только своя запись, как
// в боте), автор семейной записи, позиция чека, регулярная, «в семейный бюджет» (премиум), удаление с «Вернуть».
// Здесь же регистрируются чеки (expenses-receipt.js) и свои категории (expenses-categories.js).
import { route, back, changed } from '../core/router.js';
import { h, icon, section, row, avatar, toggle, amountInput, async, sheet, pick, act, toast, confirmDelete } from '../core/ui.js';
import { t, me, money, number, dayLabel, time } from '../core/i18n.js';
import { api } from '../core/api.js';
import { haptic } from '../core/tg.js';
import { resultToast, pickDay, pickCategory } from './expenses-ui.js';
import { registerReceipts } from './expenses-receipt.js';
import { registerCategories } from './expenses-categories.js';

let categoriesCache = null;
async function categories() {
  if (!categoriesCache) categoriesCache = api.get('/expenses/form').then(form => form.categories).catch((error) => { categoriesCache = null; throw error; });
  return categoriesCache;
}

function card(ctx, data) {
  const e = data.expense;
  const edit = data.canEdit;
  const patch = async (body) => {
    const result = await act(() => api.patch(`/expenses/${e.id}`, body), { success: t('core_saved') });
    if (!result) return false;
    changed('expenses');
    if (result.notes && result.notes.length) resultToast(t('core_saved'), result.notes);
    ctx.refresh();
    return true;
  };

  function editAmount() {
    const value = { amount: e.amount, currency: e.currency };
    const input = amountInput({
      value: e.amount, currency: e.currency,
      onInput: (v) => { value.amount = v; s.button.update({ enabled: v !== null }); },
      onCurrency: async () => {
        const codes = [me().currency, ...me().currencies.filter(c => c !== me().currency)];
        const chosen = await pick({ title: t('ex_currency'), value: value.currency, options: codes.map(c => ({ value: c, label: c })) });
        if (chosen) { value.currency = chosen; input.setCurrency(chosen); }
      }
    });
    const s = sheet({
      title: t('ex_amount'), content: input,
      mainButton: { text: t('core_save'), onClick: async () => { if (await patch({ amount: value.amount, currency: value.currency })) s.close(); } }
    });
  }

  function editDescription() {
    const field = h('textarea', { class: 'ex-quick-input', rows: 2, maxlength: data.maxDescription, value: e.description || '', placeholder: t('ex_description_placeholder') });
    const s = sheet({
      title: t('ex_description'),
      content: h('div', { class: 'section' }, h('div', { class: 'section-body ex-quick-box' }, field), h('div', { class: 'section-footer' }, t('ex_tags_hint'))),
      mainButton: { text: t('core_save'), onClick: async () => { if (await patch({ description: field.value.trim() || null })) s.close(); } }
    });
    setTimeout(() => field.focus(), 250);
  }

  async function editCategory() {
    let list;
    try { list = await categories(); } catch (error) { toast(t('core_error')); return; }
    const id = await pickCategory({ categories: list, value: e.category ? e.category.id : null });
    if (id && (!e.category || id !== e.category.id)) await patch({ categoryId: id });
  }

  async function editDate() {
    const d = await pickDay({ current: e.date });
    if (d && d !== e.date) await patch({ date: d });
  }

  async function remove() {
    if (!(await confirmDelete())) return;
    const result = await act(() => api.del(`/expenses/${e.id}`));
    if (!result) return;
    changed('expenses');
    back();
    toast(t('core_deleted'), {
      duration: 6000,
      action: { text: t('core_undo'), onClick: async () => { if (await act(() => api.post('/expenses/restore', { token: result.token }))) changed('expenses'); } }
    });
  }

  async function setFamily(value) {
    const result = await act(() => api.post(`/expenses/${e.id}/family`, { family: value }), { success: t(value ? 'ex_moved_to_family' : 'ex_moved_from_family') });
    if (result) changed('expenses');
    ctx.refresh();
  }

  const quantity = data.quantity !== null && data.unitPrice !== null && data.quantity !== 1
    ? `${number(data.quantity, 3)} × ${money(data.unitPrice, e.currency)}` : null;
  const details = [
    row({ title: t('ex_category'), value: e.category ? `${e.category.icon} ${e.category.label}` : '—', onClick: edit ? editCategory : null }),
    row({ title: t('ex_description'), value: e.description || (edit ? t('ex_add_description') : '—'), valueTone: e.description ? null : 'hint', onClick: edit ? editDescription : null }),
    row({ title: t('ex_date'), value: `${dayLabel(e.date)}, ${time(e.createdAt)}`, onClick: edit ? editDate : null })
  ];
  if (e.author) details.push(row({ title: t('ex_author'), value: e.author.name }));

  const extra = [];
  if (data.familyAction) extra.push(row({ title: t('ex_family_toggle'), trailing: toggle(e.family, setFamily) }));
  else if (e.family) extra.push(row({ avatar: avatar('family'), title: t('ex_family_record') }));
  if (e.receiptId && e.mine) extra.push(row({ avatar: avatar('receipt'), title: t('ex_from_receipt'), href: `/receipt/${e.receiptId}` }));
  if (e.recurring) extra.push(row({ avatar: avatar('repeat'), title: t('ex_recurring'), href: data.recurringId ? `/recurring/${data.recurringId}` : null }));
  if (data.bank) extra.push(row({ avatar: avatar('bell'), title: t('ex_from_bank') }));
  if (e.imported) extra.push(row({ avatar: avatar('upload'), title: t('ex_imported') }));

  return h('div', null,
    h(edit ? 'button' : 'div', { class: 'hero ex-record-hero', onclick: edit ? () => { haptic.tap(); editAmount(); } : null, 'aria-label': edit ? t('ex_amount') : null },
      avatar(e.category ? e.category.icon : '📦'),
      h('div', { class: 'ex-record-amount' },
        h('div', { class: 'hero-value' }, money(e.amount, e.currency)),
        quantity ? h('div', { class: 'hero-note' }, quantity) : null),
      edit ? icon('edit', { cls: 'ex-record-edit' }) : null),
    section({ footer: edit ? null : t('ex_view_only') }, details),
    section({}, extra),
    edit ? section({}, row({ title: t('ex_delete_record'), tone: 'danger', onClick: remove, chevron: false })) : null);
}

function render(ctx) {
  ctx.onChange('expenses', () => { categoriesCache = null; });
  return h('div', { class: 'page ex-record' }, async(() => api.get(`/expenses/${encodeURIComponent(ctx.params.id)}`), (data) => card(ctx, data)));
}

export function register() {
  route('/record/:id', render, { tab: 'today' });
  registerReceipts();
  registerCategories();
}

