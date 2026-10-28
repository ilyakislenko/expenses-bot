const BaseRepository = require('./BaseRepository');

// Фоновые распознавания с сообщением-статусом (pending_jobs): строка живёт, пока задача идёт. Строки другого
// запуска бота (instance) — задачи, прерванные перезапуском.
class PendingJobRepository extends BaseRepository {
  async start(instance, kind, { userId, chatId, messageId }) {
    await this.query(`
      INSERT INTO pending_jobs (chat_id, message_id, user_id, kind, instance, started_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (chat_id, message_id) DO UPDATE
        SET user_id = EXCLUDED.user_id, kind = EXCLUDED.kind, instance = EXCLUDED.instance, started_at = NOW()`,
    [chatId, messageId, userId, kind, instance]);
  }

  async finish(instance, chatId, messageId) {
    await this.query('DELETE FROM pending_jobs WHERE chat_id = $1 AND message_id = $2 AND instance = $3', [chatId, messageId, instance]);
  }

  // Забирает (удаляет) задачи прошлых запусков: [{ chat_id, message_id, user_id, kind, started_at }]
  async takeInterrupted(instance) {
    const result = await this.query(`
      DELETE FROM pending_jobs WHERE instance <> $1
      RETURNING chat_id, message_id, user_id, kind, started_at`, [instance]);
    return result.rows.map(row => ({ ...row, chat_id: Number(row.chat_id), message_id: Number(row.message_id), user_id: Number(row.user_id) }));
  }
}

module.exports = PendingJobRepository;
