const BaseRepository = require('./BaseRepository');
const { moveToDate } = require('../utils/recordDate');

const MAX_QUANTITY = 100000; // expenses.quantity DECIMAL(12,3); больше — не количество
const MAX_UNIT_PRICE = 99999999.99; // expenses.unit_price DECIMAL(12,2) с запасом, как предел суммы

// Распознанные чеки: партия трат (expenses.receipt_id) для списка, правки и отмены, и счётчик месячного лимита.
class ReceiptRepository extends BaseRepository {
  // Распознавания с начала локального месяца (monthStart 'YYYY-MM-01'): чеки (включая отменённые) и попытки без записи
  // (показанный черновик, «не получилось распознать» — receipt_attempts)
  async countSince(userId, monthStart, timezone) {
    const result = await this.query(`
      SELECT
        (SELECT COUNT(*) FROM receipts WHERE user_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE $3))
        + (SELECT COUNT(*) FROM receipt_attempts WHERE user_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE $3))
        AS count`, [userId, monthStart, timezone]);
    return Number(result.rows[0].count);
  }

  // Попытка распознавания без записи (outcome: 'draft' | 'unreadable'). Возвращает id (черновик хранит его, чтобы
  // при записи заменить попытку чеком)
  async addAttempt(userId, outcome) {
    const result = await this.query('INSERT INTO receipt_attempts (user_id, outcome) VALUES ($1, $2) RETURNING id', [userId, outcome]);
    return result.rows[0].id;
  }

  // Одна транзакция: чек и по трате на каждую позицию. localAt — локальное время траты ('YYYY-MM-DD HH:MM:SS')
  // или null (сейчас). items: [{ amount, description, categoryId, quantity, unitPrice }] — количество и цена
  // за единицу как в чеке (NULL — не распознаны или вне пределов колонок), по ним считается личная инфляция.
  // attemptId — попытка черновика, которую заменяет этот чек (в лимите считается один раз)
  async create(userId, { merchant, date, time, currency, total, itemsTotal, localAt, timezone, familyId, items, attemptId = null }) {
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
        items.map(item => (Number(item.quantity) > 0 && Number(item.quantity) <= MAX_QUANTITY ? Math.round(Number(item.quantity) * 1000) / 1000 : null)),
        items.map(item => (Number(item.unitPrice) > 0 && Number(item.unitPrice) <= MAX_UNIT_PRICE ? item.unitPrice : null))]);
      if (attemptId) await client.query('DELETE FROM receipt_attempts WHERE id = $1 AND user_id = $2', [attemptId, userId]);
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

  // Дата чека: purchased_date и день всех оставшихся трат чека одной транзакцией; местное время суток каждой траты
  // в поясе timezone остаётся (moveToDate, не позже текущего момента). null — чек не найден или отменён,
  // иначе { expenses: перенесено трат }
  async setDate(userId, receiptId, date, timezone, now = new Date()) {
    return this.transaction(async (client) => {
      const receipt = await client.query(
        "UPDATE receipts SET purchased_date = $3 WHERE id = $1 AND user_id = $2 AND status <> 'undone' RETURNING id",
        [receiptId, userId, date]
      );
      if (!receipt.rowCount) return null;
      const expenses = await client.query(
        'SELECT id, created_at_utc FROM expenses WHERE user_id = $1 AND receipt_id = $2 ORDER BY id FOR UPDATE',
        [userId, receiptId]
      );
      if (!expenses.rowCount) return { expenses: 0 };
      const moved = await client.query(`
        UPDATE expenses e SET created_at_utc = t.created_at
        FROM unnest($2::int[], $3::timestamptz[]) AS t(id, created_at)
        WHERE e.id = t.id AND e.user_id = $1`, [
        userId,
        expenses.rows.map(row => row.id),
        expenses.rows.map(row => moveToDate(row.created_at_utc, date, timezone, now))
      ]);
      return { expenses: moved.rowCount };
    });
  }

  // ---------- Черновики неуверенно распознанных чеков и кадры для «повернуть» (receipt_drafts) ----------
  // Ключ — сообщение с кнопками (user_id, message_id). receipt — черновик чека (NULL — только кадр для поворота),
  // frame — { fileId, mimeType, turn, small, lowResolution, lang, currency } (NULL — повернуть нельзя).

  // Создаёт или заменяет черновик сообщения; заодно удаляет просроченные
  async saveDraft(userId, messageId, { receipt, timezone, frame }, ttlDays) {
    await this.query('DELETE FROM receipt_drafts WHERE expires_at <= NOW()');
    await this.query(`
      INSERT INTO receipt_drafts (user_id, message_id, receipt, timezone, frame, taken_at, expires_at)
      VALUES ($1, $2, $3, $4, $5, NULL, NOW() + make_interval(days => $6))
      ON CONFLICT (user_id, message_id) DO UPDATE
        SET receipt = EXCLUDED.receipt, timezone = EXCLUDED.timezone, frame = EXCLUDED.frame,
            taken_at = NULL, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [userId, messageId, receipt ? JSON.stringify(receipt) : null, timezone, frame ? JSON.stringify(frame) : null, ttlDays]);
  }

  // Забирает черновик под запись. { status: 'ok', receipt, timezone } | { status: 'busy' } — уже записывается
  // (захват не старше staleSeconds) | { status: 'missing' } — нет, просрочен или это только кадр
  async takeDraft(userId, messageId, staleSeconds) {
    const taken = await this.query(`
      UPDATE receipt_drafts SET taken_at = NOW()
      WHERE user_id = $1 AND message_id = $2 AND receipt IS NOT NULL AND expires_at > NOW()
        AND (taken_at IS NULL OR taken_at < NOW() - make_interval(secs => $3))
      RETURNING receipt, timezone`, [userId, messageId, staleSeconds]);
    if (taken.rows[0]) return { status: 'ok', receipt: taken.rows[0].receipt, timezone: taken.rows[0].timezone };
    const busy = await this.query(
      'SELECT 1 FROM receipt_drafts WHERE user_id = $1 AND message_id = $2 AND receipt IS NOT NULL AND expires_at > NOW() AND taken_at IS NOT NULL',
      [userId, messageId]
    );
    return { status: busy.rowCount ? 'busy' : 'missing' };
  }

  // Черновик для показа (строка, экран даты, страница). { status: 'ok', receipt, frame, timezone } | { status: 'busy' }
  // — записывается | { status: 'missing' }
  async getDraft(userId, messageId, staleSeconds) {
    const result = await this.query(`
      SELECT receipt, frame, timezone, (taken_at IS NOT NULL AND taken_at >= NOW() - make_interval(secs => $3)) AS busy
      FROM receipt_drafts
      WHERE user_id = $1 AND message_id = $2 AND receipt IS NOT NULL AND expires_at > NOW()`, [userId, messageId, staleSeconds]);
    const row = result.rows[0];
    if (!row) return { status: 'missing' };
    if (row.busy) return { status: 'busy' };
    return { status: 'ok', receipt: row.receipt, frame: row.frame, timezone: row.timezone };
  }

  // Правка черновика: строка блокируется (FOR UPDATE), mutate(receipt) → новый черновик или null (менять нечего).
  // Записывающийся черновик не правится; takeDraft во время правки ждёт её конца и забирает уже исправленный.
  // { status: 'ok' | 'unchanged', receipt, frame, timezone } | { status: 'busy' } | { status: 'missing' }
  async updateDraft(userId, messageId, staleSeconds, mutate) {
    return this.transaction(async (client) => {
      const found = await client.query(`
        SELECT receipt, frame, timezone, (taken_at IS NOT NULL AND taken_at >= NOW() - make_interval(secs => $3)) AS busy
        FROM receipt_drafts
        WHERE user_id = $1 AND message_id = $2 AND receipt IS NOT NULL AND expires_at > NOW()
        FOR UPDATE`, [userId, messageId, staleSeconds]);
      const row = found.rows[0];
      if (!row) return { status: 'missing' };
      if (row.busy) return { status: 'busy' };
      const receipt = mutate(row.receipt);
      if (!receipt) return { status: 'unchanged', receipt: row.receipt, frame: row.frame, timezone: row.timezone };
      await client.query(
        'UPDATE receipt_drafts SET receipt = $3, taken_at = NULL WHERE user_id = $1 AND message_id = $2',
        [userId, messageId, JSON.stringify(receipt)]
      );
      return { status: 'ok', receipt, frame: row.frame, timezone: row.timezone };
    });
  }

  // Черновик переезжает на новое сообщение (после ввода текстом черновик присылается заново, ниже ввода). false — не
  // переехал: записывается, отменён или просрочен
  async moveDraft(userId, fromMessageId, toMessageId) {
    const result = await this.query(`
      UPDATE receipt_drafts SET message_id = $3
      WHERE user_id = $1 AND message_id = $2 AND receipt IS NOT NULL AND taken_at IS NULL AND expires_at > NOW()`,
    [userId, fromMessageId, toMessageId]);
    return result.rowCount > 0;
  }

  // Запись не удалась — черновик снова доступен
  async releaseDraft(userId, messageId) {
    await this.query('UPDATE receipt_drafts SET taken_at = NULL WHERE user_id = $1 AND message_id = $2', [userId, messageId]);
  }

  async deleteDraft(userId, messageId) {
    await this.query('DELETE FROM receipt_drafts WHERE user_id = $1 AND message_id = $2', [userId, messageId]);
  }

  // Кнопка «повернуть»: черновик отмечается «поворачивается» (taken_at) и остаётся в БД, пока новое распознавание не
  // закончится — если оно не лучше, возвращается прежний. { frame, receipt, timezone } или null — кадра нет, он устарел,
  // уже поворачивается/записывается. Исправленный вручную черновик не поворачивается: правки пропали бы
  async takeFrame(userId, messageId, staleSeconds) {
    const result = await this.query(`
      UPDATE receipt_drafts SET taken_at = NOW()
      WHERE user_id = $1 AND message_id = $2 AND frame IS NOT NULL AND expires_at > NOW()
        AND (taken_at IS NULL OR taken_at < NOW() - make_interval(secs => $3))
        AND (receipt IS NULL OR NOT COALESCE((receipt->>'edited')::boolean, false))
      RETURNING frame, receipt, timezone`, [userId, messageId, staleSeconds]);
    return result.rows[0] || null;
  }

  // После перезапуска (поворот прервался): черновик и кадр сообщения снова доступны. null — строки нет
  async releaseFrame(userId, messageId) {
    const result = await this.query(`
      UPDATE receipt_drafts SET taken_at = NULL
      WHERE user_id = $1 AND message_id = $2 AND expires_at > NOW()
      RETURNING frame, receipt, timezone`, [userId, messageId]);
    return result.rows[0] || null;
  }
}

module.exports = ReceiptRepository;
