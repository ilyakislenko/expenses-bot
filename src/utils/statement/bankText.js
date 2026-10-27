// Разбор текста PDF-выписок (Сбер, Kaspi Gold). Образцов настоящих файлов нет, поэтому разбор терпим:
// строка операции может быть разорвана на несколько строк, между строками встречаются колонтитулы страниц.
const { parseAmount, parseDateTime, buildDate, normalizeCurrency, isTransferLabel, makeOperation } = require('./common');

const SPACE = '[ \\u00a0\\u202f]';
// '1 489,98', '18534,60'
const AMOUNT = `(?:\\d{1,3}(?:${SPACE}\\d{3})+|\\d+),\\d{2}`;
const CATEGORY_TAIL_MAX = 25;
const MAX_JOINED_LINES = 3;

function toLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.replace(/[\u00a0\u202f\u2009]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// ---------- Сбер ----------
// Строка операции: «03.07.2023 13:18 [код авторизации] Категория 1 489,98 18 534,60» (+ у поступлений),
// следующая строка: «04.07.2023 / 264897 PYATEROCHKA 1234 Moskva RUS. Операция по карте ****1234»
const SBER_START = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?(?:\s+(.*))?$/;
const SBER_RUB = '(?:\\s*(?:₽|руб\\.?|RUB|RUR|р\\.))?';
const SBER_TAIL = new RegExp(`^(?:(\\d{6})\\s+)?(.*?)\\s*([+\\-\\u2212\\u2013]?)\\s?(${AMOUNT})${SBER_RUB}(?:\\s+(${AMOUNT})${SBER_RUB})?$`);
const SBER_DETAIL_DATE = /(?:^|\s)(\d{2}\.\d{2}\.\d{4})(?:\s*\/\s*|\s+)?(?:(\d{6})(?=\s|$))?\s*/;
const SBER_STOP = /^(продолжение на следующей|страница \d|выписка по|дата операции|дата обработки|остаток (на|по|средств)|итого|расшифровка операций|пао сбербанк|сформировано|действительно|для проверки|по вопросам|www\.|реквизиты|генеральная лицензия|описание операции|категория|сумма в валюте|в валюте сч[её]та|\d+\s*(из|\/)\s*\d+$|\d+$)/i;
const SBER_DETAIL_NOISE = /\.?\s*Операция по (карте|счету|счёту)\s*\*+\d{4}\.?/gi;
const FOREIGN_AMOUNT_TAIL = new RegExp(`\\s+${AMOUNT}\\s*(?:\\$|€|£|¥|₸|₺|₾|USD|EUR|KZT|CNY|TRY|GEL|GBP|AED|THB)$`);
const CATEGORY_DANGLING = /(\s(и|в|на|для|по)|[,-])$/i;

function sberCurrency(text) {
  const match = text.match(/валюта сч[её]та:?\s*(российский рубль|рубль|доллар сша|евро|юань|тенге|[A-Z]{3})/i);
  return match ? normalizeCurrency(match[1], 'RUB') : 'RUB';
}

function parseSberText(text) {
  const lines = toLines(text);
  const currency = sberCurrency(text);
  const operations = [];
  const skipped = { failed: 0, invalid: 0 };
  let i = 0;
  while (i < lines.length) {
    const start = lines[i].match(SBER_START);
    if (!start) {
      i++;
      continue;
    }
    const date = buildDate(Number(start[3]), Number(start[2]), Number(start[1]), Number(start[4]), Number(start[5]));
    // Строки записи — до следующей операции или колонтитула
    const block = [];
    let j = i + 1;
    while (j < lines.length && !SBER_START.test(lines[j]) && !SBER_STOP.test(lines[j]) && block.length < 4) {
      block.push(lines[j]);
      j++;
    }
    i = j;

    // Хвост с суммами может быть разорван: склеиваем до трёх строк, пока не найдём «сумма [остаток]» в конце
    let head = start[6] || '';
    let tail = null;
    let used = 0;
    for (; used <= Math.min(MAX_JOINED_LINES, block.length); used++) {
      if (used > 0) head = `${head} ${block[used - 1]}`.trim();
      tail = head.match(SBER_TAIL);
      if (tail) break;
    }
    if (!date || !tail) {
      skipped.invalid++;
      continue;
    }
    let category = tail[2].trim();
    const rest = block.slice(used);
    const descriptionParts = [];
    // Перенос категории: короткий текст без цифр перед строкой с датой обработки
    // («кафе» / «04.07.2023 / 123456 …») или в её начале («кафе 04.07.2023 / 123456 …»)
    const isCategoryTail = (text) => text.length <= CATEGORY_TAIL_MAX && !/\d/.test(text);
    let expectDetail = true;
    rest.forEach((line, index) => {
      const detailDate = line.match(SBER_DETAIL_DATE);
      if (expectDetail && index === 0 && !detailDate && rest[1] && /^\d{2}\.\d{2}\.\d{4}/.test(rest[1]) && isCategoryTail(line)) {
        category = `${category} ${line}`;
        return;
      }
      if (expectDetail && detailDate) {
        expectDetail = false;
        const before = line.slice(0, detailDate.index).trim();
        if (!before || isCategoryTail(before)) {
          if (before) category = `${category} ${before}`;
          descriptionParts.push(line.slice(detailDate.index + detailDate[0].length));
          return;
        }
      }
      expectDetail = false;
      descriptionParts.push(line);
    });
    let description = descriptionParts.join(' ')
      .replace(SBER_DETAIL_NOISE, ' ')
      .replace(FOREIGN_AMOUNT_TAIL, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Перенос категории в колонке описания: «Рестораны и» + «кафе TEREMOK …» — категория обрывается на союзе,
    // а описание начинается со строчного слова
    const danglingTail = CATEGORY_DANGLING.test(category) && description.match(/^([а-яё]+)(?:\s+|$)/);
    if (danglingTail) {
      category = `${category} ${danglingTail[1]}`;
      description = description.slice(danglingTail[0].length);
    }
    const amount = parseAmount(tail[4]);
    const income = tail[3] === '+';
    const op = makeOperation({
      date,
      signedAmount: income ? amount : -amount,
      currency,
      description,
      bankCategory: category,
      isTransfer: isTransferLabel(category)
    });
    if (op) operations.push(op);
    else if (amount !== 0) skipped.invalid++;
  }
  return { source: 'sber', operations, skipped };
}

// ---------- Kaspi Gold ----------
// «01.01.24 - 2 500,00 ₸ Покупки Magnum», «02.01.24 + 10 000,00 ₸ Пополнения С Kaspi Депозита»
const KASPI_START = /^(\d{2}\.\d{2}\.(?:\d{4}|\d{2}))(?![\d.])\s*(.*)$/;
const KASPI_TYPES = [
  'Покупки', 'Покупка', 'Переводы', 'Перевод', 'Пополнения', 'Пополнение', 'Снятия', 'Снятие', 'Разное', 'Платежи', 'Платеж', 'Платёж',
  'Purchases', 'Purchase', 'Transfers', 'Transfer', 'Replenishments?', 'Top-ups?', 'Withdrawals?', 'Others?', 'Payments?',
  'Сатып алулар', 'Аударымдар', 'Толықтыру', 'Ақша алу', 'Әртүрлі', 'Төлемдер'
];
const KASPI_CURRENCY = '(₸|тг\\.?|KZT|\\$|USD|€|EUR|₽|RUB)';
const KASPI_ROW = new RegExp(`^([+\\-\\u2212\\u2013])\\s*(${AMOUNT})\\s*${KASPI_CURRENCY}?(?:\\s+(${KASPI_TYPES.join('|')})(?=\\s|$))?\\s*(.*)$`, 'i');
const KASPI_STOP = /^(ао «?kaspi|kaspi bank|выписка|по kaspi gold|номер (карты|сч[её]та)|валюта сч[её]та|доступно на|краткое содержание|дата\s+сумма|date\s+amount|сумма заблокирована|остаток|страница|page \d|\d+\s*(из|\/|of)\s*\d+$|\d+$|kaspi\.kz|www\.)/i;

function parseKaspiText(text) {
  const lines = toLines(text);
  const operations = [];
  const skipped = { failed: 0, invalid: 0 };
  let i = 0;
  while (i < lines.length) {
    const start = lines[i].match(KASPI_START);
    if (!start) {
      i++;
      continue;
    }
    const block = [start[2]];
    let j = i + 1;
    while (j < lines.length && !KASPI_START.test(lines[j]) && !KASPI_STOP.test(lines[j]) && block.length <= MAX_JOINED_LINES) {
      block.push(lines[j]);
      j++;
    }
    const joined = block.join(' ').trim();
    const row = joined.match(KASPI_ROW);
    if (!row) {
      // Дата без суммы (например, «Доступно на 01.01.24») — не операция
      i = i + 1;
      continue;
    }
    i = j;
    const date = parseDateTime(start[1]);
    const amount = parseAmount(row[2]);
    const type = row[4] || '';
    const op = makeOperation({
      date,
      signedAmount: /[-\u2212\u2013]/.test(row[1]) ? -amount : amount,
      currency: normalizeCurrency(row[3], 'KZT'),
      description: row[5],
      bankCategory: type,
      isTransfer: isTransferLabel(type)
    });
    if (op) operations.push(op);
    else if (amount !== 0) skipped.invalid++;
  }
  return { source: 'kaspi', operations, skipped };
}

const SBER_MARK = /сбербанк|сбер\s?банк|sberbank|пао сбер/i;
const KASPI_MARK = /kaspi|каспи/i;

// Текст выписки → результат разбора лучшего подходящего формата; null — не Сбер и не Kaspi
function parseBankText(text) {
  const sber = parseSberText(text);
  const kaspi = parseKaspiText(text);
  const sberScore = sber.operations.length + (SBER_MARK.test(text) ? 0.5 : 0);
  const kaspiScore = kaspi.operations.length + (KASPI_MARK.test(text) ? 0.5 : 0);
  if (!sber.operations.length && !kaspi.operations.length) return null;
  return sberScore >= kaspiScore ? sber : kaspi;
}

module.exports = { parseSberText, parseKaspiText, parseBankText };
