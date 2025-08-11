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
}

module.exports = DonationRepository;


