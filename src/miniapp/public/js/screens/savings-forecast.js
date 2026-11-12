// Прогноз накоплений (/savings/forecast), сценарии с ползунками (/savings/scenarios) и настройки прогноза
// (/savings/settings). Кривые сценариев считает браузер тем же utils/savingsForecast.js, что и бот (window.savingsForecast).
import { h, page, section, row, avatar, segmented, empty, async, act } from '../core/ui.js';
import { lineChart, legend } from '../core/charts.js';
import { route, navigate, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { t, moneyRound, compact } from '../core/i18n.js';
import { haptic } from '../core/tg.js';
import { duration, monthAxis, rate, amountSheet, valueSheet, parseRate, report } from './savings-common.js';

const HORIZONS = [6, 12, 36, 60, 120];
const YEARS = [1, 2, 3, 5];
const SCENARIO_COLORS = { average: 'var(--c2)', plan: 'var(--c5)', current: 'var(--c1)' };
const MINE_COLOR = 'var(--c3)';

export function registerForecast() {
  route('/savings/forecast', forecastScreen, { tab: 'savings' });
  route('/savings/scenarios', scenariosScreen, { tab: 'savings' });
  route('/savings/settings', settingsScreen, { tab: 'savings' });
}

// «Сколько откладываю в месяц»: вручную или «Считать автоматически» (доходы − траты)
export function monthlySheet({ monthly, currency }) {
  const hint = monthly.source === 'auto'
    ? t('sav_monthly_auto_hint', { amount: moneyRound(monthly.amount, currency), n: monthly.periods })
    : t('sav_monthly_hint');
  amountSheet({
    title: t('sav_monthly_title'), hint, currency, allowZero: true,
    value: monthly.source === 'manual' ? monthly.amount : '', button: t('sav_save'),
    secondary: monthly.source === 'manual' ? {
      text: t('sav_monthly_auto_button'),
      onClick: () => act(async () => { const r = await api.patch('/savings/settings', { monthly: null }); changed('savings'); report(t('sav_monthly_auto_set')); return r; })
    } : null,
    submit: (amount) => act(async () => {
      const r = await api.patch('/savings/settings', { monthly: amount });
      changed('savings');
      report(t('sav_monthly_set', { amount: moneyRound(amount, currency) }));
      return r;
    })
  });
}

function monthlyValue(monthly, currency) {
  if (monthly.source === null) return t('sav_unknown');
  return `${monthly.source === 'auto' ? '~' : ''}${moneyRound(monthly.amount, currency)}`;
}

function monthlySubtitle(monthly, currency) {
  if (monthly.source === 'manual') return t('sav_monthly_manual');
  if (monthly.source === 'auto') {
    return monthly.amount < 0 ? t('sav_overspending_short') : t('sav_monthly_auto', { n: monthly.periods });
  }
  return t('sav_monthly_unknown_hint');
}

function ratesSummary(settings) {
  const parts = [];
  if (settings.yieldRate > 0) parts.push(t('sav_rate_short', { value: rate(settings.yieldRate) }));
  if (settings.inflationRate > 0) parts.push(t('sav_inflation_short', { value: rate(settings.inflationRate) }));
  if (settings.contributionGrowth > 0) parts.push(t('sav_growth_short', { value: rate(settings.contributionGrowth) }));
  return parts.join(' · ');
}

// ── Прогноз ────────────────────────────────────────────────────────────────

function forecastScreen(ctx) {
  ctx.onChange('savings', ctx.refresh);
  const months = HORIZONS.includes(Number(ctx.query.m)) ? Number(ctx.query.m) : 12;
  return async(() => api.get('/savings/forecast'), (data) => forecast(data, months));
}

function forecast(data, initial) {
  const { currency, savings, debts, settings, monthly } = data;
  const inflation = settings.inflationRate > 0 && savings;
  const view = h('div');
  const draw = (months) => {
    const k = (values) => values[months];
    const hero = h('div', { class: 'hero' });
    if (savings) {
      hero.append(...[
        h('div', { class: 'hero-label' }, t(`sav_in_${months}`)),
        h('div', { class: 'hero-value' }, `≈ ${compact(k(savings.nominal))}`),
        inflation ? h('div', { class: 'hero-note' }, t('sav_today_money', { amount: compact(k(savings.real)) })) : null].filter(Boolean));
    } else {
      hero.append(h('div', { class: 'hero-label' }, t('sav_now')), h('div', { class: 'hero-value' }, moneyRound(data.total, currency)));
    }
    if (debts) {
      const capital = savings ? k(savings.nominal) - k(debts) : null;
      hero.append(h('div', { class: 'hero-note' }, capital === null
        ? t('sav_debts_in', { debts: compact(k(debts)) })
        : t('sav_debts_net', { debts: compact(k(debts)), net: compact(capital) })));
    }
    const series = [];
    if (savings) series.push({ label: t('sav_series_savings'), values: savings.nominal.slice(0, months + 1), color: 'var(--c1)', area: !debts });
    if (inflation) series.push({ label: t('sav_series_real'), values: savings.real.slice(0, months + 1), color: 'var(--c6)', dash: '5 4', width: 1.5 });
    if (debts) series.push({ label: t('sav_series_debts'), values: debts.slice(0, months + 1), color: 'var(--c2)' });
    // Капитал на графике — только пока он не уходит в минус (ось — от нуля); число всегда есть в сводке сверху
    const capitalValues = debts && savings ? savings.nominal.slice(0, months + 1).map((v, i) => v - debts[i]) : null;
    if (capitalValues && capitalValues.every(v => v >= 0)) series.push({ label: t('sav_series_capital'), values: capitalValues, color: 'var(--c3)', width: 1.5 });
    const chart = series.length ? h('div', { class: 'card' },
      lineChart({ labels: monthAxis(data.today, months), series, format: (v) => compact(v) }),
      series.length > 1 ? legend(series.map(s => ({ label: s.label, color: s.color, dash: !!s.dash }))) : null) : null;
    const depleted = savings && savings.depletedAt !== null && savings.depletedAt <= months
      ? h('div', { class: 'sav-text tone-warn' }, t('sav_depleted', { duration: duration(savings.depletedAt) })) : null;
    view.replaceChildren(...[
      segmented(HORIZONS.map(m => ({ value: m, label: t(`sav_h_${m}`) })), months, (m) => draw(m)),
      hero, chart, depleted].filter(Boolean));
  };
  draw(initial);

  const notes = [];
  if (savings && (settings.yieldRate > 0 || settings.inflationRate > 0 || settings.contributionGrowth > 0 || data.ownRates)) notes.push(t('sav_forecast_legend'));
  if (debts) notes.push(t('sav_forecast_debts_note'));
  return page({ title: t('sav_forecast') },
    view,
    section({ footer: notes.join(' ') || null },
      row({ avatar: avatar('wallet'), title: t('sav_monthly_title'), subtitle: monthlySubtitle(monthly, currency), value: monthlyValue(monthly, currency), onClick: () => monthlySheet({ monthly, currency }) }),
      row({ avatar: avatar('percent'), title: t('sav_rates'), subtitle: ratesSummary(settings) || t('sav_rates_not_set'), href: '/savings/settings' }),
      row({ avatar: avatar('sparkles'), title: t('sav_scenarios'), href: '/savings/scenarios' })));
}

// ── Сценарии ───────────────────────────────────────────────────────────────

function scenariosScreen(ctx) {
  ctx.onChange('savings', ctx.refresh);
  ctx.onChange('income', ctx.refresh);
  return async(() => api.get('/savings/scenarios'), (data) => scenarios(data));
}

function scenarios(data) {
  if (!data.income) {
    return page({ title: t('sav_scenarios') },
      empty({ icon: 'income', title: t('sav_scen_no_income_title'), text: t('sav_scen_no_income'), action: { text: t('sav_add_income'), onClick: () => navigate('/income/new') } }));
  }
  if (!data.scenarios.length) {
    return page({ title: t('sav_scenarios') }, empty({ icon: 'chart', title: t('sav_scen_no_spending_title'), text: t('sav_scen_no_spending') }));
  }
  // Сценарий по умолчанию выбирает сервер (SavingsScenarioService) — по нему же взнос «авто» в прогнозе
  const state = { base: data.base, spendingPct: 0, incomePct: 0, years: 1 };
  const simulate = (monthly, months) => window.savingsForecast.simulate({ parts: data.parts, monthly, months, ...data.rates }).points.map(p => p.nominal);

  const hero = h('div', { class: 'hero' });
  const chartBox = h('div', { class: 'card' });
  const spending = slider(-50, 50, 1, () => state.spendingPct, (v) => { state.spendingPct = v; update(); });
  const income = slider(-50, 100, 5, () => state.incomePct, (v) => { state.incomePct = v; update(); });
  const reset = h('button', { class: 'btn plain', onclick: () => { haptic.tap(); state.spendingPct = 0; state.incomePct = 0; spending.set(0); income.set(0); update(); } }, t('sav_reset'));
  const baseBox = h('div', { class: 'sav-compact' });
  const yearsBox = h('div');

  function controls() {
    baseBox.replaceChildren(segmented(data.scenarios.map(s => ({ value: s.key, label: t(`sav_scen_${s.key}`) })), state.base, (v) => { state.base = v; controls(); update(); }));
    yearsBox.replaceChildren(segmented(YEARS.map(n => ({ value: n, label: t(`sav_years_${n}`) })), state.years, (v) => { state.years = v; controls(); update(); }));
  }

  function update() {
    const months = state.years * 12;
    const base = data.scenarios.find(s => s.key === state.base);
    const monthlyIncome = data.income.amount * (1 + state.incomePct / 100);
    const monthlySpending = base.spending * (1 + state.spendingPct / 100);
    const monthly = monthlyIncome - monthlySpending;
    const lines = data.scenarios.map(s => ({ key: s.key, label: t(`sav_scen_${s.key}`), color: SCENARIO_COLORS[s.key], dash: s.key === 'plan' ? '6 5' : null, width: 1.5, values: simulate(data.income.amount - s.spending, months) }));
    const changedMine = state.incomePct !== 0 || state.spendingPct !== 0;
    const mine = simulate(monthly, months);
    if (changedMine) lines.push({ label: t('sav_scen_mine'), color: MINE_COLOR, width: 3, values: mine });
    const baseLine = lines.find(l => l.key === state.base);

    hero.replaceChildren(...[
      h('div', { class: 'hero-label' }, t('sav_scen_result', { period: t(`sav_years_${state.years}`) })),
      h('div', { class: 'hero-value' }, compact(mine[months])),
      h('div', { class: 'hero-note' }, monthly >= 0 ? t('sav_scen_monthly', { amount: compact(monthly) }) : t('sav_scen_monthly_negative', { amount: compact(-monthly) })),
      changedMine ? h('div', { class: `hero-note ${mine[months] >= baseLine.values[months] ? 'tone-good' : 'tone-bad'}` },
        t('sav_scen_vs_base', { delta: `${mine[months] >= baseLine.values[months] ? '+' : '−'}${compact(Math.abs(mine[months] - baseLine.values[months]))}`, base: t(`sav_scen_${state.base}`) })) : null].filter(Boolean));
    chartBox.replaceChildren(
      lineChart({ labels: monthAxis(data.today, months), series: lines, format: (v) => compact(v) }),
      legend(lines.map(l => ({ label: l.label, color: l.color, dash: !!l.dash }))));
    spending.label(t('sav_scen_spending', { amount: compact(monthlySpending) }));
    income.label(t('sav_scen_income', { amount: compact(monthlyIncome) }));
    reset.classList.toggle('hidden', !changedMine);
  }

  controls();
  update();
  return page({ title: t('sav_scenarios'), subtitle: data.family ? t('sav_scen_family') : null },
    hero,
    chartBox,
    h('div', { class: 'sav-label' }, t('sav_scen_base')),
    baseBox,
    h('div', { class: 'card sav-sliders' }, spending.node, income.node),
    h('div', { class: 'sav-label' }, t('sav_horizon')),
    yearsBox,
    reset,
    data.rates.yieldRate > 0 || data.rates.inflationRate > 0 || data.rates.contributionGrowth > 0 ? h('div', { class: 'sav-text' }, t('sav_scen_rates')) : null);
}

// Ползунок в процентах: подпись «Траты: 160 тыс ₽ в месяц» и «−10%»
function slider(min, max, step, get, set) {
  const title = h('span');
  const value = h('span', { class: 'muted' });
  const input = h('input', {
    type: 'range', class: 'sav-range', min, max, step, value: String(get()),
    oninput: (e) => { const v = Number(e.target.value); if (v !== get()) { haptic.tap(); set(v); } }
  });
  const node = h('div', { class: 'sav-slider' }, h('div', { class: 'sav-slider-head' }, title, value), input);
  return {
    node,
    set(v) { input.value = String(v); },
    label(text) {
      const pct = get();
      title.textContent = text;
      value.textContent = `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
    }
  };
}

// ── Настройки прогноза ─────────────────────────────────────────────────────

function settingsScreen(ctx) {
  ctx.onChange('savings', ctx.refresh);
  return async(() => api.get('/savings/settings'), (data) => settingsView(data));
}

function settingsView(data) {
  const { currency, settings, limits, monthly } = data;
  const value = (v) => (v > 0 ? rate(v) : t('sav_not_set_dash'));
  const rateRow = (key, title, hint) => row({
    title, value: value(settings[key]),
    onClick: () => valueSheet({
      title, value: settings[key] > 0 ? settings[key] : '', inputmode: 'decimal', placeholder: '0',
      hint: t(hint, { max: limits[key] }), button: t('sav_save'), parse: parseRate(limits[key]),
      submit: (v) => act(async () => { const r = await api.patch('/savings/settings', { [key]: v }); changed('savings'); report(t('sav_saved')); return r; })
    })
  });
  return page({ title: t('sav_settings') },
    section({ footer: t('sav_settings_monthly_hint') },
      row({ title: t('sav_monthly_title'), subtitle: monthlySubtitle(monthly, currency), value: monthlyValue(monthly, currency), onClick: () => monthlySheet({ monthly, currency }) })),
    section({ footer: t('sav_settings_rates_hint') },
      rateRow('yieldRate', t('sav_default_rate'), 'sav_default_rate_hint'),
      rateRow('inflationRate', t('sav_inflation'), 'sav_inflation_hint'),
      rateRow('contributionGrowth', t('sav_growth'), 'sav_growth_hint')));
}
