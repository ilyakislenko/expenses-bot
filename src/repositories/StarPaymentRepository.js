const BaseRepository = require('./BaseRepository');

// Все платежи звёздами в одном списке (для админки): покупки премиума и семейного тарифа (premium_transactions),
// пропуска для групп (group_passes) и пожертвования (donations) — только те, по которым пришли деньги
// (есть telegram_payment_id). status: 'paid' | 'refunded'.
const PAYMENTS = `
  SELECT 'premium' AS kind, t.id, t.user_id, t.stars_amount AS stars,
         CASE WHEN t.status = 'refunded' THEN 'refunded' ELSE 'paid' END AS status,
         t.telegram_payment_id AS charge_id, t.created_at, t.tariff_duration AS days,
         COALESCE(t.is_recurring, FALSE) AS recurring,
         COALESCE(t.invoice_payload LIKE '%"type":"family_premium"%', FALSE) AS family
  FROM premium_transactions t WHERE t.telegram_payment_id IS NOT NULL
  UNION ALL
  SELECT 'group_pass', p.id, p.user_id, p.stars, p.status, p.telegram_payment_id, p.created_at, p.days, FALSE, FALSE
  FROM group_passes p
  UNION ALL
  SELECT 'donation', d.id, d.user_id, d.stars,
         CASE WHEN d.status = 'refunded' THEN 'refunded' ELSE 'paid' END,
         d.telegram_payment_id, d.created_at, NULL, FALSE, FALSE
  FROM donations d WHERE d.telegram_payment_id IS NOT NULL
`;

// Кусок кода платежа для ILIKE: % и _ — буквально
const likePattern = (fragment) => `%${String(fragment).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

class StarPaymentRepository extends BaseRepository {
  // Новые сверху; userId — только этого пользователя, fragment — код платежа содержит кусок (без учёта регистра).
  // total — сколько всего под условия (для листания)
  async list({ userId = null, fragment = null, limit = 10, offset = 0 } = {}) {
    const result = await this.query(`
      SELECT p.*, u.username, u.first_name, COUNT(*) OVER () AS total
      FROM (${PAYMENTS}) p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE ($1::bigint IS NULL OR p.user_id = $1) AND ($2::text IS NULL OR p.charge_id ILIKE $2)
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $3 OFFSET $4`,
    [userId, fragment ? likePattern(fragment) : null, limit, offset]);
    return { rows: result.rows, total: result.rows.length ? Number(result.rows[0].total) : 0 };
  }

  async get(kind, id) {
    const result = await this.query(`
      SELECT p.*, u.username, u.first_name
      FROM (${PAYMENTS}) p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.kind = $1 AND p.id = $2`, [kind, id]);
    return result.rows[0] || null;
  }
}

module.exports = StarPaymentRepository;
