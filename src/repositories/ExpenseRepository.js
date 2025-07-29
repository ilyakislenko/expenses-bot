const BaseRepository = require('./BaseRepository');

class ExpenseRepository extends BaseRepository {
  async addExpense(userId, amount, description, categoryId, currency = 'RUB') {
    const query = `
      INSERT INTO expenses (user_id, amount, description, category_id, currency) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    const result = await this.query(query, [userId, amount, description, categoryId, currency]);
    return result.rows[0];
  }

  async getUserExpenses(userId, limit = 10) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `;
    const result = await this.query(query, [userId, limit]);
    return result.rows;
  }

  async getDailyExpenses(userId) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      AND e.date = CURRENT_DATE
      ORDER BY e.created_at ASC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getTotalExpenses(userId, period = 'month') {
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "date = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
      default:
        dateFilter = "EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)";
    }

    // Получаем суммы по всем валютам
    const byCurrencyQuery = `
      SELECT currency, SUM(amount) as total
      FROM expenses
      WHERE user_id = $1 AND ${dateFilter}
      GROUP BY currency
    `;
    const byCurrencyResult = await this.query(byCurrencyQuery, [userId]);
    const byCurrency = byCurrencyResult.rows.map(row => ({
      currency: row.currency,
      total: parseFloat(row.total)
    }));

    // Получаем общее количество записей
    const countQuery = `
      SELECT COUNT(*) as count
      FROM expenses
      WHERE user_id = $1 AND ${dateFilter}
    `;
    const countResult = await this.query(countQuery, [userId]);
    const count = parseInt(countResult.rows[0].count, 10);

    // Для совместимости: total и currency (если только одна валюта)
    let total = 0;
    let currency = null;
    if (byCurrency.length === 1) {
      total = byCurrency[0].total;
      currency = byCurrency[0].currency;
    }

    return { byCurrency, count, total, currency };
  }

  async getExpensesByCategory(userId, period = 'month') {
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "e.date = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "e.date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
      default:
        dateFilter = "EXTRACT(MONTH FROM e.date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM CURRENT_DATE)";
    }

    const query = `
      SELECT 
        c.name,
        c.icon,
        e.currency,
        SUM(e.amount) as total,
        COUNT(e.id) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND ${dateFilter}
      GROUP BY c.id, c.name, c.icon, e.currency
      ORDER BY total DESC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getExpensesByCategoryId(userId, categoryId, period = 'month') {
    let dateFilter;
    switch (period) {
      case 'day':
        dateFilter = "e.date = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "e.date >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
      default:
        dateFilter = "EXTRACT(MONTH FROM e.date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM CURRENT_DATE)";
    }
    
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.category_id = $2 AND ${dateFilter}
      ORDER BY e.created_at DESC
    `;
    const result = await this.query(query, [userId, categoryId]);
    return result.rows;
  }

  async deleteLastExpense(userId) {
    const query = `
      DELETE FROM expenses 
      WHERE id = (
        SELECT id FROM expenses 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      )
      RETURNING *
    `;
    const result = await this.query(query, [userId]);
    return result.rows[0];
  }

  async deleteExpenseById(userId, expenseId) {
    const query = `
      DELETE FROM expenses
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }

  async updateExpenseById(userId, expenseId, { amount, description }) {
    const query = `
      UPDATE expenses
      SET amount = $1, description = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
    const result = await this.query(query, [amount, description, expenseId, userId]);
    return result.rows[0];
  }

  async getExpenseById(userId, expenseId) {
    const query = `
      SELECT * FROM expenses WHERE id = $1 AND user_id = $2
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }

  async exportExpenses(userId, format = 'csv') {
    const query = `
      SELECT 
        e.amount,
        e.currency,
        e.description,
        c.name as category,
        e.date,
        e.created_at
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.date DESC, e.created_at DESC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }
}

module.exports = ExpenseRepository; 