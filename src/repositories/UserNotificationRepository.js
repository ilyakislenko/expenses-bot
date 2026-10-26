const BaseRepository = require('./BaseRepository');

class UserNotificationRepository extends BaseRepository {
  // Кандидаты для уведомлений о премиуме: срок истекает или истёк недавно.
  // Окно берётся с запасом, точная проверка — в сервисе (premium_expires_at хранится без часового пояса).
  async getPremiumLifecycleCandidates() {
    const query = `
      SELECT u.id, u.language, u.timezone, u.premium_expires_at,
             NOT EXISTS (
               SELECT 1 FROM premium_transactions t
               WHERE t.user_id = u.id AND t.status = 'completed' AND t.stars_amount > 0
             ) AS is_trial_only,
             EXISTS (
               SELECT 1 FROM premium_transactions t
               WHERE t.user_id = u.id AND t.status = 'completed' AND t.is_recurring AND t.subscription_expires_at > NOW()
             ) AS has_active_subscription
      FROM users u
      WHERE u.id > 0
        AND u.premium_expires_at IS NOT NULL
        AND u.premium_expires_at BETWEEN NOW() - INTERVAL '9 days' AND NOW() + INTERVAL '3 days'
    `;
    const result = await this.query(query, []);
    return result.rows;
  }

  // Кандидаты для итогов периода: вносили траты вручную за последние 45 дней
  async getReportCandidates() {
    const query = `
      SELECT u.id, u.language, u.timezone
      FROM users u
      WHERE u.id > 0 AND EXISTS (
        SELECT 1 FROM expenses e
        WHERE e.user_id = u.id AND e.recurring_expense_id IS NULL AND e.created_at_utc > NOW() - INTERVAL '45 days'
      )
    `;
    const result = await this.query(query, []);
    return result.rows;
  }

  // Кандидаты для ежедневной сводки: включили её в настройках напоминаний
  async getDailySummaryCandidates() {
    const result = await this.query(
      'SELECT id, language, timezone, daily_summary_hour FROM users WHERE id > 0 AND daily_summary_enabled = TRUE',
      []
    );
    return result.rows;
  }

  // true — уведомление ещё не отправлялось и теперь отмечено; false — уже было
  async markSent(userId, kind, refKey) {
    const result = await this.query(
      `INSERT INTO user_notifications (user_id, kind, ref_key) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [userId, kind, refKey]
    );
    return result.rowCount > 0;
  }
}

module.exports = UserNotificationRepository;
