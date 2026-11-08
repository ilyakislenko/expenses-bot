// «Сегодня» (корень вкладки): записи за день в контуре пользователя или выбранном («Мои / Семья»), итог дня,
// «Можно сегодня» (тап — расчёт в «Планах»), листание днями — стрелки, свайп и выбор даты. Главная кнопка — «Добавить трату».
import { route, navigate } from '../core/router.js';
import { h, icon, section, row, expenseRow, segmented, async, empty, progress } from '../core/ui.js';
import { t, me, money, moneyRound, dayLabel, addDays, today } from '../core/i18n.js';
import { api, qs } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';
import { countLabel, pickDay } from './expenses-ui.js';

const SWIPE_MIN = 60;

function allowanceBlock(a) {
  if (!a) return null;
  const open = () => navigate('/plans/allowance');
  if (a.mode === 'none') {
    return section({}, row({ avatar: h('div', { class: 'avatar' }, icon('wallet')), title: t('ex_allowance_title'), subtitle: t('ex_allowance_none'), onClick: open }));
  }
  if (a.deficit > 0) {
    return h('button', { class: 'card ex-allowance', onclick: () => { haptic.tap(); open(); } },
      h('div', { class: 'ex-allowance-head' }, h('span', { class: 'muted' }, t('ex_allowance_title')), icon('chevron-right', { cls: 'row-chevron' })),
      h('div', { class: 'ex-allowance-value tone-bad' }, t('ex_allowance_over', { amount: moneyRound(a.deficit, a.currency) })));
  }
  const ratio = a.daily > 0 ? a.spentToday / a.daily : 1;
  const tone = a.pace === 'good' ? 'good' : a.pace === 'warn' ? 'warn' : 'bad';
  const left = Math.max(0, a.daily - a.spentToday);
  return h('button', { class: 'card ex-allowance', onclick: () => { haptic.tap(); open(); } },
    h('div', { class: 'ex-allowance-head' }, h('span', { class: 'muted' }, t('ex_allowance_title')), icon('chevron-right', { cls: 'row-chevron' })),
    h('div', { class: `ex-allowance-value tone-${tone}` }, moneyRound(a.daily, a.currency)),
    progress(ratio, { tone }),
    h('div', { class: 'ex-allowance-note muted small' },
      a.spentToday > a.daily
        ? t('ex_allowance_over_today', { amount: moneyRound(a.spentToday - a.daily, a.currency) })
        : t('ex_allowance_left', { spent: moneyRound(a.spentToday, a.currency), left: moneyRound(left, a.currency) })));
}

function render(ctx) {
  const now = today();
  const date = ctx.query.date && ctx.query.date <= now ? ctx.query.date : now;
  const scope = ctx.query.scope === 'family' || ctx.query.scope === 'mine' ? ctx.query.scope : null;
  const go = (params) => navigate(`/today${qs({ date: params.date === now ? null : params.date, scope: params.scope === undefined ? scope : params.scope })}`, { replace: true });
  const shift = (days) => { const next = addDays(date, days); if (next <= now) go({ date: next }); };

  ctx.onChange('expenses', ctx.refresh);
  ctx.onChange('family', ctx.refresh);
  ctx.onChange('budgets', ctx.refresh);
  ctx.onChange('income', ctx.refresh);
  mainButton.push({ text: t('ex_add_button'), onClick: () => navigate(`/add${qs({ date: date === now ? null : date })}`) });

  const node = h('div', { class: 'page ex-today' },
    h('div', { class: 'page-head' },
      h('button', { class: 'ex-title-btn', 'aria-label': t('ex_pick_day'), onclick: async () => { haptic.tap(); const d = await pickDay({ title: t('ex_pick_day'), current: date, oldest: null }); if (d) go({ date: d }); } },
        h('h1', { class: 'page-title' }, dayLabel(date)), icon('chevron-down', { cls: 'ex-title-chevron' })),
      h('div', { class: 'ex-day-nav' },
        h('button', { class: 'icon-btn', 'aria-label': '‹', onclick: () => { haptic.tap(); shift(-1); } }, icon('chevron-left')),
        h('button', { class: 'icon-btn', 'aria-label': '›', disabled: date >= now, onclick: () => { haptic.tap(); shift(1); } }, icon('chevron-right')))),
    async(() => api.get(`/expenses/day${qs({ date, scope })}`), (data) => {
      const family = data.scope === 'family';
      const canSwitch = data.canSwitch && me().premium.active;
      return h('div', null,
        canSwitch ? segmented([{ value: 'mine', label: t('core_mine') }, { value: 'family', label: t('core_family') }], data.scope, (v) => go({ date, scope: v === data.homeScope ? null : v })) : null,
        data.count ? h('div', { class: 'hero' },
          h('div', { class: 'hero-value' }, money(data.total, data.currency)),
          h('div', { class: 'hero-note' }, countLabel(data.count))) : null,
        allowanceBlock(data.allowance),
        data.expenses.length
          ? section({}, data.expenses.map(e => expenseRow(e, { withAuthor: family })))
          : empty({ icon: 'wallet', title: t('ex_day_empty_title'), text: date === now ? t('ex_day_empty_today') : null }));
    }));

  // Свайп влево — следующий день, вправо — предыдущий
  let start = null;
  node.addEventListener('touchstart', (e) => { if (e.touches.length === 1) start = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  node.addEventListener('touchend', (e) => {
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (e.target.closest && e.target.closest('.segmented, .chart')) return;
    haptic.tap();
    shift(dx < 0 ? 1 : -1);
  }, { passive: true });
  return node;
}

export function register() {
  route('/today', render, { tab: 'today', root: true });
}
