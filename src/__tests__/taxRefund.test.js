const TaxRefundService = require('../services/TaxRefundService');
const AssistantService = require('../services/AssistantService');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { generateMoreMenu } = require('../utils/constants');
const { classifyExpense, estimateRefund, depositTax, depositExemption } = require('../utils/taxRefund');

const localization = new LocalizationService();
const formatter = new Formatter({ async convert(amount) { return amount; } });

describe('tax refund rules', () => {
  test('expense kind: description first, then category; word starts only', () => {
    const kind = (description, category_name = 'Другое') => classifyExpense({ description, category_name });
    expect(kind('BIGBENSCHOOL')).toBe('education');
    expect(kind('Курсы английского')).toBe('education');
    expect(kind('школьная форма', 'Покупки')).toBeNull();
    expect(kind('конкурс')).toBeNull();
    // аптека на Академическом проспекте — не учёба
    expect(kind('Лека 44 - Академический 5')).toBe('medical');
    expect(kind('Аптека Ригла', 'Еда')).toBe('medical');
    expect(kind('спрей для носа', 'Здоровье')).toBe('medical');
    expect(kind('DDX FITNESS', 'Развлечения')).toBe('sport');
    expect(kind('Сбербанк страхование жизни')).toBe('insurance');
    expect(kind('ДМС')).toBe('medical');
    // «Транспорт» содержит «спорт», но это не спорт
    expect(kind('ОСАГО', 'Транспорт')).toBeNull();
    expect(kind('абонемент', 'Мой спорт')).toBe('sport');
  });

  test('social deduction limit by year of spending: 120 000 ₽ up to 2023, 150 000 ₽ from 2024', () => {
    expect(estimateRefund({ medical: 42000 }, 2026)).toMatchObject({ sum: 42000, base: 42000, capped: false, refund: 5460 });
    expect(estimateRefund({ medical: 100000, education: 90000 }, 2024)).toMatchObject({ base: 150000, capped: true, refund: 19500, childEducation: 110000 });
    expect(estimateRefund({ medical: 130000 }, 2023)).toMatchObject({ base: 120000, capped: true, refund: 15600, childEducation: 50000 });
  });

  test('deposit interest tax: only above the exempt amount, 15% above 2.4 mln', () => {
    expect(depositExemption(2025)).toEqual({ amount: 210000 });
    expect(depositExemption(2026)).toEqual({ amount: 160000, provisional: true });
    expect(depositExemption(2030)).toBeNull();
    expect(depositTax(120000, 160000)).toBe(0);
    expect(depositTax(200000, 160000)).toBe(5200);
    // пример ФНС/«Клерк»: 3 220 000 ₽ процентов за 2026 год
    expect(depositTax(3220000, 160000)).toBe(411000);
  });
});

function makeTaxService({ expenses = [], marks = {}, pots = [], premium = true, candidates = [] } = {}) {
  const sent = new Set();
  const repository = {
    marks: { ...marks },
    rows(userId, start, end) {
      return expenses
        .filter(e => e.user_id === userId && e.currency === 'RUB' && e.local_date >= start && e.local_date < end)
        .map(({ id, amount, description, category_name, local_date }) => ({ id, amount, description, category_name, local_date, mark: this.marks[id] || null }));
    },
    async getExpenses(userId, timezone, start, end) { return this.rows(userId, start, end); },
    async getExpense(userId, expenseId, timezone, start, end) { return this.rows(userId, start, end).find(e => e.id === expenseId) || null; },
    async setMark(userId, expenseId, kind) { this.marks[expenseId] = kind; },
    async deleteMark(userId, expenseId) { delete this.marks[expenseId]; },
    async getReminderCandidates() { return candidates; }
  };
  const notificationService = { sendMessage: jest.fn(async () => ({})) };
  const userNotificationRepository = {
    isSent: jest.fn(async (userId, kind, refKey) => sent.has(`${userId}|${kind}|${refKey}`)),
    markSent: jest.fn(async (userId, kind, refKey) => {
      const key = `${userId}|${kind}|${refKey}`;
      if (sent.has(key)) return false;
      sent.add(key);
      return true;
    })
  };
  const service = new TaxRefundService({
    taxRefundRepository: repository,
    savingsRepository: { async getPots() { return pots; } },
    userService: {
      async getUserLanguage() { return 'ru'; },
      async getUserCurrency() { return 'RUB'; },
      async getUserTimezone() { return 'Europe/Moscow'; }
    },
    premiumService: { isPremiumUser: jest.fn(async () => premium) },
    userNotificationRepository,
    notificationService,
    localizationService: localization,
    formatter
  });
  return { service, repository, notificationService, userNotificationRepository };
}

const row = (id, local_date, amount, description, category_name = 'Другое', currency = 'RUB') => ({ id, user_id: 1, local_date, amount, description, category_name, currency });
const EXPENSES = [
  row(1, '2026-02-10', 30000, 'BIGBENSCHOOL'),
  row(2, '2026-03-01', 1200, 'Аптека Ригла', 'Здоровье'),
  row(3, '2026-03-05', 800, 'крем для рук', 'Здоровье'),
  row(4, '2026-04-01', 5000, 'бассейн'),
  row(5, '2026-05-01', 9000, 'психолог'),
  row(6, '2026-06-01', 50, 'pharmacy', 'Здоровье', 'USD'),
  row(7, '2025-12-30', 4000, 'Стоматология'),
  row(8, '2026-07-01', 700, 'пицца', 'Еда')
];
const CTX = { timezone: 'Europe/Moscow', currentYear: 2026 };

describe('TaxRefundService: summary and user corrections', () => {
  test('summary counts only RUB expenses of the calendar year, by kind', async () => {
    const { service } = makeTaxService({ expenses: EXPENSES });
    const summary = await service.summary(1, 2026, CTX);
    expect(summary.kinds).toEqual([
      { kind: 'medical', total: 2000, count: 2 },
      { kind: 'education', total: 30000, count: 1 },
      { kind: 'sport', total: 5000, count: 1 }
    ]);
    expect(summary).toMatchObject({ sum: 37000, refund: 4810, excluded: 0, interest: null });
  });

  test('toggle: a guessed expense is excluded and restored; a manually added one is removed', async () => {
    const { service, repository } = makeTaxService({ expenses: EXPENSES });
    expect(await service.toggle(1, 2026, 3, CTX)).toBe(true);
    expect(repository.marks[3]).toBe('none');
    let summary = await service.summary(1, 2026, CTX);
    expect(summary).toMatchObject({ sum: 36200, excluded: 1 });
    // убранная угаданная остаётся в списке — её можно вернуть
    const page = await service.listPage(1, 2026, 0, CTX);
    expect(page.items.map(i => [i.id, i.kind])).toContainEqual([3, null]);
    await service.toggle(1, 2026, 3, CTX);
    expect(repository.marks[3]).toBeUndefined();

    // «психолог» не угадан: добавляем вручную как лечение, повторное нажатие — убирает совсем
    expect((await service.search(1, 2026, 'Психо', CTX)).map(i => i.id)).toEqual([5]);
    expect(await service.addToKind(1, 2026, 5, 'medical', CTX)).toBe(true);
    summary = await service.summary(1, 2026, CTX);
    expect(summary.kinds.find(k => k.kind === 'medical')).toEqual({ kind: 'medical', total: 11000, count: 3 });
    await service.toggle(1, 2026, 5, CTX);
    expect(repository.marks[5]).toBeUndefined();
    expect((await service.listPage(1, 2026, 0, CTX)).items.map(i => i.id)).not.toContain(5);
  });

  test('toggle and add refuse expenses of another year, currency or unknown ids', async () => {
    const { service, repository } = makeTaxService({ expenses: EXPENSES });
    expect(await service.toggle(1, 2026, 7, CTX)).toBe(false);
    expect(await service.toggle(1, 2026, 6, CTX)).toBe(false);
    expect(await service.addToKind(1, 2026, 999, 'sport', CTX)).toBe(false);
    expect(repository.marks).toEqual({});
    expect(await service.search(1, 2026, 'п', CTX)).toBeNull();
  });

  test('deposit interest of the current year from RUB accounts with own rate above 1%', async () => {
    const pots = [
      { kind: 'general', currency: 'RUB', balance: '100000', yield_rate: null },
      { kind: 'account', currency: 'RUB', balance: '1000000', yield_rate: '18.00' },
      { kind: 'account', currency: 'RUB', balance: '50000', yield_rate: '0.01' },
      { kind: 'account', currency: 'USD', balance: '10000', yield_rate: '5.00' },
      { kind: 'goal', currency: 'RUB', balance: '500000', yield_rate: '20.00' }
    ];
    const { service } = makeTaxService({ expenses: EXPENSES, pots });
    const summary = await service.summary(1, 2026, CTX);
    expect(summary.interest).toEqual({ amount: 180000, exempt: 160000, provisional: true, tax: 2600, near: true });
    expect(service.summaryLines(summary).join('\n')).toContain('до 1 декабря 2027 года');
    // за прошлый год остатков на тот момент нет — проценты не считаем
    expect((await service.summary(1, 2025, CTX)).interest).toBeNull();
  });
});

describe('TaxRefundService.processDue: January reminder', () => {
  const candidate = { id: 1, language: 'ru', timezone: 'Europe/Moscow' };
  const lastYear = [row(11, '2026-03-01', 20000, 'Стоматология'), row(12, '2026-09-01', 15000, 'BIGBENSCHOOL')];

  test('January from the 10th, daytime local time, once a year, premium only', async () => {
    const { service, notificationService, userNotificationRepository } = makeTaxService({ expenses: lastYear, candidates: [candidate] });
    expect(await service.processDue(new Date('2027-01-09T10:00:00Z'))).toBe(0); // 9 января
    expect(await service.processDue(new Date('2027-01-12T06:00:00Z'))).toBe(0); // 9:00 по Москве
    expect(await service.processDue(new Date('2027-01-12T10:00:00Z'))).toBe(1);
    expect(await service.processDue(new Date('2027-01-12T11:00:00Z'))).toBe(0);
    expect(userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'tax_refund', '2026');
    const [, text, options] = notificationService.sendMessage.mock.calls[0];
    expect(text).toContain('2026');
    expect(text).toContain(formatter.formatAmount(4550, 'RUB'));
    expect(options.reply_markup.inline_keyboard[0].map(b => b.callback_data)).toEqual(['taxh|2026', 'tax|2026']);
    expect(await service.processDue(new Date('2027-02-12T10:00:00Z'))).toBe(0);
  });

  test('no premium — nothing sent and not marked; small refund — marked without a message', async () => {
    const free = makeTaxService({ expenses: lastYear, candidates: [candidate], premium: false });
    expect(await free.service.processDue(new Date('2027-01-12T10:00:00Z'))).toBe(0);
    expect(free.userNotificationRepository.markSent).not.toHaveBeenCalled();

    const small = makeTaxService({ expenses: [row(13, '2026-03-01', 1000, 'аптека')], candidates: [candidate] });
    expect(await small.service.processDue(new Date('2027-01-12T10:00:00Z'))).toBe(0);
    expect(small.userNotificationRepository.markSent).toHaveBeenCalledWith(1, 'tax_refund', '2026');
    expect(small.notificationService.sendMessage).not.toHaveBeenCalled();
  });
});

describe('«💡 Верни 13%» entry points', () => {
  test('More menu shows the button only when the section is available', () => {
    const callbacks = (options) => generateMoreMenu(localization, 'ru', false, options).flat().map(b => b.callback_data);
    expect(callbacks({ taxRefund: true })).toContain('tax');
    expect(callbacks()).not.toContain('tax');
  });

  function makeAssistant(currency, lang = 'ru') {
    const { service: taxRefundService } = makeTaxService({ expenses: EXPENSES });
    const assistantRepository = {
      countAnswered: async () => 0,
      countModelCalls: async () => 0,
      logQuestion: async () => 7
    };
    return new AssistantService({
      assistantRepository,
      provider: null,
      expenseService: {
        async getPeriodContext() { return { timezone: 'Europe/Moscow', currency, startDay: 1, today: '2026-10-31' }; },
        async getCategories() { return []; }
      },
      incomeService: {},
      savingsService: {},
      budgetService: {},
      premiumService: { async isPremiumUser() { return false; } },
      localizationService: localization,
      formatter,
      currencyUtils: { async convert(amount) { return amount; } },
      taxRefundService
    });
  }

  test('«Спроси бота» answers about the tax refund without the model, with a button to the section', async () => {
    const answer = await makeAssistant('RUB').answer(1, 'сколько я могу вернуть налога за прошлый год', { lang: 'ru' });
    expect(answer.status).toBe('answered');
    expect(answer.source).toBe('fast');
    expect(answer.text).toContain('2025');
    expect(answer.keyboard.flat().map(b => b.callback_data)).toContain('tax|2025');

    const current = await makeAssistant('RUB').answer(1, 'налоговый вычет', { lang: 'ru' });
    expect(current.text).toContain(formatter.formatAmount(4810, 'RUB'));
  });

  test('not roubles — the assistant says the section works only for roubles; not Russian — no tax answer', async () => {
    const usd = await makeAssistant('USD').answer(1, 'налоговый вычет', { lang: 'ru' });
    expect(usd.text).toBe(localization.getText('ru', 'tax_unavailable'));
    expect(usd.keyboard.flat().map(b => b.callback_data)).not.toContain('tax|2026');

    const english = await makeAssistant('RUB', 'en').answer(1, 'налоговый вычет', { lang: 'en' });
    expect(english.status).not.toBe('answered');
  });
});
