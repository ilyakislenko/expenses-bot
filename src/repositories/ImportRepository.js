const BaseRepository = require('./BaseRepository');

const BATCH_SIZE = 500;

// Импорт банковских выписок: партия импорта (imports) и записанные из неё траты/доходы (import_id, import_hash).
// Даты операций — локальное время пользователя ('YYYY-MM-DD HH:MM:SS'), в created_at_utc переводятся в SQL по его поясу.
class ImportRepository extends BaseRepository {
  // Отпечатки, которые уже есть у пользователя (в тратах или доходах)
  async findExistingHashes(userId, hashes) {
    if (!hashes.length) return new Set();
    const query = `
      SELECT import_hash FROM expenses WHERE user_id = $1 AND import_hash = ANY($2::text[])
      UNION
      SELECT import_hash FROM incomes WHERE user_id = $1 AND import_hash = ANY($2::text[])
    `;
    const result = await this.query(query, [userId, hashes]);
    return new Set(result.rows.map(row => row.import_hash));
  }

  // Записи, сделанные не импортом, за локальные дни [startDay, endDay]: kind, день, сумма, валюта
  async getRecordedAmounts(userId, timezone, startDay, endDay) {
    const query = `
      SELECT 'expense' AS kind, to_char(created_at_utc AT TIME ZONE $2, 'YYYY-MM-DD') AS day, amount::text AS amount, currency
      FROM expenses
      WHERE user_id = $1 AND import_hash IS NULL
        AND created_at_utc >= ($3::date::timestamp AT TIME ZONE $2)
        AND created_at_utc < (($4::date + 1)::timestamp AT TIME ZONE $2)
      UNION ALL
      SELECT 'income' AS kind, to_char(created_at_utc AT TIME ZONE $2, 'YYYY-MM-DD') AS day, amount::text AS amount, currency
      FROM incomes
      WHERE user_id = $1 AND import_hash IS NULL
        AND created_at_utc >= ($3::date::timestamp AT TIME ZONE $2)
        AND created_at_utc < (($4::date + 1)::timestamp AT TIME ZONE $2)
    `;
    const result = await this.query(query, [userId, timezone, startDay, endDay]);
    return result.rows;
  }

  // Последняя категория трат с таким же описанием (без учёта регистра) — как при ручном вводе, но пачкой.
  // Map: описание (как передано) → category_id
  async getLastCategoriesForDescriptions(userId, descriptions) {
    if (!descriptions.length) return new Map();
    const query = `
      SELECT DISTINCT ON (input.description) input.description, e.category_id
      FROM unnest($2::text[]) AS input(description)
      JOIN expenses e ON e.user_id = $1 AND e.category_id IS NOT NULL
        AND LOWER(TRIM(e.description)) = LOWER(TRIM(input.description))
      ORDER BY input.description, e.created_at_utc DESC
    `;
    const result = await this.query(query, [userId, descriptions]);
    return new Map(result.rows.map(row => [row.description, row.category_id]));
  }

  // Одна транзакция: партия импорта, траты и доходы пачками. Операции с уже существующим отпечатком
  // пропускаются (ON CONFLICT). Ничего не добавлено — партия не создаётся (importId null).
  async createImport(userId, source, timezone, expenses, incomes) {
    return this.transaction(async (client) => {
      const created = await client.query('INSERT INTO imports (user_id, source) VALUES ($1, $2) RETURNING id', [userId, source]);
      const importId = created.rows[0].id;
      let expenseCount = 0;
      let incomeCount = 0;
      for (let i = 0; i < expenses.length; i += BATCH_SIZE) {
        const batch = expenses.slice(i, i + BATCH_SIZE);
        const result = await client.query(`
          INSERT INTO expenses (user_id, amount, description, category_id, currency, created_at_utc, import_id, import_hash)
          SELECT $1, t.amount, t.description, t.category_id, t.currency, t.local_at AT TIME ZONE $3, $2, t.hash
          FROM unnest($4::numeric[], $5::text[], $6::int[], $7::text[], $8::timestamp[], $9::text[])
            AS t(amount, description, category_id, currency, local_at, hash)
          ON CONFLICT (user_id, import_hash) WHERE import_hash IS NOT NULL DO NOTHING
        `, [userId, importId, timezone,
          batch.map(op => op.amount), batch.map(op => op.description || null), batch.map(op => op.categoryId),
          batch.map(op => op.currency), batch.map(op => op.date), batch.map(op => op.hash)]);
        expenseCount += result.rowCount;
      }
      for (let i = 0; i < incomes.length; i += BATCH_SIZE) {
        const batch = incomes.slice(i, i + BATCH_SIZE);
        const result = await client.query(`
          INSERT INTO incomes (user_id, amount, description, currency, created_at_utc, import_id, import_hash)
          SELECT $1, t.amount, t.description, t.currency, t.local_at AT TIME ZONE $3, $2, t.hash
          FROM unnest($4::numeric[], $5::text[], $6::text[], $7::timestamp[], $8::text[])
            AS t(amount, description, currency, local_at, hash)
          ON CONFLICT (user_id, import_hash) WHERE import_hash IS NOT NULL DO NOTHING
        `, [userId, importId, timezone,
          batch.map(op => op.amount), batch.map(op => op.description || null),
          batch.map(op => op.currency), batch.map(op => op.date), batch.map(op => op.hash)]);
        incomeCount += result.rowCount;
      }
      if (!expenseCount && !incomeCount) {
        await client.query('DELETE FROM imports WHERE id = $1', [importId]);
        return { importId: null, expenses: 0, incomes: 0 };
      }
      return { importId, expenses: expenseCount, incomes: incomeCount };
    });
  }

  // Отмена импорта: удаляются ровно записи этой партии (до самой партии: её удаление обнуляет import_id).
  // null — партии нет (уже отменена или чужая)
  async deleteImport(userId, importId) {
    return this.transaction(async (client) => {
      const expenses = await client.query('DELETE FROM expenses WHERE user_id = $1 AND import_id = $2', [userId, importId]);
      const incomes = await client.query('DELETE FROM incomes WHERE user_id = $1 AND import_id = $2', [userId, importId]);
      const found = await client.query('DELETE FROM imports WHERE id = $1 AND user_id = $2', [importId, userId]);
      if (!found.rowCount) return null;
      return { expenses: expenses.rowCount, incomes: incomes.rowCount };
    });
  }
}

module.exports = ImportRepository;
