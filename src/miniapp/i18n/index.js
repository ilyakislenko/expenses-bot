const fs = require('fs');
const path = require('path');
const ruBot = require('../../locales/ru');

// Строки Mini App: у каждого раздела свой файл i18n/<раздел>.js — { ru: {…}, en: {…}, … все 13 языков бота }.
// Ключи разделов не пересекаются (префикс раздела). Плюс общие ключи бота (названия категорий, единицы сумм), чтобы
// не дублировать переводы. Клиент получает всё одним объектом в /api/me.
const SLICES = ['core', 'expenses', 'overview', 'income', 'plans', 'savings', 'profile', 'extras'];
const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'hi', 'ka', 'kz', 'uz', 'jp', 'zh'];
const BOT_KEY_PREFIXES = ['category_', 'savings_compact_'];

function loadSlices() {
  const slices = {};
  for (const slice of SLICES) {
    const file = path.join(__dirname, `${slice}.js`);
    if (fs.existsSync(file)) slices[slice] = require(file);
  }
  return slices;
}

const slices = loadSlices();
const botKeys = Object.keys(ruBot).filter(key => BOT_KEY_PREFIXES.some(prefix => key.startsWith(prefix)));
const cache = new Map();

// Все строки для языка: разделы (нет перевода — русский) и выбранные ключи бота
function strings(lang, localizationService) {
  if (cache.has(lang)) return cache.get(lang);
  const result = {};
  for (const key of botKeys) result[key] = localizationService.getText(lang, key);
  for (const table of Object.values(slices)) Object.assign(result, table.ru, table[lang] || {});
  cache.set(lang, result);
  return result;
}

module.exports = { strings, SLICES, LANGS, slices };
