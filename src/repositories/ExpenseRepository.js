const BaseRepository = require('./BaseRepository');
const periodsConfig = require('../config/periods');
const currencyConfig = require('../config/currencies');

class ExpenseRepository extends BaseRepository {
  async addExpense(userId, amount, description, categoryId, currency = currencyConfig.BASE_CURRENCY, userTimezone = 'UTC', familyId = null) {
    const query = `
      INSERT INTO expenses (user_id, amount, description, category_id, currency, family_id, created_at_utc) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
      RETURNING *
    `;
    const result = await this.query(query, [userId, amount, description, categoryId, currency, familyId]);
    return result.rows[0];
  }

  async getUserExpenses(userId, limit = 10) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.created_at_utc DESC
      LIMIT $2
    `;
    const result = await this.query(query, [userId, limit]);
    return result.rows;
  }

  async getDailyExpenses(userId, userTimezone = 'UTC') {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      AND e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2)
      AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2
      ORDER BY e.created_at_utc ASC
    `;
    const result = await this.query(query, [userId, userTimezone]);
    return result.rows;
  }

  async getTotalExpenses(userId, period = periodsConfig.MONTH, userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case periodsConfig.DAY:
        dateFilter = "created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case periodsConfig.WEEK:
        dateFilter = "created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case periodsConfig.MONTH:
      default:
        dateFilter = "created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
    }

    // Получаем суммы по всем валютам
    const byCurrencyQuery = `
      SELECT currency, SUM(amount) as total
      FROM expenses
      WHERE user_id = $1 AND ${dateFilter}
      GROUP BY currency
    `;
    const byCurrencyResult = await this.query(byCurrencyQuery, [userId, userTimezone]);
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
    const countResult = await this.query(countQuery, [userId, userTimezone]);
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

  async getExpensesByCategory(userId, period = periodsConfig.MONTH, userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case periodsConfig.DAY:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case periodsConfig.WEEK:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case periodsConfig.MONTH:
      default:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
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
    const result = await this.query(query, [userId, userTimezone]);
    return result.rows;
  }

  async getExpensesByCategoryId(userId, categoryId, period = periodsConfig.MONTH, userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case periodsConfig.DAY:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $3)) AT TIME ZONE $3) AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $3)) + interval '1 day') AT TIME ZONE $3";
        break;
      case periodsConfig.WEEK:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $3)) AT TIME ZONE $3) AND e.created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $3)) + interval '1 week') AT TIME ZONE $3";
        break;
      case periodsConfig.MONTH:
      default:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $3)) AT TIME ZONE $3) AND e.created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $3)) + interval '1 month') AT TIME ZONE $3";
    }
    
    // Сначала получаем название категории по ID
    const categoryQuery = `
      SELECT name FROM categories WHERE id = $1
    `;
    const categoryResult = await this.query(categoryQuery, [categoryId]);
    
    if (!categoryResult.rows.length) {
      return [];
    }
    
    const categoryName = categoryResult.rows[0].name;
    
    // Ищем расходы по всем категориям с таким же названием (системным и пользовательским)
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND c.name = $2 AND ${dateFilter}
      ORDER BY e.created_at_utc DESC
    `;
    const result = await this.query(query, [userId, categoryName, userTimezone]);
    return result.rows;
  }

  async deleteLastExpense(userId) {
    const query = `
      DELETE FROM expenses 
      WHERE id = (
        SELECT id FROM expenses 
        WHERE user_id = $1 
        ORDER BY created_at_utc DESC 
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
        e.created_at_utc
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.created_at_utc DESC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }

  async getExpenseCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM expenses
      WHERE user_id = $1
    `;
    const result = await this.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  // Family expense methods
  async getFamilyExpenses(familyId, limit = 10) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon, u.username, u.first_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE e.family_id = $1
      ORDER BY e.created_at_utc DESC
      LIMIT $2
    `;
    const result = await this.query(query, [familyId, limit]);
    return result.rows;
  }

  async getFamilyDailyExpenses(familyId, userTimezone = 'UTC') {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon, u.username, u.first_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.user_id = u.id
      WHERE e.family_id = $1
      AND e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2)
      AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2
      ORDER BY e.created_at_utc ASC
    `;
    const result = await this.query(query, [familyId, userTimezone]);
    return result.rows;
  }

  async getFamilyTotalExpenses(familyId, period = periodsConfig.MONTH, userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case periodsConfig.DAY:
        dateFilter = "created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case periodsConfig.WEEK:
        dateFilter = "created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case periodsConfig.MONTH:
      default:
        dateFilter = "created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
    }

    // Get totals by currency
    const byCurrencyQuery = `
      SELECT currency, SUM(amount) as total
      FROM expenses
      WHERE family_id = $1 AND ${dateFilter}
      GROUP BY currency
    `;
    const byCurrencyResult = await this.query(byCurrencyQuery, [familyId, userTimezone]);
    const byCurrency = byCurrencyResult.rows.map(row => ({
      currency: row.currency,
      total: parseFloat(row.total)
    }));

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM expenses
      WHERE family_id = $1 AND ${dateFilter}
    `;
    const countResult = await this.query(countQuery, [familyId, userTimezone]);
    const count = parseInt(countResult.rows[0].count, 10);

    // For compatibility: total and currency (if only one currency)
    let total = 0;
    let currency = null;
    if (byCurrency.length === 1) {
      total = byCurrency[0].total;
      currency = byCurrency[0].currency;
    }

    return { byCurrency, count, total, currency };
  }

  async getFamilyExpensesByCategory(familyId, period = periodsConfig.MONTH, userTimezone = 'UTC') {
    let dateFilter;
    switch (period) {
      case periodsConfig.DAY:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('day', (NOW() AT TIME ZONE $2)) + interval '1 day') AT TIME ZONE $2";
        break;
      case periodsConfig.WEEK:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('week', (NOW() AT TIME ZONE $2)) + interval '1 week') AT TIME ZONE $2";
        break;
      case periodsConfig.MONTH:
      default:
        dateFilter = "e.created_at_utc >= (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) AT TIME ZONE $2) AND e.created_at_utc < (DATE_TRUNC('month', (NOW() AT TIME ZONE $2)) + interval '1 month') AT TIME ZONE $2";
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
      WHERE e.family_id = $1 AND ${dateFilter}
      GROUP BY c.id, c.name, c.icon, e.currency
      ORDER BY total DESC
    `;
    const result = await this.query(query, [familyId, userTimezone]);
    return result.rows;
  }

  async getUserAndFamilyExpenses(userId, limit = 10) {
    const query = `
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             CASE WHEN e.family_id IS NOT NULL THEN 'family' ELSE 'personal' END as expense_type
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 OR e.family_id IN (
        SELECT family_id FROM family_user WHERE user_id = $1
      )
      ORDER BY e.created_at_utc DESC
      LIMIT $2
    `;
    const result = await this.query(query, [userId, limit]);
    return result.rows;
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
      SELECT e.*, c.name as category_name, c.icon as category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = $1 AND (e.user_id = $2 OR e.family_id IN (
        SELECT family_id FROM family_user WHERE user_id = $2
      ))
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }
}

module.exports = ExpenseRepository; 