// Планирование: чистые расчёты без БД — «можно потратить сегодня», календарь платежей, поиск подписок,
// личная инфляция по позициям чеков. Даты — локальные строки 'YYYY-MM-DD' (см. utils/period).
const crypto = require('crypto');
const { ymd, parseYmd, addDays, addMonths, clampDay } = require('./period');

const PACE_GOOD = 0.7; // потрачено до 70% дневного лимита — 🟢, до 100% — 🟡, больше — 🔴
const PACE_EMOJI = { good: '🟢', warn: '🟡', over: '🔴' };

function daysBetween(from, to) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Та же дата day в месяце со сдвигом delta (31 → последний день короткого месяца)
function shiftMonths(dateStr, delta, day = parseYmd(dateStr).d) {
  const { y, m } = parseYmd(dateStr);
  const next = addMonths(y, m, delta);
  return ymd(next.y, next.m, clampDay(next.y, next.m, day));
}

// Ближайшая дата с числом day (с учётом короткого месяца) не раньше from
function nextMonthlyDate(from, day) {
  const { y, m } = parseYmd(from);
  const thisMonth = ymd(y, m, clampDay(y, m, day));
  return thisMonth >= from ? thisMonth : shiftMonths(thisMonth, 1, day);
}

// Даты ежемесячного платежа: first, затем число day в следующих месяцах — до until (не включая)
function monthlyDates(first, day, until) {
  const dates = [];
  for (let i = 0; i < 24; i++) {
    const date = i === 0 ? first : shiftMonths(first, i, day);
    if (date >= until) break;
    dates.push(date);
  }
  return dates;
}

// ========================================
// МОЖНО ПОТРАТИТЬ СЕГОДНЯ
// ========================================

// Ожидаемый доход периода: записанный + ожидаемые выплаты (по истории) или средний доход прошлых периодов —
// что больше. null — о доходах ничего не известно.
function expectedIncome({ recorded = 0, upcoming = 0, average = null }) {
  if (!recorded && !upcoming && average === null) return null;
  return Math.max(recorded + upcoming, average || 0);
}

function paceOf(spentToday, daily) {
  if (daily <= 0) return 'over';
  if (spentToday <= daily * PACE_GOOD) return 'good';
  return spentToday <= daily ? 'warn' : 'over';
}

// Дневной лимит до конца периода (все суммы — в основной валюте):
//   свободно = доход (или общий бюджет) − уже потрачено до сегодня − регулярные и платежи по долгам до конца периода
//              − взнос в накопления (только от дохода)
//   на сегодня = свободно / оставшиеся дни (включая сегодня); сегодняшние траты лимит дня не меняют.
// mode: 'income' | 'budget' | 'none' (нет ни дохода, ни бюджета)
function computeAllowance({ daysLeft, income = null, budget = null, spentBefore = 0, spentToday = 0, bills = 0, debts = 0, savings = 0 }) {
  const days = Math.max(1, Math.floor(daysLeft || 1));
  let mode;
  let pool;
  if (income !== null && income !== undefined) {
    mode = 'income';
    pool = income - (savings || 0);
  } else if (budget !== null && budget !== undefined) {
    mode = 'budget';
    pool = budget;
  } else {
    return { mode: 'none' };
  }
  const free = pool - spentBefore - bills - debts;
  const daily = free > 0 ? Math.floor(free / days) : 0;
  return {
    mode,
    days,
    pool,
    free,
    daily,
    spentToday,
    leftToday: daily - spentToday,
    deficit: free < 0 ? -free : 0,
    pace: paceOf(spentToday, daily)
  };
}

// ========================================
// НОРМАЛИЗАЦИЯ НАЗВАНИЙ
// ========================================

const MERCHANT_NOISE = new Set([
  'оплата', 'покупка', 'списание', 'платеж', 'подписка', 'перевод', 'ооо', 'ип', 'ао', 'пао', 'зао', 'по', 'за', 'на', 'от',
  'payment', 'purchase', 'pay', 'card', 'subscription', 'llc', 'inc', 'ltd', 'gmbh', 'com', 'ru', 'net', 'org', 'www', 'the', 'of'
]);

// Продавец/описание траты → ключ: регистр, ё, цифры (номера заказов, даты), знаки и служебные слова не важны
function normalizeMerchant(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/https?:\/\//g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ');
  return cleaned.split(/\s+/).filter(token => token.length > 1 && !MERCHANT_NOISE.has(token)).slice(0, 4).join(' ').slice(0, 60);
}

const ITEM_NOISE = new Set([
  'шт', 'уп', 'упак', 'кг', 'гр', 'мл', 'пэт', 'бут', 'пак', 'вес', 'весовой', 'весовые', 'весов', 'фас', 'ст', 'пл',
  'pcs', 'pc', 'kg', 'ml', 'pack'
]);
const ITEM_SIZE = /\d+(?:[.,]\d+)?\s*(?:кг|гр|г|мл|л|шт|уп|kg|gr|g|ml|l|pcs|pc|oz|lb)(?![\p{L}])/gu;

// Позиция чека → ключ товара: без размеров («930мл», «1 кг»), жирности («3,2%»), цифр, знаков и слов-упаковок,
// первые 3 слова. «МОЛОКО ПРОСТОКВАШИНО 3,2% 930МЛ» → «молоко простоквашино»
function normalizeItemName(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(ITEM_SIZE, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*%/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ');
  return cleaned.split(/\s+/).filter(token => token.length > 1 && !ITEM_NOISE.has(token)).slice(0, 3).join(' ');
}

// Короткий стабильный id для callback_data (ключ может быть длинным и кириллическим)
function shortHash(text) {
  return crypto.createHash('sha1').update(String(text)).digest('hex').slice(0, 10);
}

// ========================================
// ПОДПИСКИ
// ========================================

const CADENCES = {
  weekly: { min: 5, max: 9, minCount: 4, activeDays: 12, windowDays: 130, perMonth: 52 / 12 },
  monthly: { min: 26, max: 35, minCount: 3, activeDays: 45, windowDays: 130, perMonth: 1 },
  yearly: { min: 350, max: 380, minCount: 2, activeDays: 380, windowDays: 400, perMonth: 1 / 12 }
};
const AMOUNT_TOLERANCE = 0.1; // ±10% от медианы
const SCAN_DAYS = 400; // годовые подписки видны только на длинной истории
// Недельная серия у неизвестного продавца: ≥ 6 недель подряд с суммой ±1% и не еда/кафе/транспорт —
// иначе это привычка (кофе, обеды, такси), а не подписка
const WEEKLY_UNKNOWN_MIN = 6;
const WEEKLY_UNKNOWN_TOLERANCE = 0.01;

// Известные подписки и регулярные платежи (ru/en/kz/uz): стриминг, музыка, облака, ИИ, игры, донаты, связь,
// интернет/ТВ, хостинг, спорт. Одно слово от 5 букв — по началу слова («фитнес» → «фитнес-клуб»), короче и фразы —
// целиком. Сравнение — по описанию без регистра и знаков (цифры остаются: tele2, t2).
const SUBSCRIPTION_KEYWORDS = [
  'яндекс плюс', 'yandex plus', 'плюс мульти', 'кинопоиск', 'kinopoisk', 'яндекс музыка', 'netflix', 'spotify',
  'apple', 'icloud', 'itunes', 'app store', 'google one', 'google play', 'youtube', 'ivi', 'иви', 'okko', 'окко',
  'start', 'wink', 'винк', 'amediateka', 'амедиатека', 'premier', 'премьер', 'more tv', 'кион', 'kion',
  'vk музыка', 'vk music', 'vk combo', 'вк музыка', 'вк комбо', 'boom', 'звук', 'zvuk', 'литрес', 'litres',
  'storytel', 'bookmate', 'букмейт', 'deezer', 'tidal', 'disney', 'hbo', 'prime video', 'amazon prime', 'twitch',
  'crunchyroll', 'telegram premium', 'телеграм премиум', 'chatgpt', 'openai', 'claude', 'anthropic', 'midjourney',
  'copilot', 'github', 'notion', 'figma', 'canva', 'adobe', 'microsoft 365', 'office 365', 'dropbox', 'boosty',
  'бусти', 'patreon', 'discord', 'nitro', 'steam', 'playstation', 'psn', 'ps plus', 'xbox', 'game pass', 'nintendo',
  'ea play', 'ubisoft', 'мтс', 'mts', 'билайн', 'beeline', 'мегафон', 'megafon', 'tele2', 'теле2', 't2', 'yota', 'йота',
  'сбермобайл', 'тинькофф мобайл', 'т мобайл', 'kcell', 'activ', 'altel', 'ucell', 'uzmobile', 'mobiuz',
  'мобильная связь', 'сотовая связь', 'интернет', 'internet', 'ростелеком', 'rostelecom', 'дом ру', 'домру', 'dom ru',
  'мгтс', 'mgts', 'триколор', 'tricolor', 'iptv', 'казахтелеком', 'kazakhtelecom', 'uztelecom', 'хостинг', 'hosting',
  'домен', 'domain', 'reg ru', 'timeweb', 'таймвеб', 'beget', 'selectel', 'aws', 'digitalocean', 'hetzner', 'vps', 'vpn',
  'cloudflare', 'спортзал', 'фитнес', 'fitness', 'gym', 'бассейн', 'world class', 'абонемент', 'membership',
  'подписка', 'subscription'
];

function keywordText(text) {
  return ` ${String(text || '').toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
}

// Описание похоже на известную подписку (бренд, связь, интернет, хостинг, спортзал…)
function isKnownSubscription(text) {
  const s = keywordText(text);
  return SUBSCRIPTION_KEYWORDS.some(keyword => (keyword.length >= 5 && !keyword.includes(' ')
    ? s.includes(` ${keyword}`)
    : s.includes(` ${keyword} `)));
}

// Категория «привычных» трат (еда, кафе, продукты, транспорт) — по названию, в том числе своей категории
const HABIT_CATEGORY = /(еда|продукт|кафе|кофе|ресторан|обед|завтрак|ужин|фастфуд|доставк|транспорт|такси|метро|бензин|топлив|парковк|food|grocer|cafe|coffee|restaurant|lunch|dinner|meal|transport|taxi|fuel|parking)/i;
function isHabitCategory(name) {
  return !!name && HABIT_CATEGORY.test(String(name));
}

function nextByCadence(date, cadence) {
  if (cadence === 'weekly') return addDays(date, 7);
  if (cadence === 'yearly') return shiftMonths(date, 12);
  return shiftMonths(date, 1);
}

// Группы трат с похожей суммой: соседние по сумме отличаются ≤ 10%, и все — в пределах ±10% от медианы группы
function amountClusters(rows) {
  const sorted = [...rows].sort((a, b) => a.amount - b.amount);
  const clusters = [];
  let current = [];
  for (const row of sorted) {
    if (current.length && row.amount > current[current.length - 1].amount * (1 + AMOUNT_TOLERANCE)) {
      clusters.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length) clusters.push(current);
  return clusters.filter(cluster => {
    const mid = median(cluster.map(r => r.amount));
    return cluster.every(r => Math.abs(r.amount - mid) <= mid * AMOUNT_TOLERANCE + 0.005);
  });
}

// Регулярность серии: все интервалы между соседними датами — в пределах периодичности
function cadenceOf(dates) {
  for (const [name, c] of Object.entries(CADENCES)) {
    const intervals = [];
    for (let i = 1; i < dates.length; i++) intervals.push(daysBetween(dates[i - 1], dates[i]));
    if (intervals.length && intervals.every(d => d >= c.min && d <= c.max)) return name;
  }
  return null;
}

// Повторяющиеся платежи: одинаковое (нормализованное) описание, валюта, сумма ±10%, раз в неделю/месяц/год.
// Нужно ≥ 4 недельных, ≥ 3 месячных (2 — если сумма одинакова до копейки) или ≥ 2 годовых платежей, последний — недавно.
// Привычки отсекаются: недельная серия — только у известной подписки (SUBSCRIPTION_KEYWORDS) или ≥ 6 недель подряд
// с суммой ±1% не в категории еды/кафе/транспорта; месячная и годовая в такой категории — только у известной подписки.
// Авто-записи регулярных трат и описания, совпадающие с уже заведёнными регулярными (excludeKeys), пропускаются.
// rows: [{ date, description, amount, currency, category_id, category_name, recurring_expense_id }]
function detectSubscriptions(rows, { today, excludeKeys = new Set() } = {}) {
  const groups = new Map();
  for (const row of rows) {
    if (row.recurring_expense_id) continue;
    const amount = Number(row.amount);
    if (!(amount > 0) || !row.date || row.date > today || daysBetween(row.date, today) > SCAN_DAYS) continue;
    const key = normalizeMerchant(row.description);
    if (!key || excludeKeys.has(key)) continue;
    const groupKey = `${key}|${row.currency}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { key, currency: row.currency, rows: [], known: false });
    const group = groups.get(groupKey);
    group.rows.push({ ...row, amount });
    if (!group.known && isKnownSubscription(row.description)) group.known = true;
  }

  const found = [];
  for (const group of groups.values()) {
    for (const cluster of amountClusters(group.rows)) {
      // Одна дата — одна оплата (два платежа в день — не подписка, а частые покупки)
      const byDate = new Map();
      for (const row of cluster) if (!byDate.has(row.date)) byDate.set(row.date, row);
      const series = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const detected = detectSeries(series, today, { known: group.known, habit: isHabitCategory(series[series.length - 1].category_name) });
      if (!detected) continue;
      const last = detected.series[detected.series.length - 1];
      const cfg = CADENCES[detected.cadence];
      found.push({
        key: group.key,
        id: shortHash(`${group.key}|${group.currency}|${detected.cadence}`),
        label: String(last.description || '').trim(),
        currency: group.currency,
        amount: last.amount,
        cadence: detected.cadence,
        count: detected.series.length,
        firstDate: detected.series[0].date,
        lastDate: last.date,
        nextDate: nextByCadence(last.date, detected.cadence),
        monthlyCost: Math.round(last.amount * cfg.perMonth * 100) / 100,
        categoryId: last.category_id || null,
        known: group.known
      });
    }
  }
  // Одна подписка на ключ: при нескольких — самая дорогая в месяц
  const best = new Map();
  for (const sub of found) {
    const id = `${sub.key}|${sub.currency}`;
    if (!best.has(id) || best.get(id).monthlyCost < sub.monthlyCost) best.set(id, sub);
  }
  return [...best.values()].sort((a, b) => b.monthlyCost - a.monthlyCost);
}

// known — известная подписка, habit — категория еды/кафе/транспорта (см. detectSubscriptions)
function detectSeries(series, today, { known = false, habit = false } = {}) {
  for (const [cadence, cfg] of Object.entries(CADENCES)) {
    const recent = series.filter(row => daysBetween(row.date, today) <= cfg.windowDays);
    if (recent.length < 2) continue;
    if (daysBetween(recent[recent.length - 1].date, today) > cfg.activeDays) continue;
    if (cadenceOf(recent.map(row => row.date)) !== cadence) continue;
    if (!known && habit) continue;
    if (cadence === 'weekly' && !known) {
      const mid = median(recent.map(row => row.amount));
      const stable = recent.every(row => Math.abs(row.amount - mid) <= mid * WEEKLY_UNKNOWN_TOLERANCE);
      if (recent.length < WEEKLY_UNKNOWN_MIN || !stable) continue;
    }
    const exact = recent.every(row => Math.abs(row.amount - recent[0].amount) < 0.005);
    const minCount = cadence === 'monthly' && exact ? 2 : cfg.minCount;
    if (recent.length < minCount) continue;
    return { cadence, series: recent };
  }
  return null;
}

// ========================================
// ДОХОДЫ: ДАТА ЗАРПЛАТЫ
// ========================================

const PAYDAY_SCAN_DAYS = 100;
const PAYDAY_DAY_TOLERANCE = 5;
const PAYDAY_LATE_DAYS = 5; // опоздала больше — считаем пропущенной, ждём в следующем месяце

// Регулярные доходы (зарплата, аванс): одно описание, примерно одно число месяца (±5 дней), в ≥ 2 разных месяцах
// за последние ~3 месяца. rows: [{ date, description, amount }] (сумма — в основной валюте)
function detectPaydays(rows, { today }) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.date || row.date > today || daysBetween(row.date, today) > PAYDAY_SCAN_DAYS) continue;
    const key = normalizeMerchant(row.description);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, amount: Number(row.amount), day: parseYmd(row.date).d });
  }
  const streams = [];
  for (const [key, items] of groups) {
    const sorted = [...items].sort((a, b) => a.day - b.day);
    const clusters = [];
    for (const item of sorted) {
      const cluster = clusters[clusters.length - 1];
      if (cluster && item.day - cluster[0].day <= PAYDAY_DAY_TOLERANCE * 2) cluster.push(item);
      else clusters.push([item]);
    }
    for (const cluster of clusters) {
      const months = new Set(cluster.map(item => item.date.slice(0, 7)));
      if (months.size < 2) continue;
      const byDate = [...cluster].sort((a, b) => (a.date < b.date ? -1 : 1));
      const last = byDate[byDate.length - 1];
      streams.push({
        key,
        label: String(last.description || '').trim(),
        day: Math.round(median(cluster.map(item => item.day))),
        amount: Math.round(median(cluster.map(item => item.amount)) * 100) / 100,
        lastDate: last.date
      });
    }
  }
  return streams;
}

// Следующая ожидаемая дата выплаты: первое число day после последней выплаты (не ближе 10 дней к ней);
// опоздание до 5 дней — ждём сегодня, больше — в следующем месяце
function nextPayday(stream, today) {
  let date = nextMonthlyDate(addDays(stream.lastDate, 10), stream.day);
  while (date < addDays(today, -PAYDAY_LATE_DAYS)) date = shiftMonths(date, 1, stream.day);
  return date < today ? today : date;
}

// Выплаты в [from, until): [{ date, stream }]
function paydayDates(streams, today, until) {
  const result = [];
  for (const stream of streams) {
    const first = nextPayday(stream, today);
    for (const date of monthlyDates(first, stream.day, until)) result.push({ date: date < today ? today : date, stream });
  }
  return result;
}

// ========================================
// КАЛЕНДАРЬ ПЛАТЕЖЕЙ
// ========================================

// Ежемесячные даты регулярной траты в [today, until): ближайшая — nextChargeDate из сервиса, а если списание было
// сегодня — сегодняшняя (paid). recurring: { day_of_month, nextChargeDate, last_charged_month }
function recurringDates(recurring, today, until) {
  const dates = [];
  const t = parseYmd(today);
  const thisMonth = ymd(t.y, t.m, 1);
  if (recurring.last_charged_month && recurring.last_charged_month >= thisMonth
    && clampDay(t.y, t.m, recurring.day_of_month) === t.d) {
    dates.push({ date: today, paid: true });
  }
  for (const date of monthlyDates(recurring.nextChargeDate, recurring.day_of_month, until)) {
    if (date >= today) dates.push({ date, paid: false });
  }
  return dates;
}

// Даты платежа по долгу с заданным числом в [today, until)
function debtDates(debt, today, until) {
  if (!debt.due_day) return [];
  return monthlyDates(nextMonthlyDate(today, debt.due_day), debt.due_day, until);
}

// Даты подписки в [today, until): ожидавшаяся в прошлом (ещё не пришла) — сегодня
function subscriptionDates(sub, today, until) {
  const dates = [];
  let date = sub.nextDate;
  for (let i = 0; i < 60 && date < until; i++) {
    const shown = date < today ? today : date;
    if (!dates.includes(shown)) dates.push(shown);
    date = nextByCadence(date, sub.cadence);
  }
  return dates;
}

// Платежи и ожидаемые доходы на days дней вперёд (с сегодня), по датам. Долги без числа платежа — в undated.
// Долг, совпадающий по названию с регулярной тратой, не дублируется.
function buildCalendar({ today, days = 30, recurring = [], debts = [], subscriptions = [], paydays = [] }) {
  const until = addDays(today, days);
  const items = [];
  const recurringKeys = new Set(recurring.map(r => normalizeMerchant(r.description)).filter(Boolean));
  for (const r of recurring) {
    for (const { date, paid } of recurringDates(r, today, until)) {
      items.push({ date, kind: 'recurring', label: r.description, amount: Number(r.amount), currency: r.currency, paid, ref: r.id });
    }
  }
  const undated = [];
  for (const debt of debts) {
    const payment = Number(debt.monthly_payment);
    if (!(payment > 0) || !(Number(debt.balance) > 0)) continue;
    if (recurringKeys.has(normalizeMerchant(debt.name))) continue;
    if (!debt.due_day) {
      undated.push({ kind: 'debt', label: debt.name, amount: payment, currency: debt.currency, ref: debt.id });
      continue;
    }
    for (const date of debtDates(debt, today, until)) {
      items.push({ date, kind: 'debt', label: debt.name, amount: payment, currency: debt.currency, ref: debt.id });
    }
  }
  for (const sub of subscriptions) {
    for (const date of subscriptionDates(sub, today, until)) {
      items.push({ date, kind: 'subscription', label: sub.label, amount: sub.amount, currency: sub.currency, ref: sub.id });
    }
  }
  for (const { date, stream } of paydayDates(paydays, today, until)) {
    items.push({ date, kind: 'income', label: stream.label, amount: stream.amount, currency: stream.currency, ref: stream.key });
  }
  const order = { income: 0, recurring: 1, debt: 2, subscription: 3 };
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : order[a.kind] - order[b.kind]));
  return { from: today, until, items, undated };
}

// ========================================
// ЛИЧНАЯ ИНФЛЯЦИЯ
// ========================================

const INFLATION_WINDOW_DAYS = 92; // «за 3 месяца»
const INFLATION_MIN_GAP_DAYS = 7; // первая и последняя покупка — хотя бы через неделю
const INFLATION_NOISE = 0.005; // изменение меньше 0,5% — цена та же

// Позиции чеков → изменение цены за единицу (шт/кг/л: сумма / количество; без количества — сумма) по товарам,
// купленным в окне хотя бы в два разных дня. Корзина — индекс Ласпейреса: Σ новая цена × обычное количество /
// Σ старая цена × обычное количество − 1. rows: [{ date, name, amount, quantity }] в одной валюте
function computeInflation(rows, { today, windowDays = INFLATION_WINDOW_DAYS } = {}) {
  const since = addDays(today, -windowDays);
  const groups = new Map();
  let purchases = 0;
  for (const row of rows) {
    if (!row.date || row.date < since || row.date > today) continue;
    const amount = Number(row.amount);
    if (!(amount > 0)) continue;
    const key = normalizeItemName(row.name);
    if (!key) continue;
    purchases++;
    const quantity = Number(row.quantity) > 0 ? Number(row.quantity) : 1;
    if (!groups.has(key)) groups.set(key, { key, name: '', lastDate: '', byDate: new Map() });
    const group = groups.get(key);
    // Название — как в самом свежем чеке
    if (row.date >= group.lastDate) {
      group.lastDate = row.date;
      group.name = String(row.name || '').trim();
    }
    const day = group.byDate.get(row.date) || { amount: 0, quantity: 0 };
    day.amount += amount;
    day.quantity += quantity;
    group.byDate.set(row.date, day);
  }

  const items = [];
  for (const group of groups.values()) {
    const dates = [...group.byDate.keys()].sort();
    if (dates.length < 2) continue;
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (daysBetween(first, last) < INFLATION_MIN_GAP_DAYS) continue;
    const unit = (date) => group.byDate.get(date).amount / group.byDate.get(date).quantity;
    const oldPrice = unit(first);
    const newPrice = unit(last);
    items.push({
      key: group.key,
      name: group.name,
      oldPrice: Math.round(oldPrice * 100) / 100,
      newPrice: Math.round(newPrice * 100) / 100,
      change: newPrice / oldPrice - 1,
      weight: median(dates.map(date => group.byDate.get(date).quantity)),
      firstDate: first,
      lastDate: last,
      purchases: dates.length
    });
  }

  let basket = null;
  if (items.length) {
    const oldSum = items.reduce((sum, item) => sum + item.oldPrice * item.weight, 0);
    const newSum = items.reduce((sum, item) => sum + item.newPrice * item.weight, 0);
    basket = {
      change: oldSum > 0 ? newSum / oldSum - 1 : 0,
      count: items.length,
      since: items.reduce((min, item) => (item.firstDate < min ? item.firstDate : min), items[0].firstDate)
    };
  }
  return {
    purchases,
    tracked: groups.size,
    items,
    risers: items.filter(item => item.change > INFLATION_NOISE).sort((a, b) => b.change - a.change),
    fallers: items.filter(item => item.change < -INFLATION_NOISE).sort((a, b) => a.change - b.change),
    basket
  };
}

module.exports = {
  PACE_EMOJI,
  CADENCES,
  SCAN_DAYS,
  PAYDAY_SCAN_DAYS,
  INFLATION_WINDOW_DAYS,
  daysBetween,
  median,
  shiftMonths,
  nextMonthlyDate,
  monthlyDates,
  expectedIncome,
  computeAllowance,
  paceOf,
  normalizeMerchant,
  normalizeItemName,
  shortHash,
  detectSubscriptions,
  isKnownSubscription,
  isHabitCategory,
  detectPaydays,
  nextPayday,
  paydayDates,
  recurringDates,
  debtDates,
  subscriptionDates,
  buildCalendar,
  computeInflation
};
