// Общие помощники для разбора вопросов: нормализация слов, грубая основа слова (падежи «такси/такси», «еда/еду»,
// «продукты/продуктов», «coffee/coffees») и сопоставление с категориями пользователя.

// Английские имена системных категорий (в БД они по-русски)
const SYSTEM_CATEGORY_ALIASES = {
  'Еда': ['food', 'groceries', 'grocery', 'продукты', 'еда'],
  'Транспорт': ['transport', 'transportation', 'transit'],
  'Развлечения': ['entertainment', 'fun'],
  'Покупки': ['shopping', 'purchases'],
  'Здоровье': ['health', 'medicine', 'pharmacy'],
  'Другое': ['other', 'misc']
};

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Только буквы и цифры (эмодзи, кавычки, точки — прочь); дефис — только внутри слова («вообще-то»)
function plainWords(text) {
  return normalizeText(text).replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)
    .map(w => w.replace(/^-+|-+$/g, '')).filter(Boolean).join(' ');
}

const RU_ENDING = /(иями|ями|ами|ого|ему|ому|ыми|ими|ов|ев|ей|ам|ям|ах|ях|ом|ем|ой|ий|ый|ая|яя|ое|ее|ую|юю|а|я|о|е|ы|и|у|ю|ь|й)$/;

// Основа слова для поиска: у кириллицы срезается одно окончание (основа не короче 2 букв), у латиницы —
// множественное -s/-es. Регистр нижний.
function stem(word) {
  const w = normalizeText(word);
  if (/[а-я]/.test(w)) {
    const cut = w.replace(RU_ENDING, '');
    return cut.length >= 2 ? cut : w;
  }
  if (/^[a-z]+$/.test(w) && w.length > 4) {
    if (/(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
    if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
    if (/[^s]s$/.test(w)) return w.slice(0, -1);
  }
  return w;
}

function stemPhrase(text) {
  return plainWords(text).split(' ').filter(Boolean).map(stem).join(' ');
}

// Подстрока для поиска в описаниях: основы слов, но не короче 3 букв («еду» → «еду», а не «ед» в каждом «обеде»)
function searchStem(text) {
  return plainWords(text).split(' ').filter(Boolean).map((w) => {
    const s = stem(w);
    return s.length >= 3 ? s : w;
  }).join(' ');
}

// categories: [{ id, name, icon, label }] (label — как видит пользователь). Ищем по имени и подписи, затем по английским
// синонимам системных категорий; в каждом случае сначала точно, затем по основам слов. Своя категория «Продукты»
// важнее синонима системной «Еда».
function matchCategory(term, categories) {
  const plain = plainWords(term);
  if (!plain) return null;
  const stemmed = stemPhrase(plain);
  const own = (category) => [category.name, category.label].filter(Boolean);
  const aliases = (category) => SYSTEM_CATEGORY_ALIASES[category.name] || [];
  for (const variants of [own, aliases]) {
    const exact = categories.find(category => variants(category).some(v => plainWords(v) === plain));
    if (exact) return exact;
    const similar = categories.find(category => variants(category).some(v => stemPhrase(v) === stemmed));
    if (similar) return similar;
  }
  return null;
}

// Названа ли категория в тексте вопроса (по основам слов): «на еду» — да, «на кофе» — нет
function mentionsCategory(question, category) {
  const words = ` ${stemPhrase(question)} `;
  return [category.name, category.label, ...(SYSTEM_CATEGORY_ALIASES[category.name] || [])]
    .filter(Boolean)
    .some(variant => words.includes(` ${stemPhrase(variant)} `));
}

module.exports = { SYSTEM_CATEGORY_ALIASES, normalizeText, plainWords, stem, stemPhrase, searchStem, matchCategory, mentionsCategory };
