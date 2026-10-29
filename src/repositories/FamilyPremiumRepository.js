const BaseRepository = require('./BaseRepository');

// Семейный тариф хранится у плательщика: users.family_premium_expires_at (TIMESTAMP без пояса во времени Node, как
// premium_expires_at — сравниваем с переданным из Node временем, а не с NOW()). Премиум получают участники семьи,
// которой владеет плательщик: владелец всегда, остальные — первые (maxMembers − 1) по дате вступления.

// Участник fu покрыт тарифом владельца f (maxMembers — параметр $N)
const COVERED = (fu, f, maxParam) => `(${fu}.user_id = ${f}.owner_id OR (
  SELECT COUNT(*) FROM family_user x
  WHERE x.family_id = ${fu}.family_id AND x.user_id <> ${f}.owner_id
    AND (x.joined_at_utc, x.id) < (${fu}.joined_at_utc, ${fu}.id)
) < ${maxParam} - 1)`;

// Платёж семейного тарифа (invoice_payload — JSON.stringify без пробелов)
const FAMILY_PAYMENT = `invoice_payload LIKE '%"type":"family_premium"%'`;

class FamilyPremiumRepository extends BaseRepository {
  // Тариф, который покрывает пользователя (в том числе плательщика в своей семье), или null. Срок не проверяется
  async getCoveringPlan(userId, maxMembers) {
    const result = await this.query(
      `SELECT f.id AS family_id, f.name AS family_name, f.owner_id AS payer_id,
              o.first_name AS payer_first_name, o.username AS payer_username,
              o.family_premium_expires_at AS expires_at
       FROM family_user fu
       JOIN families f ON f.id = fu.family_id
       JOIN users o ON o.id = f.owner_id
       WHERE fu.user_id = $1 AND o.family_premium_expires_at IS NOT NULL AND ${COVERED('fu', 'f', '$2')}`,
      [userId, maxMembers]
    );
    const row = result.rows[0];
    return row ? { ...row, payer_id: Number(row.payer_id) } : null;
  }

  // Оплаченный пользователем семейный срок (null — не покупал)
  async getPlanExpiry(payerId) {
    const result = await this.query('SELECT family_premium_expires_at FROM users WHERE id = $1', [payerId]);
    return result.rows[0] ? result.rows[0].family_premium_expires_at : null;
  }

  // Продлить: к действующему сроку прибавляются дни, истёкший начинается от now. { previous, expires }
  async extendPlan(payerId, days, now) {
    return this.transaction(async (client) => {
      const current = await client.query('SELECT family_premium_expires_at FROM users WHERE id = $1 FOR UPDATE', [payerId]);
      const previous = current.rows[0] ? current.rows[0].family_premium_expires_at : null;
      const base = previous && previous > now ? previous : now;
      const expires = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      await client.query('UPDATE users SET family_premium_expires_at = $2 WHERE id = $1', [payerId, expires]);
      return { previous, expires };
    });
  }

  // Возврат: срок покупки вычитается из действующего, но не раньше now. { previous, expires } (null — нечего снимать)
  async shortenPlan(payerId, days, now) {
    return this.transaction(async (client) => {
      const current = await client.query('SELECT family_premium_expires_at FROM users WHERE id = $1 FOR UPDATE', [payerId]);
      const previous = current.rows[0] ? current.rows[0].family_premium_expires_at : null;
      if (!previous || previous <= now) return null;
      const shortened = new Date(previous.getTime() - days * 24 * 60 * 60 * 1000);
      const expires = shortened > now ? shortened : now;
      await client.query('UPDATE users SET family_premium_expires_at = $2 WHERE id = $1', [payerId, expires]);
      return { previous, expires };
    });
  }

  // Участники семьи плательщика, покрытые тарифом, кроме него самого (для уведомлений)
  async getCoveredMembers(payerId, maxMembers) {
    const result = await this.query(
      `SELECT u.id, u.language, u.timezone, u.premium_expires_at
       FROM families f
       JOIN family_user fu ON fu.family_id = f.id
       JOIN users u ON u.id = fu.user_id
       WHERE f.owner_id = $1 AND fu.user_id <> f.owner_id AND ${COVERED('fu', 'f', '$2')}
       ORDER BY fu.joined_at_utc, fu.id`,
      [payerId, maxMembers]
    );
    return result.rows.map(row => ({ ...row, id: Number(row.id) }));
  }

  // Места в семье: участники (с владельцем) и ожидающие приглашения
  async countSeats(familyId) {
    const result = await this.query(
      `SELECT (SELECT COUNT(*) FROM family_user WHERE family_id = $1)::int AS members,
              (SELECT COUNT(*) FROM family_invitations
               WHERE family_id = $1 AND status = 'pending' AND expires_at_utc > NOW())::int AS pending`,
      [familyId]
    );
    return result.rows[0];
  }

  // Плательщики, у которых семейный срок в окне [from, to): для уведомлений о скором и наступившем окончании
  async getPlansEndingBetween(from, to) {
    const result = await this.query(
      `SELECT u.id, u.language, u.timezone, u.premium_expires_at, u.family_premium_expires_at,
              EXISTS (
                SELECT 1 FROM premium_transactions t
                WHERE t.user_id = u.id AND t.status = 'completed' AND t.is_recurring AND t.subscription_expires_at > NOW()
                  AND t.${FAMILY_PAYMENT}
              ) AS has_active_subscription
       FROM users u
       WHERE u.family_premium_expires_at >= $1::timestamp AND u.family_premium_expires_at < $2::timestamp`,
      [from, to]
    );
    return result.rows.map(row => ({ ...row, id: Number(row.id) }));
  }

  // Админка: покупки семейного тарифа отдельно от личных, действующие семейные тарифы и сколько людей покрыто
  async getStats(now, maxMembers) {
    const result = await this.query(
      `SELECT
         (SELECT COUNT(*) FROM premium_transactions WHERE status = 'completed' AND stars_amount > 0 AND ${FAMILY_PAYMENT})::int AS purchases,
         (SELECT COALESCE(SUM(stars_amount), 0) FROM premium_transactions WHERE status = 'completed' AND stars_amount > 0 AND ${FAMILY_PAYMENT})::int AS stars,
         (SELECT COUNT(*) FROM premium_transactions WHERE status = 'refunded' AND ${FAMILY_PAYMENT})::int AS refunded,
         (SELECT COUNT(*) FROM users WHERE family_premium_expires_at > $1::timestamp)::int AS active_plans,
         (SELECT COUNT(*) FROM family_user fu JOIN families f ON f.id = fu.family_id JOIN users o ON o.id = f.owner_id
          WHERE o.family_premium_expires_at > $1::timestamp AND fu.user_id <> f.owner_id AND ${COVERED('fu', 'f', '$2')})::int AS covered_members`,
      [now, maxMembers]
    );
    return result.rows[0];
  }
}

FamilyPremiumRepository.FAMILY_PAYMENT = FAMILY_PAYMENT;

module.exports = FamilyPremiumRepository;
