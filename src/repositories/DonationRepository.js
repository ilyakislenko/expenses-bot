const BaseRepository = require('./BaseRepository');

class DonationRepository extends BaseRepository {
  async createPendingDonation(userId, stars, message = null) {
    const query = `
      INSERT INTO donations (user_id, stars, message, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `;
    const result = await this.query(query, [userId, stars, message]);
    return result.rows[0];
  }

  async markDonationCompleted(donationId, telegramPaymentId = null) {
    const query = `
      UPDATE donations
      SET status = 'completed', telegram_payment_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [donationId, telegramPaymentId]);
    return result.rows[0];
  }

  async markDonationFailed(donationId) {
    const query = `
      UPDATE donations
      SET status = 'failed', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [donationId]);
    return result.rows[0];
  }

  async getDonationByTelegramPaymentId(telegramPaymentId) {
    const result = await this.query('SELECT * FROM donations WHERE telegram_payment_id = $1', [telegramPaymentId]);
    return result.rows[0] || null;
  }

  async markDonationRefunded(donationId) {
    const query = `
      UPDATE donations
      SET status = 'refunded', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [donationId]);
    return result.rows[0];
  }

  async cleanupOldPendingDonations(hoursOld = 24) {
    const query = `
      UPDATE donations
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND created_at < NOW() - INTERVAL '${hoursOld} hours'
      RETURNING id
    `;
    const result = await this.query(query, []);
    return result.rows.length;
  }

  async cancelUserPendingDonations(userId) {
    const query = `
      UPDATE donations
      SET status = 'cancelled', updated_at = NOW()
      WHERE user_id = $1 AND status = 'pending'
      RETURNING id
    `;
    const result = await this.query(query, [userId]);
    return result.rows.length;
  }

  async getUserDonations(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM donations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.query(query, [userId, limit, offset]);
    return result.rows;
  }
}

module.exports = DonationRepository;


