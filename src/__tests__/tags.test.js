const { extractTags, stripTags, normalizeTag } = require('../utils/tags');
const ExpenseService = require('../services/ExpenseService');
const TagHandlers = require('../handlers/TagHandlers');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');

describe('tags in descriptions', () => {
  test('a tag is # up to a space, case and edge punctuation ignored, no repeats', () => {
    expect(extractTags('5000 отель #Отпуск, ужин #отпуск #море!')).toEqual(['отпуск', 'море']);
    expect(extractTags('кофе')).toEqual([]);
    expect(extractTags(null)).toEqual([]);
  });

  test('a long tag still fits callback_data (tg|<tag> ≤ 64 bytes)', () => {
    for (const token of [`#${'отпуск'.repeat(10)}`, `#${'旅行'.repeat(20)}`, `#${'🏖'.repeat(30)}`]) {
      expect(Buffer.byteLength(`tg|${normalizeTag(token)}`)).toBeLessThanOrEqual(64);
    }
  });

  test('the remembered category ignores tags: «кофе #отпуск» goes where «кофе» went; a tag alone remembers nothing', async () => {
    const repository = { getLastCategoryIdForDescription: jest.fn(async () => 1) };
    const service = new ExpenseService(repository, {}, {}, {}, {});
    expect(await service.getRememberedCategory(7, 'Кофе #отпуск', [{ id: 1, name: 'Еда' }])).toEqual({ id: 1, name: 'Еда' });
    expect(repository.getLastCategoryIdForDescription).toHaveBeenCalledWith(7, 'Кофе');
    expect(await service.getRememberedCategory(7, '#отпуск', [{ id: 1 }])).toBeNull();
    expect(stripTags('ужин #море #отпуск')).toBe('ужин');
  });
});

describe('«🏷 Теги» screen', () => {
  const rows = [
    { id: 3, amount: 20, currency: 'USD', description: 'ужин #отпуск', created_at_utc: '2026-08-14T18:00:00Z', category_name: 'Еда', category_icon: '🍔' },
    { id: 2, amount: 5000, currency: 'RUB', description: 'отель #отпуск', created_at_utc: '2026-08-10T10:00:00Z', category_name: 'Другое', category_icon: '📦' },
    { id: 1, amount: 300, currency: 'RUB', description: 'краска #ремонт', created_at_utc: '2026-07-01T10:00:00Z', category_name: 'Покупки', category_icon: '🛍' }
  ];
  const handlers = () => new TagHandlers({
    expenseRepository: { getTaggedExpenses: jest.fn(async () => rows) },
    userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'Europe/Moscow', getUserCurrency: async () => 'RUB' },
    localizationService: new LocalizationService(),
    formatter: new Formatter(),
    currencyUtils: { convert: jest.fn(async (amount, from) => (from === 'USD' ? amount * 90 : amount)) }
  });
  const ctx = (data) => ({ from: { id: 7 }, match: data ? [null, data] : undefined, reply: jest.fn(async () => ({})) });

  test('tags are summed in the main currency, biggest first, each with its button', async () => {
    const c = ctx();
    await handlers().show(c);
    const [text, extra] = c.reply.mock.calls[0];
    expect(text.indexOf('#отпуск')).toBeLessThan(text.indexOf('#ремонт'));
    expect(text.replace(/\u00a0|\u202f/g, ' ')).toContain('#отпуск — *6 800 ₽* · записей: 2');
    expect(extra.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['tg|отпуск', 'tg|ремонт']);
  });

  test('one tag: total, date range, categories and latest records', async () => {
    const c = ctx('отпуск');
    await handlers().showTag(c);
    const text = c.reply.mock.calls[0][0].replace(/\u00a0|\u202f/g, ' ');
    expect(text).toContain('Всего: *6 800 ₽* · записей: 2 · 10.08.2026 – 14.08.2026');
    expect(text.indexOf('Другое')).toBeLessThan(text.indexOf('Еда'));
    expect(text).toContain('ужин #отпуск');
  });
});
