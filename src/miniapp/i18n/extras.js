const fs = require('fs');
const path = require('path');

// Строки раздела «Дополнительно» (достижения и монеты, теги, экспорт, импорт выписки, «Верни 13%», «Спроси бота»,
// квиз). Каждый экран держит свои строки в i18n/extras/<экран>.js — { ru: {…}, en: {…}, … все 13 языков } с ключами
// xtra_<экран>_* или error_<код>; здесь они собираются в один файл раздела. Один ключ в двух файлах — ошибка.
const PARTS = ['tags', 'export', 'achievements', 'import', 'tax', 'assistant', 'quiz'];
const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'hi', 'ka', 'kz', 'uz', 'jp', 'zh'];

const table = Object.fromEntries(LANGS.map(lang => [lang, {}]));
const owner = new Map();
for (const part of PARTS) {
  const file = path.join(__dirname, 'extras', `${part}.js`);
  if (!fs.existsSync(file)) continue;
  const strings = require(file);
  for (const key of Object.keys(strings.ru || {})) {
    if (owner.has(key)) throw new Error(`mini app string ${key}: both in extras/${owner.get(key)}.js and extras/${part}.js`);
    owner.set(key, part);
  }
  for (const lang of LANGS) Object.assign(table[lang], strings[lang] || {});
}

module.exports = table;
