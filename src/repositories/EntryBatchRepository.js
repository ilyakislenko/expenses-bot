const BaseRepository = require('./BaseRepository');

// Партия записей из одного сообщения или голосового (expenses.batch_id / incomes.batch_id): сводка, карточки,
// «Отменить всё». И счётчик голосовых за локальный день (voice_usage).
class EntryBatchRepository extends BaseRepository {
  // Одна транзакция: партия, траты и доходы в порядке сообщения.
  // expenses: [{ amount, currency, description, categoryId, guessed, localAt }] (guessed — категория по умолчанию, не запомненная),
  // incomes: [{ amount, currency, description, localAt }]. localAt — местное время записи 'YYYY-MM-DD HH:MM:SS' в поясе
  // timezone (время из уведомления банка), без него — сейчас. onCreated(client, { batchId, expenseIds, incomeIds }) —
  // ещё в этой транзакции (id в порядке записей)
  async create(userId, { source, familyId = null, expenses, incomes, timezone = 'UTC' }, onCreated = null) {
    return this.transaction(async (client) => {
      const created = await client.query(
        'INSERT INTO entry_batches (user_id, source, item_count) VALUES ($1, $2, $3) RETURNING id',
        [userId, source, expenses.length + incomes.length]
      );
      const batchId = created.rows[0].id;
      let expenseIds = [];
      let incomeIds = [];
      if (expenses.length) {
        const inserted = await client.query(`
          INSERT INTO expenses (user_id, amount, description, category_id, currency, family_id, created_at_utc, batch_id, category_guessed)
          SELECT $1::bigint, t.amount, t.description, t.category_id, t.currency, $3::int,
            COALESCE(t.local_at::timestamp AT TIME ZONE $10::text, NOW()), $2::int, t.guessed
          FROM unnest($4::numeric[], $5::text[], $6::int[], $7::varchar[], $8::boolean[], $9::text[])
            WITH ORDINALITY AS t(amount, description, category_id, currency, guessed, local_at, position)
          ORDER BY t.position
          RETURNING id
        `, [userId, batchId, familyId,
          expenses.map(item => item.amount), expenses.map(item => item.description || null),
          expenses.map(item => item.categoryId), expenses.map(item => item.currency), expenses.map(item => Boolean(item.guessed)),
          expenses.map(item => item.localAt || null), timezone]);
        expenseIds = inserted.rows.map(row => row.id).sort((a, b) => a - b);
      }
      if (incomes.length) {
        const inserted = await client.query(`
          INSERT INTO incomes (user_id, amount, currency, description, created_at_utc, batch_id)
          SELECT $1::bigint, t.amount, t.currency, t.description, COALESCE(t.local_at::timestamp AT TIME ZONE $7::text, NOW()), $2::int
          FROM unnest($3::numeric[], $4::varchar[], $5::text[], $6::text[]) WITH ORDINALITY AS t(amount, currency, description, local_at, position)
          ORDER BY t.position
          RETURNING id
        `, [userId, batchId,
          incomes.map(item => item.amount), incomes.map(item => item.currency), incomes.map(item => item.description || null),
          incomes.map(item => item.localAt || null), timezone]);
        incomeIds = inserted.rows.map(row => row.id).sort((a, b) => a - b);
      }
      if (onCreated) await onCreated(client, { batchId, expenseIds, incomeIds });
      return batchId;
    });
  }

  async getById(userId, batchId) {
    const result = await this.query('SELECT * FROM entry_batches WHERE id = $1 AND user_id = $2', [batchId, userId]);
    return result.rows[0];
  }

  // Оставшиеся траты партии (с названием и значком категории, как в списках)
  async getExpenses(userId, batchId) {
    const result = await this.query(`
      SELECT e.*, c.name AS category_name, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.batch_id = $2
      ORDER BY e.id
    `, [userId, batchId]);
    return result.rows;
  }

  async getIncomes(userId, batchId) {
    const result = await this.query('SELECT * FROM incomes WHERE user_id = $1 AND batch_id = $2 ORDER BY id', [userId, batchId]);
    return result.rows;
  }

  // «Отменить всё»: удаляет оставшиеся записи партии. null — партия не найдена или уже отменена
  async undo(userId, batchId) {
    return this.transaction(async (client) => {
      const batch = await client.query(
        "UPDATE entry_batches SET status = 'undone' WHERE id = $1 AND user_id = $2 AND status <> 'undone' RETURNING id",
        [batchId, userId]
      );
      if (!batch.rowCount) return null;
      const expenses = await client.query('DELETE FROM expenses WHERE user_id = $1 AND batch_id = $2', [userId, batchId]);
      const incomes = await client.query('DELETE FROM incomes WHERE user_id = $1 AND batch_id = $2', [userId, batchId]);
      return { expenses: expenses.rowCount, incomes: incomes.rowCount };
    });
  }

  // Голосовых за локальный день (day 'YYYY-MM-DD')
  async getVoiceCount(userId, day) {
    const result = await this.query('SELECT count FROM voice_usage WHERE user_id = $1 AND day = $2', [userId, day]);
    return result.rows[0] ? result.rows[0].count : 0;
  }

  async incrementVoiceCount(userId, day) {
    const result = await this.query(`
      INSERT INTO voice_usage (user_id, day, count) VALUES ($1, $2, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET count = voice_usage.count + 1
      RETURNING count
    `, [userId, day]);
    return result.rows[0].count;
  }
}

module.exports = EntryBatchRepository;
