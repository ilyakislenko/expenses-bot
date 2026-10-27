// Цепочка провайдеров распознавания: слоты RECEIPT_AI_1_*, RECEIPT_AI_2_*, … пробуются по порядку.
// Следующий слот берётся, только если текущий недоступен (не подключился, 5xx/429/401/403, не тот ответ, таймаут);
// «не чек» и «не разобрать» — это ответ, дальше не идём. Пример: Ollama на ПК в сети (часто выключен) →
// облачный API → Ollama на самом сервере (медленно, но всегда включена).
// У локальных слотов (адрес в локальной сети) по умолчанию одно распознавание за раз — остальные ждут в очереди.
const logger = require('../../utils/logger');
const { ReceiptError } = require('./errors');
const { GeminiProvider, OpenAiCompatibleProvider } = require('./providers');
const { postJson, postJsonWithRetry } = require('./httpClient');

const MAX_SLOTS = 9;
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_CONNECT_TIMEOUT_MS = 2000;
const FIELDS = ['PROVIDER', 'BASE_URL', 'MODEL', 'API_KEY', 'LOCAL_ADDRESS', 'TIMEOUT_MS', 'CONNECT_TIMEOUT_MS', 'CONCURRENCY'];
const FALL_THROUGH = new Set(['network', 'unavailable', 'quota', 'auth', 'not_configured']);

function positiveInt(value, fallback) {
  const number = parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

// Адрес на этой машине или в локальной сети (своя видеокарта — одна модель за раз)
function isLocalUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '::1' || /\.(local|lan)$/i.test(host)
      || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  } catch (error) {
    return false;
  }
}

// Настройки слотов из env (без пустых). Старые RECEIPT_AI_* без номера — слот 1, если RECEIPT_AI_1_PROVIDER не задан;
// у старых настроек провайдер по умолчанию gemini, если задан ключ.
// CONCURRENCY — сколько распознаваний одновременно (0 — без ограничения); по умолчанию 1 у локальных адресов
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
    const provider = values.PROVIDER.toLowerCase();
    const concurrency = parseInt(values.CONCURRENCY, 10);
    slots.push({
      slot: n,
      provider,
      baseUrl: values.BASE_URL || undefined,
      model: values.MODEL || undefined,
      apiKey: values.API_KEY,
      localAddress: values.LOCAL_ADDRESS || undefined,
      timeoutMs: positiveInt(values.TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
      connectTimeoutMs: positiveInt(values.CONNECT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS),
      concurrency: Number.isInteger(concurrency) && concurrency >= 0
        ? concurrency
        : (provider === 'openai' && isLocalUrl(values.BASE_URL) ? 1 : 0)
    });
  }
  return slots;
}

// Не больше max задач одновременно (0 — без ограничения), остальные — в очереди по порядку.
// onQueued(position): позиция в очереди при постановке и при каждом сдвиге, 0 — задача началась
class Limiter {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }

  run(task, onQueued = () => {}) {
    if (!this.max || this.active < this.max) return this.start(task);
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, onQueued });
      onQueued(this.queue.length);
    });
  }

  async start(task) {
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      this.next();
    }
  }

  next() {
    if (!this.queue.length || (this.max && this.active >= this.max)) return;
    const entry = this.queue.shift();
    entry.onQueued(0);
    this.queue.forEach((waiting, index) => waiting.onQueued(index + 1));
    this.start(entry.task).then(entry.resolve, entry.reject);
  }
}

// Провайдер слота; null — слот не настроен до конца (gemini без ключа, openai без адреса или модели, неизвестный тип)
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
  provider.limiter = new Limiter(config.concurrency || 0);
  provider.isLocal = config.provider === 'openai' && isLocalUrl(config.baseUrl);
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

  // input: { image, mimeType, prompt, onStatus({ position, local }) } — onStatus сообщает место в очереди занятого слота
  // (position > 0) и начало распознавания на слоте (position 0); local — слот в локальной сети (медленнее облака)
  async recognize(input) {
    if (!this.configured) throw new ReceiptError('not_configured');
    const onStatus = input.onStatus || (() => {});
    let lastError = null;
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        const limiter = provider.limiter || new Limiter(0);
        const local = !!provider.isLocal;
        const raw = await limiter.run(() => {
          onStatus({ position: 0, local });
          return provider.recognize(input);
        }, position => position && onStatus({ position, local }));
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

module.exports = {
  parseSlots, createSlotProvider, createProviderFromEnv, ChainProvider, Limiter, isLocalUrl,
  DEFAULT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS
};
