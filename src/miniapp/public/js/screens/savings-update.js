// /savings/update — мастер «Обновить остатки»: по шагу на каждый счёт, цель со своей копилкой и долг (очередь как в
// боте), «Без изменений», «Хватит»; каждая новая сумма сохраняется сразу; итог — «было → стало».
import { h, page, section, row, avatar, amountInput, async, act } from '../core/ui.js';
import { route, navigate, changed } from '../core/router.js';
import { api } from '../core/api.js';
import { t, money, moneyRound, signedMoney } from '../core/i18n.js';
import { mainButton, haptic } from '../core/tg.js';
import { potName, parseNumber, report } from './savings-common.js';

export function registerUpdate() {
  route('/savings/update', () => {
    return async(() => api.get('/savings/update'), (data) => wizard(data));
  }, { tab: 'savings', tabs: false });
}

function wizard(data) {
  const box = h('div');
  const { steps } = data;
  const changes = [];
  const achieved = [];
  let index = 0;
  let button = null;

  const show = (node) => { box.replaceChildren(node); window.scrollTo(0, 0); };

  async function finish() {
    if (button) button.remove();
    const after = await act(() => api.post('/savings/update/finish', {}));
    if (!after) return;
    changed('savings');
    show(summary(data, after, changes, achieved));
    report(null, { achieved, note: after.note });
  }

  function step() {
    if (index >= steps.length) return finish();
    const pot = steps[index];
    const input = amountInput({ value: String(pot.balance), currency: pot.currency, onInput: () => {} });
    input.querySelector('.amount-currency').disabled = true;
    input.input.addEventListener('focus', () => input.input.select());
    const next = async () => {
      const amount = parseNumber(input.input.value);
      if (amount === null || amount < 0) { haptic.error(); input.input.focus(); return; }
      if (amount !== pot.balance) {
        button.busy(true);
        const path = pot.kind === 'debt' ? 'debt' : 'balance';
        const result = await act(() => api.post(`/savings/pots/${pot.id}/${path}`, { op: 'set', amount, wizard: true }));
        button.busy(false);
        if (!result) return;
        changes.push({ pot, before: pot.balance, after: result.pot.balance });
        achieved.push(...(result.achieved || []));
      }
      index += 1;
      step();
    };
    const last = index === steps.length - 1;
    if (!button) button = mainButton.push({ text: t(last ? 'sav_done' : 'sav_next'), onClick: () => next() });
    else button.update({ text: t(last ? 'sav_done' : 'sav_next'), onClick: () => next() });
    show(page({ title: t('sav_update'), subtitle: t('sav_step', { i: index + 1, n: steps.length }) },
      h('div', { class: 'sav-step-pot' },
        avatar(pot.icon),
        h('div', { class: 'sav-step-name' }, potName(pot)),
        h('div', { class: 'muted' }, t(pot.kind === 'debt' ? 'sav_step_debt_now' : 'sav_step_now', { amount: money(pot.balance, pot.currency) }))),
      input,
      h('div', { class: 'sav-sheet-hint' }, t(pot.kind === 'debt' ? 'sav_step_debt_question' : 'sav_step_question')),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn secondary', onclick: () => { haptic.tap(); index += 1; step(); } }, t('sav_no_change')),
        h('button', { class: 'btn plain', onclick: () => { haptic.tap(); finish(); } }, t('sav_stop')))));
    setTimeout(() => input.input.focus(), 250);
  }

  step();
  return box;
}

function summary(data, after, changes, achieved) {
  const { currency, before } = data;
  mainButton.push({ text: t('sav_done'), onClick: () => navigate('/savings', { replace: true }) });
  const delta = after.total - before.total;
  return page({ title: t('sav_update_done') },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-label' }, t('sav_total')),
      h('div', { class: 'hero-value' }, moneyRound(after.total, currency)),
      h('div', { class: 'hero-note' }, t('sav_was', { amount: moneyRound(before.total, currency) }),
        ' · ', h('span', { class: delta > 0 ? 'tone-good' : delta < 0 ? 'tone-bad' : '' }, signedMoney(delta, currency))),
      before.debts || after.debts ? h('div', { class: 'hero-note' }, t('sav_capital_change', { before: moneyRound(before.netWorth, currency), after: moneyRound(after.netWorth, currency) })) : null),
    section({ title: t('sav_changes') }, changes.length
      ? changes.map(c => row({ avatar: avatar(c.pot.icon), title: potName(c.pot), subtitle: t('sav_was', { amount: money(c.before, c.pot.currency) }), value: money(c.after, c.pot.currency) }))
      : [row({ title: t('sav_no_changes') })]),
    section({}, achieved.map(goal => row({ avatar: avatar('trophy', { color: 'var(--good)' }), title: t('sav_goal_reached', { name: goal.name }) }))));
}
