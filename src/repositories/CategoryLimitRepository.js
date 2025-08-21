const BaseRepository = require('./BaseRepository');

class CategoryLimitRepository extends BaseRepository {
  async upsertLimit(userId, categoryId, limitAmount, limitCurrency = 'RUB') {
    const query = `
      INSERT INTO user_category_limits (user_id, category_id, limit_amount, limit_currency)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, category_id)
      DO UPDATE SET limit_amount = EXCLUDED.limit_amount, limit_currency = EXCLUDED.limit_currency
      RETURNING *
    `;
    const result = await this.query(query, [userId, categoryId, limitAmount, limitCurrency]);
    return result.rows[0];
  }

  async deleteLimit(userId, categoryId) {
    const query = 'DELETE FROM user_category_limits WHERE user_id = $1 AND category_id = $2';
    await this.query(query, [userId, categoryId]);
  }

  async getLimit(userId, categoryId) {
    const query = 'SELECT * FROM user_category_limits WHERE user_id = $1 AND category_id = $2';
    const result = await this.query(query, [userId, categoryId]);
    return result.rows[0] || null;
  }

  async getLimitsForUser(userId) {
    const query = `
      SELECT l.*, c.name AS category_name, c.icon AS category_icon
      FROM user_category_limits l
      JOIN categories c ON c.id = l.category_id
      WHERE l.user_id = $1
      ORDER BY c.name ASC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }
}

module.exports = CategoryLimitRepository;


