// Регрессии исправлений A: разбор выписок не блокирует бот, только личные чаты, ссылки на оплату и скачивания
// с таймаутом, лимиты без спама, категории-«методы» Object, донаты по старой ссылке
const { Telegraf, Telegram } = require('telegraf');
const { parseStatement, ImportError } = require('../utils/statement');
const { parseStatementIsolated } = require('../utils/statement/worker');
const { downloadTelegramFile, DownloadTooLargeError } = require('../utils/telegramFile');
const privateChatOnly = require('../middleware/privateChatOnly');
const RateLimiter = require('../utils/rateLimiter');
const SecurityMiddleware = require('../middleware/securityMiddleware');
const LocalizationService = require('../services/LocalizationService');
const PaymentService = require('../services/PaymentService');
const Formatter = require('../utils/formatter');
const { matchCategory, mentionsCategory } = require('../services/assistant/text');

const localizationService = new LocalizationService();

async function timed(fn) {
  const start = Date.now();
  let result;
  try {
    result = await fn();
  } catch (error) {
    result = error;
  }
  return { ms: Date.now() - start, result };
}

describe('statement parsing cannot stall the bot', () => {
  // До исправления: 200 КБ одной строки «дата + цифры» — ~14–35 с (квадратичный откат регулярки Сбера),
  // 1 МБ кавычек в CSV — минуты (field.trim() на каждой кавычке)
  test.each([
    ['Sber line with a 200 KB digit run', '01.01.2024 12:00 ' + '1'.repeat(200000)],
    ['many long Sber lines', Array.from({ length: 3000 }, () => '01.01.2024 12:00 ' + '1'.repeat(600)).join('\n')],
    ['Kaspi line with a digit run', '01.01.24 - ' + '1'.repeat(200000)],
    ['CSV with a megabyte of quotes', 'a' + '"'.repeat(1000000)],
    ['CSV with spaces then quotes', ' '.repeat(300000) + 'a' + '"'.repeat(300000)]
  ])('%s is rejected quickly', async (name, text) => {
    const { ms, result } = await timed(() => parseStatement(Buffer.from(text)));
    expect(result).toBeInstanceOf(ImportError);
    expect(ms).toBeLessThan(3000);
  });

  test('bounded amounts still read real Sber rows with thousands and balance', async () => {
    const text = [
      'ПАО Сбербанк',
      '03.07.2023 13:18 264897 Супермаркеты 1 489,98 18 534,60',
      '04.07.2023 / 264897 PYATEROCHKA 1234 Moskva RUS. Операция по карте ****1234',
      '05.07.2023 10:00 Перевод +12 000,00 30 534,60',
      '05.07.2023 / 111111 Перевод от И. Иванова'
    ].join('\n');
    const result = await parseStatement(Buffer.from(text));
    expect(result.source).toBe('sber');
    expect(result.operations.map(op => [op.kind, op.amount])).toEqual([['expense', 1489.98], ['income', 12000]]);
  });

  test('the worker returns the same result as in-process parsing', async () => {
    const csv = 'Date;Amount;Description\n01.03.2024;-150,50;Coffee\n02.03.2024;-20;Bus\n';
    const isolated = await parseStatementIsolated(Buffer.from(csv), { defaultCurrency: 'EUR' });
    const inline = await parseStatement(Buffer.from(csv), { defaultCurrency: 'EUR' });
    expect(isolated).toEqual(inline);
  });

  test('import errors keep their code across the worker boundary', async () => {
    await expect(parseStatementIsolated(Buffer.from('hello there'))).rejects.toMatchObject({ code: 'unknown_format' });
  });

  test('a parse that runs past the time limit is cut off with too_complex', async () => {
    const big = Buffer.from(Array.from({ length: 200000 }, (_, i) => `0${(i % 9) + 1}.01.2024;-1${i % 10},00;shop ${i}`).join('\n'));
    const { ms, result } = await timed(() => parseStatementIsolated(big, {}, { timeoutMs: 50 }));
    expect(result).toBeInstanceOf(ImportError);
    expect(result.code).toBe('too_complex');
    expect(ms).toBeLessThan(2000);
  });

  test('every locale explains the too_complex error', () => {
    for (const lang of localizationService.getSupportedLanguages().map(l => l.code || l)) {
      expect(localizationService.getText(lang, 'import_too_complex')).not.toBe('import_too_complex');
    }
  });
});

describe('Telegram file downloads have a timeout and a size cap', () => {
  const telegram = { getFileLink: jest.fn(async () => new URL('https://api.telegram.org/file/botTOKEN/x.jpg')) };
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  function streamOf(chunks) {
    return {
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      }
    };
  }

  test('reads the body into a buffer', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, headers: new Map(), body: streamOf([Buffer.from('ab'), Buffer.from('cd')]) }));
    const buffer = await downloadTelegramFile(telegram, 'f1', { maxBytes: 10 });
    expect(buffer.toString()).toBe('abcd');
    expect(global.fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test('stops reading once the stream exceeds the cap (even without Content-Length)', async () => {
    const pulled = [];
    const body = {
      async *[Symbol.asyncIterator]() {
        for (let i = 0; i < 100; i++) {
          pulled.push(i);
          yield Buffer.alloc(4);
        }
      }
    };
    global.fetch = jest.fn(async () => ({ ok: true, headers: new Map(), body }));
    await expect(downloadTelegramFile(telegram, 'f1', { maxBytes: 10 })).rejects.toBeInstanceOf(DownloadTooLargeError);
    expect(pulled.length).toBeLessThan(5);
  });

  test('rejects by Content-Length before reading', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, headers: new Map([['content-length', '999']]), body: streamOf([]) }));
    await expect(downloadTelegramFile(telegram, 'f1', { maxBytes: 10 })).rejects.toBeInstanceOf(DownloadTooLargeError);
  });

  test('a hanging download is aborted after the timeout', async () => {
    global.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason || new Error('aborted')));
    }));
    const { ms, result } = await timed(() => downloadTelegramFile(telegram, 'f1', { timeoutMs: 50 }));
    expect(result).toBeInstanceOf(Error);
    expect(ms).toBeLessThan(1000);
  });

  test('receipt, import and voice handlers use the shared helper', () => {
    const fs = require('fs');
    const path = require('path');
    for (const file of ['ReceiptHandlers.js', 'ImportHandlers.js', 'MultiEntryHandlers.js']) {
      const source = fs.readFileSync(path.join(__dirname, '..', 'handlers', file), 'utf8');
      expect(source).toMatch(/downloadTelegramFile\(ctx\.telegram, fileId/);
      expect(source).not.toMatch(/\bfetch\(/);
    }
  });
});

// Групповой режим (общие расходы чата) — отдельно, в groups.test.js; здесь — что личное не попадает в группы
describe('personal handlers serve private chats only', () => {
  let bot;
  let calls;
  let handled;
  let groupUpdates;

  beforeEach(() => {
    bot = new Telegraf('123:TEST');
    bot.botInfo = { id: 999, is_bot: true, username: 'ExpBot' };
    calls = [];
    // Telegraf создаёт свой Telegram на каждый апдейт — подменяем прототип, чтобы ничего не ушло в сеть
    jest.spyOn(Telegram.prototype, 'callApi').mockImplementation(async (method, payload) => {
      calls.push({ method, payload });
      return method === 'sendMessage' ? { message_id: 1 } : true;
    });
    handled = [];
    groupUpdates = [];
    bot.use(privateChatOnly());
    // Как в botRoutes: групповой режим забирает апдейты групп, личные обработчики их не получают
    bot.use((ctx, next) => (ctx.state.groupChat ? groupUpdates.push(ctx.updateType) : next()));
    bot.use((ctx) => { handled.push(ctx.updateType); });
  });

  afterEach(() => jest.restoreAllMocks());

  let updateId = 0;
  const user = (id = 5) => ({ id, is_bot: false, first_name: 'U', language_code: 'ru' });
  const group = { id: -100123, type: 'supergroup', title: 'G' };
  const message = (chat, from, extra = {}) => ({
    update_id: ++updateId,
    message: { message_id: updateId, date: 1, chat, from, text: '/stats', entities: [{ type: 'bot_command', offset: 0, length: 6 }], ...extra }
  });

  test('private messages pass through', async () => {
    await bot.handleUpdate(message({ id: 5, type: 'private', first_name: 'U' }, user()));
    expect(handled).toEqual(['message']);
  });

  test('a command in a group goes to the group mode only, the bot stays in the group', async () => {
    await bot.handleUpdate(message(group, user()));
    await bot.handleUpdate(message(group, user(6), { text: '500 кофе', entities: undefined }));
    expect(handled).toEqual([]);
    expect(groupUpdates).toEqual(['message', 'message']);
    expect(calls).toEqual([]);
  });

  test('anonymous group admins, Telegram service and sender_chat posts are ignored even in private', async () => {
    await bot.handleUpdate(message(group, { id: 1087968824, is_bot: true, first_name: 'Group' }, { sender_chat: group }));
    await bot.handleUpdate(message(group, { id: 1087968824, is_bot: true, first_name: 'Group' }));
    await bot.handleUpdate(message({ id: 777000, type: 'private', first_name: 'T' }, { id: 777000, is_bot: false, first_name: 'Telegram' }));
    expect(handled).toEqual([]);
    expect(groupUpdates).toEqual([]);
    expect(calls).toEqual([]);
  });

  test('channel posts are ignored silently', async () => {
    await bot.handleUpdate({ update_id: ++updateId, channel_post: { message_id: 1, date: 1, chat: { id: -1001, type: 'channel', title: 'C' }, sender_chat: { id: -1001, type: 'channel' }, text: '/stats' } });
    expect(handled).toEqual([]);
    expect(groupUpdates).toEqual([]);
    expect(calls).toEqual([]);
  });

  test('pre_checkout_query (no chat) still reaches the payment handler', async () => {
    await bot.handleUpdate({ update_id: ++updateId, pre_checkout_query: { id: 'q', from: user(), currency: 'XTR', total_amount: 1, invoice_payload: '{}' } });
    expect(handled).toEqual(['pre_checkout_query']);
  });
});

describe('rate limit is announced once per window', () => {
  test('RateLimiter flags only the first rejected request', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) expect(limiter.checkLimit(1, 'bug_report').allowed).toBe(true);
    expect(limiter.checkLimit(1, 'bug_report')).toMatchObject({ allowed: false, notify: true });
    expect(limiter.checkLimit(1, 'bug_report')).toMatchObject({ allowed: false, notify: false });
  });

  test('a flood gets one reply and no database lookups after it', async () => {
    const limiter = new RateLimiter();
    const userService = { getUserLanguage: jest.fn(async () => 'ru') };
    const security = new SecurityMiddleware(limiter, { validateCommand: () => ({ isValid: true }) }, localizationService, userService);
    const middleware = security.middleware();
    const reply = jest.fn(async () => ({}));
    const next = jest.fn();
    for (let i = 0; i < 50; i++) {
      await middleware({ updateType: 'message', from: { id: 77 }, message: { text: '/stats' }, reply }, next);
    }
    expect(next).toHaveBeenCalledTimes(10);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(userService.getUserLanguage).toHaveBeenCalledTimes(1);
  });
});

describe('categories named like Object.prototype members', () => {
  const formatter = new Formatter({ convert: async (amount) => amount });

  test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('%s is shown as is', (name) => {
    expect(formatter.translateCategoryName(name, localizationService, 'ru')).toBe(name);
  });

  test('CSV totals for a «__proto__» category do not touch Object.prototype', async () => {
    const rows = [
      { created_at_utc: new Date('2024-03-01T10:00:00Z'), amount: 100, currency: 'RUB', category: '__proto__', description: 'x' },
      { created_at_utc: new Date('2024-03-01T11:00:00Z'), amount: 50, currency: 'RUB', category: 'constructor', description: 'y' }
    ];
    const csv = await formatter.formatCSV(rows, 'RUB', 'UTC', localizationService, 'en');
    expect(({}).RUB).toBeUndefined();
    expect(csv).toContain('__proto__');
    expect(csv).toContain('constructor');
  });

  test('assistant category matching does not crash on them', () => {
    const categories = [{ id: 1, name: 'constructor', label: 'constructor' }, { id: 2, name: 'Еда', label: 'Еда' }];
    expect(matchCategory('constructor', categories)).toBe(categories[0]);
    expect(matchCategory('такси', categories)).toBeNull();
    expect(mentionsCategory('сколько на constructor', categories[0])).toBe(true);
  });
});

describe('donation links', () => {
  const invoice = (payload, total) => ({ currency: 'XTR', total_amount: total, invoice_payload: JSON.stringify(payload) });
  function serviceWith(donation) {
    const donationRepository = {
      getDonationById: jest.fn(async () => donation),
      markDonationCompleted: jest.fn(async () => (donation && !['completed', 'refunded'].includes(donation.status) ? { ...donation, status: 'completed' } : null))
    };
    return new PaymentService(donationRepository, null, null, { getActiveRecurringSubscription: jest.fn(async () => null) });
  }
  const payload = { type: 'donation', stars: 50, user_id: 5, donation_id: 9 };

  test('a pending donation can be paid', async () => {
    const service = serviceWith({ id: 9, user_id: '5', stars: 50, status: 'pending' });
    expect(await service.checkPreCheckout(invoice(payload, 50), 5)).toEqual({ ok: true });
  });

  test.each(['cancelled', 'expired', 'completed'])('an old link to a %s donation is rejected', async (status) => {
    const service = serviceWith({ id: 9, user_id: '5', stars: 50, status });
    expect(await service.checkPreCheckout(invoice(payload, 50), 5)).toEqual({ ok: false, reason: 'donation_outdated' });
  });

  test('a link whose amount does not match the donation is rejected', async () => {
    const service = serviceWith({ id: 9, user_id: '5', stars: 100, status: 'pending' });
    expect(await service.checkPreCheckout(invoice(payload, 50), 5)).toEqual({ ok: false, reason: 'donation_outdated' });
  });

  test('a repeated successful_payment for a donation is not credited twice', async () => {
    const service = serviceWith({ id: 9, user_id: '5', stars: 50, status: 'completed' });
    const result = await service.handleSuccessfulPayment({ invoice_payload: JSON.stringify(payload), total_amount: 50, telegram_payment_charge_id: 'ch' }, {});
    expect(result).toEqual({ type: 'donation', status: 'duplicate' });
  });
});
