const BaseRepository = require('./BaseRepository');

// Периоды — локальные даты пользователя [start, end) в формате 'YYYY-MM-DD' (см. utils/period)
class IncomeRepository extends BaseRepository {
  async addIncome(userId, amount, currency, description) {
    const query = `
      INSERT INTO incomes (user_id, amount, currency, description, created_at_utc)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await this.query(query, [userId, amount, currency, description]);
    return result.rows[0];
  }

  async getIncomesBetween(userId, userTimezone, start, end) {
    const query = `
      SELECT *
      FROM incomes
      WHERE user_id = $1
        AND (created_at_utc AT TIME ZONE $2) >= $3::date
        AND (created_at_utc AT TIME ZONE $2) < $4::date
      ORDER BY created_at_utc ASC
    `;
    const result = await this.query(query, [userId, userTimezone, start, end]);
    return result.rows;
  }

  async getTotalsBetween(userId, userTimezone, start, end) {
    const query = `
      SELECT currency, SUM(amount)::float AS total, COUNT(*)::int AS count
      FROM incomes
      WHERE user_id = $1
        AND (created_at_utc AT TIME ZONE $2) >= $3::date
        AND (created_at_utc AT TIME ZONE $2) < $4::date
      GROUP BY currency
      ORDER BY currency
    `;
    const result = await this.query(query, [userId, userTimezone, start, end]);
    return {
      byCurrency: result.rows.map(row => ({ currency: row.currency, total: parseFloat(row.total) })),
      count: result.rows.reduce((sum, row) => sum + row.count, 0)
    };
  }

  async getIncomeById(userId, incomeId) {
    const result = await this.query(`
      SELECT i.*, (SELECT b.source FROM entry_batches b WHERE b.id = i.batch_id) AS batch_source
      FROM incomes i WHERE i.id = $1 AND i.user_id = $2
    `, [incomeId, userId]);
    return result.rows[0];
  }

  async updateIncome(userId, incomeId, { amount, currency, description }) {
    const query = `
      UPDATE incomes SET amount = $3, currency = $4, description = $5
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [incomeId, userId, amount, currency, description]);
    return result.rows[0];
  }

  // Другой день дохода: createdAt — новый момент, посчитанный в IncomeService.setIncomeDate
  async setIncomeCreatedAt(userId, incomeId, createdAt) {
    const result = await this.query(
      'UPDATE incomes SET created_at_utc = $3 WHERE id = $1 AND user_id = $2 RETURNING *',
      [incomeId, userId, createdAt]
    );
    return result.rows[0];
  }

  async deleteIncomeById(userId, incomeId) {
    const query = `
      DELETE FROM incomes
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [incomeId, userId]);
    return result.rows[0];
  }
}

module.exports = IncomeRepository;
