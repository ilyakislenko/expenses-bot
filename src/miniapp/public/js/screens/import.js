// «Импорт выписки»: #/import — выбор файла (пусто — что подходит и как выгрузить), загруженные выписки с отменой;
// #/import/preview/:id — что нашлось в файле (ничего не записано): итоги, переводы, пропуски, операции со статусами,
// правка операции в шторке, запись MainButton. Файл выбирается кнопкой на странице: окно выбора файла открывается
// только от касания самой страницы, нативный MainButton его открыть не может.
import { h, page, section, row, avatar, toggle, stats, sheet, toast, empty, async as load, act, confirmDelete, errorText } from '../core/ui.js';
import { route, navigate, changed } from '../core/router.js';
import { t, me, money, moneyRound, shortDate, longDate, time, dayLabel } from '../core/i18n.js';
import { api, ApiError } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';

const ACCEPT = '.csv,.pdf,.txt,text/csv,application/pdf,text/plain';
const MAX_BYTES = 20 * 1024 * 1024;
const PAGE = 50;

let pendingFile = null; // выбранный файл ждёт загрузки на #/import/preview/new
const cache = new Map(); // id превью → ответ сервера (чтобы не загружать второй раз сразу после разбора)

export function register() {
  route('/import', renderHome, { tab: 'more' });
  route('/import/preview/:id', renderPreview, { tab: 'more', tabs: false });
}

// «12 операций» по правилам множественного числа языка
function ops(n) {
  let form = 'other';
  try { form = new Intl.PluralRules(me().locale).select(n); } catch (error) { form = 'other'; }
  const key = ['one', 'few', 'many'].includes(form) ? `xtra_import_ops_${form}` : 'xtra_import_ops_other';
  return t(key, { n });
}

// Даты операций: «1 – 31 окт.»; не этот год — с годом
function period(p) {
  if (!p) return null;
  const thisYear = me().today.slice(0, 4);
  if (p.from.slice(0, 4) === thisYear && p.to.slice(0, 4) === thisYear) return p.from === p.to ? shortDate(p.from) : `${shortDate(p.from)} – ${shortDate(p.to)}`;
  const withYear = (ymd) => new Intl.DateTimeFormat(me().locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ymd}T12:00:00Z`));
  return p.from === p.to ? withYear(p.from) : `${withYear(p.from)} – ${withYear(p.to)}`;
}

const totals = (list, currency) => (list.length ? list.map(x => money(x.total, x.currency)).join(' + ') : money(0, currency));

// Окно выбора файла — синхронно из касания (иначе WebView его не откроет)
function chooseFile() {
  const input = h('input', { type: 'file', accept: ACCEPT, style: { display: 'none' } });
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    pendingFile = file;
    navigate('/import/preview/new');
  });
  document.body.appendChild(input);
  input.click();
}

// ---------- #/import ----------

function renderHome(ctx) {
  return page({ title: t('xtra_import_title') },
    load(() => api.get('/import'), (data) => (data.imports.length ? history(data.imports, ctx.refresh) : intro())));
}

function formatRows() {
  return [
    row({ title: t('xtra_import_fmt_tbank'), subtitle: t('xtra_import_fmt_tbank_how') }),
    row({ title: t('xtra_import_fmt_sber'), subtitle: t('xtra_import_fmt_sber_how') }),
    row({ title: t('xtra_import_fmt_kaspi'), subtitle: t('xtra_import_fmt_kaspi_how') }),
    row({ title: t('xtra_import_fmt_csv'), subtitle: t('xtra_import_fmt_csv_how') })
  ];
}

function intro() {
  return h('div', null,
    empty({ icon: 'upload', title: t('xtra_import_empty_title'), text: t('xtra_import_empty_text'), action: { text: t('xtra_import_choose'), onClick: chooseFile } }),
    section({ title: t('xtra_import_formats'), footer: t('xtra_import_rules') }, formatRows()));
}

function history(imports, refresh) {
  return h('div', null,
    h('div', { style: { margin: '0 0 20px' } },
      h('button', { class: 'btn', onclick: () => { haptic.tap(); chooseFile(); } }, t('xtra_import_choose'))),
    section({ title: t('xtra_import_history') }, imports.map(item => row({
      avatar: avatar('upload'),
      title: item.sourceLabel,
      subtitle: [ops(item.expenses + item.incomes), period(item.period) || dayLabel(item.createdAt.slice(0, 10))].join(' · '),
      onClick: () => batchSheet(item, refresh)
    }))),
    section({}, row({ title: t('xtra_import_formats_link'), onClick: () => sheet({
      title: t('xtra_import_formats'),
      content: h('div', null, h('div', { class: 'section-body' }, formatRows()), h('div', { class: 'section-footer' }, t('xtra_import_rules')))
    }) })));
}

function batchSheet(item, refresh) {
  const count = item.expenses + item.incomes;
  const local = new Date(item.createdAt);
  const created = `${longDate(new Intl.DateTimeFormat('en-CA', { timeZone: me().timezone }).format(local))}, ${time(item.createdAt)}`;
  sheet({
    title: item.sourceLabel,
    content: (close) => h('div', null,
      h('div', { class: 'section' }, h('div', { class: 'section-body' },
        row({ title: t('xtra_import_loaded'), value: created }),
        item.period ? row({ title: t('xtra_import_dates'), value: period(item.period) }) : null,
        row({ title: t('xtra_import_expenses'), value: String(item.expenses) }),
        item.incomes ? row({ title: t('xtra_import_incomes'), value: String(item.incomes) }) : null)),
      h('div', { class: 'section-body' }, row({
        title: t('xtra_import_undo'), tone: 'danger', chevron: false,
        onClick: async () => {
          if (!(await confirmDelete(t('xtra_import_undo_confirm', { n: ops(count) })))) return;
          const result = await act(() => api.del(`/import/${item.id}`));
          close();
          if (result) toast(`${t('xtra_import_undone')} · ${ops(result.expenses + result.incomes)}`);
          changed('expenses');
          changed('income');
          refresh();
        }
      })))
  });
}

// ---------- #/import/preview/:id ----------

function renderPreview(ctx) {
  const box = h('div');
  let leaving = true; // уход с непринятым превью — отменить его на сервере
  let state = null;
  ctx.onLeave(() => {
    if (leaving && state) api.del(`/import/preview/${encodeURIComponent(state.id)}`).catch(() => {});
  });

  const failed = (error) => {
    mainButton.clear();
    const label = error instanceof ApiError && error.code === 'import_outdated' ? 'xtra_import_choose' : 'xtra_import_choose_other';
    box.replaceChildren(page({ title: t('xtra_import_title') },
      empty({ icon: 'info', title: errorText(error), action: { text: t(label), onClick: chooseFile } })));
  };

  const show = (data) => {
    state = data;
    cache.set(data.id, data);
    box.replaceChildren(previewView(data, update));
    setButton(data);
  };

  let button = null;
  const setButton = (data) => {
    const nothing = !data.toWriteCount && !data.transfers.count && !data.skipped.excluded;
    if (nothing) { if (button) { button.remove(); button = null; } return; }
    const config = { text: t('xtra_import_write', { n: data.toWriteCount }), enabled: data.toWriteCount > 0, onClick: commit };
    if (button) button.update(config); else button = mainButton.push(config);
  };

  async function update(path, body) {
    try {
      show(await api.patch(path, body));
    } catch (error) {
      haptic.error();
      if (error instanceof ApiError && error.code === 'import_outdated') return failed(error);
      toast(errorText(error));
    }
  }

  async function commit() {
    if (!state || !state.toWriteCount) return;
    button.busy(true);
    let result;
    try {
      result = await api.post(`/import/preview/${encodeURIComponent(state.id)}/confirm`);
    } catch (error) {
      button.busy(false);
      haptic.error();
      if (error instanceof ApiError && error.code === 'import_outdated') { leaving = false; return failed(error); }
      toast(errorText(error));
      return;
    }
    leaving = false;
    cache.delete(state.id);
    haptic.success();
    changed('expenses');
    changed('income');
    if (result.achievement) changed('achievements');
    button.remove();
    button = null;
    box.replaceChildren(doneView(result));
    mainButton.push({ text: t('core_done'), onClick: () => navigate('/import', { replace: true }) });
  }

  box.replaceChildren(page({ title: t('xtra_import_title') }, h('div', { class: 'skeleton' }, h('i'), h('i'), h('i'), h('i'))));
  const id = ctx.params.id;
  if (id === 'new') {
    const file = pendingFile;
    pendingFile = null;
    if (!file) { navigate('/import', { replace: true }); return box; }
    if (file.size > MAX_BYTES) { failed(new ApiError(400, 'import_file_too_big')); return box; }
    api.upload(`/import/preview?name=${encodeURIComponent(file.name || '')}`, file, file.type || 'application/octet-stream').then((data) => {
      cache.set(data.id, data);
      state = data;
      leaving = false; // смена адреса на id превью — не уход
      navigate(`/import/preview/${encodeURIComponent(data.id)}`, { replace: true });
    }, (error) => failed(error instanceof ApiError && error.code === 'too_large' ? new ApiError(413, 'import_file_too_big') : error));
    return box;
  }
  if (cache.has(id)) show(cache.get(id));
  else api.get(`/import/preview/${encodeURIComponent(id)}`).then(show, failed);
  return box;
}

// Метка справа — только у операций не по умолчанию (обычная новая запишется — без метки)
const STATUS = {
  transfer: 'xtra_import_st_transfer',
  manual: 'xtra_import_st_manual',
  duplicate: 'xtra_import_st_duplicate',
  own: 'xtra_import_st_own'
};

function statusOf(op) {
  if (op.excluded) return ['xtra_import_st_excluded', 'warn'];
  if (!STATUS[op.status]) return null;
  return [STATUS[op.status], op.write ? 'good' : 'hint'];
}

function previewView(data, update) {
  const base = `/import/preview/${encodeURIComponent(data.id)}`;
  const cur = data.currency;
  const s = data.skipped;
  const skippedRows = [
    ['duplicates', 'xtra_import_skip_duplicates'], ['manual', 'xtra_import_skip_manual'], ['own', 'xtra_import_skip_own'],
    ['excluded', 'xtra_import_skip_excluded'], ['failed', 'xtra_import_skip_failed'], ['currency', 'xtra_import_skip_currency'],
    ['invalid', 'xtra_import_skip_invalid']
  ].filter(([key]) => s[key]).map(([key, label]) => row({ title: t(label), value: String(s[key]) }));
  const nothing = !data.toWriteCount && !data.transfers.count && !s.excluded;

  const summary = [];
  if (data.expenses.count) summary.push({ label: t('xtra_import_expenses'), value: totals(data.expenses.byCurrency, cur), hint: ops(data.expenses.count) });
  if (data.incomes.count) summary.push({ label: t('xtra_import_incomes'), value: totals(data.incomes.byCurrency, cur), hint: ops(data.incomes.count), tone: 'good' });

  const transfers = data.transfers;
  const flow = [transfers.out.length ? `−${totals(transfers.out, cur)}` : null, transfers.in.length ? `+${totals(transfers.in, cur)}` : null].filter(Boolean).join(' · ');

  const list = [...data.operations].reverse();
  const listBody = h('div', { class: 'section-body' });
  let shown = 0;
  const more = () => {
    const next = list.slice(shown, shown + PAGE);
    shown += next.length;
    const moreRow = listBody.querySelector('[data-more]');
    if (moreRow) moreRow.remove();
    for (const op of next) listBody.appendChild(operationRow(op, data, base, update));
    if (shown < list.length) {
      const r = row({ title: t('xtra_import_show_more'), tone: 'accent', chevron: false, onClick: more });
      r.dataset.more = '1';
      listBody.appendChild(r);
    }
  };
  more();

  return page({ title: data.sourceLabel, subtitle: period(data.period) },
    nothing ? h('div', { class: 'card' }, t('xtra_import_nothing_new')) : null,
    summary.length ? stats(summary) : null,
    data.dateOrder ? h('div', { class: 'section-footer', style: { margin: '-12px 0 20px', padding: '0 4px' } }, t(`xtra_import_date_${data.dateOrder}`)) : null,
    section({ title: t('xtra_import_top') }, data.topCategories.map(c => row({ avatar: avatar(c.icon), title: c.label, value: moneyRound(c.total, cur) }))),
    transfers.count ? section({ footer: t('xtra_import_transfers_hint') }, row({
      title: t('xtra_import_transfers'),
      subtitle: [ops(transfers.count), flow].filter(Boolean).join(' · '),
      trailing: toggle(transfers.include, (on) => update(base, { transfers: on }))
    })) : null,
    section({ title: t('xtra_import_skipped') }, skippedRows),
    h('div', { class: 'section' }, h('div', { class: 'section-title' }, h('span', null, t('xtra_import_operations'))), listBody));
}

function operationRow(op, data, base, update) {
  const status = statusOf(op);
  const editable = op.status === 'new' || op.status === 'transfer';
  const amount = `${op.kind === 'income' ? '+' : ''}${money(op.amount, op.currency)}`;
  const icon = op.category ? op.category.icon : (op.kind === 'income' ? 'income' : 'expense');
  return row({
    avatar: avatar(icon, op.kind === 'income' && !op.category ? { color: 'var(--good)' } : {}),
    title: op.description || (op.category ? op.category.label : '—'),
    subtitle: [shortDate(op.date), op.time && op.time !== '12:00' ? op.time : null, op.category && op.write ? op.category.label : null].filter(Boolean).join(' · '),
    value: h('span', { class: op.write ? (op.kind === 'income' ? 'tone-good' : '') : 'tone-hint' }, amount),
    valueNote: status ? h('span', { class: `tone-${status[1]}` }, t(status[0])) : null,
    chevron: false,
    onClick: editable ? () => operationSheet(op, data, base, update) : null
  });
}

function operationSheet(op, data, base, update) {
  const path = `${base}/operations/${op.index}`;
  sheet({
    title: op.description || money(op.amount, op.currency),
    content: (close) => h('div', null,
      h('div', { class: 'section' }, h('div', { class: 'section-body' }, row({
        title: t('xtra_import_write_toggle'),
        subtitle: `${dayLabel(op.date)} · ${money(op.amount, op.currency)}`,
        trailing: toggle(!op.excluded, async (on) => { await update(path, { include: on }); close(); })
      }))),
      op.kind === 'expense' && !op.excluded ? h('div', { class: 'section' },
        h('div', { class: 'section-title' }, h('span', null, t('xtra_import_category'))),
        h('div', { class: 'section-body grid' }, data.categories.map(c => h('button', {
          class: `tile${op.category && op.category.id === c.id ? ' on' : ''}`,
          onclick: async () => { haptic.tap(); close(); if (!op.category || op.category.id !== c.id) await update(path, { categoryId: c.id }); }
        }, avatar(c.icon), h('span', null, c.label))))) : null)
  });
}

function doneView(result) {
  const count = result.expenses + result.incomes;
  const lines = [];
  if (count) lines.push(t('xtra_import_done_counts', { expenses: result.expenses, incomes: result.incomes }));
  if (result.achievement) lines.push(result.achievement);
  return page({ title: t('xtra_import_title') },
    empty({ icon: 'check', title: count ? t('xtra_import_done_title') : t('xtra_import_done_nothing'), text: lines.length ? h('div', { style: { whiteSpace: 'pre-line' } }, lines.join('\n')) : null }),
    count ? section({}, row({ title: t('xtra_import_open_today'), href: '/today' })) : null);
}
