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

  // Вопросы, на которые бот ответил в этот локальный день (для дневного лимита; «🙅 Не то» возвращает вопрос в лимит)
  async countAnswered(userId, localDate) {
    const result = await this.query(
      'SELECT COUNT(*)::int AS count FROM assistant_questions WHERE user_id = $1 AND local_date = $2::date AND answered',
      [userId, localDate]
    );
    return result.rows[0].count;
  }

  // Запросы к нейросети за локальный день — с ответом и без (дневной потолок вызовов модели)
  async countModelCalls(userId, localDate) {
    const result = await this.query(
      'SELECT COALESCE(SUM(model_calls), 0)::int AS count FROM assistant_questions WHERE user_id = $1 AND local_date = $2::date',
      [userId, localDate]
    );
    return result.rows[0].count;
  }

  // Текст вопроса не храним: только тип ответа (или статус, если ответа нет), кто разобрал вопрос, сколько это
  // заняло и сколько раз спросили модель. Возвращает id строки
  async logQuestion(userId, localDate, { intentType, source, ms, answered = true, modelCalls = 0 }) {
    const result = await this.query(
      `INSERT INTO assistant_questions (user_id, local_date, intent_type, source, duration_ms, answered, model_calls)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, localDate, String(intentType).slice(0, 30), String(source).slice(0, 10), ms, answered, modelCalls]
    );
    return result.rows[0].id;
  }

  // «🙅 Не то»: ответ не засчитывается в дневной лимит (вызовы модели остаются). true — отметили сейчас
  async markWrong(userId, questionId) {
    const result = await this.query(
      'UPDATE assistant_questions SET answered = FALSE WHERE id = $1 AND user_id = $2 AND answered RETURNING id',
      [questionId, userId]
    );
    return result.rowCount > 0;
  }
}

AssistantRepository.likePattern = likePattern;

module.exports = AssistantRepository;
