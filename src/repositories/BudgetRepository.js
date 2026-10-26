const BaseRepository = require('./BaseRepository');

// category_name = null — общий бюджет на период
class BudgetRepository extends BaseRepository {
  async getByUser(userId) {
    const query = `
      SELECT b.id, b.category_name, b.amount::float AS amount, b.currency, b.created_at,
             (SELECT MIN(c.icon) FROM categories c WHERE c.name = b.category_name AND c.user_id IN (0, b.user_id)) AS icon
      FROM category_budgets b
      WHERE b.user_id = $1
      ORDER BY b.category_name IS NOT NULL, b.category_name
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async upsert(userId, categoryName, amount, currency) {
    const query = `
      INSERT INTO category_budgets (user_id, category_name, amount, currency)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, (COALESCE(category_name, '')))
      DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency
      RETURNING id
    `;
    const result = await this.query(query, [userId, categoryName, amount, currency]);
    return result.rows[0];
  }

  async deleteById(userId, budgetId) {
    const result = await this.query('DELETE FROM category_budgets WHERE id = $1 AND user_id = $2 RETURNING id', [budgetId, userId]);
    return result.rowCount > 0;
  }
}

module.exports = BudgetRepository;
