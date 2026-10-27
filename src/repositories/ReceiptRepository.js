const BaseRepository = require('./BaseRepository');

// Распознанные чеки: партия трат (expenses.receipt_id) для списка, правки и отмены, и счётчик месячного лимита.
class ReceiptRepository extends BaseRepository {
  // Чеки, распознанные с начала локального месяца (monthStart 'YYYY-MM-01'), включая отменённые
  async countSince(userId, monthStart, timezone) {
    const result = await this.query(
      'SELECT COUNT(*)::int AS count FROM receipts WHERE user_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE $3)',
      [userId, monthStart, timezone]
    );
    return result.rows[0].count;
  }

  // Одна транзакция: чек и по трате на каждую позицию. localAt — локальное время траты ('YYYY-MM-DD HH:MM:SS')
  // или null (сейчас). items: [{ amount, description, categoryId, quantity, unitPrice }] — количество и цена
  // за единицу как в чеке (NULL — не распознаны), по ним считается личная инфляция
  async create(userId, { merchant, date, time, currency, total, itemsTotal, localAt, timezone, familyId, items }) {
    return this.transaction(async (client) => {
      const created = await client.query(`
        INSERT INTO receipts (user_id, merchant, purchased_date, purchased_time, currency, printed_total, items_total, item_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [userId, merchant, date, time, currency, total, itemsTotal, items.length]);
      const receiptId = created.rows[0].id;
      await client.query(`
        INSERT INTO expenses (user_id, amount, description, category_id, currency, family_id, created_at_utc, receipt_id, quantity, unit_price)
        SELECT $1::bigint, t.amount, t.description, t.category_id, $3::varchar, $4::int,
          COALESCE($5::timestamp AT TIME ZONE $6::text, NOW()), $2::int, t.quantity, t.unit_price
        FROM unnest($7::numeric[], $8::text[], $9::int[], $10::numeric[], $11::numeric[])
          WITH ORDINALITY AS t(amount, description, category_id, quantity, unit_price, position)
        ORDER BY t.position
      `, [userId, receiptId, currency, familyId, localAt, timezone,
        items.map(item => item.amount), items.map(item => item.description || null), items.map(item => item.categoryId),
        items.map(item => (Number(item.quantity) > 0 ? item.quantity : null)),
        items.map(item => (Number(item.unitPrice) > 0 ? item.unitPrice : null))]);
      return receiptId;
    });
  }

  // purchased_day 'YYYY-MM-DD' и purchased_hm 'HH:MM' — строками (DATE драйвер pg превращает в Date в поясе процесса)
  async getById(userId, receiptId) {
    const result = await this.query(`
      SELECT *, to_char(purchased_date, 'YYYY-MM-DD') AS purchased_day, to_char(purchased_time, 'HH24:MI') AS purchased_hm
      FROM receipts WHERE id = $1 AND user_id = $2
    `, [receiptId, userId]);
    return result.rows[0];
  }

  // Траты чека в порядке позиций (как в getExpensesBetween — с названием и значком категории)
  async getExpenses(userId, receiptId) {
    const result = await this.query(`
      SELECT e.*, c.name AS category_name, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.receipt_id = $2
      ORDER BY e.id
    `, [userId, receiptId]);
    return result.rows;
  }

  async setStatus(userId, receiptId, status) {
    const result = await this.query(
      "UPDATE receipts SET status = $3 WHERE id = $1 AND user_id = $2 AND status <> 'undone' RETURNING *",
      [receiptId, userId, status]
    );
    return result.rows[0];
  }

  // Отмена чека: удаляет оставшиеся траты чека. null — чек не найден или уже отменён
  async undo(userId, receiptId) {
    return this.transaction(async (client) => {
      const receipt = await client.query(
        "UPDATE receipts SET status = 'undone' WHERE id = $1 AND user_id = $2 AND status <> 'undone' RETURNING id",
        [receiptId, userId]
      );
      if (!receipt.rowCount) return null;
      const deleted = await client.query('DELETE FROM expenses WHERE user_id = $1 AND receipt_id = $2', [userId, receiptId]);
      return { expenses: deleted.rowCount };
    });
  }
}

module.exports = ReceiptRepository;
