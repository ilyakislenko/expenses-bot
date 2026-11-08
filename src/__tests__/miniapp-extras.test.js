// Mini App, раздел «Дополнительно»: «Теги» (суммы по #тегам, период, записи тега) и «Экспорт CSV» (тот же файл, что
// у бота, приходит документом в чат; лимит, фильтр категорий, ошибки). Строки раздела собираются из файлов экранов.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const ExportHandlers = require('../handlers/ExportHandlers');
const Formatter = require('../utils/formatter');
const RateLimiter = require('../utils/rateLimiter');
const { localToday, addDays } = require('../utils/period');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const auth = (id = ME) => `tma ${signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' }) }, TOKEN)}`;

function server(extra = {}) {
  const services = {
    localizationService: new LocalizationService(),
    userService: {
      getUserLanguage: async () => 'ru', getUserCurrency: async () => 'RUB', getUserTimezone: async () => 'Europe/Moscow', getUserPeriodStartDay: async () => 1
    },
    premiumService: { isPremiumUser: async () => false },
    formatter: new Formatter({ convert: async (amount, from) => (from === 'USD' ? amount * 90 : amount) }),
    currencyUtils: { convert: jest.fn(async (amount, from) => (from === 'USD' ? amount * 90 : amount)) },
    ...extra
  };
  const get = jest.fn((name) => services[name]);
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get }).app, services };
}

describe('mini app: tags', () => {
  const now = Date.now();
  const iso = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString();
  const rows = [
    { id: 3, user_id: ME, category_id: 1, amount: 20, currency: 'USD', description: 'ужин #отпуск', created_at_utc: iso(0), category_name: 'Еда', category_icon: '🍔' },
    { id: 2, user_id: ME, category_id: 9, amount: 5000, currency: 'RUB', description: 'отель #Отпуск #море', created_at_utc: iso(1), category_name: 'Другое', category_icon: '📦' },
    { id: 1, user_id: ME, category_id: 4, amount: 300, currency: 'RUB', description: 'краска #ремонт', created_at_utc: iso(70), category_name: 'Покупки', category_icon: '🛍' }
  ];
  const withRows = (list) => server({ expenseRepository: { getTaggedExpenses: jest.fn(async () => list) } });

  test('tags of the signed user only, summed in the main currency, biggest first; no tags at all — «any: false»', async () => {
    const { app, services } = withRows(rows);
    const res = await request(app).get('/api/tags').set('Authorization', auth()).expect(200);
    expect(services.expenseRepository.getTaggedExpenses).toHaveBeenCalledWith(ME);
    expect(res.body).toEqual({
      currency: 'RUB', period: null, any: true,
      tags: [{ tag: 'отпуск', total: 6800, count: 2 }, { tag: 'море', total: 5000, count: 1 }, { tag: 'ремонт', total: 300, count: 1 }]
    });
    const none = await request(withRows([]).app).get('/api/tags').set('Authorization', auth()).expect(200);
    expect(none.body).toMatchObject({ any: false, tags: [] });
  });

  test('a period keeps only its days (the user\'s month), a future or nonsense offset is refused', async () => {
    const { app } = withRows(rows);
    const res = await request(app).get('/api/tags?offset=0').set('Authorization', auth()).expect(200);
    const today = localToday('Europe/Moscow');
    expect(res.body.period.start <= today && res.body.period.last >= today).toBe(true);
    expect(res.body.tags.map(t => t.tag)).not.toContain('ремонт');
    expect(res.body.any).toBe(true);
    await request(app).get('/api/tags?offset=1').set('Authorization', auth()).expect(400, { error: 'bad_int' });
    await request(app).get('/api/tags?offset=x').set('Authorization', auth()).expect(400);
  });

  test('one tag: total, dates, categories by sum and every record in the common expense shape; unknown tag — 404', async () => {
    const { app } = withRows(rows);
    const res = await request(app).get(`/api/tags/${encodeURIComponent('#Отпуск')}`).set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({
      tag: 'отпуск', total: 6800, count: 2, first: addDays(res.body.last, -1),
      categories: [{ name: 'Другое', icon: '📦', total: 5000 }, { name: 'Еда', icon: '🍔', total: 1800 }]
    });
    expect(res.body.categories[1].label).toEqual(expect.any(String));
    expect(res.body.expenses).toHaveLength(2);
    expect(res.body.expenses[0]).toMatchObject({ id: 3, amount: 20, currency: 'USD', description: 'ужин #отпуск', category: { id: 1, name: 'Еда' }, author: null, mine: true });
    await request(app).get('/api/tags/nope').set('Authorization', auth()).expect(404, { error: 'tags_not_found' });
  });
});

describe('mini app: CSV export', () => {
  const expense = (id, categoryId, amount) => ({ id, user_id: ME, category_id: categoryId, amount: String(amount), currency: 'RUB', description: `покупка ${id}`, category: 'Еда', created_at_utc: '2026-11-03T09:00:00Z' });
  const categories = [{ id: 1, name: 'Еда', icon: '🍔' }, { id: 2, name: 'Транспорт', icon: '🚕' }, { id: 3, name: 'Дом', icon: '🏠' }];
  const period = { start: '2026-11-01', end: '2026-12-01', last: '2026-11-30' };
  function setup({ expenses = [expense(1, 1, 250), expense(2, 2, 600)], send = jest.fn(async () => ({})) } = {}) {
    const expenseService = {
      getPeriodContext: jest.fn(async (userId, kind, offset) => ({
        timezone: 'Europe/Moscow', today: '2026-11-08',
        period: kind === 'day' ? { start: '2026-11-08', end: '2026-11-09', last: '2026-11-08' } : offset === 0 ? period : { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' }
      })),
      getExpensesForExport: jest.fn(async (userId, timezone, p, categoryIds) => (categoryIds ? expenses.filter(e => categoryIds.includes(e.category_id)) : expenses)),
      getCategories: jest.fn(async () => categories)
    };
    const bot = { telegram: { sendDocument: send } };
    return { ...server({ expenseService, bot, rateLimiter: new RateLimiter() }), expenseService, bot };
  }
  const post = (app, body, id = ME) => request(app).post('/api/export').set('Authorization', auth(id)).send(body);

  test('the screen gets the bot\'s periods and the user\'s categories', async () => {
    const { app } = setup();
    const res = await request(app).get('/api/export').set('Authorization', auth()).expect(200);
    expect(res.body).toEqual({
      today: '2026-11-08',
      periods: {
        day: { start: '2026-11-08', last: '2026-11-08' }, week: { start: '2026-11-02', last: '2026-11-08' },
        cur: { start: '2026-11-01', last: '2026-11-30' }, prev: { start: '2026-10-01', last: '2026-10-31' }
      },
      categories: [{ id: 1, name: 'Еда', icon: '🍔' }, { id: 2, name: 'Транспорт', icon: '🚕' }, { id: 3, name: 'Дом', icon: '🏠' }]
    });
  });

  test('the file goes to the user\'s own chat with the bot — the same file name and caption as the bot\'s xp|cur', async () => {
    const { app, bot, services, expenseService } = setup();
    const res = await post(app, { kind: 'cur' }).expect(200);
    expect(res.body).toEqual({ sent: true, count: 2, filename: 'expenses_2026-11-01_2026-11-30.csv' });
    const [chatId, file, extra] = bot.telegram.sendDocument.mock.calls[0];
    expect(chatId).toBe(ME);
    expect(file.filename).toBe('expenses_2026-11-01_2026-11-30.csv');
    expect(file.source.toString('utf-8').charCodeAt(0)).toBe(0xFEFF);
    expect(file.source.toString('utf-8')).toContain('покупка 2');

    // Бот на той же кнопке шлёт тот же файл
    const handlers = new ExportHandlers({ expenseService, userService: services.userService, localizationService: services.localizationService, formatter: services.formatter, stateService: { getExportState: () => null } });
    const ctx = { from: { id: ME }, replyWithDocument: jest.fn(async () => ({})), reply: jest.fn() };
    await handlers.exportPeriod(ctx, 'cur');
    const [botFile, botExtra] = ctx.replyWithDocument.mock.calls[0];
    expect(botFile.filename).toBe(file.filename);
    expect(botFile.source.equals(file.source)).toBe(true);
    expect(botExtra.caption).toBe(extra.caption);
    expect(extra.caption).toContain('2');
  });

  test('own dates and category filter: the range is checked, only own categories count, all chosen — no filter', async () => {
    const { app, expenseService, bot } = setup();
    await post(app, { kind: 'range', start: '2026-11-05', end: '2026-11-01' }).expect(400, { error: 'export_dates_order' });
    await post(app, { kind: 'range', start: '2026-02-30', end: '2026-03-01' }).expect(400, { error: 'bad_date' });
    await post(app, { kind: 'week', categoryIds: [] }).expect(400, { error: 'export_no_categories' });
    await post(app, { kind: 'week', categoryIds: [77] }).expect(400, { error: 'export_no_categories' });
    await post(app, { kind: 'nope' }).expect(400, { error: 'export_kind' });
    expect(bot.telegram.sendDocument).not.toHaveBeenCalled();

    const one = await post(app, { kind: 'range', start: '2026-11-01', end: '2026-11-03', categoryIds: [2, 77] }).expect(200);
    expect(one.body).toMatchObject({ count: 1, filename: 'expenses_2026-11-01_2026-11-03.csv' });
    expect(expenseService.getExpensesForExport).toHaveBeenLastCalledWith(ME, 'Europe/Moscow', { start: '2026-11-01', end: '2026-11-04', last: '2026-11-03' }, [2]);
    expect(bot.telegram.sendDocument.mock.calls[0][2].caption).toContain('Транспорт');

    await post(app, { kind: 'all', categoryIds: [3, 2, 1] }).expect(200);
    expect(expenseService.getExpensesForExport).toHaveBeenLastCalledWith(ME, 'Europe/Moscow', null, null);
    expect(bot.telegram.sendDocument.mock.calls[1][1].filename).toBe('expenses_all.csv');
  });

  test('no expenses — a clear error and nothing sent; Telegram refused — 502', async () => {
    const empty = setup({ expenses: [] });
    await post(empty.app, { kind: 'day' }).expect(400, { error: 'export_empty' });
    expect(empty.bot.telegram.sendDocument).not.toHaveBeenCalled();
    const blocked = setup({ send: jest.fn(async () => { throw new Error('403: bot was blocked by the user'); }) });
    await post(blocked.app, { kind: 'prev' }).expect(502, { error: 'export_send_failed' });
  });

  test('the bot\'s export limit: 5 files in 5 minutes per user', async () => {
    const { app } = setup();
    for (let i = 0; i < 5; i++) await post(app, { kind: 'cur' }).expect(200);
    const res = await post(app, { kind: 'cur' }).expect(429);
    expect(res.body.error).toBe('export_rate');
    await post(app, { kind: 'cur' }, 5).expect(200);
  });
});

describe('extras strings', () => {
  test('every screen file has all 13 languages with the same keys and the screen\'s own prefix', () => {
    const fs = require('fs');
    const path = require('path');
    const { LANGS } = require('../miniapp/i18n');
    const dir = path.join(__dirname, '../miniapp/i18n/extras');
    const PREFIX = { tags: 'xtra_tags_', export: 'xtra_export_', achievements: 'xtra_ach_', import: 'xtra_import_', tax: 'xtra_tax_', assistant: 'xtra_ai_', quiz: 'xtra_quiz_' };
    for (const file of fs.readdirSync(dir)) {
      const part = file.replace(/\.js$/, '');
      const table = require(path.join(dir, file));
      const keys = Object.keys(table.ru).sort();
      for (const lang of LANGS) expect([part, lang, Object.keys(table[lang] || {}).sort()]).toEqual([part, lang, keys]);
      for (const key of keys) expect([part, key, key.startsWith(PREFIX[part]) || key.startsWith('error_')]).toEqual([part, key, true]);
      for (const lang of LANGS) for (const key of keys) expect([part, lang, key, typeof table[lang][key] === 'string' && table[lang][key].length > 0]).toEqual([part, lang, key, true]);
    }
  });
});
