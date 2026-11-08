// Подписки и пробные периоды (бот: «🔁 Подписки» — pls/plsc/plsy/plsn/plsr, предупреждения plwo/plwt/plwd,
// ответы plwk/plwx/plwm/plwu/plwh, пробные pltn/pltd/plt/pltx). Ссылки «Как отменить» — openLink.
import { route, navigate, back, changed } from '../core/router.js';
import { h, page, section, row, avatar, async, sheet, act, empty, toggle, toast, pick, field, confirmDelete, errorText } from '../core/ui.js';
import { t, moneyRound, me, dayLabel, shortDate, longDate, addDays } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, openLink, haptic } from '../core/tg.js';
import { planIcon, iconAvatar, cadenceText, exact } from './plans-ui.js';

const TRIAL_QUICK = [1, 3, 7, 14, 30]; // окончание пробного: через столько дней
const TRIAL_MAX_DAYS = 366;

function line(iconName, text, tone = null) {
  return [planIcon(iconName, { size: 13 }), h('span', { class: tone ? `tone-${tone}` : null }, text)];
}

// Строка подписки: состояние предупреждения значком и дата следующего списания
function subSubtitle(sub, today) {
  if (sub.state === 'cancelling') return line('ban', t('plan_sub_cancelling_short'), 'bad');
  if (!sub.isSub) return line('help', t('plan_sub_unconfirmed_short'), 'warn');
  const date = sub.nextDate < today ? t('plan_sub_overdue_short', { date: shortDate(sub.nextDate) }) : t('plan_sub_next_short', { date: shortDate(sub.nextDate) });
  if (sub.state === 'muted') return line('bell-off', date);
  return line(sub.warns ? 'bell' : sub.kind === 'recurring' ? 'repeat' : 'calendar', date);
}

function trialSubtitle(trial) {
  const until = t('plan_trial_until', { date: shortDate(trial.endDate) });
  const icons = { active: 'bell', kept: 'check', muted: 'bell-off', cancelling: 'ban' };
  return line(icons[trial.state] || 'bell', trial.amount ? `${until} · ${t('plan_trial_then_short', { amount: exact(trial.amount, trial.currency) })}` : until,
    trial.state === 'cancelling' ? 'bad' : null);
}

function trialRow(trial) {
  return row({ title: trial.name, subtitle: trialSubtitle(trial), avatar: avatar('clock', { color: 'var(--c4)' }), href: `/plans/trial/${trial.id}` });
}

// ========================================
// КАК ОТМЕНИТЬ
// ========================================

// guide: { service: { name, manage, help } | null, apple, google, generic, recurringId }
const shorten = (text, max = 40) => (text.length > max ? `${text.slice(0, max - 1).trim()}…` : text);

function guideSheet(name, guide, { notice = null } = {}) {
  const links = [];
  if (guide.service) {
    if (guide.service.manage) links.push(row({ title: t('plan_guide_open', { service: guide.service.name }), avatar: iconAvatar('link'), tone: 'accent', onClick: () => openLink(guide.service.manage) }));
    if (guide.service.help) links.push(row({ title: t('plan_guide_help', { service: guide.service.name }), avatar: avatar('help'), onClick: () => openLink(guide.service.help) }));
  }
  const stores = [];
  if (guide.apple) stores.push(row({ title: t('plan_guide_apple'), subtitle: t('plan_guide_apple_steps'), avatar: iconAvatar('phone'), onClick: () => openLink(guide.apple) }));
  if (guide.google) stores.push(row({ title: t('plan_guide_google'), subtitle: t('plan_guide_google_steps'), avatar: iconAvatar('phone'), onClick: () => openLink(guide.google) }));
  sheet({
    title: t('plan_guide_title', { name: shorten(name) }),
    content: (close) => h('div', { class: 'plan-guide' },
      notice ? h('div', { class: 'plan-notice' }, notice) : null,
      section({ title: t('plan_guide_intro') }, links, stores),
      guide.generic ? h('p', { class: 'plan-text' }, t('plan_guide_generic')) : null,
      h('p', { class: 'plan-text muted' }, t('plan_guide_tip')),
      guide.recurringId ? section({ footer: t('plan_guide_recurring') },
        row({ title: t('plan_guide_recurring_open'), avatar: avatar('repeat'), onClick: () => { close(); navigate(`/recurring/${guide.recurringId}`); } })) : null)
  });
}

// ========================================
// СПИСОК ПОДПИСОК
// ========================================

function warnDaysText(days) {
  return t(`plan_days_${days}`);
}

function renderList(data, ctx) {
  const out = [];
  if (data.count) {
    out.push(h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('plan_subs_month')),
      h('div', { class: 'hero-value' }, `≈ ${moneyRound(data.monthly, data.currency)}`),
      h('div', { class: 'hero-note' }, t('plan_subs_year', { amount: moneyRound(data.yearly, data.currency), count: data.count }))));
    const rows = data.items.map(sub => row({
      title: sub.label,
      subtitle: subSubtitle(sub, data.today),
      value: exact(sub.amount, sub.currency),
      valueNote: cadenceText(sub.cadence),
      href: `/plans/subscription/${sub.id}`
    }));
    if (data.hidden.count) {
      rows.push(row({
        title: t('plan_subs_more_locked', { count: data.hidden.count }),
        subtitle: t('plan_subs_more_locked_note', { amount: moneyRound(data.hidden.monthly, data.currency) }),
        avatar: avatar('star'), tone: 'accent', href: '/premium'
      }));
    }
    const unconfirmed = data.items.some(sub => !sub.isSub);
    out.push(section({ footer: unconfirmed ? t('plan_subs_intro') : null }, rows));
  } else {
    out.push(empty({ icon: 'repeat', title: t('plan_subs_empty_title'), text: t('plan_subs_empty_text') }));
  }

  out.push(section({ title: t('plan_trials_title') },
    data.trials.map(trialRow),
    row({ title: t('plan_trial_add'), avatar: avatar('plus'), tone: 'accent', href: '/plans/trial/new' })));

  // Предупреждения о списании: вкл/выкл и за сколько дней (выбор дней включает)
  const s = data.settings;
  const warnToggle = toggle(s.enabled, async (on) => {
    const result = await act(() => api.put('/plans/reminders', { subWarn: on }));
    if (!result) { warnToggle.checked = !on; return; }
    ctx.refresh();
  });
  const settingsRows = [row({ title: t('plan_warn_toggle'), subtitle: t('plan_warn_toggle_note'), avatar: avatar('bell'), trailing: warnToggle, tone: 'plan-wrap' })];
  if (s.enabled) {
    settingsRows.push(row({
      title: t('plan_warn_days'),
      value: warnDaysText(s.days),
      onClick: async () => {
        const days = await pick({ title: t('plan_warn_days'), value: s.days, options: s.options.map(d => ({ value: d, label: warnDaysText(d) })) });
        if (!days || days === s.days) return;
        if (await act(() => api.put('/plans/reminders', { subWarnDays: days }))) ctx.refresh();
      }
    }));
  }
  out.push(section({ footer: data.isPremium ? null : t('plan_warn_tariff', { count: data.limit }) }, settingsRows));

  if (data.dismissed) {
    out.push(section({}, row({
      title: t('plan_subs_restore', { count: data.dismissed }), avatar: avatar('repeat'), tone: 'accent',
      onClick: async () => {
        const result = await act(() => api.post('/plans/subscriptions/restore'));
        if (result) { toast(t('plan_subs_restored')); ctx.refresh(); }
      }
    })));
  }
  return h('div', null, out);
}

// ========================================
// КАРТОЧКА ПОДПИСКИ
// ========================================

function renderSub(data, ctx) {
  const { sub, settings } = data;
  const out = [];
  const post = (action) => act(() => api.post(`/plans/subscriptions/${sub.id}/${action}`));

  out.push(h('div', { class: 'hero' },
    h('div', { class: 'hero-value' }, exact(sub.amount, sub.currency)),
    h('div', { class: 'hero-note' }, sub.cadence !== 'monthly' || sub.currency !== me().currency
      ? `${cadenceText(sub.cadence)} · ${t('plan_sub_monthly', { amount: moneyRound(sub.monthly) })}` : cadenceText(sub.cadence))));

  const facts = [];
  facts.push(sub.nextDate >= data.today
    ? row({ title: t('plan_sub_next'), value: `≈ ${dayLabel(sub.nextDate)}` })
    : row({ title: t('plan_sub_overdue'), subtitle: t('plan_sub_overdue_note'), value: dayLabel(sub.nextDate), valueTone: 'warn' }));
  if (sub.kind === 'recurring') {
    facts.push(row({ title: t('plan_sub_recurring'), value: t('plan_due_day', { day: sub.day }), href: `/recurring/${sub.recurringId}` }));
  }
  out.push(section({}, facts));

  // Напоминать о списании: вкл — снять «не напоминать» / «отменяю» (неотмеченную найденную — отметить подпиской)
  const on = !sub.state && sub.isSub;
  let note;
  if (sub.state === 'cancelling') note = t('plan_sub_cancelling');
  else if (sub.state === 'muted') note = t('plan_sub_muted');
  else if (!sub.isSub) note = t('plan_sub_unconfirmed');
  else if (!settings.enabled) note = t('plan_sub_warn_off');
  else note = t('plan_sub_warn_on', { days: t(`plan_days_${settings.days}`) });
  const warn = toggle(on, async (value) => {
    const result = await post(value ? 'unmute' : 'mute');
    if (!result) { warn.checked = !value; return; }
    toast(t(value ? 'plan_unmuted' : 'plan_muted'));
    ctx.refresh();
  });
  const actions = [row({ title: t('plan_sub_warn'), subtitle: note, avatar: avatar('bell'), trailing: warn, tone: 'plan-wrap' })];
  if (sub.state === 'cancelling') {
    actions.push(row({ title: t('plan_keep'), avatar: avatar('check'), onClick: async () => {
      if (await post('keep')) { toast(t('plan_kept', { name: sub.label })); ctx.refresh(); }
    } }));
  } else if (sub.isSub) {
    actions.push(row({ title: t('plan_cancel'), subtitle: t('plan_cancel_note'), avatar: iconAvatar('ban'), tone: 'plan-wrap', onClick: async () => {
      if (!(await post('cancel'))) return;
      guideSheet(sub.label, data.guide, { notice: t('plan_cancel_marked', { name: sub.label }) });
      ctx.refresh();
    } }));
  }
  actions.push(row({ title: t('plan_how_cancel'), avatar: avatar('help'), onClick: () => guideSheet(sub.label, data.guide) }));
  out.push(section({}, actions));

  out.push(section({}, row({ title: t('plan_sub_dismiss'), subtitle: t('plan_sub_dismiss_note'), tone: 'danger plan-wrap', onClick: async () => {
    if (await post('dismiss')) { toast(t('plan_sub_dismissed')); changed('recurring'); back(); }
  } })));

  // «Это подписка» — главное действие у найденной неотмеченной: ежемесячная станет регулярной тратой
  if (sub.kind === 'detected' && !sub.confirmed) {
    const button = mainButton.push({ text: t('plan_sub_confirm'), onClick: async () => {
      button.busy(true);
      try {
        const result = await api.post(`/plans/subscriptions/${sub.id}/confirm`);
        haptic.success();
        toast(result.converted ? t('plan_sub_converted', { day: result.day }) : t('plan_sub_confirmed'));
        if (result.converted) changed('recurring');
        navigate('/plans/subscriptions', { replace: true });
      } catch (error) {
        haptic.error();
        toast(error.code === 'subscription_recurring_limit' ? t('error_subscription_recurring_limit', { max: error.data.max }) : errorText(error));
      } finally {
        button.busy(false);
      }
    } });
  }
  return h('div', null, out);
}

// ========================================
// ПРОБНЫЕ ПЕРИОДЫ
// ========================================

function renderTrials(data) {
  const out = [];
  if (data.items.length) out.push(section({}, data.items.map(trialRow)));
  else out.push(empty({ icon: 'clock', title: t('plan_trials_empty_title'), text: t('plan_trials_empty_text') }));
  if (data.limit.ok) mainButton.push({ text: t('plan_trial_add'), onClick: () => navigate('/plans/trial/new') });
  else out.push(section({ footer: t('plan_trial_limit') }, row({ title: t('core_premium_button'), avatar: avatar('star'), tone: 'accent', href: '/premium' })));
  return h('div', null, out);
}

function renderTrial(data, ctx) {
  const { trial, guide } = data;
  const out = [];
  const post = (action) => act(() => api.post(`/plans/trials/${trial.id}/${action}`));
  out.push(h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, t(trial.ended ? 'plan_trial_ended' : 'plan_trial_ends')),
    h('div', { class: 'hero-value plan-hero-date' }, dayLabel(trial.endDate)),
    h('div', { class: 'hero-note' }, trial.amount ? t('plan_trial_then', { amount: exact(trial.amount, trial.currency) }) : t('plan_trial_no_price'))));

  const warn = toggle(trial.state === 'active', async (value) => {
    const result = await post(value ? 'unmute' : 'mute');
    if (!result) { warn.checked = !value; return; }
    toast(t(value ? 'plan_unmuted' : 'plan_muted'));
    ctx.refresh();
  });
  const actions = [row({ title: t('plan_trial_remind'), subtitle: t(`plan_trial_state_${trial.state}`), avatar: avatar('bell'), trailing: warn, tone: 'plan-wrap' })];
  if (trial.state === 'cancelling') {
    actions.push(row({ title: t('plan_keep'), avatar: avatar('check'), onClick: async () => {
      if (await post('keep')) { toast(t('plan_kept_trial', { name: trial.name })); ctx.refresh(); }
    } }));
  } else {
    actions.push(row({ title: t('plan_cancel'), subtitle: t('plan_cancel_note'), avatar: iconAvatar('ban'), tone: 'plan-wrap', onClick: async () => {
      if (!(await post('cancel'))) return;
      guideSheet(trial.name, guide, { notice: t('plan_cancel_marked', { name: trial.name }) });
      ctx.refresh();
    } }));
  }
  actions.push(row({ title: t('plan_how_cancel'), avatar: avatar('help'), onClick: () => guideSheet(trial.name, guide) }));
  out.push(section({}, actions));
  out.push(section({}, row({ title: t('plan_trial_delete'), tone: 'danger', onClick: async () => {
    if (!(await confirmDelete(t('plan_trial_delete_confirm', { name: trial.name })))) return;
    if (await act(() => api.del(`/plans/trials/${trial.id}`))) { toast(t('core_deleted')); back(); }
  } })));
  return h('div', null, out);
}

// Новый пробный период: сервис, цена после пробного (можно без), дата окончания — кнопкой или в календаре
function renderTrialForm(limits) {
  if (!limits.limit.ok) {
    return empty({ icon: 'star', title: t('plan_trial_limit_title'), text: t('plan_trial_limit'), action: { text: t('core_premium_button'), onClick: () => navigate('/premium') } });
  }
  const today = limits.today;
  const state = { name: '', amount: null, currency: me().currency, endDate: null };
  const ready = () => /\p{L}/u.test(state.name) && !!state.endDate && state.amount !== false;
  const button = mainButton.push({ text: t('core_save'), enabled: false, onClick: save });
  const refresh = () => button.update({ enabled: ready() });

  const name = field({ label: t('plan_trial_name'), placeholder: 'Netflix', maxlength: 60, autofocus: true, onInput: (v) => { state.name = v.trim(); refresh(); } });
  const price = field({ label: t('plan_trial_price'), placeholder: t('plan_trial_price_placeholder'), inputmode: 'decimal', onInput: (v) => {
    const cleaned = v.replace(/\s/g, '').replace(',', '.');
    const n = Number(cleaned);
    state.amount = cleaned === '' ? null : Number.isFinite(n) && n > 0 && Math.round(n * 100) === n * 100 ? n : false;
    refresh();
  } });
  const currencyRow = row({ title: t('plan_currency'), value: state.currency, onClick: async () => {
    const code = await pick({ title: t('plan_currency'), value: state.currency, options: me().currencies.map(c => ({ value: c, label: c })) });
    if (code) { state.currency = code; currencyRow.querySelector('.row-value').textContent = code; }
  } });

  const dateInput = h('input', { type: 'date', class: 'plan-date-input', min: today, max: addDays(today, TRIAL_MAX_DAYS),
    onchange: (e) => setDate(e.target.value || null) });
  const chips = h('div', { class: 'chips plan-chips' }, TRIAL_QUICK.map(days => h('button', {
    class: 'chip', dataset: { date: addDays(today, days) },
    onclick: () => { haptic.tap(); setDate(addDays(today, days)); }
  }, days === 1 ? t('core_tomorrow') : t('plan_trial_in_days', { days }))));
  const dateNote = h('div', { class: 'section-footer' });
  function setDate(date) {
    state.endDate = date && date >= today && date <= addDays(today, TRIAL_MAX_DAYS) ? date : null;
    dateInput.value = state.endDate || '';
    chips.querySelectorAll('.chip').forEach(chip => chip.classList.toggle('on', chip.dataset.date === state.endDate));
    dateNote.textContent = state.endDate ? t('plan_trial_date_note', { date: longDate(state.endDate) }) : '';
    refresh();
  }

  async function save() {
    if (!ready()) return;
    button.busy(true);
    const body = { name: state.name, endDate: state.endDate };
    if (state.amount) { body.amount = state.amount; body.currency = state.currency; }
    const trial = await act(() => api.post('/plans/trials', body), { success: t('plan_trial_saved', { name: state.name, date: shortDate(state.endDate) }) });
    button.busy(false);
    if (trial) navigate(`/plans/trial/${trial.id}`, { replace: true });
  }

  return h('div', null,
    h('div', { class: 'section' }, h('div', { class: 'section-body' }, name, price, currencyRow)),
    h('div', { class: 'section' },
      h('div', { class: 'section-title' }, h('span', null, t('plan_trial_end'))),
      chips,
      h('div', { class: 'section-body' }, h('label', { class: 'field' }, h('span', { class: 'plan-field-label' }, t('plan_trial_end_pick')), dateInput)),
      dateNote));
}

export function registerSubscriptions() {
  route('/plans/subscriptions', (ctx) => {
    for (const topic of ['expenses', 'recurring', 'premium']) ctx.onChange(topic, ctx.refresh);
    return page({ title: t('plan_subs_title') }, async(() => api.get('/plans/subscriptions'), (data) => renderList(data, ctx), { lines: 6 }));
  }, { tab: 'plans' });

  route('/plans/subscription/:id', (ctx) => {
    ctx.onChange('recurring', ctx.refresh);
    const title = h('h1', { class: 'page-title plan-clamp' });
    const node = async(() => api.get(`/plans/subscriptions/${encodeURIComponent(ctx.params.id)}`), (data) => {
      title.textContent = data.sub.label;
      return renderSub(data, ctx);
    }, { lines: 6 });
    return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, title)), node);
  }, { tab: 'plans' });

  route('/plans/trials', (ctx) => {
    ctx.onChange('premium', ctx.refresh);
    return page({ title: t('plan_trials_title') }, async(() => api.get('/plans/trials'), renderTrials));
  }, { tab: 'plans' });

  route('/plans/trial/new', () => page({ title: t('plan_trial_new') }, async(() => api.get('/plans/trials'), renderTrialForm, { lines: 5 })),
    { tab: 'plans', tabs: false });

  route('/plans/trial/:id', (ctx) => {
    const title = h('h1', { class: 'page-title plan-clamp' });
    const node = async(() => api.get(`/plans/trials/${encodeURIComponent(ctx.params.id)}`), (data) => {
      title.textContent = data.trial.name;
      return renderTrial(data, ctx);
    }, { lines: 5 });
    return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, title)), node);
  }, { tab: 'plans' });
}

