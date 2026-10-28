// Правка черновика неуверенно распознанного чека до записи: чистые функции над нормализованным чеком
// ({ merchant, date, time, currency, total, itemsTotal, mismatch, lowConfidence, items, checks }). Каждая возвращает
// новый черновик (сумма строк пересчитана, edited = true) или null — менять нечего (строки нет, предел строк).
const { MAX_ITEMS, LOW_CONFIDENCE_SUM, SUM_TOLERANCE } = require('./normalize');

const round2 = (value) => Math.round(value * 100) / 100;

// Сумма строк и сверка с напечатанным итогом: matches — в пределах тех же 3%, что у проверки уверенности,
// exact — до копейки; diff — строки минус итог. Итог не распознан — total, diff и matches = null
function sumCheck(receipt) {
  const itemsTotal = round2(receipt.items.reduce((sum, item) => sum + Number(item.amount), 0));
  const total = receipt.total === null || receipt.total === undefined ? null : Number(receipt.total);
  if (total === null || total <= 0) return { itemsTotal, total: null, diff: null, matches: null, exact: null };
  const diff = round2(itemsTotal - total);
  return { itemsTotal, total, diff, matches: Math.abs(diff) / total <= LOW_CONFIDENCE_SUM, exact: Math.abs(diff) <= SUM_TOLERANCE };
}

function changed(receipt, patch) {
  const next = { ...receipt, ...patch, edited: true };
  const check = sumCheck(next);
  return { ...next, itemsTotal: check.itemsTotal, mismatch: check.exact === false };
}

function hasLine(receipt, index) {
  return Number.isInteger(index) && index >= 0 && index < receipt.items.length;
}

// Новая сумма и/или название строки (undefined — без изменений). Цена за единицу пересчитывается из суммы:
// количество из чека остаётся, «Моя инфляция» видит исправленную цену
function editLine(receipt, index, { amount, name }) {
  if (!hasLine(receipt, index)) return null;
  const items = receipt.items.map((item, i) => {
    if (i !== index) return item;
    const next = { ...item };
    if (name !== undefined) next.name = name;
    if (amount !== undefined) {
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      Object.assign(next, { amount: round2(amount), quantity, price: round2(amount / quantity), lineMismatch: false });
    }
    return next;
  });
  return changed(receipt, { items });
}

function setLineCategory(receipt, index, categoryId) {
  if (!hasLine(receipt, index)) return null;
  return changed(receipt, { items: receipt.items.map((item, i) => (i === index ? { ...item, categoryId } : item)) });
}

// Последнюю строку тоже можно убрать: пустой черновик не записывается (кнопка «Записать» пропадает)
function removeLine(receipt, index) {
  if (!hasLine(receipt, index)) return null;
  return changed(receipt, { items: receipt.items.filter((item, i) => i !== index) });
}

function addLine(receipt, { amount, name, categoryId }) {
  if (receipt.items.length >= MAX_ITEMS) return null;
  const line = { name: name || '', quantity: 1, price: round2(amount), amount: round2(amount), categoryId, lineMismatch: false };
  return changed(receipt, { items: [...receipt.items, line] });
}

// Дата покупки, выбранная пользователем (записывается, даже если старше 60 дней — до года, см. ReceiptService.record).
// Время из чека остаётся, кроме сегодняшней даты с ещё не наступившим временем. now — { date, time } в поясе пользователя
function setDraftDate(receipt, date, now) {
  const time = receipt.time && !(date === now.date && receipt.time > now.time) ? receipt.time : null;
  return changed(receipt, { date, time, dateManual: true });
}

module.exports = { sumCheck, editLine, setLineCategory, removeLine, addLine, setDraftDate, MAX_ITEMS };
