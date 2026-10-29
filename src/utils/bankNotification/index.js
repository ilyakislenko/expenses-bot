// Уведомления банка (SMS, пуш, письмо) → операция: вид, сумма, валюта, продавец, дата и время из текста.
// Чистые функции без Telegram и БД — их же сможет вызвать HTTP-приёмник уведомлений с телефона.
//
// Порядок разбора: prepare (пробелы, минусы) → вырезаются маски и номера карт и счетов → полные даты и время →
// суммы с валютой (символ или код до/после числа) → суммы остатка («Доступно», «Баланс», «Avl Bal»…), кэшбэка и
// комиссии помечаются и не записываются → вид операции по словам (отказ → возврат → свои счета → наличные →
// поступление/списание, знак «+» — поступление) → продавец по шаблону банка или общим правилам.
// Баланс и номер карты не попадают ни в результат, ни в redact() (для логов и нейросети).
const lex = require('./lexicon');

const MAX_TEXT_LENGTH = 1500;
const MAX_MERCHANT_LENGTH = 60;
const WINDOW = 40; // сколько символов перед суммой смотрим в поисках слова «остаток» / «кэшбэк»

// ---------- Подготовка ----------

function prepare(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u2007\u202f\u2009\u200a]/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/[\u2212\u2012\u2013](?=\s?[\d$€₽₸₾₺₹£¥])/g, '-')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function lower(text) {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/i̇/g, 'i');
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Маски карт и счетов (*1234, VISA1234, Карта **1234, XX1234, ending in 1234, 16 цифр…) → пробел
function stripCards(text) {
  let result = text;
  for (const pattern of lex.CARD_PATTERNS) result = result.replace(pattern, ' ');
  return result.replace(/[ \t]{2,}/g, ' ');
}

function hasCardMask(text) {
  return lex.CARD_PATTERNS.slice(0, -1).some((pattern) => {
    pattern.lastIndex = 0;
    const found = pattern.test(text);
    pattern.lastIndex = 0;
    return found;
  });
}

// ---------- Даты и время ----------

function pad(n) {
  return String(n).padStart(2, '0');
}

function fullYear(y) {
  const n = Number(y);
  return y.length === 2 ? 2000 + n : n;
}

function validDate(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100)) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
}

// День и месяц: обычно д.м; если второе число больше 12 — м/д (США, Япония: «10/29»)
function dayMonth(a, b) {
  return Number(b) > 12 && Number(a) <= 12 ? [Number(b), Number(a)] : [Number(a), Number(b)];
}

const DATE_PATTERNS = [
  { re: /(?<!\d)(20\d{2})[-./](\d{1,2})[-./](\d{1,2})(?!\d)/, read: m => validDate(Number(m[1]), Number(m[2]), Number(m[3])) },
  {
    re: /(?<![\d.,])(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?![\d.,]\d)/,
    read: (m) => { const [d, mo] = dayMonth(m[1], m[2]); return validDate(fullYear(m[3]), mo, d); }
  },
  { re: /(?<!\d)(\d{1,2})月(\d{1,2})日/, read: (m, year) => validDate(year, Number(m[1]), Number(m[2])) },
  // Короткая дата без года — только рядом со временем («29.10 12:31», «10/29 12:31»): иначе «12.40 USD» — не 12 апреля
  {
    re: /(?<![\d.,])(\d{1,2})[./](\d{1,2})(?=,?\s(?:в\s)?\d{1,2}:\d{2})/,
    read: (m, year) => { const [d, mo] = dayMonth(m[1], m[2]); return validDate(year, mo, d); }
  }
];
const TIME_RE = /(?<![\d:.,])([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?(?![\d:])(?=['’]?(?:de|da|te|ta)?(?![\p{L}\d]))/u;
const TIME_STRICT_RE = /(?<![\d:.,])([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?![\d:])/;

// Дата и время из текста; найденное вырезается (чтобы «29.10.2026» и «12:31» не стали суммами).
// year — год для дат без года (текущий год пользователя)
function extractWhen(text, year = new Date().getUTCFullYear()) {
  let rest = text;
  let date = null;
  for (const { re, read } of DATE_PATTERNS) {
    const m = rest.match(re);
    if (!m) continue;
    const value = read(m, year);
    if (!value) continue;
    date = value;
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
    break;
  }
  let time = null;
  const m = rest.match(TIME_STRICT_RE);
  if (m) {
    time = `${pad(m[1])}:${m[2]}`;
    rest = rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length);
  }
  return { date, time, rest };
}

// ---------- Суммы ----------

const NUMBER_RE = /(?<!\p{N}|\p{N}[.,'’ ])(\d{1,3}(?:[ .,'’](?:\d{3}|\d{2}(?=[ .,'’]\d{3})))+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\p{N}]|[.,]\d)/gu;

// «1 250,00», «1.250,00», «1,250.00», «1,23,456.00», «12.40», «450,75», «1,250» (тысячи) → число
function toNumber(raw) {
  const text = raw.replace(/[ '’]/g, ' ');
  const seps = text.match(/[.,]/g) || [];
  let normalized;
  if (!seps.length) {
    normalized = text.replace(/ /g, '');
  } else {
    const last = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','));
    const tail = text.slice(last + 1);
    const lastSep = text[last];
    const sameCount = seps.filter(s => s === lastSep).length;
    const decimal = !(tail.length === 3 && (sameCount > 1 || seps.length === 1)) && tail.length <= 2 && !(sameCount > 1 && seps.length === sameCount);
    normalized = decimal
      ? text.slice(0, last).replace(/[ .,]/g, '') + '.' + tail
      : text.replace(/[ .,]/g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

const SYMBOL_ALT = lex.SYMBOLS.map(([s]) => escapeRe(s)).join('|');
const WORDS_SORTED = [...lex.CURRENCY_BY_WORD.keys()].sort((a, b) => b.length - a.length);
const WORD_ALT = WORDS_SORTED.map(escapeRe).join('|');
// Перед числом: символ, код или Rs/R$/US$/人民币 (одно слово — не «р» и не «сум»: «на сумму 500» — не валюта)
const PREFIX_WORDS = WORDS_SORTED.filter(w => /^[a-z]{3}$/.test(w) || ['rs', 'rs.', 'us$', '人民币', 'tl'].includes(w));
const PREFIX_RE = new RegExp(`(?:^|[^\\p{L}])(${SYMBOL_ALT}|${PREFIX_WORDS.map(escapeRe).join('|')})\\s?([-+])?\\s?$`, 'iu');
const SUFFIX_RE = new RegExp(`^\\s?(${SYMBOL_ALT}|${WORD_ALT})(?![\\p{L}\\p{N}])`, 'iu');
const SIGN_BEFORE_RE = /([-+])\s?$/;

function currencyOf(token, text) {
  const t = token.toLowerCase();
  if (t === '¥' && /人民币|元|银行|消费|支付/.test(text)) return 'CNY';
  const symbol = lex.SYMBOLS.find(([s]) => s === t);
  if (symbol) return symbol[1];
  return lex.CURRENCY_BY_WORD.get(t) || null;
}

// Все суммы с валютой: { value, currency, start, end, sign, kind: 'op' | 'balance' | 'aux' }
function findAmounts(text) {
  const low = lower(text);
  const amounts = [];
  NUMBER_RE.lastIndex = 0;
  let m;
  while ((m = NUMBER_RE.exec(text))) {
    const numStart = m.index;
    const numEnd = m.index + m[0].length;
    const before = text.slice(Math.max(0, numStart - 12), numStart);
    const after = text.slice(numEnd, numEnd + 12);
    const prefix = before.match(PREFIX_RE);
    const suffix = after.match(SUFFIX_RE);
    if (!prefix && !suffix) continue;
    const token = (prefix ? prefix[1] : suffix[1]);
    const currency = currencyOf(token, text);
    if (!currency) continue;
    let sign = prefix ? prefix[2] || null : null;
    let start = prefix ? numStart - prefix[0].length + (prefix[0].length - prefix[0].trimStart().length) : numStart;
    if (prefix && /^[^\p{L}$€₽₸₾₺₹£¥]/u.test(prefix[0])) start += 1;
    if (!sign) {
      const s = text.slice(Math.max(0, start - 2), start).match(SIGN_BEFORE_RE);
      if (s) sign = s[1];
    }
    const value = toNumber(m[1]);
    if (!value) continue;
    amounts.push({ value, currency, start, end: numEnd + (suffix ? suffix[0].length : 0), sign, kind: 'op' });
  }
  // Остаток и кэшбэк: слово в окне перед суммой (не дальше предыдущей суммы), после него — ни слова операции
  amounts.forEach((amount, i) => {
    const from = Math.max(i ? amounts[i - 1].end : 0, amount.start - WINDOW);
    const window = low.slice(from, amount.start);
    const balance = lastMatch(window, lex.BALANCE);
    const aux = lastMatch(window, lex.AUXILIARY);
    const op = Math.max(lastMatch(window, lex.EXPENSE), lastMatch(window, lex.INCOME));
    if (balance >= 0 && balance > op) {
      amount.kind = 'balance';
      amount.labelStart = from + balance;
    } else if (aux >= 0 && aux > op) {
      amount.kind = 'aux';
    }
  });
  return amounts;
}

function lastMatch(text, re) {
  const global = new RegExp(re.source, 'gu');
  let index = -1;
  let m;
  while ((m = global.exec(text))) {
    index = m.index;
    if (m[0].length === 0) global.lastIndex++;
  }
  return index;
}

function firstMatch(text, re) {
  const m = text.match(re);
  return m ? m.index : -1;
}

// Числа текста без валюты (проверка ответа нейросети: сумма должна быть в тексте)
function numbersIn(text) {
  const values = [];
  NUMBER_RE.lastIndex = 0;
  let m;
  while ((m = NUMBER_RE.exec(text))) {
    const value = toNumber(m[1]);
    if (value) values.push(value);
  }
  return values;
}

// ---------- Вырезание остатка ----------

// Остаток со словом («Доступно 12 340 ₽», «Avl Bal: INR 37,340.50») → «•••»
function stripBalances(text) {
  const amounts = findAmounts(text).filter(a => a.kind === 'balance');
  let result = text;
  for (const amount of amounts.reverse()) {
    result = `${result.slice(0, amount.labelStart)}•••${result.slice(amount.end)}`;
  }
  return result;
}

// Текст без номеров карт и остатков: для логов, нейросети и отпечатка (сам текст не хранится)
function redact(text) {
  return stripBalances(stripCards(prepare(text)));
}

// ---------- Вид операции ----------

function detectKind(low, opSign) {
  if (lex.DECLINED.test(low)) return 'declined';
  if (lex.REFUND.test(low)) return 'refund';
  if (lex.SELF_TRANSFER.test(low)) return 'transfer';
  if (lex.CASH.test(low)) return 'cash';
  if (opSign === '+') return 'income';
  const income = firstMatch(low, lex.INCOME);
  const expense = firstMatch(low, lex.EXPENSE);
  if (income >= 0 && (expense < 0 || income <= expense)) return 'income';
  if (expense >= 0) return 'expense';
  if (opSign === '-') return 'expense';
  return null;
}

// Направление перевода между своими / наличных: деньги пришли на этот счёт или ушли с него
function directionOf(low, opSign) {
  if (opSign === '+') return 'in';
  if (/(внесение|пополнение|со вклада|с депозита|с накопительн|from your savings|cash deposit|зачислен|поступлен|credited|received)/.test(low)) return 'in';
  return 'out';
}

// ---------- Продавец ----------

const STOP_WORDS = new Set([
  'карта', 'карты', 'карте', 'картой', 'карту', 'card', 'karta', 'счет', 'счета', 'сч', 'на', 'в', 'во', 'по', 'с', 'со', 'от',
  'сумму', 'сумма', 'на сумму', 'успешно', 'одобрено', 'approved', 'aprovada', 'aprobada', 'vpa', 'upi', 'ref', 'no', 'via',
  'using', 'your', 'the', 'a', 'an', 'at', 'to', 'from', 'with', 'for', 'on', 'of', 'de', 'en', 'em', 'da', 'do', 'el', 'la',
  'le', 'un', 'una', 'um', 'uma', 'tu', 'tus', 'con', 'com', 'o', 'cartao', 'cartão', 'tarjeta', 'karte', 'carte', 'mit',
  'bei', 'chez', 'par', 'tutarında', 'tutarinda', 'tutarlı', 'ile', 'kartınızdan', 'kartinizdan', 'kartınızla', 'kartinizla',
  'işyerinde', 'isyerinde', 'magazin', 'магазин', 'merchant', 'payee', 'получателю', 'получатель', 'отправитель', 'sender',
  'ბარათი', 'ბარათით', 'ანგარიში', 'ot', 'dan', 'den', 'dari', 'rub', 'тенге', 'счёт', 'operation', 'операция', 'операции',
  'and', 'и', 'y', 'et', 'und', 've', 'va', 'და', 'mm'
]);

const COUNTRY_TAIL = /\s+(?:RUS|RU|KAZ|KZ|UZB|UZ|GEO|GE|TUR|TR|USA|US|IND|IN|DEU|DE|FRA|FR|ESP|ES|PRT|PT|CHN|CN|JPN|JP|GBR|GB|ARM|AM|KGZ|KG)$/;
// Конец части сообщения; точка после инициала («ИВАН И. », «П.П.») — не конец
const CLAUSE_END = /(?:[,;\n(（|]|(?<!(?:^|[\s.])\p{Lu})[.。](?=\s|$)|，|\s[-–—]\s)/u;
const AFTER_STOP = /\s(?:on|le|am|el|em|com|con|with|using|via|card|by|par|avec|mit|en fecha|date|дата|по карте|с карты|картой|карта|kart|ბარათ|ref|upi)(?=[\s.,:]|$)/iu;

function cleanMerchant(raw) {
  if (!raw) return null;
  let text = raw.replace(/⟦N⟧|⟦A⟧/g, ' ').replace(/[«»"“”„]/g, '').replace(/\s+/g, ' ').trim();
  const stop = text.match(AFTER_STOP);
  if (stop) text = text.slice(0, stop.index);
  // Слова операции и остатка в середине: «TRENDYOL harcamasi yapildi», «Lidl bezahlt» → до них
  const low = lower(text);
  const cut = [lex.EXPENSE, lex.INCOME, lex.BALANCE, lex.DECLINED].map(re => firstMatch(low, re)).filter(i => i > 0);
  if (cut.length) text = text.slice(0, Math.min(...cut));
  // Номера магазинов и терминалов («PYATEROCHKA 6158», «ATM 123456»), хвосты страны
  text = text.replace(/(?<![\p{L}])\d{3,}(?![\p{L}])/gu, ' ').replace(/[*]+/g, ' ').replace(/\s+/g, ' ').trim();
  text = text.replace(/@[\w.]+$/, '').trim();
  let previous;
  do {
    previous = text;
    text = text.replace(COUNTRY_TAIL, '').trim();
    const words = text.split(' ');
    while (words.length && STOP_WORDS.has(lower(words[0]).replace(/[:.,]$/, ''))) words.shift();
    // Последнее слово-инициал («ИВАН И.») — не союз «и»
    while (words.length > 1 && !/^\p{Lu}\.?$/u.test(words[words.length - 1]) && STOP_WORDS.has(lower(words[words.length - 1]).replace(/[:.,]$/, ''))) words.pop();
    text = words.join(' ');
    text = text.replace(/^[\s:;,.\-–—'’`)/\\]+|[\s:;,.\-–—'’`(/\\]+$/g, '').trim();
  } while (text !== previous);
  if (!/\p{L}{2,}|[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(text)) return null;
  if (text.length > MAX_MERCHANT_LENGTH) text = text.slice(0, MAX_MERCHANT_LENGTH).replace(/\s+\S*$/, '');
  return text || null;
}

function clauseFrom(text, index) {
  const rest = text.slice(index);
  const end = rest.search(CLAUSE_END);
  return end >= 0 ? rest.slice(0, end) : rest;
}

const LABEL_RE = /(?:merchant|商户|продавец|место|точка|магазин|işyeri|tarih)\s*[:：]\s*([^.,;\n。，]+)/iu;
const TURKISH_RE = /([^\s'’][^'’\n]{0,40}?)['’](?:dan|den|tan|ten)(?!\p{L})/u;
const TURKISH_PLACE_RE = /([^\n]{2,60}?)\s+i[sş]yerinde/iu;
const EXPENSE_MARKERS = ['at', '@', 'chez', 'bei', 'bij', 'en', 'em', 'в', 'во', 'на', 'to', 'with', 'à', 'au', 'merchant', 'получателю', 'payee'];
const INCOME_MARKERS = ['от', 'from', 'de', 'von', 'ot', 'dan', 'отправитель', 'sender', 'par'];

function markerRe(markers) {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${markers.map(escapeRe).join('|')})\\s+(?!⟦)`, 'giu');
}
const EXPENSE_MARKER_RE = markerRe(EXPENSE_MARKERS);
const INCOME_MARKER_RE = markerRe(INCOME_MARKERS);

// Продавец (для поступлений — отправитель): метка «Merchant:» → турецкие «MIGROS'tan», «… işyerinde» → предлог после
// суммы («at», «в», «bei», «en», «от»…) → текст сразу после суммы → предлог до суммы → другие части сообщения
function findMerchant(clean, kind) {
  const label = clean.match(LABEL_RE);
  if (label) {
    const value = cleanMerchant(label[1]);
    if (value) return value;
  }
  const opIndex = clean.indexOf('⟦A⟧');
  const turkishPlace = clean.match(TURKISH_PLACE_RE);
  if (turkishPlace) {
    const tail = turkishPlace[1].split('⟦A⟧').pop();
    const value = cleanMerchant(tail);
    if (value) return value;
  }
  const turkish = clean.match(TURKISH_RE);
  if (turkish) {
    const run = turkish[1].match(/([\p{Lu}\d&.\- ]*\p{Lu}[\p{Lu}\d&.\- ]*)$/u);
    const value = cleanMerchant(run ? run[1] : turkish[1]);
    if (value) return value;
  }
  const markers = kind === 'income' ? INCOME_MARKER_RE : EXPENSE_MARKER_RE;
  const candidates = [];
  markers.lastIndex = 0;
  let m;
  while ((m = markers.exec(clean))) candidates.push({ index: m.index + m[0].length, after: m.index >= opIndex });
  const ordered = [...candidates.filter(c => c.after), ...candidates.filter(c => !c.after)];
  for (const candidate of ordered) {
    const value = cleanMerchant(clauseFrom(clean, candidate.index).split('⟦A⟧')[0]);
    if (value) return value;
  }
  if (opIndex >= 0) {
    const value = cleanMerchant(clauseFrom(clean, opIndex + 3));
    if (value) return value;
  }
  // Части сообщения: сначала после суммы, потом до неё (без слов операции и остатка)
  const parts = [];
  const re = new RegExp(CLAUSE_END.source, 'gu');
  let last = 0;
  let match;
  while ((match = re.exec(clean))) {
    parts.push({ text: clean.slice(last, match.index), index: last });
    last = match.index + match[0].length;
  }
  parts.push({ text: clean.slice(last), index: last });
  const after = parts.filter(p => p.index > opIndex);
  const before = parts.filter(p => p.index <= opIndex).reverse();
  for (const part of [...after, ...before]) {
    const low = lower(part.text);
    if (/⟦A⟧/.test(part.text) && !/⟦A⟧\s*\S/.test(part.text)) continue;
    // Часть — только слово операции («Покупка», «Пополнение»), но не «Зарплата»: это и есть описание поступления
    if (!lex.SALARY.test(low) && [lex.EXPENSE, lex.INCOME, lex.BALANCE, lex.DECLINED, lex.REFUND, lex.CASH].some(r => r.test(low) && firstMatch(low, r) <= 1)) continue;
    if (/^\s*(?:сч[её]т|счет|account|card|карта)\b/iu.test(part.text)) continue;
    const value = cleanMerchant(part.text.split('⟦A⟧').pop());
    if (value) return value;
  }
  return null;
}

// ---------- Шаблон банка ----------

function bankOf(text) {
  const found = lex.BANKS.find(([, re]) => re.test(text));
  return found ? found[0] : null;
}

// Префикс банка в начале («Kaspi Gold:», «Ozon Банк:», «TBC:», «【招商银行】», «СберБанк.») — не продавец
const BANK_PREFIX_RE = /^\s*(?:【[^】]{1,20}】|\[[^\]]{1,20}\]|[\p{L}\d .\-&]{2,30}?(?:bank|банк|gold|pay|пэй|пей|card|bbva|sparkasse|boursorama|millennium|kaspi|halyk|tbc|bog|click|payme|uzcard|humo|humocard|garanti|akbank|n26|revolut|monzo|chase|hdfc|icici)?\s*:)\s*/iu;

// «Т-Банк. Пополнение…» — название банка с точкой
const BANK_DOT_PREFIX_RE = /^\s*[\p{L}\d .\-&]{0,20}?(?:bank|банк)\.\s+/iu;

function stripBankPrefix(text) {
  const m = text.match(BANK_PREFIX_RE) || text.match(BANK_DOT_PREFIX_RE);
  if (!m) return text;
  const prefix = lower(m[0]);
  // «Покупка: 4 500 ₸» или «Pokupka:» — это не банк, а слово операции
  if ([lex.EXPENSE, lex.INCOME, lex.DECLINED, lex.REFUND, lex.BALANCE].some(re => re.test(prefix))) return text;
  return text.slice(m[0].length);
}

// ---------- Признаки уведомления ----------

const LATIN_CAPS_RE = /(?<![\p{L}])[A-Z][A-Z0-9&'.\-*]{2,}(?![\p{L}])/u;
const MARKER_HINT_RE = /(?<![\p{L}])(?:at|chez|bei|en|em|from|de|von|от)\s+\S/iu;

// Похоже ли сообщение на уведомление банка. forwarded — пересланное сообщение (там достаточно суммы с валютой и
// слова операции); вставленный текст должен быть узнаваемым: маска карты, остаток, название банка или слово операции
// вместе со временем / продавцом латиницей / «at …». Обычный ввод («250 кофе», «кофе 250р, такси 400р», «оплата 500р
// интернет», вопросы) сюда не попадает
function detect(text, { forwarded = false } = {}) {
  const prepared = prepare(text);
  if (prepared.length < 8 || prepared.startsWith('/')) return false;
  const noCards = stripCards(prepared);
  const when = extractWhen(noCards);
  const amounts = findAmounts(when.rest);
  if (!amounts.some(a => a.kind === 'op')) return false;
  const low = lower(prepared);
  const keyword = [lex.EXPENSE, lex.INCOME, lex.DECLINED, lex.REFUND, lex.CASH].some(re => re.test(low));
  const strong = hasCardMask(prepared) || amounts.some(a => a.kind === 'balance') || Boolean(bankOf(prepared));
  if (forwarded) return keyword || strong;
  // Слова, которые пишет только банк: отказ, возврат, перевод между своими, снятие наличных
  if ([lex.DECLINED, lex.REFUND, lex.SELF_TRANSFER, lex.CASH].some(re => re.test(low))) return true;
  if (strong) return keyword || amounts.length > 1 || Boolean(when.time);
  return keyword && (Boolean(when.time || when.date) || LATIN_CAPS_RE.test(when.rest) || MARKER_HINT_RE.test(when.rest));
}

// Несколько уведомлений в одном тексте (скопировали подряд): блоки через пустую строку, каждый — уведомление
function splitNotifications(text, options = {}) {
  const blocks = prepare(text).split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length < 2 || !blocks.every(block => detect(block, options))) return [prepare(text)];
  return blocks;
}

// ---------- Разбор ----------

// Результат: { ok: true, kind, amount, currency, supported, merchant, original, date, time, bank, direction, template }
// или { ok: false, reason: 'no_amount' | 'no_kind', bank } — тогда остаётся нейросеть.
// kind: expense | income | refund | transfer (между своими) | cash (наличные) | declined (отказ)
function parse(text, { year } = {}) {
  const prepared = prepare(text);
  const bank = bankOf(prepared);
  const noCards = stripCards(prepared);
  const when = extractWhen(noCards, year);
  const body = stripBankPrefix(when.rest);
  const amounts = findAmounts(body);
  const ops = amounts.filter(a => a.kind === 'op');
  if (!ops.length) return { ok: false, reason: 'no_amount', bank };

  // Операция — первая сумма; рядом сумма в другой валюте — пересчёт: записываем списанную в валюте счёта
  let op = ops[0];
  let original = null;
  const other = ops.find(a => a !== op && a.currency !== op.currency && a.start - op.end < WINDOW);
  if (other) {
    const balanceCurrency = (amounts.find(a => a.kind === 'balance') || {}).currency;
    const between = body.slice(op.end, other.start);
    const charged = (balanceCurrency && other.currency === balanceCurrency)
      || (!(balanceCurrency && op.currency === balanceCurrency) && /[(（≈~=]|по курсу|списано|charged|debited|converted|в валюте/i.test(between))
      || (!lex.isSupported(op.currency) && lex.isSupported(other.currency));
    if (charged) {
      original = { amount: op.value, currency: op.currency };
      op = other;
    } else {
      original = null;
    }
  }

  const clean = (() => {
    let out = '';
    let last = 0;
    for (const amount of amounts) {
      if (amount.kind === 'balance') {
        out += body.slice(last, amount.labelStart) + ' ';
      } else {
        out += body.slice(last, amount.start) + (amount === op ? ' ⟦A⟧ ' : ' ⟦N⟧ ');
      }
      last = amount.end;
    }
    return (out + body.slice(last)).replace(/[ \t]+/g, ' ');
  })();
  const low = lower(clean);
  const kind = detectKind(low, op.sign);
  if (!kind) return { ok: false, reason: 'no_kind', bank };

  const merchant = findMerchant(clean, kind === 'income' ? 'income' : 'expense');
  return {
    ok: true,
    kind,
    amount: op.value,
    currency: op.currency,
    supported: lex.isSupported(op.currency),
    merchant,
    original,
    date: when.date,
    time: when.time,
    bank,
    template: bank || 'generic',
    direction: kind === 'transfer' || kind === 'cash' ? directionOf(low, op.sign) : null
  };
}

// Отпечаток для поиска повторов: текст без карт и остатков, в нижнем регистре, без пробелов и пунктуации
function fingerprint(text) {
  return lower(redact(text)).replace(/[^\p{L}\p{N}]+/gu, '');
}

// Валюта по слову/символу (для проверки ответа нейросети): какие валюты упомянуты в тексте
function currenciesIn(text) {
  return [...new Set(findAmounts(stripCards(prepare(text))).map(a => a.currency))];
}

module.exports = {
  prepare, redact, detect, parse, splitNotifications, fingerprint, numbersIn, currenciesIn, toNumber, extractWhen,
  stripCards, findAmounts, bankOf, MAX_TEXT_LENGTH
};
