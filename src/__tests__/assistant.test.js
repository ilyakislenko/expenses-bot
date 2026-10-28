const { normalizeIntent, normalizePeriod } = require('../services/assistant/intent');
const { resolvePeriod, comparisonPeriods, previousPeriod, elapsedDays, weekStart } = require('../services/assistant/periods');
const { parseFastPath } = require('../services/assistant/fastPath');
const { stem, searchStem, matchCategory } = require('../services/assistant/text');
const { buildMessages } = require('../services/assistant/prompt');
const { AnswerComposer } = require('../services/assistant/compose');
const { createAssistantProvider } = require('../services/assistant/model');
const { parseSlots, createChain, limiterFor } = require('../services/receipt/chain');
const { OpenAiCompatibleProvider, GeminiProvider } = require('../services/receipt/providers');
const AssistantService = require('../services/AssistantService');
const AssistantHandlers = require('../handlers/AssistantHandlers');
const AssistantRepository = require('../repositories/AssistantRepository');
const EnhancedValidator = require('../utils/enhancedValidator');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { USER_LIMITS } = require('../utils/constants');

const TODAY = '2026-10-28'; // среда
const CATEGORIES = [
  ['Еда', '🍔'], ['Транспорт', '🚕'], ['Развлечения', '🎬'], ['Покупки', '🛍'], ['Здоровье', '💊'], ['Другое', '📦']
].map(([name, icon], i) => ({ id: i + 1, name, icon, label: name }));
const EN_CATEGORIES = CATEGORIES.map(c => ({ ...c, label: { Еда: 'Food', Транспорт: 'Transport', Развлечения: 'Entertainment', Покупки: 'Shopping', Здоровье: 'Health', Другое: 'Other' }[c.name] }));
const context = { categories: CATEGORIES, today: TODAY, startDay: 1 };
const check = (raw, ctx = context) => normalizeIntent(raw, ctx);

describe('assistant intent validation', () => {
  test('accepts only whitelisted types; aliases map to them; garbage is unknown', () => {
    expect(check({ type: 'spend_total' }).ok).toBe(true);
    expect(check({ type: 'Largest' }).intent.type).toBe('largest_purchase');
    expect(check({ type: 'by-category' }).intent.type).toBe('spend_by_category');
    expect(check({ type: 'drop_table' })).toEqual({ ok: false, reason: 'unknown' });
    expect(check({ type: 'unknown' })).toEqual({ ok: false, reason: 'unknown' });
    expect(check(null).ok).toBe(false);
    expect(check('spend_total').ok).toBe(false);
    expect(check([{ type: 'spend_total' }]).ok).toBe(false);
  });

  test('default period is the current user period; savings and budgets have none', () => {
    expect(check({ type: 'spend_total' }).intent.period).toEqual({ kind: 'month', offset: 0 });
    expect(check({ type: 'spend_total', period: 'nonsense' }).intent.period).toEqual({ kind: 'month', offset: 0 });
    expect(check({ type: 'savings_status', period: { kind: 'day', offset: -1 } }).intent.period).toBeNull();
    expect(check({ type: 'budget_status' }).intent.period).toBeNull();
  });

  test('clamps offsets and day counts; future periods are refused', () => {
    expect(normalizePeriod({ kind: 'month', offset: -500 }, TODAY)).toEqual({ spec: { kind: 'month', offset: -120 } });
    expect(normalizePeriod({ kind: 'day', offset: '-1' }, TODAY)).toEqual({ spec: { kind: 'day', offset: -1 } });
    expect(normalizePeriod({ kind: 'week', offset: 1 }, TODAY)).toEqual({ error: 'future' });
    expect(normalizePeriod({ kind: 'last_n_days', n: 100000 }, TODAY)).toEqual({ spec: { kind: 'last_n_days', n: 3650 } });
    expect(normalizePeriod({ kind: 'last_n_days', n: 0 }, TODAY)).toEqual({ error: 'invalid' });
    expect(normalizePeriod({ kind: 'month', offset: 'x' }, TODAY)).toEqual({ error: 'invalid' });
    expect(check({ type: 'spend_total', period: { kind: 'year', offset: 2 } })).toEqual({ ok: false, reason: 'future' });
    expect(normalizePeriod('yesterday', TODAY)).toEqual({ spec: { kind: 'day', offset: -1 } });
    expect(normalizePeriod({ kind: 'today' }, TODAY)).toEqual({ spec: { kind: 'day', offset: 0 } });
  });

  test('named months without a year are the latest such month; future months are refused', () => {
    expect(normalizePeriod({ kind: 'named_month', month: 9 }, TODAY).spec).toEqual({ kind: 'named_month', month: 9, year: 2026 });
    expect(normalizePeriod({ kind: 'named_month', month: 12, year: null }, TODAY).spec).toEqual({ kind: 'named_month', month: 12, year: 2025 });
    expect(normalizePeriod({ kind: 'named_month', month: 'сентября' }, TODAY).spec.month).toBe(9);
    expect(normalizePeriod({ kind: 'named_month', month: 'May' }, TODAY).spec.month).toBe(5);
    expect(normalizePeriod({ kind: 'named_month', month: 'марта' }, TODAY).spec.month).toBe(3);
    expect(normalizePeriod({ kind: 'named_month', month: 12, year: 2026 }, TODAY)).toEqual({ error: 'future' });
    expect(normalizePeriod({ kind: 'named_month', month: 13 }, TODAY)).toEqual({ error: 'invalid' });
  });

  test('custom dates: several formats, swapped ends, end capped at today, start in the future refused', () => {
    expect(normalizePeriod({ kind: 'custom', from: '2026-10-15', to: '2026-10-01' }, TODAY).spec).toEqual({ kind: 'custom', from: '2026-10-01', to: '2026-10-15' });
    expect(normalizePeriod({ kind: 'custom', from: '01.10.2026', to: '15.10' }, TODAY).spec).toEqual({ kind: 'custom', from: '2026-10-01', to: '2026-10-15' });
    expect(normalizePeriod({ kind: 'custom', from: '2026-10-20', to: '2026-12-31' }, TODAY).spec.to).toBe(TODAY);
    expect(normalizePeriod({ kind: 'custom', from: '2026-11-01', to: '2026-11-05' }, TODAY)).toEqual({ error: 'future' });
    expect(normalizePeriod({ kind: 'custom', from: '2026-02-30' }, TODAY)).toEqual({ error: 'invalid' });
    expect(normalizePeriod({ kind: 'custom', from: '2026-10-05' }, TODAY).spec).toEqual({ kind: 'custom', from: '2026-10-05', to: '2026-10-05' });
  });

  test('categories map to the user\'s own; unknown names become description search; generic words are dropped', () => {
    const intent = check({ type: 'spend_total', categories: ['еду', 'Такси', 'Uber'], text_filter: 'расходы' }).intent;
    expect(intent.categories.map(c => c.name)).toEqual(['Еда']);
    expect(intent.terms).toEqual(['такси', 'uber']);
    expect(check({ type: 'spend_total', text_filter: 'Транспорт' }).intent.categories.map(c => c.name)).toEqual(['Транспорт']);
    expect(check({ type: 'spend_total', categories: ['food'] }).intent.categories.map(c => c.name)).toEqual(['Еда']);
    expect(check({ type: 'spend_total', text_filter: '%_\'; DROP TABLE expenses; --' }).intent.terms).toEqual(['drop table expenses']);
    expect(check({ type: 'spend_total', text_filter: 'x'.repeat(100) }).intent.terms[0]).toHaveLength(40);
    expect(check({ type: 'spend_total', text_filter: ['a', 'b', 'c', 'd'] }).intent.terms).toHaveLength(3);
    // фильтры не нужны доходам, накоплениям, бюджетам
    expect(check({ type: 'income_total', categories: ['Еда'], text_filter: 'кофе' }).intent).toMatchObject({ categories: [], terms: [] });
  });

  test('a category next to a description search is kept only when the question names it', () => {
    const raw = { type: 'count_records', categories: ['Еда'], text_filter: 'кофе' };
    expect(check(raw, { ...context, question: 'сколько раз я покупал кофе' }).intent).toMatchObject({ categories: [], terms: ['кофе'] });
    expect(check(raw, { ...context, question: 'сколько кофе в категории еда' }).intent.categories.map(c => c.name)).toEqual(['Еда']);
    // без поиска по описанию категория по смыслу остаётся: «лекарства» → «Здоровье»
    expect(check({ type: 'spend_total', categories: ['Здоровье'] }, { ...context, question: 'сколько ушло на лекарства' }).intent.categories.map(c => c.name)).toEqual(['Здоровье']);
  });

  test('top limit is clamped to 1..10, largest is always 1, currency only from the supported list', () => {
    expect(check({ type: 'top_expenses' }).intent.limit).toBe(5);
    expect(check({ type: 'top_expenses', limit: 50 }).intent.limit).toBe(10);
    expect(check({ type: 'top_expenses', limit: -3 }).intent.limit).toBe(5);
    expect(check({ type: 'largest_purchase', limit: 7 }).intent.limit).toBe(1);
    expect(check({ type: 'spend_total', limit: 7 }).intent.limit).toBeNull();
    expect(check({ type: 'spend_total', currency: 'usd' }).intent.currency).toBe('USD');
    expect(check({ type: 'spend_total', currency: 'BTC' }).intent.currency).toBeNull();
  });

  test('compare_to is kept only for comparisons', () => {
    const intent = check({ type: 'compare_periods', period: { kind: 'named_month', month: 9 }, compare_to: { kind: 'named_month', month: 8 } }).intent;
    expect(intent.compareTo).toEqual({ kind: 'named_month', month: 8, year: 2026 });
    expect(check({ type: 'spend_total', compare_to: { kind: 'month', offset: -1 } }).intent.compareTo).toBeNull();
  });
});

describe('assistant periods', () => {
  test('relative and named periods', () => {
    expect(resolvePeriod({ kind: 'day', offset: 0 }, { today: TODAY })).toEqual({ start: '2026-10-28', end: '2026-10-29', last: '2026-10-28' });
    expect(resolvePeriod({ kind: 'day', offset: -1 }, { today: TODAY }).start).toBe('2026-10-27');
    expect(weekStart(TODAY)).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // воскресенье — та же неделя
    expect(resolvePeriod({ kind: 'week', offset: -1 }, { today: TODAY })).toEqual({ start: '2026-10-19', end: '2026-10-26', last: '2026-10-25' });
    // «за неделю» — последние 7 дней включая сегодня
    expect(resolvePeriod({ kind: 'last_n_days', n: 7 }, { today: TODAY })).toEqual({ start: '2026-10-22', end: '2026-10-29', last: TODAY });
    // «в сентябре» — календарный месяц
    expect(resolvePeriod({ kind: 'named_month', month: 9, year: 2026 }, { today: TODAY })).toEqual({ start: '2026-09-01', end: '2026-10-01', last: '2026-09-30' });
    expect(resolvePeriod({ kind: 'named_month', month: 2, year: 2028 }, { today: TODAY }).last).toBe('2028-02-29');
    // «с 1 по 15 октября»
    expect(resolvePeriod({ kind: 'custom', from: '2026-10-01', to: '2026-10-15' }, { today: TODAY })).toEqual({ start: '2026-10-01', end: '2026-10-16', last: '2026-10-15' });
    expect(resolvePeriod({ kind: 'year', offset: -1 }, { today: TODAY })).toEqual({ start: '2025-01-01', end: '2026-01-01', last: '2025-12-31' });
    expect(resolvePeriod({ kind: 'all' }, { today: TODAY }).end).toBe('2026-10-29');
  });

  test('«в прошлом месяце» follows the user period start day like the overview', () => {
    expect(resolvePeriod({ kind: 'month', offset: -1 }, { today: TODAY, startDay: 1 })).toEqual({ start: '2026-09-01', end: '2026-10-01', last: '2026-09-30' });
    expect(resolvePeriod({ kind: 'month', offset: 0 }, { today: TODAY, startDay: 10 })).toEqual({ start: '2026-10-10', end: '2026-11-10', last: '2026-11-09' });
    expect(resolvePeriod({ kind: 'month', offset: -1 }, { today: TODAY, startDay: 10 })).toEqual({ start: '2026-09-10', end: '2026-10-10', last: '2026-10-09' });
    // до числа начала периода текущий период начался в прошлом месяце
    expect(resolvePeriod({ kind: 'month', offset: 0 }, { today: '2026-10-05', startDay: 10 }).start).toBe('2026-09-10');
    expect(resolvePeriod({ kind: 'month', offset: 0 }, { today: '2026-03-01', startDay: 31 })).toEqual({ start: '2026-02-28', end: '2026-03-31', last: '2026-03-30' });
  });

  test('comparisons: an unfinished period against the same number of days of the previous one', () => {
    const now = { today: TODAY, startDay: 1 };
    expect(comparisonPeriods({ kind: 'month', offset: 0 }, null, now)).toEqual({
      current: { start: '2026-10-01', end: '2026-10-29', last: TODAY },
      previous: { start: '2026-09-01', end: '2026-09-29', last: '2026-09-28' },
      toDate: true,
      days: 28
    });
    // в коротком прошлом месяце берётся весь месяц
    expect(comparisonPeriods({ kind: 'month', offset: 0 }, null, { today: '2026-03-31', startDay: 1 }).previous).toEqual({ start: '2026-02-01', end: '2026-03-01', last: '2026-02-28' });
    const finished = comparisonPeriods({ kind: 'named_month', month: 9, year: 2026 }, null, now);
    expect(finished).toMatchObject({ toDate: false, previous: { start: '2026-08-01', last: '2026-08-31' } });
    const explicit = comparisonPeriods({ kind: 'named_month', month: 9, year: 2026 }, { kind: 'named_month', month: 7, year: 2026 }, now);
    expect(explicit.previous).toEqual({ start: '2026-07-01', end: '2026-08-01', last: '2026-07-31' });
    // «в августе или в сентябре» — сравниваем более поздний с более ранним в любом порядке
    const reversed = comparisonPeriods({ kind: 'named_month', month: 8, year: 2026 }, { kind: 'named_month', month: 9, year: 2026 }, now);
    expect([reversed.current.start, reversed.previous.start]).toEqual(['2026-09-01', '2026-08-01']);
    expect(previousPeriod({ kind: 'custom' }, { start: '2026-10-01', end: '2026-10-16', last: '2026-10-15' }, now)).toEqual({ start: '2026-09-16', end: '2026-10-01', last: '2026-09-30' });
    expect(comparisonPeriods({ kind: 'all' }, null, now)).toBeNull();
  });

  test('average uses days elapsed so far, not the whole period', () => {
    expect(elapsedDays({ start: '2026-10-01', last: '2026-10-31' }, TODAY)).toBe(28);
    expect(elapsedDays({ start: '2026-09-01', last: '2026-09-30' }, TODAY)).toBe(30);
    expect(elapsedDays({ start: TODAY, last: TODAY }, TODAY)).toBe(1);
  });
});

describe('assistant fast path', () => {
  const parse = (q) => {
    const fast = parseFastPath(q, { today: TODAY });
    if (!fast) return null;
    const checked = check(fast.intent);
    return { confident: fast.confident, unresolvedTime: fast.unresolvedTime, ...checked.intent, categories: checked.intent.categories.map(c => c.name) };
  };

  test.each([
    ['? сколько я потратил на такси в сентябре', { type: 'spend_total', period: { kind: 'named_month', month: 9, year: 2026 }, terms: ['такси'] }],
    ['Сколько я потратил в этом месяце?', { type: 'spend_total', period: { kind: 'month', offset: 0 } }],
    ['сколько потратила в прошлом месяце', { type: 'spend_total', period: { kind: 'month', offset: -1 } }],
    ['На что ушло больше всего в прошлом месяце?', { type: 'spend_by_category', period: { kind: 'month', offset: -1 } }],
    ['Сколько я потратил на еду за неделю?', { type: 'spend_total', period: { kind: 'last_n_days', n: 7 }, categories: ['Еда'] }],
    ['сколько ушло на транспорт на прошлой неделе', { type: 'spend_total', period: { kind: 'week', offset: -1 }, categories: ['Транспорт'] }],
    ['сколько я потратил с 1 по 15 октября', { type: 'spend_total', period: { kind: 'custom', from: '2026-10-01', to: '2026-10-15' } }],
    ['траты с 01.09 по 10.09', { type: 'spend_total', period: { kind: 'custom', from: '2026-09-01', to: '2026-09-10' } }],
    ['Самая крупная покупка в этом году?', { type: 'largest_purchase', period: { kind: 'year', offset: 0 }, limit: 1 }],
    ['топ 3 трат за месяц', { type: 'top_expenses', period: { kind: 'month', offset: 0 }, limit: 3 }],
    ['Сравни этот месяц с прошлым', { type: 'compare_periods', period: { kind: 'month', offset: 0 } }],
    ['Сколько я трачу в среднем в день?', { type: 'average_daily', period: { kind: 'month', offset: 0 } }],
    ['сколько я заработал в прошлом месяце', { type: 'income_total', period: { kind: 'month', offset: -1 } }],
    ['сколько у меня накоплений', { type: 'savings_status', period: null }],
    ['мои траты вчера', { type: 'spend_total', period: { kind: 'day', offset: -1 } }],
    ['сколько я потратил в декабре', { type: 'spend_total', period: { kind: 'named_month', month: 12, year: 2025 } }],
    ['how much did I spend on coffee last week', { type: 'spend_total', period: { kind: 'week', offset: -1 }, terms: ['coffee'] }],
    ['How much did I spend on food in the past week?', { type: 'spend_total', period: { kind: 'last_n_days', n: 7 }, categories: ['Еда'] }],
    ['what did I spend the most on last month', { type: 'spend_by_category', period: { kind: 'month', offset: -1 } }],
    ['top 3 expenses this year', { type: 'top_expenses', period: { kind: 'year', offset: 0 }, limit: 3 }],
    ['biggest purchase in september', { type: 'largest_purchase', period: { kind: 'named_month', month: 9, year: 2026 } }],
    ['how much did I spend in the last 30 days', { type: 'spend_total', period: { kind: 'last_n_days', n: 30 } }],
    ['how much do I spend per day on average this month', { type: 'average_daily', period: { kind: 'month', offset: 0 } }],
    ['how much did I spend on taxi since October 1', { type: 'spend_total', period: { kind: 'custom', from: '2026-10-01', to: TODAY }, terms: ['taxi'] }],
    ['сколько я потратил с 1 сентября', { type: 'spend_total', period: { kind: 'custom', from: '2026-09-01', to: TODAY } }],
    ['траты на кофе с начала августа', { type: 'spend_total', period: { kind: 'custom', from: '2026-08-01', to: TODAY }, terms: ['кофе'] }]
  ])('%s', (question, expected) => {
    const parsed = parse(question);
    expect(parsed).toMatchObject({ confident: true, categories: [], terms: [], ...expected });
  });

  test('unclear leftovers are not confident: the model decides (no fallback guess)', () => {
    expect(parse('сколько раз я ходил в кафе в октябре')).toMatchObject({ confident: true, type: 'count_records', terms: ['кафе'] });
    expect(parse('какой у меня остаток')).toMatchObject({ confident: true, type: 'balance' });
    expect(parse('сколько я потратил на подарки маме и папе на новый год')).toMatchObject({ confident: false, unresolvedTime: true });
    expect(parseFastPath('как дела', { today: TODAY })).toBeNull();
    expect(parse('сколько я отдал за подарки на день рождения маме')).toMatchObject({ confident: false });
    expect(parse('сколько я потратил в октябре ну типа')).toMatchObject({ confident: true, period: { kind: 'named_month', month: 10 } });
    expect(parseFastPath('', { today: TODAY })).toBeNull();
  });

  test('«с августом» in a comparison is the second period, not «since August»', () => {
    expect(parse('сравни сентябрь с августом')).toMatchObject({
      confident: true, period: { kind: 'named_month', month: 9 }, compareTo: { kind: 'named_month', month: 8 }
    });
  });
});

describe('assistant text helpers', () => {
  test('stems cover common Russian and English inflections', () => {
    expect(stem('еду')).toBe(stem('еда'));
    expect(stem('продуктов')).toBe(stem('продукты'));
    expect(stem('такси')).toBe('такс');
    expect(stem('coffees')).toBe('coffee');
    expect(searchStem('еду')).toBe('еду'); // основа короче 3 букв ловила бы «обед», «среда»
    expect(searchStem('Яндекс Такси')).toBe('яндекс такс');
  });

  test('own category names win over system synonyms', () => {
    const withCustom = [...CATEGORIES, { id: 99, name: 'Продукты', icon: '🥕', label: 'Продукты' }];
    expect(matchCategory('продукты', withCustom).id).toBe(99);
    expect(matchCategory('продукты', CATEGORIES).name).toBe('Еда');
    expect(matchCategory('Food', EN_CATEGORIES).name).toBe('Еда');
    expect(matchCategory('такси', CATEGORIES)).toBeNull();
  });

  test('LIKE patterns escape % and _ from user text', () => {
    expect(AssistantRepository.likePattern('100%_off')).toBe('%100\\%\\_off%');
  });
});

describe('assistant prompt', () => {
  test('static instructions and examples first, the user context and question last', () => {
    const messages = buildMessages({ question: 'сколько на кофе', today: TODAY, startDay: 10, categories: ['Еда', 'Кофейни'] });
    expect(messages[0].role).toBe('system');
    const last = messages[messages.length - 1];
    expect(last).toEqual({ role: 'user', content: 'Today: 2026-10-28 (Wednesday). Month starts on day 10.\nCategories: Еда, Кофейни\nQuestion: сколько на кофе' });
    // примеры — валидный JSON по той же схеме
    for (const message of messages.filter(m => m.role === 'assistant')) {
      const parsed = JSON.parse(message.content);
      if (parsed.type !== 'unknown') expect(check(parsed, { ...context, categories: EN_CATEGORIES }).ok).toBe(true);
    }
    const again = buildMessages({ question: 'x', today: '2027-01-01', startDay: 1, categories: [] });
    expect(again.slice(0, -1)).toEqual(messages.slice(0, -1));
  });
});

// ---------- Ответ по шаблонам ----------

const localization = new LocalizationService();
const formatter = new Formatter({ convert: async (amount) => amount });
const sp = (text) => text.replace(/[\u00a0\u202f]/g, ' ');
const markdownBalanced = (text) => {
  const plain = text.replace(/`[^`]*`/g, '').replace(/\\[_*`[]/g, '');
  return (plain.match(/\*/g) || []).length % 2 === 0 && (plain.match(/_/g) || []).length % 2 === 0;
};

describe('assistant answer composition', () => {
  const composer = (lang = 'ru') => new AnswerComposer({ localizationService: localization, formatter, lang });
  const intent = (fields) => check(fields).intent;

  test('spend total with filters, period label and a button to the category of that period', () => {
    const result = {
      intent: intent({ type: 'spend_total', period: { kind: 'month', offset: -1 }, categories: ['Транспорт'] }),
      currency: 'RUB', period: { start: '2026-09-01', end: '2026-10-01', last: '2026-09-30' }, total: 3450.5, count: 12
    };
    const { text: raw, keyboard } = composer().compose(result);
    const text = sp(raw);
    expect(text).toContain('01.09 – 30.09.2026');
    expect(text).toContain('🚕 Транспорт');
    expect(text).toContain('3 450,5 ₽');
    expect(text).toContain('записей: 12');
    expect(markdownBalanced(text)).toBe(true);
    expect(keyboard[0][0].callback_data).toBe('oc|2|-1|0');
    expect(keyboard[keyboard.length - 1][0].callback_data).toBe('ai');
  });

  test('description search, empty result and day button', () => {
    const result = {
      intent: intent({ type: 'spend_total', period: { kind: 'day', offset: 0 }, text_filter: 'кофе_*' }),
      currency: 'RUB', period: { start: TODAY, end: '2026-10-29', last: TODAY }, total: 0, count: 0
    };
    const { text, keyboard } = composer().compose(result);
    expect(text).toContain('сегодня, 28.10.2026');
    expect(text).toContain('Таких трат');
    expect(markdownBalanced(text)).toBe(true);
    expect(keyboard[0][0].callback_data).toBe('dy|0|0');
  });

  test('top list escapes user descriptions; categories show shares', () => {
    const top = composer().compose({
      intent: intent({ type: 'top_expenses', period: { kind: 'year', offset: 0 }, limit: 2 }),
      currency: 'RUB', period: { start: '2026-01-01', end: '2027-01-01', last: '2026-12-31' },
      items: [
        { amount: 100, currency: 'USD', description: 'ноут_бук *pro*', local_date: '2026-03-05', category_name: 'Покупки' },
        { amount: 5000, currency: 'RUB', description: null, local_date: '2026-04-01', category_name: 'Еда' }
      ]
    });
    expect(sp(top.text)).toContain('1. *100 $* — ноут\\_бук \\*pro\\* · 05.03');
    expect(sp(top.text)).toContain('2. *5 000 ₽* — Еда · 01.04');
    expect(markdownBalanced(top.text)).toBe(true);

    const breakdown = composer('en').compose({
      intent: intent({ type: 'spend_by_category', period: { kind: 'month', offset: 0 } }),
      currency: 'RUB', period: { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' }, total: 1000, count: 3,
      categories: [{ name: 'Еда', icon: '🍔', total: 750 }, { name: 'Транспорт', icon: '🚕', total: 250 }]
    });
    expect(sp(breakdown.text)).toContain('🍔 Food — 750 ₽ (75%)');
    expect(sp(breakdown.text)).toContain('🚕 Transport — 250 ₽ (25%)');
    expect(breakdown.keyboard[0][0].callback_data).toBe('ov|0');
  });

  test('comparison: more, less, same-days note', () => {
    const base = {
      intent: intent({ type: 'compare_periods', period: { kind: 'month', offset: 0 } }), currency: 'RUB',
      period: { start: '2026-10-01', end: '2026-10-29', last: TODAY },
      current: { period: { start: '2026-10-01', end: '2026-10-29', last: TODAY }, total: 12000 },
      previous: { period: { start: '2026-09-01', end: '2026-09-29', last: '2026-09-28' }, total: 10000 },
      toDate: true, days: 28
    };
    const more = sp(composer().compose(base).text);
    expect(more).toContain('Больше на 2 000 ₽ (+20%)');
    expect(more).toContain('_Сравниваю одинаковое число дней: 28_');
    const less = sp(composer().compose({ ...base, current: { ...base.current, total: 7500 } }).text);
    expect(less).toContain('Меньше на 2 500 ₽ (−25%)');
    const none = composer().compose({ ...base, previous: { ...base.previous, total: 0 } }).text;
    expect(none).toContain('В прошлом периоде трат не было');
  });

  test('balance, savings and budgets', () => {
    const period = { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' };
    const balance = composer().compose({
      intent: intent({ type: 'balance', period: { kind: 'month', offset: 0 } }), currency: 'RUB', period,
      income: 100000, expenses: 120000, balance: -20000, incomeCount: 1, expenseCount: 30
    });
    expect(sp(balance.text)).toContain('Остаток: *-20 000 ₽*');
    expect(balance.text).toContain('Расходы больше доходов');
    expect(balance.keyboard[0][0].callback_data).toBe('ov|0');

    const savings = composer().compose({
      intent: intent({ type: 'savings_status' }), currency: 'RUB',
      total: 500000, debtTotal: 100000, netWorth: 400000, goals: [{ name: 'Машина_2', current: 500000, target: 1000000, ratio: 0.5 }], empty: false
    });
    expect(savings.text).toContain('🎯 Машина\\_2 — 50%');
    expect(sp(savings.text)).toContain('капитал 400 000 ₽');
    expect(savings.keyboard[0][0].callback_data).toBe('sv');

    const locked = composer().compose({ intent: intent({ type: 'budget_status' }), currency: 'RUB', period, locked: true, spent: 1234 });
    expect(locked.text).toContain('Бюджеты — с премиумом');
    expect(locked.keyboard[0][0].callback_data).toBe('premium_subscription');
    const budgets = composer().compose({
      intent: intent({ type: 'budget_status' }), currency: 'RUB', period, locked: false,
      budgets: [{ label: 'Общий бюджет', spent: 60000, limit: 50000, ratio: 1.2 }, { label: '🍔 Еда', spent: 8500, limit: 10000, ratio: 0.85 }]
    });
    expect(sp(budgets.text)).toContain('🚨 Общий бюджет: 60 000 ₽ / 50 000 ₽ (120%) · перерасход 10 000 ₽');
    expect(sp(budgets.text)).toContain('⚠️ 🍔 Еда: 8 500 ₽ / 10 000 ₽ (85%) · осталось 1 500 ₽');
    expect(budgets.keyboard[0][0].callback_data).toBe('bg_menu');
  });

  test('every assistant text is translated into all 13 languages with the same placeholders and balanced Markdown', () => {
    const langs = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'ka', 'kz', 'uz', 'hi', 'jp', 'zh'];
    const ru = require('../locales/ru');
    const keys = Object.keys(ru).filter(k => /^(ai_|button_ai|command_ask|help_assistant)/.test(k));
    expect(keys.length).toBeGreaterThan(60);
    const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const lang of langs) {
      const locale = require(`../locales/${lang}`);
      for (const key of keys) {
        expect([lang, key, typeof locale[key]]).toEqual([lang, key, 'string']);
        expect([lang, key, placeholders(locale[key])]).toEqual([lang, key, placeholders(ru[key])]);
        expect([lang, key, markdownBalanced(locale[key])]).toEqual([lang, key, true]);
      }
    }
  });
});

// ---------- Расчёт на засеянных данных ----------

// Траты пользователя: фейковый репозиторий фильтрует как SQL — по датам [start, end), именам категорий и подстрокам
function seededRepository(rows, answered = 0, modelCalls = 0) {
  return {
    calls: [],
    logged: [],
    wrong: [],
    async findExpenses(userId, timezone, start, end, { categoryNames = [], terms = [] } = {}) {
      this.calls.push({ start, end, categoryNames, terms });
      return rows.filter(r => r.local_date >= start && r.local_date < end)
        .filter(r => !categoryNames.length || categoryNames.includes(r.category_name))
        .filter(r => !terms.length || terms.some(t => (r.description || '').toLowerCase().includes(t.toLowerCase())))
        .map(r => ({ ...r, created_at_utc: `${r.local_date}T12:00:00Z` }));
    },
    async countAnswered() { return answered; },
    async countModelCalls() { return modelCalls; },
    async logQuestion(userId, date, entry) { this.logged.push(entry); return this.logged.length; },
    async markWrong(userId, id, { refundsPerDay }) {
      if (userId !== 1 || id > this.logged.length) return 'missing';
      if (this.wrong.includes(id)) return 'done';
      if (this.wrong.length >= refundsPerDay) return 'used';
      this.wrong.push(id);
      return 'marked';
    }
  };
}

const expense = (local_date, amount, description, category_name, currency = 'RUB') => ({ local_date, amount, currency, description, category_name, category_icon: '•' });
const SEED = [
  expense('2026-09-03', 450, 'Такси домой', 'Транспорт'),
  expense('2026-09-15', 30, 'taxi airport', 'Транспорт', 'USD'),
  expense('2026-09-20', 1200, 'Продукты', 'Еда'),
  expense('2026-09-29', 999, 'кино', 'Развлечения'),
  expense('2026-10-01', 300, 'кофе', 'Еда'),
  expense('2026-10-10', 15000, 'Наушники', 'Покупки'),
  expense('2026-10-22', 700, 'такси', 'Транспорт'),
  expense('2026-10-27', 250, 'кофе', 'Еда'),
  expense('2026-10-28', 2500, 'Продукты', 'Еда')
];

function makeService({ rows = SEED, answered = 0, modelCalls = 0, isPremium = false, provider = null, startDay = 1, modelDeadlineMs, planningService = null, debts = [] } = {}) {
  const repository = seededRepository(rows, answered, modelCalls);
  const rates = { RUB: 1, USD: 90 };
  const service = new AssistantService({
    assistantRepository: repository,
    provider,
    expenseService: {
      async getPeriodContext() {
        return { timezone: 'Europe/Moscow', currency: 'RUB', startDay, today: TODAY, period: resolvePeriod({ kind: 'month', offset: 0 }, { today: TODAY, startDay }) };
      },
      async getCategories() { return CATEGORIES.map(({ id, name, icon }) => ({ id, name, icon })); },
      async getTotals(userId, tz, period) {
        const inPeriod = rows.filter(r => r.local_date >= period.start && r.local_date < period.end);
        const byCurrency = {};
        inPeriod.forEach(r => { byCurrency[r.currency] = (byCurrency[r.currency] || 0) + r.amount; });
        return { byCurrency: Object.entries(byCurrency).map(([currency, total]) => ({ currency, total })), count: inPeriod.length };
      }
    },
    incomeService: {
      async getTotals(userId, tz, period) {
        return period.start <= '2026-10-05' && period.end > '2026-10-05'
          ? { byCurrency: [{ currency: 'RUB', total: 100000 }, { currency: 'USD', total: 100 }], count: 2 }
          : { byCurrency: [], count: 0 };
      }
    },
    savingsService: {
      async getState() { return { currency: 'RUB', total: 300000, debtTotal: 0, netWorth: 300000, goals: [{ name: 'Отпуск' }], debts }; },
      async goalStatus() { return { current: 300000, target: 400000, ratio: 0.75 }; }
    },
    budgetService: {
      async getStatus() { return [{ category_name: 'Еда', spent: 3050, limit: 3000, ratio: 3050 / 3000 }, { category_name: null, spent: 18750, limit: 50000, ratio: 0.375 }]; },
      budgetName: (b) => (b.category_name === null ? 'Общий бюджет' : `🍔 ${b.category_name}`)
    },
    planningService,
    premiumService: { async isPremiumUser() { return isPremium; } },
    localizationService: localization,
    formatter,
    currencyUtils: { async convert(amount, from, to) { return amount * rates[from] / rates[to]; } },
    modelDeadlineMs
  });
  return { service, repository };
}

describe('assistant computation on seeded data', () => {
  const ctx = (startDay = 1) => ({ userId: 1, lang: 'ru', timezone: 'Europe/Moscow', currency: 'RUB', startDay, today: TODAY, isPremium: false, categories: CATEGORIES });
  const compute = async (raw, options = {}) => {
    const { service, repository } = makeService(options);
    const result = await service.compute(check(raw).intent, ctx(options.startDay));
    return { result, repository };
  };

  test('taxi in September: description search by stem across currencies and languages (30 USD = 2 700 ₽)', async () => {
    const { result, repository } = await compute({ type: 'spend_total', period: { kind: 'named_month', month: 9 }, text_filter: 'такси' });
    expect(repository.calls[0]).toEqual({ start: '2026-09-01', end: '2026-10-01', categoryNames: [], terms: ['такс', 'taxi'] });
    expect(result).toMatchObject({ total: 450 + 2700, count: 2 });
    const both = await compute({ type: 'spend_total', period: { kind: 'named_month', month: 9 }, text_filter: ['такси', 'taxi'] });
    expect(both.result).toMatchObject({ total: 450 + 2700, count: 2 });
  });

  test('category totals and breakdown in the main currency, sorted', async () => {
    const food = await compute({ type: 'spend_total', period: { kind: 'month', offset: 0 }, categories: ['Еда'] });
    expect(food.repository.calls[0].categoryNames).toEqual(['Еда']);
    expect(food.result).toMatchObject({ total: 3050, count: 3 });
    const { result } = await compute({ type: 'spend_by_category', period: { kind: 'month', offset: -1 } });
    expect(result.total).toBe(450 + 2700 + 1200 + 999);
    expect(result.categories.map(c => [c.name, c.total])).toEqual([['Транспорт', 3150], ['Еда', 1200], ['Развлечения', 999]]);
  });

  test('top and largest by converted value', async () => {
    const top = await compute({ type: 'top_expenses', period: { kind: 'all' }, limit: 3 });
    expect(top.result.items.map(i => i.description)).toEqual(['Наушники', 'taxi airport', 'Продукты']);
    const largest = await compute({ type: 'largest_purchase', period: { kind: 'named_month', month: 9 } });
    expect(largest.result.items).toHaveLength(1);
    expect(largest.result.items[0].description).toBe('taxi airport');
  });

  test('average per day counts days up to today; for all time from the first record', async () => {
    const month = await compute({ type: 'average_daily', period: { kind: 'month', offset: 0 } });
    expect(month.result).toMatchObject({ total: 18750, days: 28 });
    expect(month.result.average).toBeCloseTo(18750 / 28, 6);
    const all = await compute({ type: 'average_daily', period: { kind: 'all' } });
    expect(all.result.days).toBe(56); // 03.09 … 28.10
  });

  test('comparison of this month to date with the same days of the previous month', async () => {
    const { result, repository } = await compute({ type: 'compare_periods', period: { kind: 'month', offset: 0 } });
    expect(repository.calls.map(c => [c.start, c.end])).toEqual([['2026-10-01', '2026-10-29'], ['2026-09-01', '2026-09-29']]);
    expect(result.current.total).toBe(18750);
    expect(result.previous.total).toBe(450 + 2700 + 1200); // 29.09 не входит
    expect(result.toDate).toBe(true);
  });

  test('user period start day shifts «this month»', async () => {
    const { repository } = await compute({ type: 'spend_total', period: { kind: 'month', offset: 0 } }, { startDay: 10 });
    expect(repository.calls[0]).toMatchObject({ start: '2026-10-10', end: '2026-11-10' });
  });

  test('income and balance convert every currency', async () => {
    const income = await compute({ type: 'income_total', period: { kind: 'month', offset: 0 } });
    expect(income.result).toMatchObject({ total: 109000, count: 2 });
    const balance = await compute({ type: 'balance', period: { kind: 'month', offset: 0 } });
    expect(balance.result).toMatchObject({ income: 109000, expenses: 18750, balance: 90250 });
  });

  test('display currency on request', async () => {
    const { result } = await compute({ type: 'spend_total', period: { kind: 'named_month', month: 9 }, text_filter: 'taxi', currency: 'USD' });
    expect(result).toMatchObject({ currency: 'USD', total: 30 + 5 }); // «taxi» находит и «Такси домой» (450 ₽ = 5 $)
  });
});

describe('AssistantService.answer', () => {
  test('a fast-path word search that finds nothing is re-asked to the model (лекарства → Здоровье)', async () => {
    const rows = [...SEED, expense('2026-10-20', 900, 'аптека', 'Здоровье')];
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'spend_total', period: { kind: 'month', offset: 0 }, categories: ['Здоровье'] })) };
    const { service } = makeService({ rows, provider });
    const result = await service.answer(1, 'сколько ушло на лекарства в этом месяце', { lang: 'ru' });
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'answered', source: 'model' });
    expect(sp(result.text)).toContain('900 ₽');
    // нашлось по слову — модель не нужна
    const again = makeService({ rows, provider: { configured: true, complete: jest.fn() } });
    expect(await again.service.answer(1, 'сколько ушло на аптеку в этом месяце', { lang: 'ru' })).toMatchObject({ source: 'fast' });
    expect(again.service.provider.complete).not.toHaveBeenCalled();
  });

  test('fast path answers without the model and logs the answered question', async () => {
    const provider = { configured: true, complete: jest.fn() };
    const { service, repository } = makeService({ provider });
    const result = await service.answer(1, '? сколько я потратил на кофе в этом месяце', { lang: 'ru' });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'answered', source: 'fast' });
    expect(sp(result.text)).toContain('550 ₽');
    expect(repository.logged).toEqual([expect.objectContaining({ intentType: 'spend_total', source: 'fast' })]);
  });

  test('example buttons use preset intents in any language', async () => {
    const { service } = makeService();
    const result = await service.answer(1, 'irrelevant', { lang: 'jp', example: 3 });
    expect(result).toMatchObject({ status: 'answered', source: 'example' });
    expect(result.intent).toMatchObject({ type: 'spend_total', period: { kind: 'last_n_days', n: 7 } });
    expect(result.intent.categories.map(c => c.name)).toEqual(['Еда']);
    expect(sp(result.text)).toContain('2 750 ₽'); // 27.10 кофе + 28.10 продукты
    expect(Object.keys(AssistantService.EXAMPLE_INTENTS)).toHaveLength(6);
  });

  test('other questions go to the model; its JSON is validated before use', async () => {
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'count_records', period: { kind: 'named_month', month: 10 }, text_filter: 'кофе' })) };
    const { service, repository } = makeService({ provider });
    const question = 'сколько раз за октябрь я позволил себе кофе навынос у дома';
    const result = await service.answer(1, question, { lang: 'ru' });
    expect(provider.complete).toHaveBeenCalledTimes(1);
    const { messages, owner } = provider.complete.mock.calls[0][0];
    expect(messages[messages.length - 1].content).toContain(`Question: ${question}`);
    expect(owner).toBe(1);
    expect(result).toMatchObject({ status: 'answered', source: 'model' });
    expect(result.text).toContain('Записей: *2*');
    expect(repository.logged).toEqual([expect.objectContaining({ intentType: 'count_records', source: 'model', modelCalls: 1 })]);
  });

  test('model says unknown → not understood; future → future; both count as model calls but not as answers', async () => {
    const unknown = makeService({ provider: { configured: true, complete: async () => ({ type: 'unknown' }) } });
    expect(await unknown.service.answer(1, 'какая погода', { lang: 'ru' })).toMatchObject({ status: 'not_understood' });
    const future = makeService({ provider: { configured: true, complete: async () => ({ type: 'spend_total', period: { kind: 'named_month', month: 12, year: 2026 } }) } });
    expect(await future.service.answer(1, 'сколько потрачу в декабре 2026 года вообще всего примерно', { lang: 'ru' })).toMatchObject({ status: 'future' });
    expect(unknown.repository.logged).toEqual([expect.objectContaining({ intentType: 'not_understood', answered: false, modelCalls: 1 })]);
  });

  test('model down: no guessing from a partial parse — model_down', async () => {
    const down = { configured: true, complete: async () => { throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'network' }); } };
    const { service } = makeService({ provider: down });
    // разобран целиком — модель не нужна
    expect(await service.answer(1, 'сколько я потратил в октябре ну типа', { lang: 'ru' })).toMatchObject({ status: 'answered', source: 'fast' });
    expect(await service.answer(1, 'посчитай подарки маме на праздник', { lang: 'ru' })).toMatchObject({ status: 'model_down' });
    const none = makeService({ provider: null });
    expect(await none.service.answer(1, 'посчитай подарки маме', { lang: 'ru' })).toMatchObject({ status: 'model_down' });
  });
});

describe('fix D: periods, filters and limits of «Спроси бота»', () => {
  const fastIntent = (q) => {
    const fast = parseFastPath(q, { today: TODAY });
    return { confident: fast.confident, ...check(fast.intent).intent };
  };

  test.each([
    ['траты за лето', { kind: 'custom', from: '2026-06-01', to: '2026-08-31' }],
    ['total spending this summer', { kind: 'custom', from: '2026-06-01', to: '2026-08-31' }],
    ['траты за зиму', { kind: 'custom', from: '2025-12-01', to: '2026-02-28' }],
    ['сколько потратил с понедельника', { kind: 'custom', from: '2026-10-26', to: TODAY }],
    ['how much did i spend since monday', { kind: 'custom', from: '2026-10-26', to: TODAY }],
    ['сколько я потратил в прошлые выходные', { kind: 'custom', from: '2026-10-24', to: '2026-10-25' }],
    ['сколько потратил в пятницу', { kind: 'custom', from: '2026-10-23', to: '2026-10-23' }],
    ['скок ушло на развлечения за 3 месяца', { kind: 'custom', from: '2026-07-29', to: TODAY }],
    ['how much did i spend in the last two weeks', { kind: 'last_n_days', n: 14 }],
    ['сколько я потратил в прошлом году', { kind: 'year', offset: -1 }],
    ['сколько я потратил в 2025 году', { kind: 'custom', from: '2025-01-01', to: '2025-12-31' }]
  ])('period: %s', (question, period) => {
    expect(fastIntent(question)).toMatchObject({ confident: true, period });
  });

  test('filters, currency, new types and comparisons from the fast path', () => {
    expect(fastIntent('сколько потратил на такси и метро в октябре')).toMatchObject({ terms: ['такси', 'метро'] });
    expect(fastIntent('how many times did i take a taxi in october')).toMatchObject({ type: 'count_records', terms: ['taxi'] });
    expect(fastIntent('траты в долларах за прошлый месяц')).toMatchObject({ currency: 'USD', period: { kind: 'month', offset: -1 } });
    expect(fastIntent('что я сегодня купил')).toMatchObject({ type: 'top_expenses', limit: 10, period: { kind: 'day', offset: 0 } });
    expect(fastIntent('сколько я трачу на подписки')).toMatchObject({ confident: true, type: 'subscriptions' });
    expect(fastIntent('сколько я должен по кредитке')).toMatchObject({ confident: true, type: 'debt_status' });
    expect(fastIntent('сколько осталось накопить на машину')).toMatchObject({ type: 'savings_status' });
    expect(fastIntent('потратил ли я больше чем в прошлом месяце')).toMatchObject({ type: 'compare_periods', period: { kind: 'month', offset: 0 }, compareTo: null });
    expect(fastIntent('насколько больше я потратил в октябре чем в сентябре')).toMatchObject({
      type: 'compare_periods', period: { kind: 'named_month', month: 10 }, compareTo: { kind: 'named_month', month: 9 }
    });
    const holidays = parseFastPath('сколько я потратил за праздники', { today: TODAY });
    expect(holidays).toMatchObject({ confident: false, unresolvedTime: true });
  });

  test('named months compared while the later one is running are cut to the same days', () => {
    const periods = comparisonPeriods({ kind: 'named_month', month: 10, year: 2026 }, { kind: 'named_month', month: 9, year: 2026 }, { today: TODAY, startDay: 1 });
    expect(periods).toMatchObject({ toDate: true, days: 28, current: { start: '2026-10-01', end: '2026-10-29' }, previous: { start: '2026-09-01', end: '2026-09-29' } });
  });

  test('a time word the parser does not know is never answered as «this month» (model leaves period out)', async () => {
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'spend_total', period: null })) };
    const { service } = makeService({ provider });
    expect(await service.answer(1, 'сколько я потратил за праздники', { lang: 'ru' })).toMatchObject({ status: 'period_unclear' });
    // а «за лето» быстрый разбор понимает сам: модель не нужна, период — июнь…август
    const summer = await service.answer(1, 'траты за лето', { lang: 'ru' });
    expect(summer).toMatchObject({ status: 'answered', source: 'fast', intent: { period: { kind: 'custom', from: '2026-06-01', to: '2026-08-31' } } });
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  test('re-asking the model keeps the fast-path period and type; takes only its categories', async () => {
    const rows = [...SEED, expense('2026-10-20', 900, 'лекарства', 'Здоровье'), expense('2026-10-21', 500, 'спортзал', 'Здоровье')];
    // модель «путает» период (сегодня) — берём только категорию
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'spend_total', period: { kind: 'day', offset: 0 }, categories: ['Здоровье'] })) };
    const { service } = makeService({ rows: [...rows, expense('2026-09-10', 300, 'лекарства', 'Здоровье')], provider });
    const result = await service.answer(1, 'сколько ушло на лекарства в сентябре вообще', { lang: 'ru' });
    expect(result.intent).toMatchObject({ period: { kind: 'named_month', month: 9 } });
    expect(sp(result.text)).toContain('300 ₽');
    expect(provider.complete).not.toHaveBeenCalled();
    const none = await service.answer(1, 'сколько ушло на лекарства за неделю', { lang: 'ru' });
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(none.intent).toMatchObject({ period: { kind: 'last_n_days', n: 7 } });
  });

  test('a model category that is not in the question loses to the word found in descriptions (кофе ≠ Кафе)', async () => {
    const rows = [expense('2026-10-20', 250, 'кофе', 'Развлечения'), expense('2026-10-21', 900, 'обед', 'Развлечения'), expense('2026-10-22', 700, 'шаурма', 'Развлечения')];
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'spend_total', period: { kind: 'month', offset: 0 }, categories: ['Развлечения'] })) };
    const { service } = makeService({ rows, provider });
    const coffee = await service.answer(1, 'сколько на кофе вкусный мой любимый за месяц', { lang: 'ru' });
    expect(coffee.intent.categories).toEqual([]);
    expect(sp(coffee.text)).toContain('250 ₽');
    // «обеды на этой неделе» — обедов в этом периоде нет, но они бывают в другой категории: не подменяем категорией «Еда»
    const lunch = makeService({ rows: [expense('2026-10-01', 900, 'обед', 'Развлечения'), expense('2026-10-27', 400, 'продукты', 'Еда')], provider: { configured: true, complete: async () => ({ type: 'spend_total', categories: ['Еда'] }) } });
    const answer = await lunch.service.answer(1, 'сколько потратил на обеды на этой неделе', { lang: 'ru' });
    expect(answer.intent).toMatchObject({ categories: [], terms: ['обеды'] });
    expect(answer.text).toContain('Таких трат');
  });

  test('brands are found in either script (нетфликс → Netflix) without the model', async () => {
    const provider = { configured: true, complete: jest.fn() };
    const { service } = makeService({ rows: [expense('2026-09-07', 10, 'Netflix', 'Развлечения', 'USD')], provider });
    const result = await service.answer(1, 'сколько ушло на нетфликс за всё время', { lang: 'ru' });
    expect(sp(result.text)).toContain('900 ₽');
    expect(provider.complete).not.toHaveBeenCalled();
  });

  test('subscriptions and debts are answered from planning and savings', async () => {
    const planningService = { getSubscriptions: jest.fn(async () => ({ all: [1, 2, 3, 4], visible: [{ label: 'Netflix', monthlyMain: 800 }, { label: 'Spotify', monthlyMain: 300 }, { label: 'Gym', monthlyMain: 2500 }], hiddenCount: 1, hiddenMonthly: 399, totalMonthly: 3999 })) };
    const debts = [{ name: 'Кредитка', balanceMain: 80000, monthly_payment: 10000, currency: 'RUB' }, { name: 'Ипотека', balanceMain: 3000000, monthly_payment: null, currency: 'RUB' }];
    const { service } = makeService({ planningService, debts });
    const subs = await service.answer(1, 'сколько я трачу на подписки', { lang: 'ru' });
    expect(sp(subs.text)).toContain('3 999 ₽');
    expect(subs.text).toContain('Ещё 1');
    expect(subs.keyboard[0][0].callback_data).toBe('pls');
    const card = await service.answer(1, 'сколько я должен по кредитке', { lang: 'ru' });
    expect(sp(card.text)).toContain('80 000 ₽');
    expect(card.text).not.toContain('Ипотека');
    const all = await service.answer(1, 'мои долги', { lang: 'ru' });
    expect(all.text).toContain('Ипотека');
  });

  test('model calls count toward a daily cap, answered or not; the fast path does not', async () => {
    expect(USER_LIMITS.regular.MAX_ASSISTANT_MODEL_CALLS_PER_DAY).toBeGreaterThan(USER_LIMITS.regular.MAX_ASSISTANT_QUESTIONS_PER_DAY);
    const provider = { configured: true, complete: jest.fn(async () => ({ type: 'unknown' })) };
    const capped = makeService({ provider, modelCalls: USER_LIMITS.regular.MAX_ASSISTANT_MODEL_CALLS_PER_DAY });
    expect(await capped.service.answer(1, 'посчитай подарки маме', { lang: 'ru' })).toMatchObject({ status: 'model_limit' });
    expect(provider.complete).not.toHaveBeenCalled();
    expect(await capped.service.answer(1, 'сколько я потратил вчера', { lang: 'ru' })).toMatchObject({ status: 'answered', source: 'fast' });
    expect(capped.repository.logged).toEqual([expect.objectContaining({ source: 'fast', modelCalls: 0 })]);
  });

  test('«🙅 Не то» returns at most one answer a day to the limit; foreign ids are «not found»', async () => {
    const { service, repository } = makeService();
    const result = await service.answer(1, 'сколько я потратил вчера', { lang: 'ru' });
    const wrong = result.keyboard[result.keyboard.length - 1].find(b => b.callback_data.startsWith('aiw|'));
    expect(wrong.callback_data).toBe(`aiw|${result.questionId}`);
    expect(await service.markWrong(1, result.questionId)).toBe('marked');
    expect(await service.markWrong(1, result.questionId)).toBe('done');
    const second = await service.answer(1, 'сколько я потратил позавчера', { lang: 'ru' });
    expect(await service.markWrong(1, second.questionId)).toBe('used');
    expect(await service.markWrong(2, result.questionId)).toBe('missing');
    expect(repository.wrong).toEqual([result.questionId]);
  });

  test('repository: «Не то» refunds only while today\'s refunds are under the cap, never a foreign row', async () => {
    const repo = Object.create(AssistantRepository.prototype); // без пула: query подменён
    const queries = [];
    let row = { answered: true, local_date: '2026-10-28' };
    let refundedToday = 0;
    repo.query = async (sql, params) => {
      queries.push({ sql, params });
      if (/^\s*SELECT answered/.test(sql)) return { rows: row && params[1] === 1 ? [row] : [] };
      return { rowCount: refundedToday < params[4] ? 1 : 0 };
    };
    expect(await repo.markWrong(1, 10, { refundsPerDay: 1 })).toBe('marked');
    const update = queries[1];
    expect(update.params.slice(0, 3)).toEqual([10, 1, '2026-10-28']);
    expect(update.params[3]).toEqual(expect.arrayContaining(['not_understood', 'model_down', 'model_busy']));
    refundedToday = 1;
    expect(await repo.markWrong(1, 11, { refundsPerDay: 1 })).toBe('used');
    expect(await repo.markWrong(2, 11, { refundsPerDay: 1 })).toBe('missing');
    row = { answered: false, local_date: '2026-10-28' };
    expect(await repo.markWrong(1, 12, { refundsPerDay: 1 })).toBe('done');
  });

  test('round 2: «с 20 числа», «since the 15th», вб, averages per week / month', async () => {
    expect(fastIntent('сколько я потратил с 20 числа')).toMatchObject({ confident: true, period: { kind: 'custom', from: '2026-10-20', to: TODAY }, terms: [] });
    expect(fastIntent('траты с 5-го')).toMatchObject({ period: { kind: 'custom', from: '2026-10-05', to: TODAY } });
    expect(fastIntent('spending since the 15th')).toMatchObject({ confident: true, period: { kind: 'custom', from: '2026-10-15', to: TODAY } });
    expect(fastIntent('сколько потратил с 30 числа')).toMatchObject({ period: { kind: 'custom', from: '2026-09-30', to: TODAY } });
    expect(fastIntent('сколько ушло на вб в этом году')).toMatchObject({ confident: true, terms: ['вб'] });
    expect(fastIntent('сколько уходит на транспорт в неделю')).toMatchObject({
      confident: true, type: 'average_daily', per: 'week', period: { kind: 'last_n_days', n: 90 }
    });
    expect(fastIntent('сколько трачу на еду в среднем в месяц')).toMatchObject({ confident: true, type: 'average_daily', per: 'month' });
    expect(fastIntent('сколько стоил ноутбук')).toMatchObject({ confident: true, period: { kind: 'all' }, terms: ['ноутбук'] });
    expect(fastIntent('сколько я сэкономил в сентябре')).toMatchObject({ confident: true, type: 'balance' });
    // модель положила в поиск дату — это не слово из описания
    expect(check({ type: 'spend_total', text_filter: 'с 20 числа' }).intent.terms).toEqual([]);
    expect(check({ type: 'spend_total', text_filter: 'iphone 15' }).intent.terms).toEqual(['iphone 15']);
    expect(check({ type: 'spend_total', text_filter: 'лunch' }).intent.terms).toEqual([]);
    expect(fastIntent('сколько ушло с начала месяца')).toMatchObject({ confident: true, period: { kind: 'month', offset: 0 } });
    expect(fastIntent('сколько я получил в сентябре')).toMatchObject({ confident: true, type: 'income_total', period: { kind: 'named_month', month: 9 } });

    const { service, repository } = makeService({ rows: [...SEED, expense('2026-10-05', 3000, 'Wildberries кроссовки', 'Покупки')] });
    const wb = await service.answer(1, 'сколько ушло на вб в этом году', { lang: 'ru' });
    expect(repository.calls[0].terms).toEqual(['вб', 'вайлдберриз', 'wildberry', 'wildberries']);
    expect(sp(wb.text)).toContain('3 000 ₽');
    const week = await service.answer(1, 'сколько уходит на транспорт в неделю', { lang: 'ru' });
    // транспорт за 90 дней: 450 + 2700 + 700 = 3850 → ×7/90
    expect(sp(week.text)).toContain(sp(formatter.formatAmount(3850 / 90 * 7, 'RUB')));
    expect(week.text).toContain('в неделю');
  });

  test('a model that accepted the request but did not answer in time is «busy», a refused connection is «down»', async () => {
    const { ReceiptError } = require('../services/receipt/errors');
    const slow = makeService({ provider: { configured: true, complete: async () => { throw new ReceiptError('network', 'timeout'); } } });
    expect(await slow.service.answer(1, 'посчитай подарки маме', { lang: 'ru' })).toMatchObject({ status: 'model_busy' });
    const refused = makeService({ provider: { configured: true, complete: async () => { throw new ReceiptError('network', 'connect ECONNREFUSED 127.0.0.1:11434'); } } });
    expect(await refused.service.answer(1, 'посчитай подарки маме', { lang: 'ru' })).toMatchObject({ status: 'model_down' });
  });

  test('a question waiting behind a receipt gets «busy» with its queue position, without a model call', async () => {
    const provider = {
      configured: true,
      complete: ({ onStatus }) => { onStatus({ position: 2, local: true }); return new Promise(() => {}); }
    };
    const { service, repository } = makeService({ provider, modelDeadlineMs: 20 });
    expect(await service.answer(1, 'посчитай подарки маме', { lang: 'ru' })).toMatchObject({ status: 'model_busy', position: 2 });
    expect(repository.logged).toEqual([]);
  });
});

describe('fix D: shared model queue', () => {
  const { Limiter } = require('../services/receipt/chain');
  const deferred = () => {
    let resolve;
    const promise = new Promise((r) => { resolve = r; });
    return { promise, resolve };
  };

  test('questions jump ahead of queued receipts; one job of each kind per user', async () => {
    const limiter = new Limiter(1);
    const order = [];
    const running = deferred();
    const first = limiter.run(() => running.promise, () => {}, { kind: 'receipt', owner: 1 });
    const receipt = limiter.run(async () => { order.push('receipt 2'); }, () => {}, { kind: 'receipt', owner: 2 });
    const positions = [];
    const question = limiter.run(async () => { order.push('question 3'); }, p => positions.push(p), { kind: 'assistant', owner: 3 });
    expect(positions[0]).toBe(1);
    await expect(limiter.run(async () => {}, () => {}, { kind: 'receipt', owner: 2 })).rejects.toMatchObject({ code: 'busy' });
    running.resolve('done');
    await Promise.all([first, receipt, question]);
    expect(order).toEqual(['question 3', 'receipt 2']);
    // место освободилось — снова можно
    await expect(limiter.run(async () => 'ok', () => {}, { kind: 'receipt', owner: 2 })).resolves.toBe('ok');
  });

  test('a cancelled job leaves the queue and frees the user slot', async () => {
    const limiter = new Limiter(1);
    const running = deferred();
    const busy = limiter.run(() => running.promise, () => {}, { kind: 'receipt', owner: 1 });
    let cancelled = false;
    const waiting = limiter.run(async () => 'never', () => {}, { kind: 'assistant', owner: 2, isCancelled: () => cancelled });
    cancelled = true;
    const again = limiter.run(async () => 'second', () => {}, { kind: 'assistant', owner: 2 });
    await expect(waiting).rejects.toMatchObject({ code: 'network' });
    running.resolve();
    await busy;
    await expect(again).resolves.toBe('second');
  });

  test('a hanging model is abandoned at the deadline and its queue slot is released', async () => {
    let cancelledCheck = null;
    const hanging = { configured: true, complete: ({ isCancelled }) => { cancelledCheck = isCancelled; return new Promise(() => {}); } };
    const { service } = makeService({ provider: hanging, modelDeadlineMs: 30 });
    const result = await service.answer(1, 'посчитай подарки маме', { lang: 'ru' });
    expect(result).toMatchObject({ status: 'model_busy' });
    expect(cancelledCheck()).toBe(true);
  });

  test('daily limit: 5 free, 100 with premium (trial counts as premium)', async () => {
    expect(USER_LIMITS.regular.MAX_ASSISTANT_QUESTIONS_PER_DAY).toBe(5);
    expect(USER_LIMITS.premium.MAX_ASSISTANT_QUESTIONS_PER_DAY).toBe(100);
    expect(await makeService({ answered: 5 }).service.checkLimit(1, 'UTC')).toMatchObject({ used: 5, limit: 5, remaining: 0, isPremium: false });
    expect(await makeService({ answered: 5, isPremium: true }).service.checkLimit(1, 'UTC')).toMatchObject({ limit: 100, remaining: 95 });
  });
});

describe('assistant entry points', () => {
  test('questions never hijack expense or income input', () => {
    const { isQuestion } = AssistantHandlers;
    expect(isQuestion('? сколько я потратил на такси')).toBe(true);
    expect(isQuestion('？ 今月いくら')).toBe(true);
    expect(isQuestion('сколько я потратил на кофе?')).toBe(true);
    expect(isQuestion('250 кофе')).toBe(false);
    expect(isQuestion('250 кофе?')).toBe(false);
    expect(isQuestion('+50000 зарплата?')).toBe(false);
    expect(isQuestion('кофе')).toBe(false);
    expect(isQuestion('?')).toBe(false);
    expect(isQuestion('что?')).toBe(false);
  });

  test('/ask passes command validation with a question, other commands still reject arguments', () => {
    const validator = new EnhancedValidator();
    expect(validator.validateCommand('/ask сколько я потратил на кофе?').isValid).toBe(true);
    expect(validator.validateCommand('/ask@ExpensesAssistant_bot how much').isValid).toBe(true);
    expect(validator.validateCommand('/stats extra').isValid).toBe(false);
  });

  function handlerHarness({ remaining = 5, isPremium = false } = {}) {
    const replies = [];
    const edits = [];
    const assistantService = {
      checkLimit: jest.fn(async () => ({ used: 5 - remaining, limit: isPremium ? 100 : 5, remaining, isPremium })),
      answer: jest.fn(async () => ({ status: 'answered', text: '*ok*', keyboard: [[{ text: 'x', callback_data: 'ai' }]] })),
      premiumLimit: 100
    };
    assistantService.constructor = AssistantService;
    const handlers = new AssistantHandlers({
      assistantService,
      userService: { getUserLanguage: async () => 'ru', getUserTimezone: async () => 'UTC' },
      stateService: { setUserState: jest.fn(), deleteUserState: jest.fn() },
      localizationService: localization
    });
    const ctx = {
      from: { id: 7 }, chat: { id: 7, type: 'private' },
      reply: jest.fn(async (text, extra) => { replies.push({ text, extra }); return { message_id: 100 + replies.length }; }),
      sendChatAction: jest.fn(async () => {}),
      telegram: { editMessageText: jest.fn(async (chatId, messageId, inline, text, extra) => { edits.push({ messageId, text, extra }); }) }
    };
    return { handlers, ctx, replies, edits, assistantService };
  }

  test('a question shows «Думаю…», answers in the background and edits it into the answer with the free counter', async () => {
    const { handlers, ctx, replies, edits } = handlerHarness({ remaining: 3 });
    await handlers.ask(ctx, '? сколько на кофе', 'ru');
    expect(replies[0].text).toBe('🤔 Думаю…');
    await handlers.idle();
    expect(edits[0].messageId).toBe(101);
    expect(edits[0].text).toBe('*ok*\n\n_Вопросов на сегодня осталось: 2 из 5_');
    expect(handlers.busyUsers.size).toBe(0);
  });

  test('over the limit: premium pitch, no model call; one question at a time', async () => {
    const limited = handlerHarness({ remaining: 0 });
    await limited.handlers.ask(limited.ctx, 'сколько на кофе?', 'ru');
    expect(limited.replies[0].text).toContain('Вопросы на сегодня закончились: 5 из 5');
    expect(limited.replies[0].extra.reply_markup.inline_keyboard[0][0].callback_data).toBe('premium_subscription');
    expect(limited.assistantService.answer).not.toHaveBeenCalled();

    const busy = handlerHarness();
    busy.assistantService.answer.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ status: 'not_understood' }), 20)));
    await busy.handlers.ask(busy.ctx, 'вопрос раз?', 'ru');
    await busy.handlers.ask(busy.ctx, 'вопрос два?', 'ru');
    expect(busy.replies[1].text).toContain('Ещё думаю');
    await busy.handlers.idle();
    expect(busy.edits[0].text).toContain('Не понял вопрос');
    expect(busy.edits[0].text).toContain('• Сколько я потратил в этом месяце?');
  });

  test('group chats are ignored: answers are about personal money', async () => {
    const { handlers, ctx, replies } = handlerHarness();
    ctx.chat.type = 'group';
    await handlers.ask(ctx, '? сколько', 'ru');
    expect(replies).toEqual([]);
  });
});

describe('assistant model slots', () => {
  test('ASSISTANT_AI_* slots win; otherwise the receipt slots with a shorter timeout; off disables the model', () => {
    const receipt = { RECEIPT_AI_3_PROVIDER: 'openai', RECEIPT_AI_3_BASE_URL: 'http://127.0.0.1:11434/v1', RECEIPT_AI_3_MODEL: 'qwen2.5vl:3b', RECEIPT_AI_3_TIMEOUT_MS: '180000' };
    const inherited = createAssistantProvider(receipt);
    expect(inherited.providers).toHaveLength(1);
    expect(inherited.providers[0]).toMatchObject({ model: 'qwen2.5vl:3b', timeoutMs: 20000 });
    const own = createAssistantProvider({ ...receipt, ASSISTANT_AI_1_PROVIDER: 'openai', ASSISTANT_AI_1_BASE_URL: 'https://api.mistral.ai/v1', ASSISTANT_AI_1_MODEL: 'small', ASSISTANT_AI_1_API_KEY: 'k' });
    expect(own.providers.map(p => p.model)).toEqual(['small']);
    expect(createAssistantProvider({ ...receipt, ASSISTANT_AI_1_PROVIDER: 'off' }).configured).toBe(false);
    // у ASSISTANT_AI нет «старых» переменных без номера
    expect(parseSlots({ ASSISTANT_AI_PROVIDER: 'openai', ASSISTANT_AI_BASE_URL: 'http://h/v1', ASSISTANT_AI_MODEL: 'm' }, 'ASSISTANT_AI')).toEqual([]);
  });

  test('receipts and questions to the same local Ollama share one queue', () => {
    const receipts = createChain(parseSlots({ RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: 'http://127.0.0.1:11999/v1', RECEIPT_AI_1_MODEL: 'vl' }));
    const questions = createAssistantProvider({ RECEIPT_AI_1_PROVIDER: 'openai', RECEIPT_AI_1_BASE_URL: 'http://127.0.0.1:11999/v1/', RECEIPT_AI_1_MODEL: 'vl' });
    expect(questions.providers[0].limiter).toBe(receipts.providers[0].limiter);
    expect(receipts.providers[0].limiter.max).toBe(1);
    expect(limiterFor({ provider: 'openai', baseUrl: 'https://api.mistral.ai/v1', concurrency: 0 })).not.toBe(limiterFor({ provider: 'openai', baseUrl: 'https://api.mistral.ai/v1', concurrency: 0 }));
  });

  test('text completion requests: JSON mode, temperature 0, chat messages', async () => {
    const messages = [{ role: 'system', content: 'S' }, { role: 'user', content: 'Q' }];
    const openai = new OpenAiCompatibleProvider({ baseUrl: 'http://127.0.0.1:11434/v1', model: 'qwen2.5vl:3b' });
    expect(openai.buildCompletionRequest({ messages })).toEqual({
      url: 'http://127.0.0.1:11434/v1/chat/completions',
      headers: {},
      body: { model: 'qwen2.5vl:3b', temperature: 0, response_format: { type: 'json_object' }, messages }
    });
    openai.post = async () => ({ status: 200, json: { choices: [{ message: { content: '```json\n{"type":"balance"}\n```' } }] } });
    expect(await openai.complete({ messages })).toEqual({ type: 'balance' });

    const gemini = new GeminiProvider({ apiKey: 'K' });
    const { body } = gemini.buildCompletionRequest({ messages: [...messages, { role: 'assistant', content: 'A' }] });
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'S' }] });
    expect(body.contents.map(c => c.role)).toEqual(['user', 'model']);
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', temperature: 0 });
  });

  test('a cancelled question frees its place in the queue without calling the model', async () => {
    const chain = createChain([]);
    const slow = { slot: 1, name: 'openai', model: 'm', limiter: new (require('../services/receipt/chain').Limiter)(1), complete: jest.fn(async () => ({ type: 'balance' })) };
    chain.providers = [slow];
    let release;
    const busy = slow.limiter.run(() => new Promise(resolve => { release = resolve; }));
    let cancelled = false;
    const waiting = chain.complete({ messages: [], isCancelled: () => cancelled });
    cancelled = true;
    release();
    await busy;
    await expect(waiting).rejects.toMatchObject({ code: 'network' });
    expect(slow.complete).not.toHaveBeenCalled();
  });
});
