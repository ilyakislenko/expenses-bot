// Запрос к модели: вопрос → строгий JSON намерения (схема — intent.js). Модель не считает и не отвечает на вопрос.
// Системный текст и примеры неизменны (Ollama переиспользует уже посчитанное начало запроса), всё, что зависит от
// пользователя и даты, — в последнем сообщении.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SYSTEM_PROMPT = `You turn a question about the user's own expense-tracker data into a JSON object. Never answer the question and never compute numbers.
JSON keys:
"type": one of
  spend_total — how much was spent (optionally on a category or a thing),
  spend_by_category — where the money went, breakdown by categories, what was the main spending,
  top_expenses — a list of the biggest expenses,
  largest_purchase — the single biggest expense,
  compare_periods — compare spending of two periods,
  average_daily — average spending per day,
  income_total — income, salary, earnings,
  balance — income minus expenses, what is left, am I in plus,
  savings_status — savings, goals, debts, net worth,
  budget_status — budgets and limits,
  count_records — how many expenses or how many times,
  unknown — anything else (not about the user's own money).
"period": the period the question is about, or null if not mentioned:
  {"kind":"day","offset":0} today, offset -1 yesterday;
  {"kind":"week","offset":0} this calendar week, -1 last week;
  {"kind":"month","offset":0} this month, -1 last month;
  {"kind":"named_month","month":9,"year":null} a month by name (year only if said);
  {"kind":"year","offset":0} this year, -1 last year;
  {"kind":"last_n_days","n":7} "for a week", "past 30 days";
  {"kind":"custom","from":"YYYY-MM-DD","to":"YYYY-MM-DD"} explicit dates;
  {"kind":"all"} all time, ever.
"compare_to": the second period for compare_periods if it is named, else null.
"categories": names from the user's category list that the question mentions or clearly means (medicine → Health), else []. Do not add a category just because a text_filter belongs to it.
"text_filter": a thing to search in expense descriptions (shop, product, service: "такси", "coffee") when it is not a category, in its base form and in the language of the question, else null.
"limit": how many items for top_expenses, else null.
"currency": a 3-letter currency code only if the user asks to show amounts in it, else null.
Rules: "за неделю" / "for a week" means the last 7 days, "this week" means the calendar week. "в день" / "per day" is part of average_daily, not the period. "last month" / "в прошлом месяце" is offset -1, "last year" / "в прошлом году" is offset -1.
Reply with the JSON object only.`;

const EXAMPLE_CONTEXT = {
  ru: 'Today: 2026-10-15 (Thursday). Month starts on day 1.\nCategories: Еда, Транспорт, Развлечения, Покупки, Здоровье, Другое',
  en: 'Today: 2026-10-15 (Thursday). Month starts on day 1.\nCategories: Food, Transport, Entertainment, Shopping, Health, Other'
};

const base = { period: null, compare_to: null, categories: [], text_filter: null, limit: null, currency: null };
const EXAMPLES = [
  ['ru', 'сколько я потратил на такси в сентябре', { type: 'spend_total', period: { kind: 'named_month', month: 9, year: null }, text_filter: 'такси' }],
  ['en', 'How much did I spend on food last week?', { type: 'spend_total', period: { kind: 'week', offset: -1 }, categories: ['Food'] }],
  ['ru', 'на что ушло больше всего денег в прошлом месяце', { type: 'spend_by_category', period: { kind: 'month', offset: -1 } }],
  ['en', 'top 3 expenses this year', { type: 'top_expenses', period: { kind: 'year', offset: 0 }, limit: 3 }],
  ['ru', 'сравни траты в сентябре и августе', { type: 'compare_periods', period: { kind: 'named_month', month: 9, year: null }, compare_to: { kind: 'named_month', month: 8, year: null } }],
  ['ru', 'сколько в среднем в день уходит на еду за последние 30 дней', { type: 'average_daily', period: { kind: 'last_n_days', n: 30 }, categories: ['Еда'] }],
  ['en', "what's my balance this month", { type: 'balance', period: { kind: 'month', offset: 0 } }],
  ['ru', 'сколько раз я заказывал доставку с 1 по 10 октября', { type: 'count_records', period: { kind: 'custom', from: '2026-10-01', to: '2026-10-10' }, text_filter: 'доставка' }],
  ['ru', 'самая дорогая покупка вчера', { type: 'largest_purchase', period: { kind: 'day', offset: -1 } }],
  ['en', 'what did I spend the most on last month', { type: 'spend_by_category', period: { kind: 'month', offset: -1 } }],
  ['ru', 'сколько я в среднем трачу в день', { type: 'average_daily' }],
  ['ru', 'расходы на развлечения в прошлом году', { type: 'spend_total', period: { kind: 'year', offset: -1 }, categories: ['Развлечения'] }],
  ['en', 'how many times did I take a taxi for a week', { type: 'count_records', period: { kind: 'last_n_days', n: 7 }, text_filter: 'taxi' }],
  ['ru', 'топ 5 трат за всё время', { type: 'top_expenses', period: { kind: 'all' }, limit: 5 }],
  ['ru', 'сколько ушло на лекарства в сентябре', { type: 'spend_total', period: { kind: 'named_month', month: 9, year: null }, categories: ['Здоровье'] }],
  ['en', 'how much did I earn in 2025', { type: 'income_total', period: { kind: 'custom', from: '2025-01-01', to: '2025-12-31' } }],
  ['ru', 'сколько у меня накоплений', { type: 'savings_status' }],
  ['en', 'am I within my budget?', { type: 'budget_status' }],
  ['ru', 'какая завтра погода', { type: 'unknown' }]
];

function contextBlock({ today, startDay, categories }) {
  const [y, m, d] = today.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `Today: ${today} (${weekday}). Month starts on day ${startDay}.\nCategories: ${categories.join(', ')}`;
}

// categories — названия так, как их видит пользователь (на его языке)
function buildMessages({ question, today, startDay = 1, categories }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const [lang, text, answer] of EXAMPLES) {
    messages.push({ role: 'user', content: `${EXAMPLE_CONTEXT[lang]}\nQuestion: ${text}` });
    messages.push({ role: 'assistant', content: JSON.stringify({ ...base, ...answer }) });
  }
  messages.push({ role: 'user', content: `${contextBlock({ today, startDay, categories })}\nQuestion: ${question}` });
  return messages;
}

module.exports = { buildMessages, SYSTEM_PROMPT, EXAMPLES };
