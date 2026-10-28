const BaseRepository = require('./BaseRepository');

class FunnelRepository extends BaseRepository {
  // Запоминает первое наступление шага воронки (повторные вызовы ничего не меняют)
  async track(userId, event) {
    await this.query(
      'INSERT INTO user_funnel_events (user_id, event) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, event]
    );
  }

  async hasEvent(userId, event) {
    const result = await this.query('SELECT 1 FROM user_funnel_events WHERE user_id = $1 AND event = $2', [userId, event]);
    return result.rows.length > 0;
  }

  async setSourceIfEmpty(userId, source) {
    await this.query('UPDATE users SET source = $2 WHERE id = $1 AND source IS NULL', [userId, source]);
  }

  // Когорта — пользователи, зарегистрированные за последние `days` дней (null — за всё время), по источникам.
  // returned_week2 — записали трату вручную спустя 7+ дней после регистрации.
  async getReport(days) {
    const query = `
      WITH cohort AS (
        SELECT u.id, COALESCE(u.source, '') AS source, r.created_at AS registered_at
        FROM users u
        JOIN user_funnel_events r ON r.user_id = u.id AND r.event = 'registered'
        WHERE $1::int IS NULL OR r.created_at >= NOW() - make_interval(days => $1::int)
      ),
      steps AS (
        SELECT c.*,
          -- Дошёл до главной клавиатуры: опрос пройден или пропущен («Пропустить всё»)
          EXISTS (SELECT 1 FROM user_funnel_events e WHERE e.user_id = c.id AND e.event IN ('onboarding_completed', 'onboarding_skipped')) AS onboarded,
          EXISTS (SELECT 1 FROM user_funnel_events e WHERE e.user_id = c.id AND e.event = 'first_expense') AS first_expense,
          EXISTS (SELECT 1 FROM expenses x WHERE x.user_id = c.id AND x.recurring_expense_id IS NULL
                    AND x.created_at_utc >= c.registered_at + INTERVAL '7 days') AS returned_week2,
          EXISTS (SELECT 1 FROM user_funnel_events e WHERE e.user_id = c.id AND e.event = 'paywall_viewed') AS paywall_viewed,
          EXISTS (SELECT 1 FROM user_funnel_events e WHERE e.user_id = c.id AND e.event = 'tariffs_viewed') AS tariffs_viewed,
          EXISTS (SELECT 1 FROM user_funnel_events e WHERE e.user_id = c.id AND e.event = 'paid') AS paid,
          (SELECT COALESCE(SUM(t.stars_amount), 0) FROM premium_transactions t
             WHERE t.user_id = c.id AND t.status = 'completed' AND t.stars_amount > 0) AS stars
        FROM cohort c
      )
      SELECT source,
        COUNT(*)::int AS registered,
        COUNT(*) FILTER (WHERE onboarded)::int AS onboarded,
        COUNT(*) FILTER (WHERE first_expense)::int AS first_expense,
        COUNT(*) FILTER (WHERE returned_week2)::int AS returned_week2,
        COUNT(*) FILTER (WHERE paywall_viewed)::int AS paywall_viewed,
        COUNT(*) FILTER (WHERE tariffs_viewed)::int AS tariffs_viewed,
        COUNT(*) FILTER (WHERE paid)::int AS paid,
        SUM(stars)::int AS stars
      FROM steps
      GROUP BY source
      ORDER BY registered DESC
    `;
    const result = await this.query(query, [days]);
    return result.rows;
  }
}

module.exports = FunnelRepository;
