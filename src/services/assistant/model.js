// Модель для вопросов боту: слоты ASSISTANT_AI_1_*, ASSISTANT_AI_2_*, … (те же поля, что у RECEIPT_AI_*: PROVIDER,
// BASE_URL, MODEL, API_KEY, LOCAL_ADDRESS, TIMEOUT_MS, CONNECT_TIMEOUT_MS, CONCURRENCY). Не заданы — берутся слоты
// распознавания чеков (по умолчанию Ollama на сервере) с таймаутом ASSISTANT_AI_TIMEOUT_MS (20 с: разбор вопроса —
// короткий JSON, дольше — модель перегружена). ASSISTANT_AI_1_PROVIDER=off — без модели, только быстрый разбор.
// Очередь к локальному адресу общая с чеками (receipt/chain.js limiterFor), вопросы в ней — впереди чеков.
const { parseSlots, createChain } = require('../receipt/chain');

const DEFAULT_TIMEOUT_MS = 20000;

function createAssistantProvider(env = process.env) {
  const own = parseSlots(env, 'ASSISTANT_AI');
  if (own.some(slot => slot.provider === 'off')) return createChain([], 'Assistant AI');
  if (own.length) return createChain(own, 'Assistant AI');
  const timeout = parseInt(env.ASSISTANT_AI_TIMEOUT_MS, 10) > 0 ? parseInt(env.ASSISTANT_AI_TIMEOUT_MS, 10) : DEFAULT_TIMEOUT_MS;
  return createChain(parseSlots(env, 'RECEIPT_AI').map(slot => ({ ...slot, timeoutMs: Math.min(slot.timeoutMs, timeout) })), 'Assistant AI');
}

module.exports = { createAssistantProvider, DEFAULT_TIMEOUT_MS };
