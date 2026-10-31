// Быстрый разбор частых вопросов без нейросети (ru/en): период, тип, валюта ответа, фильтр «на такси / on coffee /
// в магните». Работает, даже когда модель недоступна или занята. confident — вопрос разобран целиком (не осталось
// незнакомых слов): тогда модель не спрашиваем. Иначе нужна модель — «угадывать» по неполному разбору нельзя:
// незнакомое слово может менять смысл. unresolvedTime — в вопросе осталось слово про время, которое разбор не понял
// («за праздники»): такой вопрос нельзя молча посчитать за текущий месяц. words — оставшиеся незнакомые слова
// (их AssistantService пробует как поиск по описаниям, если модель назвала категорию, которой нет в вопросе).
// Возвращает сырое намерение в том же формате, что и модель (проверяет intent.js), или null.
const { addDays, addMonths, parseYmd, ymd, daysInMonth } = require('../../utils/period');
const { normalizeText } = require('./text');
const { monthNumber } = require('./intent');
const { weekStart } = require('./periods');

const L = '\\p{L}\\p{N}';
// Целые слова: \b в JS не работает с кириллицей
const word = (source, flags = 'u') => new RegExp(`(?<![${L}])(?:${source})(?![${L}])`, flags);

const RU_MONTH = 'январ\\p{L}*|феврал\\p{L}*|март\\p{L}*|апрел\\p{L}*|ма[йяе]|июн\\p{L}*|июл\\p{L}*|август\\p{L}*|сентябр\\p{L}*|октябр\\p{L}*|ноябр\\p{L}*|декабр\\p{L}*';
const EN_MONTH = 'january|february|march|april|may|june|july|august|september|sept|october|november|december';
const MONTH = `${RU_MONTH}|${EN_MONTH}`;
const THIS = '(?:этот|этом|эту|этой|текущий|текущем|текущую|текущей|нынешний|нынешнем)';
const LAST = '(?:прошлый|прошлом|прошлую|прошлой|предыдущий|предыдущем|предыдущую|предыдущей)';
const PRE = '(?:(?:в|во|за|на)\\s+)?';
const DATE = '\\d{1,2}[./]\\d{1,2}(?:[./]\\d{2,4})?';
const SKOLKO = '(?:сколько|скольк\\p{L}*|скок[ао]?|скока)';

// «за два месяца», «last two weeks»
const NUMBER_WORDS = {
  один: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  двенадцать: 12, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12
};
const NUM = `\\d{1,4}|${Object.keys(NUMBER_WORDS).join('|')}`;
const toCount = value => (/^\d+$/.test(value) ? Number(value) : NUMBER_WORDS[value]);

// Дни недели, 0 — понедельник
const WEEKDAY_FORMS = [
  'понедельн\\p{L}*|monday', 'вторн\\p{L}*|tuesday', 'сред[аыуе]|wednesday', 'четверг\\p{L}*|thursday',
  'пятниц\\p{L}*|friday', 'суббот\\p{L}*|saturday', 'воскресен\\p{L}*|sunday'
];
const WEEKDAY = WEEKDAY_FORMS.join('|');
const weekdayIndex = value => WEEKDAY_FORMS.findIndex(forms => new RegExp(`^(?:${forms})$`, 'u').test(value));
const EARLIER = /^(?:прошл|предыдущ|last|past|previous)/;

// Времена года: первый месяц
const SEASONS = [['лет[оа]м?|лете|summer', 6], ['осен\\p{L}*|autumn|fall', 9], ['зим\\p{L}*|winter', 12], ['весн\\p{L}*|spring', 3]];
const SEASON = SEASONS.map(([forms]) => forms).join('|');

// Валюта ответа: «в долларах», «in euros»
const CURRENCIES = [
  ['доллар\\p{L}*|бакс\\p{L}*|dollars?|usd', 'USD'], ['евро|euros?|eur', 'EUR'], ['рубл\\p{L}*|rubles?|roubles?|rub', 'RUB'],
  ['юан\\p{L}*|yuan|cny', 'CNY'], ['тенге|tenge|kzt', 'KZT'], ['лир[аеы]?|лирах|liras?', 'TRY'], ['лари|lari|gel', 'GEL'],
  ['рупи\\p{L}*|rupees?|inr', 'INR'], ['иен\\p{L}*|йен\\p{L}*|yen|jpy', 'JPY'], ['сумах|uzs', 'UZS'], ['батах|baht|thb', 'THB']
];
const CURRENCY = word(`(?:в|во|in)\\s+(${CURRENCIES.map(([forms]) => forms).join('|')})`);

// Слова о времени: если такое осталось неразобранным, период вопроса неизвестен
const TIME_HINT = word([
  'лет[оа]м?', 'лете', 'зим\\p{L}*', 'весн\\p{L}*', 'осен\\p{L}*', 'summer', 'winter', 'spring', 'autumn',
  'недел\\p{L}*', 'месяц\\p{L}*', 'год', 'года', 'году', 'годом', 'годы', 'дн[еяию]\\p{L}*', 'день', 'суток', 'сутки',
  'выходн\\p{L}*', 'будн\\p{L}*', 'weeks?', 'weekends?', 'months?', 'years?', 'days?', 'weekdays?', WEEKDAY,
  'праздник\\p{L}*', 'holidays?', 'каникул\\p{L}*', 'квартал\\p{L}*', 'quarters?', 'полгода', 'полугоди\\p{L}*',
  'вчер\\p{L}*', 'позавчер\\p{L}*', 'сегодн\\p{L}*', 'завтр\\p{L}*', 'today', 'yesterday', 'tomorrow', 'since', 'until',
  'начал\\p{L}*', 'конц\\p{L}*', 'середин\\p{L}*', 'beginning', 'период\\p{L}*', 'period', MONTH, '\\d{4}', DATE
].join('|'));

// Год для дат без года: если такая дата в этом году ещё не наступила — прошлый год
function withYear(day, month, year, today) {
  const t = parseYmd(today);
  let y = year || t.y;
  if (!year && ymd(y, month, Math.min(day, daysInMonth(y, month))) > today) y -= 1;
  return ymd(y, month, Math.min(day, daysInMonth(y, month)));
}

function numericDate(text, today) {
  const [d, m, y] = text.split(/[./]/).map(Number);
  if (!m || m > 12 || !d) return null;
  const year = y ? (y < 100 ? 2000 + y : y) : null;
  return withYear(d, m, year, today);
}

// Последний такой день недели не позже сегодня; earlier («в прошлый понедельник») — день прошлой календарной недели
function weekdayDate(today, index, earlier) {
  const thisWeek = addDays(weekStart(today), index);
  if (earlier) return addDays(thisWeek, -7);
  return thisWeek > today ? addDays(thisWeek, -7) : thisWeek;
}

// Время года: «за лето» — последнее начавшееся (в октябре — это лето), «прошлым летом» — последнее закончившееся,
// «этим летом» — этого года (ещё не началось — «период не наступил»). Зима — декабрь…февраль, год — по её концу
function seasonPeriod(startMonth, modifier, year, today) {
  const t = parseYmd(today);
  const range = (y) => {
    const s = startMonth === 12 ? { y: y - 1, m: 12 } : { y, m: startMonth };
    const e = addMonths(s.y, s.m, 2);
    return { kind: 'custom', from: ymd(s.y, s.m, 1), to: ymd(e.y, e.m, daysInMonth(e.y, e.m)) };
  };
  if (year) return range(year);
  let y = startMonth === 12 && t.m === 12 ? t.y + 1 : t.y;
  const current = /^(?:эт|this)/.test(modifier || '');
  if (!current && range(y).from > today) y -= 1;
  if (EARLIER.test(modifier || '') && range(y).to >= today) y -= 1;
  return range(y);
}

// Выходные (сб–вс): «прошлые» — прошлой недели, «эти» — этой (могут быть ещё впереди), без уточнения — последние
// начавшиеся
function weekendPeriod(today, modifier) {
  const saturday = addDays(weekStart(today), 5);
  let from = saturday;
  if (EARLIER.test(modifier || '') || (!modifier && saturday > today)) from = addDays(saturday, -7);
  return { kind: 'custom', from, to: addDays(from, 1) };
}

// Последние n месяцев до сегодня: за 3 месяца 28.10 — с 29.07
function lastMonthsPeriod(today, n) {
  const t = parseYmd(today);
  const s = addMonths(t.y, t.m, -n);
  return { kind: 'custom', from: addDays(ymd(s.y, s.m, Math.min(t.d, daysInMonth(s.y, s.m))), 1), to: today };
}

const PERIODS = [
  // «с 1 по 15 октября», «с 1 сентября по 15 октября 2026», «from 1 to 15 october»
  [word(`(?:с|from)\\s+(\\d{1,2})(?:\\s+(${MONTH}))?\\s+(?:по|до|to|till|until|-|–)\\s+(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => {
      const year = m[5] ? Number(m[5]) : null;
      const endMonth = monthNumber(m[4]);
      const startMonth = m[2] ? monthNumber(m[2]) : endMonth;
      const to = withYear(Number(m[3]), endMonth, year, today);
      const toYear = parseYmd(to).y;
      const from = withYear(Number(m[1]), startMonth, startMonth > endMonth ? toYear - 1 : toYear, today);
      return { kind: 'custom', from, to };
    }],
  // «from october 1 to 15»
  [word(`from\\s+(${EN_MONTH})\\s+(\\d{1,2})\\s+(?:to|till|until|-)\\s+(?:(${EN_MONTH})\\s+)?(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => {
      const year = m[5] ? Number(m[5]) : null;
      const startMonth = monthNumber(m[1]);
      const endMonth = m[3] ? monthNumber(m[3]) : startMonth;
      const to = withYear(Number(m[4]), endMonth, year, today);
      const from = withYear(Number(m[2]), startMonth, startMonth > endMonth ? parseYmd(to).y - 1 : parseYmd(to).y, today);
      return { kind: 'custom', from, to };
    }],
  // «с 01.10 по 15.10», «01.10.2026 - 15.10.2026»
  [word(`(?:(?:с|from)\\s+)?(${DATE})\\s*(?:по|до|to|-|–)\\s*(${DATE})`),
    (m, today) => ({ kind: 'custom', from: numericDate(m[1], today), to: numericDate(m[2], today) })],
  // «с 1 октября», «since october 1», «с 01.10», «с сентября» — от даты до сегодня
  [word(`(?:since|starting|с|начиная\\s+с)\\s+(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => ({ kind: 'custom', from: withYear(Number(m[1]), monthNumber(m[2]), m[3] ? Number(m[3]) : null, today), to: today })],
  [word(`(?:since|starting)\\s+(${EN_MONTH})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => ({ kind: 'custom', from: withYear(Number(m[2]), monthNumber(m[1]), m[3] ? Number(m[3]) : null, today), to: today })],
  [word(`(?:since|starting|с|начиная\\s+с)\\s+(${DATE})`), (m, today) => ({ kind: 'custom', from: numericDate(m[1], today), to: today })],
  // «с начала месяца / недели / года», «since the start of the month» — этот период до сегодня
  [word('(?:с|начиная\\s+с)\\s+начала\\s+(месяца|недели|года)|since\\s+the\\s+(?:start|beginning)\\s+of\\s+(?:the|this)\\s+(month|week|year)'),
    (m) => ({ kind: { месяца: 'month', недели: 'week', года: 'year' }[m[1]] || m[2], offset: 0 })],
  // «с 20 числа», «с 5-го», «since the 15th» — от этого числа текущего месяца (ещё не наступило — прошлого)
  [word('(?:since|starting|from|с|начиная\\s+с)\\s+(?:the\\s+)?(\\d{1,2})(?:-?(?:го|ого)(?:\\s+числа)?|\\s+числа|st|nd|rd|th)'),
    (m, today) => {
      const t = parseYmd(today);
      const day = Number(m[1]);
      const month = day > t.d ? addMonths(t.y, t.m, -1) : { y: t.y, m: t.m };
      return { kind: 'custom', from: ymd(month.y, month.m, Math.min(day, daysInMonth(month.y, month.m))), to: today };
    }],
  // только родительный падеж: «сравни сентябрь с августом» — это не «с августа»
  [word(`(?:since|starting)\\s+(?:the\\s+start\\s+of\\s+)?(${EN_MONTH})(?:\\s+(\\d{4}))?|(?:с|начиная\\s+с)\\s+(?:начала\\s+)?(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\\s+(\\d{4}))?`),
    (m, today) => {
      const year = m[2] || m[4];
      return { kind: 'custom', from: withYear(1, monthNumber(m[1] || m[3]), year ? Number(year) : null, today), to: today };
    }],
  // «с понедельника», «since monday», «с прошлой пятницы»
  [word(`(?:since|starting|с|начиная\\s+с)\\s+(?:(прошл\\p{L}*|last)\\s+)?(${WEEKDAY})`),
    (m, today) => ({ kind: 'custom', from: weekdayDate(today, weekdayIndex(m[2]), !!m[1]), to: today })],
  // «за лето», «прошлой зимой», «this summer», «летом 2025»
  [word(`(?:(?:за|в|во|на|in|for|during|over)\\s+)?(?:(?:the\\s+)?(этим|этой|это|эту|эта|this|прошлым|прошлой|прошлое|прошлую|прошлая|прошлый|last|past|previous)\\s+)?(${SEASON})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => {
      const startMonth = SEASONS.find(([forms]) => new RegExp(`^(?:${forms})$`, 'u').test(m[2]))[1];
      return seasonPeriod(startMonth, m[1], m[3] ? Number(m[3]) : null, today);
    }],
  // «5 октября», «october 5»
  [word(`(?:(?:за|on)\\s+)?(\\d{1,2})\\s+(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m, today) => {
      const day = withYear(Number(m[1]), monthNumber(m[2]), m[3] ? Number(m[3]) : null, today);
      return { kind: 'custom', from: day, to: day };
    }],
  [word(`(?:on\\s+)?(${EN_MONTH})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`),
    (m, today) => {
      const day = withYear(Number(m[2]), monthNumber(m[1]), m[3] ? Number(m[3]) : null, today);
      return { kind: 'custom', from: day, to: day };
    }],
  [word(`(?:(?:за|on)\\s+)?(${DATE})`), (m, today) => {
    const day = numericDate(m[1], today);
    return { kind: 'custom', from: day, to: day };
  }],
  // «в сентябре», «за август 2025», «in september»
  [word(`(?:(?:в|во|за|in|for|during)\\s+)?(${MONTH})(?:\\s+(\\d{4}))?(?:\\s+года?)?`),
    (m) => ({ kind: 'named_month', month: monthNumber(m[1]), year: m[2] ? Number(m[2]) : null })],
  // «в 2025 году», «in 2025»
  [word('(?:в|во|за|in|for|during)\\s+(20\\d{2})(?:\\s+(?:году|год|года|г))?'),
    (m) => ({ kind: 'custom', from: `${m[1]}-01-01`, to: `${m[1]}-12-31` })],
  // «в прошлые выходные», «на выходных», «last weekend»
  [word('(?:(?:в|на|за|over|on)\\s+)?(?:(?:the\\s+)?(прошл\\p{L}*|эти|этих|last|this|past|previous)\\s+)?(?:выходн\\p{L}*|weekend)'),
    (m, today) => weekendPeriod(today, m[1])],
  // «в понедельник», «в прошлую пятницу», «on monday», «last friday»
  [word(`(?:(?:в|во|on)\\s+)?(?:(прошл\\p{L}*|last|previous)\\s+)?(${WEEKDAY})|(?:в|во|on)\\s+(${WEEKDAY})`),
    (m, today) => {
      const day = weekdayDate(today, weekdayIndex(m[2] || m[3]), !!m[1]);
      return { kind: 'custom', from: day, to: day };
    }],
  [word('(?:за\\s+)?позавчера|day before yesterday'), () => ({ kind: 'day', offset: -2 })],
  [word('(?:за\\s+)?сегодня|today'), () => ({ kind: 'day', offset: 0 })],
  [word('(?:за\\s+)?вчера|yesterday'), () => ({ kind: 'day', offset: -1 })],
  // «за 3 месяца», «за последние два месяца», «за последний месяц», «за полгода», «last 3 months»
  [word(`за\\s+(?:последние\\s+)?(${NUM})\\s+месяц\\p{L}*|(?:in\\s+|over\\s+|for\\s+)?(?:the\\s+)?(?:last|past)\\s+(${NUM})\\s+months?`),
    (m, today) => lastMonthsPeriod(today, toCount(m[1] || m[2]))],
  [word('за\\s+последн\\p{L}*\\s+месяц|(?:in\\s+|over\\s+)?(?:the\\s+)?past\\s+month'), (m, today) => lastMonthsPeriod(today, 1)],
  [word('за\\s+(?:последние\\s+)?полгода|(?:in\\s+|over\\s+)?(?:the\\s+)?(?:last|past)\\s+half\\s+(?:a\\s+)?year'), (m, today) => lastMonthsPeriod(today, 6)],
  // «за 2 недели», «last two weeks»
  [word(`за\\s+(?:последние\\s+)?(${NUM})\\s+недел\\p{L}*|(?:in\\s+|over\\s+|for\\s+)?(?:the\\s+)?(?:last|past)\\s+(${NUM})\\s+weeks?`),
    (m) => ({ kind: 'last_n_days', n: 7 * toCount(m[1] || m[2]) })],
  [word(`${PRE}${THIS}\\s+недел\\p{L}*|this week|current week`), () => ({ kind: 'week', offset: 0 })],
  [word(`${PRE}${LAST}\\s+недел\\p{L}*|last week|previous week`), () => ({ kind: 'week', offset: -1 })],
  [word(`за\\s+(?:последние\\s+)?(${NUM})\\s+(?:дн\\p{L}*|день|суток)|(?:in\\s+|over\\s+|for\\s+)?(?:the\\s+)?(?:last|past)\\s+(${NUM})\\s+days?`),
    (m) => ({ kind: 'last_n_days', n: toCount(m[1] || m[2]) })],
  [word('за\\s+(?:последнюю\\s+)?неделю|(?:in\\s+)?(?:the\\s+)?past week|(?:in\\s+)?(?:the\\s+)?last 7 days|за неделю'), () => ({ kind: 'last_n_days', n: 7 })],
  [word(`${PRE}позапрошл\\p{L}*\\s+месяц\\p{L}*|month before last`), () => ({ kind: 'month', offset: -2 })],
  [word(`${PRE}${THIS}\\s+(?:месяц\\p{L}*|период\\p{L}*)|this month|current month|this period|за месяц`), () => ({ kind: 'month', offset: 0 })],
  [word(`${PRE}${LAST}\\s+(?:месяц\\p{L}*|период\\p{L}*)|last month|previous month|last period`), () => ({ kind: 'month', offset: -1 })],
  [word(`${PRE}позапрошл\\p{L}*\\s+год\\p{L}*|year before last`), () => ({ kind: 'year', offset: -2 })],
  [word(`${PRE}${THIS}\\s+год\\p{L}*|this year|за год`), () => ({ kind: 'year', offset: 0 })],
  [word(`${PRE}${LAST}\\s+год\\p{L}*|last year|previous year`), () => ({ kind: 'year', offset: -1 })],
  [word('за\\s+вс[её]\\s+время|за\\s+всю\\s+историю|(?:of\\s+)?all\\s+time|ever'), () => ({ kind: 'all' })]
];

// Порядок важен: «сколько осталось в бюджете» — бюджет, а не остаток; «в среднем» раньше «сколько потратил».
// Третий элемент — значения по умолчанию («что я купил» — список до 10 трат)
const TO_END = '(?:\\s+(?:к|до)\\s+(?:конц[уа]\\s+(?:месяца|периода)|зарплат\\p{L}*|зп|получк\\p{L}*|аванс\\p{L}*|стипенди\\p{L}*))?';
const EN_TO_END = '(?:\\s+(?:until|till|to|for|by|at)\\s+(?:payday|(?:my\\s+)?next\\s+paycheck|the\\s+end\\s+of\\s+(?:the\\s+)?month))?';
const TYPES = [
  // Прогноз первым: «хватит ли денег до зарплаты» — не доход, хотя в нём есть «зарплата»
  ['forecast', word([
    `(?:хватит|хватает)(?:\\s+ли)?(?:\\s+(?:мне|у\\s+меня|денег|средств))*${TO_END}`,
    `дотян\\p{L}*(?:\\s+ли)?${TO_END}`,
    `прогноз\\p{L}*(?:\\s+(?:трат|расходов|на\\s+месяц))?${TO_END}`,
    `${SKOLKO}\\s+(?:я\\s+)?(?:ещ[её]\\s+)?(?:потрачу|уйд[её]т|потратится)${TO_END}`,
    `(?:что|сколько)\\s+(?:у\\s+меня\\s+)?останется${TO_END}`,
    `will\\s+i\\s+have\\s+enough(?:\\s+money)?${EN_TO_END}`,
    `(?:spending\\s+)?forecast|projection`,
    `how\\s+much\\s+will\\s+i\\s+(?:spend|have\\s+left)${EN_TO_END}`,
    `can\\s+i\\s+make\\s+it${EN_TO_END}`
  ].join('|'))],
  // «Верни 13%» (только ru): «сколько я могу вернуть налога», «вычет за лечение», «ндфл с вкладов». Раньше «получил»
  // дохода и «заплатил» трат: «сколько налога я получу назад» — не доход
  ['tax_refund', word('(?:налогов\\p{L}*\\s+)?вычет\\p{L}*|ндфл|налог\\p{L}*|верн\\p{L}*\\s+13\\s*%|13\\s*%')],
  ['subscriptions', word('подписк\\p{L}*|subscriptions?')],
  ['debt_status', word(`(?:${SKOLKO}\\s+)?(?:я\\s+)?(?:ещ[её]\\s+)?(?:должен|должна|задолжал\\p{L}*)|долг\\p{L}*|кредит\\p{L}*|ипотек\\p{L}*|займ\\p{L}*|рассрочк\\p{L}*|debts?|owe|loans?|mortgage|credit\\s+cards?`)],
  ['compare_periods', word('сравни\\p{L}*|сравнение|по\\s+сравнению\\s+с|compare\\p{L}*|comparison|vs|versus|насколько\\s+(?:больше|меньше)|больше\\s+чем|меньше\\s+чем|more\\s+than|less\\s+than')],
  ['count_records', word(`${SKOLKO}\\s+(?:было\\s+)?(?:раз|записей|трат|покупок)|how\\s+many\\s+(?:times|expenses|purchases|records)|(?:число|количество)\\s+(?:трат|записей|покупок)`)],
  ['top_expenses', word('что\\s+(?:я\\s+)?(?:купил\\p{L}*|покупал\\p{L}*)|what\\s+(?:did\\s+)?i\\s+(?:buy|bought)'), { limit: 10 }],
  ['top_expenses', word('(?:топ|top)[\\s-]*(\\d{1,2})?(?:\\s+(?:самых\\s+)?(?:крупных|больших|дорогих))?(?:\\s+(?:трат|покупок|расходов|expenses|purchases))?|(\\d{1,2})\\s+(?:самых\\s+)?(?:крупных|больших|дорогих)\\s+(?:трат|покупок|расходов)|(?:самые|самых)\\s+(?:крупные|большие|дорогие|крупных|больших|дорогих)\\s+(?:траты|покупки|расходы|трат|покупок)|(?:biggest|largest)\\s+(\\d{1,2})?\\s*(?:expenses|purchases)')],
  ['largest_purchase', word('(?:сама[яю]|самой)\\s+(?:крупн|больш|дорог)\\p{L}*\\s+(?:трат|покупк)\\p{L}*|(?:biggest|largest|most expensive)\\s+(?:expense|purchase)')],
  ['budget_status', word('бюджет\\p{L}*|лимит\\p{L}*|budgets?')],
  ['average_daily', word('(?:в\\s+среднем|средн\\p{L}*)(?:\\s+(?:трат\\p{L}*\\s+)?(?:в|за)\\s+день)?|в\\s+день|per\\s+day|a\\s+day|daily\\s+average|(?:on\\s+)?average(?:\\s+(?:daily|per\\s+day))?')],
  ['spend_by_category', word('по\\s+категориям|by\\s+categor\\p{L}*|(?:на\\s+что|где)\\s+(?:я\\s+)?(?:больше\\s+всего\\s+)?(?:трачу|тратил\\p{L}*|потратил\\p{L}*|ушли|уходят|ушло|уходит)(?:\\s+больше\\s+всего)?(?:\\s+денег|\\s+деньги)?|куда\\s+(?:ушли|уходят|ушло|делись)(?:\\s+(?:все\\s+)?деньги)?|what\\s+did\\s+i\\s+spend\\s+(?:the\\s+)?most\\s+on|where\\s+did\\s+(?:all\\s+)?(?:my\\s+)?money\\s+go|(?:top|main)\\s+categor\\p{L}*')],
  ['income_total', word('доход\\p{L}*|заработ\\p{L}*|зарплат\\p{L}*|получил\\p{L}*|income\\p{L}*|earn\\p{L}*|salary|got\\s+paid')],
  ['savings_status', word('накоп\\p{L}*|сбереж\\p{L}*|копил\\p{L}*|копилк\\p{L}*|отложил\\p{L}*|цел[иьей]\\p{L}*|savings?|saved|goals?')],
  ['balance', word('остат\\p{L}*|баланс\\p{L}*|сколько\\s+(?:у\\s+меня\\s+)?осталось|сэкономил\\p{L}*|в\\s+плюсе|в\\s+минусе|in\\s+the\\s+(?:plus|black|red)|balance|left\\s+over|how\\s+much\\s+(?:do\\s+i\\s+have\\s+)?left')],
  // «сколько стоил ноутбук» — цена покупки: без периода ищем за всё время
  ['spend_total', word(`${SKOLKO}\\s+(?:мне\\s+)?(?:стоил\\p{L}*|обош[её]л\\p{L}*|обошл\\p{L}*)|how\\s+much\\s+(?:did|was)\\s+(?:the|my)\\b`), { period: { kind: 'all' } }],
  ['spend_total', word(`${SKOLKO}\\s+(?:я\\s+)?(?:всего\\s+)?(?:потратил\\p{L}*|трачу|тратил\\p{L}*|ушло|ушли|уходит|отдал\\p{L}*|заплатил\\p{L}*|плачу|прокутил\\p{L}*|спустил\\p{L}*|просадил\\p{L}*|прогулял\\p{L}*)|${SKOLKO}(?=\\s+(?:на|за|в|во)\\s)|how\\s+much\\s+(?:did|have|do)\\s+i\\s+(?:spend|spent|pay|paid|blow|blew|blown)|how\\s+much\\s+i\\s+(?:spent|paid)|how\\s+much(?=\\s+(?:on|for)\\s)|(?:total\\s+)?(?:траты|расходы|потрачено|spending|expenses)`)]
];
// Типы, у которых слово без предлога («сколько раз я брал такси») — это поиск по описаниям
const SEARCH_TYPES = new Set(['spend_total', 'count_records', 'top_expenses', 'largest_purchase', 'average_daily']);
// Сравнение с прошлым периодом: «больше, чем в прошлом месяце» — этот месяц с прошлым
const PREVIOUS_TO_CURRENT = { day: true, week: true, month: true, year: true };
// «в неделю», «в месяц», «per week», «monthly» — средняя трата за неделю/месяц
const PER = word('(?:в|per|a|each)\\s+(недел[юи]|week|месяц|month)|(weekly|monthly|еженедельно|ежемесячно)');
// Средняя в неделю/месяц без названного периода — за последние 90 дней (около трёх месяцев)
const PER_DEFAULT_DAYS = 90;

// Остатки «сравни этот месяц с прошлым»
const COMPARE_TAIL = word('(?:с|and|with)\\s+(?:прошлым|предыдущим|previous|last(?:\\s+one)?)(?:\\s+(?:месяцем|периодом|неделей|годом|month|week|year))?');
// Связка перед вторым периодом сравнения: «октябрь и сентябрь», «october with september», «чем в сентябре»
const COMPARE_JOIN = word('и|с|со|чем|and|with|vs|versus|to|than');
// Слова-связки и глаголы «потратил», не меняющие смысла вопроса
const NOISE = word([
  SKOLKO, 'потратил\\p{L}*', 'трачу', 'тратил\\p{L}*', 'потрачено', 'ушло', 'ушли', 'уходит', 'я', 'мне', 'меня', 'мой', 'мои',
  'у', 'всего', 'вообще', 'было', 'ли', 'ну', 'же', 'пожалуйста', 'скажи', 'покажи', 'подскажи', 'бот', 'а', 'и', 'в', 'за',
  'денег', 'деньги', 'трат', 'траты', 'how', 'much', 'many', 'did', 'do', 'does', 'i', 'my', 'me', 'in', 'the', 'total',
  'please', 'show', 'tell', 'what', 'was', 'is', 'are', 'have', 'has', 'money', 'spend', 'spent', 'spending', 'so', 'far',
  'mine', 'all', 'of', 'на', 'on', 'for', 'больше', 'всего', 'most', 'какой', 'какая', 'какие', 'каков', 'какова', 'осталось',
  'left', 'whats', 's', 'it', 'now', 'сейчас', 'там', 'currently', 'current', 'типа', 'короче', 'вот', 'по', 'am', 'a', 'an',
  'брал\\p{L}*', 'взял\\p{L}*', 'ездил\\p{L}*', 'покупал\\p{L}*', 'купил\\p{L}*', 'заказывал\\p{L}*', 'заказал\\p{L}*',
  'ходил\\p{L}*', 'платил\\p{L}*', 'заплатил\\p{L}*', 'take', 'took', 'buy', 'bought', 'order', 'ordered', 'get', 'got',
  'pay', 'paid', 'укладыва\\p{L}*', 'within', 'стоил\\p{L}*', 'обошл\\p{L}*', 'cost', 'утром', 'вечером', 'ночью', 'днем'
].join('|'), 'gu');

const FILTER_CATEGORY = word(`(?:в\\s+категори\\p{L}*|(?:in|for)\\s+(?:the\\s+)?categor\\p{L}*)\\s+([${L}][${L}\\s-]{0,40})$`);
const FILTER = word(`(?:на|за|в|во|on|for|at|in)\\s+([${L}][${L}\\s-]{0,40})$`);
const FILTER_SPLIT = /\s+(?:и|или|and|or)\s+/u;
const MAX_FILTER_WORDS = 3;
const MAX_FILTERS = 3;

function take(text, regex) {
  const match = text.match(regex);
  if (!match) return null;
  return { match, rest: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`.replace(/\s+/g, ' ').trim() };
}

function takePeriod(text, today) {
  for (const [regex, build] of PERIODS) {
    const found = take(text, regex);
    if (found) return { period: build(found.match, today), rest: found.rest };
  }
  return null;
}

function cleanQuestion(text) {
  return normalizeText(text)
    .replace(/^\/ask(?:@\w+)?\s*/, '')
    .replace(/^[?？¿\s]+/, '')
    .replace(/[?？!.…,;:\s]+$/, '')
    .replace(/[«»"“”]/g, '')
    .replace(/\s*,\s*/g, ' ');
}

const withoutNoise = text => text.replace(NOISE, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Связки по краям фильтра — не часть искомого: «на лекарства вообще» → «лекарства»
function trimNoise(phrase) {
  const words = phrase.split(' ');
  while (words.length && !withoutNoise(words[words.length - 1])) words.pop();
  while (words.length && !withoutNoise(words[0])) words.shift();
  return words.join(' ');
}

// today — локальная дата пользователя 'YYYY-MM-DD'; lang — язык пользователя: tax_refund понимается только на ru.
// Ответ tax_refund не зависит от остальных слов вопроса («за лечение», «могу») — он уверенный и с ними
function parseFastPath(question, { today, lang = null }) {
  let text = cleanQuestion(question);
  if (!text) return null;

  let period = null;
  const first = takePeriod(text, today);
  if (first) {
    period = first.period;
    text = first.rest;
  }

  let currency = null;
  const money = take(text, CURRENCY);
  if (money) {
    currency = CURRENCIES.find(([forms]) => new RegExp(`^(?:${forms})$`, 'u').test(money.match[1]))[1];
    text = money.rest;
  }

  let per = null;
  const perMatch = take(text, PER);
  if (perMatch) {
    per = /недел|week/u.test(perMatch.match[0]) ? 'week' : 'month';
    text = perMatch.rest;
  }

  let type = null;
  let limit = null;
  for (const [candidate, regex, defaults = {}] of TYPES) {
    if (candidate === 'tax_refund' && lang !== 'ru') continue;
    const found = take(text, regex);
    if (!found) continue;
    type = candidate;
    text = found.rest;
    if (candidate === 'top_expenses') {
      const n = found.match.slice(1).find(Boolean);
      limit = n ? Number(n) : (defaults.limit || null);
    }
    if (defaults.period && !period) period = defaults.period;
    // «per day … on average» — оба куска про одно и то же
    for (let again = take(text, regex); again; again = take(text, regex)) text = again.rest;
    break;
  }
  // «сколько уходит на транспорт в неделю», «в среднем в месяц» — средняя за неделю/месяц
  if (per && (!type || type === 'spend_total' || type === 'average_daily')) {
    type = 'average_daily';
    if (!period) period = { kind: 'last_n_days', n: PER_DEFAULT_DAYS };
  } else {
    per = null;
  }

  let compareTo = null;
  if (type === 'compare_periods') {
    const tail = take(text, COMPARE_TAIL);
    if (tail) text = tail.rest;
    // второй названный период: «октябрь и сентябрь», «в октябре чем в сентябре»
    const second = period && takePeriod(text, today);
    if (second) {
      compareTo = second.period;
      text = second.rest;
      for (let join = take(text, COMPARE_JOIN); join; join = take(text, COMPARE_JOIN)) text = join.rest;
    } else if (period && PREVIOUS_TO_CURRENT[period.kind] && period.offset === -1 && !tail) {
      // «больше, чем в прошлом месяце» — этот месяц с прошлым (к этому же дню)
      period = { kind: period.kind, offset: 0 };
    }
  }

  const categories = [];
  const filters = [];
  let tooLong = false;
  let unresolvedTime = false;
  const byCategory = take(text, FILTER_CATEGORY);
  const filter = byCategory || take(text, FILTER);
  if (filter) {
    const parts = filter.match[1].trim().split(FILTER_SPLIT).map(part => trimNoise(part.trim())).filter(Boolean);
    if (parts.some(part => TIME_HINT.test(part))) {
      unresolvedTime = true; // «за праздники» — не поиск, а период, которого разбор не знает
    } else if (parts.length > MAX_FILTERS || parts.some(part => part.split(' ').length > MAX_FILTER_WORDS)) {
      tooLong = true;
    } else {
      (byCategory ? categories : filters).push(...parts);
      text = filter.rest;
    }
  }

  let leftover = withoutNoise(text);
  if (leftover && TIME_HINT.test(leftover)) unresolvedTime = true;
  // «сколько раз я брал такси», «how many times did i take a taxi» — оставшееся слово и есть поиск
  if (leftover && !unresolvedTime && !tooLong && !filters.length && !categories.length && SEARCH_TYPES.has(type)
    && leftover.split(' ').length <= MAX_FILTER_WORDS) {
    filters.push(leftover);
    leftover = '';
  }
  if (!type && !period && !filters.length && !categories.length && !unresolvedTime) return null;
  const words = leftover ? leftover.split(' ').filter(w => !TIME_HINT.test(w)) : [];
  return {
    // Разобран целиком — модель не нужна
    confident: !!type && (!leftover || type === 'tax_refund') && !tooLong && !unresolvedTime,
    unresolvedTime,
    words,
    intent: {
      type: type || 'spend_total',
      period,
      compare_to: compareTo,
      categories,
      text_filter: filters.length > 1 ? filters : (filters[0] || null),
      limit,
      currency,
      per
    }
  };
}

module.exports = { parseFastPath, cleanQuestion };
