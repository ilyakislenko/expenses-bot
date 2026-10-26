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
