// «😈 Злой режим»: чистые функции — выбор повода, шаблоны с родом и числом, выбор варианта без повторов.
// Данные и Telegram — в services/RoastService.js, тексты — src/locales/roast/<язык>.js.

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
  { key: 'taxi', pattern: /такси|taxi|\buber\b(?!\s*eats)|\bbolt\b|yandex\s*go|яндекс\s*go|taksi|ტაქსი|टैक्सी|タクシー|出租|滴滴/i }
];

function junkKind(description) {
  const text = String(description || '');
  if (!text) return null;
  const found = JUNK_KINDS.find(({ pattern }) => pattern.test(text));
  return found ? found.key : null;
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

// Случайный вариант семейства, который годится для пола и параметров, кроме недавно показанных (recent — ключи
// «семейство:номер»); если подходящих новых нет — любой, кроме самого последнего. null — подходящих нет вовсе
function pickVariant(family, variants, { params = {}, gender = 'x', recent = [], random = Math.random } = {}) {
  const usable = [];
  (variants || []).forEach((template, index) => {
    if (!fitsGender(template, gender)) return;
    const text = renderTemplate(template, params, gender);
    if (text !== null) usable.push({ key: `${family}:${index}`, text });
  });
  if (!usable.length) return null;
  const recentSet = new Set(recent);
  let pool = usable.filter(item => !recentSet.has(item.key));
  if (!pool.length) pool = usable.filter(item => item.key !== recent[0]);
  if (!pool.length) pool = usable;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

module.exports = {
  LEVELS,
  GENDERS,
  TRIGGER_PRIORITY,
  JUNK_KINDS,
  junkKind,
  median,
  selectTrigger,
  pluralForm,
  fitsGender,
  renderTemplate,
  pickVariant
};
