const BaseRepository = require('./BaseRepository');

const MAX_ROWS = 50000;

// Поиск по описанию: подстрока без учёта регистра; % и _ из текста пользователя — буквально
function likePattern(term) {
  return `%${String(term).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

class AssistantRepository extends BaseRepository {
  // Траты пользователя за период [start, end) локальных дат — как в обзоре: свои траты, в том числе перенесённые
  // в семью. categoryNames — имена категорий (как группирует обзор), patterns — подстроки описания (любая из них).
  async findExpenses(userId, timezone, start, end, { categoryNames = [], terms = [] } = {}) {
    const result = await this.query(`
      SELECT e.id, e.amount::float AS amount, e.currency, e.description, e.created_at_utc,
             to_char(e.created_at_utc AT TIME ZONE $2, 'YYYY-MM-DD') AS local_date,
             c.id AS category_id, c.name AS category_name, c.icon AS category_icon
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
        AND (e.created_at_utc AT TIME ZONE $2) >= $3::date
        AND (e.created_at_utc AT TIME ZONE $2) < $4::date
        AND (cardinality($5::text[]) = 0 OR c.name = ANY($5::text[]))
        AND (cardinality($6::text[]) = 0 OR e.description ILIKE ANY($6::text[]))
      ORDER BY e.created_at_utc ASC
      LIMIT ${MAX_ROWS}
    `, [userId, timezone, start, end, categoryNames, terms.map(likePattern)]);
    return result.rows;
  }

  // Вопросы, на которые бот ответил в этот локальный день (для дневного лимита)
  async countAnswered(userId, localDate) {
    const result = await this.query(
      'SELECT COUNT(*)::int AS count FROM assistant_questions WHERE user_id = $1 AND local_date = $2::date',
      [userId, localDate]
    );
    return result.rows[0].count;
  }

  // Текст вопроса не храним: только тип ответа, кто разобрал вопрос и сколько это заняло
  async logAnswered(userId, localDate, { intentType, source, ms }) {
    await this.query(
      `INSERT INTO assistant_questions (user_id, local_date, intent_type, source, duration_ms)
       VALUES ($1, $2::date, $3, $4, $5)`,
      [userId, localDate, intentType, source, ms]
    );
  }
}

AssistantRepository.likePattern = likePattern;

module.exports = AssistantRepository;
