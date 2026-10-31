// «💡 Верни 13%»: правила социальных вычетов и НДФЛ с процентов по вкладам — таблицей по годам, без нейросети.
// Раздел только для русского языка и рублей (isTaxRefundAvailable). Источники (сверено 31.10.2026):
// - ст. 219 НК РФ, https://www.nalog.gov.ru/rn77/taxation/taxes/ndfl/nalog_vichet/soc_nv/ — общий годовой лимит
//   социальных вычетов (лечение и лекарства, своё обучение, спорт, добровольное страхование жизни, НПФ): 120 000 ₽ за
//   расходы до 2023 года, 150 000 ₽ — с расходов 2024 года; обучение ребёнка — отдельно, 50 000 → 110 000 ₽ на ребёнка;
//   дорогостоящее лечение — без лимита. Заявить вычет можно в течение трёх лет после года оплаты (п. 7 ст. 78 НК РФ).
//   Вернуть можно не больше НДФЛ, удержанного за год; ставка возврата — 13% (у дохода выше 2,4 млн ₽ — больше).
// - 425-ФЗ от 28.11.2025: с расходов 2026 года вычет за спорт — и за родителей-пенсионеров.
// - ст. 214.2 НК РФ, https://www.klerk.ru/buh/articles/710915/ — проценты по вкладам без налога: 1 млн ₽ × наибольшая
//   ключевая ставка ЦБ на 1-е число месяцев года; ставка 13%, с процентов свыше 2,4 млн ₽ — 15%; вклады под ставку
//   не выше 1% не облагаются; налог платят по уведомлению до 1 декабря следующего года.

const KINDS = ['medical', 'education', 'sport', 'insurance'];
// Коды видов в callback_data
const KIND_CODES = { medical: 'm', education: 'e', sport: 's', insurance: 'i' };
const KIND_BY_CODE = Object.fromEntries(Object.entries(KIND_CODES).map(([kind, code]) => [code, kind]));

const REFUND_RATE = 0.13;
const CLAIM_YEARS = 3;
// Социальные вычеты по году расходов: { from — с какого года, limit — общий лимит, childEducation — на ребёнка }
const SOCIAL_RULES = [
  { from: 2024, limit: 150000, childEducation: 110000 },
  { from: 0, limit: 120000, childEducation: 50000 }
];
// Проценты по вкладам без налога за год: 1 млн ₽ × наибольшая ключевая ставка на 1-е число месяца.
// provisional — ставки на оставшиеся 1-е числа года ещё не известны (2026: 16% на 1 января и 1 февраля, дальше ниже)
const DEPOSIT_EXEMPT = {
  2023: { amount: 150000 },
  2024: { amount: 210000 },
  2025: { amount: 210000 },
  2026: { amount: 160000, provisional: true }
};
const DEPOSIT_RATE = 0.13;
const DEPOSIT_HIGH_RATE = 0.15;
const DEPOSIT_HIGH_FROM = 2400000;
const DEPOSIT_TAX_FREE_RATE = 1; // вклады под ставку не выше 1% годовых налогом не облагаются
const DEPOSIT_NEAR_RATIO = 0.8; // «близко к порогу» — проценты от 80% необлагаемой суммы

// Описание траты → вид вычета. Слово целиком или начало слова: (?<!\p{L}) — \b в JS не работает с кириллицей.
// Порядок важен: страхование жизни, затем лечение (аптека, клиника, ДМС — сильные признаки: «Лека 44 —
// Академический 5» — аптека, а не учёба), спорт, учёба; категория «Здоровье» — только если описание ничего не дало.
const START = '(?<![\\p{L}\\p{N}])';
const DESCRIPTION_RULES = [
  ['insurance', new RegExp([
    `страхов\\p{L}*\\s+жизн\\p{L}*`, `${START}жизнь\\s+страх`, 'life\\s*insurance', `${START}нпф(?![\\p{L}])`,
    `негосударственн\\p{L}*\\s+пенсион`, `${START}пенсионн\\p{L}*\\s+страхован`
  ].join('|'), 'iu')],
  ['medical', new RegExp([
    `${START}дмс(?![\\p{L}])`, `добровольн\\p{L}*\\s+медицинск\\p{L}*\\s+страхован`,
    `${START}аптек`, 'apteka', 'pharm', `${START}ригла`, `${START}rigla`, `${START}(?:лека|leka)(?![\\p{L}])`, 'горздрав',
    'gorzdrav', 'здравсити', 'zdravcity', 'еаптека', `${START}клиник`, 'clinic', 'стоматолог', 'dental', `${START}медцентр`,
    `${START}медицинск`, 'medical', 'инвитро', 'invitro', 'гемотест', 'gemotest', `${START}helix`, `${START}хеликс`,
    `${START}поликлиник`, `${START}больниц`, `${START}врач`, `${START}лекарств`, `${START}анализ(?:ы|ов)?(?![\\p{L}])`
  ].join('|'), 'iu')],
  ['sport', new RegExp([
    'фитнес', 'fitness', `${START}спортзал`, `${START}тренаж[её]рн\\p{L}*\\s+зал`, `${START}бассейн`, `${START}тренировк`,
    `${START}спортивн\\p{L}*\\s+секци`, `${START}секци[яиюей](?![\\p{L}])`, `${START}йог[аиу](?![\\p{L}])`, `${START}yoga`,
    'crossfit', 'кроссфит', `${START}gym(?![\\p{L}])`, 'world\\s*class', `${START}x-?fit`, `${START}ddx`, `${START}скалодром`
  ].join('|'), 'iu')],
  ['education', new RegExp([
    'school', `${START}автошкол`, `${START}школ(?!ьн)\\p{L}*`, `${START}курс(?:ы|ов|ам|ах)(?![\\p{L}])`, `${START}обучени`,
    `${START}университет`, 'universit', `${START}институт`, `${START}колледж`, 'college', `${START}лице[йяю]`,
    `${START}гимнази`, `${START}академи[яиюей](?![\\p{L}])`, 'academy', `${START}репетитор`, `${START}tutor`, 'skillbox',
    'скилбокс', 'нетологи', 'netology', 'geekbrains', 'практикум', 'praktikum', 'skyeng', 'скайенг', 'фоксфорд', 'foxford',
    `${START}детск\\p{L}*\\s+сад`, `${START}детсад`, 'kindergarten', 'education'
  ].join('|'), 'iu')]
];
// Своя категория пользователя → вид вычета (начало слова: «Транспорт» — не спорт); системная «Здоровье» — лечение
const CATEGORY_RULES = [
  ['medical', /^здоровье$|(?<!\p{L})(?:медицин|лекарств|аптек|лечени|врач|health|medic|pharm)/iu],
  ['education', /(?<!\p{L})(?:образован|обучени|учёб|учеб|школ|курсы|education|study|school)/iu],
  ['sport', /(?<!\p{L})(?:спорт|фитнес|fitness|sport|gym)/iu]
];

function isTaxRefundAvailable(lang, currency) {
  return lang === 'ru' && currency === 'RUB';
}

// Вид вычета по описанию и категории траты; null — не похожа
function classifyExpense({ description, category_name: categoryName }) {
  const text = String(description || '');
  for (const [kind, regex] of DESCRIPTION_RULES) {
    if (regex.test(text)) return kind;
  }
  const category = String(categoryName || '');
  for (const [kind, regex] of CATEGORY_RULES) {
    if (regex.test(category)) return kind;
  }
  return null;
}

function socialRules(year) {
  return SOCIAL_RULES.find(rule => year >= rule.from);
}

// totals — { medical, education, sport, insurance } в рублях за год → база вычета с учётом лимита и возврат
function estimateRefund(totals, year) {
  const rules = socialRules(year);
  const sum = KINDS.reduce((acc, kind) => acc + (Number(totals[kind]) || 0), 0);
  const base = Math.min(sum, rules.limit);
  return {
    sum,
    base,
    limit: rules.limit,
    childEducation: rules.childEducation,
    capped: sum > rules.limit,
    refund: Math.round(base * REFUND_RATE)
  };
}

// Необлагаемые проценты за год: { amount, provisional } или null — год ещё не в таблице
function depositExemption(year) {
  return DEPOSIT_EXEMPT[year] || null;
}

// НДФЛ с процентов за год (≈): сверх необлагаемой суммы — 13%, с части свыше 2,4 млн ₽ — 15%
function depositTax(interest, exempt) {
  const taxable = Math.max(0, interest - exempt);
  const low = Math.min(taxable, DEPOSIT_HIGH_FROM);
  return Math.round(low * DEPOSIT_RATE + Math.max(0, taxable - DEPOSIT_HIGH_FROM) * DEPOSIT_HIGH_RATE);
}

// Годы, за которые можно заявить вычет в текущем году, и текущий (за него — после окончания года): [today−3 … today]
function claimYears(currentYear) {
  const years = [];
  for (let year = currentYear - CLAIM_YEARS; year <= currentYear; year++) years.push(year);
  return years;
}

module.exports = {
  KINDS,
  KIND_CODES,
  KIND_BY_CODE,
  REFUND_RATE,
  CLAIM_YEARS,
  DEPOSIT_TAX_FREE_RATE,
  DEPOSIT_NEAR_RATIO,
  isTaxRefundAvailable,
  classifyExpense,
  socialRules,
  estimateRefund,
  depositExemption,
  depositTax,
  claimYears
};
