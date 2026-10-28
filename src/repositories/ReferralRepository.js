const BaseRepository = require('./BaseRepository');

class ReferralRepository extends BaseRepository {
  async getCode(userId) {
    const result = await this.query('SELECT code FROM referral_codes WHERE user_id = $1', [userId]);
    return result.rows[0]?.code || null;
  }

  // null — код не записан: у пользователя уже есть код (параллельный вызов) или такой код занят
  async insertCode(userId, code) {
    const result = await this.query(
      'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING code',
      [userId, code]
    );
    return result.rows[0]?.code || null;
  }

  async findUserIdByCode(code) {
    const result = await this.query('SELECT user_id FROM referral_codes WHERE code = $1', [code]);
    return result.rows[0] ? Number(result.rows[0].user_id) : null;
  }

  // true — приглашение записано; false — у приглашённого уже есть пригласивший
  async createReferral(inviteeId, inviterId) {
    const result = await this.query(
      'INSERT INTO referrals (invitee_id, inviter_id) VALUES ($1, $2) ON CONFLICT (invitee_id) DO NOTHING RETURNING invitee_id',
      [inviteeId, inviterId]
    );
    return result.rowCount > 0;
  }

  // Пригласивший, если награда за этого приглашённого ещё не выдана
  async getPendingInviter(inviteeId) {
    const result = await this.query('SELECT inviter_id FROM referrals WHERE invitee_id = $1 AND rewarded_at IS NULL', [inviteeId]);
    return result.rows[0] ? Number(result.rows[0].inviter_id) : null;
  }

  // Траты, которые засчитываются для награды: ручные и из чека (не регулярные и не из импорта выписки), только ещё
  // существующие (удалённые не считаются) и записанные после регистрации (перенос даты в прошлое не добавляет дней).
  // → { count, days } — сколько трат и в скольких разных днях (по поясу пользователя)
  async countQualifyingExpenses(userId) {
    const result = await this.query(
      `SELECT COUNT(*)::int AS count,
              COUNT(DISTINCT (e.created_at_utc AT TIME ZONE COALESCE(NULLIF(u.timezone, ''), 'UTC'))::date)::int AS days
       FROM expenses e JOIN users u ON u.id = e.user_id
       WHERE e.user_id = $1 AND e.recurring_expense_id IS NULL AND e.import_hash IS NULL
         AND (u.created_at IS NULL OR e.created_at_utc >= u.created_at)`,
      [userId]
    );
    return result.rows[0];
  }

  // Награда за приглашённого — ровно один раз. Строка пригласившего в referral_codes блокируется, чтобы два
  // одновременно активировавшихся друга не превысили его лимит. decideInviterDays({ rewarded, days }) — сколько
  // дней дать пригласившему при его текущих наградах. null — награда уже выдана (или приглашения нет).
  async claimReward(inviteeId, inviteeDays, decideInviterDays) {
    return this.transaction(async (client) => {
      const pending = await client.query(
        'SELECT inviter_id FROM referrals WHERE invitee_id = $1 AND rewarded_at IS NULL FOR UPDATE',
        [inviteeId]
      );
      if (!pending.rows[0]) return null;
      const inviterId = Number(pending.rows[0].inviter_id);
      await client.query('SELECT 1 FROM referral_codes WHERE user_id = $1 FOR UPDATE', [inviterId]);
      const stats = await client.query(
        `SELECT COUNT(*) FILTER (WHERE inviter_days > 0)::int AS rewarded, COALESCE(SUM(inviter_days), 0)::int AS days
         FROM referrals WHERE inviter_id = $1`,
        [inviterId]
      );
      const inviterDays = decideInviterDays(stats.rows[0]);
      await client.query(
        'UPDATE referrals SET rewarded_at = NOW(), invitee_days = $2, inviter_days = $3 WHERE invitee_id = $1',
        [inviteeId, inviteeDays, inviterDays]
      );
      return { inviterId, inviteeDays, inviterDays };
    });
  }

  // Для экрана «Пригласить друга»
  async getInviterStats(inviterId) {
    const result = await this.query(
      `SELECT COUNT(*)::int AS invited,
              COUNT(rewarded_at)::int AS activated,
              COUNT(*) FILTER (WHERE inviter_days > 0)::int AS rewarded,
              COALESCE(SUM(inviter_days), 0)::int AS days
       FROM referrals WHERE inviter_id = $1`,
      [inviterId]
    );
    return result.rows[0];
  }

  // Для админки
  async getGlobalStats() {
    const result = await this.query(
      `SELECT COUNT(*)::int AS invited,
              COUNT(rewarded_at)::int AS activated,
              COUNT(DISTINCT inviter_id)::int AS inviters,
              COALESCE(SUM(invitee_days + inviter_days), 0)::int AS days
       FROM referrals`,
      []
    );
    return result.rows[0];
  }

  // Подсказка «пригласи друга» к сообщению о лимите: true — показать (и слот занят), false — уже была за
  // последние intervalDays. Ключ — дата (UTC), поэтому в один день второй строки не будет и при гонке.
  async claimUpsellSlot(userId, intervalDays) {
    const result = await this.query(
      `INSERT INTO user_notifications (user_id, kind, ref_key)
       SELECT $1, 'referral_upsell', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
       WHERE NOT EXISTS (
         SELECT 1 FROM user_notifications
         WHERE user_id = $1 AND kind = 'referral_upsell' AND sent_at > NOW() - make_interval(days => $2::int)
       )
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [userId, intervalDays]
    );
    return result.rowCount > 0;
  }

  // Источник премиума, как в уведомлениях об окончании: 'paid' — были оплаты, 'granted' — выдан без оплат
  // (админ, приглашения), 'trial' — только пробный период, null — премиума не было
  async getPremiumSource(userId) {
    const result = await this.query(
      `SELECT CASE
                WHEN bool_or(stars_amount > 0) THEN 'paid'
                WHEN bool_or(transaction_type <> 'trial') THEN 'granted'
                WHEN COUNT(*) > 0 THEN 'trial'
              END AS source
       FROM premium_transactions WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    return result.rows[0]?.source || null;
  }
}

module.exports = ReferralRepository;
