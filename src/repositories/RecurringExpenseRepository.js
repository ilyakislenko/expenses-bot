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
  SELECT t.id, t.user_id, t.amount, t.currency, t.category_id, t.description, t.day_of_month, t.is_family,
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
  async create(userId, { amount, currency, categoryId, description, dayOfMonth, lastChargedMonth, isFamily = false }) {
    const query = `
      INSERT INTO recurring_expenses (user_id, amount, currency, category_id, description, day_of_month, last_charged_month, is_family)
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8)
      RETURNING id
    `;
    const result = await this.query(query, [userId, amount, currency, categoryId, description, dayOfMonth, lastChargedMonth, isFamily]);
    return result.rows[0];
  }

  async getByUser(userId) {
    const query = `
      SELECT r.id, r.amount, r.currency, r.description, r.day_of_month, r.is_family,
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

  // Семейные регулярные траты всех участников семьи (is_family): ступеньки семейного прогноза и «Впереди регулярные»
  // семейного обзора. timezone — пояс автора (его локальный день решает дату списания)
  async getFamilyRecurring(familyId) {
    const query = `
      SELECT r.id, r.user_id, r.amount, r.currency, r.description, r.day_of_month,
             to_char(r.last_charged_month, 'YYYY-MM-DD') AS last_charged_month,
             COALESCE(u.timezone, 'UTC') AS timezone, u.username, u.first_name,
             c.name AS category_name, c.icon AS category_icon
      FROM recurring_expenses r
      JOIN family_user fu ON fu.user_id = r.user_id AND fu.family_id = $1
      JOIN users u ON u.id = r.user_id
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.is_family
      ORDER BY r.day_of_month ASC, r.id ASC
    `;
    const result = await this.query(query, [familyId]);
    return result.rows;
  }

  async getById(userId, recurringId) {
    const query = `
      SELECT r.id, r.amount, r.currency, r.description, r.day_of_month, r.category_id, r.is_family,
             to_char(r.last_charged_month, 'YYYY-MM-DD') AS last_charged_month,
             c.name AS category_name, c.icon AS category_icon
      FROM recurring_expenses r
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.id = $1 AND r.user_id = $2
    `;
    const result = await this.query(query, [recurringId, userId]);
    return result.rows[0];
  }

  // «👨‍👩‍👧‍👦 Семейный / 👤 Личный»: дальше списания пишутся в семью (или лично), и уже записанные за текущий локальный
  // месяц переносятся туда же — семейный обзор сразу видит аренду этого месяца. false — регулярной нет (чужая/удалена)
  async setFamily(userId, recurringId, isFamily, timezone, monthStart) {
    return this.transaction(async (client) => {
      const updated = await client.query(
        'UPDATE recurring_expenses SET is_family = $3 WHERE id = $1 AND user_id = $2 RETURNING id',
        [recurringId, userId, isFamily]
      );
      if (!updated.rowCount) return false;
      await client.query(
        `UPDATE expenses
         SET family_id = CASE WHEN $3::boolean THEN (SELECT family_id FROM family_user WHERE user_id = $2 LIMIT 1) END
         WHERE recurring_expense_id = $1 AND user_id = $2 AND (created_at_utc AT TIME ZONE $4) >= $5::date`,
        [recurringId, userId, isFamily, timezone, monthStart]
      );
      return true;
    });
  }

  // Отмена записи за месяц (оплачено заранее по ошибке): удаляет трату этой регулярной и возвращает отметку на прошлый
  // месяц, если отмечен всё ещё этот. false — трата уже удалена или чужая
  async undoCharge(userId, recurringId, month, previousMonth, expenseId) {
    return this.transaction(async (client) => {
      const deleted = await client.query(
        'DELETE FROM expenses WHERE id = $1 AND user_id = $2 AND recurring_expense_id = $3 RETURNING id',
        [expenseId, userId, recurringId]
      );
      if (!deleted.rowCount) return false;
      await client.query(
        'UPDATE recurring_expenses SET last_charged_month = $3::date WHERE id = $1 AND user_id = $2 AND last_charged_month = $4::date',
        [recurringId, userId, previousMonth, month]
      );
      return true;
    });
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
  // Если категория регулярной траты удалена — используется системная "Другое". Семейная регулярная (is_family)
  // пишется в семью автора; вне семьи — лично
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
        `INSERT INTO expenses (user_id, amount, description, category_id, currency, recurring_expense_id, family_id, created_at_utc)
         VALUES ($1, $2, $3,
                 COALESCE($4::int, (SELECT id FROM categories WHERE user_id = 0 AND name = 'Другое' LIMIT 1)),
                 $5, $6,
                 CASE WHEN $7::boolean THEN (SELECT family_id FROM family_user WHERE user_id = $1 LIMIT 1) END,
                 NOW())
         RETURNING *`,
        [recurring.user_id, recurring.amount, recurring.description, recurring.category_id, recurring.currency, recurring.id, !!recurring.is_family]
      );
      return inserted.rows[0];
    });
  }
}

module.exports = RecurringExpenseRepository;
