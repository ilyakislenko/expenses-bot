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

// categories — названия категорий пользователя (как он их видит), fallbackCategory — «Другое» на его языке,
// defaultCurrency — основная валюта, today — локальная дата 'YYYY-MM-DD' (чтобы достроить год, если в чеке его нет)
function buildPrompt({ categories, fallbackCategory, defaultCurrency, today }) {
  return [
    'You read a photo of a shop receipt and return JSON only.',
    'Fields:',
    '- is_receipt: false if the photo is not a purchase receipt (then items = []).',
    '- merchant: shop or company name as printed, short (no legal form like "ООО", no address).',
    '- date: purchase date as YYYY-MM-DD; time: HH:MM (24h). null if not printed.',
    `- currency: ISO 4217 code of the receipt. Infer from currency symbols, words or the country of the shop. If unknown: ${defaultCurrency}.`,
    '- total: the final amount paid (ИТОГ / TOTAL / К ОПЛАТЕ), as a number.',
    '- discount: a receipt-level discount that is NOT already subtracted in item amounts, as a positive number; else null.',
    '- items: every purchased line in order: name as printed but cleaned (no article/barcode numbers, no quantity or price inside the name),',
    '  quantity (number, weight in kg allowed), price (unit price), amount (line total after any line discount).',
    '  Do not include payment lines (cash, card, change), VAT/tax breakdowns, bonuses/points, subtotals or totals as items.',
    '  If a discount is printed as a separate line under an item, subtract it from that item amount instead of listing it.',
    `- items[].category: choose exactly one of these category names: ${categories.map(name => JSON.stringify(name)).join(', ')}. If none fits, use ${JSON.stringify(fallbackCategory)}.`,
    'Numbers must be JSON numbers with a dot as decimal separator.',
    `Today is ${today}; if the year is missing on the receipt, assume the most recent past date.`,
    'The sum of item amounts minus discount should equal total.'
  ].join('\n');
}

module.exports = { RESPONSE_SCHEMA, buildPrompt };
