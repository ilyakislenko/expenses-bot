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
}

module.exports = UserRepository; 