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
// busy — у этого пользователя уже есть такая задача в очереди слота: другой слот (облако) может её взять
const FALL_THROUGH = new Set(['network', 'unavailable', 'quota', 'auth', 'not_configured', 'busy']);

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

// Настройки слотов из env (без пустых). prefix — семейство переменных: RECEIPT_AI (чеки) или ASSISTANT_AI (вопросы боту).
// Старые RECEIPT_AI_* без номера — слот 1, если RECEIPT_AI_1_PROVIDER не задан; у старых настроек провайдер
// по умолчанию gemini, если задан ключ.
// CONCURRENCY — сколько запросов одновременно (0 — без ограничения); по умолчанию 1 у локальных адресов
function parseSlots(env = process.env, prefix = 'RECEIPT_AI') {
  const read = (base) => Object.fromEntries(FIELDS.map(field => [field, String(env[`${base}${field}`] || '').trim()]));
  const slots = [];
  for (let n = 1; n <= MAX_SLOTS; n++) {
    let values = read(`${prefix}_${n}_`);
    if (n === 1 && !values.PROVIDER && prefix === 'RECEIPT_AI') {
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

// Задачи вида kind: вопросы боту (assistant) короткие — встают в очереди перед долгими чеками (receipt), внутри вида —
// по порядку. У одного пользователя (owner) не больше perOwner задач каждого вида в очереди и в работе: лишняя сразу
// получает ReceiptError('busy'), а не занимает общую модель.
const PRIORITY = { assistant: 1, receipt: 0 };
const PER_OWNER = 1;

// Не больше max задач одновременно (0 — без ограничения), остальные — в очереди (см. PRIORITY).
// onQueued(position): позиция в очереди при постановке и при каждом сдвиге. isCancelled() — задача больше не нужна:
// она убирается из очереди, не начинаясь (и не держит место пользователя).
class Limiter {
  constructor(max, { perOwner = PER_OWNER } = {}) {
    this.max = max;
    this.perOwner = perOwner;
    this.active = 0;
    this.queue = [];
    this.owners = new Map();
  }

  run(task, onQueued = () => {}, { kind = 'receipt', owner = null, isCancelled = () => false } = {}) {
    this.prune();
    const key = owner === null || owner === undefined || !this.perOwner ? null : `${kind}|${owner}`;
    if (key && (this.owners.get(key) || 0) >= this.perOwner) {
      return Promise.reject(new ReceiptError('busy', 'previous request of this user is still in the queue'));
    }
    this.hold(key, 1);
    return new Promise((resolve, reject) => {
      const entry = {
        task,
        onQueued,
        isCancelled,
        priority: PRIORITY[kind] || 0,
        resolve: (value) => { this.hold(key, -1); resolve(value); },
        reject: (error) => { this.hold(key, -1); reject(error); }
      };
      if (!this.max || this.active < this.max) {
        this.launch(entry);
        return;
      }
      let index = this.queue.length;
      while (index > 0 && this.queue[index - 1].priority < entry.priority) index--;
      this.queue.splice(index, 0, entry);
      this.notify();
    });
  }

  hold(key, delta) {
    if (!key) return;
    const count = (this.owners.get(key) || 0) + delta;
    if (count > 0) this.owners.set(key, count);
    else this.owners.delete(key);
  }

  launch(entry) {
    this.active++;
    let running;
    try {
      running = Promise.resolve(entry.task());
    } catch (error) {
      running = Promise.reject(error);
    }
    running.then(
      (value) => { this.active--; entry.resolve(value); this.next(); },
      (error) => { this.active--; entry.reject(error); this.next(); }
    );
  }

  // Отменённые задачи уходят из очереди сразу
  prune() {
    const before = this.queue.length;
    this.queue = this.queue.filter((entry) => {
      if (!entry.isCancelled()) return true;
      entry.reject(new ReceiptError('network', 'cancelled'));
      return false;
    });
    if (this.queue.length !== before) this.notify();
  }

  // Позиции сообщаются только при изменении
  notify() {
    this.queue.forEach((waiting, index) => {
      if (waiting.position === index + 1) return;
      waiting.position = index + 1;
      waiting.onQueued(index + 1);
    });
  }

  next() {
    this.prune();
    let started = false;
    while (this.queue.length && (!this.max || this.active < this.max)) {
      const entry = this.queue.shift();
      entry.onQueued(0);
      this.launch(entry);
      started = true;
    }
    if (started) this.notify();
  }
}

// Очередь на один адрес общая для всех цепочек процесса: чеки и вопросы боту к одной Ollama идут по очереди
// (видеокарта держит одну модель и считает один запрос за раз). Без ограничения — своя пустая очередь.
const sharedLimiters = new Map();
function limiterFor(config) {
  if (!config.concurrency) return new Limiter(0);
  let key = `${config.provider}|${config.baseUrl || ''}`;
  try {
    key = `${config.provider}|${new URL(config.baseUrl).host}`;
  } catch (error) {
    // адрес без схемы — ключ по строке
  }
  if (!sharedLimiters.has(key)) sharedLimiters.set(key, new Limiter(config.concurrency));
  return sharedLimiters.get(key);
}

// Провайдер слота; null — слот не настроен до конца (gemini без ключа, openai без адреса или модели, неизвестный тип)
function createSlotProvider(config, label = 'Receipt AI') {
  const options = { ...config, post: postJson };
  let provider = null;
  if (config.provider === 'gemini') provider = new GeminiProvider(options);
  else if (config.provider === 'openai') provider = new OpenAiCompatibleProvider(options);
  if (!provider || !provider.configured) {
    logger.warn(`${label} slot skipped: incomplete settings`, { slot: config.slot, provider: config.provider });
    return null;
  }
  provider.slot = config.slot;
  provider.limiter = limiterFor(config);
  provider.isLocal = config.provider === 'openai' && isLocalUrl(config.baseUrl);
  return provider;
}

class ChainProvider {
  constructor(providers, label = 'Receipt AI') {
    this.name = 'chain';
    this.providers = providers;
    this.label = label;
  }

  get configured() {
    return this.providers.length > 0;
  }

  // HEIC понимает только Gemini — принимаем, если все слоты его понимают
  get acceptsHeic() {
    return this.configured && this.providers.every(provider => provider.acceptsHeic);
  }

  // input: { image, mimeType, prompt, onStatus({ position, local }), owner } — onStatus сообщает место в очереди занятого
  // слота (position > 0) и начало распознавания на слоте (position 0); local — слот в локальной сети (медленнее облака);
  // owner — id пользователя (одна его задача каждого вида в очереди, см. Limiter)
  async recognize(input) {
    return this.run(input, provider => provider.recognize(input), 'receipt');
  }

  // Текстовый запрос с ответом JSON: input { messages, onStatus, isCancelled, owner }. isCancelled() — запрос больше не
  // нужен (вопрос дождался своего срока в очереди): место в очереди освобождается, не спрашивая модель
  async complete(input) {
    return this.run(input, provider => provider.complete(input), 'assistant');
  }

  async run(input, call, kind) {
    if (!this.configured) throw new ReceiptError('not_configured');
    const onStatus = input.onStatus || (() => {});
    const isCancelled = input.isCancelled || (() => false);
    let lastError = null;
    for (const provider of this.providers) {
      if (isCancelled()) throw new ReceiptError('network', 'cancelled');
      const started = Date.now();
      try {
        const limiter = provider.limiter || new Limiter(0);
        const local = !!provider.isLocal;
        const raw = await limiter.run(() => {
          if (isCancelled()) return Promise.reject(new ReceiptError('network', 'cancelled'));
          onStatus({ position: 0, local });
          return call(provider);
        }, position => position && onStatus({ position, local }), { kind, owner: input.owner, isCancelled });
        logger.info(`${this.label} slot served`, { slot: provider.slot, provider: provider.name, model: provider.model, ms: Date.now() - started });
        return raw;
      } catch (error) {
        const receiptError = error instanceof ReceiptError ? error : new ReceiptError('unavailable', error.message);
        logger.warn(`${this.label} slot failed`, { slot: provider.slot, provider: provider.name, model: provider.model, code: receiptError.code, error: receiptError.message, ms: Date.now() - started });
        if (!FALL_THROUGH.has(receiptError.code)) throw receiptError;
        lastError = receiptError;
      }
    }
    throw lastError;
  }
}

// Цепочка из env. Повтор при 429/5xx — только у последнего слота: у остальных быстрее перейти к следующему
function createProviderFromEnv(env = process.env) {
  return createChain(parseSlots(env));
}

function createChain(slots, label = 'Receipt AI') {
  const providers = slots.map(slot => createSlotProvider(slot, label)).filter(Boolean);
  if (providers.length) providers[providers.length - 1].post = postJsonWithRetry;
  return new ChainProvider(providers, label);
}

module.exports = {
  parseSlots, createSlotProvider, createProviderFromEnv, createChain, ChainProvider, Limiter, isLocalUrl, limiterFor,
  DEFAULT_TIMEOUT_MS, DEFAULT_CONNECT_TIMEOUT_MS
};
