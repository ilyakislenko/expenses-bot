// Свои категории (#/categories, премиум — как «Свои категории» в боте): список, создать, переименовать, сменить значок,
// удалить (траты категории переходят в «Другое»). Лимит — USER_LIMITS (сервер отвечает ошибкой с числом).
import { route, changed } from '../core/router.js';
import { h, section, row, avatar, async, sheet, act, empty, confirmDelete } from '../core/ui.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';

const ICONS = ['🍔', '🛒', '☕', '🍷', '🚕', '⛽', '🏠', '💡', '📱', '👕', '💊', '🐶', '👶', '🎁', '✈️', '🎮', '📚', '💇', '🏋️', '🚗'];

function editor(ctx, category, nameMax) {
  const value = { name: category ? category.name : '', icon: category ? category.icon : '📦' };
  const preview = avatar(value.icon);
  const name = h('input', {
    type: 'text', value: value.name, maxlength: nameMax, placeholder: t('ex_category_name_placeholder'), style: { textAlign: 'left' },
    oninput: (e) => { value.name = e.target.value; s.button.update({ enabled: !!value.name.trim() }); }
  });
  const own = h('input', {
    type: 'text', class: 'ex-emoji-input', placeholder: '🙂', 'aria-label': t('ex_category_icon'),
    oninput: (e) => {
      const match = e.target.value.match(/\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*/u);
      if (match) { setIcon(match[0]); e.target.value = ''; e.target.blur(); }
    }
  });
  const grid = h('div', { class: 'ex-emoji-grid' });
  function setIcon(icon) {
    value.icon = icon;
    preview.textContent = icon;
    paint();
  }
  function paint() {
    grid.replaceChildren(...ICONS.map(icon => h('button', { class: `ex-emoji${icon === value.icon ? ' on' : ''}`, onclick: () => { haptic.tap(); setIcon(icon); } }, icon)), own);
  }
  paint();

  async function save() {
    const body = { name: value.name.trim(), icon: value.icon };
    const result = await act(() => (category ? api.patch(`/categories/${category.id}`, body) : api.post('/categories', body)), { success: t('core_saved') });
    if (!result) return;
    s.close();
    changed('expenses');
    ctx.refresh();
  }
  async function remove() {
    if (!(await confirmDelete(t('ex_category_delete_confirm', { name: category.name })))) return;
    if (await act(() => api.del(`/categories/${category.id}`), { success: t('core_deleted') })) { s.close(); changed('expenses'); ctx.refresh(); }
  }
  const s = sheet({
    title: category ? category.name : t('ex_category_new'),
    mainButton: { text: t('core_save'), enabled: !!value.name.trim(), onClick: save },
    content: h('div', null,
      section({}, h('div', { class: 'field' }, preview, name)),
      section({ title: t('ex_category_icon') }, grid),
      category ? section({}, row({ title: t('ex_category_delete'), tone: 'danger', chevron: false, onClick: remove })) : null)
  });
  if (!category) setTimeout(() => name.focus(), 250);
}

function render(ctx) {
  return h('div', { class: 'page' }, async(() => api.get('/categories'), (data) => {
    const full = data.categories.length >= data.max;
    if (!full) mainButton.push({ text: t('ex_category_new'), onClick: () => editor(ctx, null, data.nameMax) });
    return h('div', null,
      h('div', { class: 'page-head' }, h('div', null,
        h('h1', { class: 'page-title' }, t('ex_categories_title')),
        h('div', { class: 'page-subtitle' }, t('ex_categories_count', { n: data.categories.length, max: data.max })))),
      data.categories.length
        ? section({ footer: full ? t('ex_categories_full', { max: data.max }) : null },
          data.categories.map(c => row({ avatar: avatar(c.icon), title: c.name, onClick: () => editor(ctx, c, data.nameMax) })))
        : empty({ icon: 'tag', title: t('ex_categories_empty'), text: t('ex_categories_empty_text') }));
  }));
}

export function registerCategories() {
  route('/categories', render, { tab: 'more' });
}
