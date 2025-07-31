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
}

module.exports = UserRepository; 