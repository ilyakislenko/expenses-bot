// Строки раздела «Ещё»: профиль, настройки, семья, премиум, приглашения, справка, админка. Ключи — prof_* и error_*
// (ошибки API раздела). Тексты — profile/<язык>.json; админка (только для владельца бота, в боте — по-русски) —
// profile/admin.json на ru и en, остальные языки получают английский вариант.
const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'pt', 'tr', 'hi', 'ka', 'kz', 'uz', 'jp', 'zh'];
const admin = require('./profile/admin.json');

module.exports = Object.fromEntries(LANGS.map((lang) => [lang, {
  ...require(`./profile/${lang}.json`),
  ...(admin[lang] || admin.en)
}]));
