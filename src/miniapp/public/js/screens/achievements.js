// «Достижения»: уровень и серия, заметки (итоги челленджей, новые значки), ближайшие значки, челленджи, монеты и
// обмен на премиум, «Итоги месяца». Правила и тексты значков — с сервера (api/achievements.js), как в боте.
import { h, icon, page, section, row, avatar, progress, stats, stepper, toggle, sheet, pick, toast, empty, errorText, async as load, act } from '../core/ui.js';
import { route, navigate, changed } from '../core/router.js';
import { t, number, moneyRound, dayLabel, longDate, shortDate, periodLabel, today } from '../core/i18n.js';
import { api, qs, ApiError } from '../core/api.js';
import { mainButton, confirm, haptic } from '../core/tg.js';
import { reloadMe } from '../core/session.js';

const KIND_ICONS = { no_spend: 'wallet', no_category: 'tag', budget_month: 'target' };
const NOTE_ICONS = { freeze: 'shield', won: 'trophy', lost: 'info', surprise: 'gift', level: 'star' };
const MIN_OFFSET = -120;

// Полоска прогресса в подписи строки
function bar(ratio, tone = 'accent') {
  return h('div', { class: 'xa-bar' }, progress(ratio, { tone }));
}

// Кнопка, которая после загрузки данных ставит MainButton, — только если экран ещё открыт
function alive(ctx) {
  const state = { left: false };
  ctx.onLeave(() => { state.left = true; });
  return state;
}

function noteText(n) {
  if (n.kind === 'freeze') return t('xtra_ach_note_freeze', { dates: n.dates.map(shortDate).join(', '), days: n.days });
  if (n.kind === 'won') return t('xtra_ach_note_won', { name: n.name, xp: n.xp });
  if (n.kind === 'lost') return t('xtra_ach_note_lost', { name: n.name });
  if (n.kind === 'surprise') return t('xtra_ach_note_surprise', { count: n.count });
  if (n.kind === 'badge') return t('xtra_ach_note_badge', { title: n.title, xp: n.xp });
  if (n.kind === 'level') return t('xtra_ach_note_level', { level: n.level, name: n.name });
  return '';
}

function notesSection(notes) {
  if (!notes || !notes.length) return null;
  return h('div', { class: 'xa-wrap' }, section({}, notes.map(n => row({
    avatar: n.kind === 'badge' ? avatar(n.emoji) : avatar(NOTE_ICONS[n.kind] || 'sparkles'),
    title: noteText(n)
  }))));
}

function challengeProgress(c) {
  if (c.kind === 'budget_month') {
    return t('xtra_ach_ch_progress_budget_month', { spent: moneyRound(c.progress, c.currency), limit: moneyRound(c.target, c.currency), left: c.daysLeft });
  }
  return t(`xtra_ach_ch_progress_${c.kind}`, { progress: c.progress, target: c.target, left: c.daysLeft });
}

function challengeRatio(c) {
  return c.target > 0 ? c.progress / c.target : 0;
}

// ---------- /achievements ----------

async function markNoSpend() {
  const result = await act(() => api.post('/achievements/no-spend'));
  if (!result) return;
  toast([result.message, ...result.notes.map(n => n.text)].join(' '), { duration: result.notes.length ? 5000 : 3200 });
  changed('achievements');
}

function renderMain(ctx) {
  ['achievements', 'expenses', 'income'].forEach(topic => ctx.onChange(topic, ctx.refresh));
  return page({ title: t('xtra_ach_title') }, load(() => api.get('/achievements'), (d) => {
    const level = d.level;
    return h('div', null,
      h('div', { class: 'hero' },
        h('div', { class: 'hero-label' }, t('xtra_ach_level', { level: level.level, max: level.max })),
        h('div', { class: 'hero-value' }, level.name),
        h('div', { class: 'xa-hero-bar' }, progress(level.ratio, { tone: 'accent' })),
        h('div', { class: 'hero-note' }, level.next === null
          ? t('xtra_ach_xp_max', { xp: number(level.xp) })
          : t('xtra_ach_xp_next', { xp: number(level.xp), next: number(level.next) }))),
      notesSection(d.notes),
      section({},
        row({
          title: t('xtra_ach_streak'),
          subtitle: d.streak.atRisk ? h('span', { class: 'tone-warn' }, t('xtra_ach_at_risk')) : t('xtra_ach_best', { n: d.streak.best }),
          value: t('xtra_ach_days', { n: d.streak.current })
        }),
        row({ title: t('xtra_ach_freezes'), subtitle: t('xtra_ach_freezes_hint'), value: t('xtra_ach_of', { a: d.freezes.left, b: d.freezes.total }) }),
        d.canMarkNoSpend ? row({ title: t('xtra_ach_no_spend'), subtitle: t('xtra_ach_no_spend_hint'), tone: 'accent', chevron: false, onClick: markNoSpend }) : null,
        d.coins !== null ? row({ title: t('xtra_ach_coins_title'), value: number(d.coins), href: '/achievements/coins' }) : null),
      section({ title: t('xtra_ach_next') }, d.next.map(b => row({
        avatar: avatar(b.emoji), title: b.title, subtitle: bar(b.target ? b.current / b.target : 0), value: `${b.current}/${b.target}`
      }))),
      h('div', { class: 'xa-lines' }, section({ title: t('xtra_ach_challenges') }, d.active.length
        ? d.active.map(c => row({ avatar: avatar(KIND_ICONS[c.kind]), title: c.name, subtitle: challengeProgress(c), href: '/achievements/challenges' }))
        : row({ avatar: avatar('trophy'), title: t('xtra_ach_ch_begin'), subtitle: t('xtra_ach_ch_begin_hint'), href: '/achievements/challenges' }))),
      section({},
        row({ title: t('xtra_ach_all'), value: t('xtra_ach_of', { a: d.unlocked, b: d.total }), href: '/achievements/all' }),
        row({ title: t('xtra_ach_wrapped'), href: '/achievements/wrapped' })));
  }));
}

// ---------- /achievements/all ----------

function renderAll() {
  return page({ title: t('xtra_ach_all') }, load(() => api.get('/achievements/catalog'), (d) => h('div', { class: 'xa-lines' },
    d.tiers.map(tier => section({
      title: `${tier.name} · ${tier.items.filter(item => item.unlocked).length}/${tier.items.length}`
    }, tier.items.map((item) => {
      const el = row({
        avatar: avatar(item.emoji),
        title: item.title,
        subtitle: item.desc,
        value: !item.unlocked && item.current > 0 ? `${item.current}/${item.target}` : null,
        trailing: item.unlocked ? icon('check', { cls: 'row-chevron tone-good' }) : null
      });
      if (!item.unlocked) el.classList.add('xa-locked');
      return el;
    }))))));
}

// ---------- /achievements/challenges ----------

async function startChallenge(kind) {
  let categoryId;
  if (kind === 'no_category') {
    let categories;
    try {
      ({ categories } = await api.get('/achievements/challenges/categories'));
    } catch (error) {
      haptic.error();
      toast(errorText(error));
      return;
    }
    categoryId = await pick({
      title: t('xtra_ach_ch_pick'),
      options: categories.map(c => ({ value: c.id, label: c.label, avatar: avatar(c.icon || '📦') }))
    });
    if (!categoryId) return;
  }
  try {
    const { challenge } = await api.post('/achievements/challenges', { kind, categoryId });
    haptic.success();
    toast(t('xtra_ach_ch_started', { date: dayLabel(challenge.last) }));
    changed('achievements');
  } catch (error) {
    haptic.error();
    if (error instanceof ApiError && error.status === 402) return navigate('/premium');
    if (error instanceof ApiError && error.code === 'achievements_no_budget') {
      if (await confirm(t('xtra_ach_ch_need_budget'))) navigate('/budgets');
      return;
    }
    toast(errorText(error));
  }
}

function challengeSheet(c) {
  sheet({
    title: c.name,
    content: (close) => h('div', null,
      section({},
        row({ title: challengeProgress(c), subtitle: bar(challengeRatio(c), c.kind === 'budget_month' ? null : 'good') }),
        row({ title: t('xtra_ach_ch_last_day'), value: dayLabel(c.last) })),
      h('button', {
        class: 'btn danger',
        onclick: async () => {
          haptic.warn();
          if (!(await confirm(t('xtra_ach_ch_give_up_confirm', { name: c.name })))) return;
          const done = await act(() => api.del(`/achievements/challenges/${c.id}`), { success: t('xtra_ach_ch_given_up') });
          if (!done) return;
          close();
          changed('achievements');
        }
      }, t('xtra_ach_ch_give_up')))
  });
}

function renderChallenges(ctx) {
  ctx.onChange('achievements', ctx.refresh);
  ctx.onChange('expenses', ctx.refresh);
  return page({ title: t('xtra_ach_challenges') }, load(() => api.get('/achievements/challenges'), (d) => h('div', null,
    notesSection(d.notes),
    section({ title: t('xtra_ach_ch_active') }, d.active.map(c => row({
      avatar: avatar(KIND_ICONS[c.kind]), title: c.name, subtitle: challengeProgress(c), onClick: () => challengeSheet(c)
    }))),
    h('div', { class: 'xa-lines' }, section({
      title: t('xtra_ach_ch_start'),
      footer: d.limit !== null && d.active.length >= d.limit ? t('xtra_ach_ch_limit') : null
    }, d.available.map(kind => row({
      avatar: avatar(KIND_ICONS[kind]), title: t(`xtra_ach_ch_${kind}`), subtitle: t(`xtra_ach_ch_${kind}_desc`), onClick: () => startChallenge(kind)
    })))),
    section({ title: t('xtra_ach_ch_recent') }, d.finished.map(c => row({
      avatar: avatar(KIND_ICONS[c.kind]), title: c.name,
      value: t(c.status === 'won' ? 'xtra_ach_ch_won' : 'xtra_ach_ch_lost'), valueTone: c.status === 'won' ? 'good' : 'hint'
    }))))));
}

// ---------- /achievements/coins ----------

function redeemKey() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
}

function redeemSheet(item, balance) {
  // Ключ — одно подтверждение: повторное нажатие или повтор после обрыва связи не спишет монеты второй раз
  const key = redeemKey();
  let busy = false;
  const s = sheet({
    title: t('xtra_ach_coins_days', { days: item.days }),
    content: section({},
      row({ title: t('xtra_ach_coins_spend'), value: t('xtra_ach_coins_cost', { price: number(item.price) }) }),
      row({ title: t('xtra_ach_coins_until'), value: longDate(item.until) }),
      row({ title: t('xtra_ach_coins_rest'), value: number(balance - item.price) })),
    mainButton: {
      text: t('xtra_ach_coins_confirm', { price: number(item.price) }),
      onClick: async () => {
        if (busy) return;
        busy = true;
        s.button.busy(true);
        try {
          const result = await api.post('/achievements/coins/redeem', { days: item.days, key });
          haptic.success();
          s.close();
          toast(result.status === 'ok' ? t('xtra_ach_coins_done', { date: longDate(result.until) }) : t('xtra_ach_coins_already'));
          await reloadMe().catch(() => {});
          changed('premium');
          changed('achievements');
        } catch (error) {
          busy = false;
          s.button.busy(false);
          haptic.error();
          toast(errorText(error));
        }
      }
    }
  });
}

function renderCoins(ctx) {
  ctx.onChange('achievements', ctx.refresh);
  return page({ title: t('xtra_ach_coins_title') }, load(() => api.get('/achievements/coins'), (d) => {
    const earn = [
      [t('xtra_ach_coins_earn_day'), `+${d.earn.day}`],
      [t('xtra_ach_coins_earn_streak'), `+${d.earn.streak}`],
      [t('xtra_ach_coins_earn_plan'), `+${d.earn.plan}`],
      [t('xtra_ach_coins_earn_challenge'), `+${d.earn.challenge}`],
      [t('xtra_ach_coins_earn_badge'), t('xtra_ach_coins_earn_badge_value', { n: d.earn.xpPerCoin })]
    ];
    return h('div', null,
      h('div', { class: 'hero' },
        h('div', { class: 'hero-label' }, t('xtra_ach_coins_balance')),
        h('div', { class: 'hero-value' }, number(d.balance)),
        h('div', { class: 'hero-note' }, t('xtra_ach_coins_left', { left: d.left, cap: d.cap }))),
      section({ title: t('xtra_ach_coins_shop') }, d.shop.map(item => row({
        title: t('xtra_ach_coins_days', { days: item.days }),
        subtitle: item.blocked === 'cap' ? t('xtra_ach_coins_capped')
          : item.blocked === 'insufficient' ? t('xtra_ach_coins_short', { need: number(item.need) }) : null,
        value: t('xtra_ach_coins_cost', { price: number(item.price) }),
        valueTone: item.blocked ? 'hint' : null,
        onClick: item.blocked ? null : () => redeemSheet(item, d.balance)
      }))),
      section({ title: t('xtra_ach_coins_earn') }, earn.map(([title, value]) => row({ title, value }))),
      section({ title: t('xtra_ach_coins_history') }, d.history.map(item => row({
        title: item.label,
        subtitle: dayLabel(item.date),
        value: item.amount > 0 ? `+${number(item.amount)}` : `−${number(Math.abs(item.amount))}`,
        valueTone: item.amount > 0 ? 'good' : null
      }))));
  }));
}

// ---------- /achievements/wrapped ----------

function renderWrapped(ctx) {
  const raw = Number(ctx.query.offset);
  const offset = Number.isInteger(raw) ? Math.max(MIN_OFFSET, Math.min(0, raw)) : -1;
  const screen = alive(ctx);
  ctx.onChange('expenses', ctx.refresh);
  const go = (value) => navigate(`/achievements/wrapped${qs({ offset: value })}`, { replace: true });

  return page({ title: t('xtra_ach_wrapped') }, load(() => api.get(`/achievements/wrapped${qs({ offset })}`), (d) => {
    // Другой год — с годом: листать можно далеко назад
    const year = d.period.last.slice(0, 4);
    const label = periodLabel(d.period) + (year !== today().slice(0, 4) ? ` ${year}` : '') + (offset === 0 ? ` · ${t('xtra_ach_wr_so_far')}` : '');
    if (d.canShare && !screen.left) {
      const button = mainButton.push({
        text: t('xtra_ach_wr_share'),
        onClick: async () => {
          button.busy(true);
          await act(() => api.post('/achievements/wrapped/share', { offset }), { success: t('xtra_ach_wr_shared') });
          button.busy(false);
        }
      });
    }
    const settings = section({}, row({
      title: t('xtra_ach_wr_send'),
      subtitle: t('xtra_ach_wr_send_hint'),
      trailing: toggle(d.enabled, async (enabled) => {
        const done = await act(() => api.put('/achievements/wrapped/settings', { enabled }), { success: t(enabled ? 'xtra_ach_wr_on' : 'xtra_ach_wr_off') });
        if (!done) ctx.refresh();
      })
    }));
    const nav = stepper(label, { onPrev: () => go(offset - 1), onNext: () => go(offset + 1), canNext: offset < 0, canPrev: offset > MIN_OFFSET });
    const w = d.data;
    if (!w) return h('div', null, nav, empty({ icon: 'calendar', title: t('xtra_ach_wr_empty_title'), text: t('xtra_ach_wr_empty') }), settings);
    const totals = stats([
      { label: t('xtra_ach_wr_spent'), value: moneyRound(w.total, w.currency) },
      { label: t('xtra_ach_wr_records'), value: number(w.count) },
      { label: t('xtra_ach_wr_days'), value: number(w.days) }
    ]);
    totals.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    return h('div', null,
      nav,
      totals,
      w.top ? section({ footer: w.top.comparison }, row({
        avatar: avatar(w.top.icon || '📦'),
        title: w.top.label,
        subtitle: t('xtra_ach_wr_top', { percent: w.top.percent }),
        value: moneyRound(w.top.total, w.currency)
      })) : null,
      section({},
        w.biggestDay ? row({ title: t('xtra_ach_wr_biggest'), subtitle: dayLabel(w.biggestDay.day), value: moneyRound(w.biggestDay.total, w.currency) }) : null,
        w.streak >= 2 ? row({ title: t('xtra_ach_wr_streak'), value: t('xtra_ach_days', { n: w.streak }) }) : null,
        w.keywords.map(k => row({ title: k.label, value: `×${k.count}` })),
        w.badges.length ? row({ title: t('xtra_ach_wr_badges'), subtitle: w.badges.map(b => `${b.emoji} ${b.title}`).join(', '), value: number(w.badges.length) }) : null,
        w.goal ? row({ title: w.goal.name, subtitle: t('xtra_ach_wr_goal'), value: `${w.goal.percent}%` }) : null),
      settings);
  }));
}

export function register() {
  route('/achievements', renderMain, { tab: 'more' });
  route('/achievements/all', renderAll, { tab: 'more' });
  route('/achievements/challenges', renderChallenges, { tab: 'more' });
  route('/achievements/coins', renderCoins, { tab: 'more' });
  route('/achievements/wrapped', renderWrapped, { tab: 'more' });
}
