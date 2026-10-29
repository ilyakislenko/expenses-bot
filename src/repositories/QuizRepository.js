const BaseRepository = require('./BaseRepository');

// Даты (DATE) — строками 'YYYY-MM-DD': pg превратил бы DATE в Date в поясе процесса
const DAY = (expr) => `to_char(${expr}, 'YYYY-MM-DD')`;
const SESSION_COLUMNS = `id, user_id, ${DAY('week_key')} AS week_key, lang, questions, total, current_index, asked_index, asked_at,
  correct_count, missed_count, missed_streak, answers, score, status, started_at, finished_at`;
const PRIZE_COLUMNS = `id, ${DAY('week_key')} AS week_key, user_id, kind, days, grant_started_at, granted_at, notified_at`;

class QuizRepository extends BaseRepository {
  // ---------- Данные для вопросов ----------

  // Свои траты (в том числе перенесённые в семью — как в обзоре) за локальные даты [start, end)
  async getExpenses(userId, timezone, start, end) {
    const result = await this.query(
      `SELECT e.amount::float AS amount, e.currency, ${DAY('(e.created_at_utc AT TIME ZONE $2)::date')} AS day,
              c.name AS category_name, c.icon AS category_icon, e.description,
              (e.recurring_expense_id IS NOT NULL) AS recurring
       FROM expenses e LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1
         AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
         AND (e.created_at_utc AT TIME ZONE $2) < $4::date
       ORDER BY e.created_at_utc`,
      [userId, timezone, start, end]
    );
    return result.rows;
  }

  // Загадки, уже заданные пользователю (не повторяем)
  async usedTriviaIds(userId) {
    const result = await this.query(
      `SELECT DISTINCT q->>'triviaId' AS id FROM quiz_sessions s, jsonb_array_elements(s.questions) q
       WHERE s.user_id = $1 AND q ? 'triviaId'`,
      [userId]
    );
    return result.rows.map(row => row.id);
  }

  // ---------- Настройка приглашения ----------

  async getInvitesEnabled(userId) {
    const result = await this.query('SELECT quiz_invites_enabled FROM users WHERE id = $1', [userId]);
    return result.rows[0] ? result.rows[0].quiz_invites_enabled !== false : true;
  }

  async setInvitesEnabled(userId, enabled) {
    await this.query('UPDATE users SET quiz_invites_enabled = $2 WHERE id = $1', [userId, !!enabled]);
  }

  // Кандидаты для приглашения: включено и не меньше minRecords своих трат (не авто-записей регулярных) с since
  async getInviteCandidates(minRecords, since) {
    const result = await this.query(
      `SELECT u.id, u.language, u.timezone FROM users u
       WHERE u.id > 0 AND u.quiz_invites_enabled = TRUE
         AND (SELECT COUNT(*) FROM expenses e
              WHERE e.user_id = u.id AND e.recurring_expense_id IS NULL AND e.created_at_utc >= $2) >= $1`,
      [minRecords, since]
    );
    return result.rows;
  }

  // ---------- Сессии ----------

  async getSession(userId, weekKey) {
    const result = await this.query(`SELECT ${SESSION_COLUMNS} FROM quiz_sessions WHERE user_id = $1 AND week_key = $2::date`, [userId, weekKey]);
    return result.rows[0] || null;
  }

  async getSessionById(id) {
    const result = await this.query(`SELECT ${SESSION_COLUMNS} FROM quiz_sessions WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  // Последний пройденный квиз (для экрана вне окна)
  async getLastFinished(userId) {
    const result = await this.query(
      `SELECT ${SESSION_COLUMNS} FROM quiz_sessions WHERE user_id = $1 AND status = 'finished' ORDER BY week_key DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // Одна сессия на неделю: параллельный старт получает null и берёт существующую
  async createSession(userId, weekKey, lang, questions) {
    const result = await this.query(
      `INSERT INTO quiz_sessions (user_id, week_key, lang, questions, total) VALUES ($1, $2::date, $3, $4::jsonb, $5)
       ON CONFLICT (user_id, week_key) DO NOTHING RETURNING ${SESSION_COLUMNS}`,
      [userId, weekKey, lang, JSON.stringify(questions), questions.length]
    );
    return result.rows[0] || null;
  }

  // Право отправить вопрос index: один отправитель (повторная попытка — если прошлая застряла дольше staleMs)
  async claimAsk(sessionId, index, now, staleMs) {
    const result = await this.query(
      `UPDATE quiz_sessions SET asked_index = $2, asked_at = $3
       WHERE id = $1 AND status = 'active' AND current_index = $2
         AND (asked_index < $2 OR (asked_index = $2 AND asked_at < $3::timestamptz - make_interval(secs => $4::float / 1000)
              AND NOT EXISTS (SELECT 1 FROM quiz_polls p WHERE p.session_id = $1 AND p.question_index = $2)))
       RETURNING ${SESSION_COLUMNS}`,
      [sessionId, index, now, staleMs]
    );
    return result.rows[0] || null;
  }

  // Отправить не удалось — вопрос можно отправить снова
  async releaseAsk(sessionId, index) {
    await this.query('UPDATE quiz_sessions SET asked_index = $2 - 1 WHERE id = $1 AND asked_index = $2', [sessionId, index]);
  }

  // Вопрос закрыт (ответ или «не успел»): следующий номер, счётчики, пауза после pauseAfter пропусков подряд.
  // Условие current_index = index — второй закрывающий (таймер и опрос одновременно) ничего не меняет
  async advance(sessionId, index, { correct, missed, mark, pauseAfter }) {
    const result = await this.query(
      `UPDATE quiz_sessions SET
         current_index = current_index + 1,
         correct_count = correct_count + $3,
         missed_count = missed_count + $4,
         missed_streak = CASE WHEN $4 = 1 THEN missed_streak + 1 ELSE 0 END,
         answers = answers || $5,
         status = CASE WHEN $4 = 1 AND missed_streak + 1 >= $6 AND current_index + 1 < total THEN 'paused' ELSE status END
       WHERE id = $1 AND current_index = $2 AND status IN ('active', 'paused')
       RETURNING ${SESSION_COLUMNS}`,
      [sessionId, index, correct ? 1 : 0, missed ? 1 : 0, mark, pauseAfter]
    );
    return result.rows[0] || null;
  }

  // «▶️ Продолжить» после паузы
  async resume(sessionId) {
    const result = await this.query(
      `UPDATE quiz_sessions SET status = 'active', missed_streak = 0 WHERE id = $1 AND status = 'paused' RETURNING ${SESSION_COLUMNS}`,
      [sessionId]
    );
    return result.rows[0] || null;
  }

  // Ровно один раз: null — уже закончена
  async finish(sessionId, score, now) {
    const result = await this.query(
      `UPDATE quiz_sessions SET status = 'finished', score = $2, finished_at = $3
       WHERE id = $1 AND status <> 'finished' AND current_index >= total RETURNING ${SESSION_COLUMNS}`,
      [sessionId, score, now]
    );
    return result.rows[0] || null;
  }

  // Очки пройденных квизов за недели (для «лучше, чем N% игроков»)
  async finishedScores(weekKeys, excludeSessionId) {
    const result = await this.query(
      `SELECT score FROM quiz_sessions WHERE status = 'finished' AND week_key = ANY($1::date[]) AND id <> $2`,
      [weekKeys, excludeSessionId]
    );
    return result.rows.map(row => row.score);
  }

  async finishedWeeks(userId) {
    const result = await this.query(
      `SELECT ${DAY('week_key')} AS week_key FROM quiz_sessions WHERE user_id = $1 AND status = 'finished' ORDER BY week_key`,
      [userId]
    );
    return result.rows.map(row => row.week_key);
  }

  // Активные сессии, у которых текущий вопрос так и не отправлен (перезапуск между ответом и следующим вопросом)
  async stuckSessions(now, idleMs, limit = 50) {
    const result = await this.query(
      `SELECT ${SESSION_COLUMNS} FROM quiz_sessions s
       WHERE s.status = 'active' AND s.current_index < s.total
         AND NOT EXISTS (SELECT 1 FROM quiz_polls p WHERE p.session_id = s.id AND p.question_index = s.current_index)
         AND COALESCE(s.asked_at, s.started_at) < $1::timestamptz - make_interval(secs => $2::float / 1000)
       ORDER BY s.id LIMIT $3`,
      [now, idleMs, limit]
    );
    return result.rows;
  }

  // ---------- Вопросы (опросы) ----------

  async insertPoll({ pollId, sessionId, userId, index, messageId, correctOption, kind, deadline }) {
    await this.query(
      `INSERT INTO quiz_polls (poll_id, session_id, user_id, question_index, message_id, correct_option, kind, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
      [pollId, sessionId, userId, index, messageId, correctOption, kind, deadline]
    );
  }

  async getPoll(pollId) {
    const result = await this.query('SELECT * FROM quiz_polls WHERE poll_id = $1', [pollId]);
    return result.rows[0] || null;
  }

  // Ответ засчитывается один раз, только своему вопросу и не позже срока + graceMs
  async claimAnswer(pollId, userId, option, now, graceMs) {
    const result = await this.query(
      `UPDATE quiz_polls SET status = 'answered', chosen_option = $3, answered_at = $4
       WHERE poll_id = $1 AND user_id = $2 AND status = 'open'
         AND $4::timestamptz <= deadline + make_interval(secs => $5::float / 1000)
       RETURNING *`,
      [pollId, userId, option, now, graceMs]
    );
    return result.rows[0] || null;
  }

  // «Не успел»: срок + graceMs прошёл (force — опрос уже закрыт Telegram без ответа)
  async expirePoll(pollId, now, graceMs, force = false) {
    const result = await this.query(
      `UPDATE quiz_polls SET status = 'missed'
       WHERE poll_id = $1 AND status = 'open'
         AND ($4 OR $2::timestamptz > deadline + make_interval(secs => $3::float / 1000))
       RETURNING *`,
      [pollId, now, graceMs, force]
    );
    return result.rows[0] || null;
  }

  async expiredOpenPolls(now, graceMs, limit = 100) {
    const result = await this.query(
      `SELECT poll_id FROM quiz_polls WHERE status = 'open' AND deadline + make_interval(secs => $2::float / 1000) < $1::timestamptz
       ORDER BY deadline LIMIT $3`,
      [now, graceMs, limit]
    );
    return result.rows.map(row => row.poll_id);
  }

  // ---------- Розыгрыш и призы ----------

  // Недели с пройденными квизами, розыгрыш которых наступил, но ещё не проведён (с запасом на простой бота)
  async undrawnWeeks(latestWeek, earliestWeek) {
    const result = await this.query(
      `SELECT DISTINCT ${DAY('s.week_key')} AS week_key FROM quiz_sessions s
       WHERE s.status = 'finished' AND s.week_key <= $1::date AND s.week_key >= $2::date
         AND NOT EXISTS (SELECT 1 FROM quiz_draws d WHERE d.week_key = s.week_key)
       ORDER BY 1`,
      [latestWeek, earliestWeek]
    );
    return result.rows.map(row => row.week_key);
  }

  // Розыгрыш недели одной транзакцией: участники, журнал и призы. drawFn(participants) → { seed, digest, winners,
  // perfect }. null — неделя уже разыграна (повторный запуск ничего не меняет)
  async runDraw(weekKey, drawFn) {
    return this.transaction(async (client) => {
      // Блокировка недели: второй параллельный розыгрыш ждёт и видит журнал первого
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`quiz_draw:${weekKey}`]);
      const existing = await client.query('SELECT 1 FROM quiz_draws WHERE week_key = $1::date', [weekKey]);
      if (existing.rowCount) return null;
      const { rows } = await client.query(
        `SELECT user_id, score, correct_count, total FROM quiz_sessions
         WHERE week_key = $1::date AND status = 'finished' ORDER BY user_id`,
        [weekKey]
      );
      const participants = rows.map(row => ({ userId: Number(row.user_id), weight: row.score, perfect: row.correct_count === row.total }));
      const draw = drawFn(participants);
      await client.query(
        `INSERT INTO quiz_draws (week_key, seed, participants, total_weight, digest, winners) VALUES ($1::date, $2, $3, $4, $5, $6::jsonb)`,
        [weekKey, draw.seed, participants.length, participants.reduce((s, p) => s + p.weight, 0), draw.digest, JSON.stringify(draw.winners)]
      );
      for (const prize of [...draw.winners, ...draw.perfect]) {
        await client.query(
          'INSERT INTO quiz_prizes (week_key, user_id, kind, days) VALUES ($1::date, $2, $3, $4) ON CONFLICT DO NOTHING',
          [weekKey, prize.userId, prize.kind, prize.days]
        );
      }
      return { participants, ...draw };
    });
  }

  async getLastDraw() {
    const result = await this.query(
      `SELECT ${DAY('week_key')} AS week_key, seed, participants, total_weight, digest, winners, drawn_at FROM quiz_draws ORDER BY week_key DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async userPrizes(userId, weekKey) {
    const result = await this.query(`SELECT ${PRIZE_COLUMNS} FROM quiz_prizes WHERE user_id = $1 AND week_key = $2::date ORDER BY id`, [userId, weekKey]);
    return result.rows;
  }

  async ungrantedPrizes(limit = 100) {
    const result = await this.query(`SELECT ${PRIZE_COLUMNS} FROM quiz_prizes WHERE granted_at IS NULL ORDER BY id LIMIT $1`, [limit]);
    return result.rows;
  }

  // Право выдать приз: один выдающий; зависшую выдачу (процесс упал) можно забрать через staleMs
  async claimGrant(prizeId, now, staleMs) {
    const result = await this.query(
      `UPDATE quiz_prizes SET grant_started_at = $2
       WHERE id = $1 AND granted_at IS NULL
         AND (grant_started_at IS NULL OR grant_started_at < $2::timestamptz - make_interval(secs => $3::float / 1000))
       RETURNING ${PRIZE_COLUMNS}`,
      [prizeId, now, staleMs]
    );
    return result.rows[0] || null;
  }

  async markGranted(prizeId, now) {
    await this.query('UPDATE quiz_prizes SET granted_at = $2 WHERE id = $1 AND granted_at IS NULL', [prizeId, now]);
  }

  async releaseGrant(prizeId) {
    await this.query('UPDATE quiz_prizes SET grant_started_at = NULL WHERE id = $1 AND granted_at IS NULL', [prizeId]);
  }

  // Транзакция премиума по этому призу уже есть (выдали, но упали до отметки) — второй раз не выдаём
  async grantTransactionExists(prizeId, userId) {
    // invoice_payload — JSON.stringify({ type: 'quiz', …, prize_id }) из UserService.grantRewardDays
    const result = await this.query(
      `SELECT 1 FROM premium_transactions
       WHERE user_id = $2 AND transaction_type = 'reward' AND invoice_payload LIKE '{"type":"quiz",%'
         AND (invoice_payload LIKE '%"prize_id":' || $1::text || ',%' OR invoice_payload LIKE '%"prize_id":' || $1::text || '}%')
       LIMIT 1`,
      [prizeId, userId]
    );
    return result.rowCount > 0;
  }

  // Выданные, но не объявленные призы: по пользователю и неделе
  async unannouncedPrizes(limit = 200) {
    const result = await this.query(
      `SELECT p.id, ${DAY('p.week_key')} AS week_key, p.user_id, p.kind, p.days, u.language, u.timezone, u.premium_expires_at
       FROM quiz_prizes p JOIN users u ON u.id = p.user_id
       WHERE p.granted_at IS NOT NULL AND p.notified_at IS NULL ORDER BY p.id LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Объявление один раз: только реально отмеченные строки
  async markAnnounced(prizeIds, now) {
    const result = await this.query(
      'UPDATE quiz_prizes SET notified_at = $2 WHERE id = ANY($1::int[]) AND notified_at IS NULL RETURNING id',
      [prizeIds, now]
    );
    return result.rows.map(row => row.id);
  }
}

module.exports = QuizRepository;
