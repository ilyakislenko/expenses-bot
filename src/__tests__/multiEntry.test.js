const { parseEntries, MAX_ENTRIES } = require('../utils/multiEntry');
const { wordsToNumbers, normalizeSpokenText } = require('../utils/numberWords');

// Краткая запись результата: [сумма, валюта|null, описание|null, '+' для дохода]
const brief = (entries) => entries && entries.map(e => [e.amount, e.currency, e.description, e.kind === 'income' ? '+' : '-']);
const parse = (text, options) => brief(parseEntries(text, options));

describe('multi-entry parsing: several records in one message', () => {
  it.each([
    ['кофе 250, такси 400, обед 600', [[250, null, 'кофе', '-'], [400, null, 'такси', '-'], [600, null, 'обед', '-']]],
    ['250 кофе\n400 такси\n600 обед', [[250, null, 'кофе', '-'], [400, null, 'такси', '-'], [600, null, 'обед', '-']]],
    ['250 кофе и 400 такси', [[250, null, 'кофе', '-'], [400, null, 'такси', '-']]],
    ['кофе 250 и 400 такси', [[250, null, 'кофе', '-'], [400, null, 'такси', '-']]],
    ['coffee 5 and taxi 12', [[5, null, 'coffee', '-'], [12, null, 'taxi', '-']]],
    ['+50000 зарплата, кофе 250', [[50000, null, 'зарплата', '+'], [250, null, 'кофе', '-']]],
    ['обед 600\n+1000 USD фриланс', [[600, null, 'обед', '-'], [1000, 'USD', 'фриланс', '+']]],
    ['такси 20 USD; обед 12,5€', [[20, 'USD', 'такси', '-'], [12.5, 'EUR', 'обед', '-']]],
    ['$20 такси, €5 кофе', [[20, 'USD', 'такси', '-'], [5, 'EUR', 'кофе', '-']]],
    ['кофе 250р, такси 400 руб.', [[250, 'RUB', 'кофе', '-'], [400, 'RUB', 'такси', '-']]],
    ['250 рублей кофе, 20 долларов такси', [[250, 'RUB', 'кофе', '-'], [20, 'USD', 'такси', '-']]],
    ['1 500 обед, 2 000 такси', [[1500, null, 'обед', '-'], [2000, null, 'такси', '-']]],
    ['кофе 1,5, такси 2,5', [[1.5, null, 'кофе', '-'], [2.5, null, 'такси', '-']]],
    ['обед за 600, на такси 400', [[600, null, 'обед', '-'], [400, null, 'такси', '-']]],
    ['кофе — 250, такси — 400', [[250, null, 'кофе', '-'], [400, null, 'такси', '-']]],
    ['кофе: 250; такси: 400', [[250, null, 'кофе', '-'], [400, null, 'такси', '-']]],
    ['кофе 250. Такси 400.', [[250, null, 'кофе', '-'], [400, null, 'Такси', '-']]],
    ['хлеб и молоко 300, такси 400', [[300, null, 'хлеб и молоко', '-'], [400, null, 'такси', '-']]],
    ['хлеб, молоко 300\nтакси 400', [[300, null, 'хлеб, молоко', '-'], [400, null, 'такси', '-']]],
    ['7-eleven 300, такси 400', [[300, null, '7-eleven', '-'], [400, null, 'такси', '-']]],
    ['Kaffee 250 und Taxi 400', [[250, null, 'Kaffee', '-'], [400, null, 'Taxi', '-']]],
    ['咖啡 250，出租车 400', [[250, null, '咖啡', '-'], [400, null, '出租车', '-']]]
  ])('%j', (text, expected) => {
    expect(parse(text)).toEqual(expected);
  });

  it('a single record is returned as one entry (the caller keeps the usual single-entry flow)', () => {
    expect(parse('250 кофе')).toEqual([[250, null, 'кофе', '-']]);
    expect(parse('кофе 250')).toEqual([[250, null, 'кофе', '-']]);
    expect(parse('+50000 зарплата')).toEqual([[50000, null, 'зарплата', '+']]);
    // Запятая внутри одного описания — по-прежнему одна запись
    expect(parse('250 кофе, латте')).toEqual([[250, null, 'кофе, латте', '-']]);
  });

  it.each([
    ['500 300 такси', [[500300, null, 'такси', '-']], 'thousands group stays one amount, never two records'],
    ['кофе 1,5', [[1.5, null, 'кофе', '-']], 'decimal comma is not a separator']
  ])('ambiguous input %j does not explode: %s', (text, expected) => {
    expect(parse(text)).toEqual(expected);
  });

  it.each([
    ['привет, как дела', 'no amounts'],
    ['', 'empty'],
    ['250 кофе, 400', 'second part has no description'],
    ['кофе 250 латте, такси 400', 'amount between two words is ambiguous'],
    ['кофе 250 такси 400', 'several amounts without separators (text)'],
    ['iphone 15 чехол 500, такси 400', 'model number next to the amount'],
    ['2 кг яблок, хлеб 50', 'quantity with a unit is not an amount'],
    ['кофе 2 шт 250', 'quantity with a unit'],
    ['кофе -250, такси 400', 'negative amount'],
    ['1,500 кофе, такси 300\nобед 600', 'thousands with a comma is not an amount'],
    ['12,345 кофе, 400 такси', 'three decimals'],
    ['кофе 250рублей, такси 400', 'number glued to a word'],
    ['$20€ такси, кофе 5', 'two currency symbols around one amount'],
    ['250 р. кофе. 400 р. такси', 'abbreviation dots make sentence splitting unreliable']
  ])('%j → null (%s)', (text) => {
    expect(parseEntries(text)).toBeNull();
  });

  it('caps nothing itself: returns every entry so the caller can refuse more than MAX_ENTRIES', () => {
    const text = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => `кофе ${i + 1}`).join('\n');
    expect(parseEntries(text)).toHaveLength(MAX_ENTRIES + 1);
  });

  it('voice mode (runs) also splits alternating amounts without separators', () => {
    expect(parse('кофе 250 такси 400', { runs: true })).toEqual([[250, null, 'кофе', '-'], [400, null, 'такси', '-']]);
    expect(parse('250 кофе 400 такси 100 обед', { runs: true })).toEqual([[250, null, 'кофе', '-'], [400, null, 'такси', '-'], [100, null, 'обед', '-']]);
    // Неоднозначно и в голосе: число с двух сторон, количество, два числа подряд
    expect(parseEntries('250 кофе 400', { runs: true })).toBeNull();
    expect(parseEntries('кофе 2 шт 250', { runs: true })).toBeNull();
    expect(parseEntries('19 20', { runs: true })).toBeNull();
  });

  it('a part without an amount joins the next one as one description; a trailing one makes it ambiguous', () => {
    expect(parse('хлеб, молоко 300, такси 400')).toEqual([[300, null, 'хлеб, молоко', '-'], [400, null, 'такси', '-']]);
    expect(parse('Записываю траты за выходные, кофе 250, такси 400')).toEqual([[250, null, 'Записываю траты за выходные, кофе', '-'], [400, null, 'такси', '-']]);
    expect(parseEntries('кофе 250, такси 400, спасибо')).toBeNull();
  });

  it('voice drops a spoken intro without amounts', () => {
    expect(parse('Записываю траты за выходные, кофе 250, такси 400', { runs: true })).toEqual([[250, null, 'кофе', '-'], [400, null, 'такси', '-']]);
    // короткое «хлеб» — не вступление, а часть описания
    expect(parse('хлеб, молоко 300, такси 400', { runs: true })).toEqual([[300, null, 'хлеб, молоко', '-'], [400, null, 'такси', '-']]);
  });
});

describe('number words → digits (ru/en)', () => {
  it.each([
    ['двести пятьдесят рублей кофе', '250 рублей кофе'],
    ['кофе двести пятьдесят и такси четыреста', 'кофе 250 и такси 400'],
    ['полторы тысячи обед', '1500 обед'],
    ['две тысячи триста такси', '2300 такси'],
    ['тысяча двести', '1200'],
    ['сорок тысяч пятьсот', '40500'],
    ['три миллиона двести тысяч квартира', '3200000 квартира'],
    ['сто два', '102'],
    ['двадцать один', '21'],
    ['одна тысяча', '1000'],
    ['кофе за триста сорок пять', 'кофе за 345'],
    ['2 тысячи такси', '2000 такси'],
    ['1,5 тысячи такси', '1500 такси'],
    ['пятьсот тыс', '500000'],
    ['полтинник', '50'],
    ['одиннадцать тысяч', '11000'],
    ['two hundred and fifty coffee', '250 coffee'],
    ['one hundred twenty five dollars lunch', '125 dollars lunch'],
    ['a hundred bucks taxi', '100 bucks taxi'],
    ['fifteen hundred rent', '1500 rent'],
    ['twenty-five coffee', '25 coffee'],
    ['three thousand four hundred', '3400'],
    ['one million', '1000000']
  ])('%j → %j', (spoken, expected) => {
    expect(wordsToNumbers(spoken)).toBe(expected);
  });

  it('a word that cannot continue the number starts a new one', () => {
    expect(wordsToNumbers('два три')).toBe('2 3');
    expect(wordsToNumbers('девятнадцать двадцать')).toBe('19 20');
    expect(wordsToNumbers('пятьсот двести')).toBe('500 200');
  });

  it('a lone «один / one / a» is a word, not an amount; ordinary words stay untouched', () => {
    expect(wordsToNumbers('один капучино двести рублей')).toBe('один капучино 200 рублей');
    expect(wordsToNumbers('one coffee')).toBe('one coffee');
    expect(wordsToNumbers('a coffee')).toBe('a coffee');
    expect(wordsToNumbers('сотрудник стоматолог')).toBe('сотрудник стоматолог');
    expect(wordsToNumbers('Кофе 250, такси 400.')).toBe('Кофе 250, такси 400.');
  });

  it('prepares a transcript for parsing: plus → income, thousands separators, CJK spacing', () => {
    expect(normalizeSpokenText('плюс пятьдесят тысяч зарплата')).toBe('+50000 зарплата');
    expect(normalizeSpokenText('Coffee $1,500 and taxi 400.')).toBe('Coffee $1500 and taxi 400.');
    expect(normalizeSpokenText('Miete 1.200 Euro')).toBe('Miete 1200 Euro');
    expect(normalizeSpokenText('кофе 1,5 тысячи')).toBe('кофе 1500');
    expect(normalizeSpokenText('コーヒー250円とタクシー400円')).toBe('コーヒー 250 円 と タクシー 400 円');
  });

  it('spoken phrases end up as the right records', () => {
    const spoken = (text) => brief(parseEntries(normalizeSpokenText(text), { runs: true }));
    expect(spoken('кофе двести пятьдесят и такси четыреста')).toEqual([[250, null, 'кофе', '-'], [400, null, 'такси', '-']]);
    expect(spoken('Обед 600 рублей, продукты 1,5 тысячи.')).toEqual([[600, 'RUB', 'Обед', '-'], [1500, null, 'продукты', '-']]);
    expect(spoken('плюс 50 тысяч зарплата')).toEqual([[50000, null, 'зарплата', '+']]);
    expect(spoken('Coffee 5 dollars and lunch 12 dollars.')).toEqual([[5, 'USD', 'Coffee', '-'], [12, 'USD', 'lunch', '-']]);
    expect(spoken('咖啡250元和出租车400元')).toEqual([[250, 'CNY', '咖啡', '-'], [400, 'CNY', '出租车', '-']]);
    expect(spoken('просто привет')).toBeNull();
  });
});
