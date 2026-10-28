const {
  TRIGGER_PRIORITY, CONTEXTS, junkKind, median, selectTrigger, pluralForm, fitsGender, renderTemplate, pickVariant,
  timeContexts, isPayday, variantText, variantContext, variantMatch, matchesGate, variantFits
} = require('../utils/roast');
const roastTemplates = require('../locales/roast');
const RoastService = require('../services/RoastService');
const RoastHandlers = require('../handlers/RoastHandlers');
const LocalizationService = require('../services/LocalizationService');
const Formatter = require('../utils/formatter');
const { ROAST, generateSettingsKeyboard } = require('../utils/constants');

const TODAY = '2026-10-20';
const PERIOD = { start: '2026-10-01', end: '2026-11-01', last: '2026-10-31' };
const LANGS = Object.keys(roastTemplates.ROAST_LOCALES);
const TRIGGER_FAMILIES = ['budget_over', 'budget_80', 'allowance', 'challenge', 'impulse', 'junk'];
const OPTIONAL = ['days', 'times', 'cat_times', 'count', 'sum'];
// Новые виды вредных трат — только ru и en; остальным языкам хватает общих вариантов junk
const NEW_SUBTYPES = ['junk_coffee', 'junk_marketplace', 'junk_games', 'junk_subscription'];
const SUBTYPES = ['junk_fastfood', 'junk_delivery', 'junk_alcohol', 'junk_smoking', 'junk_energy', 'junk_taxi', ...NEW_SUBTYPES];
const WEEK_FAMILIES = ['week_more', 'week_less', 'week_same'];
const MONTH_FAMILIES = ['month_empty', 'month_open', 'month_top', 'month_biggest', 'month_more', 'month_less',
  'month_budget_over', 'month_budget_ok', 'month_junk', 'month_verdict_bad', 'month_verdict_good'];

// Все параметры, которые бывают у семейств (для проверки шаблонов)
const FULL_PARAMS = {
  budget: 'бюджет на «Еда»', limit: '10 000 ₽', spent: '10 500 ₽', over: '500 ₽', left: '1 500 ₽', percent: 105,
  amount: '1 000 ₽', desc: 'крылья кфс', days_left: 11, daily: '700 ₽', times: 3, category: 'Еда', days: 3,
  median: '300 ₽', cat_times: 4, count: 5, sum: '4 200 ₽', total: '12 000 ₽', share: 42, kinds: 'фастфуд, доставка'
};

const placeholders = (template) => [...template.matchAll(/\{([^{}|#]+)\}/g)].map(m => m[1]);

describe('roast templates engine', () => {
  test('gender forms resolve for m / f / x (three forms) in Russian', () => {
    const template = 'Молодец, {долбоёб|долбоёбка}, {купил|купила} «{desc}» за {amount}. {Доволен|Довольна}?';
    expect(renderTemplate(template, { desc: 'крылья кфс', amount: '1 000 ₽' }, 'm'))
      .toBe('Молодец, долбоёб, купил «крылья кфс» за 1 000 ₽. Доволен?');
    expect(renderTemplate(template, { desc: 'крылья кфс', amount: '1 000 ₽' }, 'f'))
      .toBe('Молодец, долбоёбка, купила «крылья кфс» за 1 000 ₽. Довольна?');
    // У «не скажу» двух форм нет — вариант не годится вовсе
    expect(renderTemplate(template, { desc: 'x', amount: '1' }, 'x')).toBeNull();
    expect(fitsGender(template, 'x')).toBe(false);
    expect(fitsGender(template, 'm')).toBe(true);
    // Три формы — для всех
    const neutral = 'Бюджет орал, а на него {ты хуй положил|ты хуй положила|просто положили хуй}.';
    expect(fitsGender(neutral, 'x')).toBe(true);
    expect(renderTemplate(neutral, {}, 'x')).toBe('Бюджет орал, а на него просто положили хуй.');
    expect(renderTemplate(neutral, {}, 'f')).toBe('Бюджет орал, а на него ты хуй положила.');
  });

  test('plural forms follow the number (ru three forms, en two)', () => {
    const ru = (n) => renderTemplate('{n} {n#день|дня|дней}', { n }, 'x');
    expect([1, 2, 5, 11, 21, 22, 111, 112].map(ru)).toEqual(['1 день', '2 дня', '5 дней', '11 дней', '21 день', '22 дня', '111 дней', '112 дней']);
    expect(pluralForm(1, ['day', 'days'])).toBe('day');
    expect(pluralForm(3, ['day', 'days'])).toBe('days');
  });

  test('a missing parameter makes the variant unusable instead of leaking a placeholder', () => {
    expect(renderTemplate('Это {cat_times} трат на «{category}»', { category: 'Еда' }, 'm')).toBeNull();
    expect(renderTemplate('{n#день|дня|дней}', {}, 'm')).toBeNull();
    // Значение с фигурными скобками не разбирается как шаблон
    expect(renderTemplate('«{desc}»', { desc: '{amount} {а|б}' }, 'm')).toBe('«{amount} {а|б}»');
  });

  test('variants are not repeated: recent ones are skipped, the last one never twice in a row', () => {
    const variants = ['a {x}', 'b {x}', 'c {x}'];
    const first = pickVariant('fam', variants, { params: { x: 1 }, recent: [], random: () => 0 });
    expect(first.key).toBe('fam:0');
    const second = pickVariant('fam', variants, { params: { x: 1 }, recent: ['fam:0'], random: () => 0 });
    expect(second.key).toBe('fam:1');
    // Все недавние — берём любой, кроме самого последнего
    const third = pickVariant('fam', variants, { params: { x: 1 }, recent: ['fam:2', 'fam:1', 'fam:0'], random: () => 0 });
    expect(third.key).not.toBe('fam:2');
    // Сто выборов подряд с памятью — ни одного повтора подряд
    let recent = [];
    let previous = null;
    for (let i = 0; i < 100; i++) {
      const picked = pickVariant('fam', variants, { params: { x: 1 }, recent });
      expect(picked.key).not.toBe(previous);
      previous = picked.key;
      recent = [picked.key, ...recent].slice(0, ROAST.RECENT_VARIANTS);
    }
  });

  test('trigger priority: budget over beats everything, junk is the weakest', () => {
    expect(TRIGGER_PRIORITY[0]).toBe('budget_over');
    expect(TRIGGER_PRIORITY[TRIGGER_PRIORITY.length - 1]).toBe('junk');
    const pick = selectTrigger([{ kind: 'junk' }, { kind: 'impulse' }, { kind: 'budget_over' }, { kind: 'allowance' }]);
    expect(pick.kind).toBe('budget_over');
    expect(selectTrigger([{ kind: 'junk' }, { kind: 'impulse' }]).kind).toBe('impulse');
    expect(selectTrigger([null, { kind: 'budget_80' }, { kind: 'allowance' }]).kind).toBe('allowance');
    expect(selectTrigger([])).toBeNull();
  });

  test('junk keywords (ru/en) and median', () => {
    expect(junkKind('крылья кфс')).toBe('fastfood');
    expect(junkKind('Бургер Кинг')).toBe('fastfood');
    expect(junkKind('Яндекс Еда доставка')).toBe('delivery');
    expect(junkKind('пиво')).toBe('alcohol');
    expect(junkKind('сиги')).toBe('smoking');
    expect(junkKind('Red Bull')).toBe('energy');
    expect(junkKind('такси домой')).toBe('taxi');
    expect(junkKind('beer')).toBe('alcohol');
    expect(junkKind('кусок сыра')).toBeNull();
    expect(junkKind('сигнализация')).toBeNull();
    expect(junkKind('продукты')).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('product gates (match) and period kinds (needs)', () => {
  const variants = [
    'обычный {x}',
    { match: 'кальян|hookah', text: 'кальянный {x}' },
    { match: 'кальян|hookah', when: 'night', text: 'ночной кальянный {x}' },
    { match: 'кальян|hookah', text: '{Ты курил|Ты курила} кальян {x}' }
  ];
  const pick = (subject, { situational = false, contexts = [], gender = 'm', recent = [] } = {}) => {
    const picked = pickVariant('f', variants, { params: { x: 1 }, subject, situational, contexts, gender, recent, random: () => 0.99 });
    return picked && picked.text;
  };

  test('word-start, case-insensitive match in ru/en', () => {
    expect(matchesGate('кальян|hookah', 'Кальян в баре')).toBe(true);
    expect(matchesGate('кальян|hookah', 'Hookah lounge')).toBe(true);
    expect(matchesGate('кальян|hookah', 'вечер, кальянная')).toBe(true);
    expect(matchesGate('бар|pub', 'барбекю')).toBe(true); // начало слова — да
    expect(matchesGate('бар|pub', 'амбар')).toBe(false); // середина слова — нет
    expect(matchesGate('кальян', 'сигареты')).toBe(false);
    expect(matchesGate('кальян', '')).toBe(false);
  });

  test('a gated variant is never picked without a match and is picked when the description matches', () => {
    for (let i = 0; i < 20; i++) expect(pickVariant('f', variants, { params: { x: 1 }, subject: 'сигареты', random: Math.random }).text).toBe('обычный 1');
    expect(pick('')).toBe('обычный 1');
    // random 0.99 — последний подходящий: с совпадением это гейт-вариант
    expect(pick('кальян на двоих')).toBe('Ты курил кальян 1');
    expect(pick('Hookah')).toBe('Ты курил кальян 1');
  });

  test('gate combined with a situation and with «не скажу»', () => {
    expect(pick('кальян', { situational: true, contexts: ['night'] })).toBe('ночной кальянный 1');
    expect(pick('сигареты', { situational: true, contexts: ['night'] })).toBeNull();
    expect(pick('кальян', { situational: true, contexts: ['weekend'] })).toBeNull();
    // Гейт и пол: двухформенный вариант про кальян «не скажу» не достаётся, нейтральный — да
    expect(pick('кальян', { gender: 'x' })).toBe('кальянный 1');
    expect(variantFits(variants[1], { subject: 'кальян' })).toBe(true);
    expect(variantFits({ needs: ['fastfood', 'delivery'], text: 't' }, { kinds: ['fastfood'] })).toBe(false);
    expect(variantFits({ needs: ['fastfood', 'delivery'], text: 't' }, { kinds: ['delivery', 'fastfood', 'taxi'] })).toBe(true);
  });

  test('every gate compiles; ru keeps ≥ 7 ungated non-situational variants per junk kind and level', () => {
    for (const lang of LANGS) {
      for (const level of ['spicy', 'savage']) {
        for (const variants of Object.values(roastTemplates(lang)[level])) {
          for (const variant of variants) if (variantMatch(variant)) expect(() => matchesGate(variantMatch(variant), 'x')).not.toThrow();
        }
      }
    }
    const ru = roastTemplates('ru');
    for (const level of ['spicy', 'savage']) {
      for (const family of SUBTYPES) {
        const plain = ru[level][family].filter(v => typeof v === 'string' || (!v.match && !v.when)).length;
        expect([level, family, plain >= 7]).toEqual([level, family, true]);
      }
    }
  });

  test('service: product lines only for matching descriptions; month junk names only kinds that happened', async () => {
    const history = Array.from({ length: 20 }, () => ({ amount: 300, currency: 'RUB', category_name: 'Еда' }));
    const ctx = { chat: { type: 'private', id: 7 }, from: { id: 7 } };
    const smoke = (description) => ({ id: 1, user_id: 7, amount: 600, currency: 'RUB', description, category_name: 'Другое' });
    const gatesOf = (service, key) => variantMatch(service.variants('ru', 'savage', 'junk', 'smoking')[Number(key.split(':')[1])]);
    for (let i = 0; i < 30; i++) {
      const { service, repo } = makeService({ level: 'savage', history });
      service.random = Math.random;
      await service.afterExpenses(ctx, { userId: 7, lang: 'ru', expenses: [smoke('сигареты')] });
      const gate = gatesOf(service, repo.claim.mock.calls[0][1].variantKey);
      if (gate) expect(matchesGate(gate, 'сигареты')).toBe(true); // кальян / вейп / стики — никогда
    }

    const { service, deps } = makeService({ level: 'savage', gender: 'x' });
    deps.expenseService.getExpenses.mockResolvedValue([
      { id: 1, user_id: 7, amount: 400, currency: 'RUB', description: 'такси' },
      { id: 2, user_id: 7, amount: 300, currency: 'RUB', description: 'такси' },
      { id: 3, user_id: 7, amount: 350, currency: 'RUB', description: 'латте' }
    ]);
    for (let i = 0; i < 15; i++) {
      service.random = Math.random;
      const roast = await service.monthRoast(7, 'ru', { level: 'savage', gender: 'x' });
      const junkLine = roast.text.split('\n').find(line => line.startsWith('🍟'));
      expect(junkLine).toBeTruthy();
      expect(junkLine).not.toMatch(/фастфуд|доставк|бухло|игры|подписк|маркетплейс/i);
    }
    // Языки без {kinds}: строка «фастфуд, доставка…» только когда оба вида были
    const de = makeService({ level: 'spicy', gender: 'x' });
    de.deps.expenseService.getExpenses.mockResolvedValue([
      { id: 1, user_id: 7, amount: 400, currency: 'RUB', description: 'Taxi' },
      { id: 2, user_id: 7, amount: 300, currency: 'RUB', description: 'Taxi' }
    ]);
    for (let i = 0; i < 10; i++) {
      de.service.random = Math.random;
      const roast = await de.service.monthRoast(7, 'de', { level: 'spicy', gender: 'x' });
      expect(roast.text).not.toMatch(/Fast Food, Lieferdienste/);
    }
  });
});

describe('junk subtypes and situations', () => {
  test('new junk subtypes: marketplaces, coffee, games, subscriptions (ru/en)', () => {
    for (const d of ['Ozon', 'заказ на озоне', 'Wildberries', 'вб', 'WB заказ', 'AliExpress', 'али', 'Яндекс Маркет', 'Amazon', 'Temu']) {
      expect([d, junkKind(d)]).toEqual([d, 'marketplace']);
    }
    for (const d of ['кофе', 'латте', 'капучино', 'раф', 'Starbucks', 'coffee']) expect([d, junkKind(d)]).toEqual([d, 'coffee']);
    for (const d of ['Steam', 'донат стримеру', 'PlayStation Store', 'PS Store', 'Xbox', 'игра', 'игры', 'games']) {
      expect([d, junkKind(d)]).toEqual([d, 'games']);
    }
    for (const d of ['Netflix', 'Spotify', 'Кинопоиск', 'ivi', 'Яндекс Плюс', 'YouTube Premium']) {
      expect([d, junkKind(d)]).toEqual([d, 'subscription']);
    }
    // Не вредное: кафе — не кофе, «альбом», «вбить» — не маркетплейс, «игрушки» — не игры
    for (const d of ['кафе', 'альбом', 'вбить гвоздь', 'игрушки ребёнку', 'продукты']) expect([d, junkKind(d)]).toEqual([d, null]);
    // Подписка, которую бот списал сам как регулярную, — не повод
    expect(junkKind('Netflix', { recurring: true })).toBeNull();
    expect(junkKind('кофе', { recurring: true })).toBe('coffee');
  });

  test('time situations in the user\'s timezone: night 00:00–04:59, Friday 18:00+ and weekend, Monday', () => {
    const at = (iso, tz) => timeContexts(new Date(iso), tz);
    // Москва UTC+3: 21:30 UTC вторника — 00:30 среды
    expect(at('2026-10-20T21:30:00Z', 'Europe/Moscow')).toEqual(['night']);
    expect(at('2026-10-21T01:59:00Z', 'Europe/Moscow')).toEqual(['night']); // 04:59
    expect(at('2026-10-21T02:00:00Z', 'Europe/Moscow')).toEqual([]); // 05:00
    expect(at('2026-10-20T20:59:00Z', 'Europe/Moscow')).toEqual([]); // 23:59 вторника
    // Пятница: 17:59 — ещё нет, 18:00 — уже выходные
    expect(at('2026-10-23T14:59:00Z', 'Europe/Moscow')).toEqual([]);
    expect(at('2026-10-23T15:00:00Z', 'Europe/Moscow')).toEqual(['weekend']);
    expect(at('2026-10-24T12:00:00Z', 'Europe/Moscow')).toEqual(['weekend']); // суббота
    expect(at('2026-10-24T23:30:00Z', 'Europe/Moscow')).toEqual(['night', 'weekend']); // 02:30 воскресенья
    // Понедельник по местному времени, хотя в UTC ещё воскресенье
    expect(at('2026-10-25T22:00:00Z', 'Asia/Novosibirsk')).toEqual(['monday']); // 05:00 пн в UTC+7
    expect(at('2026-10-25T20:00:00Z', 'Asia/Novosibirsk')).toEqual(['night', 'monday']); // 03:00 пн
    expect(at('2026-10-25T20:00:00Z', 'UTC')).toEqual(['weekend']); // а в UTC это вечер воскресенья
  });

  test('payday: an income not below the median within the last 3 days', () => {
    const incomes = [
      { value: 100000, date: '2026-08-05' }, { value: 100000, date: '2026-09-05' }, { value: 5000, date: '2026-09-20' },
      { value: 100000, date: '2026-10-05' }
    ];
    expect(isPayday(incomes, '2026-10-05')).toBe(true);
    expect(isPayday(incomes, '2026-10-07')).toBe(true);
    expect(isPayday(incomes, '2026-10-08')).toBe(false); // прошло 3 дня
    expect(isPayday(incomes, '2026-10-04')).toBe(false); // доход ещё в будущем
    // Мелкий доход меньше медианы — не зарплата
    expect(isPayday(incomes, '2026-09-21')).toBe(false);
    expect(isPayday([], '2026-10-05')).toBe(false);
  });

  test('situational variants only in their situation, with the context chance; subtype lines preferred', async () => {
    const variants = ['обычный {x}', { when: 'night', text: 'ночной {x}' }, { when: 'payday', text: 'зарплатный {x}' }];
    const pick = (contexts, situational) => {
      const picked = pickVariant('f', variants, { params: { x: 1 }, contexts, situational, random: () => 0 });
      return picked && picked.text;
    };
    expect(pick([], false)).toBe('обычный 1');
    expect(pick(['night'], false)).toBe('обычный 1'); // ситуационные в обычный выбор не попадают
    expect(pick(['night'], true)).toBe('ночной 1');
    expect(pick(['payday'], true)).toBe('зарплатный 1');
    expect(pick(['monday'], true)).toBeNull(); // для понедельника вариантов нет — вызывающий берёт обычный
    expect(pick([], true)).toBeNull();

    // Сервис: вероятность ситуации — ROAST.CONTEXT_CHANCE, вида траты — ROAST.SUBTYPE_CHANCE
    const rolls = (...values) => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
    const { service } = makeService();
    const ru = (key) => service.variants('ru', 'spicy', 'junk', 'fastfood')[Number(key.split(':')[1])];
    const ownCount = roastTemplates('ru').spicy.junk_fastfood.length;
    const params = { amount: '450 ₽', desc: 'шаурма', count: null, sum: null };
    service.random = rolls(0.1, 0);
    expect(variantContext(ru(service.pick('ru', 'spicy', 'junk', params, 'm', [], 'fastfood', ['night']).key))).toBe('night');
    service.random = rolls(0.9, 0.1, 0); // ситуация не выпала, вид выпал
    let picked = service.pick('ru', 'spicy', 'junk', params, 'm', [], 'fastfood', ['night']);
    expect(Number(picked.key.split(':')[1])).toBeLessThan(ownCount);
    expect(variantContext(ru(picked.key))).toBeNull();
    service.random = rolls(0.9, 0.9, 0.99); // ни ситуации, ни вида — любой обычный из общего набора
    picked = service.pick('ru', 'spicy', 'junk', params, 'm', [], 'fastfood', ['night']);
    expect(variantContext(ru(picked.key))).toBeNull();
    expect(Number(picked.key.split(':')[1])).toBeGreaterThanOrEqual(ownCount);
  });

  test('languages without a subtype fall back to the generic junk variants', async () => {
    expect(roastTemplates('de').spicy.junk_marketplace).toBeUndefined();
    const { service, repo } = makeService({
      history: Array.from({ length: 20 }, () => ({ amount: 300, currency: 'RUB', category_name: 'Еда' }))
    });
    const text = await service.afterExpenses({ chat: { type: 'private', id: 7 }, from: { id: 7 } }, {
      userId: 7, lang: 'de', expenses: [{ id: 1, user_id: 7, amount: 600, currency: 'RUB', description: 'Ozon', category_name: 'Покупки' }]
    });
    expect(text).not.toBe('');
    const key = repo.claim.mock.calls[0][1].variantKey;
    expect(key).toMatch(/^spicy\.junk\.marketplace:\d+$/);
    const index = Number(key.split(':')[1]);
    expect(service.variants('de', 'spicy', 'junk', 'marketplace')[index]).toBe(roastTemplates('de').spicy.junk[index]);
  });

  test('service: payday and night variants are used when the situation matches', async () => {
    const history = Array.from({ length: 20 }, () => ({ amount: 500, currency: 'RUB', category_name: 'Еда' }));
    const expense = { id: 1, user_id: 7, amount: 600, currency: 'RUB', description: 'шаурма', category_name: 'Еда' };
    const ctx = { chat: { type: 'private', id: 7 }, from: { id: 7 } };
    const situational = (service, key) => variantContext(service.variants('ru', 'spicy', 'junk', 'fastfood')[Number(key.split(':')[1])]);

    const payday = makeService({ history, incomes: [{ amount: 90000, currency: 'RUB', local_date: TODAY }] });
    await payday.service.afterExpenses(ctx, { userId: 7, lang: 'ru', expenses: [expense] });
    expect(situational(payday.service, payday.repo.claim.mock.calls[0][1].variantKey)).toBe('payday');

    // Пояс пользователя в моке — UTC: 23:30 вторника ещё не ночь
    const evening = makeService({ history, now: new Date('2026-10-20T23:30:00Z') });
    await evening.service.afterExpenses(ctx, { userId: 7, lang: 'ru', expenses: [expense] });
    expect(situational(evening.service, evening.repo.claim.mock.calls[0][1].variantKey)).toBeNull();

    const lateNight = makeService({ history, now: new Date('2026-10-21T02:30:00Z') }); // 02:30 UTC, среда
    await lateNight.service.afterExpenses(ctx, { userId: 7, lang: 'ru', expenses: [expense] });
    expect(situational(lateNight.service, lateNight.repo.claim.mock.calls[0][1].variantKey)).toBe('night');
  });
});

describe('roast copy in all languages', () => {
  const en = roastTemplates('en');

  test.each(LANGS)('%s: every family, no Markdown, no leftover placeholders for m / f / x', (lang) => {
    const set = roastTemplates(lang);
    expect(set.labels.total_budget).toBeTruthy();
    expect(set.labels.category_budget).toContain('{category}');
    for (const level of ['spicy', 'savage']) {
      for (const family of Object.keys(en[level])) {
        if (NEW_SUBTYPES.includes(family) && !['ru', 'en'].includes(lang)) continue;
        expect([lang, level, family, Array.isArray(set[level][family]) && set[level][family].length > 0]).toEqual([lang, level, family, true]);
      }
      for (const [family, variants] of Object.entries(set[level])) {
        for (const variant of variants) {
          const template = variantText(variant);
          if (variantContext(variant)) expect(CONTEXTS).toContain(variantContext(variant));
          expect(template.replace(/\{[^{}]*\}/g, '')).not.toMatch(/[*_`[]/);
          for (const name of placeholders(template)) expect(FULL_PARAMS).toHaveProperty(name);
          for (const gender of ['m', 'f', 'x']) {
            if (!fitsGender(template, gender)) continue;
            const text = renderTemplate(template, FULL_PARAMS, gender);
            expect(text).not.toBeNull();
            expect(text).not.toMatch(/[{}|]/);
          }
        }
        // Каждому повод нужен и тем, кто не сказал пол, и без необязательных чисел
        if (TRIGGER_FAMILIES.includes(family)) {
          const plain = variants.filter(v => !variantContext(v)).map(variantText);
          const neutralBasic = plain.filter(v => fitsGender(v, 'x') && !placeholders(v).some(p => OPTIONAL.includes(p)));
          expect(neutralBasic.length).toBeGreaterThanOrEqual(lang === 'ru' ? 2 : 1);
          expect(plain.filter(v => fitsGender(v, 'x')).length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  test('ru and en pool sizes; at least half of every ru family works for «не скажу»', () => {
    const ru = roastTemplates('ru');
    const en = roastTemplates('en');
    const size = (set, level, family) => set[level][family].length;
    for (const level of ['spicy', 'savage']) {
      for (const family of TRIGGER_FAMILIES) expect([level, family, size(ru, level, family) >= 15]).toEqual([level, family, true]);
      for (const family of TRIGGER_FAMILIES) expect([level, family, size(en, level, family) >= 10]).toEqual([level, family, true]);
      for (const family of SUBTYPES) expect([level, family, size(ru, level, family) >= 8]).toEqual([level, family, true]);
      for (const family of NEW_SUBTYPES) expect([level, family, size(en, level, family) >= 4]).toEqual([level, family, true]);
      for (const family of WEEK_FAMILIES) expect([level, family, size(ru, level, family) >= 8]).toEqual([level, family, true]);
      for (const family of MONTH_FAMILIES) expect([level, family, size(ru, level, family) >= 5]).toEqual([level, family, true]);
      for (const [family, variants] of Object.entries(ru[level])) {
        const neutral = variants.filter(v => fitsGender(variantText(v), 'x')).length;
        expect([level, family, neutral * 2 >= variants.length]).toEqual([level, family, true]);
      }
      // Ситуационные: ru — от 6 на ситуацию, en — от 4
      for (const [set, min] of [[ru, 6], [en, 4]]) {
        const all = Object.values(set[level]).flat();
        for (const context of CONTEXTS) expect([level, context, all.filter(v => variantContext(v) === context).length >= min]).toEqual([level, context, true]);
      }
    }
  });

  test('ru «не скажу» never gets a gendered form', () => {
    const ru = roastTemplates('ru');
    // «ты …л(ся)», «долбоёб», «сам/сама себе» — формы о самом пользователе (про бюджет, бармена и т.п. можно)
    const gendered = /(^|[^а-яё])(ты\s+[а-яё]+л(ся)?|ты\s+[а-яё]+(ый|ой)|долбоёб|купил|купила|сама?\s+себе)(?=[^а-яё]|$)/i;
    for (const level of ['spicy', 'savage']) {
      for (const variants of Object.values(ru[level])) {
        for (const variant of variants) {
          const template = variantText(variant);
          if (!fitsGender(template, 'x')) continue;
          const text = renderTemplate(template, FULL_PARAMS, 'x');
          expect(text).not.toMatch(gendered);
        }
      }
    }
  });

  test('UI strings exist in all 13 locales without leftover placeholders', () => {
    const localization = new LocalizationService();
    const keys = Object.keys(require('../locales/ru')).filter(k => /roast/.test(k));
    expect(keys.length).toBeGreaterThanOrEqual(30);
    const tokens = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
    for (const lang of LANGS) {
      const locale = require(`../locales/${lang}`);
      for (const key of keys) {
        expect([lang, key, typeof locale[key]]).toEqual([lang, key, 'string']);
        expect([lang, key, tokens(locale[key])]).toEqual([lang, key, tokens(require('../locales/ru')[key])]);
        expect((locale[key].match(/\*/g) || []).length % 2).toBe(0);
      }
      expect(localization.getText(lang, 'command_roast').length).toBeLessThanOrEqual(256);
    }
    expect(generateSettingsKeyboard(localization, 'ru').flat().map(b => b.callback_data)).toContain('rst');
  });
});

// ---------- RoastService ----------

// По умолчанию — среда, 12:00 UTC: ни ночи, ни выходных, ни понедельника
const WEDNESDAY_NOON = new Date('2026-10-21T12:00:00Z');

function makeService({
  level = 'spicy', gender = 'm', state = {}, statuses = [], isPremium = true, allowance = null, history = [],
  periodExpenses = [], markSent = true, claim = true, incomes = [], now = WEDNESDAY_NOON
} = {}) {
  const repo = {
    getSettings: jest.fn(async () => ({ level, gender, adultConfirmed: true })),
    getState: jest.fn(async () => ({ day: null, dayCount: 0, lastAt: null, recent: [], ...state })),
    claim: jest.fn(async () => claim),
    rememberVariants: jest.fn(async () => {}),
    getActionRows: jest.fn(async (userId, timezone, ids) => ids.map(id => ({ id, local_date: TODAY }))),
    getHistory: jest.fn(async () => history),
    getIncomes: jest.fn(async () => incomes)
  };
  const deps = {
    roastRepository: repo,
    expenseService: {
      getPeriodContext: jest.fn(async () => ({ timezone: 'UTC', currency: 'RUB', today: TODAY, period: PERIOD })),
      getExpenses: jest.fn(async () => periodExpenses),
      getTotals: jest.fn(async () => ({ byCurrency: [], count: 0 }))
    },
    budgetService: { getStatus: jest.fn(async () => statuses) },
    planningService: { getAllowance: jest.fn(async () => allowance) },
    premiumService: { isPremiumUser: jest.fn(async () => isPremium) },
    reportService: { categoryBreakdown: jest.fn(async () => []) },
    userNotificationRepository: { markSent: jest.fn(async () => markSent) },
    localizationService: new LocalizationService(),
    formatter: new Formatter({ convert: async (amount) => amount }),
    currencyUtils: { convert: async (amount) => amount },
    random: () => 0,
    now: () => now
  };
  return { service: new RoastService(deps), repo, deps };
}

const privateCtx = (id = 7) => ({ chat: { type: 'private', id }, from: { id } });
const expense = (fields = {}) => ({ id: 101, user_id: 7, amount: 1000, currency: 'RUB', description: 'крылья кфс', category_name: 'Еда', ...fields });
const history = (n, amount = 300) => Array.from({ length: n }, () => ({ amount, currency: 'RUB', category_name: 'Еда' }));
const claimedFamily = (repo) => repo.claim.mock.calls[0][1].variantKey.split(':')[0];

describe('RoastService.afterExpenses', () => {
  const run = (service, overrides = {}) => service.afterExpenses(overrides.ctx || privateCtx(), {
    userId: 7, lang: 'ru', expenses: [expense()], ...overrides
  });

  test('level off — silence and no counters touched', async () => {
    const { service, repo } = makeService({ level: 'off', history: history(20) });
    expect(await run(service)).toBe('');
    expect(repo.getState).not.toHaveBeenCalled();
    expect(repo.claim).not.toHaveBeenCalled();
  });

  test('never in groups, never for another family member', async () => {
    const { service, repo } = makeService({ history: history(20) });
    expect(await run(service, { ctx: { chat: { type: 'group', id: -5 }, from: { id: 7 } } })).toBe('');
    // Трата записана другим участником семьи — его не трогаем
    expect(await run(service, { expenses: [expense({ user_id: 8 })] })).toBe('');
    // Апдейт не от этого пользователя
    expect(await run(service, { ctx: privateCtx(8) })).toBe('');
    expect(repo.getSettings).toHaveBeenCalledTimes(0);
  });

  test('picks the strongest trigger: budget exceeded beats impulse and junk', async () => {
    const statuses = [{ id: 3, category_name: 'Еда', amount: 10000, limit: 10000, spent: 10500, ratio: 1.05 }];
    const { service, repo, deps } = makeService({ statuses, history: history(20) });
    const text = await run(service);
    expect(text.startsWith(RoastService.PREFIX)).toBe(true);
    expect(claimedFamily(repo)).toBe('spicy.budget_over');
    expect(repo.claim.mock.calls[0][1].force).toBe(true);
    expect(deps.userNotificationRepository.markSent).toHaveBeenCalledWith(7, 'roast_budget_over', `3:${PERIOD.start}:10000`);
    expect(text).not.toMatch(/[{}]/);
  });

  test('budget exceeded fires once per budget per period, then weaker triggers take over', async () => {
    const statuses = [{ id: 3, category_name: 'Еда', amount: 10000, limit: 10000, spent: 10500, ratio: 1.05 }];
    const { service, repo } = makeService({ statuses, history: history(20), markSent: false });
    await run(service);
    expect(claimedFamily(repo)).toBe('spicy.impulse');
  });

  test('budget crossing is detected only when this action crossed the threshold', async () => {
    // До траты уже было 105% — не «перешёл», а был за лимитом
    const statuses = [{ id: 3, category_name: 'Еда', amount: 10000, limit: 10000, spent: 11500, ratio: 1.15 }];
    // История с крупными тратами: ни импульса, ни заметной вредной траты — проверяем только бюджет
    const { service, repo } = makeService({ statuses, history: history(20, 5000) });
    expect(await run(service)).toBe('');
    expect(repo.claim).not.toHaveBeenCalled();
    // 75% → 85%: подколка про 80%
    const warn = [{ id: 3, category_name: null, amount: 10000, limit: 10000, spent: 8500, ratio: 0.85 }];
    const second = makeService({ statuses: warn, history: history(5) });
    await run(second.service);
    expect(claimedFamily(second.repo)).toBe('spicy.budget_80');
    expect(second.repo.claim.mock.calls[0][1].force).toBe(false);
  });

  test('budgets are premium-only', async () => {
    const statuses = [{ id: 3, category_name: 'Еда', amount: 10000, limit: 10000, spent: 10500, ratio: 1.05 }];
    const { service, repo } = makeService({ statuses, isPremium: false, history: history(20, 5000) });
    expect(await run(service)).toBe('');
    expect(repo.claim).not.toHaveBeenCalled();
  });

  test('daily cap and gap: weaker triggers wait, budget exceeded still fires', async () => {
    const capped = { day: TODAY, dayCount: ROAST.MAX_PER_DAY, lastAt: new Date(Date.now() - 5 * 3600000), recent: [] };
    const junkOnly = makeService({ state: capped, history: history(20, 500) });
    expect(await run(junkOnly.service, { expenses: [expense({ amount: 600 })] })).toBe('');
    expect(junkOnly.repo.claim).not.toHaveBeenCalled();

    const recentGap = { day: TODAY, dayCount: 1, lastAt: new Date(Date.now() - 10 * 60000), recent: [] };
    const gap = makeService({ state: recentGap, history: history(20, 500) });
    expect(await run(gap.service, { expenses: [expense({ amount: 600 })] })).toBe('');

    const statuses = [{ id: 3, category_name: 'Еда', amount: 10000, limit: 10000, spent: 10500, ratio: 1.05 }];
    const forced = makeService({ state: capped, statuses, history: history(20) });
    expect(await run(forced.service)).not.toBe('');
    expect(forced.repo.claim.mock.calls[0][1].force).toBe(true);

    // Новый день — счётчик дня не мешает
    const yesterday = { day: '2026-10-19', dayCount: 3, lastAt: new Date(Date.now() - 5 * 3600000), recent: [] };
    const fresh = makeService({ state: yesterday, history: history(20, 500) });
    expect(await fresh.service.afterExpenses(privateCtx(), { userId: 7, lang: 'ru', expenses: [expense({ amount: 600 })] })).not.toBe('');
  });

  test('lost race for the counter (claim refused) — silence', async () => {
    const { service } = makeService({ history: history(20), claim: false });
    expect(await run(service)).toBe('');
  });

  test('allowance: only when this action crossed today\'s limit', async () => {
    const allowance = { mode: 'income', daily: 700, spentToday: 1200 };
    const { service, repo } = makeService({ allowance, history: history(5) });
    await run(service, { expenses: [expense({ description: 'продукты' })] });
    expect(claimedFamily(repo)).toBe('spicy.allowance');
    // Лимит был превышен ещё до этой траты
    const already = makeService({ allowance: { mode: 'income', daily: 700, spentToday: 2500 }, history: history(5) });
    expect(await run(already.service, { expenses: [expense({ description: 'продукты' })] })).toBe('');
    // Нет ни дохода, ни бюджета — нет лимита
    const none = makeService({ allowance: { mode: 'none' }, history: history(5) });
    expect(await run(none.service, { expenses: [expense({ description: 'продукты' })] })).toBe('');
  });

  test('broken challenge beats the daily allowance', async () => {
    const allowance = { mode: 'income', daily: 700, spentToday: 1200 };
    const { service, repo } = makeService({ allowance, history: history(5) });
    const broken = [{ kind: 'no_category', category_name: 'Еда', start_date: '2026-10-17', today: TODAY }];
    const text = await run(service, { broken, expenses: [expense({ description: 'продукты' })] });
    expect(claimedFamily(repo)).toBe('spicy.challenge');
    expect(text).toContain('Еда');
  });

  test('impulse buy needs 10+ expenses of history and 3× the median; receipts are never impulse', async () => {
    const few = makeService({ history: history(9, 100) });
    await run(few.service, { expenses: [expense({ description: 'наушники', amount: 5000 })] });
    expect(few.repo.claim).not.toHaveBeenCalled();

    const enough = makeService({ history: history(12, 100) });
    const text = await run(enough.service, { expenses: [expense({ description: 'наушники', amount: 5000 })] });
    expect(claimedFamily(enough.repo)).toBe('spicy.impulse');
    expect(text).toContain('наушники');

    const receipt = makeService({ history: history(12, 100) });
    await run(receipt.service, { source: 'receipt', expenses: [expense({ description: 'наушники', amount: 5000 })] });
    expect(receipt.repo.claim).not.toHaveBeenCalled();
  });

  test('junk: notable amount or a habit; cheap one-off stays silent', async () => {
    const cheap = makeService({ history: history(20, 1000) });
    expect(await run(cheap.service, { expenses: [expense({ amount: 300 })] })).toBe('');

    const habit = makeService({
      history: history(20, 1000),
      periodExpenses: [expense({ id: 1, amount: 300 }), expense({ id: 2, description: 'KFC', amount: 400 }), expense({ amount: 300 })]
    });
    const text = await run(habit.service, { expenses: [expense({ amount: 300 })] });
    expect(claimedFamily(habit.repo)).toBe('spicy.junk.fastfood');
    expect(text).not.toMatch(/[{}]/);
  });

  test('savage level and gender: female gets feminine forms, «не скажу» gets none', async () => {
    // Вариант «Молодец, {долбоёб|долбоёбка}, {купил|купила}…»: все предыдущие варианты вида — «недавние»
    const own = roastTemplates('ru').savage.junk_fastfood;
    const index = own.findIndex(v => variantText(v).startsWith('Молодец'));
    const recent = own.slice(0, index).map((v, i) => `savage.junk.fastfood:${i}`);
    const female = makeService({ level: 'savage', gender: 'f', history: history(20, 500), state: { recent } });
    const forF = await run(female.service, { expenses: [expense({ amount: 600 })] });
    expect(claimedFamily(female.repo)).toBe('savage.junk.fastfood');
    expect(forF).toContain('купила');

    const neutral = makeService({ level: 'savage', gender: 'x', history: history(20, 500) });
    const forX = await run(neutral.service, { expenses: [expense({ amount: 600 })] });
    expect(forX).not.toBe('');
    expect(forX).not.toMatch(/купил|долбоёб|Доволен|Довольна/);
  });

  test('variant rotation: recently shown variants are not picked again', async () => {
    const recent = roastTemplates('ru').spicy.junk_fastfood.map((v, i) => `spicy.junk.fastfood:${i}`);
    const { service, repo } = makeService({ history: history(20, 500), state: { recent } });
    await run(service, { expenses: [expense({ amount: 600 })] });
    expect(recent).not.toContain(repo.claim.mock.calls[0][1].variantKey);
    expect(repo.claim.mock.calls[0][1].keep).toBe(ROAST.RECENT_VARIANTS);
  });

  test('errors never break the expense flow', async () => {
    const { service, repo } = makeService({ history: history(20) });
    repo.getState.mockRejectedValue(new Error('db down'));
    expect(await run(service)).toBe('');
  });
});

describe('RoastService weekly line and month roast', () => {
  test('weekly line only when enabled and history is enough', async () => {
    const off = makeService({ level: 'off' });
    expect(await off.service.weeklyLine(7, 'ru', { enoughHistory: true, total: 10000, percent: 30, diff: 2000 }, 'RUB')).toBe('');
    const on = makeService();
    expect(await on.service.weeklyLine(7, 'ru', { enoughHistory: false, total: 10000, percent: null, diff: 0 }, 'RUB')).toBe('');
    const line = await on.service.weeklyLine(7, 'ru', { enoughHistory: true, total: 10000, percent: 30, diff: 2000 }, 'RUB');
    expect(line.startsWith(RoastService.PREFIX)).toBe(true);
    expect(on.repo.rememberVariants.mock.calls[0][1][0]).toMatch(/^spicy\.week_more:/);
  });

  test('month roast: numbers in text, share text without descriptions and categories', async () => {
    const { service, deps } = makeService({ level: 'savage', gender: 'x' });
    deps.expenseService.getExpenses.mockResolvedValue([
      expense({ id: 1, amount: 5000, description: 'секретный подарок' }),
      expense({ id: 2, amount: 400, description: 'KFC' }),
      expense({ id: 3, amount: 300, description: 'пиво' })
    ]);
    deps.reportService.categoryBreakdown.mockResolvedValue([{ name: 'Еда', icon: '🍔', total: 5700 }]);
    deps.expenseService.getTotals.mockResolvedValue({ byCurrency: [{ currency: 'RUB', total: 3000 }], count: 4 });
    const roast = await service.monthRoast(7, 'ru', { level: 'savage', gender: 'x' });
    expect(roast.hasData).toBe(true);
    expect(roast.text).toContain(new Formatter({}).formatAmount(5700, 'RUB'));
    expect(roast.text).toContain('секретный подарок');
    expect(roast.text).not.toMatch(/\{|\}/);
    expect(roast.shareText).not.toContain('секретный подарок');
    expect(roast.shareText).not.toContain('Еда');
    expect(roast.shareText.split('\n').length).toBeLessThanOrEqual(3);
  });
});

// ---------- Экраны настройки ----------

describe('RoastHandlers settings flow', () => {
  function setup(settings) {
    const localizationService = new LocalizationService();
    const roastService = {
      getSettings: jest.fn(async () => settings),
      savageAllowed: jest.fn(async () => true),
      effectiveLevel: jest.fn(async (userId, level) => level),
      setLevel: jest.fn(async () => {}),
      setGender: jest.fn(async (userId, gender) => { settings.gender = gender; }),
      confirmAdult: jest.fn(async () => { settings.adultConfirmed = true; }),
      monthRoast: jest.fn(async () => ({ text: 'roast', shareText: 'share', hasData: true }))
    };
    const handlers = new RoastHandlers({ roastService, userService: { getUserLanguage: async () => 'ru' }, localizationService });
    const ctx = (match) => ({
      from: { id: 7 }, chat: { type: 'private', id: 7 }, match, botInfo: { username: 'test_bot' },
      callbackQuery: { message: { message_id: 1 } },
      answerCbQuery: jest.fn(async () => true),
      editMessageText: jest.fn(async () => true),
      reply: jest.fn(async () => ({}))
    });
    const data = (c) => c.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.flat().map(b => b.callback_data).filter(Boolean);
    return { handlers, roastService, ctx, data, t: (key) => localizationService.getText('ru', key) };
  }

  test('enabling without gender asks «how to address you» first, then the 18+ screen for savage', async () => {
    const { handlers, roastService, ctx, data, t } = setup({ level: 'off', gender: null, adultConfirmed: false });
    const first = ctx(['rstl|savage|s', 'savage', 's']);
    await handlers.chooseLevel(first);
    expect(first.editMessageText.mock.calls[0][0]).toContain(t('roast_gender_title'));
    expect(data(first)).toEqual(['rstgs|m|savage|s', 'rstgs|f|savage|s', 'rstgs|x|savage|s', 'rst']);
    expect(roastService.setLevel).not.toHaveBeenCalled();

    const second = ctx(['rstgs|f|savage|s', 'f', 'savage', 's']);
    await handlers.setGender(second);
    expect(roastService.setGender).toHaveBeenCalledWith(7, 'f');
    expect(second.editMessageText.mock.calls[0][0]).toContain(t('roast_adult_title'));
    expect(data(second)).toEqual(['rsty|s', 'rstl|spicy|s']);
    expect(roastService.setLevel).not.toHaveBeenCalled();

    const third = ctx(['rsty|s', 's']);
    await handlers.confirmAdult(third);
    expect(roastService.confirmAdult).toHaveBeenCalledWith(7);
    expect(roastService.setLevel).toHaveBeenCalledWith(7, 'savage');
  });

  test('18+ is asked only once; spicy and off need no confirmation', async () => {
    const { handlers, roastService, ctx } = setup({ level: 'off', gender: 'm', adultConfirmed: true });
    await handlers.chooseLevel(ctx(['rstl|savage|s', 'savage', 's']));
    expect(roastService.setLevel).toHaveBeenLastCalledWith(7, 'savage');
    await handlers.chooseLevel(ctx(['rstl|off|s', 'off', 's']));
    expect(roastService.setLevel).toHaveBeenLastCalledWith(7, 'off');
  });

  test('savage gated by the premium switch shows the premium screen', async () => {
    const { handlers, roastService, ctx, data } = setup({ level: 'spicy', gender: 'm', adultConfirmed: true });
    roastService.savageAllowed.mockResolvedValue(false);
    const c = ctx(['rstl|savage|s', 'savage', 's']);
    await handlers.chooseLevel(c);
    expect(data(c)).toContain('premium_subscription');
    expect(roastService.setLevel).not.toHaveBeenCalled();
  });

  test('month roast when off: spicy preview with enable buttons and a share link; callback_data ≤ 64 bytes', async () => {
    const { handlers, roastService, ctx, data } = setup({ level: 'off', gender: null, adultConfirmed: false });
    const c = ctx(['rsm']);
    await handlers.showMonth(c);
    expect(roastService.monthRoast).toHaveBeenCalledWith(7, 'ru', { level: 'spicy', gender: 'x' });
    expect(data(c)).toEqual(['rstl|spicy|m', 'rstl|savage|m', 'rst']);
    const share = c.editMessageText.mock.calls[0][1].reply_markup.inline_keyboard.flat().find(b => b.url);
    expect(share.url).toMatch(/^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Ft\.me%2Ftest_bot%3Fstart%3Droast&text=/);
    for (const callback of data(c)) expect(Buffer.byteLength(callback)).toBeLessThanOrEqual(64);
  });
});
