const crypto = require('crypto');
const logger = require('../../utils/logger');
const { addDays } = require('../../utils/period');
const { USER_LIMITS } = require('../../utils/constants');
const AssistantService = require('../../services/AssistantService');

// «🤖 Спроси бота» в Mini App: тот же AssistantService, что у бота (проверки, лимиты дня и вызовов модели, один
// вопрос за раз — общий с ботом, учёт в assistant_questions). Ответ считается в фоне, как в боте: POST ставит
// вопрос и сразу возвращает id, клиент опрашивает GET (долгий запрос WebView держит плохо).
// Ответы живут в памяти процесса JOB_TTL_MS — переписка только на время экрана; перезапуск теряет недосчитанный ответ
const JOB_TTL_MS = 15 * 60 * 1000;
const ANSWER_ID = /^\d{1,12}$/;

// Кнопка под ответом бота → экран приложения. «🤖 Ещё вопрос» и «🙅 Не то» — свои элементы экрана, не ссылки
function linkFor(callback, today) {
  const [action, ...args] = String(callback || '').split('|');
  const offset = (value) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n !== 0 ? `?offset=${n}` : '';
  };
  switch (action) {
    case 'ov': return `/overview${offset(args[0])}`;
    case 'oc': return /^\d+$/.test(args[0] || '') ? `/overview/category/${args[0]}${offset(args[1])}` : null;
    case 'dy': return `/today?date=${addDays(today, parseInt(args[0], 10) || 0)}`;
    case 'income_menu': return '/income';
    case 'sv': return '/savings';
    case 'pls': return '/plans/subscriptions';
    case 'bg_menu': return '/budgets';
    case 'premium_subscription': return '/premium';
    case 'pl': return '/plans';
    case 'tax': return /^\d{4}$/.test(args[0] || '') ? `/tax?year=${args[0]}` : '/tax';
    default: return null;
  }
}

// Первая кнопка ответа, у которой есть экран в приложении: { path, label } (подпись без эмодзи в начале)
function answerLink(keyboard, today) {
  for (const button of (keyboard || []).flat()) {
    const path = linkFor(button.callback_data, today);
    if (path) return { path, label: String(button.text || '').replace(/^[^\p{L}\p{N}]+/u, '').trim() };
  }
  return null;
}

// Markdown бота (*жирный*, _курсив_, `моноширинный`, \-экранирование) → куски { text, bold?, italic? } —
// клиент рисует их узлами, без HTML. Непарный знак остаётся текстом
function markdownParts(text) {
  const source = String(text || '');
  const parts = [];
  const style = { bold: false, italic: false, code: false };
  let buffer = '';
  const flush = () => {
    if (!buffer) return;
    const part = { text: buffer };
    if (style.bold) part.bold = true;
    if (style.italic) part.italic = true;
    parts.push(part);
    buffer = '';
  };
  const closes = (marker, from) => {
    for (let j = from; j < source.length; j++) {
      if (source[j] === '\\') j++;
      else if (source[j] === marker) return true;
    }
    return false;
  };
  const toggles = { '*': 'bold', _: 'italic', '`': 'code' };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\\' && /[_*`[]/.test(source[i + 1] || '')) {
      buffer += source[++i];
      continue;
    }
    const key = toggles[c];
    if (key && (!style.code || key === 'code') && (style[key] || closes(c, i + 1))) {
      flush();
      style[key] = !style[key];
      continue;
    }
    buffer += c;
  }
  flush();
  return parts;
}

function limitView(limit) {
  if (!limit) return null;
  return {
    used: limit.used,
    limit: limit.limit,
    remaining: limit.remaining,
    isPremium: !!limit.isPremium,
    premiumLimit: USER_LIMITS.premium.MAX_ASSISTANT_QUESTIONS_PER_DAY
  };
}

function jobView(job) {
  return {
    id: job.id,
    question: job.question,
    status: job.status,
    position: job.position || null,
    answer: job.answer || null,
    parts: job.text ? markdownParts(job.text) : null,
    limit: job.limit || null
  };
}

module.exports = (router, { get, http }) => {
  const jobs = new Map(); // id → { id, userId, question, status: thinking|answered|failed, … }

  const sweep = (now = Date.now()) => {
    for (const [id, job] of jobs) if (now - job.created > JOB_TTL_MS) jobs.delete(id);
  };
  const pendingOf = (userId) => [...jobs.values()].find(job => job.userId === userId && job.status === 'thinking') || null;

  // Ответ в фоне: место в очереди к нейросети — в job.position, итог — ответ или текст «без ответа»
  async function run(job, ctx, example) {
    const service = get('assistantService');
    try {
      const result = await service.answer(job.userId, job.question, {
        lang: ctx.lang,
        example,
        onStatus: ({ position }) => { job.position = position || null; }
      });
      if (result.status === 'answered') {
        job.answer = { id: result.questionId, parts: markdownParts(result.text), link: answerLink(result.keyboard, ctx.today) };
        job.status = 'answered';
      } else {
        logger.info('Assistant did not answer', { userId: job.userId, status: result.status, source: result.source, position: result.position });
        job.text = AssistantService.failureMessage(result, ctx.t);
        job.status = 'failed';
      }
    } catch (error) {
      logger.error('Assistant answer failed', { userId: job.userId, error: error.message, stack: error.stack });
      job.text = ctx.t('ai_error');
      job.status = 'failed';
    }
    job.position = null;
    job.limit = limitView(await service.checkLimit(job.userId, ctx.timezone).catch(() => null));
  }

  // Экран: примеры вопросов на языке пользователя, сколько вопросов осталось сегодня, недосчитанный вопрос (если
  // экран открыли заново, пока бот думает)
  router.get('/assistant', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const limit = await get('assistantService').checkLimit(req.userId, ctx.timezone);
    const pending = pendingOf(req.userId);
    res.json({
      examples: AssistantService.examples(ctx.t),
      maxLength: AssistantService.MAX_QUESTION_LENGTH,
      limit: limitView(limit),
      pending: pending ? jobView(pending) : null
    });
  }));

  // Вопрос: { question } или { example: 1–6 } (готовое намерение, как кнопка-пример в боте) → 202 { id, status }.
  // 400 assistant_empty / assistant_too_long, 409 assistant_busy (ещё думаем над прошлым — здесь или в боте),
  // сверх дневного лимита: бесплатно — 402 (премиум), премиум — 429 assistant_limit; text — сообщение бота
  router.post('/assistant/questions', http.wrap(async (req, res) => {
    const ctx = await req.ctx();
    const body = req.body || {};
    let question;
    let example = null;
    if (body.example !== undefined && body.example !== null) {
      example = http.int(body.example, { min: 1, max: Object.keys(AssistantService.EXAMPLE_INTENTS).length, code: 'assistant_example' });
      question = ctx.t(`ai_example_${example}`);
    } else {
      const prepared = AssistantService.prepareQuestion(typeof body.question === 'string' ? body.question : '');
      if (prepared.error) throw http.badRequest(`assistant_${prepared.error}`, prepared.error === 'too_long' ? { max: AssistantService.MAX_QUESTION_LENGTH } : null);
      question = prepared.question;
    }
    const turns = AssistantService.turns;
    if (!turns.claim(req.userId)) throw new http.HttpError(409, 'assistant_busy');
    let started = false;
    try {
      const limit = await get('assistantService').checkLimit(req.userId, ctx.timezone);
      if (!limit.remaining) {
        const text = AssistantService.limitMessage(limit, ctx.t);
        if (limit.isPremium) throw new http.HttpError(429, 'assistant_limit', { text, limit: limitView(limit) });
        throw new http.HttpError(402, 'premium_required', { feature: 'assistant', text, limit: limitView(limit) });
      }
      const now = Date.now();
      sweep(now);
      const job = { id: crypto.randomBytes(9).toString('base64url'), userId: req.userId, question, status: 'thinking', position: null, created: now };
      jobs.set(job.id, job);
      turns.track(req.userId, run(job, ctx, example));
      started = true;
      res.status(202).json(jobView(job));
    } finally {
      if (!started) turns.release(req.userId);
    }
  }));

  // Опрос: thinking (с местом в очереди) → answered { answer: { id, parts, link } } | failed { parts }, + limit
  router.get('/assistant/questions/:id', http.wrap(async (req, res) => {
    const job = jobs.get(String(req.params.id));
    if (!job || job.userId !== req.userId) throw http.notFound();
    res.json(jobView(job));
  }));

  // «🙅 Не то»: ответ не в счёт дневного лимита (не больше раза в день) → { result: marked | used | done };
  // чужой или несуществующий ответ — 404
  router.post('/assistant/answers/:id/wrong', http.wrap(async (req, res) => {
    if (!ANSWER_ID.test(String(req.params.id))) throw http.notFound('assistant_answer');
    const result = await get('assistantService').markWrong(req.userId, Number(req.params.id));
    if (result === 'missing') throw http.notFound('assistant_answer');
    res.json({ result });
  }));
};

module.exports.linkFor = linkFor;
module.exports.markdownParts = markdownParts;
