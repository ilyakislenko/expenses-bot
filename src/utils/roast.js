// «😈 Злой режим»: чистые функции — выбор повода, шаблоны с родом и числом, ситуация (ночь, выходные, понедельник,
// зарплата), выбор варианта без повторов. Данные и Telegram — в services/RoastService.js, тексты —
// src/locales/roast/<язык>.js.

const { addDays } = require('./period');

const LEVELS = ['off', 'spicy', 'savage'];
const GENDERS = ['m', 'f', 'x'];

// Поводы по силе: первый найденный — единственный за действие
const TRIGGER_PRIORITY = ['budget_over', 'challenge', 'allowance', 'budget_80', 'impulse', 'junk'];

// Вредные траты по описанию (все языки бота). Порядок важен: первая подошедшая группа
const JUNK_KINDS = [
  { key: 'fastfood', pattern: /(?:^|[^а-яё])(?:кфс|ростикс|макдак|макдональдс|мак\s*авто|вкусно\s*и\s*точка|фри)(?:[^а-яё]|$)|бургер|шаурм|шаверм|хот-?дог|наггетс|картошк[аи]\s*фри|kfc|mcdonald|\bmcd\b|burger|whopper|nuggets|hot\s*dog|\bfries\b|shawarma|kebab|döner|doner|dürüm|taco\s*bell|popeyes|domino|pizza\s*hut|マクド|マック|ケンタ|バーガー|麦当劳|肯德基|汉堡/i },
  { key: 'delivery', pattern: /доставк|самокат|яндекс\s*\.?\s*еда|деливери|delivery|wolt|glovo|deliveroo|uber\s*eats|lieferando|lieferung|livraison|entrega|teslimat|yemeksepeti|getir|yetkazib|მიტანა|डिलीवरी|zomato|swiggy|出前|配達|外卖|美团/i },
  { key: 'alcohol', pattern: /(?:^|[^а-яё])(?:пив[оауе]|пивас|пивко|вин[оа]|ром|джин|бар|паб|алко)(?:[^а-яё]|$)|водк|виски|коньяк|текил|сидр|шампанск|алкогол|\bbeer|\bwine\b|vodka|whisk|cognac|\brum\b|tequila|\bgin\b|cider|champagne|booze|\bpub\b|\bbier\b|\bwein\b|cerveza|\bvino\b|bière|\bvin\b|cerveja|\bbira\b|şarap|rakı|ღვინო|ლუდი|\bpivo\b|शराब|बीयर|ビール|啤酒|白酒/i },
  { key: 'smoking', pattern: /(?:^|[^а-яё])(?:сиги|сиг|стики|жижа)(?:[^а-яё]|$)|сигарет|сигар|табак|вейп|айкос|кальян|снюс|cigarette|cigar|tobacco|\bvape|juul|iqos|hookah|shisha|\bsnus\b|zigarette|\btabak\b|cigarrillo|tabaco|cigarro|sigara|nargile|სიგარეტ|sigaret|सिगरेट|タバコ|たばこ|香烟/i },
  { key: 'energy', pattern: /энергетик|ред\s*бул|редбул|адреналин\s*раш|монстр|флеш\s*ап|energy\s*drink|energydrink|red\s*bull|redbull|monster\s*energy|\bburn\b|energético|energetico|énergisant|enerji\s*içeceği|ენერგეტიკ|энергетик|energetik|エナジードリンク|红牛|能量饮料/i },
  { key: 'taxi', pattern: /такси|taxi|\buber\b(?!\s*eats)|\bbolt\b|yandex\s*go|яндекс\s*go|taksi|ტაქსი|टैक्सी|タクシー|出租|滴滴/i },
  // Подписки — только разовые платежи: авто-запись регулярной траты (recurring_expense_id) поводом не считается
  { key: 'subscription', pattern: /netflix|нетфликс|spotify|спотифай|кинопоиск|kinopoisk|(?:^|[^а-яё])иви(?:[^а-яё]|$)|\bivi\b|яндекс\s*плюс|yandex\s*plus|youtube\s*premium|ютуб\s*премиум|ютуб\s*premium/i },
  { key: 'games', pattern: /steam|(?:^|[^а-яё])стим(?:[^а-яё]|$)|донат|playstation|ps\s*store|\bpsn\b|xbox|nintendo|(?:^|[^а-яё])игр[аыу](?:[^а-яё]|$)|\bgames?\b|in-?game|v-?bucks|robux|робукс/i },
  { key: 'marketplace', pattern: /озон|ozon|wildberries|вайлдберриз|валдберр?из|(?:^|[^а-яё])вб(?:[^а-яё]|$)|\bwb\b|aliexpress|алиэкспресс|(?:^|[^а-яё])али(?:[^а-яё]|$)|яндекс\s*маркет|yandex\s*market|amazon|амазон|\btemu\b|(?:^|[^а-яё])тему(?:[^а-яё]|$)/i },
  { key: 'coffee', pattern: /кофе|капучин|латте|американо|эспрессо|(?:^|[^а-яё])раф(?:[^а-яё]|$)|старбакс|coffee|latte|cappuccino|espresso|americano|starbucks/i }
];

// Вид вредной траты по описанию или null. recurring — авто-запись регулярной траты: подписка, которая списывается
// сама, — не повод (подкалываем только разовые оплаты Netflix и т.п.)
function junkKind(description, { recurring = false } = {}) {
  const text = String(description || '');
  if (!text) return null;
  const found = JUNK_KINDS.find(({ pattern }) => pattern.test(text));
  if (!found) return null;
  if (found.key === 'subscription' && recurring) return null;
  return found.key;
}

// ---------- Ситуация ----------

const CONTEXTS = ['night', 'weekend', 'monday', 'payday'];
const NIGHT_UNTIL_HOUR = 5; // 00:00–04:59
const FRIDAY_EVENING_HOUR = 18;
const PAYDAY_DAYS = 3;

// Локальные дата, час и день недели (1 — понедельник … 7 — воскресенье) момента now в поясе пользователя
function localMoment(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short'
  }).formatToParts(now).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, weekday };
}

// Ситуации по времени: ночь (00:00–04:59), выходные (пятница с 18:00, суббота, воскресенье), понедельник
function timeContexts(now, timezone) {
  const { hour, weekday } = localMoment(now, timezone);
  const contexts = [];
  if (hour < NIGHT_UNTIL_HOUR) contexts.push('night');
  if ((weekday === 5 && hour >= FRIDAY_EVENING_HOUR) || weekday === 6 || weekday === 7) contexts.push('weekend');
  if (weekday === 1) contexts.push('monday');
  return contexts;
}

// «Только зарплата пришла»: за последние PAYDAY_DAYS дней (включая сегодня) записан доход не меньше медианы своих
// доходов. incomes — [{ value (в основной валюте), date 'YYYY-MM-DD' }]
function isPayday(incomes, today) {
  const typical = median((incomes || []).map(income => income.value));
  if (!(typical > 0)) return false;
  const since = addDays(today, -PAYDAY_DAYS);
  return incomes.some(income => income.date > since && income.date <= today && income.value >= typical);
}

function median(values) {
  const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Первый повод по TRIGGER_PRIORITY из найденных: { trigger: { kind, ... } | undefined }
function selectTrigger(candidates) {
  const list = (candidates || []).filter(Boolean);
  for (const kind of TRIGGER_PRIORITY) {
    const found = list.find(candidate => candidate.kind === kind);
    if (found) return found;
  }
  return null;
}

// Слово по числу: три формы — славянское правило (1 день, 2 дня, 5 дней), две — 1 / остальное, одна — всегда она
function pluralForm(n, forms) {
  const value = Math.abs(Math.trunc(Number(n)));
  if (forms.length >= 3) {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }
  if (forms.length === 2) return value === 1 ? forms[0] : forms[1];
  return forms[0];
}

const TOKEN = /\{([^{}]*)\}/g;

// Вариант годится для пола: у «не скажу» (x, а также не указанного) — только без двух форм рода {м|ж};
// три формы {м|ж|без рода} подходят всем
function fitsGender(template, gender) {
  if (gender === 'm' || gender === 'f') return true;
  for (const [, inner] of template.matchAll(TOKEN)) {
    if (!inner.includes('#') && inner.includes('|') && inner.split('|').length < 3) return false;
  }
  return true;
}

// Шаблон → текст. {param} — значение из params (null/undefined → вариант не годится, результат null),
// {м|ж} / {м|ж|без рода} — форма по полу, {n#форма|форма|форма} — слово по числу params[n].
// Значения подставляются за один проход и сами шаблоном не разбираются (описание траты может содержать скобки)
function renderTemplate(template, params = {}, gender = 'x') {
  let missing = false;
  const text = template.replace(TOKEN, (whole, inner) => {
    if (inner.includes('#')) {
      const [name, forms] = inner.split('#');
      const value = params[name];
      if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        missing = true;
        return '';
      }
      return pluralForm(Number(value), forms.split('|'));
    }
    if (inner.includes('|')) {
      const forms = inner.split('|');
      if (gender === 'm') return forms[0];
      if (gender === 'f') return forms[1];
      if (forms.length >= 3) return forms[2];
      missing = true;
      return '';
    }
    const value = params[inner];
    if (value === null || value === undefined || value === '') {
      missing = true;
      return '';
    }
    return String(value);
  });
  return missing ? null : text;
}

// Вариант семейства — строка или объект { text, when?, match?, needs? }:
//   when  — ситуация ('night' | 'weekend' | 'monday' | 'payday'): вариант только в этой ситуации;
//   match — слова в описании траты (регулярное выражение, без учёта регистра, с начала слова: 'кальян|hookah'):
//           вариант про конкретный товар/место/бренд — только когда описание о нём (иначе он сообщал бы неправду);
//   needs — виды вредных трат, которые все должны быть в периоде (для «Разноса месяца»: ['fastfood', 'delivery'])
function variantText(variant) {
  return typeof variant === 'string' ? variant : variant.text;
}

function variantContext(variant) {
  return typeof variant === 'string' ? null : (variant.when || null);
}

function variantMatch(variant) {
  return typeof variant === 'string' ? null : (variant.match || null);
}

const gateCache = new Map();

// Описание подходит под match: совпадение с начала слова (ru/en и другие алфавиты), без учёта регистра
function matchesGate(match, subject) {
  if (!subject) return false;
  if (!gateCache.has(match)) gateCache.set(match, new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${match})`, 'iu'));
  return gateCache.get(match).test(String(subject));
}

// Подходит ли вариант к этой трате и периоду: match — по описанию subject, needs — по видам kinds
function variantFits(variant, { subject = '', kinds = [] } = {}) {
  if (typeof variant === 'string') return true;
  if (variant.match && !matchesGate(variant.match, subject)) return false;
  if (variant.needs && !variant.needs.every(kind => kinds.includes(kind))) return false;
  return true;
}

// Случайный вариант семейства, который годится для пола, параметров и траты (match / needs), кроме недавно
// показанных (recent — ключи «семейство:номер»); если подходящих новых нет — любой, кроме самого последнего. null —
// подходящих нет вовсе. situational: true — только ситуационные варианты для ситуаций contexts, false — только
// обычные (ситуационные вне выбора). freshOnly — null, если все подходящие недавно были (вызывающий берёт другой набор)
function pickVariant(family, variants, { params = {}, gender = 'x', recent = [], contexts = [], situational = false, freshOnly = false, subject = '', kinds = [], random = Math.random } = {}) {
  const candidates = [];
  (variants || []).forEach((variant, index) => {
    const template = variantText(variant);
    const when = variantContext(variant);
    if (situational ? !(when && contexts.includes(when)) : when) return;
    if (!variantFits(variant, { subject, kinds })) return;
    if (!fitsGender(template, gender)) return;
    const text = renderTemplate(template, params, gender);
    if (text !== null) candidates.push({ key: `${family}:${index}`, text, when });
  });
  if (!candidates.length) return null;
  const recentSet = new Set(recent);
  let pool = candidates.filter(item => !recentSet.has(item.key));
  if (!pool.length && freshOnly) return null;
  if (!pool.length) pool = candidates.filter(item => item.key !== recent[0]);
  if (!pool.length) pool = candidates;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

module.exports = {
  LEVELS,
  GENDERS,
  TRIGGER_PRIORITY,
  JUNK_KINDS,
  CONTEXTS,
  junkKind,
  localMoment,
  timeContexts,
  isPayday,
  median,
  selectTrigger,
  pluralForm,
  fitsGender,
  renderTemplate,
  variantText,
  variantContext,
  variantMatch,
  matchesGate,
  variantFits,
  pickVariant
};
