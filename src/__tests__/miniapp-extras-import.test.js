// Mini App «Импорт выписки»: тот же разбор и та же память превью, что у бота; запись один раз; отмена только своей
// партии; правка операции превью (исключить, другая категория) — в ImportService.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const ImportService = require('../services/ImportService');
const RateLimiter = require('../utils/rateLimiter');
const Formatter = require('../utils/formatter');

const TOKEN = '123456:TEST-token';
const OWNER = 907470387;
const OTHER = 1066875127;
const auth = (id = OWNER) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' }) }, TOKEN)}`;

const CSV = [
  'Дата;Сумма;Описание;Категория',
  '01.10.2026;-500,00;Пятёрочка;Супермаркеты',
  '02.10.2026;-1200,00;Перевод Ивану;Переводы',
  '03.10.2026;30000,00;Зарплата;',
  '04.10.2026;-300,00;Такси;Такси'
].join('\n');

const categories = [
  { id: 1, user_id: 0, name: 'Еда', icon: '🍕' },
  { id: 2, user_id: 0, name: 'Транспорт', icon: '🚗' },
  { id: 6, user_id: 0, name: 'Другое', icon: '📦' },
  { id: 50, user_id: OWNER, name: 'Кофейни', icon: '☕' }
];

function server({ createImport, deleteImport } = {}) {
  const currencyUtils = { convert: jest.fn(async (amount) => amount) };
  const expenseService = { getCategories: jest.fn(async () => categories), getDefaultCategory: jest.fn(async () => categories[2]) };
  const userService = {
    getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1
  };
  const importRepository = {
    findExistingHashes: jest.fn(async () => new Set()),
    // Такси 300 ₽ 4 октября уже записано вручную
    getRecordedAmounts: jest.fn(async () => [{ kind: 'expense', day: '2026-10-04', amount: '300.00', currency: 'RUB', import_hash: null }]),
    getLastCategoriesForDescriptions: jest.fn(async () => new Map()),
    createImport: jest.fn(createImport || (async (userId, source, timezone, expenses, incomes) => ({ importId: 9, expenses: expenses.length, incomes: incomes.length }))),
    deleteImport: jest.fn(deleteImport || (async (userId, importId) => (userId === OWNER && importId === 9 ? { expenses: 2, incomes: 1 } : null))),
    listImports: jest.fn(async () => [{ id: 9, source: 'tbank', created_at: new Date('2026-11-01T10:00:00Z'), expenses: 2, incomes: 1, first_day: '2026-10-01', last_day: '2026-10-03' }])
  };
  const importService = new ImportService({ importRepository, expenseService, userService, currencyUtils });
  const achievementService = { track: jest.fn(async () => '🏅 *Новый значок*') };
  const services = {
    localizationService: new LocalizationService(),
    userService,
    premiumService: { isPremiumUser: async () => false },
    importService,
    importRepository,
    expenseService,
    currencyUtils,
    formatter: new Formatter(currencyUtils),
    rateLimiter: new RateLimiter(),
    achievementService
  };
  const app = new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app;
  return { app, importRepository, importService, achievementService };
}

const upload = (app, body = CSV, name = 'statement.csv', id = OWNER) => request(app)
  .post(`/api/import/preview?name=${encodeURIComponent(name)}`)
  .set('Authorization', auth(id))
  .set('Content-Type', 'text/csv')
  .send(Buffer.from(body, 'utf8'));

describe('mini app statement import', () => {
  test('a CSV gives a preview with statuses; nothing is written; transfers are off until switched on', async () => {
    const { app, importRepository } = server();
    const res = await upload(app).expect(200);
    expect(res.body.id).toMatch(/^app:[0-9a-f]{16}$/);
    expect(res.body).toMatchObject({
      source: 'csv', sourceLabel: 'CSV', currency: 'RUB', period: { from: '2026-10-01', to: '2026-10-04' },
      expenses: { count: 1, byCurrency: [{ currency: 'RUB', total: 500 }] },
      incomes: { count: 1, byCurrency: [{ currency: 'RUB', total: 30000 }] },
      transfers: { count: 1, include: false },
      toWriteCount: 2,
      skipped: { manual: 1, transfers: 1, excluded: 0 }
    });
    expect(res.body.operations.map(op => [op.description, op.status, op.write])).toEqual([
      ['Пятёрочка', 'new', true], ['Перевод Ивану', 'transfer', false], ['Зарплата', 'new', true], ['Такси', 'manual', false]
    ]);
    expect(res.body.operations[0]).toMatchObject({ kind: 'expense', date: '2026-10-01', amount: 500, category: { id: 1, icon: '🍕' } });
    expect(res.body.categories).toHaveLength(4);
    expect(importRepository.createImport).not.toHaveBeenCalled();

    const again = await request(app).get(`/api/import/preview/${res.body.id}`).set('Authorization', auth()).expect(200);
    expect(again.body.toWriteCount).toBe(2);
  });

  test('switching transfers on, excluding an operation and changing a category change what will be written', async () => {
    const { app } = server();
    const { body: { id } } = await upload(app).expect(200);
    const base = `/api/import/preview/${id}`;

    let res = await request(app).patch(base).set('Authorization', auth()).send({ transfers: true }).expect(200);
    expect(res.body).toMatchObject({ toWriteCount: 3, transfers: { include: true } });
    expect(res.body.operations[1].write).toBe(true);

    res = await request(app).patch(`${base}/operations/2`).set('Authorization', auth()).send({ include: false }).expect(200);
    expect(res.body).toMatchObject({ toWriteCount: 2, incomes: { count: 0 }, skipped: { excluded: 1 } });
    expect(res.body.operations[2]).toMatchObject({ excluded: true, write: false });

    res = await request(app).patch(`${base}/operations/0`).set('Authorization', auth()).send({ categoryId: 50 }).expect(200);
    expect(res.body.operations[0].category).toMatchObject({ id: 50, label: 'Кофейни', icon: '☕' });
    expect(res.body.topCategories).toEqual([{ label: 'Другое', icon: '📦', total: 1200 }, { label: 'Кофейни', icon: '☕', total: 500 }]);

    // Категория не из доступных, доход с категорией, уже записанная операция, номер вне файла, пустая правка
    await request(app).patch(`${base}/operations/0`).set('Authorization', auth()).send({ categoryId: 777 }).expect(400, { error: 'import_operation_locked' });
    await request(app).patch(`${base}/operations/2`).set('Authorization', auth()).send({ categoryId: 1 }).expect(400, { error: 'import_operation_locked' });
    await request(app).patch(`${base}/operations/3`).set('Authorization', auth()).send({ include: true }).expect(400, { error: 'import_operation_locked' });
    await request(app).patch(`${base}/operations/4`).set('Authorization', auth()).send({ include: true }).expect(400);
    await request(app).patch(`${base}/operations/0`).set('Authorization', auth()).send({}).expect(400);
    await request(app).patch(base).set('Authorization', auth()).send({ transfers: 'yes' }).expect(400);
  });

  test('confirming writes once through ImportService and counts the import for achievements', async () => {
    const { app, importRepository, achievementService } = server();
    const { body: { id } } = await upload(app).expect(200);
    await request(app).patch(`/api/import/preview/${id}/operations/0`).set('Authorization', auth()).send({ categoryId: 50 }).expect(200);

    const [first, second] = await Promise.all([
      request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth()),
      request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth())
    ]);
    const ok = [first, second].find(res => res.status === 200);
    const stale = [first, second].find(res => res.status !== 200);
    expect(ok.body).toMatchObject({ importId: 9, expenses: 1, incomes: 1, skipped: { manual: 1, transfers: 1, duplicates: 0 }, achievement: '🏅 Новый значок' });
    expect(stale.status).toBe(400);
    expect(stale.body).toEqual({ error: 'import_outdated' });
    expect(importRepository.createImport).toHaveBeenCalledTimes(1);
    const [userId, source, timezone, expenses, incomes] = importRepository.createImport.mock.calls[0];
    expect([userId, source, timezone]).toEqual([OWNER, 'csv', 'Europe/Moscow']);
    expect(expenses.map(op => [op.description, op.categoryId])).toEqual([['Пятёрочка', 50]]);
    expect(incomes.map(op => op.description)).toEqual(['Зарплата']);
    expect(achievementService.track).toHaveBeenCalledWith(OWNER, 'import_done', { lang: 'ru' });

    await request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth()).expect(400, { error: 'import_outdated' });
    await request(app).get(`/api/import/preview/${id}`).set('Authorization', auth()).expect(400, { error: 'import_outdated' });
  });

  test('a failed write keeps the preview for another try', async () => {
    let fail = true;
    const { app, importRepository } = server({
      createImport: async (userId, source, timezone, expenses, incomes) => {
        if (fail) { fail = false; throw new Error('db down'); }
        return { importId: 10, expenses: expenses.length, incomes: incomes.length };
      }
    });
    const { body: { id } } = await upload(app).expect(200);
    await request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth()).expect(500, { error: 'import_failed' });
    await request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth()).expect(200);
    expect(importRepository.createImport).toHaveBeenCalledTimes(2);
  });

  test('previews are per user, expire, and can be cancelled', async () => {
    const { app } = server();
    const { body: { id } } = await upload(app).expect(200);
    await request(app).get(`/api/import/preview/${id}`).set('Authorization', auth(OTHER)).expect(400, { error: 'import_outdated' });
    await request(app).post(`/api/import/preview/${id}/confirm`).set('Authorization', auth(OTHER)).expect(400, { error: 'import_outdated' });
    await request(app).get('/api/import/preview/app:0000000000000000').set('Authorization', auth()).expect(400, { error: 'import_outdated' });
    await request(app).get('/api/import/preview/123').set('Authorization', auth()).expect(400, { error: 'import_outdated' });

    await request(app).delete(`/api/import/preview/${id}`).set('Authorization', auth()).expect(200, { ok: true });
    await request(app).get(`/api/import/preview/${id}`).set('Authorization', auth()).expect(400, { error: 'import_outdated' });
  });

  test('unsupported and unreadable files get their own error codes', async () => {
    const { app } = server();
    await upload(app, CSV, 'statement.docx').expect(400, { error: 'import_unsupported_file' });
    await upload(app, '', 'statement.csv').expect(400, { error: 'import_unsupported_file' });
    await upload(app, 'Имя;Город\nИлья;Томск\n', 'people.csv').expect(400, { error: 'import_csv_columns' });
    await upload(app, 'просто текст без операций', 'notes.txt').expect(400, { error: 'import_unknown_format' });
  });

  test('the bot\'s import limit applies: 10 files in 10 minutes', async () => {
    const { app } = server();
    for (let i = 0; i < 10; i++) await upload(app, CSV, 'statement.docx').expect(400);
    await upload(app).expect(429, { error: 'import_rate', retryAfter: 600 });
  });

  test('history lists the user\'s imports; undo deletes only the user\'s own batch, a second time — «already undone»', async () => {
    const { app, importRepository } = server();
    const list = await request(app).get('/api/import').set('Authorization', auth()).expect(200);
    expect(importRepository.listImports).toHaveBeenCalledWith(OWNER, 'Europe/Moscow');
    expect(list.body.imports).toEqual([{
      id: 9, source: 'tbank', sourceLabel: 'Т-Банк', createdAt: '2026-11-01T10:00:00.000Z', expenses: 2, incomes: 1, period: { from: '2026-10-01', to: '2026-10-03' }
    }]);

    await request(app).delete('/api/import/9').set('Authorization', auth(OTHER)).expect(404, { error: 'import_undone' });
    expect(importRepository.deleteImport).toHaveBeenLastCalledWith(OTHER, 9);
    await request(app).delete('/api/import/9').set('Authorization', auth()).expect(200, { expenses: 2, incomes: 1 });
    await request(app).delete('/api/import/abc').set('Authorization', auth()).expect(404);
    expect(importRepository.deleteImport).toHaveBeenCalledTimes(2);
  });
});

describe('ImportService: preview edits from the app', () => {
  const op = (overrides) => ({ kind: 'expense', date: '2026-10-01 10:00:00', amount: 100, currency: 'RUB', description: 'x', isTransfer: false, status: 'new', categoryId: 6, ...overrides });

  function service(createImport = async (u, s, tz, expenses, incomes) => ({ importId: 3, expenses: expenses.length, incomes: incomes.length })) {
    const importRepository = { createImport: jest.fn(createImport) };
    const instance = new ImportService({
      importRepository,
      expenseService: { getCategories: async () => categories },
      userService: {},
      currencyUtils: { convert: async (amount) => amount }
    });
    return { instance, importRepository };
  }

  test('an excluded operation is neither counted nor written; only new expenses take another category', async () => {
    const { instance, importRepository } = service();
    const session = { source: 'csv', timezone: 'UTC', includeTransfers: null, skipped: { failed: 0, invalid: 0, currency: 0 },
      operations: [op({ description: 'a' }), op({ description: 'b', amount: 50 }), op({ kind: 'income', description: 'c' }), op({ description: 'd', status: 'manual' })] };

    expect(await instance.updateOperation(OWNER, session, 1, { include: false })).toBe(true);
    expect(await instance.updateOperation(OWNER, session, 0, { categoryId: 50 })).toBe(true);
    expect(session.operations[0]).toMatchObject({ categoryId: 50, categoryName: 'Кофейни', categoryIcon: '☕' });
    expect(await instance.updateOperation(OWNER, session, 0, { categoryId: 999 })).toBe(false);
    expect(await instance.updateOperation(OWNER, session, 2, { categoryId: 1 })).toBe(false);
    expect(await instance.updateOperation(OWNER, session, 3, { include: false })).toBe(false);
    expect(await instance.updateOperation(OWNER, session, 9, { include: false })).toBe(false);

    const summary = await instance.summarize(session, 'RUB');
    expect(summary.expenses.count).toBe(1);
    expect(summary.toWriteCount).toBe(2);
    await instance.commit(OWNER, session);
    const [, , , expenses, incomes] = importRepository.createImport.mock.calls[0];
    expect(expenses.map(item => item.description)).toEqual(['a']);
    expect(incomes.map(item => item.description)).toEqual(['c']);
  });

  test('confirm forgets the preview after writing and gives it back after a failed write', async () => {
    const session = { source: 'csv', timezone: 'UTC', includeTransfers: null, skipped: { failed: 0, invalid: 0, currency: 0 }, operations: [op({})] };
    const broken = service(async () => { throw new Error('db'); }).instance;
    broken.saveSession(OWNER, 'app:1', session);
    const taken = broken.takeSession(OWNER, 'app:1');
    await expect(broken.confirm(OWNER, 'app:1', taken, 'RUB')).rejects.toThrow('db');
    expect(broken.getSession(OWNER, 'app:1')).toBeTruthy();

    const { instance } = service(async () => ({ importId: 3, expenses: 0, incomes: 0 }));
    instance.saveSession(OWNER, 7, session);
    const result = await instance.confirm(OWNER, 7, instance.takeSession(OWNER, 7), 'RUB');
    expect(result).toMatchObject({ importId: 3, raced: 1, skipped: { duplicates: 1 } });
    expect(instance.getSession(OWNER, 7)).toBeUndefined();
  });
});
