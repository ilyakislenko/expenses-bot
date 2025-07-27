const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

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
    
    // Create default categories for new user
    await this.createDefaultCategories(userId);
    
    return result.rows[0];
  }

  async createDefaultCategories(userId) {
    const defaultCategories = [
      ['Еда', '🍕'],
      ['Транспорт', '🚗'],
      ['Развлечения', '🎬'],
      ['Покупки', '🛒'],
      ['Здоровье', '💊'],
      ['Другое', '📦']
    ];

    for (const [name, icon] of defaultCategories) {
      await this.query(
        'INSERT INTO categories (user_id, name, icon) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [userId, name, icon]
      );
    }
  }

  async addExpense(userId, amount, description, categoryName = 'Другое') {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get or create category
      let categoryResult = await client.query(
        'SELECT id FROM categories WHERE user_id = $1 AND name = $2',
        [userId, categoryName]
      );
      
      let categoryId;
      if (categoryResult.rows.length === 0) {
        const newCategory = await client.query(
          'INSERT INTO categories (user_id, name) VALUES ($1, $2) RETURNING id',
          [userId, categoryName]
        );
        categoryId = newCategory.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }
      
      // Получаем валюту пользователя
      const userCurrencyResult = await client.query('SELECT currency FROM users WHERE id = $1', [userId]);
      const currency = userCurrencyResult.rows[0]?.currency || 'RUB';
      // Add expense
      const expenseResult = await client.query(
        'INSERT INTO expenses (user_id, amount, description, category_id, currency) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, amount, description, categoryId, currency || 'RUB']
      );
      
      await client.query('COMMIT');
      return expenseResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
  async getCategories(userId) {
    const query = `
      SELECT * FROM categories WHERE user_id = $1
    `;
    const result = await this.query(query, [userId]);
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

  async exportExpenses(userId, format = 'csv') {
    const query = `
      SELECT 
        e.amount,
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

  async setUserCurrency(userId, currency) {
    const query = 'UPDATE users SET currency = $1 WHERE id = $2';
    await this.query(query, [currency, userId]);
  }

  async getUserCurrency(userId) {
    const result = await this.query('SELECT currency FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.currency || 'RUB';
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
}

module.exports = new Database();
