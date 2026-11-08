const { ACHIEVEMENTS, TIERS, BY_CODE, LEVELS, CHALLENGE_WIN_XP, nextGoals } = require('../../utils/achievements');
const { COINS } = require('../../utils/constants');
const { addDays } = require('../../utils/period');
const CoinService = require('../../services/CoinService');

// «Достижения» в Mini App: уровень, серия, значки, челленджи, монеты, «Итоги месяца». Всё через AchievementService и
// CoinService — те же правила, итоги и начисления, что у экранов бота (ach…, coins, cnb/cnc). Тексты значков,
// уровней и челленджей — строки бота (ctx.t), без Markdown; подписи интерфейса — строки xtra_ach_* на клиенте.
const KINDS = ['no_spend', 'no_category', 'budget_month'];
const OFFSET = { min: -120, max: 0 };
const REDEEM_KEY = /^[A-Za-z0-9-]{8,64}$/;
// Ведущий эмодзи строки бота → значок слева
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)\s*/u;

// Markdown строк бота → простой текст: *жирный*, _курсив_, `код` и экранирование «\_»
const plain = (text) => String(text || '').replace(/\\([_*`[\]])|[*_`]/g, (match, escaped) => escaped || '');

function note(text) {
  const line = plain(text).trim();
  const match = line.match(LEADING_EMOJI);
  return match ? { icon: match[1], text: line.slice(match[0].length) } : { icon: null, text: line };
}

function localDay(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
}

module.exports = (router, { get, http }) => {
  const conflict = (code) => new http.HttpError(409, code);

  function badge(service, ctx, a, extra = {}) {
    const desc = plain(ctx.t(`ach_${a.code}_desc`));
    return {
      code: a.code, emoji: a.emoji, tier: a.tier, xp: a.xp, title: plain(service.title(ctx.lang, a.code)),
      desc: desc.charAt(0).toUpperCase() + desc.slice(1), ...extra
    };
  }

  function challengeView(service, ctx, challenge, result = null) {
    const view = {
      id: Number(challenge.id),
      kind: challenge.kind,
      name: plain(service.challengeName(ctx.lang, challenge)),
      start: challenge.start_date,
      last: addDays(challenge.end_date, -1)
    };
    if (result) {
      Object.assign(view, { progress: Number(result.progress) || 0, target: Number(result.target) || 0, daysLeft: result.daysLeft });
      if (challenge.kind === 'budget_month') view.currency = (result.budget && result.budget.currency) || ctx.currency;
    }
    return view;
  }

  // Заметки экрана — то же, что бот пишет сверху при заходе (и так же ставятся один раз): сработавшая заморозка, итоги
  // челленджей, новые значки (или сюрприз за историю), новый уровень. Данными — текст собирает клиент
  function notesOf(service, ctx, overview) {
    const { snap, grant } = overview;
    const notes = [];
    if (snap.newFreezes.length) notes.push({ kind: 'freeze', dates: snap.newFreezes, days: snap.streak.current });
    for (const c of overview.finished) {
      notes.push({ kind: c.status === 'won' ? 'won' : 'lost', name: plain(service.challengeName(ctx.lang, c)), xp: CHALLENGE_WIN_XP });
    }
    if (grant.retroactive) {
      notes.push({ kind: 'surprise', count: grant.unlocked.length });
    } else {
      for (const code of grant.unlocked) {
        const a = BY_CODE.get(code);
        if (a) notes.push({ kind: 'badge', emoji: a.emoji, title: plain(service.title(ctx.lang, code)), xp: a.xp });
      }
      if (grant.levelUp) notes.push({ kind: 'level', level: grant.level.level, name: plain(service.levelName(ctx.lang, grant.level.level)) });
    }
    return notes;
  }

  // ---------- Достижения ----------

  router.get('/achievements', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const service = get('achievementService');
    const overview = await service.getOverview(req.userId, ctx.lang);
    const { snap, level, xp } = overview;
    res.json({
      level: { level: level.level, max: LEVELS.length, name: plain(service.levelName(ctx.lang, level.level)), xp, next: level.next, ratio: level.ratio },
      streak: { current: snap.streak.current, best: snap.stats.bestStreak, atRisk: !!snap.streak.atRisk },
      freezes: { left: snap.streak.freezesLeft, total: snap.freezesPerWeek },
      coins: overview.coins === undefined ? null : overview.coins,
      unlocked: snap.unlocked.size,
      total: ACHIEVEMENTS.length,
      notes: notesOf(service, ctx, overview),
      next: nextGoals(snap.stats, snap.unlocked, 3).map(g => badge(service, ctx, g.achievement, { current: g.current, target: g.target })),
      active: overview.active.map(({ challenge, result }) => challengeView(service, ctx, challenge, result)),
      // «Сегодня без трат» — как кнопка бота: сегодня нет трат и отметки
      canMarkNoSpend: !snap.expenseDays.has(snap.today) && !snap.markDays.has(snap.today)
    });
  }));

  router.get('/achievements/catalog', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const service = get('achievementService');
    const snap = await service.snapshot(req.userId, { commitFreezes: false });
    const progress = new Map(nextGoals(snap.stats, snap.unlocked, ACHIEVEMENTS.length).map(g => [g.achievement.code, g]));
    const unlockedAt = new Map(snap.unlockedRows.map(row => [row.code, row.unlocked_at]));
    res.json({
      unlocked: snap.unlocked.size,
      total: ACHIEVEMENTS.length,
      tiers: TIERS.map(tier => ({
        tier,
        name: plain(ctx.t(`ach_tier_${tier}`)),
        items: ACHIEVEMENTS.filter(a => a.tier === tier).map((a) => {
          if (snap.unlocked.has(a.code)) {
            const at = unlockedAt.get(a.code);
            return badge(service, ctx, a, { unlocked: true, date: at ? localDay(at, snap.timezone) : null });
          }
          const goal = progress.get(a.code);
          return badge(service, ctx, a, { unlocked: false, current: goal ? goal.current : 0, target: goal ? goal.target : null });
        })
      }))
    });
  }));

  router.post('/achievements/no-spend', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const result = await get('achievementService').markNoSpend(req.userId, ctx.lang);
    if (result.error) throw conflict(result.error === 'spent' ? 'achievements_spent' : 'achievements_marked');
    res.json({ message: note(ctx.t('ach_no_spend_marked')).text, notes: String(result.note || '').split('\n').filter(Boolean).map(note) });
  }));

  // ---------- Челленджи ----------

  router.get('/achievements/challenges', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const service = get('achievementService');
    const overview = await service.getOverview(req.userId, ctx.lang);
    const finished = await service.getFinishedChallenges(req.userId);
    const activeKinds = new Set(overview.active.map(item => item.challenge.kind));
    const limit = overview.snap.limits.MAX_ACTIVE_CHALLENGES;
    res.json({
      notes: notesOf(service, ctx, overview),
      active: overview.active.map(({ challenge, result }) => challengeView(service, ctx, challenge, result)),
      finished: finished.map(c => ({ ...challengeView(service, ctx, c), status: c.status })),
      // Бесплатно — 1 активный (премиум — без ограничений: null)
      limit: Number.isFinite(limit) ? limit : null,
      // Кнопки старта — как в боте: «без трат» и «в бюджете» не повторяются, «без категории» — для другой категории
      available: KINDS.filter(kind => kind === 'no_category' || !activeKinds.has(kind))
    });
  }));

  router.get('/achievements/challenges/categories', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const categories = await get('achievementService').challengeCategories(req.userId);
    const formatter = get('formatter');
    const localization = get('localizationService');
    res.json({
      categories: categories.map(c => ({
        id: Number(c.id), name: c.name, icon: c.icon || null, label: formatter.translateCategoryName(c.name, localization, ctx.lang)
      }))
    });
  }));

  router.post('/achievements/challenges', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const kind = KINDS.includes(body.kind) ? body.kind : null;
    if (!kind) throw http.badRequest('achievements_bad_kind');
    let categoryName = null;
    if (kind === 'no_category') {
      const id = http.int(body.categoryId, { min: 1, max: 2147483647, code: 'achievements_bad_category' });
      const category = await get('expenseService').getCategoryById(req.userId, id);
      if (!category) throw http.notFound();
      categoryName = category.name;
    }
    const service = get('achievementService');
    const result = await service.startChallenge(req.userId, kind, { categoryName });
    if (result.error === 'duplicate') throw conflict('achievements_duplicate');
    if (result.error === 'limit') throw http.premiumRequired('challenges');
    if (result.error === 'no_budget') throw conflict('achievements_no_budget');
    res.status(201).json({ challenge: challengeView(service, ctx, result.challenge) });
  }));

  router.delete('/achievements/challenges/:id', http.wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw http.notFound();
    const service = get('achievementService');
    const challenge = await service.getChallenge(req.userId, id);
    if (!challenge) throw http.notFound();
    if (!(await service.cancelChallenge(req.userId, id))) throw conflict('achievements_finished');
    res.json({ ok: true });
  }));

  // ---------- Монеты ----------

  router.get('/achievements/coins', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const coinService = get('coinService');
    const overview = await coinService.getOverview(req.userId);
    const quotes = await Promise.all(overview.shop.map(item => coinService.quote(req.userId, item.days, overview)));
    res.json({
      balance: overview.balance,
      left: overview.left,
      cap: overview.cap,
      earn: { day: COINS.DAY, streak: COINS.STREAK_WEEK, plan: COINS.PLAN_KEPT, challenge: COINS.CHALLENGE_WON, xpPerCoin: COINS.XP_PER_COIN },
      shop: quotes.map(q => ({ days: q.days, price: q.price, blocked: q.blocked, need: q.need, until: localDay(q.expiresAt, ctx.timezone) })),
      history: overview.history.map((row) => {
        const reason = CoinService.REASONS.includes(row.reason) ? row.reason : 'other';
        const label = plain(ctx.t(`coins_reason_${reason}`, { days: Math.abs(Number(row.days) || 0) }));
        return {
          amount: Number(row.amount),
          label: label.charAt(0).toUpperCase() + label.slice(1),
          date: localDay(row.created_at, ctx.timezone)
        };
      })
    });
  }));

  // Обмен: key — одно подтверждение (клиент создаёт его при открытии подтверждения): повтор не списывает второй раз
  router.post('/achievements/coins/redeem', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    const days = http.int(body.days, { code: 'achievements_bad_days' });
    if (!COINS.SHOP.some(item => item.days === days)) throw http.badRequest('achievements_bad_days');
    const key = typeof body.key === 'string' && REDEEM_KEY.test(body.key) ? body.key : null;
    if (!key) throw http.badRequest('achievements_bad_key');
    const result = await get('coinService').redeem(req.userId, days, { idempotencyKey: `app:${key}` });
    if (result.status === 'ok') {
      return res.json({ status: 'ok', days: result.days, balance: result.balance, left: result.left, until: localDay(result.expiresAt, ctx.timezone) });
    }
    if (result.status === 'duplicate') return res.json({ status: 'duplicate', balance: result.balance });
    if (result.status === 'cap') throw conflict('achievements_coins_cap');
    if (result.status === 'insufficient') throw conflict('achievements_coins_short');
    if (result.status === 'failed') throw new http.HttpError(503, 'achievements_coins_failed');
    throw http.badRequest('achievements_bad_days');
  }));

  // ---------- «Итоги месяца» ----------

  router.get('/achievements/wrapped', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const offset = http.int(req.query.offset, { ...OFFSET, def: -1, code: 'achievements_bad_offset' });
    const service = get('achievementService');
    const [wrapped, enabled] = await Promise.all([service.buildWrapped(req.userId, ctx.lang, offset), service.isWrappedEnabled(req.userId)]);
    const period = wrapped ? wrapped.period : (await get('expenseService').getPeriodContext(req.userId, 'month', offset)).period;
    let data = null;
    if (wrapped) {
      const { card, facts } = wrapped;
      const formatter = get('formatter');
      const localization = get('localizationService');
      data = {
        currency: card.currency,
        total: card.total,
        count: card.count,
        days: card.days,
        top: card.top ? {
          label: formatter.translateCategoryName(card.top.name, localization, ctx.lang),
          icon: facts.topIcon || null,
          total: card.top.total,
          percent: card.top.percent,
          comparison: card.comparison
            ? note(ctx.t('ach_wrapped_comparison', { count: card.comparison.count, item: ctx.t(`ach_wrapped_item_${card.comparison.key}`) })).text
            : null
        } : null,
        biggestDay: card.biggestDay,
        keywords: facts.keywords.map(k => ({ key: k.key, label: note(ctx.t(`ach_wrapped_kw_${k.key}`)).text, count: k.count })),
        streak: facts.streak,
        badges: facts.badges.map(code => BY_CODE.get(code)).filter(Boolean).map(a => ({ code: a.code, emoji: a.emoji, title: plain(service.title(ctx.lang, a.code)) })),
        goal: facts.goal
      };
    }
    res.json({ offset, period: { start: period.start, last: period.last }, enabled, canShare: !!wrapped && service.canShareWrapped, data });
  }));

  router.put('/achievements/wrapped/settings', http.wrap(async (req, res) => {
    const enabled = req.body ? req.body.enabled : undefined;
    if (typeof enabled !== 'boolean') throw http.badRequest('achievements_bad_enabled');
    await get('achievementService').setWrappedEnabled(req.userId, enabled);
    res.json({ enabled });
  }));

  // Карточка итогов картинкой — в чат с ботом (как achwi): её пересылают друзьям
  router.post('/achievements/wrapped/share', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const offset = http.int((req.body || {}).offset, { ...OFFSET, code: 'achievements_bad_offset' });
    const status = await get('achievementService').shareWrapped(req.userId, ctx.lang, offset);
    if (status === 'empty') throw conflict('achievements_wrapped_empty');
    if (status !== 'sent') throw new http.HttpError(503, 'achievements_share_unavailable');
    res.json({ ok: true });
  }));
};
