// Карточка копилки /savings/pot/:id: счёт (общая копилка), цель или долг — сумма, ставка, сроки, график, история,
// действия (пополнить, снять, новая сумма, перевести / погасить, увеличить) и настройки шторками.
import { h, page, section, row, avatar, progress, toggle, async, act, pick, confirmDelete, toast } from '../core/ui.js';
import { lineChart, legend } from '../core/charts.js';
import { route, navigate, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { t, me, money, moneyRound, compact, dayLabel, time, longDate, addDays } from '../core/i18n.js';
import { mainButton, confirm } from '../core/tg.js';
import { potName, duration, monthYear, monthAxis, rate, amountSheet, valueSheet, parseRate, parseNumber, report } from './savings-common.js';
import { monthlySheet } from './savings-forecast.js';

const MAX_RATE = 300;

export function registerPot() {
  route('/savings/pot/:id', (ctx) => {
    ctx.onChange('savings', ctx.refresh);
    return async(() => api.get(`/savings/pots/${encodeURIComponent(ctx.params.id)}`), (data) => {
      if (data.pot.kind === 'goal') return goalCard(data);
      if (data.pot.kind === 'debt') return debtCard(data);
      return accountCard(data);
    });
  }, { tab: 'savings' });
}

const done = (result) => { changed('savings'); return result; };

// ── Действия с суммой ──────────────────────────────────────────────────────

function balanceSheet(pot, op) {
  const titles = { deposit: 'sav_deposit', withdraw: 'sav_withdraw', set: 'sav_new_amount' };
  const success = { deposit: 'sav_deposited', withdraw: 'sav_withdrawn', set: 'sav_amount_set' };
  amountSheet({
    title: t(titles[op]),
    hint: t(op === 'set' ? 'sav_now_recorded' : 'sav_now_there', { amount: money(pot.balance, pot.currency) }),
    currency: pot.currency, currencies: true, allowZero: op === 'set', value: op === 'set' ? pot.balance : '',
    button: t(titles[op]),
    submit: (amount, currency) => act(async () => {
      const result = await api.post(`/savings/pots/${pot.id}/balance`, { op, amount, currency });
      report(t(success[op], { amount: money(op === 'set' ? result.pot.balance : result.amount, pot.currency) }), result);
      return done(result);
    })
  });
}

async function transferFlow(pot, targets) {
  const to = await pick({
    title: t('sav_transfer_where'),
    options: targets.map(p => ({ value: p.id, label: potName(p), subtitle: money(p.balance, p.currency), avatar: avatar(p.icon, { small: true }) }))
  });
  if (!to) return;
  const target = targets.find(p => p.id === to);
  amountSheet({
    title: t('sav_transfer_to', { name: potName(target) }),
    hint: t('sav_available', { amount: money(pot.balance, pot.currency) }),
    currency: pot.currency, button: t('sav_transfer'),
    submit: (amount) => act(async () => {
      const result = await api.post(`/savings/pots/${pot.id}/transfer`, { to, amount });
      report(t('sav_transferred', { amount: money(result.amountTo, result.to.currency), name: potName(result.to) }), result);
      return done(result);
    })
  });
}

function debtSheet(debt, op) {
  const titles = { pay: 'sav_debt_pay', increase: 'sav_debt_increase', set: 'sav_new_amount' };
  const success = { pay: 'sav_debt_paid', increase: 'sav_debt_increased', set: 'sav_amount_set' };
  const hint = op === 'pay' ? `${t('sav_debt_left', { amount: money(debt.balance, debt.currency) })}. ${t('sav_debt_pay_hint')}`
    : t(op === 'set' ? 'sav_debt_set_hint' : 'sav_now_there', { amount: money(debt.balance, debt.currency) });
  amountSheet({
    title: t(titles[op]), hint, currency: debt.currency, currencies: true, allowZero: op === 'set',
    value: op === 'set' ? debt.balance : '', button: t(titles[op]),
    submit: (amount, currency) => act(async () => {
      const result = await api.post(`/savings/pots/${debt.id}/debt`, { op, amount, currency });
      report(t(success[op], { amount: money(op === 'set' ? result.pot.balance : result.amount, debt.currency) }), result);
      return done(result);
    })
  });
}

// Изменение настроек копилки (PATCH) с тостом
const patch = (pot, body, text = t('sav_saved')) => act(async () => {
  const result = await api.patch(`/savings/pots/${pot.id}`, body);
  report(text, result);
  return done(result);
});

function nameSheet(pot) {
  valueSheet({
    title: t('sav_name'), value: potName(pot), button: t('sav_save'), placeholder: potName(pot),
    parse: (v) => (v.trim() && v.trim().length <= 60 ? v.trim() : undefined),
    submit: (name) => patch(pot, { name })
  });
}

async function remove(pot, text) {
  if (!await confirmDelete(text)) return;
  const result = await act(() => api.del(`/savings/pots/${pot.id}`));
  if (!result) return;
  changed('savings');
  toast(result.moved > 0 ? t('sav_moved_general', { amount: money(result.moved, result.currency) }) : t('sav_deleted'));
  navigate('/savings', { replace: true });
}

// ── История ────────────────────────────────────────────────────────────────

function historySection(data) {
  const { pot } = data;
  const debt = pot.kind === 'debt';
  const label = (op) => {
    if (op.kind === 'set') return t('sav_op_set');
    if (op.kind === 'transfer') return t('sav_op_transfer');
    if (debt) return t(op.amount < 0 ? 'sav_op_paid' : 'sav_op_increased');
    return t(op.amount < 0 ? 'sav_op_withdraw' : 'sav_op_deposit');
  };
  const signed = (amount) => `${amount >= 0 ? '+' : '−'}${money(Math.abs(amount), pot.currency)}`;
  return section({ title: t('sav_history') }, data.operations.map(op => row({
    title: label(op), subtitle: `${dayLabel(op.date)}, ${time(op.createdAt)}`,
    value: signed(op.amount), valueTone: (debt ? op.amount < 0 : op.amount > 0) ? 'good' : null
  })));
}

function chartCard(chart, today, { label, color = 'var(--c1)', target = null, marker = null }) {
  const months = chart.values.length - 1;
  const series = [{ label, values: chart.values, color, area: true }];
  if (target !== null) series.push({ label: t('sav_goal_target_short'), values: chart.values.map(() => target), color: 'var(--c3)', dash: '5 4', width: 1.5 });
  return h('div', { class: 'card' },
    lineChart({ labels: monthAxis(today, months), series, marker, format: (v) => compact(v) }),
    target !== null ? legend([{ label, color }, { label: t('sav_goal_target_short'), color: 'var(--c3)', dash: true }]) : null);
}

// ── Счёт и общая копилка ───────────────────────────────────────────────────

function rateLine(pot, settings) {
  if (pot.yieldRate === null && settings.yieldRate > 0) return t('sav_rate_default', { value: rate(settings.yieldRate) });
  if (!pot.yieldRate) return t('sav_rate_none');
  return t('sav_rate_own', { value: rate(pot.yieldRate) });
}

function accountCard(data) {
  const { pot, currency, settings } = data;
  mainButton.push({ text: t('sav_new_amount'), onClick: () => balanceSheet(pot, 'set') });
  const other = pot.currency !== currency && pot.balance > 0;
  const rateValue = pot.yieldRate === null ? t('sav_rate_as_settings') : (pot.yieldRate ? rate(pot.yieldRate) : t('sav_rate_zero'));
  return page({ title: potName(pot) },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-value' }, money(pot.balance, pot.currency)),
      h('div', { class: 'hero-note' }, [other ? `≈ ${moneyRound(pot.balanceMain, currency)}` : null, rateLine(pot, settings), t('sav_updated', { date: dayLabel(data.updated) })].filter(Boolean).join(' · '))),
    section({},
      row({ avatar: avatar('income'), title: t('sav_deposit'), onClick: () => balanceSheet(pot, 'deposit') }),
      row({ avatar: avatar('expense'), title: t('sav_withdraw'), onClick: () => balanceSheet(pot, 'withdraw') }),
      data.transferTargets.length ? row({ avatar: avatar('repeat'), title: t('sav_transfer'), onClick: () => transferFlow(pot, data.transferTargets) }) : null),
    historySection(data),
    section({ title: t('sav_settings_short') },
      row({ title: t('sav_name'), value: potName(pot), onClick: () => nameSheet(pot) }),
      row({
        title: t('sav_rate'), value: rateValue,
        onClick: () => valueSheet({
          title: t('sav_rate_title'), value: pot.yieldRate ?? '', inputmode: 'decimal', placeholder: '0',
          hint: t('sav_rate_hint'), button: t('sav_save'), parse: parseRate(MAX_RATE),
          secondary: pot.yieldRate !== null ? { text: t('sav_rate_as_settings_button'), onClick: () => patch(pot, { yieldRate: null }) } : null,
          submit: (value) => patch(pot, { yieldRate: value })
        })
      }),
      pot.kind === 'account' && pot.balance === 0 ? row({
        title: t('sav_currency'), value: pot.currency,
        onClick: async () => {
          const code = await pick({ title: t('sav_currency'), value: pot.currency, options: me().currencies.map(c => ({ value: c, label: c })) });
          if (code && code !== pot.currency) await patch(pot, { currency: code });
        }
      }) : null),
    pot.kind === 'account' ? section({}, row({
      title: t('sav_delete_account'), tone: 'danger', chevron: false,
      onClick: () => remove(pot, [t('sav_delete_account_confirm', { name: potName(pot) }), pot.balance > 0 ? t('sav_delete_moves', { amount: money(pot.balance, pot.currency) }) : null].filter(Boolean).join('\n'))
    })) : null);
}

// ── Цель ───────────────────────────────────────────────────────────────────

function goalCard(data) {
  const { pot: goal, status, currency, today, monthly, settings } = data;
  const own = goal.mode === 'own';
  const percent = Math.min(100, Math.floor(status.ratio * 100));
  if (own) mainButton.push({ text: t('sav_deposit'), onClick: () => balanceSheet(goal, 'deposit') });

  const info = [];
  if (!status.achieved) {
    if (monthly.amount === null) {
      info.push(row({ avatar: avatar('wallet'), title: t('sav_set_monthly'), subtitle: t('sav_goal_need_monthly'), tone: 'accent', onClick: () => monthlySheet({ monthly, currency }) }));
    } else if (status.etaNominal === null) {
      info.push(row({ title: t('sav_goal_when'), value: t('sav_goal_never'), valueTone: 'warn', subtitle: t('sav_at_monthly', { amount: moneyRound(monthly.amount, currency) }) }));
    } else {
      const subtitle = [t('sav_at_monthly', { amount: moneyRound(monthly.amount, currency) }), own ? t('sav_goal_own_assumption') : null].filter(Boolean).join(' · ');
      info.push(row({ title: t('sav_goal_when'), value: `≈ ${duration(status.etaNominal)}`, valueNote: monthYear(today, status.etaNominal), subtitle }));
      if (settings.inflationRate > 0 && status.etaReal !== status.etaNominal) {
        info.push(row({
          title: t('sav_with_inflation'), value: status.etaReal === null ? t('sav_goal_never') : `≈ ${duration(status.etaReal)}`,
          valueTone: status.etaReal === null ? 'warn' : null, subtitle: status.etaReal === null ? t('sav_goal_inflation_never') : null
        }));
      }
    }
    if (status.requiredNominal !== null) {
      info.push(row({
        title: t('sav_goal_required'), value: moneyRound(status.requiredNominal, currency),
        subtitle: status.requiredReal !== null ? t('sav_goal_required_real', { amount: moneyRound(status.requiredReal, currency) }) : null
      }));
    }
  }

  let deadline = t('sav_no_deadline');
  let deadlineNote = null;
  if (goal.targetDate) {
    deadline = longDate(goal.targetDate);
    if (status.monthsLeft > 0) deadlineNote = t('sav_left', { duration: duration(status.monthsLeft) });
    else deadlineNote = goal.targetDate >= today ? t('sav_deadline_soon') : t('sav_deadline_passed');
  }

  return page({ title: goal.name },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('sav_goal_saved')),
      h('div', { class: 'hero-value' }, moneyRound(status.current, currency)),
      h('div', { class: 'hero-note' }, status.achieved ? t('sav_goal_achieved') : t('sav_goal_of', { target: moneyRound(status.target, currency), percent, left: moneyRound(status.left, currency) })),
      h('div', { class: 'sav-hero-progress' }, progress(Math.min(1, status.ratio), { tone: status.achieved ? 'good' : 'accent' }))),
    data.chart ? chartCard(data.chart, today, { label: t('sav_goal_savings'), target: data.chart.target, marker: status.monthsLeft || null }) : null,
    section({}, info),
    own ? section({},
      row({ avatar: avatar('expense'), title: t('sav_withdraw'), onClick: () => balanceSheet(goal, 'withdraw') }),
      row({ avatar: avatar('edit'), title: t('sav_new_amount'), onClick: () => balanceSheet(goal, 'set') })) : null,
    section({ title: t('sav_goal_section'), footer: t('sav_mode_hint') },
      row({
        title: t('sav_goal_target'), value: money(goal.target, goal.currency),
        onClick: () => amountSheet({
          title: t('sav_goal_target'), currency: goal.currency, currencies: true, value: goal.target, button: t('sav_save'),
          submit: (amount, code) => patch(goal, { target: amount, currency: code })
        })
      }),
      row({ title: t('sav_name'), value: goal.name, onClick: () => nameSheet(goal) }),
      row({
        title: t('sav_deadline'), value: deadline, valueNote: deadlineNote,
        onClick: () => valueSheet({
          title: t('sav_deadline'), type: 'date', value: goal.targetDate || '', min: addDays(today, 1), button: t('sav_save'),
          parse: (v) => (v && v > today ? v : undefined),
          secondary: goal.targetDate ? { text: t('sav_no_deadline'), onClick: () => patch(goal, { targetDate: null }, t('sav_deadline_removed')) } : null,
          submit: (date) => patch(goal, { targetDate: date }, t('sav_deadline_set', { date: longDate(date) }))
        })
      }),
      row({
        title: t('sav_own_pot'),
        trailing: toggle(own, async (checked) => {
          if (!checked && goal.balance > 0 && !await confirm(t('sav_mode_total_confirm', { amount: money(goal.balance, goal.currency) }))) return changed('savings');
          const result = await patch(goal, { mode: checked ? 'own' : 'total' }, t(checked ? 'sav_mode_own_set' : 'sav_mode_total_set'));
          if (!result) changed('savings');
        })
      })),
    own ? historySection(data) : null,
    section({}, row({
      title: t('sav_delete_goal'), tone: 'danger', chevron: false,
      onClick: () => remove(goal, [t('sav_delete_goal_confirm', { name: goal.name }), goal.balance > 0 ? t('sav_delete_moves', { amount: money(goal.balance, goal.currency) }) : null].filter(Boolean).join('\n'))
    })));
}

// ── Долг ───────────────────────────────────────────────────────────────────

function payoffRows(debt, plan, today) {
  if (plan.paidOff && plan.months === 0) return [row({ title: t('sav_debt_paid_off'), avatar: avatar('check', { color: 'var(--good)' }) })];
  if (plan.paidOff) {
    return [
      row({ title: t('sav_debt_payoff'), value: `≈ ${duration(plan.months)}`, valueNote: monthYear(today, plan.months) }),
      plan.totalInterest >= 0.5 ? row({ title: t('sav_debt_interest_total'), value: `~${moneyRound(plan.totalInterest, debt.currency)}` }) : null
    ];
  }
  const interest = moneyRound(Math.ceil(plan.interest), debt.currency);
  let text;
  if (plan.reason === 'too_long') text = t('sav_debt_too_long');
  else if (plan.reason === 'below_interest') text = t('sav_debt_below_interest', { amount: interest });
  else text = plan.interest > 0 ? t('sav_debt_no_payment_interest', { amount: interest }) : t('sav_debt_no_payment');
  return [h('div', { class: `sav-text${plan.reason === 'no_payment' ? '' : ' tone-warn'}` }, text)];
}

function debtCard(data) {
  const { pot: debt, plan, currency, today } = data;
  if (debt.balance > 0) mainButton.push({ text: t('sav_debt_pay'), onClick: () => debtSheet(debt, 'pay') });
  const other = debt.currency !== currency && debt.balance > 0;
  return page({ title: debt.name },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('sav_debt_left_label')),
      h('div', { class: 'hero-value' }, money(debt.balance, debt.currency)),
      other ? h('div', { class: 'hero-note' }, `≈ ${moneyRound(debt.balanceMain, currency)}`) : null),
    section({}, payoffRows(debt, plan, today)),
    data.chart ? chartCard(data.chart, today, { label: t('sav_debt_left_label'), color: 'var(--c2)' }) : null,
    section({},
      row({ avatar: avatar('edit'), title: t('sav_new_amount'), onClick: () => debtSheet(debt, 'set') }),
      row({ avatar: avatar('plus'), title: t('sav_debt_increase'), onClick: () => debtSheet(debt, 'increase') })),
    section({ title: t('sav_debt_terms') },
      row({
        title: t('sav_debt_payment'), value: debt.monthlyPayment ? money(debt.monthlyPayment, debt.currency) : t('sav_not_set'),
        onClick: () => amountSheet({
          title: t('sav_debt_payment'), hint: t('sav_debt_payment_hint'), currency: debt.currency, value: debt.monthlyPayment ?? '', allowZero: true,
          button: t('sav_save'),
          secondary: debt.monthlyPayment ? { text: t('sav_debt_no_payment_button'), onClick: () => patch(debt, { monthlyPayment: null }) } : null,
          submit: (amount) => patch(debt, { monthlyPayment: amount })
        })
      }),
      row({
        title: t('sav_debt_due_day'), value: debt.dueDay ? t('sav_day_n', { n: debt.dueDay }) : t('sav_not_set'),
        onClick: () => valueSheet({
          title: t('sav_debt_due_day'), value: debt.dueDay ?? '', inputmode: 'numeric', placeholder: '1–31', hint: t('sav_debt_due_day_hint'),
          button: t('sav_save'),
          parse: (v) => { const n = parseNumber(v); return Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined; },
          secondary: debt.dueDay ? { text: t('sav_not_set_button'), onClick: () => patch(debt, { dueDay: null }) } : null,
          submit: (n) => patch(debt, { dueDay: n })
        })
      }),
      row({
        title: t('sav_rate'), value: debt.yieldRate ? rate(debt.yieldRate) : t('sav_rate_zero'),
        onClick: () => valueSheet({
          title: t('sav_rate_title'), value: debt.yieldRate ?? '', inputmode: 'decimal', placeholder: '0', hint: t('sav_debt_rate_hint'),
          button: t('sav_save'), parse: parseRate(MAX_RATE), submit: (value) => patch(debt, { yieldRate: value })
        })
      }),
      row({ title: t('sav_name'), value: debt.name, onClick: () => nameSheet(debt) })),
    historySection(data),
    section({}, row({
      title: t('sav_delete_debt'), tone: 'danger', chevron: false,
      onClick: () => remove(debt, t('sav_delete_debt_confirm', { name: debt.name }))
    })));
}
