const BaseRepository = require('./BaseRepository');
const currencyConfig = require('../config/currencies');

class UserRepository extends BaseRepository {
  async createUser(userId, username, firstName) {
    const query = `
      INSERT INTO users (id, username, first_name) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (id) DO UPDATE SET 
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name
      RETURNING *, (xmax = 0) AS is_new,
        (created_at > LOCALTIMESTAMP - INTERVAL '10 seconds') AS just_created
    `;
    const result = await this.query(query, [userId, username, firstName]);
    return result.rows[0];
  }

  async getUserCurrency(userId) {
    const result = await this.query('SELECT currency FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.currency || currencyConfig.BASE_CURRENCY;
  }

  async setUserCurrency(userId, currency) {
    const query = 'UPDATE users SET currency = $1 WHERE id = $2';
    await this.query(query, [currency, userId]);
  }

  // Валюта дохода: если не задана отдельно — совпадает с основной валютой пользователя
  async getUserIncomeCurrency(userId) {
    const result = await this.query('SELECT COALESCE(income_currency, currency) AS currency FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.currency || currencyConfig.BASE_CURRENCY;
  }

  async setUserIncomeCurrency(userId, currency) {
    const query = 'UPDATE users SET income_currency = $1 WHERE id = $2';
    await this.query(query, [currency, userId]);
  }

  async getUserPremium(userId) {
    const result = await this.query('SELECT premium FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.premium || false;
  }

  async setUserPremium(userId, isPremium) {
    const query = 'UPDATE users SET premium = $1 WHERE id = $2';
    await this.query(query, [isPremium, userId]);
  }

  async getUserTimezone(userId) {
    const result = await this.query('SELECT timezone FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.timezone || 'UTC';
  }

  async setUserTimezone(userId, timezone) {
    const query = 'UPDATE users SET timezone = $1 WHERE id = $2';
    const result = await this.query(query, [timezone, userId]);
    return result;
  }

  async getUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.query(query, [userId]);
    return result.rows[0];
  }

  // Username в Telegram не зависит от регистра. Совпадений больше одного быть не должно (refreshProfile
  // освобождает ник у прежнего владельца), но если они есть — выбрать «первого попавшегося» нельзя.
  async findUsersByUsername(username) {
    const query = 'SELECT * FROM users WHERE LOWER(username) = LOWER($1) ORDER BY id';
    const result = await this.query(query, [username]);
    return result.rows;
  }

  // Обновляет username/first_name из ctx.from; пишет только при изменении.
  // Username в Telegram в каждый момент принадлежит одному аккаунту: у прежнего владельца
  // (сменил ник, а бот об этом не знал) он сбрасывается, чтобы приглашение не ушло не тому человеку.
  async refreshProfile(userId, username, firstName) {
    const query = `
      WITH released AS (
        UPDATE users SET username = NULL
        WHERE $2::text IS NOT NULL AND LOWER(username) = LOWER($2::text) AND id <> $1
      )
      UPDATE users SET username = $2::text, first_name = $3::text
      WHERE id = $1 AND (username IS DISTINCT FROM $2::text OR first_name IS DISTINCT FROM $3::text)
    `;
    await this.query(query, [userId, username ?? null, firstName ?? null]);
  }

  async getReminderSettings(userId) {
    const query = 'SELECT reminder_enabled, last_reminder_local_date, timezone, reminder_hours, reminder_sent_today_hours, daily_summary_enabled, daily_summary_hour, weekly_insight_enabled FROM users WHERE id = $1';
    const result = await this.query(query, [userId]);
    return result.rows[0] || { reminder_enabled: false, last_reminder_local_date: null, timezone: 'UTC', daily_summary_enabled: false, daily_summary_hour: null, weekly_insight_enabled: false };
  }

  async setReminderEnabled(userId, enabled) {
    const query = 'UPDATE users SET reminder_enabled = $2 WHERE id = $1';
    await this.query(query, [userId, !!enabled]);
  }

  async setFamilyMode(userId, enabled) {
    await this.query('UPDATE users SET family_mode = $2 WHERE id = $1', [userId, !!enabled]);
  }

  async updateLastReminderLocalDate(userId, dateStr) {
    const query = 'UPDATE users SET last_reminder_local_date = $2 WHERE id = $1';
    await this.query(query, [userId, dateStr]);
  }

  async setReminderHours(userId, hoursArray) {
    const query = 'UPDATE users SET reminder_hours = $2 WHERE id = $1';
    // hoursArray может быть null (вернуть к дефолтам) или массивом (включая пустой [] => отключено всё)
    await this.query(query, [userId, hoursArray === null ? null : (Array.isArray(hoursArray) ? hoursArray : null)]);
  }

  async setReminderSentTodayHours(userId, hoursArray) {
    const query = 'UPDATE users SET reminder_sent_today_hours = $2 WHERE id = $1';
    await this.query(query, [userId, hoursArray && hoursArray.length ? hoursArray : null]);
  }

  async setDailySummaryEnabled(userId, enabled) {
    await this.query('UPDATE users SET daily_summary_enabled = $2 WHERE id = $1', [userId, !!enabled]);
  }

  // Час сводки включает её: выбор часа без включения не имел бы смысла
  async setDailySummaryHour(userId, hour) {
    await this.query('UPDATE users SET daily_summary_hour = $2, daily_summary_enabled = TRUE WHERE id = $1', [userId, hour]);
  }

  async setWeeklyInsightEnabled(userId, enabled) {
    await this.query('UPDATE users SET weekly_insight_enabled = $2 WHERE id = $1', [userId, !!enabled]);
  }

  async updateUser(userId, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [userId, ...values]);
    return result.rows[0];
  }

  async getUserLanguage(userId) {
    const result = await this.query('SELECT language FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.language || 'en';
  }

  async setUserLanguage(userId, language) {
    const query = 'UPDATE users SET language = $1 WHERE id = $2';
    await this.query(query, [language, userId]);
  }

  async getUserPeriodStartDay(userId) {
    const result = await this.query('SELECT period_start_day FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.period_start_day || 1;
  }

  async setUserPeriodStartDay(userId, day) {
    const query = 'UPDATE users SET period_start_day = $1 WHERE id = $2';
    await this.query(query, [day, userId]);
  }

  // Опрос «🧭 Настроим бота под тебя»: черновик/ответы (JSONB) и когда опрос закончен (пройден или пропущен)
  async getOnboarding(userId) {
    const result = await this.query('SELECT onboarding_answers, onboarding_completed_at FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    return row ? { answers: row.onboarding_answers || null, completedAt: row.onboarding_completed_at || null } : null;
  }

  // finished — опрос закончен этим сохранением: ставим onboarding_completed_at
  async saveOnboarding(userId, answers, { finished = false } = {}) {
    await this.query(
      `UPDATE users SET onboarding_answers = $2::jsonb,
         onboarding_completed_at = CASE WHEN $3::boolean THEN NOW() ELSE onboarding_completed_at END
       WHERE id = $1`,
      [userId, JSON.stringify(answers), finished]
    );
  }

  async isUserAdmin(userId) {
    const result = await this.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.is_admin || false;
  }

  async setUserAdmin(userId, isAdmin) {
    const query = 'UPDATE users SET is_admin = $1 WHERE id = $2';
    await this.query(query, [isAdmin, userId]);
  }

  async getAllAdmins() {
    const query = 'SELECT id, username, first_name, created_at FROM users WHERE is_admin = true ORDER BY created_at ASC';
    const result = await this.query(query, []);
    return result.rows;
  }

  async getAllUsers(limit = 50, offset = 0) {
    const query = `
      SELECT id, username, first_name, created_at, premium, is_admin, language, currency, timezone
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await this.query(query, [limit, offset]);
    return result.rows;
  }

  async getUsersCount() {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await this.query(query, []);
    return parseInt(result.rows[0].count, 10);
  }

  // Активные за последние days суток: сами делали записи — траты и доходы, кроме авто-записей регулярных и импорта
  // выписок. records — записей, days — разных дней (в поясе пользователя), last_at — последняя запись; total — всего
  // таких пользователей (для страниц). По последней записи, свежие сверху
  async getActiveUsers(days, limit, offset, now = new Date()) {
    const query = `
      WITH records AS (
        SELECT user_id, created_at_utc FROM expenses
        WHERE created_at_utc >= NOW() - make_interval(days => $1) AND recurring_expense_id IS NULL AND import_id IS NULL
        UNION ALL
        SELECT user_id, created_at_utc FROM incomes
        WHERE created_at_utc >= NOW() - make_interval(days => $1) AND import_id IS NULL
      ), active AS (
        SELECT r.user_id, COUNT(*)::int AS records,
               COUNT(DISTINCT (r.created_at_utc AT TIME ZONE COALESCE(tz.name, 'UTC'))::date)::int AS days,
               MAX(r.created_at_utc) AS last_at
        FROM records r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN pg_timezone_names tz ON tz.name = u.timezone
        GROUP BY r.user_id
      )
      SELECT u.id, u.username, u.first_name, u.is_admin, u.language,
             (u.premium AND u.premium_expires_at > $4) AS premium,
             a.records, a.days, a.last_at, COUNT(*) OVER ()::int AS total
      FROM active a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.last_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [days, limit, offset, now]);
    return result.rows;
  }

  // Админ снимает премиум целиком — и оплаченный им семейный тариф
  async deactivatePremium(userId) {
    const query = 'UPDATE users SET premium = false, premium_expires_at = NULL, family_premium_expires_at = NULL WHERE id = $1';
    await this.query(query, [userId]);
  }

  async getAllUsersForBroadcast() {
    const query = 'SELECT id FROM users WHERE id > 0 ORDER BY id';
    const result = await this.query(query, []);
    return result.rows;
  }
}

module.exports = UserRepository; 