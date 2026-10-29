const BaseRepository = require('./BaseRepository');

// «🧭 Планирование»: выборки трат/доходов для расчётов (локальные даты — строками 'YYYY-MM-DD'), отметки найденных
// подписок, число платежа по долгу, флаг утренних напоминаний о платежах; предупреждения о списании подписок
// (настройка, отметки «🔕» / «🚫», кандидаты для cron) и пробные периоды.
const LOCAL_DATE = "to_char((created_at_utc AT TIME ZONE $2)::date, 'YYYY-MM-DD')";
const TRIAL_COLUMNS = `id, name, to_char(end_date, 'YYYY-MM-DD') AS end_date, amount::float AS amount, currency, state,
       to_char(created_on, 'YYYY-MM-DD') AS created_on`;

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

  // Обычные траты (без авто-записей регулярных) с from по день до today, по валютам, и первый такой день —
  // темп трат для прогноза «хватит ли до конца периода»
  async getPaceSpend(userId, timezone, from, today) {
    const result = await this.query(`
      SELECT currency, SUM(amount)::float AS total, MIN((created_at_utc AT TIME ZONE $2)::date)::text AS first_day
      FROM expenses
      WHERE user_id = $1
        AND recurring_expense_id IS NULL
        AND (created_at_utc AT TIME ZONE $2) >= $3::date
        AND (created_at_utc AT TIME ZONE $2) < $4::date
      GROUP BY currency
    `, [userId, timezone, from, today]);
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
      'SELECT id, language, timezone, daily_plan_enabled FROM users WHERE id > 0 AND bill_reminders_enabled = TRUE',
      []
    );
    return result.rows;
  }

  // ========================================
  // ПРЕДУПРЕЖДЕНИЯ О СПИСАНИИ И ПРОБНЫЕ ПЕРИОДЫ
  // ========================================

  // { enabled, days } — «🔔 Предупреждать о списании» и за сколько дней
  async getWarnSettings(userId) {
    const result = await this.query('SELECT sub_warn_enabled, sub_warn_days FROM users WHERE id = $1', [userId]);
    const row = result.rows[0];
    return { enabled: row ? row.sub_warn_enabled !== false : true, days: row ? Number(row.sub_warn_days) : null };
  }

  async setWarnEnabled(userId, enabled) {
    await this.query('UPDATE users SET sub_warn_enabled = $2 WHERE id = $1', [userId, !!enabled]);
  }

  // Выбор дней включает предупреждения
  async setWarnDays(userId, days) {
    await this.query('UPDATE users SET sub_warn_days = $2, sub_warn_enabled = TRUE WHERE id = $1', [userId, days]);
  }

  // Map merchant_key → { state: 'muted' | 'cancelling', since: 'YYYY-MM-DD' }
  async getAlerts(userId) {
    const result = await this.query(
      "SELECT merchant_key, state, to_char(since, 'YYYY-MM-DD') AS since FROM subscription_alerts WHERE user_id = $1",
      [userId]
    );
    return new Map(result.rows.map(row => [row.merchant_key, { state: row.state, since: row.since }]));
  }

  async setAlert(userId, merchantKey, state, since) {
    await this.query(`
      INSERT INTO subscription_alerts (user_id, merchant_key, state, since) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, merchant_key) DO UPDATE SET state = EXCLUDED.state, since = EXCLUDED.since, created_at = NOW()
    `, [userId, merchantKey, state, since]);
  }

  async clearAlert(userId, merchantKey) {
    await this.query('DELETE FROM subscription_alerts WHERE user_id = $1 AND merchant_key = $2', [userId, merchantKey]);
  }

  // Пробные периоды с датой окончания не раньше since (черновики без даты — нет)
  async getTrials(userId, since) {
    const result = await this.query(`
      SELECT ${TRIAL_COLUMNS} FROM subscription_trials
      WHERE user_id = $1 AND end_date IS NOT NULL AND end_date >= $2::date
      ORDER BY end_date, id
    `, [userId, since]);
    return result.rows;
  }

  async getTrial(userId, trialId) {
    const result = await this.query(`SELECT ${TRIAL_COLUMNS} FROM subscription_trials WHERE id = $1 AND user_id = $2`, [trialId, userId]);
    return result.rows[0] || null;
  }

  // Черновик (без даты): прежние черновики пользователя удаляются — незаконченный ввод не копится
  async createTrialDraft(userId, { name, amount, currency, createdOn }) {
    await this.query('DELETE FROM subscription_trials WHERE user_id = $1 AND end_date IS NULL', [userId]);
    const result = await this.query(`
      INSERT INTO subscription_trials (user_id, name, amount, currency, created_on) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [userId, name, amount, currency, createdOn]);
    return result.rows[0].id;
  }

  // Дата окончания черновика — только один раз (повторное нажатие или старая кнопка — null)
  async setTrialEnd(userId, trialId, endDate) {
    const result = await this.query(`
      UPDATE subscription_trials SET end_date = $3 WHERE id = $1 AND user_id = $2 AND end_date IS NULL
      RETURNING ${TRIAL_COLUMNS}
    `, [trialId, userId, endDate]);
    return result.rows[0] || null;
  }

  async setTrialState(userId, trialId, state) {
    const result = await this.query(
      'UPDATE subscription_trials SET state = $3 WHERE id = $1 AND user_id = $2 AND end_date IS NOT NULL',
      [trialId, userId, state]
    );
    return result.rowCount > 0;
  }

  async deleteTrial(userId, trialId) {
    const result = await this.query('DELETE FROM subscription_trials WHERE id = $1 AND user_id = $2', [trialId, userId]);
    return result.rowCount > 0;
  }

  // Действующие пробные периоды (окончание сегодня или позже) — лимит без премиума
  async countActiveTrials(userId, today) {
    const result = await this.query(
      'SELECT COUNT(*)::int AS count FROM subscription_trials WHERE user_id = $1 AND end_date >= $2::date',
      [userId, today]
    );
    return result.rows[0].count;
  }

  // Кандидаты на предупреждения: включили их и есть траты за 770 дней (окно поиска подписок) или регулярные;
  // либо есть недавний пробный период или отметка «отменю» (о них пишем при любой настройке)
  async getWarnCandidates() {
    const result = await this.query(`
      SELECT u.id, u.language, u.timezone, u.sub_warn_enabled, u.sub_warn_days
      FROM users u
      WHERE u.id > 0 AND (
        (u.sub_warn_enabled AND (
          EXISTS (SELECT 1 FROM recurring_expenses r WHERE r.user_id = u.id)
          OR EXISTS (SELECT 1 FROM expenses e WHERE e.user_id = u.id AND e.created_at_utc > NOW() - INTERVAL '770 days')
        ))
        OR EXISTS (SELECT 1 FROM subscription_trials t WHERE t.user_id = u.id AND t.end_date >= CURRENT_DATE - 50)
        OR EXISTS (SELECT 1 FROM subscription_alerts a WHERE a.user_id = u.id AND a.state = 'cancelling')
      )
    `, []);
    return result.rows;
  }
}

module.exports = PlanningRepository;
