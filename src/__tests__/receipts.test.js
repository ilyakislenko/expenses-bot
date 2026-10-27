const http = require('http');
const { normalizeReceipt, resolveReceiptTime, localMonthStart, cleanName } = require('../services/receipt/normalize');
const { GeminiProvider, OpenAiCompatibleProvider, mapHttpError, parseModelJson } = require('../services/receipt/providers');
const { parseSlots, createProviderFromEnv, ChainProvider } = require('../services/receipt/chain');
const { RESPONSE_SCHEMA, buildPrompt } = require('../services/receipt/prompt');
const { postJson, postJsonWithRetry } = require('../services/receipt/httpClient');
const { ReceiptError } = require('../services/receipt/errors');
const ReceiptService = require('../services/ReceiptService');
const ReceiptHandlers = require('../handlers/ReceiptHandlers');
const LocalizationService = require('../services/LocalizationService');
const { SUPPORTED_CURRENCIES } = require('../config/currencies');

const categories = [
  { id: 1, names: ['Еда'] },
  { id: 2, names: ['Транспорт'] },
  { id: 6, names: ['Другое'] },
  { id: 50, names: ['Кофейни'] }
];
const normalize = (raw, options = {}) => normalizeReceipt(raw, {
  categories, fallbackCategoryId: 6, defaultCurrency: 'RUB', supportedCurrencies: SUPPORTED_CURRENCIES, ...options
});
const amounts = (receipt) => receipt.items.map(item => item.amount);
const sum = (receipt) => Math.round(receipt.items.reduce((s, item) => s + item.amount, 0) * 100) / 100;

describe('receipt JSON normalization', () => {
  it('reads numbers given as strings with commas and spaces, fills amount from price × quantity', () => {
    const receipt = normalize({
      is_receipt: true, merchant: 'ООО «Пятёрочка»', currency: '₽', total: '1 413,70',
      items: [
        { name: 'Сыр', quantity: '1', price: '1 234,50', amount: '1 234,50', category: 'Еда' },
        { name: 'Молоко 2,5%', quantity: '2', price: '89,60', category: 'еда' }
      ]
    });
    expect(receipt.currency).toBe('RUB');
    expect(amounts(receipt)).toEqual([1234.5, 179.2]);
    expect(receipt.items.map(item => item.categoryId)).toEqual([1, 1]);
    expect(receipt).toMatchObject({ merchant: 'Пятёрочка', total: 1413.7, itemsTotal: 1413.7, mismatch: false });
  });

  it('turns negative lines into a receipt discount and spreads it so items add up to the paid total', () => {
    const receipt = normalize({
      is_receipt: true, total: 270,
      items: [{ name: 'A', amount: 100 }, { name: 'B', amount: 200 }, { name: 'Скидка', amount: -30 }]
    });
    expect(amounts(receipt)).toEqual([90, 180]);
    expect(sum(receipt)).toBe(270);
    expect(receipt.mismatch).toBe(false);
  });

  it('applies an explicit receipt-level discount only when it brings items to the total', () => {
    expect(amounts(normalize({ is_receipt: true, total: 270, discount: 30, items: [{ name: 'A', amount: 100 }, { name: 'B', amount: 200 }] }))).toEqual([90, 180]);
    // Скидка уже учтена в суммах позиций — не вычитаем второй раз
    expect(amounts(normalize({ is_receipt: true, total: 300, discount: 30, items: [{ name: 'A', amount: 100 }, { name: 'B', amount: 200 }] }))).toEqual([100, 200]);
    // Итога нет — скидку всё равно распределяем
    expect(sum(normalize({ is_receipt: true, discount: 10, items: [{ name: 'A', amount: 60 }, { name: 'B', amount: 40 }] }))).toBe(90);
  });

  it('fixes rounding within 1% so the sum equals the printed total exactly', () => {
    const receipt = normalize({ is_receipt: true, total: 100, items: [{ name: 'A', amount: 33.33 }, { name: 'B', amount: 33.33 }, { name: 'C', amount: 33.33 }] });
    expect(sum(receipt)).toBe(100);
    expect(receipt.mismatch).toBe(false);
  });

  it('flags a total that differs from items by more than 1% and keeps item amounts', () => {
    const receipt = normalize({ is_receipt: true, total: 150, items: [{ name: 'A', amount: 100 }] });
    expect(amounts(receipt)).toEqual([100]);
    expect(receipt).toMatchObject({ mismatch: true, total: 150, itemsTotal: 100 });
  });

  it('drops zero and amount-less lines, cleans names, caps items at 100', () => {
    const receipt = normalize({
      is_receipt: true,
      items: [
        { name: '0012345 Молоко 2,5% 930г 4600000000000', amount: 89 },
        { name: 'Пакет', amount: 0 },
        { name: 'Без цены' },
        { name: '  "Хлеб"  ', price: 45 }
      ]
    });
    expect(receipt.items.map(item => [item.name, item.amount])).toEqual([['Молоко 2,5% 930г', 89], ['Хлеб', 45]]);
    const many = normalize({ is_receipt: true, items: Array.from({ length: 150 }, (_, i) => ({ name: `item ${i}`, amount: 1 })) });
    expect(many.items).toHaveLength(100);
    expect(cleanName('1. Кефир')).toBe('Кефир');
  });

  it('maps categories by the user\'s names in any case, unknown → «Другое»', () => {
    const receipt = normalize({ is_receipt: true, items: [
      { name: 'a', amount: 1, category: 'КОФЕЙНИ' },
      { name: 'b', amount: 1, category: 'Groceries' },
      { name: 'c', amount: 1 }
    ] });
    expect(receipt.items.map(item => item.categoryId)).toEqual([50, 6, 6]);
  });

  it('reads currency symbols and codes, defaults to the main currency, rejects unsupported currencies', () => {
    expect(normalize({ is_receipt: true, currency: '₸', items: [{ name: 'a', amount: 1 }] }).currency).toBe('KZT');
    expect(normalize({ is_receipt: true, currency: 'usd', items: [{ name: 'a', amount: 1 }] }).currency).toBe('USD');
    expect(normalize({ is_receipt: true, items: [{ name: 'a', amount: 1 }] }, { defaultCurrency: 'EUR' }).currency).toBe('EUR');
    expect(() => normalize({ is_receipt: true, currency: 'GBP', items: [{ name: 'a', amount: 1 }] })).toThrow(expect.objectContaining({ code: 'currency', params: { currency: 'GBP' } }));
  });

  it('reads the purchase date and time in several shapes', () => {
    expect(normalize({ is_receipt: true, date: '2026-10-25', time: '14:30', items: [{ name: 'a', amount: 1 }] })).toMatchObject({ date: '2026-10-25', time: '14:30' });
    expect(normalize({ is_receipt: true, date: '25.10.2026 9:05', items: [{ name: 'a', amount: 1 }] })).toMatchObject({ date: '2026-10-25', time: '09:05' });
    expect(normalize({ is_receipt: true, date: '2026-10-25T08:00:00', items: [{ name: 'a', amount: 1 }] })).toMatchObject({ time: '08:00' });
    expect(normalize({ is_receipt: true, date: 'вчера', items: [{ name: 'a', amount: 1 }] })).toMatchObject({ date: null, time: null });
  });

  it('rejects garbage and non-receipts', () => {
    expect(() => normalize(null)).toThrow(expect.objectContaining({ code: 'unreadable' }));
    expect(() => normalize('text')).toThrow(expect.objectContaining({ code: 'unreadable' }));
    expect(() => normalize([])).toThrow(expect.objectContaining({ code: 'unreadable' }));
    expect(() => normalize({ is_receipt: true, items: [{ name: 'a' }, { name: 'b', amount: 0 }] })).toThrow(expect.objectContaining({ code: 'unreadable' }));
    expect(() => normalize({ is_receipt: false, items: [] })).toThrow(expect.objectContaining({ code: 'not_receipt' }));
  });
});

describe('receipt date handling', () => {
  const now = new Date('2026-10-27T10:00:00Z'); // 13:00 в Москве
  const tz = 'Europe/Moscow';

  it('keeps a recent receipt date and time, otherwise records now', () => {
    expect(resolveReceiptTime('2026-10-26', '19:45', tz, now)).toBe('2026-10-26 19:45:00');
    expect(resolveReceiptTime('2026-10-27', '12:59', tz, now)).toBe('2026-10-27 12:59:00');
    expect(resolveReceiptTime('2026-10-27', '13:30', tz, now)).toBeNull(); // позже, чем сейчас
    expect(resolveReceiptTime('2026-10-28', '10:00', tz, now)).toBeNull(); // будущее
    expect(resolveReceiptTime('2026-08-28', '10:00', tz, now)).toBe('2026-08-28 10:00:00'); // ровно 60 дней
    expect(resolveReceiptTime('2026-08-27', '10:00', tz, now)).toBeNull(); // старше 60 дней
    expect(resolveReceiptTime(null, null, tz, now)).toBeNull();
  });

  it('uses noon for past dates without time and now for today without time', () => {
    expect(resolveReceiptTime('2026-10-20', null, tz, now)).toBe('2026-10-20 12:00:00');
    expect(resolveReceiptTime('2026-10-27', null, tz, now)).toBeNull();
  });

  it('starts the monthly limit at the user\'s local month', () => {
    const lateEvening = new Date('2026-10-31T22:30:00Z');
    expect(localMonthStart('Europe/Moscow', lateEvening)).toBe('2026-11-01');
    expect(localMonthStart('UTC', lateEvening)).toBe('2026-10-01');
    expect(localMonthStart('America/New_York', new Date('2026-11-01T02:00:00Z'))).toBe('2026-10-01');
  });
});

describe('ReceiptService', () => {
  function createService({ isPremium = false, used = 0, raw = null } = {}) {
    const receiptRepository = { countSince: jest.fn(async () => used), create: jest.fn(async () => 7) };
    const provider = { name: 'fake', configured: true, recognize: jest.fn(async () => raw) };
    const service = new ReceiptService({
      receiptRepository,
      provider,
      expenseService: {
        getCategories: jest.fn(async () => [
          { id: 1, user_id: 0, name: 'Еда' }, { id: 6, user_id: 0, name: 'Другое' }, { id: 50, user_id: 777, name: 'Кофейни' }
        ]),
        getDefaultCategory: jest.fn(async () => ({ id: 6, name: 'Другое' })),
        translateCategoryName: (name, loc, lang) => ({ Еда: lang === 'en' ? 'Food' : 'Еда', Другое: lang === 'en' ? 'Other' : 'Другое' }[name] || name)
      },
      premiumService: {
        isPremiumUser: jest.fn(async () => isPremium),
        getUserLimits: jest.fn(async () => ({ MAX_DESCRIPTION_LENGTH: isPremium ? 160 : 10 }))
      },
      localizationService: new LocalizationService(),
      funnelService: { track: jest.fn() }
    });
    return { service, receiptRepository, provider };
  }

  it('counts the monthly limit: 10 without premium, 300 with premium', async () => {
    let { service, receiptRepository } = createService({ used: 10 });
    expect(await service.checkLimit(777, 'Europe/Moscow')).toEqual({ isPremium: false, limit: 10, used: 10, remaining: 0 });
    expect(receiptRepository.countSince).toHaveBeenCalledWith(777, expect.stringMatching(/^\d{4}-\d{2}-01$/), 'Europe/Moscow');
    ({ service } = createService({ isPremium: true, used: 10 }));
    expect(await service.checkLimit(777, 'UTC')).toMatchObject({ limit: 300, remaining: 290 });
  });

  it('asks the model with the user\'s category names and maps answers back to ids', async () => {
    const { service, provider } = createService({ raw: { is_receipt: true, items: [
      { name: 'Latte', amount: 4.5, category: 'Кофейни' },
      { name: 'Bread', amount: 2, category: 'Food' },
      { name: 'Batteries', amount: 3, category: 'Electronics' }
    ] } });
    const receipt = await service.recognize(777, { image: Buffer.from('img'), mimeType: 'image/jpeg', lang: 'en', currency: 'USD', timezone: 'UTC' });
    const { prompt } = provider.recognize.mock.calls[0][0];
    expect(prompt).toContain('"Food", "Other", "Кофейни"');
    expect(prompt).toContain('If none fits, use "Other"');
    expect(prompt).toContain('If unknown: USD');
    expect(receipt.items.map(item => item.categoryId)).toEqual([50, 1, 6]);
    expect(receipt.currency).toBe('USD');
  });

  it('records descriptions within the user\'s description limit', async () => {
    const { service, receiptRepository } = createService();
    await service.record(777, { merchant: 'X', date: null, time: null, currency: 'RUB', total: null, itemsTotal: 3, items: [
      { name: 'Очень длинное название товара', amount: 1, categoryId: 1 },
      { name: '', amount: 2, categoryId: 6 }
    ] }, { timezone: 'UTC', familyId: null });
    const [, data] = receiptRepository.create.mock.calls[0];
    expect(data.items).toEqual([
      { amount: 1, categoryId: 1, description: 'Очень длин' },
      { amount: 2, categoryId: 6, description: null }
    ]);
    expect(data.localAt).toBeNull();
  });
});

describe('providers', () => {
  const input = { image: Buffer.from('jpegdata'), mimeType: 'image/jpeg', prompt: 'PROMPT' };

  it('builds the Gemini request: inline image, JSON response schema, temperature 0', () => {
    const provider = new GeminiProvider({ apiKey: 'KEY' });
    const { url, body } = provider.buildRequest(input);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=KEY');
    expect(body.contents[0].parts).toEqual([
      { inline_data: { mime_type: 'image/jpeg', data: Buffer.from('jpegdata').toString('base64') } },
      { text: 'PROMPT' }
    ]);
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0 });
  });

  it('passes the source address and reads the model JSON from Gemini candidates', async () => {
    const post = jest.fn(async () => ({ status: 200, json: { candidates: [{ content: { parts: [{ text: '{"is_receipt":true,"items":[]}' }] } }] } }));
    const provider = new GeminiProvider({ apiKey: 'KEY', model: 'gemini-x', localAddress: '100.103.143.229', post });
    expect(await provider.recognize(input)).toEqual({ is_receipt: true, items: [] });
    expect(post.mock.calls[0][0]).toContain('/models/gemini-x:generateContent');
    expect(post.mock.calls[0][2]).toMatchObject({ localAddress: '100.103.143.229' });
    const blocked = new GeminiProvider({ apiKey: 'KEY', post: async () => ({ status: 200, json: { promptFeedback: { blockReason: 'OTHER' } } }) });
    await expect(blocked.recognize(input)).rejects.toMatchObject({ code: 'unreadable' });
  });

  it('builds the OpenAI-compatible request with a data URI image and json_object response', () => {
    const provider = new OpenAiCompatibleProvider({ apiKey: 'sk', model: 'm', baseUrl: 'https://openrouter.ai/api/v1/' });
    const { url, headers, body } = provider.buildRequest(input);
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(headers).toEqual({ Authorization: 'Bearer sk' });
    expect(body).toMatchObject({ model: 'm', temperature: 0, response_format: { type: 'json_object' } });
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'PROMPT' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${Buffer.from('jpegdata').toString('base64')}` } }
    ]);
  });

  it('reads OpenAI-compatible answers, including fenced JSON, and passes the source address', async () => {
    const post = jest.fn(async () => ({ status: 200, json: { choices: [{ message: { content: '```json\n{"is_receipt":false,"items":[]}\n```' } }] } }));
    const provider = new OpenAiCompatibleProvider({ model: 'llava', baseUrl: 'http://127.0.0.1:11434/v1', localAddress: '10.0.0.5', post });
    expect(await provider.recognize(input)).toEqual({ is_receipt: false, items: [] });
    expect(post.mock.calls[0][2]).toMatchObject({ localAddress: '10.0.0.5', headers: {} });
  });

  it('maps HTTP errors to error classes', () => {
    expect(mapHttpError({ status: 429, json: { error: { message: 'Rate limit' } } }).code).toBe('quota');
    expect(mapHttpError({ status: 401, json: { error: { message: 'Bad credentials' } } }).code).toBe('auth');
    expect(mapHttpError({ status: 400, json: { error: { message: 'API key not valid. Please pass a valid API key.' } } }).code).toBe('auth');
    expect(mapHttpError({ status: 400, json: { error: { message: 'User location is not supported for the API use.' } } }).code).toBe('unavailable');
    expect(mapHttpError({ status: 503, body: 'overloaded' }).code).toBe('unavailable');
    expect(() => parseModelJson('no json here')).toThrow(ReceiptError);
  });

  it('treats a 200 answer without the expected JSON (a stub page) as an unavailable service', async () => {
    const stub = async () => ({ status: 200, body: 'OK\n', json: null });
    await expect(new OpenAiCompatibleProvider({ model: 'm', baseUrl: 'http://x/v1', post: stub }).recognize(input)).rejects.toMatchObject({ code: 'unavailable' });
    await expect(new GeminiProvider({ apiKey: 'k', post: stub }).recognize(input)).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('a missing key fails before any request', async () => {
    const post = jest.fn();
    await expect(new GeminiProvider({ apiKey: '', post }).recognize(input)).rejects.toMatchObject({ code: 'not_configured' });
    expect(post).not.toHaveBeenCalled();
  });

  it('the prompt lists categories, currency and today', () => {
    const prompt = buildPrompt({ categories: ['Еда', 'Другое'], fallbackCategory: 'Другое', defaultCurrency: 'RUB', today: '2026-10-27' });
    expect(prompt).toContain('"Еда", "Другое"');
    expect(prompt).toContain('Today is 2026-10-27');
  });
});

describe('http client', () => {
  let server;
  let port;
  let handler;
  const requests = [];
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requests.push({ remote: req.socket.remoteAddress, body: JSON.parse(body), headers: req.headers });
        handler(req, res);
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });
  afterAll(() => new Promise(resolve => server.close(resolve)));
  beforeEach(() => { requests.length = 0; });

  it('binds the source address and posts JSON', async () => {
    handler = (req, res) => res.end('{"ok":true}');
    const response = await postJson(`http://127.0.0.1:${port}/x?y=1`, { a: 1 }, { localAddress: '127.0.0.1', headers: { Authorization: 'Bearer t' } });
    expect(response).toMatchObject({ status: 200, json: { ok: true } });
    expect(requests[0]).toMatchObject({ remote: '127.0.0.1', body: { a: 1 } });
    expect(requests[0].headers.authorization).toBe('Bearer t');
  });

  it('retries once on 5xx and 429, but not when the service asks to wait for long', async () => {
    let calls = 0;
    handler = (req, res) => {
      calls++;
      res.statusCode = calls === 1 ? 503 : 200;
      res.end('{}');
    };
    const sleep = jest.fn(async () => {});
    expect((await postJsonWithRetry(`http://127.0.0.1:${port}/`, {}, { sleep })).status).toBe(200);
    expect(calls).toBe(2);
    expect(sleep).toHaveBeenCalledWith(2000);

    calls = 0;
    handler = (req, res) => {
      calls++;
      res.statusCode = 429;
      res.setHeader('Retry-After', '86400');
      res.end('{}');
    };
    expect((await postJsonWithRetry(`http://127.0.0.1:${port}/`, {}, { sleep })).status).toBe(429);
    expect(calls).toBe(1);
  });

  it('times out with a network error', async () => {
    handler = () => {}; // не отвечает
    await expect(postJson(`http://127.0.0.1:${port}/`, {}, { timeoutMs: 100 })).rejects.toMatchObject({ code: 'network' });
  });
});

describe('telegram images', () => {
  it('takes the largest photo size within the limit', () => {
    const sizes = [{ file_id: 's', file_size: 1000 }, { file_id: 'm', file_size: 90000 }, { file_id: 'l', file_size: 400000 }];
    expect(ReceiptHandlers.pickPhotoSize(sizes).file_id).toBe('l');
    expect(ReceiptHandlers.pickPhotoSize([...sizes, { file_id: 'xl', file_size: 5 * 1024 * 1024 }]).file_id).toBe('l');
  });

  it('recognizes image documents by MIME type or extension', () => {
    expect(ReceiptHandlers.isImageDocument({ mime_type: 'image/jpeg' })).toBe(true);
    expect(ReceiptHandlers.isImageDocument({ file_name: 'IMG_1234.HEIC' })).toBe(true);
    expect(ReceiptHandlers.isImageDocument({ file_name: 'statement.csv', mime_type: 'text/csv' })).toBe(false);
  });
});

describe('provider chain', () => {
  const input = { image: Buffer.from('jpegdata'), mimeType: 'image/jpeg', prompt: 'PROMPT' };

  it('reads numbered slots in order and the legacy un-numbered settings as slot 1', () => {
    const slots = parseSlots({
      RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: 'http://192.168.1.50:11434/v1', RECEIPT_AI_1_MODEL: 'qwen2.5vl:7b',
      RECEIPT_AI_2_PROVIDER: 'gemini', RECEIPT_AI_2_API_KEY: 'k', RECEIPT_AI_2_LOCAL_ADDRESS: '100.103.143.229',
      RECEIPT_AI_3_PROVIDER: 'OPENAI', RECEIPT_AI_3_BASE_URL: 'http://127.0.0.1:11434/v1', RECEIPT_AI_3_MODEL: 'qwen2.5vl:3b',
      RECEIPT_AI_3_TIMEOUT_MS: '120000', RECEIPT_AI_3_CONNECT_TIMEOUT_MS: '500',
      RECEIPT_AI_PROVIDER: 'gemini', RECEIPT_AI_API_KEY: 'ignored-when-slot-1-is-set'
    });
    expect(slots.map(slot => [slot.slot, slot.provider, slot.model || null, slot.timeoutMs, slot.connectTimeoutMs])).toEqual([
      [1, 'openai', 'qwen2.5vl:7b', 60000, 2000],
      [2, 'gemini', null, 60000, 2000],
      [3, 'openai', 'qwen2.5vl:3b', 120000, 500]
    ]);
    expect(slots[1]).toMatchObject({ apiKey: 'k', localAddress: '100.103.143.229' });

    expect(parseSlots({ RECEIPT_AI_API_KEY: 'k', RECEIPT_AI_MODEL: 'gemini-x' })).toEqual([
      expect.objectContaining({ slot: 1, provider: 'gemini', apiKey: 'k', model: 'gemini-x' })
    ]);
    expect(parseSlots({ RECEIPT_AI_PROVIDER: 'openai', RECEIPT_AI_BASE_URL: 'http://h/v1', RECEIPT_AI_MODEL: 'm', RECEIPT_AI_2_PROVIDER: 'gemini', RECEIPT_AI_2_API_KEY: 'k' })
      .map(slot => [slot.slot, slot.provider])).toEqual([[1, 'openai'], [2, 'gemini']]);
    expect(parseSlots({})).toEqual([]);
  });

  it('skips incomplete or unknown slots; the chain is configured if any slot is', () => {
    expect(createProviderFromEnv({}).configured).toBe(false);
    expect(createProviderFromEnv({ RECEIPT_AI_1_PROVIDER: 'gemini' }).configured).toBe(false); // без ключа
    expect(createProviderFromEnv({ RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_MODEL: 'm' }).configured).toBe(false); // без адреса
    expect(createProviderFromEnv({ RECEIPT_AI_1_PROVIDER: 'github', RECEIPT_AI_1_API_KEY: 'pat' }).configured).toBe(false); // пресет удалён
    const chain = createProviderFromEnv({
      RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: 'http://127.0.0.1:11434/v1', RECEIPT_AI_1_MODEL: 'qwen2.5vl:3b'
    });
    expect(chain.configured).toBe(true);
    expect(chain.acceptsHeic).toBe(false);
    expect(chain.providers[0]).toMatchObject({ slot: 1, apiKey: '', model: 'qwen2.5vl:3b' });
    expect(chain.providers[0].buildRequest(input).headers).toEqual({}); // Ollama: без ключа заголовок не шлём
  });

  function fakeSlot(slot, behaviour) {
    return { slot, name: 'fake', model: `m${slot}`, recognize: jest.fn(async () => {
      if (behaviour instanceof Error) throw behaviour;
      return behaviour;
    }) };
  }

  it('falls through on availability errors and stops on answers', async () => {
    const answer = { is_receipt: true, items: [] };
    for (const code of ['network', 'unavailable', 'quota', 'auth']) {
      const chain = new ChainProvider([fakeSlot(1, new ReceiptError(code)), fakeSlot(2, answer)]);
      await expect(chain.recognize(input)).resolves.toBe(answer);
    }
    for (const code of ['unreadable', 'not_receipt']) {
      const second = fakeSlot(2, answer);
      const chain = new ChainProvider([fakeSlot(1, new ReceiptError(code)), second]);
      await expect(chain.recognize(input)).rejects.toMatchObject({ code });
      expect(second.recognize).not.toHaveBeenCalled();
    }
    const allDown = new ChainProvider([fakeSlot(1, new ReceiptError('network')), fakeSlot(2, new ReceiptError('quota'))]);
    await expect(allDown.recognize(input)).rejects.toMatchObject({ code: 'quota' });
    await expect(new ChainProvider([fakeSlot(1, new Error('socket hang up')), fakeSlot(2, answer)]).recognize(input)).resolves.toBe(answer);
  });

  describe('over HTTP', () => {
    let server;
    let port;
    const hits = [];
    beforeAll(async () => {
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          hits.push(req.url);
          res.setHeader('Content-Type', 'application/json');
          if (req.url.startsWith('/down/')) {
            res.statusCode = 503;
            res.end('{"error":"model is loading"}');
          } else if (req.url.startsWith('/garbage/')) {
            res.end(JSON.stringify({ choices: [{ message: { content: 'I cannot read this image' } }] }));
          } else {
            res.end(JSON.stringify({ choices: [{ message: { content: '{"is_receipt":true,"items":[{"name":"Хлеб","amount":45}]}' } }] }));
          }
        });
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      port = server.address().port;
    });
    afterAll(() => new Promise(resolve => server.close(resolve)));
    beforeEach(() => { hits.length = 0; });

    async function freePort() {
      const probe = http.createServer();
      await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
      const { port: closed } = probe.address();
      await new Promise(resolve => probe.close(resolve));
      return closed;
    }

    it('refused → 503 → answer: each slot is tried once, the last one serves', async () => {
      const closed = await freePort();
      const chain = createProviderFromEnv({
        RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: `http://127.0.0.1:${closed}/v1`, RECEIPT_AI_1_MODEL: 'qwen2.5vl:7b',
        RECEIPT_AI_2_PROVIDER: 'openai', RECEIPT_AI_2_BASE_URL: `http://127.0.0.1:${port}/down/v1`, RECEIPT_AI_2_MODEL: 'cloud',
        RECEIPT_AI_3_PROVIDER: 'openai', RECEIPT_AI_3_BASE_URL: `http://127.0.0.1:${port}/ok/v1`, RECEIPT_AI_3_MODEL: 'qwen2.5vl:3b'
      });
      const started = Date.now();
      await expect(chain.recognize(input)).resolves.toEqual({ is_receipt: true, items: [{ name: 'Хлеб', amount: 45 }] });
      expect(hits).toEqual(['/down/v1/chat/completions', '/ok/v1/chat/completions']); // 503 у не последнего слота — без повтора
      expect(Date.now() - started).toBeLessThan(1500);
    });

    it('an unreadable answer stops the chain', async () => {
      const chain = createProviderFromEnv({
        RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: `http://127.0.0.1:${port}/garbage/v1`, RECEIPT_AI_1_MODEL: 'a',
        RECEIPT_AI_2_PROVIDER: 'openai', RECEIPT_AI_2_BASE_URL: `http://127.0.0.1:${port}/ok/v1`, RECEIPT_AI_2_MODEL: 'b'
      });
      await expect(chain.recognize(input)).rejects.toMatchObject({ code: 'unreadable' });
      expect(hits).toEqual(['/garbage/v1/chat/completions']);
    });

    it('fails fast on a non-listening port and on an unreachable host', async () => {
      const closed = await freePort();
      let started = Date.now();
      await expect(postJson(`http://127.0.0.1:${closed}/v1/chat/completions`, {}, { timeoutMs: 60000 })).rejects.toMatchObject({ code: 'network' });
      expect(Date.now() - started).toBeLessThan(500);
      // 10.255.255.1 не отвечает (пакеты теряются) — срабатывает таймаут соединения, а не общий
      started = Date.now();
      await expect(postJson('http://10.255.255.1:11434/v1/chat/completions', {}, { timeoutMs: 60000, connectTimeoutMs: 300 })).rejects.toMatchObject({ code: 'network' });
      expect(Date.now() - started).toBeLessThan(1500);
    });
  });

  it('keeps sending «typing» every 4 s until stopped', () => {
    jest.useFakeTimers();
    try {
      const ctx = { sendChatAction: jest.fn(async () => true) };
      const stop = ReceiptHandlers.keepTyping(ctx);
      jest.advanceTimersByTime(12500);
      expect(ctx.sendChatAction).toHaveBeenCalledTimes(3);
      expect(ctx.sendChatAction).toHaveBeenCalledWith('typing');
      stop();
      jest.advanceTimersByTime(20000);
      expect(ctx.sendChatAction).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
