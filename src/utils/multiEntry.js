const { SUPPORTED_CURRENCIES } = require('../config/currencies');

// Несколько записей в одном сообщении: «кофе 250, такси 400», по строке на запись, «250 кофе и 400 такси»,
// доходы с «+». Правила суммы — как у одиночного ввода (EnhancedValidator.parseMoneyInput): тысячи через пробел,
// дробная часть через точку или запятую (1–2 знака), валюта — символ или код сразу после суммы (символ — и перед ней).
//
// Разбор осторожный: сообщение делится по разделителям сверху вниз (строки → «;» и концы предложений → запятые →
// «и»/«and»), и деление на уровне принимается, только если КАЖДАЯ часть — ровно одна запись с описанием. Иначе
// часть разбирается целиком, а неоднозначная часть («500 300 такси», «2 кг яблок», сумма с двух сторон описания,
// несколько чисел без разделителей) делает неоднозначным всё сообщение — тогда null, и работает обычный ввод.

const MAX_ENTRIES = 20;
const INTRO_WORDS = 3; // голос: вступление без сумм в начале от стольких слов отбрасывается

const SYMBOLS = { '$': 'USD', '€': 'EUR', '₽': 'RUB', '₸': 'KZT', '₾': 'GEL', '₺': 'TRY', '₹': 'INR', '฿': 'THB', '¥': 'JPY' };

// Валюта словом сразу после суммы («250 руб», «20 долларов»); в нижнем регистре, ё → е
const CURRENCY_WORDS = {
  RUB: ['р', 'р.', 'руб', 'руб.', 'рубль', 'рубля', 'рублей', 'рублика', 'рубликов', 'ruble', 'rubles', 'rouble', 'roubles'],
  USD: ['доллар', 'доллара', 'долларов', 'долл', 'долл.', 'бакс', 'бакса', 'баксов', 'dollar', 'dollars', 'buck', 'bucks'],
  EUR: ['евро', 'euro', 'euros'],
  KZT: ['тенге', 'тг', 'tenge'],
  UZS: ['сум', 'сума', 'сумов', "so'm", 'som', 'soum'],
  GEL: ['лари', 'lari'],
  TRY: ['лира', 'лиры', 'лир', 'lira', 'liras', 'lirasi'],
  JPY: ['иена', 'иены', 'иен', 'йена', 'йены', 'йен', 'yen', '円'],
  CNY: ['юань', 'юаня', 'юаней', 'yuan', '元', '块'],
  INR: ['рупия', 'рупии', 'рупий', 'rupee', 'rupees'],
  THB: ['бат', 'бата', 'батов', 'baht']
};
const CURRENCY_BY_WORD = new Map();
for (const [code, words] of Object.entries(CURRENCY_WORDS)) {
  for (const word of words) CURRENCY_BY_WORD.set(word, code);
}

// Слово сразу после числа, с которым число — количество, а не сумма: «2 кг яблок», «3 шт», «5 раз»
const UNIT_WORDS = new Set([
  'шт', 'шт.', 'штук', 'штуки', 'штука', 'кг', 'г', 'г.', 'гр', 'гр.', 'грамм', 'граммов', 'л', 'л.', 'литр', 'литра', 'литров',
  'мл', 'км', 'м', 'см', 'раз', 'раза', 'человек', 'чел', 'чел.', 'порции', 'порций', 'порция', 'мин', 'минут', 'час', 'часа',
  'часов', 'день', 'дня', 'дней', 'год', 'года', 'лет', 'x', 'х', '%', 'процентов', 'процента',
  'pcs', 'pc', 'kg', 'g', 'l', 'ml', 'km', 'times', 'people', 'persons', 'min', 'hours', 'hour', 'days', 'day', 'years', 'year', 'percent'
]);

// Служебные слова на краях описания: «обед за 600» → «обед», «на такси 400» → «такси», «Kaffee für 5» → «Kaffee»
const EDGE_STOPWORDS = new Set([
  'за', 'на', 'и', 'а', 'ещё', 'еще', 'for', 'on', 'and', 'für', 'und', 'por', 'para', 'y', 'pour', 'et', 'e', 'için', 've', 'uchun', 'va'
]);

// Сумма как в одиночном вводе. Перед числом нельзя букву, цифру, «-» (отрицательное) — иначе это не сумма;
// после — букву/цифру, «-слово» («7-eleven») и третью цифру дроби. Слитно можно символ валюты и «р»/«руб»/«тг» («250р»).
const NUMBER_RE = new RegExp(
  '(?<![\\p{L}\\p{N}_.,+\\-−])' +
  '(\\+\\s?)?' +
  '([$€₽₸₾₺₹฿¥])?' +
  '(\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})+|\\d+)' +
  '([.,]\\d{1,2})?' +
  '(?:([$€₽₸₾₺₹฿¥])|(руб|р|тг)(?![\\p{L}\\p{N}_])\\.?)?' +
  '(?![\\p{L}\\p{N}_]|[.,]\\d|-[\\p{L}\\p{N}])',
  'giu'
);

// Число, которое разбор суммы не взял («1,500», «-250», «12.345», «250рублей»): описание с ним — признак ошибки разбора.
// «7-eleven» — название, не число
const STRAY_NUMBER_RE = /(?<![\p{L}\p{N}])[+\-−]?\d(?!\d*-\p{L})/u;

// Уровни разделителей, сверху вниз (с китайской и японской пунктуацией)
const SPLITTERS = [
  /\s*(?:\r?\n)+\s*/,
  /\s*[;；]\s*|(?<=\S)[.!?…]+(?=\s|$)\s*|\s*[。！？]\s*/,
  /\s*,(?!\d)\s*|(?<!\d)\s*,\s*|\s*[，、]\s*/,
  /\s+(?:и|а также|and|&|und|y|et|e|ve|და|және|va|और|と|和)\s+/i
];
const HARD_SEPARATOR_RE = /[\n;；。！？，、]|[.!?…](?=\s|$)|,(?!\d)|(?<!\d),/;

function lower(word) {
  return word.toLowerCase().replace(/ё/g, 'е');
}

function resolveCurrencyWord(word) {
  if (!word) return null;
  if (SYMBOLS[word]) return SYMBOLS[word];
  const code = word.toUpperCase();
  if (/^[A-Z]{3}$/.test(code) && SUPPORTED_CURRENCIES.includes(code)) return code;
  return CURRENCY_BY_WORD.get(lower(word)) || null;
}

function toAmount(integerPart, fraction) {
  return parseFloat(integerPart.replace(/[ \u00a0\u202f]/g, '') + (fraction || '').replace(',', '.'));
}

// Обрезка краёв описания: пробелы, тире, двоеточия, знаки препинания и служебные слова
function cleanDescription(text) {
  let words = text.replace(/^[\s,.;:!?…—–-]+|[\s,.;:!?…—–-]+$/gu, '').split(/\s+/).filter(Boolean);
  while (words.length && EDGE_STOPWORDS.has(lower(words[0]))) words = words.slice(1);
  while (words.length && EDGE_STOPWORDS.has(lower(words[words.length - 1]))) words = words.slice(0, -1);
  return words.join(' ').replace(/^[\s,.;:!?…—–-]+|[\s,.;:!?…—–-]+$/gu, '');
}

// Числа фрагмента с валютой: символ до/после, затем код или слово валюты отдельным словом
function findNumbers(text) {
  const numbers = [];
  NUMBER_RE.lastIndex = 0;
  let match;
  while ((match = NUMBER_RE.exec(text))) {
    const [whole, plus, symbolBefore, integerPart, fraction, symbolAfter, attachedWord] = match;
    if (symbolBefore && (symbolAfter || attachedWord)) return null;
    let end = match.index + whole.length;
    let currency = SYMBOLS[symbolBefore || symbolAfter] || (attachedWord ? resolveCurrencyWord(attachedWord) : null);
    if (!currency) {
      // «р.», «руб.», «долл.» есть в словаре с точкой; у остальных слов точка — конец предложения
      const next = text.slice(end).match(/^\s+([\p{L}$€₽₸₾₺₹฿¥'.]+)/u);
      if (next) {
        const word = resolveCurrencyWord(next[1]) ? next[1] : next[1].replace(/\.+$/, '');
        currency = resolveCurrencyWord(word);
        if (currency) end += next[0].length - (next[1].length - word.length);
      }
    }
    numbers.push({ start: match.index, end, amount: toAmount(integerPart, fraction), currency, income: Boolean(plus) });
    NUMBER_RE.lastIndex = end;
  }
  return numbers;
}

function startsWithUnit(text) {
  const first = text.trim().split(/\s+/)[0];
  return Boolean(first) && UNIT_WORDS.has(lower(first));
}

function entry(number, description) {
  return {
    amount: number.amount,
    currency: number.currency,
    description: description || null,
    kind: number.income ? 'income' : 'expense'
  };
}

// Фрагмент без деления: одна запись (сумма в начале или в конце), или в голосовом режиме (runs) — чередование
// «описание сумма описание сумма…» / «сумма описание сумма описание…» без разделителей. null — неоднозначно.
function parseLeaf(text, { runs = false } = {}) {
  const numbers = findNumbers(text);
  if (!numbers || !numbers.length) return null;
  const gaps = [];
  let cursor = 0;
  for (const number of numbers) {
    gaps.push(text.slice(cursor, number.start));
    cursor = number.end;
  }
  gaps.push(text.slice(cursor));
  // Число — количество («2 кг», «3 шт»), а не сумма
  if (numbers.some((number, i) => startsWithUnit(gaps[i + 1]))) return null;
  const words = gaps.map(cleanDescription);

  if (numbers.length === 1) {
    const [before, after] = words;
    if (before && after) return null;
    return [entry(numbers[0], before || after)];
  }

  if (!runs || HARD_SEPARATOR_RE.test(text)) return null;
  // Между соседними числами должно быть описание
  if (words.slice(1, -1).some(word => !word)) return null;
  const head = words[0];
  const tail = words[words.length - 1];
  if (head && !tail) return numbers.map((number, i) => entry(number, words[i])); // описание сумма …
  if (!head && tail) return numbers.map((number, i) => entry(number, words[i + 1])); // сумма описание …
  return null;
}

// Части уровня. Часть без суммы приклеивается к следующей вместе с разделителем («хлеб, молоко 300» — одно
// описание); в голосе вступление без сумм в начале («Записываю траты за выходные, …», от INTRO_WORDS слов)
// отбрасывается. Часть без суммы в конце — деление на этом уровне не годится (null)
function splitLevel(text, level, { runs = false } = {}) {
  const splitter = SPLITTERS[level];
  const pieces = text.split(new RegExp(`(${splitter.source})`, splitter.flags));
  const parts = [];
  let pending = '';
  for (let i = 0; i < pieces.length; i += 2) {
    const part = pieces[i].trim();
    if (!part) continue;
    if (/\d/.test(part)) {
      parts.push(pending + part);
      pending = '';
    } else if (!(runs && !parts.length && !pending && part.split(/\s+/).length >= INTRO_WORDS)) {
      pending += part + (pieces[i + 1] || ' ');
    }
  }
  return pending ? null : parts;
}

// Деление по уровням: на уровне принимается, только если каждая часть — записи с описанием
function parsePiece(text, level, options) {
  if (level >= SPLITTERS.length) return parseLeaf(text, options);
  const parts = splitLevel(text, level, options);
  if (parts && parts.length > 1) {
    const results = parts.map(part => parsePiece(part, level + 1, options));
    if (results.every(result => result && result.every(item => item.description))) return results.flat();
  }
  return parsePiece(parts && parts.length === 1 ? parts[0] : text, level + 1, options);
}

// Записи сообщения: [{ amount, currency | null, description | null, kind: 'expense' | 'income' }] или null —
// не похоже на записи. Одна запись тоже возвращается (вызывающий решает, что с ней делать).
// Если записей несколько, у каждой должно быть описание. Описание с «лишним» числом («кофе -250», «1,500 кофе») — null.
// options.runs — разрешить несколько записей без разделителей (голос: «кофе 250 такси 400»).
function parseEntries(text, options = {}) {
  const input = String(text || '').trim();
  if (!input) return null;
  const entries = parsePiece(input, 0, options);
  if (!entries || !entries.length) return null;
  if (entries.some(item => item.description && STRAY_NUMBER_RE.test(item.description))) return null;
  if (entries.length > 1 && entries.some(item => !item.description)) return null;
  return entries;
}

module.exports = { parseEntries, resolveCurrencyWord, MAX_ENTRIES };
