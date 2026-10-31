const BaseRepository = require('./BaseRepository');

// «💡 Верни 13%»: рублёвые траты года с категорией и правкой пользователя (tax_refund_marks), правки, кандидаты на
// январское напоминание. Год — локальные даты пользователя [start, end) строками 'YYYY-MM-DD'.
class TaxRefundRepository extends BaseRepository {
  // Траты в рублях за [start, end): { id, amount, description, category_name, local_date, mark }
  async getExpenses(userId, timezone, start, end) {
    const result = await this.query(`
      SELECT e.id, e.amount::float AS amount, e.description, c.name AS category_name,
             to_char(e.created_at_utc AT TIME ZONE $2, 'YYYY-MM-DD') AS local_date, m.kind AS mark
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      LEFT JOIN tax_refund_marks m ON m.user_id = e.user_id AND m.expense_id = e.id
      WHERE e.user_id = $1 AND e.currency = 'RUB'
        AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
        AND (e.created_at_utc AT TIME ZONE $2) < $4::date
      ORDER BY e.created_at_utc DESC, e.id DESC
    `, [userId, timezone, start, end]);
    return result.rows;
  }

  // Одна такая трата (своя, в рублях, в этом году) или null
  async getExpense(userId, expenseId, timezone, start, end) {
    const result = await this.query(`
      SELECT e.id, e.amount::float AS amount, e.description, c.name AS category_name,
             to_char(e.created_at_utc AT TIME ZONE $3, 'YYYY-MM-DD') AS local_date, m.kind AS mark
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      LEFT JOIN tax_refund_marks m ON m.user_id = e.user_id AND m.expense_id = e.id
      WHERE e.user_id = $1 AND e.id = $2 AND e.currency = 'RUB'
        AND (e.created_at_utc AT TIME ZONE $3) >= $4::date
        AND (e.created_at_utc AT TIME ZONE $3) < $5::date
    `, [userId, expenseId, timezone, start, end]);
    return result.rows[0] || null;
  }

  // kind: вид вычета или 'none' — «не для вычета»
  async setMark(userId, expenseId, kind) {
    await this.query(`
      INSERT INTO tax_refund_marks (user_id, expense_id, kind) VALUES ($1, $2, $3)
      ON CONFLICT (user_id, expense_id) DO UPDATE SET kind = EXCLUDED.kind, updated_at = NOW()
    `, [userId, expenseId, kind]);
  }

  async deleteMark(userId, expenseId) {
    await this.query('DELETE FROM tax_refund_marks WHERE user_id = $1 AND expense_id = $2', [userId, expenseId]);
  }

  // Январское напоминание: русский язык и рубли (премиум проверяет сервис)
  async getReminderCandidates() {
    const result = await this.query(
      `SELECT id, language, timezone FROM users WHERE id > 0 AND language = 'ru' AND currency = 'RUB'`,
      []
    );
    return result.rows;
  }
}

module.exports = TaxRefundRepository;
