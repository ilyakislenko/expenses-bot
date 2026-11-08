// Вкладка «Ещё»: короткий профиль (премиум) и разделы по частоте; «Пригласить друга» (/invite бота) и справка
// (/help, /paysupport, /terms, /privacy, баг-репорт)
import { route } from '../core/router.js';
import { h, page, section, row, avatar, async, stats, field, sheet, act, toast } from '../core/ui.js';
import { t, me } from '../core/i18n.js';
import { api } from '../core/api.js';
import { mainButton, openTelegramLink, openLink } from '../core/tg.js';
import { copyText, dateText, wrapped } from './profileKit.js';

// Строка статуса премиума под именем
function premiumLine(m) {
  const p = m.premium;
  if (!p.active) return t('prof_more_no_premium');
  if (!p.expiresAt) return t('prof_more_premium');
  return t('prof_more_premium_until', { date: dateText(p.expiresAt) });
}

function more(ctx) {
  const m = me();
  ctx.onChange('premium', ctx.refresh);
  ctx.onChange('family', ctx.refresh);
  ctx.onChange('settings', ctx.refresh);
  const name = m.user.firstName || (m.user.username ? `@${m.user.username}` : t('prof_more_you'));
  const taxRefund = m.lang === 'ru' && m.currency === 'RUB'; // «Верни 13%» — как в боте, только ru + RUB
  return page({ title: t('core_tab_more') },
    section({},
      row({ avatar: avatar('user', { color: 'var(--accent)' }), title: name, subtitle: premiumLine(m), href: '/premium' })),
    section({},
      row({ avatar: avatar('income'), title: t('prof_more_income'), href: '/income' }),
      row({ avatar: avatar('repeat'), title: t('prof_more_recurring'), href: '/recurring' }),
      row({ avatar: avatar('target'), title: t('prof_more_budgets'), href: '/budgets' }),
      row({ avatar: avatar('users'), title: t('prof_more_family'), subtitle: m.family ? m.family.name : null, href: '/family' })),
    section({},
      row({ avatar: avatar('trophy'), title: t('prof_more_achievements'), href: '/achievements' }),
      row({ avatar: avatar('sparkles'), title: t('prof_more_assistant'), href: '/assistant' }),
      row({ avatar: avatar('help'), title: t('prof_more_quiz'), href: '/quiz' }),
      row({ avatar: avatar('tag'), title: t('prof_more_tags'), href: '/tags' }),
      taxRefund ? row({ avatar: avatar('percent'), title: t('prof_more_tax'), href: '/tax' }) : null),
    section({},
      row({ avatar: avatar('download'), title: t('prof_more_export'), href: '/export' }),
      row({ avatar: avatar('upload'), title: t('prof_more_import'), href: '/import' })),
    section({},
      row({ avatar: avatar('settings'), title: t('prof_more_settings'), href: '/settings' }),
      row({ avatar: avatar('gift'), title: t('prof_more_invite'), href: '/more/invite' }),
      row({ avatar: avatar('info'), title: t('prof_more_help'), href: '/more/help' }),
      m.isAdmin ? row({ avatar: avatar('shield'), title: t('prof_more_admin'), href: '/admin' }) : null));
}

// «🎁 Пригласить друга»: ссылка (тап — скопировать), статистика, «Отправить другу» — окно «Поделиться» Telegram
function invite() {
  return async(() => api.get('/invite'), (data) => {
    mainButton.push({ text: t('prof_invite_send'), onClick: () => openTelegramLink(data.shareUrl) });
    return page({ title: t('prof_invite_title') },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-value prof-hero-text' }, t('prof_invite_bonus', { days: data.days })),
        h('div', { class: 'hero-note' }, t('prof_invite_rule', { expenses: data.expenses, activeDays: data.activeDays }))),
      section({ footer: t('prof_invite_link_hint') },
        row({ avatar: avatar('gift'), title: h('span', { class: 'prof-link' }, data.link), onClick: () => copyText(data.link), chevron: false })),
      stats([
        { label: t('prof_invite_came'), value: String(data.stats.invited) },
        { label: t('prof_invite_started'), value: String(data.stats.activated) }
      ]),
      section({ footer: data.stats.capped ? t('prof_invite_capped', { max: data.stats.maxDays, days: data.days }) : null },
        row({ title: t('prof_invite_earned'), value: t('prof_invite_days_of', { days: data.stats.days, max: data.stats.maxDays }) }),
        row({ title: t('prof_invite_copy_text'), onClick: () => copyText(`${data.shareText}\n\n${data.link}`) })));
  });
}

// Сообщить об ошибке или идея — шторка с полем и главной кнопкой
function bugReport() {
  let text = '';
  const input = field({ placeholder: t('prof_bug_placeholder'), multiline: true, maxlength: 1000, onInput: (v) => { text = v; s.button.update({ enabled: !!text.trim() }); } });
  const s = sheet({
    title: t('prof_bug_title'),
    content: h('div', null, h('div', { class: 'section-body' }, input), h('div', { class: 'section-footer' }, t('prof_bug_hint'))),
    mainButton: {
      text: t('prof_bug_send'),
      enabled: false,
      onClick: async () => {
        s.button.busy(true);
        const ok = await act(() => api.post('/bug-reports', { text }));
        s.button.busy(false);
        if (ok) { s.close(); toast(t('prof_bug_thanks')); }
      }
    }
  });
  setTimeout(() => input.input.focus(), 250);
}

// Справка: как вести учёт (кратко), ошибка/идея, поддержка и документы для платежей
function help() {
  return async(() => api.get('/help'), (info) => page({ title: t('prof_help_title') },
    section({},
      row({ avatar: avatar('edit'), title: t('prof_help_write'), subtitle: t('prof_help_write_text') }),
      row({ avatar: avatar('camera'), title: t('prof_help_receipt'), subtitle: t('prof_help_receipt_text') }),
      row({ avatar: avatar('bell'), title: t('prof_help_bank'), subtitle: t('prof_help_bank_text') }),
      row({ avatar: avatar('users'), title: t('prof_help_groups'), subtitle: t('prof_help_groups_text') })),
    section({},
      row({ avatar: avatar('help'), title: t('prof_help_bug'), onClick: bugReport })),
    section({ title: t('prof_help_support') },
      info.supportUsername ? row({ title: t('prof_help_write_support'), value: `@${info.supportUsername}`, onClick: () => openTelegramLink(`https://t.me/${info.supportUsername}`) }) : null,
      info.supportEmail ? row({ title: t('prof_help_email'), value: info.supportEmail, onClick: () => copyText(info.supportEmail), chevron: false }) : null,
      info.termsUrl ? row({ title: t('prof_help_terms'), onClick: () => openLink(info.termsUrl) }) : null,
      info.privacyUrl ? row({ title: t('prof_help_privacy'), onClick: () => openLink(info.privacyUrl) }) : null,
      info.refundUrl ? row({ title: t('prof_help_refund'), onClick: () => openLink(info.refundUrl) }) : null)));
}

export function register() {
  route('/more', more, { tab: 'more', root: true });
  route('/more/invite', wrapped(invite), { tab: 'more' });
  route('/more/help', wrapped(help), { tab: 'more' });
}
