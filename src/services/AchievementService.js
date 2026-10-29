const logger = require('../utils/logger');
const { localToday, addDays, customPeriod, lastDaysPeriod } = require('../utils/period');
const { computeStreak, bestStreak, completeMonths } = require('../utils/streak');
const {
  ACHIEVEMENTS, BY_CODE, earnedCodes, totalXp, levelForXp, pickHighlight, CHALLENGE_WIN_XP
} = require('../utils/achievements');
const { CHALLENGE_DAYS, NO_SPEND_TARGET, evaluateChallenge, countNoSpendDays } = require('../utils/challenges');
const { COMPARISON_ITEMS, countKeywords, pickComparison, biggestDay } = require('../utils/wrapped');
const { USER_LIMITS } = require('../utils/constants');
const { weekStart, weekStreak, bestWeekStreak } = require('../utils/quiz');

// Первое знакомство открывает значки за всю историю. До стольких — празднуем как обычно (новичок и его первая
// трата), больше — одна строка-сюрприз, без перечисления
const RETRO_CELEBRATE_MAX = 2;
const MAX_NOTE_LINES = 3;
// Сообщения cron (итоги челленджей, «Итоги месяца») — только днём по местному времени
const DAY_HOURS = { from: 10, to: 21 };
// Подпись к фото в Telegram — до 1024 символов
const CAPTION_LIMIT = 1024;

function localParts(timezone, now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

function shortDate(day) {
  const [, m, d] = day.split('-');
  return `${d}.${m}`;
}

class AchievementService {
  constructor({
    achievementRepository, userService, premiumService, expenseService, reportService, budgetService, savingsService,
    currencyUtils, formatter, localizationService, notificationService, userNotificationRepository, chartService = null,
    coinService = null
  }) {
    this.achievementRepository = achievementRepository;
    this.userService = userService;
    this.premiumService = premiumService;
    this.expenseService = expenseService;
    this.reportService = reportService;
    this.budgetService = budgetService;
    this.savingsService = savingsService;
    this.currencyUtils = currencyUtils;
    this.formatter = formatter;
    this.localizationService = localizationService;
    this.notificationService = notificationService;
    this.userNotificationRepository = userNotificationRepository;
    this.chartService = chartService;
    this.coinService = coinService; // «🪙 Монеты»: день с записями, серия, значки, челленджи
  }

  t(lang, key, params) {
    return this.localizationService.getText(lang, key, params);
  }

  title(lang, code) {
    return this.t(lang, `ach_${code}_title`);
  }

  levelName(lang, level) {
    return this.t(lang, `ach_level_${level}`);
  }

  // ========================================
  // СНИМОК: статистика, серия, значки
  // ========================================

  // commitFreezes: новые заморозки сохраняются (и о них сообщает вызвавший); false — только посмотреть
  async snapshot(userId, { commitFreezes = true } = {}) {
    const timezone = (await this.userService.getUserTimezone(userId)) || 'UTC';
    const today = localToday(timezone);
    const repo = this.achievementRepository;
    const [stats, days, freezes, windows, unlockedRows, limits] = await Promise.all([
      repo.getStats(userId, timezone),
      repo.getDays(userId, timezone),
      repo.getFreezes(userId),
      repo.getNoSpendWindows(userId),
      repo.getUnlocked(userId),
      this.premiumService.getUserLimits(userId)
    ]);
    const freezesPerWeek = limits.STREAK_FREEZES_PER_WEEK || USER_LIMITS.regular.STREAK_FREEZES_PER_WEEK;
    const activeDays = new Set([...days.expenseDays, ...days.incomeDays, ...days.markDays]);
    const expenseDays = new Set(days.expenseDays);
    const streak = computeStreak({ activeDays, freezes, today, allowance: freezesPerWeek });
    const newFreezes = commitFreezes && streak.newFreezes.length
      ? await repo.addFreezes(userId, streak.newFreezes)
      : [];
    const month = today.slice(0, 7);
    Object.assign(stats, {
      currentStreak: streak.current,
      bestStreak: Math.max(streak.current, bestStreak(activeDays, [...freezes, ...streak.newFreezes])),
      completeMonths: completeMonths(activeDays),
      monthDays: [...activeDays].filter(day => day.startsWith(month)).length,
      noSpendDays: countNoSpendDays({ markDays: days.markDays, windows, expenseDays, today }),
      // Квиз недели: серия недель подряд (текущая — для прогресса, лучшая — открывает значок)
      quizStreak: weekStreak(stats.quizWeeks || [], weekStart(today)),
      quizBestStreak: bestWeekStreak(stats.quizWeeks || [])
    });
    return {
      timezone,
      today,
      stats,
      days,
      activeDays,
      expenseDays,
      markDays: new Set(days.markDays),
      streak,
      newFreezes,
      freezesPerWeek,
      limits,
      unlockedRows,
      unlocked: new Set(unlockedRows.map(row => row.code))
    };
  }

  xpOf(snap, extraCodes = []) {
    return totalXp([...snap.unlocked, ...extraCodes], snap.activeDays.size, snap.stats.challengesWon);
  }

  // Открывает заработанное. Первый раз (нет строки состояния) — всё за историю, уровень запоминается молча.
  // → { initialized, retroactive, unlocked: [коды], level, levelUp }
  async grant(userId, snap, event = null) {
    const repo = this.achievementRepository;
    const earned = earnedCodes(snap.stats, event).filter(code => !snap.unlocked.has(code));
    const state = await repo.getState(userId);
    if (!state) {
      const level = levelForXp(this.xpOf(snap, earned));
      const created = await repo.createState(userId, level.level, snap.today);
      if (!created) return { initialized: false, retroactive: false, unlocked: [], level, levelUp: false };
      const retroactive = earned.length > RETRO_CELEBRATE_MAX;
      const unlocked = await repo.unlock(userId, earned, retroactive);
      unlocked.forEach(code => snap.unlocked.add(code));
      return { initialized: true, retroactive, unlocked, level, levelUp: false };
    }
    const unlocked = await repo.unlock(userId, earned, false);
    unlocked.forEach(code => snap.unlocked.add(code));
    const level = levelForXp(this.xpOf(snap));
    const levelUp = level.level > state.level_seen && await repo.raiseLevel(userId, level.level);
    return { initialized: false, retroactive: false, unlocked, level, levelUp };
  }

  // ========================================
  // СТРОКИ-ПОЗДРАВЛЕНИЯ
  // ========================================

  unlockLine(lang, codes) {
    const best = pickHighlight(codes);
    if (!best) return null;
    let line = this.t(lang, 'ach_unlocked', { emoji: best.emoji, title: this.title(lang, best.code), xp: best.xp });
    if (codes.length > 1) line += ` ${this.t(lang, 'ach_unlocked_more', { count: codes.length - 1 })}`;
    return line;
  }

  levelUpLine(lang, level) {
    return this.t(lang, 'ach_level_up', { level: level.level, icon: level.icon, name: this.levelName(lang, level.level) });
  }

  freezeLine(lang, snap) {
    if (!snap.newFreezes.length) return null;
    return this.t(lang, 'ach_freeze_used', { dates: snap.newFreezes.map(shortDate).join(', '), days: snap.streak.current });
  }

  grantLines(lang, result) {
    const lines = [];
    if (result.retroactive) {
      lines.push(this.t(lang, 'ach_retro_surprise', {
        count: result.unlocked.length, level: result.level.level, name: this.levelName(lang, result.level.level)
      }));
      return lines;
    }
    if (result.unlocked.length) lines.push(this.unlockLine(lang, result.unlocked));
    if (result.levelUp) lines.push(this.levelUpLine(lang, result.level));
    return lines;
  }

  // ========================================
  // ПУБЛИЧНЫЙ API: событие → строка к ответу
  // ========================================

  // Событие действия пользователя (см. EVENTS в utils/achievements.js). Возвращает Markdown-строку для добавления
  // к ответу на это действие ('' — нечего сказать): не больше одного значка, повышение уровня, заморозка серии,
  // «🔥 N дней подряд» (раз в день). Никогда не бросает исключение — основное действие важнее.
  // categoryNames — категории записанных трат (партия из нескольких записей или голос), иначе categoryName траты.
  // broken — массив, куда кладутся сорванные этим действием челленджи (для «😈 Злого режима»)
  async track(userId, event, { lang = null, categoryName = null, categoryNames = null, broken = null } = {}) {
    try {
      const language = lang || await this.userService.getUserLanguage(userId);
      const snap = await this.snapshot(userId);
      const lines = [];
      const spentIn = categoryNames || (event === 'expense_added' && categoryName ? [categoryName] : []);
      for (const name of spentIn) {
        lines.push(...await this.breakCategoryChallenges(userId, snap, name, language, broken));
      }
      const result = await this.grant(userId, snap, event);
      lines.push(...this.grantLines(language, result));
      // Монеты: день с записями — молча, бонус (каждые 7 дней серии, значки) — строкой
      const coins = this.coinService ? await this.coinService.onActivity(userId, snap, result.unlocked) : 0;
      if (coins > 0) lines.push(this.t(language, 'coins_earned_line', { amount: coins }));
      const freeze = this.freezeLine(language, snap);
      if (freeze) lines.push(freeze);
      if (!result.initialized && snap.streak.todayActive && snap.streak.current >= 2
        && await this.achievementRepository.markStreakSeen(userId, snap.today)) {
        lines.push(this.t(language, 'ach_streak_today', { days: snap.streak.current }));
      }
      return lines.filter(Boolean).slice(0, MAX_NOTE_LINES).join('\n');
    } catch (error) {
      logger.warn('Achievement tracking failed', { userId, event, error: error.message });
      return '';
    }
  }

  // Строка серии для ежедневной сводки: заморозка (если только что сработала) и «🔥 Серия: N дн.» от 2 дней
  async summaryLine(userId, lang) {
    try {
      const snap = await this.snapshot(userId);
      const lines = [this.freezeLine(lang, snap)];
      if (snap.streak.current >= 2) lines.push(this.t(lang, 'ach_streak_line', { days: snap.streak.current }));
      return lines.filter(Boolean).join('\n');
    } catch (error) {
      logger.warn('Streak summary line failed', { userId, error: error.message });
      return '';
    }
  }

  // Для напоминалки: серия от 3 дней под угрозой (сегодня записей нет) и сработавшая заморозка
  async reminderLine(userId, lang) {
    try {
      const snap = await this.snapshot(userId);
      const lines = [this.freezeLine(lang, snap)];
      if (snap.streak.atRisk) {
        lines.push(this.t(lang, snap.streak.freezesLeft > 0 ? 'ach_streak_risk_freeze' : 'ach_streak_risk', { days: snap.streak.current }));
      }
      return lines.filter(Boolean).join('\n');
    } catch (error) {
      logger.warn('Streak reminder line failed', { userId, error: error.message });
      return '';
    }
  }

  // ========================================
  // ЭКРАН «🏆 ДОСТИЖЕНИЯ»
  // ========================================

  // Всё для экрана: итоги челленджей, открытое при первом заходе (за историю) и новое, уровень, серия
  async getOverview(userId, lang) {
    let snap = await this.snapshot(userId);
    const notes = [this.freezeLine(lang, snap)];
    const { finished, active } = await this.refreshChallenges(userId, snap);
    let event = null;
    if (finished.length) {
      notes.push(...finished.map(item => this.challengeResultLine(lang, item)));
      if (finished.some(item => item.status === 'won')) {
        snap = await this.snapshot(userId, { commitFreezes: false });
        event = finished.some(item => item.status === 'won' && item.kind === 'budget_month') ? 'under_budget_period' : 'challenge_won';
      }
    }
    const result = await this.grant(userId, snap, event);
    // Монеты за все открытые значки (в том числе открытые до появления монет) — по разу на значок
    if (this.coinService) await this.coinService.syncBadges(userId, [...snap.unlocked]);
    // Первый заход: значки за историю — одной строкой-сюрпризом, без перечисления
    notes.push(...(result.retroactive
      ? [this.t(lang, 'ach_retro_banner', { count: result.unlocked.length })]
      : this.grantLines(lang, result)));
    const xp = this.xpOf(snap);
    return {
      snap,
      notes: notes.filter(Boolean),
      xp,
      level: levelForXp(xp),
      active,
      unlockedRows: await this.achievementRepository.getUnlocked(userId),
      coins: this.coinService ? await this.coinService.getBalance(userId).catch(() => null) : null
    };
  }

  // «🧘 Сегодня без трат»: { error: 'spent' | 'already' } или { note }
  async markNoSpend(userId, lang) {
    const timezone = (await this.userService.getUserTimezone(userId)) || 'UTC';
    const today = localToday(timezone);
    const days = await this.achievementRepository.getDays(userId, timezone);
    if (days.expenseDays.includes(today)) return { error: 'spent' };
    if (!(await this.achievementRepository.markNoSpend(userId, today))) return { error: 'already' };
    return { note: await this.track(userId, 'no_spend_day', { lang }) };
  }

  async isWrappedEnabled(userId) {
    const state = await this.achievementRepository.getState(userId);
    return state ? state.wrapped_enabled : true;
  }

  async setWrappedEnabled(userId, enabled) {
    await this.achievementRepository.setWrappedEnabled(userId, enabled);
  }

  // ========================================
  // ЧЕЛЛЕНДЖИ
  // ========================================

  challengeName(lang, challenge) {
    if (challenge.kind === 'no_category') {
      const category = this.formatter.translateCategoryName(challenge.category_name || '', this.localizationService, lang);
      return this.t(lang, 'ach_ch_no_category_title', { category: this.formatter.escapeMarkdown(category) });
    }
    return this.t(lang, `ach_ch_${challenge.kind}_title`);
  }

  challengeResultLine(lang, challenge) {
    return challenge.status === 'won'
      ? this.t(lang, 'ach_ch_won_msg', { name: this.challengeName(lang, challenge), xp: CHALLENGE_WIN_XP })
      : this.t(lang, 'ach_ch_lost_msg', { name: this.challengeName(lang, challenge) });
  }

  async budgetFor(userId, snap, challenge) {
    const budgets = await this.budgetService.budgetRepository.getByUser(userId);
    if (!budgets.some(b => b.category_name === null)) return null;
    const currency = await this.userService.getUserCurrency(userId);
    const statuses = await this.budgetService.getStatus(userId, {
      timezone: snap.timezone, currency, period: { start: challenge.start_date, end: challenge.end_date }
    });
    const total = statuses.find(s => s.category_name === null);
    return total ? { spent: total.spent, limit: total.limit, currency } : null;
  }

  async evaluate(userId, snap, challenge) {
    const ctx = { today: snap.today, expenseDays: snap.expenseDays, markDays: snap.markDays };
    if (challenge.kind === 'no_category') {
      ctx.categoryDays = new Set(await this.achievementRepository.getCategorySpendDays(
        userId, snap.timezone, challenge.category_name, challenge.start_date, challenge.end_date, challenge.created_at || null
      ));
    }
    if (challenge.kind === 'budget_month') ctx.budget = await this.budgetFor(userId, snap, challenge);
    return { ...evaluateChallenge(challenge, ctx), budget: ctx.budget || null };
  }

  // Оценка активных челленджей; решённые закрываются (один раз). → { finished: [челлендж со статусом], active: [{ challenge, result }] }
  async refreshChallenges(userId, snap) {
    const finished = [];
    const active = [];
    for (const challenge of await this.achievementRepository.getActiveChallenges(userId)) {
      const result = await this.evaluate(userId, snap, challenge);
      if (result.status === 'active') {
        active.push({ challenge, result });
        continue;
      }
      const closed = await this.achievementRepository.finishChallenge(challenge.id, result.status);
      if (closed && closed.status !== 'canceled') finished.push(closed);
      if (closed && closed.status === 'won' && this.coinService) await this.coinService.onChallengeWon(userId, closed.id);
    }
    return { finished, active };
  }

  // Трата в категории недели «без …» — челлендж сорван сразу, строка к карточке траты
  async breakCategoryChallenges(userId, snap, categoryName, lang, broken = null) {
    const lines = [];
    for (const challenge of await this.achievementRepository.getActiveChallenges(userId)) {
      if (challenge.kind !== 'no_category' || challenge.category_name !== categoryName) continue;
      if (snap.today < challenge.start_date || snap.today >= challenge.end_date) continue;
      const closed = await this.achievementRepository.finishChallenge(challenge.id, 'lost');
      if (closed) {
        lines.push(this.t(lang, 'ach_ch_broken', { name: this.challengeName(lang, closed) }));
        if (broken) broken.push({ ...closed, today: snap.today });
      }
    }
    return lines;
  }

  // kind: no_spend | no_category | budget_month. → { challenge } или { error: 'limit' | 'duplicate' | 'no_budget', limit }
  async startChallenge(userId, kind, { categoryName = null } = {}) {
    const [limits, active] = await Promise.all([
      this.premiumService.getUserLimits(userId),
      this.achievementRepository.getActiveChallenges(userId)
    ]);
    if (active.some(c => c.kind === kind && (kind !== 'no_category' || c.category_name === categoryName))) {
      return { error: 'duplicate' };
    }
    const limit = limits.MAX_ACTIVE_CHALLENGES || USER_LIMITS.regular.MAX_ACTIVE_CHALLENGES;
    if (active.length >= limit) return { error: 'limit', limit };
    const { today, period } = await this.expenseService.getPeriodContext(userId, 'month', 0);
    if (kind === 'budget_month') {
      const budgets = await this.budgetService.budgetRepository.getByUser(userId);
      if (!budgets.some(b => b.category_name === null)) return { error: 'no_budget' };
      return { challenge: await this.achievementRepository.createChallenge(userId, { kind, start: period.start, end: period.end }) };
    }
    const end = addDays(today, CHALLENGE_DAYS);
    const target = kind === 'no_spend' ? NO_SPEND_TARGET : null;
    return { challenge: await this.achievementRepository.createChallenge(userId, { kind, categoryName, start: today, end, target }) };
  }

  async cancelChallenge(userId, id) {
    const challenge = await this.achievementRepository.getChallenge(userId, id);
    if (!challenge || challenge.status !== 'active') return null;
    return this.achievementRepository.finishChallenge(id, 'canceled');
  }

  async getChallenge(userId, id) {
    return this.achievementRepository.getChallenge(userId, id);
  }

  async getFinishedChallenges(userId) {
    return this.achievementRepository.getFinishedChallenges(userId);
  }

  // Категории для «недели без …»: с тратами за последние 30 дней (по сумме), иначе все доступные
  async challengeCategories(userId) {
    const { timezone, currency, today } = await this.expenseService.getPeriodContext(userId, 'day', 0);
    const recent = await this.reportService.categoryBreakdown(userId, timezone, lastDaysPeriod(today, 30), currency);
    const categories = await this.expenseService.getCategories(userId);
    const byName = new Map(categories.map(c => [c.name, c]));
    // Сначала категории с недавними тратами (по сумме), затем остальные доступные
    const picked = recent.map(c => byName.get(c.name)).filter(Boolean);
    const rest = categories.filter(c => !picked.includes(c));
    return [...picked, ...rest].slice(0, 8);
  }

  // ========================================
  // «ИТОГИ МЕСЯЦА»
  // ========================================

  localDay(date, timezone) {
    return localParts(timezone, new Date(date)).date;
  }

  // offset: -1 — прошлый период, 0 — текущий (на сегодня). → { text, period, card } или null (трат нет).
  // card — числа для картинки (ChartService.wrappedCard), без описаний трат и названий целей
  async buildWrapped(userId, lang, offset = -1) {
    const { timezone, currency, period } = await this.expenseService.getPeriodContext(userId, 'month', offset);
    const expenses = await this.expenseService.getExpenses(userId, timezone, period);
    if (!expenses.length) return null;
    const money = (value) => this.formatter.formatAmount(value, currency);

    // По дням и валютам — потом в основную валюту по курсу
    const perDay = new Map();
    for (const expense of expenses) {
      const key = `${this.localDay(expense.created_at_utc, timezone)}|${expense.currency}`;
      perDay.set(key, (perDay.get(key) || 0) + Number(expense.amount));
    }
    const dayTotals = new Map();
    for (const [key, amount] of perDay) {
      const [day, from] = key.split('|');
      dayTotals.set(day, (dayTotals.get(day) || 0) + await this.currencyUtils.convert(amount, from, currency));
    }
    const total = [...dayTotals.values()].reduce((sum, value) => sum + value, 0);
    const lines = [
      `🎉 *${this.t(lang, 'ach_wrapped_title', { range: this.formatter.formatPeriodRange(period) })}*`,
      '',
      `💸 ${this.t(lang, 'ach_wrapped_total', { amount: money(total), count: expenses.length, days: dayTotals.size })}`
    ];

    const categories = await this.reportService.categoryBreakdown(userId, timezone, period, currency);
    const top = categories[0];
    let comparison = null;
    if (top && total > 0) {
      lines.push(`🏆 ${this.t(lang, 'ach_wrapped_top', {
        category: this.reportService.categoryLabel(top, lang), amount: money(top.total), percent: Math.round(top.total / total * 100)
      })}`);
      const prices = {};
      for (const item of COMPARISON_ITEMS) prices[item.key] = await this.currencyUtils.convert(item.usd, 'USD', currency);
      comparison = pickComparison(top.total, prices);
      if (comparison) {
        lines.push(`      ${this.t(lang, 'ach_wrapped_comparison', { count: comparison.count, item: this.t(lang, `ach_wrapped_item_${comparison.key}`) })}`);
      }
    }
    const biggest = biggestDay([...dayTotals.entries()].map(([day, value]) => ({ day, total: value })));
    if (biggest && dayTotals.size > 1) {
      lines.push(`📈 ${this.t(lang, 'ach_wrapped_biggest_day', { date: shortDate(biggest.day), amount: money(biggest.total) })}`);
    }
    const keywords = countKeywords(expenses);
    if (keywords.length) {
      lines.push(keywords.map(item => `${this.t(lang, `ach_wrapped_kw_${item.key}`)} ×${item.count}`).join(' · '));
    }

    const repo = this.achievementRepository;
    const [days, freezes, badges] = await Promise.all([
      repo.getDays(userId, timezone),
      repo.getFreezes(userId),
      repo.getUnlockedBetween(userId, timezone, period.start, period.end)
    ]);
    const inPeriod = (day) => day >= period.start && day < period.end;
    const periodDays = [...days.expenseDays, ...days.incomeDays, ...days.markDays].filter(inPeriod);
    const streak = bestStreak(periodDays, freezes.filter(inPeriod));
    if (streak >= 2) lines.push(`🔥 ${this.t(lang, 'ach_wrapped_streak', { days: streak })}`);
    if (badges.length) {
      const emojis = badges.map(code => BY_CODE.get(code)?.emoji).filter(Boolean).join(' ');
      lines.push(`🏅 ${this.t(lang, 'ach_wrapped_badges', { count: badges.length, list: emojis })}`);
    }
    const goal = await this.closestGoal(userId).catch(() => null);
    if (goal) lines.push(`🎯 ${this.t(lang, 'ach_wrapped_goal', { name: this.formatter.escapeMarkdown(goal.name), percent: goal.percent })}`);
    lines.push('', this.t(lang, offset < 0 ? 'ach_wrapped_outro' : 'ach_wrapped_outro_current'));

    // Самая крупная покупка — по сумме в основной валюте, показывается в своей валюте (как в итогах периода)
    let largest = null;
    for (const expense of expenses) {
      const value = await this.currencyUtils.convert(Number(expense.amount), expense.currency, currency);
      if (!largest || value > largest.value) largest = { value, expense };
    }
    const card = {
      period, currency, total, count: expenses.length, days: dayTotals.size, streak,
      top: top && total > 0 ? { name: top.name, total: top.total, percent: Math.round(top.total / total * 100) } : null,
      comparison: comparison ? { count: comparison.count, key: comparison.key } : null,
      largest: largest ? {
        amount: Number(largest.expense.amount), currency: largest.expense.currency,
        categoryName: largest.expense.category_name || null, day: this.localDay(largest.expense.created_at_utc, timezone)
      } : null,
      biggestDay: biggest && dayTotals.size > 1 ? { day: biggest.day, total: biggest.total } : null
    };
    return { text: lines.join('\n'), period, card };
  }

  // Цель, ближе всего к достижению (не достигнутая): { name, percent } или null
  async closestGoal(userId) {
    if (!this.savingsService) return null;
    const state = await this.savingsService.getState(userId);
    let best = null;
    for (const goal of state.goals) {
      const status = await this.savingsService.goalStatus(goal, state);
      if (status.achieved) continue;
      if (!best || status.ratio > best.ratio) best = { name: goal.name, ratio: status.ratio };
    }
    return best ? { name: best.name, percent: Math.min(99, Math.floor(best.ratio * 100)) } : null;
  }

  // Прошлый период закончился в рамках общего бюджета (бюджет был заведён до конца периода, траты были)
  async wasUnderBudget(userId, timezone, currency, period) {
    const budgets = await this.budgetService.budgetRepository.getByUser(userId);
    const total = budgets.find(b => b.category_name === null);
    if (!total || this.localDay(total.created_at, timezone) > period.last) return false;
    const statuses = await this.budgetService.getStatus(userId, { timezone, currency, period });
    const status = statuses.find(s => s.category_name === null);
    return !!status && status.spent > 0 && status.spent <= status.limit;
  }

  // ========================================
  // CRON
  // ========================================

  // Каждый час: итоги челленджей (днём по местному времени) и «Итоги месяца» в первый день периода с 10:00
  async processDue(now = new Date()) {
    const challenges = await this.processChallenges(now);
    const wrapped = await this.processWrapped(now);
    return { challenges, wrapped };
  }

  async processChallenges(now = new Date()) {
    let sent = 0;
    for (const user of await this.achievementRepository.getUsersWithActiveChallenges()) {
      try {
        const { hour } = localParts(user.timezone, now);
        if (hour < DAY_HOURS.from || hour > DAY_HOURS.to) continue;
        const lang = user.language || 'en';
        const snap = await this.snapshot(user.id, { commitFreezes: false });
        const { finished } = await this.refreshChallenges(user.id, snap);
        for (const challenge of finished) {
          let text = this.challengeResultLine(lang, challenge);
          if (challenge.status === 'won') {
            const event = challenge.kind === 'budget_month' ? 'under_budget_period' : 'challenge_won';
            const note = await this.track(user.id, event, { lang });
            if (note) text += `\n\n${note}`;
          }
          await this.notificationService.sendMessage(user.id, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: this.t(lang, 'ach_button_challenges'), callback_data: 'achc' }]] }
          });
          sent++;
        }
      } catch (error) {
        logger.warn('Challenge result not delivered', { userId: user.id, error: error.message });
      }
    }
    return sent;
  }

  async processWrapped(now = new Date()) {
    let sent = 0;
    for (const user of await this.achievementRepository.getWrappedCandidates()) {
      try {
        const timezone = user.timezone || 'UTC';
        const { date, hour } = localParts(timezone, now);
        const current = customPeriod(date, user.period_start_day || 1, 0);
        if (date !== current.start || hour < DAY_HOURS.from || hour > DAY_HOURS.to) continue;
        const lang = user.language || 'en';
        const wrapped = await this.buildWrapped(user.id, lang, -1);
        if (!wrapped) continue;
        if (!(await this.userNotificationRepository.markSent(user.id, 'wrapped', wrapped.period.start))) continue;
        let text = wrapped.text;
        const currency = await this.userService.getUserCurrency(user.id);
        if (await this.wasUnderBudget(user.id, timezone, currency, wrapped.period).catch(() => false)) {
          const note = await this.track(user.id, 'under_budget_period', { lang });
          if (note) text += `\n\n${note}`;
        }
        const keyboard = [[{ text: this.t(lang, 'button_achievements'), callback_data: 'ach' }]];
        if (this.chartService && this.chartService.available) keyboard.push([{ text: this.t(lang, 'button_wrapped_share'), callback_data: 'achwi|-1' }]);
        keyboard.push([{ text: this.t(lang, 'ach_button_wrapped_off'), callback_data: 'achwo' }]);
        const extra = { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } };
        // Карточка-картинка с итогами в подписи (подпись — до 1024 символов); не вышло — как раньше, текстом
        const card = text.length <= CAPTION_LIMIT ? await this.wrappedCardImage(wrapped.card, lang) : null;
        if (card) await this.notificationService.sendPhoto(user.id, card, { ...extra, caption: text });
        else await this.notificationService.sendMessage(user.id, text, extra);
        sent++;
      } catch (error) {
        logger.warn('Monthly wrapped not delivered', { userId: user.id, error: error.message });
      }
    }
    return sent;
  }

  // PNG карточки «Итоги месяца» для рассылки или null (графики выключены, нет шрифта, ошибка рисования)
  async wrappedCardImage(card, lang) {
    if (!this.chartService || !this.chartService.available || !this.notificationService.sendPhoto) return null;
    try {
      return await this.chartService.wrappedCard(card, lang, { botUsername: this.notificationService.botUsername() });
    } catch (error) {
      logger.warn('Wrapped card not rendered', { error: error.message });
      return null;
    }
  }
}

AchievementService.ACHIEVEMENTS = ACHIEVEMENTS;
AchievementService.RETRO_CELEBRATE_MAX = RETRO_CELEBRATE_MAX;

module.exports = AchievementService;
