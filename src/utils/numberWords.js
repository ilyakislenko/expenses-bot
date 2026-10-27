// Числа словами в расшифровке голоса → цифры: «двести пятьдесят рублей кофе» → «250 рублей кофе»,
// «полторы тысячи» → «1500», «two hundred and fifty» → «250», «2 тысячи» → «2000». Русский и английский.
// Плюс подготовка расшифровки к разбору записей: «плюс 50000» → «+50000», «1,500» / «1.500» (тысячи) → «1500».
//
// Число собирается по грамматике разрядов: сотни → десятки → единицы внутри тройки, затем множитель (тысяча,
// миллион) по убыванию. Слово, которое не продолжает число («два три»), начинает новое.
// Одиночное «один/одна/one/a» без множителя остаётся словом: «один капучино 200» — это не сумма 1.

const WORDS = new Map();
function add(kind, value, ...words) {
  for (const word of words) WORDS.set(word, { kind, value });
}

// Русский (ё → е)
add('unit', 1, 'один', 'одна', 'одно', 'одну');
add('unit', 2, 'два', 'две');
add('unit', 3, 'три');
add('unit', 4, 'четыре');
add('unit', 5, 'пять');
add('unit', 6, 'шесть');
add('unit', 7, 'семь');
add('unit', 8, 'восемь');
add('unit', 9, 'девять');
add('teen', 10, 'десять');
add('teen', 11, 'одиннадцать');
add('teen', 12, 'двенадцать');
add('teen', 13, 'тринадцать');
add('teen', 14, 'четырнадцать');
add('teen', 15, 'пятнадцать');
add('teen', 16, 'шестнадцать');
add('teen', 17, 'семнадцать');
add('teen', 18, 'восемнадцать');
add('teen', 19, 'девятнадцать');
add('ten', 20, 'двадцать');
add('ten', 30, 'тридцать');
add('ten', 40, 'сорок');
add('ten', 50, 'пятьдесят', 'полтинник');
add('ten', 60, 'шестьдесят');
add('ten', 70, 'семьдесят');
add('ten', 80, 'восемьдесят');
add('ten', 90, 'девяносто');
add('hundred', 100, 'сто', 'сотка', 'сотку', 'сотня', 'сотню');
add('hundred', 200, 'двести');
add('hundred', 300, 'триста');
add('hundred', 400, 'четыреста');
add('hundred', 500, 'пятьсот', 'пятихатка', 'пятихатку');
add('hundred', 600, 'шестьсот');
add('hundred', 700, 'семьсот');
add('hundred', 800, 'восемьсот');
add('hundred', 900, 'девятьсот');
add('half', 1.5, 'полтора', 'полторы');
add('scale', 1000, 'тысяча', 'тысячи', 'тысяч', 'тысячу', 'тыс', 'тыща', 'тыщи', 'тыщу', 'тыщ', 'косарь', 'косаря', 'косарей');
add('scale', 1000000, 'миллион', 'миллиона', 'миллионов', 'млн', 'лям', 'ляма', 'лямов');

// English
add('unit', 1, 'one');
add('unit', 2, 'two');
add('unit', 3, 'three');
add('unit', 4, 'four');
add('unit', 5, 'five');
add('unit', 6, 'six');
add('unit', 7, 'seven');
add('unit', 8, 'eight');
add('unit', 9, 'nine');
add('teen', 10, 'ten');
add('teen', 11, 'eleven');
add('teen', 12, 'twelve');
add('teen', 13, 'thirteen');
add('teen', 14, 'fourteen');
add('teen', 15, 'fifteen');
add('teen', 16, 'sixteen');
add('teen', 17, 'seventeen');
add('teen', 18, 'eighteen');
add('teen', 19, 'nineteen');
add('ten', 20, 'twenty');
add('ten', 30, 'thirty');
add('ten', 40, 'forty', 'fourty');
add('ten', 50, 'fifty');
add('ten', 60, 'sixty');
add('ten', 70, 'seventy');
add('ten', 80, 'eighty');
add('ten', 90, 'ninety');
add('times100', 100, 'hundred', 'hundreds');
add('scale', 1000, 'thousand', 'thousands', 'grand');
add('scale', 1000000, 'million', 'millions');

const ARTICLES = new Set(['a', 'an']);
const AND_WORDS = new Set(['and']);

function key(token) {
  return token.toLowerCase().replace(/ё/g, 'е');
}

function lookup(token) {
  return token && /^\p{L}/u.test(token) ? WORDS.get(key(token)) : undefined;
}

// Токены: слова (в том числе через дефис), числа, пробелы, прочие символы по одному
function tokenize(text) {
  return text.match(/\p{L}+(?:['’-]\p{L}+)*|\d+(?:[.,]\d+)?|\s+|[^\s\p{L}\d]/gu) || [];
}

// Индекс следующего не-пробельного токена
function nextWord(tokens, i) {
  let j = i;
  while (j < tokens.length && /^\s+$/.test(tokens[j])) j++;
  return j;
}

// Разбор числа с позиции i. Возвращает { value, end } (end — индекс после последнего токена числа) или null
function readNumber(tokens, i) {
  let total = 0;
  let group = 0;
  let lastScale = Infinity;
  let flags = { hundreds: false, tens: false, units: false };
  let consumed = 0;
  let onlyOne = true; // число — одиночная «единица» (один, one, a) без множителя
  let end = i;
  let j = i;

  // «2 тысячи», «1,5 тысячи»: число цифрами — только перед множителем
  if (/^\d/.test(tokens[j])) {
    const scale = lookup(tokens[nextWord(tokens, j + 1)]);
    if (!scale || scale.kind !== 'scale') return null;
    group = parseFloat(tokens[j].replace(',', '.'));
    flags = { hundreds: true, tens: true, units: true };
    consumed = 1;
    onlyOne = false;
    j = nextWord(tokens, j + 1);
  }

  while (j < tokens.length) {
    const token = tokens[j];
    let word = lookup(token);
    // «a hundred», «a thousand» — артикль как единица
    if (!word && ARTICLES.has(key(token || '')) && consumed === 0) {
      const after = lookup(tokens[nextWord(tokens, j + 1)]);
      if (after && (after.kind === 'times100' || after.kind === 'scale')) word = { kind: 'unit', value: 1 };
    }
    // «two hundred and fifty», «one thousand and five»
    if (!word && AND_WORDS.has(key(token || '')) && consumed > 0 && (flags.hundreds || group === 0)) {
      const after = lookup(tokens[nextWord(tokens, j + 1)]);
      if (after && ['unit', 'teen', 'ten'].includes(after.kind)) {
        j = nextWord(tokens, j + 1);
        continue;
      }
    }
    // «twenty-five»
    if (!word && token && token.includes('-')) {
      const parts = token.split('-').map(lookup);
      if (parts.length === 2 && parts[0] && parts[1] && parts[0].kind === 'ten' && parts[1].kind === 'unit') {
        if (flags.tens || flags.units) break;
        group += parts[0].value + parts[1].value;
        flags.tens = true;
        flags.units = true;
        consumed++;
        onlyOne = false;
        end = j + 1;
        j = nextWord(tokens, j + 1);
        continue;
      }
    }
    if (!word) break;

    const { kind, value } = word;
    if (kind === 'hundred') {
      if (flags.hundreds || flags.tens || flags.units) break;
      group += value;
      flags.hundreds = true;
    } else if (kind === 'times100') {
      if (flags.hundreds || group < 1 || group > 99) break;
      group *= 100;
      flags = { hundreds: true, tens: false, units: false };
    } else if (kind === 'ten') {
      if (flags.tens || flags.units) break;
      group += value;
      flags.tens = true;
    } else if (kind === 'teen') {
      if (flags.tens || flags.units) break;
      group += value;
      flags.tens = true;
      flags.units = true;
    } else if (kind === 'unit') {
      if (flags.units) break;
      group += value;
      flags.units = true;
    } else if (kind === 'half') {
      if (group !== 0 || flags.hundreds || flags.tens || flags.units) break;
      group = value;
      flags = { hundreds: true, tens: true, units: true };
    } else if (kind === 'scale') {
      if (value >= lastScale) break;
      total += (group || 1) * value;
      lastScale = value;
      group = 0;
      flags = { hundreds: false, tens: false, units: false };
    }
    if (!(kind === 'unit' && value === 1)) onlyOne = false;
    consumed++;
    end = j + 1;
    j = nextWord(tokens, j + 1);
  }

  if (!consumed || onlyOne) return null;
  const result = Math.round((total + group) * 100) / 100;
  return result > 0 ? { value: result, end } : null;
}

// Числа словами → цифры; остальной текст без изменений
function wordsToNumbers(text) {
  const tokens = tokenize(String(text || ''));
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const number = (lookup(tokens[i]) || /^\d/.test(tokens[i]) || ARTICLES.has(key(tokens[i])) || tokens[i].includes('-'))
      ? readNumber(tokens, i)
      : null;
    if (number) {
      out.push(String(number.value));
      i = number.end;
    } else {
      out.push(tokens[i]);
      i++;
    }
  }
  return out.join('');
}

// Китайский и японский пишутся без пробелов: «コーヒー250円とタクシー400円» → «コーヒー 250 円 と タクシー 400 円»
const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}';
const CJK_BEFORE_DIGIT = new RegExp(`([${CJK}ー])(?=\\d)`, 'gu');
const DIGIT_BEFORE_CJK = new RegExp(`(\\d)(?=[${CJK}])`, 'gu');
const CURRENCY_BEFORE_CJK = new RegExp(`(^|\\s)([円元块])(?=[${CJK}])`, 'gu');
const CONJUNCTION_BEFORE_CJK = new RegExp(`(^|\\s)([と和])(?=[${CJK}])`, 'gu');

// Расшифровка голоса → текст для разбора записей
function normalizeSpokenText(text) {
  let result = wordsToNumbers(text);
  // Тысячи через запятую или точку, как пишет распознавание («1,500», «12.000»)
  result = result.replace(/(?<![\d.,])\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*(?![\d]|[.,]\d)/g, (match) => match.replace(/[.,]/g, ''));
  // «плюс 50000 зарплата» — доход
  result = result.replace(/(^|[\s,;])(?:плюс|plus)\s+(?=\d)/giu, '$1+');
  result = result
    .replace(CJK_BEFORE_DIGIT, '$1 ')
    .replace(DIGIT_BEFORE_CJK, '$1 ')
    .replace(CURRENCY_BEFORE_CJK, '$1$2 ')
    .replace(CONJUNCTION_BEFORE_CJK, '$1$2 ');
  return result.replace(/\s+/g, ' ').trim();
}

module.exports = { wordsToNumbers, normalizeSpokenText };
