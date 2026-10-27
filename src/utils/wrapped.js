// «Итоги месяца»: чистые помощники — счётчики по словам в описаниях, шуточное сравнение суммы, самый дорогой день.

// Слова в описании трат (все языки бота). «кафе» — не кофе
const KEYWORDS = [
  { key: 'coffee', pattern: /кофе|капучин|латте|американо|эспрессо|(?:^|[^а-яё])раф(?:[^а-яё]|$)|coffee|latte|cappuccino|espresso|americano|starbucks|kaffee|caf[eé](?![a-zà-ÿ])|kahve|ყავა|qahva|कॉफी|コーヒー|カフェ|咖啡/i },
  { key: 'taxi', pattern: /такси|taxi|\buber\b(?!\s*eats)|\bbolt\b|yandex\s*go|яндекс\s*go|taksi|ტაქსი|टैक्सी|タクシー|出租|滴滴/i },
  { key: 'delivery', pattern: /доставк|самокат|яндекс\s*\.?\s*еда|delivery|wolt|glovo|deliveroo|uber\s*eats|lieferando|lieferung|livraison|entrega|teslimat|yemeksepeti|yetkazib|მიტანა|डिलीवरी|zomato|swiggy|出前|配達|外卖|美团/i }
];

// Описание → ключи; по каждому — число трат, только ненулевые, по убыванию
function countKeywords(expenses) {
  const counts = new Map();
  for (const expense of expenses) {
    const text = String(expense.description || '');
    if (!text) continue;
    for (const { key, pattern } of KEYWORDS) {
      if (pattern.test(text)) counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return KEYWORDS.map(({ key }) => ({ key, count: counts.get(key) || 0 }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Цены предметов для сравнения в USD (переводятся в валюту пользователя по курсу), от дорогого к дешёвому
const COMPARISON_ITEMS = [
  { key: 'phone', usd: 800 },
  { key: 'sneakers', usd: 90 },
  { key: 'pizza', usd: 12 },
  { key: 'coffee', usd: 3 }
];

// amount и prices — в одной валюте: { key: цена }. Самый дорогой предмет, которого набирается от 3 штук;
// меньше трёх чашек кофе — одна-две чашки; меньше одной — null
function pickComparison(amount, prices) {
  if (!(amount > 0)) return null;
  for (const item of COMPARISON_ITEMS) {
    const price = prices[item.key];
    if (price > 0 && amount / price >= 3) return { key: item.key, count: Math.round(amount / price) };
  }
  const coffee = prices.coffee;
  if (coffee > 0 && amount / coffee >= 1) return { key: 'coffee', count: Math.floor(amount / coffee) };
  return null;
}

// rows: [{ day, total }] → самый дорогой день или null
function biggestDay(rows) {
  let best = null;
  for (const row of rows) if (!best || row.total > best.total) best = row;
  return best;
}

module.exports = {
  KEYWORDS,
  COMPARISON_ITEMS,
  countKeywords,
  pickComparison,
  biggestDay
};
