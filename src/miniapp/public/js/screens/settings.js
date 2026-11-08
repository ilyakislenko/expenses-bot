// Настройки (⚙️ бота): язык, валюта и валюта дохода, часовой пояс, начало периода; напоминания и сводки;
// «😈 Злой режим». Валюта дохода — API раздела доходов, «Платежи утром» и «Предупреждать о списании» — API планов
import { route, changed } from '../core/router.js';
import { h, icon, page, section, row, async, toggle, pick, sheet, act, toast, skeleton, errorText } from '../core/ui.js';
import { t, me } from '../core/i18n.js';
import { api, ApiError } from '../core/api.js';
import { reloadMe } from '../core/session.js';
import { confirm, haptic } from '../core/tg.js';
import { hourLabel, botText, wrapped } from './profileKit.js';

// Смещения, которые можно выбрать: целые часы UTC−12…+14 и пояса с половиной часа (как кнопки бота)
const HALF_OFFSETS = [-570, -210, 210, 270, 330, 390, 570, 630];
const OFFSETS = [...Array.from({ length: 27 }, (_, i) => (i - 12) * 60), ...HALF_OFFSETS].sort((a, b) => a - b);

function offsetOf(timezone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
  } catch (error) {
    return 0;
  }
}
const utcLabel = (offset) => {
  const abs = Math.abs(offset);
  return `UTC${offset < 0 ? '−' : '+'}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`;
};
function timeAt(offset, now = new Date()) {
  const d = new Date(now.getTime() + offset * 60000);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
const pad = (n) => String(n).padStart(2, '0');

// Новые строки — и на вкладках (их подписи main.js рисует один раз)
function relabelTabs() {
  document.querySelectorAll('.tabbar .tab').forEach((tab) => {
    const label = tab.querySelector('span');
    if (label) label.textContent = t(`core_tab_${tab.dataset.tab}`);
  });
}

async function afterChange(ctx, { relabel = false } = {}) {
  await reloadMe().catch(() => null);
  if (relabel) relabelTabs();
  changed('settings');
  ctx.refresh();
}

function currencyName(code) {
  try {
    return new Intl.DisplayNames([me().locale], { type: 'currency' }).of(code);
  } catch (error) {
    return code;
  }
}

async function chooseCurrency(title, current) {
  return pick({ title, value: current, options: me().currencies.map(code => ({ value: code, label: code, subtitle: currencyName(code) })) });
}

async function chooseTimezone(ctx, timezone) {
  const now = new Date();
  const current = offsetOf(timezone, now);
  const device = -now.getTimezoneOffset();
  const order = OFFSETS.includes(device) ? [device, ...OFFSETS.filter(o => o !== device)] : OFFSETS;
  const offset = await pick({
    title: t('prof_tz_title'),
    value: current,
    options: order.map((o) => {
      const time = timeAt(o, now);
      return { value: o, label: `${pad(time.hour)}:${pad(time.minute)}`, subtitle: o === device ? `${utcLabel(o)} · ${t('prof_tz_device')}` : utcLabel(o) };
    })
  });
  if (offset === null || offset === current) return;
  const time = timeAt(offset);
  const saved = await act(() => api.put('/settings/timezone', { hour: time.hour, minute: time.minute, half: offset % 60 !== 0 }), { success: t('core_saved') });
  if (saved) await afterChange(ctx);
}

function settingsScreen(ctx) {
  ctx.onChange('settings', ctx.refresh);
  const load = () => Promise.all([
    api.get('/settings'),
    api.get('/income/currency').catch(() => null)
  ]);
  return async(load, ([s, income]) => {
    const language = s.languages.find(l => l.code === s.language) || { flag: '', name: s.language };
    const roastLevel = s.roast.levels.find(l => l.value === s.roast.level);
    const reminderValue = s.reminders.enabled ? (s.reminders.hours.map(hourLabel).join(', ') || '—') : t('prof_off');
    return page({ title: t('prof_settings_title') },
      section({},
        row({
          title: t('prof_settings_language'), value: `${language.flag} ${language.name}`,
          onClick: async () => {
            const code = await pick({ title: t('prof_settings_language'), value: s.language, options: s.languages.map(l => ({ value: l.code, label: `${l.flag} ${l.name}` })) });
            if (!code || code === s.language) return;
            if (await act(() => api.put('/settings/language', { language: code }))) await afterChange(ctx, { relabel: true });
          }
        }),
        row({
          title: t('prof_settings_currency'), subtitle: t('prof_settings_currency_hint'), value: s.currency,
          onClick: async () => {
            const code = await chooseCurrency(t('prof_settings_currency'), s.currency);
            if (!code || code === s.currency) return;
            if (await act(() => api.put('/settings/currency', { currency: code }), { success: t('core_saved') })) await afterChange(ctx);
          }
        }),
        income ? row({
          title: t('prof_settings_income_currency'), value: income.currency,
          onClick: async () => {
            const code = await chooseCurrency(t('prof_settings_income_currency'), income.currency);
            if (!code || code === income.currency) return;
            if (await act(() => api.put('/income/currency', { currency: code }), { success: t('core_saved') })) { changed('income'); ctx.refresh(); }
          }
        }) : null,
        row({ title: t('prof_settings_timezone'), value: s.timezoneLabel.replace(/^.*\((UTC[^)]*)\)$/, '$1'), onClick: () => chooseTimezone(ctx, s.timezone) }),
        row({
          title: t('prof_settings_period'), subtitle: t('prof_settings_period_hint'), value: t('prof_day_n', { n: s.startDay }),
          onClick: async () => {
            const day = await pick({ title: t('prof_settings_period'), value: s.startDay, options: Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: t('prof_day_n', { n: i + 1 }) })) });
            if (!day || day === s.startDay) return;
            if (await act(() => api.put('/settings/period-start', { day }), { success: t('core_saved') })) await afterChange(ctx);
          }
        })),
      section({},
        row({ title: t('prof_settings_reminders'), subtitle: reminderValue, href: '/settings/reminders' }),
        row({ title: t('prof_roast_title'), value: roastLevel ? roastLevel.label : '', href: '/settings/roast' }),
        row({ title: t('prof_settings_categories'), href: '/categories' })));
  });
}

// Сетка часов напоминаний: до трёх часов, каждое касание сохраняется сразу (как кнопки бота)
function reminderHoursSheet(state, onSaved) {
  const grid = h('div', { class: 'grid prof-hours' });
  const paint = () => {
    grid.replaceChildren(...Array.from({ length: 24 }, (_, hour) => h('button', {
      class: `tile${state.reminders.hours.includes(hour) ? ' on' : ''}`,
      onclick: async () => {
        haptic.tap();
        const has = state.reminders.hours.includes(hour);
        if (!has && state.reminders.hours.length >= state.reminders.max) { haptic.warn(); toast(t('error_reminder_hours_limit')); return; }
        const hours = has ? state.reminders.hours.filter(x => x !== hour) : [...state.reminders.hours, hour];
        const next = await act(() => api.put('/settings/reminders', { hours }));
        if (next) { Object.assign(state, next); paint(); onSaved(); }
      }
    }, h('span', null, hourLabel(hour)))));
    reset.hidden = !state.reminders.custom;
  };
  const reset = h('button', {
    class: 'btn plain',
    onclick: async () => {
      const next = await act(() => api.put('/settings/reminders', { hours: null }));
      if (next) { Object.assign(state, next); paint(); onSaved(); }
    }
  }, t('prof_rem_reset'));
  sheet({ title: t('prof_rem_hours'), content: h('div', null, h('div', { class: 'section-footer' }, t('prof_rem_hours_hint', { max: state.reminders.max })), grid, reset) });
  paint();
}

function remindersScreen() {
  const box = h('div', null, skeleton(6));
  let state = null;
  let plans = null;

  const put = async (path, body, apply) => {
    const next = await act(() => api.put(path, body));
    if (next) { apply(next); changed('settings'); }
    paint(); // и при ошибке: переключатель возвращается к сохранённому
  };
  const toggleRow = (title, subtitle, checked, onChange) => row({ title, subtitle, trailing: toggle(checked, onChange) });

  function paint() {
    const s = state;
    const insightNow = async () => {
      const data = await act(() => api.get('/settings/weekly-insight'));
      if (!data) return;
      if (!data.text) { toast(t('prof_insight_empty')); return; }
      sheet({ title: t('prof_rem_weekly'), content: h('div', { class: 'prof-sheet-text' }, botText(data.text)) });
    };
    box.replaceChildren(page({ title: t('prof_settings_reminders') },
      section({},
        toggleRow(t('prof_rem_record'), t('prof_rem_record_hint'), s.reminders.enabled,
          (v) => put('/settings/reminders', { enabled: v }, (n) => Object.assign(s, n))),
        s.reminders.enabled ? row({
          title: t('prof_rem_time'), value: s.reminders.hours.map(hourLabel).join(', ') || '—',
          onClick: () => reminderHoursSheet(s, () => paint())
        }) : null),
      section({},
        toggleRow(t('prof_rem_daily'), t('prof_rem_daily_hint'), s.dailySummary.enabled,
          (v) => put('/settings/daily-summary', { enabled: v }, (n) => Object.assign(s, n))),
        s.dailySummary.enabled ? row({
          title: t('prof_rem_time'), value: hourLabel(s.dailySummary.hour),
          onClick: async () => {
            const hour = await pick({ title: t('prof_rem_daily'), value: s.dailySummary.hour, options: Array.from({ length: 24 }, (_, i) => ({ value: i, label: hourLabel(i) })) });
            if (hour !== null && hour !== s.dailySummary.hour) put('/settings/daily-summary', { hour }, (n) => Object.assign(s, n));
          }
        }) : null,
        toggleRow(t('prof_rem_weekly'), t('prof_rem_weekly_hint'), s.weeklyInsight,
          (v) => put('/settings/weekly-insight', { enabled: v }, (n) => Object.assign(s, n))),
        row({ title: t('prof_rem_weekly_now'), onClick: insightNow })),
      section({},
        toggleRow(t('prof_rem_plan'), t('prof_rem_plan_hint'), s.dailyPlan.enabled,
          (v) => put('/settings/daily-plan', { enabled: v }, (n) => { s.dailyPlan = n; })),
        s.dailyPlan.enabled ? row({
          title: t('prof_rem_time'), value: hourLabel(s.dailyPlan.hour),
          onClick: async () => {
            const hour = await pick({ title: t('prof_rem_plan'), value: s.dailyPlan.hour, options: s.dailyPlan.hours.map(i => ({ value: i, label: hourLabel(i) })) });
            if (hour !== null && hour !== s.dailyPlan.hour) put('/settings/daily-plan', { hour }, (n) => { s.dailyPlan = n; });
          }
        }) : null),
      plans ? section({},
        toggleRow(t('prof_rem_bills'), t('prof_rem_bills_hint'), plans.bills,
          (v) => put('/plans/reminders', { bills: v }, (n) => { plans = n; })),
        toggleRow(t('prof_rem_subwarn'), t('prof_rem_subwarn_hint'), plans.subWarn.enabled,
          (v) => put('/plans/reminders', { subWarn: v }, (n) => { plans = n; })),
        plans.subWarn.enabled ? row({
          title: t('prof_rem_subwarn_days'), value: t('prof_days_before', { n: plans.subWarn.days }),
          onClick: async () => {
            const days = await pick({ title: t('prof_rem_subwarn_days'), value: plans.subWarn.days, options: plans.subWarn.options.map(d => ({ value: d, label: t('prof_days_before', { n: d }) })) });
            if (days !== null && days !== plans.subWarn.days) put('/plans/reminders', { subWarnDays: days }, (n) => { plans = n; });
          }
        }) : null) : null,
      section({},
        toggleRow(t('prof_rem_quiz'), t('prof_rem_quiz_hint'), s.quizInvites,
          (v) => put('/settings/quiz-invites', { enabled: v }, (n) => Object.assign(s, n))))));
  }

  Promise.all([api.get('/settings'), api.get('/plans/reminders').catch(() => null)]).then(([s, p]) => {
    state = s;
    plans = p && p.subWarn ? p : null;
    paint();
  }, (error) => box.replaceChildren(h('div', { class: 'error-box' }, h('div', null, errorText(error)))));
  return box;
}

// «😈 Злой режим»: уровень (выбор — сразу), обращение; «без цензуры» — после подтверждения 18+
function roastScreen() {
  const box = h('div', null, skeleton(4));
  let roast = null;
  let sample = null;

  async function chooseGender(title) {
    return pick({ title, value: roast.gender, options: roast.genders.map(g => ({ value: g.value, label: g.label })) });
  }

  async function setLevel(level) {
    if (level === roast.level) return;
    const body = { level };
    if (level !== 'off' && !roast.gender) {
      const gender = await chooseGender(t('prof_roast_gender_first'));
      if (!gender) return;
      body.gender = gender;
    }
    let result;
    try {
      result = await api.put('/settings/roast', body);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'roast_adult_required') {
        if (!(await confirm(t('prof_roast_adult')))) return;
        result = await act(() => api.put('/settings/roast', { ...body, adult: true }));
      } else {
        result = await act(() => Promise.reject(error));
      }
    }
    if (!result) return;
    haptic.success();
    roast = result;
    sample = result.sample;
    changed('settings');
    paint();
  }

  function paint() {
    const descriptions = { off: t('prof_roast_off'), spicy: t('prof_roast_spicy'), savage: t('prof_roast_savage') };
    const gender = roast.genders.find(g => g.value === roast.gender);
    box.replaceChildren(page({ title: t('prof_roast_title'), subtitle: t('prof_roast_intro') },
      section({ footer: sample ? h('div', null, h('div', null, t('prof_roast_sample')), h('div', { class: 'prof-quote' }, sample)) : null },
        roast.levels.map(l => row({
          title: l.label, subtitle: descriptions[l.value],
          trailing: l.value === roast.level ? icon('check', { cls: 'row-chevron' }) : null,
          onClick: () => setLevel(l.value)
        }))),
      section({},
        row({
          title: t('prof_roast_gender'), value: gender ? gender.label : t('prof_roast_gender_unset'),
          onClick: async () => {
            const value = await chooseGender(t('prof_roast_gender'));
            if (!value || value === roast.gender) return;
            const result = await act(() => api.put('/settings/roast', { gender: value }), { success: t('core_saved') });
            if (result) { roast = result; paint(); }
          }
        }))));
  }

  api.get('/settings').then((s) => { roast = s.roast; paint(); },
    (error) => box.replaceChildren(h('div', { class: 'error-box' }, h('div', null, errorText(error)))));
  return box;
}

export function register() {
  route('/settings', wrapped(settingsScreen), { tab: 'more' });
  route('/settings/reminders', wrapped(remindersScreen), { tab: 'more' });
  route('/settings/roast', wrapped(roastScreen), { tab: 'more' });
}
