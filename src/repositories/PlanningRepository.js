const BaseRepository = require('./BaseRepository');

// «🧭 Планирование»: выборки трат/доходов для расчётов (локальные даты — строками 'YYYY-MM-DD'), отметки найденных
// подписок, число платежа по долгу и флаг утренних напоминаний о платежах.
const LOCAL_DATE = "to_char((created_at_utc AT TIME ZONE $2)::date, 'YYYY-MM-DD')";

class PlanningRepository extends BaseRepository {
  // Траты с описанием с локальной даты since — для поиска подписок (с названием категории: еда/кафе/транспорт —
  // привычки, а не подписки)
  async getExpenseRowsSince(userId, timezone, since) {
    const result = await this.query(`
      SELECT to_char((e.created_at_utc AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS date, e.description,
             e.amount::float AS amount, e.currency, e.category_id, c.name AS category_name, e.recurring_expense_id
      FROM expenses e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.user_id = $1 AND e.description IS NOT NULL AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
      ORDER BY e.created_at_utc
    `, [userId, timezone, since]);
    return result.rows;
  }

  // Позиции чеков в валюте currency с локальной даты since — для личной инфляции
  async getReceiptItemsSince(userId, timezone, since, currency) {
    const result = await this.query(`
      SELECT ${LOCAL_DATE} AS date, description AS name, amount::float AS amount, quantity::float AS quantity
      FROM expenses
      WHERE user_id = $1 AND receipt_id IS NOT NULL AND description IS NOT NULL AND currency = $4
        AND (created_at_utc AT TIME ZONE $2) >= $3::date
      ORDER BY created_at_utc
    `, [userId, timezone, since, currency]);
    return result.rows;
  }

  // Доходы с локальной даты since — среднее за прошлые периоды и даты зарплаты
  async getIncomeRowsSince(userId, timezone, since) {
    const result = await this.query(`
      SELECT ${LOCAL_DATE} AS date, description, amount::float AS amount, currency
      FROM incomes
      WHERE user_id = $1 AND (created_at_utc AT TIME ZONE $2) >= $3::date
      ORDER BY created_at_utc
    `, [userId, timezone, since]);
    return result.rows;
  }

  // Траты текущего периода по валютам: до сегодня (before), сегодня авто-записи регулярных (billsToday)
  // и сегодня остальные (today)
  async getSpendSplit(userId, timezone, start, today) {
    const result = await this.query(`
      SELECT currency,
             COALESCE(SUM(amount) FILTER (WHERE (created_at_utc AT TIME ZONE $2)::date < $4::date), 0)::float AS before,
             COALESCE(SUM(amount) FILTER (WHERE (created_at_utc AT TIME ZONE $2)::date = $4::date AND recurring_expense_id IS NOT NULL), 0)::float AS bills_today,
             COALESCE(SUM(amount) FILTER (WHERE (created_at_utc AT TIME ZONE $2)::date = $4::date AND recurring_expense_id IS NULL), 0)::float AS today
      FROM expenses
      WHERE user_id = $1
        AND (created_at_utc AT TIME ZONE $2) >= $3::date
        AND (created_at_utc AT TIME ZONE $2) < ($4::date + 1)
      GROUP BY currency
    `, [userId, timezone, start, today]);
    return result.rows;
  }

  async getDebts(userId) {
    const result = await this.query(`
      SELECT id, name, balance::float AS balance, currency, monthly_payment::float AS monthly_payment, due_day
      FROM savings_pots WHERE user_id = $1 AND kind = 'debt'
      ORDER BY created_at, id
    `, [userId]);
    return result.rows;
  }

  async getDebt(userId, potId) {
    const result = await this.query(
      "SELECT id, name, due_day FROM savings_pots WHERE id = $1 AND user_id = $2 AND kind = 'debt'",
      [potId, userId]
    );
    return result.rows[0] || null;
  }

  // day 1–31 или null — убрать. Долг или null
  async setDebtDueDay(userId, potId, day) {
    const result = await this.query(
      "UPDATE savings_pots SET due_day = $3 WHERE id = $1 AND user_id = $2 AND kind = 'debt' RETURNING id, name, due_day",
      [potId, userId, day]
    );
    return result.rows[0] || null;
  }

  // Плановый взнос в накопления из настроек прогноза (null — не задан)
  async getMonthlyContribution(userId) {
    const result = await this.query('SELECT monthly_contribution::float AS value FROM savings_settings WHERE user_id = $1', [userId]);
    return result.rows[0] && result.rows[0].value !== null ? result.rows[0].value : null;
  }

  // Map merchant_key → 'confirmed' | 'dismissed'
  async getMarks(userId) {
    const result = await this.query('SELECT merchant_key, status FROM subscription_marks WHERE user_id = $1', [userId]);
    return new Map(result.rows.map(row => [row.merchant_key, row.status]));
  }

  async setMark(userId, merchantKey, status) {
    await this.query(`
      INSERT INTO subscription_marks (user_id, merchant_key, status) VALUES ($1, $2, $3)
      ON CONFLICT (user_id, merchant_key) DO UPDATE SET status = EXCLUDED.status, created_at = NOW()
    `, [userId, merchantKey, status]);
  }

  // Вернуть скрытые: число снятых отметок
  async clearDismissed(userId) {
    const result = await this.query("DELETE FROM subscription_marks WHERE user_id = $1 AND status = 'dismissed'", [userId]);
    return result.rowCount;
  }

  async isBillRemindersEnabled(userId) {
    const result = await this.query('SELECT bill_reminders_enabled FROM users WHERE id = $1', [userId]);
    return !!(result.rows[0] && result.rows[0].bill_reminders_enabled);
  }

  async setBillRemindersEnabled(userId, enabled) {
    await this.query('UPDATE users SET bill_reminders_enabled = $2 WHERE id = $1', [userId, !!enabled]);
  }

  async getBillReminderCandidates() {
    const result = await this.query(
      'SELECT id, language, timezone FROM users WHERE id > 0 AND bill_reminders_enabled = TRUE',
      []
    );
    return result.rows;
  }
}

module.exports = PlanningRepository;
