// Строгая проверка ответа модели: числа (в том числе строками с запятой), строки скидок, пропущенные суммы,
// распределение скидки на чек и сведение суммы позиций к оплаченному итогу.
const { ReceiptError } = require('./errors');
const { isPlaceholder } = require('./prompt');
const { parseAmount, parseDateTime, normalizeCurrency, MAX_AMOUNT } = require('../../utils/statement/common');

const MAX_ITEMS = 100;
const MERCHANT_MAX = 60;
const NAME_MAX = 200;
const RECEIPT_MAX_AGE_DAYS = 60;
const SUM_TOLERANCE = 0.01; // копейка на округление: больше — «сверь суммы»
const LOW_CONFIDENCE_SUM = 0.03; // позиции расходятся с итогом больше чем на 3% — черновик, а не запись
const LOW_CONFIDENCE_LINES = 0.2; // больше 20% строк, где сумма ≠ количество × цена
const LINE_TOLERANCE = 1; // единица валюты на округление в строке
const MAX_QUANTITY = 100000; // больше — не количество (модель кладёт туда штрихкод); expenses.quantity — DECIMAL(12,3)
const SPARSE_ITEMS = 2; // одна-две строки без продавца — черновик (так выглядит выдумка на нечитаемом фото)
const INVENTED_DEVIATION = 0.5; // …а если они расходятся с итогом больше чем вдвое — «не получилось распознать»
const GENERIC_MERCHANT = /^(магазин|магазин продуктов|супермаркет|store|shop|supermarket|market|маркет)$/iu;

const round2 = (value) => Math.round(value * 100) / 100;
const round3 = (value) => Math.round(value * 1000) / 1000;
const sumOf = (items) => round2(items.reduce((sum, item) => sum + item.amount, 0));

// Экспонента («1e400») — не число из чека: parseAmount выкинул бы «e» и прочитал 1400
const EXPONENT = /\d\s*e\s*[+-]?\d/i;

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return EXPONENT.test(value) ? null : parseAmount(value);
  return null;
}

// Количество как напечатано, до 3 знаков: «1.236 *», «1,236», «0,812 кг», «2 шт» → 1.236, 1.236, 0.812, 2.
// Запятая здесь — всегда десятичная (у денег «1,236» — тысячи, у количества — граммы). null — не количество
function toQuantity(value) {
  let number = null;
  if (typeof value === 'number') {
    number = Number.isFinite(value) ? value : null;
  } else if (typeof value === 'string' && !EXPONENT.test(value)) {
    const text = value.trim().toLowerCase()
      .replace(/\s*(?:[*x×х]|кг|kg|шт\.?|pcs|л|l|г|g)\s*$/u, '')
      .replace(/\s+/g, '')
      .replace(',', '.');
    if (/^\d+(\.\d+)?$/.test(text) || /^\.\d+$/.test(text)) number = Number(text);
  }
  if (number === null) return null;
  number = round3(number);
  return number > 0 && number <= MAX_QUANTITY ? number : null;
}

// Текст на фото, похожий на команду модели, а не на товар: «инструкция для ИИ», «верни total», JSON, ссылки.
// Такой чек не записывается сам — только черновиком
const INSTRUCTION_TEXT = /(инструкц|instruction|ignore|игнорир|верни|добавь|prompt|промпт|нейросет|\bии\b|\bai\b|\bjson\b|\breturn\b|[{}<>]|https?:|:\/\/|www\.)/iu;

function looksLikeInstruction(value) {
  return typeof value === 'string' && INSTRUCTION_TEXT.test(value);
}

// «0012345 Молоко 2,5% 930г 4600000000000» → «Молоко 2,5% 930г»; «БАНАНЫ ВЕС 1.236 *» → «БАНАНЫ ВЕС»; ссылки вырезаются
function cleanName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/(?:https?:\/\/|www\.)\S*/gi, '')
    .replace(/\s*:\/\/\S*/g, '')
    .trim()
    .replace(/^\d{1,3}[.)]\s+/, '')
    .replace(/^\[[^\]]{1,3}\]\s*/, '') // «[М]» — маркировка «Честного знака»
    .replace(/^[#№*]?\d{4,}\s*[-.:]?\s+/, '')
    .replace(/\s+\d{6,}$/, '')
    .replace(/\s+\d+[.,]\d+\s*[*xх×](\s*\d+(?:[.,]\d+)?)?$/u, '') // «1.236 *» или «1.236 * 129.99» весового товара в конце названия
    .replace(/^["'«]+|["'»]+$/g, '')
    .trim()
    .slice(0, NAME_MAX);
}

function categoryKey(name) {
  return String(name || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Пропорционально приводит суммы позиций к target; копейки округления — на самую крупную позицию
function scaleTo(items, target) {
  const total = sumOf(items);
  if (total <= 0) return items;
  const factor = target / total;
  const scaled = items.map(item => ({ ...item, amount: round2(item.amount * factor) })).filter(item => item.amount > 0);
  if (!scaled.length) return items;
  const remainder = round2(target - sumOf(scaled));
  if (remainder) {
    const largest = scaled.reduce((best, item) => (item.amount > best.amount ? item : best), scaled[0]);
    largest.amount = round2(largest.amount + remainder);
  }
  return scaled;
}

function normalizeDate(rawDate, rawTime) {
  const dateText = String(rawDate || '').trim();
  const parsed = dateText ? parseDateTime(dateText) : null;
  if (!parsed) return { date: null, time: null };
  const timeMatch = String(rawTime || '').match(/^\s*(\d{1,2}):(\d{2})/) || dateText.match(/[T\s](\d{1,2}):(\d{2})/);
  let time = null;
  if (timeMatch && Number(timeMatch[1]) < 24 && Number(timeMatch[2]) < 60) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  return { date: parsed.slice(0, 10), time };
}

// Сумма строки по количеству и цене (null — цены нет)
function lineExpected(item) {
  return item.price !== null ? round2(item.quantity * item.price) : null;
}

// Позиции не сходятся с итогом: если все строки, где сумма ≠ round(количество × цена), после исправления дают итог —
// исправляем их; иначе если одна такая строка объясняет расхождение — только её; иначе ничего не трогаем
// (верные строки не портим пропорциональной подгонкой). Возвращает { items, fixed: индексы исправленных }
function reconcileWithTotal(items, total) {
  if (total === null || Math.abs(total - sumOf(items)) <= SUM_TOLERANCE / 2) return { items, fixed: [] };
  const wrong = items
    .map((item, index) => ({ index, expected: lineExpected(item) }))
    .filter(({ index, expected }) => expected !== null && expected > 0 && Math.abs(expected - items[index].amount) >= SUM_TOLERANCE / 2);
  const fix = (indexes) => items.map((item, index) => (indexes.includes(index)
    ? { ...item, amount: lineExpected(item), lineMismatch: false }
    : item));
  const fits = (candidate) => Math.abs(sumOf(candidate) - total) <= SUM_TOLERANCE;
  if (wrong.length) {
    const all = wrong.map(entry => entry.index);
    const fixedAll = fix(all);
    if (fits(fixedAll)) return { items: fixedAll, fixed: all };
    for (const { index } of wrong) {
      const fixedOne = fix([index]);
      if (fits(fixedOne)) return { items: fixedOne, fixed: [index] };
    }
  }
  return { items, fixed: [] };
}

// raw — JSON модели. categories: [{ id, names: [название, перевод…] }], fallbackCategoryId — «Другое».
// Возвращает { merchant, date, time, currency, total (напечатанный или null), itemsTotal, mismatch, lowConfidence, checks,
// items, nextLineId }; у строк постоянные id (кнопки черновика адресуют строку по id, а не по номеру).
// lowConfidence — ответу нельзя верить без проверки: позиции расходятся с итогом больше чем на 3%, у больше чем 20%
// строк сумма не равна количество × цена (±1) — маленькие модели так «додумывают» цифры, итог не прочитан, одна-две
// строки без продавца, позиции обрезаны до maxItems или в названиях текст, похожий на команды модели (checks.suspicious).
// Копия формы ответа из запроса (заполнители «<...>») — нечитаемый ответ.
function normalizeReceipt(raw, { categories = [], fallbackCategoryId, defaultCurrency, supportedCurrencies, maxItems = MAX_ITEMS }) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ReceiptError('unreadable', 'response is not an object');
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (raw.is_receipt === false && !rawItems.length) throw new ReceiptError('not_receipt');
  if (isPlaceholder(raw.merchant) || rawItems.some(item => item && typeof item === 'object' && isPlaceholder(item.name))) {
    throw new ReceiptError('unreadable', 'model echoed the example');
  }

  const byName = new Map();
  for (const category of categories) {
    for (const name of category.names) byName.set(categoryKey(name), category.id);
  }

  let lineDiscount = 0;
  let suspicious = looksLikeInstruction(raw.merchant);
  let items = [];
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const quantity = toQuantity(item.quantity) || 1;
    const priceValue = toNumber(item.price);
    const price = priceValue !== null && priceValue > 0 && priceValue <= MAX_AMOUNT ? round2(priceValue) : null;
    let amount = toNumber(item.amount);
    if (amount === null && price !== null) amount = price * quantity;
    if (amount === null) continue;
    amount = round2(amount);
    if (amount < 0) {
      // Строка скидки — учитывается как скидка на чек
      lineDiscount = round2(lineDiscount - amount);
      continue;
    }
    if (amount === 0 || amount > MAX_AMOUNT) continue;
    if (looksLikeInstruction(item.name)) suspicious = true;
    items.push({
      name: cleanName(item.name),
      quantity,
      price,
      amount,
      categoryId: byName.get(categoryKey(item.category)) || fallbackCategoryId,
      lineMismatch: price !== null && Math.abs(round2(quantity * price) - amount) > LINE_TOLERANCE
    });
  }
  if (!items.length) throw new ReceiptError(raw.is_receipt === false ? 'not_receipt' : 'unreadable', 'no usable items');

  const truncated = items.length > maxItems;
  if (truncated) items = items.slice(0, maxItems);

  const totalValue = toNumber(raw.total);
  const total = totalValue !== null && totalValue > 0 && totalValue <= MAX_AMOUNT ? round2(totalValue) : null;
  const discount = round2(Math.abs(toNumber(raw.discount) || 0) + lineDiscount);

  // Скидка на чек: распределяем пропорционально, если с ней суммы сходятся с итогом не хуже, чем без неё
  const rawSum = sumOf(items);
  if (discount > 0 && discount < rawSum) {
    const withDiscount = round2(rawSum - discount);
    if (total === null || Math.abs(withDiscount - total) <= Math.abs(rawSum - total)) items = scaleTo(items, withDiscount);
  }

  // Итог: правим только строки, где сумма ≠ количество × цена, если это объясняет расхождение; иначе — как прочитано
  const reconciled = reconcileWithTotal(items, total);
  items = reconciled.items.map((item, index) => ({ id: index + 1, ...item }));
  const residual = total !== null ? round2(Math.abs(total - sumOf(items))) : 0;
  const mismatch = residual > SUM_TOLERANCE;
  const sumDeviation = total !== null ? residual / total : null;
  const badLines = items.filter(item => item.lineMismatch).length;

  const currencyText = String(raw.currency || '').trim();
  const currency = normalizeCurrency(currencyText, defaultCurrency);
  if (supportedCurrencies && !supportedCurrencies.includes(currency)) throw new ReceiptError('currency', currency, { currency });

  // «ООО «Пятёрочка»» → «Пятёрочка»: без организационно-правовой формы и кавычек. Слово «Магазин» из запроса (модель
  // подставляет его, когда продавца не видно) — продавец не прочитан
  const cleaned = cleanName(raw.merchant)
    .replace(/^(ООО|ОАО|ЗАО|ПАО|АО|ИП|ТОО|LLC|LTD\.?|INC\.?|GMBH)\s+/i, '')
    .replace(/["«»„“”]/g, '')
    .trim()
    .slice(0, MERCHANT_MAX);
  const merchant = cleaned && !GENERIC_MERCHANT.test(cleaned) ? cleaned : null;
  const sparse = !merchant && items.length <= SPARSE_ITEMS;
  // Одна-две строки без продавца, которые не дают и половины итога, — выдумка на нечитаемом фото (белый лист, пейзаж:
  // «Магазин / Молоко 100 ₽ / итог 1000»), а не чек: «не получилось распознать»
  if (sparse && sumDeviation !== null && sumDeviation > INVENTED_DEVIATION) throw new ReceiptError('unreadable', 'invented sparse answer');
  const lowConfidence = (sumDeviation !== null && sumDeviation > LOW_CONFIDENCE_SUM) || badLines / items.length > LOW_CONFIDENCE_LINES
    || total === null || sparse || truncated || suspicious;
  const checks = { sumDeviation, badLines, lines: items.length, corrected: reconciled.fixed.length };
  if (total === null) checks.noTotal = true;
  if (sparse) checks.sparse = true;
  if (truncated) checks.truncated = true;
  if (suspicious) checks.suspicious = true;
  return {
    merchant, ...normalizeDate(raw.date, raw.time), currency, total, itemsTotal: sumOf(items), mismatch,
    lowConfidence, checks, items, nextLineId: items.length + 1
  };
}

function localNow(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function shiftDate(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Локальное время записи трат чека: дата чека, если она не в будущем и не старше maxAgeDays (распознанная — 60 дней,
// выбранная пользователем в черновике — год), иначе null (сейчас). Без времени — полдень (сегодняшний чек без времени — сейчас)
function resolveReceiptTime(date, time, timezone, now = new Date(), maxAgeDays = RECEIPT_MAX_AGE_DAYS) {
  if (!date) return null;
  const local = localNow(timezone, now);
  if (date > local.date || date < shiftDate(local.date, -maxAgeDays)) return null;
  if (!time) return date === local.date ? null : `${date} 12:00:00`;
  if (date === local.date && time > local.time) return null;
  return `${date} ${time}:00`;
}

// Начало локального календарного месяца 'YYYY-MM-01' (для месячного лимита чеков)
function localMonthStart(timezone, now = new Date()) {
  return `${localNow(timezone, now).date.slice(0, 8)}01`;
}

// День и время, на которые на самом деле запишутся траты чека (их же показывает заголовок чека):
// { date, time, localAt, unknown }. localAt — для resolveReceiptTime (null — сейчас). unknown — даты нет или она
// отброшена (в будущем или старше maxAgeDays): траты ложатся на сегодня, пользователю говорится «дата не распознана».
// manualMaxAgeDays — предел для даты, выбранной в черновике вручную (dateManual)
function receiptDate(receipt, timezone, now = new Date(), manualMaxAgeDays = RECEIPT_MAX_AGE_DAYS) {
  const maxAgeDays = receipt.dateManual ? manualMaxAgeDays : RECEIPT_MAX_AGE_DAYS;
  const localAt = resolveReceiptTime(receipt.date, receipt.time, timezone, now, maxAgeDays);
  if (localAt) return { date: receipt.date, time: receipt.time || null, localAt, unknown: false };
  const local = localNow(timezone, now);
  if (receipt.date === local.date) {
    return { date: local.date, time: receipt.time && receipt.time <= local.time ? receipt.time : null, localAt: null, unknown: false };
  }
  return { date: local.date, time: null, localAt: null, unknown: true };
}

module.exports = {
  normalizeReceipt, resolveReceiptTime, receiptDate, localMonthStart, localNow, cleanName, toQuantity, looksLikeInstruction,
  MAX_ITEMS, MAX_QUANTITY, LOW_CONFIDENCE_SUM, SUM_TOLERANCE
};
