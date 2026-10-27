// Каталог достижений, XP и уровни. Чистые функции: правила считаются по снимку статистики пользователя
// (stats), поэтому одни и те же правила работают и на живых событиях, и при первом открытии (за всю историю).
// Тексты: ach_<code>_title / ach_<code>_desc, уровни — ach_level_<n> (src/locales).

const TIERS = ['bronze', 'silver', 'gold', 'legendary'];
const TIER_ICONS = { bronze: '🥉', silver: '🥈', gold: '🥇', legendary: '💎' };

// metric/target — правило по статистике (прогресс «73/100»); event — открывается только самим событием
// (голос, месяц в бюджете: по истории их не восстановить). progress — что показывать в «следующих целях»
// (для серий — текущая серия, а открывает лучшая за всё время).
const ACHIEVEMENTS = [
  { code: 'first_expense', emoji: '🐣', tier: 'bronze', xp: 10, metric: 'expenses', target: 1 },
  { code: 'first_income', emoji: '💵', tier: 'bronze', xp: 10, metric: 'incomes', target: 1 },
  { code: 'first_receipt', emoji: '🧾', tier: 'bronze', xp: 15, metric: 'receipts', target: 1 },
  { code: 'first_import', emoji: '📥', tier: 'bronze', xp: 15, metric: 'imports', target: 1 },
  { code: 'first_voice', emoji: '🎙', tier: 'bronze', xp: 15, event: 'voice_used' },
  { code: 'records_10', emoji: '✍️', tier: 'bronze', xp: 15, metric: 'records', target: 10 },
  { code: 'streak_3', emoji: '🔥', tier: 'bronze', xp: 15, metric: 'bestStreak', target: 3, progress: 'currentStreak' },
  { code: 'early_bird', emoji: '🌅', tier: 'bronze', xp: 15, metric: 'earlyBird', target: 1 },
  { code: 'night_owl', emoji: '🦉', tier: 'bronze', xp: 15, metric: 'nightOwl', target: 1 },
  { code: 'no_spend_day', emoji: '🧘', tier: 'bronze', xp: 15, metric: 'noSpendDays', target: 1 },
  { code: 'budget_set', emoji: '🎯', tier: 'bronze', xp: 15, metric: 'budgets', target: 1 },
  { code: 'goal_created', emoji: '🌱', tier: 'bronze', xp: 15, metric: 'goals', target: 1 },
  { code: 'savings_updated', emoji: '🐷', tier: 'bronze', xp: 15, metric: 'savingsOps', target: 1 },
  { code: 'categories_5', emoji: '🎨', tier: 'silver', xp: 30, metric: 'categories', target: 5 },
  { code: 'streak_7', emoji: '📆', tier: 'silver', xp: 40, metric: 'bestStreak', target: 7, progress: 'currentStreak' },
  { code: 'records_100', emoji: '📚', tier: 'silver', xp: 50, metric: 'records', target: 100 },
  { code: 'receipts_10', emoji: '🗂', tier: 'silver', xp: 40, metric: 'receipts', target: 10 },
  { code: 'no_spend_5', emoji: '🌿', tier: 'silver', xp: 40, metric: 'noSpendDays', target: 5 },
  { code: 'family_joined', emoji: '👨‍👩‍👧', tier: 'silver', xp: 30, metric: 'family', target: 1 },
  { code: 'under_budget', emoji: '🛡', tier: 'silver', xp: 60, event: 'under_budget_period' },
  { code: 'challenge_won', emoji: '🥊', tier: 'silver', xp: 50, metric: 'challengesWon', target: 1 },
  { code: 'streak_30', emoji: '⚡', tier: 'gold', xp: 120, metric: 'bestStreak', target: 30, progress: 'currentStreak' },
  { code: 'month_complete', emoji: '🗓', tier: 'gold', xp: 100, metric: 'completeMonths', target: 1, progress: 'monthDays' },
  { code: 'records_1000', emoji: '🏛', tier: 'gold', xp: 200, metric: 'records', target: 1000 },
  { code: 'goal_reached', emoji: '🏆', tier: 'gold', xp: 150, metric: 'goalsReached', target: 1 },
  { code: 'debt_paid_off', emoji: '🕊', tier: 'gold', xp: 150, metric: 'debtsPaid', target: 1 },
  { code: 'challenges_5', emoji: '👑', tier: 'gold', xp: 150, metric: 'challengesWon', target: 5 },
  { code: 'streak_100', emoji: '💎', tier: 'legendary', xp: 400, metric: 'bestStreak', target: 100, progress: 'currentStreak' },
  { code: 'months_complete_6', emoji: '🌟', tier: 'legendary', xp: 500, metric: 'completeMonths', target: 6 },
  { code: 'streak_365', emoji: '🦄', tier: 'legendary', xp: 1000, metric: 'bestStreak', target: 365, progress: 'currentStreak' }
];
const BY_CODE = new Map(ACHIEVEMENTS.map(a => [a.code, a]));

// month_complete: записи минимум в 25 дней календарного месяца
const MONTH_COMPLETE_DAYS = 25;
// XP за каждый день с записями — уровень растёт от привычки, а не только от значков
const DAY_XP = 5;
const CHALLENGE_WIN_XP = 30;

// Порог XP уровня n — LEVELS[n - 1]
const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2400, 3300];
const LEVEL_ICONS = ['🌱', '🐷', '🧮', '📊', '🎯', '🥷', '🧠', '🦉', '🚀', '👑'];

// События для achievementService.track (остальные строки тоже допустимы — просто пересчёт правил)
const EVENTS = [
  'expense_added', 'income_added', 'receipt_recorded', 'import_done', 'voice_used', 'goal_created', 'goal_reached',
  'budget_set', 'under_budget_period', 'family_joined', 'savings_updated', 'debt_paid_off', 'no_spend_day',
  'challenge_won'
];

function metricValue(stats, metric) {
  const value = stats[metric];
  if (typeof value === 'boolean') return value ? 1 : 0;
  return Number(value) || 0;
}

// Коды, заработанные по статистике и (для событийных) текущему событию
function earnedCodes(stats, event = null) {
  return ACHIEVEMENTS
    .filter(a => (a.event ? a.event === event : metricValue(stats, a.metric) >= a.target))
    .map(a => a.code);
}

// XP: значки + дни с записями + выигранные челленджи
function totalXp(unlockedCodes, activeDayCount, challengesWon = 0) {
  let xp = 0;
  for (const code of unlockedCodes) xp += BY_CODE.get(code)?.xp || 0;
  return xp + DAY_XP * (activeDayCount || 0) + CHALLENGE_WIN_XP * (challengesWon || 0);
}

// { level 1..10, icon, min, next (null на последнем), ratio к следующему }
function levelForXp(xp) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i + 1;
  const min = LEVELS[level - 1];
  const next = level < LEVELS.length ? LEVELS[level] : null;
  return {
    level,
    icon: LEVEL_ICONS[level - 1],
    min,
    next,
    ratio: next === null ? 1 : (xp - min) / (next - min)
  };
}

// Ближайшие цели среди закрытых метрических значков: { achievement, current, target }, по убыванию доли
function nextGoals(stats, unlocked, limit = 3) {
  const unlockedSet = unlocked instanceof Set ? unlocked : new Set(unlocked);
  const seenMetrics = new Set();
  const candidates = ACHIEVEMENTS
    .filter(a => a.metric && !unlockedSet.has(a.code))
    .map(a => {
      const target = a.progress === 'monthDays' ? MONTH_COMPLETE_DAYS : a.target;
      const current = Math.min(target, metricValue(stats, a.progress || a.metric));
      return { achievement: a, current, target, ratio: current / target };
    })
    // На каждую метрику — ближайший порог (records_100, а не сразу и records_1000)
    .sort((x, y) => x.achievement.target - y.achievement.target)
    .filter(c => {
      const key = c.achievement.metric;
      if (seenMetrics.has(key)) return false;
      seenMetrics.add(key);
      return true;
    });
  return candidates
    .sort((x, y) => y.ratio - x.ratio || TIERS.indexOf(x.achievement.tier) - TIERS.indexOf(y.achievement.tier))
    .slice(0, limit);
}

// Какой из только что открытых значков показать в одной строке: самый редкий, при равенстве — дороже по XP
function pickHighlight(codes) {
  return codes
    .map(code => BY_CODE.get(code))
    .filter(Boolean)
    .sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) || b.xp - a.xp)[0] || null;
}

module.exports = {
  TIERS,
  TIER_ICONS,
  ACHIEVEMENTS,
  BY_CODE,
  EVENTS,
  LEVELS,
  LEVEL_ICONS,
  DAY_XP,
  CHALLENGE_WIN_XP,
  MONTH_COMPLETE_DAYS,
  earnedCodes,
  totalXp,
  levelForXp,
  nextGoals,
  pickHighlight
};
