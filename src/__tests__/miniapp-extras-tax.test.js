// Mini App «💡 Верни 13%»: только русский язык и рубли, годы — текущий и три прошлых, список и правка — премиум,
// правка вида пересчитывает итог тем же TaxRefundService, что в боте; чужая трата — 404.
jest.mock('../utils/logger', () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(), startup: jest.fn() }));
const request = require('supertest');
const { signInitData } = require('../miniapp/initData');
const MiniAppServer = require('../miniapp/MiniAppServer');
const LocalizationService = require('../services/LocalizationService');
const TaxRefundService = require('../services/TaxRefundService');
const Formatter = require('../utils/formatter');

const TOKEN = '123456:TEST-token';
const ME = 907470387;
const OTHER = 5;
const YEAR = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric' }).format(new Date()));

const auth = (id = ME) => `tma ${signInitData({
  auth_date: String(Math.floor(Date.now() / 1000) - 60), query_id: 'AAE', user: JSON.stringify({ id, first_name: 'Ilya' })
}, TOKEN)}`;

const expense = (id, userId, date, amount, description, category = 'Другое', currency = 'RUB') => ({
  id, user_id: userId, amount, currency, description, category_name: category, category_id: 1, category_icon: '📦',
  created_at_utc: new Date(`${date}T09:00:00Z`), local_date: date, family_id: null, recurring_expense_id: null, receipt_id: null, import_id: null
});

const EXPENSES = [
  expense(1, ME, `${YEAR}-02-10`, 30000, 'BIGBENSCHOOL'),
  expense(2, ME, `${YEAR}-03-01`, 1200, 'Аптека Ригла', 'Здоровье'),
  expense(3, ME, `${YEAR}-04-01`, 5000, 'бассейн'),
  expense(4, ME, `${YEAR}-05-01`, 9000, 'психолог'),
  expense(5, ME, `${YEAR}-06-01`, 700, 'пицца'),
  expense(6, ME, `${YEAR - 1}-12-30`, 4000, 'Стоматология'),
  expense(7, OTHER, `${YEAR}-03-03`, 8000, 'Клиника')
];

function server({ lang = 'ru', currency = 'RUB', premium = true } = {}) {
  const marks = {};
  const repository = {
    rows(userId, start, end) {
      return EXPENSES.filter(e => e.user_id === userId && e.currency === 'RUB' && e.local_date >= start && e.local_date < end)
        .sort((a, b) => b.created_at_utc - a.created_at_utc)
        .map(e => ({ ...e, mark: marks[`${userId}|${e.id}`] || null }));
    },
    async getExpenses(userId, timezone, start, end) { return this.rows(userId, start, end); },
    async getExpense(userId, expenseId, timezone, start, end) { return this.rows(userId, start, end).find(e => e.id === expenseId) || null; },
    setMark: jest.fn(async (userId, expenseId, kind) => { marks[`${userId}|${expenseId}`] = kind; }),
    deleteMark: jest.fn(async (userId, expenseId) => { delete marks[`${userId}|${expenseId}`]; })
  };
  const localizationService = new LocalizationService();
  const formatter = new Formatter({ async convert(amount) { return amount; } });
  const userService = {
    getUserLanguage: async () => lang, getUserCurrency: async () => currency, getUserTimezone: async () => 'Europe/Moscow',
    getUserPeriodStartDay: async () => 1
  };
  const premiumService = { isPremiumUser: async () => premium };
  const services = {
    localizationService,
    formatter,
    userService,
    premiumService,
    taxRefundService: new TaxRefundService({
      taxRefundRepository: repository, savingsRepository: { async getPots() { return []; } }, userService, premiumService,
      localizationService, formatter
    })
  };
  return { app: new MiniAppServer({ port: 0, botToken: TOKEN, get: (name) => services[name] }).app, repository, marks };
}

describe('mini app: tax refund', () => {
  test('only for Russian and rubles; years — the current one and three before', async () => {
    await request(server({ currency: 'USD' }).app).get('/api/tax').set('Authorization', auth()).expect(403, { error: 'tax_unavailable' });
    await request(server({ lang: 'en' }).app).get('/api/tax/how').set('Authorization', auth()).expect(403, { error: 'tax_unavailable' });

    const { app } = server();
    await request(app).get(`/api/tax?year=${YEAR - 4}`).set('Authorization', auth()).expect(400, { error: 'tax_year' });
    await request(app).get(`/api/tax?year=${YEAR + 1}`).set('Authorization', auth()).expect(400, { error: 'tax_year' });
    await request(app).get('/api/tax?year=abc').set('Authorization', auth()).expect(400, { error: 'tax_year' });

    const res = await request(app).get('/api/tax').set('Authorization', auth()).expect(200);
    expect(res.body).toMatchObject({
      year: YEAR, years: [YEAR - 3, YEAR - 2, YEAR - 1, YEAR], isPremium: true, count: 3, sum: 36200, refund: 4706, capped: false,
      kinds: [{ kind: 'medical', total: 1200, count: 1 }, { kind: 'education', total: 30000, count: 1 }, { kind: 'sport', total: 5000, count: 1 }]
    });
    const last = await request(app).get(`/api/tax?year=${YEAR - 1}`).set('Authorization', auth()).expect(200);
    expect(last.body).toMatchObject({ year: YEAR - 1, sum: 4000, interest: null });
  });

  test('«how to get it back» is the bot text split into steps without Telegram markup', async () => {
    const res = await request(server().app).get(`/api/tax/how?year=${YEAR - 1}`).set('Authorization', auth()).expect(200);
    expect(res.body.blocks.map(b => b.heading)).toEqual(['1. Возьми документы об оплате', '2. Подай заявление', '3. Жди деньги', null]);
    expect(res.body.blocks[1].lines[0]).toEqual({ text: expect.stringMatching(/^В приложении «Налоги ФЛ»/), item: false });
    expect(res.body.blocks[1].lines.filter(l => l.item)).toHaveLength(2);
    expect(res.body.blocks[3].lines.map(l => l.text).join(' ')).toContain(`до конца ${YEAR + 2} года`);
    expect(JSON.stringify(res.body)).not.toMatch(/[*_]/);
  });

  test('the list, search and edits are premium (402) — the yearly sum is for everyone', async () => {
    const { app, repository } = server({ premium: false });
    await request(app).get('/api/tax').set('Authorization', auth()).expect(200);
    await request(app).get('/api/tax/expenses').set('Authorization', auth()).expect(402);
    await request(app).get('/api/tax/search?q=псих').set('Authorization', auth()).expect(402);
    await request(app).put('/api/tax/expenses/4').set('Authorization', auth()).send({ kind: 'medical' }).expect(402);
    expect(repository.setMark).not.toHaveBeenCalled();
  });

  test('changing a kind recalculates the sum; «don\'t count» and undo; search finds what is not counted', async () => {
    const { app, marks } = server();
    const list = await request(app).get('/api/tax/expenses').set('Authorization', auth()).expect(200);
    expect(list.body).toMatchObject({ year: YEAR, counted: 3, excluded: 0, sum: 36200, refund: 4706 });
    expect(list.body.items[0]).toMatchObject({ kind: 'sport', auto: 'sport', mark: null, expense: { id: 3, amount: 5000, currency: 'RUB', date: `${YEAR}-04-01`, description: 'бассейн' } });

    // угаданную — не учитывать: остаётся в списке, итог меньше; вернуть — снять правку
    await request(app).put('/api/tax/expenses/1').set('Authorization', auth()).send({ year: YEAR, kind: 'none' }).expect(200);
    expect(marks[`${ME}|1`]).toBe('none');
    let after = await request(app).get('/api/tax/expenses').set('Authorization', auth()).expect(200);
    expect(after.body).toMatchObject({ counted: 2, excluded: 1, sum: 6200, refund: 806 });
    await request(app).put('/api/tax/expenses/1').set('Authorization', auth()).send({ year: YEAR, kind: null }).expect(200);
    expect(marks[`${ME}|1`]).toBeUndefined();

    // «психолог» не угадан: поиск по слову → лечение; сумма года растёт
    const found = await request(app).get('/api/tax/search?q=Психо').set('Authorization', auth()).expect(200);
    expect(found.body.items.map(i => i.expense.id)).toEqual([4]);
    const put = await request(app).put('/api/tax/expenses/4').set('Authorization', auth()).send({ year: YEAR, kind: 'medical' }).expect(200);
    expect(put.body).toMatchObject({ kind: 'medical', auto: null, mark: 'medical' });
    const summary = await request(app).get('/api/tax').set('Authorization', auth()).expect(200);
    expect(summary.body).toMatchObject({ sum: 45200, refund: 5876 });
    expect(summary.body.kinds.find(k => k.kind === 'medical')).toEqual({ kind: 'medical', total: 10200, count: 2 });
    // добавленную вручную «не учитывать» — просто снять отметку, из списка уходит
    await request(app).put('/api/tax/expenses/4').set('Authorization', auth()).send({ year: YEAR, kind: 'none' }).expect(200);
    expect(marks[`${ME}|4`]).toBeUndefined();

    await request(app).get('/api/tax/search?q=п').set('Authorization', auth()).expect(400, { error: 'tax_query_short' });
    await request(app).put('/api/tax/expenses/4').set('Authorization', auth()).send({ year: YEAR, kind: 'food' }).expect(400, { error: 'tax_kind' });
    await request(app).put('/api/tax/expenses/4').set('Authorization', auth()).send({ year: YEAR }).expect(400, { error: 'tax_kind' });
  });

  test('another user\'s expense, an expense of another year or unknown id — 404, nothing saved', async () => {
    const { app, repository } = server();
    await request(app).put('/api/tax/expenses/7').set('Authorization', auth()).send({ year: YEAR, kind: 'medical' }).expect(404, { error: 'tax_expense_gone' });
    await request(app).put('/api/tax/expenses/6').set('Authorization', auth()).send({ year: YEAR, kind: 'medical' }).expect(404);
    await request(app).put('/api/tax/expenses/999').set('Authorization', auth()).send({ year: YEAR, kind: 'medical' }).expect(404);
    await request(app).put('/api/tax/expenses/x').set('Authorization', auth()).send({ year: YEAR, kind: 'medical' }).expect(404);
    expect(repository.setMark).not.toHaveBeenCalled();
    expect(repository.deleteMark).not.toHaveBeenCalled();
    // чужая трата не видна и в поиске
    const found = await request(app).get('/api/tax/search?q=клиник').set('Authorization', auth()).expect(200);
    expect(found.body.items).toEqual([]);
  });
});
