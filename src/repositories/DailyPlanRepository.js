const BaseRepository = require('./BaseRepository');

// «☀️ План на день»: настройка в users и отправленные планы daily_plans (одна строка на локальный день)
class DailyPlanRepository extends BaseRepository {
  async getSettings(userId) {
    const result = await this.query('SELECT daily_plan_enabled, daily_plan_hour FROM users WHERE id = $1', [userId]);
    const row = result.rows[0] || {};
    return { enabled: row.daily_plan_enabled === true, hour: row.daily_plan_hour ?? null };
  }

  async setEnabled(userId, enabled) {
    await this.query('UPDATE users SET daily_plan_enabled = $2 WHERE id = $1', [userId, enabled]);
  }

  // Выбор часа включает план
  async setHour(userId, hour) {
    await this.query('UPDATE users SET daily_plan_hour = $2, daily_plan_enabled = TRUE WHERE id = $1', [userId, hour]);
  }

  async getCandidates() {
    const result = await this.query(
      `SELECT id, language, timezone, daily_plan_hour, bill_reminders_enabled, sub_warn_enabled
       FROM users WHERE id > 0 AND daily_plan_enabled = TRUE`,
      []
    );
    return result.rows;
  }

  // Отметка «план на этот день отправлен» — до отправки: перезапуск и наложение запусков второго плана не дают.
  // true — отметка поставлена сейчас
  async claim(userId, day, { daily, deficit, currency }) {
    const result = await this.query(
      `INSERT INTO daily_plans (user_id, day, daily, deficit, currency) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, day) DO NOTHING RETURNING user_id`,
      [userId, day, daily, deficit, currency]
    );
    return result.rowCount > 0;
  }

  async getPlan(userId, day) {
    const result = await this.query(
      'SELECT daily::float AS daily, deficit::float AS deficit, currency FROM daily_plans WHERE user_id = $1 AND day = $2',
      [userId, day]
    );
    return result.rows[0] || null;
  }
}

module.exports = DailyPlanRepository;
