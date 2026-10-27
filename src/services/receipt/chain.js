// Цепочка провайдеров распознавания: слоты RECEIPT_AI_1_*, RECEIPT_AI_2_*, … пробуются по порядку.
// Следующий слот берётся, только если текущий недоступен (не подключился, 5xx/429/401/403, не тот ответ, таймаут);
// «не чек» и «не разобрать» — это ответ, дальше не идём. Пример: Ollama на ПК в сети (часто выключен) →
// облачный API → Ollama на самом сервере (медленно, но всегда включена).
const logger = require('../../utils/logger');
const { ReceiptError } = require('./errors');
const { GeminiProvider, OpenAiCompatibleProvider } = require('./providers');
const { postJson, postJsonWithRetry } = require('./httpClient');

const MAX_SLOTS = 9;
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_CONNECT_TIMEOUT_MS = 2000;
const FIELDS = ['PROVIDER', 'BASE_URL', 'MODEL', 'API_KEY', 'LOCAL_ADDRESS', 'TIMEOUT_MS', 'CONNECT_TIMEOUT_MS'];
const FALL_THROUGH = new Set(['network', 'unavailable', 'quota', 'auth', 'not_configured']);

function positiveInt(value, fallback) {
  const number = parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

// Настройки слотов из env (без пустых). Старые RECEIPT_AI_* без номера — слот 1, если RECEIPT_AI_1_PROVIDER не задан;
// у старых настроек провайдер по умолчанию gemini, если задан ключ.
function parseSlots(env = process.env) {
  const read = (prefix) => Object.fromEntries(FIELDS.map(field => [field, String(env[`${prefix}${field}`] || '').trim()]));
  const slots = [];
  for (let n = 1; n <= MAX_SLOTS; n++) {
    let values = read(`RECEIPT_AI_${n}_`);
    if (n === 1 && !values.PROVIDER) {
      values = read('RECEIPT_AI_');
      if (!values.PROVIDER && values.API_KEY) values.PROVIDER = 'gemini';
    }
    if (!values.PROVIDER) continue;
    slots.push({
      slot: n,
      provider: values.PROVIDER.toLowerCase(),
      baseUrl: values.BASE_URL || undefined,
      model: values.MODEL || undefined,
      apiKey: values.API_KEY,
      localAddress: values.LOCAL_ADDRESS || undefined,
      timeoutMs: positiveInt(values.TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
      connectTimeoutMs: positiveInt(values.CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS)
    });
  }
  return slots;
}

function createSlotProvider(config) {
  const options = { ...config, post: postJson };
  let provider = null;
  if (config.provider === 'gemini') provider = new GeminiProvider(options);
  else if (config.provider === 'openai') provider = new OpenAiCompatibleProvider(options);
  if (!provider || !provider.configured) {
    logger.warn('Receipt AI slot skipped: incomplete settings', { slot: config.slot, provider: config.provider });
    return null;
  }
  provider.slot = config.slot;
  return provider;
}

class ChainProvider {
  constructor(providers) {
    this.name = 'chain';
    this.providers = providers;
  }

  get configured() {
    return this.providers.length > 0;
  }

  // HEIC понимает только Gemini — принимаем, если все слоты его понимают
  get acceptsHeic() {
    return this.configured && this.providers.every(provider => provider.acceptsHeic);
  }

  async recognize(input) {
    if (!this.configured) throw new ReceiptError('not_configured');
    let lastError = null;
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        const raw = await provider.recognize(input);
        logger.info('Receipt AI slot served', { slot: provider.slot, provider: provider.name, model: provider.model, ms: Date.now() - started });
        return raw;
      } catch (error) {
        const receiptError = error instanceof ReceiptError ? error : new ReceiptError('unavailable', error.message);
        logger.warn('Receipt AI slot failed', { slot: provider.slot, provider: provider.name, model: provider.model, code: receiptError.code, error: receiptError.message, ms: Date.now() - started });
        if (!FALL_THROUGH.has(receiptError.code)) throw receiptError;
        lastError = receiptError;
      }
    }
    throw lastError;
  }
}

// Цепочка из env. Повтор при 429/5xx — только у последнего слота: у остальных быстрее перейти к следующему
function createProviderFromEnv(env = process.env) {
  const providers = parseSlots(env).map(createSlotProvider).filter(Boolean);
  if (providers.length) providers[providers.length - 1].post = postJsonWithRetry;
  return new ChainProvider(providers);
}

module.exports = { parseSlots, createSlotProvider, createProviderFromEnv, ChainProvider, DEFAULT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS };
