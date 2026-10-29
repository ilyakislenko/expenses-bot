const BaseRepository = require('./BaseRepository');

// Общие расходы групп: учёт чата (group_ledgers), участники, траты с долями, делёж чеков, вопросы бота в чате,
// покупки «🎫 Пропуск для группы». Деньги — DECIMAL(12,2), доли в валюте группы.
class GroupRepository extends BaseRepository {
  // ---------- Учёт ----------

  async getByChat(chatId) {
    const result = await this.query('SELECT * FROM group_ledgers WHERE chat_id = $1', [chatId]);
    return result.rows[0] || null;
  }

  async getById(groupId) {
    const result = await this.query('SELECT * FROM group_ledgers WHERE id = $1', [groupId]);
    return result.rows[0] || null;
  }

  async getByToken(token) {
    const result = await this.query('SELECT * FROM group_ledgers WHERE token = $1', [token]);
    return result.rows[0] || null;
  }

  // Учёт чата: новый или прежний (бота вернули в группу — учёт продолжается, данные на месте)
  async createForChat({ chatId, token, title, currency, lang, createdBy }) {
    const result = await this.query(`
      INSERT INTO group_ledgers (chat_id, token, title, currency, lang, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (chat_id) WHERE chat_id IS NOT NULL DO UPDATE SET active = TRUE, title = EXCLUDED.title
      RETURNING *, (xmax = 0) AS created`, [chatId, token, title, currency, lang, createdBy]);
    return result.rows[0];
  }

  // Счёт «по ссылке» пользователя (чеки из лички без группы): один на пользователя
  async getOrCreateLinkLedger({ userId, token, title, currency, lang }) {
    const result = await this.query(`
      INSERT INTO group_ledgers (chat_id, token, title, currency, lang, created_by)
      VALUES (NULL, $1, $2, $3, $4, $5)
      ON CONFLICT (created_by) WHERE chat_id IS NULL DO UPDATE SET active = TRUE
      RETURNING *`, [token, title, currency, lang, userId]);
    return result.rows[0];
  }

  async setActive(chatId, active) {
    await this.query('UPDATE group_ledgers SET active = $2 WHERE chat_id = $1', [chatId, active]);
  }

  async setTitle(chatId, title) {
    await this.query('UPDATE group_ledgers SET title = $2 WHERE chat_id = $1 AND title IS DISTINCT FROM $2', [chatId, title]);
  }

  // Группа стала супергруппой: у чата новый id
  async migrateChat(fromChatId, toChatId) {
    await this.query(`
      UPDATE group_ledgers SET chat_id = $2 WHERE chat_id = $1
        AND NOT EXISTS (SELECT 1 FROM group_ledgers WHERE chat_id = $2)`, [fromChatId, toChatId]);
    await this.query('UPDATE group_splits SET chat_id = $2 WHERE chat_id = $1', [fromChatId, toChatId]);
  }

  // Новая валюта группы: суммы и доли пересчитаны заранее (rows: [{ id, amountGroup, shares: [{ userId, share }] }])
  async setCurrency(groupId, currency, rows) {
    return this.transaction(async (client) => {
      await client.query('SELECT id FROM group_ledgers WHERE id = $1 FOR UPDATE', [groupId]);
      for (const row of rows) {
        await client.query('UPDATE group_expenses SET amount_group = $2 WHERE id = $1', [row.id, row.amountGroup]);
        for (const share of row.shares) {
          await client.query('UPDATE group_expense_shares SET share = $3 WHERE expense_id = $1 AND user_id = $2', [row.id, share.userId, share.share]);
        }
      }
      await client.query('UPDATE group_ledgers SET currency = $2 WHERE id = $1', [groupId, currency]);
    });
  }

  // ---------- Участники ----------

  // Участник по кнопке (или по ссылке на чек — viaLink): вернувшийся снова в учёте; нажал «Я участвую» в чате —
  // больше не «по ссылке». created — впервые
  async addMember(groupId, { userId, name, username = null, lang = null, viaLink = false }) {
    const result = await this.query(`
      INSERT INTO group_members (group_id, user_id, name, username, lang, via_link)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (group_id, user_id) DO UPDATE SET
        left_at = NULL, name = EXCLUDED.name, username = EXCLUDED.username, lang = COALESCE(EXCLUDED.lang, group_members.lang),
        via_link = group_members.via_link AND EXCLUDED.via_link
      RETURNING *, (xmax = 0) AS created`, [groupId, userId, name, username, lang, viaLink]);
    return result.rows[0];
  }

  async getMember(groupId, userId) {
    const result = await this.query('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL', [groupId, userId]);
    return result.rows[0] || null;
  }

  // Участники в порядке вступления; includeLeft — и вышедшие (их имена нужны в истории и балансах)
  async getMembers(groupId, { includeLeft = false } = {}) {
    const result = await this.query(`
      SELECT * FROM group_members WHERE group_id = $1 ${includeLeft ? '' : 'AND left_at IS NULL'}
      ORDER BY joined_at, user_id`, [groupId]);
    return result.rows;
  }

  async leave(groupId, userId) {
    const result = await this.query('UPDATE group_members SET left_at = NOW() WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL RETURNING *', [groupId, userId]);
    return result.rows[0] || null;
  }

  // Группы пользователя, куда можно отправить чек из лички: бот в чате, пользователь в учёте
  async listUserChatLedgers(userId) {
    const result = await this.query(`
      SELECT g.* FROM group_ledgers g
      JOIN group_members m ON m.group_id = g.id AND m.user_id = $1 AND m.left_at IS NULL
      WHERE g.chat_id IS NOT NULL AND g.active
      ORDER BY g.created_at DESC LIMIT 10`, [userId]);
    return result.rows;
  }

  // ---------- Траты и «рассчитались» ----------

  // shares: [{ userId, share }] — сумма долей = amountGroup
  async addExpense({ groupId, kind = 'expense', payerId, createdBy, amount, currency, amountGroup, description = null, splitMode = 'equal', splitId = null, shares }) {
    return this.transaction(async (client) => {
      const created = await client.query(`
        INSERT INTO group_expenses (group_id, kind, payer_id, created_by, amount, currency, amount_group, description, split_mode, split_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [groupId, kind, payerId, createdBy, amount, currency, amountGroup, description, splitMode, splitId]);
      const expenseId = created.rows[0].id;
      await this.insertShares(client, expenseId, shares);
      return expenseId;
    });
  }

  async insertShares(client, expenseId, shares) {
    await client.query(`
      INSERT INTO group_expense_shares (expense_id, user_id, share)
      SELECT $1::int, t.user_id, t.share FROM unnest($2::bigint[], $3::numeric[]) AS t(user_id, share)`,
    [expenseId, shares.map(share => share.userId), shares.map(share => share.share)]);
  }

  async setExpenseMessage(expenseId, messageId) {
    await this.query('UPDATE group_expenses SET message_id = $2 WHERE id = $1', [expenseId, messageId]);
  }

  async getExpense(expenseId) {
    const result = await this.query('SELECT * FROM group_expenses WHERE id = $1', [expenseId]);
    const expense = result.rows[0];
    if (!expense) return null;
    const shares = await this.query('SELECT * FROM group_expense_shares WHERE expense_id = $1 ORDER BY share DESC, user_id', [expenseId]);
    return { ...expense, shares: shares.rows };
  }

  // Другие доли той же траты (участники или точные суммы); удалённую не меняет
  async replaceShares(expenseId, splitMode, shares) {
    return this.transaction(async (client) => {
      const locked = await client.query('SELECT id FROM group_expenses WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [expenseId]);
      if (!locked.rowCount) return false;
      const copied = await client.query('SELECT user_id, copied_expense_id FROM group_expense_shares WHERE expense_id = $1 AND copied_expense_id IS NOT NULL', [expenseId]);
      await client.query('DELETE FROM group_expense_shares WHERE expense_id = $1', [expenseId]);
      await this.insertShares(client, expenseId, shares);
      // Отметка «уже в личных» остаётся у тех, кто остался в трате
      for (const row of copied.rows) {
        await client.query('UPDATE group_expense_shares SET copied_expense_id = $3 WHERE expense_id = $1 AND user_id = $2', [expenseId, row.user_id, row.copied_expense_id]);
      }
      await client.query('UPDATE group_expenses SET split_mode = $2 WHERE id = $1', [expenseId, splitMode]);
      return true;
    });
  }

  // Отмена записи её автором. null — уже отменена или чужая
  async deleteExpense(expenseId, userId) {
    const result = await this.query(`
      UPDATE group_expenses SET deleted_at = NOW() WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL RETURNING *`, [expenseId, userId]);
    return result.rows[0] || null;
  }

  // Последняя своя неотменённая запись группы (для /undo)
  async lastOwnRecord(groupId, userId) {
    const result = await this.query(`
      SELECT id FROM group_expenses WHERE group_id = $1 AND created_by = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 1`, [groupId, userId]);
    return result.rows[0] ? this.getExpense(result.rows[0].id) : null;
  }

  // Все неотменённые записи с долями — для балансов (и пересчёта при смене валюты)
  async records(groupId) {
    const result = await this.query(`
      SELECT e.id, e.payer_id, e.amount_group AS amount,
        COALESCE(json_agg(json_build_object('user_id', s.user_id, 'share', s.share)) FILTER (WHERE s.user_id IS NOT NULL), '[]') AS shares
      FROM group_expenses e
      LEFT JOIN group_expense_shares s ON s.expense_id = e.id
      WHERE e.group_id = $1 AND e.deleted_at IS NULL
      GROUP BY e.id ORDER BY e.id`, [groupId]);
    return result.rows;
  }

  // История: последние записи (и отменённые — помечены), с числом долей
  async history(groupId, limit, offset) {
    const result = await this.query(`
      SELECT e.*, (SELECT COUNT(*) FROM group_expense_shares s WHERE s.expense_id = e.id)::int AS share_count,
        (SELECT s.user_id FROM group_expense_shares s WHERE s.expense_id = e.id LIMIT 1) AS first_share_user,
        COUNT(*) OVER() AS total_count
      FROM group_expenses e WHERE e.group_id = $1 AND e.deleted_at IS NULL
      ORDER BY e.created_at DESC, e.id DESC LIMIT $2 OFFSET $3`, [groupId, limit, offset]);
    return result.rows;
  }

  // За месяц (since — начало месяца): обычные траты (не «рассчитались» и не итог чека, отменённые не в счёт) и
  // начатые дележи чеков (кроме отменённых)
  async monthUsage(groupId, since) {
    const result = await this.query(`
      SELECT
        (SELECT COUNT(*) FROM group_expenses WHERE group_id = $1 AND kind = 'expense' AND split_mode IN ('equal', 'exact')
           AND deleted_at IS NULL AND created_at >= $2)::int AS expenses,
        (SELECT COUNT(*) FROM group_splits WHERE group_id = $1 AND status <> 'canceled' AND created_at >= $2)::int AS splits`,
    [groupId, since]);
    return result.rows[0];
  }

  // «📥 Моя доля → в личные» один раз. null — уже скопирована или доли нет
  async markCopied(expenseId, userId, personalExpenseId) {
    const result = await this.query(`
      UPDATE group_expense_shares SET copied_expense_id = $3
      WHERE expense_id = $1 AND user_id = $2 AND copied_expense_id IS NULL RETURNING *`, [expenseId, userId, personalExpenseId]);
    return result.rows[0] || null;
  }

  // ---------- Делёж чека ----------

  async createSplit({ groupId, token, payerId, merchant, currency, items, warn = false, sourceReceiptId = null }) {
    const result = await this.query(`
      INSERT INTO group_splits (group_id, token, payer_id, merchant, currency, items, warn, source_receipt_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [groupId, token, payerId, merchant, currency, JSON.stringify(items), warn, sourceReceiptId]);
    return result.rows[0];
  }

  async getSplit(splitId) {
    const result = await this.query('SELECT * FROM group_splits WHERE id = $1', [splitId]);
    return result.rows[0] || null;
  }

  async getSplitByToken(token) {
    const result = await this.query('SELECT * FROM group_splits WHERE token = $1', [token]);
    return result.rows[0] || null;
  }

  async setSplitMessage(splitId, chatId, messageId) {
    await this.query('UPDATE group_splits SET chat_id = $2, message_id = $3 WHERE id = $1', [splitId, chatId, messageId]);
  }

  async setSplitPage(splitId, page) {
    await this.query('UPDATE group_splits SET page = $2 WHERE id = $1', [splitId, page]);
  }

  async getClaims(splitId) {
    const result = await this.query('SELECT item_id, user_id FROM group_split_claims WHERE split_id = $1 ORDER BY created_at, user_id', [splitId]);
    return result.rows.map(row => ({ itemId: Number(row.item_id), userId: Number(row.user_id) }));
  }

  // Отметить/снять позицию. Строка дележа блокируется FOR SHARE: закрытие (FOR UPDATE) ждёт отметки и не теряет её.
  // → { status: 'claimed' | 'unclaimed' | 'closed' | 'missing' }
  async toggleClaim(splitId, itemId, userId) {
    return this.transaction(async (client) => {
      const split = await client.query('SELECT status FROM group_splits WHERE id = $1 FOR SHARE', [splitId]);
      if (!split.rowCount) return { status: 'missing' };
      if (split.rows[0].status !== 'open') return { status: split.rows[0].status };
      const removed = await client.query('DELETE FROM group_split_claims WHERE split_id = $1 AND item_id = $2 AND user_id = $3', [splitId, itemId, userId]);
      if (!removed.rowCount) {
        await client.query('INSERT INTO group_split_claims (split_id, item_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [splitId, itemId, userId]);
      }
      await client.query('UPDATE group_splits SET dirty = TRUE WHERE id = $1', [splitId]);
      return { status: removed.rowCount ? 'unclaimed' : 'claimed' };
    });
  }

  async setDirty(splitId, dirty) {
    await this.query('UPDATE group_splits SET dirty = $2 WHERE id = $1', [splitId, dirty]);
  }

  // Сообщения дележей, не перерисованные до перезапуска
  async listDirtySplits() {
    const result = await this.query('SELECT * FROM group_splits WHERE dirty AND message_id IS NOT NULL ORDER BY id LIMIT 200');
    return result.rows;
  }

  // Закрыть делёж: build(split, claims) → данные траты (addExpense) по отметкам на момент закрытия; одна транзакция.
  // → { status: 'closed', split, expenseId } | { status: 'closed_already' | 'canceled' | 'missing' | 'forbidden' }
  async closeSplit(splitId, userId, build) {
    return this.transaction(async (client) => {
      const locked = await client.query('SELECT * FROM group_splits WHERE id = $1 FOR UPDATE', [splitId]);
      const split = locked.rows[0];
      if (!split) return { status: 'missing' };
      if (split.status === 'closed') return { status: 'closed_already', split };
      if (split.status === 'canceled') return { status: 'canceled', split };
      if (Number(split.payer_id) !== Number(userId)) return { status: 'forbidden', split };
      const claims = await client.query('SELECT item_id, user_id FROM group_split_claims WHERE split_id = $1 ORDER BY created_at, user_id', [splitId]);
      const data = await build(split, claims.rows.map(row => ({ itemId: Number(row.item_id), userId: Number(row.user_id) })));
      const created = await client.query(`
        INSERT INTO group_expenses (group_id, kind, payer_id, created_by, amount, currency, amount_group, description, split_mode, split_id, message_id)
        VALUES ($1, 'expense', $2, $2, $3, $4, $5, $6, 'receipt', $7, $8) RETURNING id`,
      [split.group_id, split.payer_id, data.amount, split.currency, data.amountGroup, data.description, splitId, split.message_id]);
      const expenseId = created.rows[0].id;
      await this.insertShares(client, expenseId, data.shares);
      const closed = await client.query(`
        UPDATE group_splits SET status = 'closed', closed_at = NOW(), expense_id = $2, dirty = FALSE WHERE id = $1 RETURNING *`, [splitId, expenseId]);
      return { status: 'closed', split: closed.rows[0], expenseId };
    });
  }

  async cancelSplit(splitId, userId) {
    const result = await this.query(`
      UPDATE group_splits SET status = 'canceled', closed_at = NOW(), dirty = FALSE
      WHERE id = $1 AND payer_id = $2 AND status = 'open' RETURNING *`, [splitId, userId]);
    return result.rows[0] || null;
  }

  // ---------- Вопросы бота в чате (ответ — сумма, доли, фото) ----------

  async addPrompt(chatId, messageId, userId, kind, refId = null) {
    await this.query(`
      INSERT INTO group_prompts (chat_id, message_id, user_id, kind, ref_id) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chat_id, message_id) DO UPDATE SET user_id = EXCLUDED.user_id, kind = EXCLUDED.kind, ref_id = EXCLUDED.ref_id, created_at = NOW()`,
    [chatId, messageId, userId, kind, refId]);
    // Старые вопросы больше не нужны
    await this.query("DELETE FROM group_prompts WHERE created_at < NOW() - INTERVAL '2 days'");
  }

  // Вопрос, на который ответили (не старше суток)
  async getPrompt(chatId, messageId) {
    const result = await this.query(`
      SELECT * FROM group_prompts WHERE chat_id = $1 AND message_id = $2 AND created_at > NOW() - INTERVAL '1 day'`, [chatId, messageId]);
    return result.rows[0] || null;
  }

  async deletePrompt(chatId, messageId) {
    await this.query('DELETE FROM group_prompts WHERE chat_id = $1 AND message_id = $2', [chatId, messageId]);
  }

  // ---------- «🎫 Пропуск для группы» ----------

  // Оплата пропуска: повторная доставка того же платежа ничего не меняет (UNIQUE telegram_payment_id).
  // Срок прибавляется к действующему пропуску, истёкший начинается заново. → { duplicate, passUntil }
  async addPass({ groupId, userId, stars, days, chargeId }) {
    return this.transaction(async (client) => {
      const inserted = await client.query(`
        INSERT INTO group_passes (group_id, user_id, stars, days, telegram_payment_id) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (telegram_payment_id) DO NOTHING RETURNING id`, [groupId, userId, stars, days, chargeId]);
      if (!inserted.rowCount) return { duplicate: true };
      const updated = await client.query(`
        UPDATE group_ledgers SET pass_until = GREATEST(COALESCE(pass_until, NOW()), NOW()) + make_interval(days => $2)
        WHERE id = $1 RETURNING pass_until`, [groupId, days]);
      return { duplicate: false, passUntil: updated.rows[0] ? updated.rows[0].pass_until : null };
    });
  }

  async getPassByChargeId(chargeId) {
    const result = await this.query('SELECT * FROM group_passes WHERE telegram_payment_id = $1', [chargeId]);
    return result.rows[0] || null;
  }

  // Возврат: срок покупки вычитается из пропуска. null — платежа нет; { alreadyRefunded } — уже возвращён
  async refundPass(chargeId) {
    return this.transaction(async (client) => {
      const pass = await client.query('SELECT * FROM group_passes WHERE telegram_payment_id = $1 FOR UPDATE', [chargeId]);
      if (!pass.rowCount) return null;
      const row = pass.rows[0];
      if (row.status === 'refunded') return { alreadyRefunded: true, pass: row };
      await client.query("UPDATE group_passes SET status = 'refunded', refunded_at = NOW() WHERE id = $1", [row.id]);
      const updated = await client.query(`
        UPDATE group_ledgers SET pass_until = CASE WHEN pass_until > NOW() THEN pass_until - make_interval(days => $2) ELSE pass_until END
        WHERE id = $1 RETURNING pass_until`, [row.group_id, row.days]);
      return { alreadyRefunded: false, pass: row, passUntil: updated.rows[0] ? updated.rows[0].pass_until : null };
    });
  }
}

module.exports = GroupRepository;
