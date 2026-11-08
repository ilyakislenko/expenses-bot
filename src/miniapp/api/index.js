// Модули API Mini App: каждый файл api/<имя>.js — function (router, deps), регистрирует свои маршруты /api/<…>.
// deps: { get(name) — сервис из контейнера, http — помощники (http.js) }. Порядок — как в списке.
const MODULES = [
  'me',
  'expenses', 'receipts',
  'overview',
  'income', 'recurring',
  'budgets', 'planning',
  'savings',
  'settings', 'family', 'premium', 'admin',
  'achievements', 'tags', 'export', 'import', 'tax', 'assistant', 'quiz'
];

function registerApi(router, deps) {
  for (const name of MODULES) require(`./${name}`)(router, deps);
}

module.exports = { registerApi, MODULES };
