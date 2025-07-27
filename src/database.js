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
      
      // Add expense
      const expenseResult = await client.query(
        'INSERT INTO expenses (user_id, amount, description, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, amount, description, categoryId]
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

    const query = `
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE user_id = $1 AND ${dateFilter}
    `;
    const result = await this.query(query, [userId]);
    return result.rows[0];
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
        SUM(e.amount) as total,
        COUNT(e.id) as count
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND ${dateFilter}
      GROUP BY c.id, c.name, c.icon
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
}

module.exports = new Database();
