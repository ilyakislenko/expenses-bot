const BaseRepository = require('./BaseRepository');

// «😈 Злой режим»: настройки пользователя (users.roast_level, gender, roast_adult_confirmed_at), счётчик подколок
// (roast_state) и выборки трат для поводов. Локальные даты — строками 'YYYY-MM-DD', как в остальных репозиториях.
class RoastRepository extends BaseRepository {
  async getSettings(userId) {
    const result = await this.query(
      'SELECT roast_level, gender, roast_adult_confirmed_at FROM users WHERE id = $1',
      [userId]
    );
    const row = result.rows[0];
    return {
      level: (row && row.roast_level) || 'off',
      gender: (row && row.gender) || null,
      adultConfirmed: !!(row && row.roast_adult_confirmed_at)
    };
  }

  async setLevel(userId, level) {
    await this.query('UPDATE users SET roast_level = $2 WHERE id = $1', [userId, level]);
  }

  async setGender(userId, gender) {
    await this.query('UPDATE users SET gender = $2 WHERE id = $1', [userId, gender]);
  }

  // 18+ подтверждается один раз: повторный вызов дату не меняет
  async confirmAdult(userId) {
    await this.query('UPDATE users SET roast_adult_confirmed_at = COALESCE(roast_adult_confirmed_at, NOW()) WHERE id = $1', [userId]);
  }

  // { day, dayCount, lastAt, recent } — состояние счётчика (пустое, если подколок ещё не было)
  async getState(userId) {
    const result = await this.query(
      `SELECT day::text AS day, day_count, last_at, recent FROM roast_state WHERE user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row) return { day: null, dayCount: 0, lastAt: null, recent: [] };
    return { day: row.day, dayCount: row.day_count, lastAt: row.last_at, recent: row.recent || [] };
  }

  // Атомарно занять подколку: за локальный день today меньше maxPerDay и с последней прошло gapMinutes —
  // иначе false. force (превышение бюджета) — без этих ограничений. Вариант variantKey попадает в начало recent
  // (хранится keep последних). Две параллельные записи не дадут две подколки сверх лимита: условие — в UPDATE
  async claim(userId, { today, force = false, maxPerDay, gapMinutes, variantKey, keep }) {
    const result = await this.query(`
      INSERT INTO roast_state AS s (user_id, day, day_count, last_at, recent)
      VALUES ($1, $2::date, 1, NOW(), ARRAY[$6::text])
      ON CONFLICT (user_id) DO UPDATE SET
        day = $2::date,
        day_count = CASE WHEN s.day = $2::date THEN s.day_count + 1 ELSE 1 END,
        last_at = NOW(),
        recent = (ARRAY[$6::text] || s.recent)[1:$7]
      WHERE $3::boolean
         OR ((s.day IS DISTINCT FROM $2::date OR s.day_count < $4)
             AND (s.last_at IS NULL OR s.last_at <= NOW() - make_interval(mins => $5)))
      RETURNING day_count
    `, [userId, today, !!force, maxPerDay, gapMinutes, variantKey, keep]);
    return result.rows.length > 0;
  }

  // Варианты показаны вне счётчика (сводка недели, «Разнос месяца»): только в recent, чтобы не повторяться.
  // keys — от последнего показанного к первому
  async rememberVariants(userId, keys, keep) {
    if (!keys.length) return;
    await this.query(`
      INSERT INTO roast_state AS s (user_id, recent) VALUES ($1, ($2::text[])[1:$3])
      ON CONFLICT (user_id) DO UPDATE SET recent = ($2::text[] || s.recent)[1:$3]
    `, [userId, keys, keep]);
  }

  // Траты действия с локальной датой (для «сегодня» и периода): [{ id, amount, currency, local_date }]
  async getActionRows(userId, timezone, ids) {
    if (!ids.length) return [];
    const result = await this.query(`
      SELECT id, amount::float AS amount, currency, ((created_at_utc AT TIME ZONE $2)::date)::text AS local_date
      FROM expenses
      WHERE user_id = $1 AND id = ANY($3::int[])
    `, [userId, timezone, ids]);
    return result.rows;
  }

  // Свои доходы с локальной даты since — для «только зарплата пришла»: [{ amount, currency, local_date }]
  async getIncomes(userId, timezone, since) {
    const result = await this.query(`
      SELECT amount::float AS amount, currency, ((created_at_utc AT TIME ZONE $2)::date)::text AS local_date
      FROM incomes
      WHERE user_id = $1 AND (created_at_utc AT TIME ZONE $2) >= $3::date
    `, [userId, timezone, since]);
    return result.rows;
  }

  // Свои траты за days дней до сегодня (без авто-записей регулярных и без трат действия) — для медианы:
  // [{ amount, currency, category_name }]
  async getHistory(userId, timezone, since, excludeIds) {
    const result = await this.query(`
      SELECT e.amount::float AS amount, e.currency, c.name AS category_name
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = $1
        AND e.recurring_expense_id IS NULL
        AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
        AND NOT (e.id = ANY($4::int[]))
    `, [userId, timezone, since, excludeIds]);
    return result.rows;
  }
}

module.exports = RoastRepository;
