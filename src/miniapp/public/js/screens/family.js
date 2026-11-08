// «👨‍👩‍👧 Семья» (/family бота): семья и участники, «Все траты в семью», приглашения (по username, код — для
// пересылки), исключить, выйти, удалить; без семьи — приглашения мне и создание; «Семейный тариф» — цены и оплата Stars
import { route, navigate, changed } from '../core/router.js';
import { h, page, section, row, avatar, async, toggle, sheet, field, act, toast, confirmDelete, pick, empty } from '../core/ui.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, confirm } from '../core/tg.js';
import { reloadMe } from '../core/session.js';
import { payInvoice, copyText, dateText, dateTimeText, wrapped, screenButton } from './profileKit.js';
import { tariffRow } from './premium.js';

// После любого изменения семьи: /api/me (семья, контур главных экранов) и подписчики
async function familyChanged() {
  await reloadMe().catch(() => null);
  changed('family');
}

// Шторка с одним полем и главной кнопкой → введённое значение (или null)
function askText({ title, label = null, placeholder = '', hint = null, button, maxlength = 64, minLength = 1, onSubmit }) {
  let value = '';
  const input = field({ label, placeholder, maxlength, onInput: (v) => { value = v; s.button.update({ enabled: value.trim().length >= minLength }); } });
  const s = sheet({
    title,
    content: h('div', null, h('div', { class: 'section-body' }, input), hint ? h('div', { class: 'section-footer' }, hint) : null),
    mainButton: {
      text: button,
      enabled: false,
      onClick: async () => {
        s.button.busy(true);
        const done = await onSubmit(value.trim());
        s.button.busy(false);
        if (done) s.close();
      }
    }
  });
  setTimeout(() => input.input.focus(), 250);
}

function createFamily({ plan = false } = {}) {
  askText({
    title: t('prof_family_create'),
    placeholder: t('prof_family_name_placeholder'),
    hint: t('prof_family_name_hint'),
    button: t('prof_family_create_button'),
    maxlength: 50,
    minLength: 3,
    onSubmit: async (name) => {
      const created = await act(() => api.post('/family', { name, plan }), { success: t('prof_family_created') });
      if (created) await familyChanged();
      return !!created;
    }
  });
}

// Приглашение по username: человеку бот пришлёт приглашение с кнопками; код — чтобы переслать самому
function inviteMember() {
  askText({
    title: t('prof_family_invite'),
    label: '@',
    placeholder: 'username',
    hint: t('prof_family_invite_hint'),
    button: t('prof_family_invite_send'),
    onSubmit: async (username) => {
      const result = await act(() => api.post('/family/invitations', { username }));
      if (!result) return false;
      toast(t('prof_family_invite_sent', { username: result.username, code: result.code }), { action: { text: t('prof_copy'), onClick: () => copyText(result.code) } });
      changed('family');
      return true;
    }
  });
}

// Приглашение в моей семье: код (скопировать) или отменить
function invitationSheet(inv, button) {
  if (button) button.hide();
  const s = sheet({
    title: inv.name,
    onClose: button ? button.show : null,
    content: h('div', null,
      h('div', { class: 'prof-code' }, inv.code),
      h('div', { class: 'section-footer center' }, t('prof_family_code_hint', { time: dateTimeText(inv.expiresAt) })),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn secondary', onclick: () => copyText(inv.code) }, t('prof_copy'))),
      h('button', {
        class: 'btn danger',
        onclick: async () => {
          if (!(await confirmDelete(t('prof_family_cancel_invite_confirm')))) return;
          if (await act(() => api.del(`/family/invitations/${encodeURIComponent(inv.code)}`), { success: t('prof_family_invite_cancelled') })) { s.close(); changed('family'); }
        }
      }, t('prof_family_cancel_invite')))
  });
}

// Приглашение мне: вступить или отказаться
async function answerInvitation(inv) {
  const choice = await pick({
    title: t('prof_family_invited_title', { family: inv.familyName }),
    options: [{ value: 'accept', label: t('prof_family_accept') }, { value: 'reject', label: t('prof_family_reject') }]
  });
  if (choice === 'accept') {
    const result = await act(() => api.post(`/family/invitations/${encodeURIComponent(inv.code)}/accept`));
    if (!result) return;
    toast(result.familyPremium
      ? t('prof_family_joined_premium', { family: result.family.name, name: result.familyPremium.payerName })
      : t('prof_family_joined', { family: result.family.name }));
    await familyChanged();
    changed('achievements');
  } else if (choice === 'reject') {
    if (await act(() => api.post(`/family/invitations/${encodeURIComponent(inv.code)}/reject`), { success: t('prof_family_rejected') })) changed('family');
  }
}

function pendingSection(pending) {
  return section({ title: t('prof_family_invited') }, pending.map(inv => row({
    avatar: avatar('users'),
    title: inv.familyName,
    subtitle: t('prof_family_invited_by', { name: inv.inviterName, time: dateTimeText(inv.expiresAt) }),
    onClick: () => answerInvitation(inv)
  })));
}

function noFamily(data) {
  if (data.premium) mainButton.push({ text: t('prof_family_create'), onClick: () => createFamily() });
  else mainButton.push({ text: t('prof_premium_family_plan'), onClick: () => navigate('/family/plan') });
  return page({ title: t('prof_family_title') },
    data.pending.length ? pendingSection(data.pending) : null,
    empty({ icon: 'users', title: t('prof_family_empty_title'), text: data.premium ? t('prof_family_empty_text') : t('prof_family_teaser') }),
    data.premium ? null : section({}, row({ avatar: avatar('star'), title: t('prof_premium_title'), href: '/premium' })));
}

function memberRow(m, family) {
  const sub = [m.username ? `@${m.username}` : null, m.role === 'owner' ? t('prof_family_owner') : (m.joinedAt ? t('prof_family_since', { date: dateText(m.joinedAt) }) : null)].filter(Boolean);
  const removable = family.isOwner && m.role !== 'owner';
  return row({
    avatar: avatar('user'),
    title: m.name || (m.username ? `@${m.username}` : '—'),
    subtitle: sub.join(' · '),
    onClick: removable ? async () => {
      if (!(await confirmDelete(t('prof_family_remove_confirm', { name: m.name || m.username })))) return;
      if (await act(() => api.del(`/family/members/${m.id}`), { success: t('prof_family_removed') })) await familyChanged();
    } : null,
    chevron: false
  });
}

function inFamily(data, ctx) {
  const f = data.family;
  const premium = data.premium;
  const button = premium && f.isOwner ? screenButton(ctx, { text: t('prof_family_invite'), onClick: inviteMember }) : null;
  let planLine = null;
  if (f.plan && f.plan.own) planLine = t('prof_family_plan_paid', { date: dateText(f.plan.expiresAt), members: f.plan.members, max: f.plan.max });
  else if (f.plan) planLine = t('prof_premium_family_payer', { name: f.plan.payerName, date: dateText(f.plan.expiresAt) });

  const leave = async () => {
    const text = [t('prof_family_leave_confirm', { family: f.name })];
    if (f.leaveLosesPremium) text.push(t('prof_family_leave_premium'));
    if (!(await confirm(text.join('\n\n')))) return;
    const result = await act(() => api.post('/family/leave'));
    if (!result) return;
    toast(result.lostFamilyPremium ? t('prof_family_left_premium') : t('prof_family_left'));
    await familyChanged();
    changed('premium');
  };
  const remove = async () => {
    if (!(await confirmDelete(t('prof_family_delete_confirm', { family: f.name })))) return;
    if (await act(() => api.del('/family'), { success: t('prof_family_deleted') })) await familyChanged();
  };
  const setMode = async (enabled) => {
    const result = await act(() => api.put('/family/mode', { enabled }));
    if (result) {
      toast(t(enabled ? 'prof_family_mode_on_toast' : 'prof_family_mode_off_toast'));
      await familyChanged();
      changed('budgets');
    } else changed('family');
  };

  return page({ title: f.name, subtitle: f.isOwner ? t('prof_family_you_owner') : t('prof_family_owner_is', { name: f.ownerName }) },
    premium ? section({ footer: planLine },
      row({ title: t('prof_family_mode'), subtitle: t(f.mode ? 'prof_family_mode_on' : 'prof_family_mode_off'), trailing: toggle(f.mode, setMode) }),
      row({ avatar: avatar('wallet'), title: t('prof_family_expenses'), href: '/today?scope=family' }),
      row({ avatar: avatar('download'), title: t('prof_family_export'), onClick: () => act(() => api.post('/family/export'), { success: t('prof_family_export_sent') }) })) : empty({ icon: 'star', title: t('prof_family_need_premium'), text: t('prof_family_teaser') }),
    section({ title: t('prof_family_members', { n: f.members.length }) }, f.members.map(m => memberRow(m, f))),
    f.invitations.length ? section({ title: t('prof_family_invitations') }, f.invitations.map(inv => row({
      avatar: avatar('clock'), title: inv.name, subtitle: t('prof_family_code_until', { code: inv.code, time: dateTimeText(inv.expiresAt) }), onClick: () => invitationSheet(inv, button)
    }))) : null,
    section({},
      f.isOwner || !premium ? row({ avatar: avatar('star'), title: t('prof_premium_family_plan'), href: '/family/plan' }) : null,
      !premium ? row({ avatar: avatar('star'), title: t('prof_premium_title'), href: '/premium' }) : null),
    section({},
      f.isOwner
        ? (premium ? row({ title: t('prof_family_delete'), tone: 'danger', onClick: remove, chevron: false }) : null)
        : row({ title: t('prof_family_leave'), tone: 'danger', onClick: leave, chevron: false })));
}

function familyScreen(ctx) {
  ctx.onChange('family', ctx.refresh);
  ctx.onChange('premium', ctx.refresh);
  return async(() => api.get('/family'), (data) => (data.family ? inFamily(data, ctx) : noFamily(data)));
}

// «Семейный тариф»: цена, честная выгода, правила сроков; оплатить может только владелец семьи
function planScreen(ctx) {
  ctx.onChange('family', ctx.refresh);
  ctx.onChange('premium', ctx.refresh);
  return async(() => api.get('/family/plan'), (p) => {
    const month = p.tariffs[0];
    const saving = p.saving.people >= 2
      ? t('prof_plan_saving', { people: p.saving.people, family: p.saving.family, personal: p.saving.personal, percent: p.saving.percent })
      : t('prof_plan_saving_alone', { family: p.saving.family, two: p.saving.two, perPerson: p.saving.perPersonMax, max: p.max });
    let status = null;
    let body = null;
    if (p.state === 'no_family') {
      status = t('prof_plan_no_family');
      mainButton.push({ text: t('prof_family_create'), onClick: () => createFamily({ plan: true }) });
    } else if (p.state === 'not_owner') {
      status = t('prof_plan_not_owner', { family: p.family.name, name: p.family.ownerName });
    } else if (p.state === 'too_big') {
      status = t('prof_plan_too_big', { members: p.family.members, max: p.max });
      body = section({}, row({ avatar: avatar('users'), title: t('prof_family_title'), href: '/family' }));
    } else {
      status = p.planActive
        ? t('prof_family_plan_paid', { date: dateText(p.planExpiresAt), members: p.family.members, max: p.max })
        : t('prof_plan_seats', { family: p.family.name, members: p.family.members, max: p.max });
      const pay = (tariff) => payInvoice(() => api.post('/family/plan/invoice', { duration: tariff.duration }));
      const rules = [t('prof_plan_days_rule')];
      if (p.personalUntil) rules.push(t('prof_plan_days_yours', { date: dateText(p.personalUntil) }));
      body = [
        section({ title: t('prof_tariffs_title'), footer: rules.join(' ') }, p.tariffs.filter(x => x.available).map(x => tariffRow(x, p.currency, pay))),
        p.canInvite ? section({}, row({ avatar: avatar('users'), title: t('prof_family_invite'), href: '/family' })) : null
      ];
    }
    return page({ title: t('prof_premium_family_plan') },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-label' }, t('prof_plan_for', { max: p.max })),
        h('div', { class: 'hero-value prof-hero-text' }, t('prof_plan_month', { stars: month.stars })),
        h('div', { class: 'hero-note' }, saving)),
      section({ footer: t('prof_plan_rules', { max: p.max }) },
        row({ avatar: avatar('info'), title: status })),
      body);
  });
}

export function register() {
  route('/family', wrapped(familyScreen), { tab: 'more' });
  route('/family/plan', wrapped(planScreen), { tab: 'more' });
}
