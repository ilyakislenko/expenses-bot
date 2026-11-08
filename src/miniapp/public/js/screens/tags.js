// «Теги» (как /tags в боте): суммы по «#тегам» из описаний трат — за всё время или по пользовательским периодам;
// тап по тегу — итог, доли категорий (кольцо с касанием) и все записи с этим тегом.
import { h, page, section, row, avatar, segmented, stepper, async, empty, expenseRow } from '../core/ui.js';
import { route, navigate } from '../core/router.js';
import { t, money, percent, periodLabel, shortDate } from '../core/i18n.js';
import { api, qs } from '../core/api.js';
import { donut, COLORS } from '../core/charts.js';

export function register() {
  route('/tags', renderList, { tab: 'more' });
  route('/tags/:tag', renderTag, { tab: 'more' });
}

const offsetOf = (ctx) => (ctx.query.offset === undefined || ctx.query.offset === '' ? null : Number(ctx.query.offset));

// «Всё время | По месяцам» и шаги по периодам
function periodControls(path, offset, period) {
  const go = (value) => navigate(`${path}${qs({ offset: value })}`, { replace: true });
  return [
    segmented([{ value: 'all', label: t('xtra_tags_all_time') }, { value: 'period', label: t('xtra_tags_by_period') }],
      offset === null ? 'all' : 'period', (value) => go(value === 'all' ? null : 0)),
    offset !== null && period ? stepper(periodLabel(period), { onPrev: () => go(offset - 1), onNext: () => go(offset + 1), canNext: offset < 0, canPrev: offset > -120 }) : null
  ];
}

function renderList(ctx) {
  const offset = offsetOf(ctx);
  return page({ title: t('xtra_tags_title') }, async(() => api.get(`/tags${qs({ offset })}`), (data) => {
    if (!data.any) {
      return empty({ icon: 'tag', title: t('xtra_tags_empty_title'), text: t('xtra_tags_empty_text') });
    }
    const list = data.tags.length
      ? section({}, data.tags.map(item => row({
        title: `#${item.tag}`,
        subtitle: t('xtra_tags_records', { n: item.count }),
        value: money(item.total, data.currency),
        href: `/tags/${encodeURIComponent(item.tag)}${qs({ offset })}`
      })))
      : empty({ icon: 'tag', title: t('xtra_tags_period_empty') });
    return h('div', null, periodControls('/tags', offset, data.period), list);
  }));
}

function renderTag(ctx) {
  const offset = offsetOf(ctx);
  const tag = decodeURIComponent(ctx.params.tag);
  return page({ title: `#${tag}` }, async(() => api.get(`/tags/${encodeURIComponent(tag)}${qs({ offset })}`), (data) => {
    const range = data.first === data.last ? shortDate(data.first) : `${shortDate(data.first)} – ${shortDate(data.last)}`;
    return h('div', null,
      h('div', { class: 'hero' },
        data.period ? h('div', { class: 'hero-label' }, periodLabel(data.period)) : null,
        h('div', { class: 'hero-value' }, money(data.total, data.currency)),
        h('div', { class: 'hero-note' }, `${t('xtra_tags_records', { n: data.count })} · ${range}`)),
      data.categories.length > 1 ? categoryChart(data) : null,
      data.categories.length > 1 ? section({ title: t('xtra_tags_by_category') }, data.categories.map((c, i) => row({
        avatar: avatar(c.icon, { color: COLORS[i % COLORS.length] }),
        title: c.label,
        value: money(c.total, data.currency),
        valueNote: percent(c.total / data.total)
      }))) : null,
      section({ title: t('xtra_tags_records_title') }, data.expenses.map(e => expenseRow(e, { withDate: true }))));
  }));
}

// Кольцо долей категорий: в середине — самая крупная, тап по сектору — его категория
function categoryChart(data) {
  const box = h('div', { class: 'card', style: { paddingBottom: '8px' } });
  const draw = (selected) => {
    const pick = data.categories[selected];
    box.replaceChildren(donut({
      items: data.categories.map((c, i) => ({ label: c.label, value: c.total, color: COLORS[i % COLORS.length] })),
      center: { title: `${pick.icon} ${pick.label}`, value: percent(pick.total / data.total) },
      size: 180,
      onSelect: (i) => draw(i)
    }));
  };
  draw(0);
  return box;
}
