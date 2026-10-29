const BaseRepository = require('./BaseRepository');

// Обработанные уведомления банка (bank_notifications): без текста, номера карты и остатка — отпечаток текста, ключ
// пересылки, сумма и время операции, ссылка на запись. Для поиска повторов, лимита нейросети и статистики.
class BankNotificationRepository extends BaseRepository {
  // Уже записанное уведомление (запись ещё существует): то же пересланное сообщение; тот же текст за textWindowHours
  // (с временем в тексте — longWindowHours); та же сумма, валюта и вид в пределах 2 минут времени операции.
  // localAt — местное время операции 'YYYY-MM-DD HH:MM:SS' в поясе timezone (только если время есть в тексте или у
  // пересылки). { id, expense_id, income_id } или undefined
  async findDuplicate(userId, { textHash, forwardKey = null, kind, amount, currency, localAt = null, timezone, hasTime, textWindowHours }) {
    const result = await this.query(`
      SELECT id, expense_id, income_id
      FROM bank_notifications
      WHERE user_id = $1 AND (expense_id IS NOT NULL OR income_id IS NOT NULL) AND (
        ($2::text IS NOT NULL AND forward_key = $2)
        OR (text_hash = $3 AND created_at > NOW() - make_interval(hours => $4::int))
        OR ($5::text IS NOT NULL AND has_time AND outcome = $6 AND amount = $7 AND currency = $8
          AND occurred_at BETWEEN ($5::timestamp AT TIME ZONE $9::text) - INTERVAL '2 minutes'
                              AND ($5::timestamp AT TIME ZONE $9::text) + INTERVAL '2 minutes')
      )
      ORDER BY id DESC
      LIMIT 1
    `, [userId, forwardKey, textHash, textWindowHours, hasTime ? localAt : null, kind, amount, currency, timezone]);
    return result.rows[0];
  }

  // Строки уведомлений; client — внутри транзакции записи партии. rows: [{ textHash, forwardKey, outcome, parser, bank,
  // amount, currency, localAt, hasTime, expenseId, incomeId }], localDay — локальная дата пользователя 'YYYY-MM-DD'
  async insertMany(userId, rows, { timezone, localDay }, client = null) {
    if (!rows.length) return;
    const run = client ? (sql, params) => client.query(sql, params) : (sql, params) => this.query(sql, params);
    await run(`
      INSERT INTO bank_notifications (user_id, text_hash, forward_key, outcome, parser, bank, amount, currency, occurred_at,
        has_time, expense_id, income_id, local_day)
      SELECT $1::bigint, t.text_hash, t.forward_key, t.outcome, t.parser, t.bank, t.amount, t.currency,
        t.local_at::timestamp AT TIME ZONE $13::text, t.has_time, t.expense_id, t.income_id, $14::date
      FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::numeric[], $8::text[], $9::text[],
        $10::boolean[], $11::int[], $12::int[])
        AS t(text_hash, forward_key, outcome, parser, bank, amount, currency, local_at, has_time, expense_id, income_id)
    `, [userId,
      rows.map(r => r.textHash), rows.map(r => r.forwardKey || null), rows.map(r => r.outcome), rows.map(r => r.parser),
      rows.map(r => r.bank || null), rows.map(r => (r.amount === undefined ? null : r.amount)), rows.map(r => r.currency || null),
      rows.map(r => r.localAt || null), rows.map(r => Boolean(r.hasTime)), rows.map(r => r.expenseId || null),
      rows.map(r => r.incomeId || null), timezone, localDay]);
  }

  // Сколько уведомлений за локальный день разобрала нейросеть (дневной лимит)
  async countModelParsed(userId, localDay) {
    const result = await this.query(
      "SELECT COUNT(*)::int AS count FROM bank_notifications WHERE user_id = $1 AND local_day = $2 AND parser = 'model'",
      [userId, localDay]
    );
    return result.rows[0].count;
  }

  // Покупка, которую отменяет возврат: та же сумма и валюта за 90 дней, продавец совпадает с описанием (если есть)
  async findRefundTarget(userId, { amount, currency, merchant = null }) {
    const result = await this.query(`
      SELECT id FROM expenses
      WHERE user_id = $1 AND amount = $2 AND currency = $3 AND created_at_utc > NOW() - INTERVAL '90 days'
        AND ($4::text IS NULL OR strpos(LOWER(description), LOWER($4::text)) > 0)
      ORDER BY created_at_utc DESC
      LIMIT 1
    `, [userId, amount, currency, merchant]);
    return result.rows[0] ? result.rows[0].id : null;
  }
}

module.exports = BankNotificationRepository;
