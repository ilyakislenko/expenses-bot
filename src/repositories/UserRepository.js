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
      RETURNING *
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

  async getUserByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.query(query, [username]);
    return result.rows[0];
  }

  async getReminderSettings(userId) {
    const query = 'SELECT reminder_enabled, last_reminder_local_date, timezone FROM users WHERE id = $1';
    const result = await this.query(query, [userId]);
    return result.rows[0] || { reminder_enabled: false, last_reminder_local_date: null, timezone: 'UTC' };
  }

  async setReminderEnabled(userId, enabled) {
    const query = 'UPDATE users SET reminder_enabled = $2 WHERE id = $1';
    await this.query(query, [userId, !!enabled]);
  }

  async updateLastReminderLocalDate(userId, dateStr) {
    const query = 'UPDATE users SET last_reminder_local_date = $2 WHERE id = $1';
    await this.query(query, [userId, dateStr]);
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
    return result.rows[0]?.language || 'ru';
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

  async getUserByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await this.query(query, [username]);
    return result.rows[0];
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

  async deactivatePremium(userId) {
    const query = 'UPDATE users SET premium = false, premium_expires_at = NULL WHERE id = $1';
    await this.query(query, [userId]);
  }
}

module.exports = UserRepository; 