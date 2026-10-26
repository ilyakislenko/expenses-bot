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

  // Периоды — локальные даты пользователя [start, end) в формате 'YYYY-MM-DD' (см. utils/period)
  async getTotalsBetween(userId, userTimezone, start, end) {
    const query = `
      SELECT currency, SUM(amount)::float AS total, COUNT(*)::int AS count
      FROM expenses
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

  // Категории объединяются по имени (системная и пользовательская с одним именем — одна строка)
  async getCategoryTotalsBetween(userId, userTimezone, start, end) {
    const query = `
      SELECT MIN(c.id) AS category_id, c.name, MIN(c.icon) AS icon, e.currency,
             SUM(e.amount)::float AS total, COUNT(*)::int AS count
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
        AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
        AND (e.created_at_utc AT TIME ZONE $2) < $4::date
      GROUP BY c.name, e.currency
    `;
    const result = await this.query(query, [userId, userTimezone, start, end]);
    return result.rows;
  }

  // categoryName = null — все категории
  async getExpensesBetween(userId, userTimezone, start, end, categoryName = null) {
    const query = `
      SELECT e.*, c.name AS category_name, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
        AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
        AND (e.created_at_utc AT TIME ZONE $2) < $4::date
        AND ($5::text IS NULL OR c.name = $5)
      ORDER BY e.created_at_utc ASC
    `;
    const result = await this.query(query, [userId, userTimezone, start, end, categoryName]);
    return result.rows;
  }

  // Категория последней траты пользователя с таким же описанием (без учёта регистра)
  async getLastCategoryIdForDescription(userId, description) {
    const query = `
      SELECT category_id
      FROM expenses
      WHERE user_id = $1 AND category_id IS NOT NULL AND LOWER(TRIM(description)) = LOWER(TRIM($2))
      ORDER BY created_at_utc DESC
      LIMIT 1
    `;
    const result = await this.query(query, [userId, description]);
    return result.rows[0] ? result.rows[0].category_id : null;
  }

  async updateExpenseCategory(userId, expenseId, categoryId) {
    const query = `
      UPDATE expenses
      SET category_id = $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [expenseId, userId, categoryId]);
    return result.rows[0];
  }


  async hasAnyExpenseToday(userId, userTimezone = 'UTC') {
    const query = `
      WITH local_now AS (
        SELECT (NOW() AT TIME ZONE $2) AS ln
      ), day_bounds AS (
        SELECT DATE_TRUNC('day', ln) AS start_date,
               (DATE_TRUNC('day', ln) + INTERVAL '1 day' - INTERVAL '1 second') AS end_date
        FROM local_now
      )
      SELECT 1
      FROM expenses
      WHERE user_id = $1
        AND recurring_expense_id IS NULL -- автоматические регулярные траты не считаются ручной записью
        AND (created_at_utc AT TIME ZONE $2) >= (SELECT start_date FROM day_bounds)
        AND (created_at_utc AT TIME ZONE $2) <= (SELECT end_date FROM day_bounds)
      LIMIT 1
    `;
    const result = await this.query(query, [userId, userTimezone]);
    return result.rows.length > 0;
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

  async updateExpenseFamilyId(userId, expenseId, familyId) {
    const query = `
      UPDATE expenses
      SET family_id = $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [expenseId, userId, familyId]);
    return result.rows[0];
  }

  async removeExpenseFamilyId(userId, expenseId) {
    const query = `
      UPDATE expenses
      SET family_id = NULL
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }

  async getExpenseById(userId, expenseId) {
    const query = `
      SELECT * FROM expenses WHERE id = $1 AND user_id = $2
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }

  // Все траты пользователя без ограничения по датам (экспорт «за всё время»), формат как у getExpensesBetween
  async getAllExpenses(userId) {
    const query = `
      SELECT e.*, c.name AS category_name, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.created_at_utc ASC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
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
      SELECT e.*, c.name as category_name, c.icon as category_icon,
             u.username AS user_username, u.first_name AS user_first_name
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = $1 AND (e.user_id = $2 OR e.family_id IN (
        SELECT family_id FROM family_user WHERE user_id = $2
      ))
    `;
    const result = await this.query(query, [expenseId, userId]);
    return result.rows[0];
  }
}

module.exports = ExpenseRepository; 