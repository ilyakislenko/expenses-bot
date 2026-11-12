// Загрузки Mini App (фото чека, голос, выписка): проверки — до чтения тела. Настоящий HTTP-сервер: клиент шлёт
// заголовки и только начало тела — ответ приходит, хотя тело не дослано (значит, сервер его не читал).
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const http = require('http');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const RateLimiter = require('../utils/rateLimiter');
const { MAX_CONCURRENT_UPLOADS } = require('../miniapp/upload');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'X' }) }, TOKEN)}`;
const BIG = 1000000; // объявленная длина тела: дослано будет 16 байт

function services() {
  return {
    localizationService: new LocalizationService(),
    userService: { getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'UTC', getUserPeriodStartDay: async () => 1 },
    premiumService: { isPremiumUser: async () => true },
    rateLimiter: new RateLimiter(),
    receiptService: {
      configured: true, premiumLimit: 300,
      checkLimit: jest.fn(async () => ({ isPremium: true, limit: 300, used: 0, remaining: 300 })),
      recognizePhoto: jest.fn(() => new Promise(() => {})) // распознавание идёт «вечно» — пользователь занят
    },
    voiceService: {
      configured: true, premiumLimit: 300,
      checkLimit: jest.fn(async () => ({ isPremium: true, limit: 300, used: 0, remaining: 300 })),
      transcribe: jest.fn(async () => '')
    },
    importService: {}
  };
}

// Запрос с заголовком Content-Length, но только началом тела. { req, response } — response ждёт ответ сервера
function partial(port, path, { userId = ME, type, length = BIG, chunk = Buffer.alloc(16), end = false }) {
  const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { Authorization: auth(userId), 'Content-Type': type, 'Content-Length': length } });
  const response = new Promise((resolve) => {
    req.on('response', (res) => {
      let data = '';
      res.on('data', (d) => { data += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
  });
  req.on('error', () => {});
  req.write(chunk);
  if (end) req.end();
  return { req, response };
}

// Ответ сервера или 'timeout' (тело не дослано — значит, сервер ждал бы его вечно)
function within(promise, ms = 2000) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mini app uploads: checks before the body is read', () => {
  let server;
  let port;
  let deps;
  const open = [];

  beforeEach(async () => {
    deps = services();
    server = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => deps[name] });
    await server.start();
    port = server.server.address().port;
  });

  afterEach(async () => {
    for (const req of open.splice(0)) req.destroy();
    server.server.closeAllConnections();
    await server.stop();
  });

  test('the server limits the whole request to a minute', () => {
    expect(server.server.requestTimeout).toBe(60000);
  });

  test('a busy user gets 409 without the photo being read', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const first = partial(port, '/api/receipts', { type: 'image/jpeg', length: jpeg.length, chunk: jpeg, end: true });
    expect((await within(first.response)).status).toBe(202);
    const second = partial(port, '/api/receipts', { type: 'image/jpeg' });
    open.push(second.req);
    expect(await within(second.response)).toEqual({ status: 409, body: { error: 'receipt_busy' } });
    expect(deps.receiptService.recognizePhoto).toHaveBeenCalledTimes(1);
  });

  test('over the shared rate limit — 429 without reading: photo, voice and statement', async () => {
    for (let i = 0; i < 20; i++) deps.rateLimiter.checkLimit(ME, 'receipt');
    for (let i = 0; i < 20; i++) deps.rateLimiter.checkLimit(ME, 'voice');
    for (let i = 0; i < 10; i++) deps.rateLimiter.checkLimit(ME, 'import');
    const photo = partial(port, '/api/receipts', { type: 'image/jpeg' });
    const voice = partial(port, '/api/expenses/voice?duration=3', { type: 'audio/webm' });
    const file = partial(port, '/api/import/preview?name=statement.csv', { type: 'text/csv' });
    open.push(photo.req, voice.req, file.req);
    expect(await within(photo.response)).toMatchObject({ status: 429, body: { error: 'receipt_rate' } });
    expect(await within(voice.response)).toMatchObject({ status: 429, body: { error: 'voice_rate' } });
    expect(await within(file.response)).toMatchObject({ status: 429, body: { error: 'import_rate' } });
    expect(deps.receiptService.checkLimit).not.toHaveBeenCalled();
    expect(deps.voiceService.checkLimit).not.toHaveBeenCalled();
  });

  test('Content-Length over the route limit — 413 at once (voice 5 MB, photo and statement 20 MB)', async () => {
    const voice = partial(port, '/api/expenses/voice', { type: 'audio/webm', length: 5 * 1024 * 1024 + 1 });
    const photo = partial(port, '/api/receipts', { type: 'image/jpeg', length: 20 * 1024 * 1024 + 1, userId: 2 });
    open.push(voice.req, photo.req);
    expect(await within(voice.response)).toEqual({ status: 413, body: { error: 'too_large' } });
    expect(await within(photo.response)).toEqual({ status: 413, body: { error: 'too_large' } });
  });

  test(`no more than ${MAX_CONCURRENT_UPLOADS} uploads read at once per process and one per user — 503; an aborted upload frees its slot`, async () => {
    const held = [];
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      const upload = partial(port, '/api/import/preview?name=statement.csv', { type: 'text/csv', userId: 100 + i });
      held.push(upload);
      open.push(upload.req);
    }
    await pause(200);
    const extra = partial(port, '/api/import/preview?name=statement.csv', { type: 'text/csv', userId: 200 });
    open.push(extra.req);
    expect(await within(extra.response)).toEqual({ status: 503, body: { error: 'uploads_busy' } });
    // Вторая загрузка того же пользователя, пока первая читается, — тоже 503
    const sameUser = partial(port, '/api/expenses/voice', { type: 'audio/webm', userId: 100 });
    open.push(sameUser.req);
    expect(await within(sameUser.response)).toEqual({ status: 503, body: { error: 'uploads_busy' } });

    held[0].req.destroy(); // клиент оборвал загрузку
    await pause(200);
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(28)]);
    const next = partial(port, '/api/expenses/voice?duration=2', { type: 'audio/ogg', userId: 200, length: ogg.length, chunk: ogg, end: true });
    expect(await within(next.response)).toMatchObject({ status: 200, body: { transcript: '' } });
  });

  test('a voice busy flag claimed before reading is released when the upload is aborted', async () => {
    const aborted = partial(port, '/api/expenses/voice?duration=2', { type: 'audio/webm' });
    await pause(200);
    aborted.req.destroy();
    await pause(200);
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(28)]);
    const again = partial(port, '/api/expenses/voice?duration=2', { type: 'audio/ogg', length: ogg.length, chunk: ogg, end: true });
    expect(await within(again.response)).toMatchObject({ status: 200 });
    expect(deps.voiceService.transcribe).toHaveBeenCalledTimes(1);
  });
});
