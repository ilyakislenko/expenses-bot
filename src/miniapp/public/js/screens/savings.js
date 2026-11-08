// Вкладка «Копилка»: накопления, счета, цели, долги (главный экран); карточка копилки, добавление, мастер
// «Обновить остатки», прогноз, сценарии и настройки прогноза — в соседних модулях savings-*.js. Данные — /api/savings.
import { h, page, section, row, avatar, progress, empty, async } from '../core/ui.js';
import { route, navigate, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { t, money, moneyRound, compact, signedMoney } from '../core/i18n.js';
import { mainButton } from '../core/tg.js';
import { act } from '../core/ui.js';
import { potName, duration, monthYear, rate, amountSheet, report } from './savings-common.js';
import { registerPot } from './savings-pot.js';
import { registerNew } from './savings-new.js';
import { registerUpdate } from './savings-update.js';
import { registerForecast, monthlySheet } from './savings-forecast.js';

export function register() {
  route('/savings', home, { tab: 'savings', root: true });
  registerPot();
  registerNew();
  registerUpdate();
  registerForecast();
}

function home(ctx) {
  ctx.onChange('savings', ctx.refresh);
  return async(() => api.get('/savings'), (data) => render(data));
}

function accountRow(pot, currency) {
  const notes = [];
  if (pot.currency !== currency && pot.balance > 0) notes.push(`≈ ${moneyRound(pot.balanceMain, currency)}`);
  if (pot.yieldRate > 0) notes.push(rate(pot.yieldRate));
  return row({
    avatar: avatar(pot.icon), title: potName(pot), subtitle: notes.join(' · ') || null,
    value: money(pot.balance, pot.currency), href: `/savings/pot/${pot.id}`
  });
}

function goalRow(goal) {
  const { status } = goal;
  const percent = Math.min(100, Math.floor(status.ratio * 100));
  let note = null;
  if (status.achieved) note = t('sav_goal_done');
  else if (status.etaNominal !== null) note = `≈ ${duration(status.etaNominal)}`;
  return row({
    avatar: avatar(goal.icon), title: goal.name,
    subtitle: h('span', { class: 'sav-goal-sub' }, progress(Math.min(1, status.ratio), { tone: status.achieved ? 'good' : 'accent' }), note),
    value: `${percent}%`, valueTone: status.achieved ? 'good' : null, href: `/savings/pot/${goal.id}`
  });
}

function debtRow(debt, today) {
  const notes = [];
  if (debt.yieldRate) notes.push(rate(debt.yieldRate));
  const { plan } = debt;
  if (plan.paidOff && plan.months > 0) notes.push(t('sav_until', { date: monthYear(today, plan.months) }));
  const paid = plan.paidOff && plan.months === 0;
  return row({
    avatar: avatar(debt.icon), title: debt.name, subtitle: notes.join(' · ') || null,
    value: paid ? t('sav_debt_paid_short') : money(debt.balance, debt.currency), valueTone: paid ? 'good' : null,
    href: `/savings/pot/${debt.id}`
  });
}

// «Указать сумму накоплений» в общей копилке (пустое состояние)
function setGeneral(data) {
  amountSheet({
    title: t('sav_set_total'), currency: data.currency, currencies: true, button: t('sav_save'),
    submit: (amount, currency) => act(async () => {
      const result = await api.post(`/savings/pots/${data.generalId}/balance`, { op: 'set', amount, currency });
      changed('savings');
      report(t('sav_saved'), result);
      return result;
    })
  });
}

function render(data) {
  const { currency } = data;
  if (data.empty) {
    mainButton.push({ text: t('sav_set_total'), onClick: () => setGeneral(data) });
    // Главное — общая сумма (MainButton); счёт — плюсом в заголовке, без второй заливной кнопки
    return page({ title: t('sav_title'), action: { icon: 'plus', label: t('sav_add_account'), onClick: () => navigate('/savings/new?kind=account') } },
      empty({ icon: 'piggy', title: t('sav_empty_title'), text: t('sav_empty_text') }));
  }
  if (data.canUpdate) mainButton.push({ text: t('sav_update'), onClick: () => navigate('/savings/update') });

  const monthly = data.monthly.amount;

  return page({ title: t('sav_title'), action: { icon: 'plus', label: t('sav_add'), onClick: () => navigate('/savings/new') } },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('sav_total')),
      h('div', { class: 'hero-value' }, moneyRound(data.total, currency)),
      data.debts.length ? h('div', { class: 'hero-note' }, t('sav_debts_net', { debts: moneyRound(data.debtTotal, currency), net: moneyRound(data.netWorth, currency) })) : null),
    section({ title: t('sav_accounts') }, data.accounts.map(pot => accountRow(pot, currency))),
    section({ title: t('sav_goals'), footer: data.sharedGoals ? sharedNote(data.sharedGoals, currency) : null }, data.goals.map(goalRow)),
    section({ title: t('sav_debts') }, data.debts.map(debt => debtRow(debt, data.today))),
    section({},
      row({
        avatar: avatar('chart'), title: t(monthly === null ? 'sav_forecast' : 'sav_in_year'),
        subtitle: monthly === null ? null : t('sav_per_month', { amount: signedMoney(monthly, currency) }),
        value: data.yearAhead === null ? null : `≈ ${compact(data.yearAhead)}`, href: '/savings/forecast'
      }),
      monthly === null ? row({ avatar: avatar('wallet'), title: t('sav_set_monthly'), tone: 'accent', onClick: () => monthlySheet({ monthly: data.monthly, currency }) }) : null,
      row({ avatar: avatar('sparkles'), title: t('sav_scenarios'), href: '/savings/scenarios' }),
      row({ avatar: avatar('settings'), title: t('sav_settings'), href: '/savings/settings' })));
}

// Несколько целей «от всех накоплений» считают одни и те же деньги — честно пишем, сколько нужно на все сразу
function sharedNote(shared, currency) {
  const params = { count: shared.count, need: moneyRound(shared.need, currency), short: moneyRound(shared.short, currency) };
  return t(shared.short > 0 ? 'sav_shared_goals_short' : 'sav_shared_goals', params);
}
