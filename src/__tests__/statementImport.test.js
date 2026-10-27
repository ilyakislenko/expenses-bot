const fs = require('fs');
const path = require('path');
const { parseAmount, parseDateTime, decodeText } = require('../utils/statement/common');
const { parseSberText, parseKaspiText } = require('../utils/statement/bankText');
const { parseStatement, parseStatementText, ImportError, isSupportedDocument, mapBankCategory } = require('../utils/statement');
const ImportService = require('../services/ImportService');
const Formatter = require('../utils/formatter');

// windows-1251: в Node есть только декодер, кодируем вручную (ASCII + кириллица)
function toCp1251(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code >= 0x410 && code <= 0x44f) bytes.push(code - 0x410 + 0xc0);
    else if (code === 0x401) bytes.push(0xa8);
    else if (code === 0x451) bytes.push(0xb8);
    else if (code === 0x2116) bytes.push(0xb9);
    else throw new Error(`No cp1251 byte for ${ch}`);
  }
  return Buffer.from(bytes);
}

const TBANK_HEADER = '"Дата операции";"Дата платежа";"Номер карты";"Статус";"Сумма операции";"Валюта операции";"Сумма платежа";"Валюта платежа";"Кэшбэк";"Категория";"MCC";"Описание";"Бонусы (включая кэшбэк)";"Округление на инвесткопилку";"Сумма операции с округлением"';
const tbankRow = (cells) => cells.map(cell => `"${cell}"`).join(';');
const TBANK_CSV = [
  TBANK_HEADER,
  tbankRow(['01.03.2024 12:34:56', '01.03.2024', '*1234', 'OK', '-1234,56', 'RUB', '-1234,56', 'RUB', '', 'Супермаркеты', '5411', 'Пятёрочка', '12,00', '0,00', '1234,56']),
  tbankRow(['02.03.2024 09:10:00', '02.03.2024', '*1234', 'OK', '-350,00', 'RUB', '-350,00', 'RUB', '', 'Такси', '4121', 'Яндекс Такси', '0,00', '0,00', '350,00']),
  tbankRow(['02.03.2024 18:00:00', '02.03.2024', '*1234', 'FAILED', '-999,00', 'RUB', '-999,00', 'RUB', '', 'Рестораны', '5812', 'Теремок', '0,00', '0,00', '999,00']),
  tbankRow(['03.03.2024 10:00:00', '03.03.2024', '', 'OK', '-5000,00', 'RUB', '-5000,00', 'RUB', '', 'Переводы', '', 'Перевод между счетами', '0,00', '0,00', '5000,00']),
  tbankRow(['05.03.2024 10:00:00', '05.03.2024', '', 'OK', '20000,00', 'RUB', '20000,00', 'RUB', '', 'Пополнения', '', 'Пополнение. Система быстрых платежей', '0,00', '0,00', '20000,00']),
  tbankRow(['06.03.2024 11:00:00', '06.03.2024', '', 'OK', '55000,00', 'RUB', '55000,00', 'RUB', '', 'Другое', '', 'Зарплата', '0,00', '0,00', '55000,00']),
  tbankRow(['07.03.2024 20:00:00', '08.03.2024', '*1234', 'OK', '-12,00', 'USD', '-1100,00', 'RUB', '', 'Сервис', '5734', 'Steam', '0,00', '0,00', '1100,00']),
  tbankRow(['08.03.2024 08:00:00', '08.03.2024', '*1234', 'OK', '-10,00', 'GBP', '-10,00', 'GBP', '', 'Транспорт', '4111', 'TfL', '0,00', '0,00', '10,00'])
].join('\r\n');

describe('amounts and dates', () => {
  it('parses amounts with spaces, commas, dots, signs and parentheses', () => {
    expect(parseAmount('-1 234,56')).toBe(-1234.56);
    expect(parseAmount('1\u00a0234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('(12.50)')).toBe(-12.5);
    expect(parseAmount('123.45-')).toBe(-123.45);
    expect(parseAmount('+500 ₽')).toBe(500);
    expect(parseAmount('−2 500,00')).toBe(-2500);
    expect(parseAmount('12,500')).toBe(12500);
    expect(parseAmount('0,5')).toBe(0.5);
    expect(parseAmount('1,234,567')).toBe(1234567);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });

  it('parses dates in several formats, validates them and keeps local time', () => {
    expect(parseDateTime('01.03.2024 12:34:56')).toBe('2024-03-01 12:34:56');
    expect(parseDateTime('01.03.24')).toBe('2024-03-01 12:00:00');
    expect(parseDateTime('2024-03-01T08:15')).toBe('2024-03-01 08:15:00');
    expect(parseDateTime('25/03/2024')).toBe('2024-03-25 12:00:00');
    expect(parseDateTime('03/25/2024', 'mdy')).toBe('2024-03-25 12:00:00');
    expect(parseDateTime('01.03.2024, 09:05')).toBe('2024-03-01 09:05:00');
    expect(parseDateTime('31.02.2024')).toBeNull();
    expect(parseDateTime('Итого')).toBeNull();
  });

  it('decodes windows-1251 and UTF-8 with BOM', () => {
    expect(decodeText(toCp1251('Дата;Сумма'))).toBe('Дата;Сумма');
    expect(decodeText(Buffer.from('\uFEFFДата;Сумма', 'utf8'))).toBe('Дата;Сумма');
  });
});

describe('T-Bank CSV', () => {
  it('reads a cp1251 export: skips FAILED rows and unsupported currency, marks transfers, keeps payment amount', async () => {
    const result = await parseStatement(toCp1251(TBANK_CSV));
    expect(result.source).toBe('tbank');
    expect(result.skipped).toEqual({ failed: 1, invalid: 0, currency: 1 });
    expect(result.operations).toHaveLength(6);
    const [groceries, taxi, transfer, topUp, salary, steam] = result.operations;
    expect(groceries).toMatchObject({
      date: '2024-03-01 12:34:56', amount: 1234.56, kind: 'expense', currency: 'RUB',
      description: 'Пятёрочка', bankCategory: 'Супермаркеты', mcc: '5411', isTransfer: false
    });
    expect(taxi).toMatchObject({ amount: 350, kind: 'expense', isTransfer: false });
    expect(transfer).toMatchObject({ amount: 5000, kind: 'expense', isTransfer: true });
    expect(topUp).toMatchObject({ amount: 20000, kind: 'income', isTransfer: true });
    expect(salary).toMatchObject({ amount: 55000, kind: 'income', isTransfer: false, description: 'Зарплата' });
    // Списано в рублях, операция в долларах — сумма в валюте счёта, долларовая — для сверки с ручными записями
    expect(steam).toMatchObject({ amount: 1100, currency: 'RUB', altAmount: 12, altCurrency: 'USD' });
  });

  it('reads the same export in UTF-8', async () => {
    const result = await parseStatement(Buffer.from(TBANK_CSV, 'utf8'));
    expect(result.source).toBe('tbank');
    expect(result.operations).toHaveLength(6);
  });
});

describe('generic CSV', () => {
  it('comma-separated English export with mm/dd dates and thousands separators', () => {
    const csv = 'Date,Description,Amount,Currency\n03/25/2024,"Coffee, large",-4.50,USD\n03/26/2024,Salary,"2,500.00",USD\n';
    const result = parseStatementText(csv);
    expect(result.source).toBe('csv');
    expect(result.operations).toEqual([
      expect.objectContaining({ date: '2024-03-25 12:00:00', amount: 4.5, kind: 'expense', currency: 'USD', description: 'Coffee, large' }),
      expect.objectContaining({ date: '2024-03-26 12:00:00', amount: 2500, kind: 'income', currency: 'USD', description: 'Salary' })
    ]);
  });

  it('ambiguous dd/mm dates are read day-first', () => {
    const csv = 'Date;Amount;Description\n01/02/2024;-10;A\n03/04/2024;-20;B\n';
    const result = parseStatementText(csv, { defaultCurrency: 'EUR' });
    expect(result.operations.map(op => op.date)).toEqual(['2024-02-01 12:00:00', '2024-04-03 12:00:00']);
    expect(result.operations[0].currency).toBe('EUR');
  });

  it('bank export with a preamble line and separate income/expense columns', () => {
    const csv = [
      'Выписка по счёту 40817810000000000001',
      'Тип счёта;Номер счета;Валюта;Дата операции;Референс проводки;Описание операции;Приход;Расход',
      'Текущий счёт;40817810000000000001;RUR;01.03.24;CRD_1;Оплата в MAGNIT MM;0;1 250,00',
      'Текущий счёт;40817810000000000001;RUR;02.03.24;CRD_2;Зачисление зарплаты;50 000,00;0',
      'Текущий счёт;40817810000000000001;RUR;вчера;CRD_3;Строка без даты;0;100,00'
    ].join('\n');
    const result = parseStatementText(csv);
    expect(result.skipped.invalid).toBe(1);
    expect(result.operations).toEqual([
      expect.objectContaining({ date: '2024-03-01 12:00:00', amount: 1250, kind: 'expense', currency: 'RUB', description: 'Оплата в MAGNIT MM' }),
      expect.objectContaining({ date: '2024-03-02 12:00:00', amount: 50000, kind: 'income', currency: 'RUB' })
    ]);
  });

  it('tab-separated file with a debit/credit type column and positive amounts', () => {
    const csv = 'Date\tType\tAmount\tDescription\tCategory\n2024-03-01 08:15\tDebit\t12.30\tStarbucks\tCoffee\n2024-03-02 09:00\tCredit\t100.00\tRefund\t\n';
    const result = parseStatementText(csv, { defaultCurrency: 'USD' });
    expect(result.operations).toEqual([
      expect.objectContaining({ date: '2024-03-01 08:15:00', amount: 12.3, kind: 'expense', bankCategory: 'Coffee' }),
      expect.objectContaining({ date: '2024-03-02 09:00:00', amount: 100, kind: 'income' })
    ]);
  });

  it('round-trips the bot\'s own CSV export (all positive amounts are expenses, totals rows ignored)', async () => {
    const formatter = new Formatter({ convert: async (amount) => amount });
    const csv = await formatter.formatCSV([
      { created_at_utc: '2024-03-01T09:00:00Z', amount: '250.00', currency: 'RUB', category: 'Еда', description: 'кофе' },
      { created_at_utc: '2024-03-02T15:30:00Z', amount: '1200.50', currency: 'RUB', category: 'Транспорт', description: 'такси' }
    ], 'RUB', 'Europe/Moscow');
    const result = await parseStatement(Buffer.from(csv, 'utf8'));
    expect(result.skipped).toEqual({ failed: 0, invalid: 0, currency: 0 });
    expect(result.operations).toEqual([
      expect.objectContaining({ date: '2024-03-01 12:00:00', amount: 250, kind: 'expense', currency: 'RUB', description: 'кофе', bankCategory: 'Еда' }),
      expect.objectContaining({ date: '2024-03-02 18:30:00', amount: 1200.5, kind: 'expense', description: 'такси' })
    ]);
  });

  it('reports a clear error when date and amount columns are not found', () => {
    expect(() => parseStatementText('foo;bar;baz\n1;2;3\n4;5;6\n')).toThrow(expect.objectContaining({ code: 'csv_columns' }));
  });

  it('rejects files with too many operations and files without operations', () => {
    const rows = ['Date;Amount;Description'];
    for (let i = 0; i < 5001; i++) rows.push(`01.03.2024;-1;row ${i}`);
    expect(() => parseStatementText(rows.join('\n'))).toThrow(expect.objectContaining({ code: 'too_many', params: { max: 5000 } }));
    expect(() => parseStatementText('Date;Amount;Description\n01.03.2024;0;zero\n')).toThrow(expect.objectContaining({ code: 'empty' }));
  });
});

describe('Sber statement text', () => {
  const SBER_TEXT = [
    'ПАО Сбербанк',
    'Выписка по счёту дебетовой карты',
    'ДАТА ОПЕРАЦИИ (МСК) КАТЕГОРИЯ СУММА В ВАЛЮТЕ СЧЁТА ОСТАТОК СРЕДСТВ',
    '03.07.2023 13:18 Супермаркеты 1 489,98 18 534,60',
    '04.07.2023 / 264897 PYATEROCHKA 1234 Moskva RUS. Операция по карте ****1234',
    '03.07.2023 15:02 Рестораны и 1 200,00 17 334,60',
    'кафе',
    '04.07.2023 / 123456 TEREMOK MOSKVA RUS',
    '05.07.2023 09:00 Перевод с карты +10 000,00 27 334,60',
    '05.07.2023 / 777777 Перевод от И. Иван И.',
    'Продолжение на следующей странице',
    'Страница 1 из 2',
    '06.07.2023 11:11 123456 Прочие операции',
    '350,00 26 984,60',
    '06.07.2023 YANDEX.GO Moscow RUS',
    '07.07.2023 10:05 Выдача наличных 5000,00 21984,60',
    '07.07.2023 / 222222 ATM 123456 MOSCOW'
  ].join('\n');

  it('parses rows, wrapped categories, wrapped amounts, incomes and transfers', () => {
    const { source, operations, skipped } = parseSberText(SBER_TEXT);
    expect(source).toBe('sber');
    expect(skipped.invalid).toBe(0);
    expect(operations).toEqual([
      expect.objectContaining({ date: '2023-07-03 13:18:00', amount: 1489.98, kind: 'expense', currency: 'RUB', bankCategory: 'Супермаркеты', description: 'PYATEROCHKA 1234 Moskva RUS', isTransfer: false }),
      expect.objectContaining({ amount: 1200, kind: 'expense', bankCategory: 'Рестораны и кафе', description: 'TEREMOK MOSKVA RUS' }),
      expect.objectContaining({ amount: 10000, kind: 'income', bankCategory: 'Перевод с карты', isTransfer: true }),
      expect.objectContaining({ date: '2023-07-06 11:11:00', amount: 350, kind: 'expense', bankCategory: 'Прочие операции', description: 'YANDEX.GO Moscow RUS' }),
      expect.objectContaining({ amount: 5000, kind: 'expense', bankCategory: 'Выдача наличных', isTransfer: true })
    ]);
  });

  it('moves a category tail that landed in the description column', () => {
    const text = '03.07.2023 15:02 Рестораны и 1 200,00 17 334,60\n04.07.2023 / 123456 кафе TEREMOK MOSKVA RUS';
    const [op] = parseSberText(text).operations;
    expect(op).toMatchObject({ bankCategory: 'Рестораны и кафе', description: 'TEREMOK MOSKVA RUS' });
  });

  it('is picked automatically from statement text', () => {
    expect(parseStatementText(SBER_TEXT).source).toBe('sber');
  });

  it('extracts a generated Sber-like PDF through the real PDF path', async () => {
    const buffer = fs.readFileSync(path.join(__dirname, 'fixtures', 'sber-statement.pdf'));
    const result = await parseStatement(buffer);
    expect(result.source).toBe('sber');
    expect(result.operations.map(op => [op.date, op.amount, op.kind, op.isTransfer])).toEqual([
      ['2023-07-03 13:18:00', 1489.98, 'expense', false],
      ['2023-07-03 15:02:00', 1200, 'expense', false],
      ['2023-07-05 09:00:00', 10000, 'income', true],
      ['2023-07-05 19:40:00', 350, 'expense', false],
      ['2023-07-07 10:05:00', 780.5, 'expense', false],
      ['2023-07-08 12:00:00', 55000, 'income', false]
    ]);
    expect(result.operations[1]).toMatchObject({ bankCategory: 'Рестораны и кафе', description: 'TEREMOK MOSKVA RUS' });
    expect(result.operations[0].description).toBe('PYATEROCHKA 1234 Moskva RUS');
  });

  it('reports unreadable PDFs', async () => {
    await expect(parseStatement(Buffer.from('%PDF-1.4\nnot really a pdf'))).rejects.toMatchObject({ code: 'pdf' });
  });
});

describe('Kaspi Gold statement text', () => {
  const KASPI_TEXT = [
    'АО «Kaspi Bank», БИК CASPKZKA, www.kaspi.kz',
    'ВЫПИСКА',
    'по Kaspi Gold за период с 01.01.24 по 31.01.24',
    'Доступно на 31.01.24 +12 000,00 ₸',
    'Дата Сумма Операция Детали',
    '01.01.24 - 2 500,00 ₸ Покупки Magnum',
    '02.01.24 + 10 000,00 ₸ Пополнения С Kaspi Депозита',
    '03.01.24 - 5 000,00 ₸ Переводы Айгерим А.',
    '04.01.24 - 20 000,00 ₸ Снятия Банкомат Kaspi',
    '05.01.24 - 1 200,00 ₸ Разное Оплата',
    'мобильной связи',
    '06.01.24',
    '- 3 000,00 ₸ Покупки Яндекс Такси',
    'Страница 1 из 1'
  ].join('\n');

  it('parses signed amounts, operation types, wrapped details and transfers', () => {
    const { source, operations } = parseKaspiText(KASPI_TEXT);
    expect(source).toBe('kaspi');
    expect(operations.map(op => [op.date, op.amount, op.kind, op.currency, op.bankCategory, op.description, op.isTransfer])).toEqual([
      ['2024-01-01 12:00:00', 2500, 'expense', 'KZT', 'Покупки', 'Magnum', false],
      ['2024-01-02 12:00:00', 10000, 'income', 'KZT', 'Пополнения', 'С Kaspi Депозита', true],
      ['2024-01-03 12:00:00', 5000, 'expense', 'KZT', 'Переводы', 'Айгерим А.', true],
      ['2024-01-04 12:00:00', 20000, 'expense', 'KZT', 'Снятия', 'Банкомат Kaspi', true],
      ['2024-01-05 12:00:00', 1200, 'expense', 'KZT', 'Разное', 'Оплата мобильной связи', false],
      ['2024-01-06 12:00:00', 3000, 'expense', 'KZT', 'Покупки', 'Яндекс Такси', false]
    ]);
  });

  it('is picked automatically from statement text', () => {
    expect(parseStatementText(KASPI_TEXT).source).toBe('kaspi');
  });
});

describe('documents', () => {
  it('accepts csv/pdf/txt by extension or MIME type only', () => {
    expect(isSupportedDocument({ file_name: 'operations.CSV' })).toBe(true);
    expect(isSupportedDocument({ file_name: 'statement.pdf' })).toBe(true);
    expect(isSupportedDocument({ file_name: 'statement.txt' })).toBe(true);
    expect(isSupportedDocument({ file_name: 'statement.xlsx' })).toBe(false);
    expect(isSupportedDocument({ mime_type: 'application/pdf' })).toBe(true);
    expect(isSupportedDocument({ mime_type: 'image/png' })).toBe(false);
  });

  it('unknown text is reported as an unknown format', () => {
    expect(() => parseStatementText('hello there')).toThrow(ImportError);
  });
});

describe('category mapping', () => {
  it('maps bank categories, MCC and merchant names to the bot\'s default categories', () => {
    expect(mapBankCategory({ bankCategory: 'Супермаркеты' })).toBe('Еда');
    expect(mapBankCategory({ bankCategory: 'Рестораны и кафе' })).toBe('Еда');
    expect(mapBankCategory({ bankCategory: 'Фастфуд' })).toBe('Еда');
    expect(mapBankCategory({ bankCategory: 'Такси' })).toBe('Транспорт');
    expect(mapBankCategory({ bankCategory: 'Здоровье и красота' })).toBe('Здоровье');
    expect(mapBankCategory({ bankCategory: 'Аптеки' })).toBe('Здоровье');
    expect(mapBankCategory({ bankCategory: 'Кино' })).toBe('Развлечения');
    expect(mapBankCategory({ bankCategory: 'Одежда и обувь' })).toBe('Покупки');
    expect(mapBankCategory({ bankCategory: 'Игрушки' })).toBe('Покупки');
    expect(mapBankCategory({ bankCategory: 'Сервис', mcc: '5912' })).toBe('Здоровье');
    expect(mapBankCategory({ mcc: '3012' })).toBe('Транспорт');
    expect(mapBankCategory({ description: 'WILDBERRIES' })).toBe('Покупки');
    // Тип операции Kaspi «Покупки» — не категория: решает описание
    expect(mapBankCategory({ bankCategory: 'Покупки', description: 'Magnum' })).toBe('Еда');
    expect(mapBankCategory({ bankCategory: 'Прочие операции', description: 'ООО Ромашка' })).toBeNull();
  });
});

describe('dedup hash', () => {
  const op = { kind: 'expense', date: '2024-03-01 12:34:56', amount: 1234.56, currency: 'RUB', description: 'Пятёрочка' };

  it('is stable and ignores description case and spacing', () => {
    expect(ImportService.importHash(op)).toBe(ImportService.importHash({ ...op }));
    expect(ImportService.importHash(op)).toMatch(/^[0-9a-f]{64}$/);
    expect(ImportService.importHash({ ...op, description: '  ПЯТЕРОЧКА ' })).toBe(ImportService.importHash(op));
  });

  it('changes with any of date, amount, currency, description, kind', () => {
    const base = ImportService.importHash(op);
    expect(ImportService.importHash({ ...op, date: '2024-03-01 12:34:57' })).not.toBe(base);
    expect(ImportService.importHash({ ...op, amount: 1234.57 })).not.toBe(base);
    expect(ImportService.importHash({ ...op, currency: 'USD' })).not.toBe(base);
    expect(ImportService.importHash({ ...op, description: 'Магнит' })).not.toBe(base);
    expect(ImportService.importHash({ ...op, kind: 'income' })).not.toBe(base);
  });

  it('keeps identical operations in one file apart, and gives the same hashes on re-import', () => {
    const first = ImportService.assignHashes([{ ...op }, { ...op }, { ...op, amount: 1 }]).map(item => item.hash);
    const second = ImportService.assignHashes([{ ...op }, { ...op }, { ...op, amount: 1 }]).map(item => item.hash);
    expect(new Set(first).size).toBe(3);
    expect(second).toEqual(first);
  });
});

describe('ImportService', () => {
  const categories = [
    { id: 1, user_id: 0, name: 'Еда', icon: '🍕' },
    { id: 2, user_id: 0, name: 'Транспорт', icon: '🚗' },
    { id: 6, user_id: 0, name: 'Другое', icon: '📦' },
    { id: 50, user_id: 777, name: 'Кофейни', icon: '☕' }
  ];

  function createService({ existing = [], recorded = [], remembered = new Map() } = {}) {
    const importRepository = {
      findExistingHashes: jest.fn(async () => new Set(existing)),
      getRecordedAmounts: jest.fn(async () => recorded),
      getLastCategoriesForDescriptions: jest.fn(async () => remembered),
      createImport: jest.fn(async (userId, source, timezone, expenses, incomes) => ({ importId: 9, expenses: expenses.length, incomes: incomes.length })),
      deleteImport: jest.fn()
    };
    const service = new ImportService({
      importRepository,
      expenseService: {
        getCategories: jest.fn(async () => categories),
        getDefaultCategory: jest.fn(async () => categories[2])
      },
      userService: { getUserTimezone: jest.fn(async () => 'Europe/Moscow') },
      currencyUtils: { convert: jest.fn(async (amount) => amount) }
    });
    return { service, importRepository };
  }

  const parsed = (operations) => ({ source: 'tbank', operations, skipped: { failed: 1, invalid: 0, currency: 2 } });
  const expense = (overrides) => ({ kind: 'expense', date: '2024-03-01 10:00:00', amount: 100, currency: 'RUB', description: 'x', bankCategory: '', mcc: '', isTransfer: false, ...overrides });

  it('chooses remembered category, then bank mapping, then the default; marks duplicates and manual records', async () => {
    const ops = [
      expense({ description: 'Coffee Bar', bankCategory: 'Рестораны' }),
      expense({ description: 'Пятёрочка', bankCategory: 'Супермаркеты', amount: 500 }),
      expense({ description: 'ООО Ромашка', amount: 70 }),
      expense({ description: 'Такси', bankCategory: 'Такси', amount: 300 }),
      expense({ description: 'Такси', bankCategory: 'Такси', amount: 300, date: '2024-03-02 10:00:00' }),
      expense({ description: 'Steam', amount: 1100, altAmount: 12, altCurrency: 'USD', date: '2024-03-03 20:00:00' })
    ];
    const duplicateHash = ImportService.assignHashes([...ops.map(op => ({ ...op }))])[4].hash;
    const { service, importRepository } = createService({
      existing: [duplicateHash],
      remembered: new Map([['Coffee Bar', 50]]),
      recorded: [
        { kind: 'expense', day: '2024-03-01', amount: '300.00', currency: 'RUB' },
        { kind: 'expense', day: '2024-03-03', amount: '12.00', currency: 'USD' }
      ]
    });
    const session = await service.prepare(777, parsed(ops));
    expect(importRepository.getRecordedAmounts).toHaveBeenCalledWith(777, 'Europe/Moscow', '2024-03-01', '2024-03-03');
    expect(session.operations.map(op => op.status)).toEqual(['new', 'new', 'new', 'manual', 'duplicate', 'manual']);
    expect(session.operations.slice(0, 3).map(op => op.categoryId)).toEqual([50, 1, 6]);

    const summary = await service.summarize(session, 'RUB');
    expect(summary.expenses).toEqual({ count: 3, byCurrency: [{ currency: 'RUB', total: 670 }] });
    expect(summary.skipped).toEqual({ duplicates: 1, manual: 2, failed: 1, currency: 2, invalid: 0, transfers: 0 });
    expect(summary.topCategories.map(category => category.name)).toEqual(['Еда', 'Кофейни', 'Другое']);
    expect(summary.period).toEqual({ from: '2024-03-01', to: '2024-03-03' });
  });

  it('writes transfers only when the user chose to count them', async () => {
    const ops = [
      expense({ description: 'Магнит', bankCategory: 'Супермаркеты' }),
      expense({ description: 'Перевод между счетами', bankCategory: 'Переводы', amount: 5000, isTransfer: true }),
      { ...expense({ description: 'Пополнение', bankCategory: 'Пополнения', amount: 20000, isTransfer: true }), kind: 'income' }
    ];
    const { service, importRepository } = createService();
    const session = await service.prepare(777, parsed(ops));

    let summary = await service.summarize(session, 'RUB');
    expect(summary.transfers.count).toBe(2);
    expect(summary.toWriteCount).toBe(1);

    session.includeTransfers = false;
    summary = await service.summarize(session, 'RUB');
    expect(summary.skipped.transfers).toBe(2);
    let result = await service.commit(777, session);
    expect(result).toMatchObject({ importId: 9, expenses: 1, incomes: 0, raced: 0 });

    session.includeTransfers = true;
    result = await service.commit(777, session);
    expect(result).toMatchObject({ expenses: 2, incomes: 1 });
    const [, , , writtenExpenses, writtenIncomes] = importRepository.createImport.mock.calls[1];
    expect(writtenExpenses.map(op => op.date)).toEqual(['2024-03-01 10:00:00', '2024-03-01 10:00:00']);
    expect(writtenIncomes[0]).toMatchObject({ amount: 20000, hash: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it('keeps previews per message, hands a preview to one confirmation only and expires them', () => {
    const { service } = createService();
    service.saveSession(777, 10, { operations: [] });
    expect(service.takeSession(777, 10)).toMatchObject({ operations: [] });
    expect(service.takeSession(777, 10)).toBeNull();
    expect(service.getSession(777, 11)).toBeUndefined();

    service.saveSession(777, 12, { operations: [] });
    service.sessions.get(777).get(12).expiresAt = Date.now() - 1;
    expect(service.getSession(777, 12)).toBeUndefined();
  });
});
