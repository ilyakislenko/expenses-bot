// Общие расходы группы: чистая арифметика в копейках (центах) — доли, делёж чека по позициям, «кто кому должен».
// Деньги — целые копейки, чтобы сумма долей всегда равнялась сумме траты; остаток от деления раздаётся по одной
// копейке в заданном порядке (плательщик первым — лишнюю копейку берёт тот, кто платил, а не должники).

const MAX_ITEMS = 100;

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

// Порядок раздачи остатка: плательщик (если участвует), затем остальные в порядке списка
function remainderOrder(ids, payerId) {
  const list = [...new Set(ids.map(Number))];
  const payer = Number(payerId);
  return list.includes(payer) ? [payer, ...list.filter(id => id !== payer)] : list;
}

// totalCents поровну между ids: Map id → копейки; остаток — первым в remainderOrder
function splitEqual(totalCents, ids, payerId = null) {
  const order = remainderOrder(ids, payerId);
  const result = new Map();
  if (!order.length) return result;
  const base = Math.floor(totalCents / order.length);
  let remainder = totalCents - base * order.length;
  for (const id of order) {
    result.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return result;
}

// totalCents пропорционально весам (Map id → вес ≥ 0) методом наибольших остатков: сумма частей ровно totalCents.
// Равные остатки — по порядку order (по умолчанию — порядок весов). Все веса нулевые — поровну
function allocate(totalCents, weights, order = [...weights.keys()]) {
  const ids = order.filter(id => weights.has(id));
  const result = new Map();
  if (!ids.length) return result;
  const sum = ids.reduce((acc, id) => acc + Math.max(0, weights.get(id)), 0);
  if (sum <= 0) return splitEqual(totalCents, ids, ids[0]);
  if (sum === totalCents) {
    for (const id of ids) result.set(id, Math.max(0, weights.get(id)));
    return result;
  }
  let given = 0;
  const parts = ids.map((id, index) => {
    const exact = (totalCents * Math.max(0, weights.get(id))) / sum;
    const floor = Math.floor(exact);
    given += floor;
    return { id, floor, rest: exact - floor, index };
  });
  let remainder = totalCents - given;
  const byRest = [...parts].sort((a, b) => (b.rest - a.rest) || (a.index - b.index));
  for (const part of byRest) {
    if (remainder <= 0) break;
    part.floor += 1;
    remainder -= 1;
  }
  for (const part of parts) result.set(part.id, part.floor);
  return result;
}

// Строки чека, которые не «чьи-то», а общие на всех: чаевые, сервисный сбор, налог. Делятся пропорционально
// сумме позиций каждого. Слово целиком: «taxi» и «сборная солянка» — обычные позиции
const EXTRA_WORD_RE = /(^|[^\p{L}])(tips?|gratuity|service|servizio|serviço|servicio|tax|taxes|vat|gst|чаев\p{L}*|обслуживани\p{L}*|сервисн\p{L}*|налог\p{L}*|ндс|propina|pourboire|trinkgeld|bedienung|mwst|bahşiş|servis|kdv|taxa|impuesto|iva|tva)(?!\p{L})/iu;
const EXTRA_CJK_RE = /(サービス料|消費税|服务费|小费)/u;

function isExtraLine(name) {
  const text = String(name || '');
  return EXTRA_WORD_RE.test(text) || EXTRA_CJK_RE.test(text);
}

// Позиции распознанного чека для дележа: [{ id, name, amount, extra }]. Разница «итог чека больше суммы строк»
// (налог/сервис не строкой, до 25% от строк) — отдельной общей строкой.
function itemsFromReceipt(receipt, { extraLabel = 'Tax / service' } = {}) {
  const items = (receipt.items || []).slice(0, MAX_ITEMS).map((item, index) => ({
    id: index + 1,
    name: String(item.name || '').slice(0, 80) || `#${index + 1}`,
    amount: fromCents(toCents(item.amount)),
    extra: isExtraLine(item.name)
  })).filter(item => item.amount > 0);
  const itemsCents = items.reduce((acc, item) => acc + toCents(item.amount), 0);
  const total = receipt.total !== null && receipt.total !== undefined ? toCents(receipt.total) : null;
  if (total !== null && total - itemsCents >= 1 && total - itemsCents <= itemsCents * 0.25 && items.length < MAX_ITEMS) {
    items.push({ id: items.length + 1, name: extraLabel, amount: fromCents(total - itemsCents), extra: true, implied: true });
  }
  return items;
}

// Итоги дележа чека. items — [{ id, amount, extra }], claims — [{ itemId, userId }] (порядок — порядок нажатий),
// payerId — кто платил. Позиции без отметок делятся поровну между всеми участниками (плательщик и все, кто
// что-то отметил); общие строки (extra) — пропорционально сумме позиций каждого.
// Возвращает { totals: Map userId → копейки, participants: [userId], unclaimed: [itemId], totalCents }
function itemize(items, claims, payerId) {
  const payer = Number(payerId);
  const claimers = new Map(); // itemId → [userId] в порядке нажатий
  const participants = [payer];
  for (const claim of claims) {
    const userId = Number(claim.userId);
    const itemId = Number(claim.itemId);
    if (!claimers.has(itemId)) claimers.set(itemId, []);
    if (!claimers.get(itemId).includes(userId)) claimers.get(itemId).push(userId);
    if (!participants.includes(userId)) participants.push(userId);
  }
  const totals = new Map(participants.map(id => [id, 0]));
  const unclaimed = [];
  let totalCents = 0;
  let extrasCents = 0;
  for (const item of items) {
    const cents = toCents(item.amount);
    totalCents += cents;
    if (item.extra) {
      extrasCents += cents;
      continue;
    }
    let ids = (claimers.get(Number(item.id)) || []).filter(id => participants.includes(id));
    if (!ids.length) {
      unclaimed.push(Number(item.id));
      ids = participants;
    }
    for (const [id, part] of splitEqual(cents, ids, payer)) totals.set(id, totals.get(id) + part);
  }
  if (extrasCents) {
    for (const [id, part] of allocate(extrasCents, new Map(totals), remainderOrder(participants, payer))) {
      totals.set(id, totals.get(id) + part);
    }
  }
  return { totals, participants, unclaimed, totalCents };
}

// Доли в другой валюте: totalCents (уже пересчитанный итог) по тем же пропорциям, сумма ровно totalCents
function rescale(totalCents, shares, payerId = null) {
  const order = remainderOrder([...shares.keys()], payerId);
  return allocate(totalCents, shares, order);
}

// Балансы: [{ payer_id, amount (итог в валюте группы), shares: [{ user_id, share }] }] → Map userId → копейки
// (плюс — ему должны, минус — он должен)
function balancesOf(records) {
  const balances = new Map();
  const add = (id, cents) => balances.set(Number(id), (balances.get(Number(id)) || 0) + cents);
  for (const record of records) {
    add(record.payer_id, toCents(record.amount));
    for (const share of record.shares) add(share.user_id, -toCents(share.share));
  }
  return balances;
}

// «Кто кому должен» с упрощением долгов: самый большой должник платит самому большому кредитору, пока все не
// в нуле — не больше n−1 переводов. Равные суммы — по order (порядок участников), затем по id.
// → [{ from, to, cents }]
function simplifyDebts(balances, order = []) {
  const rank = (id) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  const cmp = (a, b) => (b.cents - a.cents) || (rank(a.id) - rank(b.id)) || (a.id - b.id);
  const creditors = [];
  const debtors = [];
  for (const [id, cents] of balances) {
    if (cents > 0) creditors.push({ id: Number(id), cents });
    else if (cents < 0) debtors.push({ id: Number(id), cents: -cents });
  }
  const transfers = [];
  while (creditors.length && debtors.length) {
    creditors.sort(cmp);
    debtors.sort(cmp);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const cents = Math.min(creditor.cents, debtor.cents);
    transfers.push({ from: debtor.id, to: creditor.id, cents });
    creditor.cents -= cents;
    debtor.cents -= cents;
    if (!creditor.cents) creditors.shift();
    if (!debtor.cents) debtors.shift();
  }
  return transfers;
}

// Точные суммы ответом: «500 300 400» (или через запятую/новую строку, «1 000,50» — нельзя: пробел разделяет суммы).
// count — сколько участников. → [копейки] или null
function parseExactAmounts(text, count) {
  const tokens = String(text || '').trim().split(/[\s;]+|,(?=\s)|,$/).map(token => token.trim()).filter(Boolean);
  if (tokens.length !== count) return null;
  const cents = [];
  for (const token of tokens) {
    if (!/^\d+([.,]\d{1,2})?$/.test(token)) return null;
    cents.push(toCents(token.replace(',', '.')));
  }
  return cents;
}

module.exports = {
  MAX_ITEMS,
  toCents,
  fromCents,
  remainderOrder,
  splitEqual,
  allocate,
  isExtraLine,
  itemsFromReceipt,
  itemize,
  rescale,
  balancesOf,
  simplifyDebts,
  parseExactAmounts
};
