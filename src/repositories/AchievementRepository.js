const BaseRepository = require('./BaseRepository');

// Даты (DATE) отдаются строками 'YYYY-MM-DD': pg превращает DATE в Date в поясе процесса, а дни — локальные дни пользователя
const DAY = (expr) => `to_char(${expr}, 'YYYY-MM-DD')`;
const CHALLENGE_COLUMNS = `id, user_id, kind, category_name, ${DAY('start_date')} AS start_date, ${DAY('end_date')} AS end_date,
  target, status, created_at, finished_at`;

class AchievementRepository extends BaseRepository {
  // ---------- Состояние (уровень, показанная серия, «Итоги месяца») ----------

  async getState(userId) {
    const result = await this.query(
      `SELECT user_id, level_seen, ${DAY('streak_seen_date')} AS streak_seen_date, wrapped_enabled
       FROM user_gamification WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Первое знакомство: строка создаётся один раз (параллельный вызов получает null и ничего не выдаёт)
  async createState(userId, level, today) {
    const result = await this.query(
      `INSERT INTO user_gamification (user_id, level_seen, streak_seen_date) VALUES ($1, $2, $3::date)
       ON CONFLICT DO NOTHING
       RETURNING user_id, level_seen, ${DAY('streak_seen_date')} AS streak_seen_date, wrapped_enabled`,
      [userId, level, today]
    );
    return result.rows[0] || null;
  }

  // true — уровень вырос и об этом ещё не сообщали
  async raiseLevel(userId, level) {
    const result = await this.query(
      'UPDATE user_gamification SET level_seen = $2 WHERE user_id = $1 AND level_seen < $2 RETURNING user_id',
      [userId, level]
    );
    return result.rowCount > 0;
  }

  // true — о серии сегодня ещё не говорили (строка «🔥 N дней подряд» — раз в день)
  async markStreakSeen(userId, today) {
    const result = await this.query(
      `UPDATE user_gamification SET streak_seen_date = $2::date
       WHERE user_id = $1 AND (streak_seen_date IS NULL OR streak_seen_date < $2::date) RETURNING user_id`,
      [userId, today]
    );
    return result.rowCount > 0;
  }

  async setWrappedEnabled(userId, enabled) {
    await this.query(
      `INSERT INTO user_gamification (user_id, wrapped_enabled) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET wrapped_enabled = EXCLUDED.wrapped_enabled`,
      [userId, enabled]
    );
  }

  // ---------- Достижения ----------

  async getUnlocked(userId) {
    const result = await this.query(
      'SELECT code, unlocked_at, retroactive FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at, code',
      [userId]
    );
    return result.rows;
  }

  // Только реально добавленные коды (параллельные вызовы не празднуют одно и то же дважды)
  async unlock(userId, codes, retroactive = false) {
    if (!codes.length) return [];
    const result = await this.query(
      `INSERT INTO user_achievements (user_id, code, retroactive)
       SELECT $1, code, $3 FROM unnest($2::varchar[]) AS code
       ON CONFLICT DO NOTHING RETURNING code`,
      [userId, codes, retroactive]
    );
    return result.rows.map(row => row.code);
  }

  // Открытые в локальном периоде [start, end) живыми событиями (не за историю)
  async getUnlockedBetween(userId, timezone, start, end) {
    const result = await this.query(
      `SELECT code FROM user_achievements
       WHERE user_id = $1 AND NOT retroactive
         AND (unlocked_at AT TIME ZONE $2) >= $3::date AND (unlocked_at AT TIME ZONE $2) < $4::date
       ORDER BY unlocked_at`,
      [userId, timezone, start, end]
    );
    return result.rows.map(row => row.code);
  }

  // ---------- Статистика для правил ----------

  // Записи — без автоматических регулярных трат. Ранняя пташка / сова — по времени ручной записи
  // (импорт и чек несут время операции, а не записи)
  async getStats(userId, timezone) {
    const result = await this.query(
      `WITH manual AS (
         SELECT EXTRACT(HOUR FROM created_at_utc AT TIME ZONE $2)::int AS h FROM expenses
         WHERE user_id = $1 AND recurring_expense_id IS NULL AND import_id IS NULL AND receipt_id IS NULL
         UNION ALL
         SELECT EXTRACT(HOUR FROM created_at_utc AT TIME ZONE $2)::int FROM incomes WHERE user_id = $1 AND import_id IS NULL
       )
       SELECT
         (SELECT COUNT(*) FROM expenses WHERE user_id = $1 AND recurring_expense_id IS NULL)::int AS expenses,
         (SELECT COUNT(*) FROM incomes WHERE user_id = $1)::int AS incomes,
         (SELECT COUNT(DISTINCT c.name) FROM expenses e JOIN categories c ON c.id = e.category_id
           WHERE e.user_id = $1 AND e.recurring_expense_id IS NULL)::int AS categories,
         (SELECT COUNT(*) FROM receipts WHERE user_id = $1 AND status <> 'undone')::int AS receipts,
         (SELECT COUNT(*) FROM imports WHERE user_id = $1)::int AS imports,
         EXISTS (SELECT 1 FROM manual WHERE h BETWEEN 4 AND 7) AS early_bird,
         EXISTS (SELECT 1 FROM manual WHERE h >= 23 OR h < 4) AS night_owl,
         (SELECT COUNT(*) FROM category_budgets WHERE user_id = $1)::int AS budgets,
         (SELECT COUNT(*) FROM savings_pots WHERE user_id = $1 AND kind = 'goal')::int AS goals,
         -- Цель, выполненная уже при создании (achieved_at = created_at), — не достижение
         (SELECT COUNT(*) FROM savings_pots WHERE user_id = $1 AND kind = 'goal' AND achieved_at > created_at)::int AS goals_reached,
         (SELECT COUNT(*) FROM savings_pots WHERE user_id = $1 AND kind = 'debt' AND balance = 0)::int AS debts_paid,
         (SELECT COUNT(*) FROM savings_operations WHERE user_id = $1)::int AS savings_ops,
         EXISTS (SELECT 1 FROM family_user WHERE user_id = $1) AS family,
         (SELECT COUNT(*) FROM user_challenges WHERE user_id = $1 AND status = 'won')::int AS challenges_won,
         -- Квиз недели: пройденные, с идеальным результатом, недели (серия недель — в AchievementService)
         (SELECT COUNT(*) FROM quiz_sessions WHERE user_id = $1 AND status = 'finished')::int AS quizzes,
         (SELECT COUNT(*) FROM quiz_sessions WHERE user_id = $1 AND status = 'finished' AND correct_count = total)::int AS quiz_perfect,
         ARRAY(SELECT to_char(week_key, 'YYYY-MM-DD') FROM quiz_sessions WHERE user_id = $1 AND status = 'finished' ORDER BY week_key) AS quiz_weeks`,
      [userId, timezone]
    );
    const row = result.rows[0];
    return {
      expenses: row.expenses,
      incomes: row.incomes,
      records: row.expenses + row.incomes,
      categories: row.categories,
      receipts: row.receipts,
      imports: row.imports,
      earlyBird: row.early_bird,
      nightOwl: row.night_owl,
      budgets: row.budgets,
      goals: row.goals,
      goalsReached: row.goals_reached,
      debtsPaid: row.debts_paid,
      savingsOps: row.savings_ops,
      family: row.family,
      challengesWon: row.challenges_won,
      quizzes: row.quizzes || 0,
      quizPerfect: row.quiz_perfect || 0,
      quizWeeks: row.quiz_weeks || []
    };
  }

  // Локальные дни: e — с тратами (кроме регулярных), i — с доходами, n — отмеченные «без трат»
  async getDays(userId, timezone) {
    const result = await this.query(
      `SELECT 'e' AS k, ${DAY('(created_at_utc AT TIME ZONE $2)::date')} AS d FROM expenses
         WHERE user_id = $1 AND recurring_expense_id IS NULL GROUP BY 2
       UNION ALL
       SELECT 'i', ${DAY('(created_at_utc AT TIME ZONE $2)::date')} FROM incomes WHERE user_id = $1 GROUP BY 2
       UNION ALL
       SELECT 'n', ${DAY('day')} FROM user_no_spend_days WHERE user_id = $1`,
      [userId, timezone]
    );
    const days = { expenseDays: [], incomeDays: [], markDays: [] };
    for (const row of result.rows) {
      if (row.k === 'e') days.expenseDays.push(row.d);
      else if (row.k === 'i') days.incomeDays.push(row.d);
      else days.markDays.push(row.d);
    }
    return days;
  }

  // ---------- Заморозки и «день без трат» ----------

  async getFreezes(userId) {
    const result = await this.query(`SELECT ${DAY('day')} AS day FROM user_streak_freezes WHERE user_id = $1`, [userId]);
    return result.rows.map(row => row.day);
  }

  // Только добавленные сейчас дни: о них и сообщаем
  async addFreezes(userId, days) {
    if (!days.length) return [];
    const result = await this.query(
      `INSERT INTO user_streak_freezes (user_id, day) SELECT $1, d FROM unnest($2::date[]) AS d
       ON CONFLICT DO NOTHING RETURNING ${DAY('day')} AS day`,
      [userId, days]
    );
    return result.rows.map(row => row.day).sort();
  }

  async markNoSpend(userId, day) {
    const result = await this.query(
      'INSERT INTO user_no_spend_days (user_id, day) VALUES ($1, $2::date) ON CONFLICT DO NOTHING RETURNING user_id',
      [userId, day]
    );
    return result.rowCount > 0;
  }

  // ---------- Челленджи ----------

  async getActiveChallenges(userId) {
    const result = await this.query(
      `SELECT ${CHALLENGE_COLUMNS} FROM user_challenges WHERE user_id = $1 AND status = 'active' ORDER BY id`,
      [userId]
    );
    return result.rows;
  }

  async getChallenge(userId, id) {
    const result = await this.query(`SELECT ${CHALLENGE_COLUMNS} FROM user_challenges WHERE user_id = $1 AND id = $2`, [userId, id]);
    return result.rows[0] || null;
  }

  // Последние завершённые (для экрана челленджей)
  async getFinishedChallenges(userId, limit = 3) {
    const result = await this.query(
      `SELECT ${CHALLENGE_COLUMNS} FROM user_challenges
       WHERE user_id = $1 AND status IN ('won', 'lost') ORDER BY finished_at DESC NULLS LAST, id DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async createChallenge(userId, { kind, categoryName = null, start, end, target = null }) {
    const result = await this.query(
      `INSERT INTO user_challenges (user_id, kind, category_name, start_date, end_date, target)
       VALUES ($1, $2, $3, $4::date, $5::date, $6) RETURNING ${CHALLENGE_COLUMNS}`,
      [userId, kind, categoryName, start, end, target]
    );
    return result.rows[0];
  }

  // Итог ставится один раз: параллельные проверки (cron, экран, запись траты) не сообщают его дважды
  async finishChallenge(id, status) {
    const result = await this.query(
      `UPDATE user_challenges SET status = $2, finished_at = NOW() WHERE id = $1 AND status = 'active'
       RETURNING ${CHALLENGE_COLUMNS}`,
      [id, status]
    );
    return result.rows[0] || null;
  }

  // Окна недель «без трат» (кроме отменённых) — их прошедшие дни без трат засчитываются в «дни без трат»
  async getNoSpendWindows(userId) {
    const result = await this.query(
      `SELECT ${DAY('start_date')} AS start_date, ${DAY('end_date')} AS end_date FROM user_challenges
       WHERE user_id = $1 AND kind = 'no_spend' AND status <> 'canceled'`,
      [userId]
    );
    return result.rows;
  }

  // Дни с тратами в категории (по имени) в локальном окне [start, end). since — момент старта челленджа: трата,
  // записанная в тот же день до старта, его не срывает
  async getCategorySpendDays(userId, timezone, categoryName, start, end, since = null) {
    const result = await this.query(
      `SELECT DISTINCT ${DAY('(e.created_at_utc AT TIME ZONE $2)::date')} AS d
       FROM expenses e JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND c.name = $3 AND e.recurring_expense_id IS NULL
         AND (e.created_at_utc AT TIME ZONE $2) >= $4::date AND (e.created_at_utc AT TIME ZONE $2) < $5::date
         AND ($6::timestamptz IS NULL OR e.created_at_utc >= $6::timestamptz)`,
      [userId, timezone, categoryName, start, end, since]
    );
    return result.rows.map(row => row.d);
  }

  // ---------- Cron ----------

  async getUsersWithActiveChallenges() {
    const result = await this.query(
      `SELECT u.id, u.language, u.timezone FROM users u
       WHERE u.id > 0 AND EXISTS (SELECT 1 FROM user_challenges c WHERE c.user_id = u.id AND c.status = 'active')`,
      []
    );
    return result.rows;
  }

  // «Итоги месяца»: записывали траты за 45 дней и не отключили итоги
  async getWrappedCandidates() {
    const result = await this.query(
      `SELECT u.id, u.language, u.timezone, u.period_start_day FROM users u
       LEFT JOIN user_gamification g ON g.user_id = u.id
       WHERE u.id > 0 AND COALESCE(g.wrapped_enabled, TRUE)
         AND EXISTS (SELECT 1 FROM expenses e WHERE e.user_id = u.id AND e.recurring_expense_id IS NULL
                     AND e.created_at_utc > NOW() - INTERVAL '45 days')`,
      []
    );
    return result.rows;
  }
}

module.exports = AchievementRepository;
