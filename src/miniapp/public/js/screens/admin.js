// Админка (/admin бота, только админам): статистика, воронка, пользователи и активные, поиск, карточка пользователя
// (премиум, права админа, возврат по хэшу платежа), админы, баг-репорты, донаты, массовое уведомление
import { route, navigate } from '../core/router.js';
import { h, page, section, row, avatar, async, stats, segmented, stepper, field, sheet, act, toast, pick, confirmDelete, empty } from '../core/ui.js';
import { t, me, number, percent } from '../core/i18n.js';
import { api, qs } from '../core/api.js';
import { mainButton, confirm } from '../core/tg.js';
import { dateText, dateTimeText } from './profileKit.js';

const GRANT_DAYS = [1, 7, 14, 30, 90, 180, 365];
// Заголовок над плитками показателей (section без строк не рисуется)
const heading = (text) => h('div', { class: 'section-title' }, h('span', null, text));
const share = (part, total) => (total > 0 ? percent(part / total) : '0%');

// Не админ: экран не нужен — назад в «Ещё»
function guard(render) {
  return (ctx) => {
    if (!me().isAdmin) { navigate('/more', { replace: true }); return h('div'); }
    return render(ctx);
  };
}

const userRow = (u, extra = {}) => row({
  avatar: avatar(u.admin ? 'shield' : (u.premium ? 'star' : 'user')),
  title: u.name || (u.username ? `@${u.username}` : String(u.id)),
  subtitle: [u.username ? `@${u.username}` : null, String(u.id)].filter(Boolean).join(' · '),
  href: `/admin/user/${u.id}`,
  ...extra
});

function home() {
  let query = '';
  const search = field({ placeholder: t('prof_adm_search'), onInput: (v) => { query = v; } });
  search.input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && query.trim()) navigate(`/admin/search${qs({ q: query.trim() })}`); });
  return page({ title: t('prof_adm_title') },
    h('div', { class: 'section' }, h('div', { class: 'section-body' }, search)),
    section({},
      row({ avatar: avatar('chart'), title: t('prof_adm_stats'), href: '/admin/stats' }),
      row({ avatar: avatar('arrow'), title: t('prof_adm_funnel'), href: '/admin/funnel' })),
    section({},
      row({ avatar: avatar('users'), title: t('prof_adm_users'), href: '/admin/users' }),
      row({ avatar: avatar('user'), title: t('prof_adm_active'), href: '/admin/active' }),
      row({ avatar: avatar('shield'), title: t('prof_adm_admins'), href: '/admin/admins' })),
    section({},
      row({ avatar: avatar('help'), title: t('prof_adm_bugs'), href: '/admin/bugs' }),
      row({ avatar: avatar('star'), title: t('prof_adm_donations'), href: '/admin/donations' }),
      row({ avatar: avatar('bell'), title: t('prof_adm_broadcast'), href: '/admin/broadcast' })));
}

function statsScreen() {
  return async(() => api.get('/admin/stats'), (s) => page({ title: t('prof_adm_stats') },
    heading(t('prof_adm_users')),
    stats([
      { label: t('prof_adm_total'), value: number(s.users.total) },
      { label: t('prof_adm_new_week'), value: number(s.users.newWeek), hint: t('prof_adm_new_month', { n: s.users.newMonth }) },
      { label: t('prof_adm_premium_now'), value: number(s.users.activePremium), hint: t('prof_adm_ever', { n: s.users.everPremium }) },
      { label: t('prof_adm_admins'), value: number(s.users.admins) }
    ]),
    heading(t('prof_adm_records')),
    stats([
      { label: t('prof_adm_total'), value: number(s.expenses.total) },
      { label: t('prof_adm_week'), value: number(s.expenses.week), hint: t('prof_adm_month_n', { n: s.expenses.month }) },
      { label: t('prof_adm_with_records'), value: number(s.expenses.activeUsers) },
      { label: t('prof_adm_family_records'), value: number(s.expenses.family) }
    ]),
    heading(t('prof_adm_money')),
    stats([
      { label: t('prof_adm_purchases'), value: number(s.premium.transactions), hint: `${number(s.premium.stars)} ⭐` },
      { label: t('prof_adm_donations'), value: number(s.donations.completed), hint: `${number(s.donations.stars)} ⭐` }
    ]),
    section({},
      row({ avatar: avatar('help'), title: t('prof_adm_bugs'), value: number(s.bugReports), href: '/admin/bugs' }),
      s.family ? row({ avatar: avatar('users'), title: t('prof_adm_family_plan'), subtitle: t('prof_adm_family_line', s.family) }) : null,
      s.referrals ? row({ avatar: avatar('gift'), title: t('prof_adm_referrals'), subtitle: t('prof_adm_referrals_line', s.referrals) }) : null)));
}

function funnelScreen(ctx) {
  const days = Number(ctx.query.days || 30);
  const block = (title, r) => section({ title },
    row({ title: t('prof_adm_f_registered'), value: number(r.registered) }),
    row({ title: t('prof_adm_f_onboarded'), value: number(r.onboarded), valueNote: share(r.onboarded, r.registered) }),
    row({ title: t('prof_adm_f_first'), value: number(r.first_expense), valueNote: share(r.first_expense, r.registered) }),
    row({ title: t('prof_adm_f_returned'), value: number(r.returned_week2), valueNote: share(r.returned_week2, r.registered) }),
    row({ title: t('prof_adm_f_paywall'), value: number(r.paywall_viewed), valueNote: t('prof_adm_f_tariffs', { n: r.tariffs_viewed }) }),
    row({ title: t('prof_adm_f_paid'), value: number(r.paid), valueNote: `${share(r.paid, r.registered)} · ${number(r.stars)} ⭐` }));
  return async(() => api.get(`/admin/funnel${qs({ days })}`), (f) => page({ title: t('prof_adm_funnel'), subtitle: t('prof_adm_funnel_note') },
    segmented([{ value: 30, label: t('prof_adm_days', { n: 30 }) }, { value: 90, label: t('prof_adm_days', { n: 90 }) }, { value: 0, label: t('prof_adm_all_time') }],
      days, (v) => navigate(`/admin/funnel${qs({ days: v })}`, { replace: true })),
    // Один источник — его блок совпадает с «Все источники»
    f.total.registered ? [block(t('prof_adm_all_sources'), f.total), ...(f.sources.length > 1 ? f.sources.map(s => block(s.source || t('prof_adm_no_source'), s)) : [])]
      : empty({ icon: 'chart', title: t('prof_adm_no_registrations') }),
    section({ footer: t('prof_adm_source_hint') }, row({ title: `${f.link}…` }))));
}

function usersScreen(ctx) {
  const pageNo = Number(ctx.query.page || 1);
  return async(() => api.get(`/admin/users${qs({ page: pageNo })}`), (d) => page({ title: t('prof_adm_users'), subtitle: t('prof_adm_users_total', { n: number(d.total) }) },
    section({}, d.users.map(u => userRow(u))),
    d.totalPages > 1 ? stepper(`${d.page} / ${d.totalPages}`, {
      canPrev: d.page > 1, canNext: d.page < d.totalPages,
      onPrev: () => navigate(`/admin/users${qs({ page: d.page - 1 })}`, { replace: true }),
      onNext: () => navigate(`/admin/users${qs({ page: d.page + 1 })}`, { replace: true })
    }) : null));
}

function activeScreen(ctx) {
  const days = Number(ctx.query.days || 30);
  const pageNo = Number(ctx.query.page || 1);
  const go = (d, p) => navigate(`/admin/active${qs({ days: d, page: p })}`, { replace: true });
  return async(() => api.get(`/admin/active${qs({ days, page: pageNo })}`), (d) => page({
    title: t('prof_adm_active'),
    subtitle: t('prof_adm_active_share', { active: number(d.active), total: number(d.totalUsers), share: share(d.active, d.totalUsers) })
  },
  segmented([7, 30, 90].map(v => ({ value: v, label: t('prof_adm_days', { n: v }) })), days, (v) => go(v, 1)),
  d.users.length ? section({ footer: t('prof_adm_active_hint') }, d.users.map(u => userRow(u, {
    subtitle: t('prof_adm_active_line', { records: u.records, days: u.days, last: dateTimeText(u.lastAt) })
  }))) : empty({ icon: 'users', title: t('prof_adm_nobody') }),
  d.totalPages > 1 ? stepper(`${d.page} / ${d.totalPages}`, { canPrev: d.page > 1, canNext: d.page < d.totalPages, onPrev: () => go(days, d.page - 1), onNext: () => go(days, d.page + 1) }) : null));
}

function searchScreen(ctx) {
  const q = ctx.query.q || '';
  return async(() => api.get(`/admin/search${qs({ q })}`), (d) => page({ title: t('prof_adm_search_results', { q }) },
    d.users.length ? section({}, d.users.map(u => userRow(u))) : empty({ icon: 'search', title: t('prof_adm_not_found') })));
}

// Возврат: хэш → найденный платёж → подтверждение
function refundSheet(userId, onDone) {
  let hash = '';
  const input = field({ placeholder: 'telegram_payment_charge_id', onInput: (v) => { hash = v.trim(); s.button.update({ enabled: !!hash }); } });
  const s = sheet({
    title: t('prof_adm_refund'),
    content: h('div', { class: 'section-body' }, input),
    mainButton: {
      text: t('prof_adm_refund_find'), enabled: false,
      onClick: async () => {
        const payment = await act(() => api.post(`/admin/users/${userId}/payment`, { hash }));
        if (!payment) return;
        const kind = t(`prof_adm_pay_${payment.kind}`);
        if (!(await confirm(t('prof_adm_refund_confirm', { kind, stars: payment.stars, status: payment.status })))) return;
        const result = await act(() => api.post(`/admin/users/${userId}/refund`, { hash }));
        if (!result) return;
        toast(result.premiumUntil ? t('prof_adm_refunded_until', { date: dateText(result.premiumUntil) }) : t('prof_adm_refunded'));
        s.close();
        onDone();
      }
    }
  });
}

function userScreen(ctx) {
  const id = ctx.params.id;
  return async(() => api.get(`/admin/users/${id}`), (u) => {
    const grant = async () => {
      const days = await pick({ title: t('prof_adm_grant'), options: GRANT_DAYS.map(d => ({ value: d, label: t('prof_adm_days', { n: d }) })) });
      if (days && await act(() => api.post(`/admin/users/${id}/premium`, { days }), { success: t('prof_adm_granted', { n: days }) })) ctx.refresh();
    };
    const revoke = async () => {
      if (!(await confirmDelete(t('prof_adm_revoke_confirm')))) return;
      if (await act(() => api.del(`/admin/users/${id}/premium`), { success: t('prof_adm_revoked') })) ctx.refresh();
    };
    const setAdmin = async (on) => {
      if (!on && !(await confirmDelete(t('prof_adm_demote_confirm')))) return;
      if (await act(() => (on ? api.post(`/admin/users/${id}/admin`) : api.del(`/admin/users/${id}/admin`)), { success: t('core_saved') })) ctx.refresh();
    };
    return page({ title: u.name || (u.username ? `@${u.username}` : String(u.id)), subtitle: [u.username ? `@${u.username}` : null, String(u.id)].filter(Boolean).join(' · ') },
      section({},
        row({ title: t('prof_adm_premium'), value: u.premiumActive ? t('prof_until', { date: dateText(u.premiumExpiresAt) }) : t('prof_off'), valueTone: u.premiumActive ? 'good' : null }),
        row({ title: t('prof_adm_registered'), value: dateText(u.registeredAt) }),
        row({ title: t('prof_adm_expenses'), value: number(u.expenses.count), valueNote: u.expenses.last ? dateText(u.expenses.last) : null }),
        row({ title: t('prof_adm_settings_line'), value: [u.language, u.currency].filter(Boolean).join(' · '), valueNote: u.timezone }),
        u.bugReports ? row({ title: t('prof_adm_bugs'), value: number(u.bugReports) }) : null),
      section({},
        row({ avatar: avatar('star'), title: t('prof_adm_grant'), onClick: grant }),
        u.premium || u.premiumActive ? row({ avatar: avatar('close'), title: t('prof_adm_revoke'), tone: 'danger', onClick: revoke, chevron: false }) : null,
        !u.admin ? row({ avatar: avatar('shield'), title: t('prof_adm_promote'), onClick: () => setAdmin(true) }) : null,
        u.admin && !u.self ? row({ avatar: avatar('shield'), title: t('prof_adm_demote'), tone: 'danger', onClick: () => setAdmin(false), chevron: false }) : null,
        row({ avatar: avatar('receipt'), title: t('prof_adm_refund'), onClick: () => refundSheet(id, ctx.refresh) })),
      u.transactions.length ? section({ title: t('prof_adm_transactions') }, u.transactions.map(x => row({
        title: x.stars ? `${number(x.stars)} ⭐` : t('prof_adm_free'),
        subtitle: [dateText(x.at), x.days ? t('prof_days_short', { n: x.days }) : null, x.status].filter(Boolean).join(' · ')
      }))) : null);
  });
}

function adminsScreen() {
  return async(() => api.get('/admin/admins'), (d) => page({ title: t('prof_adm_admins') }, section({}, d.admins.map(u => userRow(u)))));
}

function bugsScreen(ctx) {
  const status = ctx.query.status === 'all' ? 'all' : 'new';
  return async(() => api.get(`/admin/bug-reports${qs({ status: status === 'new' ? 'new' : null })}`), (d) => page({
    title: t('prof_adm_bugs'),
    subtitle: ['new', 'in_progress', 'resolved', 'closed'].map(s => `${t(`prof_adm_bug_${s}`)}: ${d.counts[s]}`).join(' · ')
  },
  segmented([{ value: 'new', label: t('prof_adm_bug_new') }, { value: 'all', label: t('prof_adm_bug_all') }], status,
    (v) => navigate(`/admin/bugs${qs({ status: v })}`, { replace: true })),
  d.reports.length ? section({}, d.reports.map(r => row({
    title: h('span', { class: 'prof-multiline' }, r.text),
    subtitle: [`#${r.id}`, t(`prof_adm_bug_${r.status}`), dateText(r.at), r.user.username ? `@${r.user.username}` : r.user.name, String(r.user.id)].filter(Boolean).join(' · '),
    href: `/admin/user/${r.user.id}`
  }))) : empty({ icon: 'help', title: t('prof_adm_no_bugs') })));
}

function donationsScreen() {
  return async(() => api.get('/admin/donations'), (d) => page({ title: t('prof_adm_donations') },
    stats([
      { label: t('prof_adm_total'), value: number(d.total), hint: t('prof_adm_pending_n', { n: d.pending }) },
      { label: t('prof_adm_paid'), value: number(d.completed) },
      { label: t('prof_adm_stars'), value: `${number(d.stars)} ⭐`, hint: t('prof_adm_average', { n: d.average }) }
    ])));
}

// Массовое уведомление: простой текст до 3600 символов; подтверждение — нативным диалогом
function broadcastScreen() {
  let text = '';
  const counter = h('div', { class: 'section-footer' }, t('prof_adm_broadcast_hint', { n: 0 }));
  const input = field({
    placeholder: t('prof_adm_broadcast_placeholder'), multiline: true, maxlength: 3600,
    onInput: (v) => { text = v; counter.textContent = t('prof_adm_broadcast_hint', { n: v.length }); button.update({ enabled: !!v.trim() }); }
  });
  const button = mainButton.push({
    text: t('prof_adm_broadcast_send'), enabled: false,
    onClick: async () => {
      if (!(await confirm(t('prof_adm_broadcast_confirm', { n: text.trim().length })))) return;
      button.busy(true);
      const ok = await act(() => api.post('/admin/broadcast', { text }));
      button.busy(false);
      if (ok) { toast(t('prof_adm_broadcast_started')); navigate('/admin', { replace: true }); }
    }
  });
  return page({ title: t('prof_adm_broadcast') }, h('div', { class: 'section' }, h('div', { class: 'section-body' }, input), counter));
}

export function register() {
  route('/admin', guard(home), { tab: 'more' });
  route('/admin/stats', guard(statsScreen), { tab: 'more' });
  route('/admin/funnel', guard(funnelScreen), { tab: 'more' });
  route('/admin/users', guard(usersScreen), { tab: 'more' });
  route('/admin/active', guard(activeScreen), { tab: 'more' });
  route('/admin/search', guard(searchScreen), { tab: 'more' });
  route('/admin/user/:id', guard(userScreen), { tab: 'more' });
  route('/admin/admins', guard(adminsScreen), { tab: 'more' });
  route('/admin/bugs', guard(bugsScreen), { tab: 'more' });
  route('/admin/donations', guard(donationsScreen), { tab: 'more' });
  route('/admin/broadcast', guard(broadcastScreen), { tab: 'more', tabs: false });
}
