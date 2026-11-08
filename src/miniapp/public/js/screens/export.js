// «Экспорт CSV» (как /export в боте): период и категории → тот же файл приходит документом в чат с ботом
// (скачивание файлов внутри Telegram ненадёжно, а в чате файл легко открыть и переслать).
import { h, page, section, row, field, icon, toggle, sheet, async, act, toast } from '../core/ui.js';
import { route } from '../core/router.js';
import { t, periodLabel, shortDate } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, close } from '../core/tg.js';

export function register() {
  route('/export', render, { tab: 'more' });
}

const KINDS = ['cur', 'prev', 'day', 'week', 'all', 'range'];

function render() {
  return page({ title: t('xtra_export_title') }, async(() => api.get('/export'), (data) => {
    const state = { kind: 'cur', start: data.periods.cur.start, end: data.today, categoryIds: null };
    const box = h('div');
    const allIds = data.categories.map(c => c.id);

    const subtitle = (kind) => {
      if (kind === 'day') return shortDate(data.periods.day.start);
      if (kind === 'week' || kind === 'cur' || kind === 'prev') return periodLabel(data.periods[kind]);
      return null;
    };

    function chooseCategories() {
      const selected = new Set(state.categoryIds || allIds);
      const list = h('div', { class: 'section-body' });
      const drawList = () => {
        const everything = selected.size === allIds.length;
        list.replaceChildren(
          row({
            title: everything ? t('xtra_export_deselect_all') : t('xtra_export_select_all'), tone: 'accent', chevron: false,
            onClick: () => { if (everything) selected.clear(); else allIds.forEach(id => selected.add(id)); drawList(); }
          }),
          ...data.categories.map(c => row({
            avatar: h('div', { class: 'avatar small' }, c.icon),
            title: c.name,
            trailing: toggle(selected.has(c.id), (on) => { if (on) selected.add(c.id); else selected.delete(c.id); drawList(); })
          })));
      };
      drawList();
      const panel = sheet({
        title: t('xtra_export_categories'),
        content: list,
        mainButton: {
          text: t('core_done'),
          onClick: () => {
            if (!selected.size) return toast(t('error_export_no_categories'));
            state.categoryIds = selected.size === allIds.length ? null : [...selected];
            panel.close();
            draw();
          }
        }
      });
    }

    function draw() {
      const chosen = state.categoryIds;
      box.replaceChildren(h('div', null,
        section({ title: t('xtra_export_period'), footer: t('xtra_export_footer') }, KINDS.map(kind => row({
          title: t(`xtra_export_${kind}`),
          subtitle: subtitle(kind),
          trailing: state.kind === kind ? h('span', { style: { color: 'var(--accent)', display: 'flex' } }, icon('check', { size: 20 })) : null,
          chevron: false,
          onClick: () => { state.kind = kind; draw(); }
        }))),
        state.kind === 'range' ? section({},
          field({ label: t('xtra_export_from'), type: 'date', value: state.start, onInput: (v) => { state.start = v; } }),
          field({ label: t('xtra_export_to'), type: 'date', value: state.end, onInput: (v) => { state.end = v; } })) : null,
        section({}, row({
          title: t('xtra_export_categories'),
          value: chosen ? t('xtra_export_categories_some', { n: chosen.length, total: allIds.length }) : t('xtra_export_categories_all'),
          onClick: chooseCategories
        }))));
    }
    draw();

    const button = mainButton.push({
      text: t('xtra_export_send'),
      onClick: async () => {
        button.busy(true);
        const body = { kind: state.kind, categoryIds: state.categoryIds };
        if (state.kind === 'range') Object.assign(body, { start: state.start, end: state.end });
        const result = await act(() => api.post('/export', body));
        button.busy(false);
        if (result) toast(t('xtra_export_sent'), { action: { text: t('xtra_export_to_chat'), onClick: close } });
      }
    });
    return box;
  }));
}
