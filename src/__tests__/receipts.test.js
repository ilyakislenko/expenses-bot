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
const { withLineIds } = require('../services/receipt/draftEdit');

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

  it('does not spread a residual across lines: amounts stay as read within a kopeck of the total', () => {
    const receipt = normalize({ is_receipt: true, total: 100, items: [{ name: 'A', amount: 33.33 }, { name: 'B', amount: 33.33 }, { name: 'C', amount: 33.33 }] });
    expect(amounts(receipt)).toEqual([33.33, 33.33, 33.33]);
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
    expect(cleanName('[М] Молоко СТМ 3.2% полипак')).toBe('Молоко СТМ 3.2% полипак');
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
    expect(prompt).toContain('"Food" (food: groceries, drinks, cafes), "Other" (anything else), "Кофейни"');
    expect(prompt).toContain('If none fits, use "Other"');
    expect(prompt).toContain('If unknown: USD');
    expect(receipt.items.map(item => item.categoryId)).toEqual([50, 1, 6]);
    expect(receipt.currency).toBe('USD');
  });

  it('records descriptions within the user\'s description limit, with quantity and unit price per line', async () => {
    const { service, receiptRepository } = createService();
    await service.record(777, { merchant: 'X', date: null, time: null, currency: 'RUB', total: null, itemsTotal: 3, items: [
      { name: 'Очень длинное название товара', amount: 1, categoryId: 1, quantity: 0.5, price: 2 },
      { name: '', amount: 2, categoryId: 6, quantity: 1, price: null }
    ] }, { timezone: 'UTC', familyId: null });
    const [, data] = receiptRepository.create.mock.calls[0];
    expect(data.items).toEqual([
      { amount: 1, categoryId: 1, description: 'Очень длин', quantity: 0.5, unitPrice: 2 },
      { amount: 2, categoryId: 6, description: null, quantity: 1, unitPrice: null }
    ]);
    expect(data.localAt).toBeNull();
  });

  describe('QR of a Russian fiscal receipt', () => {
    const { parseFiscalQr } = require('../services/receipt/qr');
    const QR = parseFiscalQr('t=20261029T1842&s=1042.92&fn=7281440500123456&i=12345&fp=3456789012&n=1');
    const options = { image: Buffer.from('x'), mimeType: 'image/jpeg', lang: 'ru', currency: 'RUB', timezone: 'Europe/Moscow', qr: QR };

    it('reads total, date and time; refunds, foreign codes and impossible values are not a purchase', () => {
      expect(QR).toMatchObject({ total: 1042.92, date: '2026-10-29', time: '18:42', fn: '7281440500123456' });
      expect(parseFiscalQr('t=20261029T1842&s=1042.92&fn=7281440500123456&n=2')).toBeNull();
      expect(parseFiscalQr('https://example.com/?s=100')).toBeNull();
      expect(parseFiscalQr('t=20261329T1842&s=100&fn=1&n=1')).toBeNull();
      expect(parseFiscalQr('t=20261029T1842&s=-5&fn=1&n=1')).toBeNull();
    });

    it('the QR total replaces the model total, so lines that do not add up become a draft', async () => {
      const { service } = createService({ raw: { is_receipt: true, merchant: 'Магнит', date: '2026-01-01', time: null, total: 1202.91,
        items: [{ name: 'Молоко', quantity: 1, price: 1202.91, amount: 1202.91, category: 'Еда' }] } });
      const receipt = await service.recognize(777, options);
      expect(receipt).toMatchObject({ total: 1042.92, date: '2026-10-29', time: '18:42', mismatch: true, lowConfidence: true });
      expect(receipt.checks.qr).toBe(true);
    });

    it('the model could not read the photo but the QR is readable — one-line draft for the exact total', async () => {
      const { service, provider } = createService();
      provider.recognize.mockRejectedValue(new ReceiptError('unreadable'));
      const receipt = await service.recognize(777, options);
      expect(receipt.items).toEqual([expect.objectContaining({ name: 'Покупка по чеку', amount: 1042.92 })]);
      expect(receipt).toMatchObject({ total: 1042.92, lowConfidence: true, checks: expect.objectContaining({ qrOnly: true }) });
      provider.recognize.mockRejectedValue(new ReceiptError('unavailable'));
      await expect(service.recognize(777, options)).rejects.toMatchObject({ code: 'unavailable' });
    });
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
    expect(prompt).toContain('A 2-digit year YY on the receipt means 20YY; receipts are recent — printed in 2026 or the year before');
    expect(prompt).not.toMatch(/\d{2}\.\d{2}\.\d{2}|\d{4}-\d{2}-\d{2}/);
    // Сегодняшняя дата модели не даётся — иначе она подставляет её вместо непрочитанной
    expect(prompt).not.toContain('2026-10-27;');
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
    expect(ReceiptHandlers.pickPhotoSize([...sizes, { file_id: 'xl', file_size: 5 * 1024 * 1024 }]).file_id).toBe('xl');
    expect(ReceiptHandlers.pickPhotoSize([...sizes, { file_id: 'huge', file_size: 25 * 1024 * 1024 }]).file_id).toBe('l');
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

describe('local slot queue', () => {
  const { Limiter, isLocalUrl } = require('../services/receipt/chain');

  it('runs one task at a time and reports queue positions', async () => {
    const limiter = new Limiter(1);
    const releases = [];
    const task = (name) => () => new Promise(resolve => releases.push(() => resolve(name)));
    const positions = { b: [], c: [] };
    const a = limiter.run(task('a'));
    const b = limiter.run(task('b'), position => positions.b.push(position));
    const c = limiter.run(task('c'), position => positions.c.push(position));
    expect(releases).toHaveLength(1);
    releases[0]();
    await expect(a).resolves.toBe('a');
    await Promise.resolve();
    releases[1]();
    await expect(b).resolves.toBe('b');
    await Promise.resolve();
    releases[2]();
    await expect(c).resolves.toBe('c');
    expect(positions).toEqual({ b: [1, 0], c: [2, 1, 0] });
  });

  it('treats loopback and LAN addresses as local, one recognition at a time by default', () => {
    expect(isLocalUrl('http://127.0.0.1:11434/v1')).toBe(true);
    expect(isLocalUrl('http://192.168.1.50:11434/v1')).toBe(true);
    expect(isLocalUrl('http://gamingpc.lan:11434/v1')).toBe(true);
    expect(isLocalUrl('https://api.mistral.ai/v1')).toBe(false);
    const slots = parseSlots({
      RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: 'http://192.168.1.50:11434/v1', RECEIPT_AI_1_MODEL: 'a',
      RECEIPT_AI_2_PROVIDER: 'openai', RECEIPT_AI_2_BASE_URL: 'https://api.mistral.ai/v1', RECEIPT_AI_2_MODEL: 'b',
      RECEIPT_AI_3_PROVIDER: 'openai', RECEIPT_AI_3_BASE_URL: 'http://127.0.0.1:11434/v1', RECEIPT_AI_3_MODEL: 'c', RECEIPT_AI_3_CONCURRENCY: '2'
    });
    expect(slots.map(slot => slot.concurrency)).toEqual([1, 0, 2]);
  });

  it('reports queue position and a local slot start through onStatus', async () => {
    let release;
    const slow = { slot: 1, name: 'openai', model: 'm', isLocal: true, limiter: new Limiter(1), recognize: jest.fn(() => new Promise(resolve => { release = resolve; })) };
    const chain = new ChainProvider([slow]);
    const first = [];
    const second = [];
    const p1 = chain.recognize({ onStatus: status => first.push(status) });
    const p2 = chain.recognize({ onStatus: status => second.push(status) });
    expect(first).toEqual([{ position: 0, local: true }]);
    expect(second).toEqual([{ position: 1, local: true }]);
    release({ is_receipt: true, items: [] });
    await p1;
    await Promise.resolve();
    release({ is_receipt: true, items: [] });
    await p2;
    expect(second).toEqual([{ position: 1, local: true }, { position: 0, local: true }]);
  });
});

describe('EXIF orientation', () => {
  const { jpegOrientation } = require('../services/receipt/image');
  function jpegWithOrientation(value, littleEndian) {
    const tiff = Buffer.alloc(26);
    tiff.write(littleEndian ? 'II' : 'MM', 0, 'ascii');
    const u16 = (v, at) => (littleEndian ? tiff.writeUInt16LE(v, at) : tiff.writeUInt16BE(v, at));
    const u32 = (v, at) => (littleEndian ? tiff.writeUInt32LE(v, at) : tiff.writeUInt32BE(v, at));
    u16(42, 2); u32(8, 4); u16(1, 8); // одна запись в IFD0
    u16(0x0112, 10); u16(3, 12); u32(1, 14); u16(value, 18);
    const exif = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
    const app1 = Buffer.alloc(4);
    app1.writeUInt16BE(0xffe1, 0);
    app1.writeUInt16BE(exif.length + 2, 2);
    return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, exif, Buffer.from([0xff, 0xda, 0, 2])]);
  }

  it('reads Orientation from big- and little-endian EXIF, null without it', () => {
    expect(jpegOrientation(jpegWithOrientation(6, false))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(1, true))).toBe(1);
    expect(jpegOrientation(Buffer.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
    expect(jpegOrientation(Buffer.from('not a jpeg'))).toBeNull();
  });
});

describe('confidence gate and prompt', () => {
  const categoriesList = [{ id: 1, names: ['Еда'] }, { id: 6, names: ['Другое'] }];
  const check = (raw) => normalizeReceipt(raw, { categories: categoriesList, fallbackCategoryId: 6, defaultCurrency: 'RUB', supportedCurrencies: SUPPORTED_CURRENCIES });

  it('trusts the real qwen2.5vl:3b answer for the «Ярче» receipt (one misread quantity)', () => {
    const receipt = check({
      is_receipt: true, merchant: 'Ярче', date: '2026-10-27', time: '11:47', currency: 'RUB', total: 1160.55, items: [
        { name: 'Пакет-майка', quantity: 1, price: 8, amount: 8 }, { name: 'Рагу', quantity: 2, price: 139.99, amount: 279.98 },
        { name: 'Соус', quantity: 1, price: 36.99, amount: 36.99 }, { name: 'Картофель', quantity: 0.712, price: 39.99, amount: 28.47 },
        { name: 'Морковь', quantity: 0.522, price: 24.99, amount: 13.04 }, { name: 'Лук', quantity: 0.62, price: 33.99, amount: 21.07 },
        { name: 'Молоко', quantity: 9, price: 74.99, amount: 74.99 }, { name: 'Масло', quantity: 1, price: 169.99, amount: 169.99 },
        { name: 'Хлеб', quantity: 1, price: 59.99, amount: 59.99 }, { name: 'Виноград', quantity: 0.748, price: 249.99, amount: 186.99 },
        { name: 'Яблоки', quantity: 0.518, price: 119.99, amount: 62.15 }, { name: 'Хурма', quantity: 0.446, price: 149.99, amount: 66.9 },
        { name: 'Слива', quantity: 0.608, price: 249.99, amount: 151.99 }
      ]
    });
    expect(receipt).toMatchObject({ lowConfidence: false, itemsTotal: 1160.55, checks: { badLines: 1, lines: 13 } });
  });

  it('is low when items differ from the total by more than 3% or many lines don\'t multiply out', () => {
    expect(check({ is_receipt: true, merchant: 'Ярче', total: 100, items: [{ name: 'a', amount: 96 }] }).lowConfidence).toBe(true);
    expect(check({ is_receipt: true, merchant: 'Ярче', total: 100, items: [{ name: 'a', amount: 98 }] }).lowConfidence).toBe(false);
    const garbled = check({ is_receipt: true, merchant: 'Ярче', total: 300, items: [
      { name: 'a', quantity: 1, price: 50, amount: 100 }, { name: 'b', quantity: 2, price: 10, amount: 100 },
      { name: 'c', quantity: 1, price: 100, amount: 100 }
    ] });
    expect(garbled).toMatchObject({ lowConfidence: true, checks: { badLines: 2, lines: 3 } });
    expect(check({ is_receipt: true, merchant: 'Ярче', total: 5.4, items: [{ name: 'a', quantity: 0.5, price: 10, amount: 5.4 }] }).lowConfidence).toBe(false);
    // Итог не прочитан или одна-две строки без продавца — не записываем сами
    expect(check({ is_receipt: true, merchant: 'Ярче', items: [{ name: 'a', amount: 5 }, { name: 'b', amount: 6 }, { name: 'c', amount: 7 }] }))
      .toMatchObject({ lowConfidence: true, checks: { noTotal: true } });
    expect(check({ is_receipt: true, total: 98, items: [{ name: 'a', amount: 98 }] })).toMatchObject({ lowConfidence: true, checks: { sparse: true } });
  });

  it('the exported prompt template is filled completely and explains the Russian line format', () => {
    const { RECEIPT_PROMPT_TEMPLATE } = require('../services/receipt/prompt');
    expect(RECEIPT_PROMPT_TEMPLATE).toContain('КОЛ-ВО*ЦЕНА=СУММА');
    const prompt = buildPrompt({ categories: ['Еда', 'Другое'], fallbackCategory: 'Другое', defaultCurrency: 'RUB', today: '2026-10-27' });
    expect(prompt).not.toMatch(/\{\{\w+\}\}/);
    expect(prompt).toContain('"category":"<one of the categories below>"');
    expect(prompt).toContain('exactly one of: "Еда", "Другое"');
    expect(prompt).toContain('day.month.year');
    // Конкретной даты в запросе нет: модель подставляла её вместо даты чека
    expect(prompt).not.toMatch(/\d{2}\.\d{2}\.\d{2}|\d{4}-\d{2}-\d{2}/);
  });

  // Настоящий ответ qwen2.5vl:3b на чек «Перспектива» (Магнит, 9 позиций, итог 1042,92): у трёх строк напечатана цена до
  // скидки, а сумма — со скидкой. Раньше это считалось «не сходится», бот поворачивал кадр на 180° и записывал выдумку
  const magnit = () => ({
    is_receipt: true, merchant: 'ООО "ПЕРСПЕКТИВА"', date: '2026-10-27', time: '22:37', currency: 'RUB', total: 1042.92, items: [
      { name: 'КОМПОТ МЕДВЕДЬ Л', quantity: 1, price: 184.99, amount: 184.99 }, { name: 'БАТОН НАРЕЗНОЙ 4', quantity: 1, price: 82.99, amount: 82.99 },
      { name: 'СЫР САРМ', quantity: 1, price: 229.99, amount: 159.99 }, { name: 'КЕФИР ХО', quantity: 1, price: 89.99, amount: 89.99 },
      { name: 'ИКОРНАЯ ПАСТА КО', quantity: 1, price: 104.99, amount: 104.99 }, { name: 'КОЛБАСА МПФ ВЕТЧ', quantity: 1, price: 309.99, amount: 279.99 },
      { name: 'КАПУСТА КВАШЕННА', quantity: 1, price: 129.99, amount: 129.99 }, { name: 'ПАКЕТ ФИРМЕННЫЙ', quantity: 1, price: 9.99, amount: 9.99 },
      { name: 'МАГНИТ БОЛЬШАЯ Р', quantity: 1, price: 59.99, amount: 0.01 }
    ]
  });

  it('discounted lines are not errors when the lines add up to the printed total; such a receipt is not re-read rotated', () => {
    const receipt = check(magnit());
    expect(receipt).toMatchObject({ lowConfidence: false, merchant: 'ПЕРСПЕКТИВА', date: '2026-10-27', checks: { badLines: 0, lines: 9 } });
    expect(receipt.itemsTotal).toBeCloseTo(1042.92, 1);
  });

  it('total lines of the receipt are not items; a receipt of only such a line is unreadable', () => {
    const withTotal = magnit();
    withTotal.items.push({ name: 'СУММА ЧЕКА БЕЗ УЧЁТА СКИДОК', quantity: 1, price: 1202.91, amount: 1202.91 }, { name: 'ИТОГО', amount: 1042.92 });
    const receipt = check(withTotal);
    expect(receipt.items.map(item => item.name)).not.toContain('СУММА ЧЕКА БЕЗ УЧЁТА СКИДОК');
    expect(receipt).toMatchObject({ lowConfidence: false, checks: { lines: 9, totalLines: 2 } });
    expect(() => check({ is_receipt: true, merchant: 'ЧЕК', total: 1202.91, items: [{ name: 'Сумма чека без учёта скидок', quantity: 1, price: 1202.91, amount: 1202.91 }] }))
      .toThrow(expect.objectContaining({ code: 'unreadable' }));
    expect(cleanName('КАРТОФЕЛЬ ИТОГОВЫЙ')).toBe('КАРТОФЕЛЬ ИТОГОВЫЙ');
    expect(check({ ...magnit(), items: [{ name: 'Totally Organic Milk', amount: 1042.92 }, ...magnit().items.slice(0, 2)], total: null }).items[0].name).toBe('Totally Organic Milk');
  });
});

// Хранилище черновиков как в receipt_drafts: живёт отдельно от обработчика (переживает «перезапуск» — новый ReceiptHandlers)
function memoryDraftStore() {
  const rows = new Map();
  const attempts = []; // receipt_attempts: показанные черновики и «не разобрать»
  const key = (userId, messageId) => `${userId}:${messageId}`;
  const copy = (value) => (value == null ? null : JSON.parse(JSON.stringify(value)));
  return {
    rows,
    attempts,
    saveDraft: jest.fn(async (userId, messageId, { receipt = null, timezone = null, frame = null }) => {
      rows.set(key(userId, messageId), { receipt: copy(receipt), timezone, frame: copy(frame), taken: false });
    }),
    takeDraft: jest.fn(async (userId, messageId) => {
      const row = rows.get(key(userId, messageId));
      if (!row || !row.receipt) return { status: 'missing' };
      if (row.taken) return { status: 'busy' };
      row.taken = true;
      return { status: 'ok', receipt: copy(row.receipt), timezone: row.timezone };
    }),
    releaseDraft: jest.fn(async (userId, messageId) => {
      const row = rows.get(key(userId, messageId));
      if (row) row.taken = false;
    }),
    deleteDraft: jest.fn(async (userId, messageId) => { rows.delete(key(userId, messageId)); }),
    getDraft: jest.fn(async (userId, messageId) => {
      const row = rows.get(key(userId, messageId));
      if (!row || !row.receipt) return { status: 'missing' };
      if (row.taken) return { status: 'busy' };
      return { status: 'ok', receipt: withLineIds(copy(row.receipt)), frame: copy(row.frame), timezone: row.timezone };
    }),
    // Как ReceiptService.updateDraft: записывающийся черновик не правится, mutate → новый черновик или null; у строк есть id
    updateDraft: jest.fn(async (userId, messageId, mutate) => {
      const row = rows.get(key(userId, messageId));
      if (!row || !row.receipt) return { status: 'missing' };
      if (row.taken) return { status: 'busy' };
      const next = mutate(withLineIds(copy(row.receipt)));
      if (!next) return { status: 'unchanged', receipt: withLineIds(copy(row.receipt)), frame: copy(row.frame), timezone: row.timezone };
      row.receipt = copy(next);
      return { status: 'ok', receipt: copy(next), frame: copy(row.frame), timezone: row.timezone };
    }),
    moveDraft: jest.fn(async (userId, from, to) => {
      const row = rows.get(key(userId, from));
      if (!row || !row.receipt || row.taken) return false;
      rows.delete(key(userId, from));
      rows.set(key(userId, to), row);
      return true;
    }),
    // Как ReceiptRepository.takeFrame: черновик остаётся, отмечен «поворачивается»
    takeFrame: jest.fn(async (userId, messageId) => {
      const row = rows.get(key(userId, messageId));
      if (!row || !row.frame || row.taken || (row.receipt && row.receipt.edited)) return null;
      row.taken = true;
      return { frame: copy(row.frame), receipt: copy(row.receipt), timezone: row.timezone };
    }),
    releaseFrame: jest.fn(async (userId, messageId) => {
      const row = rows.get(key(userId, messageId));
      if (!row) return null;
      row.taken = false;
      return { frame: copy(row.frame), receipt: copy(row.receipt), timezone: row.timezone };
    }),
    // Как ReceiptRepository.addAttempt: одна попытка на фото (сообщение), повторный вызов обновляет её
    addAttempt: jest.fn(async (userId, messageId, outcome) => {
      const index = attempts.findIndex(attempt => attempt.userId === userId && attempt.messageId === messageId);
      if (index >= 0) {
        attempts[index].outcome = outcome;
        return index + 1;
      }
      attempts.push({ userId, messageId, outcome });
      return attempts.length;
    }),
    hasAttempt: jest.fn(async (userId, messageId) => attempts.some(attempt => attempt.userId === userId && attempt.messageId === messageId))
  };
}

describe('ReceiptHandlers background recognition', () => {
  const Formatter = require('../utils/formatter');
  const jpegJs = require('jpeg-js');
  const tinyJpeg = (width, height) => Buffer.from(jpegJs.encode({ data: Buffer.alloc(width * height * 4, 200), width, height }, 80).data);

  function setup() {
    let finish;
    const recognition = new Promise(resolve => { finish = resolve; });
    const receiptService = {
      configured: true,
      provider: { acceptsHeic: false },
      premiumLimit: 300,
      checkLimit: jest.fn(async () => ({ isPremium: false, limit: 10, used: 0, remaining: 10 })),
      recognizePhoto: jest.fn(() => recognition),
      record: jest.fn(async () => 1),
      getReceipt: jest.fn(async () => ({ id: 1, merchant: 'Ярче', purchased_day: '2026-10-27', purchased_hm: '11:47', status: 'active', printed_total: '45', items_total: '45', currency: 'RUB' })),
      getExpenses: jest.fn(async () => [{ id: 5, amount: '45', currency: 'RUB', description: 'Хлеб', category_name: 'Еда', category_icon: '🍕' }]),
      categoriesById: jest.fn(async () => new Map([[1, { id: 1, name: 'Еда', icon: '🍕' }]])),
      ...memoryDraftStore()
    };
    const localizationService = new LocalizationService();
    const ExpenseHandlers = require('../handlers/ExpenseHandlers');
    const EnhancedValidator = require('../utils/enhancedValidator');
    const StateService = require('../services/StateService');
    const stateService = new StateService();
    const userCategories = [{ id: 1, name: 'Еда', icon: '🍕' }, { id: 2, name: 'Транспорт', icon: '🚕' }, { id: 6, name: 'Другое', icon: '📦' }];
    const expenseService = {
      getCategories: jest.fn(async () => userCategories),
      getRememberedCategory: jest.fn(async (userId, description) => (description === 'такси' ? userCategories[1] : null)),
      getDefaultCategory: jest.fn(async () => userCategories[2])
    };
    receiptService.categoriesById = jest.fn(async () => new Map(userCategories.map(c => [c.id, c])));
    const createHandlers = () => {
      const created = new ReceiptHandlers({
        receiptService,
        expenseHandlers: {
          registerBackView: jest.fn(), familyModeTarget: jest.fn(async () => null), roastNote: jest.fn(async () => ''),
          editErrorText: (lang, error, max) => ExpenseHandlers.prototype.editErrorText.call({ t: (l, k, p) => localizationService.getText(l, k, p) }, lang, error, max)
        },
        expenseService,
        budgetService: { checkAfterExpense: jest.fn(async () => []) },
        userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Europe/Moscow', getUserCurrency: async () => 'RUB' },
        premiumService: { getUserLimits: async () => ({ MAX_DESCRIPTION_LENGTH: 80 }) },
        localizationService,
        formatter: new Formatter({ convert: async (amount) => amount }),
        stateService,
        validator: new EnhancedValidator()
      });
      created.download = jest.fn(async () => Buffer.from('image'));
      return created;
    };
    const handlers = createHandlers();
    let messageId = 100;
    const ctx = {
      chat: { id: 7, type: 'private' },
      from: { id: 7 },
      reply: jest.fn(async () => ({ message_id: ++messageId })),
      sendChatAction: jest.fn(async () => true),
      telegram: { editMessageText: jest.fn(async () => true), editMessageReplyMarkup: jest.fn(async () => true) }
    };
    const receipt = (overrides = {}) => ({ merchant: 'Ярче', date: '2026-10-27', time: '11:47', currency: 'RUB', total: 45, itemsTotal: 45, mismatch: false, lowConfidence: false, items: [{ name: 'Хлеб', amount: 45, categoryId: 1 }], ...overrides });
    const ok = (value, image = tinyJpeg(16, 32)) => ({ receipt: value, image, mimeType: 'image/jpeg', attempts: 1 });
    return { handlers, createHandlers, receiptService, expenseService, stateService, ctx, finish, receipt, ok };
  }
  const t = (key, params) => new LocalizationService().getText('ru', key, params);

  it('the photo handler returns before recognition completes; one receipt per user at a time', async () => {
    const { handlers, receiptService, ctx, finish, receipt, ok } = setup();
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_recognizing'));
    expect(receiptService.recognizePhoto).toHaveBeenCalledWith(7, expect.objectContaining({ image: Buffer.from('image'), prepared: false, retry: true }));
    expect(receiptService.record).not.toHaveBeenCalled();

    await handlers.processImage(ctx, { fileId: 'g', fileSize: 1000, mimeType: 'image/jpeg' });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_busy'));
    expect(receiptService.recognizePhoto).toHaveBeenCalledTimes(1);

    finish(ok(receipt()));
    await handlers.idle();
    expect(receiptService.record).toHaveBeenCalled();
    const [, messageId, , text] = ctx.telegram.editMessageText.mock.calls.pop();
    expect(messageId).toBe(101);
    expect(text).toContain('Хлеб');
    expect(handlers.busyUsers.size).toBe(0);
  });

  it('shows the queue, the local-model hint and «rotating and trying again»', async () => {
    const { handlers, receiptService, ctx, receipt, ok } = setup();
    receiptService.recognizePhoto.mockImplementation(async (userId, { onStatus, onRetry }) => {
      onStatus({ position: 2, local: true });
      onStatus({ position: 0, local: true });
      await onRetry();
      onStatus({ position: 0, local: true });
      return ok(receipt());
    });
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    await handlers.idle();
    const texts = ctx.telegram.editMessageText.mock.calls.map(call => call[3]);
    expect(texts.slice(0, 3)).toEqual([t('receipt_queued', { position: 2 }), t('receipt_recognizing_slow'), t('receipt_retrying')]);
    expect(texts[3]).toContain('Хлеб');
  });

  it('low-confidence results become a draft with tips and «rotate»; nothing recorded until «Записать как есть»', async () => {
    const { handlers, receiptService, ctx, finish, receipt, ok } = setup();
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    finish(ok(receipt({ lowConfidence: true, total: 100 })));
    await handlers.idle();
    expect(receiptService.record).not.toHaveBeenCalled();
    const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls.pop();
    expect(text).toContain(t('receipt_low_confidence', { total: '100 ₽'.replace(' ', '\u00a0') }));
    expect(text).toContain(t('receipt_photo_tips'));
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual(['rdl|i1', 'rda', 'rdt', 'rvd|1', 'gsd', 'rvr', 'rvd|0']);
    // Показанный черновик засчитан в месячный лимит; при записи он заменит свою попытку (attemptId)
    expect(receiptService.attempts).toEqual([{ userId: 7, messageId: 101, outcome: 'draft' }]);
    expect(receiptService.rows.get('7:101').receipt.attemptId).toBe(1);

    const callbackCtx = { ...ctx, callbackQuery: { message: { message_id: 101 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };
    await handlers.resolveDraft(callbackCtx, true);
    expect(receiptService.record).toHaveBeenCalledTimes(1);
    await handlers.resolveDraft(callbackCtx, true);
    expect(receiptService.record).toHaveBeenCalledTimes(1);
    expect(callbackCtx.answerCbQuery).toHaveBeenLastCalledWith(t('receipt_draft_outdated'), { show_alert: true });
    await handlers.rotateAndRetry(callbackCtx);
    expect(callbackCtx.answerCbQuery).toHaveBeenLastCalledWith(t('receipt_rotate_outdated'), { show_alert: true });
  });

  it('unreadable: tips and «rotate 90°» re-run the cached prepared image rotated, one attempt, single-flight respected', async () => {
    const { handlers, receiptService, ctx, finish, receipt, ok } = setup();
    const { ReceiptError } = require('../services/receipt/errors');
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    finish({ error: new ReceiptError('unreadable'), image: tinyJpeg(16, 32), mimeType: 'image/jpeg', attempts: 2 });
    await handlers.idle();
    const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls.pop();
    expect(text).toBe(`${t('receipt_unreadable')}\n\n${t('receipt_photo_tips')}\n\n${t('receipt_attempt_counted')}`);
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data)).toEqual(['rvr']);

    let release;
    receiptService.recognizePhoto.mockImplementation(() => new Promise(resolve => { release = () => resolve(ok(receipt())); }));
    const callbackCtx = { ...ctx, callbackQuery: { message: { message_id: 101 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };
    await handlers.rotateAndRetry(callbackCtx);
    expect(callbackCtx.editMessageText).toHaveBeenCalledWith(t('receipt_retrying'), expect.anything());
    const [, options] = receiptService.recognizePhoto.mock.calls[receiptService.recognizePhoto.mock.calls.length - 1];
    expect(options).toMatchObject({ prepared: true, retry: false });
    const rotated = jpegJs.decode(options.image);
    expect([rotated.width, rotated.height]).toEqual([32, 16]);

    await handlers.processImage(ctx, { fileId: 'g', fileSize: 1000, mimeType: 'image/jpeg' });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_busy'));
    release();
    await handlers.idle();
    expect(receiptService.record).toHaveBeenCalledTimes(1);
    await handlers.rotateAndRetry(callbackCtx);
    expect(callbackCtx.answerCbQuery).toHaveBeenLastCalledWith(t('receipt_rotate_outdated'), { show_alert: true });
  });

  it('a draft and «rotate» survive a bot restart; buttons that can do nothing more are removed', async () => {
    const { createHandlers, handlers, receiptService, ctx, finish, receipt, ok } = setup();
    const { runImageTask } = require('../services/receipt/imageWorker');
    const photo = tinyJpeg(48, 96);
    await handlers.processImage(ctx, { fileId: 'photo-1', fileSize: 1000, mimeType: 'image/jpeg' });
    const prepared = (await runImageTask('prepare', photo, { mimeType: 'image/jpeg' })).image;
    finish({ ...ok(receipt({ lowConfidence: true, total: 100 }), prepared), turn: 180 });
    await handlers.idle();
    expect(receiptService.rows.get('7:101').frame).toMatchObject({ fileId: 'photo-1', mimeType: 'image/jpeg', turn: 180 });

    // Перезапуск: памяти обработчика больше нет, черновик — в хранилище
    const restarted = createHandlers();
    restarted.download = jest.fn(async () => photo);
    const callbackCtx = () => ({
      ...ctx, callbackQuery: { message: { message_id: 101 } }, answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => true), editMessageReplyMarkup: jest.fn(async () => true)
    });
    receiptService.recognizePhoto.mockImplementation(async () => ({ error: new (require('../services/receipt/errors').ReceiptError)('unreadable'), image: prepared, mimeType: 'image/jpeg', attempts: 1, turn: 0 }));
    const rotate = callbackCtx();
    await restarted.rotateAndRetry(rotate);
    await restarted.idle();
    expect(restarted.download).toHaveBeenCalledWith(rotate, 'photo-1');
    const [, options] = receiptService.recognizePhoto.mock.calls[receiptService.recognizePhoto.mock.calls.length - 1];
    // Тот же кадр, что был до перезапуска (подготовленное фото, уже повёрнутое на 180°), и ещё 90° по кнопке
    const turned = (await runImageTask('rotate', prepared, { degrees: 180 })).image;
    const expected = (await runImageTask('rotate', turned, { degrees: 90 })).image;
    expect(Buffer.compare(options.image, expected)).toBe(0);
    expect(options).toMatchObject({ prepared: true, retry: false });
    expect(receiptService.rows.get('7:101').frame.turn).toBe(270);

    // Черновик после перезапуска записывается; повторное нажатие объясняет и убирает кнопки
    await receiptService.saveDraft(7, 101, { receipt: receipt({ lowConfidence: true }), timezone: 'Europe/Moscow', frame: null });
    const again = createHandlers();
    await again.resolveDraft(callbackCtx(), true);
    expect(receiptService.record).toHaveBeenCalledWith(7, expect.objectContaining({ merchant: 'Ярче' }), expect.objectContaining({ timezone: 'Europe/Moscow' }));
    const stale = callbackCtx();
    await again.resolveDraft(stale, true);
    expect(receiptService.record).toHaveBeenCalledTimes(1);
    expect(stale.answerCbQuery).toHaveBeenCalledWith(t('receipt_draft_outdated'), { show_alert: true });
    expect(stale.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [] });
  }, 20000); // шесть задач в потоках обработки изображений: под нагрузкой сервера дольше 5 с по умолчанию

  // Кнопка на сообщении messageId (черновик привязан к сообщению)
  const buttonCtx = (ctx, messageId) => ({
    ...ctx, callbackQuery: { message: { message_id: messageId } }, answerCbQuery: jest.fn(async () => true),
    editMessageText: jest.fn(async () => true), editMessageReplyMarkup: jest.fn(async () => true)
  });
  const callbacks = (keyboard) => keyboard.flat().map(b => b.callback_data);

  it('draft edits (line, category, remove, add, date) persist, recompute the check and survive a restart; «Записать» records the edited lines', async () => {
    const { handlers, createHandlers, receiptService, stateService, ctx, finish, receipt, ok } = setup();
    const { localToday, addDays } = require('../utils/period');
    const { packDate } = require('../utils/recordDate');
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    finish(ok(receipt({
      lowConfidence: true, total: 200, itemsTotal: 1134,
      items: [
        { name: 'Хлеб', amount: 45, quantity: 1, price: 45, categoryId: 1 },
        { name: 'Молоко', amount: 90, quantity: 2, price: 45, categoryId: 1 },
        { name: 'Мусор', amount: 999, quantity: 1, price: null, categoryId: 1 }
      ]
    })));
    await handlers.idle();
    const row = () => [...receiptService.rows.entries()].find(([, value]) => value.receipt);
    expect(row()[0]).toBe('7:101');

    // Экран строки: название, сумма, количество × цена, категория
    const line = buttonCtx(ctx, 101);
    await handlers.showDraftLine(line, 2);
    const [lineText, lineExtra] = line.editMessageText.mock.calls[0];
    expect(lineText).toContain('Молоко');
    expect(lineText).toContain(t('receipt_line_quantity', { quantity: '2', price: '45\u00a0₽' }));
    expect(callbacks(lineExtra.reply_markup.inline_keyboard)).toEqual(['rde|i2', 'rdc|i2', 'rdx|i2', 'rdp|0']);

    // Кнопка старого формата (номер строки без id) ничего не правит: «черновик обновился» и черновик заново
    const legacy = buttonCtx(ctx, 101);
    await handlers.removeDraftLine(legacy, null);
    expect(legacy.answerCbQuery).toHaveBeenCalledWith(t('receipt_draft_changed'), { show_alert: true });
    expect(row()[1].receipt.items).toHaveLength(3);

    // ✏️ Изменить → ввод текстом → черновик заново под вводом, у старого сообщения кнопки убраны
    await handlers.startDraftLineEdit(buttonCtx(ctx, 101), 2);
    expect(stateService.getUserState(7)).toBe('rd_in:101:e:2');
    await handlers.handleDraftInput(ctx, '100 молоко 2,5%', 'ru', stateService.getUserState(7));
    expect(stateService.getUserState(7)).toBeUndefined();
    expect(row()[0]).toBe('7:102');
    expect(row()[1].receipt.items[1]).toMatchObject({ name: 'молоко 2,5%', amount: 100, quantity: 2, price: 50 });
    expect(row()[1].receipt.edited).toBe(true);
    expect(ctx.telegram.editMessageReplyMarkup).toHaveBeenCalledWith(7, 101, undefined, { inline_keyboard: [] });
    const [resent, resentExtra] = ctx.reply.mock.calls[ctx.reply.mock.calls.length - 1];
    expect(resent).not.toContain(t('receipt_photo_tips'));
    expect(callbacks(resentExtra.reply_markup.inline_keyboard)).not.toContain('rvr');
    expect(resentExtra.reply_markup.inline_keyboard.flat().find(b => b.callback_data === 'rvd|1').text).toBe(t('button_receipt_record_edited'));

    // 🏷 Категория и 🗑 Убрать строку — в том же сообщении, черновик перерисован со сверкой итога
    await handlers.setDraftLineCategory(buttonCtx(ctx, 102), 2, 2);
    expect(row()[1].receipt.items[1].categoryId).toBe(2);
    const remove = buttonCtx(ctx, 102);
    await handlers.removeDraftLine(remove, 3);
    // Двойное нажатие той же кнопки (тот же id строки) больше ничего не убирает
    await handlers.removeDraftLine(buttonCtx(ctx, 102), 3);
    expect(row()[1].receipt.items.map(item => item.name)).toEqual(['Хлеб', 'молоко 2,5%']);
    expect(row()[1].receipt.itemsTotal).toBe(145);
    expect(remove.editMessageText.mock.calls[0][0]).toContain(t('receipt_draft_sum_diff', { items: '145\u00a0₽', total: '200\u00a0₽', diff: '55\u00a0₽' }));

    // ➕ Добавить строку: категория по запомненному названию
    await handlers.startDraftLineAdd(buttonCtx(ctx, 102));
    await handlers.handleDraftInput(ctx, 'такси', 'ru', stateService.getUserState(7));
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_line_need_amount'), { parse_mode: 'Markdown' });
    await handlers.handleDraftInput(ctx, '55 такси', 'ru', stateService.getUserState(7));
    // черновик переехал на последнее присланное сообщение (подсказка про сумму тоже была сообщением)
    const lastSent = async () => (await ctx.reply.mock.results[ctx.reply.mock.results.length - 1].value).message_id;
    const afterAdd = await lastSent();
    expect(row()[0]).toBe(`7:${afterAdd}`);
    expect(row()[1].receipt.items[2]).toMatchObject({ name: 'такси', amount: 55, categoryId: 2 });
    expect(ctx.reply.mock.calls[ctx.reply.mock.calls.length - 1][0]).toContain(t('receipt_draft_sum_ok', { items: '200\u00a0₽' }));

    // 📅 Дата: кнопкой (вчера) и текстом (ошибки не сбрасывают ввод)
    const today = localToday('Europe/Moscow');
    const picker = buttonCtx(ctx, afterAdd);
    await handlers.showDraftDatePicker(picker);
    const pickerData = callbacks(picker.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard);
    expect(pickerData.slice(0, 3)).toEqual([0, -1, -2].map(offset => `rdt|${packDate(addDays(today, offset))}`));
    expect(pickerData.slice(-2)).toEqual(['rdto', 'rdp|0']);
    await handlers.setDraftDateFromButton(buttonCtx(ctx, afterAdd), packDate(addDays(today, -1)));
    expect(row()[1].receipt).toMatchObject({ date: addDays(today, -1), time: '11:47', dateManual: true });
    await handlers.startDraftDateInput(buttonCtx(ctx, afterAdd));
    const dateState = stateService.getUserState(7);
    expect(dateState).toBe(`rd_in:${afterAdd}:d`);
    await handlers.handleDraftInput(ctx, '30.02.2026', 'ru', dateState);
    expect(ctx.reply).toHaveBeenLastCalledWith(t('date_error_format'), { parse_mode: 'Markdown' });
    const [y, m, d] = addDays(today, 1).split('-');
    await handlers.handleDraftInput(ctx, `${d}.${m}.${y}`, 'ru', dateState);
    expect(ctx.reply).toHaveBeenLastCalledWith(t('date_error_future'), { parse_mode: 'Markdown' });
    const [oy, om, od] = addDays(today, -400).split('-');
    await handlers.handleDraftInput(ctx, `${od}.${om}.${oy}`, 'ru', dateState);
    expect(ctx.reply).toHaveBeenLastCalledWith(t('date_error_too_old'), { parse_mode: 'Markdown' });
    const [wy, wm, wd] = addDays(today, -20).split('-');
    await handlers.handleDraftInput(ctx, `${wd}.${wm}.${wy.slice(2)}`, 'ru', dateState);
    const afterDate = await lastSent();
    expect(row()[0]).toBe(`7:${afterDate}`);
    expect(row()[1].receipt.date).toBe(addDays(today, -20));

    // Перезапуск: черновик с правками в хранилище; «Записать» записывает исправленные строки
    const restarted = createHandlers();
    await restarted.resolveDraft(buttonCtx(ctx, afterDate), true);
    expect(receiptService.record).toHaveBeenCalledTimes(1);
    const [, recorded] = receiptService.record.mock.calls[0];
    expect(recorded.items.map(({ name, amount, categoryId }) => ({ name, amount, categoryId }))).toEqual([
      { name: 'Хлеб', amount: 45, categoryId: 1 },
      { name: 'молоко 2,5%', amount: 100, categoryId: 2 },
      { name: 'такси', amount: 55, categoryId: 2 }
    ]);
    expect(recorded).toMatchObject({ itemsTotal: 200, mismatch: false, date: addDays(today, -20), dateManual: true, edited: true });
    expect(row()).toBeUndefined();
  });

  it('a draft being recorded cannot be edited; an empty draft cannot be recorded; stale draft buttons are removed; rotate keeps edits', async () => {
    const { handlers, receiptService, stateService, ctx, receipt } = setup();
    await receiptService.saveDraft(7, 201, { receipt: receipt({ lowConfidence: true, total: 45 }), timezone: 'Europe/Moscow', frame: { fileId: 'f', mimeType: 'image/jpeg', turn: 0 } });

    // Записывается: правка кнопкой — alert, ввод текстом — объяснение, черновик не тронут
    receiptService.rows.get('7:201').taken = true;
    const busy = buttonCtx(ctx, 201);
    await handlers.removeDraftLine(busy, 1);
    expect(busy.answerCbQuery).toHaveBeenCalledWith(t('receipt_draft_busy'), { show_alert: true });
    expect(receiptService.rows.get('7:201').receipt.items).toHaveLength(1);
    await handlers.handleDraftInput(ctx, '50', 'ru', 'rd_in:201:e:1');
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_draft_busy'));
    expect(receiptService.rows.get('7:201').receipt.items[0].amount).toBe(45);
    receiptService.rows.get('7:201').taken = false;

    // Убрали последнюю строку: подсказка, кнопки «Записать» нет, старая кнопка — alert, черновик остаётся
    const empty = buttonCtx(ctx, 201);
    await handlers.removeDraftLine(empty, 1);
    const [emptyText, emptyExtra] = empty.editMessageText.mock.calls[0];
    expect(emptyText).toContain(t('receipt_draft_empty'));
    expect(callbacks(emptyExtra.reply_markup.inline_keyboard)).toEqual(['rda', 'rdt', 'rvd|0']);
    const record = buttonCtx(ctx, 201);
    await handlers.resolveDraft(record, true);
    expect(record.answerCbQuery).toHaveBeenCalledWith(t('receipt_draft_empty'), { show_alert: true });
    expect(receiptService.record).not.toHaveBeenCalled();
    expect(receiptService.rows.get('7:201').taken).toBe(false);

    // Исправленный черновик не поворачивается: alert, черновик и кнопки остаются
    const rotate = buttonCtx(ctx, 201);
    await handlers.rotateAndRetry(rotate);
    expect(rotate.answerCbQuery).toHaveBeenCalledWith(t('receipt_rotate_edited'), { show_alert: true });
    expect(rotate.editMessageReplyMarkup).not.toHaveBeenCalled();
    expect(receiptService.rows.get('7:201')).toBeDefined();
    expect(receiptService.recognizePhoto).not.toHaveBeenCalled();

    // Черновик отменён: любая кнопка правки объясняет и убирает кнопки; ввод текстом — «устарел»
    await handlers.resolveDraft(buttonCtx(ctx, 201), false);
    for (const press of [(c) => handlers.showDraftLine(c, 1), (c) => handlers.showDraft(c, 0), (c) => handlers.setDraftLineCategory(c, 1, 1), (c) => handlers.startDraftLineAdd(c), (c) => handlers.showDraftDatePicker(c)]) {
      const stale = buttonCtx(ctx, 201);
      await press(stale);
      expect(stale.answerCbQuery).toHaveBeenCalledWith(t('receipt_draft_outdated'), { show_alert: true });
      expect(stale.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [] });
    }
    stateService.setUserState(7, 'rd_in:201:a');
    await handlers.handleDraftInput(ctx, '10 хлеб', 'ru', 'rd_in:201:a');
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_draft_outdated'));
    expect(stateService.getUserState(7)).toBeUndefined();
  });

  it('draft and receipt callback_data fit 64 bytes; a recorded receipt moves to another day with all its expenses', async () => {
    const { handlers, receiptService, ctx, receipt } = setup();
    const { localToday, addDays } = require('../utils/period');
    const { packDate } = require('../utils/recordDate');
    const items = Array.from({ length: 45 }, (_, i) => ({ name: `Позиция ${i + 1}`, amount: 10, quantity: 1, price: 10, categoryId: 1 }));
    const view = await handlers.buildDraftView(7, 'ru', receipt({ lowConfidence: true, total: 450, items }), { canRotate: true, page: 2 });
    expect(callbacks(view.keyboard)).toEqual(expect.arrayContaining(['rdl|i41', 'rdl|i45', 'rdp|1', 'noop']));
    expect(view.text).toContain('41. Позиция 41');
    expect(view.text).not.toContain('40. Позиция 40');

    receiptService.setDate = jest.fn(async () => ({ expenses: 1 }));
    const list = await handlers.buildReceiptView(7, 'ru', 123456789, 0);
    expect(callbacks(list.keyboard)).toContain('rt|123456789');
    const picker = buttonCtx(ctx, 300);
    await handlers.showReceiptDatePicker(picker, 123456789);
    const data = callbacks(picker.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard);
    for (const item of [...data, ...callbacks(view.keyboard)]) expect(Buffer.byteLength(item)).toBeLessThanOrEqual(64);
    const yesterday = addDays(localToday('Europe/Moscow'), -1);
    expect(data).toContain(`rtd|123456789|${packDate(yesterday)}`);
    const pick = buttonCtx(ctx, 300);
    await handlers.setReceiptDate(pick, 123456789, packDate(yesterday));
    expect(receiptService.setDate).toHaveBeenCalledWith(7, 123456789, yesterday, 'Europe/Moscow');
    expect(pick.answerCbQuery).toHaveBeenCalledWith(t('receipt_date_changed', { date: yesterday.split('-').reverse().join('.'), count: 1 }));
    const future = buttonCtx(ctx, 300);
    await handlers.setReceiptDate(future, 123456789, packDate(addDays(localToday('Europe/Moscow'), 1)));
    expect(future.answerCbQuery).toHaveBeenCalledWith(t('date_error_future'), { show_alert: true });
    expect(receiptService.setDate).toHaveBeenCalledTimes(1);
  });

  it('accepts JPEG files up to 20 MB at full resolution; HEIC, huge files and big non-JPEG get a hint', async () => {
    const { handlers, receiptService, ctx, finish, receipt, ok } = setup();
    const doc = (document) => handlers.handleImageDocument({ ...ctx, message: { document } });
    await doc({ file_id: 'big', file_name: 'IMG_1.jpg', mime_type: 'image/jpeg', file_size: 8 * 1024 * 1024 });
    expect(receiptService.recognizePhoto).toHaveBeenCalledTimes(1);
    finish(ok(receipt()));
    await handlers.idle();
    await doc({ file_id: 'h', file_name: 'IMG_2.HEIC', mime_type: 'image/heic', file_size: 300000 });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_heic_unsupported'));
    await doc({ file_id: 'x', file_name: 'IMG_3.jpg', mime_type: 'image/jpeg', file_size: 25 * 1024 * 1024 });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_file_too_big'));
    await doc({ file_id: 'p', file_name: 'scan.png', mime_type: 'image/png', file_size: 3 * 1024 * 1024 });
    expect(ctx.reply).toHaveBeenLastCalledWith(t('receipt_send_as_photo'));
    expect(receiptService.recognizePhoto).toHaveBeenCalledTimes(1);
    expect(handlers.busyUsers.size).toBe(0);
  });
});

describe('receipt image preparation', () => {
  const jpegJs = require('jpeg-js');
  const { prepareReceiptImage, rotateJpeg, orientedView } = require('../services/receipt/imagePrep');
  const { runImageTask } = require('../services/receipt/imageWorker');

  // Кадр: тёмный шумный фон и белый «чек» со строками «слов» (тёмные отрезки), строки горизонтальные или вертикальные
  function receiptPhoto({ width, height, paper, vertical = false, seed = 1 }) {
    let state = seed;
    const random = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
    const data = Buffer.alloc(width * height * 4, 255);
    const set = (x, y, v) => {
      const i = (y * width + x) * 4;
      data[i] = v;
      data[i + 1] = v * 0.95;
      data[i + 2] = v * 0.85;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, 95 + (random() - 0.5) * 20);
    const { x: px, y: py, w: pw, h: ph } = paper;
    for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) set(x, y, 235);
    const along = vertical ? ph : pw;
    const across = vertical ? pw : ph;
    const unit = Math.max(2, Math.round(Math.min(pw, ph) / 60));
    for (let line = unit * 3; line + unit * 2 < across - unit * 2; line += unit * 4) {
      for (let pos = unit * 2; pos < along - unit * 2;) {
        const word = unit * (3 + Math.floor(random() * 6));
        for (let a = pos; a < Math.min(pos + word, along - unit * 2); a++) {
          for (let b = line; b < line + unit * 2; b++) {
            if (random() < 0.75) set(vertical ? px + b : px + a, vertical ? py + a : py + b, 30);
          }
        }
        pos += word + unit * 2;
      }
    }
    return Buffer.from(jpegJs.encode({ data, width, height }, 90).data);
  }

  function withOrientation(buffer, value) {
    const tiff = Buffer.alloc(26);
    tiff.write('MM', 0, 'ascii');
    tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4); tiff.writeUInt16BE(1, 8);
    tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(value, 18);
    const exif = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
    const head = Buffer.alloc(4);
    head.writeUInt16BE(0xffe1, 0);
    head.writeUInt16BE(exif.length + 2, 2);
    return Buffer.concat([buffer.subarray(0, 2), head, exif, buffer.subarray(2)]);
  }

  const contains = (crop, paper) => crop.x <= paper.x && crop.y <= paper.y
    && crop.x + crop.width >= paper.x + paper.w && crop.y + crop.height >= paper.y + paper.h;

  it('crops a small receipt out of a large frame and keeps horizontal lines as they are', () => {
    const paper = { x: 700, y: 150, w: 420, h: 1100 };
    const { info } = prepareReceiptImage(receiptPhoto({ width: 2000, height: 1500, paper }));
    expect(info.prepared).toBe(true);
    expect(info.crop.cropped).toBe(true);
    expect(contains(info.crop, { ...paper, x: paper.x + 10, y: paper.y + 10, w: paper.w - 20, h: paper.h - 20 })).toBe(true);
    expect(info.crop.width * info.crop.height).toBeLessThan(2000 * 1500 * 0.3);
    expect(info.rotation).toBe(0);
    expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(1280);
    expect(info).toMatchObject({ small: false, lowResolution: false, reencoded: true });
  });

  it('enlarges a far-away receipt and turns vertical lines horizontal', () => {
    const paper = { x: 380, y: 350, w: 260, h: 140 };
    const { image, info } = prepareReceiptImage(receiptPhoto({ width: 1000, height: 800, paper, vertical: true, seed: 7 }));
    expect(info.crop.cropped).toBe(true);
    expect(contains(info.crop, { ...paper, x: paper.x + 6, y: paper.y + 6, w: paper.w - 12, h: paper.h - 12 })).toBe(true);
    expect(info.rotation).toBe(90);
    expect(info.height).toBeGreaterThan(info.width); // строки шли вдоль короткой стороны чека
    const decoded = jpegJs.decode(image);
    expect(Math.max(decoded.width, decoded.height)).toBeGreaterThanOrEqual(1024);
    expect(info).toMatchObject({ small: true, lowResolution: true }); // сжатое фото с мелким чеком — «пришли файлом»
  });

  it('passes an upright receipt that fills a Telegram-size frame through without re-encoding', () => {
    const photo = receiptPhoto({ width: 960, height: 1280, paper: { x: 0, y: 0, w: 960, h: 1280 }, seed: 5 });
    const { image, info } = prepareReceiptImage(photo);
    expect(info).toMatchObject({ prepared: true, reencoded: false, rotation: 0, small: false, crop: { cropped: false } });
    expect(image).toBe(photo);
  });

  it('applies EXIF orientation before looking for the receipt', () => {
    // Сохранено «боком» (строки вертикальные) с EXIF 6 — для человека чек ровный
    const stored = receiptPhoto({ width: 1200, height: 900, paper: { x: 150, y: 250, w: 900, h: 400 }, vertical: true, seed: 3 });
    const asIs = prepareReceiptImage(stored).info;
    const tagged = prepareReceiptImage(withOrientation(stored, 6)).info;
    expect(asIs.source.orientation).toBe(1);
    expect(asIs.rotation).toBe(90);
    expect(tagged.source.orientation).toBe(6);
    expect(tagged.rotation).toBe(0);
    expect(tagged.height).toBeGreaterThan(tagged.width);
    const view = orientedView(4032, 3024, 6);
    expect([view.width, view.height]).toEqual([3024, 4032]);
    expect(view.map(0, 0)).toEqual([0, 3024]);
    expect(orientedView(4032, 3024, 8).map(0, 0)).toEqual([4032, 0]);
  });

  it('passes non-JPEG and broken files through untouched', () => {
    const png = Buffer.from('89504e470d0a1a0a0000', 'hex');
    expect(prepareReceiptImage(png, { mimeType: 'image/png' })).toMatchObject({ image: png, mimeType: 'image/png', info: { prepared: false } });
    const broken = Buffer.from('ffd8ffe000104a464946', 'hex');
    expect(prepareReceiptImage(broken).image).toBe(broken);
  });

  it('rotates a prepared JPEG and runs the work in a worker thread', async () => {
    const source = Buffer.from(jpegJs.encode({ data: Buffer.alloc(20 * 10 * 4, 128), width: 20, height: 10 }, 80).data);
    const rotated = jpegJs.decode(rotateJpeg(source, 90));
    expect([rotated.width, rotated.height]).toEqual([10, 20]);
    const viaWorker = await runImageTask('rotate', source, { degrees: 270 });
    const decoded = jpegJs.decode(viaWorker.image);
    expect([decoded.width, decoded.height]).toEqual([10, 20]);
    const prepared = await runImageTask('prepare', receiptPhoto({ width: 800, height: 600, paper: { x: 300, y: 50, w: 200, h: 500 } }), {});
    expect(prepared.info.prepared).toBe(true);
    expect(Buffer.isBuffer(prepared.image)).toBe(true);
  });
});

describe('reconciling items with the printed total', () => {
  const categoriesList = [{ id: 1, names: ['Еда'] }, { id: 6, names: ['Другое'] }];
  const check = (raw) => normalizeReceipt(raw, { categories: categoriesList, fallbackCategoryId: 6, defaultCurrency: 'RUB', supportedCurrencies: SUPPORTED_CURRENCIES });
  const line = (name, quantity, price, amount) => ({ name, quantity, price, amount });

  it('fixes exactly the lines whose amount ≠ quantity × price when that explains the total', () => {
    const receipt = check({ is_receipt: true, total: 345.35, items: [
      line('Рагу', 2, 139.99, 279.94), line('Морковь', 0.522, 24.99, 13.04), line('Лук', 0.62, 33.99, 21.70), line('Соус', 1, 31.26, 31.26)
    ] });
    expect(receipt.items.map(item => item.amount)).toEqual([279.98, 13.04, 21.07, 31.26]);
    expect(receipt).toMatchObject({ mismatch: false, itemsTotal: 345.35, checks: { corrected: 2, badLines: 0 } });
  });

  it('fixes a single line that explains the residual and leaves correct lines alone', () => {
    const receipt = check({ is_receipt: true, total: 1160.61, items: [
      line('Пакет', 1, 8, 8), line('Рагу', 2, 139.99, 279.94), line('Молоко', 9, 74.99, 74.99), line('Остальное', 1, 797.64, 797.64)
    ] });
    // Молоко 9×74.99 — ошибка количества, сумму 74.99 оставляем; виновата строка «Рагу»
    expect(receipt.items.map(item => item.amount)).toEqual([8, 279.98, 74.99, 797.64]);
    expect(receipt).toMatchObject({ mismatch: false, itemsTotal: 1160.61, checks: { corrected: 1, badLines: 1 } });
  });

  it('keeps amounts as read and warns when no line correction explains the difference', () => {
    const receipt = check({ is_receipt: true, total: 300, items: [line('A', 1, 100, 100), line('B', 1, 150, 150)] });
    expect(receipt.items.map(item => item.amount)).toEqual([100, 150]);
    expect(receipt).toMatchObject({ mismatch: true, lowConfidence: true, checks: { corrected: 0 } });
    const close = check({ is_receipt: true, merchant: 'Ярче', total: 251, items: [line('A', 1, 100, 100), line('B', 1, 150, 150)] });
    expect(close).toMatchObject({ mismatch: true, lowConfidence: false });
    expect(close.items.map(item => item.amount)).toEqual([100, 150]);
  });

  it('still spreads an explicit receipt-level discount line proportionally', () => {
    const receipt = check({ is_receipt: true, total: 270, items: [{ name: 'A', amount: 100 }, { name: 'B', amount: 200 }, { name: 'Скидка', amount: -30 }] });
    expect(receipt.items.map(item => item.amount)).toEqual([90, 180]);
    expect(receipt.mismatch).toBe(false);
  });
});

describe('retry selection', () => {
  const { ReceiptError } = require('../services/receipt/errors');
  const r = (lowConfidence, items, sumDeviation = 0) => ({ receipt: { lowConfidence, items, checks: { sumDeviation } } });
  const good = { name: 'a', quantity: 2, price: 10, amount: 20 };
  const bad = { name: 'b', quantity: 2, price: 10, amount: 25 };

  it('retries on unreadable answers and low confidence only', () => {
    expect(ReceiptService.needsRetry({ error: new ReceiptError('unreadable') })).toBe(true);
    expect(ReceiptService.needsRetry({ error: new ReceiptError('not_receipt') })).toBe(false);
    expect(ReceiptService.needsRetry({ error: new ReceiptError('network') })).toBe(false);
    expect(ReceiptService.needsRetry(r(true, [good]))).toBe(true);
    expect(ReceiptService.needsRetry(r(false, [good]))).toBe(false);
  });

  it('keeps the better result: recognized over error, confident over draft, more exact lines, closer sum', () => {
    const error = { error: new ReceiptError('unreadable') };
    expect(ReceiptService.pickBetter(error, r(true, [bad]))).toEqual(r(true, [bad]));
    expect(ReceiptService.pickBetter(r(true, [good]), error)).toEqual(r(true, [good]));
    const confident = r(false, [bad]);
    expect(ReceiptService.pickBetter(r(true, [good, good]), confident)).toBe(confident);
    const exact = r(true, [good, good]);
    expect(ReceiptService.pickBetter(r(true, [good, bad]), exact)).toBe(exact);
    const closer = r(true, [good], 0.04);
    expect(ReceiptService.pickBetter(r(true, [good], 0.2), closer)).toBe(closer);
    const first = r(true, [good], 0.1);
    expect(ReceiptService.pickBetter(first, r(true, [good], 0.1))).toBe(first);
  });

  // Чек «Перспектива»: 9 строк, сумма сходится с итогом, сомнения только в строках — кадр стоит правильно, не поворачиваем;
  // а если повтор всё же был, одна «сошедшаяся» строка с перевёрнутого кадра не заменяет 9 прочитанных
  it('a receipt read upright (3+ lines, sum within 3%) is not re-read rotated, and a 1–2 line answer never replaces it', () => {
    const nine = r(true, Array(9).fill(bad), 0.001);
    expect(ReceiptService.needsRetry(nine)).toBe(false);
    expect(ReceiptService.needsRetry(r(true, Array(9).fill(bad), 0.2))).toBe(true);
    expect(ReceiptService.needsRetry(r(true, [bad, bad], 0.001))).toBe(true);
    const invented = r(false, [good], 0);
    expect(ReceiptService.pickBetter(nine, invented)).toBe(nine);
    expect(ReceiptService.pickBetter(invented, nine)).toBe(nine);
  });

  it('recognizePhoto prepares the image, retries rotated by 180° once and keeps the better answer', async () => {
    const jpegJs = require('jpeg-js');
    const pixels = Buffer.alloc(40 * 80 * 4, 255);
    for (let i = 0; i < 40 * 80; i++) pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = (i / (40 * 80)) * 255; // градиент: поворот меняет кадр
    const photo = Buffer.from(jpegJs.encode({ data: pixels, width: 40, height: 80 }, 80).data);
    const answers = [
      () => { throw new ReceiptError('unreadable', 'invalid JSON'); },
      () => ({ is_receipt: true, total: 20, items: [{ name: 'Хлеб', quantity: 2, price: 10, amount: 20 }] })
    ];
    const provider = { name: 'fake', configured: true, recognize: jest.fn(async () => answers.shift()()) };
    const service = new ReceiptService({
      receiptRepository: {},
      provider,
      expenseService: {
        getCategories: jest.fn(async () => [{ id: 6, user_id: 0, name: 'Другое' }]),
        getDefaultCategory: jest.fn(async () => ({ id: 6, name: 'Другое' })),
        translateCategoryName: (name) => name
      },
      premiumService: {},
      localizationService: new LocalizationService(),
      funnelService: {}
    });
    const onRetry = jest.fn();
    const result = await service.recognizePhoto(777, { image: photo, mimeType: 'image/jpeg', lang: 'ru', currency: 'RUB', timezone: 'UTC', onRetry });
    expect(result.attempts).toBe(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.receipt.items[0]).toMatchObject({ name: 'Хлеб', amount: 20 });
    expect(result).toMatchObject({ small: true, receipt: { lowConfidence: true, checks: { smallImage: true } } }); // кадр 40×80 — «мелкий чек»
    const [firstCall, secondCall] = provider.recognize.mock.calls.map(call => call[0].image);
    const a = jpegJs.decode(firstCall);
    const b = jpegJs.decode(secondCall);
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    expect(Buffer.compare(firstCall, secondCall)).not.toBe(0);

    const three = [{ name: 'Хлеб', quantity: 2, price: 10, amount: 20 }, { name: 'Молоко', quantity: 1, price: 80, amount: 80 }, { name: 'Сыр', quantity: 1, price: 200, amount: 200 }];
    provider.recognize.mockImplementation(async () => ({ is_receipt: true, total: 300, items: three }));
    const once = await service.recognizePhoto(777, { image: photo, mimeType: 'image/jpeg', lang: 'ru', currency: 'RUB', timezone: 'UTC', onRetry });
    expect(once.attempts).toBe(1);
    const noRetry = await service.recognizePhoto(777, { image: Buffer.from('png'), mimeType: 'image/png', lang: 'ru', currency: 'RUB', timezone: 'UTC', retry: true });
    expect(noRetry.mimeType).toBe('image/png');
  });
});

describe('small receipt with one or two lines', () => {
  const categoriesList = [{ id: 1, names: ['Еда'] }, { id: 6, names: ['Другое'] }];
  const check = (raw) => normalizeReceipt(raw, { categories: categoriesList, fallbackCategoryId: 6, defaultCurrency: 'RUB', supportedCurrencies: SUPPORTED_CURRENCIES });
  // Ответ qwen2.5vl:3b на далёкое фото чека «Ярче» (13 позиций): одна выдуманная строка на весь итог
  const invented = { is_receipt: true, merchant: 'Ярче', date: '2026-10-27', time: '18:30', currency: 'RUB', total: 1160.55, items: [{ name: 'Кофейная чашка', quantity: 1, price: 1160.55, amount: 1160.55, category: 'Еда' }] };

  it('the invented single line passes every arithmetic check on its own', () => {
    expect(check(invented)).toMatchObject({ lowConfidence: false, mismatch: false });
  });

  it('becomes a draft when the receipt is small in the frame', () => {
    const result = ReceiptService.distrustSparse({ receipt: check(invented) }, true);
    expect(result.receipt).toMatchObject({ lowConfidence: true, checks: { smallImage: true } });
    expect(ReceiptService.distrustSparse({ receipt: check(invented) }, false).receipt.lowConfidence).toBe(false);
    const withoutPrice = check({ ...invented, items: [{ name: 'Кофейная чашка', amount: 1160.55 }] });
    expect(ReceiptService.distrustSparse({ receipt: withoutPrice }, true).receipt.lowConfidence).toBe(true);
  });

  it('keeps small receipts with several consistent lines, and errors, as they are', () => {
    const three = check({ ...invented, total: 30, items: [{ name: 'A', amount: 10 }, { name: 'B', amount: 10 }, { name: 'C', amount: 10 }] });
    expect(ReceiptService.distrustSparse({ receipt: three }, true).receipt.lowConfidence).toBe(false);
    const { ReceiptError } = require('../services/receipt/errors');
    const error = { error: new ReceiptError('unreadable') };
    expect(ReceiptService.distrustSparse(error, true)).toBe(error);
  });

  it('a compressed photo of a small receipt suggests sending a file, and «rotate» keeps that hint', async () => {
    const jpegJs = require('jpeg-js');
    const frame = Buffer.from(jpegJs.encode({ data: Buffer.alloc(16 * 32 * 4, 200), width: 16, height: 32 }, 80).data);
    const Formatter = require('../utils/formatter');
    const receiptService = {
      configured: true,
      provider: { acceptsHeic: false },
      checkLimit: jest.fn(async () => ({ isPremium: false, limit: 10, used: 0, remaining: 10 })),
      recognizePhoto: jest.fn(async () => ({ receipt: ReceiptService.distrustSparse({ receipt: check(invented) }, true).receipt, image: frame, mimeType: 'image/jpeg', attempts: 2, small: true, lowResolution: true })),
      record: jest.fn(async () => 1),
      categoriesById: jest.fn(async () => new Map([[1, { id: 1, name: 'Еда', icon: '🍕' }]])),
      ...memoryDraftStore()
    };
    const handlers = new ReceiptHandlers({
      receiptService,
      expenseHandlers: { registerBackView: jest.fn(), familyModeTarget: jest.fn(async () => null), roastNote: jest.fn(async () => '') },
      budgetService: { checkAfterExpense: jest.fn(async () => []) },
      userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Europe/Moscow', getUserCurrency: async () => 'RUB' },
      localizationService: new LocalizationService(),
      formatter: new Formatter({ convert: async (amount) => amount })
    });
    handlers.download = jest.fn(async () => frame);
    const ctx = {
      chat: { id: 7, type: 'private' },
      from: { id: 7 },
      reply: jest.fn(async () => ({ message_id: 101 })),
      sendChatAction: jest.fn(async () => true),
      telegram: { editMessageText: jest.fn(async () => true) }
    };
    const t = (key) => new LocalizationService().getText('ru', key);
    await handlers.processImage(ctx, { fileId: 'f', fileSize: 1000, mimeType: 'image/jpeg' });
    await handlers.idle();
    expect(receiptService.record).not.toHaveBeenCalled();
    const [, , , text, extra] = ctx.telegram.editMessageText.mock.calls.pop();
    expect(text).toContain(`${t('receipt_photo_tips')}\n${t('receipt_small_photo_tip')}`);
    expect(extra.reply_markup.inline_keyboard.flat().map(b => b.callback_data).filter(data => !data.startsWith('rdl|'))).toEqual(['rda', 'rdt', 'rvd|1', 'gsd', 'rvr', 'rvd|0']);

    const callbackCtx = { ...ctx, callbackQuery: { message: { message_id: 101 } }, answerCbQuery: jest.fn(async () => true), editMessageText: jest.fn(async () => true) };
    await handlers.rotateAndRetry(callbackCtx);
    await handlers.idle();
    expect(receiptService.recognizePhoto).toHaveBeenLastCalledWith(7, expect.objectContaining({ prepared: true, retry: false, small: true, lowResolution: true }));
  });
});
