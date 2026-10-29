const BaseRepository = require('./BaseRepository');

// «🪙 Монеты»: журнал coin_ledger (ключ идемпотентности уникален на пользователя) и баланс user_coins
class CoinRepository extends BaseRepository {
  // Начисления одним запросом: строки журнала по ключам, которых ещё не было, и баланс на их сумму.
  // items — [{ amount, key }], reason — общий. → { added (сколько монет реально начислено), balance | null }
  async credit(userId, reason, items, { days = null, month = null } = {}) {
    if (!items.length) return { added: 0, balance: null };
    const result = await this.query(`
      WITH ins AS (
        INSERT INTO coin_ledger (user_id, amount, reason, ref_key, days, month)
        SELECT $1::bigint, t.amount, $2::varchar, t.ref_key, $5::smallint, $6::char(7)
        FROM unnest($3::int[], $4::text[]) AS t(amount, ref_key)
        ON CONFLICT (user_id, ref_key) DO NOTHING
        RETURNING amount
      ), total AS (SELECT COALESCE(SUM(amount), 0)::int AS s FROM ins)
      INSERT INTO user_coins (user_id, balance, earned_total)
      SELECT $1::bigint, s, CASE WHEN $2::varchar = 'refund' THEN 0 ELSE s END FROM total WHERE s > 0
      ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + EXCLUDED.balance,
        earned_total = user_coins.earned_total + EXCLUDED.earned_total, updated_at = NOW()
      RETURNING balance, (SELECT s FROM total) AS added`,
    [userId, reason, items.map(i => i.amount), items.map(i => i.key), days, month]);
    const row = result.rows[0];
    return row ? { added: Number(row.added), balance: Number(row.balance) } : { added: 0, balance: null };
  }

  async getBalance(userId) {
    const result = await this.query('SELECT balance, earned_total FROM user_coins WHERE user_id = $1', [userId]);
    const row = result.rows[0];
    return { balance: row ? Number(row.balance) : 0, earned: row ? Number(row.earned_total) : 0 };
  }

  async getHistory(userId, limit) {
    const result = await this.query(
      `SELECT amount, reason, ref_key, days, created_at FROM coin_ledger
       WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // Дни премиума, обменянные в локальном месяце (возвраты — с минусом)
  async redeemedDays(userId, month) {
    const result = await this.query(
      `SELECT COALESCE(SUM(days), 0)::int AS days FROM coin_ledger
       WHERE user_id = $1 AND month = $2 AND reason IN ('redeem', 'refund')`,
      [userId, month]
    );
    return result.rows[0].days;
  }

  // Обмен одной транзакцией: строка баланса блокируется (параллельные обмены ждут друг друга), повтор ключа —
  // 'duplicate', затем лимит месяца и баланс. → { status: 'ok' | 'duplicate' | 'cap' | 'insufficient', ledgerId, balance, used }
  async redeem(userId, { price, days, month, refKey, cap }) {
    return this.transaction(async (client) => {
      await client.query('INSERT INTO user_coins (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId]);
      const locked = await client.query('SELECT balance FROM user_coins WHERE user_id = $1 FOR UPDATE', [userId]);
      const balance = Number(locked.rows[0].balance);
      const dup = await client.query('SELECT id FROM coin_ledger WHERE user_id = $1 AND ref_key = $2', [userId, refKey]);
      if (dup.rowCount) return { status: 'duplicate', ledgerId: dup.rows[0].id, balance };
      const usedRow = await client.query(
        `SELECT COALESCE(SUM(days), 0)::int AS days FROM coin_ledger
         WHERE user_id = $1 AND month = $2 AND reason IN ('redeem', 'refund')`,
        [userId, month]
      );
      const used = usedRow.rows[0].days;
      if (used + days > cap) return { status: 'cap', balance, used };
      if (balance < price) return { status: 'insufficient', balance, used };
      const inserted = await client.query(
        `INSERT INTO coin_ledger (user_id, amount, reason, ref_key, days, month)
         VALUES ($1, $2, 'redeem', $3, $4, $5) RETURNING id`,
        [userId, -price, refKey, days, month]
      );
      const updated = await client.query(
        'UPDATE user_coins SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1 RETURNING balance',
        [userId, price]
      );
      return { status: 'ok', ledgerId: inserted.rows[0].id, balance: Number(updated.rows[0].balance), used: used + days };
    });
  }
}

module.exports = CoinRepository;
