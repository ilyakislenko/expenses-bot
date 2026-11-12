// «⭐️ Премиум» (/limits бота): статус и срок, что даёт премиум, тарифы Stars (счёт — openInvoice, оплату засчитывает
// бот), семейный тариф, история покупок, пожертвование, «Почему платно»
import { route, navigate } from '../core/router.js';
import { h, page, section, row, avatar, async, sheet, field, empty } from '../core/ui.js';
import { t, number } from '../core/i18n.js';
import { api } from '../core/api.js';
import { payInvoice, tariffLabel, stars, priceText, dateText, wrapped, screenButton } from './profileKit.js';

// Строка тарифа в списке: длительность, цена в звёздах, скидка и цена в валюте
export function tariffRow(tariff, currency, onPick) {
  const sub = [];
  if (tariff.subscription) sub.push(t('prof_tariff_auto'));
  if (tariff.perMonthStars) sub.push(t('prof_tariff_per_month', { stars: number(tariff.perMonthStars, 1) }));
  sub.push(priceText(tariff.price, currency));
  return row({
    title: tariffLabel(tariff.duration),
    subtitle: sub.join(' · '),
    value: stars(tariff.stars),
    valueNote: tariff.percent > 0 ? `−${tariff.percent}%` : null,
    valueTone: tariff.percent > 0 ? 'good' : null,
    onClick: () => onPick(tariff),
    chevron: false
  });
}

// Шторка тарифов: касание тарифа — счёт Stars; выгоднее (дольше) — выше. Пока открыта, кнопка экрана спрятана
function tariffsSheet(button) {
  button.hide();
  const s = sheet({
    title: t('prof_tariffs_title'),
    onClose: button.show,
    content: async(() => api.get('/premium/tariffs'), (data) => {
      const pay = async (tariff) => {
        if (await payInvoice(() => api.post('/premium/invoice', { duration: tariff.duration }))) s.close();
      };
      const footer = [t('prof_tariffs_footer'), t('prof_stars_short')];
      if (data.subscription) footer.push(t('prof_tariffs_subscribed', { date: dateText(data.subscription.expiresAt) }));
      const tariffs = data.tariffs.filter(x => x.available).sort((a, b) => b.duration - a.duration);
      return h('div', null,
        section({ footer: footer.join(' ') }, tariffs.map(x => tariffRow(x, data.currency, pay))),
        section({}, row({ avatar: avatar('users'), title: t('prof_premium_family_plan'), subtitle: t('prof_family_plan_short', { stars: data.family.stars, max: data.family.max }), onClick: () => { s.close(); navigate('/family/plan'); } })));
    })
  });
}

// Пожертвование: звёзды и письмо, затем счёт
function donateSheet() {
  let amount = '';
  let message = '';
  const starsField = field({ label: t('prof_donate_stars'), type: 'number', inputmode: 'numeric', placeholder: '100', onInput: (v) => { amount = v; update(); } });
  const messageField = field({ placeholder: t('prof_donate_message'), multiline: true, maxlength: 500, onInput: (v) => { message = v; } });
  const valid = () => /^\d{1,4}$/.test(amount) && Number(amount) >= 1 && Number(amount) <= 2500;
  const s = sheet({
    title: t('prof_donate_title'),
    content: h('div', null, h('div', { class: 'section-body' }, starsField, messageField), h('div', { class: 'section-footer' }, t('prof_donate_hint'))),
    mainButton: {
      text: t('prof_donate_pay'),
      enabled: false,
      onClick: async () => {
        s.button.busy(true);
        const paid = await payInvoice(() => api.post('/premium/donate', { stars: Number(amount), message }), { premium: false });
        s.button.busy(false);
        if (paid) s.close();
      }
    }
  });
  function update() { s.button.update({ enabled: valid() }); }
  setTimeout(() => starsField.input.focus(), 250);
}

function whySheet(button) {
  button.hide();
  sheet({ title: t('prof_why_title'), onClose: button.show, content: async(() => api.get('/premium/why'), (data) => h('div', { class: 'prof-sheet-text' }, data.text)) });
}

// «Как купить звёзды»: покупаются в Telegram прямо в окне оплаты
function starsSheet(button) {
  button.hide();
  sheet({ title: t('prof_stars_title'), onClose: button.show, content: h('div', { class: 'prof-sheet-text' }, t('prof_stars_text')) });
}

// Hero: статус премиума, срок и пояснение
function hero(p) {
  let value;
  let note = null;
  if (!p.active) {
    value = t('prof_premium_off');
    if (p.recentCount > 0) note = t('prof_premium_hook', { count: p.recentCount });
  } else if (p.status === 'family') {
    value = t('prof_premium_from_family');
    note = t('prof_premium_family_payer', { name: p.family.payerName, date: dateText(p.family.expiresAt) });
  } else {
    value = t('prof_until', { date: dateText(p.expiresAt) });
    note = p.status === 'trial' ? t('prof_premium_trial_note', { days: p.daysRemaining }) : t('prof_days_left', { n: p.daysRemaining });
  }
  return h('div', { class: 'hero' },
    p.status === 'trial' ? h('div', { class: 'hero-label' }, t('prof_premium_trial')) : null,
    h('div', { class: `hero-value prof-hero-text${p.active ? ' tone-good' : ''}` }, value),
    note ? h('div', { class: 'hero-note' }, note) : null);
}

// Что даёт премиум: бесплатно → с премиумом (USER_LIMITS)
function benefits(p) {
  const { free, premium } = p.limits;
  const line = (icon, title, subtitle) => row({ avatar: avatar(icon), title, subtitle });
  return section({ title: t('prof_benefits_title') },
    line('target', t('prof_benefit_budgets'), t('prof_benefit_budgets_text')),
    line('chart', t('prof_benefit_reports'), t('prof_benefit_reports_text')),
    line('users', t('prof_benefit_family'), t('prof_benefit_family_text', { max: p.familyMax, stars: p.familyMonthStars })),
    p.receipts ? line('camera', t('prof_benefit_receipts'), t('prof_per_month_vs', { premium: premium.MAX_RECEIPTS_PER_MONTH, free: free.MAX_RECEIPTS_PER_MONTH })) : null,
    p.voice ? line('mic', t('prof_benefit_voice'), t('prof_per_day_vs', { premium: premium.MAX_VOICE_PER_DAY, free: free.MAX_VOICE_PER_DAY })) : null,
    line('sparkles', t('prof_benefit_questions'), t('prof_per_day_vs', { premium: premium.MAX_ASSISTANT_QUESTIONS_PER_DAY, free: free.MAX_ASSISTANT_QUESTIONS_PER_DAY })),
    line('tag', t('prof_benefit_categories'), t('prof_benefit_categories_text', { n: premium.MAX_CUSTOM_CATEGORIES, length: premium.MAX_DESCRIPTION_LENGTH })),
    line('piggy', t('prof_benefit_goals'), t('prof_vs', { premium: premium.MAX_SAVINGS_GOALS, free: free.MAX_SAVINGS_GOALS })));
}

function premiumScreen(ctx) {
  ctx.onChange('premium', ctx.refresh);
  return async(() => api.get('/premium'), (p) => {
    const button = screenButton(ctx, { text: p.active ? t('prof_premium_extend') : t('prof_premium_choose'), onClick: () => tariffsSheet(button) });
    const footer = [];
    if (p.ownerPlan) footer.push(t('prof_family_plan_paid', { date: dateText(p.ownerPlan.expiresAt), members: p.ownerPlan.members, max: p.ownerPlan.max }));
    if (p.subscription) footer.push(t('prof_subscription_info', { date: dateText(p.subscription.expiresAt) }));
    return page({ title: t('prof_premium_title') },
      hero(p),
      footer.length ? h('div', { class: 'section-footer prof-under-hero' }, footer.join('\n')) : null,
      benefits(p),
      section({},
        row({ avatar: avatar('users'), title: t('prof_premium_family_plan'), href: '/family/plan' }),
        p.referral ? row({ avatar: avatar('gift'), title: t('prof_more_invite'), subtitle: t('prof_invite_short', { days: p.referral.days }), href: '/more/invite' }) : null,
        row({ avatar: avatar('receipt'), title: t('prof_history_title'), href: '/premium/history' })),
      section({},
        row({ avatar: avatar('info'), title: t('prof_stars_title'), onClick: () => starsSheet(button) }),
        row({ avatar: avatar('help'), title: t('prof_why_title'), onClick: () => whySheet(button) }),
        row({ avatar: avatar('star'), title: t('prof_donate_title'), onClick: donateSheet })));
  });
}

const KIND_KEYS = { paid: 'prof_kind_paid', family: 'prof_kind_family', granted: 'prof_kind_granted', referral: 'prof_kind_referral', trial: 'prof_kind_trial', bonus: 'prof_kind_bonus', donation: 'prof_kind_donation' };

function historyScreen() {
  return async(() => api.get('/premium/history'), ({ items }) => {
    if (!items.length) return page({ title: t('prof_history_title') }, empty({ icon: 'receipt', title: t('prof_history_empty') }));
    return page({ title: t('prof_history_title') },
      section({}, items.map(item => {
        const sub = [dateText(item.at)];
        if (item.days) sub.push(t('prof_days_short', { n: item.days }));
        if (item.recurring) sub.push(t('prof_tariff_auto'));
        if (item.status === 'refunded') sub.push(t('prof_refunded'));
        return row({
          title: t(KIND_KEYS[item.kind] || 'prof_kind_bonus'),
          subtitle: sub.join(' · '),
          value: item.stars ? stars(item.stars) : null,
          valueTone: item.status === 'refunded' ? 'hint' : null
        });
      })));
  });
}

export function register() {
  route('/premium', wrapped(premiumScreen), { tab: 'more' });
  route('/premium/history', wrapped(historyScreen), { tab: 'more' });
}
