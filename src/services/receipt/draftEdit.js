// Правка черновика неуверенно распознанного чека до записи: чистые функции над нормализованным чеком
// ({ merchant, date, time, currency, total, itemsTotal, mismatch, lowConfidence, items, checks, nextLineId }). Строки
// адресуются постоянным id (item.id), а не номером: двойное нажатие «🗑 Убрать строку» убирает одну строку, а кнопка со
// старого экрана не попадает в строку, сдвинувшуюся на её место. Каждая функция возвращает новый черновик (сумма
// строк пересчитана, edited = true) или null — менять нечего (строки нет, предел строк).
const { MAX_ITEMS, MAX_QUANTITY, LOW_CONFIDENCE_SUM, SUM_TOLERANCE } = require('./normalize');
const { MAX_AMOUNT } = require('../../utils/statement/common');

const round2 = (value) => Math.round(value * 100) / 100;

// Черновик с id у всех строк (черновики, сохранённые до появления id, получают 1…N по порядку)
function withLineIds(receipt) {
  if (receipt.items.every(item => Number.isInteger(item.id)) && Number.isInteger(receipt.nextLineId)) return receipt;
  let nextLineId = Math.max(0, ...receipt.items.map(item => (Number.isInteger(item.id) ? item.id : 0))) + 1;
  const items = receipt.items.map(item => (Number.isInteger(item.id) ? item : { ...item, id: nextLineId++ }));
  return { ...receipt, items, nextLineId: Math.max(nextLineId, Number(receipt.nextLineId) || 0) };
}

// Номер строки (0…) по id или -1
function lineIndex(receipt, lineId) {
  return Number.isInteger(lineId) ? receipt.items.findIndex(item => item.id === lineId) : -1;
}

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

// Новая сумма и/или название строки (undefined — без изменений). Цена за единицу пересчитывается из суммы:
// количество из чека остаётся (если оно в разумных пределах), «Моя инфляция» видит исправленную цену
function editLine(receipt, lineId, { amount, name }) {
  const index = lineIndex(receipt, lineId);
  if (index < 0) return null;
  const items = receipt.items.map((item, i) => {
    if (i !== index) return item;
    const next = { ...item };
    if (name !== undefined) next.name = name;
    if (amount !== undefined) {
      const quantity = Number(item.quantity) > 0 && Number(item.quantity) <= MAX_QUANTITY ? Number(item.quantity) : 1;
      const price = round2(amount / quantity);
      Object.assign(next, { amount: round2(amount), quantity, price: price <= MAX_AMOUNT ? price : null, lineMismatch: false });
    }
    return next;
  });
  return changed(receipt, { items });
}

function setLineCategory(receipt, lineId, categoryId) {
  if (lineIndex(receipt, lineId) < 0) return null;
  return changed(receipt, { items: receipt.items.map(item => (item.id === lineId ? { ...item, categoryId } : item)) });
}

// Последнюю строку тоже можно убрать: пустой черновик не записывается (кнопка «Записать» пропадает)
function removeLine(receipt, lineId) {
  if (lineIndex(receipt, lineId) < 0) return null;
  return changed(receipt, { items: receipt.items.filter(item => item.id !== lineId) });
}

// Новая строка получает следующий id (id убранных строк не переиспользуются)
function addLine(receipt, { amount, name, categoryId }) {
  if (receipt.items.length >= MAX_ITEMS) return null;
  const base = withLineIds(receipt);
  const line = { id: base.nextLineId, name: name || '', quantity: 1, price: round2(amount), amount: round2(amount), categoryId, lineMismatch: false };
  return changed(base, { items: [...base.items, line], nextLineId: base.nextLineId + 1 });
}

// Дата покупки, выбранная пользователем (записывается, даже если старше 60 дней — до года, см. ReceiptService.record).
// Время из чека остаётся, кроме сегодняшней даты с ещё не наступившим временем. now — { date, time } в поясе пользователя
function setDraftDate(receipt, date, now) {
  const time = receipt.time && !(date === now.date && receipt.time > now.time) ? receipt.time : null;
  return changed(receipt, { date, time, dateManual: true });
}

module.exports = { sumCheck, editLine, setLineCategory, removeLine, addLine, setDraftDate, withLineIds, lineIndex, MAX_ITEMS };
