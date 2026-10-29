// Уведомления банка: разбор шаблонами (банки и языки), признаки уведомления против обычного ввода, приватность
// (карты и остатки), повторы, нейросеть для незнакомых форматов, сбор пересланной пачки, кнопки, тексты 13 языков.
const fs = require('fs');
const path = require('path');
const samples = require('./fixtures/bankNotifications');
const bank = require('../utils/bankNotification');
const { buildMessages, normalizeModelAnswer } = require('../services/bank/model');
const BankNotificationService = require('../services/BankNotificationService');
const BankNotificationHandlers = require('../handlers/BankNotificationHandlers');
const EntryBatchService = require('../services/EntryBatchService');
const MessageHandlers = require('../handlers/messages');
const StateService = require('../services/StateService');
const LocalizationService = require('../services/LocalizationService');
const EnhancedValidator = require('../utils/enhancedValidator');
const Formatter = require('../utils/formatter');
const { USER_LIMITS } = require('../utils/constants');

const localization = new LocalizationService();
const t = (key, params) => localization.getText('ru', key, params);
const USER = 7781500001;
const NOW = new Date('2026-10-29T10:00:00Z'); // 13:00 в Москве
const formatter = new Formatter({ convert: async (amount) => Number(amount) });

describe('templates: realistic notifications of banks and payment apps', () => {
  it(`has at least 60 samples (${samples.length})`, () => {
    expect(samples.length).toBeGreaterThanOrEqual(60);
  });

  it.each(samples.map(([text, expected]) => [text, expected]))('%s', (text, expected) => {
    expect(bank.detect(text)).toBe(true);
    expect(bank.detect(text, { forwarded: true })).toBe(true);
    const parsed = bank.parse(text, { year: 2026 });
    expect(parsed).toMatchObject({ ok: true, ...expected });
  });

  it('covers every outcome: expense, income, refund, own transfer, cash, declined, foreign currency, unsupported currency', () => {
    const parsed = samples.map(([text]) => bank.parse(text, { year: 2026 }));
    const kinds = new Set(parsed.map(p => p.kind));
    expect([...kinds].sort()).toEqual(['cash', 'declined', 'expense', 'income', 'refund', 'transfer']);
    expect(parsed.filter(p => p.original).length).toBeGreaterThanOrEqual(2);
    expect(parsed.some(p => !p.supported)).toBe(true);
    // Шаблоны банков: Сбер, Т-Банк, Альфа, ВТБ, Озон, Яндекс, Kaspi, Halyk, Uzcard, Humo, Click, Payme, TBC, BoG…
    const banks = new Set(parsed.map(p => p.bank).filter(Boolean));
    for (const id of ['sber', 'tbank', 'alfa', 'vtb', 'ozon', 'yandex', 'kaspi', 'halyk', 'uzcard', 'humo', 'click', 'payme', 'tbc', 'bog', 'garanti', 'akbank']) {
      expect([id, banks.has(id)]).toEqual([id, true]);
    }
  });

  it('numbers in every local format: spaces, dots and commas as thousands, lakh groups, yen without decimals', () => {
    expect(bank.toNumber('1 250,00')).toBe(1250);
    expect(bank.toNumber('1.250,00')).toBe(1250);
    expect(bank.toNumber('1,250.00')).toBe(1250);
    expect(bank.toNumber('1,23,456.00')).toBe(123456);
    expect(bank.toNumber('12.40')).toBe(12.4);
    expect(bank.toNumber('450,75')).toBe(450.75);
    expect(bank.toNumber('1,250')).toBe(1250);
    expect(bank.toNumber('45 000.00')).toBe(45000);
  });

  it('a notification without a recognizable operation is left to the model, not guessed', () => {
    expect(bank.parse('Карта ••1234\nВкусВилл\n1 349 ₽\nКэшбэк 13 ₽', { year: 2026 })).toMatchObject({ ok: false, reason: 'no_kind' });
    expect(bank.parse('Kaspi.kz: Сіздің шотыңыз *1234 бойынша қозғалыс 2 990 ₸', { year: 2026 })).toMatchObject({ ok: false });
  });

  it('several notifications pasted at once are split by blank lines (each must be a notification)', () => {
    const two = 'VISA1234 12:31 Покупка 349р MAGNIT Баланс: 5 120р\n\nVISA1234 13:05 Покупка 120р KOFEMANIYA Баланс: 5 000р';
    expect(bank.splitNotifications(two)).toHaveLength(2);
    expect(bank.splitNotifications('Покупка 1 250 ₽, PYATEROCHKA, карта *1234.\n\nСпасибо!')).toHaveLength(1);
  });
});

describe('detection does not steal normal input', () => {
  it.each([
    '250 кофе', 'кофе 250', '20 USD такси', '250 руб кофе', '12,5€ латте', '+50000 зарплата', '+1000 USD фриланс',
    'кофе 250, такси 400', 'кофе 250р, такси 400р', 'такси 400р\nобед 600р\nкофе 250р', 'оплата интернета 500р',
    'оплата 500р интернет', 'перевод маме 5000р', 'Перевод 5000р маме на день рождения', 'сколько я потратил на такси в сентябре?',
    '? сколько я потратил на такси', '14 сентября сколько потратил?', 'сколько стоит покупка 1250р?', '500 300 такси', 'обед за 600',
    '$20 кофе', 'такси 400?', 'Зарплата 50000 ₽', '+50000₽ зарплата', 'Купил кофе за 250р в 12:30', 'Оплата Netflix 9,99$',
    '250 р. кофе. 400 р. такси', '2 кг яблок 300р', 'coffee 5 and taxi 12', '/start ref_abc'
  ])('%j is not a bank notification', (text) => {
    expect(bank.detect(text)).toBe(false);
  });

  it('a forwarded chat message needs an operation word: «250 кофе» from a friend stays a normal record', () => {
    expect(bank.detect('250 кофе', { forwarded: true })).toBe(false);
    expect(bank.detect('Купи хлеба, 100р', { forwarded: true })).toBe(false);
    expect(bank.detect('Встреча в 12:30', { forwarded: true })).toBe(false);
    expect(bank.detect('Оплата 500р за интернет', { forwarded: true })).toBe(true);
  });
});

describe('privacy: card numbers and balances never leave the parser', () => {
  it('redact() removes masks, full card numbers and «available / balance» amounts', () => {
    expect(bank.redact('Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽')).toBe('Покупка 1 250 ₽, PYATEROCHKA, . •••');
    const full = bank.redact('Card 4276 1234 5678 9012 charged 500 RUB. Balance 3 000 RUB');
    expect(full).not.toMatch(/4276|9012|3 000/);
    const india = bank.redact('Rs.450.00 debited from A/c XX1234 on 29-10-26 to VPA swiggy@icici (UPI Ref No 432109876543). Avl Bal Rs 12,340.50');
    expect(india).not.toMatch(/1234|432109876543|12,340/);
  });

  it.each(samples.filter(([text]) => /1234/.test(text)).map(([text]) => [text]))('no card digits in the result or the fingerprint: %s', (text) => {
    const parsed = bank.parse(text, { year: 2026 });
    expect(JSON.stringify(parsed)).not.toMatch(/1234/);
    expect(bank.fingerprint(text)).not.toMatch(/1234/);
    expect(bank.redact(text)).not.toMatch(/1234/);
  });

  it('balances are not taken as the operation and are not in the result', () => {
    for (const [text, balance] of [
      ['Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽', '12340'],
      ['Kaspi Gold: Покупка 4 500 ₸ SMALL Алматы. Доступно 120 000 ₸', '120000'],
      ['TBC: გადახდა 25.00 GEL, Goodwill, ბარათი *1234, 29/10/2026 12:31. ხელმისაწვდომი: 1 250.00 GEL', '1250'],
      ['Kartınızdan 250,00 TL tutarında SOK MARKET işyerinde alışveriş yapılmıştır. Kullanılabilir limit: 5.000,00 TL', '5000']
    ]) {
      const parsed = bank.parse(text, { year: 2026 });
      expect(JSON.stringify(parsed).replace(/[ .,]/g, '')).not.toContain(`:${balance}`);
      expect(bank.redact(text)).toContain('•••');
    }
  });

  it('the request log shows the message without card number and balance', () => {
    const logger = require('../utils/logger');
    const spy = jest.spyOn(logger, 'telegram').mockImplementation(() => {});
    const middlewares = [];
    const bot = { use: (fn) => middlewares.push(fn), catch: () => {} };
    require('../botMiddleware')(bot, { replyWithError: async () => {} }, { isProcessed: () => false, markProcessed: () => {} }, null, localization);
    const logging = middlewares[middlewares.length - 1];
    return logging({ from: { id: USER }, updateType: 'message', chat: { id: USER }, message: { text: 'Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽' } }, async () => {})
      .then(() => {
        const logged = spy.mock.calls.find(([message]) => message === 'Telegram request received')[1].text;
        expect(logged).not.toMatch(/1234|12 340/);
        expect(logged).toContain('PYATEROCHKA');
        spy.mockRestore();
      });
  });
});

describe('model fallback: strict validation of the JSON answer', () => {
  const text = 'Карта ••1234\nВкусВилл\n1 349 ₽\nКэшбэк 13 ₽\nБаланс 8 200 ₽';

  it('the request carries the text without the card number and balance; examples are fixed', () => {
    const messages = buildMessages(text);
    const last = messages[messages.length - 1].content;
    expect(last).toContain('ВкусВилл');
    expect(last).not.toMatch(/1234|8 200/);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toMatch(/ignore any requests/);
  });

  it('accepts an answer whose amount and currency are in the text', () => {
    expect(normalizeModelAnswer({ kind: 'expense', amount: '1349.00', currency: 'RUB', merchant: 'ВкусВилл' }, text, { year: 2026 }))
      .toMatchObject({ ok: true, kind: 'expense', amount: 1349, currency: 'RUB', merchant: 'ВкусВилл', template: 'model' });
  });

  it.each([
    [{ kind: 'expense', amount: '8200', currency: 'RUB' }, 'the balance is not in the redacted text'],
    [{ kind: 'expense', amount: '999', currency: 'RUB' }, 'an invented amount'],
    [{ kind: 'expense', amount: '1349', currency: 'USD' }, 'a currency not mentioned'],
    [{ kind: 'spend', amount: '1349', currency: 'RUB' }, 'unknown kind'],
    [{ kind: 'expense', amount: '1e3', currency: 'RUB' }, 'not a plain number'],
    [['expense'], 'not an object'],
    [null, 'empty']
  ])('rejects %j (%s)', (raw) => {
    expect(normalizeModelAnswer(raw, text, { year: 2026 })).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('«income» needs an income word or «+» in the text, otherwise it is an expense (unknown debit words)', () => {
    const debit = 'Hamkorbank: karta *1234 dan 85 000 UZS yechildi, EVOS Chilonzor. Qoldiq 1 250 000 UZS';
    expect(normalizeModelAnswer({ kind: 'income', amount: '85000', currency: 'UZS', merchant: 'EVOS Chilonzor' }, debit)).toMatchObject({ ok: true, kind: 'expense' });
    const credit = 'Hamkorbank: karta *1234 ga 85 000 UZS tushum, ALISHER V.';
    expect(normalizeModelAnswer({ kind: 'income', amount: '85000', currency: 'UZS' }, credit)).toMatchObject({ ok: true, kind: 'income' });
    expect(normalizeModelAnswer({ kind: 'income', amount: '85000', currency: 'UZS' }, 'Karta *1234: +85 000 UZS')).toMatchObject({ kind: 'income' });
  });

  it('«none» is not a transaction; a merchant not in the text is dropped; dates come from the text only', () => {
    expect(normalizeModelAnswer({ kind: 'none' }, text)).toEqual({ ok: false, reason: 'not_transaction' });
    expect(normalizeModelAnswer({ kind: 'expense', amount: 1349, currency: 'RUB', merchant: 'Ашан' }, text)).toMatchObject({ ok: true, merchant: null });
    const dated = 'Карта ••1234 29.10.2026 18:40 ВкусВилл 1 349 ₽';
    expect(normalizeModelAnswer({ kind: 'expense', amount: '1349', currency: 'RUB', date: '2020-01-01' }, dated, { year: 2026 }))
      .toMatchObject({ date: '2026-10-29', time: '18:40' });
  });
});

// ---------- Сервис ----------

function serviceEnv({ duplicate = null, modelUsed = 0, provider = null, isPremium = false } = {}) {
  const repository = {
    findDuplicate: jest.fn(async () => duplicate),
    insertMany: jest.fn(async () => {}),
    countModelParsed: jest.fn(async () => modelUsed),
    findRefundTarget: jest.fn(async () => 55)
  };
  let nextExpense = 100;
  let nextIncome = 500;
  const entryBatchService = {
    record: jest.fn(async (userId, entries, options) => {
      const client = { query: jest.fn() };
      const expenseIds = entries.filter(e => e.kind === 'expense').map(() => nextExpense++);
      const incomeIds = entries.filter(e => e.kind === 'income').map(() => nextIncome++);
      await options.onCreated(client, { batchId: 9, expenseIds, incomeIds });
      return { batchId: 9, defaulted: 1 };
    })
  };
  const service = new BankNotificationService({
    bankNotificationRepository: repository,
    entryBatchService,
    userService: { getUserTimezone: jest.fn(async () => 'Europe/Moscow') },
    premiumService: { isPremiumUser: jest.fn(async () => isPremium), getUserLimits: jest.fn(async () => USER_LIMITS[isPremium ? 'premium' : 'regular']) },
    validator: new EnhancedValidator(),
    provider,
    modelDeadlineMs: 200
  });
  return { service, repository, entryBatchService };
}

describe('BankNotificationService: recording, dates, skipped operations', () => {
  it('records an expense with the time from the text, the merchant as description and a known-shop category hint', async () => {
    const { service, entryBatchService, repository } = serviceEnv();
    const outcome = await service.ingest(USER, [{ text: 'VISA1234 12:31 Покупка 349р MAGNIT Баланс: 5 120р' }], { now: NOW });
    expect(outcome.results[0]).toMatchObject({ status: 'recorded', expenseId: 100, localAt: '2026-10-29 12:31:00', hasTime: true });
    const [, entries, options] = entryBatchService.record.mock.calls[0];
    expect(entries).toEqual([{ kind: 'expense', amount: 349, currency: 'RUB', description: 'MAGNIT', localAt: '2026-10-29 12:31:00', categoryHint: 'Еда' }]);
    expect(options).toMatchObject({ source: 'bank', timezone: 'Europe/Moscow' });
    // Строка уведомления — только отпечаток, без текста
    const [, rows, meta, client] = repository.insertMany.mock.calls[0];
    expect(client).toBeTruthy();
    expect(meta).toEqual({ timezone: 'Europe/Moscow', localDay: '2026-10-29' });
    expect(rows[0]).toMatchObject({ outcome: 'expense', parser: 'template', bank: 'sber', amount: 349, currency: 'RUB', expenseId: 100, hasTime: true });
    expect(rows[0].textHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toMatch(/MAGNIT|5 120|1234/);
  });

  it('income for «Зачисление / Перевод от», foreign purchase keeps the original amount in the description', async () => {
    const { service, entryBatchService } = serviceEnv();
    await service.ingest(USER, [
      { text: 'Kaspi Gold: Перевод 10 000 ₸ от Айгерим Н. Доступно 130 000 ₸' },
      { text: 'Покупка, карта *1234. 12.40 USD (1 150.32 RUB). STARBUCKS. Доступно 8 000 RUB' }
    ], { now: NOW });
    const [, entries] = entryBatchService.record.mock.calls[0];
    expect(entries.map(e => [e.kind, e.amount, e.currency, e.description])).toEqual([
      ['income', 10000, 'KZT', 'Айгерим Н'],
      ['expense', 1150.32, 'RUB', 'STARBUCKS (12.40 USD)']
    ]);
  });

  it('refund, own transfer, cash, declined and unsupported currency are not recorded (and are logged without text)', async () => {
    const { service, entryBatchService, repository } = serviceEnv();
    const outcome = await service.ingest(USER, [
      { text: 'ECMC1234 16:10 Возврат покупки 349р MAGNIT Баланс: 5 469р' },
      { text: 'Т-Банк: Перевод между своими счетами. 10 000 RUB. Доступно 2 340 RUB' },
      { text: 'MIR-1234 09:12 Выдача наличных 5 000р ATM 600123 Баланс: 1 000р' },
      { text: 'VISA1234 13:45 Отказ покупка 1 990р OZON Недостаточно средств. Баланс: 120р' },
      { text: 'Monzo: You spent £8.50 at Pret A Manger' }
    ], { now: NOW });
    expect(outcome.results.map(r => r.status)).toEqual(['refund', 'transfer', 'cash', 'declined', 'unsupported']);
    expect(outcome.results[0].refundTargetId).toBe(55);
    expect(repository.findRefundTarget).toHaveBeenCalledWith(USER, { amount: 349, currency: 'RUB', merchant: 'MAGNIT' });
    expect(entryBatchService.record).not.toHaveBeenCalled();
    const rows = repository.insertMany.mock.calls.flatMap(call => call[1]);
    expect(rows.map(r => r.outcome)).toEqual(['refund', 'transfer', 'cash', 'declined', 'unsupported']);
  });

  it('dates: time only — today (yesterday if not yet), forwarded message time, future or too old — now', () => {
    const at = (parsed, forwardDate = null) => BankNotificationService.operationTime({ date: null, time: null, ...parsed }, forwardDate, 'Europe/Moscow', NOW);
    expect(at({ time: '12:31' }).localAt).toBe('2026-10-29 12:31:00');
    expect(at({ time: '23:50' }).localAt).toBe('2026-10-28 23:50:00');
    expect(at({ date: '2026-10-25' }).localAt).toBe('2026-10-25 12:00:00');
    expect(at({ date: '2026-10-29' }).localAt).toBeNull(); // сегодня без времени — сейчас
    expect(at({ date: '2026-11-02', time: '10:00' }).localAt).toBeNull();
    expect(at({ date: '2026-07-01', time: '10:00' }).localAt).toBeNull();
    expect(at({}, new Date('2026-10-29T06:15:00Z'))).toMatchObject({ localAt: '2026-10-29 09:15:00', hasTime: true });
    // Время без даты у пересланного — день того сообщения (переслали вчерашнее SMS сегодня)
    expect(at({ time: '22:10' }, new Date('2026-10-27T20:00:00Z')).localAt).toBe('2026-10-27 22:10:00');
    expect(at({ time: '23:30' }, new Date('2026-10-27T20:00:00Z')).localAt).toBe('2026-10-26 23:30:00');
  });
});

describe('BankNotificationService: never records twice', () => {
  it('an already recorded notification (same forward, text or amount at the same minute) is a duplicate', async () => {
    const { service, entryBatchService, repository } = serviceEnv({ duplicate: { id: 1, expense_id: 77, income_id: null } });
    const outcome = await service.ingest(USER, [{ text: 'VISA1234 12:31 Покупка 349р MAGNIT Баланс: 5 120р', forwardKey: 'u:42:1792000000:0' }], { now: NOW });
    expect(outcome.results[0]).toMatchObject({ status: 'duplicate', existing: { expenseId: 77, incomeId: null } });
    expect(entryBatchService.record).not.toHaveBeenCalled();
    const query = repository.findDuplicate.mock.calls[0][1];
    expect(query).toMatchObject({ kind: 'expense', amount: 349, currency: 'RUB', localAt: '2026-10-29 12:31:00', hasTime: true, textWindowHours: 62 * 24 });
    expect(query.forwardKey).toMatch(/^[0-9a-f]{64}$/); // источник пересылки — хешем, не как есть
    expect(query.forwardKey).not.toContain('1792000000');
  });

  it('a text without time is a duplicate only for 12 hours; the hash depends on the user, not on card or balance', async () => {
    const { service, repository } = serviceEnv();
    await service.ingest(USER, [{ text: 'You spent $12.40 at STARBUCKS' }], { now: NOW });
    expect(repository.findDuplicate.mock.calls[0][1]).toMatchObject({ textWindowHours: 12, hasTime: false });
    const a = service.keys(USER, { text: 'Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽' });
    const b = service.keys(USER, { text: 'Покупка 1 250 ₽, PYATEROCHKA, карта *9876. Доступно 11 090 ₽' });
    const c = service.keys(USER + 1, { text: 'Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽' });
    expect(a.textHash).toBe(b.textHash);
    expect(a.textHash).not.toBe(c.textHash);
  });

  it('the same notification twice in one batch is recorded once', async () => {
    const { service, entryBatchService } = serviceEnv();
    const text = 'ECMC1234 29.10.26 12:31 Покупка 349р MAGNIT MM KOSMOS Баланс: 12 340.50р';
    const outcome = await service.ingest(USER, [{ text }, { text: `${text} ` }], { now: NOW });
    expect(outcome.results.map(r => r.status)).toEqual(['recorded', 'duplicate']);
    expect(outcome.results[1].existing).toEqual({ expenseId: 100, incomeId: null });
    expect(entryBatchService.record.mock.calls[0][1]).toHaveLength(1);
  });

  it('«record anyway» writes skipped transfers as expense/income without the duplicate check', async () => {
    const { service, entryBatchService, repository } = serviceEnv();
    const first = await service.ingest(USER, [
      { text: 'Т-Банк: Перевод между своими счетами. 10 000 RUB. Доступно 2 340 RUB' },
      { text: 'MIR-1234 09:12 Выдача наличных 5 000р ATM 600123 Баланс: 1 000р' }
    ], { now: NOW });
    const again = await service.recordAnyway(USER, first.results, { now: NOW });
    expect(again.results.map(r => r.entry.kind)).toEqual(['expense', 'expense']);
    expect(entryBatchService.record).toHaveBeenCalledTimes(1);
    expect(repository.findDuplicate).not.toHaveBeenCalled();
  });
});

describe('BankNotificationService: the local model for unknown formats', () => {
  const unusual = 'Ваша карта ••1234: ВкусВилл, 1 349 ₽. Кэшбэк 13 ₽. Баланс 8 200 ₽';

  it('asks the model once, records its validated answer and counts it toward the daily limit', async () => {
    const provider = { configured: true, complete: jest.fn(async () => ({ kind: 'expense', amount: '1349.00', currency: 'RUB', merchant: 'ВкусВилл' })) };
    const { service, repository, entryBatchService } = serviceEnv({ provider });
    const onModel = jest.fn(async () => {});
    const outcome = await service.ingest(USER, [{ text: unusual }], { now: NOW, onModel });
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(provider.complete.mock.calls[0][0]).toMatchObject({ owner: USER });
    expect(JSON.stringify(provider.complete.mock.calls[0][0].messages.slice(-1))).not.toMatch(/1234|8 200/);
    expect(onModel).toHaveBeenCalledTimes(1);
    expect(outcome.results[0]).toMatchObject({ status: 'recorded', parser: 'model' });
    expect(entryBatchService.record.mock.calls[0][1][0]).toMatchObject({ amount: 1349, currency: 'RUB', description: 'ВкусВилл' });
    expect(repository.insertMany.mock.calls[0][1][0]).toMatchObject({ parser: 'model', outcome: 'expense' });
  });

  it('a wrong model answer (the balance) is not recorded but counts as a model attempt', async () => {
    const provider = { configured: true, complete: jest.fn(async () => ({ kind: 'expense', amount: '8200', currency: 'RUB' })) };
    const { service, repository, entryBatchService } = serviceEnv({ provider });
    const outcome = await service.ingest(USER, [{ text: unusual }], { now: NOW });
    expect(outcome.results[0].status).toBe('unparsed');
    expect(entryBatchService.record).not.toHaveBeenCalled();
    expect(repository.insertMany.mock.calls[0][1][0]).toMatchObject({ outcome: 'unparsed', parser: 'model', amount: null });
  });

  it('daily limit: free users get the limit status without a model call; busy model is not counted', async () => {
    const provider = { configured: true, complete: jest.fn() };
    const limited = serviceEnv({ provider, modelUsed: USER_LIMITS.regular.MAX_BANK_MODEL_PER_DAY });
    const outcome = await limited.service.ingest(USER, [{ text: unusual }], { now: NOW });
    expect(outcome.results[0]).toMatchObject({ status: 'model_limit', limit: USER_LIMITS.regular.MAX_BANK_MODEL_PER_DAY, isPremium: false });
    expect(provider.complete).not.toHaveBeenCalled();

    const busyProvider = { configured: true, complete: jest.fn(async () => { const e = new Error('busy'); e.code = 'busy'; throw e; }) };
    const busy = serviceEnv({ provider: busyProvider });
    const busyOutcome = await busy.service.ingest(USER, [{ text: unusual }], { now: NOW });
    expect(busyOutcome.results[0].status).toBe('model_busy');
    expect(busy.repository.insertMany).toHaveBeenCalledWith(USER, [], expect.any(Object));

    const slow = serviceEnv({ provider: { configured: true, complete: jest.fn(() => new Promise(() => {})) } });
    expect((await slow.service.ingest(USER, [{ text: unusual }], { now: NOW })).results[0].status).toBe('model_busy');
  });

  it('templates never call the model; without a model an unknown format is «not parsed»', async () => {
    const provider = { configured: true, complete: jest.fn() };
    const { service } = serviceEnv({ provider });
    await service.ingest(USER, samples.slice(0, 10).map(([text]) => ({ text })), { now: NOW });
    expect(provider.complete).not.toHaveBeenCalled();
    const none = serviceEnv();
    expect((await none.service.ingest(USER, [{ text: unusual }], { now: NOW })).results[0]).toMatchObject({ status: 'unparsed', parser: 'none' });
  });
});

describe('EntryBatchService: bank entries keep their time and use the known-shop category', () => {
  it('passes localAt and timezone to the repository, the hint category is still «guessed»', async () => {
    const repo = { create: jest.fn(async () => 3) };
    const service = new EntryBatchService({
      entryBatchRepository: repo,
      expenseService: {
        getCategories: async () => [{ id: 1, name: 'Еда' }, { id: 6, name: 'Другое' }],
        getDefaultCategory: async () => ({ id: 6, name: 'Другое' }),
        getRememberedCategory: async () => null
      },
      incomeService: { getIncomeCurrency: async () => 'RUB' },
      userService: { getUserCurrency: async () => 'RUB' },
      funnelService: { track: jest.fn(async () => {}) }
    });
    const onCreated = jest.fn();
    const result = await service.record(USER, [
      { kind: 'expense', amount: 349, currency: 'RUB', description: 'MAGNIT', localAt: '2026-10-29 12:31:00', categoryHint: 'Еда' },
      { kind: 'expense', amount: 99, currency: 'RUB', description: 'XYZ', localAt: null, categoryHint: null }
    ], { source: 'bank', timezone: 'Europe/Moscow', onCreated });
    expect(result).toEqual({ batchId: 3, defaulted: 1 });
    const [, payload, hook] = repo.create.mock.calls[0];
    expect(payload.timezone).toBe('Europe/Moscow');
    expect(payload.expenses.map(e => [e.categoryId, e.guessed, e.localAt])).toEqual([[1, true, '2026-10-29 12:31:00'], [6, true, null]]);
    expect(hook).toBe(onCreated);
  });
});

// ---------- Обработчик: пачка пересланных, ответы, кнопки ----------

function handlerEnv(outcome) {
  const service = {
    ingest: jest.fn(async () => outcome),
    recordAnyway: jest.fn(async () => ({ batchId: 12, defaulted: 0, results: [{ status: 'recorded', expenseId: 300, parsed: { ok: true } }] })),
    modelLimit: (isPremium) => USER_LIMITS[isPremium ? 'premium' : 'regular'].MAX_BANK_MODEL_PER_DAY
  };
  const expenseHandlers = {
    familyModeTarget: jest.fn(async () => null),
    expenseNote: jest.fn(async () => ''),
    showCard: jest.fn(async () => {}),
    sendBudgetWarnings: jest.fn(async () => {})
  };
  const multiEntryHandlers = { showRecordedBatch: jest.fn(async (ctx, lang, batchId, { send }) => send('SUMMARY', { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '1', callback_data: 'ex|100|v.9' }]] } })) };
  const handlers = new BankNotificationHandlers({
    bankNotificationService: service,
    multiEntryHandlers,
    expenseHandlers,
    incomeHandlers: { incomeLabel: (income) => income.description, achievementService: null },
    expenseService: { getExpenseById: jest.fn(async (userId, id) => ({ id, category_guessed: true, category_name: 'Другое' })) },
    incomeService: { getIncome: jest.fn(async (userId, id) => ({ id, amount: '10000', currency: 'KZT', description: 'Айгерим Н', created_at_utc: NOW })) },
    premiumService: {},
    userService: { getUserLanguage: jest.fn(async () => 'ru'), getUserTimezone: jest.fn(async () => 'Europe/Moscow') },
    localizationService: localization,
    formatter,
    debounceMs: 30,
    maxWaitMs: 200
  });
  return { handlers, service, expenseHandlers, multiEntryHandlers };
}

const forwardedCtx = (text, { date = 1792000000, messageId = 1 } = {}) => ({
  from: { id: USER },
  chat: { id: USER, type: 'private' },
  message: { message_id: messageId, text, forward_origin: { type: 'user', sender_user: { id: 4242 }, date } },
  reply: jest.fn(async () => ({ message_id: 900 })),
  sendChatAction: jest.fn(async () => {}),
  telegram: { deleteMessage: jest.fn(async () => {}) }
});

describe('BankNotificationHandlers', () => {
  it('several forwarded messages become one batch with one summary', async () => {
    const outcome = {
      batchId: 9,
      defaulted: 1,
      results: [
        { status: 'recorded', expenseId: 100, parsed: { ok: true } },
        { status: 'recorded', expenseId: 101, parsed: { ok: true } },
        { status: 'declined', parsed: { ok: true, amount: 1990, currency: 'RUB', merchant: 'OZON' } }
      ]
    };
    const { handlers, service, multiEntryHandlers } = handlerEnv(outcome);
    const texts = samples.slice(0, 3).map(([text]) => text);
    const ctxs = texts.map((text, i) => forwardedCtx(text, { date: 1792000000 + i, messageId: i + 1 }));
    for (const ctx of ctxs) await handlers.handleMessage(ctx, 'ru');
    await new Promise(resolve => setTimeout(resolve, 80));
    await handlers.idle();
    expect(service.ingest).toHaveBeenCalledTimes(1);
    const [userId, items] = service.ingest.mock.calls[0];
    expect(userId).toBe(USER);
    expect(items.map(i => i.text)).toEqual(texts);
    expect(items[0]).toMatchObject({ forwardKey: 'u:4242:1792000000:0', forwardDate: new Date(1792000000 * 1000) });
    const [, , batchId, options] = multiEntryHandlers.showRecordedBatch.mock.calls[0];
    expect(batchId).toBe(9);
    expect(options.header).toBe(`${t('bank_batch_title')}\n${t('bank_skip_declined', { item: `${formatter.formatAmount(1990, 'RUB')} — OZON` })}`);
    expect(options.source).toBe('bank');
  });

  it('one notification → the usual record card with the default-category hint', async () => {
    const { handlers, expenseHandlers } = handlerEnv({ batchId: 9, defaulted: 1, results: [{ status: 'recorded', expenseId: 100, parsed: { ok: true } }] });
    const ctx = forwardedCtx(samples[0][0]);
    await handlers.handleMessage(ctx, 'ru');
    await handlers.idle();
    expect(expenseHandlers.showCard).toHaveBeenCalledWith(ctx, 100, 'n', expect.objectContaining({ added: true, remembered: false }));
    expect(expenseHandlers.showCard.mock.calls[0][3].note).toContain(t('multi_default_category_hint', { category: 'Другое' }));
    expect(expenseHandlers.sendBudgetWarnings).toHaveBeenCalled();
  });

  it('a duplicate: open the record or record anyway — the button works once', async () => {
    const duplicate = { status: 'duplicate', existing: { expenseId: 77, incomeId: null }, parsed: { ok: true, kind: 'expense', amount: 349, currency: 'RUB', merchant: 'MAGNIT' } };
    const { handlers, service } = handlerEnv({ batchId: null, defaulted: 0, results: [duplicate] });
    const ctx = forwardedCtx(samples[1][0]);
    await handlers.handleMessage(ctx, 'ru');
    await handlers.idle();
    const [text, extra] = ctx.reply.mock.calls[0];
    expect(text).toBe(t('bank_skip_duplicate', { item: `${formatter.formatAmount(349, 'RUB')} — MAGNIT` }));
    const keyboard = extra.reply_markup.inline_keyboard;
    expect(keyboard[0]).toEqual([{ text: t('button_bank_open'), callback_data: 'ex|77|n' }]);
    expect(keyboard[1][0].text).toBe(t('button_bank_record_anyway'));
    const token = keyboard[1][0].callback_data.split('|')[1];

    const press = () => ({
      from: { id: USER },
      chat: { id: USER, type: 'private' },
      match: [`bfa|${token}`, token],
      callbackQuery: { data: `bfa|${token}`, message: { message_id: 900, reply_markup: { inline_keyboard: keyboard } } },
      answerCbQuery: jest.fn(async () => {}),
      editMessageReplyMarkup: jest.fn(async () => {}),
      reply: jest.fn(async () => ({ message_id: 901 })),
      telegram: { deleteMessage: jest.fn() }
    });
    const first = press();
    await handlers.recordAnyway(first);
    expect(service.recordAnyway).toHaveBeenCalledWith(USER, [duplicate], { familyId: null });
    expect(first.editMessageReplyMarkup).toHaveBeenCalledWith({ inline_keyboard: [keyboard[0]] });
    const second = press();
    await handlers.recordAnyway(second);
    expect(service.recordAnyway).toHaveBeenCalledTimes(1);
    expect(second.answerCbQuery).toHaveBeenCalledWith(t('bank_button_outdated'), { show_alert: true });
  });

  it('model limit for a free user shows the premium button; refund offers to open that purchase', async () => {
    const { handlers } = handlerEnv({
      batchId: null,
      defaulted: 0,
      results: [{ status: 'refund', refundTargetId: 55, parsed: { ok: true, kind: 'refund', amount: 349, currency: 'RUB', merchant: 'MAGNIT' } }]
    });
    const ctx = forwardedCtx(samples[8][0]);
    await handlers.handleMessage(ctx, 'ru');
    await handlers.idle();
    expect(ctx.reply.mock.calls[0][1].reply_markup.inline_keyboard).toEqual([[{ text: t('button_bank_open_purchase'), callback_data: 'ex|55|n' }]]);

    const limited = handlerEnv({ batchId: null, defaulted: 0, results: [{ status: 'model_limit', limit: 10, isPremium: false, parsed: { ok: false } }] });
    const ctx2 = forwardedCtx('Ваша карта ••1234: ВкусВилл, 1 349 ₽');
    await limited.handlers.handleMessage(ctx2, 'ru');
    await limited.handlers.idle();
    expect(ctx2.reply.mock.calls[0][0]).toBe(t('bank_skip_model_limit_regular', { limit: 10, premium: USER_LIMITS.premium.MAX_BANK_MODEL_PER_DAY }));
    expect(ctx2.reply.mock.calls[0][1].reply_markup.inline_keyboard).toEqual([[{ text: t('button_premium'), callback_data: 'premium_subscription' }]]);
  });

  it('forward origin → stable key: the same channel post or user message forwarded again has the same key', () => {
    const { forwardInfo } = BankNotificationHandlers;
    expect(forwardInfo({ forward_origin: { type: 'channel', chat: { id: -100 }, message_id: 77, date: 5 } }).key).toBe('ch:-100:77');
    expect(forwardInfo({ forward_origin: { type: 'hidden_user', sender_user_name: 'Bank', date: 6 } }).key).toBe('h:Bank:6');
    expect(forwardInfo({ text: 'x' })).toBeNull();
  });
});

// ---------- Маршрут в messages.js: новая ветка не перехватывает обычный ввод ----------

describe('routing: the bank branch comes after pending input and before questions / normal records', () => {
  function messages({ state = null, edit = null, expired = false } = {}) {
    const stateService = new StateService();
    if (state) stateService.setUserState(USER, state);
    if (edit) stateService.setUserEditState(USER, edit);
    if (expired) stateService.expiredInputs.add(USER);
    const bankHandlers = handlerEnv({ batchId: null, defaulted: 0, results: [] }).handlers;
    bankHandlers.handleMessage = jest.fn(async () => {});
    const deps = {
      userService: { getUserLanguage: jest.fn(async () => 'ru') },
      localizationService: localization,
      formatter,
      stateService,
      validator: new EnhancedValidator(),
      commandHandlers: {},
      expenseHandlers: { handleExpenseInput: jest.fn(async () => true), handleEditInput: jest.fn(async () => {}) },
      incomeHandlers: { handleIncomeInput: jest.fn(async () => {}) },
      multiEntryHandlers: { handleText: jest.fn(async () => false), singleEntryText: jest.fn(async (u, text) => text) },
      assistantHandlers: { ask: jest.fn(async () => {}) },
      bankNotificationHandlers: bankHandlers
    };
    return { handler: new MessageHandlers(deps), deps, bankHandlers };
  }
  const ctxOf = (text, extra = {}, chatType = 'private') => ({
    from: { id: USER }, chat: { id: USER, type: chatType }, message: { text, ...extra }, reply: jest.fn(async () => ({ message_id: 5 }))
  });
  const SMS = 'Покупка 1 250 ₽, PYATEROCHKA, карта *1234. Доступно 12 340 ₽';

  it('a pasted or forwarded notification goes to the bank branch', async () => {
    for (const ctx of [ctxOf(SMS), ctxOf('You spent $12.40 at STARBUCKS', { forward_origin: { type: 'hidden_user', sender_user_name: 'Bank', date: 1 } })]) {
      const { handler, deps, bankHandlers } = messages();
      await handler.handleExpense(ctx);
      expect(bankHandlers.handleMessage).toHaveBeenCalledWith(ctx, 'ru');
      expect(deps.multiEntryHandlers.handleText).not.toHaveBeenCalled();
      expect(deps.expenseHandlers.handleExpenseInput).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['250 кофе', 'expense'], ['кофе 250р, такси 400р', 'multi'], ['оплата 500р интернет', 'multi'],
    ['сколько я потратил на такси?', 'question'], ['+50000 зарплата', 'income']
  ])('%j keeps its usual route (%s)', async (text, route) => {
    const { handler, deps, bankHandlers } = messages();
    await handler.handleExpense(ctxOf(text));
    expect(bankHandlers.handleMessage).not.toHaveBeenCalled();
    if (route === 'question') expect(deps.assistantHandlers.ask).toHaveBeenCalled();
    else expect(deps.multiEntryHandlers.handleText).toHaveBeenCalled();
    if (route === 'income') expect(deps.incomeHandlers.handleIncomeInput).toHaveBeenCalled();
    if (route === 'expense') expect(deps.expenseHandlers.handleExpenseInput).toHaveBeenCalled();
  });

  it('a pending input (income, record edit) gets the text first, even if it looks like a notification', async () => {
    const income = messages({ state: 'adding_income' });
    await income.handler.handleExpense(ctxOf(SMS));
    expect(income.deps.incomeHandlers.handleIncomeInput).toHaveBeenCalled();
    expect(income.bankHandlers.handleMessage).not.toHaveBeenCalled();

    const edit = messages({ edit: '705' });
    await edit.handler.handleExpense(ctxOf(SMS));
    expect(edit.deps.expenseHandlers.handleEditInput).toHaveBeenCalled();
    expect(edit.bankHandlers.handleMessage).not.toHaveBeenCalled();
  });

  it('after an expired prompt a notification is still recorded, not offered as «✅ Записать …»', async () => {
    const { handler, bankHandlers } = messages({ expired: true });
    const ctx = ctxOf(SMS);
    await handler.handleExpense(ctx);
    expect(bankHandlers.handleMessage).toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('a forwarded friend message «250 кофе» and group chats stay out of the branch', async () => {
    const forwarded = messages();
    await forwarded.handler.handleExpense(ctxOf('250 кофе', { forward_origin: { type: 'user', sender_user: { id: 1 }, date: 1 } }));
    expect(forwarded.bankHandlers.handleMessage).not.toHaveBeenCalled();
    expect(forwarded.deps.expenseHandlers.handleExpenseInput).toHaveBeenCalled();
    expect(forwarded.bankHandlers.accepts(ctxOf(SMS, {}, 'group'))).toBe(false);
  });
});

describe('texts: 13 languages', () => {
  const dir = path.join(__dirname, '..', 'locales');
  const ru = require('../locales/ru');
  const keys = Object.keys(ru).slice(Object.keys(ru).indexOf('help_edit') + 1, Object.keys(ru).indexOf('onb_done_tip_bank') + 1);

  it('every locale has the bank keys without leftover placeholders and with balanced Markdown', () => {
    expect(keys[0]).toBe('bank_record_label');
    expect(keys).toHaveLength(24);
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    expect(files).toHaveLength(13);
    for (const file of files) {
      const lang = file.replace('.js', '');
      const locale = require(path.join(dir, file));
      for (const key of keys) {
        expect([lang, key, typeof locale[key]]).toEqual([lang, key, 'string']);
        const sample = localization.getText(lang, key, { item: '349 ₽ — MAGNIT', currency: 'GBP', limit: 10, premium: 100, category: 'Еда', count: 2 });
        expect([lang, key, /\{\w+\}/.test(sample)]).toEqual([lang, key, false]);
        const stripped = locale[key].replace(/\{\w+\}/g, '');
        for (const mark of ['*', '_', '`']) expect([lang, key, mark, stripped.split(mark).length % 2]).toEqual([lang, key, mark, 1]);
      }
      expect(locale.onb_input_bank.length).toBeLessThanOrEqual(40);
    }
  });
});
