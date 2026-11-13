// Системные категории (categories.user_id = 0, имена в БД по-русски; сид — migrations/init.sql и update.sql) →
// ключ перевода category_* (бот и Mini App). Английские имена — у старых записей и CSV, переводятся так же.
const SYSTEM_CATEGORY_KEYS = Object.freeze({
  'Еда': 'category_food',
  'Транспорт': 'category_transport',
  'Развлечения': 'category_entertainment',
  'Покупки': 'category_shopping',
  'Маркетплейсы': 'category_marketplaces',
  'Здоровье': 'category_health',
  'Другое': 'category_other',
  'Food': 'category_food',
  'Transport': 'category_transport',
  'Entertainment': 'category_entertainment',
  'Shopping': 'category_shopping',
  'Marketplaces': 'category_marketplaces',
  'Health': 'category_health',
  'Other': 'category_other'
});

// Ключ перевода системной категории или null (своя категория). hasOwn: своя «constructor»/«toString» иначе нашла бы
// метод Object.prototype
function systemCategoryKey(name) {
  return Object.hasOwn(SYSTEM_CATEGORY_KEYS, name) ? SYSTEM_CATEGORY_KEYS[name] : null;
}

// Название на языке пользователя: системные переводятся, свои — как есть
function translateCategoryName(name, localizationService, lang) {
  const key = localizationService ? systemCategoryKey(name) : null;
  return key ? localizationService.getText(lang, key) : name;
}

module.exports = { SYSTEM_CATEGORY_KEYS, systemCategoryKey, translateCategoryName };
