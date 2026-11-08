// «💡 Верни 13%» (только русский язык и рубли): итог года (/tax), «Как вернуть» (/tax/how), траты списком с правкой
// вида (/tax/list, премиум) и поиск траты, которой нет в расчёте (/tax/add, премиум). Расчёты — на сервере, как в боте.
import { h, page, section, row, avatar, expenseRow, segmented, progress, field, pick, toast, empty, errorText, async as load, act } from '../core/ui.js';
import { route, navigate, back } from '../core/router.js';
import { t, me, moneyRound } from '../core/i18n.js';
import { api, qs, ApiError } from '../core/api.js';

const KINDS = ['medical', 'education', 'sport', 'insurance'];
const KIND_ICONS = { medical: '💊', education: '🎓', sport: '🏋️', insurance: '🛡' };
const kindLabel = (kind) => t(`xtra_tax_kind_${kind}`);
const approx = (amount) => `≈ ${moneyRound(amount)}`;

// Ссылка со старым годом (вне окна) — открываем текущий; раздел недоступен (язык / валюта) — { unavailable }
async function get(path, year) {
  try {
    return await api.get(`${path}${qs({ year })}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'tax_unavailable') return { unavailable: true };
    if (error instanceof ApiError && error.code === 'tax_year' && year) return api.get(path);
    throw error;
  }
}

function unavailable() {
  const lang = me().lang !== 'ru';
  return empty({
    icon: 'percent',
    title: t(lang ? 'xtra_tax_unavailable_lang_title' : 'xtra_tax_unavailable_currency_title'),
    text: t(lang ? 'xtra_tax_unavailable_lang' : 'xtra_tax_unavailable_currency'),
    action: { text: t('xtra_tax_settings'), onClick: () => navigate('/settings') }
  });
}

// Итог: «можно вернуть ≈ N» и пояснение; на экране года — ещё лимит года полосой, в списке — только сколько в расчёте
function hero({ year, refund, sum, limit, capped }, note, { limitBar = true } = {}) {
  return h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, t('xtra_tax_refund_label', { year })),
    h('div', { class: 'hero-value' }, approx(refund)),
    note ? h('div', { class: 'hero-note' }, note) : null,
    capped ? h('div', { class: 'hero-note' }, t('xtra_tax_capped', { limit: moneyRound(limit) })) : null,
    limitBar ? [
      h('div', { class: 'small muted', style: { display: 'flex', justifyContent: 'space-between', gap: '8px', margin: '14px 0 6px' } },
        h('span', null, t('xtra_tax_limit')),
        h('span', null, t('xtra_tax_limit_value', { used: moneyRound(Math.min(sum, limit)), limit: moneyRound(limit) }))),
      progress(sum / limit, { tone: capped ? 'warn' : 'accent' })
    ] : null);
}

function summaryView(data) {
  const { year } = data;
  const nodes = [segmented(data.years.map(y => ({ value: y, label: String(y) })), year, (y) => navigate(`/tax${qs({ year: y })}`, { replace: true }))];
  if (data.count) {
    nodes.push(hero(data, data.capped ? null : t('xtra_tax_refund_note', { amount: moneyRound(data.sum) })));
    nodes.push(section({ title: t('xtra_tax_kinds') }, data.kinds.map(item => row({
      avatar: avatar(KIND_ICONS[item.kind]),
      title: kindLabel(item.kind),
      subtitle: t('xtra_tax_count', { count: item.count }),
      value: moneyRound(item.total)
    }))));
  } else {
    nodes.push(h('p', { class: 'muted', style: { margin: '4px 4px 20px', lineHeight: '1.4' } }, t('xtra_tax_empty', { year })));
  }
  if (data.interest) {
    const i = data.interest;
    const exempt = moneyRound(i.exempt);
    const status = i.tax > 0 ? `${t('xtra_tax_interest_ok', { exempt })}. ${t('xtra_tax_interest_over', { tax: moneyRound(i.tax), payYear: i.payYear })}`
      : i.near ? t('xtra_tax_interest_near', { exempt }) : t('xtra_tax_interest_ok', { exempt });
    const footer = [`${status}.`, t('xtra_tax_interest_note'), i.provisional ? t('xtra_tax_interest_provisional') : null].filter(Boolean).join(' ');
    nodes.push(section({ footer }, row({
      avatar: avatar('percent'),
      title: t('xtra_tax_interest'),
      value: approx(i.amount),
      valueTone: i.tax > 0 || i.near ? 'warn' : null
    })));
  }
  nodes.push(section({},
    row({ avatar: avatar('receipt'), title: t('xtra_tax_list'), value: data.isPremium ? null : t('xtra_tax_premium'), valueTone: 'hint', href: `/tax/list${qs({ year })}` }),
    row({ avatar: avatar('help'), title: t('xtra_tax_how'), href: `/tax/how${qs({ year })}` })));
  nodes.push(h('p', { class: 'small muted', style: { margin: '0 4px', lineHeight: '1.4' } }, t('xtra_tax_disclaimer')));
  return h('div', null, nodes);
}

function renderSummary(ctx) {
  return page({ title: t('xtra_tax_title') },
    load(() => get('/tax', ctx.query.year), (data) => (data.unavailable ? unavailable() : summaryView(data)), { lines: 6 }));
}

// «Как вернуть»: тот же текст, что в боте, — заголовки шагов и абзацы
function howView(data) {
  return h('div', { style: { padding: '0 4px', fontSize: '15px', lineHeight: '1.45' } }, data.blocks.map((block) => {
    const nodes = [];
    if (block.heading) nodes.push(h('h3', { style: { fontSize: '17px', fontWeight: '600', margin: '0 0 6px' } }, block.heading));
    let list = null;
    for (const line of block.lines) {
      if (line.item) {
        if (!list) { list = h('ul', { style: { margin: '0 0 6px', paddingLeft: '20px' } }); nodes.push(list); }
        list.appendChild(h('li', { style: { marginBottom: '4px' } }, line.text));
      } else {
        list = null;
        nodes.push(h('p', { style: { margin: '0 0 6px' } }, line.text));
      }
    }
    return h('div', { style: { marginBottom: '18px' } }, nodes);
  }));
}

function renderHow(ctx) {
  const year = ctx.query.year;
  return page({ title: t('xtra_tax_how'), subtitle: year ? t('xtra_tax_year', { year }) : null },
    load(() => get('/tax/how', year), (data) => (data.unavailable ? unavailable() : howView(data)), { lines: 8 }));
}

// Вид траты: четыре вида и «не учитывать»; убранную можно вернуть из тоста
async function chooseKind(item, year, ctx) {
  const current = item.kind || 'none';
  const chosen = await pick({
    title: t('xtra_tax_pick_title'),
    value: current,
    options: [
      ...KINDS.map(kind => ({ value: kind, label: kindLabel(kind), avatar: avatar(KIND_ICONS[kind], { small: true }) })),
      { value: 'none', label: t('xtra_tax_kind_none'), avatar: avatar('close', { small: true }) }
    ]
  });
  if (!chosen || chosen === current) return;
  const put = (kind) => api.put(`/tax/expenses/${item.expense.id}`, { year, kind });
  const done = await act(() => put(chosen));
  if (!done) return;
  ctx.refresh();
  if (chosen === 'none') {
    const previous = item.mark && item.mark !== 'none' ? item.mark : null;
    toast(t('xtra_tax_removed'), { action: { text: t('core_undo'), onClick: async () => { if (await act(() => put(previous))) ctx.refresh(); } } });
  }
}

function listView(data, ctx) {
  const { year } = data;
  if (!data.items.length) return empty({ icon: 'receipt', title: t('core_nothing_yet'), text: t('xtra_tax_list_empty', { year }) });
  const rowOf = (item) => expenseRow(item.expense, { withDate: true, onClick: () => chooseKind(item, year, ctx) });
  const nodes = [hero(data, t('xtra_tax_list_note', { count: data.counted, amount: moneyRound(data.sum) }), { limitBar: false })];
  for (const kind of KINDS) {
    const items = data.items.filter(item => item.kind === kind);
    if (!items.length) continue;
    const total = items.reduce((sum, item) => sum + item.expense.amount, 0);
    nodes.push(section({ title: `${kindLabel(kind)} · ${moneyRound(total)}` }, items.map(rowOf)));
  }
  const excluded = data.items.filter(item => !item.kind);
  if (excluded.length) nodes.push(h('div', { style: { opacity: '0.55' } }, section({ title: t('xtra_tax_excluded') }, excluded.map(rowOf))));
  return h('div', null, nodes);
}

function renderList(ctx) {
  const year = ctx.query.year;
  return page({
    title: t('xtra_tax_list_title'),
    subtitle: year ? t('xtra_tax_year', { year }) : null,
    action: me().premium.active ? { icon: 'plus', label: t('xtra_tax_add'), onClick: () => navigate(`/tax/add${qs({ year })}`) } : null
  }, load(() => get('/tax/expenses', year), (data) => (data.unavailable ? unavailable() : listView(data, ctx)), { lines: 8 }));
}

// Добавить трату: слово из описания → траты года, которых нет в расчёте → вид
function renderAdd(ctx) {
  const year = ctx.query.year ? Number(ctx.query.year) : undefined;
  const results = h('div');
  let timer = null;
  let seq = 0;
  const search = (text) => {
    clearTimeout(timer);
    const query = text.trim();
    const mine = ++seq;
    if (query.length < 2) { results.replaceChildren(); return; }
    timer = setTimeout(async () => {
      let data;
      try {
        data = await api.get(`/tax/search${qs({ year, q: query })}`);
      } catch (error) {
        if (mine !== seq) return;
        if (error instanceof ApiError && error.status === 402) { navigate('/premium', { replace: true }); return; }
        results.replaceChildren(h('p', { class: 'muted', style: { margin: '0 4px' } }, errorText(error)));
        return;
      }
      if (mine !== seq) return;
      if (!data.items.length) {
        results.replaceChildren(h('p', { class: 'muted', style: { margin: '0 4px', lineHeight: '1.4' } }, t('xtra_tax_search_none', { query })));
        return;
      }
      results.replaceChildren(section({}, data.items.map(item => expenseRow(item.expense, { withDate: true, onClick: () => add(item) }))));
    }, 300);
  };
  const add = async (item) => {
    const kind = await pick({
      title: t('xtra_tax_pick_title'),
      options: KINDS.map(k => ({ value: k, label: kindLabel(k), avatar: avatar(KIND_ICONS[k], { small: true }) }))
    });
    if (!kind) return;
    if (await act(() => api.put(`/tax/expenses/${item.expense.id}`, { year, kind }), { success: t('xtra_tax_added') })) back();
  };
  const input = field({ placeholder: t('xtra_tax_search_placeholder'), onInput: search, stacked: true, autofocus: true, maxlength: 100 });
  ctx.onLeave(() => clearTimeout(timer));
  return page({ title: t('xtra_tax_add'), subtitle: year ? t('xtra_tax_search_hint', { year }) : null },
    h('div', { class: 'section' }, h('div', { class: 'section-body' }, input)),
    results);
}

export function register() {
  route('/tax', renderSummary, { tab: 'more' });
  route('/tax/how', renderHow, { tab: 'more' });
  route('/tax/list', renderList, { tab: 'more' });
  route('/tax/add', renderAdd, { tab: 'more', tabs: false });
}
