const BaseRepository = require('./BaseRepository');

// Регулярная трата "к списанию": в локальном дне пользователя наступило число списания
// (в коротких месяцах — последний день), а за текущий локальный месяц трата ещё не записана.
// Пояс берётся из pg_timezone_names: строка с неизвестным поясом пропускается, а не роняет запрос для всех.
const DUE_SELECT = `
  WITH t AS (
    SELECT r.*,
           tz.name AS timezone,
           u.language,
           (NOW() AT TIME ZONE tz.name)::date AS local_today
    FROM recurring_expenses r
    JOIN users u ON u.id = r.user_id
    JOIN pg_timezone_names tz ON tz.name = COALESCE(u.timezone, 'UTC')
  )
  SELECT t.id, t.user_id, t.amount, t.currency, t.category_id, t.description, t.day_of_month,
         t.timezone, t.language,
         to_char(date_trunc('month', t.local_today), 'YYYY-MM-DD') AS charge_month,
         c.name AS category_name, c.icon AS category_icon
  FROM t
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE EXTRACT(DAY FROM t.local_today)::int >= LEAST(
          t.day_of_month,
          EXTRACT(DAY FROM (date_trunc('month', t.local_today) + INTERVAL '1 month - 1 day'))::int)
    AND (t.last_charged_month IS NULL OR t.last_charged_month < date_trunc('month', t.local_today)::date)
`;

class RecurringExpenseRepository extends BaseRepository {
  async create(userId, { amount, currency, categoryId, description, dayOfMonth, lastChargedMonth }) {
    const query = `
      INSERT INTO recurring_expenses (user_id, amount, currency, category_id, description, day_of_month, last_charged_month)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date)
      RETURNING id
    `;
    const result = await this.query(query, [userId, amount, currency, categoryId, description, dayOfMonth, lastChargedMonth]);
    return result.rows[0];
  }

  async getByUser(userId) {
    const query = `
      SELECT r.id, r.amount, r.currency, r.description, r.day_of_month,
             to_char(r.last_charged_month, 'YYYY-MM-DD') AS last_charged_month,
             c.name AS category_name, c.icon AS category_icon
      FROM recurring_expenses r
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.user_id = $1
      ORDER BY r.day_of_month ASC, r.id ASC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  }


  async getById(userId, recurringId) {
    const query = `
      SELECT r.id, r.amount, r.currency, r.description, r.day_of_month,
             to_char(r.last_charged_month, 'YYYY-MM-DD') AS last_charged_month,
             c.name AS category_name, c.icon AS category_icon
      FROM recurring_expenses r
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const result = await this.query(query, [recurringId, userId]);
    return result.rows[0];
  }
  async countByUser(userId) {
    const result = await this.query('SELECT COUNT(*)::int AS count FROM recurring_expenses WHERE user_id = $1', [userId]);
    return result.rows[0].count;
  }

  async deleteById(userId, recurringId) {
    const query = `
      DELETE FROM recurring_expenses
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.query(query, [recurringId, userId]);
    return result.rows[0];
  }

  async getDue() {
    const result = await this.query(DUE_SELECT, []);
    return result.rows;
  }

  async getDueForUser(userId) {
    const result = await this.query(`${DUE_SELECT} AND t.user_id = $1`, [userId]);
    return result.rows;
  }

  // Атомарно помечает месяц и создаёт трату. Возвращает созданную трату или null, если месяц уже обработан.
  // Если категория регулярной траты удалена — используется системная "Другое".
  async chargeForMonth(recurring, chargeMonth) {
    return this.transaction(async (client) => {
      const marked = await client.query(
        `UPDATE recurring_expenses
         SET last_charged_month = $2::date
         WHERE id = $1 AND (last_charged_month IS NULL OR last_charged_month < $2::date)
         RETURNING id`,
        [recurring.id, chargeMonth]
      );
      if (marked.rowCount === 0) return null;

      const inserted = await client.query(
        `INSERT INTO expenses (user_id, amount, description, category_id, currency, recurring_expense_id, created_at_utc)
         VALUES ($1, $2, $3,
                 COALESCE($4::int, (SELECT id FROM categories WHERE user_id = 0 AND name = 'Другое' LIMIT 1)),
                 $5, $6, NOW())
         RETURNING *`,
        [recurring.user_id, recurring.amount, recurring.description, recurring.category_id, recurring.currency, recurring.id]
      );
      return inserted.rows[0];
    });
  }
}

module.exports = RecurringExpenseRepository;
