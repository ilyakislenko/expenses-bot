// Тексты «😈 Злого режима» по языкам бота (формат — в ru.js). Неизвестный язык — английский.
const ROAST_LOCALES = {
  ru: require('./ru'),
  en: require('./en'),
  es: require('./es'),
  fr: require('./fr'),
  de: require('./de'),
  pt: require('./pt'),
  tr: require('./tr'),
  hi: require('./hi'),
  ka: require('./ka'),
  kz: require('./kz'),
  uz: require('./uz'),
  jp: require('./jp'),
  zh: require('./zh')
};

function roastTemplates(lang) {
  return ROAST_LOCALES[lang] || ROAST_LOCALES.en;
}

roastTemplates.ROAST_LOCALES = ROAST_LOCALES;

module.exports = roastTemplates;
