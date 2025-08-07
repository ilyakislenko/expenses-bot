const BaseRepository = require('./BaseRepository');
const logger = require('../utils/logger');

class PremiumTransactionRepository extends BaseRepository {
  constructor() {
    super();
  }

  /**
   * Создает новую транзакцию
   */
  async createTransaction(transactionData) {
    const {
      user_id,
      transaction_type,
      tariff_duration,
      stars_amount,
      usd_amount,
      rub_amount,
      telegram_payment_id = null,
      invoice_payload = null,
      previous_expiry_date = null,
      new_expiry_date = null,
      status = 'completed',
      error_message = null
    } = transactionData;

    const query = `
      INSERT INTO premium_transactions (
        user_id, transaction_type, tariff_duration, stars_amount, 
        usd_amount, rub_amount, telegram_payment_id, invoice_payload,
        previous_expiry_date, new_expiry_date, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      user_id, transaction_type, tariff_duration, stars_amount,
      usd_amount, rub_amount, telegram_payment_id, invoice_payload,
      previous_expiry_date, new_expiry_date, status, error_message
    ];

    try {
      const result = await this.query(query, values);
      logger.info(`Created premium transaction: ${transaction_type} for user ${user_id}, amount: ${stars_amount} stars`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create premium transaction:', error);
      throw error;
    }
  }

  /**
   * Получает все транзакции пользователя
   */
  async getUserTransactions(userId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM premium_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get user transactions:', error);
      throw error;
    }
  }

  /**
   * Получает транзакцию по ID платежа Telegram
   */
  async getTransactionByTelegramPaymentId(telegramPaymentId) {
    const query = `
      SELECT * FROM premium_transactions 
      WHERE telegram_payment_id = $1
    `;

    try {
      const result = await this.query(query, [telegramPaymentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get transaction by Telegram payment ID:', error);
      throw error;
    }
  }

  /**
   * Обновляет статус транзакции
   */
  async updateTransactionStatus(transactionId, status, errorMessage = null) {
    const query = `
      UPDATE premium_transactions 
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await this.query(query, [status, errorMessage, transactionId]);
      logger.info(`Updated transaction ${transactionId} status to: ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update transaction status:', error);
      throw error;
    }
  }

  /**
   * Получает статистику транзакций
   */
  async getTransactionStats(userId = null) {
    let query, values;

    if (userId) {
      query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          SUM(CASE WHEN status = 'completed' THEN stars_amount ELSE 0 END) as total_stars,
          SUM(CASE WHEN status = 'completed' THEN usd_amount ELSE 0 END) as total_usd,
          SUM(CASE WHEN status = 'completed' THEN rub_amount ELSE 0 END) as total_rub
        FROM premium_transactions 
        WHERE user_id = $1
      `;
      values = [userId];
    } else {
      query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          SUM(CASE WHEN status = 'completed' THEN stars_amount ELSE 0 END) as total_stars,
          SUM(CASE WHEN status = 'completed' THEN usd_amount ELSE 0 END) as total_usd,
          SUM(CASE WHEN status = 'completed' THEN rub_amount ELSE 0 END) as total_rub
        FROM premium_transactions
      `;
      values = [];
    }

    try {
      const result = await this.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get transaction stats:', error);
      throw error;
    }
  }

  /**
   * Получает транзакции по типу
   */
  async getTransactionsByType(transactionType, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM premium_transactions 
      WHERE transaction_type = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.query(query, [transactionType, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get transactions by type:', error);
      throw error;
    }
  }

  /**
   * Получает транзакции за период
   */
  async getTransactionsByPeriod(startDate, endDate, userId = null) {
    let query, values;

    if (userId) {
      query = `
        SELECT * FROM premium_transactions 
        WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC
      `;
      values = [userId, startDate, endDate];
    } else {
      query = `
        SELECT * FROM premium_transactions 
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
      `;
      values = [startDate, endDate];
    }

    try {
      const result = await this.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get transactions by period:', error);
      throw error;
    }
  }

  /**
   * Проверяет, существует ли транзакция с данным Telegram payment ID
   */
  async transactionExists(telegramPaymentId) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM premium_transactions 
        WHERE telegram_payment_id = $1
      ) as exists
    `;

    try {
      const result = await this.query(query, [telegramPaymentId]);
      return result.rows[0].exists;
    } catch (error) {
      logger.error('Failed to check transaction existence:', error);
      throw error;
    }
  }
}

module.exports = PremiumTransactionRepository; 