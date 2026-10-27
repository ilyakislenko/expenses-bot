// Запрос к модели: что извлечь из фото чека и в каком виде. Ответ проверяет normalize.js.

// Схема ответа для Gemini (responseSchema, подмножество OpenAPI)
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_receipt: { type: 'BOOLEAN' },
    merchant: { type: 'STRING', nullable: true },
    date: { type: 'STRING', nullable: true, description: 'Purchase date, YYYY-MM-DD' },
    time: { type: 'STRING', nullable: true, description: 'Purchase time, HH:MM (24h)' },
    currency: { type: 'STRING', nullable: true, description: 'ISO 4217 code' },
    total: { type: 'NUMBER', nullable: true, description: 'Amount actually paid' },
    discount: { type: 'NUMBER', nullable: true, description: 'Receipt-level discount not included in item amounts, positive' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'NUMBER', nullable: true },
          price: { type: 'NUMBER', nullable: true },
          amount: { type: 'NUMBER', nullable: true, description: 'Line total after line discounts' },
          category: { type: 'STRING', nullable: true }
        },
        required: ['name']
      }
    }
  },
  required: ['is_receipt', 'items']
};

// Текст запроса — один шаблон для всех провайдеров и моделей (его же удобно гонять на других моделях при подборе).
// Подстановки: {{EXAMPLE}} — пример ответа в JSON, {{CATEGORIES}} — категории пользователя, {{FALLBACK_CATEGORY}},
// {{CURRENCY}} — основная валюта, {{TODAY}} — локальная дата. Пример формы ответа нужен маленьким локальным моделям
// (qwen2.5vl:3b без него пропускает category и time).
const RECEIPT_PROMPT_TEMPLATE = [
  'You read a photo of a shop receipt. Reply with JSON only, in exactly this shape (example values):',
  '{{EXAMPLE}}',
  'Fields:',
  '- is_receipt: false if the photo is not a purchase receipt (then items = []).',
  '- merchant: the store name (the brand, e.g. after «Магазин» or on the logo), not the legal entity (no "ООО", "ИП", no address).',
  '- date: purchase date as YYYY-MM-DD (receipts print DD.MM.YY: 27.10.26 → 2026-10-27); time: purchase time HH:MM (24h),',
  '  printed next to the date. null only if not printed.',
  '- currency: ISO 4217 code of the receipt. Infer from currency symbols, words or the country of the shop. If unknown: {{CURRENCY}}.',
  '- total: the final amount paid (ИТОГ / TOTAL / К ОПЛАТЕ), as a number.',
  '- discount: a receipt-level discount that is NOT already subtracted in item amounts, as a positive number; else null.',
  '- items: every purchased line, in the order printed. Russian receipts print a line as',
  '  `НАЗВАНИЕ КОЛ-ВО*ЦЕНА=СУММА НДС X%` (weighed goods: `Картофель вес 0.712*39.99=28.47`): quantity is the number before «*»,',
  '  price — after «*», amount — after «=». Copy every number exactly as printed, character by character; never calculate or guess.',
  '  name — as printed, in the receipt\'s language (keep Russian names in Russian), without «[М]», article/barcode numbers,',
  '  quantity, price or VAT. amount — line total after any line discount.',
  '  Do not include payment lines (cash, card, change), VAT/tax breakdowns, bonuses/points, subtotals or totals as items.',
  '  If a discount is printed as a separate line under an item, subtract it from that item amount instead of listing it.',
  '- items[].category: every item MUST have one, exactly one of: {{CATEGORIES}}. If none fits, use {{FALLBACK_CATEGORY}}.',
  '  Choose by what the item is (groceries and drinks are food; medicine is health; fuel and taxi are transport),',
  '  not by the fact that it was bought in a shop.',
  'Numbers must be JSON numbers with a dot as decimal separator.',
  'Today is {{TODAY}}; if the year is missing on the receipt, assume the most recent past date.',
  'The sum of item amounts minus discount should equal total.'
].join('\n');

// Что значат системные категории (по имени в БД): без подсказки маленькие модели относят продукты к «Покупкам»
const SYSTEM_CATEGORY_HINTS = {
  'Еда': 'food: groceries, drinks, cafes',
  'Транспорт': 'transport: taxi, fuel, public transport, parking',
  'Развлечения': 'entertainment: cinema, games, events',
  'Покупки': 'non-food goods: clothes, electronics, household goods, bags',
  'Здоровье': 'health: medicine, pharmacy, doctors',
  'Другое': 'anything else'
};

// categories — категории пользователя: строки (названия, как он их видит) или { name, hint };
// fallbackCategory — «Другое» на его языке, defaultCurrency — основная валюта,
// today — локальная дата 'YYYY-MM-DD' (чтобы достроить год, если в чеке его нет)
function buildPrompt({ categories, fallbackCategory, defaultCurrency, today }) {
  const example = {
    is_receipt: true,
    merchant: '<store name>',
    date: today,
    time: '18:30',
    currency: defaultCurrency,
    total: 123.45,
    discount: null,
    // Без конкретной категории: маленькие модели копируют её из примера во все позиции
    items: [{ name: '<item name as printed>', quantity: 0.5, price: 246.9, amount: 123.45, category: '<one of the categories below>' }]
  };
  const values = {
    EXAMPLE: JSON.stringify(example),
    CATEGORIES: categories.map((category) => {
      const { name, hint } = typeof category === 'string' ? { name: category } : category;
      return hint ? `${JSON.stringify(name)} (${hint})` : JSON.stringify(name);
    }).join(', '),
    FALLBACK_CATEGORY: JSON.stringify(fallbackCategory),
    CURRENCY: defaultCurrency,
    TODAY: today
  };
  return RECEIPT_PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in values ? values[key] : match));
}

module.exports = { RESPONSE_SCHEMA, RECEIPT_PROMPT_TEMPLATE, SYSTEM_CATEGORY_HINTS, buildPrompt };
