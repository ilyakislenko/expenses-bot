const BaseRepository = require('./BaseRepository');

// Ожидаемый ввод и черновики StateService (user_input_states): переживают перезапуск бота.
// kind — вид записи (state, edit, expense, recurring, export, question), slot — сообщение с кнопками черновика траты
// ('' у остальных), value — значение как в памяти (JSON).
class UserInputStateRepository extends BaseRepository {
  async upsert(userId, kind, slot, value, expiresAt) {
    await this.query(`
      INSERT INTO user_input_states (user_id, kind, slot, value, expires_at, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
      ON CONFLICT (user_id, kind, slot) DO UPDATE
      SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, updated_at = NOW()
    `, [userId, kind, String(slot), JSON.stringify(value === undefined ? null : value), expiresAt]);
  }

  async remove(userId, kind, slot) {
    await this.query('DELETE FROM user_input_states WHERE user_id = $1 AND kind = $2 AND slot = $3', [userId, kind, String(slot)]);
  }

  async removeKinds(userId, kinds) {
    await this.query('DELETE FROM user_input_states WHERE user_id = $1 AND kind = ANY($2::text[])', [userId, kinds]);
  }

  // Записи, истёкшие не раньше since (истёкшие нужны, чтобы сказать «ввод устарел»), в порядке изменения
  async loadSince(since) {
    const result = await this.query(
      'SELECT user_id, kind, slot, value, expires_at FROM user_input_states WHERE expires_at > $1 ORDER BY updated_at, user_id',
      [since]
    );
    return result.rows;
  }

  async purgeBefore(before) {
    const result = await this.query('DELETE FROM user_input_states WHERE expires_at <= $1', [before]);
    return result.rowCount;
  }
}

module.exports = UserInputStateRepository;
