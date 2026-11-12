// Чеки: распознавание (#/receipt/job/:id — задача на сервере, экран спрашивает её состояние), черновик неуверенного или
// похожего на записанный чека (#/receipt/draft/:id — правка строк и даты до записи), записанный чек (#/receipt/:id —
// позиции → карточки, дата чека, «Всё верно», отмена чека). Правила — как у фото чека в боте.
import { route, navigate, back, changed } from '../core/router.js';
import { h, section, row, avatar, async, sheet, act, toast, confirmDelete, empty, errorText, amountInput } from '../core/ui.js';
import { t, money, number, dayLabel, shortDate, today, time } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, haptic } from '../core/tg.js';
import { resultToast, pickDay, chooseReceiptPhoto, countLabel } from './expenses-ui.js';

const POLL_MS = 2000;

function sumText(list) {
  return list.map(item => money(item.amount, item.currency)).join(' + ');
}

// ---------- Распознавание ----------

const STAGE_KEYS = { recognizing: 'ex_receipt_recognizing', slow: 'ex_receipt_slow', retrying: 'ex_receipt_retrying', queued: 'ex_receipt_queued' };
const ERROR_KEYS = { unreadable: 'ex_receipt_unreadable', not_receipt: 'ex_receipt_not_receipt', currency: 'ex_receipt_currency', unavailable: 'ex_receipt_unavailable' };

function renderJob(ctx) {
  const id = ctx.params.id;
  const box = h('div');
  let timer = null;
  let left = false;
  ctx.onLeave(() => { left = true; clearTimeout(timer); });

  function waiting(job) {
    box.replaceChildren(h('div', { class: 'ex-wait' },
      h('div', { class: 'spinner' }),
      h('div', { class: 'empty-title' }, t(STAGE_KEYS[job.stage] || STAGE_KEYS.recognizing, { position: job.position })),
      h('div', { class: 'muted small' }, t('ex_receipt_wait_hint'))));
  }

  function failed(job) {
    const tips = job.code === 'unreadable';
    box.replaceChildren(
      empty({
        icon: 'receipt',
        title: job.note === 'rotate_kept' ? t('ex_receipt_rotate_kept') : t(ERROR_KEYS[job.code] || ERROR_KEYS.unavailable, { currency: job.currency || '' }),
        // «Не получилось» и «не чек» засчитаны в месячный лимит, как в боте
        text: tips ? `${t('ex_receipt_tips')} ${t('ex_receipt_counted')}` : (job.code === 'not_receipt' ? t('ex_receipt_counted') : null)
      }),
      job.canRotate ? section({}, row({ avatar: avatar('repeat'), title: t('ex_receipt_rotate'), onClick: rotate })) : null);
    mainButton.push({ text: t('ex_receipt_retake'), onClick: () => chooseReceiptPhoto({ replace: true }) });
  }

  async function rotate() {
    const result = await act(() => api.post(`/receipts/jobs/${id}/rotate`));
    if (!result) return;
    mainButton.clear();
    poll();
  }

  async function poll() {
    if (left) return;
    let job;
    try {
      job = await api.get(`/receipts/jobs/${id}`);
    } catch (error) {
      if (error.code === 'job_not_found') {
        box.replaceChildren(empty({ icon: 'receipt', title: t('ex_receipt_interrupted') }));
        mainButton.push({ text: t('ex_receipt_retake'), onClick: () => chooseReceiptPhoto({ replace: true }) });
        return;
      }
      timer = setTimeout(poll, POLL_MS * 2);
      return;
    }
    if (left) return;
    if (job.status === 'working') {
      waiting(job);
      timer = setTimeout(poll, POLL_MS);
      return;
    }
    if (job.status === 'recorded') {
      haptic.success();
      changed('expenses');
      navigate(`/receipt/${job.receiptId}`, { replace: true });
      resultToast(t('ex_receipt_recorded'), [job.dateUnknown ? t('ex_receipt_date_unknown_recorded') : null, ...(job.notes || [])].filter(Boolean));
      return;
    }
    if (job.status === 'draft') {
      haptic.warn();
      navigate(`/receipt/draft/${job.draftId}`, { replace: true });
      if (job.note) toast(t(job.note === 'rotate_kept' ? 'ex_receipt_rotate_kept' : 'ex_receipt_rotate_unavailable'));
      return;
    }
    haptic.error();
    failed(job);
  }

  waiting({ stage: 'recognizing' });
  poll();
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, t('ex_receipt_title'))), box);
}

// ---------- Черновик ----------

function lineRow(item, currency, onClick) {
  const quantity = item.quantity !== null && item.price !== null && item.quantity !== 1 ? `${number(item.quantity, 3)} × ${money(item.price, currency)}` : null;
  return row({
    avatar: avatar(item.category ? item.category.icon : '📦'),
    title: item.name || (item.category ? item.category.label : '—'),
    subtitle: [item.category ? item.category.label : null, quantity].filter(Boolean).join(' · '),
    value: money(item.amount, currency),
    onClick,
    chevron: false
  });
}

function sumLine(d) {
  const items = money(d.itemsTotal, d.currency);
  if (d.total === null) return { text: t('ex_draft_sum_no_total', { items }), tone: null };
  const params = { items, total: money(d.total, d.currency), diff: money(Math.abs(d.check.diff), d.currency) };
  if (d.check.exact) return { text: t('ex_draft_sum_ok', params), tone: 'good' };
  return d.check.matches ? { text: t('ex_draft_sum_close', params), tone: 'warn' } : { text: t('ex_draft_sum_diff', params), tone: 'bad' };
}

// Шторка строки (или новой строки): название, сумма, категория сеткой; «Убрать строку»
function lineSheet(ctx, draftId, d, item, categories) {
  const value = { name: item ? item.name || '' : '', amount: item ? item.amount : null, categoryId: item && item.category ? item.category.id : null };
  const name = h('input', { type: 'text', value: value.name, placeholder: t('ex_line_name'), oninput: (e) => { value.name = e.target.value; } });
  const amount = amountInput({ value: value.amount, currency: d.currency, autofocus: !item, onInput: (v) => { value.amount = v; s.button.update({ enabled: v !== null }); } });
  const grid = h('div', { class: 'grid' });
  const paintGrid = () => grid.replaceChildren(...categories.map(c => h('button', {
    class: `tile${c.id === value.categoryId ? ' on' : ''}`, onclick: () => { haptic.tap(); value.categoryId = c.id; paintGrid(); }
  }, avatar(c.icon), h('span', null, c.label))));
  paintGrid();

  async function save() {
    if (value.amount === null) return;
    s.button.busy(true);
    const body = { amount: value.amount, name: value.name.trim() };
    const result = item
      ? await act(() => api.patch(`/receipts/drafts/${draftId}/lines/${item.id}`, { ...body, ...(value.categoryId ? { categoryId: value.categoryId } : {}) }))
      : await act(() => api.post(`/receipts/drafts/${draftId}/lines`, body));
    if (s.button) s.button.busy(false);
    if (result) { s.close(); ctx.refresh(); }
  }
  async function remove() {
    const result = await act(() => api.del(`/receipts/drafts/${draftId}/lines/${item.id}`));
    if (result) { s.close(); ctx.refresh(); }
  }
  const s = sheet({
    title: item ? t('ex_line_title') : t('ex_line_add'),
    mainButton: { text: t('core_save'), enabled: value.amount !== null, onClick: save },
    content: h('div', null,
      amount,
      section({}, h('div', { class: 'field' }, h('label', null, t('ex_line_name')), name)),
      item ? section({}, grid) : null,
      item ? section({}, row({ title: t('ex_line_remove'), tone: 'danger', chevron: false, onClick: remove })) : null)
  });
}

function renderDraft(ctx) {
  const draftId = ctx.params.id;
  let categoriesPromise = null;
  const categories = () => (categoriesPromise = categoriesPromise || api.get('/expenses/form').then(f => f.categories));

  const view = (d) => {
    const sum = sumLine(d);
    const doubt = d.doubt === 'mismatch' ? t('ex_draft_doubt_mismatch', { total: money(d.total || 0, d.currency) })
      : d.doubt === 'unsure' ? t('ex_draft_doubt_unsure') : d.doubt === 'suspicious' ? t('ex_draft_doubt_suspicious') : null;
    const openLine = (item) => async () => { try { lineSheet(ctx, draftId, d, item, await categories()); } catch (error) { toast(errorText(error)); } };

    const record = mainButton.push({
      text: t(d.edited ? 'ex_draft_record' : 'ex_draft_record_as_is'),
      enabled: d.items.length > 0,
      onClick: async () => {
        record.busy(true);
        const result = await act(() => api.post(`/receipts/drafts/${draftId}/record`));
        record.busy(false);
        if (!result) return;
        changed('expenses');
        navigate(`/receipt/${result.receiptId}`, { replace: true });
        resultToast(t('ex_receipt_recorded'), [result.dateUnknown ? t('ex_receipt_date_unknown_recorded') : null, ...(result.notes || [])].filter(Boolean));
      }
    });

    async function cancel() {
      if (!(await confirmDelete(t('ex_draft_cancel_confirm')))) return;
      if (await act(() => api.del(`/receipts/drafts/${draftId}`))) { navigate('/today', { replace: true }); toast(t('ex_draft_cancelled')); }
    }
    async function setDate() {
      const date = await pickDay({ current: d.dateUnknown ? null : d.date });
      if (date && await act(() => api.patch(`/receipts/drafts/${draftId}`, { date }))) ctx.refresh();
    }
    async function rotate() {
      if (await act(() => api.post(`/receipts/jobs/${d.jobId}/rotate`))) navigate(`/receipt/job/${d.jobId}`, { replace: true });
    }

    return h('div', null,
      h('div', { class: 'page-head' }, h('div', null,
        h('h1', { class: 'page-title' }, d.merchant || t('ex_receipt_title')),
        h('div', { class: 'page-subtitle' }, d.dateUnknown ? t('ex_draft_date_unknown') : `${dayLabel(d.date)}${d.time ? `, ${d.time}` : ''}`))),
      h('div', { class: 'hero' },
        h('div', { class: 'hero-value' }, money(d.itemsTotal, d.currency)),
        h('div', { class: `hero-note${sum.tone ? ` tone-${sum.tone}` : ''}` }, sum.text)),
      d.duplicateOf ? section({}, row({ avatar: avatar('receipt', { color: 'var(--warn)' }), title: t('ex_draft_duplicate'), subtitle: dayLabel(d.duplicateOf.createdAt.slice(0, 10)), href: `/receipt/${d.duplicateOf.id}` })) : null,
      doubt ? h('div', { class: 'ex-note' }, doubt, d.doubt !== 'suspicious' ? h('div', { class: 'muted small mt' }, t('ex_receipt_tips')) : null) : null,
      d.items.length
        ? section({ footer: t('ex_draft_tap_line') }, d.items.map(item => lineRow(item, d.currency, openLine(item))))
        : h('div', { class: 'ex-note muted' }, t('ex_draft_empty')),
      section({},
        row({ avatar: avatar('plus'), title: t('ex_line_add'), tone: 'accent', onClick: openLine(null), chevron: false }),
        row({ avatar: avatar('calendar'), title: t('ex_draft_date'), value: d.dateUnknown ? null : shortDate(d.date), onClick: setDate }),
        d.canRotate && d.jobId ? row({ avatar: avatar('repeat'), title: t('ex_receipt_rotate'), onClick: rotate }) : null),
      section({}, row({ title: t('ex_draft_cancel'), tone: 'danger', chevron: false, onClick: cancel })));
  };
  return h('div', { class: 'page' }, async(() => api.get(`/receipts/drafts/${encodeURIComponent(draftId)}`), view));
}

// ---------- Записанный чек ----------

function renderReceipt(ctx) {
  const id = ctx.params.id;
  ctx.onChange('expenses', ctx.refresh);
  const view = (r) => {
    if (r.status === 'undone') return empty({ icon: 'receipt', title: t('ex_receipt_undone'), text: r.merchant || null });
    const now = today();
    const dayText = r.purchasedDate ? `${dayLabel(r.purchasedDate)}${r.purchasedTime ? `, ${r.purchasedTime}` : ''}` : `${dayLabel(r.day || now)}, ${time(r.createdAt)}`;
    if (r.status === 'active' && r.expenses.length) {
      mainButton.push({
        text: t('ex_receipt_ok'),
        onClick: async () => { if (await act(() => api.post(`/receipts/${id}/confirm`), { success: t('ex_receipt_confirmed') })) navigate(`/today${r.day && r.day !== now ? `?date=${r.day}` : ''}`, { replace: true }); }
      });
    }
    async function setDate() {
      const date = await pickDay({ current: r.day });
      if (date && date !== r.day && await act(() => api.patch(`/receipts/${id}`, { date }), { success: t('core_saved') })) changed('expenses');
    }
    async function undo() {
      if (!(await confirmDelete(t('ex_receipt_undo_confirm', { n: r.expenses.length })))) return;
      if (await act(() => api.post(`/receipts/${id}/undo`), { success: t('ex_receipt_undone') })) { changed('expenses'); back(); }
    }
    return h('div', null,
      h('div', { class: 'page-head' }, h('div', null,
        h('h1', { class: 'page-title' }, r.merchant || t('ex_receipt_title')),
        h('div', { class: 'page-subtitle' }, `${dayText} · ${countLabel(r.expenses.length)}`))),
      r.expenses.length ? h('div', { class: 'hero' },
        h('div', { class: 'hero-value' }, sumText(r.totals)),
        r.mismatch ? h('div', { class: 'hero-note tone-warn' }, t('ex_receipt_mismatch', { printed: money(r.printedTotal, r.currency), items: money(r.itemsTotal, r.currency) })) : null,
        r.family ? h('div', { class: 'hero-note' }, t('ex_receipt_family')) : null) : null,
      r.expenses.length
        ? section({}, r.expenses.map(e => row({
          avatar: avatar(e.category ? e.category.icon : '📦'),
          title: e.description || (e.category ? e.category.label : '—'),
          subtitle: e.category ? e.category.label : null,
          value: money(e.amount, e.currency),
          href: `/record/${e.id}`,
          chevron: false
        })))
        : empty({ icon: 'receipt', title: t('ex_receipt_all_deleted') }),
      r.expenses.length ? section({},
        row({ avatar: avatar('calendar'), title: t('ex_receipt_date'), value: r.day ? shortDate(r.day) : null, onClick: setDate })) : null,
      r.expenses.length ? section({}, row({ title: t('ex_receipt_undo'), tone: 'danger', chevron: false, onClick: undo })) : null);
  };
  return h('div', { class: 'page' }, async(() => api.get(`/receipts/${encodeURIComponent(id)}`), view));
}

export function registerReceipts() {
  route('/receipt/job/:id', renderJob, { tab: 'today', tabs: false });
  route('/receipt/draft/:id', renderDraft, { tab: 'today', tabs: false });
  route('/receipt/:id', renderReceipt, { tab: 'today' });
}

